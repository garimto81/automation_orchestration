import { useState } from 'react'
import type { Project } from '@/types'
import { ProgressBar, StatusDot } from '@/components/ui'
import { useGitHubStats, useProjectHealthCheck, useHealthCheckRefresh } from '@/hooks'
import { projectDetails } from '@/data/projectDetails'
import { getLayerColor } from '@/data/layers'
import { clsx } from 'clsx'

interface DetailPanelProps {
  project: Project | null
  onClose: () => void
  isOpen: boolean
  onToggle: () => void
}

export function DetailPanel({ project, onClose, isOpen, onToggle }: DetailPanelProps) {
  // 드릴다운 상태
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    schemas: false,
    endpoints: false,
  })

  // GitHub 실시간 데이터 fetching
  const { data: githubStats, isLoading: isGitHubLoading } = useGitHubStats(project?.githubUrl)

  // Health Check - 스냅샷 기반 (앱 시작 또는 수동 새로고침)
  const { data: healthResult, isLoading: isHealthLoading } = useProjectHealthCheck(project)
  const { refreshProject } = useHealthCheckRefresh()

  // GitHub 데이터: 실시간 API 데이터 우선, fallback으로 정적 데이터
  const github = githubStats || project?.github || { recentCommits: 0, openPRs: 0, openIssues: 0 }

  // 프로젝트 상세 정보 가져오기
  const detail = project ? projectDetails[project.id] : null
  const layerColor = detail ? getLayerColor(detail.layerType) : '#666'

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }
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

      {/* Header with Layer Badge */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-primary">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{project.name}</span>
          {detail && (
            <span
              className="px-1.5 py-0.5 text-[9px] text-white rounded"
              style={{ backgroundColor: layerColor }}
            >
              {detail.layerType.toUpperCase()}
            </span>
          )}
        </div>
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
            <span className="text-secondary">Layer</span>
            <span style={{ color: layerColor }}>{detail?.layerType?.toUpperCase() || 'N/A'}</span>
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

      {/* Architecture Drilldown - 스키마 */}
      {detail?.schemas && detail.schemas.length > 0 && (
        <section className="mb-5">
          <h4
            className="text-[11px] font-semibold tracking-wider mb-2 pb-1.5 border-b border-gray-200 flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('schemas')}
          >
            <span className="flex items-center gap-1">
              <span>{expandedSections.schemas ? '▼' : '▶'}</span>
              DB SCHEMAS ({detail.schemas.length})
            </span>
            <span className="text-[9px] text-secondary font-normal">
              {detail.schemas.reduce((sum, s) => sum + s.tableCount, 0)} tables
            </span>
          </h4>
          {expandedSections.schemas && (
            <div className="space-y-3">
              {detail.schemas.map(schema => (
                <div key={schema.schemaName} className="p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold">{schema.displayName}</span>
                    <span className="px-1 bg-purple-100 text-purple-700 text-[8px] rounded">
                      {schema.tableCount} tables
                    </span>
                  </div>
                  <div className="text-[9px] text-secondary mb-2">{schema.description}</div>
                  <div className="space-y-0.5">
                    {schema.tables.map(table => (
                      <div key={table.name} className="flex items-center gap-1 text-[9px]">
                        <span className="text-gray-400">-</span>
                        <span className="font-mono">{table.name}</span>
                        {table.description && (
                          <span className="text-secondary truncate">({table.description})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Architecture Drilldown - 엔드포인트 */}
      {detail?.endpoints && detail.endpoints.length > 0 && (
        <section className="mb-5">
          <h4
            className="text-[11px] font-semibold tracking-wider mb-2 pb-1.5 border-b border-gray-200 flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('endpoints')}
          >
            <span className="flex items-center gap-1">
              <span>{expandedSections.endpoints ? '▼' : '▶'}</span>
              API ENDPOINTS ({detail.endpoints.length})
            </span>
          </h4>
          {expandedSections.endpoints && (
            <div className="space-y-1.5">
              {detail.endpoints.map((endpoint, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[10px]">
                  <span className={clsx(
                    'px-1 py-0.5 text-[8px] font-mono rounded',
                    endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                    endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                    endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  )}>
                    {endpoint.method}
                  </span>
                  <span className="font-mono flex-1 truncate">{endpoint.path}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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

      {/* Health Check - 스냅샷 기반 */}
      <section className="mb-5">
        <h4 className="text-[11px] font-semibold tracking-wider mb-2 pb-1.5 border-b border-gray-200 flex items-center justify-between">
          <span>
            HEALTH CHECK
            {isHealthLoading && <span className="ml-2 text-[9px] text-secondary animate-pulse">checking...</span>}
          </span>
          {project.healthEndpoint && (
            <button
              onClick={() => refreshProject(project.id)}
              className="text-[9px] text-blue-600 hover:underline"
              title="Refresh health check"
            >
              Refresh
            </button>
          )}
        </h4>
        {project.healthEndpoint ? (
          <div className="space-y-2">
            {/* 상태 표시 */}
            <div className="flex items-center gap-2 text-xs">
              <span className={clsx(
                'w-2 h-2 rounded-full',
                healthResult?.status === 'online' ? 'bg-green-500' :
                healthResult?.status === 'offline' ? 'bg-red-500' : 'bg-gray-400'
              )} />
              <span className="flex-1">API Status</span>
              <span className={clsx(
                'px-1.5 border text-[10px]',
                healthResult?.status === 'online' ? 'bg-green-500 text-white border-green-500' :
                healthResult?.status === 'offline' ? 'bg-red-500 text-white border-red-500' :
                'border-gray-400 text-gray-500'
              )}>
                {healthResult?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
              {healthResult?.responseTime && (
                <span className="text-[10px] text-secondary">{healthResult.responseTime}ms</span>
              )}
            </div>

            {/* 엔드포인트 정보 */}
            <div className="text-[10px] text-secondary">
              <span>Endpoint: </span>
              <span className="font-mono">{project.healthEndpoint.url}{project.healthEndpoint.path}</span>
            </div>

            {/* 상세 정보 */}
            {healthResult?.details && (
              <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-[10px]">
                {healthResult.details.version && (
                  <div className="flex justify-between">
                    <span className="text-secondary">Version</span>
                    <span>{healthResult.details.version}</span>
                  </div>
                )}
                {healthResult.details.uptime !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-secondary">Uptime</span>
                    <span>{Math.floor(healthResult.details.uptime / 60)}m {healthResult.details.uptime % 60}s</span>
                  </div>
                )}
                {healthResult.details.components && (
                  <div className="mt-1">
                    <span className="text-secondary">Components:</span>
                    {Object.entries(healthResult.details.components).map(([key, value]) => (
                      <div key={key} className="flex justify-between ml-2">
                        <span className="text-secondary">{key}</span>
                        <span className={value === 'ok' || value === 'running' ? 'text-green-600' : 'text-red-500'}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 에러 표시 */}
            {healthResult?.error && (
              <div className="mt-2 text-[10px] text-red-500">
                Error: {healthResult.error}
              </div>
            )}

            {/* 체크 시간 */}
            {healthResult?.checkedAt && (
              <div className="text-[9px] text-secondary mt-1">
                Checked: {new Date(healthResult.checkedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-secondary">No health endpoint configured</p>
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
