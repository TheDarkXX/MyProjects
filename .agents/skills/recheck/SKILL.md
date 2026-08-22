---
name: recheck
description: "Migrated recheck skill"
---
# ๐” Skill: `/recheck`

## Objective
Perform a mandatory Post-Implementation Verification after a big feature, new page, or significant codebase change, ensuring all logic, event bindings, and UI elements (like Emojis) are fully functional before deployment.

## Execution Steps
1. **Code Auditing:** Immediately review the code modified during the current conversation. Look specifically for:
   - Untied event listeners, missing imports, or unhandled exceptions.
   - Syntax edge cases.
   - **CSS Class Mapping (Critical):** Scan all newly added HTML classes and IDs. Verify that the corresponding definitions actually exist in the CSS file to prevent "dead classes" and broken layouts.
2. **Karpathy Sweep (Anti-Bloat & Precision):** Execute a mandatory behavioral constraint check against the new code:
   - *Simplicity Test:* If the change is >100 lines, ask "Can this be 50?". Ensure no speculative abstractions or unrequested features were added.
   - *Surgical Traceability:* Confirm every changed line traces directly to the user's request. Revert any accidental "drive-by refactoring" or style drift of adjacent code.
3. **Emoji Safe-Check:** Scrutinize the newly added frontend texts. If any emojis are at risk of breaking (rendering as โ–ก on Windows/Chrome), automatically replace them using the safe list in `memory.md` without asking for permission.
4. **Task Checklist:** Open the Active Quick Save implementation plan and physically tick (`[x]`) the completed checkboxes.
5. **Zero-Bug Policy:** If you uncover a bug during this review, FIX IT BEFORE reporting back to the user. Do not report a bug you can fix yourself.
