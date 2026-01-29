# GFX 문서 인덱스

**Version**: 1.0.0
**Last Updated**: 2026-01-29

---

## 문서 구조

### 00-common (공통)

| 문서 | 설명 | 용도 |
|------|------|------|
| **INDEX.md** | 이 문서 (문서 인덱스) | 네비게이션 |
| **OVERVIEW.md** | GFX → AEP 매핑 개요 | AEP 연동 |
| **GFX_JSON_STRUCTURE.md** | JSON 원본 구조 분석 | 파싱 참조 |
| **GFX_FIELD_CLASSIFICATION.md** | 필드 분류표 (ACTIVE/RESERVED/ARCHIVED) | 스키마 설계 |
| **GFX_PARSING_GUIDE.md** | 파싱 및 변환 가이드 | 개발 참조 |
| **GFX_DB_MAPPING.md** | JSON → Supabase 매핑 | DB 설계 |
| NULL_ERROR_HANDLING.md | null/오류 처리 규칙 | AEP 연동 |
| TRANSFORM_FUNCTIONS.md | 변환 함수 정의 | AEP 연동 |

### 01-categories (AEP 카테고리)

| 문서 | 설명 | 컴포지션 수 |
|------|------|-------------|
| CHIP_DISPLAY.md | 칩 디스플레이 매핑 | 6개 |
| PLAYER_INFO.md | 플레이어 정보 매핑 | 4개 |
| EVENT_INFO.md | 이벤트 정보 매핑 | 4개 |
| PAYOUT.md | 상금표 매핑 | 3개 |
| ELIMINATION_OTHER.md | 탈락 및 기타 | 4개 |

### 02-schemas (스키마)

| 문서 | 설명 | SSOT |
|------|------|------|
| JSON_SCHEMA_V3.md | gfx_data JSONB 스키마 | 렌더링 큐 |
| DB_TABLE_SCHEMA.md | 테이블 스키마 개요 | Migration SQL |
| GFX_DB_SCHEMA_V2.md | 상세 DB 스키마 | Migration SQL |

### 03-dataflow (데이터 흐름)

| 문서 | 설명 |
|------|------|
| PIPELINE_OVERVIEW.md | 6-Module 파이프라인 |

### 04-examples (예제)

| 문서 | 설명 |
|------|------|
| DATA_EXAMPLES.md | 샘플 데이터 |

---

## 문서 분류

### 순수 JSON 분석 문서

PokerGFX JSON 원본 데이터를 분석하고 파싱하기 위한 문서:

1. **GFX_JSON_STRUCTURE.md** - JSON 계층 구조, 필드 상세
2. **GFX_FIELD_CLASSIFICATION.md** - 필드 분류 (32 ACTIVE, 6 RESERVED, 22 ARCHIVED)
3. **GFX_PARSING_GUIDE.md** - 변환 함수, 주의사항
4. **GFX_DB_MAPPING.md** - 테이블 매핑, 인덱스, 뷰

### AEP 매핑 문서

After Effects 컴포지션 연동을 위한 문서:

1. **OVERVIEW.md** - 26개 컴포지션 개요
2. **01-categories/*.md** - 카테고리별 상세 매핑
3. **JSON_SCHEMA_V3.md** - 렌더링 큐 스키마
4. **TRANSFORM_FUNCTIONS.md** - 포맷팅 함수

---

## 참조 관계

```
┌──────────────────────────────────────────────────────────────┐
│                    GFX JSON 원본 데이터                       │
│  (PGFX_live_data_export GameID=*.json)                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│               JSON 분석 문서 (신규 추가)                      │
│  • GFX_JSON_STRUCTURE.md     (구조 분석)                     │
│  • GFX_FIELD_CLASSIFICATION.md (필드 분류)                   │
│  • GFX_PARSING_GUIDE.md      (파싱 가이드)                   │
│  • GFX_DB_MAPPING.md         (DB 매핑)                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                  Supabase DB (json 스키마)                    │
│  • gfx_sessions, gfx_hands, gfx_hand_players, gfx_events    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│               AEP 매핑 문서 (기존)                            │
│  • OVERVIEW.md               (26개 컴포지션 개요)            │
│  • 01-categories/*.md        (카테고리별 상세)               │
│  • JSON_SCHEMA_V3.md         (렌더링 스키마)                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   After Effects 렌더링                        │
│  • 26개 컴포지션 → 방송 자막                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 외부 참조 문서

### automation_schema 프로젝트

| 문서 | 경로 | 설명 |
|------|------|------|
| 02-GFX-JSON-DB.md | `automation_schema/docs/gfx-json/` | 마스터 DB 스키마 (SSOT 참조) |
| GFX_JSON_COMPREHENSIVE_ANALYSIS.md | `automation_schema/docs/gfx-json/` | 28개 파일 종합 분석 |
| GFX_FIELD_EXTRACTION_GUIDE.md | `automation_schema/docs/gfx-json/` | 필드 추출 스크립트 가이드 |
| GFX_FIELD_OPTIMIZATION_STRATEGY.md | `automation_schema/docs/gfx-json/` | 2계층 전략 상세 |

### gfx_json 프로젝트

| 경로 | 설명 |
|------|------|
| `gfx_json/gfx_json_data/` | 원본 JSON 데이터 (28개 파일) |
| `gfx_json/src/gfx_normalizer.py` | JSON → DB 정규화 스크립트 |

---

## 버전 히스토리

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-29 | 초기 버전 (JSON 분석 문서 4개 추가) |

---

*최종 수정: 2026-01-29*
