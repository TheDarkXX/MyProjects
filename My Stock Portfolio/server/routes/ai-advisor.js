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
  
  const combined = blueprints.map(b => {
    const f = fundamentals[b.symbol] || {};
    return { 
      symbol: b.symbol,
      target_percent: b.target_percent,
      category: b.category,
      sector: f.sector || b.category || 'Other',
      pe_trailing: f.pe_trailing || 0,
      beta: f.beta || 1,
      div_yield: f.div_yield || 0,
      revenue_growth: f.revenue_growth || 0
    };
  }).sort((a, b) => b.target_percent - a.target_percent);

  const summary = {
    totalHoldings: count,
    avgPe: Number((combined.reduce((acc, c) => acc + (c.pe_trailing || 0), 0) / (count || 1)).toFixed(1)),
    avgBeta: Number((combined.reduce((acc, c) => acc + (c.beta || 1), 0) / (count || 1)).toFixed(2)),
  };

  return { summary, holdings: combined };
}

// Check and fetch latest analysis for a portfolio, detecting if blueprint has changed
aiAdvisorRoutes.post('/latest', async (c) => {
  try {
    const { portfolio_id, blueprints } = await c.req.json();
    if (!portfolio_id) {
      return c.json({ error: 'Missing portfolio_id' }, 400);
    }

    const row = db.prepare(`
      SELECT * FROM ai_analysis_history 
      WHERE portfolio_id = ? 
      ORDER BY created_at DESC LIMIT 1
    `).get(portfolio_id);

    if (!row) {
      return c.json({ found: false });
    }

    const currentHash = createBlueprintHash(blueprints || []);
    const isStale = currentHash !== row.blueprint_hash;

    let parsedResult = null;
    try {
      parsedResult = JSON.parse(row.result_json);
    } catch (e) {
      console.warn('[AI Advisor Latest] JSON parse error:', e.message);
    }

    return c.json({
      found: true,
      isStale,
      mode: row.mode,
      blueprint_hash: row.blueprint_hash,
      overallGrade: row.overall_grade,
      result: parsedResult,
      modelUsed: row.model_used,
      createdAt: row.created_at
    });
  } catch (err) {
    console.error('[AI Advisor Latest] Error:', err);
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
        // Ignore stale or old English fallback cache
        const isOldMock = cached.result_json.includes('Solid Blueprint Structure') || cached.result_json.includes('Needs Periodic Review');
        const createdTime = new Date(cached.created_at).getTime();
        if (!isOldMock && (Date.now() - createdTime < 6 * 60 * 60 * 1000)) {
          return c.json(JSON.parse(cached.result_json));
        }
      }
    } catch (dbErr) {
      console.warn('[AI Advisor] Cache lookup warning:', dbErr.message);
    }

    // Compress data
    const payloadData = compressPromptData(blueprints, fundamentals || {});
    
    const isStrategist = mode === 'strategist';

    const systemPrompt = `คุณคือสุดยอดนักกลยุทธ์การลงทุนระดับโลก (Elite Chief Investment Strategist)
มีหน้าที่วิเคราะห์ Blueprint พอร์ตโฟลิโออย่างเฉียบคม ชี้จุดแข็ง จุดเสี่ยง และแนะนำการปรับพอร์ตแบบ Actionable เชิงลึก

กฎเหล็กเรื่องภาษา (Strict Language Rule):
- คำวิเคราะห์ทั้งหมด (Strengths, Weaknesses, Suggestions, Reasons, Roadmap, Macro, Role) ต้องเขียนเป็น "ภาษาไทยที่สละสลวย เข้าใจง่าย กระชับ ตรงประเด็นแบบมืออาชีพ" ยกเว้นชื่อย่อหุ้น (Tickers) หรือ Heading เฉพาะ
- ห้ามตอบเป็นภาษาอังกฤษในเนื้อหาคำอธิบายโดยเด็ดขาด

ข้อมูลพอร์ต:
${JSON.stringify(payloadData, null, 2)}

โหมดการวิเคราะห์: ${mode.toUpperCase()}

จงตอบกลับเป็น Single Valid JSON Object เท่านั้น (ห้ามใส่คำเกริ่น ห้ามใส่ Markdown code block ห้ามมีข้อความอื่นนอก JSON) ตามโครงสร้างนี้:
{
  "overallGrade": "A" | "A-" | "B+" | "B" | "B-" | "C" | "D",
  "radarData": {
    "diversification": number (0-100),
    "valuation": number (0-100),
    "growth": number (0-100),
    "risk": number (0-100),
    "income": number (0-100)
  },
  "macroAnalysis": "วิเคราะห์ภาพรวมเศรษฐกิจมหภาค ทิศทางดอกเบี้ย และธีมเทคโนโลยี/อุตสาหกรรมที่กระทบพอร์ตนี้ เป็นภาษาไทย (2-4 บรรทัด)",
  "strengths": [
    { "title": "หัวข้อจุดแข็งที่ 1 ภาษาไทย", "description": "คำอธิบายเชิงลึกภาษาไทย พร้อมเหตุผล" },
    { "title": "หัวข้อจุดแข็งที่ 2 ภาษาไทย", "description": "คำอธิบายเชิงลึกภาษาไทย พร้อมเหตุผล" },
    { "title": "หัวข้อจุดแข็งที่ 3 ภาษาไทย", "description": "คำอธิบายเชิงลึกภาษาไทย พร้อมเหตุผล" }
  ],
  "weaknesses": [
    { "title": "หัวข้อจุดเสี่ยงที่ 1 ภาษาไทย", "description": "คำอธิบายจุดเสี่ยงภาษาไทย เช่น การกระจุกตัว ความผันผวน หรือการขาดกลุ่มป้องกัน" },
    { "title": "หัวข้อจุดเสี่ยงที่ 2 ภาษาไทย", "description": "คำอธิบายจุดเสี่ยงภาษาไทย พร้อมผลกระทบ" },
    { "title": "หัวข้อจุดเสี่ยงที่ 3 ภาษาไทย", "description": "คำอธิบายจุดเสี่ยงภาษาไทย พร้อมผลกระทบ" }
  ],
  "suggestions": [
    {
      "action": "ADD" | "REDUCE" | "SWAP" | "REMOVE",
      "symbol": "TICKER",
      "percent": number,
      "category": "หมวดกลยุทธ์ เช่น Core, Growth, Dividend, Cash",
      "reason": "เหตุผลเชิงกลยุทธ์ภาษาไทยอย่างชัดเจน ทำไมต้องปรับสัดส่วนนี้"
    }
  ],
  ${isStrategist ? `
  "idealBlueprint": [
    // สร้างสัดส่วนพิมพ์เขียวในอุดมคติสำหรับหุ้นทุกตัวในพอร์ต เปรียบเทียบ currentPercent กับ idealPercent พร้อมบอก role ภาษาไทย
    { "symbol": "TICKER", "currentPercent": number, "idealPercent": number, "change": number, "role": "บทบาทเชิงกลยุทธ์ เช่น หุ้นเติบโตหลัก, สินทรัพย์ลดความผันผวน, ปันผลสร้างกระแสเงินสด" }
  ],
  "actionRoadmap": [
    { "phase": "ระยะเร่งด่วน (1-2 สัปดาห์)", "action": "ขั้นตอนการปรับสัดส่วนทันทีเพื่อลดความเสี่ยงเฉพาะหน้า เป็นภาษาไทย" },
    { "phase": "ระยะกลาง (1-3 เดือน)", "action": "ขั้นตอนการเข้าซื้อหรือสะสมหุ้นคุณภาพตามระดับราคาที่เหมาะสม เป็นภาษาไทย" },
    { "phase": "การบริหารสภาพคล่อง", "action": "แนวทางการสำรองเงินสด (Cash Reserve) เพื่อรอจังหวะช้อนซื้อเมื่อตลาดผันผวน เป็นภาษาไทย" }
  ],
  ` : ''}
  "missingExposure": ["กลุ่มอุตสาหกรรมหรือสินทรัพย์ที่ขาดหายไปในพอร์ต เช่น Defensive, Healthcare, Cash Buffer"],
  "riskScore": number (0-100, ยิ่งสูงยิ่งผันผวนเสี่ยงสูง)
}`;

    let jsonContent = '';
    let usedModel = LOCAL_TERRA_MODEL;

    // 1. Try local Hermes GPT 5.6 Terra first
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
          max_tokens: 3000
        }),
        signal: AbortSignal.timeout(50000)
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          jsonContent = content.trim();
        }
      } else {
        console.warn(`[AI Advisor] Local Terra returned status ${response.status}`);
      }
    } catch (terraErr) {
      console.warn('[AI Advisor] Local Terra failed, falling back to Brain Gateway:', terraErr.message);
    }

    // 2. Fallback to Brain AI Gateway (gemini-3.1-pro-preview) if local Terra was unavailable
    if (!jsonContent) {
      usedModel = 'gemini-3.1-pro-preview';
      try {
        const fallbackRes = await fetch(FALLBACK_GATEWAY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FALLBACK_GATEWAY_TOKEN}`
          },
          body: JSON.stringify({
            message: systemPrompt,
            model: 'gemini-3.1-pro-preview'
          }),
          signal: AbortSignal.timeout(45000)
        });

        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          if (fbData && fbData.reply && !fbData.reply.startsWith('AI Error:')) {
            jsonContent = fbData.reply.trim();
          }
        }
      } catch (fbErr) {
        console.error('[AI Advisor] Fallback Gateway also failed:', fbErr.message);
      }
    }

    if (!jsonContent) {
      throw new Error('AI engines are currently busy. Please retry in a few moments.');
    }

    // Strip markdown code fences if present
    if (jsonContent.includes('```json')) {
      jsonContent = jsonContent.split('```json')[1].split('```')[0].trim();
    } else if (jsonContent.includes('```')) {
      jsonContent = jsonContent.split('```')[1].split('```')[0].trim();
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(jsonContent);
    } catch (parseErr) {
      console.error('[AI Advisor] JSON parse error:', parseErr.message, 'Raw content:', jsonContent.slice(0, 300));
      parsedResult = {
        overallGrade: 'B',
        radarData: { diversification: 60, valuation: 65, growth: 80, risk: 65, income: 40 },
        macroAnalysis: 'พอร์ตโฟลิโอมีสัดส่วนหลักในหุ้นเทคโนโลยีและหุ้นเติบโตสูง ควรจับตาปัจจัยทิศทางอัตราดอกเบี้ยและการประเมินมูลค่าหุ้นกลุ่ม AI',
        strengths: [
          { title: 'มีหุ้นแกนหลักคุณภาพสูง', description: 'บริษัทส่วนใหญ่ในพอร์ตมีสถานะทางการเงินและโมเดลธุรกิจที่แข็งแกร่ง' }
        ],
        weaknesses: [
          { title: 'สัดส่วนอาจกระจุกตัวในบางธีม', description: 'ควรพิจารณากระจายความเสี่ยงข้ามกลุ่มอุตสาหกรรมเพื่อลดความผันผวน' }
        ],
        suggestions: [],
        missingExposure: ['Healthcare', 'Financials'],
        riskScore: 65
      };
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


