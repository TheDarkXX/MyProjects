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

    CREATE TABLE IF NOT EXISTS intraday_prices (
        symbol TEXT NOT NULL,
        resolution TEXT NOT NULL,
        time TEXT NOT NULL,
        price REAL NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL DEFAULT 0,
        PRIMARY KEY (symbol, resolution, time)
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
        free_cash_flow REAL DEFAULT 0,
        operating_cash_flow REAL DEFAULT 0,
        operating_margin REAL DEFAULT 0,
        shares_outstanding REAL DEFAULT 0,
        shares_dilution_pct REAL DEFAULT 0,
        sbc_revenue_pct REAL DEFAULT 0,
        earnings_date TEXT DEFAULT '',
        fetched_at TEXT DEFAULT (datetime('now')),
        UNIQUE(symbol)
    );

    CREATE TABLE IF NOT EXISTS consensus_history (
        symbol TEXT NOT NULL,
        snapshot_date TEXT NOT NULL,
        target_mean REAL,
        target_high REAL,
        target_low REAL,
        current_price REAL,
        analyst_count INTEGER,
        rec_key TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (symbol, snapshot_date)
    );
    CREATE INDEX IF NOT EXISTS idx_consensus_symbol_date 
        ON consensus_history(symbol, snapshot_date DESC);

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

    -- Project 2X Autonomous Engine
    CREATE TABLE IF NOT EXISTS project2x_config (
        portfolio_id TEXT PRIMARY KEY REFERENCES portfolios(id),
        goal_amount_thb REAL DEFAULT 10000000,
        target_cagr REAL DEFAULT 0.26,
        target_years REAL DEFAULT 5,
        max_stock_ceiling_pct REAL DEFAULT 30,
        monthly_inflow_thb REAL DEFAULT 35000,
        fcd_yield_pct REAL DEFAULT 4.5,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project2x_share_quotas (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
        symbol TEXT NOT NULL,
        category TEXT DEFAULT 'Core',
        target_percent REAL NOT NULL DEFAULT 0,
        base_price REAL NOT NULL DEFAULT 0,
        split_factor REAL DEFAULT 1.0,
        target_shares REAL NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'COLLECTING',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(portfolio_id, symbol)
    );
    CREATE INDEX IF NOT EXISTS idx_p2x_quotas_port ON project2x_share_quotas(portfolio_id);

    CREATE TABLE IF NOT EXISTS project2x_signals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        price REAL NOT NULL,
        ema50 REAL,
        ema150 REAL,
        ema200 REAL,
        banker_flow REAL,
        scenario INTEGER,
        traffic_light TEXT,
        sell_signal TEXT,
        action_suggested TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_p2x_signals_port_sym ON project2x_signals(portfolio_id, symbol, date DESC);

    CREATE TABLE IF NOT EXISTS project2x_fundamentals (
        symbol TEXT PRIMARY KEY,
        pe_trailing REAL,
        pe_forward REAL,
        peg_ratio REAL,
        revenue_cagr_3y REAL,
        eps_cagr_3y REAL,
        expected_cagr_3y REAL DEFAULT 26.0,
        consecutive_eps_qs INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Project 2X Dossier Data Storage
    CREATE TABLE IF NOT EXISTS quarterly_financials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        fiscal_quarter TEXT NOT NULL,
        report_date TEXT,
        revenue_usd REAL,
        yoy_revenue_growth_pct REAL,
        eps_actual REAL,
        eps_estimate REAL,
        eps_surprise_pct REAL,
        gross_margin_pct REAL,
        source TEXT DEFAULT 'yahoo',
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(symbol, fiscal_quarter)
    );
    CREATE INDEX IF NOT EXISTS idx_qf_sym_q ON quarterly_financials(symbol, fiscal_quarter DESC);

    CREATE TABLE IF NOT EXISTS fundamentals_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        snapshot_date TEXT NOT NULL,
        price_at_snapshot REAL NOT NULL,
        pe_trailing REAL,
        pe_forward REAL,
        peg_ratio REAL,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(symbol, snapshot_date)
    );
    CREATE INDEX IF NOT EXISTS idx_fh_sym_d ON fundamentals_history(symbol, snapshot_date DESC);

    CREATE TABLE IF NOT EXISTS project2x_specific_drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        metric_key TEXT NOT NULL,
        metric_label TEXT NOT NULL,
        metric_value REAL NOT NULL,
        metric_unit TEXT NOT NULL,
        safe_threshold REAL,
        danger_threshold REAL,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(symbol, metric_key)
    );
    CREATE INDEX IF NOT EXISTS idx_spec_drivers_sym ON project2x_specific_drivers(symbol);

    CREATE INDEX IF NOT EXISTS idx_historical_prices_sym_date ON historical_prices(symbol, date DESC);

    -- Chart Drawings Cloud Sync (Horizontal lines, Trendlines, etc.)
    CREATE TABLE IF NOT EXISTS chart_drawings (
        symbol TEXT PRIMARY KEY,
        horizontal_lines TEXT DEFAULT '[]',
        trend_lines TEXT DEFAULT '[]',
        updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Universal User Settings Cloud Sync (Indicators, Watchlist, Tabs, Drawing Defaults, UI Prefs)
    CREATE TABLE IF NOT EXISTS user_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
    );

    -- News Intelligence & Radar Feed
    CREATE TABLE IF NOT EXISTS seen_articles (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        source TEXT DEFAULT 'beehiiv',
        published_at TEXT,
        published_day_of_week TEXT,
        published_hour INTEGER,
        detected_at TEXT NOT NULL DEFAULT (datetime('now')),
        tickers TEXT,
        is_premium INTEGER DEFAULT 0,
        triage_score INTEGER DEFAULT 0,
        triage_action TEXT DEFAULT 'PENDING',
        triage_tags TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS news_intelligence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        company_name TEXT,
        headline TEXT NOT NULL,
        headline_th TEXT,
        source_name TEXT,
        source_url TEXT,
        summary_th TEXT NOT NULL,
        sentiment TEXT DEFAULT 'neutral',
        reading_priority TEXT NOT NULL DEFAULT 'GOOD_TO_KNOW',
        priority_reason TEXT,
        impact_level TEXT DEFAULT 'routine',
        portfolio_tag TEXT NOT NULL DEFAULT 'global',
        related_portfolio_id TEXT,
        relevance_score INTEGER DEFAULT 0,
        triage_tags TEXT DEFAULT '[]',
        score_breakdown TEXT DEFAULT NULL,
        full_content TEXT DEFAULT NULL,
        content_source TEXT DEFAULT 'beehiiv_direct',
        content_source_url TEXT DEFAULT NULL,
        content_fetched_at TEXT DEFAULT NULL,
        content_relevance_score INTEGER DEFAULT NULL,
        source_count INTEGER DEFAULT 1,
        event_fingerprint TEXT DEFAULT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS watchlist_tickers (
        symbol TEXT PRIMARY KEY,
        note TEXT DEFAULT '',
        added_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_news_ticker ON news_intelligence(ticker);
    CREATE INDEX IF NOT EXISTS idx_news_portfolio ON news_intelligence(portfolio_tag);
    CREATE INDEX IF NOT EXISTS idx_news_priority ON news_intelligence(reading_priority);
    CREATE INDEX IF NOT EXISTS idx_news_is_read ON news_intelligence(is_read);
    CREATE INDEX IF NOT EXISTS idx_news_created ON news_intelligence(created_at);
  `);

  // Migration for seen_articles & news_intelligence triage columns
  try {
    const existingSeenCols = new Set(db.pragma('table_info(seen_articles)').map(col => col.name));
    if (!existingSeenCols.has('triage_score')) db.exec("ALTER TABLE seen_articles ADD COLUMN triage_score INTEGER DEFAULT 0;");
    if (!existingSeenCols.has('triage_action')) db.exec("ALTER TABLE seen_articles ADD COLUMN triage_action TEXT DEFAULT 'PENDING';");
    if (!existingSeenCols.has('triage_tags')) db.exec("ALTER TABLE seen_articles ADD COLUMN triage_tags TEXT DEFAULT '[]';");

    const existingNewsCols = new Set(db.pragma('table_info(news_intelligence)').map(col => col.name));
    if (!existingNewsCols.has('relevance_score')) db.exec("ALTER TABLE news_intelligence ADD COLUMN relevance_score INTEGER DEFAULT 0;");
    if (!existingNewsCols.has('triage_tags')) db.exec("ALTER TABLE news_intelligence ADD COLUMN triage_tags TEXT DEFAULT '[]';");
    if (!existingNewsCols.has('headline_th')) db.exec("ALTER TABLE news_intelligence ADD COLUMN headline_th TEXT DEFAULT NULL;");
    if (!existingNewsCols.has('score_breakdown')) db.exec("ALTER TABLE news_intelligence ADD COLUMN score_breakdown TEXT DEFAULT NULL;");
    if (!existingNewsCols.has('full_content')) db.exec("ALTER TABLE news_intelligence ADD COLUMN full_content TEXT DEFAULT NULL;");
    if (!existingNewsCols.has('content_source')) db.exec("ALTER TABLE news_intelligence ADD COLUMN content_source TEXT DEFAULT 'beehiiv_direct';");
    if (!existingNewsCols.has('content_source_url')) db.exec("ALTER TABLE news_intelligence ADD COLUMN content_source_url TEXT DEFAULT NULL;");
    if (!existingNewsCols.has('content_fetched_at')) db.exec("ALTER TABLE news_intelligence ADD COLUMN content_fetched_at TEXT DEFAULT NULL;");
    if (!existingNewsCols.has('content_relevance_score')) db.exec("ALTER TABLE news_intelligence ADD COLUMN content_relevance_score INTEGER DEFAULT NULL;");
    if (!existingNewsCols.has('source_count')) db.exec("ALTER TABLE news_intelligence ADD COLUMN source_count INTEGER DEFAULT 1;");
    if (!existingNewsCols.has('event_fingerprint')) db.exec("ALTER TABLE news_intelligence ADD COLUMN event_fingerprint TEXT DEFAULT NULL;");

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_news_score ON news_intelligence(relevance_score);
      CREATE INDEX IF NOT EXISTS idx_seen_triage_action ON seen_articles(triage_action);
      CREATE INDEX IF NOT EXISTS idx_news_fingerprint ON news_intelligence(event_fingerprint);
      CREATE INDEX IF NOT EXISTS idx_news_source ON news_intelligence(content_source);
    `);
  } catch (err) {
    console.error('[DB] Migration error on news tables:', err.message);
  }

  // Migration for historical_prices OHLCV columns
  const histCols = [
    'open REAL',
    'high REAL',
    'low REAL',
    'close REAL',
    'volume REAL'
  ];
  try {
    const existingHistCols = new Set(
      db.pragma('table_info(historical_prices)').map(col => col.name)
    );
    for (const colDef of histCols) {
      const colName = colDef.split(' ')[0];
      if (!existingHistCols.has(colName)) {
        db.exec(`ALTER TABLE historical_prices ADD COLUMN ${colDef};`);
      }
    }
  } catch (err) {
    console.error('[DB] Migration error on historical_prices:', err.message);
  }

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
    'earnings_beat_streak INTEGER DEFAULT 0',
    'free_cash_flow REAL DEFAULT 0',
    'operating_cash_flow REAL DEFAULT 0',
    'operating_margin REAL DEFAULT 0',
    'shares_outstanding REAL DEFAULT 0',
    'shares_dilution_pct REAL DEFAULT 0',
    'sbc_revenue_pct REAL DEFAULT 0',
    'earnings_date TEXT DEFAULT ""'
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
