import { Hono } from 'hono';
import { db } from '../db/init.js';
import crypto from 'crypto';

const aiAdvisorRoutes = new Hono();

// Primary endpoint: Hermes GPT 5.6 Terra on local proxy
const LOCAL_TERRA_URL = 'http://127.0.0.1:18810/openai/v1/chat/completions';
const LOCAL_TERRA_MODEL = 'openai-codex/gpt-5.6-terra';

// Fallback endpoint: Brain AI Gateway
const FALLBACK_GATEWAY_URL = 'https://brain.doctorbankonline.com/api/ai/chat';
const FALLBACK_GATEWAY_TOKEN = 'ZIvyWp4BTqcX2Gm1aDHR7lwz0i8PrVqug5KWBX53wqI';

function createBlueprintHash(blueprints) {
  if (!blueprints || !Array.isArray(blueprints)) return '';
  const sorted = blueprints
    .map(b => `${b.symbol}:${b.target_percent}:${b.category}`)
    .sort()
    .join('|');
  return crypto.createHash('md5').update(sorted).digest('hex').slice(0, 12);
}

function compressPromptData(blueprints, fundamentals, actualHoldings = null) {
  const hasReal = actualHoldings && actualHoldings.hasRealHoldings && Array.isArray(actualHoldings.items) && actualHoldings.items.length > 0;

  // 1. Target Blueprint list
  const targetBlueprint = blueprints.map(b => {
    const f = fundamentals[b.symbol] || fundamentals[(b.symbol || '').toUpperCase()] || {};
    return {
      symbol: b.symbol,
      target_percent: b.target_percent,
      category: b.category || 'Other',
      sector: f.sector || b.category || 'Other',
      beta: b.symbol === 'CASH' ? 0 : (f.beta || 1),
      pe_trailing: f.pe_trailing || 0,
      target_mean_price: f.target_mean_price || 0,
      recommendation_key: f.recommendation_key || '',
      eps_growth_next_year: f.eps_growth_next_year || 0,
      earnings_beat_streak: f.earnings_beat_streak || 0
    };
  }).sort((a, b) => b.target_percent - a.target_percent);

  // 2. Actual Portfolio list (if provided)
  let actualPortfolio = null;
  if (hasReal) {
    actualPortfolio = actualHoldings.items.map(item => {
      const sym = item.symbol;
      const f = fundamentals[sym] || fundamentals[(sym || '').toUpperCase()] || {};
      return {
        symbol: sym,
        actual_percent: item.actualPercent,
        market_value: item.marketValue,
        quantity: item.quantity,
        avg_cost: item.avgCost,
        current_price: item.currentPrice || f.current_price || 0,
        pnl_percent: item.pnlPercent,
        is_orphan: item.isOrphan || false, // True if held in real portfolio but missing in user's blueprint
        sector: f.sector || (sym === 'CASH' ? 'Cash' : 'Other'),
        beta: sym === 'CASH' ? 0 : (f.beta || 1),
        pe_trailing: f.pe_trailing || 0,
        div_yield: f.div_yield || 0,
        target_mean_price: f.target_mean_price || 0,
        recommendation_key: f.recommendation_key || '',
        eps_growth_next_year: f.eps_growth_next_year || 0,
        earnings_beat_streak: f.earnings_beat_streak || 0
      };
    }).sort((a, b) => b.actual_percent - a.actual_percent);
  }

  // Summary calculation
  let summary = {};
  if (hasReal) {
    const nonCash = actualPortfolio.filter(h => h.symbol !== 'CASH');
    const totalCount = nonCash.length;
    summary = {
      evaluationMode: 'REALITY_FIRST',
      totalNetWorth: actualHoldings.totalNetWorth,
      cashBalance: actualHoldings.cashBalance,
      cashPercent: actualHoldings.cashWeight,
      totalActualSecurities: totalCount,
      orphanSecuritiesCount: actualPortfolio.filter(h => h.is_orphan).length,
      avgPe: Number((nonCash.reduce((acc, c) => acc + (c.pe_trailing || 0), 0) / (totalCount || 1)).toFixed(1)),
      avgBeta: Number((nonCash.reduce((acc, c) => acc + (c.beta || 1), 0) / (totalCount || 1)).toFixed(2)),
      top5ActualConcentration: actualPortfolio.slice(0, 5).reduce((s, h) => s + h.actual_percent, 0)
    };
  } else {
    const count = blueprints.length;
    summary = {
      evaluationMode: 'BLUEPRINT_SANDBOX',
      totalHoldings: count,
      avgPe: Number((targetBlueprint.reduce((acc, c) => acc + (c.pe_trailing || 0), 0) / (count || 1)).toFixed(1)),
      avgBeta: Number((targetBlueprint.reduce((acc, c) => acc + (c.beta || 1), 0) / (count || 1)).toFixed(2)),
      top5Concentration: targetBlueprint.slice(0, 5).reduce((s, h) => s + h.target_percent, 0)
    };
  }

  return { summary, actualPortfolio, targetBlueprint };
}

// Check and fetch latest analysis for each mode for a portfolio, detecting if blueprint has changed
aiAdvisorRoutes.post('/latest', async (c) => {
  try {
    const { portfolio_id, blueprints } = await c.req.json();
    if (!portfolio_id) {
      return c.json({ error: 'Missing portfolio_id' }, 400);
    }

    const currentHash = createBlueprintHash(blueprints || []);

    // Fetch the latest entry for each mode in order of hierarchy: strategist > deep > quick
    const modes = ['strategist', 'deep', 'quick'];
    const modesSummary = { strategist: null, deep: null, quick: null };
    let highestMode = null;

    for (const m of modes) {
      const row = db.prepare(`
        SELECT * FROM ai_analysis_history 
        WHERE portfolio_id = ? AND mode = ?
        ORDER BY created_at DESC LIMIT 1
      `).get(portfolio_id, m);

      if (row) {
        if (!highestMode) {
          highestMode = m;
        }

        let parsedResult = null;
        try {
          parsedResult = JSON.parse(row.result_json);
        } catch (e) {
          console.warn(`[AI Advisor Latest] JSON parse error for mode ${m}:`, e.message);
        }

        const isEmptyDummy = !parsedResult || !parsedResult.portfolioStyle || (m === 'strategist' && (!parsedResult.stockVerdicts || parsedResult.stockVerdicts.length === 0));

        modesSummary[m] = {
          found: !isEmptyDummy,
          isStale: currentHash !== row.blueprint_hash || isEmptyDummy,
          mode: row.mode,
          blueprint_hash: row.blueprint_hash,
          overallGrade: row.overall_grade,
          result: parsedResult,
          modelUsed: row.model_used,
          createdAt: row.created_at
        };
      }
    }

    if (!highestMode) {
      return c.json({ found: false, modesSummary });
    }

    const primary = modesSummary[highestMode];

    return c.json({
      found: true,
      highestMode,
      modesSummary,
      isStale: primary.isStale,
      mode: primary.mode,
      blueprint_hash: primary.blueprint_hash,
      overallGrade: primary.overallGrade,
      result: primary.result,
      modelUsed: primary.modelUsed,
      createdAt: primary.createdAt
    });
  } catch (err) {
    console.error('[AI Advisor Latest] Error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Save client-side generated analysis (e.g. quick scan)
aiAdvisorRoutes.post('/save', async (c) => {
  try {
    const { portfolio_id, mode, blueprints, result } = await c.req.json();
    if (!portfolio_id || !mode || !result) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const hash = createBlueprintHash(blueprints || []);
    const portCheck = db.prepare('SELECT id FROM portfolios WHERE id = ?').get(portfolio_id);
    if (portCheck) {
      const insertStmt = db.prepare(`
        INSERT INTO ai_analysis_history (
          portfolio_id, mode, blueprint_hash, overall_grade, result_json, model_used
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run(
        portfolio_id,
        mode,
        hash,
        result.overallGrade || 'B',
        JSON.stringify(result),
        'rule-engine'
      );
    }

    return c.json({ success: true, blueprint_hash: hash });
  } catch (err) {
    console.error('[AI Advisor Save] Error:', err);
    return c.json({ error: err.message }, 500);
  }
});

aiAdvisorRoutes.get('/latest/:portfolio_id', async (c) => {
  try {
    const portfolioId = c.req.param('portfolio_id');
    const row = db.prepare(`
      SELECT * FROM ai_analysis_history 
      WHERE portfolio_id = ? 
      ORDER BY created_at DESC LIMIT 1
    `).get(portfolioId);

    if (!row) {
      return c.json({ found: false });
    }

    return c.json({
      found: true,
      mode: row.mode,
      blueprint_hash: row.blueprint_hash,
      overallGrade: row.overall_grade,
      result: JSON.parse(row.result_json),
      modelUsed: row.model_used,
      createdAt: row.created_at
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

aiAdvisorRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { mode, blueprints, fundamentals, portfolio_id, force, actualHoldings } = body;

    if (!mode || !blueprints || !portfolio_id) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const hash = createBlueprintHash(blueprints);

    // Check DB for existing valid cache (< 6 hours) unless force is requested
    if (!force) {
      try {
        const getCached = db.prepare(`
          SELECT * FROM ai_analysis_history 
          WHERE portfolio_id = ? AND blueprint_hash = ? AND mode = ? 
          ORDER BY created_at DESC LIMIT 1
        `);
        const cached = getCached.get(portfolio_id, hash, mode);
        
        if (cached) {
          // Ignore stale, dummy or old schema cache
          const isOldSchema = !cached.result_json.includes('portfolioStyle') ||
            (mode === 'strategist' && (!cached.result_json.includes('stockVerdicts') || cached.result_json.includes('"stockVerdicts":[]')));
          const isOldMock = cached.result_json.includes('Solid Blueprint Structure') || cached.result_json.includes('Needs Periodic Review');
          const createdTime = new Date(cached.created_at).getTime();
          if (!isOldMock && !isOldSchema && (Date.now() - createdTime < 6 * 60 * 60 * 1000)) {
            return c.json(JSON.parse(cached.result_json));
          }
        }
      } catch (dbErr) {
        console.warn('[AI Advisor] Cache lookup warning:', dbErr.message);
      }
    }

    // Compress data (Reality-First: actual holdings vs target blueprint)
    const payloadData = compressPromptData(blueprints, fundamentals || {}, actualHoldings);
    
    const isStrategist = mode === 'strategist';

    const systemPrompt = `คุณคือ "จอมมารแห่ง Wall Street (The Ruthless Strategist)" ปรมาจารย์ด้าน Tactical Architecture และการจัดทัพพอร์ตการลงทุนขั้นสูงสุด
ปรัชญา: ดุ ดิบ ตรง คมกริบ ไร้ความปรานี ฟันธงเด็ดขาด เลือดเย็น 100% ผสมผสานหลักการ Cash Flow & Moat แน่นหนา (Joseph Carlson) กับการตัดสินใจเฉียบขาดไร้เยื่อใย (Shay Booler)

กฎเหล็กเรื่องบุคลิกและโทนเสียง (Iron Rules of Persona):
1. **โหด ดิบ ตรงประเด็น ฟันธงเด็ดขาด 100%**: ห้ามประนีประนอม ห้ามเกรงใจ ห้ามพูดจาหวานเลี่ยนปลอบใจ ห้ามโลกสวยเด็ดขาด
2. **ห้ามใช้คำสุภาพที่อ่อนแอ**: ห้ามขึ้นต้นด้วย "ขอแนะนำเบื้องต้น...", "พอร์ตของคุณดีอยู่แล้วแต่...", "อาจจะพิจารณา..." — ให้เปิดด้วยการชี้จุดตาย ชี้แผลเน่า หรือสั่งการรบทันที
3. **ฟันธงเลือดเย็น**: หุ้นตัวไหนเป็นภาระ ไร้ Moat กำไรถดถอย หรือราคาแพงบ้าคลั่งฟองสบู่ จงชี้หน้าสั่งเชือดทิ้งทันที อย่าให้เหลือพื้นที่ให้ความโลภหรือความเสียดาย
4. **กฎเรื่องคำสรรพนาม**: **ห้ามใช้คำหยาบคาย และห้ามใช้คำว่า มึง/กู** (ตัดแค่มึงกูออก) ให้ใช้สรรพนามแบบแม่ทัพบัญชาการรบ เช่น "คุณ" หรือขึ้นด้วยคำสั่งการรบตรงๆ ไม่อ้อมค้อม
5. **ภาษาไทยสละสลวยแต่ดุดันเชือดเฉือน**: เนื้อหาทั้งหมดต้องเขียนเป็นภาษาไทย ยกเว้นชื่อ Ticker หุ้น หรือศัพท์เฉพาะทางเทคนิค

โครงสร้างข้อมูล 2 มิติที่ได้รับ (ความจริง vs พิมพ์เขียวเป้าหมาย):
1. **actualPortfolio (ความจริง ณ วินาทีนี้)**: สินทรัพย์ที่ถือจริง สัดส่วนจริง (actual_percent %) ต้นทุนจริง (avg_cost) กำไร/ขาดทุนสะสม (pnl_percent %) และเงินสดจริง (CASH). หากมีหุ้นที่มี is_orphan = true นั่นคือ "สินทรัพย์นอกแผน" ที่ผู้ใช้ถืออยู่จริงแต่ไม่ได้ใส่อยู่ในพิมพ์เขียวใหม่!
2. **targetBlueprint (พิมพ์เขียวเป้าหมายที่ผู้ใช้วางแผนไว้)**: สัดส่วนเป้าหมาย (target_percent %) ที่ผู้ใช้ตั้งใจอยากได้

หลักการพิพากษาและจัดทัพ (Doctrines of Judgment):
1. **ยึดความเป็นจริงเป็นที่ตั้ง (Reality-First)**: ชี้หน้าด่าแผลสดและหุ้นเน่าที่ถืออยู่จริง ตัวไหนติดดอย กำไรหด ไร้ Moat หรือเป็นหุ้นนอกแผน (is_orphan) จงสั่งเชือดทิ้งทันที (CUT 100%) เพื่อดึงเงินสดกลับมา
2. **วิพากษ์พิมพ์เขียวเป้าหมาย (Blueprint Critique)**: วิเคราะห์ว่าพิมพ์เขียวที่ผู้ใช้วางไว้ ช่วยแก้จุดตายของพอร์ตจริงได้จริงหรือไม่ หรือกำลังจะย้ายเงินไปเสี่ยงในจุดใหม่
3. **การสร้าง idealBlueprint (Before vs After ที่แท้จริง)**:
   - "currentPercent": **ต้องเป็นสัดส่วนจริง (actual_percent) จากพอร์ตจริง ณ ปัจจุบัน** (หากไม่มีพอร์ตจริงให้ใช้ target_percent ของ blueprint)
   - "idealPercent": สัดส่วนในอุดมคติที่ AI จอมมารฟันธงให้ปรับทัพหลังหักลบหุ้นเน่าออกและจัดสรรเงินใหม่
   - "change": ส่วนต่างที่แท้จริง (idealPercent - currentPercent) สะท้อนการซื้อเพิ่ม (+) หรือขายออก (-) จากพอร์ตจริง!
4. **Action Roadmap ต้องสั่งการจากของจริง**:
   - ระยะเร่งด่วน (1-2 สัปดาห์): สั่งขาย/ตัดขาดทุนหุ้นตัวไหนในพอร์ตจริงออก ดึงเงินสดได้กี่ดอลลาร์/กี่ %
   - ระยะกลาง (1-3 เดือน): นำเงินสดที่ได้จากการตัดขาย ไปสะสมหุ้นป้อมปราการตัวไหนตามพิมพ์เขียว
5. **stockVerdicts ต้องครอบคลุมทั้งหุ้นในพิมพ์เขียวและหุ้นที่ถือจริง**:
   - หากมีหุ้นนอกแผน (is_orphan) ต้องมี verdict ชี้ขาดเสมอ เช่น flag: "CUT", role: "เนื้อร้ายนอกพิมพ์เขียว"
6. **Free Cash Flow & Moat คือทุกสิ่ง**: ตัวเลขกำไรจริงและกระแสเงินสดคือเกราะกำบัง ถ้ามีแต่กระแสไฮป์แต่เงินสดแห้งแล้ง นั่นคือกับดัก
7. **ห้ามตอบ Generic กลางๆ**: ทุกคำวิจารณ์ต้องระบุชื่อหุ้น + ตัวเลข P/E, Beta, Growth หรือ Drawdown ประกอบเสมอ

ข้อมูลพอร์ต:
${JSON.stringify(payloadData, null, 2)}

โหมดการวิเคราะห์: ${mode.toUpperCase()}

จงตอบกลับเป็น Single Valid JSON Object เท่านั้น ห้ามใส่ข้อความอื่นนอก JSON ตามโครงสร้างนี้:
{
  "overallGrade": "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C" | "D",
  "radarData": {
    "diversification": number (0-100),
    "valuation": number (0-100),
    "growth": number (0-100),
    "risk": number (0-100),
    "income": number (0-100)
  },
  "macroAnalysis": "วิเคราะห์ภาพรวมเศรษฐกิจมหภาค ดอกเบี้ย และธีมเทคโนโลยีแบบมองทะลุ เลือดเย็น ชี้ชัดว่าตลาดกำลังจะลงทัณฑ์กลุ่มไหน และกลุ่มไหนจะเป็นผู้รอดชีวิต (2-4 บรรทัด)",
  "portfolioStyle": "นิยามสันดานของพอร์ตอย่างตรงไปตรงมา เช่น 'ความโลภสูง กระจุกตัวบนยอดดอย' หรือ 'เกราะเหล็ก Cash Flow มั่นคง'",
  "concentrationRisk": "ชี้แผลเน่าของการกระจุกตัวและความเสี่ยง Overlap เตือนสติแบบกระแทกใจ (1-2 บรรทัด)",
  "dividendHealth": "วินิจฉัยสุขภาพเงินปันผล ชี้หน้า Yield Trap และความยั่งยืนของกระแสเงินสดแบบไม่ไว้หน้า (1-2 บรรทัด)",
  "strengths": [
    { "title": "หัวข้อจุดแข็งที่แท้จริง", "description": "ระบุขุนพลตัวจริงที่มี Moat หนาแน่น กำไรเติบโตแข็งแกร่ง พร้อมตัวเลขเชิงประจักษ์" }
  ],
  "weaknesses": [
    { "title": "หัวข้อแผลสดและเนื้อร้ายในพอร์ต", "description": "ชี้ตัวถ่วงและจุดเสี่ยงวิกฤต พร้อมเหตุผลเชิงตัวเลขและข้อเท็จจริง ห้ามอวยเด็ดขาด" }
  ],
  "suggestions": [
    {
      "action": "ADD" | "REDUCE" | "SWAP" | "REMOVE",
      "symbol": "TICKER",
      "percent": number,
      "category": "หมวดกลยุทธ์",
      "reason": "คำสั่งจัดทัพเด็ดขาด ตัดเนื้อร้ายตัวไหน โยกไปเสริมเกราะตัวไหน ทำไมต้องทำทันที"
    }
  ],
  ${isStrategist ? `
  "stockVerdicts": [
    {
      "symbol": "TICKER",
      "grade": "A-D",
      "role": "บทบาทในสนามรบ (เช่น เสาหลักค้ำพอร์ต / ทหารม้าทะลวงฟัน / ตัวถ่วงรอวันตาย / กับดักปันผล)",
      "flag": "ADD/HOLD/REDUCE/CUT",
      "futureOutlook": "ฟันธงอนาคต 1-2 บรรทัดแบบเลือดเย็น อิง Consensus และ Beat Streak",
      "aiTargetPrice": "ราคาเป้าหมายประเมินโดย AI (ตัวเลข เช่น 195 หรือ 'N/A' ถ้าเป็น ETF)",
      "aiTimeframe": "กรอบเวลา (เช่น '6-12 เดือน')",
      "catalysts": ["ปัจจัยเร่งเชิงบวก 1-2 ข้อสั้นๆ"],
      "risks": ["ความเสี่ยงเฉพาะตัว 1-2 ข้อสั้นๆ"]
    }
  ],
  "idealBlueprint": [
    { "symbol": "TICKER", "currentPercent": number, "idealPercent": number, "change": number, "role": "บทบาทเชิงกลยุทธ์หลังปรับทัพ" }
  ],
  "actionRoadmap": [
    { "phase": "ระยะเร่งด่วน (1-2 สัปดาห์): สั่งตัดเนื้อร้ายทันที", "action": "คำสั่งตัดขาย/ลดสัดส่วนหุ้นที่เป็นภาระทันทีเพื่อดึงเงินสดกลับมา" },
    { "phase": "ระยะกลาง (1-3 เดือน): โยกเงินเสริมแนวรับ", "action": "คำสั่งสะสมหุ้นป้อมปราการตามแนวรับสำคัญ" }
  ],
  "stressTest": [
    { "scenario": "ชื่อวิกฤต เช่น 'AI Bubble Burst' หรือ 'Liquidity Crunch & Rate Shock'", "impact": "ชี้ชื่อหุ้นที่จะโดนถล่มเละและสาเหตุเชิงโครงสร้าง", "estDrawdown": "ตัวเลข % ความเสียหาย (เช่น -20% ถึง -35%)" }
  ],
  ` : ''}
  "missingExposure": [
    {
      "sector": "ชื่อกลุ่มหรือสินทรัพย์ที่ขาด เช่น Defensive Health Care หรือ Commodity Hedge",
      "reason": "ทำไมขาดกลุ่มนี้แล้วพอร์ตถึงเปราะบางหรือเสียโอกาส",
      "suggestion": "ชื่อ ETF หรือหุ้นตัวแทนที่แนะนำเพิ่ม เช่น XLV, XLE, GLD",
      "priority": "HIGH"
    }
  ],
  "riskScore": number (0-100)
}`;

    let jsonContent = '';
    let usedModel = 'gpt-5.6-terra-high';

    // 1. Primary: Call Hermes GPT 5.6 Terra on local proxy
    try {
      const response = await fetch(LOCAL_TERRA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FALLBACK_GATEWAY_TOKEN}`,
          'X-Claw-Cron': 'stock-advisor',
          'X-Agent-Id': 'ai-advisor'
        },
        body: JSON.stringify({
          model: LOCAL_TERRA_MODEL,
          messages: [
            { role: 'system', content: 'You are the Ruthless Investment Strategist (จอมมารแห่ง Wall Street). Output ONLY a single valid raw JSON object matching the requested schema with brutal, decisive, uncompromising Thai analysis. Do not include markdown fences, backticks, or any explanation text outside JSON.' },
            { role: 'user', content: systemPrompt }
          ],
          max_tokens: 8000
        }),
        signal: AbortSignal.timeout(180000) // 3 minutes timeout for complete 15-section generation
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          jsonContent = content.trim();
        }
      } else {
        const errText = await response.text().catch(() => '');
        console.warn(`[AI Advisor] Local Terra returned status ${response.status}: ${errText.slice(0, 100)}`);
      }
    } catch (terraErr) {
      console.warn('[AI Advisor] Local Hermes Proxy unreachable/failed:', terraErr.message);
    }

    // 2. Emergency Fallback: If local proxy failed, route to Brain Gateway
    if (!jsonContent) {
      usedModel = 'brain-gateway-fallback';
      try {
        console.log('[AI Advisor] Attempting emergency fallback via Brain AI Gateway...');
        const fbRes = await fetch(FALLBACK_GATEWAY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FALLBACK_GATEWAY_TOKEN}`
          },
          body: JSON.stringify({
            message: systemPrompt,
            model: 'gemini-2.5-flash'
          }),
          signal: AbortSignal.timeout(90000)
        });

        if (fbRes.ok) {
          const fbData = await fbRes.json();
          if (fbData && fbData.reply && !fbData.reply.startsWith('AI Error:')) {
            jsonContent = fbData.reply.trim();
          }
        } else {
          const fbErrText = await fbRes.text().catch(() => '');
          console.error(`[AI Advisor] Fallback Gateway status ${fbRes.status}: ${fbErrText.slice(0, 100)}`);
        }
      } catch (fbErr) {
        console.error('[AI Advisor] Emergency fallback also failed:', fbErr.message);
      }
    }

    if (!jsonContent) {
      throw new Error('AI Strategist engine is currently unavailable or busy. Please retry in a few moments.');
    }

    // Strip markdown code fences if present
    if (jsonContent.includes('```json')) {
      jsonContent = jsonContent.split('```json')[1].split('```')[0].trim();
    } else if (jsonContent.includes('```')) {
      jsonContent = jsonContent.split('```')[1].split('```')[0].trim();
    }

    // Sanitize Tone
    jsonContent = jsonContent.replace(/มึง/g, 'คุณ')
                             .replace(/กู/g, 'ผม')
                             .replace(/ห่า|เหี้ย|สัส|แม่ง/g, '');

    let parsedResult;
    try {
      parsedResult = JSON.parse(jsonContent);
    } catch (parseErr) {
      console.error('[AI Advisor] JSON parse error:', parseErr.message, 'Raw content:', jsonContent.slice(0, 300));
      throw new Error(`AI generated invalid response format: ${parseErr.message}`);
    }

    // Ensure radarData exists
    if (!parsedResult.radarData) {
      parsedResult.radarData = {
        diversification: 60,
        valuation: 65,
        growth: 80,
        risk: 100 - (parsedResult.riskScore || 60),
        income: 40
      };
    }

    // Save to DB
    try {
      const portCheck = db.prepare('SELECT id FROM portfolios WHERE id = ?').get(portfolio_id);
      if (portCheck) {
        const insertStmt = db.prepare(`
          INSERT INTO ai_analysis_history (
            portfolio_id, mode, blueprint_hash, overall_grade, result_json, model_used
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        insertStmt.run(
          portfolio_id, 
          mode, 
          hash, 
          parsedResult.overallGrade || 'B', 
          JSON.stringify(parsedResult),
          usedModel
        );
      }
    } catch (dbSaveErr) {
      console.warn('[AI Advisor] Warning saving history to DB:', dbSaveErr.message);
    }

    return c.json(parsedResult);
  } catch (error) {
    console.error('[AI Advisor] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export { aiAdvisorRoutes };


