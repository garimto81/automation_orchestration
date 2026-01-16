import type { Project, ProjectSummary } from '@/types'
import { StatusDot, ProgressBar } from '@/components/ui'
import { clsx } from 'clsx'

interface SidebarProps {
  projects: Project[]
  summary: ProjectSummary
  selectedId?: string
  onSelect: (id: string) => void
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ projects, summary, selectedId, onSelect, isOpen, onToggle }: SidebarProps) {
  // 닫힌 상태: 토글 버튼만 표시
  if (!isOpen) {
    return (
      <aside className="w-[40px] border-r border-primary flex flex-col items-center py-4">
        <button
          onClick={onToggle}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
          title="Open Sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* 아이콘으로 프로젝트 수 표시 */}
        <div className="mt-4 text-[10px] text-secondary">{projects.length}</div>
      </aside>
    )
  }

  return (
    <aside className="w-[180px] border-r border-primary p-4 overflow-y-auto relative">
      {/* 토글 버튼 */}
      <button
        onClick={onToggle}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded"
        title="Close Sidebar"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

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
