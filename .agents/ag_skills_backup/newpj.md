# 🏗️ Skill: `/newpj` (New Project Scaffolder)

## Objective
Scaffold a new project under `c:\My Claw\MyProjects\` via plan → customize → approve.

## Usage
```
/newpj <name>
```
- `/newpj My-New-Brand` → creates `c:\My Claw\MyProjects\My-New-Brand\`

## Global Defaults (ไม่ต้องถาม — ทุกโปรเจกต์เหมือนกัน)

| ด้าน | Default |
|------|---------|
| Location | `c:\My Claw\MyProjects\[Name]\` (always under umbrella repo) |
| Quick Save | Global at `MyProjects/Quick Save/` with project subfolder |
| Skills | Global at `MyProjects/ag_skills_backup/` (Focus Lock-aware) |
| Git | MyProjects umbrella repo (no separate init needed) |
| Openclaw Sync | Hybrid — copy to `Openclaw-VPS/Quick Save/` |

## Execution Steps

### Phase 1: Parse & Validate
1. Derive `ProjectName` from argument (hyphens → spaces for display).
2. Full path = `c:\My Claw\MyProjects\[Name]\`
3. **Grandmaster Warning (External Path):** If the user requests an external path (e.g., `O:\...`), STOP and challenge them: "การแยกไปสร้างโฟลเดอร์ข้างนอก มึงจะเสียระบบ Git Sync และ Quick Save ของ MyProjects มึงแน่ใจนะ? แนะนำให้สร้างใน MyProjects ดีกว่า"
4. If path exists → STOP and warn.

### Phase 2: Generate Customization Plan
Create `implementation_plan.md` artifact with `RequestFeedback: true`:

```markdown
# 🏗️ New Project: [ProjectName]

## 📋 Project Identity
- **ชื่อ:** [ProjectName]
- **Path:** c:\My Claw\MyProjects\[Name]\
- **คำอธิบาย:** [ให้ User เติม]
- **Persona & Rules:** 👺 มารบูรพา (Grandmaster Mode) + AG Behavioral Integrity (Auto-injected)

## 🏷️ Project Type (เลือก 1)
- [ ] **Brand/Business** → สร้าง: `Brand/`, `Sales/`, `Products/`
- [ ] **Content/Media** → สร้าง: `Raw VDO/`, `REVIEW/`, `Channels/`
- [ ] **Code/App** → สร้าง: `src/`, `Modules/`, `DESIGN.md`
- [ ] **Prompt & No-Code Tools** → สร้าง: `Prompts/`, `Tools/`, `Configs/`, `Gallery/`

## 📦 Sub-project แรก (optional)
- **ชื่อ:** [เช่น สินค้า, ช่อง, Module]

## 📁 Preview
(AG generates based on type)
```

### Phase 3: Iterate
User comments → AG updates. Loop until approve.

### Phase 4: Execute (Post-Approve)

**4a. Per-project directories only:**
- `MyProjects/[Name]/` + type-specific folders
- `MyProjects/Quick Save/Active/[Name]/`
- `MyProjects/Quick Save/Complete/[Name]/`
- `Openclaw-VPS/Quick Save/Active/[Name]/`
- `Openclaw-VPS/Quick Save/Complete/[Name]/`

**4b. Per-project files only:**
- `[Name]/AGENT_CONTEXT.md` (project navigator)
- `[Name]/memory.md` (project rules)
- `[Name]/.agents/AGENTS.md` (MUST copy the global behavioral rules & "มารบูรพา" Grandmaster persona from `c:\My Claw\Openclaw-VPS\.agents\AGENTS.md` to ensure seamless communication and execution integrity)

**4c. Sub-project** (if name provided):
- Brand → `Products/[Sub]/PRODUCT_MEMORY.md`
- Content → `Channels/[Sub]/CHANNEL_MEMORY.md`
- Code → `Modules/[Sub]/MODULE_MEMORY.md`

**4d. Update root Router:**
- Append new project row to `MyProjects/AGENT_CONTEXT.md` Projects table.

**4e. Workspace Auto-Generation:**
- Create `c:\My Claw\MyProjects\[Name].code-workspace` bundling the new project folder AND global folders:
  - `[Name]` (🚀 [Name])
  - `ag_skills_backup` (🔧 Skills & Docs)
  - `docs` (📚 Docs)
  - `.agents` (🤖 Agents Rules)
  - `Quick Save` (💾 Quick Save)
  - `Quick Upload` (📤 Quick Upload)

**4f. Git commit:**
- `git add .` + `git commit -m "[AG] New project: [Name]"` in MyProjects root.

**Does NOT create (already exists at root):**
- ~~ag_skills_backup/~~ (global)
- ~~Quick Save structure~~ (global — just adds subfolder)
- ~~.code-workspace~~ (global)
- ~~docs/~~ (global)
- ~~scratch/~~ (global)

### Phase 5: Verify & Report
1. `list_dir` on `MyProjects/[Name]/`.
2. Summary table.
3. Suggest: "พิมพ์ชื่อโปรเจกต์เพื่อ Focus Lock แล้วเริ่มทำงานได้เลย"

<!-- GBRAIN_BACKLINKS_START -->
## 🔗 GBRAIN Backlinks
### related_to
- **2026-07-05 12:37** | [V12.24.1 [docs] Agent Persona: Grandmaster](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Complete/Core-VPS/V12.24.1_[docs]_agent_persona-grandmaster.md) -- Contains the Persona and rules that are automatically injected into new projects.
<!-- GBRAIN_BACKLINKS_END -->
