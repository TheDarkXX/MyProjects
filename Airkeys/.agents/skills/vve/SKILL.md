---
name: vve
version: "1.2.0"
updated_at: "2026-10-25"
description: >-
  Viral Video Editing Engine (VVE) — ผลิตวิดีโอสายสุขภาพและอาหารเสริมระดับลักชัวรีพรีเมียม สไตล์หมอเจษแท้ 100% (/vve jade) ด้วยระบบ 3 เสาหลัก A-Roll + B-Roll Footage + Hyperframes Overlays ผสานสูตรสคริปต์ 4 หมัด Nectapharma 71M GMV แนะนำรันด้วยโมเดล Claude Opus เพื่อคุมความหรูระดับ Master
---

# 🎬 Viral Video Editing Engine (`/vve` v1.2.0)

> **Core Identity:** เครื่องจักรผลิตวิดีโอคอนเทนต์สุขภาพ & อาหารเสริมระดับ **Luxury Clinical (พรีเมียม ดูแพง หมอจริง วิจัยจริง)**  
> **สไตล์การตัดต่อหลัก:** **หมอเจษ (Dr. Jade / DoctorBank)** ➔ ระบบ 3 เสาหลัก: **A-Roll (หมอพูดล่าง) + B-Roll Footage (กราฟิกบน) + Hyperframes (โมชันกราฟิกลอยหรู)**  
> **สมองการขายเสริม:** **Nectapharma 71M GMV** ➔ สูตรสคริปต์ 4 หมัดทองคำ (Sensory Hook ➔ ASMR Cap Twist ➔ Scientific Proof ➔ Duo Pack CTA)  
> **🧠 Recommended Model:** **Claude Opus (มหาเทพ 👁️‍🗨️ / 3.7 / 4.6)** — บังคับใช้ Opus สำหรับงานวาง Macro Architecture, กำกับ Choreography 3 เสาหลัก, และคุม Aesthetic ความหรูระดับ Luxury Clinical ไม่ให้กลายเป็นการ์ตูนง่อย (ใช้ Flash 3.8 เป็น Runner รัน JSON/สคริปต์รายวัน)

---

<a id="toc"></a>
## 📑 สารบัญ (Table of Contents)
1. [รูปแบบคำสั่ง Slash Commands (`/vve jade` vs `/vve necta`)](#commands)
2. [โมเดลที่แนะนำ: ทำไมต้อง Opus? (Model Protocol)](#model-protocol)
3. [ถอดรหัสโครงสร้างตัดต่อหมอเจษ (Dr. Jade 3-Pillar Architecture)](#dr-jade-pillars)
4. [สถาปัตยกรรมวิดีโอ 5 เลเยอร์ (5-Layer Machine Contract)](#5layers)
5. [สูตรสคริปต์ 4 หมัด Nectapharma 71M GMV (`/vve necta`)](#necta-formula)
6. [Design System & Motion Physics (Anti-Cartoon Rules)](#design-motion)
7. [คู่มือรันคำสั่ง Render & Workflows](#render-workflow)

---

<a id="commands"></a>
## 1. ⚡ รูปแบบคำสั่ง Slash Commands

| คำสั่ง | พารามิเตอร์ | การทำงาน |
|---|---|---|
| **`/vve jade`** | `[ชื่อสินค้า / หัวข้อ / ปัญหา]` | **🌟 คำสั่งหลักสไตล์หมอเจษ:** ผลิตวิดีโอโครงสร้าง 3 เสาหลัก (A-Roll + B-Roll + Hyperframes) ตามแม่แบบ Dr. Jade 100% พร้อมสร้าง `video_spec.json` |
| **`/vve necta`** | `[ชื่อสินค้า / Pain Point]` | **โหมดสคริปต์ 4 หมัดขายถล่ม:** เน้นบทพูดจิตวิทยาปิดการขาย Nectapharma 70.96M GMV (เน้น ASMR เปิดฝา + วางขวดคู่ 2 ขวด ดัน AOV) |
| **`/vve clone`** | `[path วิดีโอ หรือ รายงาน]` | โคลนเลย์เอาต์ จังหวะตัดต่อ และ Motion Graphic ของคลิปตัวอย่าง ถอดเป็น 5-Layer Spec |
| **`/vve spec`** | `[สคริปต์ / ไฟล์ข้อความ]` | แปลงสคริปต์ที่มีอยู่แล้วให้กลายเป็น Machine Timeline Contract ตาม `video_spec.schema.json` |
| **`/vve render`** | `[ชื่อ component หรือ spec.json]` | สั่งรันเรนเดอร์ Motion Overlays ผ่าน Puppeteer Headless Chrome ออกมาเป็น WebM/ProRes โปร่งแสง |

---

<a id="model-protocol"></a>
## 2. 🧠 Model Protocol: ทำไมต้องรันด้วย Opus (มหาเทพ 👁️‍🗨️)?

> [!IMPORTANT]
> **Opus is the Designated Master Brain for /vve:**  
> ระบบ `/vve` ถูกออกแบบมาเพื่อทำลายความ "เป็นการ์ตูนง่อยๆ" ของวิดีโอทั่วไป แล้วยกระดับสู่ **Luxury Clinical** ระดับเวิลด์คลาส ดังนั้นจึงมีข้อกำหนดบทบาทของโมเดลดังนี้:

| โมเดล | บทบาทในระบบ `/vve` | หน้าที่ที่เหมาะสมที่สุด |
|---|---|---|
| **Claude Opus 👁️‍🗨️**<br/>*(มหาเทพ / 3.7 / 4.6)* | **🌟 Master Architect & Creative Director (แนะนำหลัก)** | • วาง Macro Choreography สลับจังหวะ A-Roll (45%) กับ B-Roll (55%) ละเอียดยิบระดับ 0.1 วินาที<br/>• คุม Aesthetic ความหรูหรา (Frosted Glass, Champagne Gold, Easing ลื่นไหลแบบ `power4.out`)<br/>• โคลนสไตล์วิดีโอตัวอย่างคู่แข่ง (`/vve clone`) ถอดโครงสร้าง 5 เลเยอร์โดยไม่ออกทะเล<br/>• ปรับแต่งสคริปต์ 4 หมัด Nectapharma ให้ลึกและเฉียบขาด |
| **Gemini 3.8 Flash 🔥**<br/>*(มารบูรพา)* | **⚡ Fast Runner & Spec Generator** | • เจนไฟล์ `video_spec.json` รายวันตามเทมเพลตที่ Opus วางไว้<br/>• รันคำสั่ง CLI เรนเดอร์ Motion Overlays ด้วย Node.js ในเสี้ยววินาที<br/>• สลับคำคีย์เวิร์ดในสคริปต์แบบกึ่งอัตโนมัติ |

---

<a id="dr-jade-pillars"></a>
## 3. 🧬 ถอดรหัสโครงสร้างตัดต่อหมอเจษ (Dr. Jade 3-Pillar Architecture)

ทุกคลิปของหมอเจษ (อ้างอิงคลิปต้นฉบับ SaveSnap 25, 26, 27, 28) ประกอบด้วย **3 เสาหลัก (3 Pillars)** ที่ต้องประสานกันอย่างไร้รอยต่อ:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. A-Roll (Talking Head / หมอเจษ):                                     │
│    - ภาพหมอเจษพูดตรง นั่งหน้าไมโครโฟน โค้ทขาว/สูท ล็อกสายตาจ้องกล้อง      │
│    - วางตำแหน่ง: ครึ่งล่าง 45% (ในโหมด Split Screen) หรือเต็มจอจังหวะเน้น     │
├────────────────────────────────────────────────────────────────────────┤
│ 2. B-Roll Footage (Visual Cut-aways):                                  │
│    - ภาพแทรกสลับเปลี่ยนทุก 2.5 - 3.0 วินาที เพื่อรักษาสมาธิคนดู (Retention)│
│    - คลังภาพ: กราฟิก 3D อนาโตมี่ (กระดูก/เข่าเสื่อม/ลำไส้), เซลล์ชีววิทยา,   │
│      คนนอนไม่หลับ/ปวดท้อง, ผู้สูงอายุวิ่งออกกำลังกาย, ไลฟ์สไตล์ผู้ใช้จริง       │
│    - วางตำแหน่ง: ครึ่งบน 55% (ในโหมด Split Screen) หรือแทรกเต็มจอสลับจังหวะ  │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Hyperframes Motion Overlays (กราฟิกลอยหรู):                          │
│    - Frosted Glass Hook Badge: ป้ายหัวข้อแคปซูลกระจกฝ้า + แสงวิ่ง Sheen │
│    - Big Number Shockwave: เลข 1, 2, 3, 4 ยักษ์ พร้อมคลื่นออร่าสีทอง    │
│    - PubMed Paper Highlight: เปเปอร์งานวิจัยพร้อมปากกาไฮไลต์สีทองขีดข้อความ │
│    - Hairline Laser Organ Pointer: เส้นเลเซอร์พุ่งชี้อวัยวะ + วงแหวน Ping │
│    - Nutrient Tag: วงกลมสารอาหาร "Ca", "Mg", "D3" ค่อยๆ ป๊อปอัปข้างขวด   │
└────────────────────────────────────────────────────────────────────────┘
```

### องค์ประกอบเสริมที่ห้ามตกหล่น:
1. **Transitions & Pacing:** Fast Zoom Shake / Whip Pan (0.2s - 0.3s) สลับทุก 2.5 - 3 วินาที ห้ามแช่ภาพเดิมเด็ดขาด
2. **Audio Master Standard:** เสียงพูด Voice `-3.0 dBFS`, BGM ดนตรีเบื้องหลัง Ducking ลงที่ `-22.0 dBFS`, ค่าความดังรวม Master Integrated Loudness `-14.0 LUFS`
3. **Subtitles (คำบรรยาย):** ฟอนต์ Kanit หรือ Prompt Bold มี Stroke ขอบ 4-5px ตัดคำทีละ 3-5 คำ ปล่อยตามเสียงพูด พร้อมใส่อีโมจิที่ท้ายประโยคสำคัญ

---

<a id="5layers"></a>
## 4. 📑 สถาปัตยกรรมวิดีโอ 5 เลเยอร์ (5-Layer Machine Contract)

เมื่อระบบ AI ทำงาน จะแปลงโครงสร้างหมอเจษออกมาเป็น 5 เลเยอร์ใน `video_spec.json`:

```
┌────────────────────────────────────────────────────────┐
│ Layer 5: Captions & Hook Badges (Frosted Glass / Pop)  │ ➔ ป้ายข้อความหรู / ตัวเลขช็อคเวฟ
├────────────────────────────────────────────────────────┤
│ Layer 4: Proof Overlays (PubMed, Organ Laser Pointer)  │ ➔ เปเปอร์งานวิจัยขีดปากกา / ชี้อวัยวะ
├────────────────────────────────────────────────────────┤
│ Layer 3: Visual Split (55% Top B-Roll / 45% Bottom Dr) │ ➔ เลย์เอาต์ผ่าครึ่ง หมอพูดล่าง B-Roll บน
├────────────────────────────────────────────────────────┤
│ Layer 2: Audio Master (-14 LUFS, Voice -3dB, BGM -22dB)│ ➔ เสียงพูดคมชัด ดนตรีคลอเบาๆ
├────────────────────────────────────────────────────────┤
│ Layer 1: Story Beat Timeline (Machine Contract JSON)   │ ➔ กำกับเวลาแม่นยำระดับ 0.1 วินาที
└────────────────────────────────────────────────────────┘
```

- **Schema อ้างอิง:** `C:\My Claw\Viral VDO Editing (VVE)\tools\hyperframes_opus\schemas\video_spec.schema.json`
- **ไฟล์ตัวอย่างสมบูรณ์:** `C:\My Claw\Viral VDO Editing (VVE)\tools\hyperframes_opus\samples\doctorbank_magnesium_spec.json`

---

<a id="necta-formula"></a>
## 5. 🏆 สูตรสคริปต์ 4 หมัด Nectapharma 71M GMV (`/vve necta`)

หากต้องการสคริปต์ที่เน้นจิตวิทยาการปิดการขายระดับ 71 ล้านบาท ให้เรียก `/vve necta [สินค้า]`:

```
[0.0s - 3.5s]  S01: SENSORY HOOK      ➔ เจาะลึกอาการเจ็บจริง (Physical Pain / Empathy) ห้ามโชว์สินค้าเด็ดขาด!
      │
[3.5s - 7.5s]  S02: ASMR CAP TWIST    ➔ ปลดล็อกความเชื่อผิด (Myth-Busting) + เสียงเปิดฝา ASMR บนขวดแก้วสีชา
      │
[7.5s - 11.5s] S03: NAKED PILL PROOF  ➔ โชว์เม็ดซอฟต์เจล/แคปซูลบนจานแก้ว + ไฮไลต์เปเปอร์ PubMed คลายกังวล
      │
[11.5s - 15s]  S04: DUO PACK SETTLE   ➔ วาง 2 ขวดคู่ ชี้ตะกร้าซ้ายล่าง ดัน AOV พุ่ง 1,600+ บาท
```

---

<a id="design-motion"></a>
## 6. 🎨 Design System & Motion Physics (Anti-Cartoon Rules)

> [!WARNING]
> **กฎเหล็กต้านกราฟิกการ์ตูนง่อย (Anti-Cartoon Manifesto):**
> 1. **ห้ามใช้ Easing เด้งดึ๋ง (`back.out`) เด็ดขาด!** ให้ใช้ `power4.out` หรือ `expo.out` ลื่นไหลสงบนิ่งระดับภาพยนตร์เท่านั้น
> 2. **ห้ามใช้สีเหลืองนีออนตัดเส้นดำหนาๆ!** ให้ใช้กระจกฝ้าหรูหรา (Frosted Glass `rgba(12, 15, 20, 0.72)` + Hairline Border 1px)
> 3. **ตัวอักษรสีทองแชมเปญ:** ใช้ 3-Stop Gradient (`#ffffff` ➔ `#f6e6c2` ➔ `#c5a059`) สะท้อนแสง Luminous

### Component Library ที่มีให้ใช้งาน:
- **`hook-badge`**: ป้ายหัวข้อกระจกฝ้าบน B-Roll พร้อมเส้นกวาดแสง Sheen Sweep
- **`number-callout`**: ตัวเลขช็อคเวฟขนาดใหญ่ 1, 2, 3, 4 พร้อมคลื่นออร่าทองจางๆ
- **`pubmed-card`**: การ์ดเอกสารวิจัย PubMed พร้อมปากกาไฮไลต์สีทองขีดเส้นใต้ข้อความสำคัญ
- **`pointer-organ`**: เส้นเลเซอร์ Hairline พุ่งไปชี้อวัยวะ (ตับ, สมอง, ไต) พร้อมวงแหวนกระเพื่อม Ping

---

<a id="render-workflow"></a>
## 7. 🛠️ คู่มือรันคำสั่ง Render & Workflows

### โฟลเดอร์โปรเจกต์:
`C:\My Claw\Viral VDO Editing (VVE)\tools\hyperframes_opus`

### คำสั่งทดสอบเรนเดอร์ Component เดี่ยว:
```powershell
node "C:\My Claw\Viral VDO Editing (VVE)\tools\hyperframes_opus\scripts\render-kit.mjs" hook-badge
node "C:\My Claw\Viral VDO Editing (VVE)\tools\hyperframes_opus\scripts\render-kit.mjs" number-callout
node "C:\My Claw\Viral VDO Editing (VVE)\tools\hyperframes_opus\scripts\render-kit.mjs" pubmed-card
node "C:\My Claw\Viral VDO Editing (VVE)\tools\hyperframes_opus\scripts\render-kit.mjs" pointer-organ
```

### การกระจายสกิลและอัปเดตระบบ:
1. ตรวจสอบ YAML ด้วย: `python tools/audit_skills_yaml.py`
2. กระจายสกิลข้าม Spiderweb Mesh ด้วย: `node tools/spiderweb-sendall.js vve`
