# WSOP 방송 자동화 시스템 문서 허브

> **automation_orchestration** - 10개 프로젝트의 중앙 문서 관리 저장소

---

## 빠른 시작

| 목적 | 문서 |
|------|------|
| 전체 시스템 이해 | [GFX_PIPELINE_ARCHITECTURE.md](./GFX_PIPELINE_ARCHITECTURE.md) |
| 프로젝트 현황 확인 | [AUTOMATION_PROJECTS_REPORT.md](./AUTOMATION_PROJECTS_REPORT.md) |
| DB 스키마 확인 | [architecture.md](./architecture.md) |
| 프로젝트 관계 | [PROJECT_RELATIONSHIPS.md](./PROJECT_RELATIONSHIPS.md) |

### 문서 탐색 가이드 (인과관계 맵)

```
                    ┌─────────────────────────┐
                    │      README.md          │ ← 현재 위치 (마스터 인덱스)
                    │    (Entry Point)        │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌─────────────────────┐    ┌───────────────────┐
│ GFX_PIPELINE_ │    │ AUTOMATION_PROJECTS │    │ architecture.md   │
│ ARCHITECTURE  │◀──▶│ _REPORT.md          │◀──▶│ (DB Schema)       │
│ (Master Doc)  │    │ (10개 프로젝트)      │    │                   │
└───────┬───────┘    └─────────┬───────────┘    └─────────┬─────────┘
        │                      │                          │
        │  ┌───────────────────┼──────────────────────────┤
        ▼  ▼                   ▼                          ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│ MODULE_1_2     │  │ MODULE_3_5      │  │ MODULE_6_DATAFLOW       │
│ _DESIGN.md     │  │ _DESIGN.md      │  │ _DESIGN.md              │
└────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘
         │                    │                        │
         └────────────┬───────┴────────────────────────┘
                      ▼
         ┌─────────────────────────┐
         │ GFX_AEP_FIELD_MAPPING   │
         │ (26 Compositions)       │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │   gfx/ (상세 스펙)       │
         │   └── 01-categories/    │
         │   └── 02-schemas/       │
         └─────────────────────────┘
```

> **양방향 참조 (◀──▶)**: 모든 핵심 문서는 서로를 참조하여 어디서든 탐색 가능

---

## 문서 구조

```
docs/
├── README.md                          ← 현재 문서 (마스터 인덱스)
│
├── 🏗️ 아키텍처 문서
│   ├── GFX_PIPELINE_ARCHITECTURE.md   # 6-Module Pipeline 마스터 설계
│   ├── architecture.md                # DB 스키마 DDL, ERD
│   ├── ARCHITECTURE_ANALYSIS.md       # 아키텍처 분석 요약
│   └── PROJECT_RELATIONSHIPS.md       # 프로젝트 의존성 다이어그램
│
├── 📋 모듈 설계 문서
│   ├── MODULE_1_2_DESIGN.md           # GFX Simulator + NAS-Supabase Sync
│   ├── MODULE_3_5_DESIGN.md           # Supabase DB + Main/Sub Dashboard
│   └── MODULE_6_DATAFLOW_DESIGN.md    # AE-Nexrender + 통합 데이터플로우
│
├── 📊 상태 및 계획
│   ├── AUTOMATION_PROJECTS_REPORT.md  # 10개 프로젝트 현황
│   ├── PARALLEL_DEVELOPMENT_PLAN.md   # 병렬 개발 전략
│   └── PHASE2_DASHBOARD_DESIGN.md     # Dashboard 재설계 명세
│
├── 🔄 마이그레이션 & 매핑
│   ├── MIGRATION_GUIDE.md             # 데이터 마이그레이션 가이드
│   └── GFX_AEP_FIELD_MAPPING.md       # 26 AE Compositions, 84 Fields
│
├── 📝 PRD
│   └── PRD-0010-overview-dashboard.md # Overview Dashboard PRD
│
├── 📁 gfx/ (GFX 데이터 상세 스펙)
│   ├── 00-common/                     # 공통 규칙
│   │   ├── OVERVIEW.md                # GFX 데이터 구조 개요
│   │   ├── NULL_ERROR_HANDLING.md     # Null 값 처리 규칙
│   │   └── TRANSFORM_FUNCTIONS.md     # 데이터 변환 함수
│   │
│   ├── 01-categories/                 # 카테고리별 필드 매핑
│   │   ├── CHIP_DISPLAY.md            # 칩 디스플레이 (6 compositions)
│   │   ├── PLAYER_INFO.md             # 플레이어 정보
│   │   ├── EVENT_INFO.md              # 이벤트 정보
│   │   ├── PAYOUT.md                  # 페이아웃 구조
│   │   └── ELIMINATION_OTHER.md       # 탈락 및 기타
│   │
│   ├── 02-schemas/                    # 스키마 정의
│   │   ├── DB_TABLE_SCHEMA.md         # DB 테이블 구조
│   │   └── JSON_SCHEMA_V3.md          # GFX JSON 스키마 v3
│   │
│   ├── 03-dataflow/                   # 데이터 흐름
│   │   └── PIPELINE_OVERVIEW.md       # 파이프라인 개요
│   │
│   ├── 04-examples/                   # 예제 데이터
│   │   └── DATA_EXAMPLES.md           # 모든 카테고리 예제
│   │
│   └── _archive/                      # 아카이브
│       └── _ORIGINAL_BACKUP.md        # v2.0 백업 (참조용)
│
├── 📸 mockups/ (HTML 와이어프레임)
│   ├── gfx-main-dashboard.html        # GFX Main Dashboard
│   ├── gfx-sub-dashboard.html         # GFX Sub Dashboard
│   ├── gfx-pipeline-status.html       # Pipeline 상태 뷰
│   ├── gfx-pipeline-detailed-status.html
│   ├── gfx-pipeline-workflow.html     # Pipeline 워크플로우
│   ├── json-supabase-mapping.html     # JSON-Supabase 매핑 UI
│   ├── json-supabase-mapping-wireframe.html
│   └── _legacy/                       # 이전 버전 (참조용)
│
└── 🖼️ images/ (스크린샷/다이어그램)
    ├── gfx-*.png                      # 현재 GFX 브랜딩 이미지
    ├── pipeline-*.png                 # Pipeline 관련
    ├── json-supabase-mapping*.png     # 매핑 UI 스크린샷
    └── _legacy/                       # 이전 버전 (참조용)
```

---

## 6-Module Pipeline 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WSOP 방송 자동화 시스템                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Module 1]                    [Module 2]                    [Module 3]     │
│  GFX Simulator                 GFX-NAS-Supabase Sync         Supabase DB    │
│  ┌─────────────────┐           ┌─────────────────┐           ┌───────────┐  │
│  │automation_      │  JSON     │                 │  INSERT   │           │  │
│  │feature_table    │ ───────▶  │   gfx_json      │ ───────▶  │ 5 Schemas │  │
│  │                 │  (NAS)    │   (100% ✅)     │           │           │  │
│  └─────────────────┘           └─────────────────┘           └─────┬─────┘  │
│         82%                          100%                      Realtime     │
│                                                                    │        │
│  ┌─────────────────────────────────────────────────────────────────┼──────┐ │
│  │                                                                 │      │ │
│  │  [Module 4]                    [Module 5]                       │      │ │
│  │  Main Dashboard                Sub Dashboard                    │      │ │
│  │  ┌─────────────────┐           ┌─────────────────┐              │      │ │
│  │  │  What / When    │◀──────────│   How (Detail)  │◀─────────────┘      │ │
│  │  │                 │ WebSocket │                 │                     │ │
│  │  └────────┬────────┘           └────────┬────────┘                     │ │
│  │           │       automation_dashboard  │                              │ │
│  │           │              50%            │                              │ │
│  │           └──────────────┬──────────────┘                              │ │
│  │                          │ render_jobs                                 │ │
│  │                          ▼                                             │ │
│  │  [Module 6] AE-Nexrender                                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐           │ │
│  │  │  automation_ae (92%) + ae_nexrender_module (78%)        │           │ │
│  │  │                         ▼                               │           │ │
│  │  │                    🎬 Output                            │           │ │
│  │  └─────────────────────────────────────────────────────────┘           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10개 프로젝트 현황

| 프로젝트 | Module | 완성도 | 역할 | 기술 스택 |
|----------|:------:|:------:|------|-----------|
| **gfx_json** | 2 | 100% ✅ | GFX JSON → Supabase Sync | Python |
| **automation_ae** | 6 | 92% | AE 렌더링 서버 | Python + TS |
| **automation_hub** | 2,3 | 85-90% | 공유 인프라 (DB, Models) | Python + Node |
| **automation_schema** | 3 | 85% | Supabase 스키마 DDL | SQL/Python |
| **automation_feature_table** | 1 | 82% | GFX 핸드 캡처 | Python |
| **ae_nexrender_module** | 6 | 78% | AE 렌더링 워커 | Python + Node |
| **automation_dashboard** | 4,5 | 50% | Main/Sub Dashboard | TypeScript/React |
| **automation_sub** | - | 45% | PRD 관리 | Docs Only |
| **automation_aep_csv** | - | - | AEP CSV 처리 | Python |
| **automation_orchestration** | - | - | 문서 허브 (현재 저장소) | Docs Only |

---

## 문서 업데이트 가이드

### 업데이트 시 동기화 필요 문서

| 변경 유형 | 업데이트 대상 |
|-----------|--------------|
| Module 변경 | `GFX_PIPELINE_ARCHITECTURE.md`, `MODULE_*_DESIGN.md` |
| 프로젝트 상태 변경 | `AUTOMATION_PROJECTS_REPORT.md` |
| DB 스키마 변경 | `architecture.md`, `gfx/02-schemas/DB_TABLE_SCHEMA.md` |
| 새 프로젝트 추가 | `PROJECT_RELATIONSHIPS.md`, 이 README |

### 문서 명명 규칙

| 유형 | 패턴 | 예시 |
|------|------|------|
| 설계 문서 | `*_DESIGN.md` | `MODULE_1_2_DESIGN.md` |
| 분석 보고서 | `*_ANALYSIS.md`, `*_REPORT.md` | `ARCHITECTURE_ANALYSIS.md` |
| PRD | `PRD-NNNN-*.md` | `PRD-0010-overview-dashboard.md` |
| 가이드 | `*_GUIDE.md` | `MIGRATION_GUIDE.md` |

---

## 기여 가이드

1. **새 문서 추가 시**: 이 README의 문서 구조에 추가
2. **목업 추가 시**: `docs/mockups/` + 스크린샷을 `docs/images/`
3. **Legacy 파일**: `_legacy/` 또는 `_archive/` 폴더로 이동

---

*최종 수정: 2026-01-28*
