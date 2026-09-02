import { db } from '../db/init.js';
import yahooFinance from 'yahoo-finance2';

/**
 * Synchronizes dividend history from Yahoo Finance for a given portfolio.
 * It will auto-create DIVIDEND transactions for holdings.
 */
export async function syncDividendsForPortfolio(portfolioId) {
    console.log(`Starting dividend sync for portfolio: ${portfolioId}`);
    const results = {
        processed: 0,
        added: 0,
        errors: []
    };

    try {
        // 1. Get all unique symbols in the portfolio that are not Cash
        const txs = db.prepare(`
            SELECT DISTINCT symbol 
            FROM transactions 
            WHERE portfolio_id = ? AND asset != 'Cash' AND symbol != 'CASH'
        `).all(portfolioId);

        const symbols = txs.map(t => t.symbol);
        if (symbols.length === 0) {
            console.log('No stock symbols found in portfolio.');
            return results;
        }

        // 2. Determine the earliest transaction date to know how far back to look
        const firstTx = db.prepare(`
            SELECT date 
            FROM transactions 
            WHERE portfolio_id = ? 
            ORDER BY date ASC 
            LIMIT 1
        `).get(portfolioId);

        const startDate = firstTx ? new Date(firstTx.date).toISOString().split('T')[0] : '2020-01-01';
        console.log(`Fetching dividends for symbols: ${symbols.join(', ')} from ${startDate}`);

        // 3. Loop through each symbol and fetch dividend history
        for (const symbol of symbols) {
            try {
                // Determine holding periods for the symbol to calculate correct amount
                // We need to know how many shares were held on the ex-dividend date
                const symbolTxs = db.prepare(`
                    SELECT date, type, amount 
                    FROM transactions 
                    WHERE portfolio_id = ? AND symbol = ? AND type IN ('BUY', 'SELL')
                    ORDER BY date ASC
                `).all(portfolioId, symbol);

                if (symbolTxs.length === 0) continue;

                // Fetch dividend events
                const events = await yahooFinance.historical(symbol, {
                    period1: startDate,
                    events: 'div'
                });

                if (!events || events.length === 0) {
                    continue;
                }

                // Process each dividend event
                for (const divEvent of events) {
                    const divDate = divEvent.date.toISOString().split('T')[0];
                    const dividendPerShare = divEvent.dividends;

                    // Calculate shares held on this date (before end of day)
                    let sharesHeld = 0;
                    for (const tx of symbolTxs) {
                        const txDate = new Date(tx.date).toISOString().split('T')[0];
                        if (txDate <= divDate) {
                            if (tx.type === 'BUY') sharesHeld += tx.amount;
                            if (tx.type === 'SELL') sharesHeld -= tx.amount;
                        }
                    }

                    // If we held shares, we should receive a dividend
                    if (sharesHeld > 0) {
                        const totalDividend = sharesHeld * dividendPerShare;
                        
                        // Check if this dividend transaction already exists to avoid duplicates
                        const existingDiv = db.prepare(`
                            SELECT id FROM transactions 
                            WHERE portfolio_id = ? AND symbol = ? AND type = 'DIVIDEND' AND date LIKE ?
                        `).get(portfolioId, symbol, `${divDate}%`);

                        if (!existingDiv) {
                            // Insert the new dividend transaction
                            db.prepare(`
                                INSERT INTO transactions (portfolio_id, date, symbol, type, asset, amount, price, fee, note)
                                VALUES (?, ?, ?, 'DIVIDEND', 'Cash', ?, 1.0, 0, ?)
                            `).run(
                                portfolioId, 
                                `${divDate}T12:00:00.000Z`, 
                                symbol, 
                                totalDividend,
                                `Auto-synced dividend: ${dividendPerShare} per share for ${sharesHeld} shares`
                            );
                            results.added++;
                            console.log(`Added dividend: ${symbol} on ${divDate} for $${totalDividend.toFixed(2)}`);
                        }
                        results.processed++;
                    }
                }
            } catch (err) {
                console.error(`Failed to fetch dividends for ${symbol}:`, err.message);
                results.errors.push(`Symbol ${symbol}: ${err.message}`);
            }
        }
        
        console.log(`Dividend sync complete. Added ${results.added} new transactions.`);
        return results;

    } catch (error) {
        console.error('Dividend sync failed:', error);
        throw error;
    }
}
