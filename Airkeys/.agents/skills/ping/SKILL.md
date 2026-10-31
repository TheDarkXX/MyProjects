---
name: ping
description: >-
  เครื่องมือสแกน Network Latency, Cloud Queue Delay, Model Thinking Profiler และ Local PC Health Check (Full Lifecycle Profiler)
---

# Instructions
เมื่อ User พิมพ์คำสั่ง `/ping` ให้คุณ (Agent) ดำเนินการวิเคราะห์สุขภาพระบบ 3 ระดับทันที โดยไม่ต้องขออนุญาตล่วงหน้า:

1. **รันตัววัดประสิทธิภาพ Full Lifecycle**:
   - ใช้ `run_command` รันสคริปต์ตัววัดประสิทธิภาพส่วนกลาง:
     `python tools/ping_profiler.py`
   - สคริปต์จะวัดค่าจริงระดับมิลลิวินาที:
     - **Network Layer**: DNS Resolve, ICMP Ping RTT, TCP 443 Handshake (ทั้ง API และ Channel)
     - **Cloud Queue Layer**: วัดเวลาคิวระหว่าง User Input Timestamp กับเวลาที่ AI Model เริ่มรันเทิร์นแรก
     - **Local PC Health**: ทดสอบ Disk Sync Write/Read บนโฟลเดอร์ `.gemini` เพื่อตรวจจับ Antivirus หรือ Disk Bottleneck

2. **ตรวจเช็คโมเดลและ Thinking Budget**:
   - สังเกตว่าโมเดลปัจจุบันคือโมเดลอะไร และมีโหมด Thinking เป็น High หรือไม่ (เช่น `Gemini 3.8 Flash (High)` หรือ `Gemini 3.1 Pro`)
   - หากผู้ใช้เปิดโหมด High Thinking ให้ระบุเตือนเสมอว่า AI จะมีเวลาคิดไตร่ตรองเพิ่มขึ้น 3–8 วินาทีต่อ Step

3. **Report Generation (สไตล์มารบูรพา 🔥)**:
   - นำผลจาก `python tools/ping_profiler.py` มาจัดรูปแบบและสรุปด้วยความกระชับ ดุดัน ตรงไปตรงมา (ใช้สรรพนาม มึง/กู)
   - ฟันธงจำแนกต้นตอทันที:
     - 🌐 **ท่อเน็ต**: ปกติ (<50ms) / กลางๆ (50-150ms) / แย่ (>150ms หรือ Packet Loss)
     - ⚡ **คิวคลาวด์ Google**: ว่าง (<3s) / แน่น (3-10s) / คอขวด (>10s)
     - 🧠 **สมอง AI**: ตอบไวทันที / นั่งคิดนานเพราะตั้ง Flash High
     - 💻 **เครื่องคอมพิวเตอร์**: ดิสก์ลื่น (<15ms) / โดนแอนตี้ไวรัสดักหน่วงดิสก์ (>50ms) / จอแลคเพราะ GPU Fallback

