# GFX JSON DB → AEP 자막 매핑 명세서

**Version**: 1.1.0
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
