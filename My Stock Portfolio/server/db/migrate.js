import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'stock.db');
const db = new Database(dbPath);

try {
  db.exec('ALTER TABLE stock_metadata ADD COLUMN dividend_yield REAL DEFAULT 0;');
  console.log('Added dividend_yield');
} catch (e) {
  console.log('dividend_yield exists or error:', e.message);
}

try {
  db.exec('ALTER TABLE stock_metadata ADD COLUMN annual_dividend REAL DEFAULT 0;');
  console.log('Added annual_dividend');
} catch (e) {
  console.log('annual_dividend exists or error:', e.message);
}

try {
  db.exec('ALTER TABLE stock_metadata ADD COLUMN dividend_frequency TEXT DEFAULT "";');
  console.log('Added dividend_frequency');
} catch (e) {
  console.log('dividend_frequency exists or error:', e.message);
}

try {
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
    console.log('Created portfolio_blueprints');
} catch (e) {
    console.log('portfolio_blueprints exists or error:', e.message);
}
