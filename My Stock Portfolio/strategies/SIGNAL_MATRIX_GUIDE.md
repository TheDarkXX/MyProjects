# ⚡ PROJECT 2X: SIGNAL MATRIX GUIDE (7-Tier Cyber Action Matrix x 16-Scenario Classifier)
### *เอกสารนี้สะท้อนโค้ดจริง — Source of Truth คือ `server/services/project2xEngine.js` → `classifyScenario()`*

> [!IMPORTANT]
> **กฎ Source of Truth:** ถ้าเอกสารนี้ขัดกับโค้ด ให้เชื่อโค้ด แล้วแก้เอกสาร ห้ามแก้ตัวเลขในเอกสารโดยไม่แก้โค้ด (และกลับกัน)
> ตัวเลข Threshold ทั้งหมดด้านล่างคัดลอกจากโค้ด ณ วันที่ 2026-10-03

---

## 1. อินพุตหลักของระบบ

| อินพุต | นิยามในโค้ด | หมายเหตุ |
| :--- | :--- | :--- |
| **Banker MCDX** | `min(20, max(0, 1.5 × (RSI50 − 50)))` | **สเกล 0–20** (ไม่ใช่ 0–100%) ถ้า RSI50 ≤ 50 → Banker = 0 |
| **d150 / d200** | % ระยะห่างราคาจาก EMA 150 / EMA 200 | ค่าลบ = อยู่ใต้เส้น |
| **EMA 9 Trigger** | ราคายืนเหนือ EMA 9 หรือไม่ | ตัวปลดล็อกสัญญาณซื้อ |
| **Regime** | BULL / NEUTRAL / BEAR (โครงสร้าง EMA) | BEAR ปิดสัญญาณซื้อเกือบทั้งหมด |
| **daysBelowEma200 / daysBankerZero** | จำนวนวันที่อยู่ใต้ EMA 200 / Banker = 0 ติดกัน | ใช้แยก "พักฐาน" ออกจาก "พังจริง" |
| **category** | Core / Moonshot | Moonshot ได้เกณฑ์ Overbought กว้างกว่า (25% vs 15%) |

---

## 2. 7-Tier Traffic Light (สัญญาณไฟ 7 สี)

| Traffic Light | ความหมาย | คำสั่ง |
| :--- | :--- | :--- |
| 🚨 **MAYDAY_EXIT** | มีหุ้นในมือ + โครงสร้างพังใต้ EMA 200 | พิจารณาตัดขาดทุน / ลดความเสี่ยง |
| 🔪 **FALLING_KNIFE** | ยังไม่มีหุ้น + ดิ่งใต้ EMA 200 | **ห้ามรับมีด** รอ |
| 🩸 **SLOW_BLEED** | ไหลซึมใต้ EMA 200 + Banker = 0 ≥ 8 วัน | ถือเงินสด รอโครงสร้างฟื้น |
| 🟢 **BUY_NOW** | ยืนยันกลับตัว/เบรกเอาต์ครบเงื่อนไข | ลงกระสุนตาม Tranche ในตารางข้อ 3 |
| 🟡 **GET_READY** | ใกล้แนวรับ/ฐาน แต่ยังไม่ครบ Trigger | เตรียมกระสุน รอแท่งเขียว + ยืนเหนือ EMA 9 |
| 🛰️ **ON_RADAR** | ไม่มี Edge ชัด / Overbought ที่ยังไม่มีของ | เฝ้าดู ห้ามไล่ราคา |
| 🚀 **TO_THE_MOON** | เทรนด์แข็งแรง (มีของอยู่แล้ว) | ถือรันเทรนด์ ไม่ซื้อเพิ่ม |

---

## 3. 16 Scenarios (เรียงตามลำดับความสำคัญในโค้ด — เจอข้อแรกที่เข้าเงื่อนไข ก็จบ)

### Layer 0 — Veto Guards (ปกป้องเงินต้นมาก่อนทุกอย่าง)
| # | ชื่อ | เงื่อนไขหลัก | ไฟ |
| :---: | :--- | :--- | :--- |
| 1 | Falling Knife | d200 < −12% (BULL) หรือ < −10% (อื่นๆ) **และ** Banker = 0 | MAYDAY_EXIT / FALLING_KNIFE |
| 2 | Dead Cat Bounce | d200 < −10% + Banker 1–6 + Regime BEAR | MAYDAY_EXIT / FALLING_KNIFE |
| 3 | Core Breakdown | BEAR: d200 < −4% ≥ 3 วัน / อื่นๆ: d200 < −5% ≥ 5 วัน + Banker ≤ 1 | MAYDAY_EXIT / FALLING_KNIFE |
| 4 | Slow Bleed | d200 < −3.5% (BEAR) หรือ < −5% + Banker = 0 ≥ 8 วัน | SLOW_BLEED |

### Layer 1 — Confirmed Reversal / Breakout
| # | ชื่อ | เงื่อนไขหลัก | Tranche ในโค้ด |
| :---: | :--- | :--- | :---: |
| 5 | Double Bottom | Retest EMA 200 ฐานยกสูง + Banker ≥ 1 + เหนือ EMA 9 + ไม่ใช่ BEAR | 100% |
| 6 | Bear Trap Reclaim | หลุดหลอกแล้วกลับเหนือ EMA 200 + เหนือ EMA 9 + Banker ≥ 1 | 75–100% |
| 7 | Base Breakout | เบรกกรอบแคบใกล้ EMA + วอลุ่ม + เหนือ EMA 9 | 100% |

### Layer 2 — Dip Buy ที่แนวรับใหญ่
* **โซนแนวรับ:** ใกล้ EMA 200 (d200 ระหว่าง −5% ถึง +2.5% ใน BULL/NEUTRAL, −3.5% ใน BEAR) หรือใกล้ EMA 150 (d150 −3% ถึง +2%)

| # | ชื่อ | เงื่อนไขหลัก | ไฟ / Tranche |
| :---: | :--- | :--- | :--- |
| 8 | V-Shape Rebound | อยู่ในโซน + Banker ≥ 1 + เหนือ EMA 9 + แท่งเขียว | BUY_NOW (BULL 100% / NEUTRAL 75%) |
| 9 | Testing Support | อยู่ในโซน + Banker ≥ 1 แต่ยังใต้ EMA 9 หรือแดง ≥ 2 แท่ง | GET_READY (Dip Buy) |

### Layer 3–4 — Accumulation / Setup
| # | ชื่อ | เงื่อนไขหลัก | ไฟ |
| :---: | :--- | :--- | :--- |
| 10 | EMA 50 Shallow Dip | d50 −2% ถึง +1.5%, d150 > 3%, BULL, Banker ≥ 5, แท่งเขียว | GET_READY |
| 11 | Regime Flip | Golden Cross EMA 50 > 200 + Banker ≥ 3 | GET_READY |
| 12 | Sideway Base | กอด EMA 200 ≥ 5 วัน + Banker ≥ 2 + RSI14 35–62 + วอลุ่มแห้ง | GET_READY |
| 13 | Early Bird / Divergence | อยู่ในโซนแต่ Banker < 1 หรือยังแดง / หรือ RSI Bullish Divergence | GET_READY |

### Layer 5 — Trend / Overbought
| # | ชื่อ | เงื่อนไขหลัก | ไฟ |
| :---: | :--- | :--- | :--- |
| 14 | Overbought | d150 > 15% (Core) / > 25% (Moonshot) + Banker ≥ 12 | มีของ: TO_THE_MOON / ไม่มีของ: ON_RADAR (ห้ามไล่) |
| 15 | Trend Runner | BULL + เหนือ EMA 50 + d150 > 4% + Banker ≥ 10 + เหนือ EMA 9 | TO_THE_MOON |
| 16 | Default | ไม่เข้าเงื่อนไขใด / ข้อมูลไม่พอ | GET_READY หรือ ON_RADAR |

---

## 4. 🎯 บทสรุปผลการทดสอบ & ยุทธศาสตร์ลูกผสม 80/20 (Hybrid Execution Rule)

> 🔬 **ดูตารางและตัวเลขสถิติย้อนหลัง 10 ปี (96,545 แท่งเทียน) ฉบับเต็มได้ที่:** [BACKTEST_SIGNAL_VS_DCA_AUDIT.md](file:///C:/My%20Claw/MyProjects/My%20Stock%20Portfolio/strategies/BACKTEST_SIGNAL_VS_DCA_AUDIT.md)

จากผลการทดสอบย้อนหลัง 10 ปี (2016–2026) ใน `stock.db` ได้ข้อสรุปเชิงนโยบายที่ปลดล็อกระบบ 100%:

1. **บทบาทที่แท้จริงของสัญญาณ BUY_NOW:**
   * ในรอบ 10 ปี ไฟเขียวเกิดปีละ 1–3 ครั้งต่อหุ้น จำลองกระเป๋าเงินจริงแล้ว **DCA ชนะทุกตัว**
   * สัญญาณได้เปรียบเล็กน้อยเฉพาะหุ้นโตสม่ำเสมอ ผันผวนต่ำ (APH, TSM, ANET) และ **เสียเปรียบชัด** ในหุ้นโมเมนตัมแรง (VRT, CRWD, PLTR, NVDA)
   * **คำสั่งปฏิบัติการ:** ใช้ `BUY_NOW` เป็นตัวช่วยตัดสินใจลง "เงินก้อนพิเศษ" ในกลุ่มโตสม่ำเสมอเท่านั้น ไม่ใช้กับเงินรายเดือน
2. **เครื่องยนต์หลัก (Systematic Monthly DCA):**
   * เงินเติมรายเดือนเข้าหุ้น Core ทุกต้นเดือนตามสัดส่วนเป้าหมาย ไม่ต้องรอกราฟ (ฐานวางแผน 20–26% ต่อปี)
3. **การคลี่คลายข้อขัดแย้งของกฎฝั่งขาย (Core vs Moonshot):**
   * **สำหรับหุ้น Core 8 ราชันย์:** ยึดกฎ **"20-Year Dynasty Playbook (ไม่ขายผู้ชนะ)"** เป็นหลัก การที่ราคาหลุด EMA 200 ชั่วคราวจากตลาดตกใจ **ห้ามขายทิ้งเด็ดขาด** จะขายทิ้ง 100% เฉพาะเมื่อเข้าเงื่อนไข **Moat Breaker (พื้นฐานพัง / เสียความได้เปรียบทางธุรกิจจริง)** เท่านั้น
   * **สำหรับหุ้น Moonshot (11%):** หากหลุด EMA 200 ต่อเนื่อง + Banker = 0 (Scenario 1–3) ให้คัทลอสตามสัญญาณ MAYDAY_EXIT ทันทีเพื่อรักษากระสุน
   * ⚠️ **โค้ดยังไม่ตรงกับนโยบายนี้:** `classifyScenario()` ยังส่ง MAYDAY_EXIT ให้หุ้น Core อยู่ ต้องแก้โค้ดให้ Core แสดงเป็น "ตรวจพื้นฐาน" แทน

---

*เอกสารเชื่อมโยง:*
* [BACKTEST_SIGNAL_VS_DCA_AUDIT.md](file:///C:/My%20Claw/MyProjects/My%20Stock%20Portfolio/strategies/BACKTEST_SIGNAL_VS_DCA_AUDIT.md) — ผลทดสอบคณิตศาสตร์ 10 ปี
* [PROJECT_2X_EXECUTION_PLAYBOOK.md](file:///C:/My%20Claw/MyProjects/My%20Stock%20Portfolio/strategies/PROJECT_2X_EXECUTION_PLAYBOOK.md) — แผนปฏิบัติการพอร์ตจริง
* [PROJECT_2X_REAL_LIFE_FREEDOM_PLAYBOOK.md](file:///C:/My%20Claw/MyProjects/My%20Stock%20Portfolio/strategies/PROJECT_2X_REAL_LIFE_FREEDOM_PLAYBOOK.md) — แผนการเงินและอิสรภาพชีวิต
* [project2xEngine.js](file:///C:/My%20Claw/MyProjects/My%20Stock%20Portfolio/server/services/project2xEngine.js) — `classifyScenario()` (Source of Truth)

