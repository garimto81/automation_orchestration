# player_info + staff 카테고리 (6개)

> **참조 문서**:
> - [전체 인덱스](../../GFX_AEP_FIELD_MAPPING.md)
> - [변환 함수](../00-common/TRANSFORM_FUNCTIONS.md)
> - [NULL 처리](../00-common/NULL_ERROR_HANDLING.md)

## 개요

플레이어 정보 4개 + 스태프 2개 컴포지션 매핑. v2.0.0에서 chips, bbs, 국기, 히스토리 필드가 추가되었습니다.

---

## staff (2개)

### 컴포지션 목록

| # | 컴포지션 | 필드 키 (슬롯) | GFX 소스 | 슬롯 수 | 변환 |
|---|----------|----------------|----------|---------|------|
| 1 | Commentator | name, sub, commentary, text_제목 | manual.commentators | **2** | 직접 |
| 2 | Reporter | name, sub | manual.reporters | **2** | 직접 |

### 매핑 로직

**Commentator SQL 쿼리:**
```sql
SELECT
    ROW_NUMBER() OVER () AS slot_index,
    c.name,
    c.social_handle AS sub
FROM manual_commentators c
WHERE c.event_id = :event_id
LIMIT 2;
```

**Reporter SQL 쿼리:**
```sql
SELECT
    ROW_NUMBER() OVER () AS slot_index,
    r.name,
    r.social_handle AS sub
FROM manual_reporters r
WHERE r.event_id = :event_id
LIMIT 2;
```

---

## player_info (4개)

### 컴포지션 목록

| # | 컴포지션 | 필드 키 | 기본 소스 | Override | 변환 |
|---|----------|---------|-----------|----------|------|
| 1 | NAME | player_name, 국기, **chips**, **bbs** | gfx_hand_players | Manual | UPPER, format_chips, format_bbs, get_flag_path |
| 2 | NAME 1줄 | player_name, **국기** | wsop+ (Manual) | - | 직접, get_flag_path |
| 3 | NAME 2줄 (국기 빼고) | player_name, **chips**, **bbs** | gfx_hand_players | Manual | format_chips, format_bbs |
| 4 | NAME 3줄+ | player_name, chips, bbs, **chips_N_hands_ago**, **vpip** | gfx_hand_players 히스토리 | Manual | format_chips, format_bbs (v2.0) |

### v2.0.0 변경사항

- NAME에 chips, bbs 필드 추가
- NAME 1줄에 국기 필드 추가 (wsop+)
- NAME 2줄에 chips, bbs 필드 추가 (국기 제외)
- NAME 3줄+에 히스토리 칩 및 vpip 필드 추가 (Chip Flow 연동)

### NAME 매핑 로직 (v2.0 확장)

**필드 구성:**

| AEP 필드 | DB 소스 | 변환 | 예시 |
|----------|---------|------|------|
| `name` | `gfx_hand_players.player_name` | UPPER() | `"PHIL IVEY"` |
| `chips` | `gfx_hand_players.end_stack_amt` | format_chips() | `"1,500,000"` |
| `bbs` | 계산 | format_bbs() | `"75.0"` |
| 국기 이미지 | `manual_player_overrides.country_code` | get_flag_path() | `"Flag/United States.png"` |

**SQL 쿼리:**
```sql
-- NAME: player_name + 국기 + chips + bbs
SELECT
    UPPER(COALESCE(mo.corrected_name, hp.player_name)) AS player_name,
    COALESCE(mo.country_code, 'XX') AS country_code,
    get_flag_path(COALESCE(mo.country_code, 'XX')) AS flag,
    format_chips(hp.end_stack_amt) AS chips,  -- v2.0 추가
    format_bbs(hp.end_stack_amt, (h.blinds->>'big_blind_amt')::BIGINT) AS bbs  -- v2.0 추가
FROM gfx_hand_players hp
JOIN gfx_hands h ON hp.hand_id = h.id
LEFT JOIN manual_player_overrides mo ON LOWER(hp.player_name) = LOWER(mo.original_name)
WHERE hp.hand_id = :hand_id AND hp.seat_num = :seat_num;
```

### NAME 1줄 매핑 로직 (v2.0 국기 추가)

**필드 구성:**

| AEP 필드 | DB 소스 | 변환 | 예시 |
|----------|---------|------|------|
| `name` | `gfx_hand_players.player_name` | UPPER() | `"PHIL IVEY"` |
| 국기 이미지 | `manual_player_overrides.country_code` | get_flag_path() | `"Flag/United States.png"` |

**SQL 쿼리:**
```sql
-- NAME 1줄: player_name + 국기 (wsop+)
SELECT
    UPPER(COALESCE(mo.corrected_name, hp.player_name)) AS player_name,
    get_flag_path(COALESCE(mo.country_code, 'XX')) AS flag  -- v2.0 추가
FROM gfx_hand_players hp
LEFT JOIN manual_player_overrides mo ON LOWER(hp.player_name) = LOWER(mo.original_name)
WHERE hp.hand_id = :hand_id AND hp.seat_num = :seat_num;
```

### NAME 2줄 (국기 빼고) 매핑 로직 (v2.0 chips/bbs 추가)

**필드 구성:**

| AEP 필드 | DB 소스 | 변환 | 예시 |
|----------|---------|------|------|
| `name` | `gfx_hand_players.player_name` | UPPER() | `"PHIL IVEY"` |
| `chips` | `gfx_hand_players.end_stack_amt` | format_chips() | `"1,500,000"` |
| `bbs` | 계산 | format_bbs() | `"75.0"` |

**SQL 쿼리:**
```sql
-- NAME 2줄: player_name + chips + bbs (국기 제외)
SELECT
    UPPER(COALESCE(mo.corrected_name, hp.player_name)) AS player_name,
    format_chips(hp.end_stack_amt) AS chips,  -- v2.0 추가
    format_bbs(hp.end_stack_amt, (h.blinds->>'big_blind_amt')::BIGINT) AS bbs  -- v2.0 추가
FROM gfx_hand_players hp
JOIN gfx_hands h ON hp.hand_id = h.id
LEFT JOIN manual_player_overrides mo ON LOWER(hp.player_name) = LOWER(mo.original_name)
WHERE hp.hand_id = :hand_id AND hp.seat_num = :seat_num;
```

### NAME 3줄+ 매핑 로직 (v2.0 히스토리 추가)

**필드 구성:**

| AEP 필드 | DB 소스 | 변환 | 예시 |
|----------|---------|------|------|
| `name` | `gfx_hand_players.player_name` | UPPER() | `"PHIL IVEY"` |
| `chips` | `gfx_hand_players.end_stack_amt` | format_chips() | `"1,500,000"` |
| `bbs` | 계산 | format_bbs() | `"75.0"` |
| `vpip` | `gfx_hand_players.vpip_percent` | 직접 | `"45.5%"` |
| `chips_10_hands_ago` | 히스토리 조회 | format_chips() | `"1,380,000"` |
| `chips_20_hands_ago` | 히스토리 조회 | format_chips() | `"1,250,000"` |
| `chips_30_hands_ago` | 히스토리 조회 | format_chips() | `"1,100,000"` |

**SQL 쿼리:**
```sql
-- NAME 3줄+: player_name + chips + bbs + 히스토리 칩 + vpip
WITH current_hand AS (
    SELECT h.hand_num AS current_num, h.session_id
    FROM gfx_hands h
    WHERE h.id = :hand_id
),
historical_chips AS (
    SELECT
        (ch.current_num - h.hand_num) AS hands_ago,
        hp.end_stack_amt AS chips
    FROM gfx_hand_players hp
    JOIN gfx_hands h ON hp.hand_id = h.id
    CROSS JOIN current_hand ch
    WHERE h.session_id = ch.session_id
      AND LOWER(hp.player_name) = LOWER(:player_name)
      AND h.hand_num IN (
          ch.current_num,
          ch.current_num - 10,
          ch.current_num - 20,
          ch.current_num - 30
      )
)
SELECT
    UPPER(COALESCE(mo.corrected_name, hp.player_name)) AS player_name,
    format_chips(hp.end_stack_amt) AS chips,
    format_bbs(hp.end_stack_amt, (h.blinds->>'big_blind_amt')::BIGINT) AS bbs,
    TO_CHAR(hp.vpip_percent, 'FM99.9') || '%' AS vpip,  -- v2.0 VPIP 통합
    format_chips(MAX(CASE WHEN hc.hands_ago = 10 THEN hc.chips END)) AS chips_10_hands_ago,
    format_chips(MAX(CASE WHEN hc.hands_ago = 20 THEN hc.chips END)) AS chips_20_hands_ago,
    format_chips(MAX(CASE WHEN hc.hands_ago = 30 THEN hc.chips END)) AS chips_30_hands_ago
FROM gfx_hand_players hp
JOIN gfx_hands h ON hp.hand_id = h.id
LEFT JOIN manual_player_overrides mo ON LOWER(hp.player_name) = LOWER(mo.original_name)
LEFT JOIN historical_chips hc ON TRUE
WHERE hp.hand_id = :hand_id AND hp.seat_num = :seat_num
GROUP BY hp.player_name, mo.corrected_name, hp.end_stack_amt, hp.vpip_percent, h.blinds;
```

---

## 데이터 흐름 다이어그램

### NAME 3줄+ 히스토리 데이터 흐름 (v2.0.0)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 NAME 3줄+ 히스토리 데이터 흐름 (v2.0.0)                         │
└─────────────────────────────────────────────────────────────────────────────┘

1️⃣ 현재 핸드 + 히스토리 조회
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   현재 핸드 #42, 플레이어 "Phil Ivey"

2️⃣ 특정 시점 칩 조회
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────┐
│ Hand #42 (현재): 1,500,000              │
│ Hand #32 (10핸드 전): 1,380,000         │
│ Hand #22 (20핸드 전): 1,250,000         │
│ Hand #12 (30핸드 전): 1,100,000         │
└─────────────────────────────────────────┘

           │ 변화량 계산
           ▼

3️⃣ AEP 필드 출력
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

---

## 필드별 상세 매핑

### staff 카테고리

#### Commentator (2 슬롯)

| AEP 필드 | DB 컬럼 | 예시 |
|----------|---------|------|
| `Name {N}` | `manual_commentators.name` | `"Jeff Platt"` |
| `Sub {N}` | `manual_commentators.social_handle` | `"@jeffplatt"` |
| `commentary` | 고정 | `"COMMENTARY"` |
| `text_제목` | 고정 | `"COMMENTATORS"` |

#### Reporter (2 슬롯)

| AEP 필드 | DB 컬럼 | 예시 |
|----------|---------|------|
| `Name {N}` | `manual_reporters.name` | `"Kara Scott"` |
| `Sub {N}` | `manual_reporters.social_handle` | `"@karascott"` |
| `text_제목` | 고정 | `"REPORTER"` |

### player_info 카테고리 - v2.0 업데이트

#### NAME (국기 포함) - v2.0 확장

| AEP 필드 | 기본 소스 | Override | 변환 | 예시 |
|----------|-----------|----------|------|------|
| `name` | `gfx_hand_players.player_name` | `manual_player_overrides.corrected_name` | UPPER() | `"PHIL IVEY"` |
| `chips` | `gfx_hand_players.end_stack_amt` | - | format_chips() | `"1,500,000"` |
| `bbs` | 계산 | - | format_bbs() | `"75.0"` |
| 국기 이미지 | - | `manual_player_overrides.country_code` | get_flag_path() | `"Flag/United States.png"` |

**변경사항**: `chips`, `bbs` 필드 추가

#### NAME 1줄 - v2.0 국기 추가

| AEP 필드 | 소스 | 변환 | 예시 |
|----------|------|------|------|
| `name` | `gfx_hand_players.player_name` | UPPER() | `"PHIL IVEY"` |
| 국기 이미지 | `manual_player_overrides.country_code` | get_flag_path() | `"Flag/United States.png"` |

**변경사항**: 국기 필드 추가 (wsop+)

#### NAME 2줄 (국기 빼고) - v2.0 확장

| AEP 필드 | 소스 | 변환 | 예시 |
|----------|------|------|------|
| `name` | `gfx_hand_players.player_name` | UPPER() | `"PHIL IVEY"` |
| `chips` | `gfx_hand_players.end_stack_amt` | format_chips() | `"1,500,000"` |
| `bbs` | 계산 | format_bbs() | `"75.0"` |

**변경사항**: `chips`, `bbs` 필드 추가 (국기 제외)

#### NAME 3줄+ - v2.0 히스토리 추가

| AEP 필드 | 소스 | 변환 | 예시 |
|----------|------|------|------|
| `name` | `gfx_hand_players.player_name` | UPPER() | `"PHIL IVEY"` |
| `chips` | `gfx_hand_players.end_stack_amt` | format_chips() | `"1,500,000"` |
| `bbs` | 계산 | format_bbs() | `"75.0"` |
| `vpip` | `gfx_hand_players.vpip_percent` | 직접 | `"45.5%"` |
| `chips_10_hands_ago` | 히스토리 조회 | format_chips() | `"1,380,000"` |
| `chips_20_hands_ago` | 히스토리 조회 | format_chips() | `"1,250,000"` |
| `chips_30_hands_ago` | 히스토리 조회 | format_chips() | `"1,100,000"` |

**변경사항**:
- Chip VPIP 컴포지션에서 `vpip` 필드 통합
- Chip Flow와 연동되는 히스토리 칩 필드 추가 (10/20/30 핸드 전)

---

## Manual Override 전략

### Override 우선순위

```
COALESCE(manual_player_overrides.corrected_name, gfx_hand_players.player_name)
```

### Override 용도

| 필드 | 용도 | 예시 |
|------|------|------|
| `corrected_name` | 이름 오타 수정 | `"PHILL IVEY"` → `"PHIL IVEY"` |
| `country_code` | 국적 정보 추가 (GFX에 없음) | `"US"`, `"DE"`, `"BR"` |
| `profile_image` | 프로필 이미지 경로 | `/images/profiles/phil-ivey.jpg` |

### 폴백 처리

Manual Override가 없거나 NULL인 경우:
- `corrected_name` 없음 → `gfx_hand_players.player_name` 사용
- `country_code` 없음 → `'XX'` (미정) 사용
- `get_flag_path('XX')` → 기본 플래그 이미지 반환
