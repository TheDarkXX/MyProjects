import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { db, initDb } from '../db/init.js';

// Setup Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('🚀 Starting Supabase -> SQLite Migration...');
  initDb();
  
  // 1. Portfolios
  console.log('Migrating portfolios...');
  const { data: portfolios, error: pErr } = await supabase.from('portfolios').select('*');
  if (pErr) throw pErr;
  
  const insertPortfolio = db.prepare(`
    INSERT OR REPLACE INTO portfolios (id, name, description, icon, color_hex, initial_cash, base_currency, status, goal_amount, goal_currency, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const p of portfolios) {
    insertPortfolio.run(
      p.id, p.name, p.description || '', p.icon || '📁', p.color_hex || '#64748B', 
      p.initial_cash || 0, p.base_currency || 'USD', p.status || 'active', 
      p.goal_amount || 0, p.goal_currency || 'USD', 
      p.created_at || new Date().toISOString(), p.updated_at || new Date().toISOString()
    );
  }
  console.log(`✅ Migrated ${portfolios.length} portfolios.`);

  // 2. Transactions
  console.log('Migrating transactions...');
  const { data: transactions, error: tErr } = await supabase.from('transactions').select('*');
  if (tErr) throw tErr;
  
  const insertTx = db.prepare(`
    INSERT OR REPLACE INTO transactions (id, portfolio_id, date, symbol, type, asset, amount, price, fee, stock_type, note, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const t of transactions) {
    insertTx.run(
      t.id, t.portfolio_id, t.date, t.symbol, t.type, t.asset || 'Stock', 
      t.amount, t.price, t.fee || 0, t.stock_type || null, t.note || '', t.status || 'CONFIRMED',
      t.created_at || new Date().toISOString()
    );
  }
  console.log(`✅ Migrated ${transactions.length} transactions.`);

  // 3. Stock Metadata
  console.log('Migrating stock metadata...');
  const { data: metadata, error: mErr } = await supabase.from('stock_metadata').select('*');
  if (mErr) {
    console.warn('⚠️ Could not migrate stock_metadata (maybe table missing):', mErr.message);
  } else if (metadata) {
    const insertMeta = db.prepare(`
      INSERT OR REPLACE INTO stock_metadata (symbol, name, sector, logo, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const m of metadata) {
      insertMeta.run(m.symbol, m.name, m.sector, m.logo, m.updated_at || new Date().toISOString());
    }
    console.log(`✅ Migrated ${metadata.length} stock metadata entries.`);
  }

  // 4. Latest Prices
  console.log('Migrating latest prices...');
  const { data: prices, error: prErr } = await supabase.from('latest_prices').select('*');
  if (prErr) {
    console.warn('⚠️ Could not migrate latest_prices:', prErr.message);
  } else if (prices) {
    const insertPrice = db.prepare(`
      INSERT OR REPLACE INTO latest_prices (symbol, price, change, percent_change, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const p of prices) {
      insertPrice.run(p.symbol, p.price, p.change || 0, p.percent_change || 0, p.updated_at || new Date().toISOString());
    }
    console.log(`✅ Migrated ${prices.length} latest prices.`);
  }

  console.log('🎉 Migration Complete!');
}

migrate().catch(e => {
  console.error('Migration failed:', e);
});
