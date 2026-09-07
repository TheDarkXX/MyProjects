# 🗺️ MASTER ROADMAP & SOT (State of Truth)

> **Iron Rule:** ความจริงต้องอยู่ในไฟล์ ไม่ใช่อยู่ในแชท
> ไฟล์นี้คือภาพรวมระดับ "นกมอง (Bird's-eye view)" ของทั้งโปรเจกต์ เพื่อให้รู้ว่าตอนนี้ระบบไหนอยู่สถานะอะไร และงานต่อไปคืออะไร 
> *ห้ามใส่รายละเอียดโค้ดที่นี่ ให้ทำ Link (Absolute path) ไปหาไฟล์ในโฟลเดอร์ `Quick Save/` แทน*

## 🟢 1. Active Phases (กำลังทำ)
- **[My Stock Portfolio] Production Stabilization & Consensus Momentum Tracking**: ติดตามการสะสมประวัติ Wall Street Consensus รายวันในตาราง SQLite เพื่อปลดล็อกสัญญาณ Momentum ทิศทางสถาบัน และติดตามผลลัพธ์การใช้งานจริงของ Human-First Execution Cards
  - 📂 **Context File**: [V2.9.0_[impl]_advisor_human-first-execution-strategies-capital-funding-engine-and-archetype-alignment.md](file:///c:/My%20Claw/MyProjects/Quick%20Save/Complete/My%20Stock%20Portfolio/V2.9.0_%5Bimpl%5D_advisor_human-first-execution-strategies-capital-funding-engine-and-archetype-alignment.md)
  - 🎯 **Next Step**: รวบรวมข้อมูลสะสม 7+ วัน เพื่อประเมินความแม่นยำของคำแนะนำสถาบันและปรับแต่งกลยุทธ์ Rebalance

## 🟡 2. Upcoming (รอคิว / Roadmap)
- **[My Stock Portfolio] Automated DCA Execution & Portfolio Sync**: วางแผนเชื่อมต่อระบบแจ้งเตือนคำสั่งเทรดผ่าน Telegram / Discord Webhook เมื่อราคาเข้าใกล้จุด Tranche Buy/Sell
  - 📂 **Context File**: [V2.7.0_[impl]_advisor_actionable-trade-execution-engine-and-technical-intelligence.md](file:///c:/My%20Claw/MyProjects/Quick%20Save/Complete/My%20Stock%20Portfolio/V2.7.0_%5Bimpl%5D_advisor_actionable-trade-execution-engine-and-technical-intelligence.md)

## 🔵 3. Completed (เพิ่งเสร็จสดๆ ร้อนๆ)
- **[My Stock Portfolio] Human-First Execution Strategies, Capital Funding Engine & Portfolio Archetype Alignment (V2.9.0)**: ยกเครื่องการ์ดแผนกลยุทธ์คำสั่งเทรดสไตล์ Human-First แสดงต้นทุน vs ตลาด และ 4 กล่องตัดสินใจง่าย, วางระบบ Capital Funding Engine ระบุแหล่งที่มาของเงิน (ขายหุ้นนอกแผน/Cash/DCA), ปรับ AI Advisor ให้เคารพ Archetype (ไม่ลงโทษ Growth ด้วย Dividend Yield พร้อมเปลี่ยนแกน Radar เป็น Reinvestment)
  - 📂 **Context File**: [V2.9.0_[impl]_advisor_human-first-execution-strategies-capital-funding-engine-and-archetype-alignment.md](file:///c:/My%20Claw/MyProjects/Quick%20Save/Complete/My%20Stock%20Portfolio/V2.9.0_%5Bimpl%5D_advisor_human-first-execution-strategies-capital-funding-engine-and-archetype-alignment.md)
- **[My Stock Portfolio] 4 Pillars of Conviction & Consensus Momentum (V2.8.0)**: ยกเครื่องการ์ดหุ้นรายตัว 4 เสาหลัก (Core Thesis, Catalysts/Risks, Thesis Breaker, Valuation Verdict), คำนวณ Conviction Score (1-10), ระบบ Consensus Momentum พร้อมแก้ปัญหา Cloudflare Timeout ด้วย Auto-Recovery Polling และ Timezone Fix
  - 📂 **Context File**: [V2.8.0_[impl]_advisor_4-pillars-of-conviction-and-consensus-momentum.md](file:///c:/My%20Claw/MyProjects/Quick%20Save/Complete/My%20Stock%20Portfolio/V2.8.0_%5Bimpl%5D_advisor_4-pillars-of-conviction-and-consensus-momentum.md)
- **[My Stock Portfolio] Actionable Trade Execution Engine & Technical Intelligence (V2.7.0)**: Quant Engine คำนวณ RSI, ATR, SMA20, 20-Day S/R Pivots, Trailing Stop + SQLite Consensus Ledger + 3 Execution Archetypes พร้อม UI Tranche Visualizer และ Copy Trade Slip
  - 📂 **Context File**: [V2.7.0_[impl]_advisor_actionable-trade-execution-engine-and-technical-intelligence.md](file:///c:/My%20Claw/MyProjects/Quick%20Save/Complete/My%20Stock%20Portfolio/V2.7.0_%5Bimpl%5D_advisor_actionable-trade-execution-engine-and-technical-intelligence.md)
- **[My Stock Portfolio] Reality-First Dual-Layer Holdings Engine & Intelligent Drift Notes (V2.6.0 & V2.6.1)**: ผสานข้อมูลพอร์ตจริง สั่งเชือดเนื้อร้ายนอกแผน 100% ปรับชาร์ต Before/After เทียบของจริง และแก้ปัญหา Drift Detection False-Positive
  - 📂 **Context File**: [V2.6.0_[impl]_advisor_reality-first-dual-layer-holdings-engine-and-drift-notes.md](file:///c:/My%20Claw/MyProjects/Quick%20Save/Complete/My%20Stock%20Portfolio/V2.6.0_%5Bimpl%5D_advisor_reality-first-dual-layer-holdings-engine-and-drift-notes.md)
- **[ag_system] Save Skill Strict Context Overhaul**: Overhauled the `/save` skill to strictly enforce context gathering (list_dir, git diff, transcript mining) to prevent data loss.
  - 📂 **Context File**: [V13.17.9_[infra]_ag_system_save-skill-strict-context.md](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Complete/Core-VPS/V13.17.9_[infra]_ag_system_save-skill-strict-context.md)

---
*Agent Note: ก่อนเริ่มงานให้เช็คไฟล์นี้เพื่อดึง Context ของ Phase ปัจจุบัน และหลังจบงาน (ก่อนปิดแชท) ให้ใช้คำสั่ง `/save` เพื่ออัปเดตสถานะต่างๆ ให้เรียบร้อย*
