-- Migration 003 검증 스크립트
-- Purpose: 통합 뷰, RLS 정책, 인덱스 생성 확인

-- ============================================================================
-- 1. VIEW 생성 확인
-- ============================================================================
SELECT
  viewname,
  schemaname,
  viewowner,
  definition IS NOT NULL AS has_definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE 'unified_%'
ORDER BY viewname;

-- Expected: 3 rows (unified_players, unified_events, unified_chip_data)


-- ============================================================================
-- 2. INDEX 생성 확인
-- ============================================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY schemaname, tablename, indexname;

-- Expected: 28 indexes


-- ============================================================================
-- 3. RLS POLICY 확인
-- ============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL AS has_using,
  with_check IS NOT NULL AS has_with_check
FROM pg_policies
ORDER BY schemaname, tablename, policyname;

-- Expected: 28 policies


-- ============================================================================
-- 4. REPLICA IDENTITY 확인
-- ============================================================================
SELECT
  schemaname,
  tablename,
  CASE relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'i' THEN 'index'
    WHEN 'f' THEN 'full'
  END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname IN ('json', 'ae', 'cuesheet')
  AND c.relkind = 'r'
  AND c.relname IN ('hands', 'hand_players', 'render_jobs', 'cue_items');

-- Expected: 4 rows with replica_identity = 'full'


-- ============================================================================
-- 5. TRIGGER 확인
-- ============================================================================
SELECT
  trigger_schema,
  event_object_table,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'tr_unified_%'
ORDER BY trigger_schema, event_object_table;

-- Expected: 4 triggers


-- ============================================================================
-- 6. 통합 뷰 데이터 샘플 조회
-- ============================================================================

-- unified_players 샘플
SELECT
  player_id,
  name,
  nickname,
  country,
  data_source,
  last_updated
FROM public.unified_players
LIMIT 5;

-- unified_events 샘플
SELECT
  event_id,
  event_name,
  game_type,
  start_date,
  data_source
FROM public.unified_events
LIMIT 5;

-- unified_chip_data 샘플 (세션별 최신 5개 핸드)
SELECT
  session_id,
  hand_num,
  player_name,
  chips,
  chips_change,
  source
FROM public.unified_chip_data
ORDER BY session_id, hand_num DESC
LIMIT 10;


-- ============================================================================
-- 7. 인덱스 사용 확인 (EXPLAIN ANALYZE)
-- ============================================================================

-- 플레이어 이름 검색 (LOWER 인덱스 사용 확인)
EXPLAIN ANALYZE
SELECT * FROM public.unified_players
WHERE LOWER(name) LIKE '%phil%';

-- 세션별 핸드 목록 (복합 인덱스 사용 확인)
EXPLAIN ANALYZE
SELECT * FROM json.hands
WHERE session_id = 'test-session'
ORDER BY hand_num;

-- 렌더 작업 상태 필터링 (status 인덱스 사용 확인)
EXPLAIN ANALYZE
SELECT * FROM ae.render_jobs
WHERE status = 'pending'
ORDER BY created_at DESC;


-- ============================================================================
-- 8. RLS 정책 테스트
-- ============================================================================

-- anon 역할로 읽기 테스트 (성공해야 함)
SET ROLE anon;
SELECT COUNT(*) FROM json.gfx_sessions;
SELECT COUNT(*) FROM public.unified_players;

-- anon 역할로 쓰기 테스트 (실패해야 함)
-- INSERT INTO manual.players_master (player_id, name) VALUES ('test', 'Test Player');
-- Expected: ERROR: new row violates row-level security policy

RESET ROLE;


-- ============================================================================
-- 9. 성능 통계
-- ============================================================================

-- 인덱스 크기 확인
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- 테이블별 인덱스 개수
SELECT
  schemaname,
  tablename,
  COUNT(*) AS index_count
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
GROUP BY schemaname, tablename
ORDER BY index_count DESC;


-- ============================================================================
-- 10. 요약 리포트
-- ============================================================================

SELECT
  '통합 뷰' AS category,
  COUNT(*) AS count
FROM pg_views
WHERE schemaname = 'public' AND viewname LIKE 'unified_%'

UNION ALL

SELECT
  '인덱스' AS category,
  COUNT(*) AS count
FROM pg_indexes
WHERE indexname LIKE 'idx_%'

UNION ALL

SELECT
  'RLS 정책' AS category,
  COUNT(*) AS count
FROM pg_policies

UNION ALL

SELECT
  '알림 트리거' AS category,
  COUNT(*) AS count
FROM information_schema.triggers
WHERE trigger_name LIKE 'tr_unified_%';

-- Expected:
-- 통합 뷰: 3
-- 인덱스: 28
-- RLS 정책: 28
-- 알림 트리거: 4
