---
name: recheck
description: "Comprehensive Post-Implementation & Pre-Deploy Verification Protocol for My Stock Portfolio & Workspace"
---
# 🔍 Skill: `/recheck` (V2 — Production Edition)

## Objective
ทำหน้าที่เป็น **Pre-Deploy Gatekeeper** และ **Post-Implementation Auditor** ตรวจสอบระบบรอบทิศทางอย่างเป็นรูปธรรม ทั้งการเชื่อมต่อ API/DB, ความถูกต้องของกราฟ, การตอบสนองของปุ่ม, กฎเหล็ก UI, และความสมบูรณ์ของ Deployment Pipeline ก่อนส่งมอบงาน

---

## 📋 Execution Protocol (6 ขั้นตอนการตรวจสอบ)

### 1. 🔌 API & Database Live Connectivity (ถ้ามี Endpoint หรือ DB เข้ามาเกี่ยว)
- **Endpoint Test:** ใช้ `curl` หรือ node script สั้นๆ ทดสอบยิง API route ที่สร้าง/แก้ไข เพื่อยืนยันว่าคืน HTTP 200 และคืน JSON payload ในโครงสร้างที่ถูกต้อง
- **Schema & SQL Validation:** ตรวจสอบชื่อตาราง (Tables) และคอลัมน์ (Columns) ในคำสั่ง SQL (SQLite `better-sqlite3`) ให้ตรงกับ Database Schema จริง 100%
- **DB State & Performance:** ตรวจสอบว่ามี error handling (`try/catch`), มีการใช้ Prepared Statements (`db.prepare(...)`), และไม่มีคำสั่งล็อกตารางทิ้งไว้

### 2. 📈 Chart Data Flow & Rendering Integrity (การทำงานและการแสดงผลกราฟ)
- **Data Synchronization:** Array ของแกนเวลา (`dates`/`time`) กับราคา (`opens`, `highs`, `lows`, `closes`, `volumes`) และเส้น Indicators ต้องมีความยาวเท่ากัน และเรียงลำดับวันแบบ Ascending (อดีต ➔ ปัจจุบัน)
- **Coordinate & Value Safety:** ตรวจสอบว่าไม่มีค่า `NaN`, `undefined`, หรือ `Infinity` หลุดเข้าไปใน Series data ของ Lightweight Charts หรือ Chart.js
- **Canvas Lifecycle & Memory Leak Guard:** ใน `useEffect cleanup` ของ Component กราฟ ต้องมีการเรียก `chart.remove()`, ล้าง Event Listener (`mousemove`, `mousedown`, `dblclick`), และรีเซ็ต Series Refs เสมอ
- **Dynamic Recalculation:** เมื่อผู้ใช้เปลี่ยนค่าพารามิเตอร์ (เช่น Period, % Channel) กราฟต้องคำนวณใหม่และเรียก `setData()` หรือ `applyOptions()` อัปเดตทันทีโดยไม่ต้อง Refresh หน้าจอ

### 3. 🖱️ Interactive Controls & Button Action Binding (ปุ่มและคอนโทรลต่างๆ)
- **Real Handler Binding:** ปุ่ม, เมนู Dropdown, Checkbox, และ Switcher ทุกตัวต้องมี `onClick` หรือ `onChange` ผูกเข้ากับ State Handler หรือ Zustand Store Action จริง (ห้ามค้าง Dummy function)
- **Race Condition & Bubbling:** ป้องกัน Event Bubbling ที่ไม่พึงประสงค์ และป้องกันปัญหากดเปิด/ปิดปุ่มเดิมแล้วเกิด Race Condition ระหว่าง `mousedown` ของ Popover กับ `click` ของปุ่ม (ใช้ Attribute เช่น `data-indicator-trigger` ดักจับ)
- **Visual Feedback & Disabled States:** ปุ่มที่กดแล้วมีการส่ง Network Request หรือคำนวณหนัก ต้องมีสถานะ Active/Loading ชัดเจน ป้องกันการกดซ้ำซ้อน (Spam Click)

### 4. 🎨 UI & Typography Iron Rules (กฎเหล็กหน้าจอ)
- **Font Size Floor (สำคัญที่สุด):** สแกนหาตัวหนังสือใหม่ทั้งหมด ห้ามมีขนาดเล็กกว่า 13px (`text-[10px]`, `text-[11px]`, `text-xs` ยกเว้น Badge เม็ดเล็กจิ๋วเท่านั้น)
- **Contrast Floor:** ตัวหนังสือบน Dark Theme ความสว่างต้อง ≥ 70% (`text-slate-100`, `text-slate-200`, `text-slate-300`, `#CBD5E1`) ห้ามใช้สีเทามืด (< 50% midpoint) ที่ทำให้อ่านยาก
- **CSS Class Mapping:** สแกนหา Class ใน HTML/JSX ทุกตัวต้องมีคำจำกัดความอยู่ใน Tailwind v4 หรือ CSS จริง ห้ามใส่ Dead Classes เด็ดขาด
- **Emoji Safe-Check:** ข้อความและสัญลักษณ์ต้องเป็น Standard Unicode / ASCII ที่แสดงผลได้คมชัด ไม่เพี้ยนเป็นกล่องสี่เหลี่ยมบน Windows/Chrome

### 5. 🛡️ Code Integrity & Anti-Bloat (Karpathy Sweep)
- **Object Shorthand Variable Mismatch:** ตรวจสอบ Object Literal เช่น `{ targetVal }` ว่าตัวแปรต้นทางชื่อตรงกันจริง ป้องกัน runtime `ReferenceError` ที่ esbuild ตรวจไม่เจอ
- **Targeted Type Safety:** ตรวจสอบ Type Safety เฉพาะไฟล์ที่สร้างหรือแก้ไข ไม่ปล่อยให้มี Type Error หลุดรอด (แต่ไม่นำ Error ของ Legacy Files ที่ไม่เกี่ยวข้องมาบล็อกงาน)
- **Anti-Bloat & Line Guard:** ควบคุม Component ขนาดใหญ่ (เช่น `LWChart.tsx` ต้องคงอยู่ ≤ 1,400 บรรทัด) โดยแยก UI Popover, Pure Functions, และ Store ออกเป็นไฟล์อิสระ
- **LocalStorage Key Namespacing:** คีย์ที่บันทึกลง Browser Storage ต้องมี Prefix และ Versioning ชัดเจน (เช่น `xchart_indicators_v1`) ป้องกันการชนกับคีย์อื่น

### 6. 🚀 Production Deployment Pipeline Completion
เมื่อทำงานเสร็จ ต้องผ่าน 5 เสาหลักก่อนรายงานปิดจ็อบเสมอ:
1. `npm run build` (ยืนยัน Production Bundle ผ่าน 0 errors)
2. `node bump-cache.js` (อัปเดต Cache Buster ป้องกันเบราว์เซอร์จำไฟล์เก่า)
3. `scp -r dist/* root@185.250.38.247:/root/stock-portfolio/dist/` (ซิงก์ขึ้น VPS)
4. `ssh root@185.250.38.247 "pm2 reload stock-api"` (รีโหลด Backend บน VPS)
5. `git push origin master` (ซิงก์ขึ้น GitHub จาก Workspace Root)

---

## 🚫 สิ่งที่ "ห้ามทำ" ในระหว่างรัน `/recheck`
- ❌ **ห้ามเปิด Browser Subagent ทดสอบเอง:** ขัดกับ Iron Rule ของโปรเจกต์ และทำให้เสียเวลา/ติดปัญหา Auth ให้ยืนยันผลผ่าน Automated Tools, Test Queries, และ Code Inspection
- ❌ **ห้ามสั่ง Global `npx tsc --noEmit` มาบล็อกงาน:** ถ้ามี Legacy Error ในไฟล์อื่นที่ไม่เกี่ยวข้อง ให้โฟกัสเฉพาะไฟล์ที่อยู่ในสโคปของงานปัจจุบัน
- ❌ **ห้ามรัน Heavy API Data Backfill:** ห้ามยิงสคริปต์ดึงราคาย้อนหลังจำนวนมากในระหว่าง Recheck เพื่อป้องกัน Yahoo Finance Rate-Limit

---

## ⚡ Zero-Bug Policy
**"ถ้าเจอบั๊กในระหว่าง Recheck ให้แก้ไขทันที ก่อนที่จะรายงานผลกลับไปยังผู้ใช้"**
