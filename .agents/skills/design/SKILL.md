---
name: design
description: "Migrated design skill"
---
# ๐จ Skill: `/design` (UI/UX Audit & Standardization)

## Objective
To strictly enforce the **BillPay Dark Dashboard Design System** on any given frontend file, eliminating generic aesthetics (like flat colors or raw black shadows) and aligning the UI with the premium, vibrant, and neumorphic standard.

## Execution Steps

1. **Information Ingestion (Mandatory):**
   - The AI MUST read the `Target File` provided by the user.
   - The AI MUST instantly execute `view_file` on `C:\My Claw\MyProjects\MyDesign\Design System Brain APP Dark Dashboard.md` to load the exact color hexes, typography rules, and gradient specifications. Do not rely on memory for hex codes.

2. **Compliance Audit:**
   - **Colors:** Scan for forbidden default colors (red, green, blue). Replace with the Primary Scale (Electric Violet `#823AFD`, Hot Pink `#FC2D79`, Burnt Orange `#FD5514`).
   - **Gradients:** Ensure ALL charts, progress bars, and solid badges use the **3-Stop Gradient Rule**. No flat fills.
   - **Shadows:** Scan for `rgba(0,0,0, X)` box-shadows. They MUST be neumorphic (paired with a light edge) and use violet/pink tints (e.g., `rgba(130,58,253,0.28)`), never dead black/gray.
   - **Typography & Legibility:** Ensure `JetBrains Mono` is used strictly for ALL numbers (currency, percentages, counts) with `font-variant-numeric: tabular-nums`. Crucially, NEVER sacrifice legibility for aesthetics. Dark mode sub-text, timestamps, and small metadata MUST be bright and luminous (e.g., `#9898c8`), forbidding dim, unreadable greys (e.g., `#5a5a90`).

3. **Execution:**
   - Apply fixes directly to the target file(s) using native string replacement tools.
   - Summarize the exact UI tokens that were upgraded.
   - If the user provides a prompt description (e.g., "/design Make a new login button"), generate the HTML/CSS completely adhering to the design system.

## Example Trigger
User: `/design brain-app-public/hydra.css Please audit the buttons`

