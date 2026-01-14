# GFX Data Pipeline Architecture

WSOP 포커 방송 자동화 시스템의 전체 데이터 파이프라인 아키텍처 문서

> **관련 문서**
> - [DB 스키마 상세 설계](architecture.md) - DDL, ERD, Enum 타입 정의
> - [아키텍처 요약](ARCHITECTURE_ANALYSIS.md) - Executive Summary
> - [프로젝트 현황](AUTOMATION_PROJECTS_REPORT.md) - 7개 프로젝트 현황

---

## 1. 개요

### 1.1 목적

PokerGFX 데이터를 수집하여 After Effects 자막으로 자동 변환하는 **End-to-End 방송 자동화 시스템**

### 1.2 핵심 특징

- **5계층 아키텍처**: INPUT → STORAGE → ORCHESTRATION → DASHBOARD → OUTPUT
- **다중 입력 소스**: 여러 대의 피처 테이블에서 GFX JSON 생산
- **데이터 병합**: Manual > WSOP+ > GFX 우선순위
- **DB 중심 설계**: Supabase는 철저히 DB 역할만

### 1.3 구현 상태

| 계층 | 컴포넌트 | 상태 |
|------|---------|------|
| INPUT | GFX JSON Parser | ✅ 완료 |
| INPUT | WSOP+ Importer | ✅ 완료 |
| INPUT | Manual Editor | ✅ 완료 |
| STORAGE | GFX JSON DB | ✅ 완료 |
| STORAGE | WSOP+ DB | ✅ 완료 |
| STORAGE | Manual DB | ✅ 완료 |
| ORCHESTRATION | Supabase | ✅ 완료 |
| DASHBOARD | Cuesheet Dashboard | 🔜 설계 예정 |
| DASHBOARD | AE Dashboard | 🔜 설계 예정 |
| OUTPUT | AE 렌더링 | ✅ 완료 |

---

## 2. 5계층 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GFX DATA PIPELINE (5계층 아키텍처)                         │
│                    ⭐ Supabase = DB 역할만, 렌더링 지시 X ⭐                   │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
                              1️⃣ INPUT LAYER (입력)
═══════════════════════════════════════════════════════════════════════════════
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │ 피처 테이블 1   │  │ 피처 테이블 2   │  │ 피처 테이블 N   │
  │ (GFX JSON)      │  │ (GFX JSON)      │  │ (GFX JSON)      │
  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
           │                    │                    │
           └────────────────────┼────────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   NAS (SMB)     │
                       │   파일 공유     │
                       └────────┬────────┘
                                │
                                ▼
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │ GFX JSON Parser │  │ WSOP+ Importer  │  │ Manual Editor   │
  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
           │                    │                    │
           ▼                    ▼                    ▼
═══════════════════════════════════════════════════════════════════════════════
                           2️⃣ STORAGE LAYER (저장)
═══════════════════════════════════════════════════════════════════════════════
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │   GFX JSON DB   │  │   WSOP+ DB      │  │   Manual DB     │
  │                 │  │                 │  │                 │
  │ gfx_sessions    │  │ wsop_events     │  │ manual_players  │
  │ gfx_hands       │  │ wsop_players    │  │ profile_images  │
  │ gfx_hand_players│  │ wsop_chip_counts│  │ player_overrides│
  │ gfx_events      │  │ wsop_standings  │  │ player_link_map │
  │ hand_grades     │  │                 │  │                 │
  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
           │                    │                    │
           └────────────────────┼────────────────────┘
                                │
                                ▼
═══════════════════════════════════════════════════════════════════════════════
                      3️⃣ ORCHESTRATION LAYER (오케스트레이션)
═══════════════════════════════════════════════════════════════════════════════
                    ┌─────────────────────────────────┐
                    │     SUPABASE (PostgreSQL)       │
                    │     ⭐ DB 역할만 ⭐              │
                    │                                 │
                    │  통합 뷰:                       │
                    │  - unified_players              │
                    │  - unified_events               │
                    │  - unified_chip_data            │
                    │                                 │
                    │  작업 관리:                     │
                    │  - job_queue                    │
                    │  - render_queue                 │
                    │  - sync_status                  │
                    └────────────────┬────────────────┘
                                     │
            ┌────────────────────────┼────────────────────────┐
            │                        │                        │
            ▼                        ▼                        ▼
═══════════════════════════════════════════════════════════════════════════════
                         4️⃣ DASHBOARD LAYER (대시보드)
═══════════════════════════════════════════════════════════════════════════════
┌───────────────────────┐              ┌───────────────────────┐
│  Cuesheet Dashboard   │              │    AE Dashboard       │
│  ⭐ 송출 순서 담당     │              │  ⭐ 렌더 설정 담당     │
│                       │              │                       │
│  READ:                │              │  READ:                │
│  - unified_players    │   DB 공유    │  - unified_players    │
│  - unified_chip_data  │◀────────────▶│  - gfx_hands          │
│  - render_outputs     │              │  - hand_grades        │
│                       │              │  - aep_field_keys     │
│  WRITE:               │              │                       │
│  - cue_sheets         │              │  WRITE:               │
│  - cue_items          │              │  - render_queue       │
│  (순서 정보만)        │              │  (렌더 작업 생성)     │
│                       │              │                       │
│  ❌ 렌더 지시 안함    │              │  지시:                │
└───────────────────────┘              │  - AE 렌더링 직접 호출│
                                       └───────────┬───────────┘
                                                   │
                                                   ▼
═══════════════════════════════════════════════════════════════════════════════
                            5️⃣ OUTPUT LAYER (출력)
═══════════════════════════════════════════════════════════════════════════════
                              ┌─────────────────┐
                              │   AE 렌더링     │
                              │   (Nexrender)   │
                              │                 │
                              │ aep_compositions│
                              │ aep_layers      │
                              │ aep_field_keys  │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │   Output 생성   │
                              │   - MP4/MOV     │
                              │   - 파일명      │
                              │   - 시간/순서   │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │ Supabase 저장   │
                              │ (render_outputs)│
                              └─────────────────┘
```

---

## 3. 데이터 통합 우선순위

```
┌─────────────────────────────────────────────────────────────────┐
│                    데이터 병합 우선순위                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1️⃣ Manual DB (최우선)                                        │
│      - 검증된 데이터                                            │
│      - 수동 오버라이드                                          │
│                                                                 │
│   2️⃣ WSOP+ DB                                                  │
│      - 실시간 칩 카운트                                         │
│      - 공식 토너먼트 정보                                       │
│                                                                 │
│   3️⃣ GFX JSON DB (기본)                                        │
│      - 피처 테이블 원본 데이터                                  │
│      - 핸드 등급 (A/B/C)                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 핵심 역할 정리

### 4.1 Supabase (DB 역할만)

| ✅ 함 | ❌ 안함 |
|-------|--------|
| 데이터 저장/조회 | 렌더링 작업 지시 |
| 통합 뷰 제공 | 비즈니스 로직 |
| Realtime 알림 | 외부 API 호출 |
| 작업 큐 관리 | 파일 처리 |

### 4.2 Cuesheet Dashboard (송출 순서)

| ✅ 함 | ❌ 안함 |
|-------|--------|
| 방송 송출 순서 결정 | 렌더링 지시 |
| cue_sheets, cue_items 편집 | render_queue 생성 |
| 렌더링 결과 조회 | AE 직접 호출 |

### 4.3 AE Dashboard (렌더 설정 + 지시)

| ✅ 함 |
|-------|
| 모든 poker 데이터 조회 |
| 렌더 설정 및 render_queue 생성 |
| **AE 렌더링 직접 지시** |
| 결과 모니터링 |

---

## 5. 계층별 상세

### 5.1 INPUT LAYER

#### 다중 피처 테이블
- **여러 대의 피처 테이블**에서 GFX JSON 생산 가능
- 각 테이블 → NAS (SMB) → JSON Parser → Supabase
- 각 테이블별 세션으로 구분

#### 입력 소스

| 소스 | 역할 | 프로젝트 |
|------|------|---------|
| GFX JSON Parser | 피처 테이블 데이터 파싱 | automation_feature_table |
| WSOP+ Importer | 공식 토너먼트 데이터 | automation_hub |
| Manual Editor | 수동 플레이어 관리 | (신규) |

### 5.2 STORAGE LAYER

#### GFX JSON DB

| 테이블 | 목적 |
|--------|------|
| gfx_sessions | 게임 세션 |
| gfx_hands | 개별 핸드 |
| gfx_hand_players | 핸드별 플레이어 |
| gfx_events | 액션/이벤트 |
| hand_grades | 핸드 등급 (A/B/C) |

#### WSOP+ DB

| 테이블 | 목적 |
|--------|------|
| wsop_events | 토너먼트 정보 |
| wsop_players | 플레이어 프로필 |
| wsop_chip_counts | 칩 히스토리 |
| wsop_standings | 순위표 스냅샷 |

#### Manual DB

| 테이블 | 목적 |
|--------|------|
| manual_players | 수동 플레이어 |
| profile_images | 프로필 이미지 |
| player_overrides | 오버라이드 규칙 |
| player_link_mapping | 플레이어 연결 |

### 5.3 ORCHESTRATION LAYER

#### Supabase 통합 뷰

| 뷰 | 목적 |
|-----|------|
| unified_players | 모든 소스 플레이어 병합 |
| unified_events | 이벤트 통합 |
| unified_chip_data | 칩 데이터 병합 |

#### 작업 관리

| 테이블 | 목적 |
|--------|------|
| job_queue | 비동기 작업 큐 |
| render_queue | AEP 렌더링 작업 |
| sync_status | 동기화 상태 |

### 5.4 DASHBOARD LAYER

#### Cuesheet Dashboard (🔜 설계 예정)

| 항목 | 설계 내용 |
|------|----------|
| 핵심 역할 | **방송 송출 순서 결정** |
| READ | unified_players, unified_chip_data, render_outputs |
| WRITE | cue_sheets, cue_items (순서 정보만) |
| ❌ 안함 | 렌더링 지시 |
| 기술 스택 | React + Supabase Realtime |

#### AE Dashboard (🔜 설계 예정)

| 항목 | 설계 내용 |
|------|----------|
| 핵심 역할 | **렌더 정보 설정 및 생성**, 자막 출력 최종 지점 |
| READ | unified_players, gfx_hands, hand_grades, aep_field_keys |
| WRITE | render_queue (렌더 작업 생성) |
| 지시 | **AE 렌더링 직접 호출** |
| 기술 스택 | React + Supabase Realtime + WebSocket |

### 5.5 OUTPUT LAYER

#### AE 렌더링

| 항목 | 내용 |
|------|------|
| 엔진 | Nexrender |
| 프로젝트 | automation_ae |
| 입력 | aep_field_keys (84개 필드) |
| 출력 | MP4/MOV |

#### 렌더링 결과

| 필드 | 설명 |
|------|------|
| file_name | 렌더링된 파일명 |
| file_path | 저장 경로 |
| duration | 렌더링 시간 |
| sequence_order | 순서 |
| status | completed/failed |

---

## 6. 프로젝트 역할 매핑

| 프로젝트 | 역할 | 계층 | 상태 |
|---------|------|------|------|
| automation_feature_table | GFX 시뮬레이터, JSON Parser | INPUT | ✅ 완료 |
| automation_hub | WSOP+ Importer, Supabase 스키마 | INPUT, STORAGE | ✅ 완료 |
| automation_ae | AE 렌더링 | OUTPUT | ✅ 완료 |
| automation_schema | DB 스키마 문서 | - | ✅ 완료 |
| (신규) | Cuesheet Dashboard | DASHBOARD | 🔜 설계 예정 |
| (신규) | AE Dashboard | DASHBOARD | 🔜 설계 예정 |
| automation_orchestration | 전체 문서/모니터링 | - | 📄 문서화 |

---

## 7. 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Python 3.12+, FastAPI, Celery |
| Database | Supabase (PostgreSQL + Realtime) |
| Queue | Redis |
| Rendering | Nexrender + After Effects |
| Validation | JSON Schema Draft 2020-12, Pydantic v2 |
| Frontend (예정) | React, Supabase Realtime, WebSocket |

---

## 8. 참조 문서

### DB 스키마 문서 (automation_schema/docs)

| 문서 | 내용 |
|------|------|
| DATA_FLOW.md | 전체 시스템 데이터 흐름 아키텍처 |
| GFX-JSON-DB.md | PokerGFX JSON 파일 정규화 스키마 |
| WSOP+-DB.md | WSOP+ 플랫폼 데이터 저장 스키마 |
| Manual-DB.md | 수동 플레이어 관리 스키마 |
| Cuesheet-DB.md | 방송 진행 큐시트 관리 스키마 |
| AEP-Analysis-DB.md | After Effects 분석 스키마 |
| Supabase-Orchestration.md | 전체 시스템 통합 오케스트레이션 |

### 기타 문서 (automation_orchestration/docs)

| 문서 | 내용 |
|------|------|
| architecture.md | DB 스키마 아키텍처 |

---

*최종 수정: 2026-01-13*
