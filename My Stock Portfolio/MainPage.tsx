



import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PortfolioTable from './PortfolioTable';
import AlphaPickTable from './AlphaPickTable';
import Tabs from './Tabs';
import { alphaPickData } from '../data/portfolioData';
import { Portfolio, HistoricalDataPoint, Transaction, LivePriceFetchStatus } from '../types';
import * as d3 from 'd3';

interface MainPageProps {
  portfolios: Portfolio[];
  currency: 'USD' | 'THB';
  exchangeRate: number;
  onAddPortfolio: () => void;
  onRenamePortfolio: (id: string, currentName: string) => void;
  onDeletePortfolio: (id: string, name: string) => void;
  onDeleteStock: (portfolioId: string, symbol: string) => void;
  onRefreshPrices: (portfolioId: string) => void;
  livePriceFetchStatus: LivePriceFetchStatus;
  justUpdatedSymbols: Set<string>;
  autoRefreshSettings: Record<string, boolean>;
  onToggleAutoRefresh: (portfolioId: string) => void;
  setViewedPortfolioId: (id: string | null) => void;
  historicalDataCache: Record<string, HistoricalDataPoint[]>;
  transactions: Transaction[];
  rawPriceDataCache: Record<string, Record<string, Record<string, number>>>;
  onPricesRendered: () => void;
  marketStatus: 'open' | 'closed' | 'unknown';
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string | null) => void;
}

type SummaryTimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'Total';
type AnalyticsMode = 'transaction' | 'stock';

const SectionLoadingIndicator: React.FC<{ status: LivePriceFetchStatus }> = ({ status }) => {
    const { phase, progress, details } = status;
    const isVisible = phase !== 'idle';
    let content: React.ReactNode = null;

    if (phase === 'completed') {
        content = (
            <div className="flex items-center space-x-2 text-xs text-yellow-200 bg-yellow-900/40 px-3 py-1 rounded-full">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.7)]"></div>
                <span>Active Updated</span>
            </div>
        );
    } else if (phase !== 'idle') {
        let text = '';
        switch (phase) {
            case 'local_cache':
            case 'cloud_cache':
                text = 'Waiting (Cache Check)...';
                break;
            case 'api':
                const percent = progress > 0 ? ` - ${progress.toFixed(0)}%` : '';
                text = `Fetching API (${details.current}/${details.total})${percent}`;
                break;
            case 'saving':
                text = 'Saving to cache...';
                break;
            case 'rendering':
                text = 'Finalizing & Rendering...';
                break;
        }
        content = (
            <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md text-xs text-gray-200 px-3 py-1 rounded-full shadow-lg">
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{text}</span>
            </div>
        );
    }

    return (
        <div className={`h-7 flex items-center mb-2 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
             <style>{`.animate-fade-in-fast { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
            {isVisible && <div className="animate-fade-in-fast">{content}</div>}
        </div>
    );
};


const FetchStatusIndicator: React.FC<{ status: LivePriceFetchStatus }> = ({ status }) => {
    if (status.phase === 'idle' || status.phase === 'completed') return null;

    let text = '';
    let showProgress = false;

    switch (status.phase) {
        case 'local_cache':
            text = 'Cache (Local)...';
            break;
        case 'cloud_cache':
            text = 'Cache (Cloud)...';
            break;
        case 'api':
            text = `Fetching API (${status.details.current}/${status.details.total})...`;
            showProgress = true;
            break;
        case 'saving':
            text = 'Saving Cache...';
            break;
        case 'rendering':
            text = 'Updating UI...';
            break;
    }

    return (
        <div className="flex items-center space-x-2 animate-pulse">
            <span className="text-xs text-gray-400">{text}</span>
            {showProgress && (
                <div className="w-20 bg-gray-700 rounded-full h-1.5">
                    <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-linear"
                        style={{ width: `${status.progress}%` }}
                    ></div>
                </div>
            )}
        </div>
    );
};


const AutoRefreshToggle: React.FC<{
    isEnabled: boolean;
    onChange: () => void;
    portfolioName: string;
}> = ({ isEnabled, onChange, portfolioName }) => (
    <div className="flex items-center space-x-2" title={`Toggle auto-refresh for ${portfolioName}`}>
        <span className={`text-xs ${isEnabled ? 'text-blue-400' : 'text-gray-500'}`}>Auto-Refresh</span>
        <button
            onClick={onChange}
            role="switch"
            aria-checked={isEnabled}
            className={`${
                isEnabled ? 'bg-blue-600' : 'bg-gray-600'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500`}
        >
            <span
                className={`${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
        </button>
    </div>
);

const InfoIcon: React.FC<{ tooltipText: string }> = ({ tooltipText }) => (
    <div className="group relative inline-block ml-1.5 text-gray-500 cursor-help">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-2 text-xs text-left bg-gray-900 text-gray-300 border border-gray-600 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 whitespace-pre-wrap">
            {tooltipText}
        </div>
    </div>
);


const PortfolioReturnsSummary: React.FC<{
    portfolio: Portfolio;
    transactions: Transaction[];
    rawPriceDataCache: Record<string, Record<string, Record<string, number>>>;
}> = ({ portfolio, transactions, rawPriceDataCache }) => {
    
    const dailyData = useMemo(() => {
        const portfolioTransactions = transactions.filter(t => t.portfolioId === portfolio.id);
        if (portfolioTransactions.length === 0) return null;

        const priceData = rawPriceDataCache[portfolio.id] || rawPriceDataCache['all'];
        if (!priceData) return null;

        const sortedTxs = portfolioTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstTxDate = new Date(sortedTxs[0].date);
        firstTxDate.setUTCHours(0, 0, 0, 0);

        const allPriceDates = Object.values(priceData).flatMap(p => Object.keys(p).map(d => new Date(d).getTime()));
        const latestPriceDate = new Date(allPriceDates.length > 0 ? Math.max(...allPriceDates) : Date.now());
        latestPriceDate.setUTCHours(0, 0, 0, 0);

        const navAfterFlow = new Map<string, number>();
        const flows = new Map<string, number>();

        const allSymbols = Array.from(new Set(sortedTxs.map(tx => tx.symbol)));
        let lastKnownPrices: Record<string, number> = {};

        const findPriceOnOrBefore = (date: Date, symbol: string): number => {
            const dateStr = date.toISOString().split('T')[0];
            const symbolPrices = priceData[symbol];
            if (symbolPrices?.[dateStr]) {
                lastKnownPrices[symbol] = symbolPrices[dateStr];
            }
            return lastKnownPrices[symbol] || 0;
        };

        let holdings: Record<string, number> = {};
        let cash = 0;
        const loopStartDate = new Date(firstTxDate);
        loopStartDate.setDate(loopStartDate.getDate() - 1);

        for (let d = new Date(loopStartDate); d <= latestPriceDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayTxs = sortedTxs.filter(tx => new Date(tx.date).toISOString().split('T')[0] === dateStr);
            let dayFlow = 0;

            dayTxs.forEach(tx => {
                if (tx.asset === 'Cash') {
                    const amount = tx.type === 'BUY' ? tx.amount : -tx.amount;
                    cash += amount;
                    dayFlow += amount;
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
            });
            flows.set(dateStr, dayFlow);

            const stockValue = Object.entries(holdings).reduce((sum, [symbol, qty]) => {
                const price = findPriceOnOrBefore(d, symbol);
                return sum + (qty * price);
            }, 0);

            const currentNavAfterFlow = stockValue + cash;
            navAfterFlow.set(dateStr, currentNavAfterFlow);
        }
        return { navAfterFlow, flows, firstTxDate, latestPriceDate };
    }, [portfolio.id, transactions, rawPriceDataCache]);

    const periodReturns = useMemo(() => {
        if (!dailyData) return {};
        
        const { navAfterFlow, flows, firstTxDate, latestPriceDate } = dailyData;

        const calculateReturnForPeriod = (startDate: Date, endDate: Date) => {
            const warnings: string[] = [];
            const notes: string[] = [
                "Method: Modified Dietz Return. This method is generally more stable for portfolios with significant cash flows.",
                "Valuation: Uses beginning and ending market values for the period.",
                "Cash Flow Weighting: Cash flows are time-weighted based on when they occurred within the period."
            ];
            
            if (startDate > endDate) {
                return { cumulativeReturnPct: 0, warnings: [], notes };
            }

            const startTminus1 = new Date(startDate);
            startTminus1.setUTCDate(startTminus1.getUTCDate() - 1);
            const startTminus1Str = startTminus1.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            const BMV = navAfterFlow.get(startTminus1Str);
            const EMV = navAfterFlow.get(endDateStr);

            if (BMV === undefined || EMV === undefined) {
                warnings.push(`Missing NAV data to calculate for period ${startDate.toISOString().split('T')[0]} to ${endDateStr}.`);
                return { cumulativeReturnPct: NaN, warnings, notes };
            }

            const totalDaysInPeriod = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            let totalCF = 0;
            let weightedCF = 0;

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const cashFlowOnDay = flows.get(dateStr) || 0;
                
                if (cashFlowOnDay !== 0) {
                    totalCF += cashFlowOnDay;
                    if (totalDaysInPeriod > 1) {
                        const daysFromStart = Math.round((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                        const weight = (totalDaysInPeriod - daysFromStart) / totalDaysInPeriod;
                        weightedCF += cashFlowOnDay * weight;
                    } else {
                        weightedCF += cashFlowOnDay; // For a 1-day period, flow counts fully
                    }
                }
            }
            
            const denominator = BMV + weightedCF;
            const numerator = EMV - BMV - totalCF;
            
            if (Math.abs(BMV) < 1 && Math.abs(totalCF) > 100) {
                warnings.push("Initial portfolio value is near zero, making percentage return misleading due to large subsequent cash flows.");
                return { cumulativeReturnPct: NaN, warnings, notes };
            }

            if (Math.abs(denominator) < 0.01) {
                warnings.push("Calculation is unstable as the weighted capital base is near zero. This can happen with large withdrawals.");
                return { cumulativeReturnPct: NaN, warnings, notes };
            }
            
            let returnPct = (numerator / denominator) * 100;
            
            if (!isFinite(returnPct)) {
                warnings.push("Calculation resulted in a non-finite number (NaN/Infinity).");
                return { cumulativeReturnPct: NaN, warnings, notes };
            }
            
            if (Math.abs(returnPct) > 500) {
                 warnings.push(`Calculated return (${returnPct.toFixed(0)}%) is abnormally high, likely due to data inconsistencies (e.g., cumulative cash flows recorded on a single day). The value has been hidden to prevent misinterpretation.`);
                 returnPct = NaN;
            }
            
            return { cumulativeReturnPct: returnPct, warnings, notes };
        };
        
        const results: Record<string, any> = {};
        const periods: { label: SummaryTimeRange, days?: number }[] = [
            {label: '1D', days: 1}, {label: '1W', days: 7}, {label: '1M', days: 30},
            {label: 'YTD'}, {label: '1Y', days: 365}, {label: 'Total'}
        ];
        
        periods.forEach(({label, days}) => {
            let periodStartDate: Date;
            const periodEndDate = new Date(latestPriceDate);
            periodEndDate.setUTCHours(0,0,0,0);

            if (label === 'YTD') {
