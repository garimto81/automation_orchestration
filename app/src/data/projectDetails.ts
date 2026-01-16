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
        schemaName: 'wsop_plus',
        displayName: 'WSOP+ Schema',
        description: 'WSOP+ 프로덕션 데이터',
        tableCount: 8,
        tables: [
          { name: 'tournaments', description: '토너먼트' },
          { name: 'events', description: '이벤트' },
          { name: 'players', description: '플레이어' },
          { name: 'hands', description: '핸드' },
          { name: 'chips', description: '칩 정보' },
          { name: 'actions', description: '액션' },
          { name: 'boards', description: '보드' },
          { name: 'results', description: '결과' },
        ],
        moduleId: 'supabase_db',
      },
      {
        schemaName: 'manual',
        displayName: 'Manual Schema',
        description: '수동 입력 데이터',
        tableCount: 4,
        tables: [
          { name: 'manual_hands', description: '수동 핸드' },
          { name: 'manual_players', description: '수동 플레이어' },
          { name: 'manual_actions', description: '수동 액션' },
          { name: 'manual_boards', description: '수동 보드' },
        ],
        moduleId: 'supabase_db',
      },
      {
        schemaName: 'unified',
        displayName: 'Unified Schema',
        description: '통합 데이터 스키마',
        tableCount: 6,
        tables: [
          { name: 'unified_hands', description: '통합 핸드' },
          { name: 'unified_players', description: '통합 플레이어' },
          { name: 'unified_template_styles', description: '템플릿 스타일' },
          { name: 'unified_render_jobs', description: '렌더 작업' },
          { name: 'unified_outputs', description: '출력물' },
          { name: 'unified_events', description: '통합 이벤트' },
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
