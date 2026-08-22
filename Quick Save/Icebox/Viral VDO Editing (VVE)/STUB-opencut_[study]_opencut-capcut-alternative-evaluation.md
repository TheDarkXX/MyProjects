---
type: study
status: icebox
date: 2026-08-17
conversation_id: 9115f9fc-94c9-4737-b04a-77db8ab448d3
tags: [vve, opencut, capcut-alternative, open-source, video-editor]
summary: "Evaluated OpenCut (84k stars, MIT) as CapCut replacement for VVE pipeline. Score 3.0/10 → ICEBOX. Rewrite in progress (no timeline), incompatible JSON schema, missing audio effects. Monitor for Headless Mode + MCP Server releases."
source: https://github.com/OpenCut-app/OpenCut
verdict: ICEBOX
score: 3.0
---

# 🔬 OpenCut — Open-Source CapCut Alternative Evaluation

## 📌 Context (Compiled Truth)

- User เจอ OpenCut จาก Facebook link — open-source video editor ที่ประกาศตัวเป็น "CapCut alternative"
- **Repository:** https://github.com/OpenCut-app/OpenCut | ⭐ 84k stars | 8.3k forks | MIT License
- **สถานะ:** กำลัง rewrite ใหม่ทั้งหมดจาก TypeScript/Next.js → Rust core + Plugin architecture
  - Version เดิม (Classic) ถูก archive แล้ว ไม่มีการ maintain
  - Version ใหม่ยังอยู่ในขั้น design architecture, ยังไม่รับ contribution จากภายนอก
  - Classic ยัง live อยู่ที่ `opencut.app`, rewrite จะอยู่ที่ `new.opencut.app`

### Roadmap (Announced, ยังไม่ implement):
- Editor API
- First-class third party plugins (plugin-first architecture)
- Desktop, mobile, browser from one Rust codebase
- **MCP server** (for AI agents) ← น่าสนใจ
- **Headless mode** (automation, batch rendering) ← ตรงจุดกับ VVE
- Scripting tab in editor

### Dev Baseline Scoring (5 Dimensions):

| Dimension | Score | Key Reasoning |
|-----------|-------|---------------|
| 💎 Value (×2) | 4/10 | แก้ CapCut lock-in ได้ แต่ยังไม่มีอะไรให้ใช้จริง, ไม่มี audio effects |
| 🔗 Compatibility | 2/10 | VVE pipeline ทั้งหมดพึ่ง CapCut JSON schema → ต้อง rewrite ทุกไฟล์ |
| ⚠️ Risk (inverted) | 1/10 | Classic archived, rewrite no timeline, production risk สูงมาก |
| 🚀 Growth | 7/10 | ถ้า Headless + MCP สำเร็จ = game-changer แต่คือ "ถ้า" ใหญ่ |
| ⏱️ Effort (inverted) | 0/10 | Rewrite VVE ทั้งสาย: 8+ scripts, effect library, rendering pipeline |

**Overall: 3.0/10 → ❄️ ICEBOX**

### ข้อดี:
1. Open Source MIT — ไม่กลัว ByteDance policy changes
2. Headless Mode (planned) — batch rendering แบบ programmatic
3. MCP Server (planned) — AI agent integration โดยตรง
4. Plugin Architecture (planned) — custom effects ไม่ต้อง decode resource_id
5. Community ใหญ่ (84k stars) — โอกาสรอดสูง
6. Privacy-first — ไม่ upload ขึ้น cloud ByteDance

### ข้อเสีย:
1. 🚨 ยังใช้งานจริงไม่ได้ — rewrite in progress, no timeline
2. Classic ตายแล้ว — archived, no maintenance
3. ไม่มี Audio Effects — vocal beautify, noise reduction ไม่มี
4. ไม่มี Effect Library — CapCut มีพันตัว, OpenCut ต้อง build ใหม่
5. Schema ต่างสิ้นเชิง — VVE ต้อง rewrite ทุกไฟล์
6. Rendering engine ยัง unproven

### Action Items:
- ⭐ Star repo + Watch releases → ตอนนี้
- 🔍 Re-evaluate เมื่อ Headless Mode ออก → TBD
- 🔍 Re-evaluate เมื่อ MCP Server ออก → TBD
- 🧪 PoC test เมื่อ rewrite stable → TBD

## 📦 RAW ARTIFACT BACKUP (Iron Rule — paste 100%, do NOT summarize)

### OpenCut README (extracted 2026-08-17):

```
Status:
OpenCut is being rewritten from the ground up. What's coming:
- An Editor API
- First-class third party plugins (made possible by a plugin-first architecture)
- Desktop, mobile, and browser from one codebase (Rust core)
- MCP server (for AI agents)
- Headless mode (automation, batch rendering)
- A scripting tab directly in the editor

You can still find the previous version at opencut-app/opencut-classic,
which is the one to reach for today. opencut.app still runs the classic version.
The rewrite will live at new.opencut.app until it's ready to take over.
```

### OpenCut Classic Project Structure:
```
apps/web/       — Next.js web application
apps/desktop/   — Native desktop app built with GPUI (in progress)
rust/           — Platform-agnostic core: GPU compositor, effects, masks, WASM bindings
docs/           — Architecture and subsystem documentation
```

### Classic Tech Stack:
- Bun, Docker, Redis, PostgreSQL
- Next.js + TypeScript + Rust/WASM
- Turbo monorepo

### OpenCut Rewrite Tech Stack:
- Rust core (Cargo.toml)
- Moon build system (moon.yml)
- Proto toolchain (.prototools)
- Bun (bunfig.toml)
- Apps: web, desktop, API

### Why OpenCut (from README):
- Privacy: Your videos stay on your device
- Free features: Most basic CapCut features are now paywalled
- Simple: People want editors that are easy to use — CapCut proved that

### Repository Stats (2026-08-17):
- Stars: 84k
- Forks: 8.3k
- Commits: 1,598
- Open Issues: 267
- Open PRs: 103
- License: MIT
- Sponsors: fal.ai

## 🔬 Timeline & Debugging Log

- **2026-08-17 11:19** — User ส่ง GitHub link ของ OpenCut มาให้ประเมิน (เจอจาก Facebook)
- **2026-08-17 11:19** — อ่านสกิล `/dev` จาก `ag_skills_backup/dev.md`
- **2026-08-17 11:19** — Fetch README จาก `github.com/OpenCut-app/OpenCut`
- **2026-08-17 11:20** — Fetch Classic repo จาก `github.com/opencut-app/opencut-classic` + website `opencut.app`
- **2026-08-17 11:20** — อ่าน VVE context files: `V12.26.1_[study]_capcut-repos-analysis.md`, `V12.27.2_[study]_vve_pycapcut-evaluation-test.md`
- **2026-08-17 11:21** — สร้าง dev_proposal_review.md artifact — 5-dimension scoring + pros/cons + verdict
- **2026-08-17 11:22** — User approved ICEBOX verdict
- **2026-08-17 11:22** — เขียน ICEBOX file ลง `Quick Save/Icebox/Viral VDO Editing (VVE)/`

## 🔗 GBRAIN Backlinks (Bidirectional)

### depends_on
- **2026-07-10** | [V12.26.1 CapCut Repos Analysis](../../Complete/Viral%20VDO%20Editing%20(VVE)/V12.26.1_[study]_capcut-repos-analysis.md) -- Previous tool analysis (pyCapCut, video-autopilot-kit, capcut-mcp-server) that established VVE custom JSON injection as the best approach

### related_to
- **2026-07-11** | [V12.27.2 pyCapCut Evaluation Test](../../Complete/Viral%20VDO%20Editing%20(VVE)/V12.27.2_[study]_vve_pycapcut-evaluation-test.md) -- pyCapCut ICEBOX verdict that confirmed VVE DIY JSON injection superiority
- **2026-07-10** | [V12.26.0 Dopamine Engine & SFX](../../Complete/Viral%20VDO%20Editing%20(VVE)/V12.26.0_[impl]_dopamine_engine_and_sfx.md) -- Dopamine Engine implementation using CapCut resource_ids (would need full rewrite if migrating to OpenCut)
- **2026-07-11** | [STUB Browser-Use Competitor Analysis](../../DeepFreeze/Viral%20VDO%20Editing%20(VVE)/STUB-browser-use_[study]_vve_competitor_analysis.md) -- Related competitor/tool analysis for VVE
