import { useState, useEffect, useMemo } from 'react';
import { Portfolio, DailyPortfolioSnapshot, Transaction, DisplayMethod } from '../types';

// --- Type Definitions ---
type SummaryTimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'Total';
type PeriodReturnData = { cumulativeReturnPct: number; absoluteReturn: number; warnings: string[]; notes: string[] };
export type PeriodReturns = Record<SummaryTimeRange, PeriodReturnData | null>;

export interface UsePortfolioSummaryReturn {
    returns: PeriodReturns | null;
    loading: {
        isFetchingCache: boolean; // Not used, but kept for type consistency
        isCalculatingLive: boolean;
    };
    lastUpdated: string | null;
    dataQuality: 'empty' | 'stale' | 'recent';
}


/**
 * Calculates returns for various periods based on an array of daily portfolio value snapshots.
 * This is a simplified calculation and does not account for cash flows (Time-Weighted Return).
 * @param snapshots An array of daily snapshots, sorted by date.
 * @param liveEndValue The final value of the portfolio for the most recent period calculation.
 * @returns An object containing calculated returns for predefined periods.
 */
// This function was missing but is required by the DatabaseTestPage for validation.
export function calculateReturnsFromSnapshots(snapshots: DailyPortfolioSnapshot[], liveEndValue: number): { returns: PeriodReturns } {
    if (snapshots.length < 1) {
        return { returns: {} as PeriodReturns };
    }
    
    const results: Partial<PeriodReturns> = {};
    const periods: { label: SummaryTimeRange, days?: number }[] = [ {label: '1D', days: 1}, {label: '1W', days: 7}, {label: '1M', days: 30}, {label: '3M', days: 90}, {label: '6M', days: 180}, {label: 'YTD'}, {label: '1Y', days: 365}, {label: 'Total'} ];
    
    const lastSnapshot = snapshots[snapshots.length-1];
    const firstSnapshot = snapshots[0];
    const lastSnapshotDate = new Date(lastSnapshot.date);
    
    const findSnapshotOnOrBefore = (date: Date): DailyPortfolioSnapshot | undefined => {
        let found: DailyPortfolioSnapshot | undefined;
        for (let i = snapshots.length - 1; i >= 0; i--) {
            if (new Date(snapshots[i].date) <= date) {
                found = snapshots[i];
                break;
            }
        }
        return found;
    };

    periods.forEach(({label, days}) => {
        let periodStartDate: Date;
        const periodEndDate = new Date(lastSnapshotDate);
        if (label === 'YTD') periodStartDate = new Date(Date.UTC(lastSnapshotDate.getUTCFullYear(), 0, 1));
        else if (label === 'Total') periodStartDate = new Date(firstSnapshot.date);
        else {
            periodStartDate = new Date(lastSnapshotDate);
            periodStartDate.setUTCDate(lastSnapshotDate.getUTCDate() - (days!));
        }
        
        const startSnapshot = findSnapshotOnOrBefore(periodStartDate);
        const endSnapshot = lastSnapshot;

        let cumulativeReturnPct = NaN;
        if (startSnapshot && endSnapshot && startSnapshot.value > 0) {
            cumulativeReturnPct = ((endSnapshot.value / startSnapshot.value) - 1) * 100;
        }

        results[label] = { cumulativeReturnPct, absoluteReturn: 0, warnings: [], notes: ["Source: DB Snapshots (Simple Return). Cash flows not accounted for."] };
    });

    return { returns: results as PeriodReturns };
}


/**
 * A hook to manage fetching and calculating portfolio returns by performing a live
 * Time-Weighted Return (TWR) calculation from raw transactions and price data.
 */
export const usePortfolioSummary = (
    portfolio: Portfolio | undefined,
    transactions: Transaction[],
    rawPriceDataCache: Record<string, Record<string, Record<string, number>>>,
    displayMethod: DisplayMethod
): UsePortfolioSummaryReturn => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string|null>(null);

    const analyticsResult = useMemo(() => {
        if (!portfolio || transactions.length === 0 || !rawPriceDataCache) {
            return { returns: null, lastUpdated: null, dataQuality: 'empty' as const };
        }
        
        const priceData = rawPriceDataCache[portfolio.id] || rawPriceDataCache['all'];
        if (!priceData || Object.keys(priceData).length === 0) {
            return { returns: null, lastUpdated: null, dataQuality: 'empty' as const };
        }

        try {
            const portfolioTransactions = transactions.filter(t => t.portfolioId === portfolio.id);
            if (portfolioTransactions.length === 0) return { returns: {} as PeriodReturns, lastUpdated: null, dataQuality: 'empty' as const };
            
            const sortedTxs = portfolioTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const firstTxDate = new Date(new Date(sortedTxs[0].date).toISOString().split('T')[0]);

            const allPriceDates = Object.values(priceData).flatMap((p: Record<string, number>) => Object.keys(p)).filter(Boolean);
            if (allPriceDates.length === 0) return { returns: {} as PeriodReturns, lastUpdated: null, dataQuality: 'empty' as const };
            const lastPriceDate = new Date(Math.max(...allPriceDates.map(d => new Date(d).getTime())));

            const findPrice = (dateStr: string, symbol: string, lastKnown: { price: number }) => {
                if (priceData[symbol]?.[dateStr]) {
                    lastKnown.price = priceData[symbol][dateStr];
                }
                return lastKnown.price || 0;
            };

            const dailyData = new Map<string, { twrFactor: number; nav: number; cf: number }>();
            let holdings: Record<string, number> = {};
            let cash = 0;
            let navAfterFlows = 0;
            let cumulativeTwrFactor = 1.0;
            const lastKnownPrices: Record<string, { price: number }> = {};
            const allSymbols = Array.from(new Set(Object.keys(priceData)));
            allSymbols.forEach(s => { lastKnownPrices[s] = { price: 0 } });

            for (let d = new Date(firstTxDate); d <= lastPriceDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const navAtStart = navAfterFlows;

                let navBeforeFlows = cash;
                for (const symbol in holdings) {
                    const price = findPrice(dateStr, symbol, lastKnownPrices[symbol]);
                    navBeforeFlows += (holdings[symbol] || 0) * price;
                }

                if (navAtStart > 1e-9) {
                    const dailyReturnFactor = navBeforeFlows / navAtStart;
                    cumulativeTwrFactor *= dailyReturnFactor;
                }
                
                let dayCF = 0;
                const txsOnDay = sortedTxs.filter(tx => new Date(tx.date).toISOString().split('T')[0] === dateStr);
                txsOnDay.forEach(tx => {
                    if (tx.asset === 'Cash') {
                        const amount = tx.type === 'BUY' ? tx.amount : -tx.amount;
                        cash += amount;
                        dayCF += amount;
                    } else {
                        const cost = tx.amount * tx.price + (tx.fee || 0);
                        if (tx.type === 'BUY') {
                            holdings[tx.symbol] = (holdings[tx.symbol] || 0) + tx.amount;
                            cash -= cost;
                        } else {
                            holdings[tx.symbol] -= tx.amount;
                            cash += tx.amount * tx.price - (tx.fee || 0);
                        }
                    }
                });
                
                navAfterFlows = cash;
                for (const symbol in holdings) {
                     const price = findPrice(dateStr, symbol, lastKnownPrices[symbol]);
                     navAfterFlows += (holdings[symbol] || 0) * price;
                }
                dailyData.set(dateStr, { twrFactor: cumulativeTwrFactor, nav: navAfterFlows, cf: dayCF });
            }

            const results: Partial<PeriodReturns> = {};
            const periods: { label: SummaryTimeRange, days?: number }[] = [ {label: '1D', days: 1}, {label: '1W', days: 7}, {label: '1M', days: 30}, {label: '3M', days: 90}, {label: '6M', days: 180}, {label: 'YTD'}, {label: '1Y', days: 365}, {label: 'Total'} ];
            
            periods.forEach(({label, days}) => {
                let periodStartDate: Date;
                const periodEndDate = new Date(lastPriceDate);
                periodEndDate.setUTCHours(0,0,0,0);

                if (label === 'YTD') periodStartDate = new Date(Date.UTC(lastPriceDate.getUTCFullYear(), 0, 1));
                else if (label === 'Total') periodStartDate = new Date(firstTxDate);
                else {
                    periodStartDate = new Date(lastPriceDate);
                    periodStartDate.setUTCDate(lastPriceDate.getUTCDate() - (days! - 1));
                }
                periodStartDate.setUTCHours(0,0,0,0);
                if (periodStartDate < firstTxDate) periodStartDate = new Date(firstTxDate);

                const periodEndDateStr = periodEndDate.toISOString().split('T')[0];
                const periodStartDateMinus1 = new Date(periodStartDate);
                periodStartDateMinus1.setUTCDate(periodStartDateMinus1.getUTCDate() - 1);
                const periodStartDateMinus1Str = periodStartDateMinus1.toISOString().split('T')[0];
                
                const bmv = dailyData.get(periodStartDateMinus1Str)?.nav || 0;
                const emv = dailyData.get(periodEndDateStr)?.nav || 0;
                let periodCF = 0;
                for (let d = new Date(periodStartDate); d <= periodEndDate; d.setDate(d.getDate() + 1)) {
                    periodCF += dailyData.get(d.toISOString().split('T')[0])?.cf || 0;
                }
                const absoluteReturn = emv - bmv - periodCF;
                let cumulativeReturnPct = NaN;

                if (displayMethod === 'TWR') {
                    const twrEnd = dailyData.get(periodEndDateStr)?.twrFactor || 1;
                    const twrStart = dailyData.get(periodStartDateMinus1Str)?.twrFactor || (label === 'Total' ? 1 : undefined);

                    if (twrStart !== undefined && twrStart > 1e-9) {
                        cumulativeReturnPct = ((twrEnd / twrStart) - 1) * 100;
                    }
                    results[label] = { cumulativeReturnPct, absoluteReturn, warnings: [], notes: ["Source: Live Calculation (Time-Weighted Return)."] };
                } else { // 'SIMPLE'
                    if (bmv > 1e-9) { // Avoid division by zero
                        cumulativeReturnPct = (absoluteReturn / bmv) * 100;
                    }
                     results[label] = { cumulativeReturnPct, absoluteReturn, warnings: [], notes: ["Source: Live Calculation (Simple Return). Return = Gain / Start Value."] };
                }
            });
            
            // Override Total return based on the selected method
            if (displayMethod === 'TWR') {
                if (portfolio && typeof portfolio.total.totalReturnPercent === 'number' && results['Total']) {
                    results['Total']!.cumulativeReturnPct = portfolio.total.totalReturnPercent;
                    results['Total']!.absoluteReturn = portfolio.total.totalReturn;
                    results['Total']!.notes = ["Source: Live Calculation (Money-Weighted Return). This metric reflects the overall return on invested capital."];
                }
            } else { // 'SIMPLE'
                const simpleData = portfolio.total.simpleReturn;
                if (simpleData && results['Total']) {
                     results['Total']!.cumulativeReturnPct = simpleData.returnPercent;
                     results['Total']!.absoluteReturn = simpleData.returnAmount;
                     results['Total']!.notes = ["Source: Simple Return. (Current Value - Net Capital Invested) / Net Capital Invested."];
                }
            }
            
            const latestDate = lastPriceDate.toISOString().split('T')[0];
            const today = new Date();
            today.setUTCHours(0,0,0,0);
            const diffDays = (today.getTime() - lastPriceDate.getTime()) / (1000 * 3600 * 24);

            return { returns: results as PeriodReturns, lastUpdated: latestDate, dataQuality: diffDays <= 2 ? 'recent' as const : 'stale' as const };
        
        } catch(e) {
            console.error("Error calculating portfolio summary:", e);
            setError("Failed to calculate returns.");
            return { returns: null, lastUpdated: null, dataQuality: 'empty' as const };
        }
    }, [portfolio, transactions, rawPriceDataCache, displayMethod]);

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        const timer = setTimeout(() => setIsLoading(false), 250);
        return () => clearTimeout(timer);
    }, [analyticsResult]);

    return {
        returns: analyticsResult.returns,
        loading: {
            isFetchingCache: false,
            isCalculatingLive: isLoading,
        },
        lastUpdated: analyticsResult.lastUpdated,
        dataQuality: analyticsResult.dataQuality,
    };
};
