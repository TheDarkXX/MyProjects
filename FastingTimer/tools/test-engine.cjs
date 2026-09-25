// tools/test-engine.cjs
// Automated Verification Script for Fasting & Kitchen Engines

const { StageDetector, STAGES } = require('../electron/stage-detector.cjs');
const KitchenTimer = require('../electron/kitchen-timer.cjs');
const assert = require('assert');

console.log('🧪 Starting Fasting & Kitchen Engine Verification Suite...\n');

// ─── 1. Test 5 Biological Stages Math ───
console.log('1️⃣ Testing 5 Biological Stages Thresholds...');
const detector = new StageDetector();

const stage1 = detector.getStage(2 * 3600); // 2 hours
assert.strictEqual(stage1.stage, 'anabolic', 'Hour 2 must be Anabolic/Digestion');
assert.strictEqual(stage1.color, '#38bdf8');
console.log('  ✅ 2h -> Anabolic (Digestion) Verified (#38bdf8)');

const stage2 = detector.getStage(6 * 3600); // 6 hours
assert.strictEqual(stage2.stage, 'catabolic', 'Hour 6 must be Fat Burning Zone');
assert.strictEqual(stage2.color, '#10b981');
console.log('  ✅ 6h -> Catabolic (Fat Burn) Verified (#10b981)');

const stage3 = detector.getStage(14 * 3600); // 14 hours
assert.strictEqual(stage3.stage, 'ketosis', 'Hour 14 must be Ketosis');
assert.strictEqual(stage3.color, '#8b5cf6');
console.log('  ✅ 14h -> Ketosis Switch Verified (#8b5cf6)');

const stage4 = detector.getStage(18 * 3600); // 18 hours
assert.strictEqual(stage4.stage, 'autophagy', 'Hour 18 must be Autophagy');
assert.strictEqual(stage4.color, '#f59e0b');
console.log('  ✅ 18h -> Autophagy Peak Verified (#f59e0b)');

const stage5 = detector.getStage(28 * 3600); // 28 hours
assert.strictEqual(stage5.stage, 'renewal', 'Hour 28 must be Renewal');
assert.strictEqual(stage5.color, '#f43f5e');
console.log('  ✅ 28h -> Deep Cellular Renewal Verified (#f43f5e)');

// ─── 2. Test Notification Dedup ───
console.log('\n2️⃣ Testing Notification Deduplication...');
let notifyCount = 0;
const mockNotifier = {
  notifyStageTransition: () => { notifyCount++; }
};
const detectorWithNotify = new StageDetector(mockNotifier);
const session = { id: 'test_session_1', status: 'active' };

// Simulate ticks crossing 4h multiple times
detectorWithNotify.evaluate(session, 4.1 * 3600);
detectorWithNotify.evaluate(session, 4.2 * 3600);
detectorWithNotify.evaluate(session, 4.3 * 3600);
assert.strictEqual(notifyCount, 1, 'Milestone notification must only fire ONCE per stage');
console.log('  ✅ Dedup Armor Verified: 3 ticks across 4h threshold fired exactly 1 notification');

// ─── 3. Test Kitchen Timer Engine ───
console.log('\n3️⃣ Testing Kitchen Timer Engine...');
const kitchen = new KitchenTimer();

// Start 8 min egg boil
kitchen.start('ไข่ตานี', 480);
let state = kitchen.getState();
assert.strictEqual(state.name, 'ไข่ตานี');
assert.strictEqual(state.remainingSeconds, 480);
assert.strictEqual(state.isRunning, true);
console.log('  ✅ Kitchen Timer Start: 480s (8m) initialized');

// Add 2 minutes (+120s)
kitchen.addSeconds(120);
state = kitchen.getState();
assert.strictEqual(state.remainingSeconds, 600);
console.log('  ✅ Add 2 Minutes: 480s -> 600s verified');

// Pause & Resume
kitchen.pause();
state = kitchen.getState();
assert.strictEqual(state.isRunning, false);
console.log('  ✅ Kitchen Timer Pause Verified');

kitchen.resume();
state = kitchen.getState();
assert.strictEqual(state.isRunning, true);
console.log('  ✅ Kitchen Timer Resume Verified');

// Stop
kitchen.stop();
state = kitchen.getState();
assert.strictEqual(state.isRunning, false);
console.log('  ✅ Kitchen Timer Stop Verified');

console.log('\n🎉 ALL VERIFICATION TESTS PASSED 100% WITH ZERO ERRORS!\n');
