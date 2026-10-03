import Database from 'better-sqlite3';

const db = new Database('db/stock.db');
const portfolioId = 'fcfdd1e0-bf53-4910-89e7-8ca2474d4c27';

const newBlueprint = [
  // Core (89%)
  { symbol: 'NVDA', target_percent: 15, category: 'Core Monopolies', status: 'OWNED' },
  { symbol: 'TSM', target_percent: 14, category: 'Core Monopolies', status: 'WATCHLIST' },
  { symbol: 'VRT', target_percent: 13, category: 'Core Monopolies', status: 'WATCHLIST' },
  { symbol: 'AVGO', target_percent: 11, category: 'Core Monopolies', status: 'WATCHLIST' },
  { symbol: 'APH', target_percent: 11, category: 'Core Monopolies', status: 'WATCHLIST' },
  { symbol: 'KLAC', target_percent: 8, category: 'Core Monopolies', status: 'WATCHLIST' },
  { symbol: 'ANET', target_percent: 7, category: 'Core Monopolies', status: 'WATCHLIST' },
  { symbol: 'MELI', target_percent: 5, category: 'Core Monopolies', status: 'OWNED' },
  { symbol: 'CRWD', target_percent: 5, category: 'Core Monopolies', status: 'OWNED' },
  // Moonshot (11%)
  { symbol: 'STRL', target_percent: 3, category: 'Moonshots', status: 'WATCHLIST' },
  { symbol: 'ALAB', target_percent: 3, category: 'Moonshots', status: 'WATCHLIST' },
  { symbol: 'PLTR', target_percent: 3, category: 'Moonshots', status: 'WATCHLIST' },
  { symbol: 'CLS', target_percent: 2, category: 'Moonshots', status: 'WATCHLIST' },
];

const totalWeight = newBlueprint.reduce((s, b) => s + b.target_percent, 0);
console.log('Total weight:', totalWeight); // Must be 100

// Check holdings to see if owned
const holdings = db.prepare("SELECT symbol, SUM(CASE WHEN type='BUY' THEN amount ELSE -amount END) as net_shares FROM transactions WHERE portfolio_id = ? GROUP BY symbol").all(portfolioId);
const ownedSet = new Set(holdings.filter(h => h.net_shares > 0.0001).map(h => h.symbol));

const transaction = db.transaction(() => {
  // Delete existing blueprints for this portfolio
  db.prepare("DELETE FROM portfolio_blueprints WHERE portfolio_id = ?").run(portfolioId);

  const insert = db.prepare(`
    INSERT INTO portfolio_blueprints (id, portfolio_id, symbol, target_percent, target_price, status, category, updated_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, ?, NULL, ?, ?, datetime('now'))
  `);

  for (const item of newBlueprint) {
    const status = ownedSet.has(item.symbol) ? 'OWNED' : 'WATCHLIST';
    insert.run(portfolioId, item.symbol, item.target_percent, status, item.category);
  }
});

transaction();
console.log('Successfully updated portfolio_blueprints to Project 2X 100% Equity Blueprint!');

const verified = db.prepare("SELECT symbol, target_percent, status, category FROM portfolio_blueprints WHERE portfolio_id = ? ORDER BY target_percent DESC").all(portfolioId);
console.log('Verified Blueprints:', verified);
