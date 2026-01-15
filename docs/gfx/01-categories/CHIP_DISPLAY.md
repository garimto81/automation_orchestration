# chip_display 카테고리 (6개)

> **참조 문서**:
> - [전체 인덱스](../../GFX_AEP_FIELD_MAPPING.md)
> - [변환 함수](../00-common/TRANSFORM_FUNCTIONS.md)
> - [NULL 처리](../00-common/NULL_ERROR_HANDLING.md)

## 개요

칩 수량 표시 관련 6개 컴포지션 매핑. 포커 핸드 진행 중 플레이어의 칩 스택 변화를 실시간으로 표시하며, 플레이어별 선택 기반 비교 및 히스토리 추적 기능을 포함합니다.

**v2.0.0 변경사항**: Chip VPIP는 NAME 컴포지션 내 필드로 통합됨

## 컴포지션 목록

| # | 컴포지션 | 필드 키 | GFX 소스 | 슬롯 수 | 변환 |
|---|----------|---------|----------|---------|------|
| 1 | _MAIN Mini Chip Count | name, chips, bbs, rank | gfx_hand_players | **9** | UPPER, format_chips, format_bbs |
| 2 | _SUB_Mini Chip Count | name, chips, bbs, rank | gfx_hand_players | **9** | UPPER, format_chips, format_bbs |
| 3 | Chips In Play x3 | chips_in_play, level | gfx_hands.blinds, 계산 | **3** | format_chips |
| 4 | Chips In Play x4 | chips_in_play, level | gfx_hands.blinds, 계산 | **4** | format_chips |
| 5 | Chip Comparison | selected_player_%, others_% | gfx_hand_players + UI 선택 | 0 | format_percent (v2.0) |
| 6 | Chip Flow | chips_10h[], chips_20h[], chips_30h[] | gfx_hand_players 히스토리 | 0 | 배열 (v2.0) |

---

## 매핑 로직

### _MAIN Mini Chip Count (9 슬롯)

최대 9명까지 칩 순위를 표시합니다. 플레이어의 현재 칩 스택, 빅 블라인드 기준 배수, 순위를 자동 계산합니다.

```sql
-- _MAIN Mini Chip Count: 9명까지 칩 순위 표시 (실제 AEP 슬롯 수)
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
LIMIT 9;
```

**변환 함수:**
- `UPPER()`: 플레이어명을 대문자로 변환
- `format_chips()`: 칩 수를 쉼표로 구분된 형식으로 변환 (예: 1620000 → "1,620,000")
- `format_bbs()`: 칩을 빅 블라인드 배수로 변환 (예: 1620000 ÷ 20000 = "81.0")
- `get_flag_path()`: 국가 코드를 국기 이미지 경로로 변환

---

### _SUB_Mini Chip Count (9 슬롯)

_MAIN과 동일한 구조이나, 보조 컴포지션으로 사용됩니다. 동일한 SQL 로직을 적용합니다.

```sql
-- _SUB_Mini Chip Count: _MAIN과 동일 구조 (보조 컴포지션)
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
LIMIT 9;
```

---

### Chips In Play x3/x4 (3/4 슬롯)

현재 핸드의 전체 칩 풀(Chips In Play)을 표시합니다. x3와 x4는 칩 슬롯 수만 다릅니다.

```sql
-- Chips In Play: 현재 핸드 전체 칩 합산
SELECT
    format_chips(SUM(hp.end_stack_amt)) AS chips_in_play,
    (h.blinds->>'big_blind_amt')::BIGINT AS level
FROM gfx_hand_players hp
JOIN gfx_hands h ON hp.hand_id = h.id
WHERE hp.sitting_out = FALSE
  AND h.session_id = :session_id
  AND h.hand_num = :hand_num
GROUP BY h.id, h.blinds;
```

**Chips In Play x3**: 3개 슬롯 (칩 표시용)
**Chips In Play x4**: 4개 슬롯 (칩 표시용)

---

### Chip Comparison (v2.0 신규)

UI에서 선택된 플레이어의 칩 비율을 나머지 플레이어들과 비교합니다. 슬롯 기반이 아닌 단일 데이터 세트입니다.

```sql
-- UI에서 선택된 플레이어 vs 나머지 백분율 비교
WITH total_chips AS (
    SELECT SUM(end_stack_amt) AS total
    FROM gfx_hand_players hp
    JOIN gfx_hands h ON hp.hand_id = h.id
    WHERE h.session_id = :session_id
      AND h.hand_num = :hand_num
      AND hp.sitting_out = FALSE
),
selected_player AS (
    SELECT
        UPPER(hp.player_name) AS selected_player_name,
        hp.end_stack_amt AS selected_player_chips
    FROM gfx_hand_players hp
    JOIN gfx_hands h ON hp.hand_id = h.id
    WHERE h.session_id = :session_id
      AND h.hand_num = :hand_num
      AND LOWER(hp.player_name) = LOWER(:selected_player_name)  -- UI 선택
)
SELECT
    sp.selected_player_name,
    format_chips(sp.selected_player_chips) AS selected_player_chips,
    format_percent(sp.selected_player_chips::NUMERIC / tc.total) AS selected_player_percent,
    format_chips(tc.total - sp.selected_player_chips) AS others_chips,
    format_percent((tc.total - sp.selected_player_chips)::NUMERIC / tc.total) AS others_percent
FROM selected_player sp, total_chips tc;
```

**변환 함수:**
- `format_percent()`: 백분율을 소수점 1자리로 변환 (예: 0.354 → "35.4%")

---

### Chip Flow (v2.0 신규)

선택된 플레이어의 칩 스택 변화 히스토리를 10, 20, 30 핸드 단위로 수집합니다. 그래프 표시용 배열 데이터입니다.

```sql
-- 같은 세션 내 플레이어의 10/20/30 핸드 히스토리
WITH hand_sequence AS (
    SELECT
        h.hand_num,
        hp.end_stack_amt AS chips,
        ROW_NUMBER() OVER (ORDER BY h.hand_num DESC) AS rn
    FROM gfx_hand_players hp
    JOIN gfx_hands h ON hp.hand_id = h.id
    WHERE h.session_id = :session_id
      AND LOWER(hp.player_name) = LOWER(:player_name)  -- UI 선택
      AND hp.sitting_out = FALSE
    ORDER BY h.hand_num DESC
    LIMIT 30
)
SELECT
    UPPER(:player_name) AS player_name,
    -- 최근 10핸드 배열
    ARRAY(SELECT chips FROM hand_sequence WHERE rn <= 10 ORDER BY rn DESC) AS chips_10h,
    -- 최근 20핸드 배열
    ARRAY(SELECT chips FROM hand_sequence WHERE rn <= 20 ORDER BY rn DESC) AS chips_20h,
    -- 최근 30핸드 배열
    ARRAY(SELECT chips FROM hand_sequence WHERE rn <= 30 ORDER BY rn DESC) AS chips_30h,
    format_chips(MAX(chips)) AS max_label,
    format_chips(MIN(chips)) AS min_label
FROM hand_sequence;
```

**데이터 구조:**
- `chips_10h[]`: 최근 10개 핸드의 칩 배열
- `chips_20h[]`: 최근 20개 핸드의 칩 배열
- `chips_30h[]`: 최근 30개 핸드의 칩 배열
- `max_label`: 배열 내 최대값 (포맷팅)
- `min_label`: 배열 내 최소값 (포맷팅)

---

## 데이터 흐름 다이어그램

### _MAIN Mini Chip Count 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               _MAIN Mini Chip Count 데이터 흐름 (9 슬롯)                      │
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

### Chip Comparison 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Chip Comparison 데이터 흐름 (v2.0.0)                          │
└─────────────────────────────────────────────────────────────────────────────┘

1️⃣ UI에서 플레이어 선택
━━━━━━━━━━━━━━━━━━━━━━━━
   :selected_player_name = "Phil Ivey"

2️⃣ 전체 칩 계산
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────┐
│ gfx_hand_players (현재 핸드)              │
├─────────────────────────────────────────┤
│ Phil Ivey:    1,500,000 (35.4%)  ← 선택  │
│ Negreanu:       800,000 (18.9%)         │
│ Voronin:        735,000 (17.4%)         │
│ Lipauka:        700,000 (16.5%)         │
│ Others:         500,000 (11.8%)         │
│ ─────────────────────────────────       │
│ Total:        4,235,000 (100%)          │
└─────────────────────────────────────────┘

           │ 백분율 계산
           │ format_percent()
           ▼

3️⃣ AEP 필드 출력
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

### Chip Flow 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Chip Flow 데이터 흐름 (v2.0.0)                             │
└─────────────────────────────────────────────────────────────────────────────┘

1️⃣ UI에서 플레이어 선택
━━━━━━━━━━━━━━━━━━━━━━━━
   :player_name = "Phil Ivey"
   :session_id, :current_hand_num 파라미터 전달

2️⃣ 히스토리 쿼리 실행
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────┐
│ gfx_hand_players (같은 세션, 같은 플레이어) │
├─────────────────────────────────────────┤
│ Hand 42: chips = 1,500,000 (현재)        │
│ Hand 41: chips = 1,480,000              │
│ Hand 40: chips = 1,450,000              │
│ Hand 39: chips = 1,420,000              │
│ ...                                     │
│ Hand 32: chips = 1,380,000 (10핸드 전)   │
│ ...                                     │
│ Hand 22: chips = 1,250,000 (20핸드 전)   │
│ ...                                     │
│ Hand 12: chips = 1,100,000 (30핸드 전)   │
└─────────────────────────────────────────┘

           │ 배열 생성
           ▼

3️⃣ 배열 데이터 생성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
chips_10h = [1500000, 1480000, 1450000, 1420000, 1400000, 1380000, ...]  (10개)
chips_20h = [1500000, 1480000, 1450000, ...]  (20개)
chips_30h = [1500000, 1480000, 1450000, ...]  (30개)

           │ format_chips()
           ▼

4️⃣ AEP 필드 출력
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "chip_flow": {
    "player_name": "PHIL IVEY",
    "chips_10h": [1500000, 1480000, 1450000, ...],
    "chips_20h": [...],
    "chips_30h": [...],
    "max_label": "1,620,000",
    "min_label": "1,100,000"
  }
}
```

---

## 필드별 상세 매핑

### _MAIN Mini Chip Count (9 슬롯)

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

---

### _SUB_Mini Chip Count (9 슬롯)

| AEP 필드 | GFX JSON 경로 | DB 컬럼 | 변환 | 예시 |
|----------|---------------|---------|------|------|
| `Name {N}` | `Players[].Name` | `player_name` | `UPPER()` | `"VORONIN"` |
| `Chips {N}` | `Players[].EndStackAmt` | `end_stack_amt` | `format_chips()` | `"1,625,000"` |

> 📝 **참고**: _MAIN과 _SUB 모두 9슬롯으로 동일 (빈 슬롯 포함)

---

### Chips In Play x3/x4 (3/4 슬롯)

| AEP 필드 | 소스 | 계산 | 예시 |
|----------|------|------|------|
| `chips_in_play` | `SUM(end_stack_amt)` | 전체 칩 합산 | `"15,000,000"` |
| `fee {N}` | 칩 단위 | 각 단계별 칩 값 | `"100"`, `"500"`, `"1000"` |

---

### Chip Comparison (슬롯 없음, UI 선택 기반) - v2.0 업데이트

| AEP 필드 | 설명 | 계산 | 예시 |
|----------|------|------|------|
| `selected_player_name` | UI 선택 플레이어명 | UPPER() | `"PHIL IVEY"` |
| `selected_player_chips` | 선택 플레이어 칩 | format_chips() | `"1,500,000"` |
| `selected_player_percent` | 선택 플레이어 비율 | 선택 칩 / 전체 칩 * 100 | `"35.4%"` |
| `others_chips` | 나머지 플레이어 칩 합 | format_chips() | `"2,735,000"` |
| `others_percent` | 나머지 플레이어 비율 | 나머지 칩 / 전체 칩 * 100 | `"64.6%"` |

> **v2.0.0 변경**: 직접 입력 → UI 선택 기반 자동 계산

---

### Chip Flow (슬롯 없음, 히스토리 배열) - v2.0 업데이트

| AEP 필드 | 설명 | 계산 | 예시 |
|----------|------|------|------|
| `player_name` | UI 선택 플레이어명 | UPPER() | `"PHIL IVEY"` |
| `chips_10h[]` | 최근 10핸드 칩 배열 | 히스토리 조회 | `[1500000, 1480000, ...]` |
| `chips_20h[]` | 최근 20핸드 칩 배열 | 히스토리 조회 | `[1500000, ...]` |
| `chips_30h[]` | 최근 30핸드 칩 배열 | 히스토리 조회 | `[1500000, ...]` |
| `max_label` | 최고점 레이블 | format_chips(MAX) | `"1,620,000"` |
| `min_label` | 최저점 레이블 | format_chips(MIN) | `"1,100,000"` |

> **v2.0.0 변경**: 단일 기간 → 10/20/30 핸드 동시 수집

---

## NULL 값 처리

칩 표시 카테고리의 NULL 값 처리 규칙:

| 카테고리 | 필드 | 기본값 | 동작 |
|----------|------|--------|------|
| chip_display | `name` | `""` (빈 문자열) | 슬롯 비우기 |
| chip_display | `chips` | `""` | 슬롯 비우기 |
| chip_display | `bbs` | `""` | 슬롯 비우기 |
| chip_display | `flag` | `"Flag/Unknown.png"` | 기본 국기 이미지 |

자세한 내용은 [NULL 처리 가이드](../00-common/NULL_ERROR_HANDLING.md) 참조

---

## 관련 섹션

- **섹션 3.1**: chip_display 컴포지션 목록
- **섹션 11.2**: chip_display 데이터 흐름
- **섹션 11.5-11.6**: v2.0 신규 기능 (Chip Comparison, Chip Flow)
- **섹션 12.1**: chip_display 필드 상세 매핑
