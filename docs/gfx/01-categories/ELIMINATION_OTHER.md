# elimination + transition + other 카테고리 (6개)

> **참조 문서**:
> - [전체 인덱스](../../GFX_AEP_FIELD_MAPPING.md)
> - [변환 함수](../00-common/TRANSFORM_FUNCTIONS.md)

## 개요

탈락 2개 + 전환 화면 2개 + 기타 4개 컴포지션 매핑.

| 카테고리 | 컴포지션 수 | 데이터 원본 | 매핑 난이도 |
|----------|-----------|-----------|-----------|
| **elimination** | 2개 | gfx_hand_players + wsop_events | 동적 (v2.0 필드 분리) |
| **transition** | 2개 | gfx_hands.blinds | 정적 |
| **other** | 4개 | 수동 트리거 | 정적 |

---

## elimination (2개) - 탈락

탈락 플레이어 정보를 표시하는 동적 컴포지션. **v2.0에서 필드가 분리**되어 각각 별도로 관리됨.

### 컴포지션 목록

| # | 컴포지션 | 필드 키 | GFX 소스 | 변환 함수 |
|---|----------|---------|----------|---------|
| 1 | **Elimination** | name, rank, prize, flag | gfx_hand_players + wsop_events.payouts | format_currency, get_flag_path |
| 2 | **At Risk of Elimination** | player_name, rank, prize, flag | gfx_hand_players + wsop_events | format_currency, get_flag_path **(v2.0 필드 분리)** |

> **v2.0.0 변경사항**:
> - At Risk of Elimination에서 단일 `text_내용` → `player_name`, `rank`, `prize`, `flag` 4개 필드로 분리
> - 각 필드를 독립적으로 스타일링 가능하도록 개선

### 매핑 로직

#### Elimination

```sql
SELECT
    UPPER(hp.player_name) AS name,
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
ORDER BY hp.elimination_rank DESC
LIMIT 1;
```

**필드 설명**:

| 필드 | GFX JSON 경로 | DB 컬럼 | 변환 | 예시 |
|-----|---------------|---------|------|------|
| `name` | `gfx_hand_players.player_name` | - | UPPER() | `"JOHN DOE"` |
| `rank` | `gfx_hand_players.elimination_rank` | - | 직접 | `"9"` |
| `prize` | `wsop_events.payouts` | - | format_currency() | `"$82,000"` |
| `flag` | `manual_player_overrides.country_code` | - | get_flag_path() | `"Flag/United States.png"` |

---

#### At Risk of Elimination (v2.0 필드 분리)

```sql
-- 최소 스택 플레이어 = 탈락 위기
WITH at_risk_player AS (
    SELECT
        hp.player_name,
        hp.end_stack_amt,
        ROW_NUMBER() OVER (ORDER BY hp.end_stack_amt ASC) AS risk_rank
    FROM gfx_hand_players hp
    JOIN gfx_hands h ON hp.hand_id = h.id
    WHERE h.session_id = :session_id
      AND h.hand_num = :hand_num
      AND hp.sitting_out = FALSE
    ORDER BY hp.end_stack_amt ASC
    LIMIT 1
),
remaining_players AS (
    SELECT COUNT(*) AS cnt
    FROM gfx_hand_players hp
    JOIN gfx_hands h ON hp.hand_id = h.id
    WHERE h.session_id = :session_id
      AND h.hand_num = :hand_num
      AND hp.sitting_out = FALSE
)
SELECT
    UPPER(arp.player_name) AS player_name,  -- v2.0 분리
    rp.cnt AS rank,  -- 현재 남은 인원 = 탈락 시 순위
    format_currency(
        (SELECT (payout->>'amount')::BIGINT
         FROM wsop_events e
         CROSS JOIN LATERAL jsonb_array_elements(e.payouts) AS payout
         WHERE e.id = :event_id
           AND (payout->>'place')::INTEGER = rp.cnt)
    ) AS prize,  -- v2.0 분리
    get_flag_path(COALESCE(up.country_code, 'XX')) AS flag  -- v2.0 분리
FROM at_risk_player arp
CROSS JOIN remaining_players rp
LEFT JOIN unified_players up ON LOWER(arp.player_name) = LOWER(up.name);
```

**필드 설명**:

| AEP 필드 | 계산 로직 | 예시 |
|---------|---------|------|
| `player_name` | 최소 스택 플레이어명 | `"JOHN DOE"` |
| `rank` | 현재 남은 인원 (= 탈락 시 순위) | `9` |
| `prize` | 해당 순위 상금 | `"$82,000"` |
| `flag` | 플레이어 국기 | `"Flag/United States.png"` |

---

## transition (2개) - 전환 화면

블라인드 단계 전환 및 스트림 대기 화면. **매핑 로직 불필요 - 정적 또는 gfx_hands 기반 데이터 직접 사용**.

### 컴포지션 목록

| # | 컴포지션 | 필드 키 | 소스 | 형식 |
|---|----------|---------|------|------|
| 1 | **1-NEXT STREAM STARTING SOON** | wsop_vlogger_program | 수동 입력 | 고정 텍스트 |
| 2 | **Block Transition Level-Blinds** | level, blinds, duration | gfx_hands.blinds | 블라인드 정보 |

### 설명

- **1-NEXT STREAM STARTING SOON**: 다음 스트림 시작 예정 알림. 수동으로 입력 및 편집 필요.
- **Block Transition Level-Blinds**: 현재 핸드의 블라인드 정보(Level, 블라인드액, 지속시간) 표시. gfx_hands.blinds에서 직접 추출.

> **주의**: 이 두 컴포지션은 매핑 로직(SQL 변환)이 불필요합니다. 정적 값 또는 간단한 데이터 참조만 필요.

---

## other (4개) - 기타

이벤트 중 임시 상태를 알리는 정적 컴포지션. **매핑 로직 불필요 - 수동 트리거 또는 고정 텍스트**.

### 컴포지션 목록

| # | 컴포지션 | 필드 키 | 소스 | 형식 |
|---|----------|---------|------|------|
| 1 | **1-Hand-for-hand play is currently in progress** | event_#12:... | 수동 트리거 | 고정 텍스트 |
| 2-4 | **(기타)** | - | - | 예비 슬롯 |

### 설명

- **1-Hand-for-hand play is currently in progress**: 핸드-포-핸드 플레이 진행 중 알림. 수동으로 트리거.
- **2-4**: 추가 기타 공지사항이 필요한 경우 사용.

> **주의**: 이 컴포지션들은 매핑 로직이 불필요합니다. 필요시 수동으로 활성화/비활성화하는 방식으로 관리.

---

## 필드별 상세 매핑

### 12.7.1 Elimination - 필드별 상세

| AEP 필드 | GFX JSON 경로 | DB 컬럼 | 변환 | 예시 |
|----------|---------------|---------|------|------|
| `name` | `gfx_hand_players.player_name` | - | UPPER() | `"JOHN DOE"` |
| `rank` | `gfx_hand_players.elimination_rank` | - | 직접 | `"9"` |
| `prize` | `wsop_events.payouts` | - | format_currency() | `"$82,000"` |
| `flag` | `manual_player_overrides.country_code` | - | get_flag_path() | `"Flag/United States.png"` |

---

### 12.7.2 At Risk of Elimination - 필드별 상세 (v2.0 필드 분리)

| AEP 필드 | 계산 로직 | 변환 | 예시 |
|----------|---------|------|------|
| `player_name` | 최소 스택 플레이어명 (UPPER) | UPPER() | `"JOHN DOE"` |
| `rank` | 현재 남은 인원 = 탈락 시 순위 | 직접 | `9` |
| `prize` | 해당 순위의 payouts 정보 | format_currency() | `"$82,000"` |
| `flag` | 플레이어 국기 경로 | get_flag_path() | `"Flag/United States.png"` |

> **v2.0.0 변경**: 기존 `text_내용` 단일 필드 → `player_name`, `rank`, `prize`, `flag` 4개 필드로 분리

---

### 12.8 transition 카테고리 - 필드별 상세

| 컴포지션 | 필드 | 값 | 소스 | 비고 |
|----------|------|-----|------|------|
| 1-NEXT STREAM STARTING SOON | `wsop_vlogger_program` | 고정 텍스트 | 수동 입력 | 정기적으로 업데이트 필요 |
| Block Transition Level-Blinds | `level` | 현재 블라인드 레벨 | gfx_hands.blinds | 단계별 정보 |
| | `blinds` | 블라인드액 (SB/BB) | gfx_hands.blinds | 예: "5/10" |
| | `duration` | 블라인드 지속시간 | gfx_hands.blinds | 예: "20분" |

---

### 12.9 other 카테고리 - 필드별 상세

| 컴포지션 | 필드 | 값 | 소스 | 형식 |
|----------|------|-----|------|------|
| 1-Hand-for-hand play is currently in progress | `event_#12:...` | 수동 트리거 메시지 | 수동 입력 | 고정 텍스트 |
| (추가 예비 슬롯) | - | - | - | 필요시 사용 |

---

## NULL/에러 처리

### elimination 필드별 NULL 처리

| 필드 | NULL 시 처리 | 예시 |
|-----|-------------|------|
| `rank` | **필수 값 - NULL 불가** | 에러 로그 발생 |
| `prize` | `"$0"` (상금 정보 없음) | 페이아웃 데이터 누락 시 |
| `flag` | `"Flag/Unknown.png"` | country_code = "XX" |
| `name` | `""` (빈 문자열) | 플레이어명 없음 |

### 폴백 전략

```
country_code 폴백 순서:
1️⃣ manual_player_overrides.country_code  ← 유일한 소스
2️⃣ 기본값: "XX" (Unknown)
3️⃣ 국기 경로: "Flag/Unknown.png"
```

---

## 데이터 흐름 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    elimination 카테고리 흐름                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Elimination (탈락한 플레이어):                              │
│  ────────────────────────────────────────                  │
│  gfx_hand_players (elimination_rank > 0)                   │
│    ↓                                                        │
│  wsop_events.payouts (상금 정보)                            │
│    ↓                                                        │
│  unified_players (국기 정보)                                │
│    ↓                                                        │
│  [name, rank, prize, flag] → AEP 필드 매핑                  │
│                                                             │
│  ────────────────────────────────────────                  │
│                                                             │
│  At Risk of Elimination (탈락 위기):                        │
│  ────────────────────────────────────────                  │
│  gfx_hand_players (최소 스택 = 위기 플레이어)               │
│    ↓                                                        │
│  gfx_hands (현재 인원 수 계산)                              │
│    ↓                                                        │
│  wsop_events.payouts (예상 상금)                            │
│    ↓                                                        │
│  unified_players (국기)                                     │
│    ↓                                                        │
│  [player_name, rank, prize, flag] → AEP 필드 분리 매핑      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 주요 변경사항 (v2.0)

### At Risk of Elimination 필드 분리

**v1.x**: 단일 텍스트 필드
```
text_내용: "JOHN DOE - 9th Place ($82,000) 🇺🇸"
```

**v2.0**: 4개 필드로 분리
```
player_name: "JOHN DOE"
rank: "9"
prize: "$82,000"
flag: "Flag/United States.png"
```

**장점**:
- 각 필드를 독립적으로 스타일링 가능
- 폰트, 색상, 크기 등 세밀한 제어
- 다국어 지원 용이

---

## 참고

- **Elimination 랭크**: `gfx_hand_players.elimination_rank`의 값이 0보다 큼
- **At Risk 판단**: 현재 핸드에서 `end_stack_amt`가 가장 작은 플레이어
- **상금**: `wsop_events.payouts` JSON 배열에서 해당 순위(`place`) 검색
- **국기**: `manual_player_overrides.country_code` 참조, 없으면 "XX" (Unknown)
