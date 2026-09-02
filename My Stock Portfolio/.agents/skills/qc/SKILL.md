---
name: qc
description: "Migrated qc skill"
---
# ๐ง  Skill: `/qc` (Quick Clear & Complete Placement)

## Objective
To actively scan the `Quick Save/` directory and auto-clean workspace clutter while ensuring proper file organization. Specifically, it handles:
1. Deleting duplicate ghost files in `Active/`.
2. Archiving old resolved stubs in `_incoming/`.
3. Auto-moving completed tasks from `Active/` to `Complete/`.
4. Auto-organizing files in `Complete/` root into their correct version subfolders.

> โ ๏ธ **CRITICAL WARNING FOR AI AGENTS:**
> All files in `Quick Save/` use the format `Vxx.x.x_[type]_...` (e.g. `[impl]`, `[hotfix]`). **PowerShell treats brackets `[]` as wildcard patterns.** If you use `Move-Item` or `Remove-Item` with the default `-Path` flag, it will silently fail. **You MUST use `-LiteralPath` in PowerShell or use a Python script (`shutil.move`)** to guarantee files are moved correctly.

## Execution Steps

0. **Root Folder Health Check (Run First):**
   - Run: `Get-ChildItem -Path "c:\My Claw\Openclaw-VPS" -File | Where-Object { $_.Extension -match '\.(js|cjs|mjs|py|sql|bat|sh)$' } | Measure-Object`
   - Count all files at root level (excluding directories).
   - **If count > 20:** Flag to user: โ ๏ธ Root has X files โ€” recommend organizing loose scripts.
   - **Identify moveable files** โ€” compare against the locked list below and flag anything NOT in it:
   ```
   LOCKED (must stay at root):
   server.js, ai-gateway.js, generate_cloud_images.cjs, higgsfield-auth-watchdog-vps.cjs,
   bump-cache.js, deploy.js, start.sh, openclaw.json, package.json, package-lock.json,
   search-manifest.md, search-manifest.json, search-manifest.jsonl, brain.db, database.sqlite,
   AGENTS.md, SOUL.md, USER.md, TOOLS.md, CHANGELOG.md, .gitignore, .env, ecosystem.config.js
   ```
   - Any `.js/.cjs/.mjs/.py/.sql/.bat/.sh` NOT in the locked list โ’ propose moving to correct subfolder (`tools/`, `services/`, `data/`, `scratch/`).
   - Present findings in a concise table before proceeding.

1. **Scan `Active/` for Ghosts:**
   - Execute `list_dir` on `Quick Save/Active/`.
   - Execute `list_dir` on `Quick Save/Complete/Complete/` (including version subfolders).
   - If a file exists in `Active/` and a file with the exact same name exists in `Complete/Complete/`, it is a **Ghost File**.
   - **Action:** Delete the ghost file from `Active/` using terminal commands (`rm` or `Remove-Item`).

2. **Scan `Active/` for Unmoved Complete Files:**
   - Use `grep_search` to find `status: complete` in `Quick Save/Active/`.
   - **Action:** Move these files from `Active/` to the root of `Complete/` (Step 3 will then sort them).

3. **Scan `Complete/` for Disorganized Files:**
   - Execute `list_dir` on the root of `Quick Save/Complete/`.
   - Identify any `.md` files sitting directly in the root (e.g., `V12.x.x_...`).
   - Parse the major version (e.g., `V12`).
   - **Action:** Move the file into its corresponding subfolder inside the extra layer (e.g., `Complete/Complete/V12/`). If the folder doesn't exist, create it.

4. **Scan `_incoming/` for Abandoned Stubs:**
   - Execute `list_dir` on `Quick Save/_incoming/` and its subfolders (`dev-agent/`, `hydra/`, etc.).
   - Identify any `.md` stubs.
   - For each stub, use `grep_search` or cross-reference the `Complete/` directory or its `archive/` folder to see if the stub's ID (e.g., `EVO-xxx`) or exact topic has already been implemented or archived.
   - **Action:** Move the abandoned stub to its respective `archive/` folder or delete it if it's a direct duplicate.

5. **User Confirmation & Report:**
   - Compile a concise list of files that were deleted, archived, or moved.
   - Present the cleanup report to the user.
   - Flag any ambiguous duplicate files for manual review.

6. **Post-Recheck Verification (MANDATORY):**
   - After ALL move operations are complete, run `list_dir` on **both** the source and destination directories.
   - **Source check:** Confirm moved files are **gone** from `Active/` and `Complete/` root. If any file you attempted to move still exists at its source โ’ the move silently failed. Re-run with `-LiteralPath` or Python.
   - **Destination check:** Confirm moved files **exist** in their target `Complete/Complete/Vxx/` folder. Count must match the number of files you attempted to move.
   - **Fail-safe:** If source count didn't decrease or destination count didn't increase โ’ **STOP and report failure** to the user. Do NOT claim success.

---

## ๐”— GBRAIN Backlinks
- **2026-06-14 12:55** | [Root Folder Hygiene & Systemic Rules](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Complete/Core-VPS/V12.20.0_[infra]_ag-skills_root-folder-hygiene-and-reviewchat.md) -- Auto-added from /save session
