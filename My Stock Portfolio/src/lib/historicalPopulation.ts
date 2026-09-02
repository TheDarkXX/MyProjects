import { supabase } from './supabaseClient';
import { Transaction, SnapshotBackfillStatus } from '../types';

interface DailySnapshot {
    portfolio_id: string;
    date: string; // YYYY-MM-DD
    total_value: number;
}

// --- Market Holiday Data ---
// Simple list of US market holidays for the relevant period.
const usMarketHolidays = new Set([
    '2024-01-01', '2024-01-15', '2024-02-19', '2024-03-29', '2024-05-27', '2024-06-19', '2024-07-04', '2024-09-02', '2024-11-28', '2024-12-25',
    '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26', '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25',
    '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
]);


// --- Helper Functions ---

/**
 * Finds the price for a symbol on a specific date or the most recent price before it.
 */
const findPriceOnOrBefore = (
    dateStr: string,
    symbol: string,
    historicalPrices: Record<string, Record<string, number>>,
    lastKnownPrices: Record<string, { price: number; date: string }>
): number => {
    const symbolPrices = historicalPrices[symbol];
    if (!symbolPrices) return lastKnownPrices[symbol]?.price || 0;

    // Direct hit
    if (symbolPrices[dateStr]) {
        lastKnownPrices[symbol] = { price: symbolPrices[dateStr], date: dateStr };
        return symbolPrices[dateStr];
    }

    // If the cache has a price from a previous day, and it's on or before the current date, use it (forward-fill).
    if (lastKnownPrices[symbol] && lastKnownPrices[symbol].date <= dateStr) {
        return lastKnownPrices[symbol].price;
    }
    
    // If cache is stale or empty, search for the most recent price before dateStr
    const availableDates = Object.keys(symbolPrices);
    let bestMatchDate: string | null = null;
    for (const d of availableDates) {
        if (d <= dateStr) {
            if (!bestMatchDate || d > bestMatchDate) {
                bestMatchDate = d;
            }
        }
    }

    if (bestMatchDate) {
        lastKnownPrices[symbol] = { price: symbolPrices[bestMatchDate], date: bestMatchDate };
        return symbolPrices[bestMatchDate];
    }

    return 0;
};

/**
 * Checks the availability of historical price data for the required symbols and date range.
 */
export const checkDataCoverage = (
    transactions: Transaction[],
    historicalPrices: Record<string, Record<string, number>>
): { coveragePercent: number; missingSymbols: string[]; startDate: string; endDate: string } => {
    if (transactions.length === 0) {
        return { coveragePercent: 0, missingSymbols: [], startDate: '', endDate: '' };
    }
    const symbols = Array.from(new Set(transactions.map(t => t.symbol)));
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startDate = new Date(sortedTxs[0].date).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const missingSymbols = symbols.filter(symbol => !historicalPrices[symbol] || Object.keys(historicalPrices[symbol]).length === 0);
    const coveragePercent = ((symbols.length - missingSymbols.length) / symbols.length) * 100;
    
    return { coveragePercent, missingSymbols, startDate, endDate };
};


/**
 * The main engine for calculating and backfilling the entire history of a portfolio.
 * This version uses a single set of current prices for all historical calculations, simplifying
 * the process at the cost of historical accuracy.
 */
export async function populateHistoricalData(
    portfolioId: string,
    allTransactions: Transaction[],
    currentPrices: Record<string, number>,
    progressCallback: (status: {
        phase: string;
        message: string;
        progress: number;
        details?: { processedDays: number; totalDays: number; warnings: string[] };
    }) => void
): Promise<{ success: boolean; message: string; warnings: string[] }> {
    const portfolioTransactions = allTransactions.filter(t => t.portfolioId === portfolioId);
    if (portfolioTransactions.length === 0) {
        return { success: true, message: "No transactions to process.", warnings: [] };
    }

    progressCallback({ phase: 'starting', message: 'Initializing...', progress: 0 });

    const sortedTxs = portfolioTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstTxDate = new Date(new Date(sortedTxs[0].date).toISOString().split('T')[0]);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const warnings: string[] = [];
    const snapshotsToSave: DailySnapshot[] = [];

    let holdings: Record<string, number> = {};
    let cash = 0;
    let lastValidNav = 0;

    const totalDays = Math.round((today.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24));
    let processedDays = 0;
    const startTime = Date.now();

    for (let d = new Date(firstTxDate); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getUTCDay();

        if (dayOfWeek === 0 || dayOfWeek === 6 || usMarketHolidays.has(dateStr)) {
            continue;
        }

        // Process transactions for the current day
        const txsOnDay = sortedTxs.filter(tx => new Date(tx.date).toISOString().split('T')[0] === dateStr);
        for (const tx of txsOnDay) {
            const amount = Number(tx.amount);
            const price = Number(tx.price);
            const fee = Number(tx.fee || 0);

            if (!isFinite(amount) || !isFinite(price) || !isFinite(fee)) {
                warnings.push(`Skipping invalid transaction data on ${dateStr} for ${tx.symbol} (ID: ${tx.id})`);
                continue;
            }

            if (tx.asset === 'Cash') {
                cash += tx.type === 'BUY' ? amount : -amount;
            } else {
                const cost = amount * price + fee;
                if (tx.type === 'BUY') {
                    holdings[tx.symbol] = (holdings[tx.symbol] || 0) + amount;
                    cash -= cost;
                } else {
                    holdings[tx.symbol] = (holdings[tx.symbol] || 0) - amount;
                    cash += amount * price - fee;
                }
            }
        }

        // Ensure cash is a valid number
        if (!isFinite(cash)) {
            warnings.push(`Cash balance became invalid on ${dateStr}. Using last known value.`);
            cash = lastValidNav - Object.entries(holdings).reduce((sum, [symbol, qty]) => sum + (qty * (currentPrices[symbol] || 0)), 0);
        }

        let stocksValue = 0;
        for (const symbol in holdings) {
            if (holdings[symbol] > 1e-9) { 
                const price = currentPrices[symbol] || 0;
                if (price === 0) {
                     warnings.push(`No current price for ${symbol}; its value is 0.`);
                }
                stocksValue += holdings[symbol] * price;
            }
        }
        
        if (!isFinite(stocksValue)) {
            warnings.push(`Stock value became invalid on ${dateStr}. Using last known value.`);
            stocksValue = lastValidNav - cash;
        }

        let nav = stocksValue + cash;
        
        if (!isFinite(nav)) {
            warnings.push(`Calculated NAV is invalid on ${dateStr}. Using last known value of ${lastValidNav.toFixed(2)}.`);
            nav = lastValidNav;
        }

        if (lastValidNav !== 0 && isFinite(nav) && Math.abs((nav - lastValidNav) / lastValidNav) > 0.50) {
             warnings.push(`Suspicious value change on ${dateStr}: ${lastValidNav.toFixed(2)} -> ${nav.toFixed(2)}`);
        }
        
        if (isFinite(nav)) {
            lastValidNav = nav;
        }
        
        snapshotsToSave.push({ portfolio_id: portfolioId, date: dateStr, total_value: nav });

        processedDays++;
        if (processedDays % 10 === 0) {
            const elapsedTime = Date.now() - startTime;
            const timePerDay = elapsedTime / processedDays;
            const remainingDays = totalDays - processedDays;
            const eta = new Date(Date.now() + remainingDays * timePerDay).toLocaleTimeString();

            progressCallback({
                phase: 'calculating',
                message: `Processing ${dateStr} (ETA: ${eta})`,
                progress: (processedDays / totalDays) * 100,
                details: { processedDays, totalDays, warnings: [...new Set(warnings)] }
            });
        }
    }

    progressCallback({
        phase: 'saving',
        message: `Saving ${snapshotsToSave.length} calculated snapshots to the database...`,
        progress: 99,
        details: { processedDays, totalDays, warnings: [...new Set(warnings)] }
    });

    if (snapshotsToSave.length > 0) {
        const validSnapshots = snapshotsToSave.filter(s => isFinite(s.total_value));
        if (validSnapshots.length !== snapshotsToSave.length) {
            warnings.push(`Filtered out ${snapshotsToSave.length - validSnapshots.length} invalid snapshots before saving.`);
        }

        if (validSnapshots.length > 0) {
            const { error } = await supabase.from('portfolio_daily_snapshots').upsert(validSnapshots);
            if (error) {
                return { success: false, message: `DB Error: ${error.message}`, warnings };
            }
        } else {
            warnings.push('No valid snapshots were generated to save.');
        }
    }

    return { success: true, message: `Successfully populated ${snapshotsToSave.length} historical snapshots.`, warnings: [...new Set(warnings)] };
}