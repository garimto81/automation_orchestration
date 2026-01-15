# Database Migration Guide

Supabase PostgreSQL 데이터베이스 마이그레이션 적용 가이드

---

## 마이그레이션 파일 목록

| 파일 | 내용 | 테이블/뷰 개수 |
|------|------|----------------|
| `001_json_wsop_schema.sql` | json + wsop_plus 스키마 (12 테이블) | 12 |
| `002_manual_ae_cuesheet.sql` | manual + ae + cuesheet (16 테이블 + 4 뷰) | 20 |
| `003_unified_views_rls_indexes.sql` | 통합 뷰 + RLS + 인덱스 | 3 뷰 + 28 정책 + 28 인덱스 |

**전체**: 28개 테이블 + 7개 뷰 + 28개 RLS 정책 + 28개 인덱스

---

## 적용 순서

### 1단계: Supabase 프로젝트 준비

```bash
# Supabase CLI 설치 (Windows)
scoop install supabase

# 프로젝트 초기화
supabase init

# .env 파일 설정
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_KEY=your-service-role-key
```

### 2단계: 로컬 개발 환경

```bash
# 로컬 Supabase 시작
supabase start

# 데이터베이스 접속 확인
supabase db reset
```

### 3단계: 마이그레이션 적용

#### 방법 1: Supabase CLI (권장)

```bash
# 마이그레이션 파일 복사
cp migrations/*.sql supabase/migrations/

# 마이그레이션 적용
supabase db push

# 검증
supabase db diff
```

#### 방법 2: SQL Editor (Supabase Dashboard)

1. Supabase Dashboard 접속: https://app.supabase.com/
2. 프로젝트 선택
3. SQL Editor 탭 이동
4. 마이그레이션 파일 순서대로 실행:
   - `001_json_wsop_schema.sql`
   - `002_manual_ae_cuesheet.sql`
   - `003_unified_views_rls_indexes.sql`

#### 방법 3: psql (직접 연결)

```bash
# psql 연결 정보 가져오기
supabase db url

# 마이그레이션 실행
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f migrations/001_json_wsop_schema.sql
psql "postgresql://..." -f migrations/002_manual_ae_cuesheet.sql
psql "postgresql://..." -f migrations/003_unified_views_rls_indexes.sql
```

### 4단계: 검증

```bash
# 검증 스크립트 실행
psql "postgresql://..." -f migrations/verify_003.sql

# 기대 결과:
# - 통합 뷰: 3개
# - 인덱스: 28개
# - RLS 정책: 28개
# - 알림 트리거: 4개
```

---

## 마이그레이션별 상세 내용

### Migration 001: json + wsop_plus 스키마

**테이블 (12개)**:

| 스키마 | 테이블 | 목적 |
|--------|--------|------|
| json | gfx_sessions | GFX 세션 메타데이터 |
| json | hands | 핸드 기본 정보 |
| json | hand_players | 플레이어별 핸드 데이터 |
| json | hand_actions | 액션 시퀀스 |
| json | hand_cards | 카드 이력 |
| json | hand_results | 결과 및 상금 |
| wsop_plus | tournaments | 토너먼트 마스터 |
| wsop_plus | blind_levels | 블라인드 구조 |
| wsop_plus | payouts | 상금표 |
| wsop_plus | player_instances | 선수별 참가 기록 |
| wsop_plus | schedules | 경기 일정 |
| wsop_plus | official_players | WSOP 공식 선수 마스터 |

### Migration 002: manual + ae + cuesheet 스키마

**테이블 (16개) + 뷰 (4개)**:

| 스키마 | 테이블/뷰 | 목적 |
|--------|-----------|------|
| manual | players_master | 선수 기본 정보 |
| manual | player_profiles | 선수 프로필 상세 |
| manual | commentators | 중계자 정보 |
| manual | venues | 개최지 정보 |
| manual | chip_overrides | 칩 카운트 오버라이드 |
| ae | templates | AE 템플릿 메타데이터 |
| ae | compositions | 컴포지션 정의 |
| ae | comp_layers | 레이어별 매핑 |
| ae | data_mappings | 필드-데이터 연결 |
| ae | render_jobs | 렌더링 작업 |
| ae | render_outputs | 렌더링 결과 |
| cuesheet | cuesheets | 큐시트 마스터 |
| cuesheet | cue_items | 큐 아이템 |
| cuesheet | v_cuesheet_detail | 큐시트 상세 뷰 |
| cuesheet | v_cue_item_data | 큐 아이템 데이터 뷰 |

### Migration 003: 통합 뷰 + RLS + 인덱스

**통합 뷰 (3개)**:

| 뷰 이름 | 우선순위 | 목적 |
|---------|---------|------|
| unified_players | Manual > WSOP+ > GFX | 플레이어 정보 통합 |
| unified_events | WSOP+ > GFX | 이벤트/세션 정보 통합 |
| unified_chip_data | Manual > WSOP+ > Default | 칩 카운트 통합 |

**RLS 정책 (28개)**:

| 역할 | 권한 | 테이블 개수 |
|------|------|-------------|
| anon | SELECT | 18 |
| authenticated | SELECT + INSERT | 6 |
| authenticated | ALL | 10 |
| service_role | ALL (RLS 우회) | 전체 |

**인덱스 (28개)**:

| 카테고리 | 인덱스 개수 | 예시 |
|----------|-------------|------|
| 시간 기반 조회 | 4 | idx_hands_created |
| 복합 인덱스 | 9 | idx_hands_session_handnum |
| 대소문자 무시 검색 | 3 | idx_hand_players_name_lower |
| 외래키 조회 | 8 | idx_hand_players_hand |
| 상태 필터링 | 4 | idx_render_jobs_status |

---

## 롤백 절차

### 전체 롤백

```bash
# 로컬 환경 초기화
supabase db reset

# 또는 수동 삭제
DROP SCHEMA json CASCADE;
DROP SCHEMA wsop_plus CASCADE;
DROP SCHEMA manual CASCADE;
DROP SCHEMA ae CASCADE;
DROP SCHEMA cuesheet CASCADE;
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

### 개별 마이그레이션 롤백

```sql
-- Migration 003 롤백
DROP VIEW IF EXISTS public.unified_players CASCADE;
DROP VIEW IF EXISTS public.unified_events CASCADE;
DROP VIEW IF EXISTS public.unified_chip_data CASCADE;

DROP TRIGGER IF EXISTS tr_unified_players_manual ON manual.players_master;
DROP TRIGGER IF EXISTS tr_unified_players_wsop ON wsop_plus.official_players;
DROP TRIGGER IF EXISTS tr_unified_chip_manual ON manual.chip_overrides;
DROP TRIGGER IF EXISTS tr_unified_chip_wsop ON wsop_plus.player_instances;

DROP FUNCTION IF EXISTS notify_unified_players_change();
DROP FUNCTION IF EXISTS notify_unified_chip_change();

-- 인덱스는 CASCADE로 자동 삭제됨
```

---

## 프로덕션 적용 체크리스트

### 사전 준비

- [ ] 백업 생성
  ```bash
  supabase db dump > backup_$(date +%Y%m%d).sql
  ```

- [ ] 로컬 환경에서 마이그레이션 테스트 완료
- [ ] 검증 스크립트 실행 확인 (`verify_003.sql`)
- [ ] 팀원 리뷰 완료

### 적용 중

- [ ] 점검 시간 공지 (서비스 중단 필요 시)
- [ ] 마이그레이션 순서대로 실행
  1. `001_json_wsop_schema.sql`
  2. `002_manual_ae_cuesheet.sql`
  3. `003_unified_views_rls_indexes.sql`

- [ ] 각 마이그레이션 후 검증
  ```sql
  -- 테이블 개수 확인
  SELECT COUNT(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema');
  ```

### 적용 후

- [ ] 검증 스크립트 전체 실행
- [ ] 샘플 데이터 삽입 테스트
- [ ] 통합 뷰 조회 테스트
- [ ] RLS 정책 동작 확인
- [ ] 인덱스 사용 확인 (EXPLAIN ANALYZE)
- [ ] Realtime 구독 테스트
- [ ] 모니터링 설정

---

## 샘플 데이터 삽입

### GFX 세션 및 핸드

```sql
-- 세션 생성
INSERT INTO json.gfx_sessions (session_id, game_type, table_num, json_file_path)
VALUES ('session-001', 'tournament', 1, '/nas/gfx/session-001.json');

-- 핸드 생성
INSERT INTO json.hands (hand_id, session_id, hand_num, board_cards, pot)
VALUES ('hand-001', 'session-001', 1, ARRAY['As', 'Kd', 'Qh', 'Jc', '10s'], 15000);

-- 플레이어 추가
INSERT INTO json.hand_players (hand_id, player_name, seat, cards)
VALUES
  ('hand-001', 'Phil Ivey', 1, ARRAY['Ah', 'Kh']),
  ('hand-001', 'Daniel Negreanu', 2, ARRAY['Qc', 'Qs']);
```

### WSOP+ 토너먼트

```sql
INSERT INTO wsop_plus.tournaments (tournament_id, event_code, year, name, buy_in)
VALUES (1, 'EVENT-001', 2025, 'Main Event', 10000);

INSERT INTO wsop_plus.official_players (wsop_player_id, name, country)
VALUES
  (1, 'Phil Ivey', 'USA'),
  (2, 'Daniel Negreanu', 'Canada');
```

### Manual 오버라이드

```sql
INSERT INTO manual.players_master (player_id, name, nickname, photo_url)
VALUES ('phil-ivey', 'Phil Ivey', 'Tiger Woods of Poker', 'https://example.com/phil.jpg');

INSERT INTO manual.chip_overrides (session_id, player_name, hand_num, chips_current)
VALUES ('session-001', 'Phil Ivey', 1, 50000);
```

### AE 템플릿 및 렌더 작업

```sql
INSERT INTO ae.templates (template_id, name, version, aep_file_path)
VALUES ('template-001', 'Hand Results', '1.0.0', '/templates/hand_results.aep');

INSERT INTO ae.render_jobs (job_id, hand_id, template_id, composition, status)
VALUES ('job-001', 'hand-001', 'template-001', 'Comp_HandResults', 'pending');
```

---

## 통합 뷰 사용 예시

### unified_players 조회

```sql
-- 모든 플레이어 조회 (데이터 소스 표시)
SELECT
  player_id,
  name,
  nickname,
  country,
  data_source,
  last_updated
FROM public.unified_players
ORDER BY last_updated DESC;

-- Manual 입력된 플레이어만
SELECT * FROM public.unified_players
WHERE data_source = 'manual';

-- 이름 검색 (대소문자 무시)
SELECT * FROM public.unified_players
WHERE LOWER(name) LIKE '%phil%';
```

### unified_events 조회

```sql
-- 최근 이벤트 조회
SELECT
  event_id,
  event_name,
  game_type,
  start_date,
  data_source
FROM public.unified_events
ORDER BY start_date DESC
LIMIT 10;
```

### unified_chip_data 조회

```sql
-- 세션별 최신 칩 카운트
SELECT
  session_id,
  hand_num,
  player_name,
  chips,
  chips_change,
  source
FROM public.unified_chip_data
WHERE session_id = 'session-001'
ORDER BY hand_num DESC, seat;

-- 칩 리더 Top 5
SELECT
  player_name,
  chips,
  source
FROM public.unified_chip_data
WHERE session_id = 'session-001'
  AND hand_num = (SELECT MAX(hand_num) FROM json.hands WHERE session_id = 'session-001')
ORDER BY chips DESC
LIMIT 5;
```

---

## 성능 모니터링

### 인덱스 사용률 확인

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS times_used,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC
LIMIT 20;
```

### 느린 쿼리 분석

```sql
-- pg_stat_statements 확장 필요
SELECT
  queryid,
  LEFT(query, 100) AS short_query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### 테이블 크기 모니터링

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname IN ('json', 'wsop_plus', 'manual', 'ae', 'cuesheet')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 트러블슈팅

### 권한 오류

```sql
-- 스키마 권한 부여
GRANT USAGE ON SCHEMA json, wsop_plus, manual, ae, cuesheet TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA json, wsop_plus, manual, ae, cuesheet TO authenticated;

-- 뷰 권한 부여
GRANT SELECT ON public.unified_players TO authenticated;
GRANT SELECT ON public.unified_events TO authenticated;
GRANT SELECT ON public.unified_chip_data TO authenticated;
```

### RLS 정책 디버깅

```sql
-- 현재 역할 확인
SELECT current_user, current_role;

-- RLS 비활성화 (테스트 목적만)
ALTER TABLE json.gfx_sessions DISABLE ROW LEVEL SECURITY;

-- 다시 활성화
ALTER TABLE json.gfx_sessions ENABLE ROW LEVEL SECURITY;
```

### 인덱스 재생성

```sql
-- 특정 인덱스 재생성
REINDEX INDEX idx_hands_session_handnum;

-- 테이블 전체 인덱스 재생성
REINDEX TABLE json.hands;

-- 스키마 전체 인덱스 재생성
REINDEX SCHEMA json;
```

---

## 참고 문서

- [MODULE_3_5_DESIGN.md](MODULE_3_5_DESIGN.md) - 상세 설계
- [GFX_PIPELINE_ARCHITECTURE.md](GFX_PIPELINE_ARCHITECTURE.md) - 파이프라인 아키텍처
- [Supabase Documentation](https://supabase.com/docs) - 공식 문서
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) - Row Level Security

---

## 문의

- 아키텍처 질문: MODULE_3_5_DESIGN.md 참조
- 마이그레이션 이슈: GitHub Issues
- 긴급 지원: Slack #database-team
