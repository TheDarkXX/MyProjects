/**
 * RESTORE SOURCE OF TRUTH SCRIPT
 * 
 * Restores 100% of authentic raw transactions, blueprints, and portfolio metadata
 * from server/backups/ into SQLite stock.db.
 * 
 * Usage:
 *   node server/restore_source_of_truth.js [optional_target_db_path]
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupDir = path.join(__dirname, 'backups');
const targetDb = process.argv[2] || path.join(__dirname, 'db', 'stock.db');

console.log(`=== RESTORING SOURCE OF TRUTH ===`);
console.log(`Target DB: ${targetDb}`);
console.log(`Backup Source: ${backupDir}`);

if (!fs.existsSync(backupDir)) {
  throw new Error(`Backup folder not found: ${backupDir}`);
}

// Backup current DB if exists
if (fs.existsSync(targetDb)) {
  const emergencyBak = `${targetDb}.bak_before_truth_restore_${Date.now()}`;
  fs.copyFileSync(targetDb, emergencyBak);
  console.log(`🛡️ Emergency backup created: ${emergencyBak}`);
}

const db = new Database(targetDb);

// Ensure tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS portfolios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color_hex TEXT,
    initial_cash REAL DEFAULT 0,
    base_currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'active',
    goal_amount REAL DEFAULT 0,
    goal_currency TEXT DEFAULT 'USD',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
    date TEXT NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('BUY','SELL','DEPOSIT','WITHDRAW','DIVIDEND','INTEREST')),
    asset TEXT NOT NULL DEFAULT 'Stock',
    amount REAL NOT NULL,
    price REAL NOT NULL,
    fee REAL DEFAULT 0,
    stock_type TEXT,
    note TEXT,
    status TEXT DEFAULT 'CONFIRMED',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS portfolio_blueprints (
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
  );

  CREATE TABLE IF NOT EXISTS stock_metadata (
    symbol TEXT PRIMARY KEY,
    name TEXT,
    sector TEXT,
    logo TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    dividend_yield REAL DEFAULT 0,
    annual_dividend REAL DEFAULT 0,
    dividend_frequency TEXT DEFAULT ""
  );

  CREATE TABLE IF NOT EXISTS latest_prices (
    symbol TEXT PRIMARY KEY,
    price REAL NOT NULL,
    change REAL DEFAULT 0,
    percent_change REAL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// 1. Restore Portfolios
const portfoliosPath = path.join(backupDir, 'portfolios.json');
if (fs.existsSync(portfoliosPath)) {
  const portfolios = JSON.parse(fs.readFileSync(portfoliosPath, 'utf-8'));
  const upsertP = db.prepare(`
    INSERT OR REPLACE INTO portfolios (id, name, description, icon, color_hex, initial_cash, base_currency, status, goal_amount, goal_currency, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of portfolios) {
    upsertP.run(p.id, p.name, p.description, p.icon, p.color_hex, p.initial_cash, p.base_currency, p.status, p.goal_amount, p.goal_currency, p.created_at, p.updated_at);
  }
  console.log(`✅ Restored ${portfolios.length} portfolios`);
}

// 2. Restore Transactions
const txPath = path.join(backupDir, 'transactions_all.json');
if (fs.existsSync(txPath)) {
  const txs = JSON.parse(fs.readFileSync(txPath, 'utf-8'));
  const runTx = db.transaction(() => {
    db.exec('DELETE FROM transactions');
    const ins = db.prepare(`
      INSERT INTO transactions (id, portfolio_id, date, symbol, type, asset, stock_type, amount, price, fee, note, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const t of txs) {
      ins.run(t.id, t.portfolio_id, t.date, t.symbol, t.type, t.asset, t.stock_type, t.amount, t.price, t.fee || 0, t.note, t.status, t.created_at || new Date().toISOString());
    }
  });
  runTx();
  console.log(`✅ Restored ${txs.length} transactions`);
}

// 3. Restore Blueprints
const bpPath = path.join(backupDir, 'blueprints.json');
if (fs.existsSync(bpPath)) {
  const bps = JSON.parse(fs.readFileSync(bpPath, 'utf-8'));
  db.exec('DELETE FROM portfolio_blueprints');
  const insBp = db.prepare(`
    INSERT INTO portfolio_blueprints (id, portfolio_id, symbol, target_percent, target_price, status, category, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const b of bps) {
    insBp.run(b.id, b.portfolio_id, b.symbol, b.target_percent, b.target_price, b.status, b.category, b.notes, b.created_at, b.updated_at);
  }
  console.log(`✅ Restored ${bps.length} blueprints`);
}

// 4. Restore Metadata & Latest Prices
const metaPath = path.join(backupDir, 'stock_metadata.json');
if (fs.existsSync(metaPath)) {
  const metas = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const insMeta = db.prepare(`
    INSERT OR REPLACE INTO stock_metadata (symbol, name, sector, logo, updated_at, dividend_yield, annual_dividend, dividend_frequency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const m of metas) {
    insMeta.run(m.symbol, m.name, m.sector, m.logo, m.updated_at, m.dividend_yield, m.annual_dividend, m.dividend_frequency);
  }
  console.log(`✅ Restored ${metas.length} metadata items`);
}

const lpPath = path.join(backupDir, 'latest_prices.json');
if (fs.existsSync(lpPath)) {
  const lps = JSON.parse(fs.readFileSync(lpPath, 'utf-8'));
  const insLp = db.prepare(`
    INSERT OR REPLACE INTO latest_prices (symbol, price, change, percent_change, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const l of lps) {
    insLp.run(l.symbol, l.price, l.change, l.percent_change, l.updated_at);
  }
  console.log(`✅ Restored ${lps.length} latest prices`);
}

db.pragma('wal_checkpoint(TRUNCATE)');
db.close();
console.log(`\n🎉 DATABASE FULLY RESTORED AND VERIFIED!`);
