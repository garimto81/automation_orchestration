import type { Project } from '@/types'

// GFX Pipeline Modules Only
export const projects: Project[] = [
  {
    id: 'gfx_simulator',
    name: 'GFX Simulator',
    displayName: 'GFX Simulator',
    description: '25/10 SC 기준 1분마다 1핸드 생성',
    path: 'C:\\claude\\gfx_pipeline\\simulator',
    status: 'active',
    techStack: ['Python', 'Streamlit', 'PokerGFX API'],
    prds: [],
    overallProgress: 100,
    services: [
      { name: 'simulator', status: 'healthy', responseTime: 8 },
    ],
    github: { recentCommits: 0, openPRs: 0, openIssues: 0 },
    dependencies: { incoming: [], outgoing: ['nas_sync'] },
  },
  {
    id: 'nas_sync',
    name: 'NAS Sync',
    displayName: 'NAS Sync',
    description: '시뮬레이터 → NAS 폴더 동기화',
    path: 'C:\\claude\\gfx_pipeline\\nas_sync',
    status: 'active',
    techStack: ['Python', 'Watchdog', 'File System'],
    prds: [],
    overallProgress: 100,
    services: [
      { name: 'nas-sync', status: 'healthy', responseTime: 5 },
    ],
    github: { recentCommits: 0, openPRs: 0, openIssues: 0 },
    dependencies: { incoming: ['gfx_simulator'], outgoing: ['nas_supabase_sync'] },
  },
  {
    id: 'nas_supabase_sync',
    name: 'NAS-Supabase Sync',
    displayName: 'NAS-Supabase',
    description: 'NAS JSON → Supabase 마이그레이션 (Docker)',
    path: 'C:\\claude\\gfx_pipeline\\nas_supabase_sync',
    status: 'active',
    techStack: ['Docker', 'Python', 'Supabase-py', 'Pydantic'],
    prds: [
      { id: 'PRD-SYNC-001', title: 'Docker Sync Service', totalItems: 20, completedItems: 17, progress: 85 },
    ],
    overallProgress: 85,
    services: [
      { name: 'docker-sync', status: 'healthy', responseTime: 15 },
    ],
    github: { recentCommits: 0, openPRs: 0, openIssues: 0 },
    dependencies: { incoming: ['nas_sync'], outgoing: ['supabase_db'] },
  },
  {
    id: 'supabase_db',
    name: 'Supabase DB',
    displayName: 'Supabase DB',
    description: '6개 DB 통합 (gfx/wsop+/manual/cuesheet/aep/progress)',
    path: 'C:\\claude\\gfx_pipeline\\supabase',
    status: 'active',
    techStack: ['Supabase', 'PostgreSQL 15', 'Realtime'],
    prds: [
      { id: 'PRD-DB-001', title: 'Schema Design', totalItems: 30, completedItems: 27, progress: 90 },
    ],
    overallProgress: 90,
    services: [
      { name: 'supabase-db', status: 'healthy', responseTime: 10 },
    ],
    github: { recentCommits: 0, openPRs: 0, openIssues: 0 },
    dependencies: { incoming: ['nas_supabase_sync'], outgoing: ['main_dashboard'] },
  },
  {
    id: 'main_dashboard',
    name: 'Main Dashboard',
    displayName: 'Main Dashboard',
    description: '방송 순서 핸드 선택, 해설진 커뮤니케이션',
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
    dependencies: { incoming: ['supabase_db'], outgoing: ['sub_dashboard'] },
  },
  {
    id: 'sub_dashboard',
    name: 'Sub Dashboard',
    displayName: 'Sub Dashboard',
    description: '자막 데이터 선택, 렌더링 지시',
    path: 'C:\\claude\\gfx_pipeline\\sub_dashboard',
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
    dependencies: { incoming: ['main_dashboard'], outgoing: ['ae_nexrender'] },
  },
  {
    id: 'ae_nexrender',
    name: 'AE-Nexrender',
    displayName: 'AE-Nexrender',
    description: 'After Effects 렌더링 → 로컬 네트워크 저장',
    path: 'C:\\claude\\gfx_pipeline\\nexrender',
    status: 'active',
    techStack: ['Node.js', 'Nexrender', 'After Effects', 'aerender'],
    prds: [
      { id: 'PRD-AE-001', title: 'Render Worker', totalItems: 20, completedItems: 15, progress: 75 },
    ],
    overallProgress: 75,
    services: [
      { name: 'nexrender-worker', status: 'healthy', responseTime: 120 },
    ],
    github: { recentCommits: 0, openPRs: 0, openIssues: 0 },
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
