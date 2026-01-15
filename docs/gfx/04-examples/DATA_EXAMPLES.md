# 실제 데이터 예시

> **참조**: [전체 인덱스](../../GFX_AEP_FIELD_MAPPING.md) | [변환 함수](../00-common/TRANSFORM_FUNCTIONS.md)

## 1. GFX JSON 원본 샘플

**파일**: `PGFX_live_data_export GameID=638677842396130000.json`

```json
{
  "ID": 638677842396130000,
  "CreatedDateTimeUTC": "2026-01-14T10:30:00Z",
  "EventTitle": "WSOP SUPER CIRCUIT CYPRUS - MAIN EVENT",
  "Type": "FEATURE_TABLE",
  "Payouts": [1000000, 670000, 475000, 345000, 250000, 185000, 140000, 107500, 82000],
  "Hands": [
    {
      "HandNum": 42,
      "Duration": "PT35.2477537S",
      "StartDateTimeUTC": "2026-01-14T10:30:45.123Z",
      "FlopDrawBlinds": {
        "Ante_Type": "BB_ANTE_BB1ST",
        "BigBlind_Amt": 20000,
        "SmallBlind_Amt": 10000,
        "Button_PlayerNum": 1
      },
      "Players": [
        {
          "PlayerNum": 1,
          "Name": "Lipauka",
          "LongName": "Justas Lipauka",
          "HoleCards": ["As", "Kh"],
          "StartStackAmt": 2100000,
          "EndStackAmt": 2225000,
          "CumulativeWinningsAmt": 125000,
          "VPIP_Percent": 35.5,
          "PFR_Percent": 28.0,
          "EliminationRank": -1
        },
        {
          "PlayerNum": 2,
          "Name": "Voronin",
          "LongName": "Konstantin Voronin",
          "HoleCards": [""],
          "StartStackAmt": 1500000,
          "EndStackAmt": 1625000,
          "CumulativeWinningsAmt": 125000,
          "VPIP_Percent": 42.0,
          "EliminationRank": -1
        }
      ]
    }
  ]
}
```

## 2. DB 저장 후 데이터

### gfx_sessions

| session_id         | event_title                              | payouts                                    |
|--------------------|------------------------------------------|-------------------------------------------|
| 638677842396130000 | WSOP SUPER CIRCUIT CYPRUS - MAIN EVENT   | {1000000,670000,475000,345000,250000,...} |

### gfx_hands

| id     | session_id         | hand_num | blinds                                              |
|--------|--------------------| ---------|-----------------------------------------------------|
| uuid-1 | 638677842396130000 | 42       | {"big_blind_amt":20000,"small_blind_amt":10000,...} |

### gfx_hand_players

| hand_id | seat_num | player_name | end_stack_amt | vpip_percent | sitting_out | elimination_rank |
|---------|----------|-------------|---------------|--------------|-------------|------------------|
| uuid-1  | 1        | Lipauka     | 2225000       | 35.5         | FALSE       | -1               |
| uuid-1  | 2        | Voronin     | 1625000       | 42.0         | FALSE       | -1               |

## 3. AEP 출력 데이터

### _MAIN Mini Chip Count 컴포지션

```json
{
  "comp_name": "_MAIN Mini Chip Count",
  "render_type": "chip_count",
  "slots": [
    {
      "slot_index": 1,
      "fields": {
        "name": "LIPAUKA",
        "chips": "2,225,000",
        "bbs": "111.3",
        "rank": "1",
        "flag": "Flag/Lithuania.png"
      }
    },
    {
      "slot_index": 2,
      "fields": {
        "name": "VORONIN",
        "chips": "1,625,000",
        "bbs": "81.3",
        "rank": "2",
        "flag": "Flag/Russia.png"
      }
    }
  ],
  "single_fields": {
    "wsop_super_circuit_cyprus": "2025 WSOP SUPER CIRCUIT CYPRUS",
    "AVERAGE STACK": "1,925,000 (96BB)"
  },
  "metadata": {
    "session_id": 638677842396130000,
    "hand_num": 42,
    "blind_level": "10K/20K",
    "generated_at": "2026-01-14T10:35:00Z",
    "data_sources": ["gfx_hand_players", "gfx_hands", "unified_players"]
  }
}
```

### Payouts 컴포지션

```json
{
  "comp_name": "Payouts",
  "render_type": "payout",
  "slots": [
    {"slot_index": 1, "fields": {"rank": "1", "prize": "$1,000,000"}},
    {"slot_index": 2, "fields": {"rank": "2", "prize": "$670,000"}},
    {"slot_index": 3, "fields": {"rank": "3", "prize": "$475,000"}},
    {"slot_index": 4, "fields": {"rank": "4", "prize": "$345,000"}},
    {"slot_index": 5, "fields": {"rank": "5", "prize": "$250,000"}},
    {"slot_index": 6, "fields": {"rank": "6", "prize": "$185,000"}},
    {"slot_index": 7, "fields": {"rank": "7", "prize": "$140,000"}},
    {"slot_index": 8, "fields": {"rank": "8", "prize": "$107,500"}},
    {"slot_index": 9, "fields": {"rank": "9", "prize": "$82,000"}}
  ],
  "single_fields": {
    "wsop_super_circuit_cyprus": "2025 WSOP SUPER CIRCUIT CYPRUS",
    "payouts": "PAYOUTS",
    "total_prize": "$4,254,500"
  }
}
```

## 4. 변환 과정 추적

### 4.1 Name 필드 변환: "Lipauka" → "LIPAUKA"

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    "Lipauka" → "LIPAUKA" 변환 추적                          │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. GFX JSON 입력                                                         │
│     "Name": "Lipauka"                                                     │
│                                                                           │
│  2. DB 저장 (gfx_hand_players)                                            │
│     player_name: "Lipauka"                                                │
│                                                                           │
│  3. Manual Override 체크                                                   │
│     SELECT corrected_name FROM manual_player_overrides                    │
│     WHERE original_name = 'lipauka'                                       │
│     → NULL (오버라이드 없음)                                               │
│                                                                           │
│  4. SQL 변환                                                              │
│     UPPER(COALESCE(mo.corrected_name, hp.player_name))                    │
│     = UPPER("Lipauka")                                                    │
│     = "LIPAUKA"                                                           │
│                                                                           │
│  5. AEP 출력                                                              │
│     "name": "LIPAUKA"                                                     │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Stack 필드 변환: 2225000 → "2,225,000" (111.3BB)

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    2225000 → "2,225,000" (111.3BB) 변환 추적               │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. GFX JSON 입력                                                         │
│     "EndStackAmt": 2225000                                                │
│     "FlopDrawBlinds.BigBlind_Amt": 20000                                  │
│                                                                           │
│  2. DB 저장                                                               │
│     gfx_hand_players.end_stack_amt: 2225000                               │
│     gfx_hands.blinds->>'big_blind_amt': 20000                             │
│                                                                           │
│  3. SQL 변환                                                              │
│     format_chips(2225000) = "2,225,000"                                   │
│     format_bbs(2225000, 20000) = "111.3"                                  │
│                                                                           │
│  4. AEP 출력                                                              │
│     "chips": "2,225,000"                                                  │
│     "bbs": "111.3"                                                        │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```
