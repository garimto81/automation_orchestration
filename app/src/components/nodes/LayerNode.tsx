import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { LayerNodeData } from '@/types/nodes'
import { clsx } from 'clsx'

type LayerNodeProps = NodeProps<Node<LayerNodeData>>

/**
 * LayerNode - 5계층 아키텍처 그룹 노드
 * INPUT → STORAGE → ORCHESTRATION → DASHBOARD → OUTPUT
 */
export const LayerNode = memo(function LayerNode({
  data,
  selected,
}: LayerNodeProps) {
  const { layerType, label, description, moduleIds, isExpanded, color } = data

  // Layer별 아이콘
  const getLayerIcon = () => {
    switch (layerType) {
      case 'input': return '📥'
      case 'storage': return '🗄️'
      case 'orchestration': return '⚙️'
      case 'dashboard': return '📊'
      case 'output': return '📤'
      default: return '📦'
    }
  }

  return (
    <div
      className={clsx(
        'px-4 py-3 rounded-lg border-2 min-w-[200px]',
        'transition-all duration-200',
        selected ? 'shadow-lg' : 'shadow-sm',
        isExpanded ? 'bg-white' : 'bg-opacity-90'
      )}
      style={{
        borderColor: color,
        backgroundColor: isExpanded ? '#fff' : `${color}15`
      }}
    >
      {/* 왼쪽 핸들 (첫 번째 Layer 제외) */}
      {layerType !== 'input' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !border-2"
          style={{ backgroundColor: color, borderColor: color }}
        />
      )}

      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{getLayerIcon()}</span>
        <div>
          <div className="font-bold text-sm" style={{ color }}>
            {label}
          </div>
          <div className="text-[10px] text-gray-500">{description}</div>
        </div>
      </div>

      {/* 모듈 카운트 */}
      <div className="flex items-center justify-between text-[10px] text-gray-600 mt-2 pt-2 border-t border-gray-200">
        <span>Modules</span>
        <span className="font-semibold">{moduleIds.length}</span>
      </div>

      {/* 오른쪽 핸들 (마지막 Layer 제외) */}
      {layerType !== 'output' && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !border-2"
          style={{ backgroundColor: color, borderColor: color }}
        />
      )}
    </div>
  )
})
