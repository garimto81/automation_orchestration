# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Role

**Hybrid repository**: Documentation hub + Overview Dashboard app

| Role | Description |
|------|-------------|
| Architecture Docs | WSOP broadcast automation system design (6-module pipeline) |
| Project Monitoring | Status tracking for 10 projects (8 automation_* + 2 related) |
| Overview Dashboard | React app for visualizing project dependencies (`app/`) |

---

## Build & Test Commands

```powershell
# Overview Dashboard App (app/)
cd C:\claude\automation_orchestration\app
npm install                    # 의존성 설치
npm run dev                    # 개발 서버 (Vite)
npm run build                  # 프로덕션 빌드
npm run test                   # Vitest 단위 테스트
npm run lint                   # ESLint

# Playwright 스크린샷 (목업 → 이미지)
npx playwright screenshot docs/mockups/feature.html docs/images/feature.png --viewport-size=1920,1080
```

---

## Folder Structure

```
automation_orchestration/
├── app/                       # Overview Dashboard (React + TypeScript)
│   ├── src/
│   │   ├── components/        # UI (nodes/, layout/, ui/)
│   │   ├── data/              # 프로젝트 정의, 노드/엣지
│   │   ├── hooks/             # useGitHubStats, useHealthCheck
│   │   ├── services/          # GitHub API, Supabase, localStorage
│   │   ├── stores/            # Zustand (uiStore)
│   │   └── types/             # Project, Node, Edge 타입
│   └── package.json
├── docs/                      # 아키텍처 문서
│   ├── gfx/                   # GFX 데이터 스펙
│   │   ├── 00-common/         # Overview, transforms, null handling
│   │   ├── 01-categories/     # Chip, player, payout, event specs
│   │   ├── 02-schemas/        # JSON schema, DB table schema
│   │   ├── 03-dataflow/       # Pipeline overview
│   │   └── 04-examples/       # Sample data
│   ├── mockups/               # HTML 와이어프레임
│   └── images/                # 스크린샷
├── migrations/                # Supabase SQL migrations
└── CLAUDE.md
```

---

## Overview Dashboard Architecture

React Flow 기반 프로젝트 의존성 시각화 앱

### Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React 18, TypeScript, Tailwind CSS |
| State | Zustand |
| Visualization | @xyflow/react (React Flow) |
| Data Fetching | @tanstack/react-query |
| Build | Vite, vitest |

### Core Components

| Component | Path | Purpose |
|-----------|------|---------|
| `App.tsx` | `src/App.tsx` | ReactFlow 메인, viewMode 전환 |
| `ProjectNode` | `src/components/nodes/` | 프로젝트 노드 렌더링 |
| `LayerNode` | `src/components/nodes/` | 레이어 그룹 노드 |
| `uiStore` | `src/stores/uiStore.ts` | viewMode, selection 상태 |
| `edgeService` | `src/services/supabase.ts` | Edge 저장/로드 |

### View Modes

| Mode | Description |
|------|-------------|
| `modules` | 프로젝트 노드만 표시 |
| `layers` | 레이어 그룹만 표시 |
| `combined` | 레이어 + 프로젝트 통합 |

---

## Key Documents

| Document | Purpose |
|----------|---------|
| `GFX_PIPELINE_ARCHITECTURE.md` | 6-module pipeline master doc |
| `AUTOMATION_PROJECTS_REPORT.md` | 10 projects status & completion % |
| `PROJECT_RELATIONSHIPS.md` | Project dependencies diagram |
| `architecture.md` | 5-layer DB schema (DDL, ERD, Enums) |
| `GFX_AEP_FIELD_MAPPING.md` | 26 AE compositions, 84 fields mapping |
| `MODULE_*_DESIGN.md` | Per-module detailed design |

---

## 6-Module Pipeline

```
[1] GFX Simulator → [2] NAS-Supabase Sync → [3] Supabase DB
                                                    │
                              ┌─────────────────────┴─────────────────────┐
                              ▼                                           ▼
                    [4] Main Dashboard                          [5] Sub Dashboard
                       (What/When)                                  (How)
                              └─────────────WebSocket─────────────────────┘
                                                    │
                                                    ▼
                                          [6] AE-Nexrender
```

**Data Priority**: Manual > WSOP+ > GFX

---

## Document Conventions

### Naming
| Type | Pattern | Example |
|------|---------|---------|
| Design docs | `lowercase.md` | `architecture.md` |
| Reports | `*_REPORT.md` | `AUTOMATION_PROJECTS_REPORT.md` |
| Module designs | `MODULE_*_DESIGN.md` | `MODULE_1_2_DESIGN.md` |
| PRD docs | `PRD-NNNN-*.md` | `PRD-0010-overview-dashboard.md` |

### Cross-reference
```markdown
> **Related Documents**
> - [Document Name](./filename.md) - Description
```

### Footer
Always add: `*최종 수정: YYYY-MM-DD*`

---

## Mockup Workflow

```powershell
# 1. Create HTML mockup
Write-Output "..." > docs/mockups/feature-name.html

# 2. Screenshot with Playwright
npx playwright screenshot docs/mockups/feature-name.html docs/images/feature-name.png --viewport-size=1920,1080

# 3. Reference in markdown
![Feature Name](images/feature-name.png)
```

---

## Data Files

프로젝트/노드 데이터는 `app/src/data/`에서 관리:

| File | Purpose |
|------|---------|
| `projects.ts` | 10개 프로젝트 메타데이터 (status, techStack, progress) |
| `projectDetails.ts` | PRD, 서비스, GitHub 정보 |
| `initialNodes.ts` | ReactFlow 노드 위치/설정 |
| `initialEdges.ts` | 프로젝트 간 의존성 엣지 |
| `layers.ts` | 6-module 레이어 정의 |

---

## Update Checklist

문서 업데이트 시 일관성 유지:
- [ ] `docs/AUTOMATION_PROJECTS_REPORT.md` - 완성도 %
- [ ] `docs/PROJECT_RELATIONSHIPS.md` - 의존성 다이어그램
- [ ] `docs/GFX_PIPELINE_ARCHITECTURE.md` - 모듈 상태
- [ ] `app/src/data/projects.ts` - Dashboard 데이터 (코드 수정 시)
