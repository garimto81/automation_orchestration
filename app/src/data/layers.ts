import type { Node } from '@xyflow/react'
import type { LayerNodeData, LayerType } from '@/types/nodes'

/**
 * 5계층 아키텍처 Layer 정의
 * 참조: docs/GFX_PIPELINE_ARCHITECTURE.md
 */
export interface LayerDefinition {
  type: LayerType
  label: string
  description: string
  color: string
  moduleIds: string[]
}

export const layerDefinitions: LayerDefinition[] = [
  {
    type: 'input',
    label: 'INPUT',
    description: 'GFX 데이터 생성 및 수집',
    color: '#3B82F6', // Blue
    moduleIds: ['gfx_simulator'],
  },
  {
    type: 'storage',
    label: 'STORAGE',
    description: 'NAS/DB 데이터 저장',
    color: '#8B5CF6', // Purple
    moduleIds: ['nas_sync', 'supabase_db'],
  },
  {
    type: 'orchestration',
    label: 'ORCHESTRATION',
    description: 'Supabase Realtime/Edge Functions',
    color: '#10B981', // Green
    moduleIds: ['supabase_db'], // Supabase가 오케스트레이션 역할도 수행
  },
  {
    type: 'dashboard',
    label: 'DASHBOARD',
    description: '사용자 인터페이스',
    color: '#F59E0B', // Amber
    moduleIds: ['main_dashboard', 'sub_dashboard'],
  },
  {
    type: 'output',
    label: 'OUTPUT',
    description: 'AE 렌더링 출력',
    color: '#EF4444', // Red
    moduleIds: ['ae_nexrender'],
  },
]

/**
 * Layer 노드 생성
 */
export function createLayerNodes(): Node<LayerNodeData>[] {
  const startX = 50
  const startY = 50
  const gapX = 280

  return layerDefinitions.map((layer, index) => ({
    id: `layer-${layer.type}`,
    type: 'layer',
    position: { x: startX + index * gapX, y: startY },
    data: {
      layerType: layer.type,
      label: layer.label,
      description: layer.description,
      color: layer.color,
      moduleIds: layer.moduleIds,
      isExpanded: false,
    },
  }))
}

/**
 * Layer 간 Edge 생성
 */
export function createLayerEdges() {
  return [
    {
      id: 'layer-input-storage',
      source: 'layer-input',
      target: 'layer-storage',
      type: 'default',
      animated: true,
      style: { stroke: '#3B82F6', strokeWidth: 3 },
    },
    {
      id: 'layer-storage-orchestration',
      source: 'layer-storage',
      target: 'layer-orchestration',
      type: 'default',
      animated: true,
      style: { stroke: '#8B5CF6', strokeWidth: 3 },
    },
    {
      id: 'layer-orchestration-dashboard',
      source: 'layer-orchestration',
      target: 'layer-dashboard',
      type: 'default',
      animated: true,
      style: { stroke: '#10B981', strokeWidth: 3 },
    },
    {
      id: 'layer-dashboard-output',
      source: 'layer-dashboard',
      target: 'layer-output',
      type: 'default',
      animated: true,
      style: { stroke: '#F59E0B', strokeWidth: 3 },
    },
  ]
}

/**
 * 모듈 ID로 해당 Layer 찾기
 */
export function getLayerForModule(moduleId: string): LayerType | null {
  for (const layer of layerDefinitions) {
    if (layer.moduleIds.includes(moduleId)) {
      return layer.type
    }
  }
  return null
}

/**
 * Layer 색상 가져오기
 */
export function getLayerColor(layerType: LayerType): string {
  const layer = layerDefinitions.find(l => l.type === layerType)
  return layer?.color ?? '#666666'
}
