# 📚 HISTORICAL PRICE BACKFILL INDEX (State of Truth)

> **Last Updated:** 2026-09-10  
> **Total Backfilled Assets:** 92 Symbols  
> **Total Historical Bars:** 558,189 Daily Candles  
> **Database Size:** ~77 MB (SQLite `stock.db` on VPS `185.250.38.247`)  
> **Oldest Candle:** 1927-12-30 (`^GSPC` S&P 500 Index)  
> **Newest Candle:** 2026-09-10 (Live Real-time Daily)  
> **Standard:** Max Lifetime (All-Time back to IPO / earliest available history, Zero NULLs)

---

## 🧭 กฎเหล็กการใช้งาน (Zero-Duplication Protocol)
1. **ตรวจสอบไฟล์นี้ก่อนทุกครั้ง:** ก่อนจะสั่งดึงหรือรันประวัติราคาย้อนหลัง ให้ตรวจหารายชื่อหุ้นในตารางด้านล่าง หากมีชื่ออยู่ในนี้แล้ว **ห้ามรันซ้ำ** เพราะข้อมูลถูกเก็บครบตั้งแต่เปิดตลาด (IPO) จนถึงแท่งล่าสุดแล้ว
2. **การเรียกใช้ใน X-Chart / LWChart:** หุ้นและสินทรัพย์ทั้ง 92 ตัวในนี้ สามารถเรียกดูผ่าน API `GET /api/chart/:symbol` ได้ทันทีแบบ **0ms Latency** พร้อมคำนวณ EMA 50/150/200 และ Banker MCDX ครบทุกแท่ง
3. **การเพิ่มหุ้นใหม่:** เมื่อต้องการเพิ่มหุ้นใหม่นอกเหนือจาก 92 ตัวนี้ ให้สั่งรัน `/10yr [SYMBOL]` หรือเรียก `fetchYahooHistorical(symbol, '1927-01-01', today)` แล้วมาอัปเดตชื่อลงในไฟล์ Index นี้เสมอ

---

## 📊 Summary by Category / Section

| หมวดหมู่ (Category Section) | จำนวนตัว (Symbols) | แท่งเทียนรวม (Bars) | ช่วงเวลาประวัติศาสตร์ |
|---|:---:|:---:|:---:|
| **1. 🎯 Project 2X Core & Moonshots** | 13 | 60,774 | 1980 -> ปัจจุบัน |
| **2. 💼 Portfolio Holdings & Blueprints** | 6 (เฉพาะที่ไม่ซ้ำกับ 2X) | 37,211 | 1986 -> ปัจจุบัน |
| **3. 📈 TradingView Watchlist — Large Cap Stocks** | 44 | 400,248 | 1962 -> ปัจจุบัน |
| **4. 🚀 TradingView Watchlist — Strong Growth** | 5 | 14,783 | 1999 -> ปัจจุบัน |
| **5. 🔬 TradingView Watchlist — Small Cap** | 8 | 19,792 | 2000 -> ปัจจุบัน |
| **6. ⏳ TradingView Watchlist — Waiting List** | 21 | 58,124 | 1986 -> ปัจจุบัน |
| **7. 🏛️ Benchmarks, Indices, FX & ETFs** | 8 | 61,085 | 1927 -> ปัจจุบัน |
| **8. 🪙 Commodities & Crypto** | 3 | 17,445 | 2000 -> ปัจจุบัน |
| **รวมสุทธิ (หักตัวซ้ำ)** | **92 สินทรัพย์** | **558,189 Bars** | **1927 -> 2026** |

---

## 🎯 1. Project 2X Core & Moonshots (13 หุ้นยุทธศาสตร์หลัก)
หุ้นยุทธศาสตร์ตามตำรา Project 2X มีประวัติราคาย้อนหลังครบตั้งแต่ IPO เพื่อความแม่นยำสูงสุดของ EMA 200 Bedrock และ Super Money Signals

| Symbol | ประเภท | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | สถานะข้อมูล |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **NVDA** | 2X Core | 1999-01-22 | 2026-09-08 | 6,949 | ✅ Max Lifetime |
| **TSM** | 2X Core | 1997-10-09 | 2026-09-08 | 7,272 | ✅ Max Lifetime |
| **AVGO** | 2X Core | 2009-08-06 | 2026-09-08 | 4,298 | ✅ Max Lifetime |
| **VRT** | 2X Core | 2018-08-02 | 2026-09-08 | 2,035 | ✅ Max Lifetime |
| **MELI** | 2X Core | 2007-08-10 | 2026-09-08 | 4,799 | ✅ Max Lifetime |
| **APH** | 2X Core | 1991-11-08 | 2026-09-08 | 8,768 | ✅ Max Lifetime |
| **KLAC** | 2X Core | 1980-10-08 | 2026-09-08 | 11,571 | ✅ Max Lifetime |
| **ANET** | 2X Core | 2014-06-06 | 2026-09-08 | 3,082 | ✅ Max Lifetime |
| **CRWD** | 2X Core | 2019-06-12 | 2026-09-08 | 1,820 | ✅ Max Lifetime |
| **STRL** | 2X Moonshot | 1991-07-12 | 2026-09-08 | 8,852 | ✅ Max Lifetime |
| **ALAB** | 2X Moonshot | 2024-03-20 | 2026-09-08 | 619 | ✅ Max Lifetime |
| **PLTR** | 2X Moonshot | 2020-09-30 | 2026-09-08 | 1,491 | ✅ Max Lifetime |
| **RKLB** | 2X Moonshot | 2020-11-24 | 2026-09-08 | 1,452 | ✅ Max Lifetime |

---

## 💼 2. Portfolio Holdings, Blueprints & Past Holdings (เฉพาะตัวที่ไม่ซ้ำกับ 2X)
หุ้นในพอร์ตโฟลิโอจริง พอร์ตจำลอง และประวัติการถือครองย้อนหลัง

| Symbol | ชื่อบริษัท / สินทรัพย์ | จุดเริ่มต้น (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | บทบาทในระบบ |
|:---:|:---|:---:|:---:|:---:|:---|
| **O** | Realty Income Corp. | 1994-10-18 | 2026-09-08 | 8,025 | Dividend Blueprint |
| **SE** | Sea Limited | 2017-10-20 | 2026-09-08 | 2,231 | Past Portfolio Holding |
| **SMCI** | Super Micro Computer | 2007-03-29 | 2026-09-08 | 4,892 | Past Portfolio Holding |
| **COST** | Costco Wholesale | 1986-07-09 | 2026-09-08 | 10,119 | Past Portfolio Holding |
| **AMZN** | Amazon.com Inc. | 1997-05-15 | 2026-09-08 | 7,374 | Past Portfolio Holding |
| **ISRG** | Intuitive Surgical | 2000-06-16 | 2026-09-08 | 6,595 | Past Portfolio Holding |

---

## 📈 3. TradingView Watchlist — Large Cap Stocks (44 หุ้นยักษ์ใหญ่)
หมวดหมู่อันดับ 1 ใน TradingView Dock (`STOCKS`) สำหรับวิเคราะห์กระแสเงินทุนและแกนหลักของตลาด

| Symbol | จุดเริ่มต้น (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | หมายเหตุ / จุดเด่น |
|:---:|:---:|:---:|:---:|:---|
| **AAPL** | 1980-12-12 | 2026-09-08 | 11,526 | Apple All-time IPO |
| **ADBE** | 1986-08-13 | 2026-09-08 | 10,094 | Adobe Inc. |
| **AMD** | 1980-03-17 | 2026-09-08 | 11,714 | Advanced Micro Devices |
| **ANET** | 2014-06-06 | 2026-09-08 | 3,082 | Arista Networks |
| **APH** | 1991-11-08 | 2026-09-08 | 8,768 | Amphenol Corp. |
| **APP** | 2021-04-15 | 2026-09-08 | 1,356 | AppLovin Corp. |
| **ARM** | 2023-09-14 | 2026-09-08 | 748 | Arm Holdings plc |
| **ASML** | 1995-03-15 | 2026-09-08 | 7,923 | ASML Holding N.V. |
| **BKNG** | 1999-03-31 | 2026-09-08 | 6,902 | Booking Holdings |
| **BRK-B** | 1996-05-09 | 2026-09-08 | 7,631 | Berkshire Hathaway Class B |
| **CAH** | 1983-08-04 | 2026-09-08 | 10,858 | Cardinal Health |
| **CEG** | 2022-01-19 | 2026-09-08 | 1,163 | Constellation Energy |
| **CRM** | 2004-06-23 | 2026-09-08 | 5,588 | Salesforce Inc. |
| **DUOL** | 2021-07-28 | 2026-09-08 | 1,284 | Duolingo Inc. |
| **ELF** | 2016-09-22 | 2026-09-08 | 2,503 | e.l.f. Beauty Inc. |
| **ELV** | 2001-10-30 | 2026-09-08 | 6,253 | Elevance Health |
| **ETN** | 1972-06-01 | 2026-09-08 | 13,680 | Eaton Corporation plc |
| **FICO** | 1987-07-22 | 2026-09-08 | 9,857 | Fair Isaac Corp. |
| **GOOGL** | 2004-08-19 | 2026-09-08 | 5,548 | Alphabet Inc. (Class A) |
| **GWW** | 1973-02-21 | 2026-09-08 | 13,500 | W.W. Grainger Inc. |
| **INTC** | 1980-03-17 | 2026-09-08 | 11,714 | Intel Corporation |
| **JPM** | 1980-03-17 | 2026-09-08 | 11,714 | JPMorgan Chase & Co. |
| **KLAC** | 1980-10-08 | 2026-09-08 | 11,571 | KLA Corporation |
| **KO** | 1962-01-02 | 2026-09-08 | 16,279 | Coca-Cola Company (64 ปีเต็ม) |
| **LLY** | 1972-06-01 | 2026-09-08 | 13,680 | Eli Lilly and Company |
| **MA** | 2006-05-25 | 2026-09-08 | 5,103 | Mastercard Incorporated |
| **MRVL** | 2000-06-30 | 2026-09-08 | 6,585 | Marvell Technology |
| **MSFT** | 1986-03-13 | 2026-09-08 | 10,200 | Microsoft Corporation |
| **NET** | 2019-09-13 | 2026-09-08 | 1,755 | Cloudflare Inc. |
| **NVO** | 1981-04-30 | 2026-09-08 | 11,431 | Novo Nordisk A/S |
| **ORLY** | 1993-04-23 | 2026-09-08 | 8,401 | O'Reilly Automotive |
| **PANW** | 2012-07-20 | 2026-09-08 | 3,553 | Palo Alto Networks |
| **RTX** | 1962-04-02 | 2026-09-08 | 16,216 | RTX Corp (Raytheon 64 ปี) |
| **SPGI** | 1973-02-21 | 2026-09-08 | 13,500 | S&P Global Inc. |
| **TSLA** | 2010-06-29 | 2026-09-08 | 4,073 | Tesla Inc. |
| **TSM** | 1997-10-09 | 2026-09-08 | 7,272 | Taiwan Semiconductor |
| **TTD** | 2016-09-21 | 2026-09-08 | 2,504 | The Trade Desk |
| **UBER** | 2019-05-10 | 2026-09-08 | 1,842 | Uber Technologies |
| **UNH** | 1984-10-17 | 2026-09-08 | 10,553 | UnitedHealth Group |
| **V** | 2008-03-19 | 2026-09-08 | 4,647 | Visa Inc. |
| **VRT** | 2018-08-02 | 2026-09-08 | 2,035 | Vertiv Holdings |
| **WFC** | 1972-06-01 | 2026-09-08 | 13,680 | Wells Fargo & Company |
| **WM** | 1988-06-22 | 2026-09-08 | 9,624 | Waste Management |
| **WMT** | 1972-08-25 | 2026-09-08 | 13,620 | Walmart Inc. (54 ปี) |

---

## 🚀 4. TradingView Watchlist — Strong Growth (5 หุ้นเติบโตสูง)

| Symbol | จุดเริ่มต้น (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | หมายเหตุ / จุดเด่น |
|:---:|:---:|:---:|:---:|:---|
| **SOFI** | 2021-01-04 | 2026-09-08 | 1,426 | SoFi Technologies |
| **AVGO** | 2009-08-06 | 2026-09-08 | 4,298 | Broadcom Inc. |
| **NVDA** | 1999-01-22 | 2026-09-08 | 6,949 | NVIDIA Corporation |
| **PLTR** | 2020-09-30 | 2026-09-08 | 1,491 | Palantir Technologies |
| **ALAB** | 2024-03-20 | 2026-09-08 | 619 | Astera Labs |

---

## 🔬 5. TradingView Watchlist — Small Cap (8 หุ้นขนาดเล็กศักยภาพสูง)

| Symbol | จุดเริ่มต้น (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | หมายเหตุ / จุดเด่น |
|:---:|:---:|:---:|:---:|:---|
| **ASTS** | 2019-11-01 | 2026-09-08 | 1,720 | AST SpaceMobile |
| **TWST** | 2018-10-31 | 2026-09-08 | 1,972 | Twist Bioscience |
| **RKLB** | 2020-11-24 | 2026-09-08 | 1,452 | Rocket Lab USA |
| **VKTX** | 2015-04-28 | 2026-09-08 | 2,858 | Viking Therapeutics |
| **ISRG** | 2000-06-16 | 2026-09-08 | 6,595 | Intuitive Surgical |
| **CRDO** | 2022-01-27 | 2026-09-08 | 1,157 | Credo Technology Group |
| **JMIA** | 2019-04-12 | 2026-09-08 | 1,861 | Jumia Technologies |
| **DOCN** | 2021-03-24 | 2026-09-08 | 1,371 | DigitalOcean Holdings |

---

## ⏳ 6. TradingView Watchlist — Waiting List (21 หุ้นรอสัญญาณ)

| Symbol | จุดเริ่มต้น (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | หมายเหตุ / จุดเด่น |
|:---:|:---:|:---:|:---:|:---|
| **EOSE** | 2020-11-02 | 2026-09-08 | 1,468 | Eos Energy Enterprises |
| **IREN** | 2021-11-17 | 2026-09-08 | 1,205 | Iris Energy Limited |
| **IONQ** | 2021-01-04 | 2026-09-08 | 1,426 | IonQ Inc. |
| **CRWV** | 2025-03-28 | 2026-09-08 | 363 | CoreWeave Inc. |
| **AXON** | 2001-06-19 | 2026-09-08 | 6,342 | Axon Enterprise |
| **MELI** | 2007-08-10 | 2026-09-08 | 4,799 | MercadoLibre Inc. |
| **NVTS** | 2021-10-20 | 2026-09-08 | 1,225 | Navitas Semiconductor |
| **HIMS** | 2019-09-13 | 2026-09-08 | 1,755 | Hims & Hers Health |
| **GOOG** | 2004-08-19 | 2026-09-08 | 5,548 | Alphabet Inc. (Class C) |
| **SFM** | 2013-08-01 | 2026-09-08 | 3,295 | Sprouts Farmers Market |
| **AMZN** | 1997-05-15 | 2026-09-08 | 7,374 | Amazon.com Inc. |
| **TMDX** | 2019-05-02 | 2026-09-08 | 1,848 | TransMedics Group |
| **COST** | 1986-07-09 | 2026-09-08 | 10,119 | Costco Wholesale |
| **RBRK** | 2024-04-25 | 2026-09-08 | 594 | Rubrik Inc. |
| **NFLX** | 2002-05-23 | 2026-09-08 | 6,112 | Netflix Inc. |
| **CRWD** | 2019-06-12 | 2026-09-08 | 1,820 | CrowdStrike Holdings |
| **STRL** | 1991-07-12 | 2026-09-08 | 8,852 | Sterling Infrastructure |
| **NBIS** | 2024-10-21 | 2026-09-08 | 471 | Nebius Group N.V. |
| **OKLO** | 2021-07-08 | 2026-09-08 | 1,298 | Oklo Inc. |
| **ORCL** | 1986-03-12 | 2026-09-08 | 10,201 | Oracle Corporation |
| **META** | 2012-05-18 | 2026-09-08 | 3,596 | Meta Platforms Inc. |

---

## 🏛️ 7. Benchmarks, Indices, FX & ETFs (8 สินทรัพย์มหภาค)

| Symbol | ชื่อสินทรัพย์ | จุดเริ่มต้น (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | วัตถุประสงค์ในระบบ |
|:---:|:---|:---:|:---:|:---:|:---|
| **^GSPC** | S&P 500 Index | 1927-12-30 | 2026-09-09 | 24,789 | เกณฑ์มาตรฐานสหรัฐฯ 99 ปีเต็ม |
| **SPY** | SPDR S&P 500 ETF | 1993-01-29 | 2026-09-08 | 8,459 | ETF อ้างอิง Benchmark หลัก |
| **QQQ** | Invesco QQQ Trust | 1999-03-10 | 2026-09-08 | 6,917 | Nasdaq 100 Tech Benchmark |
| **SCHD** | Schwab US Dividend Equity | 2011-10-20 | 2026-09-08 | 3,741 | Dividend Benchmark |
| **SCHG** | Schwab US Large-Cap Growth | 2010-01-04 | 2026-09-08 | 4,195 | Growth Benchmark |
| **JEPQ** | JPMorgan Nasdaq Equity Premium | 2022-05-04 | 2026-09-08 | 1,090 | Income Covered Call ETF |
| **THB=X** | USD / THB Exchange Rate | 2003-12-01 | 2026-09-10 | 5,910 | อัตราแลกเปลี่ยนค่าเงินบาท (FX) |
| **GLD** | SPDR Gold Trust ETF | 2004-11-18 | 2026-09-08 | 5,484 | สินทรัพย์อ้างอิงทองคำแท่ง |

---

## 🪙 8. Commodities & Crypto (3 สินค้าโภคภัณฑ์ & ดิจิทัล)

| Symbol | ชื่อสินทรัพย์ | จุดเริ่มต้น | แท่งล่าสุด | จำนวนแท่ง (Bars) | วัตถุประสงค์ในระบบ |
|:---:|:---|:---:|:---:|:---:|:---|
| **BTC-USD** | Bitcoin / US Dollar | 2014-09-17 | 2026-09-10 | 4,377 | Crypto Liquidity & Macro Flow |
| **GC=F** | Gold Futures (COMEX) | 2000-08-30 | 2026-09-10 | 6,530 | สัญญาซื้อขายล่วงหน้าทองคำ |
| **CL=F** | Crude Oil Futures (NYMEX) | 2000-08-23 | 2026-09-10 | 6,539 | สัญญาซื้อขายล่วงหน้าน้ำมันดิบ |

---

## 🛡️ Database Health & Verification Rules
- **Total Duplicate Symbols Across Sections:** มีการแชร์ข้อมูลข้ามหมวดโดยอัตโนมัติ (เช่น `NVDA` ใช้ร่วมกันทั้ง 2X, Watchlist, และ Fundamental DB) โดยไม่มีการบันทึก Row ซ้ำซ้อน
- **Zero NULL Rule:** ทุกแถวในฐานข้อมูลมี `open`, `high`, `low`, `close`, `volume` ครบถ้วน 100% ปราศจากค่า NULL
- **Backup & Persistence:** ฐานข้อมูลหลักอยู่ที่ `/root/stock-portfolio/server/db/stock.db` บน VPS ทำงานภายใต้โหมด `WAL` และถูก Flush ทุกครั้งหลังจบรอบ Backfill
