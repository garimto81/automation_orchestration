import type { AppEdge } from '@/types'

// GFX Pipeline Flow - 순차적 데이터 흐름
export const initialEdges: AppEdge[] = [
  // Row 1: Input Pipeline (좌 → 우)
  {
    id: 'gfx_simulator-nas_sync',
    source: 'gfx_simulator',
    target: 'nas_sync',
    type: 'default',
    animated: true,
    style: { stroke: '#000', strokeWidth: 2 },
    label: 'JSON',
  },
  {
    id: 'nas_sync-nas_supabase_sync',
    source: 'nas_sync',
    target: 'nas_supabase_sync',
    type: 'default',
    animated: true,
    style: { stroke: '#000', strokeWidth: 2 },
    label: 'File Watch',
  },
  {
    id: 'nas_supabase_sync-supabase_db',
    source: 'nas_supabase_sync',
    target: 'supabase_db',
    type: 'default',
    animated: true,
    style: { stroke: '#000', strokeWidth: 2 },
    label: 'REST API',
  },
  // Vertical: Supabase → Main Dashboard
  {
    id: 'supabase_db-main_dashboard',
    source: 'supabase_db',
    target: 'main_dashboard',
    type: 'default',
    animated: true,
    style: { stroke: '#000', strokeWidth: 2 },
    label: 'Realtime',
  },
  // Row 2: Output Pipeline (우 → 좌)
  {
    id: 'main_dashboard-sub_dashboard',
    source: 'main_dashboard',
    target: 'sub_dashboard',
    type: 'default',
    animated: true,
    style: { stroke: '#000', strokeWidth: 2 },
    label: 'WebSocket',
  },
  {
    id: 'sub_dashboard-ae_nexrender',
    source: 'sub_dashboard',
    target: 'ae_nexrender',
    type: 'default',
    animated: true,
    style: { stroke: '#000', strokeWidth: 2 },
    label: 'Render Job',
  },
]
