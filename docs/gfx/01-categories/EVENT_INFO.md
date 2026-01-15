# event_info + schedule 카테고리 (5개)

> **참조 문서**:
> - [전체 인덱스](../../GFX_AEP_FIELD_MAPPING.md)
> - [변환 함수](../00-common/TRANSFORM_FUNCTIONS.md)

## 개요

이벤트 정보 4개 + 방송 일정 1개 컴포지션 매핑. 총 5개 컴포지션으로 구성되며, v2.0.0부터 Event name 필드가 분리되어 날짜 정보와 시리즈명을 별도로 관리합니다.

---

## event_info (4개)

### 컴포지션 목록

| # | 컴포지션 | 필드 키 | GFX 소스 | 변환 |
|---|----------|---------|----------|------|
| 1 | Block Transition INFO | text_제목, text_내용_2줄 | wsop_events + 계산 | 직접 |
| 2 | Event info | wsop_super_circuit_cyprus, buy-in, total_prize_pool, entrants, places_paid, buy_in_fee, total_fee | wsop_events | format_currency, format_number |
| 3 | Event name | event_name (날짜 정보), wsop_super_circuit_cyprus (시리즈명) | wsop_events | 직접 |
| 4 | Location | merit_royal_diamond_hotel | 정적/수동 | 직접 |

> **v2.0.0 변경**: Chips (Source Comp) 제외됨 (Source comp/ 폴더로 이동)
>
> **향후 변경 예정**: Block Transition INFO 컴포지션은 향후 버전에서 text_제목과 text_내용_2줄을 별도 컴포지션으로 분리할 예정

### Event info 매핑 로직

```sql
SELECT
    e.event_name AS wsop_super_circuit_cyprus,  -- 대회 시리즈명 (예: 2025 WSOP SUPER CIRCUIT CYPRUS)
    format_currency(e.buy_in) AS buy_in,         -- 바이인 (예: $5,000)
    format_currency(e.prize_pool) AS total_prize_pool,  -- 총 상금 (예: $5,000,000)
    format_number(e.total_entries) AS entrants,  -- 참가자 수 (예: 1,234)
    e.places_paid::TEXT AS places_paid,          -- 인더머니 (예: 180)
    format_currency(e.buy_in - e.rake) || ' + ' || format_currency(e.rake) AS buy_in_fee,  -- 바이인+수수료 분리
    format_currency(e.buy_in) AS total_fee       -- 총 비용
FROM wsop_events e
WHERE e.id = :event_id;
```

### Event name 매핑 로직 (v2.0 필드 분리)

```sql
-- event_name: 날짜 정보 (MAIN EVENT FINAL DAY / MAIN EVENT DAY 1)
-- wsop_super_circuit_cyprus: 대회 시리즈명 (고정 또는 wsop_events)
SELECT
    e.event_day_name AS event_name,  -- "MAIN EVENT FINAL DAY"
    e.event_name AS wsop_super_circuit_cyprus  -- "2025 WSOP SUPER CIRCUIT CYPRUS"
FROM wsop_events e
WHERE e.id = :event_id;
```

---

## schedule (1개)

### 컴포지션 목록

| # | 컴포지션 | 필드 키 (슬롯) | GFX 소스 | 슬롯 정렬 | 변환 |
|---|----------|----------------|----------|-----------|------|
| 1 | Broadcast Schedule | broadcast_schedule, date 1~6, event 1~6, time 1~6, wsop_super_circuit_cyprus, event_name 1~6 | broadcast_sessions | broadcast_date ASC | format_date, format_time |

### Broadcast Schedule 매핑 로직

```sql
SELECT
    ROW_NUMBER() OVER (ORDER BY bs.broadcast_date, bs.scheduled_start) AS slot_index,
    format_date(bs.broadcast_date) AS date,  -- "Jan 14"
    format_time(bs.scheduled_start) AS time,  -- "05:30 PM"
    bs.event_name AS event_name
FROM broadcast_sessions bs
WHERE bs.broadcast_date >= CURRENT_DATE
ORDER BY bs.broadcast_date, bs.scheduled_start
LIMIT 6;
```

---

## 데이터 흐름 다이어그램

### Broadcast Schedule 데이터 흐름 (6 슬롯)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Broadcast Schedule 데이터 흐름 (6 슬롯)                       │
└─────────────────────────────────────────────────────────────────────────────┘

1️⃣ broadcast_sessions 테이블
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| broadcast_date | scheduled_start | event_name              |
|----------------|-----------------|-------------------------|
| 2026-01-14     | 17:30:00        | Main Event Day 1        |
| 2026-01-15     | 14:00:00        | Main Event Day 2        |
| 2026-01-16     | 18:00:00        | Final Table             |

           │ format_date(), format_time()
           ▼

2️⃣ 변환 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| date     | time      | event_name        |
|----------|-----------|-------------------|
| "Jan 14" | "05:30 PM"| "Main Event Day 1"|
| "Jan 15" | "02:00 PM"| "Main Event Day 2"|

           │ 슬롯 인덱스 매핑
           ▼

3️⃣ AEP 필드 출력
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "comp_name": "Broadcast Schedule",
  "slots": [
    {
      "slot_index": 1,
      "fields": {
        "date": "Jan 14",           ← Date 1
        "time": "05:30 PM",         ← Time 1
        "event_name": "Main Event Day 1"  ← Event Name 1
      }
    }
  ]
}
```

---

## 필드별 상세 매핑

### event_info 카테고리

#### Event info (단일 컴포지션)

| AEP 필드 | DB 테이블.컬럼 | 변환 | 예시 출력 |
|----------|----------------|------|-----------|
| `event_info` | - | 고정 헤더 | `"EVENT INFO"` |
| `wsop_super_circuit_cyprus` | - | 고정 | `"2025 WSOP SUPER CIRCUIT CYPRUS"` |
| `buy-in` | `wsop_events.buy_in` | `format_currency()` | `"$5,000"` |
| `total_prize_pool` | `wsop_events.prize_pool` | `format_currency()` | `"$5,000,000"` |
| `entrants` | `wsop_events.total_entries` | `format_number()` | `"1,234"` |
| `places_paid` | `wsop_events.places_paid` | 직접 | `"180"` |
| `buy_in_fee` | 계산 | - | `"$4,500 + $500"` |
| `total_fee` | 계산 | - | `"$5,000"` |
| `%` | `places_paid / total_entries * 100` | - | `"14.6%"` |
| `num` | `places_paid` | - | `"180"` |

#### Event name - v2.0 필드 분리

| AEP 필드 | DB 소스 | 설명 | 예시 |
|----------|---------|------|------|
| `event_name` | `wsop_events.event_day_name` | 날짜 정보 | `"MAIN EVENT FINAL DAY"` |
| `wsop_super_circuit_cyprus` | `wsop_events.event_name` | 대회 시리즈명 | `"2025 WSOP SUPER CIRCUIT CYPRUS"` |

> **v2.0.0 변경**: 단일 필드 → `event_name` (날짜 정보) + `wsop_super_circuit_cyprus` (시리즈명) 분리

### schedule 카테고리

#### Broadcast Schedule (6 슬롯)

| AEP 필드 | DB 컬럼 | 변환 | 예시 입력 | 예시 출력 |
|----------|---------|------|-----------|-----------|
| `Date {N}` | `broadcast_sessions.broadcast_date` | `format_date()` | `2026-01-14` | `"Jan 14"` |
| `Time {N}` | `broadcast_sessions.scheduled_start` | `format_time()` | `17:30:00` | `"05:30 PM"` |
| `Event Name {N}` | `broadcast_sessions.event_name` | 직접 | - | `"Main Event Day 1"` |

**고정 필드:**

| AEP 필드 | 값 |
|----------|-----|
| `broadcast_schedule` | `"BROADCAST SCHEDULE"` |
| `wsop_super_circuit_cyprus` | `"2025 WSOP SUPER CIRCUIT CYPRUS"` |

---

## 변환 함수 참조

### format_date()

브로드캐스트 날짜를 "Mon DD" 형식으로 변환합니다.

- **입력**: `2026-01-14` (ISO date)
- **출력**: `"Jan 14"`
- **사용 대상**: Broadcast Schedule의 Date 필드

### format_time()

방송 시작 시간을 "HH:MM AM/PM" 형식으로 변환합니다.

- **입력**: `17:30:00` (HH:MM:SS)
- **출력**: `"05:30 PM"`
- **사용 대상**: Broadcast Schedule의 Time 필드

### format_currency()

금액을 "$" 기호와 천 단위 구분자가 있는 형식으로 변환합니다.

- **입력**: `5000` (숫자)
- **출력**: `"$5,000"`
- **사용 대상**: Event info의 buy-in, total_prize_pool, buy_in_fee, total_fee

### format_number()

참가자 수를 천 단위 구분자가 있는 형식으로 변환합니다.

- **입력**: `1234` (숫자)
- **출력**: `"1,234"`
- **사용 대상**: Event info의 entrants

---

## v2.0.0 변경사항 요약

| 항목 | 변경 전 | 변경 후 | 설명 |
|------|---------|---------|------|
| Event name | 단일 필드 | 2개 필드 분리 | `event_name` (날짜) + `wsop_super_circuit_cyprus` (시리즈명) |
| Chips 컴포지션 | event_info에 포함 | Source comp/로 이동 | 카테고리 재구성 |
| Block Transition | 통합 | 향후 분리 예정 | text_제목, text_내용_2줄 별도 컴포지션화 |

---

## 추가 참고사항

- **Broadcast Schedule**: 최대 6개 슬롯을 지원하며, broadcast_date 기준으로 정렬됩니다.
- **Event info**: 하나의 이벤트 당 단일 레코드를 반환하므로 슬롯 개념이 없습니다.
- **고정 필드**: 데이터베이스와 무관하게 항상 같은 값을 출력하는 필드들은 AEP 템플릿에서 직접 관리됩니다.
- **Override**: Event name의 경우 필요시 수동으로 wsop_events 테이블을 업데이트하여 변경할 수 있습니다.
