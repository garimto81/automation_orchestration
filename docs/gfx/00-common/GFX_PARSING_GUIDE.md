# GFX JSON 파싱 가이드

**Version**: 1.0.0
**Last Updated**: 2026-01-29

---

## 1. 개요

### 1.1 목적

PokerGFX JSON 원본 데이터를 Supabase DB로 정규화하는 과정에서 필요한 변환 규칙과 주의사항을 정의합니다.

### 1.2 파싱 파이프라인

```
GFX JSON 파일
     │
     ▼
┌─────────────────────────────────────────┐
│  1. 파일 읽기 (UTF-8)                   │
│  2. JSON 파싱                           │
│  3. 필드 추출 및 변환                   │
│  4. 유효성 검증                         │
│  5. DB 삽입                             │
└─────────────────────────────────────────┘
     │
     ▼
Supabase DB (정규화 테이블)
```

---

## 2. 필드명 변환

### 2.1 JSON → DB 컬럼 매핑

| JSON 필드 | DB 컬럼 | 변환 이유 |
|-----------|---------|----------|
| `ID` | `session_id` | 명확한 의미 부여 |
| `HandNum` | `hand_number` | snake_case 통일 |
| `PlayerNum` | `seat_number` | 의미 명확화 |
| `StartStackAmt` | `start_stack` | 축약 제거 |
| `EndStackAmt` | `end_stack` | 축약 제거 |
| `BigBlindAmt` | `big_blind` | 축약 |
| `SmallBlindAmt` | `small_blind` | 축약 |
| `ButtonPlayerNum` | `button_position` | 의미 명확화 |
| `CumulativeWinningsAmt` | `cumulative_winnings` | Amt 제거 |

### 2.2 중첩 필드 접근

```python
# FlopDrawBlinds 객체 내부 필드
big_blind = hand.get("FlopDrawBlinds", {}).get("BigBlindAmt", 0)
small_blind = hand.get("FlopDrawBlinds", {}).get("SmallBlindAmt", 0)
button = hand.get("FlopDrawBlinds", {}).get("ButtonPlayerNum", 1)
```

---

## 3. 타입 변환

### 3.1 시간 변환

#### ISO 8601 DateTime → timestamptz

```python
from datetime import datetime

def parse_datetime(iso_str: str) -> datetime | None:
    """
    "2025-10-15T10:54:43.1992165Z" → datetime
    """
    if not iso_str:
        return None
    # .NET은 소수점 7자리까지 지원, Python은 6자리
    # 7자리 초과 시 자르기
    if "." in iso_str:
        parts = iso_str.split(".")
        if len(parts[1]) > 7:
            parts[1] = parts[1][:6] + "Z"
            iso_str = parts[0] + "." + parts[1]
    return datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
```

#### ISO 8601 Duration → 초

```python
import re

def parse_duration(duration_str: str) -> float:
    """
    "PT35M37.2477537S" → 2137.25 (초)
    "PT3M26.9826834S"  → 206.98 (초)
    "PT19.5488032S"    → 19.55 (초)
    """
    if not duration_str:
        return 0.0

    pattern = r"PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?"
    match = re.match(pattern, duration_str)
    if not match:
        return 0.0

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = float(match.group(3) or 0)

    return hours * 3600 + minutes * 60 + seconds
```

### 3.2 ENUM 변환

#### EventType 공백 처리

```python
def normalize_event_type(event_type: str) -> str:
    """
    공백 포함 이벤트 타입을 ENUM 호환 형식으로 변환

    "ALL IN"     → "ALL_IN"
    "BOARD CARD" → "BOARD_CARD"
    "FOLD"       → "FOLD" (변경 없음)
    """
    return event_type.replace(" ", "_")
```

**DB ENUM 정의**:
```sql
CREATE TYPE gfx_event_type AS ENUM (
    'FOLD',
    'BET',
    'CALL',
    'CHECK',
    'ALL_IN',      -- 원본: "ALL IN"
    'BOARD_CARD'   -- 원본: "BOARD CARD"
);
```

### 3.3 배열 변환

#### HoleCards 파싱

```python
def parse_hole_cards(hole_cards: list[str]) -> list[str]:
    """
    홀 카드 배열 정규화

    ["10d 9d"] → ["10d", "9d"]
    ["ah kd"]  → ["ah", "kd"]
    [""]       → []
    []         → []
    """
    if not hole_cards or hole_cards == [""]:
        return []

    # 단일 문자열이 공백으로 구분된 경우
    if len(hole_cards) == 1 and " " in hole_cards[0]:
        return hole_cards[0].split()

    return hole_cards
```

### 3.4 특수값 변환

#### EliminationRank

```python
def normalize_elimination_rank(rank: int) -> int | None:
    """
    탈락 순위 정규화

    -1 → None (생존)
    3  → 3 (3위로 탈락)
    """
    if rank == -1:
        return None
    return rank
```

#### LongName null 처리

```python
def normalize_long_name(long_name: str, name: str) -> str:
    """
    LongName이 비어있으면 Name으로 대체
    """
    if long_name and long_name.strip():
        return long_name
    return name
```

---

## 4. 유효성 검증

### 4.1 필수 필드 검증

```python
REQUIRED_ROOT_FIELDS = ["ID", "CreatedDateTimeUTC", "Type", "Hands"]
REQUIRED_HAND_FIELDS = ["HandNum", "Players", "FlopDrawBlinds"]
REQUIRED_PLAYER_FIELDS = ["PlayerNum", "Name", "StartStackAmt", "EndStackAmt"]
REQUIRED_EVENT_FIELDS = ["EventType", "PlayerNum", "BetAmt", "Pot"]

def validate_session(data: dict) -> list[str]:
    """세션 데이터 검증, 오류 목록 반환"""
    errors = []

    for field in REQUIRED_ROOT_FIELDS:
        if field not in data:
            errors.append(f"Missing required field: {field}")

    return errors
```

### 4.2 값 범위 검증

```python
def validate_player(player: dict) -> list[str]:
    errors = []

    # PlayerNum: 1-9 범위
    player_num = player.get("PlayerNum")
    if not 1 <= player_num <= 9:
        errors.append(f"PlayerNum out of range: {player_num}")

    # 스택은 음수 불가
    if player.get("StartStackAmt", 0) < 0:
        errors.append("StartStackAmt cannot be negative")
    if player.get("EndStackAmt", 0) < 0:
        errors.append("EndStackAmt cannot be negative")

    # 통계는 0-100 범위
    for stat in ["VPIPPercent", "PreFlopRaisePercent", "AggressionFrequencyPercent", "WentToShowDownPercent"]:
        value = player.get(stat, 0)
        if not 0 <= value <= 100:
            errors.append(f"{stat} out of range: {value}")

    return errors
```

### 4.3 참조 무결성 검증

```python
def validate_events(hand: dict) -> list[str]:
    errors = []

    player_nums = {p["PlayerNum"] for p in hand.get("Players", [])}

    for event in hand.get("Events", []):
        event_player = event.get("PlayerNum")
        # PlayerNum 0은 BOARD CARD 전용
        if event_player == 0:
            if event.get("EventType") != "BOARD CARD":
                errors.append(f"PlayerNum 0 only valid for BOARD CARD")
        elif event_player not in player_nums:
            errors.append(f"Event references non-existent player: {event_player}")

    return errors
```

---

## 5. 파싱 주의사항

### 5.1 공백 처리

| 케이스 | 원본 | 처리 |
|--------|------|------|
| EventType 공백 | `"ALL IN"` | `"ALL_IN"` |
| HoleCards 공백 | `"ah kd"` | `["ah", "kd"]` |
| Name 앞뒤 공백 | `" Phil "` | `"Phil"` (trim) |

### 5.2 null vs 빈 문자열

| 필드 | null 의미 | 빈 문자열 의미 |
|------|----------|---------------|
| `BoardCards` | 플레이어 액션 | - |
| `LongName` | 정보 없음 | 정보 없음 (동일 처리) |
| `HoleCards[0]` | - | 카드 비공개 |
| `EventTitle` | - | 사용 안 함 |

### 5.3 대소문자 처리

```python
# 카드 표기: 소문자 유지
hole_cards = player.get("HoleCards", [])  # ["ah", "kd"] - 소문자

# 이름: 원본 유지
name = player.get("Name")  # 원본 케이싱 유지

# AEP 출력 시 대문자
aep_name = name.upper()  # "PHIL IVEY"
```

### 5.4 숫자 정밀도

```python
# Duration: 소수점 7자리까지 (ms 단위 필요 없음)
duration_seconds = parse_duration("PT35M37.2477537S")  # 2137.2477537

# 스택: 정수 (소수점 없음)
stack = player.get("EndStackAmt")  # 항상 정수

# Ticks → datetime: 마이크로초 정밀도
session_id = 638961224831992165  # .NET Ticks (100ns 단위)
```

---

## 6. 소스별 차이점 처리

### 6.1 PlayerNum 범위

```python
def get_valid_player_nums(source: str) -> set[int]:
    """소스별 유효한 PlayerNum 범위"""
    if source == "table-GG":
        return set(range(1, 10))  # 1-9
    elif source == "table-pokercaster":
        return set(range(2, 10))  # 2-9
    return set(range(1, 10))  # 기본값
```

### 6.2 Type 값 차이

| 소스 | Type 값 |
|------|---------|
| table-GG | `FEATURE_TABLE` only |
| table-pokercaster | `FEATURE_TABLE`, `FINAL_TABLE` |

---

## 7. 전체 파싱 예시

```python
def parse_gfx_session(data: dict) -> dict:
    """GFX JSON을 정규화된 딕셔너리로 변환"""

    session = {
        "session_id": data["ID"],
        "created_at": parse_datetime(data["CreatedDateTimeUTC"]),
        "software_version": data.get("SoftwareVersion"),
        "table_type": data.get("Type"),
        "raw_json": data,  # 원본 보존
    }

    hands = []
    for hand_data in data.get("Hands", []):
        hand = parse_hand(hand_data, session["session_id"])
        hands.append(hand)

    return {
        "session": session,
        "hands": hands,
    }

def parse_hand(hand_data: dict, session_id: int) -> dict:
    """핸드 데이터 파싱"""
    blinds = hand_data.get("FlopDrawBlinds", {})

    hand = {
        "session_id": session_id,
        "hand_number": hand_data["HandNum"],
        "started_at": parse_datetime(hand_data.get("StartDateTimeUTC")),
        "duration_seconds": parse_duration(hand_data.get("Duration")),
        "ante_amount": hand_data.get("AnteAmt", 0),
        "big_blind": blinds.get("BigBlindAmt", 0),
        "small_blind": blinds.get("SmallBlindAmt", 0),
        "button_position": blinds.get("ButtonPlayerNum", 1),
    }

    players = []
    for player_data in hand_data.get("Players", []):
        player = parse_player(player_data)
        players.append(player)

    events = []
    for idx, event_data in enumerate(hand_data.get("Events", [])):
        event = parse_event(event_data, idx)
        events.append(event)

    hand["players"] = players
    hand["events"] = events

    return hand

def parse_player(player_data: dict) -> dict:
    """플레이어 데이터 파싱"""
    return {
        "seat_number": player_data["PlayerNum"],
        "name": player_data["Name"].strip(),
        "long_name": normalize_long_name(
            player_data.get("LongName", ""),
            player_data["Name"]
        ),
        "start_stack": player_data["StartStackAmt"],
        "end_stack": player_data["EndStackAmt"],
        "cumulative_winnings": player_data.get("CumulativeWinningsAmt", 0),
        "hole_cards": parse_hole_cards(player_data.get("HoleCards", [])),
        "sitting_out": player_data.get("SittingOut", False),
        "elimination_rank": normalize_elimination_rank(
            player_data.get("EliminationRank", -1)
        ),
        "vpip": player_data.get("VPIPPercent", 0),
        "pfr": player_data.get("PreFlopRaisePercent", 0),
        "af": player_data.get("AggressionFrequencyPercent", 0),
        "wtsd": player_data.get("WentToShowDownPercent", 0),
    }

def parse_event(event_data: dict, sequence: int) -> dict:
    """이벤트 데이터 파싱"""
    return {
        "sequence": sequence,
        "event_type": normalize_event_type(event_data["EventType"]),
        "player_seat": event_data["PlayerNum"],
        "bet_amount": event_data.get("BetAmt", 0),
        "pot_size": event_data.get("Pot", 0),
        "board_card": event_data.get("BoardCards"),
    }
```

---

## 8. 에러 처리

### 8.1 일반적인 에러

| 에러 | 원인 | 처리 |
|------|------|------|
| `JSONDecodeError` | 잘못된 JSON 형식 | 파일 스킵 + 로깅 |
| `KeyError` | 필수 필드 누락 | 유효성 검증 실패 |
| `ValueError` | 타입 변환 실패 | 기본값 사용 + 경고 |

### 8.2 복구 전략

```python
def safe_parse_datetime(value: str, default=None) -> datetime | None:
    """안전한 datetime 파싱"""
    try:
        return parse_datetime(value)
    except (ValueError, TypeError) as e:
        logger.warning(f"Failed to parse datetime: {value}, error: {e}")
        return default

def safe_parse_int(value, default: int = 0) -> int:
    """안전한 정수 파싱"""
    try:
        return int(value) if value is not None else default
    except (ValueError, TypeError):
        return default
```

---

## 9. 관련 문서

| 문서 | 설명 |
|------|------|
| `GFX_JSON_STRUCTURE.md` | JSON 원본 구조 |
| `GFX_FIELD_CLASSIFICATION.md` | 필드 분류 |
| `GFX_DB_MAPPING.md` | DB 스키마 매핑 |

---

*최종 수정: 2026-01-29*
