# GFX 파이프라인 병렬 개발 계획

서브 에이전트를 활용한 6개 모듈 병렬 개발 전략

> **관련 문서**
> - [전체 아키텍처](GFX_PIPELINE_ARCHITECTURE.md)
> - [Module 1-2 설계](MODULE_1_2_DESIGN.md)
> - [Module 3-5 설계](MODULE_3_5_DESIGN.md)
> - [Module 6 설계](MODULE_6_DATAFLOW_DESIGN.md)

---

## 1. 현재 상태 분석

### 1.1 모듈별 완료도

| 모듈 | 프로젝트 | 상태 | 완료도 |
|------|---------|------|-------|
| **Module 1** | automation_feature_table | ✅ 완료 | 100% |
| **Module 2** | gfx_json | 🔄 90% | Realtime Publisher만 미구현 |
| **Module 3** | automation_schema | 🔄 80% | 마이그레이션 7개 완료, 통합 뷰 보완 필요 |
| **Module 4** | 신규 (main-dashboard) | ❌ 미착수 | 0% |
| **Module 5** | 신규 (sub-dashboard) | ❌ 미착수 | 0% |
| **Module 6** | automation_ae | 🔄 40% | Cuesheet API 진행 중 |

### 1.2 기존 자산

**automation_hub**:
- `shared/db/connection.py` - AsyncPG 연결 관리
- `shared/models/` - Pydantic 모델 (hand, tournament, render_instruction)
- `schemas/v1/` - JSON Schema 11개 정의

**automation_ae**:
- `backend/app/services/nexrender/` - Nexrender 클라이언트 기본
- `backend/app/api/v1/` - REST API 라우터 10개+
- `frontend/` - React 프론트엔드 기반

**gfx_json**:
- `sync_agent/` - V4 정규화 동기화 90% 완료
- Repository 패턴 7개 구현
- TransformationPipeline 완성

---

## 2. 에이전트 역할 분배

### 2.1 모듈별 담당 에이전트

| 모듈 | Primary Agent | Support | 이유 |
|------|--------------|---------|------|
| **Module 2** | `python-dev` | `database-specialist` | Watchdog, asyncio, Supabase |
| **Module 3** | `database-specialist` | `architect` | PostgreSQL DDL, RLS, 뷰 |
| **Module 4** | `frontend-dev` | `backend-dev` | React 18, Next.js 14 |
| **Module 5** | `frontend-dev` | `backend-dev` | WebSocket, 렌더 큐 |
| **Module 6** | `backend-dev` | `python-dev` | Node.js, Nexrender API |

### 2.2 공통 지원 에이전트

| Agent | 역할 | 투입 시점 |
|-------|------|---------|
| `architect` | 전체 검증, 인터페이스 정의 | Phase 시작 |
| `test-engineer` | TDD 테스트 작성 | 개발 완료 후 |
| `code-reviewer` | 코드 리뷰, 품질 검사 | PR 생성 전 |
| `security-auditor` | 보안 취약점 검사 | Phase 3 |

---

## 3. 의존성 그래프

```
                    ┌─────────────────────────────────────┐
                    │         PARALLEL ZONES              │
                    └─────────────────────────────────────┘

PHASE 1 ───────────────────────────────────────────────────────────

    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │ Module 3    │   │ Module 2    │   │ Module 6    │
    │ DB Schema   │   │ GFX Sync    │   │ AE Worker   │
    │             │   │             │   │             │
    │ database-   │   │ python-dev  │   │ backend-dev │
    │ specialist  │   │             │   │             │
    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                    ┌────────▼────────┐
                    │ SYNC POINT 1    │
                    │ DB + API 완료   │
                    └────────┬────────┘
                             │
PHASE 2 ───────────────────────────────────────────────────────────

    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │ Module 4    │   │ Module 5    │   │ Integration │
    │ Main Dash   │   │ Sub Dash    │   │ Test        │
    │             │   │             │   │             │
    │ frontend-   │   │ frontend-   │   │ test-       │
    │ dev         │   │ dev         │   │ engineer    │
    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                    ┌────────▼────────┐
                    │ SYNC POINT 2    │
                    │ Dashboard MVP   │
                    └────────┬────────┘
                             │
PHASE 3 ───────────────────────────────────────────────────────────

              ┌───────────────────────────────────┐
              │     End-to-End Integration        │
              │                                   │
              │ GFX → NAS → Supabase → Main →    │
              │ Sub → Nexrender → NAS             │
              └───────────────────────────────────┘
```

---

## 4. 개발 Phase 정의

### Phase 1: 핵심 인프라 (병렬 3개 팀)

**기간**: 1-2주

#### 그룹 1A: Module 3 (DB Schema)

| Task | Agent | 시간 |
|------|-------|------|
| json 스키마 DDL (6 테이블) | `database-specialist` | 4h |
| wsop_plus 스키마 DDL | `database-specialist` | 4h |
| manual + ae 스키마 DDL | `database-specialist` | 6h |
| unified_* 뷰 3개 | `database-specialist` | 3h |
| RLS 정책 + 인덱스 | `database-specialist` | 4h |

**산출물**: `automation_hub/db/migrations/*.sql`

#### 그룹 1B: Module 2 (GFX Sync 완성)

| Task | Agent | 시간 |
|------|-------|------|
| RealtimePublisher 구현 | `python-dev` | 4h |
| Supabase Realtime 연동 | `python-dev` | 3h |
| 통합 테스트 | `test-engineer` | 4h |

**산출물**: `gfx_json/src/sync_agent/broadcast/realtime_publisher.py`

#### 그룹 1C: Module 6 (AE Worker 기본)

| Task | Agent | 시간 |
|------|-------|------|
| render_queue 폴링 | `backend-dev` | 4h |
| Job Claim 원자적 연산 | `backend-dev` | 3h |
| gfx_data → Nexrender JSON | `backend-dev` | 6h |
| 파일 검증 + NAS 복사 | `backend-dev` | 3h |

**산출물**: `automation_ae/backend/app/workers/render_worker.py`

#### Phase 1 동기화 조건

- [ ] 23개 테이블 생성 확인
- [ ] Module 2 → Supabase INSERT 성공
- [ ] Module 6 → render_queue 폴링 성공

---

### Phase 2: Dashboard MVP (병렬 3개 팀)

**기간**: 2-3주
**선행**: Phase 1 완료

#### 그룹 2A: Module 4 (Main Dashboard)

| Task | Agent | 시간 |
|------|-------|------|
| Next.js 프로젝트 초기화 | `frontend-dev` | 2h |
| Zustand + TanStack Query | `frontend-dev` | 5h |
| HandBrowser 컴포넌트 | `frontend-dev` | 8h |
| CuesheetEditor 컴포넌트 | `frontend-dev` | 8h |
| API Routes (6개) | `backend-dev` | 6h |
| Realtime 구독 훅 | `frontend-dev` | 4h |

**산출물**: `main-dashboard/` (새 프로젝트)

#### 그룹 2B: Module 5 (Sub Dashboard)

| Task | Agent | 시간 |
|------|-------|------|
| Next.js 프로젝트 초기화 | `frontend-dev` | 2h |
| CompositionGrid (26개) | `frontend-dev` | 6h |
| SlotMappingPanel | `frontend-dev` | 8h |
| RenderQueue 컴포넌트 | `frontend-dev` | 6h |
| WebSocket 서버 설정 | `backend-dev` | 4h |
| Main ↔ Sub 연동 | `frontend-dev` | 6h |

**산출물**: `sub-dashboard/` (새 프로젝트)

#### 그룹 2C: 통합 테스트

| Task | Agent | 시간 |
|------|-------|------|
| GFX → Supabase → render_queue | `test-engineer` | 4h |
| render_queue → Nexrender → NAS | `test-engineer` | 4h |
| 장애 복구 시나리오 | `test-engineer` | 3h |

#### Phase 2 동기화 조건

- [ ] Main Dashboard 핸드 목록 조회 성공
- [ ] Sub Dashboard 컴포지션 선택 동작
- [ ] WebSocket 메시지 전달 성공
- [ ] render_jobs INSERT 성공

---

### Phase 3: 통합 및 검증

**기간**: 1-2주
**선행**: Phase 2 완료

| Task | Agent | 시간 |
|------|-------|------|
| E2E 시나리오 테스트 | `test-engineer` | 8h |
| 보안 감사 (RLS, API) | `security-auditor` | 6h |
| 코드 리뷰 전체 | `code-reviewer` | 8h |
| API 문서화 | `docs-writer` | 6h |
| 배포 파이프라인 | `devops-engineer` | 4h |

---

## 5. 프로젝트별 작업 분배

### 5.1 automation_hub (Module 2, 3)

```
automation_hub/
├── db/migrations/           # DDL 마이그레이션 (신규)
├── shared/
│   ├── db/supabase_client.py # Supabase 연동 (신규)
│   ├── models/gfx.py        # GFX 모델 (신규)
│   └── sync/                # gfx_json 통합 (신규)
└── schemas/                 # 기존 JSON Schema
```

### 5.2 automation_ae (Module 6)

```
automation_ae/backend/app/
├── workers/
│   ├── render_worker.py     # 메인 워커 (신규)
│   ├── job_poller.py        # 폴링 로직 (신규)
│   └── file_handler.py      # 파일 처리 (신규)
└── services/
    ├── nexrender/           # 기존 (확장)
    └── job_transformer.py   # gfx_data 변환 (신규)
```

### 5.3 main-dashboard (Module 4 - 신규)

```
main-dashboard/
├── src/
│   ├── app/api/             # API Routes
│   ├── components/          # React 컴포넌트 18개
│   ├── hooks/               # Realtime, Data hooks
│   └── stores/              # Zustand 6개
└── package.json
```

### 5.4 sub-dashboard (Module 5 - 신규)

```
sub-dashboard/
├── src/
│   ├── app/api/             # API + WebSocket
│   ├── components/          # React 컴포넌트 16개
│   ├── hooks/               # WebSocket, RenderQueue
│   └── stores/              # Zustand 4개
└── package.json
```

---

## 6. /orchestrate 실행 계획

### 6.1 Phase 1 YAML

```yaml
job_id: gfx_phase1_infrastructure
request: "GFX 파이프라인 Phase 1: 핵심 인프라"

tasks:
  # 병렬 그룹 1A
  - id: task_001
    agent: database-specialist
    action: "json 스키마 DDL 생성"
    depends_on: null

  - id: task_002
    agent: database-specialist
    action: "wsop_plus + manual + ae 스키마 DDL"
    depends_on: null

  - id: task_003
    agent: database-specialist
    action: "unified_* 뷰 + RLS"
    depends_on: [task_001, task_002]

  # 병렬 그룹 1B
  - id: task_004
    agent: python-dev
    action: "RealtimePublisher 구현"
    depends_on: null

  - id: task_005
    agent: test-engineer
    action: "Module 2 통합 테스트"
    depends_on: [task_004]

  # 병렬 그룹 1C
  - id: task_006
    agent: backend-dev
    action: "render_queue 폴링 + Job Claim"
    depends_on: null

  - id: task_007
    agent: backend-dev
    action: "gfx_data → Nexrender 변환"
    depends_on: null

  - id: task_008
    agent: backend-dev
    action: "파일 검증 + NAS 복사"
    depends_on: [task_006, task_007]
```

### 6.2 Phase 2 YAML

```yaml
job_id: gfx_phase2_dashboard
request: "GFX 파이프라인 Phase 2: Dashboard MVP"

tasks:
  # Main Dashboard
  - id: task_101
    agent: frontend-dev
    action: "Main Dashboard 초기화"
    depends_on: null

  - id: task_102
    agent: frontend-dev
    action: "HandBrowser + CuesheetEditor"
    depends_on: [task_101]

  # Sub Dashboard (병렬)
  - id: task_201
    agent: frontend-dev
    action: "Sub Dashboard 초기화"
    depends_on: null

  - id: task_202
    agent: frontend-dev
    action: "CompositionGrid + SlotMapping"
    depends_on: [task_201]

  # WebSocket (순차)
  - id: task_301
    agent: backend-dev
    action: "WebSocket Main ↔ Sub 연동"
    depends_on: [task_102, task_202]

  # 통합 테스트
  - id: task_401
    agent: test-engineer
    action: "Phase 2 통합 테스트"
    depends_on: [task_301]
```

---

## 7. 성공 지표

### Phase 1

- [ ] 23개 테이블 Supabase 생성
- [ ] Module 2 동기화 성공률 99%+
- [ ] Module 6 폴링 → Nexrender 성공

### Phase 2

- [ ] Main Dashboard 핸드 조회 < 2초
- [ ] Sub Dashboard 컴포지션 → 렌더 < 5초
- [ ] WebSocket 연결 99.9% uptime

### Phase 3

- [ ] E2E 전체 파이프라인 < 5분
- [ ] 코드 커버리지 > 80%
- [ ] 보안 취약점 0개 (Critical/High)

---

## 8. 리스크 및 완화

| 리스크 | 영향 | 완화 전략 |
|--------|------|---------|
| Supabase 스키마 변경 | 높음 | Phase 1 확정, 마이그레이션 스크립트 |
| WebSocket 연동 지연 | 중간 | 폴링 폴백 준비 |
| Nexrender 불안정 | 높음 | 재시도 + 지수 백오프 |
| 에이전트 간 충돌 | 낮음 | `/parallel check` 사전 실행 |

---

*최종 수정: 2026-01-15*
