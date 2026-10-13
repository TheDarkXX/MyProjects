# Markdown Authoring Bible (DrView Template & Rule R30)

> **Executive TL;DR Card**  
> **Markdown Authoring Bible** คือคัมภีร์มาตรฐานการเขียนไฟล์ `.md` สำหรับ AI Agent และ Developer ทุกคนในเครือข่าย เพื่อให้เนื้อหาเรนเดอร์ใน DrView ได้อย่างสวยงาม สบายตา ไม่เกิดปัญหา Cognitive Overload หรือ Outline ล้นจอ รองรับกฎเหล็ก **RFC Rule R30 (Long-File Ergonomics & Interactive TOC Protocol)** พร้อมกล่องโครงสร้างต้นแบบ (Master Skeleton Template) ที่พร้อมก๊อปปี้ไปใช้งานได้ทันที

---

<a id="toc"></a>
## 📑 สารบัญ (Table of Contents)
- [📌 1. บริบทและวัตถุประสงค์ (Context & Purpose)](#context)
- [🏗️ 2. โครงสร้างหัวข้อและ Emoji Registry (Heading Hierarchy)](#heading-hierarchy)
- [🎨 3. การเน้นข้อความและ HTML Allowlist (Emphasis & Content Decoupling)](#emphasis-allowlist)
- [📑 4. กฎการทำสารบัญและขอบเขตการบังคับใช้ (RFC Rule R30 & Scope)](#interactive-toc-r30)
- [🔗 5. การทำลิงก์ภายในและข้ามเอกสาร (Internal Links & Backlinks)](#internal-links)
- [❌ 6. สิ่งที่ห้ามทำเด็ดขาด (Anti-Patterns)](#anti-patterns)
- [📋 7. กล่องโครงสร้างต้นแบบพร้อมใช้ (Master Skeleton Template)](#skeleton-template)

---

<a id="context"></a>
## 📌 1. บริบทและวัตถุประสงค์ (Context & Purpose)
นี่คือมาตรฐานการเขียน Markdown ที่ AI Agent ทุกตัวในทุกโปรเจกต์ต้องปฏิบัติตามเมื่อสร้างหรือแก้ไขไฟล์ `.md` เพื่อให้เนื้อหาและ Outline (TOC) render ออกมาถูกต้องและสวยงามใน DrView โดยมุ่งเน้น:
1. **Zero Eye Strain:** จัดระเบียบการจัดวาง (Visual Hierarchy) ให้อ่านง่าย สบายตา
2. **Deterministic Navigation:** ป้องกันลิงก์กระโดดวืดข้ามโปรแกรมด้วย Explicit ASCII Anchor
3. **Clean Viewport:** ใช้ Accordion พับเก็บข้อมูลซ้ำๆ หรือเนื้อหายาวเป็นพรืด เพื่อรักษาความสะอาดของหน้าจอ

[⬆️ กลับสู่สารบัญ](#toc)

---

<a id="heading-hierarchy"></a>
## 🏗️ 2. โครงสร้างหัวข้อและ Emoji Registry (Heading Hierarchy)

| Level | การใช้งาน | กฎที่ต้องจำ |
|---|---|---|
| `# H1` | ชื่อเอกสาร | **1 อันเท่านั้นต่อไฟล์** |
| `## H2` | Section หลัก | **ใส่ Emoji นำหน้าเสมอ** และคั่นก่อนหน้าด้วย `---` |
| `### H3` | หัวข้อย่อย | ไม่ต้องใส่ Emoji, ให้ indent ด้วย list item หรือหัวข้อปกติ |
| `#### H4` | รายละเอียดลึก | ใช้เมื่อจำเป็นในไฟล์เชิงเทคนิค (Research, Guide) |

### Emoji Registry สำหรับ H2

| Emoji | ใช้กับเนื้อหาแบบไหน |
|---|---|
| 📌 | Context, บริบท, ที่มาที่ไป |
| 📋 | Task List, Checklist, สิ่งที่ต้องทำ |
| 🔬 | Timeline, Debugging, ประวัติการทำงาน |
| 📊 | Data, สถิติ, ผลลัพธ์, Analysis |
| 💡 | Tips, Insight, ข้อสังเกต |
| ⚠️ | Warning, ข้อควรระวัง, Limitation |
| 🎯 | เป้าหมาย, Goal, Objective |
| 🔗 | Links, References, Backlinks |
| 📦 | Backup, Archive, Raw Data |
| 🛠️ | Implementation, Technical Details |
| 🏗️ | Architecture, Design, Structure |
| 🧪 | Testing, Verification, Experiment |

[⬆️ กลับสู่สารบัญ](#toc)

---

<a id="emphasis-allowlist"></a>
## 🎨 3. การเน้นข้อความและ HTML Allowlist (Emphasis & Content Decoupling)

**กฎ Content Decoupling & HTML Allowlist (RFC R30):**
- **HTML Allowlist (อนุญาตเฉพาะ 3 แท็กนี้เท่านั้น):**
  - `<a id="...">` สำหรับ Semantic Anchor นำทางภายในหน้า
  - `<details>` และ `<summary>` สำหรับพับเก็บส่วนที่ยาวเกินไป (Repeated Payloads เช่น สคริปต์, Appendix, Raw Logs)
- **HTML Forbidden (ห้ามเด็ดขาด):** ห้ามใช้ `<mark>`, `<kbd>`, `<span style="...">`, `<style>`, `<script>`, `<iframe>` และ attribute ตระกูล `on*` ทั้งหมด

- **เน้นข้อความสำคัญ:** ใช้ `**ตัวหนา**` (ผลลัพธ์: **ตัวหนา** — เรนเดอร์เป็นสีส้ม DrView Orange)
- **เน้นคำ/ตัวเลขเฉพาะ:** ใช้ `` `inline code` `` (ผลลัพธ์: `inline code`)
- **คำเตือน / กฎเหล็ก:** ใช้ `> **🚨 กฎเหล็ก:** เนื้อหา` (จะแสดงเป็นกล่อง Blockquote)
- **Tips:** ใช้ `> **💡 TIP:** เนื้อหา` (จะแสดงเป็นกล่อง Blockquote)
- **Warning:** ใช้ `> **⚠️ WARNING:** เนื้อหา` (จะแสดงเป็นกล่อง Blockquote)

[⬆️ กลับสู่สารบัญ](#toc)

---

<a id="interactive-toc-r30"></a>
## 📑 4. กฎการทำสารบัญและขอบเขตการบังคับใช้ (RFC Rule R30 & Scope)

เมื่อไฟล์เอกสารมีความยาว **≥150 บรรทัด หรือมี H2 ตั้งแต่ 4 หัวข้อขึ้นไป** ต้องทำตามข้อกำหนดต่อไปนี้:

1. **Executive TL;DR Card:** สรุปสาระสำคัญ/Actionable ไม่เกิน 12 บรรทัดแรกใต้ H1 เสมอ (อ่านจบใน 30 วิ)
2. **In-File Interactive TOC:** วางสารบัญหัวไฟล์ พร้อมตั้ง `<a id="toc"></a>`
3. **Explicit ASCII Anchor:** กำกับหัวข้อ H2 ด้วย `<a id="semantic-id"></a>` และลิงก์ด้วย `[หัวข้อ](#semantic-id)` (**ห้ามใช้ Auto-generated slug จากภาษาไทย/Emoji เด็ดขาด**)
4. **ปุ่มดีดกลับ:** ท้ายทุก Section ที่ยาว >40 บรรทัด หรือหลังกลุ่ม `<details>` ต้องใส่ `[⬆️ กลับสู่สารบัญ](#toc)` เสมอ
5. **พับเก็บข้อมูลซ้ำ (Accordion):** ใช้ `<details><summary>` ครอบข้อมูลที่เป็น Repeated Payloads (เช่น สคริปต์วิดีโอหลายชุด, Benchmark ดิบ, Log ประวัติยาวๆ)

### ขอบเขตการบังคับใช้ (Scope Enforcement)
* **บังคับ 100% (Strict Enforcement):** เอกสารเชิงยุทธศาสตร์, Playbooks, คู่มือระบบ, แผนสถาปัตยกรรม, คลังความรู้, สารานุกรม (อยู่ใน `docs/`, `vault/`, `Products/`, `Brand/`)
* **แนะนำเป็นอย่างยิ่ง (Highly Recommended):** เอกสารบันทึกงานโค้ด (`Quick Save/`) ที่มีความยาวหลายร้อยบรรทัด แนะนำให้ใส่ In-File TOC หัวไฟล์ เพื่อช่วยให้ผู้ใช้กระโดดข้ามบล็อกโค้ดไปยัง Timeline หรือ GBRAIN Backlinks ได้ทันที

[⬆️ กลับสู่สารบัญ](#toc)

---

<a id="internal-links"></a>
## 🔗 5. การทำลิงก์ภายในและข้ามเอกสาร (Internal Links & Backlinks)

ต้องใช้ทั้ง 2 แบบร่วมกัน (Inline + Related Section):

1. **Inline Link:** เมื่อมีการพูดถึงข้อมูลจากไฟล์อื่น ให้ทำลิงก์คลุมข้อความนั้นทันที
   - ตัวอย่าง: `อ้างอิงจาก [Project Index](file:///C:/XBrain/docs/PROJECT_INDEX_SPIDERWEB.md) ของเรา`
2. **Related Documents:** รวมลิงก์ทั้งหมดไว้ท้ายไฟล์ เพื่อให้อ่านง่าย
   - วางไว้ใน H2 `## 🔗 Related Documents` (ก่อน GBRAIN Backlinks)

[⬆️ กลับสู่สารบัญ](#toc)

---

<a id="anti-patterns"></a>
## ❌ 6. สิ่งที่ห้ามทำเด็ดขาด (Anti-Patterns)

- ❌ ใช้ `<mark>`, `<kbd>`, `<span style="color:red">` → ใช้ Markdown หรือ Allowlist เท่านั้น
- ❌ ใช้ `> [!IMPORTANT]` → GitHub alert ไม่ render ในระบบเรา
- ❌ H2 ที่ไม่มี Emoji → ทำให้ Outline ดูจืดชืด และอ่านยาก
- ❌ H1 มากกว่า 1 อัน → ทำลายโครงสร้าง SEO และ TOC
- ❌ ไม่ใช้ `---` คั่นระหว่าง H2 → จะไม่มีเส้นแบ่ง gradient ทำให้เนื้อหาดูติดกันเกินไป
- ❌ ปล่อยให้เอกสารยาวเกิน 150 บรรทัดหรือ H2 ≥4 โดยไม่มี In-File TOC และ TL;DR Card
- ❌ ใช้ Auto-generated anchor จากภาษาไทยหรือ Emoji ในลิงก์สารบัญ เช่น `(#1-บทนำ)` → **ต้องใช้ ASCII เท่านั้น เช่น `(#intro)`**

[⬆️ กลับสู่สารบัญ](#toc)

---

<a id="skeleton-template"></a>
## 📋 7. กล่องโครงสร้างต้นแบบพร้อมใช้ (Master Skeleton Template)

ก๊อปปี้โครงสร้างด้านล่างนี้ไปใช้เป็นจุดเริ่มต้นของเอกสารยาวได้ทันที:

```markdown
# 🚀 [ชื่อเอกสารภาษาไทยหรืออังกฤษ]

> **Executive TL;DR Card**  
> สรุปใจความสำคัญ ผลลัพธ์ และประเด็นที่ต้องตัดสินใจภายใน 3-5 บรรทัด เพื่อให้อ่านจบเข้าใจภาพรวมได้ใน 30 วินาทีแรก

---

<a id="toc"></a>
## 📑 สารบัญ (Table of Contents)
- [📌 1. บริบทและที่มา (Context)](#context)
- [🎯 2. วัตถุประสงค์และเป้าหมาย (Objectives)](#objectives)
- [🛠️ 3. รายละเอียดการทำงาน (Implementation)](#implementation)
- [🔗 4. เอกสารที่เกี่ยวข้อง (Related Documents)](#related-docs)

---

<a id="context"></a>
## 📌 1. บริบทและที่มา (Context)

เนื้อหาอธิบายที่มาที่ไปของเอกสารนี้...

[⬆️ กลับสู่สารบัญ](#toc)

---

<a id="objectives"></a>
## 🎯 2. วัตถุประสงค์และเป้าหมาย (Objectives)

รายการเป้าหมาย...

[⬆️ กลับสู่สารบัญ](#toc)

---

<a id="implementation"></a>
## 🛠️ 3. รายละเอียดการทำงาน (Implementation)

เนื้อหารายละเอียดเชิงลึก...

<details>
<summary>👉 คลิกเพื่อกางดูรายละเอียด Payload / สคริปต์ / ข้อมูลดิบ</summary>

เนื้อหาที่ถูกพับไว้ เช่น ตารางดิบ หรือสคริปต์ยาวๆ...

</details>

[⬆️ กลับสู่สารบัญ](#toc)

---

<a id="related-docs"></a>
## 🔗 4. เอกสารที่เกี่ยวข้อง (Related Documents)
- [ชื่อเอกสารอ้างอิง](file:///C:/XBrain/docs/...)

[⬆️ กลับสู่สารบัญ](#toc)
```

[⬆️ กลับสู่สารบัญ](#toc)
