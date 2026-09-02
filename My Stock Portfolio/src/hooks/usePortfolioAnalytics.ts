import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PortfolioAnalyticsCache, Transaction, Portfolio } from '../types';
import * as d3 from 'd3';

type SummaryTimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'Total';
type AnalyticsMode = 'transaction' | 'stock';

type LiveAnalyticsResult = Omit<PortfolioAnalyticsCache, 'id' | 'portfolio_id' | 'calculated_at'> | null;

/**
 * Supabase table schema for `portfolio_analytics_cache`
 * 
 * CREATE TABLE portfolio_analytics_cache (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
 *   time_range TEXT NOT NULL,
 *   analytics_mode TEXT NOT NULL,
 *   success_rate_pct REAL NOT NULL,
 *   success_rate_numerator INT NOT NULL,
 *   success_rate_denominator INT NOT NULL,
 *   avg_return_pct REAL NOT NULL,
 *   snapshot_profitable_count INT NOT NULL,
 *   snapshot_evaluated_count INT NOT NULL,
 *   transaction_count INT NOT NULL,
 *   warnings TEXT[],
 *   calculated_at TIMESTAMPTZ DEFAULT now(),
 *   UNIQUE(portfolio_id, time_range, analytics_mode)
 * );
 * 
 * RLS: Enable read access for authenticated users.
 */


// This function performs the live, on-the-fly calculation for any given period.
const calculateLiveAnalytics = (
    portfolio: Portfolio,
    transactions: Transaction[],
    rawPriceDataCache: Record<string, Record<string, Record<string, number>>>,
    timeRange: SummaryTimeRange,
    analyticsMode: AnalyticsMode
): LiveAnalyticsResult => {

    const findPriceOnOrBefore = (targetDate: Date, prices: Record<string, number>): { price: number | null, filled: boolean, date: string | null } => {
        if (!prices) return { price: null, filled: false, date: null };
        const targetDateStr = targetDate.toISOString().split('T')[0];

        if(prices[targetDateStr]) {
            return { price: prices[targetDateStr], filled: false, date: targetDateStr };
        }

        const availableDates = Object.keys(prices).map(dateStr => new Date(dateStr)).sort((a, b) => b.getTime() - a.getTime());
        const targetTime = new Date(targetDateStr).getTime();

        let bestMatchDate: Date | null = null;
        for (const date of availableDates) {
            if (date.getTime() <= targetTime) {
                bestMatchDate = date;
                break;
            }
        }
        
        if (bestMatchDate) {
            const bestMatchDateStr = bestMatchDate.toISOString().split('T')[0];
            const price = prices[bestMatchDateStr];
            const filled = bestMatchDateStr !== targetDateStr;
            return { price, filled, date: bestMatchDateStr };
        }
        return { price: null, filled: false, date: null };
    };
    
    // --- Start of calculation logic ---
    const warnings: string[] = [];
    
    const allPortfolioTxs = transactions.filter(t => t.portfolioId === portfolio.id && t.asset !== 'Cash').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (allPortfolioTxs.length === 0) return null;
    
    const firstTxDate = new Date(allPortfolioTxs[0].date);
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const endDate = new Date(today);
    let startDate: Date;

    const periodInDaysMap: Record<Exclude<SummaryTimeRange, 'YTD' | 'Total'>, number> = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };

    if (timeRange === 'Total') {
        startDate = new Date(firstTxDate);
    } else if (timeRange === 'YTD') {
        startDate = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
    } else {
        const rangeKey = timeRange as Exclude<SummaryTimeRange, 'YTD' | 'Total'>;
        const periodDays = periodInDaysMap[rangeKey];
        startDate = new Date(today);
        startDate.setDate(today.getDate() - (periodDays - 1));
    }
    startDate.setUTCHours(0,0,0,0);
    if (startDate < firstTxDate) startDate = new Date(firstTxDate);

    const priceData = rawPriceDataCache[portfolio.id] || rawPriceDataCache['all'];
    if (!priceData) return null;

    const valuationStartDate = new Date(startDate);
    valuationStartDate.setDate(startDate.getDate() - 1);

    const txsInPeriod = allPortfolioTxs.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= startDate && txDate <= endDate;
    });
    const transaction_count = txsInPeriod.length;

    const txsBySymbol = d3.group(allPortfolioTxs, d => d.symbol);
    const periodLots: { id: string; symbol: string; pnl: number; cost: number; return: number; }[] = [];

    for (const [symbol, symbolTxs] of txsBySymbol.entries()) {
        const symbolPrices = priceData[symbol];
        if (!symbolPrices) continue;

        const { price: pStart } = findPriceOnOrBefore(valuationStartDate, symbolPrices);
        const { price: pEnd } = findPriceOnOrBefore(endDate, symbolPrices);
        
        if (pEnd === null) continue;
        const symbolPeriodLots: { id: string; originalQty: number; remainingQty: number; originalCost: number; realizedPnl: number; }[] = [];
        let qtyAtStart = 0;
        let costAtStart = 0;
        const txsBeforeStart = symbolTxs.filter(tx => new Date(tx.date) < startDate);
        
        txsBeforeStart.forEach(tx => {
            if (tx.type === 'BUY') {
                qtyAtStart += Number(tx.amount);
                costAtStart += Number(tx.amount) * Number(tx.price) + (Number(tx.fee) || 0);
            } else {
                const avgCostBeforeSell = qtyAtStart > 0 ? costAtStart / qtyAtStart : 0;
                costAtStart -= Number(tx.amount) * avgCostBeforeSell;
                qtyAtStart -= Number(tx.amount);
            }
        });
        if (qtyAtStart > 1e-9) {
            if (pStart === null) continue;
            symbolPeriodLots.push({ id: `${symbol}-slice`, originalQty: qtyAtStart, remainingQty: qtyAtStart, originalCost: qtyAtStart * pStart, realizedPnl: 0, });
        }
        const buysInPeriod = symbolTxs.filter(tx => tx.type === 'BUY' && new Date(tx.date) >= startDate && new Date(tx.date) <= endDate);
        buysInPeriod.forEach(tx => {
            symbolPeriodLots.push({ id: tx.id, originalQty: Number(tx.amount), remainingQty: Number(tx.amount), originalCost: Number(tx.amount) * Number(tx.price) + (Number(tx.fee) || 0), realizedPnl: 0, });
        });
        const sellsInPeriod = symbolTxs.filter(tx => tx.type === 'SELL' && new Date(tx.date) >= startDate && new Date(tx.date) <= endDate).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        sellsInPeriod.forEach(sellTx => {
            let sellQtyToApply = Number(sellTx.amount);
            const sellFee = Number(sellTx.fee) || 0;
            for (const lot of symbolPeriodLots) {
                if (sellQtyToApply <= 0) break;
                const qtyFromThisLot = Math.min(sellQtyToApply, lot.remainingQty);
                if (qtyFromThisLot > 0) {
                    const costPerShare = lot.originalCost / lot.originalQty;
                    const costOfSoldPortion = qtyFromThisLot * costPerShare;
                    const proceedsForLot = (Number(sellTx.price) * qtyFromThisLot) - (sellFee * (qtyFromThisLot / Number(sellTx.amount)));
                    lot.realizedPnl += proceedsForLot - costOfSoldPortion;
                    lot.remainingQty -= qtyFromThisLot;
                    sellQtyToApply -= qtyFromThisLot;
                }
            }
        });
        symbolPeriodLots.forEach(lot => {
            const costPerShare = lot.originalQty > 0 ? lot.originalCost / lot.originalQty : 0;
            const unrealizedPnl = lot.remainingQty * (pEnd - costPerShare);
            const totalPnl = lot.realizedPnl + unrealizedPnl;
            const totalCost = lot.originalCost;
            periodLots.push({ id: lot.id, symbol: symbol, pnl: totalPnl, cost: totalCost, return: totalCost > 1e-9 ? totalPnl / totalCost : 0 });
        });
    }

    let success_rate_pct = 0, success_rate_numerator = 0, success_rate_denominator = 0, avg_return_pct = 0;
    if (analyticsMode === 'transaction') {
        success_rate_denominator = periodLots.length;
        if (success_rate_denominator > 0) {
            success_rate_numerator = periodLots.filter(l => l.pnl > 0).length;
            success_rate_pct = (success_rate_numerator / success_rate_denominator) * 100;
            avg_return_pct = periodLots.reduce((sum, lot) => sum + lot.return, 0) / success_rate_denominator * 100;
        }
    } else { // 'stock' mode
        const byStock: Map<string, { pnl: number; cost: number }> = d3.rollup(periodLots, v => ({ pnl: d3.sum(v, d => d.pnl), cost: d3.sum(v, d => d.cost) }), d => d.symbol);
        const stockCalcs = Array.from(byStock.values());
        success_rate_denominator = stockCalcs.length;
        if (success_rate_denominator > 0) {
            success_rate_numerator = stockCalcs.filter(s => s.pnl > 0).length;
            const totalPnl = d3.sum(stockCalcs, d => d.pnl);
            const totalCost = d3.sum(stockCalcs, d => d.cost);
            success_rate_pct = (success_rate_numerator / success_rate_denominator) * 100;
            avg_return_pct = totalCost > 1e-9 ? (totalPnl / totalCost) * 100 : 0;
        }
    }
    
    let snapshot_profitable_count = 0;
    let snapshot_evaluated_count = 0;
    for (const stock of portfolio.data) {
        const symbolPrices = priceData[stock.symbol];
        if (!symbolPrices) continue;
        const endPrice = stock.lastPrice;
        const startPrice = findPriceOnOrBefore(valuationStartDate, symbolPrices)?.price;
        if (startPrice !== null && endPrice !== null) {
            snapshot_evaluated_count++;
            if (endPrice > startPrice) {
                snapshot_profitable_count++;
            }
        }
    }

    return {
        time_range: timeRange,
        analytics_mode: analyticsMode,
        success_rate_pct,
        success_rate_numerator,
        success_rate_denominator,
        avg_return_pct,
        snapshot_profitable_count,
        snapshot_evaluated_count,
        transaction_count,
        warnings: [...new Set(warnings)],
    };
};


export const usePortfolioAnalytics = (
    portfolio: Portfolio | undefined,
    transactions: Transaction[],
    rawPriceDataCache: Record<string, Record<string, Record<string, number>>>,
    timeRange: SummaryTimeRange,
    analyticsMode: AnalyticsMode
) => {
    const [analyticsData, setAnalyticsData] = useState<PortfolioAnalyticsCache | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const runAnalyticsProcess = useCallback(async () => {
        if (!portfolio) {
            setIsLoading(false);
            return;
        }

        // 1. Fetch from cache for initial display
        setIsLoading(true);
        setError(null);
        let cachedData: PortfolioAnalyticsCache | null = null;
        try {
            const { data, error: dbError } = await supabase
                .from('portfolio_analytics_cache')
                .select('*')
                .eq('portfolio_id', portfolio.id)
                .eq('time_range', timeRange)
                .eq('analytics_mode', analyticsMode)
                .single();
            
            if (dbError && dbError.code !== 'PGRST116') {
                throw dbError;
            }
            if (data) {
                cachedData = data;
                setAnalyticsData(data);
            } else {
                setAnalyticsData(null); // Clear old data if nothing is found
            }
        } catch (e) {
            const err = e as Error;
            setError(`Could not load cached analytics: ${err.message}`);
        } finally {
            setIsLoading(false);
        }

        // 2. Recalculate in background
        setTimeout(() => {
            if (!portfolio || transactions.length === 0 || Object.keys(rawPriceDataCache).length === 0) {
                return;
            }

            const liveData = calculateLiveAnalytics(portfolio, transactions, rawPriceDataCache, timeRange, analyticsMode);

            if (liveData) {
                const newCacheEntry: PortfolioAnalyticsCache = {
                    ...liveData,
                    id: cachedData?.id || 'live-recalc-' + Date.now(),
                    portfolio_id: portfolio.id,
                    calculated_at: new Date().toISOString(),
                };
                
                // 3. Update UI with fresh data
                setAnalyticsData(newCacheEntry);

                // 4. Upsert fresh data to DB
                const { id, ...upsertPayload } = newCacheEntry;

                supabase
                    .from('portfolio_analytics_cache')
                    .upsert(upsertPayload, { onConflict: 'portfolio_id, time_range, analytics_mode' })
                    .then(({ error: upsertError }) => {
                        if (upsertError) {
                            console.warn("Failed to update analytics cache:", upsertError.message);
                        }
                    });
            }
        }, 500); // Delay to ensure UI is responsive
    }, [portfolio, timeRange, analyticsMode, transactions, rawPriceDataCache]);

    useEffect(() => {
        runAnalyticsProcess();
    }, [runAnalyticsProcess]);

    return { data: analyticsData, isLoading, error };
};