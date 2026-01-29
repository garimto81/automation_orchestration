# GFX JSON → DB 매핑

**Version**: 1.0.0
**Last Updated**: 2026-01-29
**SSOT**: `supabase/migrations/*.sql`

---

## 1. 개요

### 1.1 매핑 원칙

| 원칙 | 설명 |
|------|------|
| **SSOT** | Migration SQL이 진실의 원천, 이 문서는 참조용 |
| **정규화** | 3NF 정규화 (성능 + 무결성) |
| **원본 보존** | `raw_json` JSONB로 원본 100% 보존 |
| **2계층 구조** | json 스키마(원본) + public 스키마(확장) |

### 1.2 테이블 구조

```
json 스키마 (원본 보존)           public 스키마 (AEP 확장)
┌─────────────────────┐          ┌─────────────────────┐
│   gfx_sessions      │ ───────▶ │   gfx_sessions_ext  │
│   gfx_hands         │          │   (추가 필드)       │
│   gfx_hand_players  │          └─────────────────────┘
│   gfx_events        │                     │
│   gfx_players       │                     ▼
└─────────────────────┘          ┌─────────────────────┐
                                 │   v_aep_chip_*      │
                                 │   v_aep_player_*    │
                                 │   (렌더링 뷰)       │
                                 └─────────────────────┘
```

---

## 2. 테이블별 매핑

### 2.1 gfx_sessions

**용도**: 세션(파일) 단위 메타데이터

| JSON 필드 | DB 컬럼 | 타입 | 제약조건 | 변환 |
|-----------|---------|------|----------|------|
| `ID` | `session_id` | `BIGINT` | PK | 그대로 |
| `CreatedDateTimeUTC` | `created_at` | `TIMESTAMPTZ` | NOT NULL | ISO 8601 파싱 |
| `SoftwareVersion` | `software_version` | `TEXT` | - | 그대로 |
| `Type` | `table_type` | `gfx_table_type` | NOT NULL | ENUM 변환 |
| `Payouts` | `payouts` | `INTEGER[]` | - | 그대로 |
| (전체) | `raw_json` | `JSONB` | - | 원본 저장 |
| - | `imported_at` | `TIMESTAMPTZ` | DEFAULT NOW() | 자동 |

```sql
CREATE TABLE json.gfx_sessions (
    session_id      BIGINT PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL,
    software_version TEXT,
    table_type      gfx_table_type NOT NULL,
    payouts         INTEGER[],
    raw_json        JSONB,
    imported_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 gfx_hands

**용도**: 핸드 단위 정보

| JSON 필드 | DB 컬럼 | 타입 | 제약조건 | 변환 |
|-----------|---------|------|----------|------|
| (parent) | `session_id` | `BIGINT` | FK, NOT NULL | 부모 참조 |
| `HandNum` | `hand_number` | `INTEGER` | NOT NULL | 그대로 |
| `StartDateTimeUTC` | `started_at` | `TIMESTAMPTZ` | - | ISO 8601 파싱 |
| `Duration` | `duration_seconds` | `NUMERIC(10,3)` | - | Duration 파싱 |
| `AnteAmt` | `ante_amount` | `BIGINT` | DEFAULT 0 | 그대로 |
| `FlopDrawBlinds.BigBlindAmt` | `big_blind` | `BIGINT` | NOT NULL | 중첩 접근 |
| `FlopDrawBlinds.SmallBlindAmt` | `small_blind` | `BIGINT` | NOT NULL | 중첩 접근 |
| `FlopDrawBlinds.ButtonPlayerNum` | `button_position` | `INTEGER` | NOT NULL | 중첩 접근 |
| - | `id` | `UUID` | PK, DEFAULT gen_random_uuid() | 자동 생성 |

```sql
CREATE TABLE json.gfx_hands (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      BIGINT NOT NULL REFERENCES json.gfx_sessions(session_id),
    hand_number     INTEGER NOT NULL,
    started_at      TIMESTAMPTZ,
    duration_seconds NUMERIC(10,3),
    ante_amount     BIGINT DEFAULT 0,
    big_blind       BIGINT NOT NULL,
    small_blind     BIGINT NOT NULL,
    button_position INTEGER NOT NULL,

    UNIQUE (session_id, hand_number)
);
```

### 2.3 gfx_players

**용도**: 플레이어 마스터 (중복 제거)

| 필드 | DB 컬럼 | 타입 | 제약조건 | 변환 |
|------|---------|------|----------|------|
| (hash) | `player_hash` | `TEXT` | PK | MD5(Name + LongName) |
| `Name` | `name` | `TEXT` | NOT NULL | 그대로 |
| `LongName` | `long_name` | `TEXT` | - | null 처리 |
| - | `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | 자동 |

```sql
CREATE TABLE json.gfx_players (
    player_hash TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    long_name   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**player_hash 생성**:
```python
import hashlib

def generate_player_hash(name: str, long_name: str | None) -> str:
    key = f"{name}|{long_name or ''}"
    return hashlib.md5(key.encode()).hexdigest()
```

### 2.4 gfx_hand_players

**용도**: 핸드별 플레이어 상태 (pivot)

| JSON 필드 | DB 컬럼 | 타입 | 제약조건 | 변환 |
|-----------|---------|------|----------|------|
| (parent) | `hand_id` | `UUID` | FK, NOT NULL | 부모 참조 |
| - | `player_hash` | `TEXT` | FK | gfx_players 참조 |
| `PlayerNum` | `seat_number` | `INTEGER` | NOT NULL, CHECK(1-10) | 그대로 |
| `Name` | `player_name` | `TEXT` | NOT NULL | 그대로 (조회 편의) |
| `StartStackAmt` | `start_stack` | `BIGINT` | NOT NULL | 그대로 |
| `EndStackAmt` | `end_stack` | `BIGINT` | NOT NULL | 그대로 |
| `CumulativeWinningsAmt` | `cumulative_winnings` | `BIGINT` | DEFAULT 0 | 그대로 |
| `HoleCards` | `hole_cards` | `TEXT[]` | - | 배열 파싱 |
| `SittingOut` | `sitting_out` | `BOOLEAN` | DEFAULT FALSE | 그대로 |
| `EliminationRank` | `elimination_rank` | `INTEGER` | - | -1 → NULL |
| `VPIPPercent` | `vpip` | `INTEGER` | - | 그대로 |
| `PreFlopRaisePercent` | `pfr` | `INTEGER` | - | 그대로 |
| `AggressionFrequencyPercent` | `af` | `INTEGER` | - | 그대로 |
| `WentToShowDownPercent` | `wtsd` | `INTEGER` | - | 그대로 |
| - | `id` | `UUID` | PK | 자동 생성 |

```sql
CREATE TABLE json.gfx_hand_players (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id             UUID NOT NULL REFERENCES json.gfx_hands(id) ON DELETE CASCADE,
    player_hash         TEXT REFERENCES json.gfx_players(player_hash),
    seat_number         INTEGER NOT NULL CHECK (seat_number BETWEEN 1 AND 10),
    player_name         TEXT NOT NULL,
    start_stack         BIGINT NOT NULL,
    end_stack           BIGINT NOT NULL,
    cumulative_winnings BIGINT DEFAULT 0,
    hole_cards          TEXT[],
    sitting_out         BOOLEAN DEFAULT FALSE,
    elimination_rank    INTEGER,
    vpip                INTEGER,
    pfr                 INTEGER,
    af                  INTEGER,
    wtsd                INTEGER,

    UNIQUE (hand_id, seat_number)
);
```

### 2.5 gfx_events

**용도**: 액션 시퀀스

| JSON 필드 | DB 컬럼 | 타입 | 제약조건 | 변환 |
|-----------|---------|------|----------|------|
| (parent) | `hand_id` | `UUID` | FK, NOT NULL | 부모 참조 |
| (index) | `sequence` | `INTEGER` | NOT NULL | 배열 인덱스 |
| `EventType` | `event_type` | `gfx_event_type` | NOT NULL | ENUM 변환 |
| `PlayerNum` | `player_seat` | `INTEGER` | NOT NULL | 그대로 (0=보드) |
| `BetAmt` | `bet_amount` | `BIGINT` | DEFAULT 0 | 그대로 |
| `Pot` | `pot_size` | `BIGINT` | DEFAULT 0 | 그대로 |
| `BoardCards` | `board_card` | `TEXT` | - | 그대로 |
| - | `id` | `UUID` | PK | 자동 생성 |

```sql
CREATE TABLE json.gfx_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id     UUID NOT NULL REFERENCES json.gfx_hands(id) ON DELETE CASCADE,
    sequence    INTEGER NOT NULL,
    event_type  gfx_event_type NOT NULL,
    player_seat INTEGER NOT NULL,
    bet_amount  BIGINT DEFAULT 0,
    pot_size    BIGINT DEFAULT 0,
    board_card  TEXT,

    UNIQUE (hand_id, sequence)
);
```

---

## 3. ENUM 타입

### 3.1 gfx_table_type

```sql
CREATE TYPE gfx_table_type AS ENUM (
    'FEATURE_TABLE',
    'FINAL_TABLE'
);
```

### 3.2 gfx_event_type

```sql
CREATE TYPE gfx_event_type AS ENUM (
    'FOLD',
    'BET',
    'CALL',
    'CHECK',
    'ALL_IN',       -- 원본: "ALL IN"
    'BOARD_CARD'    -- 원본: "BOARD CARD"
);
```

---

## 4. 인덱스

### 4.1 조회 성능 인덱스

```sql
-- 세션별 핸드 조회
CREATE INDEX idx_gfx_hands_session ON json.gfx_hands(session_id);

-- 핸드별 플레이어 조회
CREATE INDEX idx_gfx_hand_players_hand ON json.gfx_hand_players(hand_id);

-- 플레이어명 검색 (대소문자 무시)
CREATE INDEX idx_gfx_hand_players_name ON json.gfx_hand_players(LOWER(player_name));

-- 칩 정렬 (chip_display)
CREATE INDEX idx_gfx_hand_players_stack ON json.gfx_hand_players(end_stack DESC);

-- 이벤트 시퀀스
CREATE INDEX idx_gfx_events_hand_seq ON json.gfx_events(hand_id, sequence);
```

### 4.2 JSONB 인덱스

```sql
-- raw_json GIN 인덱스 (분석 쿼리용)
CREATE INDEX idx_gfx_sessions_raw ON json.gfx_sessions USING GIN (raw_json);
```

---

## 5. 뷰 (Layer 2)

### 5.1 v_aep_chip_display

```sql
CREATE OR REPLACE VIEW public.v_aep_chip_display AS
SELECT
    h.session_id,
    h.hand_number,
    hp.seat_number,
    UPPER(hp.player_name) AS name,
    hp.end_stack,
    TO_CHAR(hp.end_stack, 'FM999,999,999,999') AS chips_formatted,
    ROUND(hp.end_stack::NUMERIC / NULLIF(h.big_blind, 0), 1) AS bbs,
    ROW_NUMBER() OVER (
        PARTITION BY h.id
        ORDER BY hp.end_stack DESC
    ) AS chip_rank
FROM json.gfx_hands h
JOIN json.gfx_hand_players hp ON h.id = hp.hand_id
WHERE hp.sitting_out = FALSE;
```

### 5.2 v_aep_player_stats

```sql
CREATE OR REPLACE VIEW public.v_aep_player_stats AS
SELECT
    h.session_id,
    h.hand_number,
    UPPER(hp.player_name) AS name,
    hp.hole_cards,
    hp.vpip,
    hp.pfr,
    hp.af,
    hp.wtsd,
    hp.cumulative_winnings,
    TO_CHAR(hp.cumulative_winnings, 'FM+999,999,999;FM-999,999,999') AS winnings_formatted
FROM json.gfx_hands h
JOIN json.gfx_hand_players hp ON h.id = hp.hand_id;
```

---

## 6. ERD

```
┌─────────────────────────────────────────────────────────────────────┐
│                           json 스키마                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐                                                │
│  │  gfx_sessions   │                                                │
│  │─────────────────│                                                │
│  │ PK session_id   │◀─────────────────────────┐                    │
│  │    created_at   │                          │                    │
│  │    table_type   │                          │                    │
│  │    raw_json     │                          │                    │
│  └─────────────────┘                          │                    │
│           │                                    │                    │
│           │ 1:N                                │                    │
│           ▼                                    │                    │
│  ┌─────────────────┐                          │                    │
│  │   gfx_hands     │                          │                    │
│  │─────────────────│                          │                    │
│  │ PK id (UUID)    │◀────────────┐            │                    │
│  │ FK session_id   │─────────────┼────────────┘                    │
│  │    hand_number  │             │                                  │
│  │    big_blind    │             │                                  │
│  │    button_pos   │             │                                  │
│  └─────────────────┘             │                                  │
│           │                       │                                  │
│           │ 1:N                   │ 1:N                              │
│           ▼                       ▼                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ gfx_hand_players│    │   gfx_events    │    │  gfx_players    │ │
│  │─────────────────│    │─────────────────│    │─────────────────│ │
│  │ PK id (UUID)    │    │ PK id (UUID)    │    │ PK player_hash  │ │
│  │ FK hand_id      │    │ FK hand_id      │    │    name         │ │
│  │ FK player_hash  │───▶│    sequence     │    │    long_name    │ │
│  │    seat_number  │    │    event_type   │    └─────────────────┘ │
│  │    end_stack    │    │    bet_amount   │                        │
│  │    hole_cards   │    │    board_card   │                        │
│  └─────────────────┘    └─────────────────┘                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. 마이그레이션 관리

### 7.1 파일 구조

```
supabase/migrations/
├── 20260113082406_01_gfx_schema.sql        # 테이블 생성
├── 20260113082407_02_gfx_indexes.sql       # 인덱스 생성
├── 20260113082408_03_gfx_views.sql         # 뷰 생성
├── 20260113082409_04_gfx_functions.sql     # 함수 생성
└── ...
```

### 7.2 변경 체크리스트

```markdown
스키마 변경 시:
- [ ] Migration SQL 작성
- [ ] 로컬 테스트 (`supabase db reset`)
- [ ] 이 문서 업데이트
- [ ] 파싱 로직 업데이트
- [ ] 뷰 영향도 확인
```

---

## 8. 성능 고려사항

### 8.1 정규화 vs JSONB

| 접근 방식 | 쿼리 시간 | 용도 |
|-----------|----------|------|
| 정규화 테이블 | 5~20ms | 실시간 방송 (SLA 100ms) |
| JSONB 직접 | 500ms+ | 분석, 감사, 디버깅 |

### 8.2 권장 쿼리 패턴

```sql
-- ✅ 권장: 정규화 테이블 사용
SELECT hp.player_name, hp.end_stack
FROM json.gfx_hands h
JOIN json.gfx_hand_players hp ON h.id = hp.hand_id
WHERE h.session_id = 638961224831992165
  AND h.hand_number = 42
ORDER BY hp.end_stack DESC;

-- ⚠️ 비권장: JSONB 직접 쿼리 (느림)
SELECT
    player->>'Name',
    (player->>'EndStackAmt')::BIGINT
FROM json.gfx_sessions,
LATERAL jsonb_array_elements(raw_json->'Hands') AS hand,
LATERAL jsonb_array_elements(hand->'Players') AS player
WHERE session_id = 638961224831992165;
```

---

## 9. 관련 문서

| 문서 | 설명 |
|------|------|
| `GFX_JSON_STRUCTURE.md` | JSON 원본 구조 |
| `GFX_FIELD_CLASSIFICATION.md` | 필드 분류 |
| `GFX_PARSING_GUIDE.md` | 파싱 가이드 |

---

*최종 수정: 2026-01-29*
