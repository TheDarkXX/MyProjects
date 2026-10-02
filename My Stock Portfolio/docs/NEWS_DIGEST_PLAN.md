# ⚡ Architecture & Execution Plan: AI News Digest System (Weekly + On-Demand)

> **Document Status:** Planned & Ready for Implementation  
> **Author:** มารบูรพา 🔥 (Pair Programming AI)  
> **Target Path:** `C:\My Claw\MyProjects\My Stock Portfolio`  
> **Target Host:** Production VPS `185.250.38.247` (`stock-api`)  

---

## 1. ปรัชญาและแก่นของระบบ (System Philosophy)

ระบบสรุปข่าวทั่วไปมักล้มเหลวเพราะสองจุดตาย:
1. **ตายเพราะสรุปบ่อยเกินไป (Summary Fatigue):** สรุปทุก 3 วันแบบฟิกซ์เวลาทำให้วันหมุนเปะปะ (พุธ ➔ เสาร์ ➔ อังคาร) ไม่ตรงรอบตลาดหุ้นสหรัฐฯ (จันทร์–ศุกร์) วันเสาร์-อาทิตย์ไม่มีข่าวใหม่ AI เอาเรื่องเก่ามาแถซ้ำ สุดท้ายคนเลิกเปิดอ่าน
2. **ตายเพราะสรุปช้าเกินไป (Fatal Lag):** สรุปรอบสัปดาห์อย่างเดียว ถ้าหุ้นตัวหลักโดน Downgrade หรือร่วง -15% วันจันทร์ กว่าจะรู้ข่าววันอาทิตย์พอร์ตพังไปแล้ว

**ทางออกที่สมบูรณ์แบบ:** **3-Tier Intelligence Architecture**

```text
[ข่าวไหลเข้าทั้งวัน ➔ Triage Filter (THE_MUST / HIGH_IMPACT / NOISE)]
       │
       ├─➔ Tier 1: Flash Alert (Trigger ด่วนเมื่อเกิดวิกฤต/โอกาสทองทันที)
       │
       ├─➔ Tier 2: Weekly Master Briefing (ออโต้รันทุกเช้าวันอาทิตย์ 08:30 ICT เป็นเสาหลัก)
       │
       └─➔ Tier 3: On-Demand "AI Catch-up" (ปุ่มกดสรุป 3 วัน / 7 วัน ล่าสุดในเว็บตามใจสั่ง)
```

---

## 2. โครงสร้าง 3 เสาหลัก (The 3 Tiers)

### Tier 1: Flash Catalyst (ไม่ต้องรอรอบเวลา)
* **เงื่อนไข:** ข่าวที่มี Priority ระดับ `THE_MUST` หรือราคาหุ้นในพอร์ตเหวี่ยงรุนแรง ($\pm 4-5\%$) เช่น งบออก (Earnings), ปรับเป้า (Guidance Cut/Raise), คดีความใหญ่
* **ผลลัพธ์:** ปักหมุด Flash Card บนสุดของหน้าเว็บทันที 1 บล็อกจบ (เกิดอะไรขึ้น ➔ กระทบพื้นฐานไหม ➔ ต้องทำอะไร)

### Tier 2: Weekly Master Briefing (รอบหลัก: เสาหลักประจำสัปดาห์)
* **เวลาทำงาน:** ทุกวันอาทิตย์ 19:00 ICT (`0 19 * * 0`)
* **ช่องทาง:** บันทึกลงระบบ Web + ยิงแจ้งเตือนสรุปไฮไลท์เข้า LINE (Money AI Notification Bot)
* **เหตุผล:** ตลาดสหรัฐฯ ปิดคืนวันศุกร์ (เช้าเสาร์ไทย) ข้อมูลตกผลึกครบ ช่วงค่ำวันอาทิตย์ 19:00 น. เป็นเวลาทองคำก่อนตลาดฟิวเจอร์สและตลาดเอเชียเปิดสัปดาห์ใหม่
* **ผลลัพธ์:** สร้างบันทึก Executive Briefing 4 บล็อก + ยิงสรุปและลิงก์เข้า LINE:
  1. **Macro & Market Pulse:** ภาพรวมดัชนี, บอนด์ยีลด์ 10 ปี, ท่าทีของ Fed, การหมุนเวียนกลุ่มเงิน (Sector Rotation)
  2. **Portfolio Deep-Dive:** เจาะเฉพาะหุ้นในพอร์ต (`NVDA`, `CRWD`, `RBRK`, `MELI`, `SCHG`) แยกตัวที่มีข่าวจริง vs ตัวที่ราคาแกว่งตามอารมณ์ตลาด
  3. **Signal vs Noise:** ตัดข่าวดราม่ารายวัน ชี้เฉพาะประเด็นที่กระทบ Valuation และ Earnings ระยะยาว
  4. **Upcoming Catalyst Watch:** หุ้นตัวไหนจะรายงานงบสัปดาห์หน้า ตัวเลขเศรษฐกิจสำคัญ (CPI, PCE, Jobs Report)

### Tier 3: On-Demand "AI Catch-up" (สรุปด่วนสั่งได้)
* **การใช้งาน:** ปุ่มบน Toolbar ของหน้า `NewsIntelPage`:
  * `[ ⚡ สรุป 3 วันล่าสุด ]`
  * `[ ⚡ สรุป 7 วันล่าสุด ]`
* **ผลลัพธ์:** AI ดึงข่าว 3 วัน หรือ 7 วันล่าสุดมาสังเคราะห์สดๆ แสดงผลแบบ Modal หรือ Side Drawer 0ms latency

---

## 3. สถาปัตยกรรมทางเทคนิค (Technical Architecture)

### 3.1 โครงสร้างฐานข้อมูล SQLite (`server/db/init.js`)
เพิ่มตาราง `news_digests`:
```sql
CREATE TABLE IF NOT EXISTS news_digests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    digest_type TEXT NOT NULL,         -- 'weekly', 'flash', 'ondemand'
    period_start TEXT NOT NULL,        -- '2026-09-25 00:00:00'
    period_end TEXT NOT NULL,          -- '2026-10-02 23:59:59'
    title TEXT NOT NULL,
    macro_summary_th TEXT,             -- สรุปภาพรวมตลาด
    portfolio_summary_th TEXT,         -- สรุปเจาะหุ้นในพอร์ต
    actionable_notes_th TEXT,          -- หมากตาต่อไป & ข้อควรระวัง
    raw_markdown TEXT NOT NULL,        -- เนื้อหาฉบับเต็มฟอร์แมตสวย
    tickers_covered TEXT DEFAULT '[]', -- JSON array e.g. ["NVDA","CRWD","RBRK","MELI","SCHG"]
    article_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_digests_type ON news_digests(digest_type);
CREATE INDEX IF NOT EXISTS idx_digests_created ON news_digests(created_at);
```

### 3.2 สมองสังเคราะห์ข่าว (`server/services/newsDigest.js`)
* **Logic:**
  1. ดึงข่าวจาก `news_intelligence` ตามช่วงเวลา (`period_start` ถึง `period_end`)
  2. กรองเฉพาะข่าวคุณภาพสูง: `reading_priority IN ('THE_MUST', 'HIGH_IMPACT', 'CATALYST', 'MACRO', 'GOOD_TO_KNOW')`
  3. ตัดข่าว `CHATTER` และขยะทิ้ง
  4. ดึงรายชื่อหุ้นที่ผู้ใช้ถือจริงจากตาราง `transactions` (`NVDA`, `CRWD`, `RBRK`, `MELI`, `SCHG`)
  5. ส่ง Prompt ระดับ Institutional Portfolio Manager เข้าสู่ `AI_GATEWAY_URL` / `BRAIN_GATEWAY_URL`
  6. สกัดผลลัพธ์ บันทึกลงตาราง `news_digests`

### 3.3 ระบบเส้นทาง API (`server/routes/news.js`)
* `GET /api/news/digests` ➔ ดึงรายการสรุปทั้งหมด (รองรับ filter `type=weekly|ondemand`)
* `GET /api/news/digests/latest` ➔ ดึงสรุปสัปดาห์ล่าสุด (สำหรับแสดงบนหัว Dashboard)
* `POST /api/news/digests/generate` ➔ สั่งเจนสรุปตามสั่ง (`{ days: 3 | 7, type: 'ondemand' | 'weekly' }`)

### 3.4 ระบบตั้งเวลาอัตโนมัติ (`server/crons/newsScheduler.js`)
* ผูก Cron Job สรุปทุกเช้าวันอาทิตย์ 08:30 ICT:
  ```javascript
  // Every Sunday at 08:30 ICT
  cron.schedule('30 8 * * 0', async () => {
    console.log('📰 [Cron] Running Weekly Master AI Digest generation...');
    await generateWeeklyDigest();
  });
  ```

### 3.5 หน้ากากผู้ใช้งาน (Frontend UI)
* **หน้า `NewsIntelPage.tsx`:**
  * เพิ่มแท็บนำทางด้านบน: `[ 📰 ฟีดข่าวสด ]` | `[ 📑 สรุปประจำสัปดาห์ (AI Digest) ]`
  * เพิ่มปุ่ม Action บน Toolbar: `[ ⚡ สรุป 3 วันล่าสุด ]` และ `[ ⚡ สรุป 7 วันล่าสุด ]`
  * เมื่อคลิก จะเรียก Modal สรุปเนื้อหา Markdown คมๆ อ่านง่าย พร้อม Badge แบ่งหมวดหมู่ชัดเจน
* **หน้า `Dashboard.tsx`:**
  * การ์ดกะทัดรัด "Weekly Pulse" แสดงสรุป 3 บรรทัดของสัปดาห์ล่าสุด พร้อมปุ่มกดอ่านตัวเต็ม

---

## 4. แผนงานการลงมือทำ (Execution Milestones)

| สเต็ป | งานที่ต้องทำ | ไฟล์เป้าหมาย | ผลลัพธ์ที่คาดหวัง |
| :--- | :--- | :--- | :--- |
| **Phase 1** | เพิ่ม Schema ตาราง `news_digests` | `server/db/init.js` | ฐานข้อมูลรองรับการเก็บ Digest ทุกประเภท |
| **Phase 2** | สร้าง Engine รวบรวมและสังเคราะห์ข่าว | `server/services/newsDigest.js` | เรียก AI Gateway สรุป 4 หมวดได้คมกริบ |
| **Phase 3** | เปิด API Endpoints & ผูก Weekly Cron | `server/routes/news.js`<br>`server/crons/newsScheduler.js` | กดเจนผ่าน API ได้ + ออโต้รันทุกวันอาทิตย์ |
| **Phase 4** | สร้าง UI แท็บสรุป & ปุ่ม On-Demand | `src/components/news/NewsIntelPage.tsx`<br>`src/components/news/NewsDigestModal.tsx` | หน้าตาสวยหรู 0ms latency คอนทราสต์ชัดตาม Iron Rules |
| **Phase 5** | ทดสอบ & ดีพลอยขึ้น VPS ทันที | `npm run build` ➔ `scp dist/*` ➔ `pm2 reload stock-api` | ใช้งานจริงบน Production VPS ได้ทันที |

---

## 5. มาตรฐานการทดสอบและการส่งมอบ (Deployment Guardrails)
* ปฏิบัติตาม **Mandatory Instant Auto-Deploy Pipeline**:
  1. `npm run build` ตรวจสอบ TypeScript ไม่มี Error
  2. `node bump-cache.js` ป้องกันปัญหาแคชเบราว์เซอร์
  3. `git commit & push origin master`
  4. `scp -r dist/* root@185.250.38.247:/root/stock-portfolio/dist/`
  5. `ssh root@185.250.38.247 "pm2 reload stock-api"`
* ห้ามเปิด Browser Subagent ทดสอบเอง (ตามกฎ User Rules) ให้ตรวจสอบผ่าน API และ Code Inspection ตรงๆ เท่านั้น
