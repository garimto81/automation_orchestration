# Architecture.md 분석 보고서

## automation_orchestration 프로젝트 역할

**이 프로젝트는 전체 아키텍처 문서 저장소 + 모니터링 허브입니다.**

| 역할 | 설명 |
|------|------|
| 아키텍처 문서 | 전체 시스템 설계 문서 관리 |
| 모니터링 | 다른 automation_* 프로젝트 현황 조망 |
| 실제 구현 | ❌ 없음 (다른 프로젝트에서 수행) |

---

## 문서 개요

**문서 위치**: `C:\claude\automation_orchestration\docs\architecture.md`

**목적**: WSOP 포커 방송 자동화 시스템의 **데이터베이스 스키마 전체 설계**

**데이터 파이프라인**: 입력(GFX, WSOP+, Manual) → 오케스트레이션(Supabase) → 대시보드(Cuesheet) → 출력(AEP)

---

## 4계층 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                     INPUT LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ GFX JSON DB │  │ WSOP+ Schema│  │Manual Schema│     │
│  │   (기존)    │  │   (신규)    │  │   (신규)    │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
└─────────┼────────────────┼────────────────┼─────────────┘
          └────────────────┼────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 ORCHESTRATION LAYER                      │
│            ┌─────────────────────────┐                  │
│            │     Supabase Schema     │                  │
│            │   (통합 뷰 + 작업 큐)    │                  │
│            └───────────┬─────────────┘                  │
└────────────────────────┼────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  DASHBOARD LAYER                         │
│            ┌─────────────────────────┐                  │
│            │    Cuesheet Schema      │                  │
│            │    (방송 진행 관리)      │                  │
│            └───────────┬─────────────┘                  │
└────────────────────────┼────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   OUTPUT LAYER                           │
│            ┌─────────────────────────┐                  │
│            │    AEP Analysis DB      │                  │
│            │       (기존)            │                  │
│            └─────────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

---

## 1. INPUT LAYER (입력 계층)

### 1.1 GFX JSON DB (기존)
| 테이블 | 역할 |
|--------|------|
| gfx_sessions | 게임 세션 |
| gfx_hands | 핸드 데이터 |
| gfx_events | 게임 이벤트 |
| gfx_players | 플레이어 정보 |
| hand_grades | 핸드 등급 |

### 1.2 WSOP+ Schema (신규)
| 테이블 | 역할 |
|--------|------|
| wsop_events | 토너먼트/이벤트 마스터 |
| wsop_players | 플레이어 마스터 |
| wsop_event_players | 이벤트별 참가자 |
| wsop_chip_counts | 칩 카운트 히스토리 |
| wsop_standings | 순위표 스냅샷 |
| wsop_import_logs | 임포트 로그 |

**Enum 타입**: `wsop_event_type`, `wsop_event_status`, `wsop_player_status`, `wsop_import_type`, `chip_source`

### 1.3 Manual Schema (신규)
| 테이블 | 역할 |
|--------|------|
| manual_players | 수동 플레이어 정보 |
| player_overrides | 오버라이드 규칙 |
| profile_images | 이미지 저장소 |
| player_link_mapping | 플레이어 연결 (GFX↔WSOP↔Manual) |

**Enum 타입**: `image_type`, `match_method`

---

## 2. ORCHESTRATION LAYER (오케스트레이션 계층)

### Supabase Schema
| 테이블/뷰 | 역할 |
|-----------|------|
| **unified_players** | 플레이어 통합 뷰 (GFX + WSOP + Manual) |
| **unified_events** | 이벤트 통합 뷰 |
| **unified_chips** | 칩 데이터 통합 |
| sync_status | 동기화 상태 추적 |
| system_config | 시스템 설정 |
| job_queue | 작업 큐 |
| render_queue | 렌더 큐 |

**핵심 뷰 로직** (`unified_players`):
```sql
SELECT
    COALESCE(m.id, w.id, g.id) AS unified_id,
    COALESCE(m.name, w.name, g.name) AS name,
    CASE
        WHEN m.id IS NOT NULL THEN 'manual'
        WHEN w.id IS NOT NULL THEN 'wsop'
        WHEN g.id IS NOT NULL THEN 'gfx'
    END AS primary_source
FROM manual_players m
FULL OUTER JOIN player_link_mapping plm ...
```

**Enum 타입**: `job_type`, `job_status`, `data_source`

---

## 3. DASHBOARD LAYER (대시보드 계층)

### Cuesheet Schema (방송 진행 관리)
| 테이블 | 역할 |
|--------|------|
| broadcast_sessions | 방송 세션 |
| cue_sheets | 큐시트 |
| cue_items | 개별 큐 아이템 |
| cue_templates | 큐 템플릿 |
| gfx_triggers | GFX 트리거 로그 |

**Enum 타입**:
- `broadcast_status`: scheduled, preparing, live, completed, cancelled
- `sheet_type`: pre_show, main_show, post_show, segment
- `cue_type`: chip_count, player_info, leaderboard, hand_replay, elimination, payout, event_info, transition, lower_third, fullscreen
- `cue_item_status`: pending, ready, on_air, completed, skipped
- `trigger_type`: manual, scheduled, auto
- `render_status`: pending, rendering, completed, failed

---

## 4. OUTPUT LAYER (출력 계층)

### AEP Analysis DB (기존)
| 테이블 | 역할 |
|--------|------|
| aep_compositions | 콤포지션 정보 |
| aep_layers | 레이어 정보 |
| aep_field_keys | 필드 키 |
| aep_media_sources | 미디어 소스 |

---

## 5. 데이터 흐름

```
[NAS]              [WSOP+]            [수동 입력]
  │ JSON             │ JSON/CSV         │ Web UI
  ▼                  ▼                  ▼
┌──────────┐    ┌──────────┐      ┌──────────┐
│ GFX DB   │    │ WSOP+ DB │      │ Manual DB│
└────┬─────┘    └────┬─────┘      └────┬─────┘
     │               │                 │
     └───────────────┼─────────────────┘
                     ▼
           ┌─────────────────┐
           │    Supabase     │
           │ (Unified Views) │
           └────────┬────────┘
                    ▼
           ┌─────────────────┐
           │    Cuesheet     │
           │  (Dashboard)    │
           └────────┬────────┘
                    ▼
           ┌─────────────────┐
           │   AEP Render    │
           │   (Output)      │
           └─────────────────┘
```

---

## 6. 구현 산출물 계획

| 순서 | 파일명 | 내용 |
|------|--------|------|
| 1 | `docs/WSOP+ DB.md` | WSOP+ Schema DDL 문서 |
| 2 | `docs/Manual DB.md` | Manual Schema DDL 문서 |
| 3 | `docs/Cuesheet DB.md` | Cuesheet Schema DDL 문서 |
| 4 | `docs/Supabase Orchestration.md` | Supabase 통합 Schema 문서 |
| 5 | `docs/DATA_FLOW.md` | 전체 데이터 흐름 문서 |

---

## 요약

| 항목 | 내용 |
|------|------|
| **계층 수** | 4계층 (Input → Orchestration → Dashboard → Output) |
| **신규 스키마** | WSOP+, Manual, Cuesheet, Supabase |
| **기존 스키마** | GFX JSON DB, AEP Analysis DB |
| **총 테이블** | 약 25개 |
| **총 Enum 타입** | 약 20개 |
| **핵심 기능** | 3개 소스 통합 뷰, 작업 큐, 방송 큐시트 |
