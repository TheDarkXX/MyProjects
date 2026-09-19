import { db } from './db/init.js';
import {
  getOrCreateConfig,
  updateProject2xConfig,
  syncShareQuotas,
  scanRadarMatrix,
  recommendInflowAllocation,
  getDashboardData,
  calculateDynamicETA,
  classifyScenario
} from './services/project2xEngine.js';

async function runTests() {
  console.log('🧪 Starting Project 2X Engine End-to-End Verification...\n');

  // Test 1: Active Portfolio Check
  const port = db.prepare('SELECT id, name FROM portfolios LIMIT 1').get();
  if (!port) {
    throw new Error('No portfolio found in database');
  }
  console.log(`✅ Test 1: Found portfolio "${port.name}" (ID: ${port.id})`);

  // Test 2: Config Initialization
  const config = getOrCreateConfig(port.id);
  if (!config || config.goal_amount_thb !== 10000000 || config.target_cagr !== 0.26) {
    throw new Error('Config smart defaults mismatch');
  }
  console.log('✅ Test 2: Config initialized with Goal ฿10,000,000 and CAGR 26%');

  // Test 3: ETA Math
  const eta = calculateDynamicETA({
    currentValThb: 2100000,
    goalValThb: 10000000,
    monthlyInflowThb: 35000,
    targetCagr: 0.26
  });
  if (!eta.Base || eta.Base.months <= 0) {
    throw new Error('ETA calculation returned invalid months');
  }
  console.log(`✅ Test 3: ETA calculation: Base ${eta.Base.years} yrs (${eta.Base.targetDate})`);

  // Test 4: Scenario Classifier
  const s1 = classifyScenario({ currentPrice: 100, ema9: 99, ema50: 105, ema150: 101, ema200: 100, banker: 4, rsi14: 42, regime: 'BULL', isAboveEma9: true, isLatestBullish: true });
  if (s1.scenario !== 8 || s1.traffic_light !== 'BUY_NOW') {
    throw new Error(`Scenario classifier failed: got ${s1.scenario} ${s1.traffic_light}`);
  }
  console.log('✅ Test 4: Scenario 8 V-Shape Rebound classified properly (BUY_NOW 🔥)');

  const s3Unowned = classifyScenario({ currentPrice: 85, ema50: 105, ema150: 100, ema200: 95, banker: 0, rsi14: 25, ownedShares: 0 });
  if (s3Unowned.scenario !== 1 || s3Unowned.traffic_light !== 'FALLING_KNIFE') {
    throw new Error(`Scenario 1 Falling Knife (Unowned) failed: got ${s3Unowned.scenario} ${s3Unowned.traffic_light}`);
  }
  const s3Owned = classifyScenario({ currentPrice: 85, ema50: 105, ema150: 100, ema200: 95, banker: 0, rsi14: 25, ownedShares: 100 });
  if (s3Owned.scenario !== 1 || s3Owned.traffic_light !== 'MAYDAY_EXIT') {
    throw new Error(`Scenario 1 Mayday Exit (Owned) failed: got ${s3Owned.scenario} ${s3Owned.traffic_light}`);
  }
  console.log('✅ Test 5: Scenario 1 Falling Knife & Mayday Exit classified properly (FALLING_KNIFE 🔪 & MAYDAY_EXIT ❌)');

  // Test 5: Quotas Initialization
  console.log('Syncing quotas...');
  const quotas = await syncShareQuotas(port.id);
  if (!quotas || quotas.length === 0) {
    throw new Error('Quotas sync returned 0 items');
  }
  console.log(`✅ Test 6: Seeded and synced ${quotas.length} share quotas (e.g. ${quotas[0].symbol}: ${quotas[0].owned_shares}/${quotas[0].target_shares} shares)`);

  // Test 6: Inflow Allocator
  const rec = await recommendInflowAllocation(port.id, 35000);
  if (!rec || !rec.type) {
    throw new Error('Inflow recommendation failed');
  }
  console.log(`✅ Test 7: Inflow Allocator for ฿35,000 returned type: "${rec.type}"`);

  // Test 7: Dashboard Master HUD Data
  const dash = await getDashboardData(port.id);
  if (!dash || dash.total_val_thb === undefined) {
    throw new Error('Dashboard data failed');
  }
  console.log(`✅ Test 8: Dashboard Data: Total ฿${dash.total_val_thb.toLocaleString()} ($${dash.total_val_usd.toLocaleString()}), Progress: ${dash.progress_percent}%, FX: ฿${dash.fx_rate}`);

  console.log('\n🎉 ALL 8 TESTS PASSED WITH 100% ACCURACY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
