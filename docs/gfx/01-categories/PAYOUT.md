# payout 카테고리 (3개)

> **참조 문서**:
> - [전체 인덱스](../../GFX_AEP_FIELD_MAPPING.md)
> - [변환 함수](../00-common/TRANSFORM_FUNCTIONS.md)

## 개요

상금표 관련 3개 컴포지션을 매핑합니다. 각 컴포지션은 포커 토너먼트의 상금 배분 정보를 표시합니다.

**주요 변경사항 (v2.0.0)**:
- `event_name` 필드 추가 (토너먼트명)
- 두 번째 컴포지션에 `start_rank` 파라미터 추가 (커스텀 시작 순위)

---

## 컴포지션 목록

| # | 컴포지션 | 필드 키 | GFX 소스 | 슬롯 수 | 변환 |
|---|----------|---------|----------|---------|------|
| 1 | Payouts | rank, prize, **event_name** | wsop_events.payouts | **9** | format_currency |
| 2 | Payouts 등수 바꾸기 가능 | rank, prize, **event_name**, **start_rank** | wsop_events.payouts | **11** | format_currency (v2.0 파라미터) |
| 3 | _Mini Payout | name, prize, rank, **event_name** | gfx_sessions.payouts | **9** | format_currency |

> **v2.0.0 변경**: `event_name` 필드 추가 (wsop_events.event_name), `start_rank` 파라미터 추가

---

## 매핑 로직

### Payouts (9 슬롯)

1등부터 9등까지의 상금을 표시합니다.

```sql
-- Payouts: 1등부터 9등까지 + event_name
SELECT
    e.event_name,  -- v2.0 추가
    (payout->>'place')::INTEGER AS slot_index,
    (payout->>'place')::TEXT AS rank,
    format_currency((payout->>'amount')::BIGINT) AS prize
FROM wsop_events e
CROSS JOIN LATERAL jsonb_array_elements(e.payouts) AS payout
WHERE e.id = :event_id
ORDER BY (payout->>'place')::INTEGER
LIMIT 9;
```

**쿼리 설명**:
- `wsop_events.payouts`: JSONB 배열 형식의 상금 데이터
- `jsonb_array_elements()`: JSONB 배열을 행으로 변환
- `format_currency()`: 센트 단위 금액을 달러 표기로 변환
- `LIMIT 9`: 최대 9개 슬롯

---

### Payouts 등수 바꾸기 가능 (11 슬롯) - v2.0 신규

특정 순위부터 시작하여 내림차순으로 최대 11명의 상금을 표시합니다. 방송 중 동적으로 시작 순위를 변경할 수 있습니다.

```sql
-- start_rank 파라미터로 시작 순위 지정, 내림차순 +9등까지 (최대 11슬롯)
WITH ranked_payouts AS (
    SELECT
        e.event_name,
        (payout->>'place')::INTEGER AS place,
        (payout->>'amount')::BIGINT AS amount,
        ROW_NUMBER() OVER (
            ORDER BY (payout->>'place')::INTEGER
        ) AS slot_index
    FROM wsop_events e
    CROSS JOIN LATERAL jsonb_array_elements(e.payouts) AS payout
    WHERE e.id = :event_id
      AND (payout->>'place')::INTEGER >= :start_rank  -- 시작 순위 파라미터
    ORDER BY (payout->>'place')::INTEGER
    LIMIT 11
)
SELECT
    event_name,
    slot_index,
    place AS rank,
    format_currency(amount) AS prize
FROM ranked_payouts;
```

**쿼리 설명**:
- `:start_rank` 파라미터: 표시 시작할 순위 (예: 5 = 5등부터 시작)
- `WHERE ... >= :start_rank`: 지정된 순위 이상의 데이터만 필터링
- `LIMIT 11`: 최대 11개 슬롯 (시작 순위 + 9등까지)
- `ROW_NUMBER()`: 연속된 슬롯 인덱스 생성

**사용 예**:
```
start_rank = 5  → 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15등 표시 (최대 11명)
start_rank = 1  → 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11등 표시
```

---

### _Mini Payout (9 슬롯)

파이널 테이블 플레이어들의 이름, 칩, 순위, 상금을 함께 표시합니다. 수동 세션(gfx_sessions)의 상금 데이터를 사용합니다.

```sql
-- _Mini Payout: 플레이어명 + 칩 + 순위 + 상금
SELECT
    e.event_name,  -- v2.0 추가
    ROW_NUMBER() OVER (ORDER BY hp.end_stack_amt DESC) AS slot_index,
    UPPER(hp.player_name) AS name,
    format_chips(hp.end_stack_amt) AS chips,
    ROW_NUMBER() OVER (ORDER BY hp.end_stack_amt DESC)::TEXT AS rank,
    format_currency((s.payouts[ROW_NUMBER() OVER (ORDER BY hp.end_stack_amt DESC)])::BIGINT) AS prize
FROM gfx_sessions s
JOIN gfx_hand_players hp ON s.id = hp.session_id
WHERE s.id = :session_id
ORDER BY hp.end_stack_amt DESC
LIMIT 9;
```

**쿼리 설명**:
- `gfx_sessions.payouts`: 정수 배열 형식의 상금 데이터
- `gfx_hand_players`: 파이널 테이블 플레이어 정보
- `ROW_NUMBER()`: 칩 기준으로 순위 계산 (내림차순)
- `format_chips()`: 칩 수량을 천단위 포맷으로 변환
- 상금은 순위에 해당하는 배열 인덱스로 조회

---

## 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Payouts 데이터 흐름 (9 슬롯)                              │
└─────────────────────────────────────────────────────────────────────────────┘

1️⃣ GFX JSON / WSOP+ DB
━━━━━━━━━━━━━━━━━━━━━━━━
{
  "Payouts": [1000000, 670000, 475000, ...]  ← gfx_sessions.payouts (정수 배열)
}

-- 또는 wsop_events (JSONB)
{
  "payouts": [
    {"place": 1, "amount": 100000000},  ← cents 단위
    {"place": 2, "amount": 67000000},
    ...
  ]
}

           │ 배열 인덱스 = place - 1
           ▼

2️⃣ DB 조회
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT (payout->>'place')::INTEGER AS rank,
       format_currency((payout->>'amount')::BIGINT) AS prize
FROM wsop_events e,
     LATERAL jsonb_array_elements(e.payouts) AS payout
ORDER BY (payout->>'place')
LIMIT 9;

           │ format_currency()
           │ 100000000 → "$1,000,000"
           ▼

3️⃣ AEP 필드 출력
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "comp_name": "Payouts",
  "slots": [
    {"slot_index": 1, "fields": {"rank": "1", "prize": "$1,000,000"}},
    {"slot_index": 2, "fields": {"rank": "2", "prize": "$670,000"}},
    ...
  ]
}
```

---

## 필드별 상세 매핑

### 12.2.1 Payouts (9 슬롯) - v2.0 업데이트

| AEP 필드 | GFX JSON 경로 | DB 컬럼 | 변환 | 예시 입력 | 예시 출력 |
|----------|---------------|---------|------|-----------|-----------|
| `event_name` | - | `wsop_events.event_name` | 직접 | - | `"MAIN EVENT"` |
| `Rank {N}` | 배열 인덱스 + 1 | `place` | 직접 | `1` | `"1"` |
| `prize {N}` | `Payouts[N-1]` 또는 `payouts[].amount` | `amount` | `format_currency()` | `100000000` | `"$1,000,000"` |
| `total_prize` | `SUM(payouts)` | - | `format_currency()` | - | `"$5,000,000"` |

---

### 12.2.2 Payouts 등수 바꾸기 가능 (11 슬롯) - v2.0 업데이트

| AEP 필드 | 설명 | 예시 |
|----------|------|------|
| `event_name` | 이벤트명 (wsop+) | `"MAIN EVENT"` |
| `start_rank` | 시작 순위 (파라미터) | `5` (5등부터 시작) |
| `Rank {N}` | start_rank + N - 1 | `"5"`, `"6"`, `"7"`, ... |
| `prize {N}` | 해당 순위 상금 | `"$250,000"`, `"$185,000"`, ... |

---

### 12.2.3 _Mini Payout (9 슬롯) - v2.0 업데이트

| AEP 필드 | 소스 | 변환 | 예시 |
|----------|------|------|------|
| `event_name` | `wsop_events.event_name` | 직접 | `"MAIN EVENT"` |
| `name {N}` | `gfx_hand_players.player_name` | `UPPER()` | `"LIPAUKA"` |
| `chips {N}` | `gfx_hand_players.end_stack_amt` | `format_chips()` | `"2,225,000"` |
| `rank {N}` | 계산 (칩 순위) | 직접 | `"1"` |
| `prize {N}` | `gfx_sessions.payouts[rank-1]` | `format_currency()` | `"$1,000,000"` |

---

## 변환 함수 참조

### format_currency()

센트 단위 금액을 달러 표기로 변환합니다.

**서명**: `format_currency(amount BIGINT) RETURNS TEXT`

**예시**:
```sql
SELECT format_currency(100000000);  -- 결과: $1,000,000
SELECT format_currency(250000);     -- 결과: $2,500
```

**특징**:
- IMMUTABLE 함수 (캐시 가능)
- 자동 천단위 구분
- NULL 안전 처리

상세 정보는 [변환 함수 가이드](../00-common/TRANSFORM_FUNCTIONS.md#format_currency)를 참고하세요.

---

## 주의사항

### 데이터 소스 구분

| 컴포지션 | 소스 테이블 | 데이터 형식 |
|----------|------------|-----------|
| Payouts | `wsop_events.payouts` | JSONB 배열 (place, amount) |
| Payouts 등수 바꾸기 가능 | `wsop_events.payouts` | JSONB 배열 (place, amount) |
| _Mini Payout | `gfx_sessions.payouts` | 정수 배열 (순위순) |

### 센트 단위 처리

`wsop_events.payouts`의 `amount` 필드는 **센트 단위**로 저장됩니다:
- DB: `100000000` (센트)
- 표시: `$1,000,000` (달러)

`gfx_sessions.payouts`는 **달러 단위** 정수 배열입니다:
- DB: `[1000000, 670000, ...]`
- 표시: `$1,000,000`, `$670,000`

### NULL 처리

- 상금 데이터가 없으면 해당 슬롯은 비워집니다
- `format_currency(NULL)` = NULL (표시 안 됨)

---

## 관련 문서

- [전체 AEP 필드 매핑](../../GFX_AEP_FIELD_MAPPING.md)
- [GFX 데이터 파이프라인 아키텍처](../GFX_PIPELINE_ARCHITECTURE.md)
- [변환 함수 가이드](../00-common/TRANSFORM_FUNCTIONS.md)
