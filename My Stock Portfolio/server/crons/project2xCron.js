/**
 * Project 2X: Autonomous Buy/Sell Notification Cron
 * 
 * Scans Project 2X portfolios and triggers high-signal actionable alerts to LINE:
 *   1. 🔥 BUY NOW! (Scenarios 5-8 + above EMA 9 + Banker >= 1) -> Sent daily until status changes
 *   2. 🚨 MAYDAY EXIT (Scenarios 1-3 on held positions) -> Sent FIRST-DAY ONLY
 * 
 * Scheduled at 10:00 AM America/New_York (30 minutes after US market open)
 *   - Summer (EDT): 21:00 ICT
 *   - Winter (EST): 22:00 ICT
 * 
 * CLI Usage:
 *   node server/crons/project2xCron.js --now          # Run scan immediately and exit
 *   node server/crons/project2xCron.js --dry-run      # Test scan without sending LINE or saving logs
 *   node server/crons/project2xCron.js --force        # Bypass dedup checks
 *   node server/crons/project2xCron.js --portfolio=ID # Target specific portfolio
 */

import 'dotenv/config';
import { db, initDb } from '../db/init.js';
import { scanRadarMatrix, getPortfolioHoldings } from '../services/project2xEngine.js';
import { formatBuyNowMessage, formatMaydayExitMessage, sendLineMessage, sendLineImage } from '../services/lineNotifier.js';
import { renderBuyNowCard, renderMaydayExitCard, saveCardImage } from '../services/cardImageRenderer.js';

// Ensure DB is initialized
initDb();

/**
 * Get current date in America/New_York (YYYY-MM-DD)
 */
export function getMarketDate(d = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/**
 * Get date N days ago in America/New_York (YYYY-MM-DD)
 */
export function getPastMarketDate(daysAgo = 4) {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/**
 * Check if current time is 10:00 AM New York time on a weekday (Mon-Fri)
 */
export function isNyMarketOpenPlus30(now = new Date()) {
  const nyStr = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
  const nyDate = new Date(nyStr);
  const hours = nyDate.getHours();
  const minutes = nyDate.getMinutes();
  const day = nyDate.getDay(); // 0 = Sun, 6 = Sat

  const isWeekday = day >= 1 && day <= 5;
  const is1000AM = hours === 10 && minutes === 0;

  return isWeekday && is1000AM;
}

/**
 * Core Scanner & Alert Dispatcher
 * 
 * @param {object} options
 * @param {string} [options.portfolioId] - Specific portfolio to scan
 * @param {boolean} [options.dryRun] - Print signals without sending or DB commit
 * @param {boolean} [options.force] - Ignore deduplication checks
 * @param {string} [options.date] - Override target date (YYYY-MM-DD)
 * @returns {Promise<object>} Results summary
 */
export async function runProject2xScan({
  portfolioId = null,
  dryRun = false,
  force = false,
  date = null
} = {}) {
  const today = date || getMarketDate();
  const recentThreshold = getPastMarketDate(4); // Last 4 calendar days (covers Fri-Mon)

  console.log(`\n======================================================`);
  console.log(`🚀 [Project 2X Cron] Starting Autonomous Scan`);
  console.log(`📅 Target Date: ${today} (US Market Time)`);
  console.log(`⚙️  Mode: ${dryRun ? '🔍 DRY-RUN (Simulation)' : '⚡ LIVE'}${force ? ' (FORCED)' : ''}`);
  console.log(`======================================================\n`);

  // Target portfolios: specified or all active with quotas
  let targetPorts = [];
  if (portfolioId) {
    const p = db.prepare('SELECT id, name FROM portfolios WHERE id = ?').get(portfolioId);
    if (p) targetPorts.push(p);
  } else {
    targetPorts = db.prepare(`
      SELECT DISTINCT p.id, p.name 
      FROM portfolios p
      JOIN project2x_share_quotas q ON p.id = q.portfolio_id
      WHERE p.status = 'active'
    `).all();
  }

  if (targetPorts.length === 0) {
    console.log('⚠️ [Project 2X Cron] No active Project 2X portfolios found.');
    return { success: true, message: 'No target portfolios found', scannedCount: 0, sentCount: 0 };
  }

  const allSentAlerts = [];
  const allSkippedAlerts = [];
  let totalScanned = 0;

  for (const port of targetPorts) {
    console.log(`\n📁 Scanning Portfolio: "${port.name}" (${port.id})...`);
    
    // 1. Get live radar matrix
    const radar = await scanRadarMatrix(port.id);
    const { holdings } = getPortfolioHoldings(port.id);
    const rows = radar?.rows || [];
    totalScanned += rows.length;

    console.log(`   Found ${rows.length} tracked stocks in radar.`);

    for (const row of rows) {
      const sym = row.symbol.toUpperCase();
      const trafficLight = row.traffic_light;
      const scenario = row.scenario;
      const ownedShares = row.owned_shares || 0;

      // Attach cost basis if held
      let costBasis = null;
      if (holdings[sym] && holdings[sym].shares > 0) {
        costBasis = holdings[sym].totalCost / holdings[sym].shares;
      }
      const itemWithCost = { ...row, costBasis };

      // ----------------------------------------------------
      // CASE 1: 🔥 BUY NOW! (Scenarios 5-8)
      // Cadence: Everyday until status changes
      // ----------------------------------------------------
      if (trafficLight === 'BUY_NOW') {
        const sentToday = db.prepare(`
          SELECT id FROM project2x_cron_logs
          WHERE portfolio_id = ? AND symbol = ? AND type = 'BUY_NOW' AND date = ?
        `).get(port.id, sym, today);

        if (sentToday && !force) {
          allSkippedAlerts.push({
            portfolio_id: port.id,
            portfolio_name: port.name,
            symbol: sym,
            type: 'BUY_NOW',
            reason: 'ALREADY_SENT_TODAY'
          });
          console.log(`   ⏩ [BUY_NOW] ${sym}: Already notified today (${today}). Skipping.`);
          continue;
        }

        // Format message
        const msgText = formatBuyNowMessage(itemWithCost);
        const alertTitle = `BUY NOW: ${sym} ($${itemWithCost.currentPrice})`;

        if (dryRun) {
          console.log(`   🎯 [DRY-RUN BUY_NOW] ${sym}:\n${msgText}\n`);
          allSentAlerts.push({
            portfolio_id: port.id,
            portfolio_name: port.name,
            symbol: sym,
            type: 'BUY_NOW',
            scenario,
            price: itemWithCost.currentPrice,
            title: alertTitle,
            dryRun: true
          });
        } else {
          // Render 2K HD Retina Card Image
          const cardBuf = renderBuyNowCard(itemWithCost);
          const cardFilename = `${sym}_BUY_NOW_${today}.png`;
          const cardUrl = saveCardImage(cardBuf, cardFilename);

          // Live send with full-screen expandable image card + companion text
          const sendRes = await sendLineImage(cardUrl, cardUrl, { text: msgText });
          
          // Log into DB
          db.prepare(`
            INSERT INTO project2x_cron_logs (
              portfolio_id, date, type, symbol, scenario, tier_id, price, title, payload_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).run(
            port.id,
            today,
            'BUY_NOW',
            sym,
            scenario,
            row.category || 'Core',
            itemWithCost.currentPrice,
            alertTitle,
            JSON.stringify(itemWithCost)
          );

          allSentAlerts.push({
            portfolio_id: port.id,
            portfolio_name: port.name,
            symbol: sym,
            type: 'BUY_NOW',
            scenario,
            price: itemWithCost.currentPrice,
            title: alertTitle,
            imageUrl: cardUrl,
            lineStatus: sendRes
          });
          console.log(`   🔥 [BUY_NOW SENT] ${sym} -> HD Image Card (${cardUrl}) dispatched to LINE.`);
        }
      }

      // ----------------------------------------------------
      // CASE 2: 🚨 MAYDAY EXIT (Scenarios 1-3 on held positions)
      // Cadence: First-Day Only (Do not spam on consecutive breakdown days)
      // ----------------------------------------------------
      else if (trafficLight === 'MAYDAY_EXIT' && ownedShares > 0) {
        // Check if sent today
        const sentToday = db.prepare(`
          SELECT id FROM project2x_cron_logs
          WHERE portfolio_id = ? AND symbol = ? AND type = 'MAYDAY_EXIT' AND date = ?
        `).get(port.id, sym, today);

        if (sentToday && !force) {
          allSkippedAlerts.push({
            portfolio_id: port.id,
            portfolio_name: port.name,
            symbol: sym,
            type: 'MAYDAY_EXIT',
            reason: 'ALREADY_SENT_TODAY'
          });
          console.log(`   ⏩ [MAYDAY_EXIT] ${sym}: Already notified today (${today}). Skipping.`);
          continue;
        }

        // Check if previously alerted in recent prior days (Day 2+ of ongoing breakdown)
        const recentPastAlert = db.prepare(`
          SELECT date FROM project2x_cron_logs
          WHERE portfolio_id = ? AND symbol = ? AND type = 'MAYDAY_EXIT' AND date >= ? AND date < ?
          ORDER BY date DESC LIMIT 1
        `).get(port.id, sym, recentThreshold, today);

        if (recentPastAlert && !force) {
          allSkippedAlerts.push({
            portfolio_id: port.id,
            portfolio_name: port.name,
            symbol: sym,
            type: 'MAYDAY_EXIT',
            reason: `ONGOING_BREAKDOWN_ALREADY_ALERTED_FIRST_DAY (Last alert on ${recentPastAlert.date})`
          });
          console.log(`   🛡️ [MAYDAY_EXIT] ${sym}: Ongoing breakdown (First day alert was sent on ${recentPastAlert.date}). Suppressing duplicate.`);
          continue;
        }

        // First day of breakdown! Trigger Mayday alert!
        const msgText = formatMaydayExitMessage(itemWithCost);
        const alertTitle = `MAYDAY EXIT: ${sym} ($${itemWithCost.currentPrice})`;

        if (dryRun) {
          console.log(`   🚨 [DRY-RUN MAYDAY_EXIT] ${sym}:\n${msgText}\n`);
          allSentAlerts.push({
            portfolio_id: port.id,
            portfolio_name: port.name,
            symbol: sym,
            type: 'MAYDAY_EXIT',
            scenario,
            price: itemWithCost.currentPrice,
            title: alertTitle,
            dryRun: true
          });
        } else {
          // Render 2K HD Retina Card Image
          const cardBuf = renderMaydayExitCard(itemWithCost);
          const cardFilename = `${sym}_MAYDAY_EXIT_${today}.png`;
          const cardUrl = saveCardImage(cardBuf, cardFilename);

          // Live send with full-screen expandable image card + companion text
          const sendRes = await sendLineImage(cardUrl, cardUrl, { text: msgText });

          // Log into DB
          db.prepare(`
            INSERT INTO project2x_cron_logs (
              portfolio_id, date, type, symbol, scenario, tier_id, price, title, payload_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).run(
            port.id,
            today,
            'MAYDAY_EXIT',
            sym,
            scenario,
            row.category || 'Core',
            itemWithCost.currentPrice,
            alertTitle,
            JSON.stringify(itemWithCost)
          );

          allSentAlerts.push({
            portfolio_id: port.id,
            portfolio_name: port.name,
            symbol: sym,
            type: 'MAYDAY_EXIT',
            scenario,
            price: itemWithCost.currentPrice,
            title: alertTitle,
            imageUrl: cardUrl,
            lineStatus: sendRes
          });
          console.log(`   🚨 [MAYDAY_EXIT SENT] ${sym} -> HD Image Card (${cardUrl}) dispatched to LINE.`);
        }
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`✅ [Project 2X Cron] Scan Completed`);
  console.log(`📊 Scanned: ${totalScanned} stocks | Dispatched: ${allSentAlerts.length} | Skipped: ${allSkippedAlerts.length}`);
  console.log(`======================================================\n`);

  return {
    success: true,
    timestamp: new Date().toISOString(),
    marketDate: today,
    scannedCount: totalScanned,
    sentCount: allSentAlerts.length,
    skippedCount: allSkippedAlerts.length,
    sentAlerts: allSentAlerts,
    skippedAlerts: allSkippedAlerts
  };
}

// ----------------------------------------------------
// CLI & Scheduler Runner
// ----------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const isNow = args.includes('--now');
  const isDryRun = args.includes('--dry-run');
  const isForce = args.includes('--force');

  let portfolioId = null;
  const portArg = args.find(a => a.startsWith('--portfolio='));
  if (portArg) {
    portfolioId = portArg.split('=')[1];
  }

  // 1. One-off immediate run
  if (isNow || isDryRun) {
    await runProject2xScan({
      portfolioId,
      dryRun: isDryRun,
      force: isForce
    });
    process.exit(0);
  }

  // 2. Standing daemon scheduler mode (Checks every 60s for 10:00 AM America/New_York)
  console.log('⏰ [Project 2X Daemon] Scheduler initialized.');
  console.log('   Target Slot: 10:00 AM America/New_York (Mon-Fri)');
  console.log('   (Summer EDT: 21:00 ICT | Winter EST: 22:00 ICT)');
  console.log('   Listening for market trigger every 60 seconds...\n');

  let lastExecutedSlot = '';

  setInterval(async () => {
    const now = new Date();
    if (isNyMarketOpenPlus30(now)) {
      const todaySlot = getMarketDate(now);
      if (lastExecutedSlot !== todaySlot) {
        lastExecutedSlot = todaySlot;
        console.log(`\n⏰ [${now.toISOString()}] Scheduled 10:00 AM NY Market Open+30 trigger fired!`);
        try {
          await runProject2xScan({ portfolioId, dryRun: false, force: false });
        } catch (err) {
          console.error('❌ [Project 2X Cron] Scheduled execution failed:', err);
        }
      }
    }
  }, 60000);
}

// Only execute CLI runner when executed directly
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('server/crons/project2xCron.js')) {
  main().catch(err => {
    console.error('❌ [Project 2X Cron] Fatal error:', err);
    process.exit(1);
  });
}
