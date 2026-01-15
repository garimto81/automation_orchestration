import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import type { ProjectNode as ProjectNodeType, ProjectNodeData } from '@/types'
import { ProgressBar, StatusDot } from '@/components/ui'

function ProjectNodeComponent({ data, selected }: NodeProps<ProjectNodeType>) {
  const nodeData = data as ProjectNodeData
  const isDocsOnly = nodeData.status === 'docs-only'

  return (
    <div
      className={clsx(
        'bg-white border border-primary min-w-[140px]',
        (selected || nodeData.isSelected) && 'border-2'
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2 !border-0" />

      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200">
        <StatusDot
          active={nodeData.status === 'active' || nodeData.status === 'development'}
          selected={selected || nodeData.isSelected}
        />
        <span className={clsx('text-xs', (selected || nodeData.isSelected) && 'font-semibold')}>
          {nodeData.displayName}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {/* Expanded view */}
        {(selected || nodeData.isSelected) && (
          <>
            <p className="text-[10px] text-secondary mb-2">{nodeData.description}</p>
            <div className="mb-2">
              <div className="text-[10px] text-secondary mb-1">PRD Progress</div>
              <ProgressBar value={nodeData.overallProgress} />
            </div>
            {nodeData.services.length > 0 && (
              <div className="flex gap-1 text-[10px] text-secondary mb-2">
                {nodeData.services.map((s: { name: string; status: string }) => (
                  <span key={s.name} className={clsx(
                    'px-1 border',
                    s.status === 'healthy' ? 'bg-primary text-white' : 'border-primary'
                  )}>
                    {s.name.split('-').pop()}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 text-[10px] text-secondary">
              <span>{nodeData.github.recentCommits} commits</span>
              <span>{nodeData.github.openPRs} PRs</span>
              <span>{nodeData.github.openIssues} issues</span>
            </div>
          </>
        )}

        {/* Compact view */}
        {!selected && !nodeData.isSelected && (
          <>
            <ProgressBar value={nodeData.overallProgress} size="sm" />
            <div className="text-[10px] text-secondary mt-1">
              {isDocsOnly ? '-- docs only --' : `${nodeData.overallProgress}%`}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export const ProjectNode = memo(ProjectNodeComponent)
