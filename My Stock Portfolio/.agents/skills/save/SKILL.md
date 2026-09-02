---
name: save
description: "Migrated save skill"
---
# ๐’พ Skill: `/save`

## Objective
The ultimate end-of-task pipeline. This unifies Quick Save context gathering, file status handling, cache-busting, and VPS deployment into a single seamless, friction-less flow.

## 🛑 End-of-Session Iron Rule
**งานเสร็จแล้ว อัปเดต Changelog ในไฟล์ Quick Save และอัปเดต SOT/Manifest ก่อนปิดแชทเสมอ**
ห้ามให้มันทำงานเสร็จแล้วทิ้งไว้ในแชทเด็ดขาด ทุกข้อตกลงใหม่หรือท่าแปลกๆ ที่เราเพิ่งคิดกันออก ต้องถูกย้อนกลับไปเขียนลงไฟล์ทันที

## ⛔ PRE-SAVE CHECKLIST — MANDATORY (Do NOT skip ANY step)

Before writing a single word to any Quick Save file, you MUST execute these steps IN ORDER:

1. **Enumerate ALL Artifacts (list_dir FIRST — Iron Rule):**
   - You MUST run `list_dir` on the artifact directory (`<appDataDir>\brain\<conversation-id>/`) FIRST.
   - Then call `view_file` on **EVERY** `.md` file found — not just `implementation_plan.md` and `task.md`. This includes `walkthrough.md`, `dev_proposal_review.md`, `analysis_results.md`, and ANY other file the session created.
   - Also check the `scratch/` subfolder for any scratch scripts or data files that contain implementation logic.
   - ⛔ **DO NOT assume you know which artifacts exist.** You MUST `list_dir` to discover them. Skipping this step is why data gets lost.

2. **Capture ALL Changed Files (git diff — Iron Rule):**
   - Run `git diff --name-only HEAD~10` (or appropriate range) in the project workspace to get a concrete list of every file modified during this session.
   - This list MUST be included in the Quick Save file under a `## 📋 Files Changed This Session` section.
   - For each file changed, note: file path, what was changed, and why.
   - ⛔ **If you skip this step, you WILL forget files that were silently modified.**

3. **Mine the Conversation for Implementation Details:**
   - Read conversation log at `C:\Users\Admin\.gemini\antigravity-ide\brain\{conversation-id}\.system_generated\logs\transcript.jsonl` (or use transcript history).
   - Specifically search for `tool_calls` containing `replace_file_content`, `multi_replace_file_content`, `write_to_file`, and `run_command` — these contain the ACTUAL code changes and commands that were executed.
   - Extract ALL decisions, alternatives considered, error messages encountered, and solutions applied that are NOT already captured in artifacts.
   - ⛔ **The conversation often contains implementation details (exact code, exact commands, exact error messages) that artifacts miss. You MUST mine these.**

4. **List ALL plans discussed** in this session. Every plan that was talked about — even if it ended up in a separate file — must be cross-referenced in `related_plans_same_conversation`.

5. **Apply Compiled Truth + Timeline Pattern:** Restructure the document into two halves. Top half: "Compiled Truth" (Current finalized logic, rules, architecture, exact code). Bottom half: "Timeline" (Append-only changelog, debugging history, iterations).

6. **Generate GBRAIN Backlinks (Bidirectional):** Search for and identify 3-5 related files from the archive (`Quick Save/Complete/` or `docs/`). Add a link at the bottom of YOUR document, AND you MUST go edit those target files to add a link back to your new document (Bidirectional). Use the format: `- **YYYY-MM-DD HH:MM** | [page title](path) -- context`.

7. **Update MOC Hubs:** If the component matches an existing Map of Content (e.g., `MOC_hydra.md`, `MOC_ui.md`, `MOC_infra.md`), append a link to your new file in the Hub file.

8. **Verify Full-Detail Rule:** Ask yourself: "If AG returns in 3 months and reads this file, can it reconstruct ALL decisions, alternatives considered, code snippets, and reasoning WITHOUT going back to the conversation?" If NO — expand the file until YES.

> ⛔ **Iron Rule:** A summary paragraph is NEVER acceptable for a Deep Study, Architecture, or Implementation session. Paste the content. Do NOT abbreviate.

---

## Execution Steps

### Phase 1: Intelligent Context Saving
1. **Intelligent Session Lock (Iron Rule):**
   - Determine the project's subfolder under `Quick Save/Complete/` (e.g., `The-Viral/` for The Viral project, `Core-VPS/` for core Openclaw-VPS tasks, or `Shared/` for shared tasks). 
   - **CRITICAL (DoctorBank-Brand):** If the workspace is DoctorBank-Brand, you MUST use its Component structure. Map the file to one of the 6 Components based on context: `Avatar/`, `Brand/`, `Content/`, `Media/`, `Products/`, `System/`. Do NOT use or create `0_Latest_Save` or any other root folder.
   - Scan that subfolder and `Quick Save/Active/` for files matching the current `conversation` ID.
   - **IF FOUND:** Do NOT bump version. Do NOT create a new file. You MUST **UPDATE the existing file** by appending a `## Changelog` section at the bottom (e.g. `### Update X โ€” HH:MM` -> `- โ… Completed task Y`).
   - **IF NOT FOUND:** Proceed to create a new file (Step 4).
2. **Locate Active File:** Check if there is an active file in `Quick Save/Active/`.
3. **VS Code Buffer Check:** If an active file exists, PAUSE and ask the user perfectly: "เนเธเธฃเธ”เธเธดเธ”เนเธ—เนเธเนเธเธฅเนเนเธ VS Code เธเนเธญเธเธขเนเธฒเธขเน€เธเนเธฒ Complete เธเธฃเธฑเธ" Wait for confirmation.
4. **Extract Deep Context (RAW DUMP REQUIRED):** 
   - You MUST structure your save file EXACTLY like this template:
     ```markdown
     ---
     (YAML Frontmatter)
     ---
     # [Title]

     ## 📌 Context & Implementation (Compiled Truth)
     (Explain WHY this was done. ⛔ DO NOT SUMMARIZE CODE. You MUST copy the EXACT code snippets, commands, and configurations that were discussed or implemented during the chat into this section.)

     ## 📋 Files Changed This Session
     (Output of `git diff --name-only`. For EACH file list: path, what changed, why.)
     | File | What Changed | Why |
     |------|-------------|-----|
     | `path/to/file.js` | Added X function | To support feature Y |

     ## 📦 RAW ARTIFACT BACKUP (Iron Rule)
     (PASTE 100% OF THE ARTIFACT TEXT HERE. DO NOT SUMMARIZE. If > 1000 lines, use <details> tags. Do NOT abbreviate.)

     ## 🔬 Timeline & Debugging Log
     (Changelog, iterations, and exact error messages + solutions discussed)

     ## 🔗 GBRAIN Backlinks
     (Bidirectional links)
     ```
   - If you summarize the artifact, or if you omit the actual implementation code/scripts discussed in chat, you have failed the Iron Rule.
5. **Version Bump (Smart Versioning v2), Naming, & Aliases:**
   - **Format:** `V{x.y.z}_[type]_component_clear-description.md` (or `EVO-{id}_[study]...md` if unapproved)
   - **Patch (+0.0.1):** Use for `[study]`, `[design]`, `[hotfix]`, `[docs]`, `[spike]`.
   - **Minor (+0.1.0):** Use for shipped `[impl]`, `[infra]`. (Unlimited range, e.g., V12.99.0 is valid).
   - **Major (Auto Milestone):** Check if cumulative shipped `[impl]` + `[infra]` reaches 20 since last major, or if there is a massive architectural breaking change. If yes, bump Major.
   - The `component` keyword (e.g., `hydra`, `watchdog`, `ui`) is MANDATORY for AI grepping.
   - **Aliases:** You MUST include `aliases: [keyword1, keyword2]` in the YAML frontmatter to make it easily searchable.
   - **Rolling Archive Check:** If the version bumps to a new Major Version (e.g., hitting `V13.0.0`), you MUST create a folder for the previous era (e.g. `V12/`) inside your project's subfolder (e.g., `Quick Save/Complete/The-Viral/V12/`) and `git mv` all old version files into it to keep the root directory clean.
   - **Auto-Cleanup (5-7 Rule - Iron Rule):** BEFORE creating your new save file, you MUST count the files floating at the root of the project subfolder. If there are โฅ 7 files of the current major version, you MUST `git mv` the oldest ones into their major version subfolder (e.g., `V13/`) so that ONLY the latest 5 files remain floating. Do this FIRST before you write the new file.
6. **GBRAIN Backlink Generation (Iron Rule - Bidirectional):**
   - At the absolute bottom of the document, append a `## ๐”— GBRAIN Backlinks` section.
   - Actively search (`grep_search` or `list_dir`) for 3-5 historically related files in `Quick Save/Complete/<Project-Subfolder>/` or `docs/` that share architectural similarities or context.
   - Use categorized lists: `### depends_on`, `### enables`, `### related_to`.
   - **Format:** `- **YYYY-MM-DD HH:MM** | [page title](file:///C:/absolute/path/to/file.md) -- context` (You MUST use the `file:///` Absolute URI format so it is clickable in the IDE).
   - **Bidirectional Requirement:** For every file you link to, you MUST open that target file and add a backlink pointing to your new file.
7. **Update MOC Hubs & MASTER_ROADMAP:**
   - If the `component` keyword matches an existing Map of Content (MOC) file (e.g., `MOC_hydra.md`, `MOC_ui.md`, `MOC_infra.md` in `Quick Save/Complete/`), append your new file's link to the appropriate section of the MOC Hub.
   - **MUST DO:** Open `c:\My Claw\Openclaw-VPS\MASTER_ROADMAP.md` and update the status of the current Feature/Component (move it to Completed if done, or update Active Phase context).
8. **File Creation / Move:**
   - If an `Active/` file existed, `git mv` it to the correct project subfolder under `Complete/` (e.g., `Quick Save/Complete/The-Viral/`).
   - If forming a new record, write the comprehensively mapped document directly into the project subfolder under `Complete/` (e.g., `Quick Save/Complete/The-Viral/`, or the mapped Component folder for DoctorBank-Brand), skipping the Active folder entirely.
9. **Universal Search Indexing (Auto-Update):**
   - Run `node scripts/qs-indexer.js --incremental` in `c:\My Claw\Openclaw-VPS` to instantly update `search-manifest.md` with your newly created/updated file.

### Phase 2: Deployment Pipeline
*(Note: All commands in this phase must be executed within `c:\My Claw\Openclaw-VPS`)*
10. **Pre-flight Sync:** Run `git pull vps master --no-rebase` to securely fetch incoming Piggyback files or background tasks generated by VPS agents. This completely prevents phantom conflicts that block pushes.
11. **Commit Current Changes:** `git add .` and `git commit -m "[AG] Auto-Save & Deploy <version>"`.
12. **Cache Busting (Iron Rule):** Execute `node bump-cache.js`.
13. **Commit Cache:** `git add .` and `git commit -m "chore: bump cache"`.
14. **Launch:** Run `git push vps`.
15. **Sync Logs:** Run `node scripts/sync-ag-logs.js` to securely push transcript logs to the VPS for the Daily Journal cron.
16. **Post-Deploy Verification:** Execute `ssh root@185.250.38.247 "grep '?v=' /root/brain-app/public/index.html"` to empirically prove that the VPS server successfully triggered its git hook and copied the bumped cache file to production. (If this is stale, the push failed)
17. **Backup (Conditional):** Check if `origin` remote exists first (`git remote`). If it exists, run `git push origin`. If not, gracefully ignore to prevent phantom errors.
18. **Report:** Inform the user that the save, deployment, and live-verification are all successfully concluded.
