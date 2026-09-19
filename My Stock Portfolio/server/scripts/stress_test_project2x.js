import { classifyScenario } from '../services/project2xEngine.js';

console.log('='.repeat(85));
console.log('🔥 ULTRA STRESS TEST V2: FULL-SPECTRUM 20/20 DIMENSIONAL COVERAGE');
console.log('='.repeat(85));
console.log('Target: ~60,000 Permutations | 5 Execution Phases | 0-Veto Toleration\n');

const startTime = Date.now();
const validTiers = new Set(['BUY_NOW', 'BUY_ZONE', 'GET_READY', 'TO_THE_MOON', 'ON_RADAR', 'SLOW_BLEED', 'FALLING_KNIFE', 'MAYDAY_EXIT']);

// ============================================================================
// PHASE 1: FULL-SPECTRUM COMBINATORIAL (3-Tier Strategic Sampling)
// ============================================================================
console.log('🔬 PHASE 1: COMBINATORIAL MATRIX (Tier A Core + Tier B Secondary + Tier C Patterns)');

// Tier A: Core Routing (3 x 14 x 9 x 2 x 2 = 1,512 base perms)
const regimes = ['BULL', 'NEUTRAL', 'BEAR'];
const d200Vals = [-30, -12.1, -11.9, -8.1, -7.9, -5.1, -4.9, -4.1, -3.6, -3.4, -1.0, 0.0, 2.5, 30.0];
const bankerVals = [0, 0.5, 1.0, 3.0, 6.0, 7.0, 10.0, 14.0, 15.0];
const booleans = [true, false];

// Tier B: Secondary Rotations (31 variations per base perm)
const b1_d150Vals = [-5.0, 0.0, 3.5, 8.0, 16.0, 26.0];
const b2_d50Vals = [-3.0, -1.5, 0.5, 1.5, 3.0, 8.0];
const b3_rsiVals = [25, 35, 50, 62, 75];
const b4_volVals = [0.0, 0.5, 1.0, 1.5, 2.5];
const b5_redBarVals = [0, 1, 3];
const b6_daysPairs = [
  [0, 0],
  [0, 8],
  [5, 0],
  [5, 8],
  [8, 0],
  [8, 8]
];

// Tier C: Pattern & Position Combos for support zone (-5.0 <= d200 <= 3.5)
const tierCCombos = [
  { name: 'DoubleBottom', isDoubleBottomConfirmed: true },
  { name: 'BearTrap', isBearTrapReclaimed: true },
  { name: 'BaseBreakout', isBaseBreakout: true },
  { name: 'RegimeFlip', isRegimeFlip: true },
  { name: 'DoubleBottom + BearTrap Conflict', isDoubleBottomConfirmed: true, isBearTrapReclaimed: true },
  { name: 'BaseBreakout + DoubleBottom Conflict', isBaseBreakout: true, isDoubleBottomConfirmed: true },
  { name: 'Holding Core Runner', ownedShares: 100, category: 'Core', distEma150: 16.0 },
  { name: 'Holding Moonshot Runner', ownedShares: 100, category: 'Moonshot', distEma150: 26.0 },
  { name: 'NoShares Moonshot Radar', ownedShares: 0, category: 'Moonshot', distEma150: 26.0 },
  { name: 'Sideway Base Candidate', daysNearEma200: 6, rsi14: 45, volRatio: 0.9, distEma150: 0.0 }
];

let p1Tests = 0;
const p1Violations = [];

function runInvariantChecks(input, res) {
  // INV-1: Valid result structure & no crash
  if (!res || typeof res.scenario !== 'number' || !res.traffic_light) {
    return { rule: 'INV-1', desc: 'Invalid result structure or engine crash', input, res };
  }

  // INV-2: Valid traffic light tier
  if (!validTiers.has(res.traffic_light)) {
    return { rule: 'INV-2', desc: `Invalid traffic_light: ${res.traffic_light}`, input, res };
  }

  // INV-3: Zero banker cannot produce BUY_NOW (unless BaseBreakout which allows explosive volume breakouts)
  if (input.banker === 0 && res.traffic_light === 'BUY_NOW' && !input.isBaseBreakout) {
    return { rule: 'INV-3', desc: 'Zero banker yielded BUY_NOW', input, res };
  }

  // INV-4: BEAR regime cannot produce BUY_NOW, or BUY_ZONE (unless RegimeFlip)
  if (input.regime === 'BEAR') {
    if (res.traffic_light === 'BUY_NOW') {
      return { rule: 'INV-4', desc: 'BEAR regime yielded BUY_NOW', input, res };
    }
    if (res.traffic_light === 'BUY_ZONE' && !input.isRegimeFlip) {
      return { rule: 'INV-4', desc: 'BEAR regime yielded BUY_ZONE without Regime Flip', input, res };
    }
  }

  // INV-5: Deep crash (d200 < -15%) must NEVER produce BUY_NOW or BUY_ZONE
  if (input.distEma200 < -15.0 && (res.traffic_light === 'BUY_NOW' || res.traffic_light === 'BUY_ZONE')) {
    return { rule: 'INV-5', desc: 'Deep crash (< -15%) yielded BUY signal', input, res };
  }

  // INV-6: S14 Overbought Momentum with 0 shares must be ON_RADAR, never TO_THE_MOON
  const obThreshold = input.category === 'Moonshot' ? 25 : 15;
  if (input.ownedShares === 0 && input.distEma150 > obThreshold && input.banker >= 12) {
    if (res.scenario === 14 && res.traffic_light === 'TO_THE_MOON') {
      return { rule: 'INV-6', desc: 'S14 Overbought with 0 shares produced TO_THE_MOON', input, res };
    }
  }

  // INV-7: BEAR underwater bounce (< -8% and banker 1-6) must trigger S2 (MAYDAY_EXIT / FALLING_KNIFE)
  if (input.regime === 'BEAR' && input.distEma200 < -8.0 && input.banker > 0 && input.banker <= 6) {
    if (res.scenario !== 2 || (res.traffic_light !== 'MAYDAY_EXIT' && res.traffic_light !== 'FALLING_KNIFE')) {
      return { rule: 'INV-7', desc: 'BEAR underwater bounce (< -8%, banker 1-6) failed S2 VETO', input, res };
    }
  }

  return null;
}

function executeCase(input) {
  p1Tests++;
  try {
    const res = classifyScenario(input);
    const err = runInvariantChecks(input, res);
    if (err) p1Violations.push(err);
  } catch (e) {
    p1Violations.push({ rule: 'INV-1', desc: `CRASH: ${e.message}`, input });
  }
}

// Loop Tier A
for (const regime of regimes) {
  for (const d200 of d200Vals) {
    for (const banker of bankerVals) {
      for (const aboveEma9 of booleans) {
        for (const isLatestBullish of booleans) {

          const baseInput = {
            currentPrice: 100 * (1 + d200 / 100),
            ema9: 100 * (1 + d200 / 100) * (aboveEma9 ? 0.98 : 1.02),
            ema50: 100,
            ema150: 100,
            ema200: 100,
            distEma9: aboveEma9 ? 2.0 : -2.0,
            distEma50: 1.0,
            distEma150: 0.0,
            distEma200: d200,
            banker,
            rsi14: 50,
            isAboveEma9: aboveEma9,
            hasRsiDivergence: false,
            isLatestBullish,
            consecutiveRedBars: isLatestBullish ? 0 : 2,
            volRatio: 1.0,
            regime,
            daysNearEma200: (d200 >= -5 && d200 <= 3.5) ? 6 : 0,
            daysBelowEma200: 0,
            daysBankerZero: banker === 0 ? 8 : 0,
            isBearTrapReclaimed: false,
            isDoubleBottomConfirmed: false,
            isBaseBreakout: false,
            isRegimeFlip: false,
            ownedShares: 0,
            category: 'Core'
          };

          // Tier B Rotations (31 variants)
          // B1: d150
          for (const d150 of b1_d150Vals) {
            executeCase({ ...baseInput, distEma150: d150, ema150: 100 * (1 + (d200 - d150) / 100) });
          }
          // B2: d50
          for (const d50 of b2_d50Vals) {
            executeCase({ ...baseInput, distEma50: d50, ema50: 100 * (1 + (d200 - d50) / 100) });
          }
          // B3: rsi14
          for (const rsi of b3_rsiVals) {
            executeCase({ ...baseInput, rsi14: rsi });
          }
          // B4: volRatio
          for (const vol of b4_volVals) {
            executeCase({ ...baseInput, volRatio: vol });
          }
          // B5: consecutiveRedBars
          for (const redBars of b5_redBarVals) {
            executeCase({ ...baseInput, consecutiveRedBars: redBars });
          }
          // B6: daysBelowEma200 x daysBankerZero
          for (const [below, bZero] of b6_daysPairs) {
            executeCase({ ...baseInput, daysBelowEma200: below, daysBankerZero: bZero });
          }

          // Tier C: Patterns & Position Combos in Support Band
          if (d200 >= -5.0 && d200 <= 3.5) {
            for (const combo of tierCCombos) {
              executeCase({ ...baseInput, ...combo });
            }
          }

        }
      }
    }
  }
}

console.log(`✅ Phase 1 Completed: ${p1Tests.toLocaleString()} permutations executed.`);
if (p1Violations.length === 0) {
  console.log('🎉 ZERO HARD INVARIANT VIOLATIONS across all Phase 1 permutations!\n');
} else {
  console.log(`🚨 FOUND ${p1Violations.length} VIOLATIONS IN PHASE 1:`);
  const grouped = {};
  for (const v of p1Violations) grouped[v.rule] = (grouped[v.rule] || 0) + 1;
  console.table(grouped);
  console.log('Sample violations:', p1Violations.slice(0, 5));
}

// ============================================================================
// PHASE 2: PATTERN MATRIX (S5 / S6 / S7 / S11 & Veto Conflicts)
// ============================================================================
console.log('='.repeat(85));
console.log('🎯 PHASE 2: LAYER 1 PATTERN MATRIX & CONFLICT PRIORITY AUDIT');
console.log('='.repeat(85));

const baseStd = {
  currentPrice: 100, ema9: 98, ema50: 95, ema150: 98, ema200: 100,
  distEma9: 2.0, distEma50: 5.0, distEma150: 2.0, distEma200: 0.0,
  volRatio: 1.2, rsi14: 50, daysBelowEma200: 0, daysBankerZero: 0
};

const phase2Tests = [
  // S5 Double Bottom
  { name: 'S5-1: Double Bottom BULL + banker>=1 + aboveEma9', input: { ...baseStd, isDoubleBottomConfirmed: true, regime: 'BULL', banker: 3, isAboveEma9: true }, expectScen: 5, expectTier: 'BUY_NOW' },
  { name: 'S5-2: Double Bottom NEUTRAL + banker>=1 + aboveEma9', input: { ...baseStd, isDoubleBottomConfirmed: true, regime: 'NEUTRAL', banker: 2, isAboveEma9: true }, expectScen: 5, expectTier: 'BUY_NOW' },
  { name: 'S5-3: Double Bottom BEAR rejected (regime !== BEAR required)', input: { ...baseStd, isDoubleBottomConfirmed: true, regime: 'BEAR', banker: 3, isAboveEma9: true }, rejectScen: 5 },
  { name: 'S5-4: Double Bottom with banker=0 rejected', input: { ...baseStd, isDoubleBottomConfirmed: true, regime: 'BULL', banker: 0, isAboveEma9: true }, rejectScen: 5 },
  { name: 'S5-5: Double Bottom below EMA 9 rejected', input: { ...baseStd, isDoubleBottomConfirmed: true, regime: 'BULL', banker: 3, isAboveEma9: false, ema9: 102 }, rejectScen: 5 },
  { name: 'S5-6: Double Bottom banker=0.99 rejected (< 1)', input: { ...baseStd, isDoubleBottomConfirmed: true, regime: 'NEUTRAL', banker: 0.99, isAboveEma9: true }, rejectScen: 5 },
  { name: 'S5-7: Double Bottom at dip d200=-3% confirmed', input: { ...baseStd, isDoubleBottomConfirmed: true, regime: 'BULL', banker: 1, isAboveEma9: true, distEma200: -3.0 }, expectScen: 5, expectTier: 'BUY_NOW' },
  { name: 'S5-8: Double Bottom with banker=20 high confidence', input: { ...baseStd, isDoubleBottomConfirmed: true, regime: 'BULL', banker: 20, isAboveEma9: true, distEma200: 1.5 }, expectScen: 5, expectTier: 'BUY_NOW' },

  // S6 Bear Trap Reclaimed
  { name: 'S6-1: Bear Trap Reclaimed BULL + banker>=1 + aboveEma9', input: { ...baseStd, isBearTrapReclaimed: true, regime: 'BULL', banker: 2, isAboveEma9: true }, expectScen: 6, expectTier: 'BUY_NOW' },
  { name: 'S6-2: Bear Trap Reclaimed NEUTRAL + banker>=1 + aboveEma9', input: { ...baseStd, isBearTrapReclaimed: true, regime: 'NEUTRAL', banker: 5, isAboveEma9: true }, expectScen: 6, expectTier: 'BUY_NOW' },
  { name: 'S6-3: Bear Trap Reclaimed BEAR rejected', input: { ...baseStd, isBearTrapReclaimed: true, regime: 'BEAR', banker: 5, isAboveEma9: true }, rejectScen: 6 },
  { name: 'S6-4: Bear Trap Reclaimed banker=0 rejected', input: { ...baseStd, isBearTrapReclaimed: true, regime: 'BULL', banker: 0, isAboveEma9: true }, rejectScen: 6 },
  { name: 'S6-5: Bear Trap Reclaimed below EMA 9 rejected', input: { ...baseStd, isBearTrapReclaimed: true, regime: 'NEUTRAL', banker: 4, isAboveEma9: false }, rejectScen: 6 },
  { name: 'S6-6: Bear Trap Reclaimed banker=1 boundary pass', input: { ...baseStd, isBearTrapReclaimed: true, regime: 'BULL', banker: 1, isAboveEma9: true }, expectScen: 6, expectTier: 'BUY_NOW' },
  { name: 'S6-7: Bear Trap Reclaimed banker=0.5 rejected (< 1)', input: { ...baseStd, isBearTrapReclaimed: true, regime: 'BULL', banker: 0.5, isAboveEma9: true }, rejectScen: 6 },

  // S7 Base Breakout
  { name: 'S7-1: Base Breakout BULL + aboveEma9 (banker=0 allowed)', input: { ...baseStd, isBaseBreakout: true, regime: 'BULL', banker: 0, isAboveEma9: true }, expectScen: 7, expectTier: 'BUY_NOW' },
  { name: 'S7-2: Base Breakout NEUTRAL + aboveEma9', input: { ...baseStd, isBaseBreakout: true, regime: 'NEUTRAL', banker: 2, isAboveEma9: true }, expectScen: 7, expectTier: 'BUY_NOW' },
  { name: 'S7-3: Base Breakout BEAR rejected', input: { ...baseStd, isBaseBreakout: true, regime: 'BEAR', banker: 2, isAboveEma9: true }, rejectScen: 7 },
  { name: 'S7-4: Base Breakout below EMA 9 rejected', input: { ...baseStd, isBaseBreakout: true, regime: 'BULL', banker: 5, isAboveEma9: false }, rejectScen: 7 },
  { name: 'S7-5: Base Breakout with volume surge 2.5x', input: { ...baseStd, isBaseBreakout: true, regime: 'BULL', banker: 3, isAboveEma9: true, volRatio: 2.5 }, expectScen: 7, expectTier: 'BUY_NOW' },

  // S11 Regime Flip (price slightly above support zone d200=4.0, d150=3.5 to bypass Layer 2 S8)
  { name: 'S11-1: Regime Flip banker>=3 + bullish', input: { ...baseStd, isRegimeFlip: true, banker: 3, isLatestBullish: true, distEma200: 4.0, distEma150: 3.5 }, expectScen: 11, expectTier: 'BUY_ZONE' },
  { name: 'S11-2: Regime Flip banker=5 + bullish', input: { ...baseStd, isRegimeFlip: true, banker: 5, isLatestBullish: true, distEma200: 4.0, distEma150: 3.5 }, expectScen: 11, expectTier: 'BUY_ZONE' },
  { name: 'S11-3: Regime Flip banker=2.99 rejected (< 3)', input: { ...baseStd, isRegimeFlip: true, banker: 2.99, isLatestBullish: true, distEma200: 4.0, distEma150: 3.5 }, rejectScen: 11 },
  { name: 'S11-4: Regime Flip bearish candle rejected', input: { ...baseStd, isRegimeFlip: true, banker: 5, isLatestBullish: false, distEma200: 4.0, distEma150: 3.5 }, rejectScen: 11 },
  { name: 'S11-5: Regime Flip banker=10 + bullish pass', input: { ...baseStd, isRegimeFlip: true, banker: 10, isLatestBullish: true, distEma200: 4.0, distEma150: 3.5 }, expectScen: 11, expectTier: 'BUY_ZONE' },
  { name: 'S11-6: Regime Flip banker=0 rejected', input: { ...baseStd, isRegimeFlip: true, banker: 0, isLatestBullish: true, distEma200: 4.0, distEma150: 3.5 }, rejectScen: 11 },

  // Pattern Conflicts & Priority Order (Code Order: S5 > S6 > S7 > S11)
  { name: 'CF-1: S5 DoubleBottom vs S6 BearTrap -> S5 wins', input: { ...baseStd, isDoubleBottomConfirmed: true, isBearTrapReclaimed: true, regime: 'BULL', banker: 3, isAboveEma9: true }, expectScen: 5, expectTier: 'BUY_NOW' },
  { name: 'CF-2: S5 DoubleBottom vs S7 BaseBreakout -> S5 wins', input: { ...baseStd, isDoubleBottomConfirmed: true, isBaseBreakout: true, regime: 'BULL', banker: 3, isAboveEma9: true }, expectScen: 5, expectTier: 'BUY_NOW' },
  { name: 'CF-3: S6 BearTrap vs S7 BaseBreakout -> S6 wins', input: { ...baseStd, isBearTrapReclaimed: true, isBaseBreakout: true, regime: 'BULL', banker: 3, isAboveEma9: true }, expectScen: 6, expectTier: 'BUY_NOW' },
  { name: 'CF-4: S5 DoubleBottom vs S11 RegimeFlip -> S5 wins', input: { ...baseStd, isDoubleBottomConfirmed: true, isRegimeFlip: true, regime: 'BULL', banker: 3, isAboveEma9: true, isLatestBullish: true }, expectScen: 5, expectTier: 'BUY_NOW' },

  // Layer 0 Veto Supremacy over Layer 1 Patterns
  { name: 'CF-5: S1 Falling Knife Veto overrides S5 DoubleBottom', input: { ...baseStd, isDoubleBottomConfirmed: true, distEma200: -15.0, banker: 0, regime: 'BULL', isAboveEma9: true }, expectScen: 1, expectTier: 'MAYDAY_EXIT' },
  { name: 'CF-6: S1 Falling Knife Veto overrides S6 BearTrap', input: { ...baseStd, isBearTrapReclaimed: true, distEma200: -15.0, banker: 0, regime: 'BULL', isAboveEma9: true }, expectScen: 1, expectTier: 'MAYDAY_EXIT' },
  { name: 'CF-7: S1 Falling Knife Veto overrides S7 BaseBreakout', input: { ...baseStd, isBaseBreakout: true, distEma200: -15.0, banker: 0, regime: 'BULL', isAboveEma9: true }, expectScen: 1, expectTier: 'MAYDAY_EXIT' },
  { name: 'CF-8: S2 Dead Cat Veto overrides S5 DoubleBottom (BEAR underwater)', input: { ...baseStd, isDoubleBottomConfirmed: true, distEma200: -9.0, banker: 3, regime: 'BEAR', isAboveEma9: true }, expectScen: 2, expectTier: 'MAYDAY_EXIT' },
  { name: 'CF-9: S2 Dead Cat Veto overrides S6 BearTrap (BEAR underwater)', input: { ...baseStd, isBearTrapReclaimed: true, distEma200: -9.0, banker: 3, regime: 'BEAR', isAboveEma9: true }, expectScen: 2, expectTier: 'MAYDAY_EXIT' },
  { name: 'CF-10: S2 Dead Cat Veto overrides S7 BaseBreakout (BEAR underwater)', input: { ...baseStd, isBaseBreakout: true, distEma200: -9.0, banker: 3, regime: 'BEAR', isAboveEma9: true }, expectScen: 2, expectTier: 'MAYDAY_EXIT' },
  { name: 'CF-11: S3 Core Breakdown Veto overrides S5 (BULL d200=-5.5% daysBelow=6)', input: { ...baseStd, isDoubleBottomConfirmed: true, distEma200: -5.5, daysBelowEma200: 6, banker: 1, regime: 'BULL', isAboveEma9: true }, expectScen: 3, expectTier: 'MAYDAY_EXIT' },
  { name: 'CF-12: S3 Core Breakdown Veto overrides S7 (BEAR d200=-4.5% daysBelow=4)', input: { ...baseStd, isBaseBreakout: true, distEma200: -4.5, daysBelowEma200: 4, banker: 3, regime: 'BEAR', isAboveEma9: true }, expectScen: 3, expectTier: 'MAYDAY_EXIT' },
  { name: 'CF-13: S4 Slow Bleed Veto overrides S5 (BULL d200=-7% daysBankerZero=9)', input: { ...baseStd, isDoubleBottomConfirmed: true, distEma200: -7.0, daysBankerZero: 9, banker: 0, regime: 'BULL', isAboveEma9: true }, expectScen: 4, expectTier: 'SLOW_BLEED' },
  { name: 'CF-14: S4 Slow Bleed Veto overrides S7 (BEAR d200=-4% daysBankerZero=9)', input: { ...baseStd, isBaseBreakout: true, distEma200: -4.0, daysBankerZero: 9, banker: 0, regime: 'BEAR', isAboveEma9: true }, expectScen: 4, expectTier: 'SLOW_BLEED' }
];

let p2Passed = 0;
for (const t of phase2Tests) {
  const res = classifyScenario(t.input);
  let ok = true;
  if (t.expectScen !== undefined && res.scenario !== t.expectScen) ok = false;
  if (t.expectTier !== undefined && res.traffic_light !== t.expectTier && !(t.expectTier === 'MAYDAY_EXIT' && res.traffic_light === 'FALLING_KNIFE')) ok = false;
  if (t.rejectScen !== undefined && res.scenario === t.rejectScen) ok = false;

  if (ok) p2Passed++;
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}: ${t.name} -> S${res.scenario} (${res.traffic_light})`);
}
console.log(`Phase 2 Result: ${p2Passed}/${phase2Tests.length} passed.\n`);

// ============================================================================
// PHASE 3: CLIFF-EDGE BOUNDARY CONTINUITY AUDIT (+-0.01% precision)
// ============================================================================
console.log('='.repeat(85));
console.log('📐 PHASE 3: CLIFF-EDGE BOUNDARY CONTINUITY AUDIT (37 Tests)');
console.log('='.repeat(85));

const baseCliff = { ema9: 100, ema50: 100, ema150: 100, ema200: 100, volRatio: 1.0, currentPrice: 100 };

const phase3Tests = [
  // S1 BULL threshold (-12.0%)
  { name: 'S1-BULL Cliff at -12.01%', input: { ...baseCliff, distEma200: -12.01, banker: 0, regime: 'BULL' }, expectScen: 1 },
  { name: 'S1-BULL Cliff at -11.99%', input: { ...baseCliff, distEma200: -11.99, banker: 0, regime: 'BULL' }, expectScen: 16 },

  // S1 BEAR threshold (-8.0%)
  { name: 'S1-BEAR Cliff at -8.01%', input: { ...baseCliff, distEma200: -8.01, banker: 0, regime: 'BEAR' }, expectScen: 1 },
  { name: 'S1-BEAR Cliff at -7.99%', input: { ...baseCliff, distEma200: -7.99, banker: 0, regime: 'BEAR' }, expectScen: 16 },

  // S2 Dead Cat Bounce BEAR threshold (-8.0% and banker <= 6)
  { name: 'S2-BEAR Cliff at -8.01% banker=6', input: { ...baseCliff, distEma200: -8.01, banker: 6.0, regime: 'BEAR' }, expectScen: 2 },
  { name: 'S2-BEAR Cliff at -8.01% banker=6.01 (over ceiling)', input: { ...baseCliff, distEma200: -8.01, banker: 6.01, regime: 'BEAR' }, expectScen: 16 },
  { name: 'S2-BEAR Cliff at -7.99% banker=6 (above -8%)', input: { ...baseCliff, distEma200: -7.99, banker: 6.0, regime: 'BEAR' }, expectScen: 16 },

  // S3 Breakdown BULL threshold (-5.0%, daysBelow=5, banker=1)
  { name: 'S3-BULL Cliff at -5.01% (outside bedrock)', input: { ...baseCliff, distEma200: -5.01, banker: 1, daysBelowEma200: 5, regime: 'BULL' }, expectScen: 3 },
  { name: 'S3-BULL Cliff at -4.99% (inside bedrock rebound)', input: { ...baseCliff, distEma200: -4.99, banker: 1, daysBelowEma200: 5, isAboveEma9: true, isLatestBullish: true, regime: 'BULL' }, expectScen: 8 },

  // S4 Slow Bleed BULL threshold (-5.0%, daysBankerZero=8)
  { name: 'S4-BULL Cliff at -5.01%', input: { ...baseCliff, distEma200: -5.01, banker: 0, daysBankerZero: 8, regime: 'BULL' }, expectScen: 4 },
  { name: 'S4-BULL Cliff at -4.99% (reaches S13 Early Bird)', input: { ...baseCliff, distEma200: -4.99, banker: 0, daysBankerZero: 8, regime: 'BULL' }, expectScen: 13 },

  // S4 Slow Bleed BEAR threshold (-3.5%, daysBankerZero=8)
  { name: 'S4-BEAR Cliff at -3.51%', input: { ...baseCliff, distEma200: -3.51, banker: 0, daysBankerZero: 8, regime: 'BEAR' }, expectScen: 4 },
  { name: 'S4-BEAR Cliff at -3.49%', input: { ...baseCliff, distEma200: -3.49, banker: 0, daysBankerZero: 8, regime: 'BEAR' }, expectScen: 16 },

  // Support Boundary BULL (-5.00% to +2.50% for S8)
  { name: 'S8-BULL Lower Support at -5.00%', input: { ...baseCliff, distEma200: -5.00, banker: 3, isAboveEma9: true, isLatestBullish: true, regime: 'BULL' }, expectScen: 8 },
  { name: 'S8-BULL Lower Support at -5.01%', input: { ...baseCliff, distEma200: -5.01, banker: 3, isAboveEma9: true, isLatestBullish: true, regime: 'BULL' }, expectScen: 16 },
  { name: 'S8-BULL Upper Support at +2.50%', input: { ...baseCliff, distEma200: 2.50, distEma150: 2.50, banker: 3, isAboveEma9: true, isLatestBullish: true, regime: 'BULL' }, expectScen: 8 },
  { name: 'S8-BULL Upper Support at +2.51%', input: { ...baseCliff, distEma200: 2.51, distEma150: 2.51, banker: 3, isAboveEma9: true, isLatestBullish: true, regime: 'BULL' }, expectScen: 16 },

  // S10 Shallow Dip EMA 50 (-2.0% to +1.5%, d200=5.0 > 2.5 to bypass S8)
  { name: 'S10 Shallow Dip Lower Bound at d50 = -2.00%', input: { ...baseCliff, distEma50: -2.00, distEma150: 4.0, distEma200: 5.0, banker: 5, isLatestBullish: true, regime: 'BULL' }, expectScen: 10 },
  { name: 'S10 Shallow Dip Lower Bound at d50 = -2.01%', input: { ...baseCliff, distEma50: -2.01, distEma150: 4.0, distEma200: 5.0, banker: 5, isLatestBullish: true, regime: 'BULL' }, expectScen: 16 },
  { name: 'S10 Shallow Dip Upper Bound at d50 = +1.50%', input: { ...baseCliff, distEma50: 1.50, distEma150: 4.0, distEma200: 5.0, banker: 5, isLatestBullish: true, regime: 'BULL' }, expectScen: 10 },
  { name: 'S10 Shallow Dip Upper Bound at d50 = +1.51%', input: { ...baseCliff, distEma50: 1.51, distEma150: 4.0, distEma200: 5.0, banker: 5, isLatestBullish: true, regime: 'BULL' }, expectScen: 16 },
  { name: 'S10 Shallow Dip d150 floor at +3.01%', input: { ...baseCliff, distEma50: 0.0, distEma150: 3.01, distEma200: 5.0, banker: 5, isLatestBullish: true, regime: 'BULL' }, expectScen: 10 },
  { name: 'S10 Shallow Dip d150 floor at +3.00% (not > 3.0)', input: { ...baseCliff, distEma50: 0.0, distEma150: 3.00, distEma200: 5.0, banker: 5, isLatestBullish: true, regime: 'BULL' }, expectScen: 16 },

  // S12 Sideway Base Building (rsi 35-62, volRatio <= 1.2, daysNear >= 5, bypass S8/S9 via d200=3, d150=3.5, d50=3)
  { name: 'S12 Sideway Base RSI lower bound at 35', input: { ...baseCliff, daysNearEma200: 5, banker: 2, volRatio: 1.0, rsi14: 35, distEma200: 3.0, distEma150: 3.5, distEma50: 3.0, regime: 'BULL' }, expectScen: 12 },
  { name: 'S12 Sideway Base RSI lower bound at 34', input: { ...baseCliff, daysNearEma200: 5, banker: 2, volRatio: 1.0, rsi14: 34, distEma200: 3.0, distEma150: 3.5, distEma50: 3.0, regime: 'BULL' }, expectScen: 16 },
  { name: 'S12 Sideway Base RSI upper bound at 62', input: { ...baseCliff, daysNearEma200: 5, banker: 2, volRatio: 1.0, rsi14: 62, distEma200: 3.0, distEma150: 3.5, distEma50: 3.0, regime: 'BULL' }, expectScen: 12 },
  { name: 'S12 Sideway Base RSI upper bound at 63', input: { ...baseCliff, daysNearEma200: 5, banker: 2, volRatio: 1.0, rsi14: 63, distEma200: 3.0, distEma150: 3.5, distEma50: 3.0, regime: 'BULL' }, expectScen: 16 },
  { name: 'S12 Sideway Base VolRatio cap at 1.20', input: { ...baseCliff, daysNearEma200: 5, banker: 2, volRatio: 1.20, rsi14: 50, distEma200: 3.0, distEma150: 3.5, distEma50: 3.0, regime: 'BULL' }, expectScen: 12 },
  { name: 'S12 Sideway Base VolRatio cap at 1.21', input: { ...baseCliff, daysNearEma200: 5, banker: 2, volRatio: 1.21, rsi14: 50, distEma200: 3.0, distEma150: 3.5, distEma50: 3.0, regime: 'BULL' }, expectScen: 16 },

  // S14 Overbought Momentum (Core obThreshold = 15, d200=20 > 2.5 to bypass S8/S9)
  { name: 'S14 Core Overbought at d150 = 15.01% (holding)', input: { ...baseCliff, distEma200: 20.0, distEma150: 15.01, banker: 12, ownedShares: 100, category: 'Core', isAboveEma9: false }, expectScen: 14, expectTier: 'TO_THE_MOON' },
  { name: 'S14 Core Overbought at d150 = 15.00% (below threshold)', input: { ...baseCliff, distEma200: 20.0, distEma150: 15.00, banker: 12, ownedShares: 100, category: 'Core', isAboveEma9: false }, expectScen: 16, expectTier: 'ON_RADAR' },

  // S14 Overbought Momentum (Moonshot obThreshold = 25, d200=28 > 2.5 to bypass S8/S9)
  { name: 'S14 Moonshot Overbought at d150 = 25.01% (holding)', input: { ...baseCliff, distEma200: 28.0, distEma150: 25.01, banker: 12, ownedShares: 100, category: 'Moonshot', isAboveEma9: false }, expectScen: 14, expectTier: 'TO_THE_MOON' },
  { name: 'S14 Moonshot Overbought at d150 = 25.00% (below threshold)', input: { ...baseCliff, distEma200: 28.0, distEma150: 25.00, banker: 12, ownedShares: 100, category: 'Moonshot', isAboveEma9: false }, expectScen: 16, expectTier: 'ON_RADAR' },

  // S15 Trend Runner (BULL, d50=3 > 1.5 to bypass S10, d150>4, banker>=10, aboveEma9)
  { name: 'S15 Trend Runner d150 floor at 4.01%', input: { ...baseCliff, regime: 'BULL', distEma50: 3.0, distEma150: 4.01, banker: 10, isAboveEma9: true, distEma200: 5.0 }, expectScen: 15, expectTier: 'TO_THE_MOON' },
  { name: 'S15 Trend Runner d150 floor at 4.00% (not > 4.0)', input: { ...baseCliff, regime: 'BULL', distEma50: 3.0, distEma150: 4.00, banker: 10, isAboveEma9: true, distEma200: 5.0 }, expectScen: 16, expectTier: 'ON_RADAR' },
  { name: 'S15 Trend Runner banker floor at 10.0', input: { ...baseCliff, regime: 'BULL', distEma50: 3.0, distEma150: 5.0, banker: 10.0, isAboveEma9: true, distEma200: 5.0 }, expectScen: 15, expectTier: 'TO_THE_MOON' },
  { name: 'S15 Trend Runner banker floor at 9.99%', input: { ...baseCliff, regime: 'BULL', distEma50: 3.0, distEma150: 5.0, banker: 9.99, isAboveEma9: true, distEma200: 5.0 }, expectScen: 16, expectTier: 'ON_RADAR' }
];

let p3Passed = 0;
for (const c of phase3Tests) {
  const res = classifyScenario(c.input);
  let ok = res.scenario === c.expectScen;
  if (c.expectTier && res.traffic_light !== c.expectTier) ok = false;
  if (ok) p3Passed++;
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}: ${c.name} -> S${res.scenario} (${res.badge})`);
}
console.log(`Phase 3 Result: ${p3Passed}/${phase3Tests.length} passed.\n`);

// ============================================================================
// PHASE 4: SEMANTIC INVARIANT MATRIX (23 Rules x Multi-Cases)
// ============================================================================
console.log('='.repeat(85));
console.log('🛡️ PHASE 4: SEMANTIC INVARIANT MATRIX (SR-01 to SR-23)');
console.log('='.repeat(85));

const phase4Rules = [
  // SR-01: BEAR + d200 < -8% + banker 1-6 -> S2 MAYDAY_EXIT / FALLING_KNIFE
  { name: 'SR-01a: BEAR d200=-10% banker=2', input: { ...baseCliff, regime: 'BEAR', distEma200: -10.0, banker: 2 }, check: r => r.scenario === 2 && (r.traffic_light === 'MAYDAY_EXIT' || r.traffic_light === 'FALLING_KNIFE') },
  { name: 'SR-01b: BEAR d200=-8.5% banker=5', input: { ...baseCliff, regime: 'BEAR', distEma200: -8.5, banker: 5 }, check: r => r.scenario === 2 && (r.traffic_light === 'MAYDAY_EXIT' || r.traffic_light === 'FALLING_KNIFE') },

  // SR-02: BEAR + d200 < -4% + daysBelow >= 3 -> S3 MAYDAY_EXIT / FALLING_KNIFE
  { name: 'SR-02a: BEAR d200=-4.5% daysBelow=3 banker=3', input: { ...baseCliff, regime: 'BEAR', distEma200: -4.5, daysBelowEma200: 3, banker: 3 }, check: r => r.scenario === 3 && (r.traffic_light === 'MAYDAY_EXIT' || r.traffic_light === 'FALLING_KNIFE') },
  { name: 'SR-02b: BEAR d200=-6.0% daysBelow=5 banker=10', input: { ...baseCliff, regime: 'BEAR', distEma200: -6.0, daysBelowEma200: 5, banker: 10 }, check: r => r.scenario === 3 && (r.traffic_light === 'MAYDAY_EXIT' || r.traffic_light === 'FALLING_KNIFE') },

  // SR-03: BULL + d200 < -12% + banker=0 -> S1 MAYDAY_EXIT / FALLING_KNIFE
  { name: 'SR-03a: BULL d200=-12.5% banker=0', input: { ...baseCliff, regime: 'BULL', distEma200: -12.5, banker: 0 }, check: r => r.scenario === 1 && (r.traffic_light === 'MAYDAY_EXIT' || r.traffic_light === 'FALLING_KNIFE') },
  { name: 'SR-03b: BULL d200=-25.0% banker=0', input: { ...baseCliff, regime: 'BULL', distEma200: -25.0, banker: 0 }, check: r => r.scenario === 1 && (r.traffic_light === 'MAYDAY_EXIT' || r.traffic_light === 'FALLING_KNIFE') },

  // SR-04: non-BULL + d200 < -8% + banker=0 -> S1 MAYDAY_EXIT / FALLING_KNIFE
  { name: 'SR-04a: NEUTRAL d200=-8.5% banker=0', input: { ...baseCliff, regime: 'NEUTRAL', distEma200: -8.5, banker: 0 }, check: r => r.scenario === 1 && (r.traffic_light === 'MAYDAY_EXIT' || r.traffic_light === 'FALLING_KNIFE') },
  { name: 'SR-04b: BEAR d200=-9.0% banker=0', input: { ...baseCliff, regime: 'BEAR', distEma200: -9.0, banker: 0 }, check: r => r.scenario === 1 && (r.traffic_light === 'MAYDAY_EXIT' || r.traffic_light === 'FALLING_KNIFE') },

  // SR-05: daysBankerZero >= 8 + d200 < threshold -> S4 SLOW_BLEED
  { name: 'SR-05a: BEAR d200=-3.8% daysBankerZero=8', input: { ...baseCliff, regime: 'BEAR', distEma200: -3.8, daysBankerZero: 8, banker: 0 }, check: r => r.scenario === 4 && r.traffic_light === 'SLOW_BLEED' },
  { name: 'SR-05b: BULL d200=-5.2% daysBankerZero=9', input: { ...baseCliff, regime: 'BULL', distEma200: -5.2, daysBankerZero: 9, banker: 0 }, check: r => r.scenario === 4 && r.traffic_light === 'SLOW_BLEED' },

  // SR-06: isNearMajorEma + banker>=1 + aboveEma9 + bullish + non-BEAR -> S8 BUY_NOW
  { name: 'SR-06a: BULL d200=-1.0% banker=3 green aboveEma9', input: { ...baseCliff, regime: 'BULL', distEma200: -1.0, banker: 3, isAboveEma9: true, isLatestBullish: true }, check: r => r.scenario === 8 && r.traffic_light === 'BUY_NOW' },
  { name: 'SR-06b: NEUTRAL d200=0.5% banker=5 green aboveEma9', input: { ...baseCliff, regime: 'NEUTRAL', distEma200: 0.5, banker: 5, isAboveEma9: true, isLatestBullish: true }, check: r => r.scenario === 8 && r.traffic_light === 'BUY_NOW' },

  // SR-07: isNearMajorEma + banker>=1 + (!aboveEma9 || !bullish) + non-BEAR -> S9 GET_READY
  { name: 'SR-07a: BULL below EMA9 testing support', input: { ...baseCliff, regime: 'BULL', distEma200: 0.0, banker: 3, isAboveEma9: false, isLatestBullish: true }, check: r => r.scenario === 9 && r.traffic_light === 'GET_READY' },
  { name: 'SR-07b: NEUTRAL red candle testing support', input: { ...baseCliff, regime: 'NEUTRAL', distEma200: 0.0, banker: 3, isAboveEma9: true, isLatestBullish: false }, check: r => r.scenario === 9 && r.traffic_light === 'GET_READY' },

  // SR-08: isNearMajorEma + banker<1 + non-BEAR -> S13 GET_READY
  { name: 'SR-08a: BULL banker=0 near EMA 200', input: { ...baseCliff, regime: 'BULL', distEma200: 0.0, banker: 0, isAboveEma9: true, isLatestBullish: true }, check: r => r.scenario === 13 && r.traffic_light === 'GET_READY' },
  { name: 'SR-08b: NEUTRAL banker=0.5 near EMA 200', input: { ...baseCliff, regime: 'NEUTRAL', distEma200: -2.0, banker: 0.5, isAboveEma9: false, isLatestBullish: true }, check: r => r.scenario === 13 && r.traffic_light === 'GET_READY' },

  // SR-09: d150 > 15 + banker>=12 + owned>0 + Core -> S14 TO_THE_MOON (d200=20, d50=10 to bypass S10)
  { name: 'SR-09a: Core d150=18% banker=14 holding 100 shares', input: { ...baseCliff, regime: 'BULL', distEma200: 20.0, distEma150: 18.0, distEma50: 10.0, banker: 14, ownedShares: 100, category: 'Core' }, check: r => r.scenario === 14 && r.traffic_light === 'TO_THE_MOON' },

  // SR-10: d150 > 15 + banker>=12 + owned=0 + Core -> S14 ON_RADAR (d200=20, d50=10 to bypass S10)
  { name: 'SR-10a: Core d150=18% banker=14 holding 0 shares', input: { ...baseCliff, regime: 'BULL', distEma200: 20.0, distEma150: 18.0, distEma50: 10.0, banker: 14, ownedShares: 0, category: 'Core' }, check: r => r.scenario === 14 && r.traffic_light === 'ON_RADAR' },

  // SR-11: BULL + d50>0 + d150>4 + banker>=10 + aboveEma9 -> S15 TO_THE_MOON (d50=3 to bypass S10)
  { name: 'SR-11a: Trend Runner perfect stack', input: { ...baseCliff, regime: 'BULL', distEma50: 3.0, distEma150: 6.0, banker: 10, isAboveEma9: true, distEma200: 8.0 }, check: r => r.scenario === 15 && r.traffic_light === 'TO_THE_MOON' },

  // SR-12: category=Moonshot -> obThreshold=25 (d200=28, d50=15 to bypass S10)
  { name: 'SR-12a: Moonshot d150=20% not overbought', input: { ...baseCliff, regime: 'BULL', distEma200: 28.0, distEma150: 20.0, distEma50: 15.0, banker: 15, ownedShares: 100, category: 'Moonshot', isAboveEma9: false }, check: r => r.scenario === 16 },
  { name: 'SR-12b: Moonshot d150=26% is overbought', input: { ...baseCliff, regime: 'BULL', distEma200: 28.0, distEma150: 26.0, distEma50: 15.0, banker: 15, ownedShares: 100, category: 'Moonshot' }, check: r => r.scenario === 14 && r.traffic_light === 'TO_THE_MOON' },

  // SR-13 to SR-15: S5, S6, S7 require regime !== 'BEAR'
  { name: 'SR-13: S5 rejects BEAR', input: { ...baseCliff, isDoubleBottomConfirmed: true, regime: 'BEAR', banker: 3, isAboveEma9: true }, check: r => r.scenario !== 5 },
  { name: 'SR-14: S6 rejects BEAR', input: { ...baseCliff, isBearTrapReclaimed: true, regime: 'BEAR', banker: 3, isAboveEma9: true }, check: r => r.scenario !== 6 },
  { name: 'SR-15: S7 rejects BEAR', input: { ...baseCliff, isBaseBreakout: true, regime: 'BEAR', banker: 3, isAboveEma9: true }, check: r => r.scenario !== 7 },

  // SR-16: S10 requires d200 > 0 (d200=5.0 to bypass S8)
  { name: 'SR-16a: S10 rejects d200 <= 0', input: { ...baseCliff, distEma50: 0.0, distEma150: 4.0, distEma200: -0.5, banker: 5, isLatestBullish: true, regime: 'BULL' }, check: r => r.scenario !== 10 },
  { name: 'SR-16b: S10 accepts d200 > 0', input: { ...baseCliff, distEma50: 0.0, distEma150: 4.0, distEma200: 5.0, banker: 5, isLatestBullish: true, regime: 'BULL' }, check: r => r.scenario === 10 },

  // SR-17: S10 requires regime = BULL
  { name: 'SR-17a: S10 rejects NEUTRAL', input: { ...baseCliff, distEma50: 0.0, distEma150: 4.0, distEma200: 5.0, banker: 5, isLatestBullish: true, regime: 'NEUTRAL' }, check: r => r.scenario !== 10 },

  // SR-18: S12 rejects rsi14 < 35 or > 62
  { name: 'SR-18a: S12 rejects rsi=30', input: { ...baseCliff, daysNearEma200: 5, banker: 2, volRatio: 1.0, rsi14: 30, distEma200: 3.0, distEma150: 3.5, distEma50: 3.0, regime: 'BULL' }, check: r => r.scenario !== 12 },
  { name: 'SR-18b: S12 rejects rsi=70', input: { ...baseCliff, daysNearEma200: 5, banker: 2, volRatio: 1.0, rsi14: 70, distEma200: 3.0, distEma150: 3.5, distEma50: 3.0, regime: 'BULL' }, check: r => r.scenario !== 12 },

  // SR-19: S12 rejects volRatio > 1.2
  { name: 'SR-19a: S12 rejects volRatio=1.5', input: { ...baseCliff, daysNearEma200: 5, banker: 2, volRatio: 1.5, rsi14: 50, distEma200: 3.0, distEma150: 3.5, distEma50: 3.0, regime: 'BULL' }, check: r => r.scenario !== 12 },

  // SR-20: S8 BUY_NOW requires d200 >= ema200LowerBound
  { name: 'SR-20a: BULL d200=-5.0% pass S8', input: { ...baseCliff, distEma200: -5.0, banker: 3, isAboveEma9: true, isLatestBullish: true, regime: 'BULL' }, check: r => r.scenario === 8 },
  { name: 'SR-20b: BULL d200=-5.1% reject S8', input: { ...baseCliff, distEma200: -5.1, banker: 3, isAboveEma9: true, isLatestBullish: true, regime: 'BULL' }, check: r => r.scenario !== 8 },

  // SR-21: No scenario produces undefined or null traffic_light
  { name: 'SR-21a: Check defined traffic light', input: { ...baseCliff }, check: r => typeof r.traffic_light === 'string' && r.traffic_light.length > 0 },

  // SR-22: consecutiveRedBars >= 2 with below EMA 9 yields S9
  { name: 'SR-22a: Red bars >= 2 below EMA9 yields S9', input: { ...baseCliff, distEma200: 0.0, banker: 3, isAboveEma9: false, isLatestBullish: true, consecutiveRedBars: 2, regime: 'BULL' }, check: r => r.scenario === 9 },

  // SR-23: BEAR regime lower bound is -3.5%
  { name: 'SR-23a: BEAR d200=-3.6% daysBankerZero=8 is Slow Bleed', input: { ...baseCliff, regime: 'BEAR', distEma200: -3.6, daysBankerZero: 8, banker: 0 }, check: r => r.scenario === 4 },
  { name: 'SR-23b: BEAR d200=-3.4% daysBankerZero=8 is not Slow Bleed', input: { ...baseCliff, regime: 'BEAR', distEma200: -3.4, daysBankerZero: 8, banker: 0 }, check: r => r.scenario !== 4 }
];

let p4Passed = 0;
for (const r of phase4Rules) {
  const res = classifyScenario(r.input);
  const ok = r.check(res);
  if (ok) p4Passed++;
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}: ${r.name} -> S${res.scenario} (${res.traffic_light})`);
}
console.log(`Phase 4 Result: ${p4Passed}/${phase4Rules.length} passed.\n`);

// ============================================================================
// PHASE 5: BLACK SWAN & NUMERICAL RESILIENCE (13 Tests)
// ============================================================================
console.log('='.repeat(85));
console.log('🌪️ PHASE 5: BLACK SWAN & NUMERICAL CRASH RESILIENCE');
console.log('='.repeat(85));

const phase5Tests = [
  { name: 'BlackSwan 1: Flash Crash -80% with 0 Banker in BEAR', input: { ...baseCliff, currentPrice: 20, distEma200: -80, banker: 0, regime: 'BEAR' }, check: r => r.traffic_light === 'MAYDAY_EXIT' || r.traffic_light === 'FALLING_KNIFE' },
  { name: 'BlackSwan 2: Hyper parabolic +800% run (holding shares)', input: { ...baseCliff, currentPrice: 900, distEma150: 800, banker: 20, ownedShares: 100, regime: 'BULL' }, check: r => r.traffic_light === 'TO_THE_MOON' },
  { name: 'BlackSwan 3: Hyper parabolic +800% run (0 shares - no chase)', input: { ...baseCliff, currentPrice: 900, distEma150: 800, banker: 20, ownedShares: 0, regime: 'BULL' }, check: r => r.traffic_light === 'ON_RADAR' },
  { name: 'BlackSwan 4: Volume drought (volRatio = 0.0)', input: { ...baseCliff, currentPrice: 100, distEma200: 0, banker: 0, volRatio: 0, regime: 'BULL' }, check: r => r.traffic_light === 'GET_READY' },
  { name: 'BlackSwan 5: Banker float micro-precision (banker = 0.00001)', input: { ...baseCliff, currentPrice: 99, distEma200: -1.0, banker: 0.00001, isLatestBullish: true, isAboveEma9: true, regime: 'BULL' }, check: r => r.traffic_light === 'GET_READY' },
  { name: 'BlackSwan 6: NaN price fallback to S16 ON_RADAR', input: { ...baseCliff, currentPrice: NaN }, check: r => r.scenario === 16 && r.traffic_light === 'ON_RADAR' },
  { name: 'BlackSwan 7: Infinity d200 does not crash', input: { ...baseCliff, distEma200: Infinity }, check: r => validTiers.has(r.traffic_light) },
  { name: 'BlackSwan 8: Negative ownedShares does not crash', input: { ...baseCliff, ownedShares: -5 }, check: r => validTiers.has(r.traffic_light) },
  { name: 'BlackSwan 9: Negative daysNearEma200 does not crash', input: { ...baseCliff, daysNearEma200: -1 }, check: r => validTiers.has(r.traffic_light) },
  { name: 'BlackSwan 10: Banker overflow (banker = 20.5) does not crash', input: { ...baseCliff, banker: 20.5 }, check: r => validTiers.has(r.traffic_light) },
  { name: 'BlackSwan 11: Invalid regime string falls back cleanly', input: { ...baseCliff, regime: 'UNKNOWN_REGIME' }, check: r => validTiers.has(r.traffic_light) },
  { name: 'BlackSwan 12: All indicator zeros (missing price/ema fallback)', input: { currentPrice: 0, ema9: 0, ema50: 0, ema150: 0, ema200: 0 }, check: r => r.scenario === 16 && r.traffic_light === 'ON_RADAR' },
  { name: 'BlackSwan 13: Moonshot overbought boundary rejection (d150=20 < 25)', input: { ...baseCliff, distEma200: 25.0, distEma150: 20.0, banker: 15, ownedShares: 100, category: 'Moonshot', isAboveEma9: false }, check: r => r.traffic_light !== 'TO_THE_MOON' }
];

let p5Passed = 0;
for (const b of phase5Tests) {
  let ok = false;
  try {
    const res = classifyScenario(b.input);
    ok = b.check(res);
  } catch (e) {
    ok = false;
  }
  if (ok) p5Passed++;
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}: ${b.name}`);
}
console.log(`Phase 5 Result: ${p5Passed}/${phase5Tests.length} passed.\n`);

// ============================================================================
// FINAL COMPREHENSIVE VERDICT
// ============================================================================
const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
const grandTotalTests = p1Tests + phase2Tests.length + phase3Tests.length + phase4Rules.length + phase5Tests.length;
const allPassed = (p1Violations.length === 0) &&
                  (p2Passed === phase2Tests.length) &&
                  (p3Passed === phase3Tests.length) &&
                  (p4Passed === phase4Rules.length) &&
                  (p5Passed === phase5Tests.length);

console.log('='.repeat(85));
console.log(`📊 EXECUTION SUMMARY (${totalDuration}s elapsed):`);
console.log(`- Phase 1 Combinatorial: ${p1Tests.toLocaleString()} tests (${p1Violations.length} violations)`);
console.log(`- Phase 2 Pattern Matrix: ${p2Passed}/${phase2Tests.length} passed`);
console.log(`- Phase 3 Cliff-Edge Boundaries: ${p3Passed}/${phase3Tests.length} passed`);
console.log(`- Phase 4 Semantic Invariants: ${p4Passed}/${phase4Rules.length} passed`);
console.log(`- Phase 5 Black Swan Numerics: ${p5Passed}/${phase5Tests.length} passed`);
console.log(`- TOTAL TESTS EXECUTED: ${grandTotalTests.toLocaleString()}`);
console.log('='.repeat(85));
console.log(`🎯 OVERALL ULTRA STRESS TEST V2 VERDICT: ${allPassed ? '🏆 100% BULLETPROOF SUPREME PASS' : '❌ SOME TESTS FAILED'}`);
console.log('='.repeat(85));

if (!allPassed) {
  process.exit(1);
}
