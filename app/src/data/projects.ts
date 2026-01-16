import type { Project } from '@/types'

// GFX Pipeline Modules - 6개 노드 (NAS-Supabase Sync 제거, NAS Sync가 직접 Supabase로 마이그레이션)
export const projects: Project[] = [
  {
    id: 'gfx_simulator',
    name: 'GFX Simulator',
    displayName: 'GFX Simulator',
    description: 'GFX 가상 생성기 - 핸드 생성하여 NAS에 저장',
    path: 'C:\\claude\\automation_feature_table',
    status: 'active',
    techStack: ['Python', 'Streamlit', 'PokerGFX API'],
    prds: [],
    overallProgress: 100,
    services: [
      { name: 'simulator', status: 'healthy', responseTime: 8 },
    ],
    github: { recentCommits: 0, openPRs: 0, openIssues: 0 },
    githubUrl: 'https://github.com/garimto81/automation_feature_table',
    dependencies: { incoming: [], outgoing: ['nas_sync'] },
  },
  {
    id: 'nas_sync',
    name: 'NAS Sync',
    displayName: 'NAS Sync',
    description: 'NAS에 저장된 GFX JSON을 Supabase에 마이그레이션',
    path: 'C:\\claude\\gfx_json',
    status: 'development',
    techStack: ['Python', 'Watchdog', 'Supabase-py', 'Pydantic'],
    prds: [
      { id: 'PRD-SYNC-001', title: 'JSON to Supabase Migration', totalItems: 20, completedItems: 17, progress: 85 },
    ],
    overallProgress: 85,
    services: [
      { name: 'nas-sync', status: 'healthy', responseTime: 5 },
    ],
    github: { recentCommits: 0, openPRs: 0, openIssues: 0 },
    githubUrl: 'https://github.com/garimto81/gfx_json',
    healthEndpoint: { url: 'http://localhost:8080', path: '/health' },
    dependencies: { incoming: ['gfx_simulator'], outgoing: ['supabase_db'] },
  },
  {
    id: 'supabase_db',
    name: 'Supabase DB',
    displayName: 'Supabase DB',
    description: 'Supabase 모든 DB 설계 - 6개 DB 통합',
    path: 'C:\\claude\\automation_schema',
    status: 'development',
    techStack: ['Supabase', 'PostgreSQL 15', 'Realtime'],
    prds: [
      { id: 'PRD-DB-001', title: 'Schema Design', totalItems: 30, completedItems: 27, progress: 90 },
    ],
    overallProgress: 90,
    services: [
      { name: 'supabase-db', status: 'healthy', responseTime: 10 },
    ],
    github: { recentCommits: 0, openPRs: 0, openIssues: 0 },
    githubUrl: 'https://github.com/garimto81/automation_schema',
    dependencies: { incoming: ['nas_sync'], outgoing: ['main_dashboard'] },
  },
  {
    id: 'main_dashboard',
    name: 'Main Dashboard',
    displayName: 'Main Dashboard',
    description: '방송 순서 핸드 선택, 해설진 커뮤니케이션 (다른 파트 작업중)',
    path: 'C:\\claude\\gfx_pipeline\\main_dashboard',
    status: 'development',
    techStack: ['Next.js 14', 'React 18', 'TypeScript', 'Supabase'],
    prds: [
      { id: 'PRD-MAIN-001', title: 'Hand Browser', totalItems: 25, completedItems: 10, progress: 40 },
      { id: 'PRD-MAIN-002', title: 'Cuesheet Editor', totalItems: 20, completedItems: 8, progress: 40 },
    ],
    overallProgress: 40,
    services: [
      { name: 'main-dash', status: 'healthy', responseTime: 18 },
    ],
    github: { recentCommits: 0, openPRs: 0, openIssues: 0 },
    // Main Dashboard는 GitHub 연동 없음
    dependencies: { incoming: ['supabase_db'], outgoing: ['sub_dashboard'] },
  },
  {
    id: 'sub_dashboard',
    name: 'Sub Dashboard',
    displayName: 'Sub Dashboard',
    description: '자막 데이터 선택, 렌더링 지시',
    path: 'C:\\claude\\automation_ae',
    status: 'development',
    techStack: ['Next.js 14', 'React 18', 'TypeScript', 'Supabase'],
    prds: [
      { id: 'PRD-SUB-001', title: 'Caption Timeline', totalItems: 20, completedItems: 6, progress: 30 },
      { id: 'PRD-SUB-002', title: 'Render Queue', totalItems: 25, completedItems: 9, progress: 36 },
    ],
    overallProgress: 33,
    services: [
      { name: 'sub-dash', status: 'healthy', responseTime: 20 },
    ],
    github: { recentCommits: 0, openPRs: 0, openIssues: 0 },
    githubUrl: 'https://github.com/garimto81/automation_ae',
    healthEndpoint: { url: 'http://localhost:8000', path: '/health' },
    dependencies: { incoming: ['main_dashboard'], outgoing: ['ae_nexrender'] },
  },
  {
    id: 'ae_nexrender',
    name: 'AE-Nexrender',
    displayName: 'AE-Nexrender',
    description: 'After Effects 렌더링 → 로컬 네트워크 저장 (PRD 수정 및 개발 계획 수립 예정)',
    path: 'C:\\claude\\ae_nexrender_module',
    status: 'development',
    techStack: ['Node.js', 'Nexrender', 'After Effects', 'aerender'],
    prds: [
      { id: 'PRD-AE-001', title: 'Render Worker', totalItems: 20, completedItems: 15, progress: 75 },
    ],
    overallProgress: 75,
    services: [
      { name: 'nexrender-worker', status: 'healthy', responseTime: 120 },
    ],
    github: { recentCommits: 0, openPRs: 0, openIssues: 0 },
    githubUrl: 'https://github.com/garimto81/ae_nexrender_module',
    healthEndpoint: { url: 'http://localhost:3000', path: '/health' },
    dependencies: { incoming: ['sub_dashboard'], outgoing: [] },
  },
]

export function getProjectSummary() {
  const activeProjects = projects.filter(p => p.status === 'active').length
  const developmentProjects = projects.filter(p => p.status === 'development').length
  const docsOnlyProjects = projects.filter(p => p.status === 'docs-only').length

  const projectsWithProgress = projects.filter(p => p.overallProgress > 0)
  const overallProgress = projectsWithProgress.length > 0
    ? Math.round(projectsWithProgress.reduce((sum, p) => sum + p.overallProgress, 0) / projectsWithProgress.length)
    : 0

  const allServices = projects.flatMap(p => p.services)
  const healthyServices = allServices.filter(s => s.status === 'healthy').length

  return {
    totalProjects: projects.length,
    activeProjects,
    developmentProjects,
    docsOnlyProjects,
    overallProgress,
    healthyServices,
    totalServices: allServices.length,
  }
}
