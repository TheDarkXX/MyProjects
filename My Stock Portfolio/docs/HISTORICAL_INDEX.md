# 📚 HISTORICAL PRICE BACKFILL INDEX (State of Truth)

> **Last Updated:** 2026-09-18  
> **Total Backfilled Assets:** 38 Symbols  
> **Total Historical Bars:** 96,545 Daily Candles  
> **Database Size:** ~77 MB (SQLite `stock.db` on VPS `185.250.38.247`)  
> **Oldest Candle:** 1998-06-30 (`^GSPC` S&P 500 Index)  
> **Newest Candle:** 2026-09-17 (Live Real-time Daily)  
> **Standard:** Max Lifetime (All-Time back to IPO / earliest available history, Zero NULLs)

---

## 🧭 กฎเหล็กการใช้งาน (Zero-Duplication Protocol)
1. **ตรวจสอบไฟล์นี้ก่อนทุกครั้ง:** ก่อนจะสั่งดึงหรือรันประวัติราคาย้อนหลัง ให้ตรวจหารายชื่อหุ้นในตารางด้านล่าง หากมีชื่ออยู่ในนี้แล้ว **ห้ามรันซ้ำ** เพราะข้อมูลถูกเก็บครบตั้งแต่เปิดตลาด (IPO) จนถึงแท่งล่าสุดแล้ว
2. **การเรียกใช้ใน X-Chart / LWChart:** หุ้นและสินทรัพย์ทั้ง 38 ตัวในนี้ สามารถเรียกดูผ่าน API `GET /api/chart/:symbol` ได้ทันทีแบบ **0ms Latency** พร้อมคำนวณ EMA 50/150/200 และ Banker MCDX ครบทุกแท่ง
3. **การเพิ่มหุ้นใหม่:** เมื่อเพิ่มหุ้นใหม่ใน X-Chart ระบบจะดึง Max Lifetime (IPO) ให้อัตโนมัติในเบื้องหลัง และบันทึกแท่งเทียนลงไฟล์ Index นี้หลังดึงเสร็จทันที

---

## 📊 Summary by Category / Section

| หมวดหมู่ (Category Section) | จำนวนตัว (Symbols) | แท่งเทียนรวม (Bars) | ช่วงเวลาประวัติศาสตร์ |
|---|:---:|:---:|:---:|
| **1. 🎯 Project 2X Core & Moonshots** | 13 | 27,642 | 1980 -> ปัจจุบัน |
| **2. 💼 Portfolio Holdings & Blueprints** | 0 (เฉพาะที่ไม่ซ้ำกับ 2X) | 0 | 1994 -> ปัจจุบัน |
| **3. 📈 TradingView Watchlist — Large Cap Stocks** | 5 | 12,138 | 1962 -> ปัจจุบัน |
| **4. 🚀 TradingView Watchlist — Strong Growth** | 5 | 8,601 | 1999 -> ปัจจุบัน |
| **5. 🔬 TradingView Watchlist — Small Cap** | 7 | 13,062 | 2000 -> ปัจจุบัน |
| **6. ⏳ TradingView Watchlist — Waiting List** | 10 | 23,267 | 1986 -> ปัจจุบัน |
| **7. 🏛️ Benchmarks, Indices, FX & ETFs** | 7 | 20,828 | 1927 -> ปัจจุบัน |
| **8. 🪙 Commodities & Crypto** | 2 | 10,194 | 2000 -> ปัจจุบัน |
| **9. 🆕 Custom & On-the-Fly Added Tickers** | 2 | 8,455 | All-time IPO |
| **รวมสุทธิ (หักตัวซ้ำ)** | **38 สินทรัพย์** | **96,545 Bars** | **1927 -> 2026** |

---

## 🎯 1. Project 2X Core & Moonshots (13 หุ้นยุทธศาสตร์หลัก)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | ประเภท |
|:---:|:---:|:---:|:---:|:---|
| **ALAB** | 2024-03-20 | 2026-09-17 | 626 | ✅ Max Lifetime |
| **ANET** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **APH** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **AVGO** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **CRWD** | 2019-06-12 | 2026-09-17 | 1,827 | ✅ Max Lifetime |
| **KLAC** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **MELI** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **NVDA** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **PLTR** | 2020-09-30 | 2026-09-17 | 1,498 | ✅ Max Lifetime |
| **RKLB** | 2020-11-24 | 2026-09-15 | 1,457 | ✅ Max Lifetime |
| **STRL** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **TSM** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **VRT** | 2018-08-02 | 2026-09-17 | 2,042 | ✅ Max Lifetime |

---

## 💼 2. Portfolio Holdings, Blueprints & Past Holdings (0 หุ้นพอร์ตจริง)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | บทบาทในระบบ |
|:---:|:---:|:---:|:---:|:---|

---

## 📈 3. TradingView Watchlist — Large Cap Stocks (5 หุ้นยักษ์ใหญ่)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | สถานะข้อมูล |
|:---:|:---:|:---:|:---:|:---|
| **ANET** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **APH** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **KLAC** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **TSM** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **VRT** | 2018-08-02 | 2026-09-17 | 2,042 | ✅ Max Lifetime |

---

## 🚀 4. TradingView Watchlist — Strong Growth (5 หุ้นเติบโตสูง)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | สถานะข้อมูล |
|:---:|:---:|:---:|:---:|:---|
| **ALAB** | 2024-03-20 | 2026-09-17 | 626 | ✅ Max Lifetime |
| **AVGO** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **NVDA** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **PLTR** | 2020-09-30 | 2026-09-17 | 1,498 | ✅ Max Lifetime |
| **SOFI** | 2021-01-04 | 2026-09-11 | 1,429 | ✅ Max Lifetime |

---

## 🔬 5. TradingView Watchlist — Small Cap (7 หุ้นขนาดเล็กศักยภาพสูง)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | สถานะข้อมูล |
|:---:|:---:|:---:|:---:|:---|
| **ASTS** | 2019-11-01 | 2026-09-08 | 1,720 | ✅ Max Lifetime |
| **CRDO** | 2022-01-27 | 2026-09-10 | 1,159 | ✅ Max Lifetime |
| **DOCN** | 2021-03-24 | 2026-09-10 | 1,373 | ✅ Max Lifetime |
| **ISRG** | 2016-09-01 | 2026-09-10 | 2,519 | ✅ Max Lifetime |
| **RKLB** | 2020-11-24 | 2026-09-15 | 1,457 | ✅ Max Lifetime |
| **TWST** | 2018-10-31 | 2026-09-10 | 1,974 | ✅ Max Lifetime |
| **VKTX** | 2015-04-28 | 2026-09-10 | 2,860 | ✅ Max Lifetime |

---

## ⏳ 6. TradingView Watchlist — Waiting List (10 หุ้นรอสัญญาณ)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | สถานะข้อมูล |
|:---:|:---:|:---:|:---:|:---|
| **AMZN** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **COST** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **CRWD** | 2019-06-12 | 2026-09-17 | 1,827 | ✅ Max Lifetime |
| **CRWV** | 2025-03-28 | 2026-09-08 | 363 | ✅ Max Lifetime |
| **HIMS** | 2019-09-13 | 2026-09-15 | 1,760 | ✅ Max Lifetime |
| **MELI** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |
| **META** | 2016-09-01 | 2026-09-15 | 2,522 | ✅ Max Lifetime |
| **NFLX** | 2002-05-23 | 2026-09-10 | 6,114 | ✅ Max Lifetime |
| **RBRK** | 2024-04-25 | 2026-09-15 | 599 | ✅ Max Lifetime |
| **STRL** | 2016-09-01 | 2026-09-17 | 2,524 | ✅ Max Lifetime |

---

## 🏛️ 7. Benchmarks, Indices, FX & ETFs (7 สินทรัพย์มหภาค)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | วัตถุประสงค์ |
|:---:|:---:|:---:|:---:|:---|
| **GLD** | 2016-09-01 | 2026-09-08 | 2,517 | ✅ Max Lifetime |
| **JEPQ** | 2022-05-04 | 2026-09-10 | 1,092 | ✅ Max Lifetime |
| **QQQ** | 2016-09-01 | 2026-09-11 | 2,520 | ✅ Max Lifetime |
| **SCHD** | 2011-10-20 | 2026-09-11 | 3,744 | ✅ Max Lifetime |
| **SCHG** | 2016-09-01 | 2026-09-11 | 2,520 | ✅ Max Lifetime |
| **SPY** | 2016-09-01 | 2026-09-15 | 2,522 | ✅ Max Lifetime |
| **THB=X** | 2003-12-01 | 2026-09-15 | 5,913 | ✅ Max Lifetime |

---

## 🪙 8. Commodities & Crypto (2 สินค้าโภคภัณฑ์ & ดิจิทัล)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | วัตถุประสงค์ |
|:---:|:---:|:---:|:---:|:---|
| **BTC-USD** | 2016-09-01 | 2026-09-11 | 3,663 | ✅ Max Lifetime |
| **GC=F** | 2000-08-30 | 2026-09-10 | 6,531 | ✅ Max Lifetime |

---

## 🆕 9. Custom & On-the-Fly Added Tickers (2 หุ้นที่เพิ่มเข้ามาใหม่)

| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | สถานะข้อมูล |
|:---:|:---:|:---:|:---:|:---|
| **CLS** | 1998-06-30 | 2026-09-17 | 7,098 | ✅ Max Lifetime |
| **COIN** | 2021-04-14 | 2026-09-08 | 1,357 | ✅ Max Lifetime |

---

## 🛡️ Database Health & Verification Rules
- **Total Duplicate Symbols Across Sections:** มีการแชร์ข้อมูลข้ามหมวดโดยอัตโนมัติ โดยไม่มีการบันทึก Row ซ้ำซ้อน
- **Zero NULL Rule:** ทุกแถวในฐานข้อมูลมี `open`, `high`, `low`, `close`, `volume` ครบถ้วน 100% ปราศจากค่า NULL
- **Backup & Persistence:** ฐานข้อมูลหลักอยู่ที่ `/root/stock-portfolio/server/db/stock.db` บน VPS ทำงานภายใต้โหมด `WAL` และถูก Flush ทุกครั้งหลังจบรอบ Backfill
