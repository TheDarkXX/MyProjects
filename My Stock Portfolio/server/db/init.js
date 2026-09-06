import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'stock.db');
const db = new Database(dbPath);

export function initDb() {
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');

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

    -- AI Advisor
    CREATE TABLE IF NOT EXISTS symbol_fundamentals (
        symbol TEXT PRIMARY KEY,
        sector TEXT,
        industry TEXT,
        current_price REAL,
        pe_trailing REAL,
        pe_forward REAL,
        pb_ratio REAL,
        roe REAL,
        revenue_growth REAL,
        profit_margin REAL,
        debt_to_equity REAL,
        beta REAL,
        div_yield REAL,
        annual_dividend REAL,
        fifty_two_week_high REAL,
        fifty_two_week_low REAL,
        sma50 REAL,
        sma200 REAL,
        market_cap REAL,
        short_percent REAL DEFAULT 0,
        target_mean_price REAL DEFAULT 0,
        target_high_price REAL DEFAULT 0,
        target_low_price REAL DEFAULT 0,
        recommendation_key TEXT DEFAULT '',
        recommendation_mean REAL DEFAULT 0,
        num_analyst_opinions INTEGER DEFAULT 0,
        eps_current_estimate REAL DEFAULT 0,
        eps_next_year_estimate REAL DEFAULT 0,
        eps_growth_next_year REAL DEFAULT 0,
        revenue_growth_estimate REAL DEFAULT 0,
        rec_strong_buy INTEGER DEFAULT 0,
        rec_buy INTEGER DEFAULT 0,
        rec_hold INTEGER DEFAULT 0,
        rec_sell INTEGER DEFAULT 0,
        earnings_q1_surprise REAL DEFAULT 0,
        earnings_q2_surprise REAL DEFAULT 0,
        earnings_q3_surprise REAL DEFAULT 0,
        earnings_q4_surprise REAL DEFAULT 0,
        earnings_beat_streak INTEGER DEFAULT 0,
        fetched_at TEXT DEFAULT (datetime('now')),
        UNIQUE(symbol)
    );

    CREATE TABLE IF NOT EXISTS ai_analysis_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
        mode TEXT NOT NULL CHECK(mode IN ('quick', 'deep', 'strategist')),
        blueprint_hash TEXT NOT NULL,
        overall_grade TEXT,
        result_json TEXT NOT NULL,
        model_used TEXT DEFAULT 'gpt-5.6-terra-high',
        tokens_used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_history_portfolio 
        ON ai_analysis_history(portfolio_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_history_hash 
        ON ai_analysis_history(portfolio_id, blueprint_hash);

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

    -- Custom Templates (Persistent across devices)
    CREATE TABLE IF NOT EXISTS custom_templates (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        portfolio_id TEXT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        entries_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_custom_templates_port 
        ON custom_templates(portfolio_id);

    -- Blueprint Snapshots (Undo / History across devices)
    CREATE TABLE IF NOT EXISTS blueprint_snapshots (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
        source TEXT DEFAULT 'manual',
        name TEXT DEFAULT '',
        entries_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_blueprint_snapshots_port 
        ON blueprint_snapshots(portfolio_id, created_at DESC);
  `);

  // Migration for symbol_fundamentals (Forward-Looking Data for existing DBs)
  const migrationColumns = [
    'target_mean_price REAL DEFAULT 0',
    'target_high_price REAL DEFAULT 0',
    'target_low_price REAL DEFAULT 0',
    'recommendation_key TEXT DEFAULT ""',
    'recommendation_mean REAL DEFAULT 0',
    'num_analyst_opinions INTEGER DEFAULT 0',
    'eps_current_estimate REAL DEFAULT 0',
    'eps_next_year_estimate REAL DEFAULT 0',
    'eps_growth_next_year REAL DEFAULT 0',
    'revenue_growth_estimate REAL DEFAULT 0',
    'rec_strong_buy INTEGER DEFAULT 0',
    'rec_buy INTEGER DEFAULT 0',
    'rec_hold INTEGER DEFAULT 0',
    'rec_sell INTEGER DEFAULT 0',
    'earnings_q1_surprise REAL DEFAULT 0',
    'earnings_q2_surprise REAL DEFAULT 0',
    'earnings_q3_surprise REAL DEFAULT 0',
    'earnings_q4_surprise REAL DEFAULT 0',
    'earnings_beat_streak INTEGER DEFAULT 0'
  ];

  try {
    const existingCols = new Set(
      db.pragma('table_info(symbol_fundamentals)').map(col => col.name)
    );
    for (const colDef of migrationColumns) {
      const colName = colDef.split(' ')[0];
      if (!existingCols.has(colName)) {
        db.exec(`ALTER TABLE symbol_fundamentals ADD COLUMN ${colDef};`);
      }
    }
  } catch (err) {
    console.error('[DB] Migration error on symbol_fundamentals:', err.message);
  }

  console.log('✅ SQLite DB Initialized at', dbPath);
}

export { db };
