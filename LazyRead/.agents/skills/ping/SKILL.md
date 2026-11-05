---
name: ping
description: >-
  เครื่องมือสแกน Network Latency, Cloud Queue Delay, Model Thinking Profiler และ Local PC Health Check (Full Lifecycle Profiler)
---

# Instructions
เมื่อ User พิมพ์คำสั่ง `/ping` ให้คุณ (Agent) ดำเนินการวิเคราะห์สุขภาพระบบ 3 ระดับทันที โดยไม่ต้องขออนุญาตล่วงหน้า:

1. **รันตัววัดประสิทธิภาพ Full Lifecycle**:
   - ใช้ `run_command` รันสคริปต์ตัววัดประสิทธิภาพ (รองรับ 3 ชั้น: Script ในตัวสกิล ➔ โฟลเดอร์ `tools/` ในโปรเจกต์ ➔ Central Fallback ที่ `C:\XBrain`):
     ```powershell
     python .agents/skills/ping/scripts/ping_profiler.py 2>$null; if (-not $?) { python tools/ping_profiler.py 2>$null; if (-not $?) { python "C:\XBrain\tools\ping_profiler.py" } }
     ```
     หรือคำสั่งสั้นตามความเหมาะสม:
     `python .agents/skills/ping/scripts/ping_profiler.py` (หรือ `python tools/ping_profiler.py`)
   - สคริปต์จะวัดค่าจริงระดับมิลลิวินาที:
     - **Network Layer**: DNS Resolve, ICMP Ping RTT, TCP 443 Handshake (ทั้ง API และ Channel)
     - **Cloud Queue Layer**: วัดเวลาคิวระหว่าง User Input Timestamp กับเวลาที่ AI Model เริ่มรันเทิร์นแรก
     - **Local PC Health**: ทดสอบ Disk Sync Write/Read บนโฟลเดอร์ `.gemini` เพื่อตรวจจับ Antivirus หรือ Disk Bottleneck

2. **ตรวจเช็คโมเดลและ Thinking Budget**:
   - สังเกตว่าโมเดลปัจจุบันคือโมเดลอะไร และมีโหมด Thinking เป็น High หรือไม่ (เช่น `Gemini 3.8 Flash (High)` หรือ `Gemini 3.1 Pro`)
   - หากผู้ใช้เปิดโหมด High Thinking ให้ระบุเตือนเสมอว่า AI จะมีเวลาคิดไตร่ตรองเพิ่มขึ้น 3–8 วินาทีต่อ Step

3. **Report Generation (สไตล์มารบูรพา 🔥 - กฎเหล็ก: รายงานความจริง 100% ห้ามกลบเกลื่อน)**:
   - นำผลจาก `python tools/ping_profiler.py` มาจัดรูปแบบและสรุปด้วยความกระชับ ดุดัน ตรงไปตรงมา (ใช้สรรพนาม มึง/กู)
   - **ห้ามรายงานแต่ด้านดีแล้วซ่อนคอขวดเด็ดขาด!** ต้องแสดงทั้ง 5 มิติให้ครบในตารางเดียว โดยเฉพาะ **True Wall-Clock** และ **Red Flags**:
     - ⌛ **True Wall-Clock (เวลารอจริงของมนุษย์)**: จรวดเร็ว (<5s) / ปานกลาง (5-20s) / 🔴 งานหนัก-คอขวดสะสม (>20s) พร้อมแจกแจงจำนวนรอบ Tool Loops
     - 🧠 **สมอง AI & Thinking Budget**: ระบุโมเดลและสถานะ Thinking ชัดเจน (เช่น Flash High เพิ่ม 3-8s ต่อสเต็ป)
     - ⚡ **คิวคลาวด์ Google**: ว่าง (<3s) / แน่น (3-10s) / คอขวด (>10s)
     - 🌐 **ท่อเน็ต**: ปกติ (<50ms) / กลางๆ (50-150ms) / แย่ (>150ms หรือ Packet Loss)
     - 💻 **เครื่องคอมพิวเตอร์ & ดิสก์**: ดิสก์ลื่น (<15ms) / โดนแอนตี้ไวรัสดักหน่วงดิสก์ (>50ms)
   - สรุป **Red Flag Summary & Fix Actions** ชี้เป้าต้นตอของความช้าทันทีโดยไม่เกรงใจ

