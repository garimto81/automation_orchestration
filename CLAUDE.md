# automation_orchestration

## 프로젝트 역할

**전체 아키텍처 문서 저장소 + 모니터링 허브**

| 역할 | 설명 |
|------|------|
| 아키텍처 문서 | 전체 시스템 설계 문서 관리 |
| 모니터링 | 다른 automation_* 프로젝트 현황 조망 |
| 실제 구현 | ❌ 없음 (다른 프로젝트에서 수행) |

---

## 문서 저장 규칙

**모든 문서는 반드시 `docs/` 폴더에 저장**

```
C:\claude\automation_orchestration\
└── docs\                    # 모든 문서 저장 위치
    ├── architecture.md      # 전체 시스템 아키텍처
    ├── ARCHITECTURE_ANALYSIS.md  # 아키텍처 분석 보고서
    └── AUTOMATION_PROJECTS_REPORT.md  # 프로젝트 현황 보고서
```

### 저장 규칙

| 규칙 | 내용 |
|------|------|
| 위치 | `C:\claude\automation_orchestration\docs\` |
| 형식 | Markdown (.md) |
| 네이밍 | UPPER_SNAKE_CASE.md (보고서), lowercase.md (설계문서) |

### 문서 유형

| 유형 | 파일명 패턴 | 예시 |
|------|-------------|------|
| 설계 문서 | `lowercase.md` | `architecture.md`, `data_flow.md` |
| 분석 보고서 | `*_ANALYSIS.md` | `ARCHITECTURE_ANALYSIS.md` |
| 현황 보고서 | `*_REPORT.md` | `AUTOMATION_PROJECTS_REPORT.md` |
| 스키마 문서 | `* DB.md` | `WSOP+ DB.md`, `Manual DB.md` |

---

## 관련 프로젝트

| 프로젝트 | 역할 |
|---------|------|
| `automation_ae` | After Effects 렌더링 |
| `automation_hub` | 공유 인프라 (DB, 모델) |
| `automation_feature_table` | 핸드 캡처/등급 분류 |
| `automation_sub` | PRD 관리 |
| `automation_aep` | AE 템플릿 매핑 |
| `automation_ae_switcher` | AE 모드 전환 (PRD만) |
