import { db } from '../db/init.js';

console.log('--- Starting CASH Transaction Migration ---');

try {
    // Start transaction
    db.prepare('BEGIN TRANSACTION').run();

    // 1. Migrate CASH BUY -> DEPOSIT
    const updateDeposit = db.prepare(`
        UPDATE transactions 
        SET type = 'DEPOSIT', asset = 'Cash', symbol = 'CASH'
        WHERE symbol = 'CASH' AND type = 'BUY'
    `).run();
    console.log(`✅ Converted ${updateDeposit.changes} CASH BUY to DEPOSIT`);

    // 2. Migrate CASH SELL -> WITHDRAW
    const updateWithdraw = db.prepare(`
        UPDATE transactions 
        SET type = 'WITHDRAW', asset = 'Cash', symbol = 'CASH'
        WHERE symbol = 'CASH' AND type = 'SELL'
    `).run();
    console.log(`✅ Converted ${updateWithdraw.changes} CASH SELL to WITHDRAW`);

    // Commit transaction
    db.prepare('COMMIT').run();
    console.log('--- Migration Completed Successfully ---');

} catch (error) {
    db.prepare('ROLLBACK').run();
    console.error('❌ Migration failed:', error);
}
