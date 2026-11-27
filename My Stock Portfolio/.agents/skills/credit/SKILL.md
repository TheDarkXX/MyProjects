---
name: credit
version: "2.0.0"
updated_at: "2026-11-27"
description: >-
  CC Statement Flash Extractor & Production Importer — ดึงข้อมูลจาก PDF บัตรเครดิต
  (auto-sync จาก VPS + pdftotext -layout + กันใบกำกับภาษีซ้ำ + พิสูจน์สมการ Diff 0.00 + ยิงเข้า VPS DB ด้วย --push).
  ใช้เมื่อ: /credit [month] [bank] หรือ /credit compare [month]
---

# /credit — CC Statement Extractor & Production Importer (V2.0)

> **เครื่องมือหลักสำหรับแกะบิลบัตรเครดิต + พิสูจน์ยอด `0.00` บาท + นำเข้า `brain.db` บน VPS**
> ใช้ได้ฟรี 100% ผ่านโมเดลใน Antigravity IDE (`--ag-mode`) โดยไม่ต้องพึ่ง OpenRouter หรือ Kie.ai!

---

## 🎯 เมื่อไหร่ถึงจะ Trigger

- `/credit 2026-11` → Sync PDFs จาก VPS + แกะทุกธนาคารในเดือนนั้น + เทียบกับ `VPS_TRUTH`
- `/credit 2026-11 KBank` → ดึงและแกะเฉพาะบัตร `KBank`
- `/credit compare 2026-11` → ข้ามการใช้ AI แกะใหม่, ดึง Cache ล่าสุดเทียบกับ VPS DB

---

## ⚙️ กระบวนการ (Pipeline)

### 🟢 AG MODE (ค่าเริ่มต้น — ฟรี 100% + แทนตัวหลัก)

> ใช้สมองของโมเดลที่เปิดแชทอยู่ (เช่น Gemini 4 Hydrogen/Neon หรือ Claude) แกะรายการตาม Prompt มาตรฐานของแต่ละธนาคาร

**STEP 1:** รันสคริปต์ดึง PDF (auto-sync จาก VPS อัตโนมัติถ้ายังไม่มีในเครื่อง) + ถอด `pdftotext -layout` + แปะ Line ID:
```powershell
node .agents/skills/credit/scripts/cc-flash-extract.js 2026-11 --ag-mode
# หรือเจาะจงบัตร + บังคับ sync ใหม่จาก VPS:
node .agents/skills/credit/scripts/cc-flash-extract.js 2026-11 KBank --ag-mode --sync
```

**STEP 2:** สคริปต์จะข้ามใบกำกับภาษีที่แยกฉบับออกมาให้อัตโนมัติ แล้วพ่นข้อมูล:
```
===AG_BANK_START:KBank===
PDF_FILE: KBank-2026-11-28-xxxx.pdf
PROMPT_FILE: kbank.txt
VPS_TRUTH: {"count": 0, "sum": 0}
PDF_STATED_NEW: ...
===STATEMENT_TEXT_START===
[L001] ...
===STATEMENT_TEXT_END===
===AG_BANK_END:KBank===
```

**STEP 3:** AG agent ต้อง:
1. **อ่าน Prompt** จาก `resources/prompts/{bank}.txt`
2. **แกะรายการทั้งหมด** จาก `STATEMENT_TEXT` ตาม Line ID `[LXXX]` ห้ามยุบรายการซ้ำ
3. **พิสูจน์สมการ `0.00` บาท** ให้ครบ:
   `ยอดยกมา (prev_balance) - ยอดจ่าย (payments) + ยอดใหม่สุทธิ (net_new) == ยอดรวมเรียกเก็บใน PDF (pdf_total_due)`
4. **ถ้าจะนำเข้า Production DB (`--push`):**
   - บันทึก JSON ลง `scratch/credit_push_<month>.json` รูปแบบ:
     ```json
     {
       "bank": "KBank",
       "statement_month": "2026-11",
       "prev_balance": 0,
       "payments": 0,
       "pdf_total_due": 0,
       "due_date": "2026-12-10",
       "transactions": [ ... ]
     }
     ```
   - ถ้ายอดใน `VPS_TRUTH.count === 0` (ยังไม่เคยเข้า DB) หรือผู้ใช้สั่งนำเข้า ให้รัน:
     ```powershell
     node .agents/skills/credit/scripts/cc-flash-extract.js --push scratch/credit_push_<month>.json
     ```
   - `--push` จะสำรอง `brain.db` บน VPS อัตโนมัติ, เช็คสมการ `diff <= 0.01`, ยิง `POST /api/cc/credit-cards/batch`, สร้างบิลใน `cc_bills` (`/api/cc/bills/generate-from-cc`), และตรวจยอดหลัง insert ใน SQLite!

### 🟡 API MODE (เสริม — ใช้ Gemini Direct ก่อน OpenRouter)
- รันแบบไม่ใส่ `--ag-mode`: `node .agents/skills/credit/scripts/cc-flash-extract.js 2026-11`
- ใช้ `GEMINI_API_KEY` / `GOOGLE_API_KEY` เป็นหลัก (fallback `OPENROUTER_API_KEY` ถ้ามี)

### 🔵 COMPARE MODE (ใช้ cache เดิม — ไม่ยิง AI)
- `node .agents/skills/credit/scripts/cc-flash-extract.js compare 2026-11`

### กฎเหล็ก (Iron Rules)
- ขึ้นต้นตาม Persona เสมอ
- ห้ามแตะต้องโค้ด `discord-bot/lib/credit-card-agent.js` เด็ดขาด
- ห้าม `--push` เข้า DB ถ้าสมการบัญชีไม่ลงตัว `0.00` (ยกเว้นพิสูจน์สาเหตุแล้วและใส่ `--force`)

---

## 🏦 ธนาคารที่รองรับ

| Bank | PDF Password | Text Extraction | Default Due Day |
|------|-------------|-----------------|-----------------|
| BBL | 19051985 | VPS `pdftotext -layout` (stdin) → local `pdf-parse` | วันที่ 3 เดือนถัดไป |
| KBank | 19051985 | VPS `pdftotext -layout` (stdin) → local `pdf-parse` | วันที่ 10 เดือนถัดไป |
| Krungsri | 19May1985 | VPS `pdftotext -layout` (stdin) → local `pdf-parse` | วันที่ 8 เดือนถัดไป |
| SCB / CardX | 19051985 | VPS `pdftotext -layout` (stdin) → local `pdf-parse` | วันที่ 12 เดือนถัดไป |
