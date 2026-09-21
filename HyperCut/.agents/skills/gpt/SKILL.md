---
name: gpt
description: OpenAI Codex / GPT Engine — สั่งรันโมเดล GPT-5.6-Terra, GPT-5.6-Sol, GPT-5.6-Luna, GPT-5.5 ในแชทหลักผ่าน ChatGPT Subscription (ฟรี 100% ไร้ค่า API) พร้อมเลือกโมเดล, ปรับระดับ Thinking (Reasoning Effort), Native Context Mirroring (ส่งบริบทแชท + ไฟล์เปิดอยู่ + developer-instructions), และ Thread Persistence สำหรับ multi-turn context ใช้เมื่อ: /gpt [คำถาม/โจทย์/โค้ด]
---

# 🧠 Skill: `/gpt` (OpenAI GPT / Codex Engine)

## 📌 วัตถุประสงค์
ดึงพลังของโมเดล **OpenAI GPT-5.6 & GPT-5.5** จากไส้ในของ Codex MCP Server (ผ่านบัญชี ChatGPT Plus/Pro ของผู้ใช้โดยตรง ฟรี 100% ไม่เสียค่า API) เข้ามาตอบและร่วมคิดงานใน **"แชทหลัก"** ของ Antigravity IDE ได้อย่างแนบเนียน เสมือนเป็น Native Model ของระบบ โดยมีระบบ **Native Context Mirroring** ส่งข้อมูลบริบทแวดล้อม (Workspace, Open Files, Conversation Trail) ไปให้ครบถ้วน 100%

---

## ⚡ Architecture: MCP-Native + 4-Layer Context Pipeline

Agent เรียก GPT ผ่าน `call_mcp_tool` **โดยตรง** พร้อมส่ง System Instructions ผ่าน `developer-instructions`, ตั้งพิกัดโฟลเดอร์ผ่าน `cwd`, และประกอบประวัติผ่าน `prompt`:

```
User: /gpt [คำสั่ง]
  │
  ▼
Agent (Gemini/Claude) รวบรวมบริบท 4 Layers:
  ├─ Layer 0: System & Persona ──► developer-instructions
  ├─ Layer 1: IDE State & cwd  ──► cwd: "C:\My Claw\Openclaw-VPS" + Open Files Block
  ├─ Layer 2: Conversation Trail ─► Semantic History Summary
  └─ Layer 3: User Task         ──► Actual Prompt / Question
  │
  ▼
MCP Call: call_mcp_tool(gpt, codex, { developer-instructions, prompt, cwd, model, config })
  │
  ▼
GPT ประมวลผล (คิดด้วย Reasoning Effort ที่กำหนด) ──► ส่งคืน Text + [THREAD_ID: xxx]
  │
  ▼
Agent ตัด tag [THREAD_ID], บันทึก threadId ในความจำ, แล้วแสดงผลคำตอบลงแชทหลักทันที
```

---

## 🏗️ 4-Layer Context Mirroring Protocol (Iron Rule)

เพื่อให้ GPT มองเห็นภาพรวมและเข้าใจงานรอบด้านเหมือน Agent เจ้าของแชท Agent **ต้องประกอบข้อมูล 4 เลเยอร์** ทุกครั้งที่เริ่ม Thread ใหม่:

### Layer 0: System Identity & Planning Persona (`developer-instructions`)
ฉีดผ่าน parameter `developer-instructions` (Codex จะนำไปใส่ใน Developer Message):
- **Workspace Context:** ระบุชัดเจนว่าทำงานใน Workspace `XBrain` (`C:\My Claw\Openclaw-VPS`), เชื่อมต่อกับ Brain App บน VPS
- **Project Structure Overview:** สรุปโครงสร้าง `routes/`, `public/`, `tools/`, `.agents/`
- **Core Rules:** ตอบเป็นภาษาไทย สั้น กระชับ ตรงประเด็น ไม่เยิ่นเย้อ
- **Planning Persona (เมื่อเรียก `/gpt sol`):** ฉีดบทบาท Senior System Architect ให้วิเคราะห์ Trade-offs, ชี้จุดบอด (Blind Spots) ที่จะพังในอนาคต, นำเสนอ 2-3 ทางเลือกก่อนสรุป

### Layer 1: IDE State & Workspace Anchor (`cwd` + Prompt Prefix)
- **`cwd` parameter:** ตั้งเป็น `"C:\\My Claw\\Openclaw-VPS"` เสมอ เพื่อให้ GPT browse ไฟล์โปรเจกต์เองได้
- **Open Files Inspection:** ตรวจดูไฟล์ที่ผู้ใช้เปิดอยู่/กำลังทำงานในปัจจุบัน:
  - ถ้าไฟล์ขนาด ≤ 100 บรรทัด หรือ ≤ 3,000 tokens: แนบเนื้อหาสำคัญลงใน `prompt`
  - ถ้าไฟล์ขนาดใหญ่: แนบชื่อไฟล์ + ฟังก์ชันหลัก/Exports
  - แนบตำแหน่ง Cursor / บรรทัดที่ผู้ใช้โฟกัส (ถ้ามี)

### Layer 2: Conversation Trail & Decisions (Prompt Body)
- **Semantic Summary (สรุปเชิงความหมาย):** สรุปสิ่งที่คุยกันในบทสนทนาปัจจุบันที่เกี่ยวข้องกับงานนี้ (Agent ใช้สติปัญญาประมวลผล ไม่ใช่ตัดแบบ 3-5 บรรทัดสุ่มๆ)
- **Decisions Made:** สรุปการตัดสินใจเชิงเทคนิคหรือสถาปัตยกรรมที่เคาะไปแล้ว เพื่อไม่ให้ GPT เสนอทับทางหรือย้อนแย้ง

### Layer 3: Current User Prompt (Prompt Tail)
- คำสั่งหรือคำถามล่าสุดของผู้ใช้

---

## 📐 โครงสร้าง Arguments เมื่อเรียก MCP (Template)

### 1. Call แรก — เริ่ม Thread ใหม่ (New Topic หรือ เปลี่ยน Model)

```yaml
call_mcp_tool:
  ServerName: gpt
  ToolName: codex
  Arguments:
    developer-instructions: |
      ## Workspace Identity
      คุณกำลังทำงานใน Workspace "XBrain" (Openclaw-VPS, Path: C:\My Claw\Openclaw-VPS)
      ซึ่งเป็นระบบศูนย์กลางควบคุม Brain App บน VPS (brain.doctorbankonline.com)
      
      ## โครงสร้างโปรเจกต์หลัก
      - routes/ → Express API routes (ai.js, tasks.js, discord.js)
      - public/ → Frontend static files (dashboard, tools)
      - tools/ → Automation CLI utilities & MCP bridges
      - .agents/ → Agent skills & rules
      
      ## แนวทางการตอบ
      - ตอบเป็นภาษาไทย สั้น กระชับ ตรงประเด็น ไม่อารัมภบท
      - ถ้าเป็นการออกแบบระบบ (Architecture): วิเคราะห์ Trade-offs, ชี้ Blind Spots, เสนอ 2-3 ทางเลือกพร้อมเหตุผล
    
    cwd: "C:\\My Claw\\Openclaw-VPS"
    model: "gpt-5.6-sol"              # หรือ gpt-5.6-terra / gpt-5.6-luna
    sandbox: "read-only"
    config:
      model_reasoning_effort: "high"  # sol default = high (Sweet Spot จบใน 60-90s ไร้ timeout ทดแทน Opus 4.6 สบายๆ, ถ้าต้องการสุดยอดให้ใช้ sol-ultra)
    
    prompt: |
      === สถานะไฟล์ใน IDE ที่กำลังเปิดทำงาน ===
      [ระบุชื่อไฟล์และเนื้อหาสำคัญ 1-2 ไฟล์ที่เปิดอยู่]
      
      === สรุปบริบทจากบทสนทนาก่อนหน้า ===
      [สรุปสิ่งที่กำลังทำอยู่ และข้อตกลงที่คุยกันแล้ว]
      
      === คำถาม/คำสั่งงาน ===
      [คำถามจริงของผู้ใช้]
```

**Response Handling:**
- Response จะลงท้ายด้วย `[THREAD_ID: <uuid>]`
- ให้ Agent จดจำ `<uuid>` นี้ไว้สำหรับรอบต่อไป
- **ตัด tag `[THREAD_ID: ...]` ออกก่อนแสดงผลให้ผู้ใช้**

---

### 2. Call ต่อไป — สนทนาต่อเนื่อง (Thread Persistence)

เมื่อคุยเรื่องเดิม ต่อจากคำตอบก่อนหน้า ให้ใช้ `codex-reply`:

```yaml
call_mcp_tool:
  ServerName: gpt
  ToolName: codex-reply
  Arguments:
    threadId: "<uuid ที่ได้จากรอบก่อนหน้า>"
    prompt: "<คำถามใหม่ของผู้ใช้ โดยไม่ต้องแนบ Context ซ้ำ>"
```

> **⚡ Token Efficiency:** รอบถัดไปกิน Token เพียง ~100-300 tokens เท่านั้น เพราะ Thread จำประวัติและบริบททั้งหมดไว้เรียบร้อยแล้ว!

---

## 🔄 Thread Lifecycle Management (กฎการจัดการ Thread)

| สถานการณ์ | การตัดสินใจ | Action |
|---|---|---|
| ผู้ใช้ถามต่อยอดจากเรื่องเดิม ("แล้วถ้าเปลี่ยนเป็น...", "ช่วยเขียน test ให้หน่อย") | **ใช้ Thread เดิม** | ดึง `threadId` ล่าสุด → เรียก `codex-reply` |
| ผู้ใช้เปลี่ยนหัวข้อใหม่ทั้งหมด ("มาดูโค้ดอีกตัวนึง", "เขียน script bash ให้หน่อย") | **เริ่ม Thread ใหม่** | ทิ้ง threadId เก่า → เรียก `codex` พร้อมฉีด 4-Layer Context ใหม่ |
| ผู้ใช้เปลี่ยนโมเดล (เช่น จาก `terra` เป็น `sol`) | **เริ่ม Thread ใหม่** | ต้องเริ่ม Thread ใหม่เสมอ เพราะแต่ละ Thread ผูกกับโมเดลตอน init |
| ผู้ใช้พิมพ์สั่ง `--reset` หรือ `เริ่มคุยใหม่` | **รีเซ็ตทันที** | ล้าง threadId เดิม → เรียก `codex` ใหม่หมดจด |
| คุยห่างกันนานเกิน 3 ชั่วโมง / IDE Restart | **เริ่ม Thread ใหม่** | Process MCP อาจรีสตาร์ท ให้เริ่ม Thread ใหม่ |

---

## ⚡ ไวยากรณ์คำสั่งแบบด่วนพิเศษ (Streamlined Shorthand)

| คำสั่ง | โมเดลที่รัน | ระดับ Thinking (Effort) | คำอธิบายงานที่เหมาะ |
|---|---|---|---|
| `/gpt [คำถาม]` | `gpt-5.6-terra` | `high` (Default) | งานเขียนโค้ดและแก้งานประจำวันทั่วไป สมดุล เร็ว ฉลาด |
| `/gpt terra [คำถาม]` | `gpt-5.6-terra` | `high` | โหมดมาตรฐาน สมดุล คิดรอบด้าน |
| `/gpt luna [คำถาม]` | `gpt-5.6-luna` | `high` (หรือ max) | ความเร็วสูง ตอบไวทันใจ เหมาะกับงานด่วน/สั้น |
| `/gpt sol [คำถาม]` | `gpt-5.6-sol` | `high` ⚡ (Default) | **ทดแทน Opus 4.6 Thinking 100%** ฉลาดลึก สถาปัตยกรรมระดับเทพ วิเคราะห์ Trade-off จบใน 60–90s ไร้กังวลเรื่อง Timeout |
| `/gpt sol-ultra [คำถาม]` | `gpt-5.6-sol` | `ultra` 🔥 | อาวุธนิวเคลียร์ คิดลึกสุดโต่ง สำหรับบั๊กมหากาพย์หรืองานวิกฤติ (ถ้าชน Timeout 3 นาที มีระบบเสนอ Bypass) |

> 💡 **ทำไม `/gpt sol` ถึงใช้ `high` เป็นค่า Default:**
> - `high` ผลาญ Thinking Tokens ถึง 15,000–25,000 tokens ซึ่ง **เหลือเฟือสำหรับงานวางแผนสถาปัตยกรรม 95%** ชี้ Trade-offs, Blind Spots และทางเลือกได้ครบถ้วน
> - คิดจบใน **60–90 วินาที** ไม่ชนเพดาน Hard Timeout (3 นาที) ของ Antigravity IDE ทำให้การทำงานลื่นไหลไม่สะดุด
> - หากต้องการการคิดซ้ำระดับสุดขั้ว (Exhaustive Verification) ค่อยสั่งระบุ `/gpt sol-ultra`

### 🎯 Custom Shorthand (`<model>-<effort>`)
สามารถปรับแต่งระดับ Thinking เองได้ตามใจชอบ:
- `/gpt sol-ultra [คำถาม]` → `gpt-5.6-sol` + Thinking `ultra` (คิดลึกสุดยอด สำหรับงานวิกฤติ)
- `/gpt sol-high [คำถาม]` → `gpt-5.6-sol` + Thinking `high` (เท่ากับ default ของ sol)
- `/gpt sol-max [คำถาม]` → `gpt-5.6-sol` + Thinking `max`
- `/gpt terra-ultra [คำถาม]` → `gpt-5.6-terra` + Thinking `ultra`
- `/gpt terra-low [คำถาม]` → `gpt-5.6-terra` + Thinking `low` (เน้นไวสุดๆ)
- `/gpt luna-low [คำถาม]` → `gpt-5.6-luna` + Thinking `low`
- `/gpt 5.5 [คำถาม]` → `gpt-5.5` + Thinking `high`
- `/gpt astra [คำถาม]` → `gpt-6-astra` (เมื่ออัปเดต Extension รองรับ)

---

## 🎯 ตระกูลโมเดลและการรองรับ (Model Matrix)

| ชื่อเล่น | ชื่อโมเดลจริง | จุดเด่น | Default Effort | Thinking ที่รองรับ |
|---|---|---|---|---|
| `terra` (Default) | `gpt-5.6-terra` | สมดุลที่สุด Coding & System | `high` | `none` → `ultra` |
| `sol` | `gpt-5.6-sol` | ทรงพลัง ฉลาดลึก สถาปัตยกรรม (ทดแทน Opus 4.6) | `high` ⚡ | `none` → `ultra` |
| `luna` | `gpt-5.6-luna` | ความเร็วสูง ตอบไวทันใจ | `high` | `none` → `max` |
| `5.5` | `gpt-5.5` | โมเดลเสถียรรุ่นก่อนหน้า | `high` | `low` → `xhigh` |
| `reserve` | `gpt-reserve` | โมเดลสำรองเมื่อโควตาหน่วง | `high` | `low` → `max` |
| `astra` 🚀 | `gpt-6-astra` | เรือธงตัวใหม่ล่าสุด (Agentic Computer Operator) | `high` | ต้องใช้ Codex CLI `0.153+` |

---

## ⚙️ กฎการทำงานของ Agent เมื่อเจอ `/gpt` (Step-by-Step)

1. **ถอดรหัสคำสั่ง (Parse Command):**
   - ตรวจสอบคำแรกหลัง `/gpt` เพื่อเลือก Model และ Reasoning Effort
   - ถ้าเป็นคำถามทั่วไป → ใช้ `gpt-5.6-terra` + `high`
   - ถ้าเป็น `sol` → ใช้ `gpt-5.6-sol` + `high` ⚡ (Default ปลอดภัย จบใน 60–90s ทดแทน Opus 4.6 สบายๆ)
   - ถ้าเป็น `sol-ultra` → ใช้ `gpt-5.6-sol` + `ultra` 🔥 (อาวุธนิวเคลียร์ คิดลึกสุดยอด สำหรับเคสวิกฤติ)
2. **ประเมิน Thread State:**
   - เช็คว่าคำถามนี้เป็นเรื่องเดิมจาก call ก่อนหน้าหรือไม่
   - ถ้า **ใช่** และโมเดลเดิม → ดึง `threadId` ล่าสุด → เรียก `call_mcp_tool(gpt, codex-reply, { threadId, prompt })`
   - ถ้า **ไม่ใช่** หรือไม่มี `threadId` หรือเปลี่ยนโมเดล → ดำเนินการสร้าง Thread ใหม่ (ข้อ 3)
3. **รวบรวมบริบท (Context Mirroring):**
   - สรุป Semantic Conversation History จากบทสนทนาปัจจุบัน
   - ตรวจดูไฟล์ที่เปิดอยู่หรือที่เกี่ยวข้อง ดึง snippets สำคัญ
   - ประกอบ `developer-instructions` + `cwd: "C:\\My Claw\\Openclaw-VPS"` + `prompt`
   - เรียก `call_mcp_tool(gpt, codex, { ... })`
4. **ส่งมอบผลลัพธ์ (Delivery):**
   - Parse หา `[THREAD_ID: <uuid>]` แล้วจำค่าไว้
   - ตัด tag `[THREAD_ID: ...]` ออกจากข้อความ
   - ส่งผลลัพธ์ที่สะอาดให้ผู้ใช้ในแชทหลักทันที
5. **การรับมือเมื่อเจอ Timeout (Timeout Fallback Trigger):**
   - ถ้า MCP คืนค่า Error เช่น `context deadline exceeded` หรือรันเกิน 180 วินาที
   - Agent **ต้องไม่นิ่งเงียบ** แต่ **ต้องรายงานสาเหตุและเสนอ 2 ทางเลือกทันที** (ตาม Protocol ด้านล่าง)

---

## ⏱️ Timeout Handling & Dual Fallback Protocol (เมื่อติดเพดาน 3 นาที)

แม้ว่า `/gpt sol` จะใช้ `high` เป็น default ซึ่งคิดจบใน 60–90 วินาที ปลอดภัยจาก Timeout แต่หากผู้ใช้สั่ง **`/gpt sol-ultra`** หรือมีโจทย์ใหญ่ที่มีบริบทหนาแน่นจนเกิน 3 นาทีและถูก IDE ตัดสาย (`context deadline exceeded`):

เมื่อเกิดเหตุการณ์นี้ Agent **ต้องแจ้งสถานะให้ผู้ใช้ทราบทันที พร้อมเสนอ 2 ทางเลือก ให้ผู้ใช้เลือกใช้**:

```markdown
> ⚠️ **แจ้งเตือน: งานนี้ใช้เวลาคิดเชิงสถาปัตยกรรมลึกเกิน 3 นาที (ชนเพดาน Hard Timeout ของ IDE)**
> ระบบยังไม่ได้คำตอบ กรุณาเลือกทางเลือกที่ต้องการ:
> 
> 1. ⚡ **ตบเกียร์เป็น High (`/gpt sol-high` หรือ `/gpt sol`)**
>    - รันต่อผ่านแชทเดิมทันที ใช้เวลาคิด 60–90 วินาที (ไม่ชน Timeout)
>    - เหมาะกับ: ต้องการคำตอบด่วนหน้างาน คุณภาพการคิดยังสูงมาก (90-95% ของ ultra)
> 
> 2. 🔥 **รันผ่าน Background Script Bypass (`tools/gpt-invoke.cjs`)**
>    - คงระดับ `gpt-5.6-sol` + `ultra` คิดลึก 100% เต็มสูบ
>    - ปล่อยรันเป็น Background Task เบื้องหลังได้ไม่จำกัดเวลา (5–15 นาที) ไม่ถูก IDE ตัดสาย
>    - เหมาะกับ: โจทย์ใหญ่ระดับแกนกลาง ที่ยอมรอเพื่อให้ได้สถาปัตยกรรมที่ไร้ที่ติที่สุด
```

### คำสั่งสำหรับรัน Background Script Bypass (ทางเลือกที่ 2)
เมื่อผู้ใช้เลือกทางเลือกที่ 2 ให้ Agent บันทึก prompt ลงใน scratch directory แล้วสั่งรัน background ทันที:
```powershell
node "C:\My Claw\Openclaw-VPS\tools\gpt-invoke.cjs" -m gpt-5.6-sol -e ultra --cwd "C:\My Claw\Openclaw-VPS" --prompt-file "C:\Users\The Dark\.gemini\antigravity-ide\brain\<conversation-id>\scratch\gpt_prompt.txt" --dev-instructions "..."
```
เมื่อ Background Task รันเสร็จ ให้ Agent นำผลลัพธ์มาสรุปรายงานผู้ใช้ในแชททันที!

---

## 👁️ Vision (Image Input) — Fallback Mode

กรณีต้องการส่งภาพให้ GPT เนื่องจาก MCP schema ปัจจุบันยังไม่มี image parameter ให้ใช้ CLI fallback ชั่วคราว:

```powershell
& "$env:USERPROFILE\.antigravity-ide\extensions\openai.chatgpt-*\bin\windows-x86_64\codex.exe" exec "วิเคราะห์รูปนี้" --ephemeral -s read-only -m gpt-5.6-terra -i "C:\path\to\image.png"
```

---

## ⚡ ตัวอย่างการใช้งานจริง

```text
/gpt ไฟล์ codex-mcp.cjs ตอนนี้มีจุดอ่อนตรงไหนบ้าง
(Agent รวบรวมบริบทไฟล์และประวัติแชท → ส่งให้ gpt-5.6-terra วิเคราะห์)

/gpt sol ออกแบบ Architecture ระบบ Caching สำหรับ Brain App
(Agent ฉีด Senior Architect Persona + บริบท Workspace → ส่งให้ gpt-5.6-sol + Thinking high จบใน 60–90s)

/gpt sol-ultra วิเคราะห์ Cryptographic Key Agreement & Distributed Concurrency
(Agent ฉีด Senior Architect Persona → ส่งให้ gpt-5.6-sol + Thinking ultra สำหรับงานวิกฤติ)

/gpt แล้วถ้ามีผู้ใช้พร้อมกัน 100,000 คน Cache จะแตกไหม
(Agent ตรวจพบคำถามต่อเนื่อง → หยิบ threadId เดิมมารัน codex-reply ต่อทันทีแบบไร้รอยต่อ!)
```

---

## 🏗️ Infrastructure

| Component | Path | Role |
|---|---|---|
| Skill Spec | [`.agents/skills/gpt/SKILL.md`](file:///c:/My%20Claw/Openclaw-VPS/.agents/skills/gpt/SKILL.md) | Skill Definition & Context Mirroring Protocol |
| MCP Bridge | [`tools/codex-mcp.cjs`](file:///c:/My%20Claw/Openclaw-VPS/tools/codex-mcp.cjs) | stdio forwarder for `codex mcp-server` with threadId tagging |
| MCP Config | [`~/.gemini/config/mcp_config.json`](file:///C:/Users/The%20Dark/.gemini/config/mcp_config.json) | Global MCP server registration |
| Codex Binary | `~/.antigravity-ide/extensions/openai.chatgpt-*/bin/windows-x86_64/codex.exe` | Codex engine |
