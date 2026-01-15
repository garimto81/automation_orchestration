# GFX 데이터 파이프라인 개요

> **참조**: [전체 인덱스](../../GFX_AEP_FIELD_MAPPING.md)

## 전체 파이프라인 흐름

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GFX JSON → DB → AEP 전체 데이터 흐름                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   PokerGFX       │     │   PostgreSQL     │     │   After Effects  │
│   JSON 파일      │────▶│   테이블 저장    │────▶│   컴포지션       │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ • ID (GameID)    │     │ • gfx_sessions   │     │ • 28개 컴포지션  │
│ • EventTitle     │     │ • gfx_hands      │     │ • 텍스트 레이어  │
│ • Hands[]        │     │ • gfx_hand_players│    │ • 슬롯 기반 매핑 │
│ • Players[]      │     │ • unified_players │    │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

## 데이터 흐름 단계

### 1단계: GFX JSON 수집
PokerGFX에서 생성된 JSON 파일 형식:
- **GameID**: 게임 세션 고유 ID
- **EventTitle**: 이벤트 제목
- **Hands[]**: 핸드 배열
- **Players[]**: 플레이어 정보 배열

### 2단계: PostgreSQL DB 저장
JSON 데이터를 관계형 테이블로 정규화:
- `gfx_sessions`: 게임 세션 정보
- `gfx_hands`: 핸드별 정보 (블라인드 등)
- `gfx_hand_players`: 핸드별 플레이어 정보
- `unified_players`: 통합 플레이어 정보

### 3단계: 매핑 처리
카테고리별 필드 매핑:
- 텍스트 변환 (UPPER, format_chips 등)
- 슬롯 기반 할당
- 조건부 로직 적용

### 4단계: 렌더링 큐 저장
AEP 컴포지션별 필드 데이터:
- 컴포지션 이름
- 슬롯 인덱스
- 필드명/값 쌍

### 5단계: AEP 출력
After Effects 컴포지션 자동 생성:
- 28개 컴포지션
- 텍스트 레이어 업데이트
- 슬롯 기반 매핑

## 카테고리별 상세 흐름

| 카테고리 | 슬롯 수 | 상세 문서 |
|----------|--------|----------|
| chip_display | 9 | [CHIP_DISPLAY.md](../01-categories/CHIP_DISPLAY.md) |
| payout | 9 | [PAYOUT.md](../01-categories/PAYOUT.md) |
| event_info | 가변 | [EVENT_INFO.md](../01-categories/EVENT_INFO.md) |
| player_info | 6 | [PLAYER_INFO.md](../01-categories/PLAYER_INFO.md) |
| elimination | 가변 | [ELIMINATION_OTHER.md](../01-categories/ELIMINATION_OTHER.md) |

## 주요 특징

### 슬롯 기반 매핑
- 각 AEP 컴포지션은 슬롯 배열로 구성
- 슬롯 인덱스는 플레이어 순서와 매핑
- 슬롯별로 동일한 필드 이름 사용

### 데이터 변환 함수
- `UPPER()`: 이름 대문자 처리
- `format_chips()`: 칩 개수 포맷팅 (1,000,000)
- `format_bbs()`: 빅블라인드 배수 계산
- `get_flag_path()`: 국가 코드 → 플래그 이미지 경로

### NULL 처리
각 카테고리별 NULL 값 처리 규칙:
- [NULL 에러 처리 가이드](../00-common/NULL_ERROR_HANDLING.md)

### 변환 함수
상세한 변환 함수 구현:
- [변환 함수 가이드](../00-common/TRANSFORM_FUNCTIONS.md)

## 참고 자료

- [전체 필드 매핑](../../GFX_AEP_FIELD_MAPPING.md)
- [공통 문서](../00-common/OVERVIEW.md)
