import type { ProjectNode } from '@/types'
import { projects } from './projects'

// GFX Pipeline Layout - 파이프라인 흐름 형태
export const initialNodes: ProjectNode[] = [
  // Row 1: Data Input Pipeline (상단)
  {
    id: 'gfx_simulator',
    type: 'project',
    position: { x: 50, y: 50 },
    data: { ...projects.find(p => p.id === 'gfx_simulator')!, isSelected: false },
  },
  {
    id: 'nas_sync',
    type: 'project',
    position: { x: 280, y: 50 },
    data: { ...projects.find(p => p.id === 'nas_sync')!, isSelected: false },
  },
  {
    id: 'nas_supabase_sync',
    type: 'project',
    position: { x: 510, y: 50 },
    data: { ...projects.find(p => p.id === 'nas_supabase_sync')!, isSelected: false },
  },
  {
    id: 'supabase_db',
    type: 'project',
    position: { x: 740, y: 50 },
    data: { ...projects.find(p => p.id === 'supabase_db')!, isSelected: true },
  },
  // Row 2: Output Pipeline (하단) - 역방향
  {
    id: 'main_dashboard',
    type: 'project',
    position: { x: 740, y: 250 },
    data: { ...projects.find(p => p.id === 'main_dashboard')!, isSelected: false },
  },
  {
    id: 'sub_dashboard',
    type: 'project',
    position: { x: 450, y: 250 },
    data: { ...projects.find(p => p.id === 'sub_dashboard')!, isSelected: false },
  },
  {
    id: 'ae_nexrender',
    type: 'project',
    position: { x: 160, y: 250 },
    data: { ...projects.find(p => p.id === 'ae_nexrender')!, isSelected: false },
  },
]
