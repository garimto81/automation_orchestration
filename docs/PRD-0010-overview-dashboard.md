# PRD-0010: Automation Projects Overview Dashboard

**번호**: PRD-0010
**작성일**: 2026-01-15
**상태**: In Progress
**버전**: 1.0.0
**위치**: `C:\claude\automation_orchestration\app`

---

## 1. Executive Summary

전체 8개 automation 프로젝트의 진행 상황을 React Flow 기반 노드 그래프로 시각화하는 대시보드입니다. Black & White 테마로 깔끔한 UI를 제공하며, 프로젝트 간 관계, PRD 진행률, 서비스 상태, GitHub 활동을 통합 표시합니다.

---

## 2. 문제 정의

### 현재 상황
- 8개 automation 프로젝트가 독립적으로 운영
- 전체 진행률/상태를 한눈에 파악 불가
- 프로젝트 간 관계와 데이터 흐름 시각화 부재

### 해결 방안
- React Flow 노드 그래프로 프로젝트 관계 시각화
- 확대/축소 기능으로 상세도 조절
- PRD 진행률, 서비스 상태, GitHub 활동 통합 표시

---

## 3. 핵심 기능

### P0 (MVP) - 구현 완료
| 기능 | 상태 |
|------|------|
| 프로젝트 노드 맵 (8개) | Done |
| PRD 진행률 표시 | Done |
| 관계 엣지 연결 | Done |
| 줌/팬 컨트롤 | Done |
| 사이드바 (프로젝트 목록/요약) | Done |
| 상세 패널 (선택 시) | Done |

### P1 (예정)
| 기능 | 상태 |
|------|------|
| GitHub API 연동 (실시간) | Pending |
| Health Check 서비스 | Pending |
| 데이터 흐름 애니메이션 | Done |

### P2 (향후)
- 줌 레벨별 상세도
- 실시간 업데이트 (WebSocket)
- 히스토리 뷰

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
│   │   ├── project.ts
│   │   ├── nodes.ts
│   │   └── edges.ts
│   ├── components/
│   │   ├── nodes/
│   │   │   └── ProjectNode.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── DetailPanel.tsx
│   │   └── ui/
│   │       ├── ProgressBar.tsx
│   │       └── StatusDot.tsx
│   ├── stores/
│   │   └── uiStore.ts
│   └── data/
│       ├── projects.ts
│       ├── initialNodes.ts
│       └── initialEdges.ts
└── server/ (예정)
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

### 레이아웃
- Header (48px): 제목 + 상태/리프레시 버튼
- Sidebar (180px): 프로젝트 목록, 요약, 서비스 상태
- Canvas (flex): React Flow 노드 그래프
- Detail Panel (280px): 선택된 프로젝트 상세 정보

---

## 7. 실행 방법

```bash
cd C:\claude\automation_orchestration\app
npm install
npm run dev
# http://localhost:5174 에서 접속
```

---

## 8. 검증 방법

1. **기능 검증**
   - 8개 프로젝트 노드 렌더링 확인
   - 노드 클릭 시 상세 패널 표시
   - 줌/팬 동작 확인
   - 사이드바 프로젝트 선택 동작

2. **성능**
   - 초기 로딩 < 2초
   - 줌/팬 60fps 유지

---

## 9. 관련 문서

| 문서 | 위치 |
|------|------|
| HTML 목업 | `docs/mockups/overview-dashboard.html` |
| 아키텍처 분석 | `docs/ARCHITECTURE_ANALYSIS.md` |
| 프로젝트 현황 | `docs/AUTOMATION_PROJECTS_REPORT.md` |

---

## 10. Changelog

### v1.0.0 (2026-01-15)
- MVP 구현 완료
- React Flow 노드 그래프 구현
- Black & White 테마 적용
- 사이드바/상세패널 구현
