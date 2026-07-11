---
brain_task_id: "browser-use-eval"
type: study
status: deepfreeze
date: 2026-07-11
tags: [vve, browser-use, automation, evaluation]
---
# 🔬 STUB-browser-use_[study]_vve_competitor_analysis.md

## 📌 Context (Compiled Truth)
- Evaluated `browser-use/browser-use` (an AI browser agent framework) against the VVE (Viral VDO Editing) pipeline.
- Determined that browser-use is fundamentally a different tool category (web automation via CDP) compared to VVE (desktop/local file automation via JSON injection).
- VVE's JSON injection for CapCut is significantly faster, more reliable, and cheaper than using UI automation via browser-use.
- The VVE pipeline has over 10 capabilities (AI scene generation, STT, VAD, fuzzy alignment, SFX logic, etc.) that browser-use cannot replicate.
- The only potential use case for browser-use in VVE is auto-uploading to social media and competitor scraping, which is not currently a priority.
- Decision: **DEEPFREEZE**. Will revisit if/when the distribution phase (auto-posting) becomes a requirement.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
<details>
<summary>Full Review Artifact</summary>

# 🔬 Dev Proposal Review — browser-use vs VVE

> **Date:** 2026-07-11
> **Context:** VVE (Viral VDO Editing) pipeline — ประเมิน `browser-use/browser-use` (AI browser agent) ว่ามีค่าต่อ VVE pipeline ยังไง

---

## 🧠 ต้องเข้าใจก่อน: มันคนละ species กัน

> [!WARNING]
> **VVE** = Video Editing Automation Pipeline (CapCut JSON injection + AI scene gen + SFX + subtitle)
> **browser-use** = AI Browser Agent Framework (navigate web, click, fill forms, scrape data)
>
> มันเหมือนเทียบ **ค้อน** กับ **ไขควง** — ทำงานคนละอย่าง แต่อยู่ในกล่องเครื่องมือเดียวกัน (automation)

**ดังนั้นกูเทียบใน 2 มุม:**
1. **VVE approach vs browser-use approach** — ถ้าจะ automate CapCut ทั้งคู่ทำแบบไหน?
2. **browser-use เป็นเครื่องมือเสริมให้ VVE ได้ไหม?** — เช่น scrape B-Roll, auto-upload, etc.

---

## 1️⃣ browser-use — `browser-use/browser-use`

**Source:** https://github.com/browser-use/browser-use
**Language:** Python | **License:** MIT
**Stars:** ⭐ 70k+ (mega-popular)
**Category:** AI Browser Agent Framework

### 💡 Core Concept — คืออะไร ดีอย่างไร

browser-use คือ **framework ที่ให้ AI agent ใช้ browser เหมือนคนจริง** — เปิดเว็บ, คลิกปุ่ม, พิมพ์ข้อความ, กรอกฟอร์ม, ดูด data ออกมา ทั้งหมดผ่าน natural language command

**Key Architecture:**
- ใช้ **Chrome DevTools Protocol (CDP)** ควบคุม browser จริง
- AI model (GPT-4o, Claude, Gemini) ทำหน้าที่ "มอง" หน้าจอ + ตัดสินใจว่าจะกดตรงไหน
- รองรับ **stealth mode** (proxy rotation, CAPTCHA solving, anti-detection)
- มี **cloud version** สำหรับ production (managed infrastructure)
- ~89.1% success rate บน WebVoyager benchmark

**สรุปง่ายๆ:** มึงบอก AI ว่า "ไปเปิด Google แล้วหาเรื่อง X" → browser-use จะเปิด Chrome ขึ้นมาจริง แล้ว AI จะกดๆ พิมพ์ๆ เหมือนมือคนทำ

---

## 🎯 การเทียบฟีเจอร์: VVE vs browser-use (ในบริบท Automation)

### มุมที่ 1: ถ้าจะ Automate CapCut — ใครแนวทางดีกว่า?

| Feature | VVE (JSON Injection) | browser-use (AI Browser Agent) | ใครดีกว่า? | Reason |
|---------|---------------------|-------------------------------|------------|--------|
| **CapCut Control** | เขียน `draft_content.json` ตรง → deterministic 100% | สั่ง AI กดปุ่มใน CapCut GUI ผ่าน screenshot → ไม่ deterministic | **VVE ดีกว่ามาก** 🏆🏆 | JSON injection = ผลลัพธ์แม่นยำ 100% ทุกครั้ง, browser-use ใช้ vision AI ซึ่ง CapCut GUI ซับซ้อนมาก AI อ่านปุ่มผิดบ่อย |
| **Execution Speed** | เขียน JSON เสร็จใน 2-3 วินาที | เปิด CapCut UI → AI มอง → กดทีละปุ่ม = 3-5 นาทีต่อ task | **VVE ดีกว่ามาก** 🏆🏆 | JSON manipulation เร็วกว่า UI automation 100x |
| **Reliability** | ผลลัพธ์เหมือนกันทุกรอบ (deterministic) | AI อาจกดผิดปุ่ม, CapCut UI เปลี่ยน = พัง | **VVE ดีกว่ามาก** 🏆🏆 | Desktop app automation เป็น nightmare — CapCut UI เปลี่ยนบ่อย, element ไม่มี stable ID |
| **Setup Complexity** | Python + CapCut CLI + draft_content.json | Chromium + LLM API key + CDP connection + CapCut ต้อง renderใน browser (ไม่ได้!) | **VVE ง่ายกว่า** 🏆 | browser-use ทำงานบน **web browser** ไม่ใช่ desktop app — CapCut Desktop ≠ web app (CapCut web version มี แต่ feature จำกัดมาก) |
| **Cost per Run** | ฟรี (local Python) | ต้องเรียก LLM API ทุก step ($0.01-0.10/task) | **VVE ดีกว่า** 🏆 | VVE ไม่เสียเงินตอน inject, browser-use เสียค่า API ทุกครั้งที่ AI ต้อง "มอง" หน้าจอ |
| **Error Recovery** | QA step ตรวจจับ → fix → re-run | AI retry → อาจพังแบบอื่น | **VVE ดีกว่า** 🏆 | VVE มี structured QA pipeline (`09-qa-recheck.py`), browser-use retry แบบ brute force |
| **Adaptability to UI Changes** | CapCut เปลี่ยน JSON schema → ต้องแก้ code | CapCut เปลี่ยน UI → AI ยังอ่านได้ (vision-based) | **browser-use มีข้อดี** 🆕 | นี่คือจุดแข็งเดียวของ browser-use — AI adapt ตาม UI ใหม่ได้ แต่ในทางปฏิบัติ CapCut JSON schema เปลี่ยนน้อยกว่า UI |
| **Subtitle Injection** | `capcut-cli import-srt` + zero-overlap algorithm | AI เปิด CapCut → หา Import SRT button → กดอัพโหลด | **VVE ดีกว่ามาก** 🏆🏆 | VVE มี millisecond-precision timing, browser-use ไม่สามารถควบคุม timestamp ละเอียดแบบนี้ได้ |
| **Beauty Face / Noise Reduction** | JSON field manipulation ตรง (beauty preset + noise level) | ต้องให้ AI หา slider ใน CapCut UI → ลาก → ไม่แม่น | **VVE ดีกว่ามาก** 🏆🏆 | Fine-grained parameter control (เช่น beauty 30%) เป็นไปไม่ได้ผ่าน UI automation |

### มุมที่ 2: browser-use เป็นเครื่องมือเสริมให้ VVE ได้ไหม?

| Use Case | browser-use ทำได้? | VVE ทำอยู่ยังไง? | มีประโยชน์ไหม? | Reason |
|----------|-------------------|-----------------|----------------|--------|
| **Auto-upload Reels to Social** | ✅ เปิด FB/IG/TikTok → login → upload → set caption | ❌ ไม่มี (manual upload) | **มีประโยชน์มาก** 🏆🏆 | นี่คือ sweet spot ของ browser-use — automate web-based upload flows |
| **Scrape B-Roll References** | ✅ เปิด stock sites → ค้นหา → download | ❌ ไม่มี (ใช้ AI generate B-Roll แทน) | **ไม่จำเป็น** 🤷 | VVE ใช้ AI-generated B-Roll ไม่ต้อง scrape stock footage |
| **Auto-download SFX** | ✅ เปิด freesound.org → ค้นหา → download | ✅ มี SFX pool อยู่แล้วใน local folder | **ไม่จำเป็น** 🤷 | VVE มี curated SFX library แล้ว ไม่ต้อง scrape ใหม่ |
| **Competitor Analysis** | ✅ เปิด TikTok → ดู trending → extract patterns | ❌ ไม่มี | **น่าสนใจ** ⚠️ | แต่ TikTok มี anti-bot detection แรง, browser-use stealth mode อาจช่วยได้ |
| **Auto-fill Video Metadata** | ✅ เปิด CapCut web → set title/description | ❌ ไม่มี (manual) | **อาจมีประโยชน์** ⚠️ | แต่ CapCut web ≠ CapCut Desktop — VVE ทำงานบน Desktop |
| **YouTube Analytics Scraping** | ✅ เปิด YouTube Studio → scrape view counts/CTR | ❌ ไม่มี | **อนาคตไกล** 🔮 | ปัจจุบัน VVE focus ที่ production ไม่ใช่ analytics |
| **CAPTCHA Solving for Uploads** | ✅ Built-in CAPTCHA solving | ❌ ไม่เกี่ยว | **เกี่ยวถ้าใช้ auto-upload** ⚠️ | CAPTCHA solving จำเป็นเฉพาะเมื่อ auto-upload ซึ่ง VVE ยังไม่ทำ |

### มุมที่ 3: VVE Pipeline Features ที่ browser-use ทำไม่ได้เลย

| สิ่งที่ VVE ทำได้ แต่ browser-use ทำไม่ได้ | VVE Scripts | ทำไม browser-use ทำไม่ได้? |
|-------------------------------------------|-------------|--------------------------|
| **AI B-Roll Scene Generation (8 categories)** | `05-scene-generator.py` + `doctorbank_masterprompt.yaml` | browser-use ไม่มี content creation engine — มันแค่คลิก browser |
| **ElevenLabs Scribe Character-level STT** | `02-transcribe.py` | browser-use ไม่มี audio processing — มันทำงานบน DOM ไม่ใช่ audio |
| **Timebolt Silence Cut + VAD** | `vad_extractor.py` | browser-use ไม่มี waveform analysis |
| **AI Subtitle Refiner (fuzzy align)** | `03b-align-ai.py` | browser-use ไม่มี NLP text alignment |
| **Auto SFX Placement (keyword triggers)** | `07-sfx-placer.py` | browser-use ไม่มี content-aware SFX logic |
| **3-Stage BGM System (Hook/Edu/Hype)** | `08-capcut-inject.py` | browser-use ไม่มี timeline-aware music system |
| **Minnie Transition Pool (real resource_ids)** | `08b-capcut-auto-style.py` | browser-use ไม่รู้จัก CapCut internal IDs |
| **Perfect Mark Snapshot System** | `mark_perfect.py` | browser-use ไม่สามารถ snapshot JSON state ของ CapCut ได้ |
| **Dopamine-driven Layout Shuffling** | `06-footage-assembler.py` | browser-use ไม่มี video composition logic |
| **Zero-Overlap Subtitle Algorithm** | `04-generate-srt.py` | browser-use ไม่มี timestamp manipulation |

---

## ⭐ Star Scores

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| 💎 Value | **3/10** | browser-use เป็นคนละ domain กัน — มันเก่งเรื่อง web automation แต่ VVE ทำงานบน desktop app (CapCut) + local files ซึ่ง browser-use ไม่ถนัด มีค่าเฉพาะ auto-upload use case ซึ่ง VVE ยังไม่ต้องการ |
| 🔗 Compatibility | **2/10** | browser-use ทำงานบน web browser (CDP/Chromium) ส่วน VVE ทำงานบน local Python + CapCut Desktop — คนละโลก |
| ⚠️ Risk | **2/10** (ต่ำดี) | ถ้า adopt ก็แค่ install เป็น additional tool ไม่กระทบ VVE pipeline เดิม |
| 🚀 Growth | **4/10** | อนาคตถ้า VVE ต้อง auto-upload to social media หรือ scrape competitor content จะ relevant ทันที แต่ตอนนี้ไม่ใช่ priority |
| ⏱️ Effort | **3/10** | ถ้าจะ integrate ต้องเขียน workflow ใหม่ทั้งหมด — browser-use ไม่ plug-and-play กับ VVE |

**Overall Score: 3.0/10** (Value×2 weighted)

> **คำนวณ:** (3×2 + 2 + 2 + 4 + 3) / 7 = 17/7 ≈ **2.4/10** — ปัดเป็น **3.0** เพราะ auto-upload potential

---

## 📊 สรุปรายงาน (360-Degree Report & Contextual Mapping)

### เปรียบเทียบรวมกับ repos ที่เคยเทียบมาแล้ว (จาก V12.26.1)

| Dimension | pyCapCut | video-autopilot-kit | capcut-mcp-server | **browser-use** |
|-----------|----------|--------------------|--------------------|-----------------|
| 💎 Value | **7** | 4 | 4 | **3** |
| 🔗 Compatibility | **8** | 3 | 2 | **2** |
| ⚠️ Risk | 3 | **2** | 4 | **2** |
| 🚀 Growth | **7** | 4 | 5 | **4** |
| ⏱️ Effort | **5** | 6 | 7 | **3** |
| **Overall** | **6.8** ✅ | **3.8** | **4.0** | **3.0** |

### ทำไม browser-use ถึงคะแนนต่ำที่สุด?

เพราะมันเป็น **คนละ species** กับ VVE:

1. **Domain Mismatch** — browser-use ออกแบบมาสำหรับ **web automation** (เปิดเว็บ, กรอกฟอร์ม, scrape data) แต่ VVE ทำงานบน **desktop app** (CapCut) + **local file manipulation** (JSON, SRT, WAV, MP4) ซึ่ง browser-use ไม่มีความสามารถเหล่านี้

2. **Speed & Reliability** — VVE JSON injection ทำงานเสร็จใน 2-3 วินาที, deterministic 100% ส่วน browser-use + Computer Use approach ช้า (3-5 นาที/task) และไม่ deterministic (AI อาจกดผิดปุ่ม)

3. **Cost** — VVE รัน local ฟรี, browser-use ต้องเรียก LLM API ทุก step

4. **VVE Pipeline ครบกว่ามาก** — VVE มี 10+ scripts ที่ทำ transcription → subtitle → scene generation → SFX → injection → QA ทั้งหมดนี้ browser-use ทำไม่ได้แม้แต่อย่างเดียว

### แต่ browser-use มีจุดแข็ง 1 อย่างที่น่าจดไว้

> [!TIP]
> **Auto-Upload to Social Media** — ถ้าอนาคต VVE ต้องการ auto-post Reels/TikTok/YouTube Shorts, browser-use เป็นตัวเลือกที่ดีมาก:
> - Login + navigate upload form + set caption/hashtags + publish
> - CAPTCHA solving built-in
> - Stealth mode bypass bot detection
> - มี cloud version สำหรับ production
>
> **แต่ตอนนี้ VVE ยังไม่ถึงจุดนั้น** — ยังอยู่ใน production phase (สร้างวิดีโอ) ไม่ใช่ distribution phase (ปล่อยวิดีโอ)

---

## 🧊 Verdict: **DEEPFREEZE**

**เหตุผล:** browser-use เป็น tool คนละ domain กับ VVE อย่างสิ้นเชิง — เหมือนซื้อเรือดำน้ำมาปลูกข้าว มีประสิทธิภาพสูง**ในสิ่งที่มันทำ** (web automation) แต่ VVE ไม่ได้ทำสิ่งที่ browser-use ถนัด

**สิ่งเดียวที่น่าจดไว้:**
- **Auto-upload to Social Media** — เมื่อ VVE pipeline mature ถึงขั้น distribution, browser-use จะเป็นตัวเลือกแรกที่ควรกลับมาดู
- **Competitor Scraping** — ดูด trending TikTok/Reels patterns ด้วย stealth mode ก็น่าสนใจ แต่เป็น nice-to-have ไม่ใช่ must-have

**ไว้กลับมาดูถ้า:**
- VVE ต้องการ auto-post ไปหลาย platform พร้อมกัน
- VVE ต้องการ scrape competitor content for trend analysis
- VVE เปลี่ยนมาใช้ CapCut Web (ไม่ใช่ Desktop) → browser-use จะ relevant ทันที

</details>

## 🔬 Timeline & Debugging Log
- **2026-07-11**: Received request to evaluate browser-use against VVE.
- **2026-07-11**: Extracted browser-use README and documentation to understand its capabilities (web automation, CDP, stealth mode).
- **2026-07-11**: Compared browser-use features against VVE's JSON injection approach and pipeline features.
- **2026-07-11**: Concluded that browser-use is a web automation tool, not a video editing tool. Put it in DEEPFREEZE.

## 🔗 GBRAIN Backlinks
### related_to
- **2026-07-10** | [V12.26.1_[study]_capcut-repos-analysis.md](../../Complete/Viral%20VDO%20Editing%20(VVE)/V12.26.1_[study]_capcut-repos-analysis.md) -- Previous competitor repos analysis
- **2026-07-11** | [V12.27.2_[study]_vve_pycapcut-evaluation-test.md](../../Complete/Viral%20VDO%20Editing%20(VVE)/V12.27.2_[study]_vve_pycapcut-evaluation-test.md) -- pyCapCut evaluation
- **2026-07-06** | [V12.24.0_[impl]_capcut-cli_integration-and-subtitle-injector.md](../../Complete/Viral%20VDO%20Editing%20(VVE)/V12.24.0_[impl]_capcut-cli_integration-and-subtitle-injector.md) -- VVE CLI integration reference
