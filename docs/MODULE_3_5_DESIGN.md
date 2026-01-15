# Module 3, 4, 5 상세 설계 문서

WSOP 포커 방송 자동화 시스템의 **Supabase DB 스키마, Main Dashboard, Sub Dashboard** 상세 설계

> **관련 문서**
> - [전체 아키텍처](ARCHITECTURE_ANALYSIS.md) - 5계층 시스템 개요
> - [파이프라인 아키텍처](GFX_PIPELINE_ARCHITECTURE.md) - 6개 모듈 전체 흐름
> - [DB 스키마 기본](architecture.md) - DDL 및 기본 구조
> - [AEP 필드 매핑](GFX_AEP_FIELD_MAPPING.md) - 26개 컴포지션 84개 필드

---

## 개요

본 문서는 **Module 3 (Supabase DB Schema)**, **Module 4 (Main Dashboard)**, **Module 5 (Sub Dashboard)**의 상세 설계를 다룹니다.

| 모듈 | 역할 | 기술 스택 |
|------|------|----------|
| **Module 3** | DB 스키마 설계 및 통합 | PostgreSQL 15, Supabase |
| **Module 4** | 핸드 수집/배치 및 연출 결정 | React, Next.js, TypeScript, Zustand |
| **Module 5** | 자막 출력 결정 및 렌더링 지시 | React, Next.js, TypeScript, WebSocket |

---

## Module 3: Supabase DB Schema 설계

### 3.1 스키마 개요

Supabase (PostgreSQL 15 기반)에서 **4개의 독립적인 스키마**로 구성:

```
┌────────────────────────────────────────────────────────────────┐
│                  SUPABASE (PostgreSQL 15)                       │
├────────────┬──────────────┬────────────┬───────────────────────┤
│   json     │  wsop_plus   │   manual   │        ae              │
│  (6테이블) │   (6테이블)   │  (5테이블)  │      (6테이블)         │
└────────────┴──────────────┴────────────┴───────────────────────┘
```

### 3.2 테이블 구성

#### 3.2.1 json 스키마 (GFX 원본 데이터)

**목적**: NAS의 PokerGFX JSON 데이터를 그대로 저장

| 테이블명 | 용도 | 주요 컬럼 |
|----------|------|----------|
| **gfx_sessions** | 게임 세션 메타데이터 | session_id, game_type, table_num, created_at |
| **hands** | 핸드 기본 정보 | hand_id, session_id, hand_num, board_cards, pot |
| **hand_players** | 플레이어별 핸드 데이터 | hand_id, player_name, seat, cards, action_position |
| **hand_actions** | 플레이 액션 시퀀스 | hand_id, action_num, player_name, action_type, amount |
| **hand_cards** | 카드 이력 추적 | hand_id, street, community_cards |
| **hand_results** | 결과 및 상금 | hand_id, winner, pot_split, payouts |

**DDL 예시 (hand_players)**:
```sql
CREATE TABLE json.hand_players (
  id BIGSERIAL PRIMARY KEY,
  hand_id TEXT NOT NULL REFERENCES json.hands(hand_id),
  player_name TEXT NOT NULL,
  seat SMALLINT NOT NULL,
  cards TEXT[],
  hole_cards_hidden BOOLEAN,
  action_position TEXT,
  final_position SMALLINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_hand FOREIGN KEY (hand_id)
    REFERENCES json.hands(hand_id) ON DELETE CASCADE
);

CREATE INDEX idx_hand_players_session ON json.hand_players(hand_id);
```

#### 3.2.2 wsop_plus 스키마 (WSOP+ 플랫폼)

**목적**: WSOP+ API로부터 수집한 공식 토너먼트/선수 데이터

| 테이블명 | 용도 | 주요 컬럼 |
|----------|------|----------|
| **tournaments** | 토너먼트 마스터 | tournament_id, event_code, year, name, start_date |
| **blind_levels** | 블라인드 구조 | tournament_id, level, small_blind, big_blind, ante |
| **payouts** | 최종 상금표 | tournament_id, position, payout_amount |
| **player_instances** | 선수별 토너먼트 참가 기록 | tournament_id, wsop_player_id, start_chips, final_position |
| **schedules** | 경기일정 | tournament_id, day, start_time, tables, players |
| **official_players** | WSOP 공식 선수 마스터 | wsop_player_id, name, player_url, country |

#### 3.2.3 manual 스키마 (수동 입력/오버라이드)

**목적**: 방송 진행자의 수동 입력 및 GFX/WSOP+ 데이터 오버라이드

| 테이블명 | 용도 | 주요 컬럼 |
|----------|------|----------|
| **players_master** | 선수 기본 정보 | player_id, name, nickname, photo_url, commentary |
| **player_profiles** | 선수 프로필 상세 | player_id, age, hometown, career_highlights |
| **commentators** | 중계자 정보 | commentator_id, name, role, active |
| **venues** | 개최지 정보 | venue_id, name, city, country, setup_notes |
| **feature_tables** | 피처테이블 배치 | table_num, players, broadcast_priority, layout_notes |

**DDL 예시 (players_master)**:
```sql
CREATE TABLE manual.players_master (
  player_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  photo_url TEXT,
  commentary TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.2.4 ae 스키마 (AE 템플릿/렌더링)

**목적**: After Effects 컴포지션 템플릿 및 렌더링 작업 추적

| 테이블명 | 용도 | 주요 컬럼 |
|----------|------|----------|
| **templates** | AE 템플릿 메타데이터 | template_id, name, version, aep_file_path |
| **compositions** | 컴포지션 정의 | comp_id, template_id, name, width, height |
| **comp_layers** | 레이어별 매핑 | layer_id, comp_id, layer_name, data_source |
| **data_mappings** | 필드-데이터 연결 | mapping_id, comp_id, gfx_field, ae_property_path |
| **render_jobs** | 렌더링 작업 | job_id, hand_id, template_id, status, created_at |
| **render_outputs** | 렌더링 결과 | output_id, job_id, video_path, frame_count, duration |

**DDL 예시 (render_jobs)**:
```sql
CREATE TABLE ae.render_jobs (
  job_id TEXT PRIMARY KEY,
  hand_id TEXT NOT NULL REFERENCES json.hands(hand_id),
  template_id TEXT NOT NULL REFERENCES ae.templates(template_id),
  composition TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'queued', 'rendering', 'completed', 'failed')),
  priority SMALLINT DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  FOREIGN KEY (template_id) REFERENCES ae.templates(template_id)
);

CREATE INDEX idx_render_jobs_status ON ae.render_jobs(status);
CREATE INDEX idx_render_jobs_hand ON ae.render_jobs(hand_id);
```

### 3.3 통합 뷰 (Views)

#### 3.3.1 unified_players 뷰

**목적**: Manual > WSOP+ > GFX 우선순위로 플레이어 정보 통합

```sql
CREATE VIEW public.unified_players AS
SELECT
  COALESCE(m.player_id, w.wsop_player_id, g.player_name) AS player_id,
  COALESCE(m.name, w.name, g.player_name) AS name,
  COALESCE(m.nickname, w.name) AS nickname,
  COALESCE(m.photo_url, w.photo_url, '') AS photo_url,
  m.commentary,
  w.country,
  m.active,
  CASE
    WHEN m.player_id IS NOT NULL THEN 'manual'
    WHEN w.wsop_player_id IS NOT NULL THEN 'wsop_plus'
    ELSE 'gfx'
  END AS data_source,
  COALESCE(m.updated_at, w.updated_at, g.created_at) AS last_updated
FROM manual.players_master m
FULL OUTER JOIN wsop_plus.official_players w ON LOWER(m.name) = LOWER(w.name)
FULL OUTER JOIN json.hand_players g ON LOWER(g.player_name) = LOWER(COALESCE(m.name, w.name))
WHERE m.active IS TRUE OR m.player_id IS NULL;
```

**우선순위 로직**:
1. **Manual**: 수동 입력이 최우선
2. **WSOP+**: 공식 플랫폼 데이터
3. **GFX**: 원본 JSON 데이터

#### 3.3.2 unified_chip_data 뷰

**목적**: 현재 칩 카운트 최신값 조회

```sql
CREATE VIEW public.unified_chip_data AS
SELECT
  h.hand_id,
  h.session_id,
  hp.player_name,
  hp.seat,
  COALESCE(m.chips_current, w.current_chips, 0) AS chips,
  COALESCE(m.chips_updated_at, w.updated_at, h.created_at) AS updated_at,
  CASE
    WHEN m.chips_current IS NOT NULL THEN 'manual'
    WHEN w.current_chips IS NOT NULL THEN 'wsop_plus'
    ELSE 'gfx'
  END AS source
FROM json.hands h
JOIN json.hand_players hp ON h.hand_id = hp.hand_id
LEFT JOIN manual.player_chip_overrides m ON
  LOWER(hp.player_name) = LOWER(m.player_name) AND h.session_id = m.session_id
LEFT JOIN wsop_plus.player_instances w ON
  LOWER(hp.player_name) = LOWER(w.wsop_player_name) AND h.session_id = w.session_id;
```

### 3.4 인덱스 전략

**성능 최적화를 위한 핵심 인덱스**:

```sql
-- json 스키마
CREATE INDEX idx_gfx_sessions_created ON json.gfx_sessions(created_at DESC);
CREATE INDEX idx_hands_session_handnum ON json.hands(session_id, hand_num);
CREATE INDEX idx_hand_players_name_lower ON json.hand_players(LOWER(player_name));
CREATE INDEX idx_hand_actions_hand ON json.hand_actions(hand_id, action_num);

-- wsop_plus 스키마
CREATE INDEX idx_tournaments_year ON wsop_plus.tournaments(year DESC);
CREATE INDEX idx_player_instances_tournament ON wsop_plus.player_instances(tournament_id);

-- manual 스키마
CREATE INDEX idx_players_master_active ON manual.players_master(active);
CREATE INDEX idx_player_profiles_name_lower ON manual.player_profiles(LOWER(name));

-- ae 스키마
CREATE INDEX idx_render_jobs_status ON ae.render_jobs(status);
CREATE INDEX idx_render_jobs_created ON ae.render_jobs(created_at DESC);
CREATE INDEX idx_compositions_template ON ae.compositions(template_id);
```

### 3.5 RLS (Row Level Security) 정책

**Supabase 인증 모델에 따른 접근 제어**:

```sql
-- anon (인증 없음): 읽기만 허용
CREATE POLICY "anon_read_public_views"
  ON public.unified_players
  FOR SELECT
  USING (TRUE);

-- authenticated (인증됨): 모든 작업 허용
CREATE POLICY "authenticated_all"
  ON json.gfx_sessions
  FOR ALL
  USING (auth.role() = 'authenticated');

-- service_role (서버 로직): 모든 작업 무제한
-- (Supabase 내부에서 자동으로 서비스 역할에 대해 RLS 우회)
```

### 3.6 실시간 동기화 전략

**Supabase Realtime 구독**:

```sql
-- 재료 테이블 (Main Dashboard에서 구독)
ALTER TABLE json.hands REPLICA IDENTITY FULL;
ALTER TABLE json.hand_players REPLICA IDENTITY FULL;
ALTER TABLE ae.render_jobs REPLICA IDENTITY FULL;

-- 뷰는 직접 구독 불가, 기본 테이블을 통해 트리거 사용
CREATE OR REPLACE FUNCTION notify_unified_players_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'unified_players_change',
    json_build_object('action', TG_OP, 'data', row_to_json(NEW))::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_unified_players_change
  AFTER INSERT OR UPDATE ON manual.players_master
  FOR EACH ROW
  EXECUTE FUNCTION notify_unified_players_change();
```

---

## Module 4: Main Dashboard 설계

### 4.1 역할 및 목표

**Main Dashboard의 역할**:
- 핸드 수집 및 배치
- 플레이어 정보 통합 관리
- 방송 연출 의사결정 (What/When)
- 큐시트 생성 및 수정
- 실시간 모니터링

### 4.2 컴포넌트 트리 구조

```
MainDashboard/
├── layout/
│   ├── Header
│   │   ├── BroadcastStatus (실시간 상태)
│   │   └── SessionSelector (세션 선택)
│   ├── Sidebar
│   │   ├── NavMenu
│   │   └── SessionStats (세션 통계)
│   └── MainContent
│       └── ContentArea
│
├── features/
│   ├── hand-browser/
│   │   ├── HandBrowser (메인 컨테이너)
│   │   ├── HandList (핸드 목록)
│   │   ├── PlayerGrid (선수 칩 카운트 그리드)
│   │   ├── ChipChart (칩 분포 차트)
│   │   └── HandDetail (핸드 상세)
│   │
│   ├── cuesheet/
│   │   ├── CuesheetEditor (큐시트 수정 영역)
│   │   ├── CueItemList (큐 아이템 목록)
│   │   └── TimelineView (타임라인)
│   │
│   ├── realtime-monitor/
│   │   ├── SessionStatus (게임 상태)
│   │   ├── GfxEventFeed (GFX 이벤트 피드)
│   │   └── ErrorBoundary (에러 처리)
│   │
│   └── player-management/
│       ├── PlayerSearch (선수 검색)
│       ├── PlayerCard (선수 카드)
│       ├── ManualOverrideForm (정보 오버라이드)
│       └── PlayerPhotoUpload (사진 업로드)
│
└── hooks/
    ├── useSupabaseRealtime (Realtime 구독)
    ├── useHandData (핸드 데이터 조회)
    ├── useCuesheet (큐시트 상태)
    ├── useUnifiedPlayer (통합 플레이어 뷰)
    ├── useChipData (칩 카운트)
    └── useSession (세션 상태)
```

### 4.3 상태 관리 아키텍처

#### 4.3.1 Zustand Store 구조

**SessionStore** (전역 세션 상태):
```typescript
interface SessionState {
  // 세션 정보
  sessionId: string | null;
  gameType: 'cash' | 'tournament';
  startTime: Date | null;
  status: 'live' | 'paused' | 'ended';

  // 현재 핸드
  currentHandId: string | null;
  handNum: number;

  // 액션
  setSession: (sessionId: string) => void;
  updateStatus: (status: SessionState['status']) => void;
  setCurrentHand: (handId: string, handNum: number) => void;
}
```

**CuesheetStore** (큐시트 상태):
```typescript
interface CuesheetState {
  items: CueItem[];
  selectedItemId: string | null;
  isDirty: boolean;

  // 액션
  addItem: (item: CueItem) => void;
  updateItem: (id: string, updates: Partial<CueItem>) => void;
  deleteItem: (id: string) => void;
  selectItem: (id: string) => void;
  saveToDb: () => Promise<void>;
}
```

**RealtimeState** (실시간 이벤트):
```typescript
interface RealtimeState {
  events: RealtimeEvent[];
  unreadCount: number;

  // 액션
  addEvent: (event: RealtimeEvent) => void;
  clearEvents: () => void;
  markAsRead: () => void;
}
```

#### 4.3.2 TanStack Query 통합

```typescript
// 핸드 데이터 조회
const useHandsQuery = (sessionId: string) => {
  return useQuery({
    queryKey: ['hands', sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('json.hands')
        .select('*, hand_players(*)')
        .eq('session_id', sessionId)
        .order('hand_num', { ascending: true });
      return data;
    },
  });
};

// 통합 플레이어 데이터
const useUnifiedPlayerQuery = (playerName: string) => {
  return useQuery({
    queryKey: ['unified_players', playerName],
    queryFn: async () => {
      const { data } = await supabase
        .from('unified_players')
        .select('*')
        .ilike('name', `%${playerName}%`);
      return data?.[0];
    },
  });
};

// 칩 데이터 실시간 구독
const useChipDataQuery = (sessionId: string) => {
  return useQuery({
    queryKey: ['chip_data', sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('unified_chip_data')
        .select('*')
        .eq('session_id', sessionId);
      return data;
    },
  });
};
```

### 4.4 API 엔드포인트

**Next.js API Routes** (`pages/api/`):

#### 4.4.1 세션 관리
```
GET    /api/sessions                    # 세션 목록
GET    /api/sessions/:id                # 세션 상세
POST   /api/sessions                    # 세션 생성
PATCH  /api/sessions/:id                # 세션 수정
```

#### 4.4.2 핸드 데이터
```
GET    /api/sessions/:id/hands          # 세션의 모든 핸드
GET    /api/hands/:id                   # 핸드 상세
POST   /api/hands                       # 핸드 생성
GET    /api/hands/:id/players           # 핸드의 플레이어들
```

#### 4.4.3 큐시트 관리
```
GET    /api/cuesheets                   # 큐시트 목록
GET    /api/cuesheets/:id               # 큐시트 상세
POST   /api/cuesheets                   # 큐시트 생성
PATCH  /api/cuesheets/:id               # 큐시트 수정
GET    /api/cuesheets/:id/items         # 큐 아이템 목록
POST   /api/cuesheets/:id/items         # 큐 아이템 추가
PATCH  /api/cuesheets/:id/items/:itemId # 큐 아이템 수정
DELETE /api/cuesheets/:id/items/:itemId # 큐 아이템 삭제
```

#### 4.4.4 플레이어 관리
```
GET    /api/players/search              # 플레이어 검색 (통합뷰)
GET    /api/players/:id                 # 플레이어 상세 (통합)
POST   /api/players/:id/override        # 수동 오버라이드
GET    /api/players/:id/chip-history    # 칩 히스토리
POST   /api/players/:id/photo           # 사진 업로드
```

### 4.5 Realtime 구독 전략

```typescript
// useSupabaseRealtime 훅
export const useSupabaseRealtime = (sessionId: string) => {
  const dispatch = useRealtimeStore((state) => state.addEvent);

  useEffect(() => {
    // 핸드 변경 구독
    const handsSubscription = supabase
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'json',
          table: 'hands',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          dispatch({
            type: 'hand_updated',
            data: payload.new,
            timestamp: new Date(),
          });
        }
      )
      .subscribe();

    // 렌더 작업 변경 구독
    const renderJobsSubscription = supabase
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'ae',
          table: 'render_jobs',
        },
        (payload) => {
          dispatch({
            type: 'render_job_updated',
            data: payload.new,
            timestamp: new Date(),
          });
        }
      )
      .subscribe();

    return () => {
      handsSubscription.unsubscribe();
      renderJobsSubscription.unsubscribe();
    };
  }, [sessionId]);
};
```

### 4.6 UI 와이어프레임

**Main Dashboard 레이아웃**:

```
┌──────────────────────────────────────────────────────────────────┐
│ Header: [Broadcast Status] [Session Selector] [User Menu]        │
├──────────┬───────────────────────────────────────────────────────┤
│          │                                                        │
│ Sidebar  │              MainContent Area                         │
│          │                                                        │
│ Sessions │  [Hand Browser Tab] [Cuesheet Tab] [Players Tab]     │
│ Stats    │  ┌──────────────────────────────────────────────┐    │
│          │  │ Hand List (현재 핸드: #45)                    │    │
│ NavMenu  │  │ ┌─────────┬─────────┬─────────────────────┐  │    │
│          │  │ │Hand #44 │Hand #45*│ Hand #46 ...       │  │    │
│          │  │ └─────────┴─────────┴─────────────────────┘  │    │
│          │  │                                              │    │
│          │  │ Player Chip Grid:                           │    │
│          │  │ ┌────────┐ ┌────────┐ ┌────────────────┐   │    │
│          │  │ │Player A│ │Player B│ │Player C        │   │    │
│          │  │ │245K    │ │128K    │ │890K            │   │    │
│          │  │ └────────┘ └────────┘ └────────────────┘   │    │
│          │  │                                              │    │
│          │  │ Chip Distribution Chart                     │    │
│          │  │ [Bar Chart/Pie Chart]                       │    │
│          │  └──────────────────────────────────────────────┘    │
│          │                                                        │
└──────────┴───────────────────────────────────────────────────────┘
```

---

## Module 5: Sub Dashboard 설계

### 5.1 역할 및 목표

**Sub Dashboard의 역할**:
- 자막 컴포지션 선택 및 프리뷰
- 슬롯 매핑 (데이터 → 필드)
- 렌더 큐 관리 및 진행상황 추적
- 최종 출력물 검증

### 5.2 컴포넌트 트리 구조

```
SubDashboard/
├── layout/
│   ├── Header
│   │   ├── RenderQueueStatus
│   │   └── OutputFolder (결과물 폴더)
│   └── MainContent
│
├── features/
│   ├── caption-selector/
│   │   ├── CompositionGrid (26개 컴포지션 그리드)
│   │   │   ├── CompositionCard (개별 컴포지션)
│   │   │   │   ├── Thumbnail
│   │   │   │   ├── CompName
│   │   │   │   └── SelectButton
│   │   │   └── FilterBar (필터/검색)
│   │   │
│   │   ├── SlotMappingPanel (데이터 소스 → 필드 매핑)
│   │   │   ├── SourceSelector (GFX/WSOP+/Manual)
│   │   │   ├── FieldMapper (84개 필드 맵핑)
│   │   │   │   ├── FieldRow (필드별 입력)
│   │   │   │   ├── DataSourceDropdown
│   │   │   │   └── PreviewValue
│   │   │   └── MappingSaveButton
│   │   │
│   │   └── PreviewPane (렌더링 프리뷰)
│   │       ├── CompPreview (컴포지션 미리보기)
│   │       ├── DataPreview (적용될 데이터 표시)
│   │       └── RefreshButton
│   │
│   ├── render-queue/
│   │   ├── RenderQueue (큐 전체 뷰)
│   │   ├── RenderJobCard (개별 작업)
│   │   │   ├── JobInfo (상태, 우선순위)
│   │   │   ├── ProgressBar (진행률)
│   │   │   ├── Actions (취소, 재시도)
│   │   │   └── Logs (에러 메시지)
│   │   ├── QueueControls (일시정지, 재개, 우선순위 변경)
│   │   └── CompletedJobs (완료된 작업 목록)
│   │
│   ├── slot-mapping/ (고급 매핑 에디터)
│   │   ├── SlotMappingEditor (핵심 컴포넌트)
│   │   ├── FieldMapper (필드 맵핑 테이블)
│   │   ├── DataSourceSelector (데이터 소스 선택)
│   │   ├── ValuePreview (실시간 값 미리보기)
│   │   └── SaveMappingButton
│   │
│   └── output-viewer/
│       ├── OutputViewer (결과물 뷰어)
│       ├── VideoPreview (렌더된 비디오 플레이어)
│       ├── OutputMetadata (메타데이터)
│       └── DownloadButton (다운로드)
│
└── hooks/
    ├── useWebSocketFromMain (Main과의 WebSocket)
    ├── useRenderQueue (렌더 큐 상태)
    ├── useSlotMapping (슬롯 매핑 상태)
    ├── useCompositionData (컴포지션 데이터)
    └── useRenderMonitoring (렌더 모니터링)
```

### 5.3 상태 관리

#### 5.3.1 Zustand Store

**RenderQueueStore**:
```typescript
interface RenderQueueState {
  jobs: RenderJob[];
  selectedJobId: string | null;
  isPaused: boolean;

  // 액션
  addJob: (job: RenderJob) => void;
  updateJobStatus: (jobId: string, status: JobStatus) => void;
  cancelJob: (jobId: string) => void;
  pauseQueue: () => void;
  resumeQueue: () => void;
  setPriority: (jobId: string, priority: number) => void;
}
```

**SlotMappingStore**:
```typescript
interface SlotMappingState {
  composition: Composition | null;
  mappings: FieldMapping[];
  dataSource: 'gfx' | 'wsop_plus' | 'manual';
  selectedFieldId: string | null;

  // 액션
  selectComposition: (comp: Composition) => void;
  updateMapping: (fieldId: string, sourceField: string) => void;
  setDataSource: (source: DataSource) => void;
  saveMapping: () => Promise<void>;
}
```

### 5.4 WebSocket 통신 프로토콜

**Main → Sub (대시보드 간 통신)**:

```typescript
// Main에서 발송
interface MainToSubMessage {
  type: 'cue_item_selected' | 'cue_item_cancelled' | 'hand_updated';
  payload: {
    cueItemId?: string;
    handId?: string;
    hand?: Hand;
    players?: UnifiedPlayer[];
  };
  timestamp: string;
}

// Sub에서 수신 및 처리
useWebSocketFromMain((message: MainToSubMessage) => {
  switch(message.type) {
    case 'cue_item_selected':
      // 자막 선택됨 → 자동으로 해당 컴포지션 선택
      selectCompositionForCue(message.payload.cueItemId);
      break;
    case 'hand_updated':
      // 핸드 변경 → 데이터 미리보기 업데이트
      updateDataPreview(message.payload.hand);
      break;
  }
});
```

**Sub → Main (상태 변경 알림)**:

```typescript
// Sub에서 발송
interface SubToMainMessage {
  type: 'render_status_update' | 'mapping_changed';
  payload: {
    jobId?: string;
    status?: JobStatus;
    progress?: number;
    mappingId?: string;
  };
  timestamp: string;
}

// Main에서 수신 및 처리
useWebSocketToSub((message: SubToMainMessage) => {
  switch(message.type) {
    case 'render_status_update':
      // 렌더링 상태 업데이트
      updateRenderJobStatus(message.payload.jobId, message.payload.status);
      break;
    case 'mapping_changed':
      // 매핑 변경 알림
      syncMappingData(message.payload.mappingId);
      break;
  }
});
```

### 5.5 API 엔드포인트

**Next.js API Routes** (`pages/api/`):

#### 5.5.1 컴포지션 관리
```
GET    /api/compositions                # 26개 컴포지션 목록
GET    /api/compositions/:id            # 컴포지션 상세
GET    /api/compositions/:id/layers     # 컴포지션 레이어
GET    /api/compositions/:id/preview    # 컴포지션 프리뷰
```

#### 5.5.2 슬롯 매핑
```
GET    /api/slot-mappings               # 저장된 매핑 목록
GET    /api/slot-mappings/:id           # 매핑 상세
POST   /api/slot-mappings               # 새 매핑 생성
PATCH  /api/slot-mappings/:id           # 매핑 수정
POST   /api/slot-mappings/:id/preview   # 프리뷰 데이터 조회
```

#### 5.5.3 렌더링 작업
```
GET    /api/render-jobs                 # 렌더 큐 전체
POST   /api/render-jobs                 # 렌더 작업 생성
PATCH  /api/render-jobs/:id             # 작업 상태 변경
DELETE /api/render-jobs/:id             # 작업 취소
PATCH  /api/render-jobs/:id/priority    # 우선순위 변경
GET    /api/render-jobs/:id/logs        # 렌더 로그
```

#### 5.5.4 출력물
```
GET    /api/render-outputs              # 완료된 출력물 목록
GET    /api/render-outputs/:id          # 출력물 상세
GET    /api/render-outputs/:id/video    # 비디오 스트림
```

### 5.6 UI 와이어프레임

**Sub Dashboard 레이아웃**:

```
┌────────────────────────────────────────────────────────────────┐
│ Header: [Render Queue Status] [Output Folder] [Settings]       │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Caption Selector Tab] [Render Queue Tab] [Output Tab]        │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────┐   │
│  │ Composition Grid     │  │ Slot Mapping Panel           │   │
│  │ (26 컴포지션 카드)    │  │ ┌────────────────────────┐   │   │
│  │                      │  │ │[Composition Selected]   │   │   │
│  │ ┌──────┐ ┌──────┐   │  │ │                        │   │   │
│  │ │Comp1 │ │Comp2 │   │  │ │Data Source:           │   │   │
│  │ │      │ │      │   │  │ │[GFX v] [WSOP+ ] [Man] │   │   │
│  │ └──────┘ └──────┘   │  │ │                        │   │   │
│  │                      │  │ │Field Mapping Table:   │   │   │
│  │ ┌──────┐ ┌──────┐   │  │ │ Field    | Source    │   │   │
│  │ │Comp3 │ │Comp4 │   │  │ │──────────┼────────────│   │   │
│  │ │      │ │      │   │  │ │ Hand # 1 | hand_num  │   │   │
│  │ └──────┘ └──────┘   │  │ │ Board    | board_...  │   │   │
│  │ ...                  │  │ │ Pot      | pot        │   │   │
│  │                      │  │ │──────────┴────────────│   │   │
│  │ [Previous] [Next]    │  │ └────────────────────────┘   │   │
│  └──────────────────────┘  │                              │   │
│                            │ [Preview]   [Save Mapping] │   │
│  ┌──────────────────────┐  └──────────────────────────────┘   │
│  │ Preview Pane         │                                      │
│  │ [After Effects Frame │                                      │
│  │  with data applied]  │                                      │
│  └──────────────────────┘                                      │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

**Render Queue 탭**:

```
┌────────────────────────────────────────────────────────────────┐
│ Queue Controls: [Pause] [Resume] [Priority↑] [Priority↓]      │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Active Jobs:                                                    │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Job #1: Hand #45 → Comp12 [████████░░] 80% (2:30)        │ │
│ │ Action: [Cancel] [View Logs]                             │ │
│ │                                                            │ │
│ │ Job #2: Hand #46 → Comp8  [████░░░░░░] 40% (1:15)        │ │
│ │ Action: [Cancel] [View Logs]                             │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Queued Jobs:                                                    │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Job #3: Hand #47 → Comp15 (Pending) [Priority: 50]       │ │
│ │ Job #4: Hand #48 → Comp3  (Pending) [Priority: 40]       │ │
│ │ Job #5: Hand #49 → Comp22 (Pending) [Priority: 30]       │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Completed Jobs (최근 10개):                                     │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ✓ Job #45: Hand #40 → Comp6  [3:45] (Downloaded)        │ │
│ │ ✓ Job #44: Hand #39 → Comp9  [3:40] (Downloaded)        │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

### 5.7 26개 컴포지션 그리드 구성

**컴포지션 카드 요소**:

```
┌──────────────────────┐
│  [Thumbnail Image]   │  (선택 시 하이라이트)
├──────────────────────┤
│ Composition Name     │  (예: "Hand Results")
│ 1920x1080 | 4.2 MB   │  (해상도, 파일크기)
├──────────────────────┤
│ Layers: 8            │  (레이어 개수)
│ Fields: 12           │  (매핑 가능 필드 수)
├──────────────────────┤
│   [Select]           │  (선택 버튼)
└──────────────────────┘
```

**필터/검색 기능**:

```
[Search by name..........] [Filters: ▼]
- By resolution (1080p, 720p, custom)
- By layer count (1-5, 6-10, 10+)
- By last used (Recently, Last week, etc.)
- Favorites ⭐
```

---

## 상호작용 및 데이터 흐름

### 5.8 Main ↔ Sub 통신 흐름

```
┌──────────────────────┐         WebSocket         ┌──────────────────────┐
│  Main Dashboard      │◄─────────────────────────►│   Sub Dashboard      │
└──────────────────────┘         Real-time         └──────────────────────┘
         │                                                    │
         │                                                    │
  1. 핸드 선택                                          2. 컴포지션 자동선택
     (hand #45)  ──cue_item_selected─────────────►   → Comp 자동 매핑
                                                          (기존 매핑 로드)

  3. 플레이어 데이터                                  4. 데이터 미리보기
     업데이트                                         (렌더 전 검증)
     (칩카운트 변경) ──hand_updated─────────────►  → 자동 새로고침
                                                      (24fps)

  5. 렌더 명령 확인                                   6. 렌더 큐 추가
     (사용자 승인)  ◄─render_start_confirmed───    실행 시작
                                                     → 진행률 실시간 전송

  7. 진행상황 표시 ◄─render_status_update──────   (status + %)
     (프로그레스바)

  8. 완료 알림      ◄─render_complete────────────  (비디오 경로)
     (다운로드 가능)
```

### 5.9 데이터 일관성 보장

**우선순위 기반 통합**:

```
Manual > WSOP+ > GFX

예시: 플레이어 이름
1. manual.players_master (수동 이름) ✅ 사용
2. wsop_plus.official_players (WSOP 공식명)
3. json.hand_players (GFX 원본명)
```

**동기화 타이밍**:

```
GFX JSON 업로드
  │
  ▼
Module 2: GFX-NAS-Supabase Sync
  │ (파이썬, Watchdog)
  ▼
Supabase (json 스키마)
  │
  ▼ Realtime Broadcast
Main Dashboard (구독 시작)
  │ (플레이어, 핸드 표시)
  ▼ WebSocket
Sub Dashboard (자동 갱신)
  │ (프리뷰, 매핑)
  ▼
Render Job 생성
```

---

## 보안 및 성능

### 5.10 RLS 정책 적용 시나리오

| 사용자 | 읽기 | 쓰기 | 관리 |
|--------|------|------|------|
| **anon** | 공개 뷰만 | ❌ | ❌ |
| **authenticated** (방송 스태프) | 모두 | 자신 데이터만 | ❌ |
| **service_role** (서버 로직) | ✅ | ✅ | ✅ |

### 5.11 성능 최적화

**인덱스 활용**:
- `idx_hand_players_name_lower`: PlayerSearch 쿼리
- `idx_render_jobs_status`: RenderQueue 필터링
- `idx_hands_session_handnum`: HandBrowser 정렬

**쿼리 최적화**:
```typescript
// ❌ 비효율: N+1 문제
const hands = await getHands();
for (const hand of hands) {
  const players = await getPlayersByHand(hand.id);  // 루프 내 반복 쿼리
}

// ✅ 효율: 한번에 조회
const hands = await supabase
  .from('json.hands')
  .select('*, hand_players(*)')  // 조인
  .eq('session_id', sessionId);
```

**캐싱 전략**:
- TanStack Query: staleTime = 30초, gcTime = 5분
- Zustand: 로컬 상태 (재렌더링 방지)
- Redis (선택사항): 자주 조회되는 view 캐싱

---

## 요약

| 모듈 | 핵심 역할 | 결과물 |
|------|----------|--------|
| **Module 3** | Supabase 스키마 + 뷰 + RLS 정책 | 4개 스키마, 23개 테이블 |
| **Module 4** | 핸드 수집, 배치, 연출 결정 | Main 대시보드 + 18개 컴포넌트 |
| **Module 5** | 자막 출력, 렌더링 지시 | Sub 대시보드 + 렌더 큐 관리 |

**다음 단계**:
1. Module 3: DDL 스크립트 생성 및 Supabase 마이그레이션
2. Module 4: React 컴포넌트 구현 시작 (HandBrowser 우선)
3. Module 5: WebSocket 서버 설정 및 RenderQueue 구현
