---
name: cc
description: >-
  Claude Code Handoff (2 โหมดในสกิลเดียว) — ใน Antigravity ใช้แพ็กบริบทและแผนงานลงไฟล์ handoff
  ใน Quick Save แล้วยื่นคำสั่งพร้อมวางให้ Claude Code หรือ Claude Desktop (Claude Pro 20 ดอลลาร์)
  ส่วนใน Claude Code ใช้รับงาน หาไฟล์ handoff ที่ค้าง ลงมือทำ ตรวจผล แล้วเขียนผลกลับให้ AG อ่านต่อ
  ใช้เมื่อ /cc, ส่งต่อให้ Claude, ย้ายไปทำใน Claude, เตรียมงานให้ Claude, รับงานจาก AG
---

# /cc — Claude Code Handoff

สกิลเดียว ใช้ได้ 2 ฝั่ง ไฟล์ handoff ใน `Quick Save/Active/` คือสะพานเชื่อม (AG กับ Claude ไม่มีแชทร่วมกัน)

```
AG (Sender)  ──เขียน──►  Quick Save/Active/<file>.md  ◄──อ่าน/ทำ/เขียนผลกลับ──  Claude (Receiver)
             handoff_status: pending → in-progress → done | blocked
```

## เลือกโหมด (ตัดสินจาก tools ที่ตัวเองมี)
- มี `view_file` / `write_to_file` / `run_command` → **คุณคือ Antigravity → โหมด SEND**
- มี `Read` / `Edit` / `Bash` → **คุณคือ Claude Code → โหมด RECEIVE**

---

## โหมด SEND (Antigravity)

### S1. ระบุโปรเจกต์และ Quick Save ปลายทาง
- หาโปรเจกต์จาก `C:\XBrain\docs\PROJECT_INDEX_SPIDERWEB.md` → ได้ `PROJECT_ROOT` (absolute)
- โฟลเดอร์ปลายทาง: `<PROJECT_ROOT>\Quick Save\Active\` ถ้ามี / ถ้าไม่มี (เช่นแอปย่อยใน MyProjects) ใช้ `C:\My Claw\Openclaw-VPS\Quick Save\Active\<ชื่อโปรเจกต์>\`

### S2. ไฟล์: สร้างใหม่ หรือ ต่อไฟล์เดิม
- **ถ้าบทสนทนานี้มีไฟล์ Quick Save อยู่แล้ว** (Session Lock: 1 session = 1 version) → ห้ามสร้างใหม่ ให้เพิ่ม frontmatter `handoff_*` และ section `## 🤝 Handoff Brief` ลงไฟล์เดิม
- **ถ้ายังไม่มี** → หาเวอร์ชันล่าสุดใน `Quick Save/Complete/<component>/` และ `Quick Save/Active/` ของโปรเจกต์นั้น (เรียงแบบ natural sort) แล้วตั้งชื่อ `V{x.y.z}_[type]_{component}_{desc}.md`
  - `type` ใช้ค่าตามกฎเท่านั้น: `impl | hotfix | design | infra | study | spike` (**ห้ามใช้ `[plan]`**)

### S3. Frontmatter (ใส่ฟิลด์ Quick Save ปกติตาม AGENTS.md + ฟิลด์ handoff)
```yaml
handoff_to: claude
handoff_status: pending        # pending | in-progress | done | blocked
handoff_project_root: "C:\\My Claw\\<Project>"
handoff_created: 2026-10-25T16:30+07:00
```

### S4. เนื้อหา `## 🤝 Handoff Brief` (ต้องครบทุกหัวข้อ ห้าม placeholder ห้ามย่อ)
1. **Objective** — ทำอะไร ผลลัพธ์ที่ต้องได้ 1-3 บรรทัด
2. **Why / Decisions** — เหตุผลและการตัดสินใจที่คุยกับ user แล้ว รวมทางเลือกที่ปฏิเสธไป (Claude ต้องไม่ถามซ้ำ)
3. **Target Files** — absolute path ทุกไฟล์ที่ต้องอ่าน/แก้ พร้อมบรรทัดหรือ function ที่เกี่ยว
4. **Steps** — ขั้นตอนเรียงลำดับ มี code snippet / ค่า parameter จริง
5. **Rules That Apply (inline)** — copy เฉพาะกฎที่เกี่ยวกับงานนี้มาแปะ เช่น งาน UI → อ่าน DESIGN.md + `node bump-cache.js` + `git push vps master`; งานสกิล → `>-` + audit + sendall (เพื่อให้ Claude ไม่ต้องอ่าน AGENTS.md ทั้งไฟล์ ประหยัดโควต้า Pro)
6. **Do NOT Touch** — ไฟล์ที่ AG แก้ค้างอยู่หรือนอก scope
7. **Verification** — คำสั่งที่ต้องรัน + ผลที่ต้องเห็น (Definition of Done)
8. **Deploy** — ต้อง push ไหม ไป remote ไหน (`vps` / `origin`) หรือ "ห้าม push"

### S5. เคลียร์ git ก่อนส่ง
- รัน `git status` ใน `PROJECT_ROOT`
- ไฟล์ที่เป็นงานนี้ → commit: `chore(handoff): checkpoint before /cc → <file>`
- ไฟล์ค้างที่ไม่เกี่ยว → ระบุลง **Do NOT Touch**

### S6. ส่งมอบให้ user (ตอบในแชท ไม่เกิน 10 บรรทัด)
```text
📦 Handoff: <absolute path ของไฟล์>

▶ Claude Desktop (แท็บ Code): เลือกโฟลเดอร์ <PROJECT_ROOT> แล้ววาง:
/cc <absolute path ของไฟล์>

▶ Claude Code CLI (วางบรรทัดเดียว):
cd "<PROJECT_ROOT>"; claude "รับงาน /cc: <absolute path ของไฟล์>"
```
- เตือน: ปิดแท็บไฟล์ใน Target Files ใน AG ก่อน (กัน auto-save ชนกัน)
- เตือน: ระหว่างที่ Claude ทำ อย่าสั่ง AG แก้ไฟล์ชุดเดียวกัน

---

## โหมด RECEIVE (Claude Code / Claude Desktop แท็บ Code)

### R1. หาไฟล์งาน
- ถ้า user ส่ง path มา → ใช้ path นั้น
- ถ้าไม่ส่ง → ค้นหา `handoff_status: pending` ใน `Quick Save/Active/` ของโปรเจกต์ปัจจุบัน และ `C:\My Claw\Openclaw-VPS\Quick Save\Active\` (รวมโฟลเดอร์ย่อย)
  - เจอ 1 ไฟล์ → ใช้เลย / เจอหลายไฟล์ → แสดงรายการให้ user เลือก / ไม่เจอ → บอก user แล้วหยุด

### R2. เริ่มงาน
- อ่าน Handoff Brief ให้จบ **อ่าน AGENTS.md เพิ่มเฉพาะเมื่อ Brief บอกให้อ่าน** (ประหยัดโควต้า)
- ถ้า `handoff_project_root` ไม่ตรงกับ cwd → เตือน user ว่าควรเปิด Claude ที่โฟลเดอร์นั้น (CLAUDE.md/สกิลของโปรเจกต์จะได้โหลด)
- แก้ frontmatter เป็น `handoff_status: in-progress`
- รัน `git status` — ห้ามแตะไฟล์ใน **Do NOT Touch** และไฟล์ค้างที่ไม่ได้อยู่ใน Target Files

### R3. ลงมือ + ตรวจ
- ทำตาม Steps ตามลำดับ อยู่ใน scope ของ Objective เท่านั้น
- รันทุกคำสั่งใน **Verification** แล้วอ่านผลจริง
- ถ้าติดหรือ Brief ขัดกับโค้ดจริง → หยุด ตั้ง `handoff_status: blocked` แล้วเขียนเหตุผล (ห้ามเดา ห้ามแก้วนเกิน 3 รอบ)

### R4. เขียนผลกลับ (บังคับ — AG อ่านจากตรงนี้)
ต่อท้ายไฟล์ handoff:
```markdown
## 🔁 Handoff Result (Claude) — <วันเวลา>
- **Status:** done | blocked
- **Done:** <สิ่งที่ทำ ทีละข้อ>
- **Files Changed:** <absolute paths>
- **Verification:** <คำสั่ง + ผลที่ได้จริง>
- **Commit:** <hash> | **Pushed:** <remote หรือ "ไม่ได้ push">
- **Open Issues / Next:** <สิ่งที่เหลือให้ AG หรือ user ทำต่อ>
```
- ตั้ง `handoff_status: done` (หรือ `blocked`)
- commit ไฟล์ที่แก้ + ไฟล์ handoff: `feat|fix(<component>): <desc> [cc-handoff]` แล้ว push ตามหัวข้อ **Deploy** เท่านั้น

### R5. แจ้ง user
สรุปสั้นๆ แล้วให้คำสั่งกลับไปวางใน AG:
```text
อ่านผลใน <absolute path> ส่วน Handoff Result แล้วทำต่อ
```
