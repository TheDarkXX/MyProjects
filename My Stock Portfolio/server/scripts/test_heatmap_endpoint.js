import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHmac } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let secret = 'fallback-stock-secret-key-2026';
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  const match = env.match(/JWT_SECRET=(.*)/);
  if (match) secret = match[1].trim();
}

const payload = { id: 'admin', role: 'admin', exp: Date.now() + 604800000 };
const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
const sig = createHmac('sha256', secret).update(dataStr).digest('base64url');
const token = `${dataStr}.${sig}`;

async function run() {
  console.log('Testing GET http://localhost:3100/api/market/heatmap?scope=sp100 ...');
  try {
    const res = await fetch('http://localhost:3100/api/market/heatmap?scope=sp100', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log('Scope:', data.scope);
    console.log('Market State:', data.marketState);
    console.log('Cached:', data.cached);
    console.log('Cache Age Seconds:', data.cacheAgeSeconds);
    console.log('Items Count:', data.items ? data.items.length : 0);
    if (data.items && data.items.length > 0) {
      console.log('Top Stock Sample:', {
        symbol: data.items[0].symbol,
        name: data.items[0].name,
        sector: data.items[0].sector,
        price: data.items[0].price,
        change: data.items[0].change,
        percentChange: data.items[0].percentChange,
        marketCap: data.items[0].marketCap,
        domain: data.items[0].domain
      });
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

run();
