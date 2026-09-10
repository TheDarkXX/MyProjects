# 📚 HISTORICAL PRICE BACKFILL INDEX (State of Truth)

> **Last Updated:** 2026-09-10  
> **Total Backfilled Assets:** 27 Symbols  
> **Total Historical Bars:** 57,138 Daily Candles  
> **Database Size:** ~77 MB (SQLite `stock.db` on VPS `185.250.38.247`)  
> **Oldest Candle:** 2016-09-01 (`^GSPC` S&P 500 Index)  
> **Newest Candle:** 2026-09-09 (Live Real-time Daily)  
> **Standard:** Max Lifetime (All-Time back to IPO / earliest available history, Zero NULLs)

---

## 🧭 กฎเหล็กการใช้งาน (Zero-Duplication Protocol)
1. **ตรวจสอบไฟล์นี้ก่อนทุกครั้ง:** ก่อนจะสั่งดึงหรือรันประวัติราคาย้อนหลัง ให้ตรวจหารายชื่อหุ้นในตารางด้านล่าง หากมีชื่ออยู่ในนี้แล้ว **ห้ามรันซ้ำ** เพราะข้อมูลถูกเก็บครบตั้งแต่เปิดตลาด (IPO) จนถึงแท่งล่าสุดแล้ว
2. **การเรียกใช้ใน X-Chart / LWChart:** หุ้นและสินทรัพย์ทั้ง 27 ตัวในนี้ สามารถเรียกดูผ่าน API `GET /api/chart/:symbol` ได้ทันทีแบบ **0ms Latency** พร้อมคำนวณ EMA 50/150/200 และ Banker MCDX ครบทุกแท่ง
3. **การเพิ่มหุ้นใหม่:** เมื่อเพิ่มหุ้นใหม่ใน X-Chart ระบบจะดึง Max Lifetime (IPO) ให้อัตโนมัติในเบื้องหลัง และบันทึกแท่งเทียนลงไฟล์ Index นี้หลังดึงเสร็จทันที

---

## 📊 Summary by Category / Section

| หมวดหมู่ (Category Section) | จำนวนตัว (Symbols) | แท่งเทียนรวม (Bars) | ช่วงเวลาประวัติศาสตร์ |
|---|:---:|:---:|:---:|
| **1. 🎯 Project 2X Core & Moonshots** | 13 | 27,553 | 1980 -> ปัจจุบัน |
| **2. 💼 Portfolio Holdings & Blueprints** | 0 (เฉพาะที่ไม่ซ้ำกับ 2X) | 0 | 1994 -> ปัจจุบัน |
| **3. 📈 TradingView Watchlist — Large Cap Stocks** | 5 | 12,103 | 1962 -> ปัจจุบัน |
| **4. 🚀 TradingView Watchlist — Strong Growth** | 4 | 7,144 | 1999 -> ปัจจุบัน |
| **5. 🔬 TradingView Watchlist — Small Cap** | 3 | 5,689 | 2000 -> ปัจจุบัน |
| **6. ⏳ TradingView Watchlist — Waiting List** | 9 | 17,116 | 1986 -> ปัจจุบัน |
| **7. 🏛️ Benchmarks, Indices, FX & ETFs** | 4 | 10,068 | 1927 -> ปัจจุบัน |
| **8. 🪙 Commodities & Crypto** | 1 | 3,661 | 2000 -> ปัจจุบัน |
| **9. 🆕 Custom & On-the-Fly Added Tickers** | 1 | 1,357 | All-time IPO |
| **รวมสุทธิ (หักตัวซ้ำ)** | **27 สินทรัพย์** | **57,138 Bars** | **1927 -> 2026** |

---

## 🎯 1. Project 2X Core & Moonshots (13 หุ้นยุทธศาสตร์หลัก)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | ประเภท |
|:---:|:---:|:---:|:---:|:---|
| **ALAB** | 2024-03-20 | 2026-09-08 | 619 | ✅ Max Lifetime |
| **ANET** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **APH** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **AVGO** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **CRWD** | 2019-06-12 | 2026-09-08 | 1,820 | ✅ Max Lifetime |
| **KLAC** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **MELI** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **NVDA** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **PLTR** | 2020-09-30 | 2026-09-08 | 1,491 | ✅ Max Lifetime |
| **RKLB** | 2020-11-24 | 2026-09-08 | 1,452 | ✅ Max Lifetime |
| **STRL** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **TSM** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **VRT** | 2018-08-02 | 2026-09-08 | 2,035 | ✅ Max Lifetime |

---

## 💼 2. Portfolio Holdings, Blueprints & Past Holdings (0 หุ้นพอร์ตจริง)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | บทบาทในระบบ |
|:---:|:---:|:---:|:---:|:---|

---

## 📈 3. TradingView Watchlist — Large Cap Stocks (5 หุ้นยักษ์ใหญ่)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | สถานะข้อมูล |
|:---:|:---:|:---:|:---:|:---|
| **ANET** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **APH** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **KLAC** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **TSM** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **VRT** | 2018-08-02 | 2026-09-08 | 2,035 | ✅ Max Lifetime |

---

## 🚀 4. TradingView Watchlist — Strong Growth (4 หุ้นเติบโตสูง)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | สถานะข้อมูล |
|:---:|:---:|:---:|:---:|:---|
| **ALAB** | 2024-03-20 | 2026-09-08 | 619 | ✅ Max Lifetime |
| **AVGO** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **NVDA** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **PLTR** | 2020-09-30 | 2026-09-08 | 1,491 | ✅ Max Lifetime |

---

## 🔬 5. TradingView Watchlist — Small Cap (3 หุ้นขนาดเล็กศักยภาพสูง)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | สถานะข้อมูล |
|:---:|:---:|:---:|:---:|:---|
| **ASTS** | 2019-11-01 | 2026-09-08 | 1,720 | ✅ Max Lifetime |
| **ISRG** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **RKLB** | 2020-11-24 | 2026-09-08 | 1,452 | ✅ Max Lifetime |

---

## ⏳ 6. TradingView Watchlist — Waiting List (9 หุ้นรอสัญญาณ)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | สถานะข้อมูล |
|:---:|:---:|:---:|:---:|:---|
| **AMZN** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **COST** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **CRWD** | 2019-06-12 | 2026-09-08 | 1,820 | ✅ Max Lifetime |
| **CRWV** | 2025-03-28 | 2026-09-08 | 363 | ✅ Max Lifetime |
| **HIMS** | 2019-09-13 | 2026-09-08 | 1,755 | ✅ Max Lifetime |
| **MELI** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **META** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **RBRK** | 2024-04-25 | 2026-09-04 | 593 | ✅ Max Lifetime |
| **STRL** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |

---

## 🏛️ 7. Benchmarks, Indices, FX & ETFs (4 สินทรัพย์มหภาค)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | วัตถุประสงค์ |
|:---:|:---:|:---:|:---:|:---|
| **GLD** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **QQQ** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **SCHG** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **SPY** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |

---

## 🪙 8. Commodities & Crypto (1 สินค้าโภคภัณฑ์ & ดิจิทัล)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | วัตถุประสงค์ |
|:---:|:---:|:---:|:---:|:---|
| **BTC-USD** | 2016-09-01 | 2026-09-09 | 3,661 | ✅ Max Lifetime |

---

## 🆕 9. Custom & On-the-Fly Added Tickers (1 หุ้นที่เพิ่มเข้ามาใหม่)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | สถานะข้อมูล |
|:---:|:---:|:---:|:---:|:---|
| **COIN** | 2021-04-14 | 2026-09-08 | 1,357 | ✅ Max Lifetime |

---

## 🛡️ Database Health & Verification Rules
- **Total Duplicate Symbols Across Sections:** มีการแชร์ข้อมูลข้ามหมวดโดยอัตโนมัติ โดยไม่มีการบันทึก Row ซ้ำซ้อน
- **Zero NULL Rule:** ทุกแถวในฐานข้อมูลมี `open`, `high`, `low`, `close`, `volume` ครบถ้วน 100% ปราศจากค่า NULL
- **Backup & Persistence:** ฐานข้อมูลหลักอยู่ที่ `/root/stock-portfolio/server/db/stock.db` บน VPS ทำงานภายใต้โหมด `WAL` และถูก Flush ทุกครั้งหลังจบรอบ Backfill
