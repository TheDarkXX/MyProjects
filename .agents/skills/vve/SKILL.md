---
name: vve
version: "1.0.0"
updated_at: "2026-10-25"
description: >-
  Viral Video Editing Engine (VVE) — ผลิตวิดีโอสายสุขภาพและอาหารเสริมระดับลักชัวรีพรีเมียม โคลนเลย์เอาต์ 5 ชั้นสไตล์หมอเจษ ผสานสคริปต์ 4 หมัด Nectapharma 71M GMV (Hook, Twist, Proof, Duo Pack) และเรนเดอร์ Motion Overlays ด้วย Hyperframes GSAP Engine
---

# 🎬 Viral Video Editing Engine (`/vve` v1.0.0)

> **Core Identity:** เครื่องจักรผลิตวิดีโอคอนเทนต์สุขภาพ & อาหารเสริมระดับ **Luxury Clinical (พรีเมียม ดูแพง หมอจริง วิจัยจริง)**  
> **สูตรผสมลับ:** **สมองการขายจาก Nectapharma (71M GMV Benchmark)** + **หน้าตาความหรูจาก Dr. Jade (5-Layer Split Layout)** + **เรนเดอร์กราฟิกลอยด้วย Hyperframes GSAP Engine**

---

<a id="toc"></a>
## 📑 สารบัญ (Table of Contents)
1. [รูปแบบคำสั่ง Slash Commands](#commands)
2. [สถาปัตยกรรมวิดีโอ 5 เลเยอร์ (5-Layer Architecture)](#5layers)
3. [สูตรสคริปต์ 4 หมัด Nectapharma 71M GMV (`/vve necta`)](#necta-formula)
4. [Design System & Motion Physics (Anti-Cartoon Rules)](#design-motion)
5. [คู่มือรันคำสั่ง Render & Workflows](#render-workflow)

---

<a id="commands"></a>
## 1. ⚡ รูปแบบคำสั่ง Slash Commands

| คำสั่ง | พารามิเตอร์ | การทำงาน |
|---|---|---|
| `/vve necta` | `[ชื่อสินค้า / ปัญหา / Pain Point]` | **โหมดสร้างยอดขายสูงสุด:** เจนสคริปต์ 4 หมัด Nectapharma + วางโครงสร้าง 5-Layer Layout หมอเจษ + สร้าง `video_spec.json` พร้อมเรนเดอร์ |
| `/vve clone` | `[path วิดีโอ หรือ รายงานวิเคราะห์]` | โคลนเลย์เอาต์และสไตล์ของคลิปตัวอย่าง ถอดรหัสออกมาเป็น 5-Layer Spec |
| `/vve spec` | `[ข้อความสคริปต์ / ไฟล์สคริปต์]` | แปลงสคริปต์ที่มีอยู่แล้วให้กลายเป็น Machine Timeline Contract ตาม `video_spec.schema.json` |
| `/vve render` | `[ชื่อ component หรือ path spec.json]` | สั่งรันเรนเดอร์ Motion Overlays ผ่าน Node.js / Puppeteer Headless Chrome ออกมาเป็น WebM/ProRes |

---

<a id="5layers"></a>
## 2. 🧬 สถาปัตยกรรมวิดีโอ 5 เลเยอร์ (5-Layer Architecture)

ทุกคลิปที่ผ่าน `/vve` ต้องถูกจัดวางอย่างเป็นระบบตาม 5 เลเยอร์นี้ เพื่อให้ AI และคนตัดต่อทำงานประสานกันได้ 100% โดยไม่งง:

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
## 3. 🏆 สูตรสคริปต์ 4 หมัด Nectapharma 71M GMV (`/vve necta`)

เมื่อผู้ใช้พิมพ์ `/vve necta [สินค้า]` ให้ AI ดึงโครงสร้างจิตวิทยา 4 หมัดทองคำที่สร้างยอดขายจริง 70.96 ล้านบาทมาใช้งานทันที:

```
[0.0s - 3.5s]  S01: SENSORY HOOK      ➔ เจาะลึกอาการเจ็บจริง (Physical Pain / Empathy) ห้ามโชว์สินค้าเด็ดขาด!
      │
[3.5s - 7.5s]  S02: ASMR CAP TWIST    ➔ ปลดล็อกความเชื่อผิด (Myth-Busting) + เสียงเปิดฝา ASMR บนขวดแก้วสีชา
      │
[7.5s - 11.5s] S03: NAKED PILL PROOF  ➔ โชว์เม็ดซอฟต์เจล/แคปซูลบนจานแก้ว + ไฮไลต์เปเปอร์ PubMed คลายกังวล
      │
[11.5s - 15s]  S04: DUO PACK SETTLE   ➔ วาง 2 ขวดคู่ ชี้ตะกร้าซ้ายล่าง ดัน AOV พุ่ง 1,600+ บาท
```

### จิตวิทยาเบื้องหลังแต่ละหมัด:
1. **Sensory Hook (0–3.5s):** ใช้คำพูดที่ทำให้เกิดภาพสัมผัสทางกายภาพ เช่น *"หัวถึงหมอนแล้วในหัวยังคิดงานวนไม่หยุด"*, *"ออกแดดแป๊บเดียว ผิวก็แสบไหม้แดงไปหมด"*
2. **Belief Twist (3.5–7.5s):** ทุบความเชื่อเดิมทิ้ง เช่น *"อย่าเพิ่งรีบกินยานอนหลับให้ตื่นมามึนหัว ร่างกายแค่ขาดตัวตัดสวิตช์สมอง"*
3. **Clinical Proof (7.5–11.5s):** อ้างอิงสารสกัดมาตรฐานสากล เช่น *"Magnesium Glycinate ฟอร์มคีเลตดูดซึมตรง"* พร้อมโชว์เปเปอร์ PubMed ที่มีปากกาไฮไลต์สีทองขีดทับ
4. **Duo Pack CTA (11.5–15s):** ปักตะกร้าคู่ 2 ขวดเสมอ ห้ามขายขวดเดี่ยว เพราะสถิติชี้ชัดว่าการวางขวดคู่ดันค่าเฉลี่ยตะกร้าพุ่ง 2 เท่า

---

<a id="design-motion"></a>
## 4. 🎨 Design System & Motion Physics (Anti-Cartoon Rules)

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
## 5. 🛠️ คู่มือรันคำสั่ง Render & Workflows

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
เมื่อปรับแต่งสกิลนี้ ต้องปฏิบัติตามกฎเหล็กของ Workspace:
1. ตรวจสอบ YAML ด้วย: `python tools/audit_skills_yaml.py`
2. กระจายสกิลข้าม Spiderweb Mesh ด้วย: `node tools/spiderweb-sendall.js vve`
