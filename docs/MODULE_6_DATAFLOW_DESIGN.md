# Module 6: AE-Nexrender 데이터 흐름 설계

WSOP 포커 방송 자동화 시스템의 **Module 6 (AE-Nexrender)** 상세 설계 문서

> **관련 문서**
> - [GFX 데이터 파이프라인 아키텍처](GFX_PIPELINE_ARCHITECTURE.md) - 전체 6-모듈 구조
> - [AEP 필드 매핑 명세서](GFX_AEP_FIELD_MAPPING.md) - 26개 컴포지션 84개 필드 매핑
> - [DB 스키마 상세 설계](architecture.md) - PostgreSQL 테이블 정의

---

## 1. 개요

### 1.1 모듈 역할

Module 6 (AE-Nexrender)은 **Supabase의 render_queue 테이블에서 렌더링 작업을 가져와 After Effects로 자동 렌더링하는 워커 모듈**

| 구분 | 설명 |
|------|------|
| **입력** | render_queue (pending 상태 작업) |
| **처리** | Nexrender API를 통한 AEP 렌더링 |
| **출력** | MP4 파일 → NAS 저장, 상태 업데이트 |
| **상태 추적** | Supabase 중앙 DB |

### 1.2 핵심 특징

- **Job Polling**: Supabase에서 주기적으로 대기 작업 조회 (10초 간격)
- **분산 처리**: 여러 워커가 동시에 작업 처리 (라이선스 수만큼)
- **실시간 상태 추적**: 모든 작업 상태가 Supabase에 기록됨
- **자동 복구**: Worker Crash 시 lock_expires_at으로 자동 복구
- **적응형 폴링**: 작업 유무에 따라 폴링 주기 자동 조정

### 1.3 시스템 맥락

```
Sub Dashboard                          AE-Worker
   (작업 요청)                         (렌더링 처리)
       │                                  │
       └──────── render_queue ───────────┘
                 (Supabase)

       상태: pending → preparing → rendering →
             encoding → uploading → completed
```

---

## 2. 작업 생명주기 (Job Lifecycle)

### 2.1 상태 전이 다이어그램

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│ pending  │────▶│  preparing   │────▶│ rendering│
└──────────┘     └──────────────┘     └──────────┘
                       ▲                    │
                       │                    ▼
                       │            ┌──────────┐
                       │            │ encoding │
                       │            └──────────┘
                       │                 │
                    ┌──────────┐         ▼
                    │cancelled │◀──┐ ┌──────────┐
                    └──────────┘   │ │uploading │
                                   │ └──────────┘
                    ┌──────────┐   │      │
                    │  failed  │◀─┴─────┐│
                    └──────────┘        ▼
                                ┌────────────┐
                                │ completed  │
                                └────────────┘
```

### 2.2 상태별 설명

| 상태 | 담당자 | 설명 | 진행 시간 |
|------|---------|------|----------|
| **pending** | Sub Dashboard | 렌더링 큐에 신규 항목 등록 | 0초 |
| **preparing** | AE-Worker | 워커가 작업을 할당 받고 JSON 생성 준비 | 1-2초 |
| **rendering** | Nexrender | AEP 렌더링 실행 중 | 30-120초 |
| **encoding** | Nexrender | H.264 인코딩 중 | 10-60초 |
| **uploading** | AE-Worker | 완성된 MP4를 NAS에 업로드 | 5-30초 |
| **completed** | AE-Worker | 렌더링 완료, 파일 검증 성공 | - |
| **failed** | AE-Worker | 실패 (Nexrender 에러, AEP 미존재 등) | - |
| **cancelled** | Sub Dashboard | 사용자 취소 | - |

---

## 3. 프로세스 플로우

### 3.1 핵심 5단계 프로세스

```
Step 1: Job Polling        Step 2: Job Claim       Step 3: JSON 생성
   ┌────────────┐         ┌────────────┐         ┌────────────┐
   │ 10초 간격  │         │ 1 작업만   │         │ gfx_data   │
   │ 대기 작업  │────────▶│ 할당 받음  │────────▶│ → assets   │
   │ SELECT     │         │ UPDATE     │         │ 변환       │
   └────────────┘         └────────────┘         └────────────┘
                                                        │
                                                        ▼
Step 5: 후처리              Step 4: 렌더링 진행 폴링
┌────────────┐            ┌────────────┐
│ 파일 검증  │            │ 5초 간격   │
│ NAS 복사   │◀───────────│ 상태 조회  │
│ 상태 UPDATE│            │ POST       │
└────────────┘            └────────────┘
                          /api/v1/jobs
```

### 3.2 Step 1: Job Polling

**목적**: Supabase에서 처리 대기 중인 렌더링 작업 조회

**구현**:
```sql
-- 10초마다 실행
SELECT id, composition_id, gfx_data, cue_item_id
FROM render_queue
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 1;
```

**설정**:
- 폴링 주기: 10초 (기본)
- 적응형 폴링: 작업 없으면 30초로 증가, 있으면 5초로 감소
- Worker 식별: worker_id = UUID (각 워커 고유)

### 3.3 Step 2: Job Claim

**목적**: 선택된 작업을 현재 워커에 할당하고 상태 업데이트

**구현**:
```sql
-- Atomic UPDATE로 동시성 제어
UPDATE render_queue
SET status = 'preparing',
    worker_id = $1,
    lock_expires_at = NOW() + INTERVAL '30 minutes'
WHERE id = $2
  AND status = 'pending'
RETURNING *;
```

**특징**:
- **Atomic 연산**: 다른 워커와의 race condition 방지
- **Lock 타임아웃**: 30분 (Worker Crash 시 자동 복구)
- **반환값**: 업데이트된 render_queue 레코드

### 3.4 Step 3: Nexrender JSON 생성

**목적**: gfx_data를 Nexrender API 형식의 JSON으로 변환

#### 3.4.1 JSON 템플릿 구조

```json
{
  "template": {
    "src": "file://D:/templates/cyprusdesign.aep",
    "composition": "_MAIN Mini Chip Count",
    "outputModule": "H.264 - Match Render Settings - 15 Mbps"
  },
  "assets": [
    {
      "type": "data",
      "layerName": "Name 1",
      "property": "Source Text",
      "value": "PHIL IVEY"
    },
    {
      "type": "data",
      "layerName": "Stack 1",
      "property": "Source Text",
      "value": "250"
    },
    {
      "type": "image",
      "layerName": "Flag 1",
      "src": "file://D:/assets/flags/United States.png"
    }
  ],
  "actions": [
    {
      "type": "expression",
      "params": {
        "layerName": "Clock",
        "property": "timeRemaining",
        "value": "time * 1000"
      }
    }
  ],
  "output": "D:/output/job_{{jobId}}.mp4"
}
```

#### 3.4.2 gfx_data → Nexrender Assets 변환

**변환 규칙**:

| gfx_data 구조 | Nexrender 에셋 | 설명 |
|--------------|----------------|------|
| `slots[i].fields[j]` | `{type: "data", layerName: "Name N", property: "Source Text", value: ...}` | 슬롯별 텍스트 필드 매핑 |
| `single_fields[k]` | `{type: "data", layerName: "...", property: "Source Text", value: ...}` | 단일 필드 매핑 |
| `flag_fields[l]` | `{type: "image", layerName: "Flag N", src: "file://..."}` | 국기 이미지 매핑 |

**예시 (gfx_data)**:
```json
{
  "composition_name": "_MAIN Mini Chip Count",
  "slots": [
    {
      "slot_number": 1,
      "fields": {
        "name": "PHIL IVEY",
        "stack": "250",
        "country": "United States"
      }
    }
  ],
  "single_fields": {
    "table_id": "Table 1",
    "round_info": "Final Table"
  }
}
```

**변환 로직**:

```python
def gfx_to_nexrender_assets(gfx_data, aep_mapping):
    """
    gfx_data를 Nexrender assets 배열로 변환

    Args:
        gfx_data: render_queue.gfx_data (JSON)
        aep_mapping: AEP_FIELD_MAPPING 테이블 조회 결과

    Returns:
        [{"type": "data", "layerName": "...", "property": "...", "value": "..."}, ...]
    """
    assets = []

    # 1. Slots 처리 (Name 1, Stack 1, ... 등)
    for slot_idx, slot in enumerate(gfx_data.get("slots", []), 1):
        for field_name, field_value in slot.get("fields", {}).items():
            # 매핑 테이블에서 레이어명 조회
            layer_name = aep_mapping.get(f"Slot {slot_idx} - {field_name}")
            if layer_name:
                assets.append({
                    "type": "data",
                    "layerName": layer_name,
                    "property": "Source Text",
                    "value": str(field_value)
                })

    # 2. Single Fields 처리 (Table ID, Round Info 등)
    for field_name, field_value in gfx_data.get("single_fields", {}).items():
        layer_name = aep_mapping.get(f"Single - {field_name}")
        if layer_name:
            assets.append({
                "type": "data",
                "layerName": layer_name,
                "property": "Source Text",
                "value": str(field_value)
            })

    # 3. Flag 필드 처리 (이미지 에셋)
    for flag_idx, flag_path in enumerate(gfx_data.get("flags", []), 1):
        assets.append({
            "type": "image",
            "layerName": f"Flag {flag_idx}",
            "src": f"file://{flag_path}"
        })

    return assets
```

### 3.5 Step 4: Rendering - Nexrender API 호출 및 진행률 폴링

#### 3.5.1 Nexrender Job 생성

**API 호출**:
```http
POST http://nexrender-server:8080/api/v1/jobs

{
  "template": {...},
  "assets": [...],
  "actions": [...]
}

Response 200:
{
  "id": "job_abc123",
  "uid": "uid_xyz789",
  "status": "queued",
  "created": "2024-01-15T10:00:00Z"
}
```

**상태 업데이트**:
```sql
UPDATE render_queue
SET nexrender_job_id = $1,
    status = 'rendering',
    started_at = NOW()
WHERE id = $2;
```

#### 3.5.2 진행률 폴링 (5초 간격)

**목적**: Nexrender 작업 상태 조회 및 진행률 반영

**API 호출**:
```http
GET http://nexrender-server:8080/api/v1/jobs/job_abc123

Response:
{
  "id": "job_abc123",
  "status": "rendering",
  "progress": 45,  -- 0-100 %
  "updated": "2024-01-15T10:05:30Z"
}
```

**상태 매핑**:

| Nexrender Status | render_queue Status | 진행 단계 |
|-----------------|-------------------|---------|
| queued | rendering | 대기 중 |
| rendering | rendering | 렌더링 중 |
| encoding | encoding | 인코딩 중 |
| finished | uploading | 완료 (NAS 복사 준비) |
| error | failed | 실패 |

**폴링 로직**:
```python
async def poll_nexrender_job(nexrender_job_id, render_queue_id, db):
    """
    5초마다 Nexrender 작업 상태 조회
    """
    max_timeout = 30 * 60  # 30분 타임아웃
    elapsed = 0
    poll_interval = 5

    while elapsed < max_timeout:
        # 1. Nexrender API 호출
        response = requests.get(
            f"http://nexrender-server:8080/api/v1/jobs/{nexrender_job_id}"
        )
        job_status = response.json()

        # 2. render_queue 업데이트
        db.execute("""
            UPDATE render_queue
            SET status = %s,
                progress = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (job_status["status"], job_status.get("progress", 0), render_queue_id))

        # 3. 종료 조건 확인
        if job_status["status"] in ["finished", "error"]:
            return job_status["status"]

        await asyncio.sleep(poll_interval)
        elapsed += poll_interval

    # 타임아웃 발생
    return "timeout"
```

**진행률 업데이트**:
- render_queue.progress 필드에 0-100 값 기록
- Main/Sub Dashboard에서 실시간 진행률 표시
- 타임아웃: 30분 이상 진행 안 될 시 자동 취소

### 3.6 Step 5: Post-Processing (후처리)

#### 3.6.1 파일 검증

**목적**: Nexrender에서 생성된 MP4 파일이 올바르게 생성되었는지 확인

**검증 항목**:

| 검증 항목 | 기준 | 실패 시 |
|----------|------|--------|
| 파일 존재 | 렌더링 완료 경로 존재 | failed |
| 파일 크기 | > 100KB | failed |
| 파일 메타데이터 | ffprobe 확인 (코덱, 해상도) | failed |
| 재시도 | 3회 반복 (60초 간격) | 최종 failed |

**검증 코드**:
```python
def validate_render_output(output_path, expected_width=1920, expected_height=1080):
    """
    렌더링 출력 파일 검증
    """
    # 1. 파일 존재 확인
    if not os.path.exists(output_path):
        raise ValueError(f"Output file not found: {output_path}")

    # 2. 파일 크기 확인 (최소 100KB)
    file_size = os.path.getsize(output_path)
    if file_size < 100 * 1024:
        raise ValueError(f"File too small: {file_size} bytes")

    # 3. ffprobe로 메타데이터 확인
    probe_result = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries",
        "stream=codec_type,codec_name,width,height",
        "-of", "json", output_path
    ], capture_output=True, text=True)

    metadata = json.loads(probe_result.stdout)
    video_stream = next(
        (s for s in metadata["streams"] if s["codec_type"] == "video"),
        None
    )

    if not video_stream:
        raise ValueError("No video stream found")

    if (video_stream.get("width") != expected_width or
        video_stream.get("height") != expected_height):
        raise ValueError(
            f"Resolution mismatch: {video_stream['width']}x{video_stream['height']}"
        )

    return True
```

#### 3.6.2 NAS 파일 복사

**목적**: 렌더링 완료 파일을 NAS의 최종 출력 위치로 복사

**경로 규칙**:

```
Source:  D:/output/job_{render_queue_id}.mp4
         (Nexrender 로컬 출력)

Destination: \\NAS\broadcast\output\{broadcast_date}\{composition_name}_{render_queue_id}.mp4
             (방송 중계용 최종 위치)
```

**복사 로직**:
```python
async def copy_to_nas(local_path, nas_path, render_queue_id, db):
    """
    렌더링 파일을 NAS로 복사
    """
    try:
        # 1. NAS 디렉토리 생성
        nas_dir = os.path.dirname(nas_path)
        os.makedirs(nas_dir, exist_ok=True)

        # 2. 파일 복사
        shutil.copy2(local_path, nas_path)

        # 3. 복사 검증 (크기 비교)
        source_size = os.path.getsize(local_path)
        dest_size = os.path.getsize(nas_path)

        if source_size != dest_size:
            raise ValueError("File size mismatch after copy")

        # 4. render_queue 업데이트
        db.execute("""
            UPDATE render_queue
            SET output_file_path = %s,
                status = 'completed',
                completed_at = NOW()
            WHERE id = %s
        """, (nas_path, render_queue_id))

        return True

    except Exception as e:
        # 실패 시 상태를 failed로 업데이트
        db.execute("""
            UPDATE render_queue
            SET status = 'failed',
                error_message = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (str(e), render_queue_id))

        raise
```

#### 3.6.3 상태 최종 업데이트

```sql
UPDATE render_queue
SET status = 'completed',
    output_file_path = '/nas/broadcast/output/...',
    completed_at = NOW(),
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))
WHERE id = $1;
```

---

## 4. 통합 데이터 흐름 (End-to-End)

### 4.1 전체 시퀀스 다이어그램

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Sub Dashboard → Supabase → AE-Worker (Module 6) → NAS                    │
└──────────────────────────────────────────────────────────────────────────┘

Step 0: Sub Dashboard에서 렌더링 요청
┌─────────────────┐
│ Sub Dashboard   │
│ (자막 선택 후)  │
└────────┬────────┘
         │ INSERT render_queue
         │ status='pending'
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Supabase - render_queue Table                                   │
│ id | composition_id | gfx_data | status | worker_id | progress  │
│ 1  | comp_123      | {...}    | pending| NULL     | 0%         │
└────────┬────────────────────────────────────────────────────────┘
         │ SELECT pending
         │ (10초 간격)
         ▼
┌──────────────────────┐
│   AE-Worker          │
│   (Module 6)         │
│                      │
│ 1. Job Claim         │
│    → status='prep'   │
│                      │
│ 2. JSON 생성         │
│    gfx_data → JSON   │
│                      │
│ 3. Nexrender 호출    │
│    POST /api/v1/jobs │
│                      │
│ 4. 진행률 폴링       │
│    GET /api/v1/jobs  │
│    (5초 간격)        │
│                      │
│ 5. 후처리            │
│    - 파일 검증       │
│    - NAS 복사        │
│    - status='done'   │
└──────────┬───────────┘
           │ UPDATE render_queue
           │ status='completed'
           ▼
    ┌──────────────┐
    │ NAS - 최종   │
    │ 출력 파일    │
    │ 방송 전송    │
    └──────────────┘
```

### 4.2 모듈 간 인터페이스

**Sub Dashboard → Supabase**:
- 작업 생성: `INSERT INTO render_queue`
- 작업 취소: `UPDATE render_queue SET status='cancelled'`

**Supabase → AE-Worker**:
- 작업 조회: `SELECT FROM render_queue WHERE status='pending'`
- 상태 업데이트: 리얼타임 구독 또는 폴링

**AE-Worker → Nexrender**:
- 작업 생성: `POST /api/v1/jobs`
- 상태 조회: `GET /api/v1/jobs/{jobId}`

**AE-Worker → NAS**:
- 파일 복사: SMB/CIFS 프로토콜
- 파일 경로: `\\NAS\broadcast\output\{date}\{filename}.mp4`

---

## 5. 장애 복구 (Fault Recovery)

### 5.1 에러 처리 매트릭스

| Error Type | Trigger | Action | Recovery | Max Attempts |
|-----------|---------|--------|----------|--------------|
| **Nexrender Down** | Connection timeout | Retry | 지수 백오프 (60초) | 3회 |
| **AEP File Not Found** | 파일 경로 오류 | Fail Fast | 관리자 알림 | - |
| **Render Timeout** | 30분 초과 | Cancel + Retry | Job 취소 후 재시도 | 2회 |
| **Worker Crash** | status='preparing/rendering' + lock_expires_at < NOW() | Release Job | 자동 복구 SQL | - |
| **NAS 연결 실패** | SMB 연결 불가 | Retry | 30초 간격, 3회 | 3회 |
| **Invalid Output File** | 파일 크기 < 100KB | Retry | 기다린 후 재검증 | 3회 (60초) |

### 5.2 재시도 로직 (Retry Logic)

**지수 백오프 설정**:
```
retry_attempt: 1, 2, 3
baseDelay: 60초
backoff_multiplier: 2

delay = baseDelay * (backoff_multiplier ^ (retry_attempt - 1))

Attempt 1: 60초
Attempt 2: 120초 (2분)
Attempt 3: 240초 (4분)

Total: 6분 (+ 실행 시간)
```

**구현**:
```python
async def retry_with_exponential_backoff(
    func,
    max_retries=3,
    base_delay=60,
    backoff_multiplier=2
):
    """
    지수 백오프를 사용한 재시도 로직
    """
    for attempt in range(1, max_retries + 1):
        try:
            return await func()
        except Exception as e:
            if attempt == max_retries:
                raise  # 마지막 재시도 실패 시 예외 발생

            # 대기 시간 계산
            delay = base_delay * (backoff_multiplier ** (attempt - 1))
            logger.warning(
                f"Attempt {attempt} failed. Retrying in {delay}s: {str(e)}"
            )
            await asyncio.sleep(delay)
```

### 5.3 Worker Crash Recovery

**문제 상황**: 워커가 작업 중 갑자기 중단 (메모리 오버플로우, 네트워크 끊김 등)

**자동 복구 메커니즘**:

```sql
-- 매 10분마다 실행되는 백그라운드 작업
SELECT id, worker_id, lock_expires_at
FROM render_queue
WHERE status IN ('preparing', 'rendering', 'encoding', 'uploading')
  AND lock_expires_at < NOW()
  AND worker_id IS NOT NULL;

-- 마감 시간 초과 작업을 pending으로 복원
UPDATE render_queue
SET status = 'pending',
    worker_id = NULL,
    lock_expires_at = NULL,
    recovery_count = recovery_count + 1,
    updated_at = NOW()
WHERE id IN (위의 SELECT 결과);
```

**lock_expires_at 설정**:
- Job Claim 시점: `NOW() + INTERVAL '30 minutes'`
- 목적: 워커 충돌 시 30분 후 자동 복구
- 정상 렌더링: 30분 내 완료 → lock_expires_at 갱신 (또는 상태 변경)

**Recovery Count 추적**:
```sql
ALTER TABLE render_queue ADD COLUMN recovery_count INTEGER DEFAULT 0;

-- 복구 시마다 증가
-- recovery_count > 3 인 경우 관리자 알림 (반복 실패 작업)
```

---

## 6. 성능 최적화

### 6.1 적응형 폴링 (Adaptive Polling)

**목적**: CPU 낭비를 줄이면서도 빠른 응답성 유지

| 상황 | 폴링 주기 | 목적 |
|------|---------|------|
| 작업 발견 O | 5초 | 빠른 처리 |
| 작업 발견 X (10회 연속) | 30초 | CPU 절감 |
| 수동 폴링 | 즉시 | 테스트/모니터링 |

**구현**:
```python
async def adaptive_polling(db, worker_id):
    """
    적응형 폴링 - 작업 유무에 따라 주기 조정
    """
    empty_poll_count = 0
    poll_interval = 10  # 초기값

    while True:
        # 1. 작업 조회
        job = db.execute("""
            SELECT id FROM render_queue
            WHERE status = 'pending'
            LIMIT 1
        """).fetchone()

        if job:
            # 작업 발견 → 폴링 주기 단축
            empty_poll_count = 0
            poll_interval = 5
            await process_job(job, worker_id, db)
        else:
            # 작업 미발견 → 폴링 주기 연장
            empty_poll_count += 1
            if empty_poll_count > 10:
                poll_interval = 30

        logger.info(f"Next poll in {poll_interval}s (empty_count={empty_poll_count})")
        await asyncio.sleep(poll_interval)
```

### 6.2 템플릿 캐싱

**목적**: AEP 파일 및 매핑 정보 캐싱으로 JSON 생성 속도 향상

| 캐시 대상 | TTL | 저장소 |
|---------|-----|--------|
| AEP 파일 경로 | 1시간 | Redis / In-Memory |
| AEP 필드 매핑 | 1시간 | Redis / In-Memory |
| Composition 메타데이터 | 1시간 | Redis / In-Memory |

**캐싱 전략**:
```python
import hashlib
from functools import lru_cache
from datetime import datetime, timedelta

class TemplateCache:
    def __init__(self, ttl_seconds=3600):
        self.cache = {}
        self.ttl = ttl_seconds
        self.timestamps = {}

    def get(self, key):
        if key not in self.cache:
            return None

        # TTL 확인
        if (datetime.now() - self.timestamps[key]).seconds > self.ttl:
            del self.cache[key]
            del self.timestamps[key]
            return None

        return self.cache[key]

    def set(self, key, value):
        self.cache[key] = value
        self.timestamps[key] = datetime.now()

    def get_aep_mapping(self, composition_id):
        """AEP 필드 매핑 캐시"""
        cache_key = f"aep_mapping_{composition_id}"

        cached = self.get(cache_key)
        if cached:
            return cached

        # DB에서 로드
        mapping = db.execute("""
            SELECT field_name, layer_name
            FROM aep_field_mapping
            WHERE composition_id = %s
        """, (composition_id,)).fetchall()

        self.set(cache_key, mapping)
        return mapping
```

### 6.3 병렬 워커 처리

**목적**: 여러 작업을 동시에 처리하여 처리량 증대

**설정**:
- 워커 수 = After Effects 라이선스 수
- 각 워커: 독립적인 처리 루프 (process_id)
- 동시성 제어: Supabase WHERE 절로 자동 처리

**병렬 처리 구조**:
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Worker 1   │  │  Worker 2   │  │  Worker N   │
│ PID: 1001   │  │ PID: 1002   │  │ PID: 100N   │
└─────────────┘  └─────────────┘  └─────────────┘
      │                │                 │
      └────────────────┼─────────────────┘
                       │
              Supabase render_queue
              (SELECT ... WHERE status='pending'
               LIMIT 1)
```

**Supabase 동시성 제어**:
```sql
-- 각 워커가 다른 작업을 가져가도록 자동 처리
SELECT id, composition_id, gfx_data
FROM render_queue
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 1  -- 한 번에 1개만 (다른 워커가 동시에 못 가져감)
FOR UPDATE SKIP LOCKED;  -- Lock 없는 행은 건너뜀
```

---

## 7. 모니터링 및 메트릭

### 7.1 핵심 메트릭

| 메트릭 | 단위 | 기준값 | 알림 기준 |
|--------|------|--------|----------|
| **render_queue_pending_count** | 개수 | < 5 | > 10 |
| **render_job_duration_seconds** | 초 | 60-120 | > 300 (timeout) |
| **render_job_success_rate** | % | > 95% | < 90% |
| **ae_worker_active_count** | 개수 | = 라이선스수 | < 라이선스수 |
| **nexrender_api_latency_ms** | ms | < 1000 | > 5000 |
| **nas_copy_duration_seconds** | 초 | < 30 | > 60 |

### 7.2 모니터링 쿼리

**대기 작업 수**:
```sql
SELECT COUNT(*) as pending_count
FROM render_queue
WHERE status = 'pending'
  AND created_at > NOW() - INTERVAL '1 hour';
```

**평균 렌더링 시간** (최근 100개):
```sql
SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM render_queue
WHERE status = 'completed'
  AND completed_at > NOW() - INTERVAL '1 day'
ORDER BY completed_at DESC
LIMIT 100;
```

**성공률** (최근 24시간):
```sql
SELECT
  COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*) * 100 as success_rate
FROM render_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND status IN ('completed', 'failed');
```

**활성 워커 수**:
```sql
SELECT COUNT(DISTINCT worker_id) as active_workers
FROM render_queue
WHERE status IN ('preparing', 'rendering', 'encoding', 'uploading')
  AND lock_expires_at > NOW();
```

### 7.3 로깅 구조

**로그 레벨**:
- **DEBUG**: Job Claim, JSON 생성, Nexrender API 호출
- **INFO**: 상태 전이, 재시도 시작, 파일 복사 완료
- **WARNING**: Retry 발생, Recovery 시작
- **ERROR**: 최종 실패, Worker Crash 감지

**로그 포맷**:
```
[2024-01-15 10:05:30.123] INFO  | Worker#1 | Job#1 | status: rendering → encoding (progress: 45%)
[2024-01-15 10:05:45.456] ERROR | Worker#2 | Job#2 | Nexrender timeout (30min exceeded) - cancelling
[2024-01-15 10:06:00.789] WARN  | Scheduler | Recovery | Found 3 stuck jobs, releasing...
```

---

## 8. 보안 고려사항

### 8.1 접근 제어

| 컴포넌트 | 접근 대상 | 제어 방법 |
|---------|---------|---------|
| AE-Worker | Supabase render_queue | RLS (Row-Level Security) |
| Sub Dashboard | render_queue 쓰기 | API 인증 (JWT) |
| 외부 | Nexrender API | 로컬 네트워크 (VPN) |
| 외부 | NAS | Active Directory 인증 |

### 8.2 데이터 보호

**민감 정보**:
- gfx_data (플레이어 정보, 칩 스택): DB 암호화
- 렌더링 경로: 환경 변수로 관리 (코드 하드코딩 금지)

**감사 추적**:
```sql
-- render_queue_audit 테이블
CREATE TABLE render_queue_audit (
  id SERIAL,
  render_queue_id INTEGER,
  status_from VARCHAR,
  status_to VARCHAR,
  worker_id UUID,
  changed_at TIMESTAMPTZ,
  changed_by VARCHAR  -- 워커 ID 또는 시스템
);
```

---

## 9. 배포 및 운영

### 9.1 워커 배포 구조

```
┌──────────────────────────────────────────────────┐
│ AE-Nexrender Worker (Docker Container)           │
│                                                   │
│ Environment:                                      │
│ - SUPABASE_URL                                    │
│ - SUPABASE_KEY                                    │
│ - NEXRENDER_API_URL (http://nexrender:8080)      │
│ - NAS_MOUNT_PATH (/mnt/nas)                       │
│ - WORKER_ID (uuid)                                │
│                                                   │
│ Process:                                          │
│ 1. polling loop                                    │
│ 2. job claim & processing                        │
│ 3. error handling & recovery                      │
└──────────────────────────────────────────────────┘
```

### 9.2 환경 변수 설정

```powershell
# .env.worker
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJ...
NEXRENDER_API_URL=http://nexrender-server:8080
NAS_MOUNT_PATH=/mnt/nas
NAS_OUTPUT_DIR=/broadcast/output
AEP_TEMPLATE_DIR=D:\templates
MAX_RETRIES=3
BASE_RETRY_DELAY=60
POLL_INTERVAL_DEFAULT=10
POLL_INTERVAL_IDLE=30
```

### 9.3 헬스체크

```python
# 워커 헬스 상태 엔드포인트
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "worker_id": WORKER_ID,
        "uptime_seconds": get_uptime(),
        "current_job_id": current_job_id or None,
        "last_poll": last_poll_time,
        "job_count_completed": job_counter
    }
```

---

## 10. 문제 해결 가이드

### 10.1 자주 발생하는 문제

| 문제 | 원인 | 해결책 |
|------|------|--------|
| `status` 계속 `preparing` | Worker Crash | lock_expires_at 30분 대기 또는 수동 복구 |
| `Nexrender Down` | API 서버 다운 | Nexrender 서버 재시작, 워커 자동 재시도 |
| NAS 파일 미존재 | 복사 실패 | NAS 마운트 확인, 디스크 공간 확인 |
| gfx_data 매핑 실패 | AEP_FIELD_MAPPING 오래됨 | 매핑 테이블 갱신, 템플릿 캐시 초기화 |

### 10.2 수동 복구 절차

**워커 중단 복구**:
```sql
-- 1. 중단된 작업 확인
SELECT id, status, worker_id, lock_expires_at
FROM render_queue
WHERE status IN ('preparing', 'rendering')
  AND lock_expires_at < NOW();

-- 2. 작업 복원
UPDATE render_queue
SET status = 'pending',
    worker_id = NULL,
    recovery_count = recovery_count + 1
WHERE id = <stuck_job_id>;

-- 3. 워커 재시작
-- Docker 또는 프로세스 매니저에서 워커 재시작
```

---

## 11. 참고 자료

| 문서 | 링크 | 설명 |
|------|------|------|
| GFX Pipeline Architecture | [GFX_PIPELINE_ARCHITECTURE.md](GFX_PIPELINE_ARCHITECTURE.md) | 전체 6-모듈 구조 |
| AEP Field Mapping | [GFX_AEP_FIELD_MAPPING.md](GFX_AEP_FIELD_MAPPING.md) | 26개 컴포지션 매핑 |
| DB Schema | [architecture.md](architecture.md) | render_queue 테이블 상세 |
| Nexrender API | http://docs.nexrender.com | Nexrender 공식 문서 |

---

**문서 버전**: 1.0.0 | **최종 업데이트**: 2024-01-15 | **담당**: System Architecture Team
