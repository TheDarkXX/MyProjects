import { runNewsScan, getPublicationTimingStats } from '../services/newsRadar.js';

/**
 * News Radar Scheduler
 * Can be run via node crons/newsScheduler.js
 * Flags:
 *   --now : Run a single scan immediately and exit
 *   --stats : Print publication timing stats and exit
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

  if (args.includes('--now')) {
    console.log('🚀 Running News Radar scan on-demand...');
    const result = await runNewsScan();
    console.log('✅ Scan Complete:', result);
    process.exit(0);
  }

  console.log('⏰ News Radar Scheduler Started (Twice-a-day Cron: 08:30 & 20:30 ICT)');
  console.log('Next check in 60 seconds...');

  let lastRunDate = '';

  // Check every minute
  setInterval(async () => {
    const now = new Date();
    // Convert to Bangkok / ICT time (+7)
    const bangkokTime = new Date(now.getTime() + (7 * 3600000));
    const hours = bangkokTime.getUTCHours();
    const minutes = bangkokTime.getUTCMinutes();
    const dateStr = bangkokTime.toISOString().split('T')[0];

    // Trigger at 08:30 or 20:30 ICT
    const isMorningSlot = hours === 8 && minutes === 30;
    const isEveningSlot = hours === 20 && minutes === 30;

    const slotKey = `${dateStr}-${hours}`;

    if ((isMorningSlot || isEveningSlot) && lastRunDate !== slotKey) {
      lastRunDate = slotKey;
      console.log(`\n⏰ [${new Date().toISOString()}] Scheduled run triggered (${hours}:${minutes} ICT)...`);
      try {
        const res = await runNewsScan();
        console.log('✅ Scheduled Scan Completed:', res);
      } catch (err) {
        console.error('❌ Scheduled Scan Error:', err.message);
      }
    }
  }, 60000);
}

main().catch(console.error);
