import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.argv[2] || path.join(__dirname, '..', 'db', 'stock.db');
console.log(`Connecting to database: ${dbPath}`);

const db = new Database(dbPath);

const portfolioId = 'fcfdd1e0-bf53-4910-89e7-8ca2474d4c27'; // Doctorbank Growth

const runMigration = db.transaction(() => {
  // 1. Align original HIMS buy to exact Dime fractional shares (4.6307977)
  const updateHimsBuy = db.prepare(`
    UPDATE transactions 
    SET amount = 4.6307977 
    WHERE id = '4881d1f9-694d-447f-82c6-a43b3622b513'
  `);
  const updateResult = updateHimsBuy.run();
  console.log(`Updated original HIMS buy to 4.6307977 shares (changes: ${updateResult.changes})`);

  // 2. Prepare new SELL transactions
  const newTransactions = [
    {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      portfolio_id: portfolioId,
      date: '2026-09-17T00:31:42+07:00',
      symbol: 'HIMS',
      type: 'SELL',
      asset: 'Stock',
      amount: 4.6307977,
      price: 28.1033,
      fee: 0,
      stock_type: 'Small Cap',
      note: 'Sell HIMS 4.6307977 shares @ $28.1033',
      status: 'CONFIRMED'
    },
    {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      portfolio_id: portfolioId,
      date: '2026-09-17T00:32:54+07:00',
      symbol: 'META',
      type: 'SELL',
      asset: 'Stock',
      amount: 0.4488854,
      price: 676.2560,
      fee: 0,
      stock_type: 'Growth',
      note: 'Sell META 0.4488854 shares @ $676.2560',
      status: 'CONFIRMED'
    },
    {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      portfolio_id: portfolioId,
      date: '2026-09-17T00:37:21+07:00',
      symbol: 'RBRK',
      type: 'SELL',
      asset: 'Stock',
      amount: 4,
      price: 104.0625,
      fee: 0,
      stock_type: 'Growth',
      note: 'Sell RBRK 4 shares @ $104.0625',
      status: 'CONFIRMED'
    }
  ];

  const insertTx = db.prepare(`
    INSERT INTO transactions (id, portfolio_id, date, symbol, type, asset, amount, price, fee, stock_type, note, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of newTransactions) {
    insertTx.run(
      t.id,
      t.portfolio_id,
      t.date,
      t.symbol,
      t.type,
      t.asset,
      t.amount,
      t.price,
      t.fee,
      t.stock_type,
      t.note,
      t.status
    );
    console.log(`Inserted SELL transaction: ${t.symbol} x ${t.amount} @ ${t.price} (Proceeds: $${(t.amount * t.price).toFixed(2)})`);
  }

  // 3. Update Blueprints status for fully closed positions
  const updateBp = db.prepare(`
    UPDATE portfolio_blueprints 
    SET status = 'WATCHLIST', updated_at = datetime('now')
    WHERE portfolio_id = ? AND symbol IN ('META', 'HIMS')
  `);
  const bpResult = updateBp.run(portfolioId);
  console.log(`Updated blueprints status for META & HIMS to WATCHLIST (changes: ${bpResult.changes})`);
});

runMigration();

// Checkpoint WAL
db.pragma('wal_checkpoint(TRUNCATE)');
console.log('WAL Checkpointed successfully.');

// 4. Export Backups if running on local
const backupDir = path.join(__dirname, '..', 'backups');
if (fs.existsSync(backupDir)) {
  console.log(`\nExporting Source of Truth backups to: ${backupDir}`);

  // All transactions
  const allTxs = db.prepare(`
    SELECT id, portfolio_id, date, symbol, type, asset, stock_type, amount, price, fee, note, status, created_at
    FROM transactions 
    ORDER BY date ASC, created_at ASC
  `).all();
  fs.writeFileSync(path.join(backupDir, 'transactions_all.json'), JSON.stringify(allTxs, null, 2), 'utf-8');

  // Doctorbank Growth transactions
  const dbgTxs = allTxs.filter(t => t.portfolio_id === portfolioId);
  fs.writeFileSync(path.join(backupDir, 'transactions_doctorbank_growth.json'), JSON.stringify(dbgTxs, null, 2), 'utf-8');

  // Blueprints
  const allBps = db.prepare(`SELECT * FROM portfolio_blueprints ORDER BY portfolio_id, target_percent DESC`).all();
  fs.writeFileSync(path.join(backupDir, 'blueprints.json'), JSON.stringify(allBps, null, 2), 'utf-8');

  // CSV Generator helper
  const portRows = db.prepare(`SELECT id, name FROM portfolios`).all();
  const portMap = Object.fromEntries(portRows.map(p => [p.id, p.name]));

  const toCsv = (txList) => {
    const header = 'id,portfolio_id,portfolio_name,date,symbol,type,asset,stock_type,amount,price,fee,note,status,created_at\n';
    const rows = txList.map(t => {
      const pName = portMap[t.portfolio_id] || '';
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      return [
        esc(t.id),
        esc(t.portfolio_id),
        esc(pName),
        esc(t.date),
        esc(t.symbol),
        esc(t.type),
        esc(t.asset),
        esc(t.stock_type),
        esc(t.amount),
        esc(t.price),
        esc(t.fee ?? 0),
        esc(t.note ?? ''),
        esc(t.status ?? 'CONFIRMED'),
        esc(t.created_at ?? '')
      ].join(',');
    });
    return header + rows.join('\n');
  };

  fs.writeFileSync(path.join(backupDir, 'transactions_all.csv'), toCsv(allTxs), 'utf-8');
  fs.writeFileSync(path.join(backupDir, 'transactions_doctorbank_growth.csv'), toCsv(dbgTxs), 'utf-8');

  // Dump SQL
  const sqlLines = [
    `-- Backup generated at ${new Date().toISOString()}`,
    'BEGIN TRANSACTION;',
    ''
  ];
  for (const t of allTxs) {
    const escVal = (v) => v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
    sqlLines.push(
      `INSERT OR REPLACE INTO transactions (id, portfolio_id, date, symbol, type, asset, stock_type, amount, price, fee, note, status) VALUES (${escVal(t.id)}, ${escVal(t.portfolio_id)}, ${escVal(t.date)}, ${escVal(t.symbol)}, ${escVal(t.type)}, ${escVal(t.asset)}, ${escVal(t.stock_type)}, ${t.amount}, ${t.price}, ${t.fee || 0}, ${escVal(t.note)}, ${escVal(t.status)});`
    );
  }
  sqlLines.push('COMMIT;');
  fs.writeFileSync(path.join(backupDir, 'transactions_dump.sql'), sqlLines.join('\n'), 'utf-8');

  console.log(`✅ Exported ${allTxs.length} transactions across JSON, CSV, SQL`);
}

db.close();
console.log('Database update completed.');
