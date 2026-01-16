import type { Project } from '@/types'
import { ProgressBar, StatusDot } from '@/components/ui'
import { useGitHubStats } from '@/hooks'
import { clsx } from 'clsx'

interface DetailPanelProps {
  project: Project | null
  onClose: () => void
  isOpen: boolean
  onToggle: () => void
}

export function DetailPanel({ project, onClose, isOpen, onToggle }: DetailPanelProps) {
  // GitHub 실시간 데이터 fetching
  const { data: githubStats, isLoading: isGitHubLoading } = useGitHubStats(project?.githubUrl)

  // GitHub 데이터: 실시간 API 데이터 우선, fallback으로 정적 데이터
  const github = githubStats || project?.github || { recentCommits: 0, openPRs: 0, openIssues: 0 }
  // 닫힌 상태: 토글 버튼만 표시
  if (!isOpen) {
    return (
      <aside className="w-[40px] border-l border-primary flex flex-col items-center py-4">
        <button
          onClick={onToggle}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
          title="Open Detail Panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {project && (
          <div className="mt-4 text-[10px] text-secondary writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
            {project.displayName}
          </div>
        )}
      </aside>
    )
  }

  // 열린 상태이지만 프로젝트 미선택
  if (!project) {
    return (
      <aside className="w-[280px] border-l border-primary p-4 relative">
        <button
          onClick={onToggle}
          className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded"
          title="Close Panel"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex items-center justify-center h-full text-secondary text-xs">
          Select a project to view details
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-[280px] border-l border-primary p-4 overflow-y-auto relative">
      {/* 토글 버튼 */}
      <button
        onClick={onToggle}
        className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded"
        title="Close Panel"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

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
          {isGitHubLoading && <span className="ml-2 text-[9px] text-secondary animate-pulse">loading...</span>}
        </h4>
        {project.githubUrl ? (
          <div className="space-y-2">
            {/* GitHub 프로그레스바 - 난이도 표시 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-secondary">Issues / Commits</span>
                <span className={clsx(
                  'px-1 rounded text-white text-[9px]',
                  github.difficulty === 'high' ? 'bg-red-500' :
                  github.difficulty === 'medium' ? 'bg-yellow-500' :
                  github.difficulty === 'low' ? 'bg-green-500' : 'bg-gray-400'
                )}>
                  {github.difficulty?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 w-full">
                <div
                  className={clsx(
                    'h-full transition-all',
                    github.difficulty === 'high' ? 'bg-red-500' :
                    github.difficulty === 'medium' ? 'bg-yellow-500' :
                    github.difficulty === 'low' ? 'bg-green-500' : 'bg-gray-400'
                  )}
                  style={{ width: `${Math.min((github.openIssues * 2 + github.recentCommits) / 30 * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-secondary">Open Issues</span>
                <span>{github.openIssues}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Commits (7d)</span>
                <span>{github.recentCommits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Open PRs</span>
                <span>{github.openPRs}</span>
              </div>
            </div>

            {/* 마지막 커밋 */}
            {github.lastCommitMessage && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <div className="text-[10px] text-secondary mb-1">Latest Commit:</div>
                <div className="text-[11px] truncate">{github.lastCommitMessage}</div>
                {github.lastCommitDate && (
                  <div className="text-[9px] text-secondary mt-0.5">
                    {new Date(github.lastCommitDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* 마지막 이슈 */}
            {github.lastIssueTitle && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="text-[10px] text-secondary mb-1">Latest Issue:</div>
                <div className="text-[11px] truncate">{github.lastIssueTitle}</div>
              </div>
            )}

            {/* GitHub 링크 */}
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-600 hover:underline block mt-2"
            >
              View on GitHub &rarr;
            </a>
          </div>
        ) : (
          <p className="text-xs text-secondary">No GitHub repository linked</p>
        )}
      </section>

      {/* Dependencies */}
      <section>
        <h4 className="text-[11px] font-semibold tracking-wider mb-2 pb-1.5 border-b border-gray-200">
          DEPENDENCIES
        </h4>
        <div className="space-y-1 text-xs">
          {project.dependencies.incoming.map(dep => (
            <div key={dep} className="text-secondary">
              &larr; {dep}
            </div>
          ))}
          {project.dependencies.outgoing.map(dep => (
            <div key={dep} className="text-secondary">
              &rarr; {dep}
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
