---
name: junk
description: "Migrated junk skill"
---
# ๐—‘๏ธ Skill: `/junk`

## Objective
Safely scan and remove workspace junk files (temp files, dev scratches, backup copies) from the main folder and subfolders with a strictly enforced human double-recheck phase.

## Execution Steps
1. **Scan for Junk:** Execute a deep scan across the project. There are two layers of rules:
   **Layer A (Zero Tolerance in Root):** Any of the following found in the Root directory (`/`) must be flagged immediately for deletion:
   - Temp files & Scripts: `tmp_*.*`, `tmp-*.*`
   - Scratch pads: `scratch_*.*`, `scratch-*.*`
   - Test scripts: `test_*.*`, `test-*.*`, `check_*.*`, `check-*.*`
   - One-off dev scripts: `close-jobs*.js`, `patch-*.js`, `output.txt`
   - Stray IDE buffers: `Untitled-*.txt`, `Untitled-*.md`
   - Crash logs: `npm-debug.log*`, `Thumbs.db`, `.DS_Store`
   - Backup files: `*.bak`, `*.p1bak`

   **Layer B (3-Day TTL for Scratch/Tmp folders):** 
   - Check inside the `scratch/` and `tmp/` folders.
   - Using PowerShell, filter out files older than 3 days: `Get-ChildItem -Path "c:\My Claw\MyProjects\scratch\*","c:\My Claw\MyProjects\tmp\*" -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-3) }`
   - Include these expired files in the deletion list.
2. **Pre-Flight Checks (Sensitive Data & Health):**
   - **Root Folder Health Check:** Count the number of files at the root level (excluding directories). If there are > 20 files, add a warning: "โ ๏ธ Root folder has X files โ€” recommend organizing loose scripts into `tools/`."
   - **Credential-Aware Scan:** Before listing ANY file for deletion, you MUST open and read its first few lines. If the file contains `API_KEY`, `TOKEN=`, `PASSWORD=`, `SECRET=`, or `BEARER` โ’ DO NOT include it in the delete list. Put it in a separate "Sensitive Reference Files (DO NOT DELETE)" list.
3. **List & Pause (The Double Recheck):**
   - Present the EXACT list of targeted files, including their absolute/relative paths, to the user.
   - **MANDATORY PAUSE:** Explicitly ask the user for confirmation: "เธเธเนเธเธฅเนเธเธขเธฐเธ•เธฒเธกเธฃเธฒเธขเธเธฒเธฃเธ”เนเธฒเธเธเธ เธขเธทเธเธขเธฑเธเนเธซเนเธฅเธเธ—เธดเนเธเธ–เธฒเธงเธฃเน€เธฅเธขเนเธซเธกเธเธฃเธฑเธ?"
   - DO NOT execute any deletion tool. You MUST wait until the user explicitly grants permission.
4. **Execution:** Upon user approval, use `run_command` with OS-native remove commands (`Remove-Item` or `rm -f`) to surgically delete only the explicitly approved targets.
5. **Verification Report:** Confirm success to the user that the workspace is thoroughly cleaned.

---

## ๐”— GBRAIN Backlinks
- **2026-06-14 12:55** | [Root Folder Hygiene & Systemic Rules](file:///c:/My%20Claw/MyProjects/Quick%20Save/Complete/Core-VPS/V12.20.0_[infra]_ag-skills_root-folder-hygiene-and-reviewchat.md) -- Auto-added from /save session

