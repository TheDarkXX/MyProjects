---
name: dev
description: "Migrated dev skill"
---
# ๐”ฌ Skill: `/dev`

## Objective
To autonomously review incoming dev-agent study proposals and external tool/repo evaluations, performing a deep analysis of each item's potential value to our AG system. The skill scores, rates, and decides whether to adopt, reject, or icebox each proposal โ€” then auto-promotes approved items into actionable Quick Save plans.

## Execution Steps

1. **Scan Incoming Folder:**
   - Execute `list_dir` on `Quick Save/_incoming/dev-agent/`.
   - Identify all unreviewed `_STUB_` Markdown files (ignore `archive/` subfolder).
   - If no stubs found โ’ report "No pending dev proposals" and stop.

2. **Ingest & Deep Research:**
   - Use `view_file` to read the full Markdown of each identified stub.
   - If the stub references an external repo/tool (e.g., GitHub URL), use `read_url_content` to fetch the README, source code, or documentation.
   - Extract the core concept, architecture, and key features.

3. **Deep Analysis & Scoring (The Dev Baseline):**
   - For each proposal, evaluate against our AG system using 5 dimensions (score 1-10):
     - **Value (๐’):** Does this solve a real problem we have? Evidence from past bugs, corrections, or recurring pain points.
     - **Compatibility (๐”—):** How well does it integrate with our existing AGENTS.md, Iron Rules, Hydra pipeline, and VPS infrastructure?
     - **Risk (โ ๏ธ):** Does it conflict with existing rules or philosophies? Could it break something?
     - **Growth (๐€):** Does it enable exponential scale or just marginal improvement?
     - **Effort (โฑ๏ธ):** Implementation cost โ€” trivial (1-2 files) vs. major rewrite?
   - Calculate **Overall Score** (weighted average, Value counts double).

4. **Pros & Cons Analysis:**
   - For each proposal, write a clear เธเนเธญเธ”เธต / เธเนเธญเน€เธชเธตเธข section.
   - Identify which specific parts are adoptable vs. which parts conflict.
   - Note any adaptations needed for our multi-agent autonomous context.

5. **Construct the Review Artifact:**
   - Create or update an artifact (e.g., `dev_proposal_review.md`).
   - For each evaluated proposal, include:
     - Title, source, and stub ID.
     - Quick summary of the core idea.
     - The Star Scores table with brief reasoning per dimension.
     - Overall Score and verdict.
     - Full เธเนเธญเธ”เธต / เธเนเธญเน€เธชเธตเธข breakdown.

6. **Present Results & Wait for Human Decision:**
   - **(360-Degree Reporting & Contextual Mapping):** AG MUST append a dedicated section titled **'๐“ เธชเธฃเธธเธเธฃเธฒเธขเธเธฒเธ (360-Degree Report & Contextual Mapping)'** at the end or beginning of the `dev_proposal_review.md` artifact file. This section MUST be written entirely in Thai and summarize all outcomes (Approve/Icebox/DeepFreeze/Reject) with clear context, so the user can read the entire executive summary in one place. Do not scatter Thai sentences throughout the English data.
   - Present the review artifact table to the User as a summary.
   - Propose which items should be APPROVED, ICEBOXED, DEEPFREEZED, or REJECTED.
   - **CRITICAL:** Stop here. You MUST wait for the User to reply with a confirmation (e.g., "confirm", "approve") before taking any actual file operations or system actions.

7. **Execute Decisions (Post-Confirmation):**
   - Once the User confirms, move the processed original stubs to `Quick Save/_incoming/dev-agent/archive/` in ALL cases (Approve, Reject, Icebox, or DeepFreeze).
   - Search `Quick Save/Complete/` to find the correct next semantic Version number.
   - For **APPROVE** items: Assign a version number and write the new file (e.g. `V[x.y.z]_[impl]...md`) directly into `Quick Save/Active/`.
   - For **ICEBOX** items: DO NOT assign a version number. Write the file (e.g. `STUB-{id}_[study]...md`) directly into `Quick Save/Icebox/`.
   - For **DEEPFREEZE** items: DO NOT assign a version number. Write the file (e.g. `STUB-{id}_[study]...md`) directly into `Quick Save/DeepFreeze/`.
   - For **REJECT** items: DO NOT assign a version number. Write the file (e.g. `STUB-{id}_[study]...md`) directly into `Quick Save/Rejected/`.
   - **CRITICAL:** The generated file MUST contain full YAML frontmatter (with `brain_task_id`), deep analysis, and the evaluation details. It MUST use the exact Quick Save template:
        ```markdown
        ---
        (YAML Frontmatter)
        ---
        # [Title]

        ## ๐“ Context (Compiled Truth)
        (Deep analysis, evaluation details, and decisions)

        ## ๐“ฆ RAW ARTIFACT BACKUP (Iron Rule)
        (PASTE 100% OF THE ARTIFACT TEXT HERE. DO NOT SUMMARIZE. If > 1000 lines, use <details> tags. Do NOT abbreviate.)

        ## ๐”ฌ Timeline & Debugging Log
        (Changelog and iterations)

        ## ๐”— GBRAIN Backlinks
        (Bidirectional links)
        ```
   - **GBRAIN Backlink Generation (Iron Rule - Bidirectional):**
        - At the absolute bottom of the document, append a `## ๐”— GBRAIN Backlinks` section.
        - Actively search (`grep_search` or `list_dir`) for 3-5 historically related files in `Quick Save/Complete/` or `docs/` that share architectural similarities or context.
        - Use categorized lists: `### depends_on`, `### enables`, `### related_to`.
        - **Format:** `- **YYYY-MM-DD HH:MM** | [page title](path) -- context`
        - **Bidirectional Requirement:** For every file you link to, you MUST open that target file and add a backlink pointing to your new file.

8. **Database Sync (Auto-Update Web UI):**
   - AG MUST automatically sync the decision back to the VPS database so the Web UI tracking is closed out.
   - **Schema Routing Note:**
     - If `brain_task_id` starts with `EVO-`, update the `evolution_log` table: `UPDATE evolution_log SET status='completed' WHERE proposal_id='<id>';`
     - If `brain_task_id` is an integer, update the `tasks` table: `UPDATE tasks SET status='completed' WHERE id=<id>;`
   - Use `run_command` over SSH to execute the update. For complex queries, use the `scratch/update_db.sql` file approach to avoid PowerShell quote escaping issues.

## ๐”— GBRAIN Backlinks
### related_to
- **2026-05-04 01:58** | [V11.3.0 SocratiCode Evaluation](../../Quick Save/Icebox/V11.3.0_[study]_infra_socraticode-evaluation.md) -- Deep review evaluation execution using dev skill.
