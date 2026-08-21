# Skill: `/cons` (Consensus MCP Research)

**Command:** `/cons`
**Trigger:** เมื่อผู้ใช้พิมพ์คำสั่ง `/cons` ตามด้วยหัวข้อวิจัยที่ต้องการค้นหา
**Description:** ใช้ Consensus MCP Server ในการค้นหางานวิจัยวิชาการและเปเปอร์ที่มีการ Peer-Review จากฐานข้อมูลกว่า 200 ล้านฉบับของ Consensus เพื่อนำมาสนับสนุนเนื้อหาหรือหา Insight

---

> ⛔ **อ่านก่อนทำงาน! (Agent — ทุก Session ต้องอ่านตรงนี้ก่อน)**
>
> `call_mcp_tool` ของ IDE **ใช้งานกับ Consensus ไม่ได้** (error: `tool search is not enabled`)
> เพราะ IDE ยังไม่รองรับ MCP Server แบบ OAuth remote (mcp-remote) อย่างสมบูรณ์
>
> **วิธีที่ใช้งานได้จริง 100% คือ Node.js Script** ที่ยิงเข้า Consensus ตรงๆ ผ่าน `mcp-remote`
> → ข้ามไปอ่าน **Step 2 (Node.js Script)** ได้เลย ไม่ต้องลอง `call_mcp_tool` ให้เสียเวลา

---

## ⚙️ Workflow (การทำงาน)

### Step 1. ตรวจสอบคำค้นหา (Query)
- ดึงหัวข้อที่ผู้ใช้ต้องการค้นหาหลังจากคำสั่ง `/cons`
- หากผู้ใช้พิมพ์แค่ `/cons` ให้ถามผู้ใช้กลับว่าต้องการค้นหางานวิจัยเรื่องใด

### Step 2. ⭐ เรียกใช้ Consensus ผ่าน Node.js Script (วิธีหลัก)

**นี่คือวิธีเดียวที่ใช้งานได้จริง** — ใช้ `mcp-remote` ยิงเข้า Consensus MCP Server ตรงๆ

**ขั้นตอน:**

**2.1) สร้างไฟล์สคริปต์** — เขียนลง `$env:TEMP\cons-search.js`:

```javascript
const { spawn } = require('child_process');
const query = "<USER_QUERY>";  // ← แทนที่ด้วยคำค้นหาจริง
const mcp = spawn('cmd.exe', ['/c', 'npx.cmd -y mcp-remote https://mcp.consensus.app/mcp']);

let outputData = '';
let searchReturned = false;

mcp.stdout.on('data', (data) => {
    outputData += data.toString();
    if (outputData.includes('"id":2')) {
        searchReturned = true;
        console.log(outputData);
        process.exit(0);
    }
});

const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } } };
const callTool = { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search", arguments: { query: query } } };

mcp.stdin.write(JSON.stringify(init) + '\n');
mcp.stdin.write(JSON.stringify(callTool) + '\n');

setTimeout(() => { if (!searchReturned) { console.log("TIMEOUT:", outputData); process.exit(1); } }, 30000);
```

**2.2) รันสคริปต์** — redirect ผลลัพธ์ลงไฟล์ (สำคัญมาก! ห้ามอ่านจาก stdout ตรงๆ เพราะจะถูก truncate):

```powershell
node "$env:TEMP\cons-search.js" > "$env:TEMP\cons_result.json"
```

**2.3) อ่านผลลัพธ์ครบทุกเปเปอร์** — ใช้ `Get-Content` หรือ `view_file` อ่านไฟล์ `$env:TEMP\cons_result.json`

> ⚠️ **ไฟล์ผลลัพธ์จะยาวมาก (20 เปเปอร์)** — ถ้า `view_file` โชว์ไม่ครบ ให้อ่านทีละส่วนด้วย StartLine/EndLine

**2.4) Dependency ที่ต้องมี (ติดตั้งแล้ว):**
- `mcp-remote` — เรียกผ่าน `npx.cmd -y mcp-remote` ในสคริปต์แล้ว (ไม่ต้อง Fix Path แบบเดิม)
- Auth Token — แคชไว้แล้ว (OAuth ผ่าน consensus.app, port 6761)
- ⛔ ถ้า `mcp-remote` หายหรือ Token หมดอายุ → รัน `npx -y mcp-remote https://mcp.consensus.app/mcp` เพื่อ re-auth

### Step 3. ⛔ Full Log Reading (กฎเหล็ก — ห้ามละเมิด!)

Consensus ส่งเปเปอร์กลับมาสูงสุด **20 เปเปอร์ต่อการค้นหา** ในรูปแบบ Text ยาวมาก

**ห้ามสรุปตอบผู้ใช้จากข้อมูลที่ถูก Truncate เด็ดขาด!**

**วิธีอ่าน Full Log (ต้องทำทุกครั้ง):**
1. ✅ อ่านจากไฟล์ `$env:TEMP\cons_result.json` ที่ redirect ไว้ใน Step 2.2
2. ✅ อ่าน **ทีละส่วน** จนเห็นเปเปอร์ [1] ถึง [20] ครบ
3. ⛔ **ต้องยืนยันกับตัวเองว่าเห็นเปเปอร์ครบทุกตัว** ก่อนเริ่มเขียนสรุป

### Step 4. Fallback สุดท้าย (กรณี Node.js Script ก็ใช้ไม่ได้)

ถ้า Node.js Script ข้างบน Timeout หรือ Error → แจ้งผู้ใช้ว่า **"Auth Token อาจหมดอายุ รบกวนรัน `npx -y mcp-remote https://mcp.consensus.app/mcp` ใน Terminal เพื่อ re-authenticate ครับ"**

---

## 📝 การจัดรูปแบบผลลัพธ์ (Formatting Rules)

### 5. Evidence Hierarchy (เรียงตามความแข็งแกร่งของหลักฐาน)

เมื่อเลือกเปเปอร์มาอ้างอิง ต้องจัดลำดับความสำคัญตามประเภท:

| ลำดับ | ประเภทหลักฐาน | น้ำหนัก |
|-------|--------------|---------|
| 1 | Network Meta-Analysis (NMA) / Umbrella Review | สูงสุด |
| 2 | Meta-Analysis / Systematic Review | สูง |
| 3 | Randomized Controlled Trial (RCT) | ปานกลาง-สูง |
| 4 | Observational Study / Narrative Review | ปานกลาง |
| 5 | Conference Paper / Case Report | ต่ำ |

- ⛔ **ห้ามให้เปเปอร์ที่มี 0 citations จากงานประชุม มีน้ำหนักเท่า NMA จาก BMJ**
- ✅ ให้ระบุประเภทหลักฐานกำกับชื่อเปเปอร์เสมอ เช่น "(RCT, n=101)" หรือ "(NMA, 99 RCTs)"

### 6. ⛔ NO MAGIC Rule (ห้ามเดา — กฎเหล็กที่สำคัญที่สุด!)

**ห้ามสรุปสิ่งที่ไม่มีเปเปอร์รองรับโดยตรง**

| ❌ ผิด | ✅ ถูก |
|--------|--------|
| "18/6 น่าจะลดได้ไวกว่า 16/8" (ไม่มีเปเปอร์เปรียบเทียบตรง) | "ยังไม่มีงานวิจัยเปรียบเทียบ 18/6 กับ 16/8 โดยตรง แต่มีงานเปรียบเทียบ 16:8 vs 14:10 พบว่า..." |
| "Keto + IF เป็นสูตรคอมโบที่เวิร์ค" (เดาจาก mechanism) | "มีเปเปอร์ [X] ที่เปรียบเทียบ Keto vs IF โดยตรง พบว่า..." |
| "น่าจะช่วยเรื่อง X ได้" | "เปเปอร์ [Y] พบว่า X (p < 0.05, n=100)" |

- ⛔ **ห้ามใช้คำว่า "น่าจะ", "คาดว่า", "ตามหลักการแล้ว"** ถ้าไม่มีเปเปอร์รองรับ
- ✅ **ต้องบอกตรงๆ** ว่า "ไม่มีหลักฐานตรงสำหรับประเด็นนี้" ถ้าไม่มีจริงๆ

### 7. ⛔ Contradictory Evidence (ต้องนำเสนอข้อขัดแย้ง!)

หากเปเปอร์ 2 ตัวขึ้นไปให้ผลลัพธ์ขัดแย้งกัน:

- ❌ **ห้ามเลือกนำเสนอแค่ด้านเดียว** ที่สนับสนุนคำตอบที่อยากให้
- ✅ **ต้องนำเสนอทั้งสองด้าน** พร้อมบอกว่าเปเปอร์ไหนมีหลักฐานแข็งกว่า (ดูจาก Evidence Hierarchy)

**รูปแบบการนำเสนอข้อขัดแย้ง:**
```
> ⚠️ **ข้อขัดแย้งในหลักฐาน:**
> - เปเปอร์ [X] (RCT, n=30) พบว่า A ดีกว่า B
> - แต่เปเปอร์ [Y] (Systematic Review, 7 studies) พบว่า B ดีกว่า A
> - **น้ำหนัก:** [Y] มีหลักฐานครอบคลุมกว่า แต่ [X] เป็นการทดลองตรง 12 เดือน
```

### 8. Inline Citation (บังคับ)

- ทุกครั้งที่อ้างถึงผลการวิจัย **ต้องใส่ Inline Citation** เสมอ เช่น `[1]`, `[2]`
- ⛔ ห้ามเขียนสรุปโดยไม่มีตัวเลขอ้างอิงกำกับ
- ✅ ใส่เลขอ้างอิงทุกประโยคที่อ้างข้อมูลจากเปเปอร์

### 9. สรุปเนื้อหาสำคัญ

- สรุป Key Findings ให้ผู้ใช้อ่านเข้าใจง่าย
- ⛔ **ห้ามย่อเหลือ 3-4 เปเปอร์** ถ้ามี 20 เปเปอร์ที่เกี่ยวข้อง → ต้องอ้างอิงทุกตัวที่ตอบคำถามได้
- ✅ จัดกลุ่มเปเปอร์ตามประเด็นที่ผู้ใช้ถาม แล้วสังเคราะห์ข้อมูลจากหลายเปเปอร์เข้าด้วยกัน

### 10. References Section (ส่วนท้ายของการตอบกลับ)

ต้องมีรายการอ้างอิงเปเปอร์ **ทั้งหมด** ที่อ้างถึงในเนื้อหา พร้อมรายละเอียด:
- `[1] [Paper Title](url) (Authors, Year, Journal, Citations)`
- ⛔ **ห้ามดัดแปลง ย่อ หรือสร้าง URL ใหม่** ให้ใช้ URL ดั้งเดิมจากผลลัพธ์ของ Tool เท่านั้น!

### 11. ⛔ กฎเหล็กของ Consensus

- หากในผลลัพธ์มีข้อความแจ้งเตือนเกี่ยวกับการใช้งาน, โควต้า, หรือการอัปเกรด (Sign-up, upgrade, usage message) **จะต้องคัดลอกข้อความเหล่านั้นมาแสดงไว้ตอนท้ายสุดแบบคำต่อคำ (word-for-word)** เสมอ

---

## ✅ Checklist ก่อนตอบผู้ใช้ (ห้ามข้ามข้อ!)

- [ ] ผมอ่าน Full Log ครบทุกเปเปอร์ (1 ถึง 20) แล้วหรือยัง?
- [ ] ผมอ้างอิงเปเปอร์ **ทุกตัวที่เกี่ยวข้อง** กับคำถามของผู้ใช้แล้วหรือยัง? (ไม่ใช่แค่ 3-4 ตัว)
- [ ] ผมจัดลำดับหลักฐานตาม Evidence Hierarchy (NMA > RCT > SR > Review) แล้วหรือยัง?
- [ ] ผมนำเสนอข้อขัดแย้งระหว่างเปเปอร์ (ถ้ามี) แล้วหรือยัง?
- [ ] ทุกข้อสรุปมี Inline Citation กำกับหรือยัง?
- [ ] ผมไม่ได้เดาหรือสรุปสิ่งที่ไม่มีเปเปอร์รองรับใช่ไหม? (NO MAGIC)
- [ ] References ท้ายข้อความครบทุกเปเปอร์ที่อ้างถึง พร้อม URL ดั้งเดิมใช่ไหม?
- [ ] มีข้อความแจ้งเตือนจาก Consensus (quota/upgrade) ที่ต้องคัดลอกมาแสดงไหม?
