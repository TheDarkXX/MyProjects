import { supabase } from './supabaseClient';
import { Transaction, PortfolioItem, SnapshotBackfillStatus } from '../types';

interface DailySnapshot {
    portfolio_id: string;
    date: string; // YYYY-MM-DD
    value: number;
}

/**
 * Finds the price for a given symbol on a specific date, or the last known price before that date.
 * @param dateStr The target date in 'YYYY-MM-DD' format.
 * @param symbol The stock symbol.
 * @param historicalPrices The complete historical price data cache.
 * @param lastKnownPrices A mutable object to cache the last found price for performance.
 * @returns The price, or 0 if not found.
 */
const findPriceOnOrBefore = (
    dateStr: string,
    symbol: string,
    historicalPrices: Record<string, Record<string, number>>,
    lastKnownPrices: Record<string, number>
): number => {
    const symbolPrices = historicalPrices[symbol];
    if (!symbolPrices) {
        return lastKnownPrices[symbol] || 0;
    }

    if (symbolPrices[dateStr]) {
        lastKnownPrices[symbol] = symbolPrices[dateStr];
        return symbolPrices[dateStr];
    }
    
    // This assumes the dateStr is moving forward chronologically.
    return lastKnownPrices[symbol] || 0;
};


/**
 * Calculates performance metrics for a given set of holdings at a point in time.
 * Note: These are period-based or point-in-time metrics and are not stored in the daily snapshot table.
 * @param holdings Array of current portfolio holdings.
 * @returns An object with success rate and value-weighted return.
 */
export function calculatePerformanceMetrics(holdings: PortfolioItem[]): { successRate: number; valueWeightedReturn: number } {
    if (holdings.length === 0) {
        return { successRate: 0, valueWeightedReturn: 0 };
    }

    const profitablePositions = holdings.filter(h => h.totalReturn > 0).length;
    const successRate = (profitablePositions / holdings.length) * 100;

    const totalReturnValue = holdings.reduce((sum, h) => sum + h.totalReturn, 0);
    const totalCostBase = holdings.reduce((sum, h) => sum + h.totalCost, 0);
    const valueWeightedReturn = totalCostBase > 0 ? (totalReturnValue / totalCostBase) * 100 : 0;

    return { successRate, valueWeightedReturn };
}


/**
 * Orchestrates the calculation of daily Net Asset Value (NAV) for a portfolio
 * and saves each day's snapshot to the database.
 * @param portfolioId The UUID of the portfolio to process.
 * @param allTransactions All transactions from the database.
 * @param allHistoricalPrices A nested object of prices: { symbol: { date: price } }.
 * @returns A summary of the operation.
 */
export async function generateAndSaveDailySnapshots(
    portfolioId: string,
    allTransactions: Transaction[],
    allHistoricalPrices: Record<string, Record<string, number>>
): Promise<{ message: string; snapshotsCreated: number; errors: string[] }> {
    const portfolioTransactions = allTransactions.filter(t => t.portfolioId === portfolioId);
    if (portfolioTransactions.length === 0) {
        return { message: "No transactions for this portfolio.", snapshotsCreated: 0, errors: [] };
    }

    const sortedTxs = portfolioTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstTxDate = new Date(new Date(sortedTxs[0].date).toISOString().split('T')[0]);

    const allPriceDates = Object.values(allHistoricalPrices).flatMap(p => Object.keys(p)).filter(Boolean);
    if (allPriceDates.length === 0) {
        return { message: "No historical price data available.", snapshotsCreated: 0, errors: ["Missing price data to calculate values."] };
    }
    const lastPriceDate = new Date(Math.max(...allPriceDates.map(d => new Date(d).getTime())));

    const snapshotsToSave: DailySnapshot[] = [];
    const errors: string[] = [];

    let holdings: Record<string, number> = {};
    let cash = 0; // Assuming starting cash from transactions.
    const lastKnownPrices: Record<string, number> = {};
    
    // Group transactions by date for efficient processing
    const txsByDate: Record<string, Transaction[]> = {};
    for (const tx of sortedTxs) {
        const dateStr = new Date(tx.date).toISOString().split('T')[0];
        if (!txsByDate[dateStr]) txsByDate[dateStr] = [];
        txsByDate[dateStr].push(tx);
    }

    for (let d = new Date(firstTxDate); d <= lastPriceDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        // Process transactions for the current day
        if (txsByDate[dateStr]) {
            for (const tx of txsByDate[dateStr]) {
                 if (tx.asset === 'Cash') {
                    cash += tx.type === 'BUY' ? tx.amount : -tx.amount;
                } else {
                    const cost = tx.amount * tx.price + (tx.fee || 0);
                    if (tx.type === 'BUY') {
                        holdings[tx.symbol] = (holdings[tx.symbol] || 0) + tx.amount;
                        cash -= cost;
                    } else { // SELL
                        holdings[tx.symbol] = (holdings[tx.symbol] || 0) - tx.amount;
                        cash += tx.amount * tx.price - (tx.fee || 0); // Proceeds from sale
                    }
                }
            }
        }
        
        // Calculate total value of stock holdings
        let stocksValue = 0;
        for (const symbol in holdings) {
            const price = findPriceOnOrBefore(dateStr, symbol, allHistoricalPrices, lastKnownPrices);
            if (price > 0) {
                stocksValue += holdings[symbol] * price;
            } else {
                console.warn(`No price found for ${symbol} on or before ${dateStr}`);
            }
        }

        const nav = stocksValue + cash;
        
        snapshotsToSave.push({
            portfolio_id: portfolioId,
            date: dateStr,
            value: nav,
        });
    }

    if (snapshotsToSave.length > 0) {
        const { error } = await savePortfolioSnapshots(snapshotsToSave);
        if (error) {
            errors.push(error);
            return {
                message: `Failed to save snapshots.`,
                snapshotsCreated: 0,
                errors,
            };
        }
    }
    
    return {
        message: `Successfully calculated and saved ${snapshotsToSave.length} snapshots.`,
        snapshotsCreated: snapshotsToSave.length,
        errors,
    };
}

/**
 * Calculates and saves daily portfolio snapshots for a specified number of past days.
 * @param portfolioId The portfolio to calculate for.
 * @param allTransactions All available transactions.
 * @param allHistoricalPrices The cache of historical prices.
 * @param daysToCalculate The number of days from today to go back.
 * @param progressCallback A function to report progress.
 * @returns A result object with success status and message.
 */
export async function calculateAndSavePortfolioSnapshot(
    portfolioId: string,
    allTransactions: Transaction[],
    allHistoricalPrices: Record<string, Record<string, number>>,
    daysToCalculate: number,
    progressCallback: (progress: { processed: number; total: number; message: string }) => void
): Promise<{ success: boolean; message: string; count: number; }> {
    progressCallback({ processed: 0, total: daysToCalculate, message: 'Starting calculation...' });
    const portfolioTransactions = allTransactions.filter(t => t.portfolioId === portfolioId);
    if (portfolioTransactions.length === 0) {
        return { success: true, message: "No transactions for this portfolio.", count: 0 };
    }

    const sortedTxs = portfolioTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(today);
    
    const startDate = new Date(today);
    startDate.setUTCDate(startDate.getUTCDate() - (daysToCalculate - 1));

    const snapshotsToSave: DailySnapshot[] = [];
    let holdings: Record<string, number> = {};
    let cash = 0;
    const lastKnownPrices: Record<string, number> = {};

    // Calculate initial state up to the day before the calculation period starts
    progressCallback({ processed: 0, total: daysToCalculate, message: 'Calculating initial state...' });
    const catchUpDate = new Date(startDate);
    catchUpDate.setUTCDate(catchUpDate.getUTCDate() - 1);
    const txsBeforeStart = sortedTxs.filter(tx => new Date(tx.date) <= catchUpDate);

    for (const tx of txsBeforeStart) {
        if (tx.asset === 'Cash') {
            cash += tx.type === 'BUY' ? tx.amount : -tx.amount;
        } else {
            const cost = tx.amount * tx.price + (tx.fee || 0);
            if (tx.type === 'BUY') {
                holdings[tx.symbol] = (holdings[tx.symbol] || 0) + tx.amount;
                cash -= cost;
            } else { 
                holdings[tx.symbol] = (holdings[tx.symbol] || 0) - tx.amount;
                cash += tx.amount * tx.price - (tx.fee || 0);
            }
        }
    }
    
    const txsByDate: Record<string, Transaction[]> = {};
    const txsInPeriod = sortedTxs.filter(tx => new Date(tx.date) >= startDate && new Date(tx.date) <= endDate);
    for (const tx of txsInPeriod) {
        const dateStr = new Date(tx.date).toISOString().split('T')[0];
        if (!txsByDate[dateStr]) txsByDate[dateStr] = [];
        txsByDate[dateStr].push(tx);
    }

    let processedDays = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        if (txsByDate[dateStr]) {
            for (const tx of txsByDate[dateStr]) {
                 if (tx.asset === 'Cash') {
                    cash += tx.type === 'BUY' ? tx.amount : -tx.amount;
                } else {
                    const cost = tx.amount * tx.price + (tx.fee || 0);
                    if (tx.type === 'BUY') {
                        holdings[tx.symbol] = (holdings[tx.symbol] || 0) + tx.amount;
                        cash -= cost;
                    } else {
                        holdings[tx.symbol] = (holdings[tx.symbol] || 0) - tx.amount;
                        cash += tx.amount * tx.price - (tx.fee || 0);
                    }
                }
            }
        }
        
        let stocksValue = 0;
        for (const symbol in holdings) {
            const price = findPriceOnOrBefore(dateStr, symbol, allHistoricalPrices, lastKnownPrices);
            stocksValue += (holdings[symbol] || 0) * price;
        }

        snapshotsToSave.push({ portfolio_id: portfolioId, date: dateStr, value: stocksValue + cash });
        processedDays++;
        progressCallback({ processed: processedDays, total: daysToCalculate, message: `Calculated for ${dateStr}`});
    }

    progressCallback({ processed: daysToCalculate, total: daysToCalculate, message: `Saving ${snapshotsToSave.length} snapshots...`});
    const { error } = await savePortfolioSnapshots(snapshotsToSave);

    if (error) {
        return { success: false, message: `Error saving snapshots: ${error}`, count: 0 };
    }

    return { success: true, message: `Successfully created/updated ${snapshotsToSave.length} snapshots.`, count: snapshotsToSave.length };
}


/**
 * Saves a batch of daily portfolio snapshots to the Supabase database.
 * Uses upsert to efficiently insert new records or update existing ones.
 * @param snapshots An array of snapshot objects to save.
 * @returns The result of the Supabase query.
 */
async function savePortfolioSnapshots(snapshots: DailySnapshot[]): Promise<{ error: string | null }> {
    const dataToUpsert = snapshots.map(s => ({
        portfolio_id: s.portfolio_id,
        date: s.date,
        total_value: s.value
    }));

    const { error } = await supabase
        .from('portfolio_daily_snapshots')
        .upsert(dataToUpsert, { onConflict: 'portfolio_id,date' });

    if (error) {
        console.error("Error saving portfolio snapshots:", error);
        return { error: error.message };
    }
    
    return { error: null };
}

/**
 * Calculates and backfills missing daily portfolio snapshots for a given portfolio.
 * This function is designed to be run as a background job on app load.
 * @param portfolioId The UUID of the portfolio to process.
 * @param allTransactions All transactions from the database.
 * @param allHistoricalPrices A nested object of prices: { symbol: { date: price } }.
 * @param progressCallback A function to report progress back to the UI.
 */
export async function backfillPortfolioSnapshots(
    portfolioId: string,
    allTransactions: Transaction[],
    allHistoricalPrices: Record<string, Record<string, number>>,
    progressCallback: (progress: SnapshotBackfillStatus) => void
): Promise<void> {
    const portfolioTransactions = allTransactions.filter(t => t.portfolioId === portfolioId);
    if (portfolioTransactions.length === 0) {
        progressCallback({ phase: 'complete', message: 'No transactions to process.' });
        return;
    }

    progressCallback({ phase: 'checking', message: 'Checking for missing performance data...' });

    const { data: lastSnapshot, error: lastSnapshotError } = await supabase
        .from('portfolio_daily_snapshots')
        .select('date')
        .eq('portfolio_id', portfolioId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

    if (lastSnapshotError && lastSnapshotError.code !== 'PGRST116') {
        progressCallback({ phase: 'error', message: `DB Error: ${lastSnapshotError.message}` });
        return;
    }

    const sortedTxs = portfolioTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstTxDate = new Date(new Date(sortedTxs[0].date).toISOString().split('T')[0]);

    const allPriceDates = Object.values(allHistoricalPrices).flatMap(p => Object.keys(p)).filter(Boolean);
    if (allPriceDates.length === 0) {
        progressCallback({ phase: 'complete', message: 'No price data available.' });
        return;
    }
    const lastPriceDate = new Date(Math.max(...allPriceDates.map(d => new Date(d).getTime())));
    
    const calculationStartDate = new Date(lastSnapshot?.date || firstTxDate);
    if(lastSnapshot?.date) {
        calculationStartDate.setUTCDate(calculationStartDate.getUTCDate() + 1);
    }

    if (calculationStartDate > lastPriceDate) {
        progressCallback({ phase: 'complete', message: 'Performance data is up-to-date.' });
        return;
    }

    progressCallback({ phase: 'calculating', message: 'Preparing initial state...' });

    let holdings: Record<string, number> = {};
    let cash = 0; 
    const lastKnownPrices: Record<string, number> = {};
    
    const catchUpEndDate = new Date(calculationStartDate);
    catchUpEndDate.setUTCDate(catchUpEndDate.getUTCDate() - 1);

    const txsToCatchUp = sortedTxs.filter(tx => new Date(tx.date) <= catchUpEndDate);

    for (const tx of txsToCatchUp) {
        if (tx.asset === 'Cash') {
            cash += tx.type === 'BUY' ? tx.amount : -tx.amount;
        } else {
            const cost = tx.amount * tx.price + (tx.fee || 0);
            if (tx.type === 'BUY') {
                holdings[tx.symbol] = (holdings[tx.symbol] || 0) + tx.amount;
                cash -= cost;
            } else { 
                holdings[tx.symbol] = (holdings[tx.symbol] || 0) - tx.amount;
                cash += tx.amount * tx.price - (tx.fee || 0);
            }
        }
    }
    
    const txsByDate: Record<string, Transaction[]> = {};
    const txsToProcess = sortedTxs.filter(tx => new Date(tx.date) >= calculationStartDate);
    for (const tx of txsToProcess) {
        const dateStr = new Date(tx.date).toISOString().split('T')[0];
        if (!txsByDate[dateStr]) txsByDate[dateStr] = [];
        txsByDate[dateStr].push(tx);
    }
    
    const snapshotsToSave: DailySnapshot[] = [];
    const totalDays = Math.round((lastPriceDate.getTime() - calculationStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    let processedDays = 0;

    for (let d = new Date(calculationStartDate); d <= lastPriceDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        if (txsByDate[dateStr]) {
            for (const tx of txsByDate[dateStr]) {
                 if (tx.asset === 'Cash') {
                    cash += tx.type === 'BUY' ? tx.amount : -tx.amount;
                } else {
                    const cost = tx.amount * tx.price + (tx.fee || 0);
                    if (tx.type === 'BUY') {
                        holdings[tx.symbol] = (holdings[tx.symbol] || 0) + tx.amount;
                        cash -= cost;
                    } else { 
                        holdings[tx.symbol] = (holdings[tx.symbol] || 0) - tx.amount;
                        cash += tx.amount * tx.price - (tx.fee || 0);
                    }
                }
            }
        }
        
        let stocksValue = 0;
        for (const symbol in holdings) {
            const price = findPriceOnOrBefore(dateStr, symbol, allHistoricalPrices, lastKnownPrices);
            stocksValue += (holdings[symbol] || 0) * price;
        }

        const nav = stocksValue + cash;
        
        snapshotsToSave.push({
            portfolio_id: portfolioId,
            date: dateStr,
            value: nav,
        });

        processedDays++;
        if (processedDays % 10 === 0 || processedDays === totalDays) {
            progressCallback({
                phase: 'calculating',
                message: `Calculating historical performance...`,
                progress: (processedDays / totalDays) * 100,
                details: { processedDays, totalDays }
            });
        }
    }

    if (snapshotsToSave.length > 0) {
        progressCallback({ 
            phase: 'saving', 
            message: `Saving ${snapshotsToSave.length} new snapshots...` 
        });
        const { error } = await savePortfolioSnapshots(snapshotsToSave);
        if (error) {
            progressCallback({ phase: 'error', message: `Failed to save snapshots: ${error}` });
            return;
        }
    }
    
    progressCallback({ phase: 'complete', message: 'Performance data is now up-to-date.' });
}

export interface SimpleReturnResult {
  netCapitalInvested: number;
  currentValue: number;
  returnAmount: number;
  returnPercent: number;
  calculationMethod: 'SIMPLE';
}

/**
 * Calculates the portfolio return based on a simple formula focusing on security investments.
 * This is an alternative to Time-Weighted Return and does not account for the timing of cash flows.
 * Calculation: ((Current Value - Net Capital Invested) / Net Capital Invested) * 100
 * - Net Capital Invested = (Total Buy Cost of Securities) - (Total Sell Proceeds of Securities)
 *
 * @param portfolioTransactions All transactions for the specific portfolio.
 * @param portfolioCurrentValue The total current Net Asset Value (NAV) of the portfolio (stocks + cash).
 * @returns An object containing the simple return calculation.
 */
export function calculateSimpleReturn(
  portfolioTransactions: Transaction[],
  portfolioCurrentValue: number,
): SimpleReturnResult {
  if (!portfolioTransactions || portfolioTransactions.length === 0) {
    return {
      netCapitalInvested: 0,
      currentValue: 0,
      returnAmount: 0,
      returnPercent: 0,
      calculationMethod: 'SIMPLE',
    };
  }

  // Filter for only BUY/SELL transactions of assets that are not 'Cash'
  const securityTransactions = portfolioTransactions.filter(
    t => t.asset !== 'Cash' && (t.type === 'BUY' || t.type === 'SELL')
  );

  const totalBuyCost = securityTransactions
    .filter(t => t.type === 'BUY')
    .reduce((sum, t) => sum + (t.amount * t.price), 0);

  const totalSellProceeds = securityTransactions
    .filter(t => t.type === 'SELL')
    .reduce((sum, t) => sum + (t.amount * t.price), 0);
  
  const netCapitalInvested = totalBuyCost - totalSellProceeds;
  const currentValue = portfolioCurrentValue;
  const returnAmount = currentValue - netCapitalInvested;
  
  let returnPercent = 0;
  // Safety check: Avoid division by zero if net capital invested is zero.
  if (netCapitalInvested !== 0) {
    returnPercent = (returnAmount / netCapitalInvested) * 100;
  }
  
  return {
    netCapitalInvested,
    currentValue,
    returnAmount,
    returnPercent,
    calculationMethod: 'SIMPLE',
  };
}
