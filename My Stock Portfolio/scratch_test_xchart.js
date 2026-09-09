import fs from 'fs';

async function runTests() {
  console.log('====================================================');
  console.log('🔍 DEEP VERIFICATION: X-Chart Full Banker Test');
  console.log('====================================================');

  const env = fs.readFileSync('/root/stock-portfolio/server/.env', 'utf-8');
  const passMatch = env.match(/STOCK_PASSWORD=(.+)/);
  const password = passMatch ? passMatch[1].trim() : '';

  const loginRes = await fetch('http://localhost:3100/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const { token } = await loginRes.json();

  const authHeaders = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  // Test NVDA
  console.log('\n[TEST NVDA FULL HISTORY]');
  const res = await fetch('http://localhost:3100/api/chart/NVDA', { headers: authHeaders });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Total Historical Bars:', data.dates?.length);
  console.log('Banker Array Length:', data.bankerSeries?.length);

  // Check how many non-zero banker bars exist in the older history (>500 bars ago)
  const olderBars = data.bankerSeries?.slice(0, data.bankerSeries.length - 500) || [];
  const activeOlderBanker = olderBars.filter(b => b > 0);
  console.log('Older Bars (>500 days ago) Count:', olderBars.length);
  console.log('Active Non-Zero Banker Bars in Older History:', activeOlderBanker.length);
  console.log('Old Code Result was: 0 (All Dummy Green)');
  console.log('New Code Result is:', activeOlderBanker.length, 'ACTIVE BARS!');

  console.log('\n====================================================');
  console.log('🎉 FULL BANKER VERIFICATION COMPLETE');
  console.log('====================================================');
}

runTests().catch(console.error);
