---
name: newpj
description: "Migrated newpj skill"
---
# เนยยโ€”เนเธย Skill: `/newpj` (New Project Scaffolder)

## Objective
Scaffold a new project under `c:\My Claw\MyProjects\` via plan เนยโ€ customize เนยโ€ approve.

## Usage
```
/newpj <name>
```
- `/newpj My-New-Brand` เนยโ€ creates `c:\My Claw\MyProjects\My-New-Brand\`

## Global Defaults (เน€เธยเน€เธเธเน€เธยเน€เธโ€ขเน€เธยเน€เธเธเน€เธยเน€เธโ€“เน€เธเธ’เน€เธเธ เนโฌโ€ เน€เธโ€”เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธเธเน€เธโฌเน€เธยเน€เธยเน€เธโ€ขเน€เธยเน€เธโฌเน€เธเธเน€เธเธเน€เธเธ—เน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธย)

| เน€เธโ€เน€เธยเน€เธเธ’เน€เธย | Default |
|------|---------|
| Location | `c:\My Claw\MyProjects\[Name]\` (always under umbrella repo) |
| Quick Save | Global at `MyProjects/Quick Save/` with project subfolder |
| Skills | Global at `MyProjects/ag_skills_backup/` (Focus Lock-aware) |
| Git | MyProjects umbrella repo (no separate init needed) |
| Openclaw Sync | Hybrid เนโฌโ€ copy to `MyProjects/Quick Save/` |

## Execution Steps

### Phase 1: Parse & Validate
1. Derive `ProjectName` from argument (hyphens เนยโ€ spaces for display).
2. Full path = `c:\My Claw\MyProjects\[Name]\`
3. **Grandmaster Warning (External Path):** If the user requests an external path (e.g., `O:\...`), STOP and challenge them: "เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธยเน€เธเธ…เน€เธโฌเน€เธโ€เน€เธเธเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธเธเน€เธย เน€เธเธเน€เธเธ–เน€เธยเน€เธยเน€เธเธเน€เธโฌเน€เธเธเน€เธเธ•เน€เธเธเน€เธเธเน€เธเธเน€เธยเน€เธย Git Sync เน€เธยเน€เธเธ…เน€เธเธ Quick Save เน€เธยเน€เธเธเน€เธย MyProjects เน€เธเธเน€เธเธ–เน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ? เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธ“เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธย MyProjects เน€เธโ€เน€เธเธ•เน€เธยเน€เธเธเน€เธยเน€เธเธ’"
4. If path exists เนยโ€ STOP and warn.

### Phase 2: Generate Customization Plan
Create `implementation_plan.md` artifact with `RequestFeedback: true`:

```markdown
# เนยยโ€”เนเธย New Project: [ProjectName]

## เนยโ€ย Project Identity
- **เน€เธยเน€เธเธ—เน€เธยเน€เธเธ:** [ProjectName]
- **Path:** c:\My Claw\MyProjects\[Name]\
- **เน€เธยเน€เธเธ“เน€เธเธเน€เธยเน€เธเธ”เน€เธยเน€เธเธ’เน€เธเธ:** [เน€เธยเน€เธเธเน€เธย User เน€เธโฌเน€เธโ€ขเน€เธเธ”เน€เธเธ]
- **Persona & Rules:** เนยโ€เธ เน€เธเธเน€เธเธ’เน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธ’ (Grandmaster Mode) + AG Behavioral Integrity (Auto-injected)

## เนยยเธ—เนเธย Project Type (เน€เธโฌเน€เธเธ…เน€เธเธ—เน€เธเธเน€เธย 1)
- [ ] **Brand/Business** เนยโ€ เน€เธเธเน€เธเธเน€เธยเน€เธเธ’เน€เธย: `Brand/`, `Sales/`, `Products/`
- [ ] **Content/Media** เนยโ€ เน€เธเธเน€เธเธเน€เธยเน€เธเธ’เน€เธย: `Raw VDO/`, `REVIEW/`, `Channels/`
- [ ] **Code/App** เนยโ€ เน€เธเธเน€เธเธเน€เธยเน€เธเธ’เน€เธย: `src/`, `Modules/`, `DESIGN.md`
- [ ] **Prompt & No-Code Tools** เนยโ€ เน€เธเธเน€เธเธเน€เธยเน€เธเธ’เน€เธย: `Prompts/`, `Tools/`, `Configs/`, `Gallery/`

## เนยโ€เธ Sub-project เน€เธยเน€เธเธเน€เธย (optional)
- **เน€เธยเน€เธเธ—เน€เธยเน€เธเธ:** [เน€เธโฌเน€เธยเน€เธยเน€เธย เน€เธเธเน€เธเธ”เน€เธยเน€เธยเน€เธยเน€เธเธ’, เน€เธยเน€เธยเน€เธเธเน€เธย, Module]

## เนยโ€ย Preview
(AG generates based on type)
```

### Phase 3: Iterate
User comments เนยโ€ AG updates. Loop until approve.

### Phase 4: Execute (Post-Approve)

**4a. Per-project directories only:**
- `MyProjects/[Name]/` + type-specific folders
- `MyProjects/Quick Save/Active/[Name]/`
- `MyProjects/Quick Save/Complete/[Name]/`
- `MyProjects/Quick Save/Active/[Name]/`
- `MyProjects/Quick Save/Complete/[Name]/`

**4b. Per-project files only:**
- `[Name]/AGENT_CONTEXT.md` (project navigator)
- `[Name]/self-improving/memory.md` (project rules)
- `[Name]/self-improving/corrections.md` (learning loop)
- `[Name]/.agents/AGENTS.md` (MUST copy the global behavioral rules & "เธกเธฒเธฃเธเธนเธฃเธเธฒ" Grandmaster persona from `c:\My Claw\MyProjects\.agents\AGENTS.md` to ensure seamless communication and execution integrity)

**4c. Sub-project** (if name provided):
- Brand เนโ€ โ€ `Products/[Sub]/PRODUCT_MEMORY.md`
- Content เนโ€ โ€ `Channels/[Sub]/CHANNEL_MEMORY.md`
- Code เนโ€ โ€ `Modules/[Sub]/MODULE_MEMORY.md`

**4d. Update root Router & Search Manifest:**
- Append new project row to `MyProjects/AGENT_CONTEXT.md` Projects table.
- Append new project path to `MyProjects/search-manifest.md` to enable Universal Search Protocol.

**4e. Workspace Auto-Generation:**
- Create `c:\My Claw\MyProjects\[Name].code-workspace` bundling the new project folder AND global folders:
  - `[Name]` (เนยยโฌ [Name])
  - `ag_skills_backup` (เนยโ€เธ Skills & Docs)
  - `docs` (เนยโ€ย Docs)
  - `.agents` (เนยเธโ€“ Agents Rules)
  - `Quick Save` (เนยโ€เธ Quick Save)
  - `Quick Upload` (เนยโ€เธ Quick Upload)

**4f. Git commit:**
- `git add .` + `git commit -m "[AG] New project: [Name]"` in MyProjects root.

**Does NOT create (already exists at root):**
- ~~ag_skills_backup/~~ (global)
- ~~Quick Save structure~~ (global เนโฌโ€ just adds subfolder)
- ~~.code-workspace~~ (global)
- ~~docs/~~ (global)
- ~~scratch/~~ (global)

### Phase 5: Verify & Report
1. `list_dir` on `MyProjects/[Name]/`.
2. Summary table.
3. Suggest: "เน€เธยเน€เธเธ”เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธเธ—เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธเน€เธโฌเน€เธยเน€เธยเน€เธโ€ขเน€เธยเน€เธโฌเน€เธยเน€เธเธ—เน€เธยเน€เธเธ Focus Lock เน€เธยเน€เธเธ…เน€เธยเน€เธเธเน€เธโฌเน€เธเธเน€เธเธ”เน€เธยเน€เธเธเน€เธโ€”เน€เธเธ“เน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธโ€เน€เธยเน€เธโฌเน€เธเธ…เน€เธเธ"

<!-- GBRAIN_BACKLINKS_START -->
## เนยโ€โ€” GBRAIN Backlinks
### related_to
- **2026-07-05 12:37** | [V12.24.1 [docs] Agent Persona: Grandmaster](file:///c:/My%20Claw/MyProjects/Quick%20Save/Complete/Core-VPS/V12.24.1_[docs]_agent_persona-grandmaster.md) -- Contains the Persona and rules that are automatically injected into new projects.
<!-- GBRAIN_BACKLINKS_END -->

