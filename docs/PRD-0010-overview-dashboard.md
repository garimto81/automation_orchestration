# PRD-0010: Automation Projects Overview Dashboard

**번호**: PRD-0010
**작성일**: 2026-01-15
**상태**: In Progress
**버전**: 2.0.0
**위치**: `C:\claude\automation_orchestration\app`

---

## 1. Executive Summary

전체 6개 GFX Pipeline 프로젝트의 진행 상황을 React Flow 기반 노드 그래프로 시각화하는 대시보드입니다. Black & White 테마로 깔끔한 UI를 제공하며, 프로젝트 간 관계, PRD 진행률, 서비스 상태, GitHub 활동을 통합 표시합니다.

---

## 2. 노드 구조 (v2.0)

### 파이프라인 노드 (6개)

| 노드 | 상태 | GitHub URL | 역할 |
|------|------|-----------|------|
| **GFX Simulator** | 완료 | [automation_feature_table](https://github.com/garimto81/automation_feature_table) | GFX 가상 생성기 - 핸드 생성하여 NAS에 저장 |
| **NAS Sync** | 개발중 | [gfx_json](https://github.com/garimto81/gfx_json) | NAS에 저장된 GFX JSON을 Supabase에 마이그레이션 |
| **Supabase DB** | 개발중 | [automation_schema](https://github.com/garimto81/automation_schema) | Supabase 모든 DB 설계 - 6개 DB 통합 |
| **Main Dashboard** | 개발중 | - | 방송 순서 핸드 선택, 해설진 커뮤니케이션 (다른 파트 작업중) |
| **Sub Dashboard** | 개발중 | [automation_ae](https://github.com/garimto81/automation_ae) | 자막 데이터 선택, 렌더링 지시 |
| **AE-Nexrender** | 개발중 | [ae_nexrender_module](https://github.com/garimto81/ae_nexrender_module) | After Effects 렌더링 → 로컬 네트워크 저장 |

### 데이터 흐름

```
[Row 1: Input Pipeline]
GFX Simulator ──JSON──▶ NAS Sync ──REST API──▶ Supabase DB
                                                    │
                                              Realtime
                                                    ▼
[Row 2: Output Pipeline]
AE-Nexrender ◀──Render Job── Sub Dashboard ◀──WebSocket── Main Dashboard
```

---

## 3. 핵심 기능

### P0 (MVP) - 구현 완료
| 기능 | 상태 |
|------|------|
| 프로젝트 노드 맵 (6개) | Done |
| PRD 진행률 표시 | Done |
| 관계 엣지 연결 | Done |
| 줌/팬 컨트롤 | Done |
| 사이드바 (프로젝트 목록/요약) | Done |
| 상세 패널 (선택 시) | Done |
| 데이터 흐름 애니메이션 | Done |

### P1 (v2.0) - 구현 완료
| 기능 | 상태 |
|------|------|
| 좌측/우측 패널 토글 버튼 | Done |
| 우측 패널 기본 닫힘 (노드 선택 시 열림) | Done |
| 노드 선택 시 확대(zoom) 제거 | Done |
| Edge 수정 기능 (연결/삭제) | Done |
| GitHub 프로그레스바 (이슈/커밋 기반 난이도) | Done |
| 마지막 이슈/커밋 표시 | Done |

### P2 (진행중)
| 기능 | 상태 |
|------|------|
| Edge 저장 (localStorage) | Done |
| Edge 저장 (Supabase 연동) | Pending |
| GitHub API 실시간 연동 | Done |
| Health Check 서비스 | Pending |
| 실시간 업데이트 (WebSocket) | Pending |

---

## 4. 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| Framework | React | 18.3.1 |
| 시각화 | React Flow (@xyflow/react) | 12.3.6 |
| Language | TypeScript | 5.7.2 |
| 상태관리 | Zustand | 5.0.2 |
| 데이터 페칭 | TanStack Query | 5.62.8 |
| 스타일 | Tailwind CSS | 3.4.17 |
| 빌드 | Vite | 6.0.6 |
| DB (선택적) | Supabase | - |

---

## 5. 프로젝트 구조

```
C:\claude\automation_orchestration\app\
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── types/
│   │   ├── project.ts          # Project, GitHubStats 타입
│   │   ├── nodes.ts
│   │   └── edges.ts
│   ├── components/
│   │   ├── nodes/
│   │   │   └── ProjectNode.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx      # 토글 기능 추가
│   │   │   └── DetailPanel.tsx  # 토글 + GitHub 프로그레스바
│   │   └── ui/
│   │       ├── ProgressBar.tsx
│   │       └── StatusDot.tsx
│   ├── stores/
│   │   └── uiStore.ts           # 사이드바/패널 토글 상태
│   ├── services/                 # 새로 추가
│   │   ├── supabase.ts          # Edge CRUD (선택적)
│   │   ├── github.ts            # GitHub API 연동
│   │   └── index.ts
│   ├── hooks/                    # 새로 추가
│   │   ├── useEdges.ts
│   │   ├── useGitHubStats.ts
│   │   └── index.ts
│   └── data/
│       ├── projects.ts          # 6개 프로젝트 (githubUrl 포함)
│       ├── initialNodes.ts      # 6개 노드
│       └── initialEdges.ts      # 5개 엣지
└── .env.local (선택적)
```

---

## 6. UI/UX 디자인

### 컬러 시스템 (Black & White)
| 요소 | 색상 |
|------|------|
| Background | #FFFFFF |
| Border/Text | #000000 |
| Secondary Text | #666666 |
| Progress Fill | #000000 |
| Progress Empty | #EEEEEE |

### GitHub 난이도 색상
| 난이도 | 색상 | 기준 |
|--------|------|------|
| Low | Green (#22c55e) | score < 5 |
| Medium | Yellow (#eab308) | 5 ≤ score < 15 |
| High | Red (#ef4444) | score ≥ 15 |
| Unknown | Gray (#9ca3af) | GitHub 미연동 |

*score = (이슈 수 × 2) + 최근 7일 커밋 수*

### 레이아웃
- Header (48px): 제목 + 상태/리프레시 버튼
- Sidebar (180px/40px): 프로젝트 목록, 요약, 서비스 상태 (토글 가능)
- Canvas (flex): React Flow 노드 그래프
- Detail Panel (280px/40px): 선택된 프로젝트 상세 정보 (토글 가능)

---

## 7. 환경 설정 (선택적)

### .env.local
```
# Supabase (Edge 저장용)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# GitHub API (Rate Limit 증가용)
VITE_GITHUB_TOKEN=ghp_xxx
```

### 의존성 설치 (Supabase 사용 시)
```bash
npm install @supabase/supabase-js
```

---

## 8. 실행 방법

```bash
cd C:\claude\automation_orchestration\app
npm install
npm run dev
# http://localhost:5174 에서 접속
```

---

## 9. 검증 방법

1. **노드 구조 검증**
   - 6개 프로젝트 노드 렌더링 확인
   - NAS-Supabase Sync 노드 제거 확인

2. **UI 토글 검증**
   - 좌측 사이드바 토글 동작 (180px ↔ 40px)
   - 우측 패널 기본 닫힘 + 노드 선택 시 열림
   - 노드 클릭 시 zoom 없음

3. **Edge 편집 검증**
   - 노드 핸들에서 드래그하여 새 연결 생성
   - Edge 선택 후 Delete/Backspace로 삭제

4. **GitHub 프로그레스바 검증**
   - 각 노드 선택 시 이슈/커밋 수 표시
   - 난이도 색상 표시 (low=green, medium=yellow, high=red)
   - 마지막 커밋/이슈 메시지 표시
   - GitHub 링크 동작

---

## 10. 관련 문서

| 문서 | 위치 |
|------|------|
| HTML 목업 | `docs/mockups/overview-dashboard.html` |
| 아키텍처 분석 | `docs/ARCHITECTURE_ANALYSIS.md` |
| 프로젝트 현황 | `docs/AUTOMATION_PROJECTS_REPORT.md` |
| 구현 계획 | `C:\Users\AidenKim\.claude\plans\fluffy-popping-hejlsberg.md` |

---

## 11. Changelog

### v2.0.0 (2026-01-16)
- 노드 구조 변경: 7개 → 6개 (NAS-Supabase Sync 제거)
- 노드별 GitHub URL 연동
- 좌측/우측 패널 토글 기능 추가
- 노드 선택 시 확대 제거, 상세 패널 자동 열림
- Edge 편집 기능 추가 (연결/삭제)
- GitHub 프로그레스바 추가 (이슈/커밋 기반 난이도)
- 마지막 이슈/커밋 메시지 표시
- Supabase Edge 저장 서비스 추가 (선택적)

### v1.0.0 (2026-01-15)
- MVP 구현 완료
- React Flow 노드 그래프 구현
- Black & White 테마 적용
- 사이드바/상세패널 구현
