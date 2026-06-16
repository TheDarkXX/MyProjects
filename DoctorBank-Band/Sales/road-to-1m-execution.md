# 🚀 Road to 1M — Execution Plan

> DR.BANK Magnesium Night Plus | Solopreneur × AI Multi-Agent
> สร้าง: 16 มิ.ย. 2569

---

## 📌 Quick Reference

- **แผนกลยุทธ์หลัก:** [1M-battle-plan.md](file:///c:/My%20Claw/MyProjects/DoctorBank-Band/Sales/1M-battle-plan.md)
- **Brand Memory:** [brand-memory.md](file:///c:/My%20Claw/MyProjects/DoctorBank-Band/Brand/brand-memory.md)
- **Product Memory:** [PRODUCT_MEMORY.md](file:///c:/My%20Claw/MyProjects/DoctorBank-Band/Products/Magnesium-Night-Plus/PRODUCT_MEMORY.md)

---

## 🔍 TikTok API Research — สรุปผล

### สถานะ TikTok Content Posting API (2026)

| หัวข้อ | สถานะ | รายละเอียด |
|--------|-------|-----------|
| **มี API โพสต์วิดีโอไหม** | ✅ มี | `/v2/post/publish/video/init/` — official TikTok Content Posting API |
| **ตั้งเวลาโพสต์ได้ไหม** | ❌ ไม่ได้ | API ไม่รองรับ scheduling โดยตรง ต้อง build middleware เอง |
| **ต้อง App Review ไหม** | ✅ ต้อง | ต้องผ่าน TikTok audit ก่อน ไม่งั้นโพสต์ได้แค่ SELF_ONLY (private) |
| **ทางเลือกตั้งเวลา** | ✅ มี | TikTok Studio (free, ตั้งเวลาล่วงหน้าได้ 10 วัน) |

### แนวทางที่แนะนำ

```
ตัวเลือก 1 (แนะนำ ✅):  ใช้ TikTok Studio ตั้งเวลา (ฟรี, ไม่ต้อง dev)
                         → ตั้งเวลาล่วงหน้าได้ 10 วัน ทั้ง 3 ช่อง
                         → พอดีกับ workflow "เตรียมวันศุกร์ ลงอัตโนมัติ ส.-อา."

ตัวเลือก 2 (ถ้าอยาก custom): Build middleware บน VPS (เหมือน Viral Planner)
                              → ต้องสมัคร TikTok Developer App + ผ่าน audit
                              → ใช้เวลา setup 2-4 สัปดาห์
                              → คุ้มเมื่อ scale ถึง 50+ คลิป/เดือน

ตัวเลือก 3 (สะดวก):     ใช้ third-party scheduler (Metricool, Buffer, Socialync)
                         → ค่าบริการ ~500-2,000 บาท/เดือน
                         → รองรับ cross-platform (TT+FB+IG+YT)
```

> 💡 **สรุป:** เริ่มด้วย **TikTok Studio** ก่อน (ฟรี + ง่าย) → ถ้าต้องการ automation เต็มรูปแบบค่อย build แบบ Viral Planner ภายหลัง

---

## 📦 Phase 0 Deliverables

### Deliverable 1: 🎣 Hook Bank v1 — 30 Hooks แบ่ง 3 ช่อง

#### 🧑 ช่อง "พี่แบงค์" — CEO / Lifestyle / ครอบครัว (10 Hooks)

| # | Hook (3 วินาทีแรก) | Pillar | Format |
|---|-------------------|--------|--------|
| 1 | "ผมลาออกจากโรงพยาบาล มาทำแบรนด์อาหารเสริม... นี่คือเรื่องจริง" | CEO | 🟢 Talking Head |
| 2 | "วันนี้ pack 50 ออเดอร์ ผมทำคนเดียว ดูสิว่าใช้เวลาเท่าไร" | CEO | 🟢 Day-in-life |
| 3 | "สิ่งที่ไม่มีใครบอก ก่อนสร้างแบรนด์อาหารเสริม" | CEO | 🟢 Talking Head |
| 4 | "ส่งลูกเสร็จ 8 โมงครึ่ง กลับมาทำงาน... นี่คือชีวิตจริงของผม" | ครอบครัว | 🟢 Day-in-life |
| 5 | "ผมกินสิ่งนี้ทุกคืน มา 6 เดือน สิ่งที่เปลี่ยนไปคือ..." | Edu+tie-in | 🟢 Talking Head |
| 6 | "ทำแบรนด์คนเดียว โดยไม่มีทีม เป็นไปได้ไหม?" | CEO | 🟢 Talking Head |
| 7 | "Morning routine ของคนสร้างแบรนด์ที่ทำงานอยู่บ้าน" | Lifestyle | 🟢 Day-in-life |
| 8 | "ต้นทุนจริงๆ ของการทำแบรนด์อาหารเสริม 1 ตัว" | CEO | 🟡 Green Screen |
| 9 | "ลูกถามว่า พ่อทำอะไร... ผมตอบว่า..." | ครอบครัว | 🟢 Talking Head |
| 10 | "เดือนแรก ขายได้ ___ ออเดอร์ ผมรู้สึก..." | CEO | 🟢 Talking Head |

#### 🏢 ช่อง "DR.BANK Official" — Brand / Product / ขาย (10 Hooks)

| # | Hook | Pillar | Format |
|---|------|--------|--------|
| 1 | "สูตรนี้ไม่มีเมลาโทนิน แล้วมันช่วยนอนหลับได้ยังไง?" | Product | 🟡 Green Screen |
| 2 | "ลูกค้า DM มาบอกว่า กินวันที่ 3 เริ่มรู้สึกต่าง..." | Social Proof | 🟢 Talking Head |
| 3 | "ถ้าคุณเลือกแมกนีเซียมผิดรูปแบบ กินไปก็เท่านั้น" | Edu→Product | 🟡 Green Screen |
| 4 | "Unboxing DR.BANK Magnesium Night Plus ดูว่ามีอะไรข้างใน" | Product | 🟢 ASMR |
| 5 | "AlphaWave® L-theanine 200 mg ทำอะไรกับสมองคุณ" | Product | 🟡 Green Screen |
| 6 | "3 แถม 1 ราคานี้ มีแค่ช่วงนี้... ตกขวดละ 642 บาท" | Promo | 🟢 Talking Head |
| 7 | "วิธีกิน Magnesium Night Plus ให้ได้ผลดีที่สุด" | How-to | 🟢 Talking Head |
| 8 | "ลองกินแค่ 7 วัน ถ้าไม่ต่าง บอกเรา" | Challenge | 🟢 Talking Head |
| 9 | "ทำไมสูตรนี้ถึงใช้ Magnesium 4 รูปแบบ ไม่ใช่แค่ 1" | Product | 🟡 Green Screen |
| 10 | "PharmaGABA® กับ GABA ทั่วไป ต่างกันยังไง" | Product | 🟡 Green Screen |

#### 👩 ช่อง "น้องมินนี่ Health Hack" — AI Edu + ตะกร้า (10 Hooks)

| # | Hook | Pillar | Format |
|---|------|--------|--------|
| 1 | "คนไทย 70% ขาดแมกนีเซียม แต่ไม่รู้ตัว" | Edu | 🤖 AI Clip |
| 2 | "ถ้าคุณนอนไม่หลับ อย่าเพิ่งกินเมลาโทนิน..." | Edu | 🤖 AI Clip |
| 3 | "L-theanine คืออะไร ทำไมถึงช่วยเรื่องการนอน" | Edu | 🤖 AI Clip |
| 4 | "5 สัญญาณว่าร่างกายคุณกำลังขาดแมกนีเซียม" | Edu | 🤖 AI Clip |
| 5 | "เมลาโทนิน อันตรายจริงไหม? สิ่งที่คุณต้องรู้" | Edu | 🤖 AI Clip |
| 6 | "นอนไม่หลับ ลองทำ 3 อย่างนี้ก่อนนอน" | Edu | 🤖 AI Clip |
| 7 | "GABA คืออะไร ทำไมถึงช่วยให้สงบก่อนนอน" | Edu | 🤖 AI Clip |
| 8 | "สิ่งที่คนส่วนใหญ่เข้าใจผิดเรื่องการนอนหลับ" | Edu | 🤖 AI Clip |
| 9 | "กินแมกนีเซียมตอนไหนดีที่สุด? เช้าหรือเย็น" | Edu | 🤖 AI Clip |
| 10 | "ทำไมนอนหลับแล้วยังตื่นมาเหนื่อย" | Edu | 🤖 AI Clip |

---

### Deliverable 2: 📝 Script Templates

#### Template A: Talking Head 🟢 (30-60 วินาที) — ใช้บ่อยสุด

```
[HOOK — 3 วินาที]
(เปิดด้วย Hook จาก Hook Bank → พูดตรงกล้อง)

[BODY — 20-40 วินาที]
(เนื้อหาหลัก 2-3 ประเด็น → ใช้ภาษาง่าย สั้น กระชับ)
• ประเด็น 1: ___
• ประเด็น 2: ___
• ประเด็น 3: ___ (optional)

[CTA — 5-10 วินาที]
• ช่องพี่แบงค์: "ไปดูที่ @drbankofficial ครับ" (soft)
• ช่อง DR.BANK: "กดตะกร้าเลยครับ" (hard sell)
• ช่องน้องมินนี่: "สนใจดูลิงก์ในตะกร้าได้เลย" (medium)
```

#### Template B: Green Screen 🟡 (45-90 วินาที)

```
[HOOK — 3 วินาที]
(Hook จาก Hook Bank → พูดตรงกล้อง)

[ภาพ Background]
(ใช้ Green Screen → แสดงภาพ/กราฟิก/ข้อมูลประกอบ)
• Slide 1: Pain point / สถิติ
• Slide 2: สาเหตุ / ข้อมูล
• Slide 3: Solution / สินค้า (ถ้าเป็นช่อง DR.BANK)

[CTA — 5 วินาที]
(ตาม channel)
```

#### Template C: AI Clip 🤖 (30-60 วินาที) — สำหรับน้องมินนี่

```
[HOOK — 3 วินาที]
(Text on screen + AI voiceover)

[BODY — 20-40 วินาที]
(AI visuals + motion graphics + ข้อมูลสุขภาพ)
• Fact 1: ___ (พร้อม visual)
• Fact 2: ___ (พร้อม visual)
• Fact 3: ___ (พร้อม visual)

[SOFT CTA — 5 วินาที]
"ถ้าสนใจสินค้าที่เกี่ยวข้อง ดูในตะกร้าได้เลย"
(แปะตะกร้า DR.BANK Magnesium Night Plus)
```

---

### Deliverable 3: 🛒 Product Listing Pack (3 SKU × 4 แพลตฟอร์ม)

#### SKU A: 1 กระปุก (890 บาท)

**TikTok Shop:**
```
ชื่อ: DR.BANK Magnesium Night Plus แมกนีเซียม สูตรนอนหลับ 30 แคปซูล
คำอธิบาย:
🌙 สูตร Non-Melatonin — ไม่ใช่ยานอนหลับ
✅ Magnesium Complex 4 รูปแบบ (Bisglycinate + Amino Acid + Citrate + Malate)
✅ AlphaWave® L-theanine 200 mg — สร้างคลื่นสมอง Alpha
✅ PharmaGABA® 125 mg — ช่วยผ่อนคลายก่อนนอน
✅ Zinc (NovoMin®) + Vitamin B6

💊 กินง่าย 2 เม็ดก่อนนอน
📦 ได้ อย. | ผลิตโรงงาน GMP มาตรฐาน

#แมกนีเซียม #นอนหลับ #อาหารเสริม #DrBank #MagnesiumNightPlus #NonMelatonin
```

**Shopee:**
```
ชื่อ: [ส่งฟรี] DR.BANK Magnesium Night Plus แมกนีเซียม นอนหลับ L-theanine GABA 30 แคปซูล
คำอธิบาย:
🔥 ใช้คูปองลด 100 บาท!

DR.BANK Magnesium Night Plus — สูตรเฉพาะกลางคืน Non-Melatonin

สิ่งที่คุณจะได้:
🌙 ช่วยผ่อนคลายก่อนนอน
🌙 สนับสนุนคุณภาพการนอนหลับ
🌙 ตื่นมาสดชื่นพร้อมเริ่มวันใหม่

ส่วนประกอบสำคัญ:
• Magnesium Complex 4 Forms (630 mg compound)
• AlphaWave® L-theanine 200 mg
• PharmaGABA® 125 mg
• NovoMin® Zinc + Vitamin B6

📌 วิธีกิน: กิน 2 แคปซูล ก่อนนอน 30 นาที
📌 ได้ อย. | ผลิตโรงงาน GMP มาตรฐาน
📌 ของแท้ 100% จาก DR.BANK Official Store

Keywords: แมกนีเซียม, นอนหลับ, อาหารเสริมนอนหลับ, magnesium, l-theanine, gaba, non melatonin, ช่วยนอน, หลับง่าย, ผ่อนคลาย
```

**Lazada:**
```
ชื่อ: DR.BANK Magnesium Night Plus แมกนีเซียม อาหารเสริมนอนหลับ L-theanine GABA Non-Melatonin 30 แคปซูล
(คำอธิบาย: เหมือน Shopee — ปรับ keyword เล็กน้อย เพิ่ม "ลาซาด้า" "ส่งไว")
```

**Facebook:**
```
ชื่อ: DR.BANK Magnesium Night Plus
คำอธิบาย (สำหรับ Shop/Link post):
สูตรเฉพาะกลางคืน ไม่มีเมลาโทนิน 🌙
Magnesium 4 Forms + L-theanine 200 mg + GABA 125 mg
ช่วยผ่อนคลาย สนับสนุนการนอนหลับที่ดี
สั่งได้ที่ TikTok Shop / Shopee
```

> 💡 **SKU B (เซตคู่) และ SKU C (3 แถม 1):** ใช้โครงสร้างเดียวกัน ปรับจำนวนและราคา
> จุดเน้น SKU C: "4 กระปุก ตก 642.5 บาท/ขวด คุ้มที่สุด!"

---

### Deliverable 4: ✉️ Affiliate Kit

#### DM Template — Cold Outreach

```
สวัสดีค่ะ/ครับ 🙏

ผม/ทีม DR.BANK สนใจชวนคุณ [ชื่อ] มาเป็น Affiliate ของ DR.BANK Magnesium Night Plus ครับ

เราเป็นแบรนด์อาหารเสริมสูตรกลางคืน Premium ที่ได้ อย. แล้ว
สารสกัดระดับ branded ทุกตัว (AlphaWave® L-theanine, PharmaGABA®, Magnesium 4 forms)

🎁 สิ่งที่คุณจะได้:
• สินค้าฟรี 1 กระปุก (มูลค่า 890 บาท) ลองใช้จริง
• Commission 15% (ตกออเดอร์ละ 134-401 บาท!)
• Script template + Key Selling Points พร้อมใช้
• ไม่มี KPI บังคับ ลงเมื่อพร้อม

สนใจไหมครับ? ถ้าสนใจ ส่งที่อยู่มาเลย เราจัดส่งให้ฟรีครับ 🚚
```

#### DM Template — Warm (คนที่เคย interact)

```
สวัสดีครับ [ชื่อ] 🙏

เห็นคอนเทนต์ของคุณเรื่อง [หัวข้อ] แล้วชอบมากครับ ตรงกับแนวทางของ DR.BANK เลย

ผมอยากชวนมาลองรีวิว Magnesium Night Plus ครับ — ส่งให้ฟรี + Commission 15% ต่อออเดอร์

สนใจคุยรายละเอียดไหมครับ? 😊
```

#### DM Template — Follow-up (ส่งของแล้ว ยังไม่ลงคลิป)

```
สวัสดีครับ [ชื่อ] 🙏

ลองใช้ Magnesium Night Plus แล้วรู้สึกยังไงบ้างครับ?

ถ้าสนใจจะรีวิว ผมเตรียม:
📝 Script template พร้อมใช้ (แก้ wording ได้ตามสไตล์)
🎣 Hook ที่เทสต์แล้วว่าดี 3 แบบ
📋 Key Selling Points สรุปให้แล้ว

ส่งให้ได้เลยครับ ถ้าสะดวก 😊
```

#### Affiliate Script Template (ให้ affiliate ใช้)

```
[Hook — เลือก 1]
A: "ตัวนี้ไม่ใช่ยานอนหลับ แต่ช่วยเรื่องนอนได้จริง"
B: "ลองกินมา 7 วัน นี่คือสิ่งที่เปลี่ยน"
C: "ถ้าคุณคิดเยอะก่อนนอน ลองดูตัวนี้"

[Body — จุดเน้น 3 ข้อ]
1. สูตร Non-Melatonin — ไม่ใช่ยา ไม่ติด ไม่ง่วงเช้า
2. มี L-theanine 200 mg (AlphaWave®) + GABA (PharmaGABA®)
3. Magnesium 4 รูปแบบ — ดูดซึมดีกว่า Mg ทั่วไป

[CTA]
"สนใจกดตะกร้าเลย ราคาพิเศษอยู่ตอนนี้"
```

#### Key Selling Points Sheet

```
📋 DR.BANK Magnesium Night Plus — จุดขายสำคัญ

1️⃣ Non-Melatonin = จุดขายหลัก
   "ไม่มีเมลาโทนิน ไม่ใช่ยานอนหลับ ไม่ติด ไม่ง่วงเช้า"

2️⃣ AlphaWave® L-theanine 200 mg = Hero Ingredient
   "สร้างคลื่นสมอง Alpha → ผ่อนคลายแบบไม่ง่วง"

3️⃣ PharmaGABA® 125 mg = Certified GABA
   "GABA ระดับ certified ไม่ใช่ GABA ทั่วไป"

4️⃣ Magnesium 4 Forms = Premium Formula
   "ใช้ 4 รูปแบบ ไม่ใช่แค่ Oxide ราคาถูก"

5️⃣ ราคา 3 แถม 1 = คุ้มสุด
   "4 กระปุก ตกขวดละ 642.5 บาท กิน 4 เดือน"

❌ ห้ามพูด: รักษา / หาย / การันตี 100% / ยานอนหลับ
✅ พูดได้: ช่วยผ่อนคลาย / สนับสนุนการนอน / night routine
```

---

### Deliverable 5: 📅 Content Calendar — สัปดาห์ที่ 1-4

#### สัปดาห์ที่ 1: LAUNCH

| วัน | 🧑 พี่แบงค์ | 🏢 DR.BANK | 👩 น้องมินนี่ (AI) |
|-----|-----------|-----------|------------------|
| จ. | 🏢 "วันนี้เปิดขายวันแรก!" | 💊 Unboxing + สารสกัด | 🧠 "คนไทย 70% ขาด Mg" |
| อ. | — | 💊 วิธีกิน + ก่อนนอน | 🧠 "L-theanine คืออะไร" |
| พ. | 🌿 "Morning routine CEO" | 🔴 LIVE ขาย 20:00 | — |
| พฤ. | 👨‍👩‍👧 "ส่งลูก→กลับมาทำงาน" | 📖 "ทำไมถึงเลือกสูตรนี้" | 🧠 "5 สัญญาณขาด Mg" |
| ศ. | 🧠 "ผมกิน Mg ทุกคืน" | 🔥 Trend + สินค้า | 🧠 "เมลาโทนิน อันตรายไหม" |

#### สัปดาห์ที่ 2: BUILD MOMENTUM

| วัน | 🧑 พี่แบงค์ | 🏢 DR.BANK | 👩 น้องมินนี่ (AI) |
|-----|-----------|-----------|------------------|
| จ. | 🏢 "ออเดอร์วันแรก สรุปยอด" | 💊 "AlphaWave® ทำงานยังไง" | 🧠 "นอนไม่หลับ ลอง 3 อย่าง" |
| อ. | — | 💊 "Non-melatonin ต่างยังไง" | 🧠 "GABA คืออะไร" |
| พ. | 🌿 "Home office setup" | 🔴 LIVE ขาย 20:00 | — |
| พฤ. | 👨‍👩‍👧 "สอนลูกเรื่องสุขภาพ" | 📖 รีวิวจากลูกค้าจริง | 🧠 "นอนหลับ ทำไมสำคัญ" |
| ศ. | 🧠 "สิ่งที่เปลี่ยนการนอนผม" | 🔥 Trend ride | 🧠 "กิน Mg ตอนไหนดี" |

#### สัปดาห์ที่ 3: AFFILIATE PUSH

| วัน | 🧑 พี่แบงค์ | 🏢 DR.BANK | 👩 น้องมินนี่ (AI) |
|-----|-----------|-----------|------------------|
| จ. | 🏢 "สัปดาห์ที่ 3 สรุปยอด" | 💊 "PharmaGABA® vs GABA ทั่วไป" | 🧠 "Magnesium กี่รูปแบบ" |
| อ. | — | 💊 "เซตไหนคุ้มสุด" | 🧠 "ตื่นมาเหนื่อย ทำไม" |
| พ. | 🌿 "อาหารที่ผมกินทุกวัน" | 🔴 LIVE ขาย 20:00 | — |
| พฤ. | 👨‍👩‍👧 "ชีวิต solopreneur+พ่อ" | 📖 Affiliate รีวิว (repost) | 🧠 "Blue light กับการนอน" |
| ศ. | 🧠 "แมกนีเซียม ทำไมสำคัญ" | 🔥 Trend + tie-in | 🧠 "Caffeine กับ Mg ขัดกันไหม" |

#### สัปดาห์ที่ 4: CLOSE THE MONTH

| วัน | 🧑 พี่แบงค์ | 🏢 DR.BANK | 👩 น้องมินนี่ (AI) |
|-----|-----------|-----------|------------------|
| จ. | 🏢 "เดือนแรก เรียนรู้อะไรบ้าง" | 💊 "3 แถม 1 Flash Deal!" | 🧠 "Stress กับ Mg" |
| อ. | — | 💊 "ลูกค้า DM มาบอกว่า..." | 🧠 "เทคนิคหายใจก่อนนอน" |
| พ. | 🌿 "Night routine ของผม" | 🔴 LIVE ขาย 20:00 | — |
| พฤ. | 👨‍👩‍👧 "ครอบครัวคือแรงบันดาลใจ" | 📖 UGC compilation | 🧠 "นอน 6 ชม. พอไหม" |
| ศ. | 🧠 "1 เดือน ยอดขาย ___ บาท!" | 🔥 End-of-month promo | 🧠 "วิตามิน B6 กับการนอน" |

---

### Deliverable 6: 🔴 LIVE Script v1 — DR.BANK Official

```
═══════════════════════════════════════════════════
  DR.BANK LIVE SCRIPT — 2 ชั่วโมง
  ช่อง: DR.BANK Official | ทุกวันพุธ 20:00
═══════════════════════════════════════════════════

[00:00 - 00:15] 🎬 OPENING
"สวัสดีครับทุกคน! ยินดีต้อนรับเข้าสู่ DR.BANK Official
วันนี้มีโปรพิเศษเฉพาะ LIVE นี้! ใครมาก่อน ทัก 🌙 ไว้ก่อนเลย"

[00:15 - 00:30] 📢 แนะนำสินค้า
"วันนี้เราจะพูดถึง Magnesium Night Plus สูตรเฉพาะกลางคืน
• ไม่มีเมลาโทนิน
• Magnesium 4 รูปแบบ
• AlphaWave® L-theanine 200 mg
• PharmaGABA® 125 mg

ใครนอนไม่หลับ คิดเยอะก่อนนอน ตัวนี้เหมาะมาก"

[00:30 - 01:00] 💬 Q&A + ตอบคำถาม
"มีคำถามอะไร ทักมาเลยครับ ผมตอบทุกคน"
(ตอบ FAQ: ไม่ใช่ยา / กินตอนไหน / ใครกินได้ / non-melatonin)

[01:00 - 01:15] 🔥 FLASH DEAL — Countdown
"ตอนนี้! โปร LIVE ONLY ⚡
🔥 เซตคู่ ปกติ 1,590 → LIVE วันนี้ 1,390! ประหยัด 200!
🔥 3 แถม 1 ปกติ 2,670 → LIVE วันนี้ 2,490! ได้ 4 กระปุก!

เหลือแค่ XX เซต... กดตะกร้าเลยครับ!"
(นับ countdown 3... 2... 1... เปิดตะกร้า)

[01:15 - 01:45] 📖 รีวิว + Social Proof
"มาดูรีวิวจากลูกค้าจริง..."
(อ่าน DM / comment / screenshot)
"ใครกินแล้วรู้สึกต่าง ทักมาบอกผมด้วยนะ"

[01:45 - 02:00] 🎁 CLOSING + ของแถม
"ใครสั่ง 3 แถม 1 วันนี้ แถม ___ ฟรีอีก!
ขอบคุณทุกคนที่เข้ามา ไว้เจอกันพุธหน้า 20:00 ครับ!"

═══════════════════════════════════════════════════
```

---

### Deliverable 7: 🛡️ Compliance Checklist

#### ✅ Safe Words (ใช้ได้)

```
ช่วยผ่อนคลาย | สนับสนุนการนอนหลับ | night routine
ช่วยให้พร้อมพักผ่อน | ช่วยให้เข้าสู่โหมดพักผ่อน
ช่วยให้หลับง่ายขึ้น | ดูแลคุณภาพการนอน
ทางเลือกสำหรับคนที่อยากพักผ่อนดีขึ้น
ผมก็กินเอง | สูตรที่ผมเลือก (founder angle)
```

#### ❌ Banned Words (ห้ามใช้เด็ดขาด)

```
รักษา | หาย | หายขาด | บำบัด | ป้องกันโรค
ยานอนหลับ | ยา | ทดแทนยา
การันตี 100% | ใช้แล้วหลับแน่นอน
ในฐานะแพทย์ | หมอแนะนำ | แพทย์รับรอง
โรคนอนไม่หลับ | โรคเครียด | โรคซึมเศร้า | insomnia
เพิ่ม testosterone | รักษาสมอง
```

#### 🟡 ระวัง (ใช้ได้แต่ต้องระวัง context)

```
"หมอแบงค์" → ใช้ "พี่แบงค์" แทน (ในบริบทขาย)
"แพทย์" → ใช้ "เจ้าของแบรนด์" หรือ "Founder" แทน
"clinical study" → ใช้ "มีงานวิจัยสนับสนุน" (ไม่อ้างเจาะจง)
```

---

### Deliverable 8: 🎨 CapCut Template Guide

#### Template 1: Quick Talking Head (ใช้บ่อยสุด)

```
Layout:
├── Full-screen selfie camera
├── Auto-subtitle (CapCut auto caption) ← ประหยัดเวลาใส่ sub มาก
├── End card: โลโก้ DR.BANK + CTA text
└── Music: Lo-fi / calm beat (volume 10-15%)

เวลาตัดต่อ: 5-10 นาที
```

#### Template 2: Product Showcase

```
Layout:
├── Opening: Unboxing shot (3 วิ)
├── Close-up: ขวด + ฝา + เม็ดยา
├── Text overlay: สารสกัดสำคัญ 3 ตัว
├── Split screen: สินค้า + พูด (optional)
└── End card: ราคา + CTA

เวลาตัดต่อ: 15-20 นาที
```

#### Template 3: Green Screen Edu

```
Layout:
├── Green screen (CapCut background removal)
├── Background: กราฟิก/ภาพประกอบ
├── Text overlay: ข้อมูลสำคัญ
├── Auto-subtitle
└── End card

เวลาตัดต่อ: 15-25 นาที
```

#### 💡 CapCut Tips ประหยัดเวลา

```
1. ใช้ Auto Caption → ตรวจทาน → แก้คำผิด (เร็วกว่าพิมพ์เอง 5 เท่า)
2. Save template ที่ใช้บ่อย → Apply template → เปลี่ยนแค่ footage
3. ถ่าย 1 take ยาว → ตัดส่วนที่ไม่ดีออก (ไม่ต้อง retake)
4. ใช้ B-roll น้อย → เน้น talking head + text overlay
5. Batch export: ตัด 3-5 คลิปต่อเนื่อง ส่งออกทีเดียว
```

---

### Deliverable 9: 👩 น้องมินนี่ AI Clip Scripts (10 Scripts)

#### Script 1: "คนไทย 70% ขาดแมกนีเซียม"

```
[Hook] "คนไทย 70% ขาดแมกนีเซียม แต่ไม่รู้ตัว"

[Body]
แมกนีเซียมเป็นแร่ธาตุที่ร่างกายต้องใช้กว่า 300 ปฏิกิริยา
แต่อาหารที่คนไทยกินทุกวัน ได้แมกนีเซียมไม่เพียงพอ

สัญญาณที่บอกว่าคุณอาจขาด:
• ตะคริวบ่อย
• นอนไม่หลับ หรือหลับไม่สนิท
• เครียดง่าย กังวลง่าย
• อ่อนเพลียเรื้อรัง

[CTA]
ถ้าสนใจเสริมแมกนีเซียม ดูในตะกร้าได้เลย
```

#### Script 2-10: (หัวข้อตาม Hook Bank น้องมินนี่ ข้อ 2-10)

> โครงสร้างเหมือน Script 1: Hook → Body (3-4 facts) → Soft CTA แปะตะกร้า
> AG จะเขียนแต่ละ script ให้เมื่อถึงเวลาใช้

---

## 📋 สรุปสถานะ Deliverables

| # | Deliverable | สถานะ |
|---|------------|-------|
| 1 | Hook Bank v1 (30 Hooks × 3 ช่อง) | ✅ พร้อม |
| 2 | Script Templates (3 แบบ) | ✅ พร้อม |
| 3 | Product Listing Pack (SKU A ครบ 4 แพลตฟอร์ม) | ✅ พร้อม (SKU B,C ใช้โครงสร้างเดียวกัน) |
| 4 | Affiliate Kit (DM + Script + Selling Points) | ✅ พร้อม |
| 5 | Content Calendar W1-W4 | ✅ พร้อม |
| 6 | LIVE Script v1 | ✅ พร้อม |
| 7 | Compliance Checklist | ✅ พร้อม |
| 8 | CapCut Template Guide | ✅ พร้อม |
| 9 | น้องมินนี่ AI Scripts (Script 1 ครบ) | ✅ พร้อม (2-10 จะเขียนเมื่อถึงเวลา) |

---

## 🕒 Changelog

- **2026-06-16:** สร้าง execution plan + Phase 0 deliverables ทั้ง 9 ข้อ + TikTok API research
