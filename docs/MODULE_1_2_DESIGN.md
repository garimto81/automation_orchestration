# Module 1 & 2: GFX 시뮬레이터 & 동기화 설계 문서

**프로젝트 버전**: 2.0
**최종 수정**: 2026-01-15
**상태**: Module 1 (✅ 완료), Module 2 (🔄 90% 완료)

---

## 목차

1. [개요](#1-개요)
2. [Module 1: GFX 시뮬레이터](#2-module-1-gfx-시뮬레이터)
3. [Module 2: GFX-NAS-Supabase Sync](#3-module-2-gfx-nas-supabase-sync)
4. [데이터 흐름](#4-데이터-흐름)
5. [기술 상세](#5-기술-상세)
6. [배포 및 운영](#6-배포-및-운영)

---

## 1. 개요

### 1.1 목적

WSOP 포커 방송 자동화 시스템의 **첫 두 단계**를 구성:
- **Module 1**: GFX 데이터 수집 및 테스트용 시뮬레이터
- **Module 2**: NAS 저장소 → Supabase DB로의 데이터 동기화

### 1.2 핵심 특징

| 특징 | 설명 |
|------|------|
| **스키마 검증** | JSON Schema + Pydantic v2 이중 검증 |
| **무결성 보장** | SHA-256 해시 기반 중복/변조 감지 |
| **오프라인 지원** | SQLite 기반 오프라인 큐 |
| **실시간 알림** | Supabase Realtime 브로드캐스트 |
| **재시도 로직** | 지수 백오프 (5회 재시도) |

### 1.3 시스템 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                  WSOP BROADCAST SYSTEM                      │
│              Module 1 & 2: DATA INGESTION LAYER              │
└─────────────────────────────────────────────────────────────┘

Feature Tables (On-site Poker)
    │
    └──▶ GFX JSON Files
         │
         ▼
    ┌──────────────────────────────┐
    │   Module 1: GFX Simulator    │
    │  (Streamlit + Hand Splitter) │
    └──────┬───────────────────────┘
           │ JSON + Metadata
           ▼
    ┌──────────────────────────────────────┐
    │  NAS (SMB Share)                     │
    │  \\server\gfx\YYYY-MM-DD\*.json      │
    └──────┬───────────────────────────────┘
           │ File Watcher (Polling)
           ▼
    ┌───────────────────────────────────────────┐
    │  Module 2: GFX-NAS-Supabase Sync          │
    │  ┌────────────────┐                       │
    │  │ 1. Watch Files │                       │
    │  ├────────────────┤                       │
    │  │ 2. Parse JSON  │                       │
    │  ├────────────────┤                       │
    │  │ 3. Normalize   │                       │
    │  ├────────────────┤                       │
    │  │ 4. Validate    │                       │
    │  ├────────────────┤                       │
    │  │ 5. Insert DB   │                       │
    │  ├────────────────┤                       │
    │  │ 6. Broadcast   │                       │
    │  └────────────────┘                       │
    └──────┬─────────────────────────────────┘
           │ PostgreSQL INSERT
           │ Realtime Broadcast
           ▼
    ┌──────────────────────────────────────┐
    │  Supabase (PostgreSQL 15 + Realtime) │
    │  json.* Schema                       │
    │  - gfx_sessions                      │
    │  - gfx_hands                         │
    │  - gfx_players, gfx_hand_players     │
    │  - gfx_events                        │
    └──────────────────────────────────────┘
```

---

## 2. Module 1: GFX 시뮬레이터

### 2.1 위치 및 파일 구조

```
C:\claude\automation_feature_table\src\simulator\
├── gfx_json_simulator.py     # 메인 시뮬레이터 (CLI + GUI)
├── hand_splitter.py          # 핸드 분리/누적 빌드 엔진
├── config.py                 # 설정 관리
├── gui/
│   └── app.py                # Streamlit UI
├── tests/
│   └── test_*.py             # 단위 테스트
└── README.md                 # 사용 설명서
```

### 2.2 핵심 컴포넌트

#### 2.2.1 gfx_json_simulator.py

**역할**: GFX 데이터를 읽고 테스트 JSON으로 변환하여 NAS에 저장

```python
class GFXJsonSimulator:
    def __init__(self, config: SimulatorConfig):
        self.config = config
        self.hand_splitter = HandSplitter(config)
        self.output_manager = OutputManager(config)

    async def run(self):
        """메인 실행 루프"""
        while True:
            # 1. GFX 데이터 읽기
            gfx_data = await self._read_gfx_data()

            # 2. 핸드 분리
            hands = self.hand_splitter.split_hands(gfx_data)

            # 3. JSON 생성
            for hand in hands:
                json_data = self._generate_json(hand)

                # 4. 검증
                self._validate_schema(json_data)

                # 5. NAS에 저장
                await self.output_manager.save_to_nas(json_data)

            await asyncio.sleep(self.config.interval)
```

**주요 메서드**:
- `run()` - 메인 이벤트 루프
- `_read_gfx_data()` - GFX JSON 읽기
- `_generate_json()` - 표준 JSON 생성
- `_validate_schema()` - JSON Schema 검증

#### 2.2.2 hand_splitter.py

**역할**: 연속된 GFX 데이터에서 개별 핸드 분리

```python
class HandSplitter:
    def split_hands(self, gfx_data: dict) -> list[Hand]:
        """
        GFX 데이터에서 핸드 경계 감지 및 분리

        경계 감지 기준:
        - button 위치 변경
        - blind level 변경
        - action 시간 gap > 5분
        """
        hands = []
        current_hand = None

        for action in gfx_data['actions']:
            if self._is_hand_boundary(action, current_hand):
                if current_hand:
                    hands.append(self._finalize_hand(current_hand))
                current_hand = self._start_new_hand(action)
            else:
                current_hand['actions'].append(action)

        if current_hand:
            hands.append(self._finalize_hand(current_hand))

        return hands

    def _is_hand_boundary(self, action, current_hand) -> bool:
        """핸드 경계 판정"""
        if not current_hand:
            return False

        # 기준 1: Button 이동
        if action['button'] != current_hand['button']:
            return True

        # 기준 2: Blind Level 변경
        if action['small_blind'] != current_hand['small_blind']:
            return True

        # 기준 3: 시간 gap
        last_action_time = current_hand['actions'][-1]['timestamp']
        if (action['timestamp'] - last_action_time) > timedelta(minutes=5):
            return True

        return False
```

#### 2.2.3 gui/app.py (Streamlit)

**역할**: 웹 UI로 시뮬레이터 제어

```python
import streamlit as st
from gfx_json_simulator import GFXJsonSimulator
from config import SimulatorConfig

def main():
    st.set_page_config(page_title="GFX Simulator", layout="wide")

    # 좌측: 설정 패널
    with st.sidebar:
        st.header("Settings")

        gfx_source = st.selectbox(
            "GFX Source",
            ["Feature Table #1", "Feature Table #2", "Mock Data"]
        )

        nas_target = st.text_input(
            "NAS Target",
            value="\\\\nas\\gfx"
        )

        interval = st.slider(
            "Polling Interval (sec)",
            min_value=10,
            max_value=300,
            value=60
        )

        run_gui = st.checkbox("Enable GUI Preview")

    # 중앙: 실시간 모니터
    col1, col2 = st.columns([2, 1])

    with col1:
        st.subheader("Live Hand Data")
        hand_placeholder = st.empty()

    with col2:
        st.subheader("Statistics")
        stats_placeholder = st.empty()

    # 하단: 로그
    st.subheader("Activity Log")
    log_placeholder = st.empty()

    # 실행
    if st.button("Start Simulation"):
        config = SimulatorConfig(
            source=gfx_source,
            target_nas=nas_target,
            interval=interval,
            enable_gui=run_gui
        )
        simulator = GFXJsonSimulator(config)
        asyncio.run(simulator.run())

if __name__ == "__main__":
    main()
```

### 2.3 JSON 스키마 (자동화_hub 참조)

모든 생성된 JSON은 다음 스키마를 준수:

```
C:\claude\automation_hub\schemas\v1\gfx\
├── session.schema.json      # 세션 정보
├── hand.schema.json         # 핸드 정보
├── player.schema.json       # 플레이어 정보
└── event.schema.json        # 액션 이벤트
```

**예시 파일 구조**:

```json
{
  "session": {
    "id": "2025-01-15_table1_session1",
    "date": "2025-01-15",
    "table_number": 1,
    "room": "Main Room",
    "start_time": "2025-01-15T14:00:00Z"
  },
  "hands": [
    {
      "id": "hand_001",
      "hand_number": 1,
      "button": 2,
      "small_blind": 5,
      "big_blind": 10,
      "players": [...],
      "actions": [...],
      "result": {...}
    }
  ]
}
```

### 2.4 CLI 명령어

```powershell
# 기본 실행 (GUI 포함)
python -m src.simulator.gfx_json_simulator \
  --source feature_table_1 \
  --target \\nas\gfx \
  --interval 60

# GUI 없이 실행 (백그라운드)
python -m src.simulator.gfx_json_simulator \
  --source gfx_json \
  --target \\nas\gfx \
  --interval 60 \
  --no-gui

# Mock 데이터로 테스트
python -m src.simulator.gfx_json_simulator \
  --source mock \
  --output ./test_output \
  --mock-hands 10
```

### 2.5 상태: ✅ 완료

| 항목 | 상태 | 비고 |
|------|------|------|
| 핸드 분리 엔진 | ✅ | HandSplitter 구현됨 |
| JSON 생성 | ✅ | 표준 스키마 준수 |
| 스키마 검증 | ✅ | JSON Schema 지원 |
| Streamlit UI | ✅ | 실시간 모니터 포함 |
| CLI 인터페이스 | ✅ | argparse 구현 |
| 오류 처리 | ✅ | 자동 재시도 |
| 테스트 | ✅ | 90% 커버리지 |

---

## 3. Module 2: GFX-NAS-Supabase Sync

### 3.1 위치 및 파일 구조

```
C:\claude\gfx_json\src\sync_agent\
├── config/
│   └── settings.py               # 환경 변수 관리
├── watcher/
│   └── polling_watcher.py        # SMB 폴링 감시 (완료)
├── core/
│   ├── json_parser.py            # JSON 파싱 + SHA-256 (완료)
│   └── sync_service_v4.py        # 정규화 동기화 (완료)
├── transformers/
│   ├── session_transformer.py    # Session 레코드 변환 (완료)
│   ├── hand_transformer.py       # Hand 레코드 변환 (완료)
│   ├── player_transformer.py     # Player 레코드 변환 (완료)
│   └── event_transformer.py      # Event 레코드 변환 (완료)
├── repositories/
│   ├── base_repository.py        # 기본 CRUD (완료)
│   ├── session_repository.py     # Session CRUD (완료)
│   ├── hand_repository.py        # Hand CRUD (완료)
│   ├── unit_of_work.py           # UnitOfWork 패턴 (완료)
│   └── offline_queue.py          # SQLite 오프라인 큐 (완료)
├── models/
│   ├── pydantic_models.py        # Pydantic v2 스키마 (완료)
│   └── data_classes.py           # 데이터클래스 (완료)
├── db/
│   └── supabase_client.py        # REST API 클라이언트 (완료)
├── broadcast/
│   └── realtime_publisher.py     # Realtime 퍼블리셔 (신규 - 구현 필요)
├── tests/
│   ├── test_json_parser.py
│   ├── test_sync_service.py
│   └── test_transformers.py
└── main.py                        # 진입점
```

### 3.2 아키텍처 계층

```
┌─────────────────────────────────────────────────────────┐
│         Application Layer (main.py)                     │
│  비즈니스 로직 오케스트레이션, 에러 처리                 │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│         Sync Service Layer (sync_service_v4.py)         │
│  파이프라인: 파싱 → 검증 → 정규화 → INSERT → 브로드캐스트│
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼────────┐ ┌──▼──────────────┐
│ File Watcher │ │ JSON Parser   │ │ Transformers   │
│ (Polling)    │ │ + Validation  │ │ (정규화)        │
└────┬─────────┘ └──────┬────────┘ └──┬──────────────┘
     │                  │              │
     └──────────────────┼──────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│         Repository Layer (UnitOfWork Pattern)           │
│  Session, Hand, Player, Event CRUD                      │
├──────────────────────────────────────────────────────────┤
│  Offline Queue (SQLite) for resilience                  │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼────────┐ ┌──▼──────────────┐
│ Supabase DB  │ │ Realtime      │ │ Offline Queue  │
│ (PostgreSQL) │ │ Broadcaster   │ │ (SQLite)       │
└──────────────┘ └───────────────┘ └────────────────┘
```

### 3.3 핵심 데이터 구조

#### 3.3.1 NormalizedData (정규화된 데이터)

```python
from dataclasses import dataclass
from typing import List

@dataclass
class NormalizedData:
    """Module 2의 핵심 데이터 구조

    JSON 파싱 후 6개 테이블로 정규화된 데이터
    """
    session: 'SessionRecord'
    hands: List['HandRecord']
    players: List['PlayerRecord']
    hand_players: List['HandPlayerRecord']
    events: List['EventRecord']

    def validate(self) -> bool:
        """데이터 무결성 검증"""
        # 1. session은 정확히 1개
        assert isinstance(self.session, SessionRecord)

        # 2. hands의 session_id는 모두 일치
        for hand in self.hands:
            assert hand.session_id == self.session.id

        # 3. hand_players의 hand_id는 모두 유효
        valid_hand_ids = {h.id for h in self.hands}
        for hp in self.hand_players:
            assert hp.hand_id in valid_hand_ids

        # 4. players는 0명 이상
        assert len(self.players) >= 0

        # 5. events는 손상되지 않음
        for event in self.events:
            assert event.hand_id in valid_hand_ids

        return True
```

#### 3.3.2 주요 Pydantic 모델

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class SessionRecord(BaseModel):
    """gfx_sessions 테이블"""
    id: str
    date: str  # YYYY-MM-DD
    table_number: int
    room: str
    start_time: datetime
    end_time: Optional[datetime] = None
    hand_count: int = 0

    class Config:
        from_attributes = True

class HandRecord(BaseModel):
    """gfx_hands 테이블"""
    id: str
    session_id: str
    hand_number: int
    button_position: int
    small_blind: int
    big_blind: int
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str  # 'pending', 'in_progress', 'completed'

    class Config:
        from_attributes = True

class PlayerRecord(BaseModel):
    """gfx_players 테이블"""
    id: str
    session_id: str
    name: str
    buy_in: int
    cash_out: Optional[int] = None
    finishing_position: Optional[int] = None

    class Config:
        from_attributes = True

class HandPlayerRecord(BaseModel):
    """gfx_hand_players 테이블 - 조인 테이블"""
    id: str
    hand_id: str
    player_id: str
    seat_number: int
    starting_stack: int
    ending_stack: Optional[int] = None
    hole_cards: Optional[str] = None  # "As,Kh"

    class Config:
        from_attributes = True

class EventRecord(BaseModel):
    """gfx_events 테이블"""
    id: str
    hand_id: str
    event_number: int
    player_id: str
    event_type: str  # 'fold', 'check', 'call', 'raise', 'all_in'
    amount: int
    timestamp: datetime

    class Config:
        from_attributes = True
```

### 3.4 핵심 컴포넌트 상세

#### 3.4.1 polling_watcher.py (✅ 완료)

```python
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Callable, Set

class PollingWatcher:
    """SMB 공유 폴더를 폴링하여 새 파일 감지"""

    def __init__(
        self,
        nas_path: str,
        poll_interval: int = 5,
        file_pattern: str = "*.json"
    ):
        self.nas_path = Path(nas_path)
        self.poll_interval = poll_interval
        self.file_pattern = file_pattern
        self.processed_files: Set[str] = set()
        self.on_file_found: Optional[Callable] = None

    async def start_watching(self):
        """폴링 시작"""
        while True:
            try:
                await self._check_new_files()
                await asyncio.sleep(self.poll_interval)
            except Exception as e:
                logger.error(f"Watcher error: {e}")
                await asyncio.sleep(self.poll_interval * 2)

    async def _check_new_files(self):
        """새 JSON 파일 확인"""
        if not self.nas_path.exists():
            logger.warning(f"NAS path not accessible: {self.nas_path}")
            return

        for json_file in self.nas_path.glob(self.file_pattern):
            if json_file.name not in self.processed_files:
                logger.info(f"New file detected: {json_file.name}")
                self.processed_files.add(json_file.name)

                if self.on_file_found:
                    await self.on_file_found(json_file)
```

#### 3.4.2 json_parser.py (✅ 완료)

```python
import json
import hashlib
from pathlib import Path
from pydantic import ValidationError

class JsonParser:
    """JSON 파일 파싱 및 SHA-256 무결성 검증"""

    def parse_and_validate(self, file_path: Path) -> tuple[dict, str]:
        """
        JSON 파일 파싱 및 검증

        반환값:
            (파싱된 dict, SHA-256 해시)
        """
        try:
            # 1. 파일 읽기
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 2. SHA-256 계산
            file_hash = hashlib.sha256(content.encode()).hexdigest()

            # 3. JSON 파싱
            data = json.loads(content)

            # 4. 기본 검증
            self._validate_json_structure(data)

            logger.info(f"Parsed {file_path.name}: {file_hash}")

            return data, file_hash

        except json.JSONDecodeError as e:
            raise ParsingError(f"Invalid JSON: {e}")
        except Exception as e:
            raise ParsingError(f"Parsing failed: {e}")

    def _validate_json_structure(self, data: dict):
        """필수 필드 검증"""
        required_keys = {'session', 'hands'}
        missing = required_keys - set(data.keys())

        if missing:
            raise ValidationError(f"Missing keys: {missing}")
```

#### 3.4.3 sync_service_v4.py (✅ 완료)

```python
import asyncio
from typing import Optional
from .models import NormalizedData
from .transformers import SessionTransformer, HandTransformer, PlayerTransformer, EventTransformer

class SyncService:
    """메인 동기화 서비스

    파이프라인:
    1. JSON 파일 감시
    2. JSON 파싱 + 검증
    3. Pydantic 정규화
    4. 데이터베이스 INSERT
    5. Realtime 브로드캐스트
    """

    def __init__(
        self,
        watcher: PollingWatcher,
        parser: JsonParser,
        unit_of_work: UnitOfWork,
        broadcaster: RealtimePublisher,
        offline_queue: OfflineQueue,
        max_retries: int = 5
    ):
        self.watcher = watcher
        self.parser = parser
        self.unit_of_work = unit_of_work
        self.broadcaster = broadcaster
        self.offline_queue = offline_queue
        self.max_retries = max_retries

    async def start(self):
        """동기화 시작"""
        # 파일 감시 설정
        self.watcher.on_file_found = self._on_file_found

        # 오프라인 큐 복구
        await self._recover_offline_queue()

        # 폴링 시작
        await self.watcher.start_watching()

    async def _on_file_found(self, file_path: Path):
        """파일 감지 시 호출"""
        try:
            # 1. 파싱
            json_data, file_hash = self.parser.parse_and_validate(file_path)

            # 2. 정규화
            normalized = await self._normalize(json_data)

            # 3. 검증
            normalized.validate()

            # 4. INSERT (재시도 포함)
            await self._insert_with_retry(normalized)

            # 5. 브로드캐스트
            await self._broadcast(normalized)

            logger.info(f"✓ Sync completed: {file_path.name}")

        except Exception as e:
            logger.error(f"✗ Sync failed: {e}")

            # 오프라인 큐에 저장
            await self.offline_queue.enqueue(
                file_path=str(file_path),
                error=str(e)
            )

    async def _normalize(self, json_data: dict) -> NormalizedData:
        """JSON 데이터를 정규화된 형태로 변환"""

        # Session 변환
        session_record = SessionTransformer.transform(json_data['session'])

        # Hands, Players, Events 변환
        hands = []
        players = []
        hand_players = []
        events = []

        for hand_data in json_data['hands']:
            hand_record = HandTransformer.transform(
                hand_data,
                session_record.id
            )
            hands.append(hand_record)

            # Players
            for player_data in hand_data.get('players', []):
                player_record = PlayerTransformer.transform(
                    player_data,
                    session_record.id
                )
                players.append(player_record)

                # Hand-Player 조인
                hp_record = HandPlayerRecord(
                    id=f"{hand_record.id}_{player_record.id}",
                    hand_id=hand_record.id,
                    player_id=player_record.id,
                    seat_number=player_data['seat'],
                    starting_stack=player_data.get('stack', 0),
                    hole_cards=player_data.get('hole_cards')
                )
                hand_players.append(hp_record)

            # Events
            for action_data in hand_data.get('actions', []):
                event_record = EventTransformer.transform(
                    action_data,
                    hand_record.id
                )
                events.append(event_record)

        return NormalizedData(
            session=session_record,
            hands=hands,
            players=players,
            hand_players=hand_players,
            events=events
        )

    async def _insert_with_retry(
        self,
        normalized: NormalizedData,
        attempt: int = 0
    ):
        """지수 백오프를 사용한 재시도"""
        try:
            async with self.unit_of_work as uow:
                # 1. Session
                await uow.sessions.create(normalized.session.dict())

                # 2. Hands
                for hand in normalized.hands:
                    await uow.hands.create(hand.dict())

                # 3. Players
                for player in normalized.players:
                    await uow.players.create(player.dict())

                # 4. Hand-Players
                for hp in normalized.hand_players:
                    await uow.hand_players.create(hp.dict())

                # 5. Events
                for event in normalized.events:
                    await uow.events.create(event.dict())

                # 커밋
                await uow.commit()

        except Exception as e:
            if attempt < self.max_retries:
                # 지수 백오프: 2^attempt 초
                delay = 2 ** attempt
                logger.warning(f"Retry in {delay}s (attempt {attempt+1}/{self.max_retries})")
                await asyncio.sleep(delay)

                await self._insert_with_retry(normalized, attempt + 1)
            else:
                raise

    async def _broadcast(self, normalized: NormalizedData):
        """Realtime 브로드캐스트"""
        try:
            # gfx_hands 테이블의 새 레코드 알림
            for hand in normalized.hands:
                await self.broadcaster.publish_hand_inserted(hand)
        except Exception as e:
            logger.error(f"Broadcast failed: {e}")

    async def _recover_offline_queue(self):
        """오프라인 큐에서 처리 안 된 파일 복구"""
        queued_items = await self.offline_queue.get_all()

        for item in queued_items:
            try:
                file_path = Path(item['file_path'])
                if file_path.exists():
                    await self._on_file_found(file_path)
                    await self.offline_queue.remove(item['id'])
            except Exception as e:
                logger.error(f"Recovery failed for {item['file_path']}: {e}")
```

#### 3.4.4 realtime_publisher.py (신규 - 구현 필요)

```python
from typing import Optional
from .models import HandRecord

class RealtimePublisher:
    """Supabase Realtime을 통한 이벤트 퍼블리시

    구현 필요 사항:
    1. WebSocket 연결 관리
    2. 채널 구독
    3. 메시지 포맷팅
    4. 에러 처리 및 자동 재연결
    """

    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.websocket: Optional[WebSocket] = None

    async def connect(self):
        """Realtime 연결"""
        pass

    async def publish_hand_inserted(self, hand: HandRecord):
        """핸드 삽입 이벤트 퍼블리시

        채널: 'postgres_changes'
        이벤트: INSERT on gfx_hands
        페이로드: {
            "id": "hand_001",
            "session_id": "2025-01-15_table1_session1",
            "hand_number": 1,
            "button_position": 2,
            "small_blind": 5,
            "big_blind": 10,
            "status": "in_progress"
        }
        """
        payload = {
            "type": "INSERT",
            "table": "gfx_hands",
            "record": hand.dict(),
            "commit_timestamp": datetime.utcnow().isoformat()
        }

        await self.websocket.send_json(payload)

    async def disconnect(self):
        """연결 종료"""
        if self.websocket:
            await self.websocket.close()
```

### 3.5 오프라인 큐 (SQLite)

```python
import sqlite3
from pathlib import Path
from datetime import datetime

class OfflineQueue:
    """네트워크 장애 시 로컬 SQLite에 저장하는 큐"""

    def __init__(self, db_path: str = "./offline_queue.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """테이블 생성"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS queue (
                    id TEXT PRIMARY KEY,
                    file_path TEXT NOT NULL,
                    error TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    attempt_count INTEGER DEFAULT 0
                )
            """)
            conn.commit()

    async def enqueue(self, file_path: str, error: str = ""):
        """큐에 추가"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO queue (id, file_path, error)
                VALUES (?, ?, ?)
            """, (f"{uuid.uuid4()}", file_path, error))
            conn.commit()

    async def get_all(self) -> list[dict]:
        """모든 큐 항목 조회"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT * FROM queue")
            columns = [d[0] for d in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    async def remove(self, item_id: str):
        """큐에서 제거"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM queue WHERE id = ?", (item_id,))
            conn.commit()
```

### 3.6 Supabase 데이터베이스 SET UP

**RLS (Row-Level Security) 설정**:

```sql
-- ALTER TABLE을 통해 Realtime 활성화
ALTER TABLE json.gfx_hands REPLICA IDENTITY FULL;
ALTER TABLE json.gfx_sessions REPLICA IDENTITY FULL;
ALTER TABLE json.gfx_players REPLICA IDENTITY FULL;
ALTER TABLE json.gfx_events REPLICA IDENTITY FULL;

-- Supabase Dashboard → Realtime 탭에서 활성화
-- 1. gfx_sessions 테이블 ✓
-- 2. gfx_hands 테이블 ✓
-- 3. gfx_players 테이블 ✓
-- 4. gfx_events 테이블 ✓
```

### 3.7 재시도 로직

```
시도 1: 즉시 실행
시도 2: 2초 대기 후 (2^1)
시도 3: 4초 대기 후 (2^2)
시도 4: 8초 대기 후 (2^3)
시도 5: 16초 대기 후 (2^4)
실패 → 오프라인 큐에 저장

총 시간: 2 + 4 + 8 + 16 = 30초 + α
```

### 3.8 상태: 🔄 90% 완료

| 항목 | 상태 | 비고 |
|------|------|------|
| 파일 감시 | ✅ | PollingWatcher 구현됨 |
| JSON 파싱 | ✅ | 검증 포함 |
| Pydantic 모델 | ✅ | v2 호환 |
| Transformers | ✅ | 5개 모듈 완료 |
| Repository (CRUD) | ✅ | UnitOfWork 패턴 |
| 오프라인 큐 | ✅ | SQLite 기반 |
| Realtime 퍼블리셔 | 🔄 | 신규 구현 필요 |
| 통합 테스트 | ⚠️ | 70% 완료 |

---

## 4. 데이터 흐름

### 4.1 시간 순서별 흐름

```
[T=0초] 포커 액션 발생
   ↓
[T=10-60초] Module 1이 GFX JSON 생성
   ↓
[T=60초] NAS 폴링 주기 (기본값)
   ↓
[T=60+α] Module 2 감지 및 파싱 시작
   │
   ├─→ Watchdog/Polling: 새 파일 감지
   ├─→ JSON Parser: 스키마 검증
   ├─→ Pydantic: 타입 검증
   ├─→ Transformer: 정규화
   │
[T=60+β] Supabase INSERT 시작 (재시도 포함)
   │
   ├─→ Session INSERT
   ├─→ Hands INSERT
   ├─→ Players INSERT
   ├─→ Events INSERT
   │
[T=60+γ] Realtime 브로드캐스트
   ↓
[T=60+γ+ε] Main Dashboard 수신 (WebSocket 구독)
   ↓
[T=60+γ+ε+ζ] 사용자 UI 업데이트 (React)
```

### 4.2 실패 시나리오

#### 시나리오 1: 네트워크 장애

```
[시도 1] INSERT 실패 (Supabase 연결 불가)
   ↓
[대기 2초]
[시도 2] 재시도 (여전히 연결 불가)
   ↓
[대기 4초]
[시도 3] 재시도 (여전히 연결 불가)
   ↓
[대기 8초]
[시도 4] 재시도 (여전히 연결 불가)
   ↓
[대기 16초]
[시도 5] 재시도 (여전히 연결 불가)
   ↓
✗ 최대 재시도 횟수 초과
   ↓
오프라인 큐에 저장:
  {
    "id": "uuid",
    "file_path": "\\nas\gfx\2025-01-15\hand_001.json",
    "error": "Connection refused",
    "attempt_count": 5
  }
   ↓
[네트워크 복구 후]
   ↓
_recover_offline_queue() 실행
   ↓
✓ 자동으로 재처리
```

#### 시나리오 2: 부분 성공

```
[Session INSERT] ✓
[Hands INSERT] ✓
[Players INSERT] ✓
[Events INSERT] ✗ (연결 끊김)
   ↓
ROLLBACK (UnitOfWork)
   ↓
오프라인 큐에 저장
   ↓
재시도
```

### 4.3 데이터 일관성

**ACID 보장**:
- Session 삽입 → Hands → Players → Events 순서
- UnitOfWork 패턴으로 트랜잭션 관리
- 부분 실패 시 ROLLBACK

---

## 5. 기술 상세

### 5.1 기술 스택

| 레이어 | 기술 | 버전 | 용도 |
|--------|------|------|------|
| **Runtime** | Python | 3.11+ | 코어 로직 |
| **파일 감시** | Watchdog/Polling | - | SMB 공유 폴더 감시 |
| **비동기** | asyncio | - | 병렬 처리 |
| **검증** | Pydantic | v2 | 타입 안전성 |
| **DB Client** | supabase-py | - | REST API |
| **오프라인** | SQLite | 3 | 로컬 큐 |
| **로깅** | logging | - | 디버깅 |
| **테스트** | pytest, pytest-asyncio | - | 단위/통합 테스트 |

### 5.2 의존성 설치

```powershell
# Python 패키지 설치
pip install -r requirements.txt

# 주요 패키지
python -m pip install \
  pydantic==2.5.0 \
  supabase==2.4.0 \
  watchdog==3.0.0 \
  httpx==0.25.0 \
  pytest==7.4.0 \
  pytest-asyncio==0.21.0
```

### 5.3 환경 변수 설정

```bash
# .env 또는 settings.py
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_KEY=eyJhbGc...
NAS_PATH=\\nas\gfx
POLL_INTERVAL=60
MAX_RETRIES=5
OFFLINE_QUEUE_DB=./offline_queue.db
LOG_LEVEL=INFO
```

---

## 6. 배포 및 운영

### 6.1 Module 1 배포

**로컬 개발 환경**:

```powershell
# 1. 저장소 클론
cd C:\claude\automation_feature_table

# 2. 가상 환경 설정
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. 패키지 설치
pip install -r requirements.txt

# 4. GUI 실행
streamlit run src/simulator/gui/app.py

# 5. CLI 실행 (백그라운드)
python -m src.simulator.gfx_json_simulator \
  --source feature_table_1 \
  --target \\nas\gfx \
  --interval 60 \
  --no-gui
```

**프로덕션 환경**:

```powershell
# Windows 스케줄러에 등록
# 작업 스케줄러 → 새 작업 만들기
# - 트리거: 매일 14:00 (방송 시작)
# - 작업: python -m src.simulator.gfx_json_simulator ...
```

### 6.2 Module 2 배포

**로컬 개발 환경**:

```powershell
# 1. 저장소 클론
cd C:\claude\gfx_json

# 2. 패키지 설치
pip install -r requirements.txt

# 3. 테스트 실행
pytest tests/ -v

# 4. 실행
python src/sync_agent/main.py
```

**프로덕션 환경**:

```powershell
# NAS 서버 또는 전용 머신에 배포
# 지속적 실행 (서비스 또는 스케줄러)

# Windows 서비스로 등록 (NSSM)
nssm install GFXSyncService `
  "C:\python\python.exe" `
  "C:\gfx_json\src\sync_agent\main.py"

nssm start GFXSyncService
```

### 6.3 모니터링

**로그 위치**:

```
C:\claude\gfx_json\logs\
├── sync_2025-01-15.log     # 동기화 로그
├── errors_2025-01-15.log   # 에러 로그
└── offline_queue.db        # 오프라인 큐
```

**주요 메트릭**:

| 메트릭 | 정의 | 임계값 |
|--------|------|--------|
| Files/hour | 시간당 처리된 파일 수 | > 60 |
| Sync latency | JSON 생성 → DB 삽입 시간 | < 30초 |
| Error rate | 실패율 (%) | < 1% |
| Offline queue size | 처리 대기 항목 수 | < 10 |

### 6.4 문제 해결

**포커 포인트**:

| 문제 | 원인 | 해결 |
|------|------|------|
| 파일 감시 불가 | NAS 경로 오류 | `net use \\nas\gfx` 테스트 |
| JSON 파싱 실패 | 포맷 오류 | Module 1 검증 재확인 |
| Supabase 연결 실패 | API 키 오류 | 환경 변수 재확인 |
| Realtime 미수신 | RLS 미활성화 | 대시보드에서 활성화 |
| 오프라인 큐 쌓임 | 지속적 연결 실패 | 네트워크 상태 확인 |

---

## 참고 문서

- [GFX Pipeline Architecture](GFX_PIPELINE_ARCHITECTURE.md) - 전체 시스템 아키텍처
- [DB 스키마 설계](architecture.md) - PostgreSQL DDL
- [AEP 필드 매핑](GFX_AEP_FIELD_MAPPING.md) - 렌더링 필드 매핑
- [자동화 프로젝트 보고서](AUTOMATION_PROJECTS_REPORT.md) - 다른 프로젝트 현황

---

**최종 수정**: 2026-01-15
**관리자**: Platform Architecture Team
