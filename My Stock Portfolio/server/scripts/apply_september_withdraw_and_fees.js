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
  // 1. Update RBRK SELL fee to $0.02 (SEC Fee)
  const updateRbrk = db.prepare(`
    UPDATE transactions 
    SET fee = 0.02, note = 'Sell RBRK 4 shares @ $104.0625 (SEC Fee $0.02)'
    WHERE portfolio_id = ? AND symbol = 'RBRK' AND date = '2026-09-17T00:37:21+07:00'
  `);
  const rbrkRes = updateRbrk.run(portfolioId);
  console.log(`Updated RBRK SELL fee to $0.02 (changes: ${rbrkRes.changes})`);

  // 2. Update META SELL fee to $0.01 (TAF Fee)
  const updateMeta = db.prepare(`
    UPDATE transactions 
    SET fee = 0.01, note = 'Sell META 0.4488854 shares @ $676.2560 (TAF Fee $0.01)'
    WHERE portfolio_id = ? AND symbol = 'META' AND date = '2026-09-17T00:32:54+07:00'
  `);
  const metaRes = updateMeta.run(portfolioId);
  console.log(`Updated META SELL fee to $0.01 (changes: ${metaRes.changes})`);

  // 3. Insert WITHDRAW of 850.08 USD (Currency Exchange to THB 28,248.16)
  const existingWithdraw = db.prepare(`
    SELECT id FROM transactions 
    WHERE portfolio_id = ? AND date = '2026-09-18T12:31:02+07:00' AND amount = 850.08
  `).get(portfolioId);

  if (!existingWithdraw) {
    const withdrawId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const insertWithdraw = db.prepare(`
      INSERT INTO transactions (id, portfolio_id, date, symbol, type, asset, amount, price, fee, stock_type, note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertWithdraw.run(
      withdrawId,
      portfolioId,
      '2026-09-18T12:31:02+07:00',
      'CASH',
      'WITHDRAW',
      'Cash',
      850.08,
      1,
      0,
      null,
      'Exchange USD to THB (฿28,248.16 @ 33.23 THB/USD)',
      'CONFIRMED'
    );
    console.log(`Inserted WITHDRAW transaction: $850.08 USD (ID: ${withdrawId})`);
  } else {
    console.log(`WITHDRAW transaction already exists (ID: ${existingWithdraw.id})`);
  }
});

runMigration();

// Checkpoint WAL
db.pragma('wal_checkpoint(TRUNCATE)');
console.log('WAL Checkpointed successfully.');

// Export Backups if running locally or backup folder exists
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
console.log('Database update completed successfully.');
