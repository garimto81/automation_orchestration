import type { Project, ProjectSummary } from '@/types'
import { StatusDot, ProgressBar } from '@/components/ui'
import { clsx } from 'clsx'

interface SidebarProps {
  projects: Project[]
  summary: ProjectSummary
  selectedId?: string
  onSelect: (id: string) => void
}

export function Sidebar({ projects, summary, selectedId, onSelect }: SidebarProps) {
  return (
    <aside className="w-[180px] border-r border-primary p-4 overflow-y-auto">
      {/* Projects List */}
      <section className="mb-6">
        <h3 className="text-[11px] font-semibold tracking-wider mb-3 pb-2 border-b border-gray-200">
          PROJECTS
        </h3>
        <ul className="space-y-0.5">
          {projects.map(project => (
            <li
              key={project.id}
              className={clsx(
                'flex items-center gap-2 py-1.5 px-1 cursor-pointer hover:bg-gray-50',
                selectedId === project.id && 'font-semibold'
              )}
              onClick={() => onSelect(project.id)}
            >
              <StatusDot
                active={project.status === 'active' || project.status === 'development'}
                selected={selectedId === project.id}
              />
              <span className="flex-1 text-xs">{project.displayName}</span>
              <span className="text-[10px] text-secondary">
                {project.status === 'docs-only' ? '--' : `${project.overallProgress}%`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Summary */}
      <section className="mb-6">
        <h3 className="text-[11px] font-semibold tracking-wider mb-3 pb-2 border-b border-gray-200">
          SUMMARY
        </h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Total</span>
            <span>{summary.totalProjects}</span>
          </div>
          <div className="flex justify-between">
            <span>Active</span>
            <span>{summary.activeProjects}</span>
          </div>
          <div className="flex justify-between">
            <span>Dev</span>
            <span>{summary.developmentProjects}</span>
          </div>
          <div className="flex justify-between">
            <span>Docs</span>
            <span>{summary.docsOnlyProjects}</span>
          </div>
          <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
            <span>Overall</span>
            <span>{summary.overallProgress}%</span>
          </div>
          <ProgressBar value={summary.overallProgress} size="sm" className="mt-2" />
        </div>
      </section>

      {/* Services */}
      <section>
        <h3 className="text-[11px] font-semibold tracking-wider mb-3 pb-2 border-b border-gray-200">
          SERVICES
        </h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>&#9675; Healthy</span>
            <span>{summary.healthyServices}/{summary.totalServices}</span>
          </div>
          <div className="flex justify-between">
            <span>&#9679; Unhealthy</span>
            <span>{summary.totalServices - summary.healthyServices}</span>
          </div>
        </div>
      </section>
    </aside>
  )
}
