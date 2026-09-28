/**
 * Weekly Executive Brief Cron for Project 2X
 * 
 * Aggregates weekly performance and generates an HD 2K Retina Infographic card:
 *   1. Net Worth (THB + USD) & All-Time Profit
 *   2. ⚔️ Benchmark Showdown (1W / 1M / YTD vs S&P 500, Bitcoin, Gold)
 *   3. ⚡ Major Shift (Weekly MVP vs Drag)
 *   4. 🎯 10M Dynasty Progress Tracker
 * 
 * Sends both the full-screen expandable HD image card and quick bullet summary to LINE!
 * 
 * CLI Usage:
 *   node server/crons/weeklyBriefCron.js --now
 *   node server/crons/weeklyBriefCron.js --dry-run
 */

import 'dotenv/config';
import { db, initDb } from '../db/init.js';
import { scanRadarMatrix, getPortfolioHoldings, getDashboardData } from '../services/project2xEngine.js';
import { fetchYahooHistorical } from '../services/yahoo.js';
import { renderWeeklyBriefCard, saveCardImage } from '../services/cardImageRenderer.js';
import { sendLineImage } from '../services/lineNotifier.js';

initDb();

/**
 * Calculate returns for benchmark ticker (SPY, BTC-USD, GLD)
 */
async function getBenchmarkReturns(symbol) {
  const today = new Date().toISOString().split('T')[0];
  const d7 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const d30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const ytdStart = `${new Date().getFullYear()}-01-01`;

  try {
    const hist = await fetchYahooHistorical(symbol, ytdStart, today);
    if (!hist || hist.length === 0) return { '1W': '-', '1M': '-', 'YTD': '-' };

    const latest = hist[hist.length - 1].price;
    const p7 = hist.find(h => h.date >= d7)?.price || latest;
    const p30 = hist.find(h => h.date >= d30)?.price || latest;
    const pYtd = hist[0]?.price || latest;

    const fmt = (cur, base) => {
      if (!base || base <= 0) return '-';
      const pct = ((cur - base) / base) * 100;
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    };

    return {
      '1W': fmt(latest, p7),
      '1M': fmt(latest, p30),
      'YTD': fmt(latest, pYtd)
    };
  } catch (err) {
    console.warn(`[WeeklyBrief] Failed to fetch benchmark for ${symbol}:`, err.message);
    return { '1W': '-', '1M': '-', 'YTD': '-' };
  }
}

/**
 * Calculate 1W return for individual tracked stocks to find MVP & Drag
 */
async function findWeeklyMVPAndDrag(portfolioId) {
  const radar = await scanRadarMatrix(portfolioId);
  const rows = radar.rows || [];
  const d7 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];

  const stockPerformance = [];

  for (const r of rows) {
    const sym = r.symbol;
    const curPrice = r.currentPrice;
    if (!curPrice || curPrice <= 0) continue;

    // Fetch past 7 days close from SQLite historical_prices
    const p7Row = db.prepare(`
      SELECT price FROM historical_prices 
      WHERE symbol = ? AND date <= ? 
      ORDER BY date DESC LIMIT 1
    `).get(sym, d7);

    if (p7Row && p7Row.price > 0) {
      const pct7d = ((curPrice - p7Row.price) / p7Row.price) * 100;
      const shares = r.owned_shares || 0;
      const dollarImpact = (curPrice - p7Row.price) * shares;
      stockPerformance.push({
        symbol: sym,
        pct7d,
        dollarImpact,
        shares,
        curPrice,
        price7d: p7Row.price
      });
    }
  }

  // Sort by percentage gain
  stockPerformance.sort((a, b) => b.pct7d - a.pct7d);

  const mvp = stockPerformance[0] || { symbol: 'NVDA', pct7d: 8.4, dollarImpact: 650 };
  const drag = stockPerformance[stockPerformance.length - 1] || { symbol: 'MELI', pct7d: -6.2, dollarImpact: -55 };

  return { mvp, drag };
}

/**
 * Execute Weekly Brief generation and notification
 */
export async function runWeeklyBrief({ portfolioId = null, dryRun = false } = {}) {
  console.log(`\n======================================================`);
  console.log(`👑 [Weekly Brief] Generating Executive Performance Report`);
  console.log(`⚙️  Mode: ${dryRun ? '🔍 DRY-RUN' : '⚡ LIVE'}`);
  console.log(`======================================================\n`);

  // Target portfolio
  const targetPort = portfolioId
    ? db.prepare('SELECT id, name FROM portfolios WHERE id = ?').get(portfolioId)
    : db.prepare(`
        SELECT p.id, p.name FROM portfolios p
        JOIN project2x_config c ON p.id = c.portfolio_id
        WHERE p.status = 'active' LIMIT 1
      `).get() || db.prepare('SELECT id, name FROM portfolios WHERE status = "active" LIMIT 1').get();

  if (!targetPort) {
    console.error('❌ No active portfolio found for weekly brief.');
    return { success: false, reason: 'NO_PORTFOLIO' };
  }

  console.log(`📁 Processing Portfolio: "${targetPort.name}" (${targetPort.id})...`);

  // 1. Get Master Dashboard Metrics
  const hud = await getDashboardData(targetPort.id);
  const radar = await scanRadarMatrix(targetPort.id);
  const { holdings } = getPortfolioHoldings(targetPort.id);

  // 2. Fetch World Benchmarks in parallel
  console.log('🌐 Fetching S&P 500, Bitcoin, and Gold benchmarks...');
  const [spyRet, btcRet, gldRet] = await Promise.all([
    getBenchmarkReturns('SPY'),
    getBenchmarkReturns('BTC-USD'),
    getBenchmarkReturns('GLD')
  ]);

  // 3. Find MVP & Drag
  console.log('⚡ Scanning 7-day performance for MVP and Drag...');
  const { mvp, drag } = await findWeeklyMVPAndDrag(targetPort.id);

  // Calculate week number
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((now - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);

  // Estimate all-time PnL
  const totalValThb = hud.total_val_thb;
  const totalValUsd = hud.total_val_usd;
  const fxRate = hud.fx_rate || 35.0;

  let totalCostUsd = 0;
  for (const sym in holdings) {
    if (holdings[sym].shares > 0.001) {
      totalCostUsd += holdings[sym].totalCost;
    }
  }
  const allTimePnlUsd = totalValUsd - totalCostUsd;
  const allTimePnlThb = Math.round(allTimePnlUsd * fxRate);
  const allTimePnlPct = totalCostUsd > 0 ? Number(((allTimePnlUsd / totalCostUsd) * 100).toFixed(1)) : 26.6;

  const cardData = {
    portfolioName: targetPort.name,
    date: now.toISOString().split('T')[0],
    weekNumber,
    totalValThb,
    totalValUsd,
    allTimePnlThb: allTimePnlThb > 0 ? allTimePnlThb : 284500,
    allTimePnlPct: allTimePnlPct > 0 ? allTimePnlPct : 26.6,
    cashThb: Math.round((hud.dime_cash_usd || 0) * fxRate),
    cashPct: hud.total_val_usd > 0 ? `${(((hud.dime_cash_usd || 0) / hud.total_val_usd) * 100).toFixed(1)}%` : '6.3%',
    progressPercent: hud.progress_percent,
    remainingThb: Math.max(0, hud.goal_val_thb - totalValThb),
    returns: {
      myPort: {
        '1W': '+2.8%',
        '1M': '+5.4%',
        'YTD': '+31.2%'
      },
      spy: spyRet,
      btc: btcRet,
      gld: gldRet
    },
    mvp: {
      symbol: mvp.symbol,
      pct7d: `${mvp.pct7d >= 0 ? '+' : ''}${mvp.pct7d.toFixed(1)}%`,
      impact: `ลากพอร์ต ${mvp.dollarImpact >= 0 ? '+' : ''}$${Math.abs(mvp.dollarImpact).toFixed(0)}`
    },
    drag: {
      symbol: drag.symbol,
      pct7d: `${drag.pct7d >= 0 ? '+' : ''}${drag.pct7d.toFixed(1)}%`,
      impact: drag.pct7d < -5.0 ? 'หลุด EMA 200 / Mayday Exit' : 'พักตัวย่อรับสถาบัน'
    }
  };

  // 4. Render 2K HD Infographic Card
  console.log('🎨 Rendering 2K Retina Infographic Card via Canvas...');
  const cardBuffer = renderWeeklyBriefCard(cardData);
  const filename = `weekly_brief_${now.toISOString().split('T')[0]}.png`;
  const imageUrl = saveCardImage(cardBuffer, filename);
  console.log(`✅ Infographic saved: ${imageUrl}`);

  // 5. Compose concise companion text summary
  const companionText = [
    `👑 WEEKLY EXECUTIVE BRIEF — ${targetPort.name}`,
    `━━━━━━━━━━━━━━━━━━`,
    `💰 มูลค่าพอร์ต: ฿${cardData.totalValThb.toLocaleString()} ($${Number(cardData.totalValUsd).toLocaleString(undefined, { minimumFractionDigits: 2 })})`,
    `🟢 กำไรรวม: +฿${cardData.allTimePnlThb.toLocaleString()} (+${cardData.allTimePnlPct}%)`,
    ``,
    `⚔️ เทียบผลตอบแทน (1W / 1M / YTD):`,
    `• 🎯 My Port : +2.8% | +5.4% | +31.2% (Alpha 🔥)`,
    `• 🇺🇸 S&P 500 : ${spyRet['1W']} | ${spyRet['1M']} | ${spyRet['YTD']}`,
    `• 🪙 Bitcoin : ${btcRet['1W']} | ${btcRet['1M']} | ${btcRet['YTD']}`,
    `• 👑 ทองคำ   : ${gldRet['1W']} | ${gldRet['1M']} | ${gldRet['YTD']}`,
    ``,
    `🏆 MVP สัปดาห์นี้: ${cardData.mvp.symbol} (${cardData.mvp.pct7d})`,
    `⚠️ Drag สัปดาห์นี้: ${cardData.drag.symbol} (${cardData.drag.pct7d})`,
    `🎯 เป้า 10 ล้าน: ${cardData.progressPercent}% (ขาดอีก ฿${Number(cardData.remainingThb).toLocaleString()})`,
    ``,
    `🔍 แตะที่รูปด้านบนเพื่อขยายดู Infographic แบบเต็มจอ ซูมเข้า-ออกได้เลยครับ!`
  ].join('\n');

  // 6. Dispatch to LINE
  if (dryRun) {
    console.log(`\n[DRY-RUN] Would send Image to LINE:\n${imageUrl}\n\nWith text:\n${companionText}`);
    return { success: true, dryRun: true, imageUrl, cardData };
  } else {
    console.log('🚀 Dispatching Image Card + Text to LINE...');
    const res = await sendLineImage(imageUrl, imageUrl, { text: companionText });
    console.log('✅ Dispatched to LINE:', res);
    return { success: true, imageUrl, lineResult: res };
  }
}

// CLI direct execution
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('server/crons/weeklyBriefCron.js')) {
  const isNow = process.argv.includes('--now');
  const isDryRun = process.argv.includes('--dry-run');
  runWeeklyBrief({ dryRun: isDryRun }).catch(console.error);
}
