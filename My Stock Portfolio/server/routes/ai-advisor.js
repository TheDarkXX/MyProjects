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

function compressPromptData(blueprints, fundamentals) {
  const count = blueprints.length;
  
  const holdings = blueprints.map(b => {
    const f = fundamentals[b.symbol] || {};
    return {
      symbol: b.symbol,
      target_percent: b.target_percent,
      sector: f.sector || b.category || 'Other',
      industry: f.industry || '',
      market_cap: f.market_cap || 0,
      current_price: f.current_price || 0,
      pe_trailing: f.pe_trailing || 0,
      pe_forward: f.pe_forward || 0,
      pb_ratio: f.pb_ratio || 0,
      roe: f.roe || 0,
      profit_margin: f.profit_margin || 0,
      debt_to_equity: f.debt_to_equity || 0,
      revenue_growth: f.revenue_growth || 0,
      beta: f.beta || 1,
      div_yield: f.div_yield || 0,
      short_percent: f.short_percent || 0,
      fifty_two_week_high: f.fifty_two_week_high || 0,
      fifty_two_week_low: f.fifty_two_week_low || 0,
      sma200: f.sma200 || 0,
      target_mean_price: f.target_mean_price || 0,
      recommendation_key: f.recommendation_key || '',
      num_analyst_opinions: f.num_analyst_opinions || 0,
      eps_growth_next_year: f.eps_growth_next_year || 0,
      rec_strong_buy: f.rec_strong_buy || 0,
      rec_buy: f.rec_buy || 0,
      rec_hold: f.rec_hold || 0,
      rec_sell: f.rec_sell || 0,
      earnings_beat_streak: f.earnings_beat_streak || 0,
      earnings_q1_surprise: f.earnings_q1_surprise || 0,
    };
  }).sort((a, b) => b.target_percent - a.target_percent);

  const summary = {
    totalHoldings: count,
    avgPe: Number((holdings.reduce((acc, c) => acc + (c.pe_trailing || 0), 0) / (count || 1)).toFixed(1)),
    avgBeta: Number((holdings.reduce((acc, c) => acc + (c.beta || 1), 0) / (count || 1)).toFixed(2)),
    top5Concentration: holdings.slice(0, 5).reduce((s, h) => s + h.target_percent, 0),
  };

  return { summary, holdings };
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
    const { mode, blueprints, fundamentals, portfolio_id } = body;

    if (!mode || !blueprints || !portfolio_id) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const hash = createBlueprintHash(blueprints);

    // Check DB for existing valid cache (< 6 hours)
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

    // Compress data
    const payloadData = compressPromptData(blueprints, fundamentals || {});
    
    const isStrategist = mode === 'strategist';

    const systemPrompt = `คุณคือ Chief Investment Strategist ระดับ Wall Street
ปรัชญา: Joseph Carlson (Dividend Growth, Cash Flow, Moat) × Shay Booler (Fundamental แน่น ตัดสินเด็ดขาด)
โทนเสียง: ตรงไปตรงมา ดุดัน กระชับ ฟันธง ไม่อ้อมค้อม (ไม่ใช้คำว่า มึง/กู)

กฎเหล็กเรื่องภาษา (Strict Language Rule):
- คำวิเคราะห์ทั้งหมดต้องเขียนเป็น "ภาษาไทยที่สละสลวย เข้าใจง่าย กระชับ ตรงประเด็นแบบมืออาชีพ" ยกเว้นชื่อย่อหุ้น (Tickers) หรือ Heading เฉพาะ
- ห้ามตอบเป็นภาษาอังกฤษในเนื้อหาคำอธิบายโดยเด็ดขาด

ข้อมูลเชิงอนาคตที่ได้รับ (Analyst Consensus):
- Analyst Price Target: คำนวณ Upside/Downside จากราคาปัจจุบัน (target_mean_price)
- Buy/Hold/Sell: สรุปว่านักวิเคราะห์ส่วนใหญ่มองยังไง
- EPS Growth Forecast: กำไรจะโตแค่ไหนปีหน้า
- Earnings Beat Streak: บริษัทเอาชนะคาดการณ์กี่ไตรมาสติด

คำสั่ง Future Story:
1. ใช้ตัวเลข Analyst Consensus + EPS Growth เพื่อประเมิน "เรื่องเล่าอนาคต"
2. ใช้ Earnings Beat Streak บอกว่าบริษัทส่งมอบผลงานจริงตามที่สัญญาไว้หรือไม่
3. ใช้ความรู้ของคุณ (Training Data) เกี่ยวกับ Earnings Call, แผนธุรกิจ, CEO Vision, Product Roadmap เพื่อเติม Context ให้ลึกระดับนักวิเคราะห์มืออาชีพ
4. ห้ามตอบกลางๆ Generic — ต้องชี้ชื่อหุ้น + ตัวเลข + เหตุผลเสมอ

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
  "macroAnalysis": "ภาพรวมเศรษฐกิจมหภาค ทิศทางดอกเบี้ย และธีมเทคโนโลยีที่กระทบพอร์ตนี้ ภาษาไทย (2-4 บรรทัด)",
  "portfolioStyle": "สไตล์พอร์ต เช่น Aggressive Growth / Balanced / Dividend Income / Defensive",
  "concentrationRisk": "ความเสี่ยงกระจุกตัว Top3/5 หรือ Overlap warnings ภาษาไทย (1-2 บรรทัด)",
  "dividendHealth": "สุขภาพปันผล Portfolio Yield และระวัง Yield Trap (1-2 บรรทัด)",
  "strengths": [
    { "title": "หัวข้อจุดแข็งภาษาไทย", "description": "ชี้ตัวเลขและชื่อหุ้นประกอบ พร้อมเหตุผลภาษาไทย" }
  ],
  "weaknesses": [
    { "title": "หัวข้อจุดเสี่ยงภาษาไทย", "description": "ชี้ตัวถ่วง พร้อมเหตุผลเชิงตัวเลข" }
  ],
  "suggestions": [
    {
      "action": "ADD" | "REDUCE" | "SWAP" | "REMOVE",
      "symbol": "TICKER",
      "percent": number,
      "category": "หมวดกลยุทธ์",
      "reason": "เหตุผลเชิงกลยุทธ์ ตัดตัวไหน ไปโปะตัวไหน ทำไม"
    }
  ],
  ${isStrategist ? `
  "stockVerdicts": [
    { "symbol": "TICKER", "grade": "A-D", "role": "บทบาทในพอร์ต", "flag": "HOLD/REDUCE/ADD", "futureOutlook": "สรุปอนาคต 1 บรรทัดอิงจาก Consensus" }
  ],
  "idealBlueprint": [
    { "symbol": "TICKER", "currentPercent": number, "idealPercent": number, "change": number, "role": "บทบาทเชิงกลยุทธ์" }
  ],
  "actionRoadmap": [
    { "phase": "ระยะเร่งด่วน (1-2 สัปดาห์)", "action": "ขั้นตอนการปรับสัดส่วนทันที" },
    { "phase": "ระยะกลาง (1-3 เดือน)", "action": "ขั้นตอนสะสมหุ้นตามระดับราคา" }
  ],
  "stressTest": [
    { "scenario": "ชื่อสถานการณ์ เช่น 'AI Bubble Burst' หรือ 'Rate Hike Shock'", "impact": "หุ้นที่โดนกระทบและเหตุผล", "estDrawdown": "ตัวเลข % (เช่น -15% ถึง -25%)" }
  ],
  ` : ''}
  "missingExposure": ["กลุ่มที่ขาดหายไป เช่น Defensive, Healthcare"],
  "riskScore": number (0-100)
}`;

    let jsonContent = '';
    const usedModel = 'gpt-5.6-terra-high';

    // Call Hermes GPT 5.6 Terra on local proxy (NO Fallback - Strict GPT-5.6 Terra Only)
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
            { role: 'system', content: 'You are an elite investment strategist. Output ONLY a single valid raw JSON object matching the requested schema. Do not include markdown fences, backticks, or any explanation text.' },
            { role: 'user', content: systemPrompt }
          ],
          max_tokens: 8000
        }),
        signal: AbortSignal.timeout(180000) // 3 minutes timeout for complete 15-section generation
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`GPT-5.6 Terra returned status ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        throw new Error('GPT-5.6 Terra returned an empty response.');
      }
      jsonContent = content.trim();
    } catch (terraErr) {
      console.error('[AI Advisor] GPT-5.6 Terra error (Strict Mode, No Fallback):', terraErr.message);
      throw terraErr;
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


