# CLAUDE.md — MyProjects (Umbrella)

> Umbrella repo ของแอปทั้งหมด: HyperCut, Airkeys, FastingTimer, LazyRead, Folder Manager, App Builder AI, My Stock Portfolio, whisper_test
> Claude Code อ่านไฟล์นี้อัตโนมัติเมื่อทำงานในโฟลเดอร์ย่อยใดก็ได้

## ก่อนเริ่มงานในแอปไหน
1. อ่าน `AGENT_CONTEXT.md` ที่ root นี้ (Focus Protocol) ถ้ามี
2. อ่าน `CLAUDE.md` / `AGENT_CONTEXT.md` / `memory.md` / `DESIGN.md` ในโฟลเดอร์แอปนั้น (ถ้ามี)
3. **Focus Lock:** แก้เฉพาะไฟล์ในแอปที่ได้รับมอบหมาย ห้ามลามข้ามแอป
4. Quick Save ของแต่ละแอปอยู่ในโฟลเดอร์ `Quick Save/` ของแอปนั้น (หรือ XBrain `Quick Save/Complete/<ชื่อแอป>/`)

## 🤖 Sub-Agent Worker Pattern (Quota Preservation)
- When tasked with writing boilerplate, large file creation, batch copy generation, or mechanical code:
  **DO NOT waste expensive Claude Pro tokens typing out hundreds of repetitive lines.**
  Delegate directly to Gemini Flash Worker via terminal:
  `node tools/flash-worker.js --code -p "<prompt>" -o "<destination_file>"`
  Or with file context:
  `node tools/flash-worker.js --code -f "<source_file>" -p "<instructions>" -o "<destination_file>"`
- You remain the **Director / Architect 👁️‍🗨️**: verify the worker's output (Gate Function), run tests, and refine.
