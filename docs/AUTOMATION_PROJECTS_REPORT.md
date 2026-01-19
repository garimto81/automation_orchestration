# Automation 프로젝트 구조 분석 보고서

> **관련 문서**
> - [6-모듈 파이프라인 아키텍처](GFX_PIPELINE_ARCHITECTURE.md) - 모듈별 역할 상세
> - [DB 스키마 상세 설계](architecture.md) - DDL, ERD, Enum 타입
> - [아키텍처 요약](ARCHITECTURE_ANALYSIS.md) - Executive Summary
> - [프로젝트 관계도](PROJECT_RELATIONSHIPS.md) - 프로젝트 간 의존성

---

## 개요

`C:\claude` 하위에 **8개의 automation 프로젝트** + **2개의 연관 프로젝트**가 존재하며, 모두 **WSOP 포커 방송 자동화**라는 공통 목표를 위해 설계되었습니다.

---

## 프로젝트 전체 현황

| 프로젝트 | 상태 | 목적 | 기술 스택 | 모듈 |
|---------|------|------|---------|------|
| **automation_ae** | ✅ 활성 | After Effects 자동 렌더링 | Python FastAPI, React, PostgreSQL, Nexrender | Module 6 |
| **automation_dashboard** | 🔄 개발 중 | Main/Sub Dashboard UI | React 18, TypeScript, Zustand, WebSocket | Module 4/5 |
| **automation_feature_table** | ✅ 활성 | 포커 핸드 자동 캡처 | Python, PokerGFX API, Gemini AI | Module 1 |
| **automation_hub** | ✅ 활성 | 공유 인프라 (DB, 모델) | Python, PostgreSQL/Supabase, Pydantic | Module 2 |
| **automation_schema** | 🔄 개발 중 | Supabase DB 스키마 관리 | PostgreSQL, Supabase CLI | Module 3 |
| **automation_sub** | ✅ 활성 | PRD 관리 및 스크립트 | Python, Google Docs API | - |
| **automation_ae_switcher** | 📋 PRD만 | AE 모드 전환 | (automation_ae에 구현됨) | - |
| **automation_orchestration** | 📂 문서 허브 | 아키텍처 문서 저장소 + 모니터링 | Markdown | - |

### 연관 프로젝트

| 프로젝트 | 상태 | 역할 | 연관 대상 |
|---------|------|------|---------|
| **ae_nexrender_module** | ✅ 활성 | AE 렌더링 Worker 실행기 | automation_ae |
| **gfx_json** | ✅ **완성** | GFX Sync Agent v3.0 (NAS→Supabase) | Supabase (독립) |

> **gfx_json 분석 결과**: 프로덕션 준비 완료 (100%). automation_hub 통합 불필요 - 독립 운영.

---

## 1. automation_orchestration (현재 작업 디렉토리)

**경로**: `C:\claude\automation_orchestration`

**상태**: 📂 문서 허브 (활성)

### 역할

| 역할 | 설명 |
|------|------|
| 아키텍처 문서 | 전체 시스템 설계 문서 중앙 관리 |
| 모니터링 | 다른 automation_* 프로젝트 현황 조망 |
| 실제 구현 | ❌ 없음 (다른 프로젝트에서 수행) |

### 문서 현황

| 문서 | 용도 |
|------|------|
| `architecture.md` | 5계층 DB 스키마 상세 설계 (DDL, ERD) |
| `GFX_PIPELINE_ARCHITECTURE.md` | 5계층 파이프라인 역할 상세 |
| `ARCHITECTURE_ANALYSIS.md` | 아키텍처 Executive Summary |
| `AUTOMATION_PROJECTS_REPORT.md` | 7개 프로젝트 현황 보고서 (본 문서)

---

## 2. automation_dashboard (Module 4/5)

**경로**: `C:\claude\automation_dashboard`

**상태**: 🔄 개발 중 **(50% 완성 - 아키텍처 완료, UI 미완성)**

### 역할

| 역할 | 설명 | 완성도 |
|------|------|--------|
| Main Dashboard | 연출 의사결정 (What/When) - 핸드 브라우저, 큐시트 편집 | 40% |
| Sub Dashboard | 자막 출력 실행 (How) - 컴포지션 선택, 렌더 큐 관리 | 60% |
| WebSocket 서버 | Main ↔ Sub 실시간 통신 (포트 3001) | 50% |

### 완성된 부분
- ✅ 전체 타입 시스템 (8개 모듈, 26개 컴포지션)
- ✅ WebSocket 서버 (메시지 라우팅, Heartbeat)
- ✅ RenderQueueStore (작업 관리, 우선순위)
- ✅ 레이아웃 컴포넌트 (Header, Sidebar)
- ✅ E2E 테스트 구조 (Playwright)

### 미완성 부분
- ❌ WebSocket 클라이언트 실제 구현
- ❌ Supabase Realtime 연동
- ❌ 기능 컴포넌트 UI (player-grid, composition-grid 등)
- ❌ After Effects 렌더 호출 연동

### 폴더 구조
```
automation_dashboard/
├── src/
│   ├── components/
│   │   ├── layout/          # Header, Sidebar, MainContent
│   │   └── features/        # player-grid, cuesheet, render-queue
│   ├── stores/              # Zustand (8개 Store)
│   ├── types/               # TypeScript 타입 (8개 모듈)
│   └── lib/websocket/       # WebSocket 서버/클라이언트
├── tests/e2e/               # Playwright E2E 테스트
└── playwright.config.ts
```

### 기술 스택
- React 18.3, TypeScript 5.6, Vite 5.4
- Zustand 5.0 (상태 관리)
- WebSocket (ws 라이브러리, 포트 3001)
- Supabase 2.46 (계획됨)
- Playwright 1.48 (E2E 테스트)

---

## 3. automation_schema (신규)

**경로**: `C:\claude\automation_schema`

**상태**: 🔄 개발 중 (Module 3)

### 역할

| 역할 | 설명 |
|------|------|
| DB 스키마 관리 | GFX JSON + WSOP+ + Manual 통합 스키마 |
| 마이그레이션 | Supabase 마이그레이션 파일 관리 |
| 스키마 분석 | 테이블 구조 분석 및 문서화 |

### 폴더 구조
```
automation_schema/
├── scripts/                 # 스키마 분석 스크립트
├── supabase/                # Supabase CLI 설정
├── docs/                    # 스키마 문서
├── schema_dump.sql          # DB 전체 덤프 (197KB)
└── schema_analysis_report.md # 분석 보고서
```

### 기술 스택
- PostgreSQL, Supabase CLI
- Python 분석 스크립트

---

## 4. automation_ae_switcher

**경로**: `C:\claude\automation_ae_switcher`

**상태**: 📋 PRD 문서만 보관 (실제 구현은 automation_ae에 통합)

### 폴더 구조
```
automation_ae_switcher/
└── docs/
    └── 0007-prd-ae-mode-switcher.md  # PRD 문서
```

### 목적
After Effects 렌더링 모드 ↔ 편집 모드 자동 전환

| 기능 | 설명 |
|------|------|
| Edit 모드 | Worker 중지 + 라이선스 파일 제거 → AE 편집 가능 |
| Render 모드 | 라이선스 생성 + Worker 시작 → 자동 렌더링 |

**실제 구현 위치**:
- `C:\claude\automation_ae\scripts\ae_mode_manager.py`
- `C:\claude\automation_ae\tools\ae_mode_toggle.py`

---

## 5. 관련 활성 프로젝트

### 5.1 automation_ae (Module 6)

**경로**: `C:\claude\automation_ae`

```
automation_ae/
├── backend/              # FastAPI 서버
│   ├── app/api/v1/       # REST API
│   ├── app/models/       # SQLAlchemy ORM
│   └── app/services/     # 비즈니스 로직
├── frontend/             # React + TypeScript
├── templates/            # AE 템플릿 저장소
├── output/               # 렌더링 결과
└── scripts/              # ae_mode_manager.py 포함
```

**기술 스택**: FastAPI, SQLAlchemy, React 18, TypeScript, Nexrender

### 5.2 automation_hub (Module 2)

**경로**: `C:\claude\automation_hub`

```
automation_hub/
├── shared/
│   ├── models/           # Pydantic 모델 (Hand, Tournament, RenderInstruction)
│   └── db/               # PostgreSQL Repository 패턴
├── schemas/v1/           # JSON Schema
└── monitor/              # FastAPI 모니터링
```

**역할**: 모든 프로젝트가 공유하는 중앙 데이터베이스 및 모델

### 5.3 automation_feature_table (Module 1)

**경로**: `C:\claude\automation_feature_table`

```
automation_feature_table/
└── src/
    ├── primary/          # PokerGFX RFID 연동
    ├── secondary/        # Gemini AI Video 분석
    ├── fusion/           # Primary/Secondary 융합
    ├── grading/          # 핸드 등급 분류
    └── vmix/             # vMix 녹화 관리
```

**역할**: 핸드 시작/종료 자동 감지, 등급 분류 (Royal Flush ~ High Card)

### 5.4 automation_sub (PRD 관리)

**경로**: `C:\claude\automation_sub`

```
automation_sub/
├── tasks/prds/           # PRD 문서 7개
├── scripts/supabase/     # Supabase 관리
└── docs/mockups/         # HTML 목업
```

---

## 6. 연관 프로젝트

### 6.1 ae_nexrender_module

**경로**: `C:\claude\ae_nexrender_module`

**상태**: ✅ 활성

### 역할

| 역할 | 설명 |
|------|------|
| 렌더링 Worker | After Effects 렌더링 실제 실행 |
| API 서버 | 렌더링 요청 수신 및 처리 |
| Docker 지원 | 컨테이너 기반 렌더링 환경 |

### 연관 관계
- **automation_ae** → 렌더링 요청 전송 → **ae_nexrender_module** 실행
- render_jobs 테이블 폴링하여 작업 처리

### 기술 스택
- Python, FastAPI, Docker
- Nexrender, After Effects

---

### 6.2 gfx_json (GFX Sync Agent v3.0)

**경로**: `C:\claude\gfx_json`

**상태**: ✅ **프로덕션 준비 완료 (100% 완성)**

### 역할

| 역할 | 완성도 | 설명 |
|------|--------|------|
| JSON 파싱 | 100% | PascalCase, snake_case, camelCase 모두 지원 |
| NAS 폴링 감시 | 100% | SMB 호환, 다중 PC 지원 (pc_registry.json) |
| Supabase 동기화 | 100% | Rate Limit 처리, 지수 백오프 |
| 배치 처리 | 100% | 500건/5초 최적화 |
| 오프라인 큐 | 100% | SQLite 기반 장애 복구 |
| 모니터링 대시보드 | 100% | Next.js 14 + Tailwind CSS |

### 아키텍처
```
여러 GFX PC → NAS (SMB) → gfx_json (Sync Agent) → Supabase Cloud
                              │
                              ├── PollingWatcher (2초 주기)
                              ├── Batch Queue (500건/5초)
                              ├── Offline Queue (SQLite)
                              └── httpx 비동기 HTTP
```

### automation_hub 관계
- ❌ **통합 불필요** - 완전 독립 운영
- Supabase 클라우드만 공유 (데이터 저장소)
- 자체 설정/큐/클라이언트 완전 구현

### 기술 스택
- Python, Pydantic v2, aiosqlite
- httpx (비동기 HTTP, supabase-py 대체)
- Watchdog (NAS/SMB 호환 폴링)
- Next.js 14 (대시보드)
- Docker (Synology NAS 배포)

---

## 7. 통합 데이터 파이프라인

```
┌────────────────────────────────────────────────────────────────┐
│              WSOP 방송 자동화 완전 파이프라인                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [데이터 수집]                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ PokerGFX    │  │ WSOP+ CSV   │  │ 수작업 입력  │         │
│  │ (RFID)      │  │ (배치)      │  │ (UI/API)    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────┬───────┴────────────────┘                 │
│                  ▼                                          │
│  [중앙 저장소]                                               │
│         ┌─────────────────────┐                             │
│         │  automation_hub     │                             │
│         │  PostgreSQL/Supabase│                             │
│         └──────────┬──────────┘                             │
│                    │                                        │
│         ┌──────────┼──────────┐                             │
│         ▼          ▼          ▼                             │
│  [대시보드]                                                  │
│  ┌─────────────┐ ┌──────────────┐                          │
│  │ Main Dash   │ │ Sub Dash     │                          │
│  │ (연출팀)    │ │ (자막팀)     │                          │
│  │ automation_ │ │ automation_  │                          │
│  │ dashboard   │ │ dashboard    │                          │
│  └──────┬──────┘ └──────┬───────┘                          │
│         └────────┬──────┘                                  │
│                  ▼                                          │
│  [렌더링]                                                   │
│  ┌─────────────────────────────────────────────┐           │
│  │ automation_ae + ae_nexrender_module          │           │
│  │ (렌더링 서버)     (렌더링 Worker)            │           │
│  └──────────────────────┬──────────────────────┘           │
│                         ▼                                   │
│                 ┌──────────────┐                           │
│                 │ After Effects│                           │
│                 │ (동적 렌더링) │                           │
│                 └──────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 기술 스택 요약

### Python
- Python 3.11+, Pydantic v2, FastAPI
- pytest, ruff, mypy
- SQLAlchemy 2.0 (async)

### Node.js
- React 18, TypeScript
- TanStack Query, Tailwind CSS, Vite
- Playwright (E2E)

### Database
- PostgreSQL (Local: Docker)
- Supabase (Production)

### 방송/그래픽
- After Effects (Nexrender)
- PokerGFX, vMix

---

## 9. 결론

| 항목 | 내용 |
|------|------|
| **전체 프로젝트** | 8개 automation 프로젝트 + 2개 연관 프로젝트 |
| **활성** | 4개 (hub, ae, feature_table, sub) |
| **개발 중** | 2개 (dashboard, schema) |
| **문서 허브** | 1개 (orchestration) |
| **PRD 문서만** | 1개 (ae_switcher) |
| **연관 프로젝트** | 2개 (ae_nexrender_module, gfx_json) |
| **핵심 목표** | WSOP 포커 방송 완전 자동화 |
| **아키텍처** | 6-모듈 파이프라인 |
| **통합 패턴** | Hub-and-Spoke (중앙 DB 연결) |

### 프로젝트 완성도 현황

| 프로젝트 | 완성도 | 상태 |
|---------|--------|------|
| gfx_json | **100%** | ✅ 프로덕션 준비 완료 |
| automation_ae | **92%** | 🔄 개발 중 |
| automation_hub | **85-90%** | 🔄 개발 중 |
| automation_schema | **85%** | 🔄 개발 중 |
| automation_feature_table | **82%** | 🔄 개발 중 |
| ae_nexrender_module | **78%** | 🔄 개발 중 |
| automation_dashboard | **50%** | 🔄 초기 구현 |
| automation_sub | **45%** | 📋 설계 완료 |
| automation_ae_switcher | **5-10%** | 📄 PRD만 |

**automation_orchestration**은 전체 시스템 아키텍처 문서를 관리하는 중앙 문서 허브로 운영됩니다.

---

## 10. 모듈-프로젝트 매핑

| 모듈 | 프로젝트 | 역할 |
|------|---------|------|
| Module 1 | automation_feature_table | GFX 시뮬레이터 |
| Module 2 | **gfx_json** (독립) | GFX-NAS-Supabase Sync (100% 완성) |
| Module 3 | automation_schema | Supabase DB Schema |
| Module 4 | automation_dashboard (Main) | Main Dashboard |
| Module 5 | automation_dashboard (Sub) | Sub Dashboard |
| Module 6 | automation_ae + ae_nexrender_module | AE-Nexrender |

---

*최종 업데이트: 2026-01-19*
