import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { clsx } from 'clsx'
import type { ProjectNodeData } from '@/types'
import { ProgressBar, StatusDot } from '@/components/ui'

function ProjectNodeComponent({ data, selected }: NodeProps<ProjectNodeData>) {
  const isDocsOnly = data.status === 'docs-only'
  const isCompact = !selected && !data.isSelected

  return (
    <div
      className={clsx(
        'bg-white border border-primary min-w-[140px]',
        (selected || data.isSelected) && 'border-2'
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2 !border-0" />

      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200">
        <StatusDot
          active={data.status === 'active' || data.status === 'development'}
          selected={selected || data.isSelected}
        />
        <span className={clsx('text-xs', (selected || data.isSelected) && 'font-semibold')}>
          {data.displayName}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {/* Expanded view */}
        {(selected || data.isSelected) && (
          <>
            <p className="text-[10px] text-secondary mb-2">{data.description}</p>
            <div className="mb-2">
              <div className="text-[10px] text-secondary mb-1">PRD Progress</div>
              <ProgressBar value={data.overallProgress} />
            </div>
            {data.services.length > 0 && (
              <div className="flex gap-1 text-[10px] text-secondary mb-2">
                {data.services.map(s => (
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
              <span>{data.github.recentCommits} commits</span>
              <span>{data.github.openPRs} PRs</span>
              <span>{data.github.openIssues} issues</span>
            </div>
          </>
        )}

        {/* Compact view */}
        {!selected && !data.isSelected && (
          <>
            <ProgressBar value={data.overallProgress} size="sm" />
            <div className="text-[10px] text-secondary mt-1">
              {isDocsOnly ? '-- docs only --' : `${data.overallProgress}%`}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export const ProjectNode = memo(ProjectNodeComponent)
