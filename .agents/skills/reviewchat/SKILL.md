---
name: reviewchat
description: "Migrated reviewchat skill"
---
# ๐ง  Skill: `/reviewchat`

## Objective
To actively scan the current session's entire conversation history, extract repeated user complaints, analyze where the AI failed or missed the mark, and propose systemic upgrades by converting these pain points into strict **Iron Rules** or highly actionable **AG Skills**.

## Execution Steps

1. **Information Ingestion:**
   - Mentally review all checkpoint summaries and the raw conversation logs for the current session.
   - Look specifically for:
     * User complaints (e.g., "เธฅเนเธเธเธญ", "เธเธทเธก bump cache เธญเธตเธเธฅเธฐ", "เนเธกเนเนเธ”เนเธ—เธณ", "เธ—เธณเนเธกเธ—เธณเนเธเธเธเธตเน").
     * Misunderstandings where the AI assumed success but the user saw failure.
     * Architectural workflows that require manual intervention but could be automated.

2. **Categorization & Extraction:**
   - Group the findings into **"Pain Points / AI Failures"**.
   - For each failure, determine the underlying root cause (e.g., AI trusted a generic command output without strict validation).

3. **Formulation of Upgrades:**
   - Choose which items should become **Iron Rules** (defensive protocols to prevent future mistakes -> saving to `memory.md`).
   - Choose which items should become **AG Skills** (offensive automation protocols -> saving to `docs/ag-system/AG_SKILLS_INDEX.md`).

4. **User Proposal:**
   - Instead of writing files immediately, construct a highly organized Markdown response to the user.
   - Present the extracted Pain Points clearly.
   - Propose the exact text of the New Rules and the logic of the New Skills.
   - Wait for the user to type "confirm" or approve the changes.

5. **Execution (Post-Confirmation):**
   - Once approved, immediately update `self-improving/memory.md` and `docs/ag-system/AG_SKILLS_INDEX.md` alongside any individual skill definition files required.
