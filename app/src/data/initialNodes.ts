import type { ProjectNode } from '@/types'
import { projects } from './projects'

// GFX Pipeline Layout - 6개 노드 (NAS-Supabase Sync 제거됨)
export const initialNodes: ProjectNode[] = [
  // Row 1: Data Input Pipeline (상단) - 3개 노드
  {
    id: 'gfx_simulator',
    type: 'project',
    position: { x: 50, y: 50 },
    data: { ...projects.find(p => p.id === 'gfx_simulator')!, isSelected: false },
  },
  {
    id: 'nas_sync',
    type: 'project',
    position: { x: 330, y: 50 },
    data: { ...projects.find(p => p.id === 'nas_sync')!, isSelected: false },
  },
  {
    id: 'supabase_db',
    type: 'project',
    position: { x: 610, y: 50 },
    data: { ...projects.find(p => p.id === 'supabase_db')!, isSelected: false },
  },
  // Row 2: Output Pipeline (하단) - 3개 노드
  {
    id: 'main_dashboard',
    type: 'project',
    position: { x: 610, y: 250 },
    data: { ...projects.find(p => p.id === 'main_dashboard')!, isSelected: false },
  },
  {
    id: 'sub_dashboard',
    type: 'project',
    position: { x: 330, y: 250 },
    data: { ...projects.find(p => p.id === 'sub_dashboard')!, isSelected: false },
  },
  {
    id: 'ae_nexrender',
    type: 'project',
    position: { x: 50, y: 250 },
    data: { ...projects.find(p => p.id === 'ae_nexrender')!, isSelected: false },
  },
]
