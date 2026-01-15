# GFX 데이터 변환 함수

> **참조**: [전체 인덱스](../../GFX_AEP_FIELD_MAPPING.md) | [설계 문서](../GFX_PIPELINE_ARCHITECTURE.md)

## 개요

GFX JSON DB → AEP 자막 변환에 사용되는 PostgreSQL 함수 모음. 숫자, 통화, 날짜, 시간 포맷팅 및 미디어 경로 조회 기능을 제공합니다.

## 함수 목록 (9개)

| 함수명 | 입력 | 출력 | 버전 | 설명 |
|--------|------|------|------|------|
| `format_chips` | BIGINT | TEXT | v1.0 | 칩 수량 천단위 포맷 |
| `format_bbs` | (BIGINT, BIGINT) | TEXT | v1.0 | BB 배수 계산 |
| `format_currency` | BIGINT | TEXT | v1.0 | 달러 통화 포맷 |
| `format_date` | DATE | TEXT | v1.0 | 날짜 포맷 (Mon DD) |
| `format_time` | TIME | TEXT | v1.0 | 시간 포맷 (HH:MM AM/PM) |
| `format_blinds` | (BIGINT, BIGINT, BIGINT) | TEXT | v1.0 | 블라인드 구조 포맷 |
| `get_flag_path` | VARCHAR | TEXT | v1.0 | 국가별 국기 미디어 경로 |
| `format_percent` | NUMERIC | TEXT | v2.0 | 백분율 포맷 |
| `get_chips_n_hands_ago` | (BIGINT, INTEGER, TEXT, INTEGER) | BIGINT | v2.0 | N핸드 전 칩 잔액 조회 |

---

## 함수 정의

### format_chips {#format_chips}

칩 수량을 천단위 구분 기호로 포맷팅합니다.

**입력**: `amount BIGINT` - 칩 수량
**출력**: `TEXT` - 포맷팅된 문자열
**버전**: v1.0
**성능 특성**: IMMUTABLE (캐시 가능)

**사용 사례**: 1,500,000 → "1,500,000"

```sql
CREATE FUNCTION format_chips(amount BIGINT) RETURNS TEXT AS $$
    SELECT TO_CHAR(amount, 'FM999,999,999,999')
$$ LANGUAGE SQL IMMUTABLE;
```

**예시**:
```sql
SELECT format_chips(1500000);
-- 결과: 1,500,000

SELECT format_chips(50000);
-- 결과: 50,000
```

---

### format_bbs {#format_bbs}

칩 잔액을 BB(Big Blind) 배수로 변환합니다.

**입력**:
- `chips BIGINT` - 플레이어 칩 잔액
- `bb BIGINT` - 빅 블라인드 수량

**출력**: `TEXT` - BB 배수 (소수점 1자리)
**버전**: v1.0
**성능 특성**: IMMUTABLE
**안전성**: NULLIF로 0 나누기 방지

**사용 사례**: (1500000, 20000) → "75.0"

```sql
CREATE FUNCTION format_bbs(chips BIGINT, bb BIGINT) RETURNS TEXT AS $$
    SELECT TO_CHAR(chips::NUMERIC / NULLIF(bb, 0), 'FM999,999.9')
$$ LANGUAGE SQL IMMUTABLE;
```

**예시**:
```sql
SELECT format_bbs(1500000, 20000);
-- 결과: 75.0

SELECT format_bbs(100000, 10000);
-- 결과: 10.0

SELECT format_bbs(100000, 0);
-- 결과: NULL (0 나누기 안전)
```

---

### format_currency {#format_currency}

센트 단위 통화값을 달러 표기로 변환합니다.

**입력**: `amount BIGINT` - 센트 단위 금액
**출력**: `TEXT` - 달러 표기
**버전**: v1.0
**성능 특성**: IMMUTABLE

**사용 사례**: 1500000 (센트) → "$15,000"

```sql
CREATE FUNCTION format_currency(amount BIGINT) RETURNS TEXT AS $$
    SELECT '$' || TO_CHAR(amount / 100, 'FM999,999,999')
$$ LANGUAGE SQL IMMUTABLE;
```

**예시**:
```sql
SELECT format_currency(1500000);
-- 결과: $15,000

SELECT format_currency(25000);
-- 결과: $250
```

---

### format_date {#format_date}

날짜를 "Mon DD" 형식으로 포맷팅합니다.

**입력**: `d DATE` - 날짜
**출력**: `TEXT` - 포맷팅된 날짜
**버전**: v1.0
**성능 특성**: IMMUTABLE

**사용 사례**: 2026-01-14 → "Jan 14"

```sql
CREATE FUNCTION format_date(d DATE) RETURNS TEXT AS $$
    SELECT TO_CHAR(d, 'Mon DD')
$$ LANGUAGE SQL IMMUTABLE;
```

**예시**:
```sql
SELECT format_date('2026-01-14'::DATE);
-- 결과: Jan 14

SELECT format_date('2026-12-25'::DATE);
-- 결과: Dec 25
```

---

### format_time {#format_time}

시간을 "HH:MM AM/PM" 형식으로 포맷팅합니다.

**입력**: `t TIME` - 시간
**출력**: `TEXT` - 포맷팅된 시간
**버전**: v1.0
**성능 특성**: IMMUTABLE

**사용 사례**: 17:30 → "05:30 PM"

```sql
CREATE FUNCTION format_time(t TIME) RETURNS TEXT AS $$
    SELECT TO_CHAR(t, 'HH:MI AM')
$$ LANGUAGE SQL IMMUTABLE;
```

**예시**:
```sql
SELECT format_time('17:30'::TIME);
-- 결과: 05:30 PM

SELECT format_time('09:15'::TIME);
-- 결과: 09:15 AM
```

---

### format_blinds {#format_blinds}

블라인드 구조(SB/BB/Ante)를 포맷팅합니다.

**입력**:
- `sb BIGINT` - 스몰 블라인드
- `bb BIGINT` - 빅 블라인드
- `ante BIGINT` - 앤테 (0이면 표시 안 함)

**출력**: `TEXT` - 포맷팅된 블라인드 구조
**버전**: v1.0
**성능 특성**: IMMUTABLE
**의존성**: `format_chips_short()` 함수 필요

**사용 사례**: (10000, 20000, 20000) → "10K/20K (20K)"

```sql
CREATE FUNCTION format_blinds(sb BIGINT, bb BIGINT, ante BIGINT) RETURNS TEXT AS $$
    SELECT format_chips_short(sb) || '/' || format_chips_short(bb) ||
           CASE WHEN ante > 0 THEN ' (' || format_chips_short(ante) || ')' ELSE '' END
$$ LANGUAGE SQL IMMUTABLE;
```

**예시**:
```sql
SELECT format_blinds(10000, 20000, 20000);
-- 결과: 10K/20K (20K)

SELECT format_blinds(25, 50, 0);
-- 결과: 25/50
```

**주의사항**: `format_chips_short()` 함수가 사전에 정의되어야 합니다.

---

### get_flag_path {#get_flag_path}

국가 코드에 해당하는 국기 미디어 파일 경로를 조회합니다.

**입력**: `country_code VARCHAR` - ISO 국가 코드 (예: "KR", "US")
**출력**: `TEXT` - 미디어 파일 경로 (없으면 "Flag/Unknown.png")
**버전**: v1.0
**성능 특성**: STABLE (세션 내 일정)
**의존성**: `aep_media_sources` 테이블

**사용 사례**: "KR" → "Flag/Korea.png"

```sql
CREATE FUNCTION get_flag_path(country_code VARCHAR) RETURNS TEXT AS $$
    SELECT COALESCE(
        (SELECT file_path FROM aep_media_sources WHERE category = 'Flag' AND country_code = UPPER($1)),
        'Flag/Unknown.png'
    )
$$ LANGUAGE SQL STABLE;
```

**예시**:
```sql
SELECT get_flag_path('KR');
-- 결과: Flag/Korea.png (aep_media_sources에 등록된 경우)

SELECT get_flag_path('XX');
-- 결과: Flag/Unknown.png (미등록 국가코드)
```

**매핑 데이터**: `aep_media_sources` 테이블의 `Flag` 카테고리에서 관리

---

### format_percent {#format_percent}

소수점 값을 백분율로 포맷팅합니다. (v2.0 신규)

**입력**: `value NUMERIC` - 소수점 값 (0~1 범위)
**출력**: `TEXT` - 백분율 표기
**버전**: v2.0.0
**성능 특성**: IMMUTABLE
**NULL 처리**: NULL → "0%"

**사용 사례**: 0.354 → "35.4%"

```sql
CREATE OR REPLACE FUNCTION format_percent(value NUMERIC)
RETURNS TEXT AS $$
BEGIN
    IF value IS NULL THEN
        RETURN '0%';
    END IF;
    RETURN TO_CHAR(value * 100, 'FM999.9') || '%';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**예시**:
```sql
SELECT format_percent(0.354);
-- 결과: 35.4%

SELECT format_percent(1.0);
-- 결과: 100.0%

SELECT format_percent(NULL);
-- 결과: 0%
```

---

### get_chips_n_hands_ago {#get_chips_n_hands_ago}

N핸드 전 특정 플레이어의 칩 잔액을 조회합니다. (v2.0 신규)

**입력**:
- `p_session_id BIGINT` - 세션 ID
- `p_current_hand_num INTEGER` - 현재 핸드 번호
- `p_player_name TEXT` - 플레이어 이름 (대소문자 무시)
- `p_n_hands INTEGER` - 조회할 이전 핸드 수

**출력**: `BIGINT` - 칩 잔액 (없으면 NULL)
**버전**: v2.0.0
**성능 특성**: STABLE (세션 내 일정)
**의존성**: `gfx_hands`, `gfx_hand_players` 테이블

**사용 사례**: 현재 핸드에서 5핸드 전 플레이어의 칩 잔액 조회

```sql
CREATE OR REPLACE FUNCTION get_chips_n_hands_ago(
    p_session_id BIGINT,
    p_current_hand_num INTEGER,
    p_player_name TEXT,
    p_n_hands INTEGER
) RETURNS BIGINT AS $$
DECLARE
    v_chips BIGINT;
BEGIN
    SELECT hp.end_stack_amt INTO v_chips
    FROM gfx_hand_players hp
    JOIN gfx_hands h ON hp.hand_id = h.id
    WHERE h.session_id = p_session_id
      AND h.hand_num = p_current_hand_num - p_n_hands
      AND LOWER(hp.player_name) = LOWER(p_player_name)
    LIMIT 1;

    RETURN v_chips;
END;
$$ LANGUAGE plpgsql STABLE;
```

**예시**:
```sql
-- 현재 핸드 100에서 5핸드 전(핸드 95) "Alice"의 칩 조회
SELECT get_chips_n_hands_ago(12345, 100, 'Alice', 5);
-- 결과: 500000

-- 존재하지 않는 핸드
SELECT get_chips_n_hands_ago(12345, 100, 'Bob', 200);
-- 결과: NULL
```

**특징**:
- 플레이어 이름 대소문자 무시 처리 (`LOWER()`)
- 핸드 번호 유효성 검증 (음수 번호 방지)
- NULL 안전 처리

---

## 설치 및 관리

### DDL 실행

모든 함수를 데이터베이스에 생성:

```sql
-- 위 "함수 정의" 섹션의 모든 CREATE FUNCTION 문 실행
-- 순서: format_chips → format_bbs → ... → get_chips_n_hands_ago
```

### 함수 검증

```sql
-- 설치된 함수 확인
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'format_%'
  OR routine_name LIKE 'get_%'
ORDER BY routine_name;
```

### 함수 삭제

```sql
-- 개별 삭제
DROP FUNCTION IF EXISTS format_chips(BIGINT);
DROP FUNCTION IF EXISTS get_chips_n_hands_ago(BIGINT, INTEGER, TEXT, INTEGER);

-- 전체 삭제 (주의!)
DROP FUNCTION IF EXISTS format_chips;
DROP FUNCTION IF EXISTS format_bbs;
DROP FUNCTION IF EXISTS format_currency;
DROP FUNCTION IF EXISTS format_date;
DROP FUNCTION IF EXISTS format_time;
DROP FUNCTION IF EXISTS format_blinds;
DROP FUNCTION IF EXISTS get_flag_path;
DROP FUNCTION IF EXISTS format_percent;
DROP FUNCTION IF EXISTS get_chips_n_hands_ago;
```

---

## 성능 고려사항

| 함수 | IMMUTABLE | STABLE | I/O 특성 | 권장 |
|------|-----------|--------|----------|------|
| format_chips | ✅ | - | Deterministic | 캐시 활용 |
| format_bbs | ✅ | - | Deterministic | 캐시 활용 |
| format_currency | ✅ | - | Deterministic | 캐시 활용 |
| format_date | ✅ | - | Deterministic | 캐시 활용 |
| format_time | ✅ | - | Deterministic | 캐시 활용 |
| format_blinds | ✅ | - | Deterministic | 캐시 활용 |
| get_flag_path | - | ✅ | 테이블 읽기 | 인덱스 필수 |
| format_percent | ✅ | - | Deterministic | 캐시 활용 |
| get_chips_n_hands_ago | - | ✅ | 테이블 읽기 | 인덱스 필수 |

**캐시 활용 팁**:
- IMMUTABLE 함수는 쿼리 최적화 시 캐싱 가능
- STABLE 함수는 동일 세션 내 반복 호출 시 캐싱 (외부 의존성 있음)

---

## 관련 문서

- [GFX AEP 필드 매핑 명세서](../../GFX_AEP_FIELD_MAPPING.md)
- [GFX 데이터 파이프라인 아키텍처](../GFX_PIPELINE_ARCHITECTURE.md)
- PostgreSQL 공식 문서: [TO_CHAR()](https://www.postgresql.org/docs/current/functions-formatting.html)
