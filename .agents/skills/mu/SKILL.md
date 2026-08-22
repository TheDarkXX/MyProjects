---
name: mu
description: "Migrated mu skill"
---
# ๐จ Skill: `/mu` (Mockup Generator)

## Objective
To rapidly visualize a web UI or dashboard concept before writing any code, ensuring the AI and the user share the exact same mental model of layout, components, and mood. This acts as a visual bridge between conceptual ideation and the `/design` implementation phase.

## Execution Steps

1. **Context Extraction:** 
   - Analyze the current conversation for what the user is trying to build. Identify required structural components (e.g., sidebar, 3-column layout, metrics cards, chat bubbles) and user roles.
2. **Design System Integration (Cross-Skill Sync):**
   - Mentally invoke the principles of the `/design` skill before generating. 
   - Ensure the image generation prompt strictly requests the `MyDesign` premium aesthetics (e.g., specific color palettes, sleek dark modes, glassmorphism, modern typography, neumorphic shadows). Do NOT generate generic, boring wireframes.
3. **Prompt Engineering:** Build a highly detailed prompt targeting Midjourney-level UI/UX Dribbble aesthetics.
   - *Example Constraints to inject:* "High definition UI/UX design, web app dashboard, dark theme, glowing purple and green neon accents, glassmorphism panels, extremely bright and highly legible typography for data/logs, highly detailed, clean modern layout, no device borders".
4. **Tool Execution:** 
   - Call the `generate_image` tool using the constructed prompt. Assign an appropriate, concise `ImageName`.
5. **Feedback Loop:**
   - Present the generated mockup artifact directly to the user.
   - Ask exactly: "เธ—เธดเธจเธ—เธฒเธเธเธตเนเนเธเนเนเธซเธกเธเธฃเธฑเธ? เธกเธตเธชเนเธงเธเนเธซเธเธญเธขเธฒเธเธชเธฅเธฑเธเธ•เธณเนเธซเธเนเธ เธซเธฃเธทเธญเนเธซเนเธเธกเน€เธฃเธดเนเธกเน€เธเธตเธขเธเธซเธเนเธฒเธ•เธฒเนเธเธเธเธตเนเนเธ”เธขเธญเธดเธ Design System เธเธญเธเนเธเธฃเน€เธเนเธเนเธ”เนเน€เธฅเธขเนเธซเธกเธเธฃเธฑเธ?"
