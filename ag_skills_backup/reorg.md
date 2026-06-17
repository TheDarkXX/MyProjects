# 📂 Skill: `/reorg` (MyProjects — Raw Folder Organizer)

## Objective
จัดระเบียบ "dump folder" (เช่น Quick Upload) ที่ User โยน raw files ลงมา
เช่น ภาพตัวอย่างสินค้า, ส่วนผสม, ส่วนประกอบ, raw data ต่างๆ
โดย **วิเคราะห์ → จัดกลุ่ม → ทำความสะอาด** ไฟล์ที่ใช้แล้ว

## Trigger
```
/reorg [path]
/reorg              ← default: Quick Upload folder
/reorg .            ← ใช้ workspace root
```

**Default path:** `C:\My Claw\MyProjects\Quick Upload`

## Execution Steps

### Phase 0: Triage & Analysis (วิเคราะห์ก่อน ห้ามโยนให้ User คิด)
1. **Scan target folder** — list ไฟล์และ subdirectories ทั้งหมด
2. **Analyze & Auto-Classify**:
   - AI ต้อง **คิดวิเคราะห์เนื้อหาและบริบทของไฟล์เองก่อน**
   - กำหนดสถานะเบื้องต้นเป็น `🟢 KEEP` (เตรียมจัดหมวดหมู่), `🔴 DELETE` (ดูเป็นไฟล์ขยะ/ดึงข้อมูลแล้ว), หรือ `🟡 UNSURE`
   - **ห้าม** โยน list ไฟล์ดิบๆ ไปให้ User นั่งเลือกเองตั้งแต่แรก
3. **ถ้ามีไฟล์ `🔴 DELETE` หรือ `🟡 UNSURE`:**
   - นำเสนอการวิเคราะห์ให้ User ดูและรอการยืนยัน

### Phase 1: Classify (จัดหมวดไฟล์ที่ KEEP)
4. **จัดประเภทไฟล์ตามเนื้อหา:**

| Category | ลักษณะไฟล์ | ตัวอย่าง |
|----------|-----------|---------|
| 🏷️ Brand / Product | โฟลเดอร์ย่อยชื่อแบรนด์, รูปสินค้า | `dr pong/`, `nectapharma/` |
| 📊 Reports & Data | PDF/Excel/CSV เปรียบเทียบ, วิเคราะห์ | `Comparison_Final.pdf` |
| 🧪 Ingredients | รูปส่วนผสม, ตาราง nutrition facts | `ingredients_table.jpg` |
| 🖼️ Product Images | รูปสินค้า, packaging, label shots | `S__4882445_0.jpg` |
| 📝 Raw Notes | text, markdown, screenshots memo | `notes.txt` |
| 🗂️ Misc | ไฟล์ที่ไม่ตรงกับหมวดข้างต้น | |

5. **Detect semantic groups:**
   - ชื่อ subdirectories ที่คล้ายกัน → จัดรวมกัน (e.g., brand folders → `Brands/`)
   - ไฟล์ที่ชื่อ prefix เดียวกัน → จัดรวมกัน

### Phase 2: Propose Plan (ย้ายออกนอก Staging Area)
6. **แสดง Reorganization Plan:**
   - **กฎเหล็ก:** โฟลเดอร์ต้นทาง (เช่น `Quick Upload`) เป็นเพียงจุดพักไฟล์ (Staging Area) **ห้ามจัดระเบียบแล้วทิ้งไว้ในนี้เด็ดขาด**
   - ต้องเสนอให้ย้ายออกไปยังโฟลเดอร์เก็บข้อมูลหลัก (เช่น `Organized Assets`) เพื่อเคลียร์ให้ต้นทางว่างเปล่า
   ```
   📂 [Destination Folder] (เช่น Organized Assets)
   │
   │  🟢 REORGANIZE (ย้ายมาจาก [Target Folder]):
   │  ├── 📁 Brands/
   │  │   ├── brand_a/  ← (moved)
   │  │   └── brand_b/  ← (moved)
   │  └── 📁 Reports/
   │      ├── report1.pdf  ← (moved)
   │      └── report2.pdf  ← (moved)
   
   🗑️ ลบทิ้ง (DELETE):
   ├── old_file.pdf
   └── used_data.csv
   ```
7. **ถาม User ยืนยัน** ก่อนดำเนินการ (เปิดโอกาสให้ User แก้ไขชื่อ Destination Folder ได้)

### Phase 3: Execute
8. **Delete** ไฟล์ที่ User ยืนยัน `🔴 DELETE`
9. **Create destination folders** ด้วย `New-Item -ItemType Directory -Force`
10. **Move items** ด้วย `Move-Item`
11. **Verify** ด้วย `list_dir` ว่าผลลัพธ์ตรงกับ plan

### Phase 4: Report
12. **แสดงสรุป:**
    - ❌ จำนวนไฟล์ที่ลบ + พื้นที่ที่ได้คืน
    - 📦 จำนวนไฟล์/โฟลเดอร์ที่ย้าย
    - 📂 โครงสร้างใหม่ (tree view)

## ⚠️ Rules
- **ALWAYS confirm before deleting** — แสดง list + ขนาดไฟล์ ให้ User ยืนยัน
- **ALWAYS confirm before moving** — แสดง plan ให้ User เห็นก่อน
- **Preserve subfolder internal structure** — ไม่แตะไฟล์ภายใน subfolder ที่ย้าย
- **Smart naming** — ใช้ชื่อโฟลเดอร์ที่สื่อความหมาย (e.g., "Brands", "Reports") ไม่ใช้ชื่อ generic
- **Handle conflicts** — ถ้า destination มีไฟล์ชื่อซ้ำ → ถาม User

## Examples

### Example 1: Product comparison project (cleanup + reorg)
```
Before:                              After:
Quick Upload/                        Organized Assets/
├── brand_a/          🟢 KEEP        ├── Brands/
├── brand_b/          🟢 KEEP        │   ├── brand_a/
├── old_draft.pdf     🔴 DELETE      │   └── brand_b/
├── report_v1.pdf     🔴 DELETE      └── Reports/
├── report_final.pdf  🟢 KEEP            └── report_final.pdf
└── raw_data.csv      🔴 DELETE      
                                     Quick Upload/ (Empty)
                                     🗑️ Deleted: 3 files (2.1 MB freed)
```

### Example 2: Mixed media raw dump
```
Before:                              After:
Quick Upload/                        Organized Assets/
├── product_front.jpg  🟢 KEEP       ├── Product Images/
├── product_back.jpg   🟢 KEEP       │   ├── product_front.jpg
├── ingredients.png    🟢 KEEP       │   └── product_back.jpg
├── old_screenshot.png 🔴 DELETE     └── Ingredients/
└── nutrition.pdf      🟢 KEEP           ├── ingredients.png
                                         └── nutrition.pdf
                                     
                                     Quick Upload/ (Empty)
                                     🗑️ Deleted: 1 file (0.3 MB freed)
```
