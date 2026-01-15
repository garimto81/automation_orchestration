# gfx_aep_field_mappings 테이블

> **참조**: [전체 AEP 필드 매핑 명세](../../GFX_AEP_FIELD_MAPPING.md)

## 개요

**gfx_aep_field_mappings** 테이블은 After Effects 컴포지션의 텍스트 레이어 필드와 데이터베이스의 소스 테이블을 연결하는 메타데이터를 저장합니다.

| 항목 | 설명 |
|------|------|
| **목적** | 컴포지션별 field_key를 소스 데이터와 매핑 |
| **사용처** | render_gfx_data 생성 시 동적 데이터 조회 |
| **주요 데이터** | 28개 컴포지션 × 필드별 매핑 규칙 |

---

## 스키마

```sql
CREATE TABLE gfx_aep_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    composition_name VARCHAR(255) NOT NULL,
    composition_category aep_category NOT NULL,
    target_field_key VARCHAR(100) NOT NULL,
    slot_range_start INTEGER,
    slot_range_end INTEGER,
    source_table VARCHAR(100) NOT NULL,
    source_column VARCHAR(100) NOT NULL,
    source_join TEXT,
    transform VARCHAR(50),
    slot_order_by VARCHAR(100),
    slot_filter TEXT,
    priority INTEGER DEFAULT 100,
    UNIQUE(composition_name, target_field_key)
);
```

### 컬럼 설명

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| `id` | UUID | NOT NULL | 행 고유 식별자 (자동 생성) |
| `composition_name` | VARCHAR(255) | NOT NULL | AEP 컴포지션 이름 (예: "_MAIN Mini Chip Count") |
| `composition_category` | aep_category | NOT NULL | 컴포지션 카테고리 (chip_display, payout, event_info 등) |
| `target_field_key` | VARCHAR(100) | NOT NULL | AEP 텍스트 레이어의 필드 키 (예: "name", "chips") |
| `slot_range_start` | INTEGER | nullable | 슬롯 범위 시작 (1부터 N까지) |
| `slot_range_end` | INTEGER | nullable | 슬롯 범위 종료 (실제 AEP 슬롯 수) |
| `source_table` | VARCHAR(100) | NOT NULL | 소스 데이터 테이블명 (gfx_hand_players, wsop_events 등) |
| `source_column` | VARCHAR(100) | NOT NULL | 소스 테이블의 컬럼명 |
| `source_join` | TEXT | nullable | 조인 조건 (필요 시) |
| `transform` | VARCHAR(50) | nullable | 데이터 변환 함수 (UPPER, format_chips, direct 등) |
| `slot_order_by` | VARCHAR(100) | nullable | 슬롯 정렬 기준 (end_stack_amt DESC, place ASC 등) |
| `slot_filter` | TEXT | nullable | WHERE 절 필터 (sitting_out = FALSE 등) |
| `priority` | INTEGER | NOT NULL | 우선순위 (기본값: 100) |

### 제약 조건

- **PRIMARY KEY**: `id` (UUID)
- **UNIQUE**: `(composition_name, target_field_key)` - 컴포지션별 필드는 1:1 매핑

---

## 초기 데이터 예시

```sql
INSERT INTO gfx_aep_field_mappings (
    composition_name, composition_category, target_field_key,
    slot_range_start, slot_range_end, source_table, source_column,
    source_join, transform, slot_order_by, slot_filter, priority
) VALUES

-- _MAIN Mini Chip Count: 실제 AEP 슬롯 수 = 8
(
    '_MAIN Mini Chip Count', 'chip_display', 'name',
    1, 8, 'gfx_hand_players', 'player_name',
    NULL, 'UPPER', 'end_stack_amt DESC', 'sitting_out = FALSE', 100
),

(
    '_MAIN Mini Chip Count', 'chip_display', 'chips',
    1, 8, 'gfx_hand_players', 'end_stack_amt',
    NULL, 'format_chips', 'end_stack_amt DESC', 'sitting_out = FALSE', 100
),

-- Payouts: 실제 AEP 슬롯 수 = 9
(
    'Payouts', 'payout', 'rank',
    1, 9, 'wsop_events', 'payouts->place',
    NULL, 'direct', 'place ASC', NULL, 100
);
```

---

## 사용법

### 예시 1: 특정 컴포지션의 모든 필드 매핑 조회

```sql
SELECT
    target_field_key,
    source_table,
    source_column,
    transform,
    slot_range_start,
    slot_range_end,
    slot_order_by,
    slot_filter
FROM gfx_aep_field_mappings
WHERE composition_name = '_MAIN Mini Chip Count'
ORDER BY priority DESC;
```

**출력**:
```
target_field_key | source_table      | source_column   | transform     | slot_range_start | slot_range_end | slot_order_by        | slot_filter
-----------------|-------------------|-----------------|---------------|------------------|-----------------|---------------------|------------------
name             | gfx_hand_players  | player_name     | UPPER         | 1                | 8              | end_stack_amt DESC  | sitting_out = FALSE
chips            | gfx_hand_players  | end_stack_amt   | format_chips  | 1                | 8              | end_stack_amt DESC  | sitting_out = FALSE
```

### 예시 2: 특정 카테고리의 모든 컴포지션 조회

```sql
SELECT DISTINCT composition_name
FROM gfx_aep_field_mappings
WHERE composition_category = 'chip_display'
ORDER BY composition_name;
```

### 예시 3: Payout 컴포지션의 슬롯 정보 조회

```sql
SELECT
    composition_name,
    target_field_key,
    slot_range_start,
    slot_range_end,
    source_column
FROM gfx_aep_field_mappings
WHERE composition_name = 'Payouts'
  AND composition_category = 'payout';
```

---

## 데이터 모델 관계

```
gfx_aep_field_mappings
    ├─ composition_name ────▶ After Effects 컴포지션
    │                        └─ 03_text_layers.json에 정의
    │
    ├─ target_field_key ────▶ AEP 텍스트 레이어 필드 ID
    │
    ├─ composition_category ─▶ 카테고리 분류 (26개)
    │
    └─ source_table ────────▶ PostgreSQL 테이블
                              ├─ gfx_hand_players (플레이어 정보)
                              ├─ gfx_hands (핸드 정보)
                              ├─ wsop_events (WSOP 이벤트)
                              ├─ manual.commentators (수동 입력)
                              └─ broadcast_sessions (방송 세션)
```

---

## 주의사항

### 1. 슬롯 범위 설정

- **슬롯 범위**는 실제 AEP 텍스트 레이어 수에 맞춰야 함
- 예: `_MAIN Mini Chip Count`는 8개 슬롯 → `slot_range_end = 8`

### 2. 데이터 변환

| 변환 함수 | 설명 |
|-----------|------|
| `UPPER` | 대문자 변환 |
| `format_chips` | 칩 수를 포맷팅 (1,000,000) |
| `direct` | 변환 없음 |

### 3. 정렬 및 필터

- `slot_order_by`: 각 슬롯에 할당할 데이터 정렬 기준
- `slot_filter`: WHERE 절로 데이터 제한 (예: 좌석에 앉지 않은 플레이어 제외)

---

## 참고 문서

- [GFX AEP 필드 매핑 명세](../../GFX_AEP_FIELD_MAPPING.md) - 전체 매핑 테이블
- [GFX Pipeline Architecture](../../GFX_PIPELINE_ARCHITECTURE.md) - 5계층 파이프라인
- [WSOP+ DB Schema](../../../automation_schema/docs/WSOP+%20DB.md) - 소스 DB 스키마
