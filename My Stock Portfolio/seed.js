const Database = require('better-sqlite3');
const db = new Database('/root/stock-portfolio/server/db/stock.db');
db.exec(`
  INSERT OR IGNORE INTO portfolios (id, name, description, icon, color_hex, initial_cash, base_currency, status, created_at, updated_at) 
  VALUES ('port_main_01', 'Long-Term Growth', 'Mock Portfolio', '📈', '#823AFD', 100000, 'USD', 'active', datetime('now'), datetime('now'));
  
  INSERT OR IGNORE INTO transactions (id, portfolio_id, date, symbol, type, asset, amount, price, fee, status, created_at) 
  VALUES ('tx_01', 'port_main_01', datetime('now', '-30 days'), 'AAPL', 'BUY', 'Stock', 50, 150.00, 0, 'CONFIRMED', datetime('now'));
  
  INSERT OR IGNORE INTO transactions (id, portfolio_id, date, symbol, type, asset, amount, price, fee, status, created_at) 
  VALUES ('tx_02', 'port_main_01', datetime('now', '-15 days'), 'TSLA', 'BUY', 'Stock', 20, 180.00, 0, 'CONFIRMED', datetime('now'));
`);
console.log("Mock data inserted successfully!");
