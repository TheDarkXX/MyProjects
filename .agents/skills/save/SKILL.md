---
name: save
description: "Migrated save skill"
---
# 💾 Skill: `/save`

## Objective
The ultimate end-of-task pipeline. This unifies Quick Save context gathering, file status handling, cache-busting, and VPS deployment into a single seamless, friction-less flow.

## ⛔ PRE-SAVE CHECKLIST — MANDATORY (Do NOT skip ANY step)

Before writing a single word to any Quick Save file, you MUST execute these steps IN ORDER:

1. **Read ALL Artifacts:** Call `view_file` on EVERY artifact file in `brain/<conversation-id>/`. Do NOT rely on memory. Artifacts include `implementation_plan.md`, `task.md`, `dev_proposal_review.md`, and any other `.md` files in that folder.
2. **Read conversation log** at `C:\Users\Admin\.gemini\antigravity-ide\brain\{conversation-id}\.system_generated\logs\transcript.jsonl` (or use the conversation transcript history) to find any decisions, alternatives, or context NOT captured in artifacts.
3. **List ALL plans discussed** in this session. Every plan that was talked about — even if it ended up in a separate file — must be cross-referenced in `related_plans_same_conversation`.
4. **Apply Compiled Truth + Timeline Pattern:** Restructure the document into two halves. Top half: "Compiled Truth" (Current finalized logic, rules, architecture). Bottom half: "Timeline" (Append-only changelog, debugging history, iterations).
5. **Generate GBRAIN Backlinks (Bidirectional):** Search for and identify 3-5 related files from the archive (`Quick Save/Complete/` or `docs/`). Add a link at the bottom of YOUR document, AND you MUST go edit those target files to add a link back to your new document (Bidirectional). Use the format: `- **YYYY-MM-DD HH:MM** | [page title](path) -- context`.
6. **Update MOC Hubs:** If the component matches an existing Map of Content (e.g., `MOC_hydra.md`, `MOC_ui.md`, `MOC_infra.md`), append a link to your new file in the Hub file.
7. **Verify Full-Detail Rule:** Ask yourself: "If AG returns in 3 months and reads this file, can it reconstruct ALL decisions, alternatives considered, code snippets, and reasoning WITHOUT going back to the conversation?" If NO — expand the file until YES.

> ⛔ **Iron Rule:** A summary paragraph is NEVER acceptable for a Deep Study, Architecture, or Implementation session. Paste the content. Do NOT abbreviate.

---

## Execution Steps

### Phase 1: Intelligent Context Saving
1. **Intelligent Session Lock (Iron Rule):**
   - Determine the project's subfolder under `Quick Save/Complete/` (e.g., `The-Viral/` for The Viral project, `Core-VPS/` for core MyProjects tasks, or `Shared/` for shared tasks). **CRITICAL:** If the project uses a `0_Latest_Save` directory (e.g., `DoctorBank-Brand/Quick Save/Complete/0_Latest_Save`), you MUST place new files in that folder.
   - Scan that subfolder (and `0_Latest_Save` if it exists) and `Quick Save/Active/` for files matching the current `conversation` ID.
   - **IF FOUND:** Do NOT bump version. Do NOT create a new file. You MUST **UPDATE the existing file** by appending a `## Changelog` section at the bottom (e.g. `### Update X — HH:MM` -> `- ✅ Completed task Y`).
   - **IF NOT FOUND:** Proceed to create a new file (Step 4).
2. **Locate Active File:** Check if there is an active file in `Quick Save/Active/`.
3. **VS Code Buffer Check:** If an active file exists, PAUSE and ask the user perfectly: "โปรดปิดแท็บไฟล์ใน VS Code ก่อนย้ายเข้า Complete ครับ" Wait for confirmation.
4. **Extract Deep Context (RAW DUMP REQUIRED):** 
   - You MUST structure your save file EXACTLY like this template:
     ```markdown
     ---
     (YAML Frontmatter)
     ---
     # [Title]

     ## ?? Context & Implementation (Compiled Truth)
     (Explain WHY this was done. ? DO NOT SUMMARIZE CODE. You MUST copy the EXACT code snippets, commands, and configurations that were discussed or implemented during the chat into this section.)

     ## ?? Files Changed This Session
     (Output of `git diff --name-only`. For EACH file list: path, what changed, why.)
     | File | What Changed | Why |
     |------|-------------|-----|
     | `path/to/file.js` | Added X function | To support feature Y |

     ## ?? RAW ARTIFACT BACKUP (Iron Rule)
     (PASTE 100% OF THE ARTIFACT TEXT HERE. DO NOT SUMMARIZE. If > 1000 lines, use <details> tags. Do NOT abbreviate.)

     ## ?? Timeline & Debugging Log
     (Changelog, iterations, and exact error messages + solutions discussed)

     ## ?? GBRAIN Backlinks
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
   - **Auto-Cleanup (5-7 Rule - Iron Rule):** BEFORE creating your new save file, you MUST count the files floating at the root of the project subfolder. If there are ≥ 7 files of the current major version, you MUST `git mv` the oldest ones into their major version subfolder (e.g., `V13/`) so that ONLY the latest 5 files remain floating. Do this FIRST before you write the new file.
6. **GBRAIN Backlink Generation (Iron Rule - Bidirectional):**
   - At the absolute bottom of the document, append a `## 🔗 GBRAIN Backlinks` section.
   - Actively search (`grep_search` or `list_dir`) for 3-5 historically related files in `Quick Save/Complete/<Project-Subfolder>/` or `docs/` that share architectural similarities or context.
   - Use categorized lists: `### depends_on`, `### enables`, `### related_to`.
   - **Format:** `- **YYYY-MM-DD HH:MM** | [page title](file:///C:/absolute/path/to/file.md) -- context` (You MUST use the `file:///` Absolute URI format so it is clickable in the IDE).
   - **Bidirectional Requirement:** For every file you link to, you MUST open that target file and add a backlink pointing to your new file.
7. **Update MOC Hubs:**
   - If the `component` keyword matches an existing Map of Content (MOC) file (e.g., `MOC_hydra.md`, `MOC_ui.md`, `MOC_infra.md` in `Quick Save/Complete/`), append your new file's link to the appropriate section of the MOC Hub.
8. **File Creation / Move:**
   - If an `Active/` file existed, `git mv` it to the correct project subfolder under `Complete/` (e.g., `Quick Save/Complete/The-Viral/`).
   - If forming a new record, write the comprehensively mapped document directly into the project subfolder under `Complete/` (e.g., `Quick Save/Complete/The-Viral/`, or `0_Latest_Save/` if the project uses it), skipping the Active folder entirely.
9. **Universal Search Indexing (Auto-Update):**
   - Run `node scripts/qs-indexer.js --incremental` in `c:\My Claw\MyProjects` to instantly update `search-manifest.md` with your newly created/updated file.

### Phase 2: Deployment Pipeline
*(Note: All commands in this phase must be executed within `c:\My Claw\MyProjects`)*
10. **Pre-flight Sync:** Run `git pull vps master --no-rebase` to securely fetch incoming Piggyback files or background tasks generated by VPS agents. This completely prevents phantom conflicts that block pushes.
11. **Commit Current Changes:** `git add .` and `git commit -m "[AG] Auto-Save & Deploy <version>"`.
12. **Cache Busting (Iron Rule):** Execute `node bump-cache.js`.
13. **Commit Cache:** `git add .` and `git commit -m "chore: bump cache"`.
14. **Launch:** Run `git push vps`.
15. **Sync Logs:** Run `node scripts/sync-ag-logs.js` to securely push transcript logs to the VPS for the Daily Journal cron.
16. **Post-Deploy Verification:** Execute `ssh root@185.250.38.247 "grep '?v=' /root/brain-app/public/index.html"` to empirically prove that the VPS server successfully triggered its git hook and copied the bumped cache file to production. (If this is stale, the push failed)
17. **Backup (Conditional):** Check if `origin` remote exists first (`git remote`). If it exists, run `git push origin`. If not, gracefully ignore to prevent phantom errors.
18. **Report:** Inform the user that the save, deployment, and live-verification are all successfully concluded.

