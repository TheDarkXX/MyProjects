import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'stock.db');
const db = new Database(dbPath);

export function initDb() {
  db.pragma('journal_mode = WAL');

  db.exec(`
    -- Core
    CREATE TABLE IF NOT EXISTS portfolios (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        icon TEXT DEFAULT '📁',
        color_hex TEXT DEFAULT '#64748B',
        initial_cash REAL DEFAULT 0,
        base_currency TEXT DEFAULT 'USD',
        status TEXT DEFAULT 'active',
        goal_amount REAL DEFAULT 0,
        goal_currency TEXT DEFAULT 'USD',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
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

    -- Price Cache
    CREATE TABLE IF NOT EXISTS latest_prices (
        symbol TEXT PRIMARY KEY,
        price REAL NOT NULL,
        change REAL DEFAULT 0,
        percent_change REAL DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS historical_prices (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        price REAL NOT NULL,
        PRIMARY KEY (symbol, date)
    );

    -- Metadata Cache
    CREATE TABLE IF NOT EXISTS stock_metadata (
        symbol TEXT PRIMARY KEY,
        name TEXT,
        sector TEXT,
        logo TEXT,
        dividend_yield REAL DEFAULT 0,
        annual_dividend REAL DEFAULT 0,
        dividend_frequency TEXT DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Blueprints
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

    -- Analytics
    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
        date TEXT NOT NULL,
        value REAL NOT NULL,
        PRIMARY KEY (portfolio_id, date)
    );

    -- Backup
    CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backup_name TEXT NOT NULL,
        backup_data TEXT NOT NULL,
        backup_type TEXT DEFAULT 'auto',
        created_at TEXT DEFAULT (datetime('now'))
    );

    -- Activity Log
    CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log('✅ SQLite DB Initialized at', dbPath);
}

export { db };
