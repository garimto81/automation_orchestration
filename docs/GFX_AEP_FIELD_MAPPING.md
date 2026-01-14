# GFX JSON DB → AEP 자막 매핑 명세서

**Version**: 1.2.0
**Last Updated**: 2026-01-14
**Status**: Active

---

## 1. 개요

### 1.1 목적

GFX JSON DB 데이터를 After Effects **27개 컴포지션** (방송 전or후 뽑기 11개 + 방송 중 뽑기 16개)의 자막 필드에 매핑하는 전체 명세서.

### 1.2 범위 정의

| 포함 범위 | 개수 | 설명 |
|-----------|------|------|
| 방송 전or후 뽑기 | 11개 | 스케줄, 이벤트 정보, 스태프 등 |
| 방송 중 뽑기 | 16개 | 칩 디스플레이, 플레이어 정보 등 |
| **총합** | **27개** | |

| 제외 범위 | 위치 | 사유 |
|-----------|------|------|
| Feature Table Leaderboard MAIN/SUB | Comp/ 폴더 | 사용자 요청 범위 외 |
| 14개 element | Source comp/ 폴더 | 정적 precomp |

### 1.3 출력 언어

모든 자막은 **영문 출력** (글로벌 시청자 대상)

---

## 2. 데이터 소스 우선순위

```
┌─────────────────────────────────────────────────────────────┐
│                    데이터 소스 우선순위                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣ GFX JSON DB (기본 소스 - Primary)                      │
│     - gfx_hand_players: 플레이어명, 칩 카운트               │
│     - gfx_hands: 블라인드, 팟, 보드 카드                    │
│     - gfx_sessions: 이벤트 제목, payouts                    │
│     → 실시간 피처 테이블 데이터                             │
│                                                             │
│  2️⃣ WSOP+ DB (보조 소스 - Secondary)                       │
│     - wsop_standings: 전체 순위표 (30명+)                   │
│     - wsop_events: 이벤트 상세 정보, 공식 payouts           │
│     → 피처 테이블 외 전체 데이터                            │
│                                                             │
│  3️⃣ Manual DB (오버라이드 - Override Only)                 │
│     - ❌ 기본 데이터 소스 아님                              │
│     - ✅ 잘못된 데이터 수정 (이름 오타 등)                  │
│     - ✅ 선수 프로필 보완 (국적, 프로필 이미지 등)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 소스별 역할

| 소스 DB | 테이블 | 역할 | 우선순위 |
|---------|--------|------|----------|
| GFX JSON DB | gfx_hand_players | 기본 소스: 플레이어명, 칩 카운트 | Primary |
| GFX JSON DB | gfx_hands | 기본 소스: 블라인드, 팟, 보드 카드 | Primary |
| GFX JSON DB | gfx_sessions | 기본 소스: 이벤트 제목, payouts | Primary |
| WSOP+ DB | wsop_standings | 보조 소스: 전체 순위표 (30명+) | Secondary |
| WSOP+ DB | wsop_events | 보조 소스: 이벤트 상세, 공식 payouts | Secondary |
| Manual DB | manual_players | 오버라이드: 잘못된 데이터 수정, 프로필 보완 | Override |
| Manual DB | unified_players | 통합 뷰 (Manual 오버라이드 적용) | - |

---

## 3. 카테고리별 컴포지션 매핑 (27개)

### 3.1 chip_display (7개) - 칩 표시

| # | 컴포지션 | 필드 키 | GFX 소스 | 슬롯 수 | 변환 |
|---|----------|---------|----------|---------|------|
| 1 | _MAIN Mini Chip Count | name, chips, bbs, rank | gfx_hand_players | **8** | UPPER, format_chips, format_bbs |
| 2 | _SUB_Mini Chip Count | name, chips, bbs, rank | gfx_hand_players | **7** | UPPER, format_chips, format_bbs |
| 3 | Chips In Play x3 | chips_in_play, level | gfx_hands.blinds, 계산 | **3** | format_chips |
| 4 | Chips In Play x4 | chips_in_play, level | gfx_hands.blinds, 계산 | **4** | format_chips |
| 5 | Chip Comparison | player_%, 플레이어_네임,_bb_입력 | gfx_hand_players | 0 | 직접 |
| 6 | Chip Flow | 플레이어_네임,_bb_입력, input_5_display | gfx_hand_players + 계산 | 0 | 그래프 데이터 |
| 7 | Chip VPIP | vpip, name | gfx_hand_players | 0 | 직접 |

**매핑 로직:**

```sql
-- _MAIN Mini Chip Count: 8명까지 칩 순위 표시 (실제 AEP 슬롯 수)
SELECT
    ROW_NUMBER() OVER (ORDER BY hp.end_stack_amt DESC) AS slot_index,
    UPPER(hp.player_name) AS name,
    format_chips(hp.end_stack_amt) AS chips,
    format_bbs(hp.end_stack_amt, (h.blinds->>'big_blind_amt')::BIGINT) AS bbs,
    slot_index::TEXT AS rank,
    get_flag_path(COALESCE(up.country_code, 'XX')) AS flag
FROM gfx_hand_players hp
JOIN gfx_hands h ON hp.hand_id = h.id
LEFT JOIN unified_players up ON LOWER(hp.player_name) = LOWER(up.name)
WHERE hp.sitting_out = FALSE
  AND h.session_id = :session_id
  AND h.hand_num = :hand_num
ORDER BY hp.end_stack_amt DESC
LIMIT 8;
```

---

### 3.2 payout (3개) - 상금표

| # | 컴포지션 | 필드 키 | GFX 소스 | 슬롯 수 | 변환 |
|---|----------|---------|----------|---------|------|
| 1 | Payouts | rank, prize | wsop_events.payouts | **9** | format_currency |
| 2 | Payouts 등수 바꾸기 가능 | rank, prize | wsop_events.payouts | **12** | format_currency |
| 3 | _Mini Payout | name, prize, rank | gfx_sessions.payouts | **9** | format_currency |

**매핑 로직:**

```sql
-- Payouts: 실제 AEP 슬롯 수 = 9
SELECT
    (payout->>'place')::INTEGER AS slot_index,
    (payout->>'place')::TEXT AS rank,
    format_currency((payout->>'amount')::BIGINT) AS prize
FROM wsop_events e
CROSS JOIN LATERAL jsonb_array_elements(e.payouts) AS payout
WHERE e.id = :event_id
ORDER BY (payout->>'place')::INTEGER
LIMIT 9;
```

---

### 3.3 event_info (5개) - 이벤트 정보

| # | 컴포지션 | 필드 키 | GFX 소스 | 변환 |
|---|----------|---------|----------|------|
| 1 | Block Transition INFO | text_제목, text_내용_2줄 | wsop_events + 계산 | 직접 |
| 2 | Event info | event_info, wsop_super_circuit_cyprus, buy-in, total_prize_pool, entrants, places_paid, buy_in_fee, total_fee, %, num | wsop_events | format_currency, format_number |
| 3 | Event name | event_name | gfx_sessions.event_title 또는 wsop_events.event_name | 직접 |
| 4 | Location | merit_royal_diamond_hotel | 정적/수동 | 직접 |
| 5 | Chips (Source Comp) | chip | 정적 | - |

**매핑 로직:**

```sql
SELECT
    e.event_name,
    format_currency(e.buy_in) AS buy_in,
    format_currency(e.prize_pool) AS total_prize_pool,
    format_number(e.total_entries) AS entrants,
    e.places_paid::TEXT
FROM wsop_events e
WHERE e.id = :event_id;
```

---

### 3.4 schedule (1개) - 방송 일정

| # | 컴포지션 | 필드 키 (슬롯) | GFX 소스 | 슬롯 정렬 | 변환 |
|---|----------|----------------|----------|-----------|------|
| 1 | Broadcast Schedule | broadcast_schedule, date 1~6, event 1~6, time 1~6, wsop_super_circuit_cyprus, event_name 1~6 | broadcast_sessions | broadcast_date ASC | format_date, format_time |

**매핑 로직:**

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

### 3.5 staff (2개) - 스태프

| # | 컴포지션 | 필드 키 (슬롯) | GFX 소스 | 슬롯 수 | 변환 |
|---|----------|----------------|----------|---------|------|
| 1 | Commentator | name, sub, commentary, text_제목 | manual.commentators | **4** | 직접 |
| 2 | Reporter | name, sub | manual.reporters | **4** | 직접 |

**매핑 로직:**

```sql
SELECT
    ROW_NUMBER() OVER () AS slot_index,
    c.name,
    c.social_handle AS sub
FROM manual_commentators c
WHERE c.event_id = :event_id
LIMIT 4;
```

---

### 3.6 player_info (3개) - 플레이어 정보

| # | 컴포지션 | 필드 키 | 기본 소스 | Override | 변환 |
|---|----------|---------|-----------|----------|------|
| 1 | NAME | player_name, 국기 | gfx_hand_players | Manual (오타 수정) | 직접, get_flag_path |
| 2 | NAME 1줄 | player_name | gfx_hand_players | Manual | 직접 |
| 3 | NAME 2줄 (국기 빼고) | player_name (2줄) | gfx_hand_players | Manual | 직접 |

**매핑 로직:**

```sql
-- 기본: GFX에서 추출, Manual 오버라이드 있으면 적용
SELECT
    COALESCE(mo.corrected_name, hp.player_name) AS player_name,  -- Manual 오버라이드 우선
    COALESCE(mo.country_code, 'XX') AS country_code,  -- 국적은 Manual에서만 관리
    get_flag_path(COALESCE(mo.country_code, 'XX')) AS flag
FROM gfx_hand_players hp
LEFT JOIN manual_player_overrides mo ON LOWER(hp.player_name) = LOWER(mo.original_name)
WHERE hp.hand_id = :hand_id AND hp.seat_num = :seat_num;
```

**Manual Override 용도:**
- `corrected_name`: 이름 오타 수정 (예: "PHILL IVEY" → "PHIL IVEY")
- `country_code`: 국적 정보 추가 (GFX에는 없음)
- `profile_image`: 프로필 이미지 경로

---

### 3.7 elimination (2개) - 탈락

| # | 컴포지션 | 필드 키 | GFX 소스 | 변환 |
|---|----------|---------|----------|------|
| 1 | Elimination | name, rank, prize, 국기 | gfx_hand_players + wsop_events.payouts | format_currency, get_flag_path |
| 2 | At Risk of Elimination | text_내용 | gfx_hand_players | 직접 |

**매핑 로직:**

```sql
SELECT
    hp.player_name AS name,
    hp.elimination_rank AS rank,
    format_currency(
        (SELECT (payout->>'amount')::BIGINT FROM wsop_events e,
         LATERAL jsonb_array_elements(e.payouts) AS payout
         WHERE e.id = :event_id AND (payout->>'place')::INTEGER = hp.elimination_rank)
    ) AS prize,
    get_flag_path(COALESCE(up.country_code, 'XX')) AS flag
FROM gfx_hand_players hp
LEFT JOIN unified_players up ON LOWER(hp.player_name) = LOWER(up.name)
WHERE hp.elimination_rank > 0
ORDER BY hp.elimination_rank;
```

---

### 3.8 transition (2개) - 전환 화면

| # | 컴포지션 | 필드 키 | 소스 | 비고 |
|---|----------|---------|------|------|
| 1 | 1-NEXT STREAM STARTING SOON | wsop_vlogger_program, https://... | 정적 | 고정 텍스트 |
| 2 | (기타) | - | - | - |

---

### 3.9 other (4개) - 기타

| # | 컴포지션 | 필드 키 | 소스 | 비고 |
|---|----------|---------|------|------|
| 1 | 1-Hand-for-hand play is currently in progress | event_#12:... | 정적 | 고정 텍스트 |
| 2-4 | (기타) | - | - | - |

---

## 4. 슬롯 인덱스 결정 규칙

### 4.1 공통 정렬 기준

| 카테고리 | 정렬 기준 | 예시 |
|----------|-----------|------|
| chip_display | end_stack_amt DESC | 칩 1위 → Name 1 |
| payout | place ASC | 1등 → Prize 1 |
| schedule | broadcast_date ASC | 첫 날짜 → Date 1 |
| staff | 입력 순서 | 첫 번째 → Name 1 |

### 4.2 sitting_out 처리

- `gfx_hand_players.sitting_out = TRUE` 플레이어 제외
- 빈 슬롯은 빈 문자열("")로 전송

---

## 5. 데이터 변환 함수 DDL

```sql
-- 칩 포맷팅: 1500000 → "1,500,000"
CREATE FUNCTION format_chips(amount BIGINT) RETURNS TEXT AS $$
    SELECT TO_CHAR(amount, 'FM999,999,999,999')
$$ LANGUAGE SQL IMMUTABLE;

-- BB 포맷팅: (chips, bb) → "75.0"
CREATE FUNCTION format_bbs(chips BIGINT, bb BIGINT) RETURNS TEXT AS $$
    SELECT TO_CHAR(chips::NUMERIC / NULLIF(bb, 0), 'FM999,999.9')
$$ LANGUAGE SQL IMMUTABLE;

-- 통화 포맷팅: cents → "$15,000"
CREATE FUNCTION format_currency(amount BIGINT) RETURNS TEXT AS $$
    SELECT '$' || TO_CHAR(amount / 100, 'FM999,999,999')
$$ LANGUAGE SQL IMMUTABLE;

-- 날짜 포맷팅: 2026-01-14 → "Jan 14"
CREATE FUNCTION format_date(d DATE) RETURNS TEXT AS $$
    SELECT TO_CHAR(d, 'Mon DD')
$$ LANGUAGE SQL IMMUTABLE;

-- 시간 포맷팅: 17:30 → "05:30 PM"
CREATE FUNCTION format_time(t TIME) RETURNS TEXT AS $$
    SELECT TO_CHAR(t, 'HH:MI AM')
$$ LANGUAGE SQL IMMUTABLE;

-- 블라인드 포맷팅: (10000, 20000, 20000) → "10K/20K (20K)"
CREATE FUNCTION format_blinds(sb BIGINT, bb BIGINT, ante BIGINT) RETURNS TEXT AS $$
    SELECT format_chips_short(sb) || '/' || format_chips_short(bb) ||
           CASE WHEN ante > 0 THEN ' (' || format_chips_short(ante) || ')' ELSE '' END
$$ LANGUAGE SQL IMMUTABLE;

-- 국기 경로: "KR" → "Flag/Korea.png"
CREATE FUNCTION get_flag_path(country_code VARCHAR) RETURNS TEXT AS $$
    SELECT COALESCE(
        (SELECT file_path FROM aep_media_sources WHERE category = 'Flag' AND country_code = UPPER($1)),
        'Flag/Unknown.png'
    )
$$ LANGUAGE SQL STABLE;
```

---

## 6. gfx_aep_field_mappings 테이블

### 6.1 스키마

```sql
CREATE TABLE gfx_aep_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    composition_name VARCHAR(255) NOT NULL,
    composition_category aep_category NOT NULL,
    target_field_key VARCHAR(100) NOT NULL,
    slot_range_start INTEGER,
    slot_range_end INTEGER,
    source_table VARCHAR(100) NOT NULL,
    source_column VARCHAR(100) NOT NULL,
    source_join TEXT,
    transform VARCHAR(50),
    slot_order_by VARCHAR(100),
    slot_filter TEXT,
    priority INTEGER DEFAULT 100,
    UNIQUE(composition_name, target_field_key)
);
```

### 6.2 초기 데이터 예시

```sql
INSERT INTO gfx_aep_field_mappings VALUES
-- _MAIN Mini Chip Count: 실제 AEP 슬롯 수 = 8
('_MAIN Mini Chip Count', 'chip_display', 'name', 1, 8,
 'gfx_hand_players', 'player_name', NULL, 'UPPER',
 'end_stack_amt DESC', 'sitting_out = FALSE', 100),

('_MAIN Mini Chip Count', 'chip_display', 'chips', 1, 8,
 'gfx_hand_players', 'end_stack_amt', NULL, 'format_chips',
 'end_stack_amt DESC', 'sitting_out = FALSE', 100),

-- Payouts: 실제 AEP 슬롯 수 = 9
('Payouts', 'payout', 'rank', 1, 9,
 'wsop_events', 'payouts->place', NULL, 'direct',
 'place ASC', NULL, 100);
```

---

## 7. 렌더링 큐 gfx_data 스키마 v2

```json
{
  "$schema": "render_gfx_data_v2",
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
    "wsop_super_circuit_cyprus": "2025 WSOP SUPER CIRCUIT CYPRUS"
  },
  "metadata": {
    "session_id": 638677842396130000,
    "hand_num": 42,
    "blind_level": "10K/20K",
    "data_sources": ["gfx_hand_players", "unified_players"]
  }
}
```

---

## 8. 컴포지션 카테고리 요약 (27개)

| 카테고리 | 개수 | 동적 매핑 | 주요 소스 | 실제 슬롯 수 |
|----------|------|-----------|-----------|--------------|
| chip_display | 7 | ✅ | gfx_hand_players | 8, 7, 3, 4, 0, 0, 0 |
| payout | 3 | ✅ | wsop_events | 9, 12, 9 |
| event_info | 5 | ✅ | wsop_events, gfx_sessions | - |
| schedule | 1 | ✅ | broadcast_sessions | 6 |
| staff | 2 | ✅ | manual.commentators | 4, 4 |
| player_info | 3 | ✅ | gfx_hand_players + Manual | - |
| elimination | 2 | ✅ | gfx_hand_players | - |
| transition | 2 | ❌ | 정적 | - |
| other | 2 | ❌ | 정적 | - |
| **Total** | **27** | - | - | - |

> ⚠️ **제외된 카테고리**:
> - `leaderboard` (3개): Comp/ 폴더 위치로 범위 외
> - `element` (14개): Source comp/ 폴더 위치로 범위 외

---

## 9. 관련 문서

| 문서 | 위치 | 설명 |
|------|------|------|
| GFX Pipeline Architecture | `docs/GFX_PIPELINE_ARCHITECTURE.md` | 5계층 파이프라인 아키텍처 |
| 08-GFX-AEP-Mapping | `automation_schema/docs/08-GFX-AEP-Mapping.md` | 참조 문서 (병행 유지) |
| WSOP+ DB Schema | `automation_schema/docs/WSOP+ DB.md` | WSOP+ 데이터베이스 스키마 |
| Manual DB Schema | `automation_schema/docs/Manual DB.md` | Manual 오버라이드 스키마 |

---

## 10. 검증 방법

1. **27개 컴포지션별 field_keys 매핑 완료 확인**
2. **SQL 함수 DDL 문법 검증**
3. **JSON Schema 유효성 확인**
4. **샘플 데이터로 렌더링 테스트**
5. **실제 AEP 슬롯 수와 매핑 일치 확인** (03_text_layers.json 기준)

---

## 11. 데이터 흐름 다이어그램

### 11.1 전체 파이프라인 흐름

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GFX JSON → DB → AEP 전체 데이터 흐름                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   PokerGFX       │     │   PostgreSQL     │     │   After Effects  │
│   JSON 파일      │────▶│   테이블 저장    │────▶│   컴포지션       │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ • ID (GameID)    │     │ • gfx_sessions   │     │ • 27개 컴포지션  │
│ • EventTitle     │     │ • gfx_hands      │     │ • 텍스트 레이어  │
│ • Hands[]        │     │ • gfx_hand_players│    │ • 슬롯 기반 매핑 │
│ • Players[]      │     │ • unified_players │    │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### 11.2 chip_display 카테고리 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               _MAIN Mini Chip Count 데이터 흐름 (8 슬롯)                      │
└─────────────────────────────────────────────────────────────────────────────┘

1️⃣ GFX JSON 원본 (PokerGFX 출력)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "Hands": [{
    "HandNum": 42,
    "FlopDrawBlinds": {
      "BigBlind_Amt": 20000        ─────────────────────────┐
    },                                                      │
    "Players": [                                            │
      {                                                     │
        "PlayerNum": 1,                                     │
        "Name": "Phil",           ──────────────────┐       │
        "LongName": "Phil Ivey",                    │       │
        "EndStackAmt": 1620000,   ──────────────────┼───┐   │
        "VPIP_Percent": 45.5                        │   │   │
      }                                             │   │   │
    ]                                               │   │   │
  }]                                                │   │   │
}                                                   │   │   │
                                                    │   │   │
           │ gfx_json_parser                        │   │   │
           ▼                                        │   │   │
                                                    │   │   │
2️⃣ DB 저장                                         │   │   │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━         │   │   │
┌─────────────────────────────────────────┐        │   │   │
│ gfx_hand_players                        │        │   │   │
├─────────────────────────────────────────┤        │   │   │
│ seat_num: 1                             │        │   │   │
│ player_name: "Phil"         ◀───────────┘       │   │
│ end_stack_amt: 1620000      ◀───────────────────┘   │
│ sitting_out: FALSE                                  │
└─────────────────────────────────────────┘           │
                                                      │
┌─────────────────────────────────────────┐           │
│ gfx_hands                               │           │
├─────────────────────────────────────────┤           │
│ blinds: {"big_blind_amt": 20000}  ◀─────────────────┘
└─────────────────────────────────────────┘

           │ SQL 쿼리 + 변환 함수
           │ UPPER(), format_chips(), format_bbs()
           ▼

3️⃣ AEP 필드 출력 (render_queue.gfx_data)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "comp_name": "_MAIN Mini Chip Count",
  "slots": [
    {
      "slot_index": 1,
      "fields": {
        "name": "PHIL",           ← UPPER(player_name)
        "chips": "1,620,000",     ← format_chips(end_stack_amt)
        "bbs": "81.0",            ← format_bbs(1620000, 20000)
        "rank": "1",              ← ROW_NUMBER()
        "flag": "Flag/United States.png"  ← get_flag_path(country_code)
      }
    }
  ]
}
```

### 11.3 payout 카테고리 데이터 흐름

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

### 11.4 schedule 카테고리 데이터 흐름

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

## 12. 필드별 상세 매핑 명세

### 12.1 chip_display 카테고리

#### 12.1.1 _MAIN Mini Chip Count (8 슬롯)

**슬롯 필드 매핑:**

| AEP 필드 | GFX JSON 경로 | DB 컬럼 | 변환 함수 | 예시 입력 | 예시 출력 |
|----------|---------------|---------|-----------|-----------|-----------|
| `Name {N}` | `Players[].Name` | `gfx_hand_players.player_name` | `UPPER()` | `"Phil"` | `"PHIL"` |
| `Chip {N}` | `Players[].EndStackAmt` | `gfx_hand_players.end_stack_amt` | `format_chips()` | `1620000` | `"1,620,000"` |
| (BB 표시) | `FlopDrawBlinds.BigBlind_Amt` | `gfx_hands.blinds->>'big_blind_amt'` | `format_bbs()` | `(1620000, 20000)` | `"81.0"` |

**고정 필드:**

| AEP 필드 | 값 | 계산 방식 |
|----------|-----|-----------|
| `AVERAGE STACK : {value}` | 동적 | `AVG(end_stack_amt) / big_blind_amt` → `"1,200,000 (60BB)"` |
| `chips` | `"chips (BB)"` | 고정 헤더 |
| `player` | `"players"` | 고정 헤더 |

#### 12.1.2 _SUB_Mini Chip Count (7 슬롯)

| AEP 필드 | GFX JSON 경로 | DB 컬럼 | 변환 | 예시 |
|----------|---------------|---------|------|------|
| `Name {N}` | `Players[].Name` | `player_name` | `UPPER()` | `"VORONIN"` |
| `Chips {N}` | `Players[].EndStackAmt` | `end_stack_amt` | `format_chips()` | `"1,625,000"` |

> 📝 **참고**: _SUB는 7슬롯으로 _MAIN(8슬롯)보다 1개 적음

#### 12.1.3 Chips In Play x3/x4 (3/4 슬롯)

| AEP 필드 | 소스 | 계산 | 예시 |
|----------|------|------|------|
| `chips_in_play` | `SUM(end_stack_amt)` | 전체 칩 합산 | `"15,000,000"` |
| `fee {N}` | 칩 단위 | 각 단계별 칩 값 | `"100"`, `"500"`, `"1000"` |

#### 12.1.4 Chip Comparison (슬롯 없음, 직접 입력)

| AEP 필드 | 설명 | 입력 방식 |
|----------|------|-----------|
| `player_%` | 각 플레이어 칩 비율 | 퍼센트 (예: "35%") |
| `플레이어_네임,_bb_입력` | 플레이어명 + BB 수 | 직접 텍스트 |

#### 12.1.5 Chip Flow (슬롯 없음, 그래프 데이터)

| AEP 필드 | 설명 | 계산 |
|----------|------|------|
| `input_5_display` | 5개 데이터 포인트 | 핸드별 칩 변화량 |
| `max_label` | 최고점 레이블 | MAX(end_stack_amt) |
| `min_label` | 최저점 레이블 | MIN(end_stack_amt) |
| `하단_라스트_몇_핸드` | X축 라벨 | `"Last 20 Hands"` |

#### 12.1.6 Chip VPIP (슬롯 없음)

| AEP 필드 | GFX JSON 경로 | DB 컬럼 | 예시 |
|----------|---------------|---------|------|
| `vpip` | `Players[].VPIP_Percent` | `vpip_percent` | `"45.5%"` |
| `%_auto` | (계산) | - | 자동 퍼센트 표시 |
| `player_name` | `Players[].Name` | `player_name` | `"Phil Ivey"` |

---

### 12.2 payout 카테고리

#### 12.2.1 Payouts (9 슬롯)

| AEP 필드 | GFX JSON 경로 | DB 컬럼 | 변환 | 예시 입력 | 예시 출력 |
|----------|---------------|---------|------|-----------|-----------|
| `Rank {N}` | 배열 인덱스 + 1 | `place` | 직접 | `1` | `"1"` |
| `prize {N}` | `Payouts[N-1]` 또는 `payouts[].amount` | `amount` | `format_currency()` | `100000000` | `"$1,000,000"` |
| `total_prize` | `SUM(payouts)` | - | `format_currency()` | - | `"$5,000,000"` |

#### 12.2.2 Payouts 등수 바꾸기 가능 (12 슬롯)

> 📝 **차이점**: 9슬롯 → 12슬롯으로 확장, 등수 범위 수동 조정 가능

#### 12.2.3 _Mini Payout (9 슬롯)

| AEP 필드 | 소스 | 변환 | 예시 |
|----------|------|------|------|
| `name {N}` | `gfx_hand_players` | `UPPER()` | `"LIPAUKA"` |
| `chips {N}` | `end_stack_amt` | `format_chips()` | `"2,225,000"` |
| `rank {N}` | 계산 (칩 순위) | 직접 | `"1"` |
| `prize {N}` | `gfx_sessions.payouts[rank-1]` | `format_currency()` | `"$1,000,000"` |

---

### 12.3 event_info 카테고리

#### 12.3.1 Event info (단일 컴포지션)

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

#### 12.3.2 Event name

| AEP 필드 | 우선순위 1 | 우선순위 2 | 예시 |
|----------|-----------|-----------|------|
| `main_event_final_day` | `gfx_sessions.event_title` | `wsop_events.event_name` | `"MAIN EVENT - FINAL TABLE"` |
| `wsop_super_circuit_cyprus` | 고정 | - | `"2025 WSOP SUPER CIRCUIT CYPRUS"` |

---

### 12.4 schedule 카테고리

#### 12.4.1 Broadcast Schedule (6 슬롯)

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

### 12.5 staff 카테고리

#### 12.5.1 Commentator (4 슬롯)

| AEP 필드 | DB 컬럼 | 예시 |
|----------|---------|------|
| `Name {N}` | `manual_commentators.name` | `"Jeff Platt"` |
| `Sub {N}` | `manual_commentators.social_handle` | `"@jeffplatt"` |
| `commentary` | 고정 | `"COMMENTARY"` |
| `text_제목` | 고정 | `"COMMENTATORS"` |

#### 12.5.2 Reporter (4 슬롯)

| AEP 필드 | DB 컬럼 | 예시 |
|----------|---------|------|
| `Name {N}` | `manual_reporters.name` | `"Kara Scott"` |
| `Sub {N}` | `manual_reporters.social_handle` | `"@karascott"` |
| `text_제목` | 고정 | `"REPORTER"` |

---

### 12.6 player_info 카테고리

#### 12.6.1 NAME (국기 포함)

| AEP 필드 | 기본 소스 | Override | 예시 |
|----------|-----------|----------|------|
| `name` | `gfx_hand_players.player_name` | `manual_player_overrides.corrected_name` | `"Phil Ivey"` |
| `text_내용` | (줄바꿈 버전) | - | 2줄 표시용 |
| 국기 이미지 | - | `manual_player_overrides.country_code` | `"Flag/United States.png"` |

**Override 우선순위:**
```
COALESCE(manual_player_overrides.corrected_name, gfx_hand_players.player_name)
```

---

### 12.7 elimination 카테고리

#### 12.7.1 Elimination (2 슬롯)

| AEP 필드 | GFX JSON 경로 | DB 컬럼 | 변환 | 예시 |
|----------|---------------|---------|------|------|
| `text_제목` | - | - | 고정 | `"ELIMINATION"` |
| `text_내용` | 조합 | - | - | `"9TH PLACE - $82,000"` |

**SQL 쿼리:**
```sql
-- elimination_rank > 0 인 플레이어 조회
SELECT
    hp.player_name,
    hp.elimination_rank,
    format_currency(s.payouts[hp.elimination_rank]) AS prize,
    get_flag_path(COALESCE(up.country_code, 'XX')) AS flag
FROM gfx_hand_players hp
JOIN gfx_hands h ON hp.hand_id = h.id
JOIN gfx_sessions s ON h.session_id = s.session_id
LEFT JOIN unified_players up ON LOWER(hp.player_name) = LOWER(up.name)
WHERE hp.elimination_rank > 0
  AND h.id = :hand_id
ORDER BY hp.elimination_rank DESC
LIMIT 1;
```

#### 12.7.2 At Risk of Elimination

| AEP 필드 | 계산 | 예시 |
|----------|------|------|
| `text_내용` | 최소 스택 플레이어 | `"AT RISK OF ELIMINATION - 9TH ($82,000)"` |

---

### 12.8 transition 카테고리 (정적)

| 컴포지션 | 필드 | 값 | 비고 |
|----------|------|-----|------|
| 1-NEXT STREAM STARTING SOON | `wsop_vlogger_program` | 고정 텍스트 | 수동 편집 |
| Block Transition Level-Blinds | `level`, `blinds`, `duration` | 블라인드 정보 | gfx_hands.blinds 기반 |

---

### 12.9 other 카테고리 (정적)

| 컴포지션 | 필드 | 값 |
|----------|------|-----|
| 1-Hand-for-hand play | `event_#12:...` | 수동 트리거 시 표시 |

---

## 13. NULL/에러 처리 전략

### 13.1 필드별 기본값 정의

| 카테고리 | 필드 | NULL 시 기본값 | 사유 |
|----------|------|---------------|------|
| chip_display | `name` | `""` (빈 문자열) | 슬롯 비우기 |
| chip_display | `chips` | `""` | 슬롯 비우기 |
| chip_display | `bbs` | `""` | 슬롯 비우기 |
| chip_display | `flag` | `"Flag/Unknown.png"` | 기본 국기 이미지 |
| payout | `rank` | `"-"` | 표시 안함 |
| payout | `prize` | `"$0"` | 0원 표시 |
| schedule | `date` | `""` | 슬롯 비우기 |
| schedule | `time` | `""` | 슬롯 비우기 |
| staff | `name` | `""` | 슬롯 비우기 |
| staff | `sub` | `""` | 소셜 핸들 없음 |
| player_info | `country_code` | `"XX"` | Unknown 국가 코드 |
| elimination | `rank` | 필수 | NULL 불가 - 에러 처리 |
| elimination | `prize` | `"$0"` | 상금 정보 없음 |

### 13.2 폴백 전략

```
┌─────────────────────────────────────────────────────────────────┐
│                    데이터 소스 폴백 순서                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  player_name 예시:                                              │
│                                                                 │
│  1️⃣ gfx_hand_players.player_name                               │
│     └─ "Phil"                                                   │
│                     │                                           │
│                     ▼ NULL 또는 오타 시                          │
│                                                                 │
│  2️⃣ manual_player_overrides.corrected_name                     │
│     └─ "Phil Ivey" (수정된 이름)                                │
│                     │                                           │
│                     ▼ NULL 시                                   │
│                                                                 │
│  3️⃣ 기본값                                                      │
│     └─ "" (빈 문자열)                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    country_code 폴백                             │
├─────────────────────────────────────────────────────────────────┤
│  1️⃣ manual_player_overrides.country_code  ← 유일한 소스         │
│  2️⃣ 기본값: "XX" (Unknown)                                      │
│  3️⃣ 국기 경로: "Flag/Unknown.png"                               │
└─────────────────────────────────────────────────────────────────┘
```

### 13.3 변환 함수 NULL 안전 버전

```sql
-- format_chips: NULL 및 음수 처리
CREATE OR REPLACE FUNCTION format_chips_safe(amount BIGINT)
RETURNS TEXT AS $$
BEGIN
    IF amount IS NULL OR amount < 0 THEN
        RETURN '';
    END IF;
    RETURN TO_CHAR(amount, 'FM999,999,999,999');
EXCEPTION
    WHEN OTHERS THEN
        RETURN '';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- format_bbs: 0 나누기 방지
CREATE OR REPLACE FUNCTION format_bbs_safe(chips BIGINT, bb BIGINT)
RETURNS TEXT AS $$
BEGIN
    IF chips IS NULL OR bb IS NULL OR bb = 0 THEN
        RETURN '';
    END IF;
    RETURN TO_CHAR(chips::NUMERIC / bb, 'FM999,999.9');
EXCEPTION
    WHEN OTHERS THEN
        RETURN '';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- format_currency: NULL 처리
CREATE OR REPLACE FUNCTION format_currency_safe(amount BIGINT)
RETURNS TEXT AS $$
BEGIN
    IF amount IS NULL THEN
        RETURN '$0';
    END IF;
    RETURN '$' || TO_CHAR(amount / 100, 'FM999,999,999');
EXCEPTION
    WHEN OTHERS THEN
        RETURN '$0';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 13.4 에러 로깅

| 에러 유형 | 심각도 | 조치 |
|----------|--------|------|
| 필수 필드 NULL | ERROR | 렌더링 중단, 알림 발송 |
| 변환 함수 오류 | WARNING | 기본값 사용, 로그 기록 |
| 국기 이미지 없음 | INFO | Unknown.png 사용 |
| 슬롯 초과 데이터 | WARNING | LIMIT으로 자르기 |

---

## 14. 실제 데이터 예시

### 14.1 GFX JSON 원본 샘플

**파일**: `PGFX_live_data_export GameID=638677842396130000.json`

```json
{
  "ID": 638677842396130000,
  "CreatedDateTimeUTC": "2026-01-14T10:30:00Z",
  "EventTitle": "WSOP SUPER CIRCUIT CYPRUS - MAIN EVENT",
  "Type": "FEATURE_TABLE",
  "Payouts": [1000000, 670000, 475000, 345000, 250000, 185000, 140000, 107500, 82000],
  "Hands": [
    {
      "HandNum": 42,
      "Duration": "PT35.2477537S",
      "StartDateTimeUTC": "2026-01-14T10:30:45.123Z",
      "FlopDrawBlinds": {
        "Ante_Type": "BB_ANTE_BB1ST",
        "BigBlind_Amt": 20000,
        "SmallBlind_Amt": 10000,
        "Button_PlayerNum": 1
      },
      "Players": [
        {
          "PlayerNum": 1,
          "Name": "Lipauka",
          "LongName": "Justas Lipauka",
          "HoleCards": ["As", "Kh"],
          "StartStackAmt": 2100000,
          "EndStackAmt": 2225000,
          "CumulativeWinningsAmt": 125000,
          "VPIP_Percent": 35.5,
          "PFR_Percent": 28.0,
          "EliminationRank": -1
        },
        {
          "PlayerNum": 2,
          "Name": "Voronin",
          "LongName": "Konstantin Voronin",
          "HoleCards": [""],
          "StartStackAmt": 1500000,
          "EndStackAmt": 1625000,
          "CumulativeWinningsAmt": 125000,
          "VPIP_Percent": 42.0,
          "EliminationRank": -1
        }
      ]
    }
  ]
}
```

### 14.2 DB 저장 후 데이터

**gfx_sessions:**
```
| session_id         | event_title                              | payouts                                    |
|--------------------|------------------------------------------|-------------------------------------------|
| 638677842396130000 | WSOP SUPER CIRCUIT CYPRUS - MAIN EVENT   | {1000000,670000,475000,345000,250000,...} |
```

**gfx_hands:**
```
| id     | session_id         | hand_num | blinds                                              |
|--------|--------------------| ---------|-----------------------------------------------------|
| uuid-1 | 638677842396130000 | 42       | {"big_blind_amt":20000,"small_blind_amt":10000,...} |
```

**gfx_hand_players:**
```
| hand_id | seat_num | player_name | end_stack_amt | vpip_percent | sitting_out | elimination_rank |
|---------|----------|-------------|---------------|--------------|-------------|------------------|
| uuid-1  | 1        | Lipauka     | 2225000       | 35.5         | FALSE       | -1               |
| uuid-1  | 2        | Voronin     | 1625000       | 42.0         | FALSE       | -1               |
```

### 14.3 AEP 출력 데이터 (render_queue.gfx_data)

**_MAIN Mini Chip Count 컴포지션:**

```json
{
  "comp_name": "_MAIN Mini Chip Count",
  "render_type": "chip_count",
  "slots": [
    {
      "slot_index": 1,
      "fields": {
        "name": "LIPAUKA",
        "chips": "2,225,000",
        "bbs": "111.3",
        "rank": "1",
        "flag": "Flag/Lithuania.png"
      }
    },
    {
      "slot_index": 2,
      "fields": {
        "name": "VORONIN",
        "chips": "1,625,000",
        "bbs": "81.3",
        "rank": "2",
        "flag": "Flag/Russia.png"
      }
    }
  ],
  "single_fields": {
    "wsop_super_circuit_cyprus": "2025 WSOP SUPER CIRCUIT CYPRUS",
    "AVERAGE STACK": "1,925,000 (96BB)"
  },
  "metadata": {
    "session_id": 638677842396130000,
    "hand_num": 42,
    "blind_level": "10K/20K",
    "generated_at": "2026-01-14T10:35:00Z",
    "data_sources": ["gfx_hand_players", "gfx_hands", "unified_players"]
  }
}
```

**Payouts 컴포지션:**

```json
{
  "comp_name": "Payouts",
  "render_type": "payout",
  "slots": [
    {"slot_index": 1, "fields": {"rank": "1", "prize": "$1,000,000"}},
    {"slot_index": 2, "fields": {"rank": "2", "prize": "$670,000"}},
    {"slot_index": 3, "fields": {"rank": "3", "prize": "$475,000"}},
    {"slot_index": 4, "fields": {"rank": "4", "prize": "$345,000"}},
    {"slot_index": 5, "fields": {"rank": "5", "prize": "$250,000"}},
    {"slot_index": 6, "fields": {"rank": "6", "prize": "$185,000"}},
    {"slot_index": 7, "fields": {"rank": "7", "prize": "$140,000"}},
    {"slot_index": 8, "fields": {"rank": "8", "prize": "$107,500"}},
    {"slot_index": 9, "fields": {"rank": "9", "prize": "$82,000"}}
  ],
  "single_fields": {
    "wsop_super_circuit_cyprus": "2025 WSOP SUPER CIRCUIT CYPRUS",
    "payouts": "PAYOUTS",
    "total_prize": "$4,254,500"
  }
}
```

### 14.4 변환 과정 추적 예시

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    "Lipauka" → "LIPAUKA" 변환 추적                          │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. GFX JSON 입력                                                         │
│     "Name": "Lipauka"                                                     │
│                                                                           │
│  2. DB 저장 (gfx_hand_players)                                            │
│     player_name: "Lipauka"                                                │
│                                                                           │
│  3. Manual Override 체크                                                   │
│     SELECT corrected_name FROM manual_player_overrides                    │
│     WHERE original_name = 'lipauka'                                       │
│     → NULL (오버라이드 없음)                                               │
│                                                                           │
│  4. SQL 변환                                                              │
│     UPPER(COALESCE(mo.corrected_name, hp.player_name))                    │
│     = UPPER("Lipauka")                                                    │
│     = "LIPAUKA"                                                           │
│                                                                           │
│  5. AEP 출력                                                              │
│     "name": "LIPAUKA"                                                     │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                    2225000 → "2,225,000" (111.3BB) 변환 추적               │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. GFX JSON 입력                                                         │
│     "EndStackAmt": 2225000                                                │
│     "FlopDrawBlinds.BigBlind_Amt": 20000                                  │
│                                                                           │
│  2. DB 저장                                                               │
│     gfx_hand_players.end_stack_amt: 2225000                               │
│     gfx_hands.blinds->>'big_blind_amt': 20000                             │
│                                                                           │
│  3. SQL 변환                                                              │
│     format_chips(2225000) = "2,225,000"                                   │
│     format_bbs(2225000, 20000) = "111.3"                                  │
│                                                                           │
│  4. AEP 출력                                                              │
│     "chips": "2,225,000"                                                  │
│     "bbs": "111.3"                                                        │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```
