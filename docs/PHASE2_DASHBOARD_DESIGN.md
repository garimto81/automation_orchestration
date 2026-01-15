# GFX Phase 2 Dashboard MVP 설계 통합 문서

**버전**: 1.0.0 | **작성일**: 2026-01-15 | **상태**: 완료

---

## 목차

1. [개요](#개요)
2. [Main Dashboard 설계](#main-dashboard-설계)
3. [Sub Dashboard 설계](#sub-dashboard-설계)
4. [WebSocket 통신 프로토콜](#websocket-통신-프로토콜)
5. [목업 및 스크린샷](#목mock업-및-스크린샷)
6. [구현 로드맵](#구현-로드맵)
7. [검증 계획](#검증-계획)

---

## 개요

### 프로젝트 목표

GFX 자동화 시스템의 Phase 2에서 두 개의 대시보드를 구현합니다:

| 대시보드 | 역할 | 담당자 |
|---------|------|--------|
| **Main Dashboard** (Module 4) | 라이브 방송 모니터링, 핸드/플레이어/큐시트 관리 | 프로덕션 담당 |
| **Sub Dashboard** (Module 5) | AE 템플릿 매핑, 렌더 큐 관리, 출력 모니터링 | 기술 담당 |

### 핵심 특징

- **실시간 연동**: WebSocket + Supabase Realtime 기반
- **모듈화 아키텍처**: React 18 + Next.js 14 + TypeScript
- **상태 관리**: Zustand (경량, 조합 가능)
- **데이터 페칭**: TanStack Query (캐싱, 동기화)
- **UI 프레임워크**: Tailwind CSS (다크 테마)

### 문서 범위

- ✅ 컴포넌트 아키텍처 설계
- ✅ 상태 관리 전략
- ✅ API 엔드포인트 정의
- ✅ WebSocket 메시지 프로토콜
- ✅ HTML 목업 (시각적 검증)
- 🔄 구현 방법론 (차후 개발팀)

---

## Main Dashboard 설계

### 1. 용도 및 기능

**라이브 방송 환경에서 포커 데이터 관리**

| 기능 | 설명 | 대상 사용자 |
|------|------|-----------|
| **Hand Browser** | 현재/과거 핸드 조회, 보드 카드 표시 | 캐스터, 프로듀서 |
| **Player Grid** | 9명 칩 카운트, 순위 추적, 증감 시각화 | 캐스터 |
| **Cuesheet Editor** | 렌더링 큐 생성/수정, 타임라인 관리 | 프로듀서 |
| **Realtime Monitor** | GFX 이벤트, 연결 상태, 렌더 진행률 모니터링 | 기술 담당 |

### 2. 컴포넌트 트리

```
Main Dashboard
├── Layout (Header + Sidebar + MainContent)
│   ├── Header
│   │   ├── BroadcastStatus (LIVE/PAUSED 표시)
│   │   └── SessionSelector (세션 드롭다운)
│   ├── Sidebar
│   │   ├── NavMenu (탭 메뉴)
│   │   └── SessionStats (현황 요약)
│   └── MainContent (탭별 콘텐츠)
│
├── Hand Browser (default tab)
│   ├── HandList (가로 스크롤)
│   │   └── HandCard (개별 핸드, 선택 가능)
│   ├── HandDetail
│   │   ├── BoardCards (보드 표시)
│   │   ├── ActionTimeline (액션 시퀀스)
│   │   └── PlayerParticipation (참여 플레이어)
│   └── StatusBadges (Active/Completed)
│
├── Player Grid (3x3 그리드)
│   ├── PlayerCard × 9
│   │   ├── Avatar
│   │   ├── Name + Position
│   │   ├── ChipDisplay (숫자 + BBs)
│   │   ├── ChipChange (+/- 색상)
│   │   └── ChipChart (분포)
│   └── SummaryStats
│
├── Cuesheet Editor
│   ├── CuesheetSelector (드롭다운)
│   ├── CueItemList (테이블 또는 타임라인)
│   │   └── CueItemRow × N
│   │       ├── Composition 선택
│   │       ├── 렌더링 상태
│   │       └── 동작 버튼
│   ├── CueItemForm (추가/편집 모달)
│   └── SaveButton
│
└── Realtime Monitor
    ├── ConnectionStatus (WebSocket)
    ├── GfxEventFeed (최신 이벤트 목록)
    ├── RenderStatusPanel (Sub Dashboard 연동)
    └── SessionEvents (알림)
```

### 3. 상태 관리 아키텍처

#### Zustand Stores

```typescript
// SessionStore: 현재 세션 및 핸드 상태
interface SessionState {
  sessionId: string | null;
  gameType: 'cash' | 'tournament';
  status: 'live' | 'paused' | 'ended';
  currentHandId: string | null;
  handNum: number;
  startTime: Date | null;
}

// CuesheetStore: 큐시트 편집 상태
interface CuesheetState {
  cuesheetId: string | null;
  items: CueItem[];           // 렌더링 큐 아이템
  selectedItemId: string | null;
  isDirty: boolean;           // 저장 필요 여부
  sortOrder: 'time' | 'priority';
}

// RealtimeStore: 실시간 이벤트 및 연결 상태
interface RealtimeState {
  events: RealtimeEvent[];
  unreadCount: number;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastEventAt: Date | null;
}

// UIStore: UI 상태 (탭, 모달 등)
interface UIState {
  activeTab: 'hands' | 'cuesheet' | 'players' | 'monitor';
  sidebarCollapsed: boolean;
  modals: {
    playerDetail: boolean;
    cueItemEdit: boolean;
    confirmDelete: boolean;
  };
}
```

#### TanStack Query 설정

| 설정 | 값 | 목적 |
|------|-----|--------|
| `staleTime` | 30초 | 30초 후 백그라운드 리페칭 |
| `gcTime` | 300초 | 5분 후 캐시 제거 |
| `refetchOnWindowFocus` | true | 창 포커스 시 갱신 |
| `retry` | 2회 | 실패 시 2회 재시도 |

### 4. API 엔드포인트

```
Session Management
GET    /api/sessions                    # 세션 목록 조회
GET    /api/sessions/:id                # 세션 상세
PATCH  /api/sessions/:id                # 상태 변경 (LIVE/PAUSED)

Hand Data
GET    /api/sessions/:id/hands          # 세션의 모든 핸드
GET    /api/hands/:id                   # 핸드 상세 (players, actions 포함)
GET    /api/hands/:id/players           # 핸드 참여 플레이어
GET    /api/hands/:id/actions           # 액션 시퀀스

Cuesheet Management
GET    /api/cuesheets                   # 큐시트 목록
GET    /api/cuesheets/:id               # 큐시트 상세
POST   /api/cuesheets                   # 새 큐시트 생성
PATCH  /api/cuesheets/:id               # 큐시트 수정
POST   /api/cuesheets/:id/items         # 큐 아이템 추가
PATCH  /api/cuesheets/:id/items/:itemId # 큐 아이템 수정
DELETE /api/cuesheets/:id/items/:itemId # 큐 아이템 삭제

Player Management
GET    /api/players/search?q=           # 플레이어 검색
GET    /api/players/:id                 # 플레이어 상세 정보
POST   /api/players/:id/override        # 수동 오버라이드 저장
GET    /api/players/:id/chip-history    # 칩 변동 히스토리

Realtime Status
GET    /api/status/render-jobs          # 현재 렌더링 작업 현황
```

### 5. Supabase Realtime Channels

| 채널 | 테이블 | 이벤트 | 용도 |
|------|--------|--------|------|
| `hands_channel` | `json.hands` | INSERT, UPDATE | 새 핸드 추가 시 자동 갱신 |
| `hand_players_channel` | `json.hand_players` | INSERT, UPDATE | 플레이어 정보 실시간 반영 |
| `render_jobs_channel` | `ae.render_jobs` | INSERT, UPDATE | 렌더 진행률 모니터링 |
| `unified_players_notify` | pg_notify (trigger) | - | 플레이어 오버라이드 반영 |

### 6. 주요 상호작용 흐름

```
사용자 UI
   ↓
[Cuesheet Editor] → CueItemSelected 이벤트
   ↓
WebSocket → Sub Dashboard로 전송
   ↓
[Sub Dashboard] → 자동으로 Composition 선택
   ↓
[Slot Mapping Panel] → 현재 Hand 데이터로 Preview 갱신
   ↓
사용자 → [Add to Render Queue] 클릭
   ↓
[RenderQueue] → Sub Dashboard에서 처리
   ↓
WebSocket → render_status_update → Main으로 반환
   ↓
[Main Dashboard] → RenderStatusPanel에서 진행률 표시
```

---

## Sub Dashboard 설계

### 1. 용도 및 기능

**AE 템플릿 매핑 및 렌더 큐 관리**

| 기능 | 설명 | 대상 사용자 |
|------|------|-----------|
| **Composition Grid** | 26개 템플릿 브라우스 (9개 카테고리) | 기술 담당 |
| **Slot Mapping** | 84개 필드 매핑 설정 (GFX/WSOP+/Manual) | 기술 담당 |
| **Data Preview** | 실시간 데이터 미리보기 및 렌더 데이터 검증 | 기술 담당 |
| **Render Queue** | 큐 상태 모니터링, 우선순위 관리 | 기술 담당 |
| **Output Viewer** | 렌더링 결과 재생 및 다운로드 | 캐스터, 기술 담당 |

### 2. 컴포넌트 트리

```
Sub Dashboard
├── Layout (Header + MainContent)
│   ├── Header
│   │   ├── RenderQueueStatus (Active/Queued 카운트)
│   │   ├── OutputFolderPath (저장 경로)
│   │   └── WebSocketStatus (Main 연결 상태)
│   └── TabNavigation (3개 탭)
│
├── Tab: Caption Selection (기본)
│   ├── LeftPanel (Composition Grid)
│   │   ├── SearchBar
│   │   ├── CategoryFilter (All, chip_display, payout, ...)
│   │   └── CompositionGrid (6열)
│   │       └── CompositionCard × 26
│   │           ├── Thumbnail
│   │           ├── Name
│   │           ├── Category Badge
│   │           └── SlotCount
│   │
│   ├── CenterPanel (Slot Mapping)
│   │   ├── DataSourceToggle (GFX/WSOP+/Manual)
│   │   ├── SaveMappingButton
│   │   └── FieldMappingTable (스크롤 가능)
│   │       └── FieldRow × 84
│   │           ├── SlotIndex (1-9)
│   │           ├── FieldKey (name, chips, ...)
│   │           ├── Source (data source)
│   │           ├── Transform (함수명)
│   │           └── PreviewValue (실시간)
│   │
│   └── RightPanel (Data Preview)
│       ├── SessionInfo (ID, Hand #, Blinds)
│       ├── CompositionPreview (Placeholder)
│       ├── JSONPreview (render_gfx_data_v3)
│       └── AddToQueueButton
│
├── Tab: Render Queue
│   ├── ActiveRenders (현재 렌더 중)
│   │   └── RenderJobCard × N
│   │       ├── Composition + Hand Info
│   │       ├── ProgressBar (%)
│   │       ├── EstimatedTime
│   │       └── CancelButton
│   │
│   ├── QueuedJobs (대기 중)
│   │   └── JobCard × N
│   │       ├── Status Badge
│   │       ├── Priority Control
│   │       └── Actions (Move/Cancel)
│   │
│   └── CompletedJobs (완료됨)
│       └── JobCard × N (Grid)
│           ├── Status (Success/Failed)
│           └── Actions (View/Download/Retry)
│
└── Tab: Output Viewer
    ├── OutputList (최근 완료된 작업)
    ├── VideoPreview (재생)
    ├── OutputMetadata (File info)
    └── DownloadButton
```

### 3. 상태 관리 아키텍처

#### Zustand Stores

```typescript
// RenderQueueStore: 렌더 작업 상태
interface RenderJob {
  jobId: string;
  handId: string;
  compositionName: string;
  status: 'pending' | 'queued' | 'rendering' | 'completed' | 'failed';
  priority: number;
  progress: number;        // 0-100
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  outputPath?: string;
}

interface RenderQueueState {
  jobs: RenderJob[];
  activeJobIds: string[];
  selectedJobId: string | null;
  isPaused: boolean;
  maxConcurrent: number;
}

// SlotMappingStore: 필드 매핑 상태
interface FieldMapping {
  fieldId: string;
  targetFieldKey: string;  // name, chips, bbs, rank
  slotIndex?: number;      // 1-9
  sourceTable: string;     // gfx_hand_players, wsop_players, ...
  sourceColumn: string;    // player_name, stack_amount, ...
  sourceJoin?: string;
  transform: string;       // UPPER, format_chips, format_bbs, direct
  currentValue?: string;   // 라이브 프리뷰 값
}

interface SlotMappingState {
  selectedComposition: CompositionMapping | null;
  dataSource: 'gfx' | 'wsop_plus' | 'manual' | 'unified';
  selectedFieldId: string | null;
  isDirty: boolean;
  previewData: Record<string, string>;
}

// CompositionStore: 컴포지션 메타데이터
interface Composition {
  id: string;
  name: string;
  category: 'chip_display' | 'payout' | 'event_info' | ... (9가지);
  width: number;
  height: number;
  thumbnailPath: string;
  layerCount: number;
  fieldCount: number;
  slotCount: number;
  isFavorite: boolean;
}

interface CompositionState {
  compositions: Composition[];
  selectedId: string | null;
  filter: {
    search: string;
    category: string;
    favorites: boolean;
  };
}

// WebSocketStore: Main ↔ Sub 연결 상태
interface WebSocketState {
  isConnected: boolean;
  mainDashboardUrl: string;
  lastMessage: MainToSubMessage | null;
  messageHistory: MainToSubMessage[];
  reconnectAttempts: number;
}
```

### 4. API 엔드포인트

```
Compositions
GET    /api/compositions                  # 26개 모두 조회
GET    /api/compositions/:name            # 상세 정보
GET    /api/compositions/:name/layers     # 레이어 목록
GET    /api/compositions/:name/fields     # 84개 필드 메타데이터
GET    /api/compositions/:name/thumbnail  # 썸네일 이미지
GET    /api/compositions/categories/:cat  # 카테고리별 필터

Slot Mappings
GET    /api/slot-mappings                 # 저장된 매핑 목록
GET    /api/slot-mappings/:id             # 매핑 상세
POST   /api/slot-mappings                 # 새 매핑 생성
PATCH  /api/slot-mappings/:id             # 매핑 수정
DELETE /api/slot-mappings/:id             # 매핑 삭제
POST   /api/slot-mappings/:id/preview     # 현재 데이터로 미리보기
POST   /api/slot-mappings/:id/validate    # 매핑 유효성 검사

Render Queue
GET    /api/render-jobs                   # 모든 작업 조회
GET    /api/render-jobs/active            # 현재 렌더 중
GET    /api/render-jobs/pending           # 대기 중
GET    /api/render-jobs/completed         # 완료 (페이지네이션)
POST   /api/render-jobs                   # 새 렌더 작업 추가
PATCH  /api/render-jobs/:id               # 상태 변경
PATCH  /api/render-jobs/:id/priority      # 우선순위 변경
DELETE /api/render-jobs/:id               # 작업 취소
POST   /api/render-jobs/:id/retry         # 실패한 작업 재시도
GET    /api/render-jobs/:id/logs          # 작업 로그

Render Outputs
GET    /api/render-outputs                # 완료된 출력 목록
GET    /api/render-outputs/:id            # 메타데이터
GET    /api/render-outputs/:id/video      # 비디오 스트리밍
GET    /api/render-outputs/:id/download   # 다운로드
DELETE /api/render-outputs/:id            # 파일 삭제

Data Sources (Preview용)
GET    /api/data/gfx/sessions/:id/hands/:num     # GFX 핸드 데이터
GET    /api/data/gfx/players                     # GFX 플레이어 목록
GET    /api/data/wsop/events/:id                 # WSOP+ 이벤트 데이터
GET    /api/data/wsop/standings/:eventId         # WSOP+ 순위
GET    /api/data/unified/players/:name           # 통합 플레이어 정보
POST   /api/data/transform                       # Transform 함수 적용
```

### 5. 26개 Composition 및 9개 카테고리

| 카테고리 | 개수 | 설명 | 예시 |
|---------|------|------|------|
| **chip_display** | 6 | 칩 카운트 표시 | Main Chip Count, Mini Chip Count |
| **payout** | 3 | 페이아웃 정보 | Prize Pool, Payouts |
| **event_info** | 4 | 이벤트 정보 | Event Title, Blind Level, Level Time |
| **player_info** | 4 | 플레이어 정보 | Player Profile, Player Stats |
| **schedule** | 1 | 일정 정보 | Event Schedule |
| **staff** | 2 | 스태프 정보 | Host/Dealer Info |
| **elimination** | 2 | 탈락 정보 | Elimination, Final 2 |
| **transition** | 2 | 전환 화면 | Scene Transition |
| **other** | 2 | 기타 | Custom, Sponsor |

### 6. 84개 필드 매핑 전략

각 Composition의 텍스트 필드는 아래 중 하나로 매핑됩니다:

```
Data Sources:
1. GFX (json 스키마)
   - gfx_hand_players.player_name
   - gfx_hand_players.end_stack_amt
   - gfx_hand_players.bbs

2. WSOP+ (wsop_plus 스키마)
   - wsop_players.player_name
   - wsop_standings.rank
   - wsop_standings.prize_money

3. Manual (manual 스키마)
   - manual.players_master (오버라이드)

4. Unified (자동 통합)
   - 우선순위: Manual > GFX > WSOP+

Transforms:
- UPPER: 대문자 변환
- LOWER: 소문자 변환
- format_chips: "2400000" → "2.4M"
- format_bbs: "120" → "120 BB"
- format_flag: 국가 코드 → 국기 이모지
- direct: 변환 없음
```

---

## WebSocket 통신 프로토콜

### 1. 연결 설정

```typescript
const WS_CONFIG = {
  url: 'ws://localhost:3001/ws/dashboard',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000
};
```

### 2. Main → Sub 메시지 형식

#### `cue_item_selected`
큐 아이템이 선택되었을 때 Sub Dashboard를 자동으로 준비 상태로 진입합니다.

```json
{
  "type": "cue_item_selected",
  "payload": {
    "cueItemId": "cue_12345",
    "handId": "hand_67890",
    "compositionName": "_MAIN Chip Count",
    "handData": {
      "handNum": 42,
      "sessionId": "session_abc",
      "players": [
        {
          "position": 1,
          "playerName": "PHIL IVEY",
          "stackAmount": 2400000,
          "bbs": 120
        },
        ...
      ],
      "boardCards": ["As", "Kh", "Qd"],
      "pot": 500000,
      "blindLevel": "50/100"
    },
    "suggestedMappings": [...]
  },
  "timestamp": "2026-01-15T10:30:45Z"
}
```

#### `cue_item_cancelled`
큐 아이템이 취소되었을 때

```json
{
  "type": "cue_item_cancelled",
  "payload": {
    "cueItemId": "cue_12345"
  },
  "timestamp": "2026-01-15T10:31:00Z"
}
```

#### `hand_updated`
Hand 데이터가 변경되었을 때 (플레이어 칩 변동 등)

```json
{
  "type": "hand_updated",
  "payload": {
    "handId": "hand_67890",
    "sessionId": "session_abc",
    "handNum": 42,
    "changedFields": ["end_stack_amt", "bbs"],
    "players": [...]
  },
  "timestamp": "2026-01-15T10:31:15Z"
}
```

#### `session_changed`
세션이 변경되었을 때 (Cash/Tournament 전환 등)

```json
{
  "type": "session_changed",
  "payload": {
    "sessionId": "session_abc",
    "gameType": "tournament",
    "eventId": "wsop_2026_event_5"
  },
  "timestamp": "2026-01-15T10:32:00Z"
}
```

#### `render_request`
렌더링 요청을 보낼 때 (Main이 Sub에 렌더 명령)

```json
{
  "type": "render_request",
  "payload": {
    "requestId": "req_99999",
    "compositionName": "_MAIN Chip Count",
    "handId": "hand_67890",
    "priority": 1,
    "gfxData": {
      "slots": {
        "1": {
          "name": "PHIL IVEY",
          "chips": "2.4M",
          "bbs": "120 BB",
          "rank": "1"
        },
        ...
      }
    }
  },
  "timestamp": "2026-01-15T10:32:30Z"
}
```

#### `heartbeat`
연결 상태 확인 (30초마다)

```json
{
  "type": "heartbeat",
  "payload": {
    "mainStatus": "connected",
    "activeSession": "session_abc"
  },
  "timestamp": "2026-01-15T10:33:00Z"
}
```

### 3. Sub → Main 메시지 형식

#### `render_status_update`
렌더링 진행률 업데이트

```json
{
  "type": "render_status_update",
  "payload": {
    "jobId": "job_11111",
    "requestId": "req_99999",
    "status": "rendering",
    "progress": 65,
    "estimatedRemaining": 15
  },
  "timestamp": "2026-01-15T10:32:45Z"
}
```

#### `render_complete`
렌더링 완료

```json
{
  "type": "render_complete",
  "payload": {
    "jobId": "job_11111",
    "requestId": "req_99999",
    "outputPath": "/outputs/cue_12345_2026-01-15_103300.mp4",
    "duration": 12500,
    "frameCount": 300,
    "fileSize": 245000000
  },
  "timestamp": "2026-01-15T10:33:15Z"
}
```

#### `render_error`
렌더링 실패

```json
{
  "type": "render_error",
  "payload": {
    "jobId": "job_11111",
    "requestId": "req_99999",
    "errorCode": "SLOT_MAPPING_ERROR",
    "errorMessage": "Field 'chips' not mapped for slot 3",
    "retryable": true
  },
  "timestamp": "2026-01-15T10:33:20Z"
}
```

#### `mapping_changed`
Slot Mapping이 변경되었을 때

```json
{
  "type": "mapping_changed",
  "payload": {
    "compositionName": "_MAIN Chip Count",
    "mappingId": "map_55555",
    "changedFields": ["name", "chips", "bbs"]
  },
  "timestamp": "2026-01-15T10:34:00Z"
}
```

#### `composition_selected`
Sub가 Composition을 선택했을 때 (Main에 알림)

```json
{
  "type": "composition_selected",
  "payload": {
    "compositionName": "_MAIN Chip Count",
    "category": "chip_display",
    "fieldCount": 9
  },
  "timestamp": "2026-01-15T10:34:15Z"
}
```

#### `heartbeat_ack`
Heartbeat 응답

```json
{
  "type": "heartbeat_ack",
  "payload": {
    "subStatus": "ready",
    "queueLength": 3,
    "activeJobs": 1
  },
  "timestamp": "2026-01-15T10:33:00Z"
}
```

### 4. 메시지 흐름 시나리오

```
시나리오 1: 사용자가 큐 아이템 선택
─────────────────────────────

Main Dashboard                    Sub Dashboard
       ↓
  사용자가 CueItem 클릭
       ↓
  CuesheetStore 업데이트
       ↓
  WebSocket 메시지 발송
  └─→ cue_item_selected ────────→ WebSocket 수신
                                 ↓
                              웹소켓 상태 업데이트
                                 ↓
                              Composition 자동 선택
                                 ↓
                              SlotMappingStore 로드
                                 ↓
                              현재 Hand 데이터로 Preview
                                 ↓
                        UI 자동으로 Ready 상태 진입


시나리오 2: 사용자가 Add to Render Queue 클릭
────────────────────────────────

Main Dashboard                    Sub Dashboard
                                       ↓
                                 사용자가 버튼 클릭
                                       ↓
                              render_request 생성
                         ┌─────────────────┐
                         ↓
                    RenderQueue에 추가
                         ↓
                    Job 처리 시작
                         ↓
                    render_status_update 발송
       ←─ 진행률 60% ─────┤
       ↓
 RenderStatusPanel 업데이트
       ↓
   ...진행...
       ↓
  ←─ render_complete ──→ Job 완료
       ↓
  OutputViewer 새로고침


시나리오 3: Hand 데이터 변경
─────────────────────────────

데이터 소스 (GFX)                Main Dashboard
       ↓
  플레이어 칩 변동
       ↓
  Hand 테이블 UPDATE
       ↓
  Supabase Realtime
  hand_players_channel
       ↓
  useHandsQuery 감지
       ↓
  MainToSub WebSocket
  send: hand_updated ───────→ Sub Dashboard
                              ↓
                         WebSocketStore 수신
                              ↓
                         SlotMappingStore
                         Preview 갱신
                              ↓
                         DataPreviewPanel
                         실시간 업데이트
```

---

## 목업 및 스크린샷

### Main Dashboard 목업

**파일 위치**: `C:\claude\automation_orchestration\docs\mockups\main-dashboard.html`

**주요 구현 요소**:
- ✅ 좌측 사이드바 (네비게이션 + 세션 통계)
- ✅ 상단 헤더 (방송 상태 + 세션 선택기)
- ✅ 4개 탭 (Hand Browser, Cuesheet Editor, Player Grid, Realtime Monitor)
- ✅ Hand Browser: 가로 스크롤 핸드 리스트, 보드 카드 표시
- ✅ Player Grid: 3x3 그리드, 칩 카운트 + 변동 표시
- ✅ Cuesheet Preview: 큐 아이템 테이블, 렌더 상태

**스타일링**:
- 다크 테마 (broadcast-bg: #0f1419)
- Tailwind CSS 기반
- 포커 카드 유니코드 (♠♥♦♣)
- LIVE 상태 점멸 애니메이션

### Sub Dashboard 목업

**파일 위치**: `C:\claude\automation_orchestration\docs\mockups\sub-dashboard.html`

**주요 구현 요소**:
- ✅ 헤더 (렌더 큐 상태 + WebSocket 연결 상태)
- ✅ 3개 탭 (Caption Selection / Render Queue / Output Viewer)
- ✅ Caption Selection:
  - 좌측: 26개 Composition 그리드 (카테고리 필터)
  - 중앙: 84개 필드 매핑 테이블
  - 우측: 실시간 데이터 프리뷰 + JSON
- ✅ Render Queue: Active/Queued/Completed 작업 표시
- ✅ Output Viewer: 완료된 파일 목록

**스타일링**:
- 3-column 반응형 레이아웃 (4-5-3 비율)
- 다크 테마 + broadcast 컬러 팔레트
- 스크롤 가능한 테이블 (84개 필드)
- 진행률 바 애니메이션

---

## 구현 로드맵

### Phase 2-1: 코어 기능 (주 4주)

| 주 | Main Dashboard | Sub Dashboard | 공유 인프라 |
|----|---|---|---|
| **1** | Layout + Header + Sidebar | Layout + Header | Zustand 스토어 |
| **2** | Hand Browser + Detail | Composition Grid | API 클라이언트 |
| **3** | Player Grid | Slot Mapping Panel | TanStack Query 설정 |
| **4** | Cuesheet Editor | Data Preview | WebSocket 기본 |

### Phase 2-2: 실시간 통합 (주 3주)

| 주 | Main Dashboard | Sub Dashboard | 공유 인프라 |
|----|---|---|---|
| **1** | Realtime Monitor | Render Queue | WebSocket 프로토콜 |
| **2** | Supabase Realtime | Output Viewer | 메시지 핸들링 |
| **3** | 통합 테스트 | 통합 테스트 | E2E 테스트 |

### Phase 2-3: 최적화 및 배포 (주 2주)

| 주 | 활동 |
|----|------|
| **1** | 성능 최적화 (React.memo, useMemo) |
| **1** | 에러 처리 및 재연결 로직 |
| **2** | 보안 감사 (CORS, 인증) |
| **2** | 프로덕션 배포 |

---

## 검증 계획

### 1. 단위 테스트 (Unit)

```typescript
// stores/__tests__/sessionStore.test.ts
describe('SessionStore', () => {
  it('should set session and update status', () => {
    const store = useSessionStore.getState();
    store.setSession('session_123');
    expect(store.sessionId).toBe('session_123');
  });
});

// hooks/__tests__/useWebSocketToSub.test.ts
describe('useWebSocketToSub', () => {
  it('should send cue_item_selected message', async () => {
    const { sendCueItemSelected } = useWebSocketToSub();
    await sendCueItemSelected({ cueItemId: '123', handId: '456' });
    // 메시지 전송 검증
  });
});
```

### 2. 통합 테스트 (Integration)

```typescript
// tests/integration/main-to-sub.test.ts
describe('Main ↔ Sub WebSocket Communication', () => {
  it('should sync composition when cue item is selected', async () => {
    // Main: CueItemSelected 발송
    const cueItem = { cueItemId: '123', compositionName: 'Chip Count' };
    mainDashboard.selectCueItem(cueItem);

    // Sub: WebSocket 수신 대기
    const selectedComp = await subDashboard.waitForCompositionSelect(1000);
    expect(selectedComp).toBe('Chip Count');
  });

  it('should update preview when hand data changes', async () => {
    // Main: Hand 데이터 변경
    mainDashboard.updateHandData({ players: [...] });

    // Sub: Preview 업데이트 대기
    const preview = await subDashboard.waitForPreviewUpdate(500);
    expect(preview.slots[1].name).toBe('PHIL IVEY');
  });
});
```

### 3. E2E 테스트 (Playwright)

```typescript
// tests/e2e/dashboard-flow.spec.ts
test('Complete cue item to render flow', async ({ page }) => {
  // Main Dashboard 접속
  await page.goto('http://localhost:3000');

  // 세션 선택
  await page.click('[data-testid="session-selector"]');
  await page.click('text=Session 001');

  // Hand Browser에서 핸드 선택
  await page.click('[data-testid="hand-card-42"]');

  // Cuesheet Tab으로 이동
  await page.click('button:has-text("Cuesheet Editor")');

  // 큐 아이템 추가
  await page.click('[data-testid="add-cue-item"]');
  await page.fill('[name="composition"]', '_MAIN Chip Count');
  await page.click('[data-testid="save-cue-item"]');

  // WebSocket 메시지 인터셉트
  const wsMessage = page.waitForEvent('websocket');
  await page.click('[data-testid="cue-item-select"]');

  const ws = await wsMessage;
  const message = JSON.parse(await ws.waitForEvent('framereceive'));
  expect(message.type).toBe('cue_item_selected');

  // Sub Dashboard에서 매핑 확인
  const subPage = await context.newPage();
  await subPage.goto('http://localhost:3001');

  // Composition 자동 선택 확인
  const selectedComp = await subPage.getAttribute(
    '[data-testid="composition-card"][class*="selected"]',
    'data-name'
  );
  expect(selectedComp).toBe('_MAIN Chip Count');

  // 렌더 큐에 추가
  await subPage.click('[data-testid="add-to-queue"]');

  // 렌더 시작 확인
  await subPage.waitForSelector('[data-status="rendering"]', { timeout: 5000 });
});
```

### 4. 성능 테스트

| 메트릭 | 목표 | 도구 |
|--------|------|------|
| **초기 로딩** | < 3초 | Lighthouse |
| **Hand 목록 렌더** | < 500ms (100개) | React Profiler |
| **WebSocket 지연** | < 100ms | Network tab |
| **큐시트 편집 응답** | < 50ms | DevTools |
| **메모리 사용** | < 150MB | Chrome Memory |

### 5. 실제 환경 테스트 (UAT)

| 시나리오 | 담당자 | 기준 |
|---------|--------|------|
| 라이브 방송 중 30분 연속 운영 | 프로덕션 담당 | 오류 없음, 데이터 동기화 정확 |
| 렌더 큐 50개 처리 | 기술 담당 | 우선순위 유지, 출력 품질 일정 |
| 네트워크 끊김 시뮬레이션 | 기술 담당 | 자동 재연결, 메시지 손실 없음 |
| 대량 데이터 매핑 변경 | 기술 담당 | UI 응답성 유지, 동기화 정확 |

---

## 기술 스택 요약

### Frontend

| 레이어 | 기술 | 버전 | 목적 |
|--------|------|------|------|
| **Framework** | React | 18.x | UI 렌더링 |
| **Router** | Next.js | 14.x | 파일 기반 라우팅, API Routes |
| **Language** | TypeScript | 5.x | 타입 안정성 |
| **State** | Zustand | 4.x | 경량 상태 관리 |
| **Data Fetch** | TanStack Query | 5.x | 캐싱, 동기화 |
| **Styling** | Tailwind CSS | 3.x | 유틸리티 기반 스타일 |
| **UI Lib** | shadcn/ui | - | 컴포넌트 라이브러리 |
| **WebSocket** | ws (native) | - | 양방향 통신 |

### Backend (API Routes + Integrations)

| 레이어 | 기술 | 목적 |
|--------|------|------|
| **Database** | Supabase (PostgreSQL) | 데이터 저장 |
| **Realtime** | Supabase Realtime | 폴링 없는 동기화 |
| **WebSocket Server** | Node.js + ws | Main ↔ Sub 통신 |
| **Auth** | Supabase Auth | 사용자 인증 |
| **Storage** | Supabase Storage | 파일 저장 |

---

## 파일 및 코드 참조

### 아키텍처 설계 결과

- **Main Dashboard**: `C:\claude\automation_orchestration\.claude\workflow\results\task_001.yaml`
  - 컴포넌트 트리, Zustand 스토어, API 엔드포인트, Supabase Realtime 채널

- **Sub Dashboard**: `C:\claude\automation_orchestration\.claude\workflow\results\task_002.yaml`
  - 컴포넌트 트리, Zustand 스토어, API 엔드포인트, WebSocket 프로토콜

### 목업 구현

- **Main Dashboard HTML**: `C:\claude\automation_orchestration\docs\mockups\main-dashboard.html`
  - 레이아웃, 4개 탭, 핸드 브라우저, 플레이어 그리드, 큐시트 프리뷰

- **Sub Dashboard HTML**: `C:\claude\automation_orchestration\docs\mockups\sub-dashboard.html`
  - 3개 탭, 26개 컴포지션 그리드, 84개 필드 매핑 테이블, 렌더 큐 상태

---

## 다음 단계

### 개발 팀

1. **타입 정의** (`src/types/`)
   - `session.ts`: SessionState 인터페이스
   - `hand.ts`: Hand, HandPlayer 타입
   - `cuesheet.ts`: CueItem, Cuesheet 타입
   - `composition.ts`: Composition, FieldMapping 타입

2. **Zustand 스토어** (`src/stores/`)
   - SessionStore, CuesheetStore, RealtimeStore, UIStore (Main)
   - RenderQueueStore, SlotMappingStore, CompositionStore, WebSocketStore (Sub)

3. **API 클라이언트** (`src/lib/`)
   - Supabase 클라이언트 설정
   - TanStack Query 설정
   - WebSocket 클라이언트

4. **React 컴포넌트** (`src/components/`)
   - Layout, Header, Sidebar
   - Feature 컴포넌트들
   - 공유 UI 컴포넌트

5. **테스트** (`tests/`)
   - 단위 테스트 (Jest)
   - 통합 테스트
   - E2E 테스트 (Playwright)

### QA 팀

1. 테스트 케이스 작성
2. UAT 환경 구성
3. 성능 벤치마크 설정

### 운영 팀

1. 배포 인프라 준비
2. 모니터링 설정
3. 로깅 및 에러 추적 구성

---

## 문서 버전 기록

| 버전 | 날짜 | 변경 사항 |
|------|------|---------|
| 1.0.0 | 2026-01-15 | 초기 통합 문서 완성 |

---

## 참조 자료

- [GFX AEP 필드 매핑 명세](./GFX_AEP_FIELD_MAPPING.md)
- [GFX 파이프라인 아키텍처](./GFX_PIPELINE_ARCHITECTURE.md)
- [Supabase 문서](https://supabase.com/docs)
- [React 18 문서](https://react.dev)
- [Next.js 14 문서](https://nextjs.org/docs)
- [Zustand 문서](https://github.com/pmndrs/zustand)
- [TanStack Query 문서](https://tanstack.com/query/latest)
