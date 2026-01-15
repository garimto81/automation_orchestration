# GFX AEP 매핑 개요

**Version**: 2.0.0
**Last Updated**: 2026-01-14
**Status**: Active

> **참조**: [전체 인덱스](../../GFX_AEP_FIELD_MAPPING.md)

---

## 1. 개요

### 1.1 목적

GFX JSON DB 데이터를 After Effects **26개 컴포지션** (방송 전or후 뽑기 10개 + 방송 중 뽑기 16개)의 자막 필드에 매핑하는 전체 명세서.

### 1.2 범위 정의

| 포함 범위 | 개수 | 설명 |
|-----------|------|------|
| 방송 전or후 뽑기 | 10개 | 스케줄, 이벤트 정보, 스태프 등 |
| 방송 중 뽑기 | 16개 | 칩 디스플레이, 플레이어 정보 등 |
| **총합** | **26개** | |

| 제외 범위 | 위치 | 사유 |
|-----------|------|------|
| Feature Table Leaderboard MAIN/SUB | Comp/ 폴더 | 사용자 요청 범위 외 |
| 14개 element | Source comp/ 폴더 | 정적 precomp |
| Chips (Source Comp) | Source comp/ 폴더 | v2.0.0 제외 (Comp 이하 폴더만 수집) |

### 1.3 출력 언어

모든 자막은 **영문 출력** (글로벌 시청자 대상)

### 1.4 대소문자 처리 규칙

> **Case-Insensitive 매칭**: 모든 플레이어명 매칭은 `LOWER()` 함수를 사용하여 대소문자를 무시합니다.
> - DB 저장: 원본 케이싱 유지 (`"Phil"`)
> - DB 조회: `WHERE LOWER(player_name) = LOWER(:search_name)` (대소문자 무관 매칭)
> - AEP 출력: `UPPER()` 변환 (`"PHIL"`)

---

## 2. 데이터 소스 우선순위

```
┌─────────────────────────────────────────────────────────────┐
│                    데이터 소스 우선순위                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣ GFX JSON DB (기본 소스 - Primary)                      │
│     - gfx_hand_players: 플레이어명, 칩 카운트               │
│     - gfx_hands: 블라인드, 팟, 보드 카드                    │
│     - gfx_sessions: 이벤트 제목, payouts                    │
│     → 실시간 피처 테이블 데이터                             │
│                                                             │
│  2️⃣ WSOP+ DB (보조 소스 - Secondary)                       │
│     - wsop_standings: 전체 순위표 (30명+)                   │
│     - wsop_events: 이벤트 상세 정보, 공식 payouts           │
│     → 피처 테이블 외 전체 데이터                            │
│                                                             │
│  3️⃣ Manual DB (오버라이드 - Override Only)                 │
│     - ❌ 기본 데이터 소스 아님                              │
│     - ✅ 잘못된 데이터 수정 (이름 오타 등)                  │
│     - ✅ 선수 프로필 보완 (국적, 프로필 이미지 등)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 소스별 역할

| 소스 DB | 테이블 | 역할 | 우선순위 |
|---------|--------|------|----------|
| GFX JSON DB | gfx_hand_players | 기본 소스: 플레이어명, 칩 카운트 | Primary |
| GFX JSON DB | gfx_hands | 기본 소스: 블라인드, 팟, 보드 카드 | Primary |
| GFX JSON DB | gfx_sessions | 기본 소스: 이벤트 제목, payouts | Primary |
| WSOP+ DB | wsop_standings | 보조 소스: 전체 순위표 (30명+) | Secondary |
| WSOP+ DB | wsop_events | 보조 소스: 이벤트 상세, 공식 payouts | Secondary |
| Manual DB | manual_players | 오버라이드: 잘못된 데이터 수정, 프로필 보완 | Override |
| Manual DB | unified_players | 통합 뷰 (Manual 오버라이드 적용) | - |

---

## 3. 슬롯 인덱스 결정 규칙

### 3.1 공통 정렬 기준

| 카테고리 | 정렬 기준 | 예시 |
|----------|-----------|------|
| chip_display | end_stack_amt DESC | 칩 1위 → Name 1 |
| payout | place ASC | 1등 → Prize 1 |
| schedule | broadcast_date ASC | 첫 날짜 → Date 1 |
| staff | 입력 순서 | 첫 번째 → Name 1 |

### 3.2 sitting_out 처리

- `gfx_hand_players.sitting_out = TRUE` 플레이어 제외
- 빈 슬롯은 빈 문자열("")로 전송

---

## 4. 컴포지션 카테고리 요약 (26개)

| 카테고리 | v1.3.0 | v2.0.0 | 동적 매핑 | 주요 소스 | 실제 슬롯 수 |
|----------|--------|--------|-----------|-----------|--------------|
| chip_display | 7 | **6** | ✅ | gfx_hand_players | 9, 9, 3, 4, 0, 0 |
| payout | 3 | 3 | ✅ | wsop_events | 9, 11, 9 |
| event_info | 5 | **4** | ✅ | wsop_events, gfx_sessions | - |
| schedule | 1 | 1 | ✅ | broadcast_sessions | 6 |
| staff | 2 | 2 | ✅ | manual.commentators | 2, 2 |
| player_info | 4 | 4 | ✅ | gfx_hand_players + Manual | - |
| elimination | 2 | 2 | ✅ | gfx_hand_players | - |
| transition | 2 | 2 | ❌ | 정적 | - |
| other | 2 | 2 | ❌ | 정적 | - |
| **Total** | **28** | **26** | - | - | - |

> **v2.0.0 변경**:
> - chip_display: 7 → 6개 (Chip VPIP → NAME 3줄+로 통합)
> - event_info: 5 → 4개 (Chips (Source Comp) 제외)

> ⚠️ **제외된 카테고리**:
> - `leaderboard` (3개): Comp/ 폴더 위치로 범위 외
> - `element` (14개): Source comp/ 폴더 위치로 범위 외
> - `Chips (Source Comp)` (1개): v2.0.0 제외 (Source comp/ 폴더로 이동)

---

## 5. 관련 문서

| 문서 | 위치 | 설명 |
|------|------|------|
| GFX Pipeline Architecture | `docs/GFX_PIPELINE_ARCHITECTURE.md` | 5계층 파이프라인 아키텍처 |
| 08-GFX-AEP-Mapping | `automation_schema/docs/08-GFX-AEP-Mapping.md` | 참조 문서 (병행 유지) |
| WSOP+ DB Schema | `automation_schema/docs/WSOP+ DB.md` | WSOP+ 데이터베이스 스키마 |
| Manual DB Schema | `automation_schema/docs/Manual DB.md` | Manual 오버라이드 스키마 |

---

## 6. 검증 방법

1. **26개 컴포지션별 field_keys 매핑 완료 확인**
2. **SQL 함수 DDL 문법 검증**
3. **JSON Schema 유효성 확인**
4. **샘플 데이터로 렌더링 테스트**
5. **실제 AEP 슬롯 수와 매핑 일치 확인** (03_text_layers.json 기준)

---

## 7. 다음 단계

- **01-CHIP_DISPLAY.md**: chip_display 6개 컴포지션 상세 매핑
- **02-PAYOUT.md**: payout 3개 컴포지션 상세 매핑
- **03-EVENT_INFO.md**: event_info 4개 컴포지션 상세 매핑
- **04-SCHEDULE.md**: schedule 1개 컴포지션 상세 매핑
- **05-STAFF.md**: staff 2개 컴포지션 상세 매핑
- **06-PLAYER_INFO.md**: player_info 4개 컴포지션 상세 매핑
- **07-ELIMINATION.md**: elimination 2개 컴포지션 상세 매핑
