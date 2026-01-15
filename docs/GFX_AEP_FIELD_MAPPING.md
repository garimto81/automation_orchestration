# GFX JSON DB → AEP 자막 매핑 명세서

**Version**: 2.0.0
**Last Updated**: 2026-01-15
**Status**: Active

> **청킹 구조**: 이 문서는 인덱스 역할을 하며, 상세 내용은 `docs/gfx/` 하위 문서에서 확인하세요.
> **원본 백업**: [_ORIGINAL_BACKUP.md](gfx/_ORIGINAL_BACKUP.md)

---

## 빠른 참조

| 목적 | 문서 |
|------|------|
| 전체 개요 및 소스 우선순위 | [OVERVIEW.md](gfx/00-common/OVERVIEW.md) |
| 변환 함수 참조 | [TRANSFORM_FUNCTIONS.md](gfx/00-common/TRANSFORM_FUNCTIONS.md) |
| NULL/에러 처리 | [NULL_ERROR_HANDLING.md](gfx/00-common/NULL_ERROR_HANDLING.md) |

---

## 카테고리별 매핑 (26개 컴포지션)

| 카테고리 | 컴포지션 수 | 문서 | 설명 |
|----------|:-----------:|------|------|
| chip_display | 6 | [CHIP_DISPLAY.md](gfx/01-categories/CHIP_DISPLAY.md) | 칩 수량 표시, Chip Flow/Comparison |
| payout | 3 | [PAYOUT.md](gfx/01-categories/PAYOUT.md) | 상금표, 등수별 상금 |
| event_info + schedule | 5 | [EVENT_INFO.md](gfx/01-categories/EVENT_INFO.md) | 이벤트 정보, 방송 일정 |
| player_info + staff | 6 | [PLAYER_INFO.md](gfx/01-categories/PLAYER_INFO.md) | 플레이어명, 국기, 스태프 |
| elimination + other | 6 | [ELIMINATION_OTHER.md](gfx/01-categories/ELIMINATION_OTHER.md) | 탈락, 전환 화면 |
| **총합** | **26** | | |

---

## 스키마

| 스키마 | 문서 | 설명 |
|--------|------|------|
| DB 테이블 | [DB_TABLE_SCHEMA.md](gfx/02-schemas/DB_TABLE_SCHEMA.md) | gfx_aep_field_mappings 테이블 DDL |
| JSON 스키마 v3 | [JSON_SCHEMA_V3.md](gfx/02-schemas/JSON_SCHEMA_V3.md) | render_queue.gfx_data JSONB 구조 |

---

## 데이터 흐름

| 흐름 | 문서 |
|------|------|
| 파이프라인 개요 | [PIPELINE_OVERVIEW.md](gfx/03-dataflow/PIPELINE_OVERVIEW.md) |

---

## 예시

| 예시 | 문서 |
|------|------|
| 실제 데이터 + 변환 추적 | [DATA_EXAMPLES.md](gfx/04-examples/DATA_EXAMPLES.md) |

---

## 문서 구조

```
docs/
├── GFX_AEP_FIELD_MAPPING.md          # 인덱스 (현재 문서)
└── gfx/
    ├── _ORIGINAL_BACKUP.md           # 원본 백업
    ├── 00-common/
    │   ├── OVERVIEW.md               # 개요 + 소스 우선순위
    │   ├── TRANSFORM_FUNCTIONS.md    # 변환 함수 DDL
    │   └── NULL_ERROR_HANDLING.md    # 에러 처리 전략
    ├── 01-categories/
    │   ├── CHIP_DISPLAY.md           # chip_display (6개)
    │   ├── PAYOUT.md                 # payout (3개)
    │   ├── EVENT_INFO.md             # event_info + schedule (5개)
    │   ├── PLAYER_INFO.md            # player_info + staff (6개)
    │   └── ELIMINATION_OTHER.md      # elimination + other (6개)
    ├── 02-schemas/
    │   ├── DB_TABLE_SCHEMA.md        # gfx_aep_field_mappings
    │   └── JSON_SCHEMA_V3.md         # render_gfx_data_v3
    ├── 03-dataflow/
    │   └── PIPELINE_OVERVIEW.md      # 전체 파이프라인
    └── 04-examples/
        └── DATA_EXAMPLES.md          # 실제 예시 + 추적
```

---

## 버전 히스토리

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 2.0.0 | 2026-01-15 | 청킹 구조 적용, 13개 문서로 분할 |
| 1.3.0 | 2026-01-14 | 28개 → 26개 컴포지션 (Feature Table 제외) |
| 1.2.0 | 2026-01-13 | 데이터 흐름 다이어그램 추가 |
| 1.1.0 | 2026-01-12 | v2.0 필드 (chips, bbs, 국기) 추가 |
| 1.0.0 | 2026-01-10 | 초기 버전 |

---

## 관련 문서

- [GFX 파이프라인 아키텍처](GFX_PIPELINE_ARCHITECTURE.md)
- [WSOP+ DB 스키마](WSOP+%20DB.md)
- [Manual DB 스키마](Manual%20DB.md)
