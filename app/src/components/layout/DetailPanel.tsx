import type { Project } from '@/types'
import { ProgressBar, StatusDot } from '@/components/ui'
import { clsx } from 'clsx'

interface DetailPanelProps {
  project: Project | null
  onClose: () => void
}

export function DetailPanel({ project, onClose }: DetailPanelProps) {
  if (!project) {
    return (
      <aside className="w-[280px] border-l border-primary p-4 flex items-center justify-center text-secondary text-xs">
        Select a project to view details
      </aside>
    )
  }

  return (
    <aside className="w-[280px] border-l border-primary p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-primary">
        <span className="text-sm font-semibold">{project.name}</span>
        <span className="cursor-pointer text-lg" onClick={onClose}>&times;</span>
      </div>

      {/* Status */}
      <section className="mb-5">
        <h4 className="text-[11px] font-semibold tracking-wider mb-2 pb-1.5 border-b border-gray-200">
          STATUS
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-secondary">State</span>
            <span className="flex items-center gap-1">
              <StatusDot active={project.status === 'active'} />
              {project.status === 'active' ? 'Active' :
               project.status === 'development' ? 'Dev' :
               project.status === 'docs-only' ? 'Docs' : 'Inactive'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Tech</span>
            <span>{project.techStack.slice(0, 2).join(', ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Path</span>
            <span className="text-[10px] truncate max-w-[140px]">{project.path}</span>
          </div>
        </div>
      </section>

      {/* PRD Progress */}
      <section className="mb-5">
        <h4 className="text-[11px] font-semibold tracking-wider mb-2 pb-1.5 border-b border-gray-200">
          PRD PROGRESS
        </h4>
        {project.prds.length > 0 ? (
          <div className="space-y-3">
            {project.prds.map(prd => (
              <div key={prd.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{prd.id}</span>
                  <span>{prd.progress}%</span>
                </div>
                <ProgressBar value={prd.progress} />
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-gray-200">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Overall</span>
                <span>{project.overallProgress}%</span>
              </div>
              <ProgressBar value={project.overallProgress} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-secondary">No PRDs tracked</p>
        )}
      </section>

      {/* Services */}
      <section className="mb-5">
        <h4 className="text-[11px] font-semibold tracking-wider mb-2 pb-1.5 border-b border-gray-200">
          SERVICES
        </h4>
        {project.services.length > 0 ? (
          <div className="space-y-1.5">
            {project.services.map(service => (
              <div key={service.name} className="flex items-center gap-2 text-xs">
                <StatusDot active={service.status === 'healthy'} />
                <span className="flex-1">{service.name}</span>
                <span className={clsx(
                  'px-1.5 border text-[10px]',
                  service.status === 'healthy' ? 'bg-primary text-white border-primary' : 'border-primary'
                )}>
                  {service.status === 'healthy' ? 'OK' : 'ERR'}
                </span>
                {service.responseTime && (
                  <span className="text-[10px] text-secondary">{service.responseTime}ms</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-secondary">No services</p>
        )}
      </section>

      {/* GitHub Activity */}
      <section className="mb-5">
        <h4 className="text-[11px] font-semibold tracking-wider mb-2 pb-1.5 border-b border-gray-200">
          GITHUB ACTIVITY
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-secondary">&#9675; Commits (7d)</span>
            <span>{project.github.recentCommits}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">&#9675; Open PRs</span>
            <span>{project.github.openPRs}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">&#9675; Open Issues</span>
            <span>{project.github.openIssues}</span>
          </div>
          {project.github.lastCommitMessage && (
            <div className="mt-3">
              <div className="text-[10px] text-secondary mb-1">Recent Commit:</div>
              <div className="text-[11px]">{project.github.lastCommitMessage}</div>
            </div>
          )}
        </div>
      </section>

      {/* Dependencies */}
      <section>
        <h4 className="text-[11px] font-semibold tracking-wider mb-2 pb-1.5 border-b border-gray-200">
          DEPENDENCIES
        </h4>
        <div className="space-y-1 text-xs">
          {project.dependencies.incoming.map(dep => (
            <div key={dep} className="text-secondary">
              &#8592; {dep}
            </div>
          ))}
          {project.dependencies.outgoing.map(dep => (
            <div key={dep} className="text-secondary">
              &#8594; {dep}
            </div>
          ))}
          {project.dependencies.incoming.length === 0 && project.dependencies.outgoing.length === 0 && (
            <p className="text-secondary">No dependencies</p>
          )}
        </div>
      </section>
    </aside>
  )
}
