# NULL/에러 처리 전략

> **참조**: [전체 인덱스](../../GFX_AEP_FIELD_MAPPING.md) | [변환 함수](TRANSFORM_FUNCTIONS.md)

## 1. 필드별 기본값 정의

AEP 렌더링에 필수 데이터를 보장하기 위해 필드별 기본값을 정의합니다. NULL 값 발생 시 해당 기본값으로 자동 처리됩니다.

| 카테고리 | 필드 | NULL 시 기본값 | 사유 |
|----------|------|---------------|------|
| chip_display | `name` | `""` (빈 문자열) | 슬롯 비우기 |
| chip_display | `chips` | `""` | 슬롯 비우기 |
| chip_display | `bbs` | `""` | 슬롯 비우기 |
| chip_display | `flag` | `"Flag/Unknown.png"` | 기본 국기 이미지 |
| payout | `rank` | `"-"` | 표시 안함 |
| payout | `prize` | `"$0"` | 0원 표시 |
| schedule | `date` | `""` | 슬롯 비우기 |
| schedule | `time` | `""` | 슬롯 비우기 |
| staff | `name` | `""` | 슬롯 비우기 |
| staff | `sub` | `""` | 소셜 핸들 없음 |
| player_info | `country_code` | `"XX"` | Unknown 국가 코드 |
| elimination | `rank` | 필수 | NULL 불가 - 에러 처리 |
| elimination | `prize` | `"$0"` | 상금 정보 없음 |

---

## 2. 폴백 전략

데이터 소스가 다양한 경우, 우선순위에 따라 폴백합니다. 각 소스를 순서대로 확인하고 첫 번째 유효한 값을 사용합니다.

### 2.1 Player Name 폴백

```
┌─────────────────────────────────────────────────────────────────┐
│                    데이터 소스 폴백 순서                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  player_name 예시:                                              │
│                                                                 │
│  1️⃣ gfx_hand_players.player_name                               │
│     └─ "Phil"                                                   │
│                     │                                           │
│                     ▼ NULL 또는 오타 시                          │
│                                                                 │
│  2️⃣ manual_player_overrides.corrected_name                     │
│     └─ "Phil Ivey" (수정된 이름)                                │
│                     │                                           │
│                     ▼ NULL 시                                   │
│                                                                 │
│  3️⃣ 기본값                                                      │
│     └─ "" (빈 문자열)                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Country Code 폴백

```
┌─────────────────────────────────────────────────────────────────┐
│                    country_code 폴백                             │
├─────────────────────────────────────────────────────────────────┤
│  1️⃣ manual_player_overrides.country_code  ← 유일한 소스         │
│  2️⃣ 기본값: "XX" (Unknown)                                      │
│  3️⃣ 국기 경로: "Flag/Unknown.png"                               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 폴백 적용 규칙

- **우선순위**: 데이터베이스 값 → 수동 오버라이드 → 기본값
- **검증**: 각 단계에서 유효성 검사 수행
- **로깅**: 폴백 사용 시 INFO 레벨로 기록

---

## 3. NULL 안전 함수

변환 함수들은 NULL 및 예외 상황을 안전하게 처리하도록 설계되었습니다. 모든 함수는 `_safe` 접미사가 붙어있으며, 예외 발생 시 기본값을 반환합니다.

### 3.1 format_chips_safe()

칩 수를 화폐 형식으로 변환합니다. NULL 및 음수 값을 안전하게 처리합니다.

```sql
-- format_chips: NULL 및 음수 처리
CREATE OR REPLACE FUNCTION format_chips_safe(amount BIGINT)
RETURNS TEXT AS $$
BEGIN
    IF amount IS NULL OR amount < 0 THEN
        RETURN '';
    END IF;
    RETURN TO_CHAR(amount, 'FM999,999,999,999');
EXCEPTION
    WHEN OTHERS THEN
        RETURN '';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**동작**:
- NULL → `""` (빈 문자열)
- 음수 → `""` (빈 문자열)
- 정상값 → `"2,225,000"` (천 단위 구분)
- 예외 → `""` (기본값)

### 3.2 format_bbs_safe()

칩 수를 빅블라인드(BB) 배수로 변환합니다. 0 나누기 방지 및 NULL 처리를 포함합니다.

```sql
-- format_bbs: 0 나누기 방지
CREATE OR REPLACE FUNCTION format_bbs_safe(chips BIGINT, bb BIGINT)
RETURNS TEXT AS $$
BEGIN
    IF chips IS NULL OR bb IS NULL OR bb = 0 THEN
        RETURN '';
    END IF;
    RETURN TO_CHAR(chips::NUMERIC / bb, 'FM999,999.9');
EXCEPTION
    WHEN OTHERS THEN
        RETURN '';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**동작**:
- 칩 또는 BB가 NULL → `""` (빈 문자열)
- BB = 0 → `""` (0 나누기 방지)
- 정상값 → `"111.3"` (소수점 1자리)
- 예외 → `""` (기본값)

### 3.3 format_currency_safe()

금액을 달러 형식으로 변환합니다. NULL 값과 예외를 안전하게 처리합니다.

```sql
-- format_currency: NULL 처리
CREATE OR REPLACE FUNCTION format_currency_safe(amount BIGINT)
RETURNS TEXT AS $$
BEGIN
    IF amount IS NULL THEN
        RETURN '$0';
    END IF;
    RETURN '$' || TO_CHAR(amount / 100, 'FM999,999,999');
EXCEPTION
    WHEN OTHERS THEN
        RETURN '$0';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**동작**:
- NULL → `"$0"`
- 정상값 → `"$1,000,000"`
- 예외 → `"$0"` (기본값)

### 3.4 함수 사용 예시

```sql
-- SELECT에서 직접 사용
SELECT
    player_name,
    format_chips_safe(end_stack_amt) AS chips,
    format_bbs_safe(end_stack_amt, (
        SELECT (blinds->>'big_blind_amt')::BIGINT
        FROM gfx_hands WHERE id = hand_id
    )) AS bbs,
    format_currency_safe(prize_amt) AS prize
FROM gfx_hand_players
WHERE hand_id = 'uuid-1';
```

---

## 4. 에러 로깅

에러 발생 시 심각도별로 적절한 조치를 취합니다.

| 에러 유형 | 심각도 | 조치 |
|----------|--------|------|
| 필수 필드 NULL | ERROR | 렌더링 중단, 알림 발송 |
| 변환 함수 오류 | WARNING | 기본값 사용, 로그 기록 |
| 국기 이미지 없음 | INFO | Unknown.png 사용 |
| 슬롯 초과 데이터 | WARNING | LIMIT으로 자르기 |

### 4.1 로깅 구현

```sql
-- 필수 필드 검증 (렌더링 전)
CREATE OR REPLACE FUNCTION validate_required_fields()
RETURNS TABLE(hand_id UUID, error_message TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT hp.hand_id, 'Missing elimination rank'
    FROM gfx_hand_players hp
    WHERE hp.elimination_rank IS NULL
    UNION ALL
    SELECT hp.hand_id, 'Missing player name'
    FROM gfx_hand_players hp
    WHERE hp.player_name IS NULL OR hp.player_name = '';
END;
$$ LANGUAGE plpgsql;

-- 에러 기록
INSERT INTO error_logs (error_type, severity, message, hand_id, created_at)
SELECT 'NULL_FIELD', 'ERROR', error_message, hand_id, NOW()
FROM validate_required_fields()
WHERE hand_id = current_hand_id;
```

### 4.2 로깅 레벨별 조치

**ERROR (필수 필드)**
- 렌더링 즉시 중단
- 에러 로그 생성
- 관리자 알림 발송
- 원인: `elimination_rank`, `player_name` 등 필수 필드 누락

**WARNING (변환 오류)**
- 기본값으로 대체
- 경고 로그 기록
- 렌더링 계속 진행
- 원인: 함수 예외, 범위 초과 등

**INFO (폴백)**
- 기본값 사용
- 정보성 로그만 기록
- 렌더링 정상 진행
- 원인: 국기 이미지 미보유, 오버라이드 적용 등

---

## 참조 및 연결

- **[변환 함수 상세 문서](TRANSFORM_FUNCTIONS.md)**: SQL 함수 구현 및 성능
- **[GFX AEP 필드 매핑](../../GFX_AEP_FIELD_MAPPING.md)**: 전체 필드 정의
- **[데이터 흐름 설계](DATAFLOW_DESIGN.md)**: 필드별 데이터 경로

---

## 체크리스트

- [ ] 모든 필드에 기본값 정의 (섹션 1)
- [ ] 폴백 전략 검증 (섹션 2)
- [ ] _safe 함수 배포 (섹션 3)
- [ ] 에러 로깅 구현 (섹션 4)
- [ ] 모니터링 대시보드 구성
- [ ] 운영 매뉴얼 작성
