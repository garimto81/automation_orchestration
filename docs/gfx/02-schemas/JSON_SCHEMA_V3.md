# 렌더링 큐 gfx_data 스키마 v3

> **참조**: [전체 인덱스](../../GFX_AEP_FIELD_MAPPING.md)

## 개요

`render_queue` 테이블의 `gfx_data` JSONB 컬럼 스키마 정의 문서입니다. v3.0.0은 v2.0.0의 모든 기능을 포함하며, 칩 비교, 칩 흐름, 플레이어 히스토리, 위험 플레이어 정보 등의 고급 기능을 제공합니다.

## v3.0.0 주요 업그레이드

> **v2.0.0 → v3.0.0**: `render_gfx_data_v2` → `render_gfx_data_v3`

| 기능 | 상태 | 설명 |
|------|------|------|
| `chip_comparison` 구조 | ✅ 신규 | 선택 플레이어 백분율 기반 칩 비교 |
| `chip_flow` 구조 | ✅ 신규 | 10/20/30 핸드 칩 배열 및 히스토리 |
| `player_history` 구조 | ✅ 신규 | 히스토리 칩 변화량 계산 |
| `at_risk` 구조 | ✅ 신규 | 필드 분리 및 위험 플레이어 정보 |
| `payouts` 구조 | ✅ 업데이트 | `event_name`, `start_rank` 필드 추가 |

---

## 전체 JSON 스키마

```json
{
  "$schema": "render_gfx_data_v3",
  "version": "3.0.0",
  "comp_name": "_MAIN Mini Chip Count",
  "render_type": "chip_count",

  "slots": [
    {
      "slot_index": 1,
      "fields": {
        "name": "PHIL IVEY",
        "chips": "1,500,000",
        "bbs": "75.0",
        "rank": "1",
        "flag": "Flag/United States.png"
      }
    }
  ],

  "single_fields": {
    "event_name": "MAIN EVENT FINAL DAY",
    "wsop_super_circuit_cyprus": "2025 WSOP SUPER CIRCUIT CYPRUS"
  },

  "chip_comparison": {
    "selected_player_name": "PHIL IVEY",
    "selected_player_chips": "1,500,000",
    "selected_player_percent": "35.4%",
    "others_chips": "2,735,000",
    "others_percent": "64.6%"
  },

  "chip_flow": {
    "player_name": "PHIL IVEY",
    "chips_10h": [1500000, 1480000, 1450000, 1420000, 1400000, 1380000, 1350000, 1320000, 1300000, 1280000],
    "chips_20h": [1500000, 1480000, 1450000, "...최근 20핸드"],
    "chips_30h": [1500000, 1480000, 1450000, "...최근 30핸드"],
    "max_label": "1,620,000",
    "min_label": "1,200,000"
  },

  "player_history": {
    "current_chips": 1500000,
    "chips_10_hands_ago": 1380000,
    "chips_20_hands_ago": 1250000,
    "chips_30_hands_ago": 1100000,
    "chip_change_10h": "+120,000",
    "chip_change_20h": "+250,000",
    "chip_change_30h": "+400,000"
  },

  "at_risk": {
    "player_name": "JOHN DOE",
    "rank": 9,
    "prize": "$82,000",
    "flag": "Flag/United States.png"
  },

  "payouts": {
    "event_name": "MAIN EVENT - FINAL TABLE",
    "start_rank": 1,
    "entries": [
      {"slot_index": 1, "rank": "1", "prize": "$1,000,000"},
      {"slot_index": 2, "rank": "2", "prize": "$670,000"}
    ]
  },

  "metadata": {
    "session_id": 638677842396130000,
    "hand_num": 42,
    "event_id": "uuid-event-id",
    "blind_level": "10K/20K",
    "data_sources": ["gfx_hand_players", "wsop_events", "unified_players"],
    "generated_at": "2026-01-14T10:35:00Z",
    "schema_version": "3.0.0"
  }
}
```

---

## 필드별 상세 설명

### chip_comparison (v2.0 신규)

**목적**: UI 선택 플레이어 기준 칩 분포 비교

**필드 구조**:

| 필드 | 타입 | 설명 | 계산 방식 |
|------|------|------|---------|
| `selected_player_name` | `string` | 선택된 플레이어명 (대문자) | `UPPER(player_name)` |
| `selected_player_chips` | `string` | 선택 플레이어 현재 칩 | `format_chips(end_stack_amt)` |
| `selected_player_percent` | `string` | 선택 플레이어 칩 비율 | `(selected_chips / total_chips) * 100` |
| `others_chips` | `string` | 나머지 플레이어 칩 합계 | `format_chips(total_chips - selected_chips)` |
| `others_percent` | `string` | 나머지 플레이어 칩 비율 | `100% - selected_player_percent` |

**사용 사례**:

```json
{
  "chip_comparison": {
    "selected_player_name": "PHIL IVEY",
    "selected_player_chips": "1,500,000",
    "selected_player_percent": "35.4%",
    "others_chips": "2,735,000",
    "others_percent": "64.6%"
  }
}
```

**데이터 출처**: `gfx_hand_players` (현재 핸드)

---

### chip_flow (v2.0 신규)

**목적**: 플레이어의 최근 핸드 히스토리 기반 칩 변화 추이

**필드 구조**:

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `player_name` | `string` | 플레이어명 (대문자) | `"PHIL IVEY"` |
| `chips_10h` | `number[]` | 최근 10핸드 칩 배열 | `[1500000, 1480000, ...]` (정수 배열) |
| `chips_20h` | `number[]` | 최근 20핸드 칩 배열 | `[1500000, 1480000, ...]` (정수 배열) |
| `chips_30h` | `number[]` | 최근 30핸드 칩 배열 | `[1500000, 1480000, ...]` (정수 배열) |
| `max_label` | `string` | 최고점 레이블 (포맷됨) | `"1,620,000"` |
| `min_label` | `string` | 최저점 레이블 (포맷됨) | `"1,200,000"` |

**수집 로직**:

1. UI에서 플레이어명 선택
2. 현재 핸드로부터 역순으로 10/20/30 핸드 전까지 거슬러 올라가며 칩 수집
3. 각 배열에서 MAX/MIN 값 추출 및 포맷

**사용 사례**:

```json
{
  "chip_flow": {
    "player_name": "PHIL IVEY",
    "chips_10h": [1500000, 1480000, 1450000, 1420000, 1400000, 1380000, 1350000, 1320000, 1300000, 1280000],
    "chips_20h": [...],
    "chips_30h": [...],
    "max_label": "1,620,000",
    "min_label": "1,200,000"
  }
}
```

**데이터 출처**: `gfx_hand_players` (히스토리 조회)

---

### at_risk (v2.0 신규)

**목적**: 최단 스택 플레이어(위험 상황) 정보 제공

**필드 구조**:

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `player_name` | `string` | 플레이어명 | `"JOHN DOE"` |
| `rank` | `integer` | 현재 순위 | `9` |
| `prize` | `string` | 버스트 시 예상 상금 | `"$82,000"` |
| `flag` | `string` | 국기 이미지 경로 | `"Flag/United States.png"` |

**선택 기준**: 현재 핸드에서 가장 적은 칩을 가진 플레이어

**사용 사례**:

```json
{
  "at_risk": {
    "player_name": "JOHN DOE",
    "rank": 9,
    "prize": "$82,000",
    "flag": "Flag/United States.png"
  }
}
```

**데이터 출처**: `gfx_hand_players` + `wsop_events` (payouts)

---

### player_history (v2.0 신규)

**목적**: 특정 플레이어의 과거 칩 상태 및 변화량 기록

**필드 구조**:

| 필드 | 타입 | 설명 | 계산 방식 |
|------|------|------|---------|
| `current_chips` | `integer` | 현재 칩 (정수, 미포맷) | `end_stack_amt` |
| `chips_10_hands_ago` | `integer` | 10핸드 전 칩 | `gfx_hand_players WHERE hand_num = current_hand_num - 10` |
| `chips_20_hands_ago` | `integer` | 20핸드 전 칩 | `gfx_hand_players WHERE hand_num = current_hand_num - 20` |
| `chips_30_hands_ago` | `integer` | 30핸드 전 칩 | `gfx_hand_players WHERE hand_num = current_hand_num - 30` |
| `chip_change_10h` | `string` | 10핸드 동안 변화량 | `current_chips - chips_10_hands_ago` (포맷됨) |
| `chip_change_20h` | `string` | 20핸드 동안 변화량 | `current_chips - chips_20_hands_ago` (포맷됨) |
| `chip_change_30h` | `string` | 30핸드 동안 변화량 | `current_chips - chips_30_hands_ago` (포맷됨) |

**사용 사례**:

```json
{
  "player_history": {
    "current_chips": 1500000,
    "chips_10_hands_ago": 1380000,
    "chips_20_hands_ago": 1250000,
    "chips_30_hands_ago": 1100000,
    "chip_change_10h": "+120,000",
    "chip_change_20h": "+250,000",
    "chip_change_30h": "+400,000"
  }
}
```

**데이터 출처**: `gfx_hand_players` (히스토리 조회)

---

## 버전 히스토리

### v1.0.0

**초기 버전**:
- 기본 슬롯 구조 (`slots`, `single_fields`)
- 메타데이터만 포함
- 단일 필드 데이터만 지원

**제한사항**:
- 플레이어 비교 불가
- 히스토리 데이터 미지원
- 칩 흐름 시각화 불가

---

### v2.0.0 (신규 필드 추가)

**주요 변경**:

| 항목 | 변경 사항 |
|------|---------|
| **chip_comparison** | 신규 추가 - UI 선택 플레이어 기준 비교 |
| **chip_flow** | 신규 추가 - 10/20/30 핸드 히스토리 배열 |
| **player_history** | 신규 추가 - 과거 칩 상태 및 변화량 |
| **at_risk** | 신규 추가 - 최단 스택 플레이어 정보 |
| **payouts** | `event_name`, `start_rank` 필드 추가 |

**이점**:
- 실시간 플레이어 비교 가능
- 칩 변화 추이 시각화
- 위험 상황 감시

---

### v3.0.0 (현재)

**개선사항**:
- v2.0.0의 모든 필드 통합 및 정규화
- 메타데이터 확장 (`data_sources`, `schema_version`)
- 배열 필드 타입 강화 (모두 정수 배열)
- 포맷팅 규칙 명확화

**호환성**:
- v2.0.0과의 하위 호환성 유지
- 새 필드는 선택사항 (기존 시스템과 공존)

---

## 데이터 흐름 다이어그램

### chip_comparison 데이터 흐름

```
1️⃣ UI 선택 (player_name)
   ↓
2️⃣ 전체 칩 계산 (gfx_hand_players)
   ├─ Phil Ivey: 1,500,000 (35.4%) ← 선택
   ├─ Others: 2,735,000 (64.6%)
   ↓
3️⃣ format_percent() + format_chips()
   ↓
4️⃣ AEP 필드 출력
{
  "selected_player_name": "PHIL IVEY",
  "selected_player_chips": "1,500,000",
  "selected_player_percent": "35.4%",
  "others_chips": "2,735,000",
  "others_percent": "64.6%"
}
```

### chip_flow 데이터 흐름

```
1️⃣ UI 선택 (player_name, session_id, hand_num)
   ↓
2️⃣ 히스토리 쿼리 실행
   ├─ gfx_hand_players WHERE session_id = ? AND player_name = ?
   ├─ Hand 42 (현재): 1,500,000
   ├─ Hand 32 (10핸드 전): 1,380,000
   ├─ Hand 22 (20핸드 전): 1,250,000
   ├─ Hand 12 (30핸드 전): 1,100,000
   ↓
3️⃣ 배열 생성 및 MAX/MIN 계산
   ├─ chips_10h = [1500000, 1480000, ...]
   ├─ max = 1,620,000 → format_chips() → "1,620,000"
   ├─ min = 1,100,000 → format_chips() → "1,100,000"
   ↓
4️⃣ AEP 필드 출력
{
  "player_name": "PHIL IVEY",
  "chips_10h": [1500000, ...],
  "chips_20h": [...],
  "chips_30h": [...],
  "max_label": "1,620,000",
  "min_label": "1,100,000"
}
```

### player_history 데이터 흐름

```
1️⃣ 특정 시점 칩 조회 (hand_num 차이)
   ├─ Hand #42 (현재): 1,500,000
   ├─ Hand #32 (10핸드 전): 1,380,000
   ├─ Hand #22 (20핸드 전): 1,250,000
   ├─ Hand #12 (30핸드 전): 1,100,000
   ↓
2️⃣ 변화량 계산
   ├─ 10h: 1,500,000 - 1,380,000 = +120,000
   ├─ 20h: 1,500,000 - 1,250,000 = +250,000
   ├─ 30h: 1,500,000 - 1,100,000 = +400,000
   ↓
3️⃣ 포맷팅 및 부호 추가
   ├─ format_chips(120000) + "+" → "+120,000"
   ↓
4️⃣ AEP 필드 출력
{
  "current_chips": 1500000,
  "chips_10_hands_ago": 1380000,
  "chips_20_hands_ago": 1250000,
  "chips_30_hands_ago": 1100000,
  "chip_change_10h": "+120,000",
  "chip_change_20h": "+250,000",
  "chip_change_30h": "+400,000"
}
```

---

## 포맷팅 규칙

### chips (정수 배열)

**타입**: `number[]`

**설명**: 칩 값은 정수로 유지 (포맷 미적용)

**예시**:
```json
"chips_10h": [1500000, 1480000, 1450000, 1420000]
```

### 포맷된 칩 필드 (문자열)

**함수**: `format_chips(number) → string`

**규칙**:
- 3자리마다 쉼표 추가
- 예: `1620000` → `"1,620,000"`

**예시**:
```json
"selected_player_chips": "1,500,000",
"max_label": "1,620,000"
```

### 백분율 필드

**함수**: `format_percent(number) → string`

**규칙**:
- 소수점 1자리까지 표시
- `%` 기호 포함
- 예: `35.4` → `"35.4%"`

**예시**:
```json
"selected_player_percent": "35.4%",
"others_percent": "64.6%"
```

### 변화량 필드

**함수**: `format_chip_change(number) → string`

**규칙**:
- 양수: `"+" 접두사`
- 음수: `"-"` 자동 포함
- 3자리마다 쉼표
- 예: `120000` → `"+120,000"`, `-120000` → `"-120,000"`

**예시**:
```json
"chip_change_10h": "+120,000",
"chip_change_20h": "+250,000"
```

---

## 스키마 검증

### 타입 검증

| 필드 | 예상 타입 | 검증 |
|------|---------|------|
| `version` | `string` | `^3\.0\.0$` |
| `comp_name` | `string` | 비어있지 않음 |
| `slots[].slot_index` | `integer` | `>= 1` |
| `chip_flow.chips_10h` | `number[]` | 길이 `<= 10` |
| `chip_flow.chips_20h` | `number[]` | 길이 `<= 20` |
| `chip_flow.chips_30h` | `number[]` | 길이 `<= 30` |
| `player_history.current_chips` | `integer` | `>= 0` |
| `metadata.schema_version` | `string` | `"3.0.0"` |

### 선택 필드

다음 필드는 렌더링 유형에 따라 선택:

- `chip_comparison`: chip_count/comparison 렌더링에만 필요
- `chip_flow`: chip_flow 렌더링에만 필요
- `player_history`: history 렌더링에만 필요
- `at_risk`: at_risk 렌더링에만 필요

---

## 관련 문서

| 문서 | 위치 | 설명 |
|------|------|------|
| GFX AEP Field Mapping | `docs/gfx/GFX_AEP_FIELD_MAPPING.md` | 전체 필드 매핑 명세 |
| GFX Pipeline Architecture | `docs/GFX_PIPELINE_ARCHITECTURE.md` | 5계층 파이프라인 |
| WSOP+ DB Schema | `automation_schema/docs/WSOP+ DB.md` | 데이터베이스 스키마 |
| Manual DB Schema | `automation_schema/docs/Manual DB.md` | 수동 오버라이드 스키마 |

---

**문서 버전**: 3.0.0 | **최종 업데이트**: 2026-01-15
