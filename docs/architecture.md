     1. 프로젝트 개요

     1.1 목적

     WSOP 포커 방송 자동화 시스템의 데이터베이스 스키마 전체 설계.
     입력 데이터(GFX, WSOP+, Manual) → 대시보드(Cuesheet) → 통합
     오케스트레이션(Supabase) → 출력(AEP)의 완전한 데이터 파이프라인 구축.

     1.2 스키마 전체 구조

     ┌─────────────────────────────────────────────────────────────────────────────┐       
     │                        Automation DB Schema Architecture                     │      
     └─────────────────────────────────────────────────────────────────────────────┘       

     ┌─────────────────────────────────────────────────────────────────────────────┐       
     │                              INPUT LAYER                                     │      
     ├─────────────────────────────────────────────────────────────────────────────┤       
     │                                                                             │       
     │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
     │  │   GFX JSON DB   │  │  WSOP+ Schema   │  │  Manual Schema  │            │
     │  │    (기존)       │  │    (신규)       │  │    (신규)       │            │
     │  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤            │
     │  │ - gfx_sessions  │  │ - wsop_events   │  │ - manual_players│            │
     │  │ - gfx_hands     │  │ - wsop_players  │  │ - manual_profiles│           │
     │  │ - gfx_events    │  │ - wsop_chips    │  │ - player_overrides│          │
     │  │ - gfx_players   │  │ - wsop_standings│  │ - profile_images │           │
     │  │ - hand_grades   │  │ - import_logs   │  │                 │            │
     │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘            │
     │           │                    │                    │                      │        
     └───────────┼────────────────────┼────────────────────┼──────────────────────┘        
                 │                    │                    │
                 └────────────────────┼────────────────────┘
                                      │
                                      ▼
     ┌─────────────────────────────────────────────────────────────────────────────┐       
     │                           ORCHESTRATION LAYER                                │      
     ├─────────────────────────────────────────────────────────────────────────────┤       
     │                                                                             │       
     │                    ┌─────────────────────────────┐                         │        
     │                    │     Supabase Schema         │                         │        
     │                    │   (Total Orchestration)     │                         │        
     │                    ├─────────────────────────────┤                         │        
     │                    │ - unified_players           │  ← 플레이어 통합 뷰      │       
     │                    │ - unified_events            │  ← 이벤트 통합 뷰        │       
     │                    │ - unified_chips             │  ← 칩 데이터 통합        │       
     │                    │ - sync_status               │  ← 동기화 상태          │        
     │                    │ - system_config             │  ← 시스템 설정          │        
     │                    │ - job_queue                 │  ← 작업 큐              │        
     │                    │ - render_queue              │  ← 렌더 큐              │        
     │                    └──────────────┬──────────────┘                         │        
     │                                   │                                         │       
     └───────────────────────────────────┼─────────────────────────────────────────┘       
                                         │
                                         ▼
     ┌─────────────────────────────────────────────────────────────────────────────┐       
     │                            DASHBOARD LAYER                                   │      
     ├─────────────────────────────────────────────────────────────────────────────┤       
     │                                                                             │       
     │                    ┌─────────────────────────────┐                         │        
     │                    │     Cuesheet Schema         │                         │        
     │                    │   (방송 진행 관리)           │                         │       
     │                    ├─────────────────────────────┤                         │        
     │                    │ - cue_sheets                │  ← 방송 큐시트          │        
     │                    │ - cue_items                 │  ← 개별 큐 아이템       │        
     │                    │ - cue_templates             │  ← 큐 템플릿            │        
     │                    │ - broadcast_sessions        │  ← 방송 세션            │        
     │                    │ - gfx_triggers              │  ← GFX 트리거 로그      │        
     │                    └──────────────┬──────────────┘                         │        
     │                                   │                                         │       
     └───────────────────────────────────┼─────────────────────────────────────────┘       
                                         │
                                         ▼
     ┌─────────────────────────────────────────────────────────────────────────────┐       
     │                             OUTPUT LAYER                                     │      
     ├─────────────────────────────────────────────────────────────────────────────┤       
     │                                                                             │       
     │                    ┌─────────────────────────────┐                         │        
     │                    │    AEP Analysis DB          │                         │        
     │                    │       (기존)                 │                         │       
     │                    ├─────────────────────────────┤                         │        
     │                    │ - aep_compositions          │                         │        
     │                    │ - aep_layers                │                         │        
     │                    │ - aep_field_keys            │                         │        
     │                    │ - aep_media_sources         │                         │        
     │                    └─────────────────────────────┘                         │        
     │                                                                             │       
     └─────────────────────────────────────────────────────────────────────────────┘       

     ---
     2. 신규 스키마 상세 설계

     2.1 WSOP+ Schema (Input)

     목적

     WSOP+ 플랫폼에서 내보낸 JSON/CSV 파일을 정규화하여 저장.
     토너먼트, 플레이어, 실시간 칩 카운트 데이터 관리.

     ERD

     ┌──────────────────────┐       ┌──────────────────────┐
     │   wsop_events        │       │   wsop_players       │
     │   (토너먼트/이벤트)   │       │   (플레이어 마스터)   │
     ├──────────────────────┤       ├──────────────────────┤
     │ PK id: uuid          │       │ PK id: uuid          │
     │ UK event_id: text    │───┐   │ UK wsop_player_id    │───┐
     │    event_name: text  │   │   │    name: text        │   │
     │    event_type: enum  │   │   │    country_code      │   │
     │    start_date: date  │   │   │    country_name      │   │
     │    end_date: date    │   │   │    profile_image_url │   │
     │    buy_in: int       │   │   │    wsop_bracelets    │   │
     │    total_entries     │   │   │    lifetime_earnings │   │
     │    prize_pool: int   │   │   │    created_at        │   │
     │    payouts: jsonb    │   │   │    updated_at        │   │
     │    status: enum      │   │   └──────────┬───────────┘   │
     │    created_at        │   │              │               │
     │    updated_at        │   │              │               │
     └──────────┬───────────┘   │              │               │
                │               │              │               │
                │ 1:N           │              │               │
                ▼               │              │               │
     ┌──────────────────────┐   │   ┌──────────────────────┐   │
     │  wsop_event_players  │◄──┘   │   wsop_chip_counts   │   │
     │  (이벤트별 참가자)    │       │   (칩 카운트 히스토리)│   │
     ├──────────────────────┤       ├──────────────────────┤   │
     │ PK id: uuid          │       │ PK id: uuid          │   │
     │ FK event_id: uuid    │       │ FK event_id: uuid    │◄──┘
     │ FK player_id: uuid   │◄──────│ FK player_id: uuid   │
     │    seat_num: int     │       │    table_num: int    │
     │    table_num: int    │       │    seat_num: int     │
     │    starting_chips    │       │    chip_count: int   │
     │    current_chips     │       │    rank: int         │
     │    rank: int         │       │    recorded_at: ts   │
     │    status: enum      │       │    source: enum      │
     │    eliminated_at     │       └──────────────────────┘
     │    prize_won: int    │
     │    created_at        │       ┌──────────────────────┐
     │    updated_at        │       │   wsop_standings     │
     └──────────────────────┘       │   (순위표 스냅샷)     │
                                    ├──────────────────────┤
     ┌──────────────────────┐       │ PK id: uuid          │
     │   wsop_import_logs   │       │ FK event_id: uuid    │
     │   (임포트 로그)       │       │    snapshot_at: ts   │
     ├──────────────────────┤       │    standings: jsonb  │
     │ PK id: uuid          │       │    players_remaining │
     │    file_name: text   │       │    avg_stack: int    │
     │    file_hash: text   │       │    created_at        │
     │    file_type: enum   │       └──────────────────────┘
     │    record_count: int │
     │    status: enum      │
     │    error_message     │
     │    processed_at      │
     │    created_at        │
     └──────────────────────┘

     Enum 타입

     CREATE TYPE wsop_event_type AS ENUM (
         'MAIN_EVENT',
         'BRACELET_EVENT',
         'SIDE_EVENT',
         'SATELLITE',
         'DEEPSTACK',
         'MYSTERY_BOUNTY'
     );

     CREATE TYPE wsop_event_status AS ENUM (
         'upcoming',
         'registration',
         'running',
         'final_table',
         'completed',
         'cancelled'
     );

     CREATE TYPE wsop_player_status AS ENUM (
         'registered',
         'active',
         'eliminated',
         'winner'
     );

     CREATE TYPE wsop_import_type AS ENUM (
         'json',
         'csv',
         'api'
     );

     CREATE TYPE chip_source AS ENUM (
         'import',       -- JSON/CSV 임포트
         'manual',       -- 수동 입력
         'realtime'      -- 실시간 업데이트
     );

     ---
     2.2 Manual Schema (Input)

     목적

     WSOP+ 데이터가 없거나 부정확할 때 수동으로 선수 프로필 관리.
     별도 관리하되, 통합 뷰에서 WSOP+ 데이터와 병합 가능.

     ERD

     ┌──────────────────────┐       ┌──────────────────────┐
     │   manual_players     │       │   player_overrides   │
     │   (수동 플레이어)     │       │   (오버라이드 규칙)   │
     ├──────────────────────┤       ├──────────────────────┤
     │ PK id: uuid          │       │ PK id: uuid          │
     │ UK player_code: text │───┐   │ FK manual_player_id  │◄──┐
     │    name: text        │   │   │ FK wsop_player_id    │   │
     │    name_korean: text │   │   │    field_name: text  │   │
     │    country_code      │   │   │    override_value    │   │
     │    country_name      │   │   │    reason: text      │   │
     │    nationality       │   │   │    priority: int     │   │
     │    birth_date: date  │   │   │    active: bool      │   │
     │    profile_image_url │   │   │    created_by        │   │
     │    profile_image_local│  │   │    created_at        │   │
     │    bio: text         │   │   └──────────────────────┘   │
     │    notable_wins: jsonb│  │                              │
     │    social_links: jsonb│  │   ┌──────────────────────┐   │
     │    is_verified: bool │   │   │   profile_images     │   │
     │    created_by: text  │   │   │   (이미지 저장소)     │   │
     │    created_at        │   │   ├──────────────────────┤   │
     │    updated_at        │   │   │ PK id: uuid          │   │
     └──────────────────────┘   └──▶│ FK player_id: uuid   │   │
                                    │    image_type: enum  │   │
     ┌──────────────────────┐       │    file_path: text   │   │
     │  player_link_mapping │       │    file_name: text   │   │
     │  (플레이어 연결)      │       │    width: int        │   │
     ├──────────────────────┤       │    height: int       │   │
     │ PK id: uuid          │       │    is_primary: bool  │   │
     │ FK manual_player_id  │◄──────│    uploaded_at       │   │
     │ FK wsop_player_id    │       └──────────────────────┘   │
     │ FK gfx_player_id     │                                  │
     │    match_confidence  │───────────────────────────────────┘
     │    match_method: enum│
     │    verified_by       │
     │    created_at        │
     └──────────────────────┘

     Enum 타입

     CREATE TYPE image_type AS ENUM (
         'profile',      -- 프로필 메인 이미지
         'thumbnail',    -- 썸네일
         'broadcast'     -- 방송용 이미지
     );

     CREATE TYPE match_method AS ENUM (
         'exact_name',   -- 이름 완전 일치
         'fuzzy_name',   -- 유사 이름 매칭
         'manual',       -- 수동 연결
         'wsop_id'       -- WSOP ID 기반
     );

     ---
     2.3 Cuesheet Schema (Dashboard)

     목적

     방송 진행 순서 관리. 큐시트를 통해 GFX 출력 순서와 타이밍 제어.

     ERD

     ┌──────────────────────┐       ┌──────────────────────┐
     │  broadcast_sessions  │       │     cue_sheets       │
     │  (방송 세션)          │       │     (큐시트)         │
     ├──────────────────────┤       ├──────────────────────┤
     │ PK id: uuid          │       │ PK id: uuid          │
     │ UK session_code: text│───┐   │ UK sheet_code: text  │
     │    event_name: text  │   │   │ FK session_id: uuid  │◄──┐
     │    broadcast_date    │   │   │    sheet_name: text  │   │
     │    scheduled_start   │   │   │    sheet_type: enum  │   │
     │    scheduled_end     │   │   │    version: int      │   │
     │    actual_start      │   │   │    status: enum      │   │
     │    actual_end        │   │   │    total_items: int  │   │
     │    status: enum      │   │   │    completed_items   │   │
     │    director: text    │   │   │    created_by        │   │
     │    technical_director│   │   │    created_at        │   │
     │    created_at        │   │   │    updated_at        │   │
     │    updated_at        │   └──▶└──────────┬───────────┘   │
     └──────────────────────┘                  │               │
                                               │ 1:N           │
                                               ▼               │
                                    ┌──────────────────────┐   │
                                    │     cue_items        │   │
                                    │   (큐 아이템)        │   │
                                    ├──────────────────────┤   │
                                    │ PK id: uuid          │   │
                                    │ FK sheet_id: uuid    │◄──┘
                                    │    cue_number: int   │
                                    │    cue_type: enum    │
                                    │    title: text       │
                                    │    description: text │
                                    │    gfx_template_name │
                                    │    gfx_data: jsonb   │
                                    │    duration_seconds  │
                                    │    scheduled_time    │
                                    │    actual_time       │
                                    │    status: enum      │
                                    │    sort_order: int   │
                                    │    notes: text       │
                                    │    created_at        │
                                    │    updated_at        │
                                    └──────────┬───────────┘
                                               │
                                               │ 1:N
                                               ▼
     ┌──────────────────────┐       ┌──────────────────────┐
     │   cue_templates      │       │    gfx_triggers      │
     │   (큐 템플릿)        │       │   (GFX 트리거 로그)   │
     ├──────────────────────┤       ├──────────────────────┤
     │ PK id: uuid          │       │ PK id: uuid          │
     │ UK template_code     │       │ FK cue_item_id: uuid │
     │    template_name     │       │    trigger_type: enum│
     │    cue_type: enum    │       │    trigger_time: ts  │
     │    gfx_template_name │       │    aep_comp_name     │
     │    default_duration  │       │    render_status     │
     │    data_schema: jsonb│       │    output_path: text │
     │    preview_image_url │       │    error_message     │
     │    is_active: bool   │       │    created_at        │
     │    created_at        │       └──────────────────────┘
     │    updated_at        │
     └──────────────────────┘

     Enum 타입

     CREATE TYPE broadcast_status AS ENUM (
         'scheduled',    -- 예정됨
         'preparing',    -- 준비 중
         'live',         -- 생방송 중
         'completed',    -- 완료
         'cancelled'     -- 취소
     );

     CREATE TYPE sheet_type AS ENUM (
         'pre_show',     -- 방송 전
         'main_show',    -- 메인 방송
         'post_show',    -- 방송 후
         'segment'       -- 세그먼트
     );

     CREATE TYPE sheet_status AS ENUM (
         'draft',        -- 초안
         'ready',        -- 준비 완료
         'active',       -- 진행 중
         'completed',    -- 완료
         'archived'      -- 아카이브
     );

     CREATE TYPE cue_type AS ENUM (
         'chip_count',       -- 칩 카운트
         'player_info',      -- 선수 정보
         'leaderboard',      -- 순위표
         'hand_replay',      -- 핸드 리플레이
         'elimination',      -- 탈락
         'payout',           -- 상금
         'event_info',       -- 이벤트 정보
         'transition',       -- 전환
         'lower_third',      -- 하단 자막
         'fullscreen'        -- 전체 화면
     );

     CREATE TYPE cue_item_status AS ENUM (
         'pending',      -- 대기
         'ready',        -- 준비됨
         'on_air',       -- 송출 중
         'completed',    -- 완료
         'skipped'       -- 건너뜀
     );

     CREATE TYPE trigger_type AS ENUM (
         'manual',       -- 수동 트리거
         'scheduled',    -- 예약 트리거
         'auto'          -- 자동 트리거
     );

     CREATE TYPE render_status AS ENUM (
         'pending',
         'rendering',
         'completed',
         'failed'
     );

     ---
     2.4 Supabase Schema (Orchestration)

     목적

     모든 데이터 소스(GFX, WSOP+, Manual)를 통합하여 단일 저장소로 관리.
     통합 뷰 제공, 동기화 상태 추적, 작업 큐 관리.

     통합 뷰 설계

     -- ============================================================================       
     -- unified_players: 모든 소스의 플레이어 통합 뷰
     -- ============================================================================       

     CREATE OR REPLACE VIEW unified_players AS
     SELECT
         COALESCE(m.id, w.id, g.id) AS unified_id,
         COALESCE(m.name, w.name, g.name) AS name,
         COALESCE(m.name_korean, w.name) AS name_display,
         COALESCE(m.country_code, w.country_code, '') AS country_code,
         COALESCE(m.country_name, w.country_name, '') AS country_name,
         COALESCE(m.profile_image_url, w.profile_image_url) AS profile_image,

         -- 데이터 소스 정보
         CASE
             WHEN m.id IS NOT NULL THEN 'manual'
             WHEN w.id IS NOT NULL THEN 'wsop'
             WHEN g.id IS NOT NULL THEN 'gfx'
             ELSE 'unknown'
         END AS primary_source,

         m.id AS manual_player_id,
         w.id AS wsop_player_id,
         g.id AS gfx_player_id,

         -- 메타데이터
         GREATEST(
             COALESCE(m.updated_at, '1970-01-01'),
             COALESCE(w.updated_at, '1970-01-01'),
             COALESCE(g.updated_at, '1970-01-01')
         ) AS last_updated

     FROM manual_players m
     FULL OUTER JOIN player_link_mapping plm ON m.id = plm.manual_player_id
     FULL OUTER JOIN wsop_players w ON plm.wsop_player_id = w.id
     FULL OUTER JOIN gfx_players g ON plm.gfx_player_id = g.id;

     작업 큐 테이블

     ┌──────────────────────┐       ┌──────────────────────┐
     │     job_queue        │       │    render_queue      │
     │   (작업 큐)          │       │   (렌더 큐)          │
     ├──────────────────────┤       ├──────────────────────┤
     │ PK id: uuid          │       │ PK id: uuid          │
     │    job_type: enum    │       │ FK job_id: uuid      │
     │    priority: int     │       │    aep_comp_name     │
     │    payload: jsonb    │       │    output_format     │
     │    status: enum      │       │    output_path       │
     │    retry_count: int  │       │    gfx_data: jsonb   │
     │    max_retries: int  │       │    status: enum      │
     │    scheduled_at: ts  │       │    progress: int     │
     │    started_at: ts    │       │    started_at: ts    │
     │    completed_at: ts  │       │    completed_at: ts  │
     │    error_message     │       │    error_message     │
     │    created_at        │       │    created_at        │
     └──────────────────────┘       └──────────────────────┘

     ┌──────────────────────┐       ┌──────────────────────┐
     │    sync_status       │       │   system_config      │
     │   (동기화 상태)       │       │   (시스템 설정)       │
     ├──────────────────────┤       ├──────────────────────┤
     │ PK id: uuid          │       │ PK key: text         │
     │    source: enum      │       │    value: jsonb      │
     │    entity_type: text │       │    description: text │
     │    entity_id: uuid   │       │    updated_by        │
     │    last_synced_at: ts│       │    updated_at        │
     │    sync_hash: text   │       └──────────────────────┘
     │    status: enum      │
     │    error_message     │
     │    created_at        │
     │    updated_at        │
     └──────────────────────┘

     Enum 타입

     CREATE TYPE job_type AS ENUM (
         'sync_gfx',         -- GFX JSON 동기화
         'sync_wsop',        -- WSOP+ 데이터 동기화
         'render_gfx',       -- GFX 렌더링
         'export_data',      -- 데이터 내보내기
         'import_data'       -- 데이터 가져오기
     );

     CREATE TYPE job_status AS ENUM (
         'pending',
         'running',
         'completed',
         'failed',
         'cancelled'
     );

     CREATE TYPE data_source AS ENUM (
         'gfx',
         'wsop',
         'manual',
         'cuesheet'
     );

     ---
     3. 기존 스키마 참조

     3.1 GFX JSON DB (Input) - 기존

     - 위치: docs/GFX JSON DB.md
     - 역할: PokerGFX JSON 파일 → 정규화 DB
     - 주요 테이블: gfx_sessions, gfx_hands, gfx_events, gfx_players, hand_grades

     3.2 AEP Analysis DB (Output) - 기존

     - 위치: docs/AEP Analysis DB.md
     - 역할: After Effects 컴포지션 분석 데이터
     - 주요 테이블: aep_compositions, aep_layers, aep_field_keys, aep_media_sources        

     ---
     4. 데이터 흐름

     ┌─────────────────────────────────────────────────────────────────────────────┐       
     │                           Data Flow Diagram                                  │      
     └─────────────────────────────────────────────────────────────────────────────┘       

      [NAS]                [WSOP+]              [수동 입력]
        │                    │                      │
        │ JSON 파일          │ JSON/CSV             │ Web UI
        ▼                    ▼                      ▼
     ┌──────────┐       ┌──────────┐          ┌──────────┐
     │ GFX JSON │       │ WSOP+    │          │ Manual   │
     │ Parser   │       │ Importer │          │ Editor   │
     └────┬─────┘       └────┬─────┘          └────┬─────┘
          │                  │                      │
          ▼                  ▼                      ▼
     ┌──────────┐       ┌──────────┐          ┌──────────┐
     │ GFX DB   │       │ WSOP+ DB │          │ Manual DB│
     └────┬─────┘       └────┬─────┘          └────┬─────┘
          │                  │                      │
          └──────────────────┼──────────────────────┘
                             │
                             ▼
                   ┌─────────────────┐
                   │   Supabase      │
                   │ (Unified Views) │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   Cuesheet      │
                   │  (Dashboard)    │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   AEP Render    │
                   │   (Output)      │
                   └─────────────────┘

     ---
     5. 구현 계획

     5.1 산출물
     ┌──────┬────────────────────────────────┬───────────────────────────┐
     │ 순서 │             파일명             │           내용            │
     ├──────┼────────────────────────────────┼───────────────────────────┤
     │ 1    │ docs/WSOP+ DB.md               │ WSOP+ Schema DDL 문서     │
     ├──────┼────────────────────────────────┼───────────────────────────┤
     │ 2    │ docs/Manual DB.md              │ Manual Schema DDL 문서    │
     ├──────┼────────────────────────────────┼───────────────────────────┤
     │ 3    │ docs/Cuesheet DB.md            │ Cuesheet Schema DDL 문서  │
     ├──────┼────────────────────────────────┼───────────────────────────┤
     │ 4    │ docs/Supabase Orchestration.md │ Supabase 통합 Schema 문서 │
     ├──────┼────────────────────────────────┼───────────────────────────┤
     │ 5    │ docs/DATA_FLOW.md              │ 전체 데이터 흐름 문서     │