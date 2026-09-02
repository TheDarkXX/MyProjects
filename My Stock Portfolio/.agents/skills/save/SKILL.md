---
name: save
description: "My Stock Portfolio Save & Sync Pipeline"
---
# 💾 Skill: `/save`

## Objective
The ultimate end-of-task pipeline for **My Stock Portfolio**. Unifies Quick Save context gathering, file status handling, Git pushing for MyProjects, and cross-syncing Quick Saves to Openclaw-VPS.

## 🛑 End-of-Session Iron Rule
**งานเสร็จแล้ว อัปเดต Changelog ในไฟล์ Quick Save ก่อนปิดแชทเสมอ**
ห้ามให้มันทำงานเสร็จแล้วทิ้งไว้ในแชทเด็ดขาด ทุกข้อตกลงใหม่หรือท่าแปลกๆ ที่เราเพิ่งคิดกันออก ต้องถูกย้อนกลับไปเขียนลงไฟล์ทันที

## ⛔ PRE-SAVE CHECKLIST — MANDATORY (Do NOT skip ANY step)

Before writing a single word to any Quick Save file, you MUST execute these steps IN ORDER:

1. **Enumerate ALL Artifacts (list_dir FIRST — Iron Rule):**
   - You MUST run `list_dir` on the artifact directory (`<appDataDir>\brain\<conversation-id>/`) FIRST.
   - Then call `view_file` on **EVERY** `.md` file found.

2. **Capture ALL Changed Files (git diff):**
   - Run `git diff --name-only HEAD~10` (or appropriate range) in the project workspace to get a list of modified files.
   - Note what changed and why.

3. **Mine the Conversation for Implementation Details:**
   - Extract ALL decisions, commands, and exact code snippets discussed in chat.

4. **List ALL plans discussed** in this session in `related_plans_same_conversation`.

5. **Apply Compiled Truth + Timeline Pattern:** Top half: Compiled Truth (Current logic, code). Bottom half: Timeline (Changelog, debugging).

6. **Generate GBRAIN Backlinks:** Link to 3-5 related files in `Quick Save/Complete/My Stock Portfolio/`.

## Execution Steps

### Phase 1: Intelligent Context Saving
1. **Intelligent Session Lock:**
   - Project Subfolder: `C:\My Claw\MyProjects\Quick Save\Complete\My Stock Portfolio\`
   - Check if a file matching the current `conversation` ID exists.
   - **IF FOUND:** UPDATE the existing file by appending a `## Changelog` section.
   - **IF NOT FOUND:** Create a new file.
2. **Version Bump (Smart Versioning):**
   - **Format:** `V{x.y.z}_[type]_component_clear-description.md`
   - Use correct semver patch/minor rules.
3. **Auto-Cleanup (5-7 Rule):** 
   - BEFORE creating your new save file, count files floating at the root of `My Stock Portfolio/`. If ≥ 7 files of the current major version exist, move the oldest into a major version subfolder (e.g., `V1/`).
4. **Write File:**
   - Write the comprehensive document directly into `C:\My Claw\MyProjects\Quick Save\Complete\My Stock Portfolio\`.

### Phase 2: Openclaw-VPS Hybrid Sync
5. **Sync to Openclaw-VPS:**
   - Copy the newly created/updated Quick Save file to `C:\My Claw\Openclaw-VPS\Quick Save\Complete\My Stock Portfolio\`.
6. **Universal Search Indexing (Auto-Update):**
   - Run `node scripts/qs-indexer.js --incremental` in `C:\My Claw\Openclaw-VPS` to instantly update `search-manifest.md` on the VPS side with your new file.
   - Update `search-manifest.md` in `MyProjects` root if you have a local indexer script there.

### Phase 3: Deployment Pipeline (MyProjects)
*(All commands executed within `C:\My Claw\MyProjects`)*
7. **Commit Current Changes:** 
   - `git add .` 
   - `git commit -m "[AG] Auto-Save: My Stock Portfolio <version>"`
8. **Backup (Push):** 
   - Run `git push origin master` (or corresponding branch) to push to the Github remote.
9. **Report:** 
   - Inform the user that the save, cross-sync, and git push are all successfully concluded.
