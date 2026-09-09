import fs from 'fs';

async function runTests() {
  console.log('====================================================');
  console.log('🔍 DEEP VERIFICATION: X-Chart API & Database Test');
  console.log('====================================================');

  const env = fs.readFileSync('/root/stock-portfolio/server/.env', 'utf-8');
  const passMatch = env.match(/STOCK_PASSWORD=(.+)/);
  const password = passMatch ? passMatch[1].trim() : '';

  // 1. Authenticate
  console.log('\n[TEST 1] Authenticating via POST /api/auth/login...');
  const loginRes = await fetch('http://localhost:3100/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) {
    console.error('❌ Login failed! Data:', loginData);
    process.exit(1);
  }
  console.log('✅ Auth Token acquired successfully.');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. Test /api/chart/VRT
  console.log('\n[TEST 2] Testing GET /api/chart/VRT (Stock Chart)...');
  const vrtRes = await fetch('http://localhost:3100/api/chart/VRT', { headers: authHeaders });
  console.log('   HTTP Status:', vrtRes.status);
  const vrtData = await vrtRes.json();
  
  if (vrtRes.status !== 200) {
    console.error('❌ Error response:', vrtData);
  } else {
    console.log('   Symbol:', vrtData.symbol);
    console.log('   Current Price:', vrtData.currentPrice);
    console.log('   Historical Bars (Dates):', vrtData.dates?.length);
    console.log('   Closes Array length:', vrtData.closes?.length);
    console.log('   Opens Array length:', vrtData.opens?.length);
    console.log('   Highs Array length:', vrtData.highs?.length);
    console.log('   Lows Array length:', vrtData.lows?.length);
    console.log('   EMA 50 count:', vrtData.ema50?.length, 'Last:', vrtData.ema50?.[vrtData.ema50.length - 1]);
    console.log('   EMA 150 count:', vrtData.ema150?.length, 'Last:', vrtData.ema150?.[vrtData.ema150.length - 1]);
    console.log('   EMA 200 count:', vrtData.ema200?.length, 'Last:', vrtData.ema200?.[vrtData.ema200.length - 1]);
    console.log('   Banker MCDX count:', vrtData.bankerSeries?.length, 'Last:', vrtData.bankerSeries?.[vrtData.bankerSeries.length - 1]);
    console.log('   Hot Money count:', vrtData.hotMoneySeries?.length, 'Last:', vrtData.hotMoneySeries?.[vrtData.hotMoneySeries.length - 1]);
    console.log('   Retail count:', vrtData.retailSeries?.length, 'Last:', vrtData.retailSeries?.[vrtData.retailSeries.length - 1]);
    
    // Integrity check
    const hasNaN = [
      ...vrtData.closes,
      ...vrtData.ema50.filter(v => v !== null),
      ...vrtData.ema150.filter(v => v !== null),
      ...vrtData.ema200.filter(v => v !== null)
    ].some(v => isNaN(v));
    console.log('   Integrity Check (No NaN):', !hasNaN ? '✅ PASSED' : '❌ FAILED');
  }

  // 3. Test /api/chart/THB=X
  console.log('\n[TEST 3] Testing GET /api/chart/THB=X (Forex USD/THB)...');
  const thbRes = await fetch('http://localhost:3100/api/chart/THB=X', { headers: authHeaders });
  console.log('   HTTP Status:', thbRes.status);
  const thbData = await thbRes.json();
  if (thbRes.status !== 200) {
    console.error('❌ Error response:', thbData);
  } else {
    console.log('   Symbol:', thbData.symbol);
    console.log('   Live USD/THB Rate:', thbData.currentPrice);
    console.log('   Historical Bars count:', thbData.dates?.length);
    console.log('   Latest Date:', thbData.dates?.[thbData.dates.length - 1]);
  }

  // 4. Test /api/market/heatmap?scope=top50
  console.log('\n[TEST 4] Testing GET /api/market/heatmap?scope=top50...');
  const t0 = Date.now();
  const hmRes = await fetch('http://localhost:3100/api/market/heatmap?scope=top50', { headers: authHeaders });
  const tFetch = Date.now() - t0;
  console.log(`   HTTP Status: ${hmRes.status} (took ${tFetch}ms)`);
  const hmData = await hmRes.json();
  if (hmRes.status !== 200) {
    console.error('❌ Error response:', hmData);
  } else {
    console.log('   Items count:', hmData.items?.length);
    console.log('   Cached:', hmData.cached, '| Cache Age:', hmData.cacheAgeSeconds, 'sec');
    console.log('   Top 3 Mega-Caps:');
    hmData.items?.slice(0, 3).forEach((item, idx) => {
      console.log(`     ${idx + 1}. ${item.symbol} (${item.name}) - $${item.price} (${item.percentChange}%) [${item.sector}]`);
    });
  }

  // 5. Test Heatmap Cache Speed (2nd call should be < 50ms)
  console.log('\n[TEST 5] Testing Heatmap Cache Hit & Response Speed...');
  const tCached0 = Date.now();
  const hmRes2 = await fetch('http://localhost:3100/api/market/heatmap?scope=top50', { headers: authHeaders });
  const tCached = Date.now() - tCached0;
  const hmData2 = await hmRes2.json();
  console.log(`   HTTP Status: ${hmRes2.status} (took ${tCached}ms)`);
  console.log('   Cached flag:', hmData2.cached, '| Cache age:', hmData2.cacheAgeSeconds, 's');
  console.log('   Cache Speed Test:', tCached < 100 ? '✅ PASSED (Ultra Fast In-Memory)' : '⚠️ SLOWER THAN EXPECTED');

  // 6. Test /api/market/heatmap?scope=watchlist
  console.log('\n[TEST 6] Testing GET /api/market/heatmap?scope=watchlist...');
  const wlRes = await fetch('http://localhost:3100/api/market/heatmap?scope=watchlist', { headers: authHeaders });
  console.log('   HTTP Status:', wlRes.status);
  const wlData = await wlRes.json();
  if (wlRes.status !== 200) {
    console.error('❌ Error response:', wlData);
  } else {
    console.log('   Watchlist items count:', wlData.items?.length);
    console.log('   Watchlist symbols:', wlData.items?.map(i => i.symbol).join(', '));
  }

  console.log('\n====================================================');
  console.log('🎉 DEEP VERIFICATION COMPLETED');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
