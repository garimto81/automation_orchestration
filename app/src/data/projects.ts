import type { Project } from '@/types'

// GFX Pipeline Modules - 6개 노드 (NAS-Supabase Sync 제거, NAS Sync가 직접 Supabase로 마이그레이션)
export const projects: Project[] = [
  {
    id: 'gfx_simulator',
    name: 'GFX Simulator',
    displayName: 'GFX Simulator',
    description: '이중화 핸드 감지 (Primary RFID + Secondary AI), Fusion Engine, A/B/C 등급 분류',
    path: 'C:\\claude\\automation_feature_table',
    status: 'development',
    techStack: ['Python', 'FastAPI', 'Streamlit', 'phevaluator', 'Gemini', 'Watchdog'],
    prds: [
      { id: 'PRD-FT-001', title: 'Hand Detection', totalItems: 20, completedItems: 16, progress: 82 },
    ],
    overallProgress: 82,
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
    description: 'GFX Sync Agent v3.0 - NAS JSON → Supabase 실시간 동기화 (프로덕션 준비 완료)',
    path: 'C:\\claude\\gfx_json',
    status: 'active',
    techStack: ['Python', 'httpx', 'Watchdog', 'Pydantic v2', 'SQLite', 'Next.js 14'],
    prds: [
      { id: 'PRD-SYNC-001', title: 'JSON to Supabase Migration', totalItems: 20, completedItems: 20, progress: 100 },
    ],
    overallProgress: 100,
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
    description: '22개 마이그레이션, 6개 스키마 (json, wsop_plus, manual, ae, public, config)',
    path: 'C:\\claude\\automation_schema',
    status: 'development',
    techStack: ['Supabase', 'PostgreSQL 15', 'Realtime', 'RLS'],
    prds: [
      { id: 'PRD-DB-001', title: 'Schema Design', totalItems: 30, completedItems: 26, progress: 85 },
    ],
    overallProgress: 85,
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
    description: 'AE 렌더링 서버 - FastAPI 백엔드 + React 프론트엔드',
    path: 'C:\\claude\\automation_ae',
    status: 'development',
    techStack: ['FastAPI', 'React', 'TypeScript', 'Supabase'],
    prds: [
      { id: 'PRD-SUB-001', title: 'FastAPI Backend', totalItems: 20, completedItems: 19, progress: 95 },
      { id: 'PRD-SUB-002', title: 'React Frontend', totalItems: 20, completedItems: 18, progress: 90 },
    ],
    overallProgress: 92,
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
    description: 'Supabase 폴링 워커 - GFX→Nexrender Job 변환, 적응형 폴링',
    path: 'C:\\claude\\ae_nexrender_module',
    status: 'development',
    techStack: ['Python', 'FastAPI', 'asyncio', 'Nexrender CLI', 'Docker'],
    prds: [
      { id: 'PRD-AE-001', title: 'Polling Worker', totalItems: 20, completedItems: 16, progress: 78 },
    ],
    overallProgress: 78,
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
