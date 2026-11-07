# 📋 B-Roll Production Table (DoctorBank Gold Standard Template)

> **🎯 Single Source of Truth:** แม่แบบตาราง B-Roll มาตรฐานแท้ของ DoctorBank & The Viral
> **Format:** TSV Code Block แถวเดียวจบสำหรับคัดลอกลง Google Sheets / Excel / FlowKit โดยตรง (ไม่ใช้ Visual Table ซ้ำซ้อน)
> **Formula:** `<CAMPAIGN>-S<NN> (<BEAT>)` (เช่น `MAG10-S01 (H1)`) พร้อมหัว Prompt `[CAMPAIGN-Sxx]` คลุมหน้าทุกคำสั่ง

---

## 📐 Column Specification (6 คอลัมน์ตามสูตรเป๊ะ)

| คอลัมน์ | ตัวอย่างค่า | บทบาท & หน้าที่ในสายพาน |
|---|---|---|
| **`ID`** | `MAG10-S01 (H1)` | **สูตรมาตรฐาน:** `<CAMPAIGN_CODE>-S<เลขซีน 2 หลัก> (<BEAT>)`<br>(H=Hook, D=Danger/Pain, M=Mechanism, T=Treatment, G=GABA/Active, O=Outro) |
| **`Ref`** | `Person` \| `Product` \| `-` | **ตัวชี้เป้า Asset:**<br>• `Product` = แนบภาพขวด/แคปซูลจริง ([`REF_BOTTLE`](file:///C:/My%20Claw/The%20Viral/Ads%20DRB/03_Production_Assets/3Ref_Master_Pack/DRB_MAG_REF01_front_hero.png)) กันขวดเบี้ยว<br>• `Person` = แนบภาพหน้าคน/สเกลร่างกาย ([`INFLU_01_identity.jpg`](file:///C:/My%20Claw/The%20Viral/Ads%20DRB/Campaigns/Magnesium/DRB_MAG_10_EXPLAINER_UGC/refs/INFLU_01_identity.jpg)) กันหน้าเปลี่ยน<br>• `-` = เจนสดจาก Prompt เพียวๆ (3D CGI วิทยาศาสตร์/อวัยวะ/บรรยากาศ) |
| **`Subtitle`** | บทพากย์ภาษาไทย | คำพูดในไทม์ไลน์ ให้รู้ว่า B-roll ช็อตนี้ต้องวางทับเสียงพากย์ประโยคไหนใน CapCut |
| **`Visual Action (TH)`** | สรุปภาพ 1 บรรทัด | ให้คนตรวจงานกวาดสายตา 1 วินาทีเข้าใจภาพรวม โดยไม่ต้องนั่งอ่าน Prompt อังกฤษยาวๆ |
| **`Image Prompt`** | ภาษาอังกฤษ 9:16 | สั่ง Midjourney / Nano Banana Pro / Imagen 3 เจนภาพนิ่ง Anchor Frame (ขึ้นต้นด้วย `[CAMPAIGN-Sxx]`) |
| **`Motion Prompt`** | กริยาการเคลื่อนไหว | สั่งโมชันกล้อง I2V ใน Veo 3.1 / Kling / Luma (ขึ้นต้นด้วย `[CAMPAIGN-Sxx]`) |

---

## 📑 TSV Format (Excel / Google Sheets / FlowKit)

```tsv
ID	Ref	Subtitle	Visual Action (TH)	Image Prompt	Motion Prompt
MAG10-S01 (H1)	Person	เคยเป็นมั้ย ร่างกายเพลียมาก แต่พอหัวถึงหมอน สมองกลับคิดไม่หยุด	หญิงสาวนอนกุมขมับกลางดึก พลิกตัวไปมา นอนไม่หลับ แสงไฟสลัวข้างเตียง	[MAG10-S01] Cinematic 9:16 intimate bedroom close-up of a graceful 40-year-old Thai woman lying in bed at night, head on soft white pillow, eyes tightly closed with subtle tense furrowed brows showing restless sleep, warm dim bedside lamp creating dramatic soft shadows across cheekbones, photorealistic skin texture, modern aesthetic bedroom, zero visual effects --ar 9:16 --no anime, speed lines, glowing orbs, particles, text, watermark	[MAG10-S01] Intimate handheld camera motion. In the first 1-2 seconds, she turns head restlessly on pillow with a gentle uncomfortable sigh, subtle tension in jaw and furrowed brow, authentic emotional human acting, natural bedroom lighting, zero light bursts
MAG10-S02 (D1)	-	คิดเรื่องงานวนไปวนมา บางทีสะดุ้งตื่นกลางดึก แล้วก็นอนไม่หลับ	3D CGI เซลล์ประสาทในสมองส่งสัญญาณกระแสไฟฟ้าสีส้มแดงและฟ้ากระพริบรัวๆ โอเวอร์ฮีต	[MAG10-S02] Cinematic 9:16 3D medical visualization of human brain neural pathways, dormant in deep midnight blue space, chaotic fiery orange and electric blue synaptic sparks firing rapidly, high contrast, clean scientific bioluminescence, photorealistic medical render --ar 9:16 --no comic strip, multi-panel, split screen, text, watermark, skull, gore	[MAG10-S02] Immediately within 1.5 seconds, a rapid speed-ramped orbital reveal as intense chaotic electric signals fire through neural synapses, capturing mental restlessness with focused scientific clarity, clean medical visualization, no cartoon anime effects
MAG10-S03 (M1)	-	มีแมกนีเซียม 4 ฟอร์ม ช่วยคลายกล้ามเนื้อ ให้ร่างกายได้ผ่อนคลายเต็มที่	3D CGI ผลึกแร่ 4 รูปทรงหลอมรวมเป็นแคปซูลคริสตัลใสประกาย aquamarine	[MAG10-S03] [Zone B S.E.P.] Vertical 9:16. Sculptural magnesium mineral forms floating in high-key soft lavender studio space: a crisp white mineral cube, clear diamond octahedron prism, translucent rose gel sphere, and satin champagne dodecahedron, concentric water ripples on pristine white floor --ar 9:16 --no floating pearls, beads, humans, text	[MAG10-S03] Smooth orbital drift as the 4 sculptural mineral forms glide inward along a ribbon of aquamarine light, seamlessly fusing into a single translucent capsule infused with gentle internal luminescence by second 4, holding steady and calm
MAG10-S04 (M2)	Product	คืนนี้ลอง แมกนีเซียม ไนท์ พลัส จากดอกเตอร์แบงค์	ขวดด็อกเตอร์แบงค์สีชาเข้มวางหรูบนโต๊ะข้างเตียงยามเช้า มีแสงแดดอุ่นส่องกระทบ	[MAG10-S04] Luxury commercial product photography of dark amber glass DoctorBank bottle sitting upright on a minimalist wooden bedside table next to a clean glass of water, crisp matte navy label with crescent moon emblem clearly visible, warm morning sunlight streaming through sheer curtains, subtle dust motes in golden light beam, premium magazine aesthetic --ar 9:16 --no distorted labels, broken glass, floating objects, text overlay	[MAG10-S04] Slow cinematic push-in toward the bottle. In the first 1-2 seconds, morning sunlight shifts gracefully across the amber glass contour, catching the embossed logo with a delicate warm glint, steady tripod glide, elegant editorial pacing
MAG10-S05 (O1)	Person	ให้สมองได้พักจริงจริง ตื่นมาหัวโล่ง สดชื่น ไม่เพลีย	หญิงสาวตื่นนอนยามเช้า ลุกขึ้นบิดขี้เกียจ ยิ้มสดชื่น หน้าตาแจ่มใส	[MAG10-S05] Stunning 9:16 medium close-up of a beautiful 40-year-old Thai woman waking up by a sunlit window in the morning, holding a glass of water, radiant glowing healthy skin, soft genuine smile of complete vitality and relief, wearing comfortable cream linen shirt, warm morning sun brushing cheekbones, aspirational aesthetic interior --ar 9:16 --no man, messy room, anime, glowing orbs, particles, text	[MAG10-S05] Gentle cinematic push-in toward her face. In the first 1-2 seconds, she takes a deep, revitalizing breath of fresh morning air as her chest gently rises, taking a slow refreshing sip from the water glass, eyes sparkling with vibrant energy and smiling peacefully, authentic acting, natural sunlight
```

---

## ⚡ กฎเหล็กประจำตาราง (Iron Production Rules)
1. **Zero Visual Table:** ตารางนี้เน้นความกระชับ จบงานเร็ว ใช้เฉพาะ TSV code block ในไฟล์ `.md` เพื่อให้ Copy ไปวางใน Excel ได้ในคลิกเดียว ตัดตาราง Markdown Preview ที่ซ้ำซ้อนออก 100%
2. **Chat Silence Rule:** ห้ามพ่น TSV Code Block ลงใน Chat เด็ดขาด ให้บันทึก/อัปเดตลงไฟล์ `.md` โดยตรง แล้วรายงานสรุปสั้นๆ ในแชทพร้อมลิงก์ไฟล์
3. **Naming Standard:**
   - คอลัมน์ `ID`: ต้องเป็น `<CAMPAIGN>-S<NN> (<BEAT>)` เช่น `MAG10-S01 (H1)`
   - หัว Prompt: ใน `Image Prompt` และ `Motion Prompt` ต้องขึ้นต้นด้วย `[CAMPAIGN-Sxx]` เสมอ
4. **Ref Discipline:**
   - `Product` = ต้องเป็น Image-to-Video ที่แนบรูปขวด/แคปซูลจริง ห้ามให้ AI จินตนาการขวดเอง
   - `Person` = ต้องมี Identity Anchor กำกับหน้าคน
   - `-` = เจนสดสไตล์ 3D Medical Aesthetic / Ambient

