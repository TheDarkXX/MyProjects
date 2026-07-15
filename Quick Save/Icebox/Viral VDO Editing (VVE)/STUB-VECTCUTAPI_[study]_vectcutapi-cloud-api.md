---
brain_task_id: "EVO-VECTCUTAPI-20260715"
---
# VectCutAPI Cloud API and MCP Integration

## 📌 Context (Compiled Truth)
The VectCutAPI proposal (https://github.com/sun-guannan/VectCutAPI) provides a robust Cloud API and MCP protocol for CapCut draft manipulation. During dev review, it scored 7.3/10. It solves the critical file lock problem (Iron Rule #2) by bypassing local CapCut processes entirely and offers cloud previews. 
However, it was **ICEBOXED** due to timing: VVE is currently executing Phase 5 (Scene & B-Roll Generator) and lacks the bandwidth to pivot to a cloud-based video assembly architecture. Additionally, VectCutAPI cannot natively render `.mp4` files (it only generates drafts). It requires maintaining an always-on Python server and managing cloud storage paths, introducing significant infra complexity.
This feature is slated for re-evaluation in Phase 6, or if VectCutAPI implements a direct rendering API.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
<details>
<summary>Click to view the original dev proposal review artifact</summary>

# 🔬 Dev Proposal Review: VectCutAPI

**Review Date:** 2026-07-15  
**Reviewer:** AG (via `/dev` skill)  
**Source:** https://github.com/sun-guannan/VectCutAPI  
**Project Focus:** VVE (Viral VDO Editing)  
**Quick Save Path:** `Quick Save/Complete/VVE/`  
**Latest Version in Complete:** `V13.1.1`  
**Next Version (if approved):** `V13.2.0`

---

## 📋 Proposal Summary

**VectCutAPI** เป็น Open-source API (Apache-2.0) สำหรับควบคุม CapCut/剪映 ด้วยโค้ด ทั้ง HTTP REST (port 9001) และ MCP Protocol ครอบคลุมเต็ม pipeline ตั้งแต่ create draft → add materials (video/audio/image/text/subtitle/effect/sticker/keyframe) → save draft → cloud preview

### Core Architecture
- **Python 3.10+** server (`capcut_server.py` / `mcp_server.py`)
- **pyJianYingDraft** — internal Python SDK สำหรับ draft JSON manipulation
- **Cloud Preview** — generate URL ดูตัวอย่างบน browser ได้เลยไม่ต้อง export
- **Multi-Profile** — รองรับ `capcut_legacy`, `jianying_legacy`, `jianying_pro_10`
- **11 MCP Tools** — พร้อม integrate กับ Coze, Dify, N8N, Claude Code, Trae

---

## ⭐ 5-Dimension Scoring (The Dev Baseline)

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| 💎 **Value** (×2 weight) | **8/10** | VVE ปัจจุบันทำ draft manipulation แบบ manual JSON edit ผ่าน `hypercut` skill ซึ่ง fragile มาก ต้อง kill CapCut process ก่อนทุกครั้ง (Iron Rule #2) VectCutAPI ให้ cloud-based approach ที่ bypass ปัญหา file lock ทั้งหมด แถม preview ได้โดยไม่ต้อง re-open CapCut |
| 🔗 **Compatibility** | **7/10** | Integrate ได้ดีกับ existing pipeline: VVE มี SRT output → VectCutAPI รับ SRT import, VVE มี transcript → VectCutAPI รับ text overlay, VVE คำนวณ cuts → VectCutAPI รับ timeline positioning **แต่** VectCutAPI ต้องรัน Python server ตัวเอง (port 9001) ซึ่งเพิ่ม infra dependency ใหม่ |
| ⚠️ **Risk** | **6/10** | ข้อกังวล: (1) ต้องพึ่ง external cloud domain `capcutapi.top` สำหรับ preview — ถ้าบริการ down จะ fallback ไม่ได้, (2) Iron Rule #13 "Base Master Principle" อาจ conflict ถ้าใช้ VectCutAPI แบบ sequential add โดยไม่มี immutable base, (3) Config มี `oss_config` ที่ต้องตั้ง cloud storage — เพิ่มความซับซ้อนด้าน security |
| 🚀 **Growth** | **9/10** | เปิด path ใหม่ที่ VVE ยังไม่มี: (1) **Batch production** — loop สร้าง 50 วิดีโอจาก Excel/JSON, (2) **MCP integration** — ให้ AI agent สั่งตัดต่อผ่าน Claude/Coze ได้เลย, (3) **Real-time preview** — ไม่ต้อง open CapCut เลย, (4) **Keyframe animation API** — ทำ Ken Burns effect ด้วยโค้ด |
| ⏱️ **Effort** | **6/10** | ไม่ trivial — ต้อง: (1) Setup Python venv + dependencies, (2) Configure `config.json` for CapCut profile, (3) เขียน integration layer ระหว่าง VVE pipeline output → VectCutAPI calls, (4) ปรับ hypercut skill ให้ dual-mode (local vs. cloud) |

### 📊 Overall Score Calculation

```
Value(8×2) + Compatibility(7) + Risk(6) + Growth(9) + Effort(6)
= 16 + 7 + 6 + 9 + 6 = 44 / 60 = 7.33 / 10
```

**Overall Score: 7.3/10** — ABOVE threshold for adoption

---

## ✅ ข้อดี (Pros)

1. **แก้ Pain Point ตรงจุด** — ปัญหา file lock ที่ต้อง kill CapCut ทุกครั้ง (Iron Rule #2) หายไปเลย ถ้าใช้ cloud approach
2. **Cloud Preview** — ดูผลงานได้ทันทีผ่าน URL ไม่ต้องเปิด CapCut แล้วรอ load project
3. **Batch Production Path** — เปิดทางให้ทำ "สร้างวิดีโอ 50 ชิ้นจาก spreadsheet" ซึ่ง VVE ยังทำไม่ได้
4. **MCP Protocol** — พร้อม integrate กับ agent ecosystem (Coze, N8N, Claude Code)
5. **SRT Support** — VVE มี SRT output อยู่แล้ว (`subtitles_for_capcut.srt`) → ใช้ `add_subtitle` API ได้เลย
6. **Open Source (Apache-2.0)** — ไม่ติด license ปัญหา fork/modify ได้เต็มที่
7. **Multi-Profile** — รองรับทั้ง CapCut International และ 剪映 ซึ่ง VVE ใช้ CapCut อยู่
8. **Keyframe API** — ทำ cinematic effects (Ken Burns, zoom, fade) ด้วย code ไม่ต้อง manual

## ❌ ข้อเสีย (Cons)

1. **External Domain Dependency** — Preview URL พึ่ง `capcutapi.top` — ไม่ใช่ infra ของเรา ถ้าเจ้าของ domain หยุดบริการ preview จะพัง
2. **Python Server Overhead** — ต้องรัน server ตลอดเวลา (port 9001) เพิ่ม resource consumption
3. **ไม่มี Render API** — สร้าง draft ได้แต่ **ไม่มี API export เป็น .mp4 โดยตรง** ยังต้องเปิด CapCut/剪映 ถ้าจะ render
4. **Config Complexity** — ต้องตั้ง `config.json` + อาจต้องตั้ง OSS (object storage) ถ้าจะ upload draft ไป cloud
5. **Iron Rule #13 Risk** — "Base Master Principle" อาจ conflict กับ VectCutAPI ที่ add materials แบบ sequential — ต้องออกแบบ integration ที่ treat each `create_draft` call as a new immutable base
6. **Documentation ส่วนใหญ่เป็นภาษาจีน** — ต้องแปลเอง (แต่ README EN มีพอใช้)
7. **No Unit Test for API responses** — ถ้า API format เปลี่ยน ไม่มี safety net

---

## 🏛️ Verdict & Recommendation

| Item | Verdict | Reason |
|------|---------|--------|
| **VectCutAPI (Cloud API + MCP)** | 🟡 **ICEBOX** | Score 7.3/10 ผ่านเกณฑ์แต่ **timing ไม่ใช่ตอนนี้** — VVE ยังอยู่ระหว่าง Phase 5 (Scene & B-Roll Generator) ตาม memory.md ถ้า adopt ตอนนี้จะ split focus, ควร finish Phase 5 ก่อนแล้วค่อยเอา VectCutAPI มาเป็น Phase 6 |
| **pyJianYingDraft (Local SDK)** | 🟢 **APPROVE (Partial)** | ส่วน Python SDK สำหรับ draft manipulation นี้ เอามา reference ได้เลยตอนนี้ เพราะ hypercut skill ที่มีอยู่ก็ทำ draft JSON edit อยู่แล้ว — pyJianYingDraft มี structured classes ที่ดีกว่า manual JSON hacking |
| **vectcut-api skill (ที่กูสร้างไปแล้ว)** | 🟢 **KEEP** | Skill file ที่สร้างไว้ใน `.agents/skills/vectcut-api/` ยังมีประโยชน์เป็น reference — เก็บไว้ได้เลย |

---

## 📊 สรุปรายงาน (360-Degree Report & Contextual Mapping)

### สถานะปัจจุบันของ VVE
โปรเจกต์ VVE อยู่ระหว่างทำ Phase 5: Scene & B-Roll Generator ยังไม่จบ Pipeline หลักที่ใช้อยู่คือ VAD → Transcription (ElevenLabs Scribe v2) → AI Editorial → SRT → CapCut Draft Injection ผ่าน hypercut skill

### ทำไมถึงแนะนำ ICEBOX ไม่ใช่ APPROVE ตรงๆ
1. **Focus** — การ adopt tool ใหม่ตอน Phase 5 ยังค้างจะทำให้ split attention เกินไป
2. **ไม่มี render API** — VectCutAPI สร้าง draft ได้แต่ไม่สามารถ export .mp4 ได้ด้วยตัวเอง ซึ่งหมายความว่ายังต้องพึ่ง CapCut Desktop อยู่ดี ถ้าจะได้ mp4 ออกมาจริงๆ
3. **pyJianYingDraft มีค่ากว่า API** — ในบริบท VVE ที่ทำ local draft manipulation อยู่แล้ว SDK ตัวนี้มีค่ากว่า HTTP API ตรงๆ

### แผนที่แนะนำ
- **ตอนนี้:** เก็บ skill reference ไว้, ศึกษา pyJianYingDraft classes เป็น reference สำหรับ hypercut improvement
- **Phase 6 (อนาคต):** เมื่อ Phase 5 จบ → evaluate VectCutAPI อีกครั้ง โดยเฉพาะ batch production + MCP integration
- **ถ้า VectCutAPI เพิ่ม render API ในอนาคต:** re-evaluate เป็น APPROVE ทันที เพราะจะเป็น full pipeline ได้เลย

</details>

## 🔬 Timeline & Debugging Log
- 2026-07-15: Proposal reviewed via `/dev` skill. Verdict split into Icebox (Main API) and Active (pyJianYingDraft SDK).

## 🔗 GBRAIN Backlinks
### related_to
- **2026-07-15 13:00** | [V12.27.2 vve_pycapcut-evaluation-test](../../Complete/Viral%20VDO%20Editing%20(VVE)/V12.27.2_[study]_vve_pycapcut-evaluation-test.md) -- Related evaluation of CapCut python tooling.
- **2026-07-15 13:00** | [V12.26.1 capcut-repos-analysis](../../Complete/Viral%20VDO%20Editing%20(VVE)/V12.26.1_[study]_capcut-repos-analysis.md) -- Previous analysis of CapCut repos.
- **2026-07-15 13:00** | [V12.25.0 capcut-cli-failsafe](../../Complete/Viral%20VDO%20Editing%20(VVE)/V12.25.0_[impl]_capcut-cli-failsafe_scene-generator-tsv.md) -- Failsafe implementation for CapCut CLI, related to local draft manipulation.
