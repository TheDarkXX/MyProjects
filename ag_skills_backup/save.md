# 💾 Skill: `/save` (MyProjects — Focus Lock-aware)

## Objective
Hybrid save pipeline สำหรับทุกโปรเจกต์ใน MyProjects.
ใช้ Focus Lock เพื่อหา path ของโปรเจกต์ที่กำลังทำงานอยู่

## ⛔ PRE-SAVE CHECKLIST
1. **Verify Focus Lock:** ต้องรู้ว่ากำลังทำงานโปรเจกต์ไหน ถ้ายังไม่ Lock → ถาม User ก่อน
2. **Read ALL Artifacts:** `view_file` on every artifact in `brain/<conversation-id>/`.
3. **Read conversation log** at `C:\Users\Admin\.gemini\antigravity-ide\brain\{conversation-id}\.system_generated\logs\transcript.jsonl` for decisions not captured in artifacts.
4. **Apply Compiled Truth + Timeline Pattern.**
5. **Verify Full-Detail Rule:** Do NOT summarize. Paste artifact content fully under `📦 RAW ARTIFACT BACKUP`.

## Execution Steps

### Phase 1: Context Saving
1. **Resolve Project Path:** จาก Focus Lock → ได้ `[ProjectName]`
2. **Session Lock:** Scan `MyProjects/Quick Save/Active/[ProjectName]/` และ `Complete/[ProjectName]/` for files matching conversation ID.
   - **IF FOUND:** UPDATE existing file (append `## Changelog`).
   - **IF NOT FOUND:** Create new file.
3. **Version Bump:**
   - Format: `V{x.y.z}_[type]_[projectname]_[description].md`
   - Check latest version in `Quick Save/Complete/[ProjectName]/`
   - Patch (+0.0.1): study, design, hotfix, docs, spike
   - Minor (+0.1.0): shipped impl, infra
4. **File Structure:**
   ```markdown
   ---
   (YAML Frontmatter — version, type, status, date, conversation, tags, summary)
   ---
   # [Title]

   ## 📌 Context (Compiled Truth)

   ## 📦 RAW ARTIFACT BACKUP (Iron Rule — paste 100%, do NOT summarize)

   ## 🔬 Timeline & Debugging Log

   ## 🔗 GBRAIN Backlinks (Bidirectional)
   ```
5. **Write file** to `MyProjects/Quick Save/Active/[ProjectName]/` (or `Complete/` if done).

### Phase 2: Openclaw-VPS Sync (ศูนย์บัญชาการ)
6. **Copy** the same file to `c:\My Claw\Openclaw-VPS\Quick Save\Active\[ProjectName]\` (or `Complete\[ProjectName]\` if done).
7. **Update Openclaw Manifest:** Run `node scripts/qs-indexer.js --incremental` in Openclaw-VPS.

### Phase 3: Git (MyProjects repo)
8. **Commit:** `git add .` + `git commit -m "[AG] Save [ProjectName] [version]"` in MyProjects root.
9. **Push:** `git push origin` (sync between PCs).
10. **Report:** Done.

