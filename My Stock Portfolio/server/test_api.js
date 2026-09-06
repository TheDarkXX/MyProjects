// Using global fetch in Node 22

async function test() {
  const loginRes = await fetch('http://localhost:3100/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'doctorbank2026' })
  });
  const loginData = await loginRes.json();
  console.log('loginData:', loginData);
  const token = loginData.token;
  if (!token) return;
  console.log('Login OK, token prefix:', token.substring(0, 15));

  // Test transactions
  const txRes = await fetch('http://localhost:3100/api/transactions?portfolio_id=fcfdd1e0-bf53-4910-89e7-8ca2474d4c27', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const txData = await txRes.json();
  console.log('Transactions count:', txData.length);
  console.log('First and last tx date:', txData[0]?.date, '->', txData[txData.length - 1]?.date);

  // Test historical
  const histRes = await fetch('http://localhost:3100/api/historical', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      symbols: ['NVDA', 'CRWD', 'META'],
      from: '2026-08-01',
      to: '2026-09-01'
    })
  });
  const histData = await histRes.json();
  console.log('Historical status:', histRes.status);
  console.log('Historical symbols returned:', Object.keys(histData));
  for (const sym of Object.keys(histData)) {
    console.log(`  ${sym}: ${histData[sym]?.length} data points`);
  }

  // Test blueprints
  const bpRes = await fetch('http://localhost:3100/api/blueprints/fcfdd1e0-bf53-4910-89e7-8ca2474d4c27', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const bpData = await bpRes.json();
  console.log('Blueprints count:', bpData.length);

  // Test templates
  const tplCreateRes = await fetch('http://localhost:3100/api/blueprints/fcfdd1e0-bf53-4910-89e7-8ca2474d4c27/templates', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Growth Template',
      entries: [{ symbol: 'NVDA', target_percent: 50 }, { symbol: 'CRWD', target_percent: 50 }]
    })
  });
  const tplCreateData = await tplCreateRes.json();
  console.log('Template created status:', tplCreateRes.status, 'ID:', tplCreateData.id);

  const tplGetRes = await fetch('http://localhost:3100/api/blueprints/fcfdd1e0-bf53-4910-89e7-8ca2474d4c27/templates', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const tplGetData = await tplGetRes.json();
  console.log('Templates list count:', tplGetData.length, 'First name:', tplGetData[0]?.name);

  // Test snapshots
  const snapCreateRes = await fetch('http://localhost:3100/api/blueprints/fcfdd1e0-bf53-4910-89e7-8ca2474d4c27/snapshots', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'ai_advisor',
      name: 'Test Snapshot',
      entries: [{ symbol: 'NVDA', target_percent: 30 }]
    })
  });
  const snapCreateData = await snapCreateRes.json();
  console.log('Snapshot created status:', snapCreateRes.status, 'ID:', snapCreateData.id);

  const snapGetRes = await fetch('http://localhost:3100/api/blueprints/fcfdd1e0-bf53-4910-89e7-8ca2474d4c27/snapshots/latest?source=ai_advisor', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const snapGetData = await snapGetRes.json();
  console.log('Latest snapshot found:', snapGetData.found, 'entries count:', snapGetData.entries?.length);

  // Clean up test template
  if (tplCreateData.id) {
    const delRes = await fetch(`http://localhost:3100/api/blueprints/fcfdd1e0-bf53-4910-89e7-8ca2474d4c27/templates/${tplCreateData.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Delete template status:', delRes.status);
  }
}

test().catch(console.error);
