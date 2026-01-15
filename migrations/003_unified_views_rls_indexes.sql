-- Migration 003: Unified Views, RLS Policies, and Indexes
-- Purpose: Create integrated views with priority-based data merging, RLS policies, and performance indexes
-- Created: 2026-01-15
-- Related: MODULE_3_5_DESIGN.md (Section 3.3, 3.4, 3.5)

-- ============================================================================
-- 1. UNIFIED VIEWS
-- ============================================================================

-- 1.1 unified_players: Manual > WSOP+ > GFX 우선순위 통합
-- Purpose: 플레이어 정보를 3개 데이터 소스에서 통합하여 단일 뷰 제공
CREATE OR REPLACE VIEW public.unified_players AS
SELECT
  -- Primary Key: 우선순위 기반 병합
  COALESCE(m.player_id, w.wsop_player_id::TEXT, g.player_name) AS player_id,

  -- 이름 필드 (Manual > WSOP+ > GFX)
  COALESCE(m.name, w.name, g.player_name) AS name,
  COALESCE(m.nickname, w.name) AS nickname,

  -- 프로필 정보
  COALESCE(m.photo_url, '') AS photo_url,
  m.commentary,

  -- WSOP+ 전용 필드
  w.country,
  w.player_url AS wsop_profile_url,

  -- Manual 전용 필드
  m.active,

  -- 메타데이터: 데이터 소스 추적
  CASE
    WHEN m.player_id IS NOT NULL THEN 'manual'
    WHEN w.wsop_player_id IS NOT NULL THEN 'wsop_plus'
    ELSE 'gfx'
  END AS data_source,

  -- 최종 업데이트 시각
  COALESCE(m.updated_at, w.updated_at, g.created_at) AS last_updated
FROM manual.players_master m
FULL OUTER JOIN wsop_plus.official_players w
  ON LOWER(TRIM(m.name)) = LOWER(TRIM(w.name))
FULL OUTER JOIN (
  -- GFX에서 중복 제거된 플레이어 목록
  SELECT DISTINCT ON (LOWER(player_name))
    player_name,
    created_at
  FROM json.hand_players
  ORDER BY LOWER(player_name), created_at DESC
) g
  ON LOWER(TRIM(g.player_name)) = LOWER(TRIM(COALESCE(m.name, w.name)))
WHERE
  m.active IS NOT FALSE OR m.player_id IS NULL;

COMMENT ON VIEW public.unified_players IS
'통합 플레이어 뷰: Manual > WSOP+ > GFX 우선순위로 플레이어 정보 병합';


-- 1.2 unified_events: 이벤트 정보 통합
-- Purpose: 토너먼트 이벤트 정보를 통합하여 Main Dashboard에서 세션 선택 시 사용
CREATE OR REPLACE VIEW public.unified_events AS
SELECT
  -- 이벤트 식별자
  COALESCE(t.tournament_id::TEXT, g.session_id) AS event_id,

  -- 이벤트 기본 정보
  COALESCE(t.name, 'Session ' || g.session_id) AS event_name,
  COALESCE(t.event_code, '') AS event_code,

  -- 게임 타입
  COALESCE(g.game_type, 'tournament') AS game_type,

  -- 날짜/시간 정보
  COALESCE(t.start_date, g.created_at::DATE) AS start_date,
  g.created_at AS session_started_at,

  -- 토너먼트 전용 필드
  t.year,
  t.buy_in,
  t.status AS tournament_status,

  -- GFX 전용 필드
  g.table_num,
  g.json_file_path,

  -- 메타데이터
  CASE
    WHEN t.tournament_id IS NOT NULL THEN 'wsop_plus'
    ELSE 'gfx'
  END AS data_source,

  -- 최종 업데이트
  COALESCE(t.updated_at, g.updated_at) AS last_updated
FROM json.gfx_sessions g
FULL OUTER JOIN wsop_plus.tournaments t
  ON g.session_id = t.tournament_id::TEXT;

COMMENT ON VIEW public.unified_events IS
'통합 이벤트 뷰: 토너먼트/세션 정보를 WSOP+와 GFX에서 병합';


-- 1.3 unified_chip_data: WSOP+ > GFX 우선순위로 칩 데이터 통합
-- Purpose: 현재 칩 카운트 최신값 조회 (Manual 오버라이드 지원)
CREATE OR REPLACE VIEW public.unified_chip_data AS
SELECT
  -- 핸드 식별자
  h.hand_id,
  h.session_id,
  h.hand_num,

  -- 플레이어 정보
  hp.player_name,
  hp.seat,

  -- 칩 카운트 (우선순위: Manual Override > WSOP+ > GFX 기본값 0)
  COALESCE(
    m.chips_current,           -- Manual 오버라이드
    pi.current_chips,          -- WSOP+ 공식 데이터
    0                          -- GFX에는 칩 데이터 없음, 기본값 0
  ) AS chips,

  -- 칩 변화량 (이전 핸드 대비)
  COALESCE(
    m.chips_current - LAG(m.chips_current, 1) OVER (
      PARTITION BY hp.player_name, h.session_id
      ORDER BY h.hand_num
    ),
    0
  ) AS chips_change,

  -- 업데이트 시각
  COALESCE(
    m.chips_updated_at,
    pi.updated_at,
    h.created_at
  ) AS updated_at,

  -- 데이터 소스 추적
  CASE
    WHEN m.chips_current IS NOT NULL THEN 'manual'
    WHEN pi.current_chips IS NOT NULL THEN 'wsop_plus'
    ELSE 'gfx'
  END AS source
FROM json.hands h
JOIN json.hand_players hp ON h.hand_id = hp.hand_id
LEFT JOIN manual.chip_overrides m ON
  LOWER(TRIM(hp.player_name)) = LOWER(TRIM(m.player_name))
  AND h.session_id = m.session_id
  AND h.hand_num <= m.hand_num  -- 해당 핸드 이전까지의 오버라이드만 적용
LEFT JOIN wsop_plus.player_instances pi ON
  pi.tournament_id::TEXT = h.session_id
  AND LOWER(TRIM(pi.wsop_player_name)) = LOWER(TRIM(hp.player_name))
ORDER BY h.session_id, h.hand_num, hp.seat;

COMMENT ON VIEW public.unified_chip_data IS
'통합 칩 데이터 뷰: Manual > WSOP+ > GFX 우선순위로 칩 카운트 제공';


-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- RLS 활성화 전 모든 테이블에 대해 RLS 설정
-- Note: Supabase에서는 기본적으로 service_role이 RLS를 우회함

-- 2.1 json 스키마 RLS
ALTER TABLE json.gfx_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE json.hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE json.hand_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE json.hand_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE json.hand_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE json.hand_results ENABLE ROW LEVEL SECURITY;

-- anon: 읽기 전용
CREATE POLICY "anon_read_json_sessions"
  ON json.gfx_sessions
  FOR SELECT
  USING (TRUE);

CREATE POLICY "anon_read_json_hands"
  ON json.hands
  FOR SELECT
  USING (TRUE);

CREATE POLICY "anon_read_json_hand_players"
  ON json.hand_players
  FOR SELECT
  USING (TRUE);

CREATE POLICY "anon_read_json_hand_actions"
  ON json.hand_actions
  FOR SELECT
  USING (TRUE);

CREATE POLICY "anon_read_json_hand_cards"
  ON json.hand_cards
  FOR SELECT
  USING (TRUE);

CREATE POLICY "anon_read_json_hand_results"
  ON json.hand_results
  FOR SELECT
  USING (TRUE);

-- authenticated: SELECT + INSERT (업데이트 금지 - 원본 데이터 보존)
CREATE POLICY "authenticated_read_json_sessions"
  ON json.gfx_sessions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_insert_json_sessions"
  ON json.gfx_sessions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read_json_hands"
  ON json.hands
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_insert_json_hands"
  ON json.hands
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read_json_hand_players"
  ON json.hand_players
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_insert_json_hand_players"
  ON json.hand_players
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- 2.2 wsop_plus 스키마 RLS
ALTER TABLE wsop_plus.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wsop_plus.blind_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE wsop_plus.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wsop_plus.player_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE wsop_plus.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE wsop_plus.official_players ENABLE ROW LEVEL SECURITY;

-- anon: 읽기 전용
CREATE POLICY "anon_read_wsop_tournaments"
  ON wsop_plus.tournaments
  FOR SELECT
  USING (TRUE);

CREATE POLICY "anon_read_wsop_players"
  ON wsop_plus.official_players
  FOR SELECT
  USING (TRUE);

-- authenticated: SELECT + INSERT
CREATE POLICY "authenticated_read_wsop_tournaments"
  ON wsop_plus.tournaments
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_insert_wsop_tournaments"
  ON wsop_plus.tournaments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- 2.3 manual 스키마 RLS
ALTER TABLE manual.players_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual.player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual.commentators ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual.chip_overrides ENABLE ROW LEVEL SECURITY;

-- anon: 읽기만
CREATE POLICY "anon_read_manual_players"
  ON manual.players_master
  FOR SELECT
  USING (TRUE);

-- authenticated: 전체 CRUD
CREATE POLICY "authenticated_all_manual_players"
  ON manual.players_master
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_all_manual_profiles"
  ON manual.player_profiles
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_all_manual_chip_overrides"
  ON manual.chip_overrides
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 2.4 ae 스키마 RLS
ALTER TABLE ae.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ae.compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ae.comp_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ae.data_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ae.render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ae.render_outputs ENABLE ROW LEVEL SECURITY;

-- anon: 읽기 전용
CREATE POLICY "anon_read_ae_templates"
  ON ae.templates
  FOR SELECT
  USING (TRUE);

CREATE POLICY "anon_read_ae_compositions"
  ON ae.compositions
  FOR SELECT
  USING (TRUE);

CREATE POLICY "anon_read_ae_render_jobs"
  ON ae.render_jobs
  FOR SELECT
  USING (TRUE);

-- authenticated: SELECT + INSERT + UPDATE (DELETE 제한)
CREATE POLICY "authenticated_all_ae_render_jobs"
  ON ae.render_jobs
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_all_ae_data_mappings"
  ON ae.data_mappings
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 2.5 cuesheet 스키마 RLS
ALTER TABLE cuesheet.cuesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuesheet.cue_items ENABLE ROW LEVEL SECURITY;

-- anon: 읽기 전용
CREATE POLICY "anon_read_cuesheets"
  ON cuesheet.cuesheets
  FOR SELECT
  USING (TRUE);

CREATE POLICY "anon_read_cue_items"
  ON cuesheet.cue_items
  FOR SELECT
  USING (TRUE);

-- authenticated: 전체 CRUD
CREATE POLICY "authenticated_all_cuesheets"
  ON cuesheet.cuesheets
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_all_cue_items"
  ON cuesheet.cue_items
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ============================================================================
-- 3. PERFORMANCE INDEXES
-- ============================================================================

-- 3.1 json 스키마 인덱스 (고빈도 쿼리 최적화)

-- GFX 세션 시간순 조회
CREATE INDEX IF NOT EXISTS idx_gfx_sessions_created
  ON json.gfx_sessions(created_at DESC);

-- 핸드 조회 (session + hand_num 복합)
CREATE INDEX IF NOT EXISTS idx_hands_session_handnum
  ON json.hands(session_id, hand_num);

-- 핸드 시간순 조회
CREATE INDEX IF NOT EXISTS idx_hands_created
  ON json.hands(created_at DESC);

-- 플레이어 이름 검색 (대소문자 무시)
CREATE INDEX IF NOT EXISTS idx_hand_players_name_lower
  ON json.hand_players(LOWER(player_name));

-- 핸드별 플레이어 조회
CREATE INDEX IF NOT EXISTS idx_hand_players_hand
  ON json.hand_players(hand_id);

-- 액션 시퀀스 조회
CREATE INDEX IF NOT EXISTS idx_hand_actions_hand_actionnum
  ON json.hand_actions(hand_id, action_num);

-- 결과 조회
CREATE INDEX IF NOT EXISTS idx_hand_results_hand
  ON json.hand_results(hand_id);


-- 3.2 wsop_plus 스키마 인덱스

-- 토너먼트 연도별 조회
CREATE INDEX IF NOT EXISTS idx_tournaments_year
  ON wsop_plus.tournaments(year DESC);

-- 토너먼트 상태별 조회
CREATE INDEX IF NOT EXISTS idx_tournaments_status
  ON wsop_plus.tournaments(status);

-- 플레이어 참가 기록 조회
CREATE INDEX IF NOT EXISTS idx_player_instances_tournament
  ON wsop_plus.player_instances(tournament_id);

-- 플레이어 이름 검색
CREATE INDEX IF NOT EXISTS idx_official_players_name_lower
  ON wsop_plus.official_players(LOWER(name));

-- 블라인드 레벨 조회
CREATE INDEX IF NOT EXISTS idx_blind_levels_tournament_level
  ON wsop_plus.blind_levels(tournament_id, level);


-- 3.3 manual 스키마 인덱스

-- 활성 플레이어 조회
CREATE INDEX IF NOT EXISTS idx_players_master_active
  ON manual.players_master(active);

-- 플레이어 이름 검색
CREATE INDEX IF NOT EXISTS idx_players_master_name_lower
  ON manual.players_master(LOWER(name));

-- 칩 오버라이드 조회 (session + player)
CREATE INDEX IF NOT EXISTS idx_chip_overrides_session_player
  ON manual.chip_overrides(session_id, LOWER(player_name));


-- 3.4 ae 스키마 인덱스

-- 렌더 작업 상태별 조회 (Sub Dashboard 핵심 쿼리)
CREATE INDEX IF NOT EXISTS idx_render_jobs_status
  ON ae.render_jobs(status);

-- 렌더 작업 시간순 조회
CREATE INDEX IF NOT EXISTS idx_render_jobs_created
  ON ae.render_jobs(created_at DESC);

-- 핸드별 렌더 작업 조회
CREATE INDEX IF NOT EXISTS idx_render_jobs_hand
  ON ae.render_jobs(hand_id);

-- 컴포지션별 레이어 조회
CREATE INDEX IF NOT EXISTS idx_comp_layers_comp
  ON ae.comp_layers(comp_id);

-- 템플릿별 컴포지션 조회
CREATE INDEX IF NOT EXISTS idx_compositions_template
  ON ae.compositions(template_id);

-- 데이터 매핑 조회
CREATE INDEX IF NOT EXISTS idx_data_mappings_comp
  ON ae.data_mappings(comp_id);


-- 3.5 cuesheet 스키마 인덱스

-- 큐시트 날짜별 조회
CREATE INDEX IF NOT EXISTS idx_cuesheets_created
  ON cuesheet.cuesheets(created_at DESC);

-- 큐 아이템 순서별 조회
CREATE INDEX IF NOT EXISTS idx_cue_items_cuesheet_order
  ON cuesheet.cue_items(cuesheet_id, display_order);

-- 핸드별 큐 아이템 조회
CREATE INDEX IF NOT EXISTS idx_cue_items_hand
  ON cuesheet.cue_items(hand_id);


-- ============================================================================
-- 4. REALTIME SUBSCRIPTION SETUP
-- ============================================================================

-- Supabase Realtime을 위한 REPLICA IDENTITY 설정
ALTER TABLE json.hands REPLICA IDENTITY FULL;
ALTER TABLE json.hand_players REPLICA IDENTITY FULL;
ALTER TABLE ae.render_jobs REPLICA IDENTITY FULL;
ALTER TABLE cuesheet.cue_items REPLICA IDENTITY FULL;


-- ============================================================================
-- 5. TRIGGER FUNCTIONS (Unified Views 변경 알림)
-- ============================================================================

-- unified_players 변경 알림 트리거
CREATE OR REPLACE FUNCTION notify_unified_players_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'unified_players_change',
    json_build_object(
      'action', TG_OP,
      'player_id', COALESCE(NEW.player_id, OLD.player_id),
      'data', row_to_json(NEW)
    )::TEXT
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_unified_players_manual
  AFTER INSERT OR UPDATE OR DELETE ON manual.players_master
  FOR EACH ROW
  EXECUTE FUNCTION notify_unified_players_change();

CREATE TRIGGER tr_unified_players_wsop
  AFTER INSERT OR UPDATE OR DELETE ON wsop_plus.official_players
  FOR EACH ROW
  EXECUTE FUNCTION notify_unified_players_change();


-- unified_chip_data 변경 알림 트리거
CREATE OR REPLACE FUNCTION notify_unified_chip_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'unified_chip_change',
    json_build_object(
      'action', TG_OP,
      'session_id', NEW.session_id,
      'player_name', NEW.player_name,
      'data', row_to_json(NEW)
    )::TEXT
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_unified_chip_manual
  AFTER INSERT OR UPDATE OR DELETE ON manual.chip_overrides
  FOR EACH ROW
  EXECUTE FUNCTION notify_unified_chip_change();

CREATE TRIGGER tr_unified_chip_wsop
  AFTER INSERT OR UPDATE ON wsop_plus.player_instances
  FOR EACH ROW
  EXECUTE FUNCTION notify_unified_chip_change();


-- ============================================================================
-- 6. MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- 뷰 생성 확인
-- SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'unified_%';

-- 인덱스 생성 확인
-- SELECT schemaname, tablename, indexname FROM pg_indexes WHERE indexname LIKE 'idx_%' ORDER BY schemaname, tablename;

-- RLS 정책 확인
-- SELECT schemaname, tablename, policyname FROM pg_policies ORDER BY schemaname, tablename;

-- Migration 003 완료
