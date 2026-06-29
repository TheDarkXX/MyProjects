# Skill: `/consdeep` (Multi-Query Consensus Deep Research)

**Command:** `/consdeep [N] [หัวข้อวิจัย]`
**Trigger:** เมื่อผู้ใช้พิมพ์ `/consdeep` ตามด้วยหัวข้อวิจัย (N = จำนวน queries, default = 3)
**Description:** Deep Research ที่ใช้ Consensus MCP เป็น data source — รัน N sub-queries (default 3 = 60 papers, max 5 = 100 papers) ทั้งหมด peer-reviewed, URL verify ได้ 100%, เห็น contradictory evidence ชัดเจน

---

> ⛔ **อ่านก่อนทำงาน! (Agent — ทุก Session ต้องอ่านตรงนี้ก่อน)**
>
> `call_mcp_tool` ของ IDE **ใช้งานกับ Consensus ไม่ได้** (error: `tool search is not enabled`)
> เพราะ IDE ยังไม่รองรับ MCP Server แบบ OAuth remote (mcp-remote) อย่างสมบูรณ์
>
> **วิธีที่ใช้งานได้จริง 100% คือ Node.js Script** ที่ยิงเข้า Consensus ตรงๆ ผ่าน `mcp-remote`
> → ข้ามไป **Step 2** ได้เลย ไม่ต้องลอง `call_mcp_tool` ให้เสียเวลา

---

## ⚙️ Workflow (การทำงาน)

### Step 1. Parse คำสั่ง

**รูปแบบ:** `/consdeep [N] [หัวข้อวิจัย]`

| ตัวอย่าง | N (queries) | หัวข้อ |
|---------|-------------|--------|
| `/consdeep IF ลดน้ำหนัก Keto` | 3 (default) | IF ลดน้ำหนัก Keto |
| `/consdeep 5 IF ลดน้ำหนัก Keto` | 5 | IF ลดน้ำหนัก Keto |
| `/consdeep 4 liposomal glutathione bioavailability` | 4 | liposomal glutathione bioavailability |

- ถ้าตัวเลขตัวแรกหลัง `/consdeep` เป็น 1-5 → ใช้เป็น N
- ถ้าไม่มีตัวเลข → default N = 3
- ถ้า N > 5 → แจ้งเตือนว่า "สูงสุด 5 queries (100 papers) ครับ ต้องการใช้ 5 ไหม?"
- ถ้าไม่มีหัวข้อ → ถามผู้ใช้

### Step 2. ⭐ สร้าง Sub-Queries (กฎเหล็ก!)

**Agent ต้องแตก sub-queries จากหัวข้อหลักตาม pattern นี้:**

#### Query Formula:
```
[Topic] + [Comparison/Outcome] + [Study Design] + [Population (optional)]
```

#### Pattern สำหรับแต่ละ sub-query:

| Query # | บทบาท | Template | ตัวอย่าง (หัวข้อ: IF + Keto ลดน้ำหนัก) |
|---------|--------|----------|----------------------------------------|
| **Q1** | ภาพรวม + เปรียบเทียบ protocols | `[หัวข้อหลัก] comparison meta-analysis OR systematic review` | `intermittent fasting protocols comparison weight loss meta-analysis OR systematic review` |
| **Q2** | เจาะลึก sub-topic A (ด้วย RCT) | `[sub-topic A] vs [alternative] randomized controlled trial` | `early vs late time-restricted eating metabolic outcomes randomized controlled trial` |
| **Q3** | เจาะลึก sub-topic B (ด้วย RCT) | `[sub-topic B] [specific outcome] clinical trial` | `ketogenic diet combined with intermittent fasting body composition randomized trial` |
| **Q4** | Safety / ข้อขัดแย้ง / ด้านลบ | `[หัวข้อหลัก] adverse effects risks limitations systematic review` | `intermittent fasting adverse effects muscle mass loss long-term safety systematic review` |
| **Q5** | เจาะ population เฉพาะ | `[หัวข้อหลัก] [target population] [specific outcome] trial` | `time-restricted eating obesity type 2 diabetes insulin resistance clinical trial` |

#### ⛔ กฎ 5 ข้อสำหรับ sub-queries (ห้ามละเมิด!):

1. **ใส่ Study Design ในทุก query** — เช่น `meta-analysis`, `systematic review`, `randomized controlled trial`
2. **ใช้ศัพท์ PubMed** — ไม่ใช่ภาษาชาวบ้าน (เช่น `visceral adipose tissue` ไม่ใช่ `belly fat`)
3. **ใช้ A vs B pattern** — ถ้าเป็นไปได้ เพื่อดึง contradictory evidence อัตโนมัติ
4. **เขียนเป็นภาษาอังกฤษเสมอ** — Consensus ค้นหา papers ภาษาอังกฤษ
5. **แต่ละ query ต้องเจาะมุมต่างกัน** — ห้ามถามซ้ำแนวเดิม (yield rate ควร >90%)

#### ⛔ ต้องแสดง sub-queries ให้ผู้ใช้เห็นก่อนรัน!

```
📋 Sub-queries ที่จะใช้ค้นหา (3 queries = ~60 papers):

Q1: "intermittent fasting protocols comparison weight loss meta-analysis OR systematic review"
Q2: "early vs late time-restricted eating metabolic outcomes randomized controlled trial"  
Q3: "ketogenic diet combined with intermittent fasting body composition randomized trial"

กำลังเริ่มค้นหา...
```

### Step 3. รัน Consensus N ครั้ง (Sequential)

**สร้างไฟล์ script** — เขียนลง `$env:TEMP\consdeep-search.js`:

```javascript
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const queries = [
  "<SUB_QUERY_1>",
  "<SUB_QUERY_2>",
  "<SUB_QUERY_3>"
  // ... เพิ่มตามจำนวน N
];

function runQuery(query, index) {
  return new Promise((resolve, reject) => {
    const mcp = spawn('cmd.exe', ['/c', 'npx.cmd -y mcp-remote https://mcp.consensus.app/mcp']);
    let outputData = '';
    let searchReturned = false;
    
    mcp.stdout.on('data', (data) => {
      outputData += data.toString();
      if (outputData.includes('"id":2')) {
        searchReturned = true;
        resolve(outputData);
        mcp.kill();
      }
    });
    
    mcp.stderr.on('data', () => {});
    
    const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "consdeep", version: "1.0.0" } } };
    const callTool = { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search", arguments: { query: query } } };
    
    mcp.stdin.write(JSON.stringify(init) + '\n');
    mcp.stdin.write(JSON.stringify(callTool) + '\n');
    
    setTimeout(() => {
      if (!searchReturned) { resolve("TIMEOUT: " + outputData); mcp.kill(); }
    }, 45000);
  });
}

async function main() {
  const tempDir = process.env.TEMP;
  
  for (let i = 0; i < queries.length; i++) {
    console.log(`[Q${i+1}/${queries.length}] Searching: "${queries[i].substring(0, 80)}..."`);
    const raw = await runQuery(queries[i], i);
    const outFile = path.join(tempDir, `consdeep_q${i+1}.json`);
    fs.writeFileSync(outFile, raw, 'utf8');
    console.log(`  → Saved ${(raw.length / 1024).toFixed(1)} KB`);
  }
  
  console.log(`\nDone! ${queries.length} queries completed.`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

**รัน:**
```powershell
node "$env:TEMP\consdeep-search.js"
```

**เวลาโดยประมาณ:** ~30 วินาที/query → 3 queries ≈ 90 วินาที, 5 queries ≈ 150 วินาที

### Step 4. ⛔ Full Log Reading + Dedup (กฎเหล็ก!)

**ต้องอ่านผลลัพธ์จากทุกไฟล์ครบทุก paper:**

```
ไฟล์ที่ต้องอ่าน:
  $env:TEMP\consdeep_q1.json  (Q1: ~20 papers)
  $env:TEMP\consdeep_q2.json  (Q2: ~20 papers)
  $env:TEMP\consdeep_q3.json  (Q3: ~20 papers)
  ... (ถึง qN.json)
```

**วิธีอ่าน:**
1. ✅ ใช้ `view_file` อ่านทีละไฟล์ (ใช้ StartLine/EndLine ถ้ายาวเกิน)
2. ✅ ต้องเห็นเปเปอร์ [1] ถึง [20] ของทุก query ก่อนเริ่มสังเคราะห์
3. ⛔ **ห้ามสรุปจากข้อมูลที่ถูก truncate เด็ดขาด!**

**Dedup:** ถ้าเจอ paper ซ้ำกัน (URL เดียวกัน) ข้าม query ต่างๆ → นับเป็น 1 paper แต่จดไว้ว่ามาจากกี่ queries (ยิ่งซ้ำเยอะ = ยิ่ง relevant)

### Step 5. จำแนกประเภท Papers (Evidence Classification)

**จัดทุก paper เข้ากลุ่มตาม Evidence Hierarchy:**

| ลำดับ | ประเภทหลักฐาน | น้ำหนัก | คำที่ต้องหาใน title/abstract |
|-------|---------------|---------|----------------------------|
| 1 | Network Meta-Analysis (NMA) / Umbrella Review | สูงสุด | `network meta-analysis`, `umbrella review` |
| 2 | Meta-Analysis / Systematic Review + Meta-Analysis | สูง | `meta-analysis`, `systematic review and meta` |
| 3 | Systematic Review | สูง | `systematic review` (ไม่มี meta) |
| 4 | Randomized Controlled Trial (RCT) | ปานกลาง-สูง | `randomized`, `RCT`, `clinical trial` |
| 5 | Observational / Cohort | ปานกลาง | `cohort`, `observational`, `cross-sectional` |
| 6 | Narrative Review / Other | ต่ำ | `review` (ไม่มี systematic), `protocol` |

**ต้องแสดง Evidence Quality Summary ในผลลัพธ์:**
```
📊 Evidence Quality: 60 papers
  🔴 HIGH   (NMA/Meta/Umbrella):    17 (28%)
  🟡 MEDIUM (SR/RCT):               25 (42%)
  ⚪ LOW    (Review/Other):          18 (30%)
```

```markdown
# 🔬 [หัวข้อวิจัย] — ConsDeep Research Report

## 🔍 Search Strategy (PRISMA-style)
- **Database:** Consensus (200M+ peer-reviewed papers)
- **Search date:** YYYY-MM-DD
- **Sub-queries:**
  - Q1: "[query text]" → X results
  - Q2: "[query text]" → X results
  - Q3: "[query text]" → X results
- **Total raw results:** Y papers
- **After deduplication:** Z unique papers
- **Excluded:** N papers (reasons: protocols, irrelevant population, non-English)
- **Included in synthesis:** M papers

## 📊 Evidence Profile
| Metric | Value |
|--------|-------|
| Papers analyzed | X unique (from Y raw) |
| HIGH evidence (NMA/Meta/Umbrella) | X (XX%) |
| MEDIUM evidence (SR/RCT) | X (XX%) |
| LOW evidence (Review/Other) | X (XX%) |
| Median year of publication | 20XX |
| Top journal tiers represented | Tier 1: X, Tier 2: X |

## 📋 Summary of Findings Table (SoF — Cochrane/GRADE style)

⛔ **บังคับ:** ต้องสร้างตารางนี้ทุกครั้ง ครอบคลุมทุก Outcome สำคัญ (สูงสุด 7 outcomes)

| Outcome | ผลลัพธ์ | จำนวน Studies (n) | Effect Direction | GRADE Certainty | Key Papers |
|---------|---------|-------------------|:----------------:|:---------------:|------------|
| [ผลลัพธ์ 1] | [สรุปสั้น] | X RCTs (n=XXX) | ↑ ดีขึ้น | ⊕⊕⊕◯ Moderate | [1][3][7] |
| [ผลลัพธ์ 2] | [สรุปสั้น] | X studies (n=XXX) | ↓ ลดลง | ⊕⊕◯◯ Low | [4][8] |
| [ผลลัพธ์ 3] | [สรุปสั้น] | X RCTs (n=XXX) | ↔ ไม่ต่าง | ⊕⊕⊕⊕ High | [2][5][6] |

**Effect Direction Symbols (SWiM):**
- ↑ = ดีขึ้น/เพิ่มขึ้น (Favorable)
- ↓ = แย่ลง/ลดลง (Unfavorable)
- ↔ = ไม่มีความแตกต่าง (No difference)
- ↑↓ = ผลลัพธ์ขัดแย้ง (Conflicting)

**GRADE Certainty Symbols:**
- ⊕⊕⊕⊕ High = มั่นใจมากว่าผลลัพธ์จริงใกล้เคียงกับที่ประเมิน
- ⊕⊕⊕◯ Moderate = ผลลัพธ์จริงน่าจะใกล้เคียง แต่อาจต่างได้
- ⊕⊕◯◯ Low = ผลลัพธ์จริงอาจแตกต่างอย่างมีนัยสำคัญ
- ⊕◯◯◯ Very Low = มั่นใจน้อยมาก ผลลัพธ์อาจต่างสิ้นเชิง

**วิธีให้คะแนน GRADE Certainty:**
1. RCT เริ่มที่ High → หักคะแนนถ้า: n < 50 (Imprecision), ไม่ Blind (Risk of Bias), ผลลัพธ์แกว่ง (Inconsistency)
2. Observational เริ่มที่ Low → บวกคะแนนถ้า: Effect Size ใหญ่มาก, มี Dose-Response
3. ตีพิมพ์ใน Tier 1 Journal (Lancet/NEJM/JAMA/BMJ) → บวก 1 ระดับ

## 🏆 Executive Summary
สรุป 3-5 ข้อสำคัญที่สุดจาก papers ทั้งหมด (ทุกข้อต้องมี [citation])

## 📋 Findings by Topic

### [หัวข้อย่อย 1]
- สังเคราะห์ข้อมูลจากหลาย papers ที่เกี่ยวข้อง
- ทุกประโยคที่อ้างข้อมูลต้องมี [N] กำกับ
- ระบุ (study design, n=X, duration) ทุกครั้ง

### [หัวข้อย่อย 2]
...

## ⚠️ Contradictory Evidence & Critical Appraisal
- แสดงทุกจุดที่ papers ขัดแย้งกัน
- ใช้ GRADE-Lite & JIF Logic ชั่งน้ำหนัก (ดู Section 7)
- เปรียบเทียบน้ำหนักหลักฐานแต่ละฝั่ง

## 🚨 Limitations & Caveats
- สิ่งที่ยังไม่มีหลักฐานตรง
- ข้อจำกัดของ papers ที่พบ
- Potential publication bias (ถ้ามี)
- ข้อจำกัดของ Consensus database (เช่น อาจไม่ครอบคลุม preprints)

## 📚 References (ทั้งหมด)
เรียงตาม Evidence Hierarchy (NMA ก่อน → Meta → RCT → Review)
[1] [Paper Title](URL) (Author, Year, Journal, Citations, Study Design)
...

## 🇹🇭 สรุปภาษาไทยแบบเข้าใจง่าย (Plain Language Summary)

⛔ **บังคับ:** ทุกรายงานต้องจบด้วย section นี้เสมอ

**กฎการเขียน:**
- เขียนเป็นภาษาไทยที่คนทั่วไปอ่านแล้วเข้าใจทันที
- ห้ามใช้ศัพท์แพทย์/วิชาการ (Jargon) โดยไม่แปล — ถ้าจำเป็นต้องใช้ ให้วงเล็บอธิบาย
- ใช้ bullet points สั้นๆ ชัดๆ ครอบคลุมทุก key finding
- เปรียบเทียบกับสิ่งที่คนทั่วไปเข้าใจ (เช่น "เท่ากับเดินเร็ว 30 นาที" แทน "moderate-intensity exercise")
- ระบุ "ทำอะไรได้เลย" (Actionable) ไม่ใช่แค่ข้อมูล
- ต้อง cover ทุก key point จาก SoF Table ไม่ตกหล่น

**รูปแบบ:**
```
## 🇹🇭 สรุปแบบเข้าใจง่าย

**คำถาม:** [คำถามเดิมของผู้ใช้ เขียนเป็นภาษาไทยธรรมดา]

**คำตอบสั้นๆ:** [1-2 ประโยค ตอบตรงคำถาม]

**สิ่งที่งานวิจัยบอกเรา:**
- 🟢 [ข้อค้นพบที่มีหลักฐานแน่น — เชื่อได้]
- 🟢 [ข้อค้นพบที่มีหลักฐานแน่น — เชื่อได้]
- 🟡 [ข้อค้นพบที่มีหลักฐานปานกลาง — น่าจะจริงแต่ยังไม่ 100%]
- 🔴 [ข้อค้นพบที่หลักฐานยังน้อย — ต้องรอการวิจัยเพิ่ม]

**สิ่งที่ยังไม่มีคำตอบชัดเจน:**
- [ประเด็นที่ยังต้องรอการวิจัยเพิ่มเติม]

**ถ้าจะเริ่มทำ ทำอย่างไร:**
- [คำแนะนำเชิงปฏิบัติที่ทำได้ทันที]
- [เรียงตามลำดับความสำคัญ/ง่ายไปยาก]
```

**ตัวอย่าง (จากหัวข้อ IF):**
```
## 🇹🇭 สรุปแบบเข้าใจง่าย

**คำถาม:** IF (การอดอาหารเป็นช่วงเวลา) ช่วยลดน้ำหนักได้จริงไหม? แบบ 16 ชม. กับ 18 ชม. อันไหนดีกว่า?

**คำตอบสั้นๆ:** IF ช่วยลดน้ำหนักได้จริง แต่ไม่ได้ดีกว่าการนับแคลอรี่ปกติ ส่วน 16 ชม. กับ 18 ชม. ยังไม่มีงานวิจัยเปรียบเทียบตรงๆ

**สิ่งที่งานวิจัยบอกเรา:**
- 🟢 IF ลดน้ำหนักได้เฉลี่ย 1.5-3 กก. ใน 8-12 สัปดาห์ (หลักฐานแน่น จาก 8 งานวิจัย รวมคนกว่า 1,200 คน)
- 🟢 งดมื้อเย็นได้ผลดีกว่างดมื้อเช้าในทางปฏิบัติ เพราะคนมักจะกินน้อยลงเองโดยไม่ต้องพยายาม
- 🟡 แต่ถ้าคุมแคลอรี่เท่ากันเป๊ะๆ กินเช้าหรือเย็นก็ลดได้พอๆ กัน (ผลอาจมาจากกินน้อยลง ไม่ใช่เวลาที่กิน)
- 🔴 IF + Keto ทำคู่กันอาจเสียกล้ามเนื้อได้ ถ้ากินโปรตีนไม่พอ (หลักฐานยังน้อย แค่ 2 งานวิจัย)

**สิ่งที่ยังไม่มีคำตอบชัดเจน:**
- ยังไม่มีใครเปรียบเทียบ 16 ชม. กับ 18 ชม. โดยตรง

**ถ้าจะเริ่มทำ ทำอย่างไร:**
- เริ่มจาก 16:8 ก่อน (อดอาหาร 16 ชม. กินได้ 8 ชม.) เพราะทำง่ายกว่า
- ลองงดมื้อเย็น (กินมื้อสุดท้ายก่อน 16:00) จะได้ผลดีในทางปฏิบัติ
- ถ้าทำ Keto ควบคู่ ต้องกินโปรตีนให้พอ (1.2-1.6 กรัม/กก./วัน)
```
```

---

## 📝 Formatting Rules (สืบทอดจาก `/cons`)

### 6. ⛔ NO MAGIC Rule (ห้ามเดา — กฎเหล็กที่สำคัญที่สุด!)

**ห้ามสรุปสิ่งที่ไม่มีเปเปอร์รองรับโดยตรง**

| ❌ ผิด | ✅ ถูก |
|--------|--------|
| "18/6 น่าจะลดได้ไวกว่า 16/8" (ไม่มีเปเปอร์ตรง) | "ยังไม่มีงานวิจัยเปรียบเทียบ 18/6 กับ 16/8 โดยตรง แต่มีงานเปรียบเทียบ 16:8 vs 14:10 พบว่า..." |
| "น่าจะช่วยเรื่อง X ได้" | "เปเปอร์ [Y] พบว่า X (p < 0.05, n=100)" |

- ⛔ **ห้ามใช้คำว่า "น่าจะ", "คาดว่า", "ตามหลักการแล้ว"** ถ้าไม่มีเปเปอร์รองรับ
- ✅ **ต้องบอกตรงๆ** ว่า "ไม่มีหลักฐานตรงสำหรับประเด็นนี้" ถ้าไม่มีจริงๆ

### 7. ⛔ การประเมินคุณภาพและสังเคราะห์ข้อขัดแย้ง (GRADE-Lite & JIF Appraisal Logic)

นี่คือ **"ไม้ตาย"** ของ /consdeep เมื่อเปเปอร์ให้ผลลัพธ์ขัดแย้งกัน **ห้ามใช้ระบบนับโหวต (เช่น 5 ชนะ 1)** แต่ให้ AI สวมบทบาทคณะกรรมการประเมิน (Critical Appraiser) โดยใช้ 2 แกนหลักนี้:

#### แกนที่ 1: Journal Impact Factor (JIF)
ให้ความสำคัญกับวารสารระดับท็อป (The Big Four) เป็นพิเศษ:
- **Tier 1 (The Big Four):** *The Lancet, NEJM (New England Journal of Medicine), JAMA, BMJ* → 🌟 **น้ำหนักคูณ 3**
- **Tier 2 (High Impact):** *Nature, Cell, Science* → ⭐ **น้ำหนักคูณ 2**
- **วิธีใช้:** *"แม้ Meta-Analysis จะบอกว่า X แต่งานวิจัยล่าสุดที่เพิ่งตีพิมพ์ใน The Lancet (Tier 1) แย้งว่า Y จึงให้น้ำหนักกับ The Lancet มากกว่าเนื่องจากความเข้มงวดของการ Peer-review"*

#### แกนที่ 2: GRADE-Lite (Grading of Evidence)
ไม่ได้ดูแค่ประเภทงานวิจัย แต่ดู "คุณภาพ" ของงานวิจัยนั้นด้วย โดยบวก/ลบคะแนนดังนี้:
1. **Starting Point (จุดเริ่มต้น):** NMA/Meta-Analysis > RCT > Observational/Cohort
2. **Downgrade (หักคะแนน):** 
   - เป็น RCT แต่กลุ่มตัวอย่างเล็กมาก (n < 20) = *หักคะแนนความแม่นยำ (Imprecision)*
   - ไม่มีกลุ่มควบคุม หรือให้กินแบบอิสระ (Ad libitum) ในขณะที่ต้องการวัดผลเผาผลาญ = *หักคะแนนตัวแปรกวน (Risk of Bias)*
3. **Upgrade (บวกคะแนน):**
   - กลุ่มตัวอย่างใหญ่มาก (n > 1,000) = *บวกคะแนน*
   - งานวิจัยควบคุมตัวแปรเป๊ะมาก (เช่น Isocaloric, Metabolic Ward) = *บวกคะแนนความน่าเชื่อถือระดับสูงสุด*

**รูปแบบการนำเสนอเชิงสังเคราะห์ (Synthesis Presentation):**
```
> ⚠️ **การประเมินข้อขัดแย้ง (Critical Appraisal):**
> - **ข้อมูล:** ภาพรวมจาก Meta-Analysis [Y] สรุปว่า A ดีกว่า B
> - **ข้อขัดแย้ง:** แต่ RCT ล่าสุดปี 2024 [X] กลับพบว่าไม่ต่างกัน
> - **การประเมิน GRADE-Lite:** เปเปอร์ [X] ควบคุมแคลอรี่แบบ Isocaloric (ตัวแปรเป๊ะมาก - Upgrade) ในขณะที่เปเปอร์ที่นำมาทำ Meta-Analysis [Y] ส่วนใหญ่เป็นการกินแบบ Ad libitum (Risk of Bias - Downgrade)
> - **ข้อสรุปเชิงสังเคราะห์:** ผลดีของ A อาจไม่ได้มาจากกลไกของมันโดยตรง แต่อาจมาจากการที่ผู้ป่วยกินแคลอรี่ลดลงโดยธรรมชาติ
```

### 8. Inline Citation (บังคับ)

- ทุกครั้งที่อ้างถึงผลการวิจัย **ต้องใส่ Inline Citation** เสมอ เช่น `[1]`, `[2]`
- ⛔ ห้ามเขียนสรุปโดยไม่มีตัวเลขอ้างอิงกำกับ
- ✅ ใส่เลขอ้างอิงทุกประโยคที่อ้างข้อมูลจากเปเปอร์

### 9. สรุปเนื้อหาสำคัญ

- ⛔ **ห้ามย่อเหลือ 3-4 เปเปอร์** ถ้ามี 60 เปเปอร์ที่เกี่ยวข้อง → ต้องอ้างอิงทุกตัวที่ตอบคำถามได้
- ✅ จัดกลุ่มเปเปอร์ตามประเด็นที่ผู้ใช้ถาม แล้วสังเคราะห์ข้อมูลจากหลายเปเปอร์เข้าด้วยกัน
- ✅ ให้ความสำคัญกับ papers ที่มี Evidence ระดับสูง (NMA > Meta > RCT) มากกว่า reviews

### 10. References Section

ต้องมีรายการอ้างอิงเปเปอร์ **ทั้งหมด** พร้อมรายละเอียด:
- `[1] [Paper Title](url) (Authors, Year, Journal, Citations, Study Design)`
- ⛔ **ห้ามดัดแปลง ย่อ หรือสร้าง URL ใหม่** ให้ใช้ URL ดั้งเดิมจากผลลัพธ์ของ Consensus เท่านั้น!
- ✅ **เรียงตาม Evidence Hierarchy** — NMA/Umbrella ก่อน → Meta-Analysis → RCT → Review

### 11. ⛔ กฎเหล็กของ Consensus

- หากในผลลัพธ์มีข้อความแจ้งเตือนเกี่ยวกับ quota หรือ upgrade → **คัดลอกมาแสดงตอนท้ายแบบ word-for-word** เสมอ

---

## ✅ Checklist ก่อนตอบผู้ใช้ (ห้ามข้ามข้อ!)

- [ ] ผมแสดง sub-queries ให้ผู้ใช้เห็นก่อนรันหรือยัง?
- [ ] ผมอ่าน Full Log ครบทุกไฟล์ (q1 ถึง qN) ทุกเปเปอร์ (1-20) ของทุก query แล้วหรือยัง?
- [ ] ผม Dedup papers ที่ซ้ำกันข้าม queries แล้วหรือยัง?
- [ ] ผมจัดประเภท Evidence (NMA/Meta/RCT/Review) ของทุก paper แล้วหรือยัง?
- [ ] ผมแสดง Evidence Quality Summary (HIGH/MED/LOW %) แล้วหรือยัง?
- [ ] ผมอ้างอิงเปเปอร์ **ทุกตัวที่เกี่ยวข้อง** (ไม่ใช่แค่ 5-10 ตัว) แล้วหรือยัง?
- [ ] ผมนำเสนอ Contradictory Evidence (ถ้ามี) แล้วหรือยัง?
- [ ] ทุกข้อสรุปมี Inline Citation กำกับหรือยัง?
- [ ] ผมไม่ได้เดาหรือสรุปสิ่งที่ไม่มีเปเปอร์รองรับใช่ไหม? (NO MAGIC)
- [ ] References ท้ายข้อความครบทุกเปเปอร์ เรียงตาม Evidence Hierarchy พร้อม URL ดั้งเดิมใช่ไหม?
- [ ] มีข้อความแจ้งเตือนจาก Consensus (quota/upgrade) ที่ต้องคัดลอกมาแสดงไหม?

---

## 📊 Quota Management

| Plan | Searches/เดือน | /consdeep 3 | /consdeep 5 |
|------|---------------|-------------|-------------|
| Pro | 250 | ~83 ครั้ง/เดือน | ~50 ครั้ง/เดือน |

**Dependency:**
- `mcp-remote` — เรียกผ่าน `npx.cmd -y mcp-remote` ในสคริปต์แล้ว (ไม่ต้อง Fix Path แบบเดิม)
- Auth Token — แคชไว้แล้ว (OAuth ผ่าน consensus.app)
- ⛔ ถ้า Token หมดอายุ → รัน `npx -y mcp-remote https://mcp.consensus.app/mcp` เพื่อ re-auth

## 🔗 Related Skills

| Skill | เมื่อไหร่ใช้แทน/ใช้คู่กัน |
|-------|--------------------------|
| `/cons` | ต้องการ quick evidence check (1 query, 20 papers, ~30 วินาที) |
| `/deep` | ต้องการรายงานสำเร็จรูปจาก web sources (ไม่จำกัด peer-reviewed) |
| `/consdeep` → `/cons` | ใช้ /consdeep สำรวจภาพรวม แล้ว /cons เจาะลึกเพิ่มเติม |
