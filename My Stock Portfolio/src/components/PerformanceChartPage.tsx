

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Portfolio, HistoricalDataPoint, ChartApiStatus, FetchProgress, Transaction, DisplayMethod } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush } from 'recharts';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import 'chart.js/auto'; // Ensures all necessary components are registered

const DEFAULT_POLYGON_KEY = 'nU1_qIjq8inMDa7CXUjPETsl6TY0OHQD';

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0F172A]/90 backdrop-blur-sm text-[#F9FAFB] p-3 border border-gray-700 rounded-lg shadow-xl text-sm z-50">
                <p className="font-bold mb-2 text-base">{new Date(label).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</p>
                {payload.map((pld: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: pld.stroke }}></div>
                            <span className="mr-2 text-gray-400">{pld.name}:</span>
                        </div>
                        <span className="font-mono font-bold">{`${pld.value.toFixed(2)}%`}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const ApiStatusIndicator: React.FC<{ status: ChartApiStatus['status']; error: string | null; progress: FetchProgress }> = ({ status, error, progress }) => {
    const statusConfig = useMemo(() => {
        if (status === 'loading') {
            const { phase, currentSymbol } = progress;
            let text = 'Initializing...';
            switch (phase) {
                case 'checking_cache':
                    text = 'Checking cache';
                    break;
                case 'fetching_api':
                    text = `Fetching: ${currentSymbol || '...'}`;
                    break;
                case 'paused':
                    text = 'API Fetch Paused';
                    break;
                case 'saving_to_cache':
                    text = 'Saving to cache';
                    break;
                case 'calculating':
                    text = 'Calculating Chart';
                    break;
                default:
                    text = 'Loading...';
            }
            return { text, color: 'bg-blue-500', glow: 'animate-pulse' };
        }

        switch (status) {
            case 'success':
                return { text: 'Cache Up-to-date', color: 'bg-green-500', glow: 'shadow-[0_0_6px_rgba(34,197,94,0.7)]' };
            case 'error':
                return { text: 'Chart Data Error', color: 'bg-red-500', glow: 'shadow-[0_0_6px_rgba(239,68,68,0.7)]' };
            default:
                return { text: 'Chart Data Idle', color: 'bg-gray-500', glow: '' };
        }
    }, [status, progress]);

    return (
        <div className="flex flex-col items-start">
            <div className="flex items-center space-x-2 text-xs text-gray-300 mt-2">
                <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.color} ${statusConfig.glow}`}></div>
                <span>{statusConfig.text}</span>
            </div>
            {status === 'error' && error && <p className="text-xs text-red-400 mt-1 max-w-xs">{error}</p>}
        </div>
    );
};

import { usePortfolioStore } from '../stores/portfolioStore';
import { useTransactionStore } from '../stores/transactionStore';
import { usePriceStore } from '../stores/priceStore';
import { api } from '../services/api';

interface PerformanceChartPageProps {}

type TimeRange = '7D' | '14D' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface ChartDataPoint {
    date: string;
    'My Portfolio'?: number;
    'S&P 500'?: number;
    'SCHG'?: number;
    'Gold'?: number;
    'Bitcoin'?: number;
}

const getStartDateForRange = (range: TimeRange, allData: HistoricalDataPoint[]): string => {
    const today = new Date();
    switch (range) {
        case '7D': today.setDate(today.getDate() - 7); break;
        case '14D': today.setDate(today.getDate() - 14); break;
        case '1M': today.setMonth(today.getMonth() - 1); break;
        case '3M': today.setMonth(today.getMonth() - 3); break;
        case '6M': today.setMonth(today.getMonth() - 6); break;
        case '1Y': today.setFullYear(today.getFullYear() - 1); break;
        case 'ALL':
        default: return allData.length > 0 ? allData[0].date : new Date().toISOString().split('T')[0];
    }
    return today.toISOString().split('T')[0];
};

const PerformanceChartPage: React.FC<PerformanceChartPageProps> = () => {
    const { activePortfolioId, portfolios } = usePortfolioStore();
    const { transactions, fetchTransactions } = useTransactionStore();
    
    // Local state for API tracking and caching that was previously in App.tsx
    const [historicalDataCache, setHistoricalDataCache] = useState<Record<string, HistoricalDataPoint[]>>({});
    const [rawPriceDataCache, setRawPriceDataCache] = useState<Record<string, Record<string, Record<string, number>>>>({});
    const [chartApiStatus, setChartApiStatus] = useState<Record<string, ChartApiStatus>>({});
    const [fetchProgress, setFetchProgress] = useState<Record<string, FetchProgress>>({});
    const [isApiPaused, setIsApiPaused] = useState(false);
    
    // UI state
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(activePortfolioId || (portfolios.length > 0 ? portfolios[0].id : null));
    const [displayMethod, onDisplayMethodChange] = useState<DisplayMethod>('TWR');

    useEffect(() => {
        if (activePortfolioId) {
            setSelectedPortfolioId(activePortfolioId);
        } else if (portfolios.length > 0 && !selectedPortfolioId) {
            setSelectedPortfolioId(portfolios[0].id);
        }
    }, [activePortfolioId, portfolios]);

    useEffect(() => {
        if (selectedPortfolioId) {
            fetchTransactions(selectedPortfolioId);
        }
    }, [selectedPortfolioId, fetchTransactions]);
    
    const onForceRefresh = useCallback((portfolioId: string | null) => {
        if (!portfolioId) return;
        setHistoricalDataCache(prev => ({ ...prev, [portfolioId]: [] }));
        setRawPriceDataCache(prev => { const n = {...prev}; delete n[portfolioId]; return n; });
        setChartApiStatus(prev => ({ ...prev, [portfolioId]: { status: 'loading', error: null } }));
        if (portfolioId) fetchTransactions(portfolioId);
    }, [fetchTransactions]);
    const [timeRange, setTimeRange] = useState<TimeRange>('3M');
    const [visibleLines, setVisibleLines] = useState({ 'My Portfolio': true, 'S&P 500': true, 'SCHG': true, 'Gold': true, 'Bitcoin': true });
    
    const [fullPeriodData, setFullPeriodData] = useState<ChartDataPoint[]>([]);
    const [displayData, setDisplayData] = useState<ChartDataPoint[]>([]);
    const [zoomDomain, setZoomDomain] = useState<{ startIndex: number; endIndex: number } | null>(null);

    const selectedPortfolio = useMemo(() => portfolios.find(p => p.id === selectedPortfolioId), [portfolios, selectedPortfolioId]);
    const selectedApiState = useMemo(() => chartApiStatus[selectedPortfolioId || ''] || { status: 'idle' as const, error: null }, [chartApiStatus, selectedPortfolioId]);
    const selectedHistoricalData = useMemo(() => historicalDataCache[selectedPortfolioId || ''] || [], [historicalDataCache, selectedPortfolioId]);
    const selectedProgress = useMemo(() => (fetchProgress[selectedPortfolioId || ''] || { progress: 0, details: { current: 0, total: 0 }, phase: 'idle' }) as FetchProgress, [fetchProgress, selectedPortfolioId]);
    const isLoading = selectedApiState.status === 'loading';
    const error = selectedApiState.error;

    // Fetch historical prices on mount or when portfolio changes
    useEffect(() => {
        if (!selectedPortfolioId) return;
        const portfolioId = selectedPortfolioId;
        const portfolioTxs = transactions.filter(t => (t.portfolio_id === portfolioId || (t as any).portfolioId === portfolioId) && t.status !== 'CANCELLED');
        
        if (portfolioTxs.length === 0) {
            setChartApiStatus(prev => ({ ...prev, [portfolioId]: { status: 'idle', error: null } }));
            return;
        }

        const fetchPricesForChart = async () => {
            setChartApiStatus(prev => ({ ...prev, [portfolioId]: { status: 'loading', error: null } }));
            setFetchProgress(prev => ({ ...prev, [portfolioId]: { phase: 'fetching_api', progress: 0, details: { current: 0, total: 1 } } }));

            try {
                const sortedTxs = [...portfolioTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const firstTxDate = new Date(sortedTxs[0].date);
                // Go back a few extra days to ensure we have a starting price
                firstTxDate.setDate(firstTxDate.getDate() - 7);
                const fromDate = firstTxDate.toISOString().split('T')[0];
                const toDate = new Date().toISOString().split('T')[0];
                
                const uniqueSymbols = Array.from(new Set([
                    ...portfolioTxs.filter(t => t.asset !== 'Cash' && t.symbol && t.symbol !== 'CASH').map(t => t.symbol),
                    'SPY', 'SCHG', 'GLD', 'BTC-USD'
                ]));

                setFetchProgress(prev => ({ ...prev, [portfolioId]: { phase: 'fetching_api', progress: 50, details: { current: 1, total: 1 }, currentSymbol: 'All Symbols' } }));

                const data = await api.prices.historical(uniqueSymbols, fromDate, toDate);
                
                const formattedPriceData: Record<string, Record<string, number>> = {};
                for (const symbol of uniqueSymbols) {
                    formattedPriceData[symbol] = {};
                    if (data[symbol]) {
                        data[symbol].forEach((point: any) => {
                            formattedPriceData[symbol][point.date] = point.price;
                        });
                    }
                }

                setRawPriceDataCache(prev => ({ ...prev, [portfolioId]: formattedPriceData }));
                setChartApiStatus(prev => ({ ...prev, [portfolioId]: { status: 'success', error: null } }));
                setFetchProgress(prev => ({ ...prev, [portfolioId]: { phase: 'idle', progress: 100, details: { current: 1, total: 1 } } }));
            } catch (err: any) {
                console.error('Failed to fetch historical data for chart', err);
                setChartApiStatus(prev => ({ ...prev, [portfolioId]: { status: 'error', error: err.message || 'Failed to fetch prices' } }));
            }
        };

        if (!rawPriceDataCache[portfolioId] || Object.keys(rawPriceDataCache[portfolioId]).length === 0) {
            fetchPricesForChart();
        }
    }, [selectedPortfolioId, transactions, rawPriceDataCache]);

    // --- Calculate TWR and update historicalDataCache ---
    const calculateTwr = useCallback((portfolioId: string) => {
        const portfolio = portfolios.find(p => p.id === portfolioId);
        const portfolioTxs = transactions.filter(t => (t.portfolio_id === portfolioId || (t as any).portfolioId === portfolioId) && t.status !== 'CANCELLED');
        const priceData = rawPriceDataCache[portfolioId];

        if (!portfolio || portfolioTxs.length === 0 || !priceData) {
            setHistoricalDataCache(prev => ({...prev, [portfolioId]: [] }));
            setChartApiStatus(prev => ({...prev, [portfolioId]: { status: 'success', error: null }}));
            return;
        }

        const sortedTxs = portfolioTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstTxDate = new Date(new Date(sortedTxs[0].date).toISOString().split('T')[0]);
        
        const allPriceDates = Object.values(priceData).flatMap((p: Record<string, number>) => Object.keys(p)).filter(Boolean);
        const lastPriceDate = new Date(Math.max(...allPriceDates.map(d => new Date(d).getTime())));
        
        const findPrice = (dateStr: string, symbol: string, lastKnown: { price: number }) => {
            if (priceData[symbol]?.[dateStr]) {
                lastKnown.price = priceData[symbol][dateStr];
            }
            return lastKnown.price || 0;
        };

        let holdings: Record<string, number> = {};
        let cash = portfolio.initial_cash;
        let cumulativeTwrFactor = 1.0;
        let lastKnownPrices: Record<string, { price: number }> = {};
        
        const allSymbols = Array.from(new Set(Object.keys(priceData)));
        allSymbols.forEach(s => { lastKnownPrices[s] = { price: 0 } });
        
        let navYesterday = portfolio.initial_cash;
        const performanceData: HistoricalDataPoint[] = [];
        
        for (let d = new Date(firstTxDate); d <= lastPriceDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            let dailyExternalFlows = 0;

            const txsOnDay = sortedTxs.filter(tx => new Date(tx.date).toISOString().split('T')[0] === dateStr);
            txsOnDay.forEach(tx => {
                const amount = tx.amount || 0;
                const price = tx.price || 1;
                const fee = tx.fee || 0;

                switch (tx.type) {
                    case 'BUY':
                        if (tx.asset === 'Cash' || tx.symbol === 'CASH') {
                            cash += amount;
                            dailyExternalFlows += amount;
                        } else {
                            holdings[tx.symbol] = (holdings[tx.symbol] || 0) + amount;
                            cash -= (amount * price) + fee;
                        }
                        break;
                    case 'SELL':
                        if (tx.asset === 'Cash' || tx.symbol === 'CASH') {
                            cash -= amount;
                            dailyExternalFlows -= amount;
                        } else {
                            holdings[tx.symbol] = (holdings[tx.symbol] || 0) - amount;
                            cash += (amount * price) - fee;
                        }
                        break;
                    case 'DEPOSIT':
                        cash += amount;
                        dailyExternalFlows += amount;
                        break;
                    case 'WITHDRAW':
                        cash -= amount;
                        dailyExternalFlows -= amount;
                        break;
                    case 'DIVIDEND':
                    case 'INTEREST':
                        cash += amount;
                        break;
                }
            });

            let navToday = cash;
            for (const symbol in holdings) {
                 const price = findPrice(dateStr, symbol, lastKnownPrices[symbol]);
                 navToday += (holdings[symbol] || 0) * price;
            }

            if (navYesterday > 1e-9) {
                const dailyReturnFactor = (navToday - dailyExternalFlows) / navYesterday;
                cumulativeTwrFactor *= dailyReturnFactor;
            }

            navYesterday = navToday;

            performanceData.push({
                date: dateStr,
                portfolioValue: (cumulativeTwrFactor - 1) * 100,
                spyPrice: findPrice(dateStr, 'SPY', lastKnownPrices['SPY']),
                schgPrice: findPrice(dateStr, 'SCHG', lastKnownPrices['SCHG']),
                goldPrice: findPrice(dateStr, 'GLD', lastKnownPrices['GLD']),
                btcPrice: findPrice(dateStr, 'BTC-USD', lastKnownPrices['BTC-USD']),
            });
        }
        
        setHistoricalDataCache(prev => ({...prev, [portfolioId]: performanceData }));
        setChartApiStatus(prev => ({...prev, [portfolioId]: { status: 'success', error: null }}));
    }, [portfolios, transactions, rawPriceDataCache, setHistoricalDataCache, setChartApiStatus]);

    // --- Calculate MWR (Modified Dietz) chart data ---
    const calculateMwr = useCallback((portfolioId: string) => {
        const portfolio = portfolios.find(p => p.id === portfolioId);
        const portfolioTxs = transactions.filter(t => (t.portfolio_id === portfolioId || (t as any).portfolioId === portfolioId) && t.status !== 'CANCELLED');
        const priceData = rawPriceDataCache[portfolioId];

        if (!portfolio || portfolioTxs.length === 0 || !priceData) {
            setHistoricalDataCache(prev => ({ ...prev, [portfolioId]: [] }));
            setChartApiStatus(prev => ({ ...prev, [portfolioId]: { status: 'success', error: null } }));
            return;
        }

        const sortedTxs = portfolioTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstTxDate = new Date(new Date(sortedTxs[0].date).toISOString().split('T')[0]);
        const allPriceDates = Object.values(priceData).flatMap((p: Record<string, number>) => Object.keys(p)).filter(Boolean);
        const lastPriceDate = new Date(Math.max(...allPriceDates.map(d => new Date(d).getTime())));

        const findPrice = (dateStr: string, symbol: string, lastKnown: { price: number }) => {
            if (priceData[symbol]?.[dateStr]) {
                lastKnown.price = priceData[symbol][dateStr];
            }
            return lastKnown.price || 0;
        };

        let holdings: Record<string, number> = {};
        let cash = portfolio.initial_cash;
        const lastKnownPrices: Record<string, { price: number }> = {};
        const allSymbols = Array.from(new Set(Object.keys(priceData)));
        allSymbols.forEach(s => { lastKnownPrices[s] = { price: 0 } });

        const performanceData: HistoricalDataPoint[] = [];
        const BMV = portfolio.initial_cash;
        const cashFlows: { date: Date, amount: number }[] = [];

        for (let d = new Date(firstTxDate); d <= lastPriceDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const currentDate = new Date(dateStr);

            const txsOnDay = sortedTxs.filter(tx => new Date(tx.date).toISOString().split('T')[0] === dateStr);
            txsOnDay.forEach(tx => {
                const amount = tx.amount || 0;
                const price = tx.price || 1;
                const fee = tx.fee || 0;
                
                switch (tx.type) {
                    case 'BUY':
                        if (tx.asset === 'Cash' || tx.symbol === 'CASH') {
                            cash += amount;
                            cashFlows.push({ date: currentDate, amount });
                        } else {
                            holdings[tx.symbol] = (holdings[tx.symbol] || 0) + amount;
                            cash -= (amount * price) + fee;
                        }
                        break;
                    case 'SELL':
                        if (tx.asset === 'Cash' || tx.symbol === 'CASH') {
                            cash -= amount;
                            cashFlows.push({ date: currentDate, amount: -amount });
                        } else {
                            holdings[tx.symbol] = (holdings[tx.symbol] || 0) - amount;
                            cash += (amount * price) - fee;
                        }
                        break;
                    case 'DEPOSIT':
                        cash += amount;
                        cashFlows.push({ date: currentDate, amount });
                        break;
                    case 'WITHDRAW':
                        cash -= amount;
                        cashFlows.push({ date: currentDate, amount: -amount });
                        break;
                    case 'DIVIDEND':
                    case 'INTEREST':
                        cash += amount;
                        break;
                }
            });

            let EMV = cash;
            for (const symbol in holdings) {
                EMV += (holdings[symbol] || 0) * findPrice(dateStr, symbol, lastKnownPrices[symbol]);
            }

            const CD = Math.max(1, (currentDate.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24));
            
            let sumCF = 0;
            let sumWCF = 0;

            cashFlows.forEach(cf => {
                const Di = (cf.date.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24);
                const Wi = (CD - Di) / CD;
                sumCF += cf.amount;
                sumWCF += (Wi * cf.amount);
            });

            let mwrPercent = 0;
            const denominator = BMV + sumWCF;
            if (Math.abs(denominator) > 0.01) {
                mwrPercent = ((EMV - BMV - sumCF) / denominator) * 100;
            }

            performanceData.push({
                date: dateStr,
                portfolioValue: mwrPercent,
                spyPrice: findPrice(dateStr, 'SPY', lastKnownPrices['SPY']),
                schgPrice: findPrice(dateStr, 'SCHG', lastKnownPrices['SCHG']),
                goldPrice: findPrice(dateStr, 'GLD', lastKnownPrices['GLD']),
                btcPrice: findPrice(dateStr, 'BTC-USD', lastKnownPrices['BTC-USD']),
            });
        }

        setHistoricalDataCache(prev => ({ ...prev, [portfolioId]: performanceData }));
        setChartApiStatus(prev => ({ ...prev, [portfolioId]: { status: 'success', error: null } }));
    }, [portfolios, transactions, rawPriceDataCache, setHistoricalDataCache, setChartApiStatus]);

    // --- Main Effect to orchestrate calculating from parent-loaded data ---
    useEffect(() => {
        if (!selectedPortfolioId) return;
        
        const portfolioId = selectedPortfolioId;
        const currentStatus = chartApiStatus[portfolioId]?.status;
        const hasRawData = !!rawPriceDataCache[portfolioId] && Object.keys(rawPriceDataCache[portfolioId]).length > 0;

        if (hasRawData && currentStatus !== 'error') {
            if (displayMethod === 'TWR') {
                calculateTwr(portfolioId);
            } else {
                calculateMwr(portfolioId);
            }
        }
    }, [selectedPortfolioId, rawPriceDataCache, displayMethod, calculateTwr, calculateMwr]);


    // Effect to calculate base performance for the selected TimeRange
    useEffect(() => {
        setZoomDomain(null);
        if (selectedHistoricalData.length === 0) {
            setFullPeriodData([]); setDisplayData([]); return;
        }

        const rangeStartDate = getStartDateForRange(timeRange, selectedHistoricalData);
        const dataInRange = selectedHistoricalData.filter(d => d.date >= rangeStartDate);
        if (dataInRange.length === 0) {
            setFullPeriodData([]); setDisplayData([]); return;
        }

        const baseDataPoint = dataInRange[0];
        const basePortfolioTwr = baseDataPoint.portfolioValue;
        const baseSpy = baseDataPoint.spyPrice;
        const baseSchg = baseDataPoint.schgPrice;
        const baseGold = baseDataPoint.goldPrice;
        const baseBtc = baseDataPoint.btcPrice;

        const processedData = dataInRange.map(d => {
            const portfolioReturn = (basePortfolioTwr !== undefined && d.portfolioValue !== undefined) ? (((1 + d.portfolioValue / 100) / (1 + basePortfolioTwr / 100)) - 1) * 100 : undefined;
            const spyReturn = (baseSpy && d.spyPrice) ? ((d.spyPrice / baseSpy) - 1) * 100 : undefined;
            const schgReturn = (baseSchg && d.schgPrice) ? ((d.schgPrice / baseSchg) - 1) * 100 : undefined;
            const goldReturn = (baseGold && d.goldPrice) ? ((d.goldPrice / baseGold) - 1) * 100 : undefined;
            const btcReturn = (baseBtc && d.btcPrice) ? ((d.btcPrice / baseBtc) - 1) * 100 : undefined;

            return { 
                date: d.date, 
                'My Portfolio': portfolioReturn, 
                'S&P 500': spyReturn, 
                'SCHG': schgReturn,
                'Gold': goldReturn,
                'Bitcoin': btcReturn,
            };
        });
        setFullPeriodData(processedData);
        setDisplayData(processedData);
    }, [selectedHistoricalData, timeRange]);

    // Effect to re-base and slice data when zoomDomain changes
    useEffect(() => {
        if (!zoomDomain) {
            setDisplayData(fullPeriodData);
            return;
        }
        const visibleData = fullPeriodData.slice(zoomDomain.startIndex, zoomDomain.endIndex + 1);
        if (visibleData.length > 0) {
            const baseline = visibleData[0];
            const rebasedData = visibleData.map(d => ({
                date: d.date,
                'My Portfolio': d['My Portfolio'] !== undefined && baseline['My Portfolio'] !== undefined ? d['My Portfolio'] - baseline['My Portfolio'] : undefined,
                'S&P 500': d['S&P 500'] !== undefined && baseline['S&P 500'] !== undefined ? d['S&P 500'] - baseline['S&P 500'] : undefined,
                'SCHG': d['SCHG'] !== undefined && baseline['SCHG'] !== undefined ? d['SCHG'] - baseline['SCHG'] : undefined,
                'Gold': d['Gold'] !== undefined && baseline['Gold'] !== undefined ? d['Gold'] - baseline['Gold'] : undefined,
                'Bitcoin': d['Bitcoin'] !== undefined && baseline['Bitcoin'] !== undefined ? d['Bitcoin'] - baseline['Bitcoin'] : undefined,
            }));
            setDisplayData(rebasedData);
        } else {
            setDisplayData([]);
        }
    }, [zoomDomain, fullPeriodData]);

    const handleBrushChange = (e: any) => {
        if (e && e.startIndex !== null && e.endIndex !== null) {
            setZoomDomain({ startIndex: e.startIndex, endIndex: e.endIndex });
        }
    };

    const handleForceRefresh = useCallback(() => {
        onForceRefresh(selectedPortfolioId);
    }, [onForceRefresh, selectedPortfolioId]);

    // --- Custom label component for the end of each line ---
    const EndOfLineLabel = (props: any) => {
        const { index, value, x, y, stroke, dataKey } = props;
    
        if (index !== displayData.length - 1) {
            return null;
        }
    
        if (value === undefined || value === null || !isFinite(value)) {
            return null;
        }
    
        let yOffset = 0;
        // Apply vertical offset to prevent 'My Portfolio' and 'SCHG' from overlapping
        if (dataKey === 'My Portfolio') {
            yOffset = -12;
        } else if (dataKey === 'SCHG') {
            yOffset = 12;
        }
    
        const formattedValue = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
        const textWidth = formattedValue.length * 7 + 16; // Add more padding
    
        return (
            <g transform={`translate(0, ${yOffset})`}>
                <rect 
                    x={x + 8} 
                    y={y - 11} 
                    width={textWidth} 
                    height={22} 
                    fill="#111827" // Solid dark background
                    stroke={stroke} // Border color matches line
                    strokeWidth="1"
                    rx="4" 
                />
                <text 
                    x={x + 8 + (textWidth / 2)} // Center text inside the rect
                    y={y + 4} // Adjust vertical alignment
                    fill="#F1F5F9" // Bright white text
                    fontSize="12px" 
                    fontWeight="bold"
                    fontFamily="'Roboto Flex', sans-serif"
                    style={{ 
                        fontFeatureSettings: "'tnum'",
                        textShadow: '0 1px 3px rgba(0,0,0,0.7)', // Add text shadow
                    }}
                    textAnchor="middle"
                >
                    {formattedValue}
                </text>
            </g>
        );
    };

    const resetZoom = () => setZoomDomain(null);
    const handleVisibilityChange = (line: keyof typeof visibleLines) => { setVisibleLines(prev => ({ ...prev, [line]: !prev[line] })); };
    const lineColors = { 
        'My Portfolio': '#FFC300', 
        'S&P 500': '#9013FE', 
        'SCHG': '#F5A623',
        'Gold': '#EAB308',
        'Bitcoin': '#F97316'
    };
    const lastDataPoint = displayData.length > 0 ? displayData[displayData.length - 1] : null;

    const handleExportExcel = () => {
        const dataToExport = displayData.map(d => ({
            Date: d.date,
            'My Portfolio (%)': d['My Portfolio']?.toFixed(4),
            'S&P 500 (%)': d['S&P 500']?.toFixed(4),
            'SCHG (%)': d['SCHG']?.toFixed(4),
            'Gold (%)': d['Gold']?.toFixed(4),
            'Bitcoin (%)': d['Bitcoin']?.toFixed(4),
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'performance_data');
        const portfolioName = portfolios.find(p => p.id === selectedPortfolioId)?.name || 'Portfolio';
        XLSX.writeFile(workbook, `performance_${portfolioName.replace(/ /g, '_')}_${timeRange}.xlsx`);
    };

    const getLoadingMessage = () => {
        const { phase, details, currentSymbol, progress } = selectedProgress;
        const detailsText = details.total > 0 ? `(${details.current}/${details.total})` : '';
        const progressSuffix = progress > 0 ? ` ${Math.floor(progress)}% complete` : '';

        switch (phase) {
            case 'checking_cache':
                return `Checking Supabase cache for historical data...`;
            case 'paused':
                return `API Fetch Paused.`;
            case 'fetching_api':
                return `Fetching API for ${currentSymbol}... ${detailsText}${progressSuffix}`;
            case 'saving_to_cache':
                return `Saving new prices to Supabase cache...`;
            case 'calculating':
                return "All price data loaded. Calculating chart values...";
            default:
                return `Initializing...`;
        }
    };
    
    const chartTitle = selectedPortfolio 
        ? `Performance - ${selectedPortfolio.name} (${displayMethod === 'TWR' ? 'Investment Return (TWR)' : 'Personal Return (MWR)'})`
        : 'Performance';

    return (
        <div className="w-full h-full min-h-[calc(100vh-80px)]">
            <main className="w-full md:p-6 bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl shadow-inner shadow-black/30 overflow-y-auto">
                <div className="p-4">
                    <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                {chartTitle}
                            </h2>
                            <ApiStatusIndicator status={selectedApiState.status} error={error} progress={selectedProgress} />
                             <div className="flex items-center space-x-4 mt-4">
                                {Object.entries(lineColors).map(([name, color]) => {
                                    const dataKey = name as keyof ChartDataPoint;
                                    const isVisible = visibleLines[name as keyof typeof visibleLines];
                                    const finalValue = lastDataPoint && lastDataPoint[dataKey] !== undefined ? lastDataPoint[dataKey] : null;

                                    let valueNode: React.ReactNode = null;
                                    // This shows the value in the legend; the EndOfLineLabel shows it on the chart
                                    if (isVisible && typeof finalValue === 'number' && isFinite(finalValue)) {
                                        const valueColor = finalValue >= 0 ? 'text-green-400' : 'text-red-400';
                                        valueNode = (
                                            <span className={`ml-2 font-mono text-xs ${valueColor}`}>
                                                ({finalValue >= 0 ? '+' : ''}{finalValue.toFixed(2)}%)
                                            </span>
                                        );
                                    }

                                    return (
                                        <div key={name} className="flex items-center">
                                            <input id={`checkbox-${name}`} type="checkbox" checked={isVisible} onChange={() => handleVisibilityChange(name as keyof typeof visibleLines)} className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-600 cursor-pointer" style={{accentColor: color}} />
                                            <label htmlFor={`checkbox-${name}`} className="ml-2 flex items-center text-sm text-gray-300 cursor-pointer">
                                                <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: color }}></span>
                                                {name}
                                            </label>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="flex items-center bg-gray-800 p-1 rounded-md text-sm">
                             <button onClick={handleForceRefresh} disabled={isLoading} title="Clear cache and re-fetch all historical data for this portfolio" className="px-3 py-1 rounded-md text-xs bg-yellow-600 hover:bg-yellow-500 text-white flex items-center space-x-2 mr-2 disabled:bg-gray-600 disabled:cursor-not-allowed">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                                <span>Force Refresh</span>
                            </button>
                             <button onClick={handleExportExcel} disabled={isLoading || !!error} className="px-3 py-1 rounded-md text-xs bg-teal-600 hover:bg-teal-500 text-white flex items-center space-x-2 mr-2 disabled:bg-gray-600 disabled:cursor-not-allowed">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                <span>Export Excel</span>
                            </button>
                             {zoomDomain && (
                                <button onClick={resetZoom} className="px-3 py-1 rounded-md text-xs bg-gray-600 hover:bg-gray-500 text-white mr-2">Reset Zoom</button>
                            )}
                            {(['7D', '14D', '1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map(range => (
                                <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1 rounded-md text-xs transition-colors ${timeRange === range ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.7)]' : 'text-gray-400 hover:bg-gray-700'}`}>{range}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end mb-4">
                        <div className="flex items-center bg-gray-800/60 border border-gray-700 p-0.5 rounded-md text-sm">
                            <button onClick={() => onDisplayMethodChange('TWR')} className={`px-2 py-0.5 rounded-md text-xs transition-colors ${displayMethod === 'TWR' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`} title="Measures investment strategy performance. Ignores deposits/withdrawals. GIPS standard. Best for comparing vs S&P 500.">Investment Return (TWR)</button>
                            <button onClick={() => onDisplayMethodChange('MWR')} className={`px-2 py-0.5 rounded-md text-xs transition-colors ${displayMethod === 'MWR' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`} title="Measures your actual return including timing of deposits/withdrawals. Shows what you personally earned.">Personal Return (MWR)</button>
                        </div>
                    </div>

                    <div className="bg-[#111827] rounded-lg shadow-2xl p-6 h-[60vh] min-h-[400px]">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span className="mt-4 text-lg">{getLoadingMessage()}</span>
                                <div className="w-3/4 max-w-sm mt-2 bg-gray-700 rounded-full h-2.5">
                                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-linear" style={{ width: `${selectedProgress.progress}%` }}></div>
                                </div>
                                <span className="text-xs mt-2 text-gray-500">This may take a minute due to API rate limits. Data is cached locally per portfolio.</span>
                                { (selectedProgress.phase === 'fetching_api' || selectedProgress.phase === 'paused') && (
                                    <button
                                        onClick={() => setIsApiPaused(prev => !prev)}
                                        className={`mt-6 px-4 py-2 rounded-md font-semibold text-white transition-colors ${
                                            isApiPaused
                                                ? 'bg-green-600 hover:bg-green-500'
                                                : 'bg-yellow-600 hover:bg-yellow-500'
                                        }`}
                                    >
                                        {isApiPaused ? 'Resume API Fetch' : 'Pause API Fetch'}
                                    </button>
                                )}
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center h-full text-red-400 text-center">{error}</div>
                        ) : fullPeriodData.length === 0 ? (
                             <div className="flex items-center justify-center h-full text-gray-500">
                                No historical performance data available for this portfolio.
                             </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={displayData} margin={{ top: 5, right: 90, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                    <XAxis dataKey="date" stroke="#9CA3AF" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} name="Date" />
                                    <YAxis stroke="#9CA3AF" tickFormatter={(tick) => `${tick.toFixed(0)}%`} domain={['auto', 'auto']} allowDataOverflow name="Cumulative Return (%)" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend content={() => null} />
                                    {Object.entries(visibleLines).map(([name, isVisible]) => (
                                        isVisible && <Line key={name} type="monotone" dataKey={name} stroke={lineColors[name as keyof typeof lineColors]} dot={false} strokeWidth={name === 'My Portfolio' ? 4 : 2} name={name} connectNulls={true} label={<EndOfLineLabel />} />
                                    ))}
                                    <Brush dataKey="date" data={fullPeriodData} height={40} stroke="#4A90E2" travellerWidth={20} fill="rgba(255,255,255,0.05)" onChange={handleBrushChange}>
                                        <LineChart>
                                            <Line dataKey="My Portfolio" stroke={lineColors['My Portfolio']} dot={false} strokeWidth={1} />
                                        </LineChart>
                                    </Brush>
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PerformanceChartPage;