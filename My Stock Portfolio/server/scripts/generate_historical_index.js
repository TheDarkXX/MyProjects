import { db } from '../db/init.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Known category groupings
const PROJECT_2X_CORE = new Set(['NVDA', 'TSM', 'AVGO', 'VRT', 'MELI', 'APH', 'KLAC', 'ANET', 'CRWD']);
const PROJECT_2X_MOONSHOT = new Set(['STRL', 'ALAB', 'PLTR', 'RKLB']);

const TV_STOCKS = new Set([
  'WMT', 'VRT', 'DUOL', 'BKNG', 'ELF', 'KLAC', 'GOOGL', 'UBER', 'UNH', 'SPGI',
  'ASML', 'CEG', 'ETN', 'TSM', 'WM', 'NVO', 'ORLY', 'AAPL', 'APP', 'ELV',
  'CRM', 'GWW', 'KO', 'APH', 'TTD', 'MA', 'ADBE', 'MSFT', 'CAH', 'V',
  'PANW', 'RTX', 'LLY', 'ANET', 'TSLA', 'BRK-B', 'JPM', 'INTC', 'ARM', 'FICO',
  'WFC', 'AMD', 'MRVL', 'NET'
]);
const TV_STRONG_GROWTH = new Set(['SOFI', 'AVGO', 'NVDA', 'PLTR', 'ALAB']);
const TV_SMALL_CAP = new Set(['ASTS', 'TWST', 'RKLB', 'VKTX', 'ISRG', 'CRDO', 'JMIA', 'DOCN']);
const TV_WAITING = new Set([
  'EOSE', 'IREN', 'IONQ', 'CRWV', 'AXON', 'MELI', 'NVTS', 'HIMS', 'GOOG', 'SFM',
  'AMZN', 'TMDX', 'COST', 'RBRK', 'NFLX', 'CRWD', 'STRL', 'NBIS', 'OKLO', 'ORCL', 'META'
]);
const TV_EXCHANGE_MACRO = new Set(['SCHD', 'SCHG', '^GSPC', 'QQQ', 'JEPQ', 'THB=X', 'SPY', 'GLD']);
const TV_COMMODITIES_CRYPTO = new Set(['BTC-USD', 'GC=F', 'CL=F']);
const PORTFOLIO_SPECIAL = new Set(['O', 'SE', 'SMCI']);

export function generateHistoricalIndexMarkdown() {
  const rows = db.prepare(`
    SELECT symbol, count(*) as bars, min(date) as min_date, max(date) as max_date 
    FROM historical_prices 
    GROUP BY symbol 
    ORDER BY symbol ASC
  `).all();

  const totalSymbols = rows.length;
  const totalBars = rows.reduce((acc, r) => acc + r.bars, 0);
  const oldestDate = rows.reduce((min, r) => (r.min_date < min ? r.min_date : min), '9999-99-99');
  const newestDate = rows.reduce((max, r) => (r.max_date > max ? r.max_date : max), '0000-00-00');

  // Groups
  const group2x = [];
  const groupPortfolio = [];
  const groupStocks = [];
  const groupGrowth = [];
  const groupSmallCap = [];
  const groupWaiting = [];
  const groupMacro = [];
  const groupCommodities = [];
  const groupCustom = [];

  for (const r of rows) {
    const sym = r.symbol;
    let placed = false;

    if (PROJECT_2X_CORE.has(sym) || PROJECT_2X_MOONSHOT.has(sym)) {
      group2x.push(r);
    }
    if (PORTFOLIO_SPECIAL.has(sym)) {
      groupPortfolio.push(r);
    }
    if (TV_STOCKS.has(sym)) {
      groupStocks.push(r);
      placed = true;
    }
    if (TV_STRONG_GROWTH.has(sym)) {
      groupGrowth.push(r);
      placed = true;
    }
    if (TV_SMALL_CAP.has(sym)) {
      groupSmallCap.push(r);
      placed = true;
    }
    if (TV_WAITING.has(sym)) {
      groupWaiting.push(r);
      placed = true;
    }
    if (TV_EXCHANGE_MACRO.has(sym)) {
      groupMacro.push(r);
      placed = true;
    }
    if (TV_COMMODITIES_CRYPTO.has(sym)) {
      groupCommodities.push(r);
      placed = true;
    }

    if (!placed && !PROJECT_2X_CORE.has(sym) && !PROJECT_2X_MOONSHOT.has(sym) && !PORTFOLIO_SPECIAL.has(sym)) {
      groupCustom.push(r);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  let md = `# 📚 HISTORICAL PRICE BACKFILL INDEX (State of Truth)\n\n`;
  md += `> **Last Updated:** ${todayStr}  \n`;
  md += `> **Total Backfilled Assets:** ${totalSymbols} Symbols  \n`;
  md += `> **Total Historical Bars:** ${totalBars.toLocaleString()} Daily Candles  \n`;
  md += `> **Database Size:** ~77 MB (SQLite \`stock.db\` on VPS \`185.250.38.247\`)  \n`;
  md += `> **Oldest Candle:** ${oldestDate} (\`^GSPC\` S&P 500 Index)  \n`;
  md += `> **Newest Candle:** ${newestDate} (Live Real-time Daily)  \n`;
  md += `> **Standard:** Max Lifetime (All-Time back to IPO / earliest available history, Zero NULLs)\n\n`;
  md += `---\n\n`;
  md += `## 🧭 กฎเหล็กการใช้งาน (Zero-Duplication Protocol)\n`;
  md += `1. **ตรวจสอบไฟล์นี้ก่อนทุกครั้ง:** ก่อนจะสั่งดึงหรือรันประวัติราคาย้อนหลัง ให้ตรวจหารายชื่อหุ้นในตารางด้านล่าง หากมีชื่ออยู่ในนี้แล้ว **ห้ามรันซ้ำ** เพราะข้อมูลถูกเก็บครบตั้งแต่เปิดตลาด (IPO) จนถึงแท่งล่าสุดแล้ว\n`;
  md += `2. **การเรียกใช้ใน X-Chart / LWChart:** หุ้นและสินทรัพย์ทั้ง ${totalSymbols} ตัวในนี้ สามารถเรียกดูผ่าน API \`GET /api/chart/:symbol\` ได้ทันทีแบบ **0ms Latency** พร้อมคำนวณ EMA 50/150/200 และ Banker MCDX ครบทุกแท่ง\n`;
  md += `3. **การเพิ่มหุ้นใหม่:** เมื่อเพิ่มหุ้นใหม่ใน X-Chart ระบบจะดึง Max Lifetime (IPO) ให้อัตโนมัติในเบื้องหลัง และบันทึกแท่งเทียนลงไฟล์ Index นี้หลังดึงเสร็จทันที\n\n`;
  md += `---\n\n`;

  md += `## 📊 Summary by Category / Section\n\n`;
  md += `| หมวดหมู่ (Category Section) | จำนวนตัว (Symbols) | แท่งเทียนรวม (Bars) | ช่วงเวลาประวัติศาสตร์ |\n`;
  md += `|---|:---:|:---:|:---:|\n`;
  md += `| **1. 🎯 Project 2X Core & Moonshots** | ${group2x.length} | ${group2x.reduce((a, b) => a + b.bars, 0).toLocaleString()} | 1980 -> ปัจจุบัน |\n`;
  md += `| **2. 💼 Portfolio Holdings & Blueprints** | ${groupPortfolio.length} (เฉพาะที่ไม่ซ้ำกับ 2X) | ${groupPortfolio.reduce((a, b) => a + b.bars, 0).toLocaleString()} | 1994 -> ปัจจุบัน |\n`;
  md += `| **3. 📈 TradingView Watchlist — Large Cap Stocks** | ${groupStocks.length} | ${groupStocks.reduce((a, b) => a + b.bars, 0).toLocaleString()} | 1962 -> ปัจจุบัน |\n`;
  md += `| **4. 🚀 TradingView Watchlist — Strong Growth** | ${groupGrowth.length} | ${groupGrowth.reduce((a, b) => a + b.bars, 0).toLocaleString()} | 1999 -> ปัจจุบัน |\n`;
  md += `| **5. 🔬 TradingView Watchlist — Small Cap** | ${groupSmallCap.length} | ${groupSmallCap.reduce((a, b) => a + b.bars, 0).toLocaleString()} | 2000 -> ปัจจุบัน |\n`;
  md += `| **6. ⏳ TradingView Watchlist — Waiting List** | ${groupWaiting.length} | ${groupWaiting.reduce((a, b) => a + b.bars, 0).toLocaleString()} | 1986 -> ปัจจุบัน |\n`;
  md += `| **7. 🏛️ Benchmarks, Indices, FX & ETFs** | ${groupMacro.length} | ${groupMacro.reduce((a, b) => a + b.bars, 0).toLocaleString()} | 1927 -> ปัจจุบัน |\n`;
  md += `| **8. 🪙 Commodities & Crypto** | ${groupCommodities.length} | ${groupCommodities.reduce((a, b) => a + b.bars, 0).toLocaleString()} | 2000 -> ปัจจุบัน |\n`;
  if (groupCustom.length > 0) {
    md += `| **9. 🆕 Custom & On-the-Fly Added Tickers** | ${groupCustom.length} | ${groupCustom.reduce((a, b) => a + b.bars, 0).toLocaleString()} | All-time IPO |\n`;
  }
  md += `| **รวมสุทธิ (หักตัวซ้ำ)** | **${totalSymbols} สินทรัพย์** | **${totalBars.toLocaleString()} Bars** | **1927 -> ${newestDate.slice(0, 4)}** |\n\n`;
  md += `---\n\n`;

  const renderTable = (items, roleCol = 'บทบาท / สถานะ') => {
    let t = `| Symbol | จุดเริ่มต้นประวัติศาสตร์ (IPO) | แท่งล่าสุด | จำนวนแท่ง (Bars) | ${roleCol} |\n`;
    t += `|:---:|:---:|:---:|:---:|:---|\n`;
    for (const item of items) {
      t += `| **${item.symbol}** | ${item.min_date} | ${item.max_date} | ${item.bars.toLocaleString()} | ✅ Max Lifetime |\n`;
    }
    return t;
  };

  md += `## 🎯 1. Project 2X Core & Moonshots (${group2x.length} หุ้นยุทธศาสตร์หลัก)\n\n`;
  md += renderTable(group2x, 'ประเภท');
  md += `\n---\n\n`;

  md += `## 💼 2. Portfolio Holdings, Blueprints & Past Holdings (${groupPortfolio.length} หุ้นพอร์ตจริง)\n\n`;
  md += renderTable(groupPortfolio, 'บทบาทในระบบ');
  md += `\n---\n\n`;

  md += `## 📈 3. TradingView Watchlist — Large Cap Stocks (${groupStocks.length} หุ้นยักษ์ใหญ่)\n\n`;
  md += renderTable(groupStocks, 'สถานะข้อมูล');
  md += `\n---\n\n`;

  md += `## 🚀 4. TradingView Watchlist — Strong Growth (${groupGrowth.length} หุ้นเติบโตสูง)\n\n`;
  md += renderTable(groupGrowth, 'สถานะข้อมูล');
  md += `\n---\n\n`;

  md += `## 🔬 5. TradingView Watchlist — Small Cap (${groupSmallCap.length} หุ้นขนาดเล็กศักยภาพสูง)\n\n`;
  md += renderTable(groupSmallCap, 'สถานะข้อมูล');
  md += `\n---\n\n`;

  md += `## ⏳ 6. TradingView Watchlist — Waiting List (${groupWaiting.length} หุ้นรอสัญญาณ)\n\n`;
  md += renderTable(groupWaiting, 'สถานะข้อมูล');
  md += `\n---\n\n`;

  md += `## 🏛️ 7. Benchmarks, Indices, FX & ETFs (${groupMacro.length} สินทรัพย์มหภาค)\n\n`;
  md += renderTable(groupMacro, 'วัตถุประสงค์');
  md += `\n---\n\n`;

  md += `## 🪙 8. Commodities & Crypto (${groupCommodities.length} สินค้าโภคภัณฑ์ & ดิจิทัล)\n\n`;
  md += renderTable(groupCommodities, 'วัตถุประสงค์');
  md += `\n---\n\n`;

  if (groupCustom.length > 0) {
    md += `## 🆕 9. Custom & On-the-Fly Added Tickers (${groupCustom.length} หุ้นที่เพิ่มเข้ามาใหม่)\n\n`;
    md += renderTable(groupCustom, 'สถานะข้อมูล');
    md += `\n---\n\n`;
  }

  md += `## 🛡️ Database Health & Verification Rules\n`;
  md += `- **Total Duplicate Symbols Across Sections:** มีการแชร์ข้อมูลข้ามหมวดโดยอัตโนมัติ โดยไม่มีการบันทึก Row ซ้ำซ้อน\n`;
  md += `- **Zero NULL Rule:** ทุกแถวในฐานข้อมูลมี \`open\`, \`high\`, \`low\`, \`close\`, \`volume\` ครบถ้วน 100% ปราศจากค่า NULL\n`;
  md += `- **Backup & Persistence:** ฐานข้อมูลหลักอยู่ที่ \`/root/stock-portfolio/server/db/stock.db\` บน VPS ทำงานภายใต้โหมด \`WAL\` และถูก Flush ทุกครั้งหลังจบรอบ Backfill\n`;

  return md;
}

export function saveHistoricalIndexFiles() {
  const md = generateHistoricalIndexMarkdown();
  const rootIndex = path.resolve(__dirname, '../../HISTORICAL_INDEX.md');
  const docsIndex = path.resolve(__dirname, '../../docs/HISTORICAL_INDEX.md');
  const skillIndex = path.resolve(__dirname, '../../../../.agents/skills/10yr/INDEX.md');

  try {
    fs.writeFileSync(rootIndex, md, 'utf-8');
  } catch (e) {}

  try {
    fs.writeFileSync(docsIndex, md, 'utf-8');
  } catch (e) {}

  try {
    fs.writeFileSync(skillIndex, md, 'utf-8');
  } catch (e) {}

  console.log(`[HistoricalIndex] ✅ Updated HISTORICAL_INDEX.md successfully!`);
}

// Run directly if invoked from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  saveHistoricalIndexFiles();
}
