---
name: evo
description: "Migrated evo skill"
---
# ๐ง  Skill: `/evo`

## Objective
To autonomously review incoming High-Risk proposals from Hydra's Evolver/Ideator meta-agents, evaluating them for their potential for non-linear ("giga") growth. The skill guarantees high-quality filtering so only structurally transformative plans are promoted into the `Active/` folder, while noise and low-impact patches are safely rejected or sent back.

## Execution Steps

1. **Scan Incoming Folders:**
   - Execute `list_dir` on `Quick Save/_incoming/hydra/`.
   - Identify all unreviewed `EVO_` and `INSP_` Markdown files.

2. **Ingest Proposals:**
   - Use `view_file` to read the Full Markdown of each identified proposal.
   - Extract the "Root Cause" and "Proposed Changes" vectors.

3. **Giga-Growth Evaluation (The Hydra Baseline):**
   - Evaluate against the standard: *Does this proposal solve a fundamental bottleneck that prevents exponential scale, or is it just a local micro-optimization?*
   - Assess 4 key dimensions out of 5 stars:
     - **Impact (๐€):** How radically does this change the system's ceiling?
     - **Feasibility (โ๏ธ):** Is the proposed change realistically achievable using current meta-agent tooling without destroying safety gates?
     - **Urgency (โฑ๏ธ):** Is this patching an active bleed (e.g., recursive watchdog errors or 0% success rates)?
     - **Alignment (๐ฏ):** Does this propel us towards a truly autonomous, self-healing "Awakened" architecture?

4. **Construct the Review Artifact:**
   - Create or update an artifact file (e.g., `hydra_proposal_review.md`).
   - For each evaluated proposal, include:
     - The Title and ID.
     - A quick summary of the core idea.
     - The Star Scores table with brief reasoning per dimension.
     - An **Overall Score** (average).

5. **Final Verdict & Actionable Suggestion:**
   - Categorize each proposal into one of three buckets:
     - โ… **APPROVE (Promote to Active):** Direct, game-changing upgrades.
     - ๐” **REVISE & MERGE:** Good idea but vague or overly destructive. Bundle with existing plans or send back for rewrite.
     - โธ๏ธ **ICEBOX:** Good idea, not the right time yet (1-3 months).
     - โ๏ธ **DEEPFREEZE:** Long-term storage, wait for tech/scale (6-12+ months).
     - โ **REJECT:** Redundant, low impact, or already implemented. (Move original stub to `Quick Save/_incoming/hydra/Archive/Reject/`)
     
6. **Present Results & Wait for Human Decision:**
   - **(Batch Score Card โ€” MANDATORY, shown FIRST before everything else):**
     AG MUST calculate and display the following block at the very top of the report, **before** the individual proposal breakdowns:

     ```
     โ•”โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•—
     โ•‘  ๐ BATCH SCORE CARD                     โ•‘
     โ• โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•ฃ
     โ•‘  เธเธฐเนเธเธเธฃเธงเธก: [X] / 100                    โ•‘
     โ•‘  เน€เธเธฃเธ”:     [เธฃเธฐเธ”เธฑเธ]                       โ•‘
     โ•‘  เธเธฅเธเธฒเธเธฃเธญเธเธเธตเน: [เธเธฒเธขเธฒ]                    โ•‘
     โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
     ```

     **เธงเธดเธเธตเธเธณเธเธงเธ“ Batch Score:**
     - เธเธณเธเธงเธ“เธเธฐเนเธเธเน€เธเธฅเธตเนเธขเธเธญเธ **APPROVED proposals เน€เธ—เนเธฒเธเธฑเนเธ** (เธเนเธฒเน€เธเธฅเธตเนเธขเธเธฒเธ Impact + Feasibility + Urgency + Alignment เธซเธฒเธฃเธ”เนเธงเธข 4 เนเธฅเนเธงเธเธนเธ“ 20 เน€เธเธทเนเธญเนเธซเนเธญเธขเธนเนเนเธ scale 100)
     - เธซเธฑเธ 5 เธเธฐเนเธเธเธ•เนเธญ proposal เธ—เธตเนเธ–เธนเธ REJECT เน€เธเธฃเธฒเธฐเน€เธเนเธเน€เธฃเธทเนเธญเธเธเนเธณเธซเธฃเธทเธญเธ•เธทเนเธ
     - เธเธงเธ 5 เธเธฐเนเธเธ เธ–เนเธฒ batch เธเธตเนเธกเธต Innovation finding โฅ 1 เธ•เธฑเธง

     **เธฃเธฐเธ”เธฑเธ Verdict (เธเธฒเธฃเธ•เธฑเนเธเธเธฒเธขเธฒ โ€” BE CREATIVE!):**
     You MUST invent a **NEW, UNIQUE, and HILARIOUS/SAVAGE Thai nickname (เธเธฒเธขเธฒ)** every time based on the score. DO NOT use the exact examples below. Generate a fresh one so the user is surprised!
     
     | เธเธฐเนเธเธ | เน€เธเธฃเธ” | Vibe & เนเธเธงเธ—เธฒเธเธเธฒเธฃเธ•เธฑเนเธเธเธฒเธขเธฒ (เธเธดเธ”เธชเธ”เนเธซเธกเนเธ—เธธเธเธเธฃเธฑเนเธ!) |
     |---|---|---|
     | 90-100 | S | ๐‘‘ **เธฃเนเธฒเธเธ—เธญเธ / เธเธฃเธฐเน€เธเนเธฒ** โ€” เธเธงเธฑเธ•เธเธฃเธฃเธกเธเธฅเธดเธเธงเธเธเธฒเธฃ เนเธเธ•เธฃเธ•เธถเธ (เธ•เธฑเธงเธญเธขเนเธฒเธเนเธเธงเธ—เธฒเธ: "เธเธฃเธฐเน€เธเนเธฒเธฅเธเธกเธฒเนเธเนเธ”", "เธชเธ•เธตเธ เธเนเธญเธเธชเนเธขเธฑเธเธ•เนเธญเธเธเธฃเธฒเธ", "เธญเธฑเธฅเธเนเธฒเน€เธเธ•เนเธฒเธ—เธฐเธฅเธธเธกเธดเธ•เธด") |
     | 75-89 | A | ๐‘ฝ **เธกเธเธธเธฉเธขเนเธ•เนเธฒเธเธ”เธฒเธง / เธญเธฑเธเธเธฃเธดเธขเธฐ** โ€” เธเธฅเธฒเธ”เนเธเธเธซเธฅเธธเธ”เนเธฅเธ เธ—เธฐเธฅเธธเธเธฃเธญเธ (เธ•เธฑเธงเธญเธขเนเธฒเธเนเธเธงเธ—เธฒเธ: "เน€เธญเน€เธฅเธตเนเธขเธเธเธธเธเน€เธเธดเธฃเนเธเน€เธงเธญเธฃเน", "เนเธญเธเนเธชเนเธ•เธเนเธเธฅเธฑเธเธเธฒเธ•เธดเธกเธฒเน€เธเธดเธ”", "เธชเธกเธญเธเธ—เธฐเธฅเธธเธเธฑเธเธฃเธงเธฒเธฅ") |
     | 60-74 | B | ๐’ผ **เธกเธเธธเธฉเธขเนเน€เธเธดเธเน€เธ”เธทเธญเธ / เน€เธ”เธญเธฐเนเธเธ** โ€” เธเธฒเธเน€เธเธตเนเธขเธ เนเธเนเนเธ”เนเธเธฃเธดเธ เนเธ•เนเน€เธเธเน€เธเธฅเธขเน (เธ•เธฑเธงเธญเธขเนเธฒเธเนเธเธงเธ—เธฒเธ: "เธเธเธฑเธเธเธฒเธเธญเธญเธเธเธดเธจเธ”เธตเน€เธ”เนเธ", "เธ—เธฒเธชเธฃเธฐเธเธเธ—เธธเธเธเธดเธขเธก", "เนเธเนเธ”เธ”เธดเนเธเธเธฃเธฐเธ—เธฑเธเธเธตเธงเธดเธ•") |
     | 40-59 | C | ๐คก **เน€เธ”เนเธเธเธถเธเธเธฒเธ / NPC** โ€” เธ—เธณเธเธฒเธเนเธเนเธเน€เธเนเธเธซเธธเนเธเธขเธเธ•เน เธเนเธณเธ—เนเธงเธกเธ—เธธเนเธ (เธ•เธฑเธงเธญเธขเนเธฒเธเนเธเธงเธ—เธฒเธ: "เน€เธ”เนเธเธเธถเธเธเธฒเธเน€เธเธดเนเธเธเธ", "NPC เธญเนเธฒเธเธชเธเธฃเธดเธเธ•เน", "เนเธเธ—เธเธญเธ—เธ•เธญเธเธเธณเธ–เธฒเธก") |
     | 0-39 | F | ๐’ฉ **เธเธฒเธเธเธตเนเนเธเน / เธเธขเธฐ** โ€” เนเธเธ•เธฃเธเธฒเธ เธชเธกเธญเธเน€เธชเธทเนเธญเธก เน€เธชเธเธญเน€เธฃเธทเนเธญเธเธเนเธณเธเธฒเธ เน€เธเธฅเธทเธญเธเนเธ! (เธ•เธฑเธงเธญเธขเนเธฒเธเนเธเธงเธ—เธฒเธ: "เธเธฒเธเธเธตเนเนเธเนเธเนเธฒเธเธเธทเธ", "เน€เธเธฅเธทเธญเธเธเนเธฒเนเธเน€เธเธดเธฃเนเธเน€เธงเธญเธฃเน", "เธเธฅเธฑเธเนเธเน€เธฃเธตเธขเธเน€เธเธตเธขเธเนเธเนเธ”เนเธซเธกเนเธเธฐ") |

   - **(360-Degree Reporting & Contextual Mapping):** AG MUST append a dedicated section titled **'๐“ เธชเธฃเธธเธเธฃเธฒเธขเธเธฒเธ (360-Degree Report & Contextual Mapping)'** at the end or beginning of the `hydra_proposal_review.md` artifact file. This section MUST be written entirely in Thai and summarize all outcomes (Approve/Icebox/DeepFreeze/Reject) with clear Web UI impacts, so the user can read the entire executive summary in one place. Do not scatter Thai sentences throughout the English data.
   - Propose which items should be APPROVED, REVISE & MERGE, ICEBOXED, DEEPFREEZED, or REJECTED.
   - **CRITICAL:** Stop here. You MUST wait for the User to reply with a confirmation (e.g., "confirm", "approve") before taking any actual file operations or database actions.

7. **Execute Decisions (Post-Confirmation):**
   - For any evaluated proposal, execute the conversion:
     1. Search `Quick Save/Complete/` to find the correct next semantic Version number.
     2. For **APPROVE** items: Assign a version number and write the new file (`V[x.y.z]_[impl]...md`) directly into `Quick Save/Active/`.
     3. For **ICEBOX** items: DO NOT assign a version number. Write the file (`EVO-{id}_[study]...md`) directly into `Quick Save/Icebox/`.
     4. For **DEEPFREEZE** items: DO NOT assign a version number. Write the file (`EVO-{id}_[study]...md`) directly into `Quick Save/DeepFreeze/`.
     5. For **REJECT** items: DO NOT assign a version number. Write the file (`EVO-{id}_[study]...md`) directly into `Quick Save/Rejected/`.
     6. **CRITICAL:** The newly generated file MUST use the exact Quick Save template:
        ```markdown
        ---
        (YAML Frontmatter)
        ---
        # [Title]

        ## ๐“ Context (Compiled Truth)
        (Raw evaluation / Star Scores / Implementation Plan exactly as evaluated)

        ## ๐“ฆ RAW ARTIFACT BACKUP (Iron Rule)
        (PASTE 100% OF THE ARTIFACT TEXT HERE. DO NOT SUMMARIZE. If > 1000 lines, use <details> tags. Do NOT abbreviate.)

        ## ๐”ฌ Timeline & Debugging Log
        (Changelog and iterations)

        ## ๐”— GBRAIN Backlinks
        (Bidirectional links)
        ```
     7. **GBRAIN Backlink Generation (Iron Rule - Bidirectional):**
        - At the absolute bottom of the document, append a `## ๐”— GBRAIN Backlinks` section.
        - Actively search (`grep_search` or `list_dir`) for 3-5 historically related files in `Quick Save/Complete/` or `docs/` that share architectural similarities or context.
        - Use categorized lists: `### depends_on`, `### enables`, `### related_to`.
        - **Format:** `- **YYYY-MM-DD HH:MM** | [page title](path) -- context`
        - **Bidirectional Requirement:** For every file you link to, you MUST open that target file and add a backlink pointing to your new file.
     8. **MERGED TASKS:** In the YAML frontmatter, list any EVOs that were fused into this plan using `merged_task_ids: [EVO-xxx]`.
     9. Move the original incoming stub from `Quick Save/_incoming/hydra/` to `Quick Save/_incoming/hydra/Archive/Approve/`, `Archive/Icebox/`, `Archive/DeepFreeze/`, or `Archive/Reject/` depending on the verdict.
     10. Append any "REVISE & MERGE" proposals into the newly created Active plan.

7.5. **Write Feedback to Cognitive Memory (MANDATORY):**
   - After every /evo decision (approve/reject/icebox/deepfreeze), AG MUST write feedback to help Hydra learn:
     - **CRITICAL:** Use `write_to_file` (Node/UTF-8) or `Out-File -Encoding utf8 -Append` to add these lines. NEVER use `echo >>` in PowerShell, it causes UTF-16 BOM corruption!
     1. Append to `data/hydra-memory/feedback-log.jsonl`:
        `{"ts":"ISO","agent":"evo","proposal_id":"EVO-XXX","verdict":"rejected","reason":"documentation-only, no behavioral change","category":"skill_gap","scores":{"impact":1,"feasibility":5,"urgency":1,"alignment":1}}`
     2. If REJECT โ’ also append to `data/hydra-memory/ideator/rejection-patterns.jsonl`:
     2. If REJECT โ†’ also append to `data/hydra-memory/ideator/rejection-patterns.jsonl`:
        `{"ts":"ISO","category":"skill_gap","pattern":"documentation/comments only","reason":"zero behavioral change","rejectRate":1.0}`
     3. If APPROVE โ†’ append to feedback-log only (Weekly Reflection will learn preference patterns automatically).
   - **WHY THIS MATTERS:** This feedback is consumed by Ideator to avoid proposing rejected categories, and by Weekly Reflection to build compounding wisdom.

8. **Database Sync (Auto-Update Web UI):**
   - AG MUST automatically sync the decision back to the system memory.
   - Log the approved evolution by updating `self-improving/memory.md` with the new approved architecture or component setup.
   - After updating the memory file, proceed to Phase 2.
