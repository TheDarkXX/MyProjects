import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, 'db');
const targetDbPath = path.join(dbDir, 'stock.db');
const bakTigerPath = path.join(dbDir, 'stock.db.bak_tiger');
const backupDir = path.join(dbDir, 'corrupt_backup_20260904');

console.log('=== Step 1: Backup current db files ===');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

for (const file of ['stock.db', 'stock.db-wal', 'stock.db-shm']) {
  const src = path.join(dbDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(backupDir, file));
    console.log(`Backed up ${file} to ${backupDir}`);
  }
}

console.log('=== Step 2: Remove old stock.db, wal, shm ===');
for (const file of ['stock.db', 'stock.db-wal', 'stock.db-shm']) {
  const f = path.join(dbDir, file);
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log(`Removed ${file}`);
  }
}

console.log('=== Step 3: Copy stock.db.bak_tiger to stock.db ===');
if (!fs.existsSync(bakTigerPath)) {
  throw new Error(`Cannot find ${bakTigerPath}!`);
}
fs.copyFileSync(bakTigerPath, targetDbPath);
console.log(`Copied ${bakTigerPath} to ${targetDbPath}`);

console.log('=== Step 4: Open new database and check integrity ===');
const db = new Database(targetDbPath);
const check1 = db.pragma('integrity_check');
console.log('Integrity check after copy:', check1);
if (check1[0]?.integrity_check !== 'ok') {
  throw new Error(`Integrity check failed: ${JSON.stringify(check1)}`);
}

console.log('=== Step 5: Apply migrations and schema enhancements ===');
try {
  db.exec('ALTER TABLE stock_metadata ADD COLUMN dividend_yield REAL DEFAULT 0;');
  console.log('Added dividend_yield');
} catch (e) {
  console.log('dividend_yield note:', e.message);
}
try {
  db.exec('ALTER TABLE stock_metadata ADD COLUMN annual_dividend REAL DEFAULT 0;');
  console.log('Added annual_dividend');
} catch (e) {
  console.log('annual_dividend note:', e.message);
}
try {
  db.exec('ALTER TABLE stock_metadata ADD COLUMN dividend_frequency TEXT DEFAULT "";');
  console.log('Added dividend_frequency');
} catch (e) {
  console.log('dividend_frequency note:', e.message);
}

// Create portfolio_blueprints if not exists
db.exec(`CREATE TABLE IF NOT EXISTS portfolio_blueprints (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
    symbol TEXT NOT NULL,
    target_percent REAL NOT NULL DEFAULT 0,
    target_price REAL,
    status TEXT DEFAULT 'OWNED',
    category TEXT DEFAULT 'Core',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(portfolio_id, symbol)
);`);
console.log('Created / ensured portfolio_blueprints table');

// Restore blueprints
const blueprintsDumpPath = '/tmp/blueprints_dump.sql';
if (fs.existsSync(blueprintsDumpPath)) {
  console.log('Restoring blueprints from dump...');
  const bpSql = fs.readFileSync(blueprintsDumpPath, 'utf8');
  // Remove CREATE TABLE from dump if needed or run transaction
  const insertLines = bpSql.split('\n').filter(line => line.startsWith('INSERT INTO portfolio_blueprints'));
  for (const ins of insertLines) {
    try {
      db.exec(ins);
      console.log('Executed blueprint insert:', ins.substring(0, 60) + '...');
    } catch (e) {
      console.log('Blueprint insert error:', e.message);
    }
  }
}

// Restore latest prices from dump if available
const latestPricesDumpPath = '/tmp/latest_prices_dump.sql';
if (fs.existsSync(latestPricesDumpPath)) {
  console.log('Restoring latest prices from dump...');
  const lpSql = fs.readFileSync(latestPricesDumpPath, 'utf8');
  const insertLines = lpSql.split('\n').filter(line => line.startsWith('INSERT INTO latest_prices'));
  for (const ins of insertLines) {
    try {
      db.exec(ins.replace('INSERT INTO latest_prices', 'INSERT OR REPLACE INTO latest_prices'));
    } catch (e) {}
  }
  console.log('Restored latest_prices count:', db.prepare('SELECT count(*) as c FROM latest_prices').get().c);
}

console.log('=== Step 6: Standardize stock_type to 8 Strategy Categories on all 60 transactions ===');
// Strategy category mapping
const categoryMapping = {
  // Compounders
  COST: 'Compounders',
  ISRG: 'Compounders',
  AAPL: 'Compounders',
  MSFT: 'Compounders',
  GOOGL: 'Compounders',
  GOOG: 'Compounders',
  V: 'Compounders',
  MA: 'Compounders',

  // Growth
  NVDA: 'Growth',
  CRWD: 'Growth',
  MELI: 'Growth',
  RBRK: 'Growth',
  PLTR: 'Growth',
  META: 'Growth',

  // Mid-Tier
  AMZN: 'Mid-Tier',
  TSLA: 'Mid-Tier',
  AMD: 'Mid-Tier',

  // Defensive
  KO: 'Defensive',
  JNJ: 'Defensive',
  PG: 'Defensive',
  O: 'Defensive',
  TLT: 'Defensive',
  GLD: 'Defensive',

  // Small Cap
  HIMS: 'Small Cap',
  SQ: 'Small Cap',
  SOFI: 'Small Cap',

  // Bets
  ASTS: 'Bets',
  RKLB: 'Bets',
  CRWV: 'Bets',
  CRSP: 'Bets',
  'BTC-USD': 'Bets',
  BTC: 'Bets',

  // ETF
  SCHG: 'ETF',
  VOO: 'ETF',
  QQQ: 'ETF',
  SPY: 'ETF',
  SCHD: 'ETF',
  VTI: 'ETF',
  IVV: 'ETF',

  // Cash
  CASH: 'Cash'
};

const txs = db.prepare('SELECT id, symbol, type, asset FROM transactions').all();
const updateStmt = db.prepare('UPDATE transactions SET stock_type = ? WHERE id = ?');

const updateTx = db.transaction(() => {
  for (const t of txs) {
    let cat = 'Compounders';
    if (t.symbol === 'CASH' || t.type === 'DEPOSIT' || t.type === 'WITHDRAW' || t.type === 'INTEREST' || t.asset === 'Cash') {
      cat = 'Cash';
    } else if (categoryMapping[t.symbol.toUpperCase()]) {
      cat = categoryMapping[t.symbol.toUpperCase()];
    }
    updateStmt.run(cat, t.id);
  }
});
updateTx();

console.log('Stock types updated successfully!');

console.log('=== Step 7: Final Verification ===');
const check2 = db.pragma('integrity_check');
console.log('Final integrity check:', check2);

const totalTx = db.prepare('SELECT count(*) as c FROM transactions').get().c;
console.log('Total transactions in db:', totalTx);

const stockTypesCount = db.prepare('SELECT stock_type, count(*) as count FROM transactions GROUP BY stock_type').all();
console.log('Stock types breakdown:', stockTypesCount);

const bpCount = db.prepare('SELECT count(*) as c FROM portfolio_blueprints').get().c;
console.log('Portfolio blueprints count:', bpCount);

const histCount = db.prepare('SELECT count(*) as c FROM historical_prices').get().c;
console.log('Historical prices count:', histCount);

// Truncate checkpoint to ensure WAL is clean
db.pragma('wal_checkpoint(TRUNCATE)');
db.close();

console.log('=== Restoration Completed Successfully! ===');
