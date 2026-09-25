// tools/test-sync.cjs
const SimpleStore = require('../electron/store.cjs');
const FastingEngine = require('../electron/fasting-engine.cjs');

async function testSync() {
  const store = new SimpleStore();
  const engine = new FastingEngine(store, null, { vpsUrl: 'https://brain.doctorbankonline.com' });
  
  console.log('🔄 Calling syncWithVps()...');
  await engine.syncWithVps();

  console.log('✅ syncWithVps completed!');
  console.log('serverNowDiffMs:', engine.serverNowDiffMs, 'ms');
  
  const state = engine.getState();
  console.log('Fasting Engine State:', {
    currentStatus: state.currentStatus,
    isEating: state.isEating,
    elapsedSeconds: state.elapsedSeconds,
    targetHours: state.targetHours,
    stage: state.stage.name,
    stageColor: state.stage.color
  });

  const hrs = Math.floor(state.elapsedSeconds / 3600);
  const mins = Math.floor((state.elapsedSeconds % 3600) / 60);
  const secs = state.elapsedSeconds % 60;
  console.log(`Formatted Time: ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
}

testSync().catch(console.error);
