import type { SchemaNodeData, EndpointNodeData, LayerType } from '@/types/nodes'

/**
 * 프로젝트별 상세 정보 (드릴다운용)
 * 참조: docs/GFX_PIPELINE_ARCHITECTURE.md, docs/UNIFIED_DB_STRUCTURE.md
 */

export interface ProjectDetailData {
  layerType: LayerType
  schemas?: SchemaNodeData[]
  endpoints?: EndpointNodeData[]
}

export const projectDetails: Record<string, ProjectDetailData> = {
  gfx_simulator: {
    layerType: 'input',
    schemas: [
      {
        schemaName: 'json',
        displayName: 'GFX JSON',
        description: 'GFX 핸드 데이터 JSON 스키마',
        tableCount: 3,
        tables: [
          { name: 'hands', description: '핸드 데이터' },
          { name: 'board_cards', description: '보드 카드' },
          { name: 'player_actions', description: '플레이어 액션' },
        ],
        moduleId: 'gfx_simulator',
      },
    ],
    endpoints: [
      {
        path: '/api/generate',
        method: 'POST',
        description: 'GFX 핸드 생성',
        serviceId: 'gfx_simulator',
      },
    ],
  },

  nas_sync: {
    layerType: 'storage',
    schemas: [
      {
        schemaName: 'json',
        displayName: 'GFX JSON (NAS)',
        description: 'NAS에서 동기화된 JSON 데이터',
        tableCount: 5,
        tables: [
          { name: 'sync_status', description: '동기화 상태' },
          { name: 'file_registry', description: '파일 레지스트리' },
          { name: 'hands', description: '핸드 데이터' },
          { name: 'metadata', description: '메타데이터' },
          { name: 'sync_logs', description: '동기화 로그' },
        ],
        moduleId: 'nas_sync',
      },
    ],
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        description: 'Health Check',
        serviceId: 'nas_sync',
      },
      {
        path: '/ready',
        method: 'GET',
        description: 'Readiness Check',
        serviceId: 'nas_sync',
      },
      {
        path: '/stats',
        method: 'GET',
        description: '동기화 통계',
        serviceId: 'nas_sync',
      },
    ],
  },

  supabase_db: {
    layerType: 'orchestration',
    schemas: [
      {
        schemaName: 'json',
        displayName: 'JSON Schema',
        description: 'pokerGFX RFID 데이터 (6개 테이블)',
        tableCount: 6,
        tables: [
          { name: 'gfx_sessions', description: '게임 세션' },
          { name: 'hands', description: '핸드 레코드' },
          { name: 'hand_players', description: '핸드 참가자' },
          { name: 'hand_actions', description: '액션 이력' },
          { name: 'hand_cards', description: '카드 정보' },
          { name: 'hand_results', description: '결과' },
        ],
        moduleId: 'supabase_db',
      },
      {
        schemaName: 'wsop_plus',
        displayName: 'WSOP+ Schema',
        description: 'WSOP+ CSV 데이터 (5개 테이블)',
        tableCount: 5,
        tables: [
          { name: 'tournaments', description: '대회 정보' },
          { name: 'blind_levels', description: '블라인드 구조' },
          { name: 'payouts', description: '페이아웃' },
          { name: 'player_instances', description: '선수 인스턴스' },
          { name: 'schedules', description: '스케줄' },
        ],
        moduleId: 'supabase_db',
      },
      {
        schemaName: 'manual',
        displayName: 'Manual Schema',
        description: '수동 입력 데이터 (7개 테이블)',
        tableCount: 7,
        tables: [
          { name: 'players_master', description: '선수 마스터' },
          { name: 'player_profiles', description: '선수 프로필' },
          { name: 'commentators', description: '코멘테이터' },
          { name: 'venues', description: '경기장' },
          { name: 'events', description: '이벤트' },
          { name: 'feature_tables', description: '특별 테이블' },
          { name: 'seating_assignments', description: '좌석 배치' },
        ],
        moduleId: 'supabase_db',
      },
      {
        schemaName: 'ae',
        displayName: 'AE Schema',
        description: 'After Effects 렌더링 (7개 테이블)',
        tableCount: 7,
        tables: [
          { name: 'templates', description: 'AEP 프로젝트 메타' },
          { name: 'compositions', description: '58개 콤포지션' },
          { name: 'composition_layers', description: '1,397개 텍스트 레이어' },
          { name: 'layer_data_mappings', description: '동적 레이어 바인딩' },
          { name: 'data_types', description: '데이터 타입' },
          { name: 'render_jobs', description: 'Nexrender 큐' },
          { name: 'render_outputs', description: '렌더링 결과' },
        ],
        moduleId: 'supabase_db',
      },
      {
        schemaName: 'public',
        displayName: 'Public Schema',
        description: '통합 Views (3개)',
        tableCount: 3,
        tables: [
          { name: 'v_feature_table_leaderboard', description: '리더보드 뷰' },
          { name: 'v_unified_players', description: '통합 플레이어 뷰' },
          { name: 'v_unified_hands', description: '통합 핸드 뷰' },
        ],
        moduleId: 'supabase_db',
      },
      {
        schemaName: 'config',
        displayName: 'Config Schema',
        description: '시스템 설정',
        tableCount: 2,
        tables: [
          { name: 'system_config', description: '시스템 설정' },
          { name: 'feature_flags', description: '기능 플래그' },
        ],
        moduleId: 'supabase_db',
      },
    ],
    endpoints: [
      {
        path: '/rest/v1/*',
        method: 'GET',
        description: 'Supabase REST API',
        serviceId: 'supabase_db',
      },
      {
        path: '/realtime/v1/*',
        method: 'GET',
        description: 'Realtime WebSocket',
        serviceId: 'supabase_db',
      },
    ],
  },

  main_dashboard: {
    layerType: 'dashboard',
    endpoints: [
      {
        path: '/',
        method: 'GET',
        description: 'Main Dashboard UI',
        serviceId: 'main_dashboard',
      },
      {
        path: '/api/cuesheet',
        method: 'GET',
        description: 'Cuesheet API',
        serviceId: 'main_dashboard',
      },
    ],
  },

  sub_dashboard: {
    layerType: 'dashboard',
    schemas: [
      {
        schemaName: 'ae',
        displayName: 'AE Render Schema',
        description: 'AE 렌더링 작업 스키마',
        tableCount: 4,
        tables: [
          { name: 'render_jobs', description: '렌더 작업' },
          { name: 'render_outputs', description: '렌더 출력' },
          { name: 'templates', description: '템플릿' },
          { name: 'job_logs', description: '작업 로그' },
        ],
        moduleId: 'sub_dashboard',
      },
    ],
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        description: 'Health Check',
        serviceId: 'sub_dashboard',
      },
      {
        path: '/health/ready',
        method: 'GET',
        description: 'Readiness Check (DB, Redis)',
        serviceId: 'sub_dashboard',
      },
      {
        path: '/api/v1/renders',
        method: 'POST',
        description: '렌더 작업 생성',
        serviceId: 'sub_dashboard',
      },
      {
        path: '/api/v1/renders/{id}',
        method: 'GET',
        description: '렌더 작업 조회',
        serviceId: 'sub_dashboard',
      },
    ],
  },

  ae_nexrender: {
    layerType: 'output',
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        description: 'Worker Health Check',
        serviceId: 'ae_nexrender',
      },
      {
        path: '/api/jobs',
        method: 'GET',
        description: 'Job 목록 조회',
        serviceId: 'ae_nexrender',
      },
      {
        path: '/api/jobs',
        method: 'POST',
        description: 'Job 생성',
        serviceId: 'ae_nexrender',
      },
    ],
  },
}

/**
 * 전체 스키마 수 계산
 */
export function getTotalSchemaCount(): number {
  return Object.values(projectDetails).reduce((sum, detail) => {
    return sum + (detail.schemas?.length ?? 0)
  }, 0)
}

/**
 * 전체 테이블 수 계산
 */
export function getTotalTableCount(): number {
  return Object.values(projectDetails).reduce((sum, detail) => {
    return sum + (detail.schemas?.reduce((s, schema) => s + schema.tableCount, 0) ?? 0)
  }, 0)
}

/**
 * 전체 엔드포인트 수 계산
 */
export function getTotalEndpointCount(): number {
  return Object.values(projectDetails).reduce((sum, detail) => {
    return sum + (detail.endpoints?.length ?? 0)
  }, 0)
}
