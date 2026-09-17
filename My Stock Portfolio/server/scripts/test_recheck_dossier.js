import { db } from '../db/init.js';
import { getDossierData, saveSpecificDriver } from '../services/dossierService.js';

async function runRecheckAudit() {
  console.log('🔍 [STEP 1: API & Database Live Connectivity]');

  const port = db.prepare('SELECT id, name FROM portfolios LIMIT 1').get();
  if (!port) {
    throw new Error('❌ No portfolio found in database');
  }
  console.log(`✅ Found portfolio: "${port.name}" (ID: ${port.id})`);

  // Test 1: Check 4 diverse stocks (Core & Moonshot)
  const testSymbols = ['NVDA', 'TSM', 'CRWD', 'ALAB'];
  for (const sym of testSymbols) {
    console.log(`\n--- Testing Symbol: ${sym} ---`);
    const data = await getDossierData(port.id, sym);

    if (!data.symbol || data.symbol !== sym) throw new Error(`Symbol mismatch: expected ${sym}, got ${data.symbol}`);
    if (typeof data.currentPrice !== 'number' || isNaN(data.currentPrice)) throw new Error(`Invalid currentPrice for ${sym}`);
    if (typeof data.doublerProgressPct !== 'number' || isNaN(data.doublerProgressPct)) throw new Error(`Invalid doublerProgressPct for ${sym}`);
    if (!['BUY_ADD', 'HOLD_RIDE', 'TRIM_SELL'].includes(data.verdict)) throw new Error(`Invalid verdict: ${data.verdict}`);
    if (!data.verdictReason || data.verdictReason.length < 5) throw new Error(`Invalid verdictReason for ${sym}`);
    
    // Check vital signs
    const vs = data.vitalSigns;
    if (typeof vs.revenueGrowthYoY !== 'number') throw new Error(`Invalid revenueGrowthYoY for ${sym}`);
    if (typeof vs.epsBeatStreak !== 'number') throw new Error(`Invalid epsBeatStreak for ${sym}`);
    if (typeof vs.grossMarginPct !== 'number') throw new Error(`Invalid grossMarginPct for ${sym}`);
    if (typeof vs.peForward !== 'number') throw new Error(`Invalid peForward for ${sym}`);

    console.log(`  Verdict: ${data.verdict} (${data.verdictReason.substring(0, 40)}...)`);
    console.log(`  Price: $${data.currentPrice} | 1-Doubler Progress: ${data.doublerProgressPct}%`);
    console.log(`  Vital Signs: Rev YoY: ${vs.revenueGrowthYoY}% | EPS Streak: ${vs.epsBeatStreak}Q | Margin: ${vs.grossMarginPct}% | PEG: ${vs.pegRatio}`);
    console.log(`  Quarterly Financials count: ${data.quarterlyFinancials.length}`);
    console.log(`  PE History count: ${data.peHistory.length}`);
    console.log(`  Specific Driver: ${data.specificDriver ? `${data.specificDriver.metric_label} = ${data.specificDriver.metric_value}${data.specificDriver.metric_unit}` : 'None'}`);
  }

  // Test 2: Test Specific Driver Save & Update
  console.log('\n--- Testing Specific Driver Update ---');
  const updateRes = saveSpecificDriver('NVDA', {
    metric_key: 'data_center_rev_pct',
    metric_label: 'Data Center Revenue %',
    metric_value: 89.2,
    metric_unit: '%',
    safe_threshold: 80,
    danger_threshold: 70
  });
  if (updateRes.metric_value !== 89.2) {
    throw new Error(`Failed to update driver: expected 89.2, got ${updateRes.metric_value}`);
  }
  console.log('✅ Successfully updated NVDA Data Center Revenue % to 89.2% in SQLite');

  // Re-verify getDossierData reflects the updated driver
  const nvdaData = await getDossierData(port.id, 'NVDA');
  if (nvdaData.specificDriver?.metric_value !== 89.2) {
    throw new Error('getDossierData did not reflect updated driver value');
  }
  console.log('✅ getDossierData correctly reflects live updated driver');

  console.log('\n🎯 [STEP 1 AUDIT PASSED 100%]\n');
  process.exit(0);
}

runRecheckAudit().catch(err => {
  console.error('❌ Audit Failed:', err);
  process.exit(1);
});
