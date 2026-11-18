---
version: "2.13.2"
type: impl
status: complete
outcome: shipped
date: 2026-11-18
aliases: [drbank-aff-toolkit, spy-gate, collect-audit-log, atomic-json, auth-hardening]
conversation: "68040aa4-e9ca-4dc8-83ef-d24c740cc7f3"
summary: >
  Implement Single-Source-of-Truth Spy Pool Signal Gate (extra > 0 && netComm >= 20 THB, 100 THB/day baseline, Base cap 250 THB, zero 3% WHT), Check-First Atomic Spy Collector pipeline with SQLite collect/reject audit logs (aff_spy_collect_logs & aff_spy_rate_snapshots), item_id deduplication (1 item = 1 sub_id2 with source_reels merge), atomic JSON writes with mutex, and auth Host-header spoofing protection across DrBank-AFF-Toolkit and XBrain/apps/aff.
---
# DrBank AFF Toolkit v2.13.2 — Spy Pool Signal Gate, Audit Logs & Pipeline Hardening

## 📌 Context & Implementation (Compiled Truth)

- **Single Source of Truth Gate (`extra > 0 && netComm >= 20฿`, 100฿/day):**
  - Created `C:\XBrain\apps\aff\lib\gate.js` (`GATE_CONFIG`, `normalizeReelKey`, `computeDirectCommission`, `evaluateSpyGate`) and mirrored `ns.GATE_CONFIG` + `ns.evaluateSpyGate` in `DrBank-AFF-Toolkit/src/common/utils.js`.
  - Aligned `src/shopee-hud.js`, `sidepanel.js`, and `C:\XBrain\apps\aff\public\index.html` to the same 20฿ / 100฿/day threshold and removed the stale `× 0.97` fallback in `syncSpyPoolFile`.
- **Check-First Spy Collector Pipeline (`sidepanel.js`, `background.js`, `apps/aff/index.js`):**
  - `runSpyReelCollector()` now calls `SPY_COLLECT_REELS` with `resolveOnly: true` (no premature JSON writes), checks real AFF rates, generates `s.shopee.co.th` shortlinks **only** for passing items, and commits via `SPY_COMMIT_REELS` (`POST /api/shopee-aff/spy-commit`).
  - Closed secondary leak paths in `GET /api/shopee-aff/pool-pending` and `POST /api/aff/spy/:spySubId2/promote`.
  - Fixed rate-downgrade persistence so dropping Extra to `0%` updates DB/JSON accurately instead of keeping stale green values.
- **SQLite Audit Logs & Atomic JSON (`aff.db`, `spy_competitor_pool.json`):**
  - Added `aff_spy_collect_logs` and `aff_spy_rate_snapshots` tables plus `GET /api/shopee-aff/spy-logs` and UI filter **`🗂️ ประวัติคัดออก / Log`** in `apps/aff/public/index.html`.
  - Added `withSpyPoolLock`, `readSpyPoolSafe` (throws on corrupt JSON instead of wiping to `[]`), and `writeSpyPoolAtomic` (`.tmp` + `renameSync`).
  - Cleaned `spy_competitor_pool.json` (11 -> 6 passing items; backed up to `spy_competitor_pool.pre_gate_backup.json`), merged duplicate `s010` into `s009.source_reels`, and seeded historical logs.
- **Auth Hardening (`apps/aff/auth.js`):**
  - Added 30-day session expiration and blocked localhost auth bypass when reverse-proxy headers (`x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`, `x-forwarded-host`) are present.

### Verification
- `node --check` on all 7 modified JS files: PASSED (`ALL_SYNTAX_OK`).
- `node tools/verify_sidepanel_dom.cjs`: PASSED (`All 113 HTML IDs verified`).
- `node tools/verify_social_commission.cjs`: PASSED.
- `node apps/aff/test/golden-reconcile.mjs` (in `C:\XBrain`): PASSED `[1]`–`[10]`.
- End-to-end Spy Gate, Atomic Pool, Log, Dedup & Auth verification: PASSED.





## 📋 Files Changed This Session
| File | What Changed | Scope |
|---|---|---|
| `rBank-AFF-Toolkit/background.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/sidepanel.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/src/common/utils.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/src/shopee-hud.js` | Auto-detected session change | Core Repository |

## 📦 RAW ARTIFACT BACKUP (Iron Rule)

<details>
<summary>Click to view implementation plan (implementation_plan.md — 100% Raw Copy)</summary>

# แผนผ่าตัดใหญ่: DrBank AFF Toolkit × XBrain Spy Pool Gate, Collect Audit Log & Pipeline Hardening

> **Executive TL;DR:** ผ่าตัดสถาปัตยกรรมสายพาน `Spy Reel Collector` และ `Product Pool Bridge` ระหว่าง [`DrBank-AFF-Toolkit`](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit) กับ [`XBrain/apps/aff`](file:///C:/XBrain/apps/aff/index.js) เพื่ออุดช่องโหว่ 18 จุดที่ตรวจพบจากการ Audit ด้วย `/cc om` (Claude Opus 5.5) โดยเปลี่ยนจากระบบ *"ยัดลง JSON ก่อนเช็กค่าคอม + เกณฑ์ตัดสิน 5 มาตรฐาน + ไร้ Log"* ไปสู่ระบบ **"Check-First Atomic Commit + Single Gate Source of Truth + SQLite Collect/Reject Audit Log + Zero-Data-Loss File Guard"** เพื่อไม่ให้สินค้าตัวแดง (ค่าคอม 2฿–8฿ หรือไร้ Extra) หลุดขึ้นเว็บหรือผลาญโควตาเจนลิงก์ `s.shopee.co.th` ฟรีอีกต่อไป

---

## ❓ 1. Open Questions & Decisions Needed (รอ User ตัดสินใจ / ให้ความเห็น)

*ชี้เมาส์กดไอคอน 💬 คอมเมนต์เจาะจงแต่ละข้อ หรือตอบรวดเดียวในแชทเพื่อเคาะก่อนลงมือโค้ด:*

1. **เกณฑ์ Signal Gate กลาง (Single Source of Truth สำหรับตัดสิน "ผ่านเข้าเว็บ vs ปัดตกเข้า Reject Log"):**
   - **ทางเลือก A (แนะนำ — มาตรฐาน Opus & `evaluateAdViability`):** ต้องมี **`extraRate > 0` และ `netComm >= 20` บาท/ชิ้น** (สอดคล้องกับเส้นแบ่งสีแดง `danger` ใน [`utils.js`](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/src/common/utils.js#L296-L315) ที่ขายไม่เกิน 5 ชิ้นคืนทุนค่าแอด 100฿/วัน)
   - **ทางเลือก B (เกณฑ์หน้าเว็บเดิม):** ต้องมี **`extraRate > 0` และ `netComm >= 15` บาท/ชิ้น** (และให้เลือกเพิ่มได้ว่าจะบังคับ `extraRate >= 7%` ตามเกณฑ์ อ.เอสเธอร์ ด้วยหรือไม่)

2. **ตัวเลขทุนแอดต่อวัน (Daily Ad Cost Baseline) สำหรับคำนวณจุดคุ้มทุน (Break-Even Units):**
   - **ทางเลือก A (แนะนำ — ตรงตาม v2.13.0 Direct AFF Parity):** ใช้ **`100 บาท/วัน`** ตรงกันทั้งฝั่ง Extension และหน้าเว็บ [`apps/aff/public/index.html`](file:///C:/XBrain/apps/aff/public/index.html#L5869) (ปัจจุบันหน้าเว็บยังหารด้วย `107` อยู่)
   - **ทางเลือก B (รวม VAT 7%):** ใช้ **`107 บาท/วัน`** ทั้งสองฝั่ง

3. **การจัดการเมื่อ "หลายคลิปคู่แข่ง ขายสินค้า `item_id` เดียวกัน" (เช่นเคส `aidrb1611s009` กับ `aidrb1611s010` ที่เป็น `item_id: 10506141711` ตัวเดียวกัน):**
   - **ทางเลือก A (แนะนำ — 1 สินค้า = 1 `sub_id2`):** ยึด `item_id` เป็นหลัก (1 สินค้าใช้ `spy_sub_id2` เดียวและ `short_link` เดียว เพื่อรวมยอดคลิก/ยอดขายไม่ให้กระจาย) ส่วนคลิปคู่แข่งที่มาทีหลังให้ผูกเก็บในอาเรย์ `source_reels[]` ของสินค้านั้นแทนการออกรหัสใหม่
   - **ทางเลือก B (1 คลิปคู่แข่ง = 1 `sub_id2`):** แยก `spy_sub_id2` ตามคลิปเหมือนเดิม แต่ดึงเรทและรูปสินค้าจาก Cache ของ `item_id` เดิมโดยไม่ยิง API ซ้ำ

4. **การจัดการแถวที่มีปัญหาค้างอยู่ใน [`spy_competitor_pool.json`](file:///C:/XBrain/10M_Project/Shopee_Aff/spy_competitor_pool.json) ปัจจุบัน (4 รายการ):**
   - ได้แก่ `aidrb1611s008` (คอม `฿2.21`), `aidrb1611s011` (คอม `฿4.40`), `aidrb1611s004` (คอม `฿8.88`), และ `aidrb1611s003` (Extra `0%` แต่มีค่าคอมค้าง `฿26.19` จากสูตรเก่า)
   - **ทางเลือก A (แนะนำ):** ย้ายทั้ง 4 รายการออกจาก `spy_competitor_pool.json` เข้าตาราง `aff_spy_collect_logs` (สถานะ `REJECTED` / `DEMOTED`) ทันทีเพื่อให้หน้าเว็บคลีน 100%
   - **ทางเลือก B:** เก็บไว้ในไฟล์เดิมแต่เพิ่มฟิลด์ `gate_status: 'rejected'` และซ่อนจากตารางหน้าเว็บเป็นค่าเริ่มต้น (เปิดดูได้เฉพาะเมื่อกดตัวกรอง `🔴 ไม่ผ่านเกณฑ์ / Log`)

---

## 🔍 2. Verified Facts & Assumptions (Evidence Ledger)

| ประเภท | รายละเอียด | หลักฐานอ้างอิง (ไฟล์ / บรรทัด / คำสั่ง) |
|---|---|---|
| **Verified Fact** | `runSpyReelCollector()` ยิง `SPY_COLLECT_REELS` (`POST /api/shopee-aff/spy-collect`) ใน Stage 1 ก่อนเช็กเรทค่าคอม และฝั่ง Server เขียนทุกแถวลง `spy_competitor_pool.json` ทันที | [`sidepanel.js#L1670-L1671`](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/sidepanel.js#L1670-L1671), [`index.js#L4601-L4738`](file:///C:/XBrain/apps/aff/index.js#L4601-L4738) |
| **Verified Fact** | `ensureSpyRowsShortLinksAndSave()` เจนลิงก์ `s.shopee.co.th` และเรียก `SAVE_POOL_SHORTLINKS` โดยไม่เช็กว่าสินค้านั้นผ่าน Gate หรือเป็นตัวแดง | [`sidepanel.js#L1459-L1513`](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/sidepanel.js#L1459-L1513) |
| **Verified Fact** | `GET /api/shopee-aff/pool-pending` ดึงแถว Spy ที่ `net_comm_baht <= 0` เข้าคิว `pending` ทำให้ระบบ Batch ฝั่งแท็บ AFF เจนลิงก์ให้ตัวที่ตกเกณฑ์ได้เป็นทางรั่วที่ 2 | [`index.js#L4225-L4285`](file:///C:/XBrain/apps/aff/index.js#L4225-L4285), [`shopee-affiliate.js#L3665-L3712`](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/src/shopee-affiliate.js#L3665-L3712) |
| **Verified Fact** | เกณฑ์ผ่าน/ตก (Gate) กระจายอยู่ 5 จุดและไม่ตรงกันเลย (`OR` vs `AND`, `>= 15` vs `>= 20`, `extra > 0` vs `extra >= 7`) | [`sidepanel.js#L1821`](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/sidepanel.js#L1821), [`index.html#L5627`](file:///C:/XBrain/apps/aff/public/index.html#L5627), [`index.html#L5853`](file:///C:/XBrain/apps/aff/public/index.html#L5853), [`utils.js#L296-L315`](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/src/common/utils.js#L296-L315), [`shopee-hud.js#L622`](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/src/shopee-hud.js#L622) |
| **Verified Fact** | `syncSpyPoolFile()` ยังมี fallback คูณ `0.97` (หักภาษี 3%) และทั้ง `syncSpyPoolFile` / `pool-shortlinks` อัปเดตเรทเฉพาะเมื่อค่าใหม่ `> 0` ทำให้เมื่อสินค้าถูกถอด Extra เหลือ `0%` ค่าเก่าจะค้างเขียวหลอกตา (เช่น `aidrb1611s003`) | [`index.js#L3989-L3993`](file:///C:/XBrain/apps/aff/index.js#L3989-L3993), [`index.js#L4345-L4348`](file:///C:/XBrain/apps/aff/index.js#L4345-L4348) |
| **Verified Fact** | `POST /api/shopee-aff/spy-collect` อ่านไฟล์ `spy_competitor_pool.json` แบบ `try { ... } catch {}` หากอ่านพลาดขณะเขียนชนกัน จะตั้งต้นจาก `items: []` แล้วเขียนทับทั้งไฟล์หายเกลี้ยง | [`index.js#L4616-L4628`](file:///C:/XBrain/apps/aff/index.js#L4616-L4628), [`index.js#L4738`](file:///C:/XBrain/apps/aff/index.js#L4738) |
| **Verified Fact** | `auth.js` อนุญาต Bypass Auth เป็น `owner` ทันทีถ้า HTTP `Host` header เป็น `localhost` หรือ `127.0.0.1` | [`auth.js#L70-L73`](file:///C:/XBrain/apps/aff/auth.js#L70-L73) |
| **Verified Fact** | ใน `aff.db` มี 19 ตาราง (`aff_skus` 606 แถว ไม่มีตัวไหน `< 15฿`) แต่ยังไม่มีตารางเก็บประวัติ Collect / Reject Log หรือ Rate Snapshot | [`index.js#L92-L341`](file:///C:/XBrain/apps/aff/index.js#L92-L341) |

---

## 🎯 3. Acceptance Criteria & Non-Goals (ขอบเขตงาน)

### ✅ Acceptance Criteria (เกณฑ์ชี้ขาดว่างานเสร็จจริง)
1. **Zero Red SKU Leak:** เมื่อกด Collect คลิปคู่แข่งใน Side Panel สินค้าที่ไม่ผ่านเกณฑ์ Gate (เช่น คอม 2฿, 5฿ หรือ Extra 0%) จะ **ไม่ถูกเจนลิงก์ `s.shopee.co.th`** และ **ไม่ถูกบันทึกลงตาราง Active ของ `spy_competitor_pool.json`**
2. **Full Collect & Reject Audit Log:** ทุกคลิปที่กด Collect (ทั้งผ่าน, ตกเกณฑ์, ไร้ตะกร้า, หรือซ้ำ) ต้องถูกบันทึกลงตาราง `aff_spy_collect_logs` และ `aff_spy_rate_snapshots` ใน `aff.db` พร้อมดูประวัติย้อนหลังบนหน้าเว็บ `Spy Pool` ได้
3. **Single Gate & Formula Parity:** สูตรคำนวณค่าคอม (Base Cap 250฿ + Extra ไม่หัก 3%) และเกณฑ์ Gate อ้างอิงจากแหล่งเดียวตรงกัน 100% ทั้ง Extension และ Web UI
4. **Rate Downgrade Accuracy:** หากสินค้าที่เคยมี Extra ถูกร้านค้าปรับลด Extra เหลือ `0%` การกดรีเช็กเรทต้องอัปเดต `extra_comm_pct = 0` และ `net_comm_baht` ตามจริงทันที ไม่ค้างค่าเก่า
5. **Zero JSON Corruption:** การอ่าน/เขียน `spy_competitor_pool.json` ทำงานภายใต้ In-Process Mutex + Atomic Write (`tmp` + `rename`) และไม่รีเซ็ตไฟล์เป็น `[]` เมื่อเกิด Parse Error
6. **Verification Suite Green:** รัน `verify_sidepanel_dom.cjs`, `verify_social_commission.cjs`, `node --check`, และ `golden-reconcile.mjs` ผ่านครบทุกข้อ

### ⛔ Non-Goals (สิ่งที่จะ "ไม่ทำ" ในรอบนี้เด็ดขาด)
- ไม่รื้อโครงสร้างตารางหลักของแคมเปญ 605 SKUs (`aff_skus`, `aff_conversions`, `aff_clicks`, `aff_reels_state`) ที่กำลังรันแอด Live อยู่
- ไม่เปลี่ยน UI Layout หลักของ Side Panel หรือหน้าเว็บ Command Center นอกเหนือจากส่วนแสดงสถานะ Gate และแท็บ/ตัวกรองดูประวัติ Collect/Reject Log

---

## ⚖️ 4. Decision Matrix (สิ่งที่ต้อง REUSE vs BUILD NEW)

| Component / Logic | การตัดสินใจ (Action) | เหตุผลเชิงสถาปัตยกรรม |
|---|---|---|
| `ns.calculateCommission` & `ns.evaluateAdViability` ใน [`utils.js`](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/src/common/utils.js) | **REUSE & ALIGN** | มีลอจิก Base Cap 250฿ และ Tier ชัดเจนอยู่แล้ว แค่นำเกณฑ์เดียวกันไปใช้ใน `sidepanel.js` และฝั่ง Server |
| `aff.db` SQLite Instance ใน [`apps/aff/index.js`](file:///C:/XBrain/apps/aff/index.js#L89) | **REUSE** (เพิ่มตาราง Log) | ใช้ Connection และ Transaction เดิมของระบบ ไม่ต้องแยกไฟล์ DB ใหม่ |
| โมดูล [`apps/aff/lib/gate.js`](file:///C:/XBrain/apps/aff/lib) | **BUILD NEW** | เป็น Single Source of Truth สำหรับคำนวณค่าคอมและตัดสิน Gate ฝั่ง Server พร้อมเสิร์ฟผ่าน `/api/aff/gate-config` |
| ระบบเขียนไฟล์ `spy_competitor_pool.json` ใน [`apps/aff/index.js`](file:///C:/XBrain/apps/aff/index.js) | **REFACTOR** (Atomic Helper) | ยุบการอ่าน/เขียน JSON 3 จุดให้ผ่าน `readSpyPoolSafe()` และ `writeSpyPoolAtomic()` พร้อม Mutex เดียวกัน |

---

## 📐 5. Proposed Changes (รายการไฟล์และพิกัดจริง)

### Phase P0 & P1 — Server-Side Gate, Audit Logs & Atomic Storage (`C:\XBrain\apps\aff`)

#### [PROPOSED NEW] `C:\XBrain\apps\aff\lib\gate.js`
- **Parent Directory:** [`C:\XBrain\apps\aff\lib`](file:///C:/XBrain/apps/aff/lib) (มีอยู่จริง มี `subid.js`, `reconcile.js`, `meta.js`)
- **หน้าที่:**
  - Export ค่าคงที่ `GATE_CONFIG` (`gateVersion`, `minExtraPct`, `minNetCommBaht`, `baseCapTHB: 250`, `dailyAdCostTHB`)
  - Export `computeDirectCommission({ price, basePct, extraPct, capTHB = 250 })` (ไม่คูณ `0.97`, ล็อกเพดาน Base 250฿)
  - Export `evaluateSpyGate({ itemId, price, basePct, extraPct, netComm })` คืนค่า `{ pass, status, reason, tier, netComm, breakEvenUnits }`

#### [MODIFY] [index.js](file:///C:/XBrain/apps/aff/index.js)
- **จุดที่แก้ & สิ่งที่เปลี่ยน:**
  1. **Schema Migration (L340+):** สร้างตาราง `aff_spy_collect_logs` (เก็บทุกครั้งที่กด Collect ทั้ง `PASS`, `REJECT_LOW_COMM`, `REJECT_NO_EXTRA`, `NO_TAG`, `DUPLICATE_ITEM`) และ `aff_spy_rate_snapshots` (เก็บประวัติการเช็กเรทตาม `item_id`)
  2. **Atomic JSON & Mutex Guard (L827+, L3956, L4616):**
     - สร้าง `withSpyPoolLock(fn)`, `readSpyPoolSafe()` (ถ้าไฟล์มีอยู่แต่อ่าน/parse ไม่ผ่าน ให้ `throw Error` ตอบ HTTP 500 ทันที **ห้ามเคลียร์เป็น `items: []` เด็ดขาด**), และ `writeSpyPoolAtomic(data)` (เขียนลง `.tmp` แล้ว `fs.renameSync`)
  3. **แยก Stage Resolve ออกจาก Stage Commit (`L4601`):**
     - ปรับ `POST /api/shopee-aff/spy-collect` ให้รองรับโหมด `resolve_only: true` (คลายป้ายตะกร้า FB + แกะ `item_id`/`shop_id` + เช็กว่าเคยอยู่ใน Pool หรือใน Reject Log แล้วหรือยัง **โดยยังไม่เขียนยัดลง `spy_competitor_pool.json`**)
     - เพิ่ม/ปรับการ Commit ตอนจบ Stage 4 (เมื่อ Extension ดึงเรทจริงเสร็จแล้ว): รายการที่ **ผ่าน Gate** จึงจะถูกบันทึกลง `spy_competitor_pool.json` (พร้อม Dedup ระดับ `item_id`), ส่วนรายการที่ **ไม่ผ่าน Gate** จะถูกบันทึกลง `aff_spy_collect_logs` (สถานะ `REJECTED`) อย่างเดียว
  4. **แก้บั๊กเรทลดเหลือ 0 แล้วไม่บันทึก (`L3984-L3993`, `L4345-L4348`):**
     - เปลี่ยนเงื่อนไขใน `syncSpyPoolFile` และ `POST /api/shopee-aff/pool-shortlinks` ให้ยอมรับค่า `extra_comm_pct === 0` และ `net_comm_baht` ที่ลดลงเมื่อส่ง `rate_checked: true` มาจริง และลบสูตร fallback `× 0.97` ([`L3992`](file:///C:/XBrain/apps/aff/index.js#L3992)) ทิ้ง
     - แก้ Default ใน `upsertSkuRecord` ([`L4036`](file:///C:/XBrain/apps/aff/index.js#L4036)) จาก `extra_comm_pct = 10` เป็น `extra_comm_pct = 0`
  5. **ปิดทางรั่วที่ 2 ใน `GET /api/shopee-aff/pool-pending` (`L4225-L4285`) และ `promote` (`L3476`):**
     - กรองแถว `spyRows` ใน `pool-pending` เฉพาะตัวที่ผ่าน Gate เท่านั้น ไม่ส่งตัวแดงไปให้แท็บ AFF เจนลิงก์
     - บังคับตรวจ Gate ใน `POST /api/aff/spy/:spySubId2/promote` ก่อนอนุญาตให้สร้างโพสต์
  6. **เพิ่ม Endpoint ดู Log (`GET /api/shopee-aff/spy-logs` และ `GET /api/aff/gate-config`):** ให้ Web UI และ Extension เรียกดูประวัติตัวที่ถูกคัดออกและดึงค่า Gate กลางได้

#### [MODIFY] [auth.js](file:///C:/XBrain/apps/aff/auth.js)
- **จุดที่แก้ (`L70-L73`):** ยกเลิกการเช็ก `c.req.header('host') === 'localhost'` เพียงอย่างเดียว (ป้องกันการปลอม `Host` header ผ่าน Reverse Proxy) โดยต้องไม่มี Header `x-forwarded-for` / `cf-connecting-ip` จากภายนอก หรือจำกัดเฉพาะเมื่อตั้ง ` process.env.ALLOW_LOCAL_AUTH_BYPASS === '1'` และเพิ่มการตรวจอายุ Session (`MAX_SESSION_AGE_MS = 30 วัน`) ใน `verifySessionValue`

#### [MODIFY] [index.html](file:///C:/XBrain/apps/aff/public/index.html)
- **จุดที่แก้ (`L2832-L2839`, `L5842-L5875`, `L6015-L6238`):**
  - ปรับ `getSpyDerivedMetrics()` ให้ใช้เกณฑ์ `passGate` และ `dailyAdCost` เดียวกับ `gate.js`
  - เพิ่มตัวกรอง/ปุ่มดู **`🗂️ ประวัติโดนคัดออก (Reject Log)`** ในหน้า Spy Pool เพื่อให้ตรวจสอบย้อนหลังได้ว่าเคยส่องคลิปไหนไปแล้วและถูกกรองออกเพราะค่าคอมกี่บาท

---

### Phase P0 & P1 — Chrome Extension Pipeline (`C:\My Claw\MyProjects\DrBank-AFF-Toolkit`)

#### [MODIFY] [src/common/utils.js](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/src/common/utils.js)
- **จุดที่แก้ (`L260-L355`):** เพิ่มฟังก์ชันกลาง `ns.evaluateSpyGate(row, settings)` ที่เชื่อมกับ `ns.calculateCommission` และ `ns.evaluateAdViability` ให้ทุกหน้าใน Extension เรียกใช้ฟังก์ชันเดียวกัน 100%

#### [MODIFY] [sidepanel.js](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/sidepanel.js)
- **จุดที่แก้ (`L1359-L1845`):**
  1. **Stage 1 (`runSpyReelCollector` L1671):** ส่ง `SPY_COLLECT_REELS` พร้อม `{ reels, resolveOnly: true }` เพื่อคลายป้ายตะกร้าและเช็กประวัติซ้ำโดยยังไม่บันทึกลง Spy Pool บนเว็บ
  2. **Stage 2 (`L1707-L1729`):** เช็กเรทจริงผ่าน `resolveSpyRowItemAndRate()` และประเมินผลด้วย `ns.evaluateSpyGate(row)` พร้อมบันทึกฟิลด์ `row.rateChecked = true`, `row.gatePass`, `row.gateReason`
  3. **Stage 3 (`ensureSpyRowsShortLinksAndSave` L1459-L1513):**
     - **กรองเฉพาะ `row.gatePass === true`** เท่านั้นที่จะนำไปเจนลิงก์ `BATCH_GENERATE_AFF_SHORTLINKS` (ตัวแดงข้ามการเจนลิงก์ทันที ประหยัดโควตา 100%)
     - หาก `BATCH_GENERATE_AFF_SHORTLINKS` เกิด Error จะต้องแจ้ง Toast เตือนชัดเจน ไม่กลืน Error ด้วย `.catch(() => null)`
     - เปลี่ยน `sub_id3` จากค่าตายตัว `'20261116'` เป็นวันที่ปัจจุบัน `YYYYMMDD` (และดึง `sub_id1` จาก `currentSettings` หรือแคมเปญปัจจุบัน)
  4. **Stage 4 (Commit & Audit Log):**
     - ส่งรายการที่ **ผ่าน Gate** เข้า Spy Pool และส่งรายการที่ **ไม่ผ่าน Gate / ไม่มีตะกร้า** ไปบันทึกใน `aff_spy_collect_logs` บน Server เพื่อให้มี Log เก็บครบทุกตัว
     - บันทึก `lastSpyEnrichedItems` ลง `chrome.storage.local` (`drbLastSpyCollectSession`) เพื่อไม่ให้ผลลัพธ์หายเวลาเผลอปิด Side Panel
  5. **ป้องกันการกดรีเช็กตัวที่ Extra 0% ซ้ำซาก (`rerunFailedSpyRows` L1566):**
     - แยกแยะระหว่าง *"ยังดึงเรทไม่สำเร็จ (`!r.rateChecked || r.rateError`)"* กับ *"ดึงเรทสำเร็จแล้วแต่ร้านค้าไม่ให้ Extra จริงๆ (`r.rateChecked && !r.rateError && r.extraRate === 0`)"* เพื่อไม่ให้ปุ่ม `🔄 รีเช็กตัวที่ 0%` ยิงเปิดแท็บใหม่ซ้ำกับสินค้าที่ไม่มี Extra จริงๆ

#### [MODIFY] [background.js](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/background.js)
- **จุดที่แก้ (`L1642-L1708`):** รองรับ flag `resolveOnly` ใน `SPY_COLLECT_REELS` และเพิ่ม action `SPY_COMMIT_RESULTS` (หรือส่ง `commit: true` + `rejectedLogs`) ไปยัง Server

---

## 📦 6. Data Contracts, Migration & Rollback

### 1) ตารางใหม่ใน `C:\XBrain\data\aff.db`
```sql
CREATE TABLE IF NOT EXISTS aff_spy_collect_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collected_at TEXT DEFAULT (datetime('now')),
  reel_key TEXT NOT NULL,
  source_reel_url TEXT NOT NULL,
  competitor_page TEXT DEFAULT '',
  competitor_short_url TEXT DEFAULT '',
  shop_id TEXT DEFAULT '',
  item_id TEXT DEFAULT '',
  sku_code TEXT DEFAULT '',
  product_title TEXT DEFAULT '',
  price REAL DEFAULT 0,
  base_comm_pct REAL DEFAULT 0,
  extra_comm_pct REAL DEFAULT 0,
  net_comm_baht REAL DEFAULT 0,
  decision TEXT NOT NULL, -- 'PASS' | 'REJECT_LOW_COMM' | 'REJECT_NO_EXTRA' | 'REJECT_NO_TAG' | 'DUPLICATE_ITEM'
  reason TEXT DEFAULT '',
  gate_version TEXT DEFAULT 'v1'
);
CREATE INDEX IF NOT EXISTS idx_spy_logs_reel_key ON aff_spy_collect_logs(reel_key);
CREATE INDEX IF NOT EXISTS idx_spy_logs_item_id ON aff_spy_collect_logs(item_id);

CREATE TABLE IF NOT EXISTS aff_spy_rate_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checked_at TEXT DEFAULT (datetime('now')),
  item_id TEXT NOT NULL,
  price REAL DEFAULT 0,
  base_comm_pct REAL DEFAULT 0,
  extra_comm_pct REAL DEFAULT 0,
  net_comm_baht REAL DEFAULT 0,
  source TEXT DEFAULT 'extension_aff'
);
CREATE INDEX IF NOT EXISTS idx_spy_rate_snap_item ON aff_spy_rate_snapshots(item_id);
```

### 2) Idempotency & Dedup Key
- **Reel Dedup Key (`reel_key`):** สกัดรหัสคลิปมาตรฐานจาก URL (`/reel/<id>`, `/share/r/<id>`, `/videos/<id>`, หรือ `fb.watch/<id>`) โดยตัด Query String (`?mibextid=...`) ทิ้งทั้งหมด
- **Product Dedup Key (`item_id`):** ใช้ `item_id` เต็มในการตรวจซ้ำกับทั้ง `aff_skus` (Main Pool 605) และ `spy_competitor_pool.json`

### 3) Rollback Strategy
- ก่อนรัน Migration หรือทำความสะอาด `spy_competitor_pool.json` ระบบจะสำรองไฟล์ไว้ที่ `C:\XBrain\10M_Project\Shopee_Aff\spy_competitor_pool.pre_gate_backup.json` อัตโนมัติ
- ตารางใน `aff.db` เป็น `CREATE TABLE IF NOT EXISTS` แบบ Additive 100% หากต้องการย้อนกลับสามารถ `git checkout` ไฟล์โค้ดและคืนไฟล์ `.pre_gate_backup.json` ได้ทันทีภายใน 10 วินาทีโดยไม่กระทบตารางอื่น

---

## 🛡️ 7. Failure Modes, Security & Edge Cases Armor

- **Atomic File Write & Corruption Armor:** ห้ามใช้ `fs.writeFileSync(SPY_POOL_JSON_PATH, ...)` ตรงๆ เด็ดขาด ต้องเขียนลง `${SPY_POOL_JSON_PATH}.tmp.${process.pid}` แล้ว `fs.renameSync` ทับภายใต้ In-process Promise Mutex และต้องอ่านไฟล์ล่าสุด **หลัง** จาก Network Scraping เสร็จสิ้นแล้วเท่านั้นเพื่อป้องกัน Lost Update
- **Rate Downgrade Protection:** เมื่อรีเช็กเรทแล้วพบว่าสินค้าใน Spy Pool ถูกร้านค้าถอด Extra ออก (`extraRate === 0`) ระบบจะอัปเดตตัวเลขเป็น `0%` ตามจริงและเปลี่ยนสถานะเป็น `DEMOTED` (แจ้งเตือนว่าเรทตก แต่ **ไม่ลบลิงก์ `our_short_link` เดิม** เผื่อมีคลิปที่โพสต์ไปแล้วกำลังใช้ลิงก์นั้นอยู่)
- **Host Header Spoofing Defense:** ปิดช่องโหว่ `Host: localhost` ใน `auth.js` เพื่อไม่ให้คนนอกยิง Request ปลอม Header ผ่าน Nginx เข้ามาได้สิทธิ์ `owner`

---

## 🧪 8. Concrete Verification Plan (คำสั่งที่มีอยู่จริง)

### Automated Verification Commands
```powershell
# 1. ตรวจสอบ Syntax ของทุกไฟล์ที่แก้ไขทั้งฝั่ง Extension และ XBrain
node --check "C:\My Claw\MyProjects\DrBank-AFF-Toolkit\src\common\utils.js"
node --check "C:\My Claw\MyProjects\DrBank-AFF-Toolkit\sidepanel.js"
node --check "C:\My Claw\MyProjects\DrBank-AFF-Toolkit\background.js"
node --check "C:\XBrain\apps\aff\lib\gate.js"
node --check "C:\XBrain\apps\aff\auth.js"
node --check "C:\XBrain\apps\aff\index.js"

# 2. รันชุดทดสอบ DOM IDs และสูตรคำนวณค่าคอมของ Extension ที่มีอยู่จริง
node "C:\My Claw\MyProjects\DrBank-AFF-Toolkit\tools\verify_sidepanel_dom.cjs"
node "C:\My Claw\MyProjects\DrBank-AFF-Toolkit\tools\verify_social_commission.cjs"

# 3. รันชุดทดสอบ Golden Reconcile & Inline HTML Script Syntax ของ XBrain Aff App
node "C:\XBrain\apps\aff\test\golden-reconcile.mjs"
```
- **Expected Output:**
  - `verify_sidepanel_dom.cjs`: `All 113 HTML IDs verified` (หรือจำนวน ID ที่อัปเดตครบ 100%)
  - `verify_social_commission.cjs`: PASSED ทุกเคสค่าคอมตรงตามหน้า AFF
  - `golden-reconcile.mjs`: PASSED `[1]`–`[9]` ครบทุกข้อโดย Exit Code 0

### Manual / Data Verification
- รันสคริปต์ตรวจสอบ `spy_competitor_pool.json` และตาราง `aff_spy_collect_logs` ใน `aff.db` ยืนยันว่าไม่มีแถวตัวแดง (`aidrb1611s008` 2.21฿, `aidrb1611s011` 4.40฿) ค้างอยู่ใน Active Spy Pool และถูกย้ายเข้าตาราง `aff_spy_collect_logs` พร้อมเหตุผลครบถ้วน

---

## 🚦 9. Plan Quality Gate (เช็คลิสต์ตรวจความแน่นหนา)
- [x] ไฟล์ที่ `[MODIFY]` ทุกไฟล์มีพิกัดจริงและเปิดตรวจแล้ว (`sidepanel.js`, `background.js`, `utils.js`, `apps/aff/index.js`, `apps/aff/auth.js`, `apps/aff/public/index.html`)
- [x] ไฟล์ที่ `[PROPOSED NEW]` (`C:\XBrain\apps\aff\lib\gate.js`) ระบุ Parent Directory ที่มีอยู่จริง
- [x] คำสั่ง Verification มีอยู่จริงในเครื่อง (`verify_sidepanel_dom.cjs`, `verify_social_commission.cjs`, `golden-reconcile.mjs`)
- [x] มีการระบุ Non-Goals ชัดเจน ป้องกันสโคปบวม
- [x] มีแผน Rollback รองรับกรณีระบบพัง (`.pre_gate_backup.json` + Additive SQLite tables)

> 💡 งานนี้แตะทั้ง Extension และ Backend Data Pipeline หากต้องการให้ GPT Sol หรือ Opus ช่วยรีวิวแผนซ้ำอีกรอบ สามารถพิมพ์ `/update` ได้ทันที หรือเคาะคำตอบ 4 ข้อในหัวข้อที่ 1 แล้วกด **Proceed** เพื่อเริ่มลุยโค้ดได้เลย


</details>

## 🔬 Timeline & Debugging Log
- 22:34 — Audited `DrBank-AFF-Toolkit` and `XBrain/apps/aff`; found no collect/reject log and Stage 1 premature writes causing 2.21฿ (`s008`) & 4.40฿ (`s011`) items on web.
- 22:41 — Ran `/cc om` (Opus 5.5 Medium) architecture audit; uncovered 18 loopholes including `pool-pending` leak, 5 conflicting gates, `× 0.97` stale values, JSON wipe bug, and Host-header auth bypass.
- 23:01 — Approved `/plan` with user decisions (`extra > 0 && net >= 20฿`, `100฿/day`, `1 item_id = 1 sub_id2`, clean 4 failed rows).
- 23:14 — Implemented all changes across both repos, migrated data, and passed all verification suites.

## 🔗 GBRAIN Backlinks
- **2026-11-18** | [sidepanel.js](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/sidepanel.js) -- Check-First Spy Collector + Gate parity + `drbLastSpyCollectSession`
- **2026-11-18** | [gate.js](file:///C:/XBrain/apps/aff/lib/gate.js) -- Server Single Source of Truth for Spy Gate & Direct Commission
- **2026-11-18** | [index.js](file:///C:/XBrain/apps/aff/index.js) -- `spy-commit`, `aff_spy_collect_logs`, atomic JSON mutex & `pool-pending` guard
