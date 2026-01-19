# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Role

**Architecture Documentation Hub + Monitoring Center**

| Role | Description |
|------|-------------|
| Architecture Docs | Central management of system design documents |
| Monitoring | Overview of other automation_* projects |
| Implementation | None (performed in other projects) |

---

## Document Storage Rules

**All documents must be stored in `docs/` folder**

```
C:\claude\automation_orchestration\
├── docs/                    # All documents here
│   ├── architecture.md      # DB schema detailed design (DDL, ERD)
│   ├── GFX_PIPELINE_ARCHITECTURE.md  # 6-module pipeline
│   ├── ARCHITECTURE_ANALYSIS.md      # Executive summary
│   ├── AUTOMATION_PROJECTS_REPORT.md # 7 projects status
│   ├── MODULE_*_DESIGN.md   # Module-specific designs
│   ├── gfx/                 # GFX data specifications
│   │   ├── 00-common/       # Common docs
│   │   ├── 01-categories/   # Category docs
│   │   ├── 02-schemas/      # Schema definitions
│   │   └── 03-dataflow/     # Data flow docs
│   ├── mockups/             # HTML mockups
│   └── images/              # Screenshots, diagrams
└── migrations/              # SQL migration files
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Design docs | `lowercase.md` | `architecture.md`, `data_flow.md` |
| Analysis reports | `*_ANALYSIS.md` | `ARCHITECTURE_ANALYSIS.md` |
| Status reports | `*_REPORT.md` | `AUTOMATION_PROJECTS_REPORT.md` |
| Module designs | `MODULE_*_DESIGN.md` | `MODULE_1_2_DESIGN.md` |
| Schema docs | `* DB.md` | `WSOP+ DB.md` |

---

## System Architecture

### 6-Module Pipeline Architecture

```
[Module 1] GFX Simulator (automation_feature_table)
     │ JSON Files
     ▼
[Module 2] GFX-NAS-Supabase Sync (automation_hub)
     │ INSERT
     ▼
[Module 3] Supabase DB Schema (4 schemas: json, wsop_plus, manual, ae)
     │ Realtime
     ├───────────────────┐
     ▼                   ▼
[Module 4]           [Module 5]
Main Dashboard       Sub Dashboard
(What/When)          (How)
     │ WebSocket         │ render_jobs
     └───────────────────┤
                         ▼
              [Module 6] AE-Nexrender → Output
```

### Data Source Priority

**Manual > WSOP+ > GFX** for unified views

### Key Unified Views

| View | Purpose |
|------|---------|
| `unified_players` | Player info merged from 3 sources |
| `unified_events` | Tournament/session info merged |
| `unified_chip_data` | Chip data (WSOP+ > GFX priority) |

---

## Related Projects

| Project | Module | Role |
|---------|--------|------|
| `automation_feature_table` | 1 | GFX Simulator |
| `automation_hub` | 2, 3 | NAS Sync, Supabase Schema |
| (TBD) | 4 | Main Dashboard |
| (TBD) | 5 | Sub Dashboard |
| `automation_ae` | 6 | AE-Nexrender |
| `automation_aep` | - | AEP Template Analysis |
| `automation_orchestration` | - | Documentation Hub |

---

## Key Documents Reference

| Document | Purpose |
|----------|---------|
| `docs/architecture.md` | 5-layer DB schema design (DDL, ERD, Enum types) |
| `docs/GFX_PIPELINE_ARCHITECTURE.md` | 6-module pipeline details |
| `docs/ARCHITECTURE_ANALYSIS.md` | Executive summary |
| `docs/MODULE_3_5_DESIGN.md` | Supabase schema + Dashboard design |
| `docs/GFX_AEP_FIELD_MAPPING.md` | 26 compositions, 84 fields mapping |
| `migrations/*.sql` | Supabase migration files |

---

## Working with This Repository

### No Build/Test Commands

This is a documentation-only repository. No code implementation exists.

### Creating New Documents

1. Create in `docs/` folder only
2. Follow naming conventions above
3. Add cross-references to related documents using:
   ```markdown
   > **Related Documents**
   > - [Document Name](./filename.md) - Description
   ```

### Mockups and Screenshots

1. Create HTML mockup in `docs/mockups/`
2. Capture screenshot using Playwright
3. Save to `docs/images/`
4. Reference in documentation

---

## Supabase Schema Structure

| Schema | Purpose | Tables |
|--------|---------|--------|
| `json` | GFX JSON data | gfx_sessions, hands, hand_players, hand_actions, hand_cards, hand_results |
| `wsop_plus` | WSOP+ imports | tournaments, blind_levels, payouts, official_players |
| `manual` | Manual input | players_master, player_profiles, commentators, venues |
| `ae` | AE rendering | templates, compositions, comp_layers, render_jobs, render_outputs |
| `cuesheet` | Broadcast | broadcast_sessions, cue_sheets, cue_items |

---

## Dashboard Role Separation

| Aspect | Main Dashboard | Sub Dashboard |
|--------|----------------|---------------|
| Core Function | Editorial decisions (What/When) | Caption output execution (How) |
| User | Director/PD | Caption Operator |
| Rendering | Not allowed | Allowed |
| Cuesheet | Edit | Read-only |
