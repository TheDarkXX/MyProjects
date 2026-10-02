import { runNewsScan, getPublicationTimingStats } from '../services/newsRadar.js';
import { generateNewsDigest } from '../services/newsDigest.js';

/**
 * News Radar Scheduler
 * Can be run via node crons/newsScheduler.js
 * Flags:
 *   --now : Run a single scan immediately and exit
 *   --stats : Print publication timing stats and exit
 *   --digest-weekly : Run weekly AI News Digest (7-day lookback + LINE notify) and exit
 *   --digest-3d : Run 3-day AI News Digest and exit
 */

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--stats')) {
    console.log('\n📊 === Beehiiv Publication Timing Stats ===');
    const stats = getPublicationTimingStats();
    console.log(`Total Articles Seen: ${stats.totalArticles}`);
    console.log('\nBy Day of Week:');
    stats.byDay.forEach(d => console.log(`  ${d.day}: ${d.count} articles`));
    console.log('\nBy Hour of Day (UTC):');
    stats.byHour.forEach(h => console.log(`  ${h.hour}:00 UTC (${(h.hour + 7) % 24}:00 ICT): ${h.count} articles`));
    process.exit(0);
  }

  if (args.includes('--digest-weekly')) {
    console.log('🚀 Running Weekly AI News Digest (7-day + LINE notify)...');
    const result = await generateNewsDigest({ days: 7, type: 'weekly', force: true, notifyLine: true });
    console.log('✅ Weekly Digest Result:', result.success ? `ID #${result.digest?.id}` : result.message);
    process.exit(0);
  }

  if (args.includes('--digest-3d')) {
    console.log('🚀 Running 3-Day AI News Digest...');
    const result = await generateNewsDigest({ days: 3, type: 'ondemand', force: true, notifyLine: false });
    console.log('✅ 3-Day Digest Result:', result.success ? `ID #${result.digest?.id}` : result.message);
    process.exit(0);
  }

  const tickerArg = args.find(a => a.startsWith('--ticker='));
  if (tickerArg) {
    const ticker = tickerArg.split('=')[1].toUpperCase();
    console.log(`🚀 Testing Direct Ticker Ingestion for: [${ticker}]...`);
    const { fetchDirectNewsForTicker, detectPriceShocks } = await import('../services/directTickerFeed.js');
    const shocks = await detectPriceShocks([ticker]);
    const shockInfo = shocks.get(ticker) || null;
    const news = await fetchDirectNewsForTicker(ticker, shockInfo);
    console.log(`✅ Direct News for [${ticker}]: Found ${news.length} high-signal candidate(s):`);
    news.forEach((n, i) => console.log(`  ${i + 1}. [${n.publisher}] "${n.title}" (Score: ${n.score}, Tag: ${n.catalystTag})`));
    process.exit(0);
  }

  if (args.includes('--direct-only')) {
    console.log('🚀 Running Engine A (Direct Ticker & Price Shock & Macro) on-demand...');
    const result = await runNewsScan({ directOnly: true });
    console.log('✅ Direct Scan Complete:', result);
    process.exit(0);
  }

  if (args.includes('--now')) {
    console.log('🚀 Running Hybrid News Radar scan on-demand...');
    const result = await runNewsScan();
    console.log('✅ Scan Complete:', result);
    process.exit(0);
  }

  console.log('⏰ News Radar Scheduler Started:');
  console.log('   - Twice-a-day Radar Scan: 08:30 & 20:30 ICT');
  console.log('   - Weekly Master Digest: Sunday 19:00 ICT (LINE + Web)');
  console.log('Next check in 60 seconds...');

  let lastRunDate = '';
  let lastDigestDate = '';

  // Check every minute
  setInterval(async () => {
    const now = new Date();
    // Convert to Bangkok / ICT time (+7)
    const bangkokTime = new Date(now.getTime() + (7 * 3600000));
    const dayOfWeek = bangkokTime.getUTCDay(); // 0 = Sunday
    const hours = bangkokTime.getUTCHours();
    const minutes = bangkokTime.getUTCMinutes();
    const dateStr = bangkokTime.toISOString().split('T')[0];

    // 1. Radar Scans: Trigger at 08:30 or 20:30 ICT
    const isMorningSlot = hours === 8 && minutes === 30;
    const isEveningSlot = hours === 20 && minutes === 30;
    const slotKey = `${dateStr}-${hours}`;

    if ((isMorningSlot || isEveningSlot) && lastRunDate !== slotKey) {
      lastRunDate = slotKey;
      console.log(`\n⏰ [${new Date().toISOString()}] Scheduled news scan triggered (${hours}:${minutes} ICT)...`);
      try {
        const res = await runNewsScan();
        console.log('✅ Scheduled Scan Completed:', res);
      } catch (err) {
        console.error('❌ Scheduled Scan Error:', err.message);
      }
    }

    // 2. Weekly Digest: Trigger Sunday 19:00 ICT (0 = Sunday)
    const isSundayDigestSlot = dayOfWeek === 0 && hours === 19 && minutes === 0;
    const digestSlotKey = `${dateStr}-weekly-digest`;

    if (isSundayDigestSlot && lastDigestDate !== digestSlotKey) {
      lastDigestDate = digestSlotKey;
      console.log(`\n📰 [${new Date().toISOString()}] Scheduled Sunday 19:00 ICT Weekly Digest triggered...`);
      try {
        const res = await generateNewsDigest({ days: 7, type: 'weekly', notifyLine: true });
        console.log('✅ Scheduled Weekly Digest Completed:', res.success ? `ID #${res.digest?.id}` : res.message);
      } catch (err) {
        console.error('❌ Scheduled Weekly Digest Error:', err.message);
      }
    }
  }, 60000);
}

main().catch(console.error);
