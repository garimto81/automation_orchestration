# Automation 프로젝트 관계도

> **관련 문서**
> - [프로젝트 현황](AUTOMATION_PROJECTS_REPORT.md) - 전체 프로젝트 상세
> - [6-모듈 파이프라인](GFX_PIPELINE_ARCHITECTURE.md) - 모듈별 역할
> - [아키텍처 요약](ARCHITECTURE_ANALYSIS.md) - Executive Summary

---

## 1. 프로젝트 개요

### 1.1 Automation 프로젝트 (8개)

| 프로젝트 | 경로 | 모듈 | 역할 |
|---------|------|------|------|
| automation_ae | C:\claude\automation_ae | Module 6 | AE 렌더링 서버 |
| automation_ae_switcher | C:\claude\automation_ae_switcher | - | AE 모드 전환 (PRD) |
| automation_dashboard | C:\claude\automation_dashboard | Module 4/5 | Main/Sub Dashboard |
| automation_feature_table | C:\claude\automation_feature_table | Module 1 | GFX 핸드 캡처 |
| automation_hub | C:\claude\automation_hub | Module 2 | 공유 인프라 (DB, API) |
| automation_orchestration | C:\claude\automation_orchestration | - | 아키텍처 문서 허브 |
| automation_schema | C:\claude\automation_schema | Module 3 | Supabase DB 스키마 |
| automation_sub | C:\claude\automation_sub | - | PRD 관리 |

### 1.2 연관 프로젝트 (2개)

| 프로젝트 | 경로 | 역할 | 연관 대상 | 완성도 |
|---------|------|------|---------|--------|
| ae_nexrender_module | C:\claude\ae_nexrender_module | 렌더링 Worker | automation_ae | 활성 |
| gfx_json | C:\claude\gfx_json | **GFX Sync Agent v3.0** | Supabase (독립) | **100% 완성** |

> **gfx_json 상세**: NAS 중앙 관리 GFX JSON → Supabase 동기화 시스템. 프로덕션 준비 완료.
> automation_hub와 **독립적으로 운영** (Supabase 클라우드만 공유).

---

## 2. 의존성 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WSOP 방송 자동화 프로젝트 관계도                    │
└─────────────────────────────────────────────────────────────────────┘

                        [문서 허브]
                    automation_orchestration
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
        [PRD 관리]     [스키마 관리]    [모니터링]
     automation_sub   automation_schema   (문서)
            │               │
            │               │ DDL 제공
            │               ▼
            │        ┌─────────────────────┐
            │        │   automation_hub    │     gfx_json (독립 운영)
            │        │   (공유 인프라)     │         ↓
            │        │   Module 2          │     Supabase 직접 연동
            │        └────────┬────────────┘
            │                 │
            │    ┌────────────┼────────────┐
            │    │            │            │
            ▼    ▼            ▼            ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────────────────┐
│ automation_      │  │ automation_  │  │     automation_ae        │
│ feature_table    │  │ dashboard    │  │     (렌더링 서버)         │
│ (GFX 캡처)       │  │ (Main/Sub)   │  │     Module 6             │
│ Module 1         │  │ Module 4/5   │  └────────────┬─────────────┘
└────────┬─────────┘  └──────┬───────┘               │
         │                   │                       │
         │ JSON 생성         │ 큐시트/렌더 요청       │ 렌더 실행 위임
         │                   │                       │
         ▼                   │                       ▼
    ┌─────────┐              │            ┌──────────────────────────┐
    │   NAS   │◄─────────────┘            │   ae_nexrender_module    │
    │ (JSON)  │                           │   (렌더링 Worker)        │
    └─────────┘                           └────────────┬─────────────┘
                                                       │
                                                       ▼
                                               ┌──────────────┐
                                               │After Effects │
                                               └──────────────┘
```

---

## 3. 데이터 흐름 매트릭스

### 3.1 READ/WRITE 권한

| From \ To | automation_hub | automation_schema | automation_ae | automation_dashboard |
|-----------|----------------|-------------------|---------------|---------------------|
| **automation_feature_table** | ← 쓰기 (GFX) | - | - | - |
| **automation_schema** | ← 쓰기 (DDL) | - | - | - |
| **automation_hub** | - | 읽기 | ← 읽기 | ← 읽기/쓰기 |
| **automation_ae** | 읽기 | 읽기 | - | ← 쓰기 (render_jobs) |
| **automation_dashboard** | ← 읽기/쓰기 | 읽기 | - | - |
| **gfx_json** | ← 쓰기 | - | - | - |
| **ae_nexrender_module** | 읽기 | - | ← 실행 | - |

### 3.2 통신 방식

| From | To | 방식 | 용도 |
|------|-----|------|------|
| automation_feature_table | NAS | 파일 쓰기 | GFX JSON 저장 |
| gfx_json | automation_hub | Supabase API | JSON 동기화 |
| automation_hub | automation_dashboard | Supabase Realtime | 데이터 변경 알림 |
| automation_dashboard (Main) | automation_dashboard (Sub) | WebSocket | 큐 아이템 선택 |
| automation_dashboard | automation_ae | Supabase INSERT | render_jobs 생성 |
| automation_ae | ae_nexrender_module | API 호출 | 렌더링 실행 |
| ae_nexrender_module | NAS | 파일 쓰기 | 렌더링 출력 |

---

## 4. 모듈-프로젝트 매핑

### 4.1 6-모듈 아키텍처

```
[Module 1] GFX Simulator
     └── automation_feature_table
          │
          ▼ JSON (NAS)

[Module 2] GFX-NAS-Supabase Sync
     └── automation_hub + gfx_json
          │
          ▼ Supabase INSERT

[Module 3] Supabase DB Schema
     └── automation_schema
          │
          ▼ Realtime Broadcast

[Module 4] Main Dashboard          [Module 5] Sub Dashboard
     └── automation_dashboard           └── automation_dashboard
          │                                  │
          └──── WebSocket ────────┬──────────┘
                                  │
                                  ▼ render_jobs INSERT

[Module 6] AE-Nexrender
     └── automation_ae + ae_nexrender_module
          │
          ▼ Output (NAS)
```

### 4.2 프로젝트별 책임

| 프로젝트 | 책임 | 비책임 |
|---------|------|--------|
| automation_feature_table | GFX JSON 생성, 핸드 등급 분류 | DB 저장 |
| gfx_json | JSON 파싱, Supabase 동기화 | UI |
| automation_hub | 공유 모델, DB Repository, API | UI, 렌더링 |
| automation_schema | 스키마 DDL, 마이그레이션 | 비즈니스 로직 |
| automation_dashboard | UI, 큐시트, 렌더 요청 | 렌더링 실행 |
| automation_ae | 렌더 큐 관리, 템플릿 관리 | 렌더링 실행 |
| ae_nexrender_module | 렌더링 실행 | 큐 관리 |

---

## 5. 연관 프로젝트 상세

### 5.1 ae_nexrender_module

**역할**: After Effects 렌더링 실제 실행

```
automation_ae (렌더링 서버)
      │
      │ POST /render
      ▼
ae_nexrender_module (Worker)
      │
      │ aerender.exe 호출
      ▼
After Effects
      │
      │ 출력 파일 생성
      ▼
NAS (\\nas\renders)
```

**기술 스택**:
- Python, FastAPI
- Docker
- Nexrender
- After Effects CLI (aerender.exe)

### 5.2 gfx_json (GFX Sync Agent v3.0)

**역할**: NAS 중앙 관리 GFX JSON → Supabase 실시간 동기화

**상태**: **프로덕션 준비 완료 (100% 완성)**

```
여러 GFX PC
      │
      │ JSON 파일 생성
      ▼
NAS Storage Layer
├── config/pc_registry.json    ← PC 등록 정보
├── PC01/hands/                ← GFX PC1 폴더
├── PC02/hands/                ← GFX PC2 폴더
└── _error/                    ← 파싱 실패 파일 격리
      │
      │ PollingWatcher (2초 주기)
      ▼
gfx_json (Sync Agent)
├── JSON Parser (다양한 형식 지원)
├── Batch Queue (500건/5초)
├── Offline Queue (SQLite)
└── httpx 비동기 HTTP 클라이언트
      │
      │ Supabase REST API
      ▼
Supabase Cloud (gfx_sessions 테이블)
```

**핵심 기능**:
| 기능 | 완성도 | 설명 |
|------|--------|------|
| GFX JSON 파싱 | 100% | PascalCase, snake_case, camelCase 모두 지원 |
| NAS 폴링 감시 | 100% | SMB 호환, 다중 PC 지원 |
| Supabase 동기화 | 100% | Rate Limit 처리, 지수 백오프 |
| 배치 처리 | 100% | 500건/5초 최적화 |
| 오프라인 큐 | 100% | SQLite 기반 장애 복구 |
| 대시보드 | 100% | Next.js 14 모니터링 UI |

**기술 스택**:
- Python, Pydantic v2, aiosqlite
- httpx (비동기 HTTP)
- Watchdog (NAS/SMB 호환)
- Next.js 14 (대시보드)
- Docker (NAS 배포)

**automation_hub 관계**:
- ❌ 통합 불필요 - 완전 독립 운영
- Supabase 클라우드만 공유 (데이터 저장소)
- 자체 설정/큐/클라이언트 완전 구현

---

## 6. 프로젝트 완성도 현황

| 프로젝트 | 완성도 | 상태 | 비고 |
|---------|--------|------|------|
| gfx_json | **100%** | ✅ 프로덕션 준비 완료 | Sync Agent v3.0, 독립 운영 |
| automation_ae | **92%** | 🔄 개발 중 | FastAPI + React, ae_nexrender_module 완전 통합 |
| automation_hub | **85-90%** | 🔄 개발 중 | 8 Pydantic 모델, 4 Repository, 6 마이그레이션 |
| automation_schema | **85%** | 🔄 개발 중 | 22 마이그레이션, 6 스키마, SSOT 문서 시스템 |
| automation_feature_table | **82%** | 🔄 개발 중 | 14,259줄, 735 테스트, Fusion Engine |
| ae_nexrender_module | **78%** | 🔄 개발 중 | 폴링 워커, GFX→Nexrender 변환 |
| automation_dashboard | **50%** | 🔄 초기 구현 | 아키텍처 완료, UI 미완성 |
| automation_sub | **45%** | 📋 설계 완료 | 7 PRD, 25 테이블, 구현 0% |
| automation_ae_switcher | **5-10%** | 📄 PRD만 | 실제 구현은 automation_ae에 존재 |
| automation_orchestration | **문서** | 📚 문서 허브 | 아키텍처 문서 관리 |

### 6.1 프로젝트별 상세 분석

#### automation_hub (85-90%)

| 구성 요소 | 완성도 | 내용 |
|----------|--------|------|
| Pydantic 모델 | 100% | GfxSession, Tournament, Player 등 8개 |
| Repository 패턴 | 100% | SQLAlchemy Async + CRUD 추상화 |
| 마이그레이션 | 100% | 6개 버전 관리 |
| API 엔드포인트 | 80% | FastAPI 기반 |
| 문서화 | 70% | 타입 힌트 + docstring |

#### automation_ae (92%)

| 구성 요소 | 완성도 | 내용 |
|----------|--------|------|
| FastAPI 백엔드 | 95% | 렌더 큐 관리, 템플릿 API |
| React 프론트엔드 | 90% | 관리 UI, 상태 모니터링 |
| ae_nexrender_module 통합 | 100% | API 기반 Worker 호출 |
| 에러 처리 | 85% | 재시도 로직, 로깅 |

#### automation_schema (85%)

| 구성 요소 | 완성도 | 내용 |
|----------|--------|------|
| 마이그레이션 | 100% | 22개 버전 (20250113~20250118) |
| 스키마 분리 | 100% | json, wsop_plus, manual, ae, public, config |
| RLS 정책 | 80% | 주요 테이블 적용 |
| SSOT 문서 | 100% | `docs/WSOP+ DB.md`, `docs/Manual DB.md` |

#### automation_feature_table (82%)

| 구성 요소 | 완성도 | 내용 |
|----------|--------|------|
| Primary (PokerGFX) | 95% | WebSocket + NAS 파일 모드 지원 |
| Fusion Engine | 90% | Primary/Secondary Cross-validation |
| Hand Grader | 95% | A/B/C 등급 기준 (3단계 조건) |
| Secondary (Gemini) | 85% | AI 비디오 분석, 정확도 개선 필요 |
| Dashboard 모니터링 | 75% | WebSocket 기본 구현, UI 미완성 |
| Sync Agent | 70% | 배치 큐 기본, 에러 처리 개선 필요 |
| 테스트 | 85% | 735개 테스트 함수, 커버리지 72% |

> **특징**: 이중화 아키텍처 (Primary RFID 100% + Secondary AI 보조), 자동 장애 대응

#### ae_nexrender_module (78%)

| 구성 요소 | 완성도 | 내용 |
|----------|--------|------|
| Core Library | 95% | types, client, job_builder, path_utils |
| Polling Worker | 90% | 적응형 폴링, 5단계 처리, 재시도 로직 |
| Job Builder | 95% | GFX → Nexrender Job JSON 변환 |
| Error Classifier | 100% | 재시도 가능/불가 에러 분류 |
| API Server | 70% | FastAPI 기본 기능, 배치 처리 미흡 |
| 테스트 | 65% | 단위 테스트 O, 통합 테스트 미흡 |

> **특징**: Supabase render_queue 폴링 워커, Docker 경로 자동 변환

#### automation_sub (45%)

| 구성 요소 | 완성도 | 내용 |
|----------|--------|------|
| 문서화 | 95% | 7개 PRD, 상세 스키마 설계 |
| DB 스키마 설계 | 100% | 4-Schema 구조, 25개 테이블 |
| SQL 마이그레이션 | 85% | 13개 파일 (~2000줄), 배포 준비 |
| 자동화 스크립트 | 60% | 16개 스크립트, OAuth 인증 필요 |
| 이미지/비주얼 | 100% | 434개 PNG (자막 디자인, 다이어그램) |
| **구현 코드** | **0%** | ❌ Backend/Frontend 미구현 |

> **상태**: PRD 및 설계만 완료, 실제 구현 단계 미진행

#### automation_ae_switcher (5-10%)

| 구성 요소 | 완성도 | 내용 |
|----------|--------|------|
| PRD 문서 | 100% | 0007-prd-ae-mode-switcher.md |
| 실제 구현 | 0% | ❌ 코드 없음 |

> **중요**: 실제 구현은 `automation_ae/scripts/ae_mode_manager.py` 및 `automation_ae/tools/ae_mode_toggle.py`에 완성되어 있음

---

## 7. 기술 스택 요약

| 프로젝트 | 백엔드 | 프론트엔드 | 데이터베이스 | 기타 |
|---------|--------|-----------|-------------|------|
| automation_hub | FastAPI, SQLAlchemy Async | - | Supabase PostgreSQL | Pydantic v2 |
| automation_ae | FastAPI | React + TypeScript | Supabase | ae_nexrender_module 연동 |
| automation_schema | - | - | Supabase PostgreSQL | 22 Migrations |
| automation_dashboard | - | React + TypeScript | Supabase | WebSocket (port 3001) |
| automation_feature_table | FastAPI, Pydantic v2 | Streamlit | Supabase | phevaluator, Watchdog, Gemini |
| automation_sub | Python (스크립트) | - | Supabase | Google API, Playwright |
| gfx_json | Python, httpx | Next.js 14 | Supabase + SQLite | Watchdog, Docker |
| ae_nexrender_module | FastAPI, asyncio | - | Supabase | Nexrender CLI, Docker |

---

## 8. 업데이트 이력

| 날짜 | 변경 내용 |
|------|---------|
| 2026-01-19 | automation_feature_table, automation_sub, ae_nexrender_module, automation_ae_switcher 심층 분석 반영 |
| 2026-01-19 | 전체 프로젝트 완성도 재평가 (automation_feature_table 82%, ae_nexrender_module 78% 등) |
| 2026-01-19 | automation_hub, automation_ae, automation_schema 심층 분석 반영 |
| 2026-01-19 | 프로젝트별 상세 분석 (6.1절), 기술 스택 요약 (7절) 추가 |
| 2026-01-19 | gfx_json, automation_dashboard 상세 분석 추가 |
| 2026-01-19 | 초기 작성 - 8개 automation + 2개 연관 프로젝트 |

---

*최종 업데이트: 2026-01-19*
