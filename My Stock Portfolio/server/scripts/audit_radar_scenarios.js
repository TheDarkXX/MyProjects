import { db } from '../db/init.js';
import { calculateStockRadarSignal } from '../services/project2xEngine.js';

async function runAudit() {
  console.log('🔍 Starting 360° Radar Matrix & Scenario Audit for all stocks...\n');

  // Fetch unique symbols from database
  const rows = db.prepare(`
    SELECT DISTINCT symbol 
    FROM historical_prices 
    WHERE symbol NOT LIKE '%=%' AND symbol NOT LIKE '%-USD%'
    ORDER BY symbol ASC
  `).all();

  const symbols = rows.map(r => r.symbol);
  console.log(`📊 Found ${symbols.length} active stocks to inspect.\n`);

  const results = [];
  const anomalies = [];

  for (const sym of symbols) {
    try {
      const res = await calculateStockRadarSignal(sym);
      if (!res) continue;

      const d200 = res.distEma200 ?? 0;
      const d150 = res.distEma150 ?? 0;
      const b = res.banker ?? 0;
      const scen = res.scenario;
      const tier = res.traffic_light;
      const reason = res.reason_th;

      // Anomaly Check Rules
      const issues = [];

      // 1. Below EMA 200 deeply with 0 banker but classified as normal Consolidating S16
      if (d200 < -4.0 && b === 0 && scen === 16) {
        issues.push(`Deep below EMA 200 (${d200}%) with 0 Banker, but classified as S16 Consolidating`);
      }

      // 2. Below EMA 200 but reason_th says "approaching support"
      if (d200 < 0 && reason.includes('กำลังทิ้งตัวลงหาแนวรับ')) {
        issues.push(`Price already below EMA 200 (${d200}%), but reason_th says 'กำลังทิ้งตัวลงหาแนวรับ'`);
      }

      // 3. 0 Banker but BUY_NOW
      if (b === 0 && tier === 'BUY_NOW') {
        issues.push(`0 Banker but classified as BUY_NOW`);
      }

      // 4. Plunged > 8% below EMA 200 with 0 banker, but NOT Mayday Exit / Falling Knife
      if (d200 < -8.0 && b === 0 && tier !== 'MAYDAY_EXIT' && tier !== 'FALLING_KNIFE') {
        issues.push(`Severe plunge (${d200}%) with 0 Banker, but tier is ${tier} instead of MAYDAY_EXIT / FALLING_KNIFE`);
      }

      // 5. High Banker (>= 12) in super trend, but classified as Mayday Exit / Falling Knife
      if (b >= 12 && res.regime === 'BULL' && (tier === 'MAYDAY_EXIT' || tier === 'FALLING_KNIFE')) {
        issues.push(`Strong institutional backing (${b}/20) in BULL regime, but classified as ${tier}`);
      }

      // 6. Banker Float Dead Zone (0 < b < 1) near EMA 200 falling into S16 default
      const ema200Lower = res.regime !== 'BEAR' ? -5.0 : -3.5;
      const isNearBedrock = (d200 >= ema200Lower && d200 <= 2.5) || (d150 >= -3.0 && d150 <= 2.0);
      if (isNearBedrock && b > 0 && b < 1 && scen === 16) {
        issues.push(`Banker float dead zone (${b}/20) near EMA support (${d200}%), but fallen into S16 default`);
      }

      // 7. BULL regime + S4 Slow Bleed when not severely broken (d200 >= -6.5%)
      if (res.regime === 'BULL' && scen === 4 && d200 >= -6.5) {
        issues.push(`BULL regime classified as S4 Slow Bleed without severe breach (d200: ${d200}%)`);
      }

      // 8. BEAR regime + S9 GET_READY (EMA 200 is overhead resistance in BEAR, cannot be support test)
      if (res.regime === 'BEAR' && scen === 9) {
        issues.push(`BEAR regime classified as S9 Testing Support GET_READY (EMA 200 is resistance in bear trend)`);
      }

      // 9. BULL regime + S1 Falling Knife without severe capitulation (d200 >= -12.0%)
      if (res.regime === 'BULL' && scen === 1 && d200 >= -12.0) {
        issues.push(`BULL regime classified as S1 Falling Knife on moderate pullback (${d200}%)`);
      }

      const item = {
        symbol: sym,
        price: res.currentPrice,
        regime: res.regime,
        d200,
        d150,
        banker: b,
        scenario: scen,
        badge: res.badge,
        tier,
        reason,
        issues
      };

      results.push(item);
      if (issues.length > 0) {
        anomalies.push(item);
      }
    } catch (err) {
      console.error(`Error auditing ${sym}:`, err.message);
    }
  }

  // Tier Grouping Summary
  const grouped = {
    BUY_NOW: [],
    BUY_ZONE: [],
    GET_READY: [],
    TO_THE_MOON: [],
    ON_RADAR: [],
    SLOW_BLEED: [],
    FALLING_KNIFE: [],
    MAYDAY_EXIT: []
  };

  for (const r of results) {
    if (grouped[r.tier]) {
      grouped[r.tier].push(r);
    }
  }

  console.log('='.repeat(80));
  console.log('📊 7-TIER RADAR DISTRIBUTION MATRIX:');
  console.log('='.repeat(80));
  console.log(`🔥 BUY NOW!!     (${grouped.BUY_NOW.length}): ${grouped.BUY_NOW.map(x => `${x.symbol}(S${x.scenario})`).join(', ') || 'None'}`);
  console.log(`💰 BUY ZONE      (${grouped.BUY_ZONE.length}): ${grouped.BUY_ZONE.map(x => `${x.symbol}(S${x.scenario})`).join(', ') || 'None'}`);
  console.log(`⏳ GET READY     (${grouped.GET_READY.length}): ${grouped.GET_READY.map(x => `${x.symbol}(S${x.scenario})`).join(', ') || 'None'}`);
  console.log(`🚀 TO THE MOON   (${grouped.TO_THE_MOON.length}): ${grouped.TO_THE_MOON.map(x => `${x.symbol}(S${x.scenario})`).join(', ') || 'None'}`);
  console.log(`📡 ON RADAR      (${grouped.ON_RADAR.length}): ${grouped.ON_RADAR.map(x => `${x.symbol}(S${x.scenario})`).join(', ') || 'None'}`);
  console.log(`🩸 SLOW BLEED    (${grouped.SLOW_BLEED.length}): ${grouped.SLOW_BLEED.map(x => `${x.symbol}(S${x.scenario})`).join(', ') || 'None'}`);
  console.log(`🔪 FALLING KNIFE (${grouped.FALLING_KNIFE.length}): ${grouped.FALLING_KNIFE.map(x => `${x.symbol}(S${x.scenario})`).join(', ') || 'None'}`);
  console.log(`❌ MAYDAY EXIT   (${grouped.MAYDAY_EXIT.length}): ${grouped.MAYDAY_EXIT.map(x => `${x.symbol}(S${x.scenario})`).join(', ') || 'None'}`);
  console.log('='.repeat(80));

  // Print Details Table
  console.log('\n📋 ALL STOCKS SNAPSHOT:');
  console.table(results.map(r => ({
    Symbol: r.symbol,
    Price: `$${r.price.toFixed(2)}`,
    Regime: r.regime,
    'd200%': `${r.d200 >= 0 ? '+' : ''}${r.d200.toFixed(1)}%`,
    Banker: `${r.banker.toFixed(1)}/20`,
    Scenario: `S${r.scenario} (${r.badge})`,
    Tier: r.tier,
    Status: r.issues.length === 0 ? '✅ PASS' : '⚠️ ANOMALY'
  })));

  // Report Anomalies
  if (anomalies.length > 0) {
    console.log('\n🚨 DETECTED ANOMALIES / LOGIC CONFLICTS:');
    for (const a of anomalies) {
      console.log(`⚠️ ${a.symbol} (S${a.scenario} ${a.badge} - ${a.tier}):`);
      for (const iss of a.issues) {
        console.log(`   - ${iss}`);
      }
    }
  } else {
    console.log('\n🎉 ZERO ANOMALIES FOUND! Every stock is mathematically and logically sound according to the 7-Tier Cyber Action Matrix.');
  }
}

runAudit().catch(err => console.error(err));
