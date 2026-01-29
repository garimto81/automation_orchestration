# GFX 필드 분류표

**Version**: 1.0.0
**Last Updated**: 2026-01-29
**분석 대상**: 28개 JSON 파일, 60개 필드

---

## 1. 분류 체계

### 1.1 분류 기준

| 분류 | 정의 | DB 저장 | 용도 |
|------|------|---------|------|
| **ACTIVE** | 현재 사용 중인 필드 | ✅ 저장 | AEP 매핑, 통계 |
| **RESERVED** | 현재 고정값이나 향후 변경 가능 | ✅ 저장 | 확장성 보장 |
| **ARCHIVED** | 미사용 또는 100% null | ❌ 제외 | - |

### 1.2 요약 통계

| 분류 | 필드 수 | 비율 |
|------|---------|------|
| ACTIVE | 32개 | 53% |
| RESERVED | 6개 | 10% |
| ARCHIVED | 22개 | 37% |
| **합계** | **60개** | 100% |

---

## 2. ACTIVE 필드 (32개)

### 2.1 Root Level (5개)

| 필드 | 타입 | 용도 | AEP 컴포지션 |
|------|------|------|-------------|
| `ID` | bigint | 세션 고유 ID (PK) | metadata |
| `CreatedDateTimeUTC` | timestamptz | 생성 시각 | event_info |
| `SoftwareVersion` | text | 버전 추적 | - |
| `Type` | enum | 테이블 타입 구분 | event_info |
| `Payouts[]` | int[] | 상금 배열 | payout |

### 2.2 Hands Level (8개)

| 필드 | 타입 | 용도 | AEP 컴포지션 |
|------|------|------|-------------|
| `HandNum` | int | 핸드 순번 | chip_display |
| `StartDateTimeUTC` | timestamptz | 시작 시각 | - |
| `Duration` | interval | 소요 시간 | - |
| `AnteAmt` | bigint | 앤티 금액 | chip_display |
| `FlopDrawBlinds.BigBlindAmt` | bigint | BB 금액 | chip_display |
| `FlopDrawBlinds.SmallBlindAmt` | bigint | SB 금액 | - |
| `FlopDrawBlinds.ButtonPlayerNum` | int | 버튼 위치 | chip_display |
| `RecordingOffsetStart` | text | 녹화 오프셋 | - |

### 2.3 Players Level (14개)

| 필드 | 타입 | 용도 | AEP 컴포지션 |
|------|------|------|-------------|
| `PlayerNum` | int | 좌석 번호 | chip_display |
| `Name` | text | 표시 이름 | chip_display, player_info |
| `LongName` | text | 전체 이름 | player_info |
| `StartStackAmt` | bigint | 시작 스택 | chip_display |
| `EndStackAmt` | bigint | 종료 스택 | chip_display |
| `CumulativeWinningsAmt` | bigint | 누적 승패 | player_info |
| `HoleCards[]` | text[] | 홀 카드 | player_info |
| `SittingOut` | bool | 자리 비움 | chip_display |
| `EliminationRank` | int | 탈락 순위 | elimination |
| `VPIPPercent` | int | VPIP 통계 | player_info |
| `PreFlopRaisePercent` | int | PFR 통계 | player_info |
| `AggressionFrequencyPercent` | int | AF 통계 | player_info |
| `WentToShowDownPercent` | int | WTSD 통계 | player_info |
| `BlindBetStraddleAmt` | bigint | 스트래들 (0) | - |

### 2.4 Events Level (5개)

| 필드 | 타입 | 용도 | AEP 컴포지션 |
|------|------|------|-------------|
| `EventType` | enum | 액션 타입 | event_info |
| `PlayerNum` | int | 플레이어 식별 | - |
| `BetAmt` | bigint | 베팅 금액 | event_info |
| `Pot` | bigint | 팟 크기 | chip_display |
| `BoardCards` | text | 보드 카드 | board_display |

---

## 3. RESERVED 필드 (6개)

> 현재 고정값이나 향후 게임 타입 확장 시 활성화 예정

| 필드 | 현재값 | 활성화 조건 |
|------|--------|-------------|
| `BetStructure` | `"NOLIMIT"` | PLO, Limit 추가 시 |
| `GameClass` | `"FLOP"` | Stud, Draw 추가 시 |
| `GameVariant` | `"HOLDEM"` | Omaha 추가 시 |
| `AnteType` | `"BB_ANTE_BB1ST"` | 앤티 방식 변경 시 |
| `BoardNum` | `0`, `1` | Run It Twice 활성화 시 |
| `FlopDrawBlinds.BlindLevel` | `0` | 레벨 표시 필요 시 |

### 3.1 활성화 로드맵

```
Phase 1 (현재): HOLDEM + NOLIMIT + FLOP
Phase 2 (예정): + PLO (BetStructure 활성화)
Phase 3 (예정): + Stud (GameClass 활성화)
Phase 4 (예정): + Run It Twice (BoardNum 활성화)
```

---

## 4. ARCHIVED 필드 (22개)

### 4.1 100% null 또는 빈값 (3개)

| 필드 | 값 | 제외 사유 |
|------|-----|----------|
| `EventTitle` | `""` | 항상 빈 문자열 |
| `Hands.Description` | `""` | 항상 빈 문자열 |
| `Events.DateTimeUTC` | `null` | 항상 null |

### 4.2 항상 고정값 (15개)

| 필드 | 고정값 | 제외 사유 |
|------|--------|----------|
| `BombPotAmt` | `0` | 봄팟 미사용 |
| `NumBoards` | `1` | 단일 보드 |
| `RunItNumTimes` | `1` | 런잇원스 |
| `ThirdBlindAmt` | `0` | 3번째 블라인드 없음 |
| `ThirdBlindPlayerNum` | `0` | 3번째 블라인드 없음 |
| `StudLimits.BringInAmt` | `0` | Stud 미사용 |
| `StudLimits.BringInPlayerNum` | `1` | Stud 미사용 |
| `StudLimits.HighLimitAmt` | `0` | Stud 미사용 |
| `StudLimits.LowLimitAmt` | `0` | Stud 미사용 |
| `Events.NumCardsDrawn` | `0` | Draw 미사용 |

### 4.3 중복 또는 추론 가능 (4개)

| 필드 | 제외 사유 | 대안 |
|------|----------|------|
| `BigBlindPlayerNum` | ButtonPlayerNum + 2로 추론 가능 | 저장 시 계산 |
| `SmallBlindPlayerNum` | ButtonPlayerNum + 1로 추론 가능 | 저장 시 계산 |
| `Events.BoardNum` | 현재 항상 0 또는 1 | RESERVED로 유지 |

---

## 5. AEP 매핑 요약

### 5.1 컴포지션별 필요 필드

| AEP 카테고리 | ACTIVE 필드 | 필드 수 |
|-------------|-------------|---------|
| **chip_display** | HandNum, AnteAmt, BigBlindAmt, ButtonPlayerNum, PlayerNum, Name, StartStackAmt, EndStackAmt, SittingOut, Pot | 10개 |
| **player_info** | Name, LongName, CumulativeWinningsAmt, HoleCards, VPIPPercent, PreFlopRaisePercent, AggressionFrequencyPercent, WentToShowDownPercent | 8개 |
| **event_info** | CreatedDateTimeUTC, Type, EventType, BetAmt | 4개 |
| **payout** | Payouts | 1개 |
| **elimination** | EliminationRank | 1개 |
| **board_display** | BoardCards | 1개 |
| **metadata** | ID, SoftwareVersion | 2개 |

### 5.2 미사용 ACTIVE 필드

| 필드 | 저장 사유 |
|------|----------|
| `RecordingOffsetStart` | 녹화 동기화 용도 |
| `StartDateTimeUTC` | 시간 분석용 |
| `Duration` | 핸드 길이 분석 |
| `SmallBlindAmt` | BB와 함께 저장 |
| `BlindBetStraddleAmt` | 향후 스트래들 지원 |

---

## 6. 2계층 매핑 전략

### 6.1 Layer 1: 저장 계층

**목적**: 원본 데이터 보존 + 확장성

| 대상 | 필드 수 | 저장 위치 |
|------|---------|----------|
| ACTIVE | 32개 | 정규화 테이블 |
| RESERVED | 6개 | 정규화 테이블 |
| 원본 JSON | 전체 | `raw_json` JSONB |

### 6.2 Layer 2: 쿼리 계층

**목적**: AEP 렌더링 최적화

| 뷰 | 사용 필드 | 용도 |
|----|----------|------|
| `v_aep_chip_display` | 10개 | 칩 디스플레이 렌더링 |
| `v_aep_player_stats` | 8개 | 플레이어 통계 |
| `v_aep_event_info` | 4개 | 이벤트 정보 |

### 6.3 성능 비교

| 접근 방식 | 쿼리 시간 | 용도 |
|-----------|----------|------|
| 정규화 테이블 | 5~20ms | 실시간 방송 |
| JSONB 직접 쿼리 | 500ms+ | 분석/감사 |

---

## 7. 필드별 null/빈값 현황

### 7.1 Root Level

| 필드 | null% | 빈값% | 비고 |
|------|-------|-------|------|
| ID | 0% | - | 필수 |
| CreatedDateTimeUTC | 0% | - | 필수 |
| SoftwareVersion | 0% | 0% | 항상 동일 |
| Type | 0% | 0% | - |
| EventTitle | 0% | **100%** | 미사용 |
| Payouts | 0% | - | 모두 0 |

### 7.2 Players Level (null% 차이)

| 필드 | table-GG | table-pokercaster |
|------|----------|-------------------|
| LongName | 0.3% | 3.1% |
| HoleCards (빈값) | 2% | 8.4% |

---

## 8. 마이그레이션 체크리스트

### 8.1 신규 필드 추가 시

```markdown
- [ ] 분류 결정 (ACTIVE/RESERVED/ARCHIVED)
- [ ] AEP 매핑 필요 여부 확인
- [ ] 이 문서 업데이트
- [ ] DB 마이그레이션 작성 (ACTIVE/RESERVED만)
- [ ] 파싱 로직 업데이트
```

### 8.2 RESERVED → ACTIVE 전환 시

```markdown
- [ ] 활성화 조건 충족 확인
- [ ] AEP 컴포지션 매핑 추가
- [ ] 이 문서 분류 변경
- [ ] 뷰 업데이트 (v_aep_*)
```

---

## 9. 관련 문서

| 문서 | 설명 |
|------|------|
| `GFX_JSON_STRUCTURE.md` | JSON 원본 구조 상세 |
| `GFX_PARSING_GUIDE.md` | 파싱 및 변환 가이드 |
| `GFX_DB_MAPPING.md` | DB 스키마 매핑 |

---

*최종 수정: 2026-01-29*
