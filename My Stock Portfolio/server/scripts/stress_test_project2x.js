import { classifyScenario } from '../services/project2xEngine.js';

console.log('🔥 STARTING EXHAUSTIVE ULTRA STRESS TEST FOR project2xEngine classifyScenario...\n');

const regimes = ['BULL', 'NEUTRAL', 'BEAR'];
const d200Vals = [-30, -15, -12.1, -11.9, -8.1, -7.9, -6.6, -6.4, -5.1, -4.9, -4.1, -3.9, -3.6, -3.4, -2.0, -0.5, 0.0, 1.0, 2.4, 2.6, 5.0, 12.0, 30.0];
const d150Vals = [-10, -4, 0, 1.5, 3.5, 16.0];
const d50Vals = [-3, 0, 1.0, 5.0];
const bankerVals = [0, 0.01, 0.5, 0.99, 1.0, 2.5, 6.0, 6.5, 10.0, 14.0, 15.0, 20.0];
const booleans = [true, false];
const redBarVals = [0, 1, 3];
const daysNear200Vals = [0, 2, 6];
const daysBelow200Vals = [0, 2, 4, 6];
const daysBankerZeroVals = [0, 5, 9];
const rsiVals = [30, 45, 55, 75];
const volVals = [0.5, 1.0, 1.8];

let totalTests = 0;
const violations = [];
const interestingEdgeCases = [];

const validTiers = new Set(['BUY_NOW', 'BUY_ZONE', 'GET_READY', 'TO_THE_MOON', 'ON_RADAR', 'SLOW_BLEED', 'MAYDAY_EXIT']);

// Run combinatorial test
for (const regime of regimes) {
  for (const d200 of d200Vals) {
    for (const banker of bankerVals) {
      for (const aboveEma9 of booleans) {
        for (const isLatestBullish of booleans) {
          for (const d150 of d150Vals) {
            for (const daysBelowEma200 of [0, 3, 6]) {
              for (const daysBankerZero of [0, 8]) {
                for (const hasRsiDivergence of [false, true]) {
                  totalTests++;

                  const input = {
                    currentPrice: 100 * (1 + d200 / 100),
                    ema9: 100 * (1 + d200 / 100) * (aboveEma9 ? 0.98 : 1.02),
                    ema50: 100,
                    ema150: 100 * (1 + (d200 - d150) / 100),
                    ema200: 100,
                    distEma9: aboveEma9 ? 2.0 : -2.0,
                    distEma50: 1.0,
                    distEma150: d150,
                    distEma200: d200,
                    banker,
                    rsi14: 50,
                    isAboveEma9: aboveEma9,
                    hasRsiDivergence,
                    isLatestBullish,
                    consecutiveRedBars: isLatestBullish ? 0 : 2,
                    volRatio: 1.0,
                    regime,
                    daysNearEma200: (d200 >= -5 && d200 <= 3.5) ? 6 : 0,
                    daysBelowEma200,
                    daysBankerZero,
                    isBearTrapReclaimed: false,
                    isDoubleBottomConfirmed: false,
                    isBaseBreakout: false,
                    isRegimeFlip: false,
                    ownedShares: 0,
                    category: 'Standard'
                  };

                  let res;
                  try {
                    res = classifyScenario(input);
                  } catch (e) {
                    violations.push({ type: 'CRASH', error: e.message, input });
                    continue;
                  }

                  // Check Invariant 1: Valid structure
                  if (!res || !res.scenario || !res.traffic_light || !validTiers.has(res.traffic_light)) {
                    violations.push({ type: 'INVALID_OUTPUT', res, input });
                  }

                  // Check Invariant 2: No Zero-Banker BUY_NOW
                  if (res.traffic_light === 'BUY_NOW' && banker === 0) {
                    violations.push({ type: 'ZERO_BANKER_BUY_NOW', res, input });
                  }

                  // Check Invariant 3: No BEAR regime BUY_NOW or GET_READY without special pattern
                  if (regime === 'BEAR' && (res.traffic_light === 'BUY_NOW' || res.traffic_light === 'GET_READY')) {
                    violations.push({ type: 'BEAR_REGIME_BULL_SIGNAL', res, input });
                  }

                  // Check Invariant 4: S1 Falling Knife VETO compliance
                  if (regime === 'BULL' && d200 < -12.0 && banker === 0 && res.traffic_light !== 'MAYDAY_EXIT') {
                    violations.push({ type: 'BULL_DEEP_PLUNGE_NOT_MAYDAY', res, input });
                  }
                  if (regime !== 'BULL' && d200 < -8.0 && banker === 0 && res.traffic_light !== 'MAYDAY_EXIT') {
                    violations.push({ type: 'NON_BULL_DEEP_PLUNGE_NOT_MAYDAY', res, input });
                  }

                  // Check Invariant 5: Deep crash (d200 < -15%) must NEVER produce BUY_NOW or BUY_ZONE
                  if (d200 < -15.0 && (res.traffic_light === 'BUY_NOW' || res.traffic_light === 'BUY_ZONE')) {
                    violations.push({ type: 'DEEP_CRASH_BUY_SIGNAL', res, input });
                  }

                  // Check Invariant 6: High Banker Support Retest Paradox
                  // In BULL regime, kissing EMA 200/150, green candle, above EMA 9:
                  // Does banker = 15 get treated worse than banker = 14?
                  const emaLower = regime !== 'BEAR' ? -5.0 : -3.5;
                  const isNearSupport = ((d200 >= emaLower && d200 <= 2.5) || (d150 >= -3.0 && d150 <= 2.0)) && d200 >= emaLower;
                  if (regime === 'BULL' && isNearSupport && aboveEma9 && isLatestBullish && banker >= 15 && d150 <= 4.0) {
                    if (res.traffic_light !== 'BUY_NOW') {
                      interestingEdgeCases.push({
                        type: 'HIGH_BANKER_SUPPORT_EXCLUSION',
                        detail: `Banker=${banker} at support in BULL with green candle & above EMA9 got ${res.traffic_light} (S${res.scenario}) instead of BUY_NOW!`,
                        input: { d200, d150, banker, regime, res: res.scenario }
                      });
                    }
                  }

                  // Check Invariant 7: NEUTRAL Support Rebound
                  if (regime === 'NEUTRAL' && isNearSupport && aboveEma9 && isLatestBullish && banker >= 3 && d150 <= 4.0) {
                    if (res.traffic_light === 'ON_RADAR' && res.scenario === 16) {
                      interestingEdgeCases.push({
                        type: 'NEUTRAL_REBOUND_DROPPED_TO_S16',
                        detail: `NEUTRAL regime with Banker=${banker} bouncing off support (green candle, above EMA9) dropped to S16 ON_RADAR!`,
                        input: { d200, d150, banker, regime, res: res.scenario }
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

console.log(`✅ Completed ${totalTests.toLocaleString()} state permutations!\n`);

if (violations.length === 0) {
  console.log('🎉 ZERO HARD INVARIANT VIOLATIONS across all permutations!\n');
} else {
  console.log(`🚨 FOUND ${violations.length} HARD INVARIANT VIOLATIONS:`);
  const groupedV = {};
  for (const v of violations) {
    groupedV[v.type] = (groupedV[v.type] || 0) + 1;
  }
  console.table(groupedV);
  console.log('Sample violations:', violations.slice(0, 5).map(v => ({
    scenario: v.res?.scenario,
    badge: v.res?.badge,
    traffic_light: v.res?.traffic_light,
    d200: v.input?.distEma200,
    d150: v.input?.distEma150,
    banker: v.input?.banker,
    regime: v.input?.regime
  })));
}

// ============================================================================
// PHASE 2: LAYER PRIORITY & VETO INVARIANTS (Capital Preservation Supremacy)
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('🛡️ PHASE 2: LAYER PRIORITY & VETO INVARIANTS AUDIT');
console.log('='.repeat(80));

const layerPriorityTests = [
  {
    name: 'LP1: Layer 0 Veto overrides Layer 1 Double Bottom (d200=-12.5%, banker=0, double bottom=true)',
    input: { currentPrice: 87.5, ema9: 90, ema50: 105, ema150: 102, ema200: 100, distEma200: -12.5, banker: 0, isAboveEma9: true, isDoubleBottomConfirmed: true, regime: 'BULL' },
    expectedLayer: 0,
    expectedScen: 1,
    expectedTier: 'MAYDAY_EXIT'
  },
  {
    name: 'LP2: Layer 0 Slow Bleed overrides Layer 1 Double Bottom (d200=-7.0%, daysBankerZero=9, double bottom=true)',
    input: { currentPrice: 93.0, ema9: 94, ema50: 105, ema150: 102, ema200: 100, distEma200: -7.0, banker: 0, isAboveEma9: true, isDoubleBottomConfirmed: true, daysBankerZero: 9, regime: 'BULL' },
    expectedLayer: 0,
    expectedScen: 4,
    expectedTier: 'SLOW_BLEED'
  },
  {
    name: 'LP3: Layer 0 Core Breakdown overrides Layer 1 Base Breakout (BEAR, d200=-4.5%, daysBelow=4, breakout=true)',
    input: { currentPrice: 95.5, ema9: 96, ema50: 95, ema150: 98, ema200: 100, distEma200: -4.5, banker: 3, isAboveEma9: true, isBaseBreakout: true, daysBelowEma200: 4, regime: 'BEAR' },
    expectedLayer: 0,
    expectedScen: 3,
    expectedTier: 'MAYDAY_EXIT'
  },
  {
    name: 'LP4: Layer 0 Core Breakdown overrides Layer 2 V-Shape Rebound (BULL, d200=-6.8%, daysBelow=6, banker=1)',
    input: { currentPrice: 93.2, ema9: 94, ema50: 105, ema150: 102, ema200: 100, distEma200: -6.8, banker: 1, isAboveEma9: true, isLatestBullish: true, daysBelowEma200: 6, regime: 'BULL' },
    expectedLayer: 0,
    expectedScen: 3,
    expectedTier: 'MAYDAY_EXIT'
  }
];

let lpPassed = 0;
for (const t of layerPriorityTests) {
  const res = classifyScenario(t.input);
  const ok = res.scenario === t.expectedScen && res.traffic_light === t.expectedTier;
  if (ok) lpPassed++;
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}: ${t.name} -> S${res.scenario} (${res.traffic_light})`);
}
console.log(`Layer Priority Result: ${lpPassed}/${layerPriorityTests.length} passed.\n`);

// ============================================================================
// PHASE 3: CLIFF-EDGE BOUNDARY CONTINUITY AUDIT (±0.01% precision)
// ============================================================================
console.log('='.repeat(80));
console.log('📐 PHASE 3: CLIFF-EDGE BOUNDARY CONTINUITY AUDIT');
console.log('='.repeat(80));

const baseInput = { ema9: 100, ema50: 100, ema150: 100, ema200: 100, volRatio: 1.0 };

const cliffEdgeTests = [
  // S1 BULL threshold (-12.0%)
  { name: 'Cliff BULL S1 at -12.01%', input: { ...baseInput, currentPrice: 87.99, distEma200: -12.01, banker: 0, regime: 'BULL' }, expectedScen: 1 },
  { name: 'Cliff BULL S1 at -11.99%', input: { ...baseInput, currentPrice: 88.01, distEma200: -11.99, banker: 0, regime: 'BULL' }, expectedScen: 16 },
  
  // S1 BEAR threshold (-8.0%)
  { name: 'Cliff BEAR S1 at -8.01%', input: { ...baseInput, currentPrice: 91.99, distEma200: -8.01, banker: 0, regime: 'BEAR' }, expectedScen: 1 },
  { name: 'Cliff BEAR S1 at -7.99%', input: { ...baseInput, currentPrice: 92.01, distEma200: -7.99, banker: 0, regime: 'BEAR' }, expectedScen: 16 },

  // S3 Breakdown BULL threshold (-5.0% outside bedrock with daysBelow=5, banker=1)
  { name: 'Cliff BULL S3 at -5.01% (daysBelow=5, banker=1)', input: { ...baseInput, currentPrice: 94.99, distEma200: -5.01, banker: 1, daysBelowEma200: 5, regime: 'BULL' }, expectedScen: 3 },
  { name: 'Cliff BULL S3 at -4.99% (inside support zone, green candle, above EMA9, banker=1)', input: { ...baseInput, currentPrice: 95.01, distEma200: -4.99, banker: 1, daysBelowEma200: 5, isAboveEma9: true, isLatestBullish: true, regime: 'BULL' }, expectedScen: 8 },

  // S4 Slow Bleed BULL threshold (-5.0% outside bedrock with daysBankerZero=8)
  { name: 'Cliff BULL S4 at -5.01% (daysBankerZero=8)', input: { ...baseInput, currentPrice: 94.99, distEma200: -5.01, banker: 0, daysBankerZero: 8, regime: 'BULL' }, expectedScen: 4 },
  { name: 'Cliff BULL S4 at -4.99% (inside support zone, banker=0 -> Early Bird Watch)', input: { ...baseInput, currentPrice: 95.01, distEma200: -4.99, banker: 0, daysBankerZero: 8, regime: 'BULL' }, expectedScen: 13 },

  // S4 Slow Bleed BEAR threshold (-3.5%)
  { name: 'Cliff BEAR S4 at -3.51% (daysBankerZero=8)', input: { ...baseInput, currentPrice: 96.49, distEma200: -3.51, banker: 0, daysBankerZero: 8, regime: 'BEAR' }, expectedScen: 4 },
  { name: 'Cliff BEAR S4 at -3.49% (daysBankerZero=8)', input: { ...baseInput, currentPrice: 96.51, distEma200: -3.49, banker: 0, daysBankerZero: 8, regime: 'BEAR' }, expectedScen: 16 },

  // Support Boundary BULL (-5.0% lower bound for S8 V-Shape Rebound)
  { name: 'Cliff BULL Support at -5.00% (green candle, above EMA9, banker=3)', input: { ...baseInput, currentPrice: 95.0, ema9: 94, distEma200: -5.0, banker: 3, isAboveEma9: true, isLatestBullish: true, regime: 'BULL' }, expectedScen: 8 },
  { name: 'Cliff BULL Support at -5.01% (green candle, above EMA9, banker=3)', input: { ...baseInput, currentPrice: 94.99, ema9: 94, distEma200: -5.01, banker: 3, isAboveEma9: true, isLatestBullish: true, regime: 'BULL' }, expectedScen: 16 },

  // Support Boundary Upper (+2.5% upper bound for S8)
  { name: 'Cliff BULL Support at +2.50% (green candle, above EMA9, banker=3)', input: { ...baseInput, currentPrice: 102.5, ema9: 101, distEma200: 2.5, banker: 3, isAboveEma9: true, isLatestBullish: true, regime: 'BULL' }, expectedScen: 8 },
  { name: 'Cliff BULL Support at +2.51% (green candle, above EMA9, banker=3)', input: { ...baseInput, currentPrice: 102.51, ema9: 101, distEma200: 2.51, banker: 3, isAboveEma9: true, isLatestBullish: true, regime: 'BULL' }, expectedScen: 16 }
];

let cliffPassed = 0;
for (const c of cliffEdgeTests) {
  const res = classifyScenario(c.input);
  const ok = res.scenario === c.expectedScen;
  if (ok) cliffPassed++;
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}: ${c.name} -> S${res.scenario} (${res.badge})`);
}
console.log(`Cliff-Edge Precision Result: ${cliffPassed}/${cliffEdgeTests.length} passed.\n`);

// ============================================================================
// PHASE 4: BLACK SWAN & EXTREME NUMERICAL RESILIENCE
// ============================================================================
console.log('='.repeat(80));
console.log('🌪️ PHASE 4: BLACK SWAN & NUMERICAL STRESS AUDIT');
console.log('='.repeat(80));

const blackSwanTests = [
  { name: 'Black Swan: Flash Crash -80% below EMA 200 with 0 Banker', input: { ...baseInput, currentPrice: 20, distEma200: -80, banker: 0, regime: 'BEAR' }, expectedTier: 'MAYDAY_EXIT' },
  { name: 'Black Swan: Hyper parabolic +800% run (holding shares)', input: { ...baseInput, currentPrice: 900, distEma150: 800, banker: 20, ownedShares: 100, regime: 'BULL' }, expectedTier: 'TO_THE_MOON' },
  { name: 'Black Swan: Hyper parabolic +800% run (0 shares - no chase)', input: { ...baseInput, currentPrice: 900, distEma150: 800, banker: 20, ownedShares: 0, regime: 'BULL' }, expectedTier: 'ON_RADAR' },
  { name: 'Black Swan: Volume drought (volRatio = 0.0)', input: { ...baseInput, currentPrice: 100, distEma200: 0, banker: 0, volRatio: 0, regime: 'BULL' }, expectedTier: 'GET_READY' }, // banker=0, near ema200 -> S13
  { name: 'Black Swan: Banker float precision (banker = 0.00001)', input: { ...baseInput, currentPrice: 99, distEma200: -1.0, banker: 0.00001, isLatestBullish: true, isAboveEma9: true, regime: 'BULL' }, expectedTier: 'GET_READY' } // S13
];

let bsPassed = 0;
for (const b of blackSwanTests) {
  const res = classifyScenario(b.input);
  const ok = res.traffic_light === b.expectedTier;
  if (ok) bsPassed++;
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}: ${b.name} -> ${res.traffic_light} (S${res.scenario} ${res.badge})`);
}
console.log(`Black Swan Resilience Result: ${bsPassed}/${blackSwanTests.length} passed.\n`);

const allPhasesPassed = (violations.length === 0) && (lpPassed === layerPriorityTests.length) && (cliffPassed === cliffEdgeTests.length) && (bsPassed === blackSwanTests.length);
console.log('='.repeat(80));
console.log(`🎯 OVERALL ULTRA STRESS TEST VERDICT: ${allPhasesPassed ? '🏆 100% BULLETPROOF SUPREME PASS' : '❌ SOME TESTS FAILED'}`);
console.log('='.repeat(80));

if (!allPhasesPassed) {
  process.exit(1);
}

