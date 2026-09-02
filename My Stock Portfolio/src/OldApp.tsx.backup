import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MainPage from './components/MainPage';
import AnalysisPage from './components/AnalysisPage';
import TransactionPage from './components/TransactionPage';
import SettingPage from './components/SettingPage';
import PerformanceChartPage from './components/PerformanceChartPage';
import ChangelogPage from './components/ChangelogPage';
import AllocationPlannerPage from './components/AllocationPlannerPage';
import { Portfolio, Transaction, PortfolioItem, SummaryData, HistoricalDataPoint, ChartApiStatus, FetchProgress, SupabaseLatestPrice, LivePriceFetchStatus, SnapshotBackfillStatus, DisplayMethod } from './types';
import { supabase } from './lib/supabaseClient';
import { basePortfolioSeeds } from './data/portfolioData';
import { seedTransactions } from './data/seedTransactions';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import { logActivity } from './lib/activityLogger';
import { backfillPortfolioSnapshots, calculateSimpleReturn } from './lib/calculatePortfolioSnapshot';
import { buildPortfolioSelector } from './selectors/portfolio';

// --- Type Definitions ---
type ApiStatus = 'valid' | 'default' | 'error' | 'testing' | 'untested';
type ActionableNotification = {
  id: number;
  message: string;
  type: 'success' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
};
type LoadingPhase = 'loading' | 'selecting' | 'ready';
interface StockMetadata { name: string; sector: string; logo: string; }

// --- Constants ---
const DEFAULT_FINNHUB_KEY = 'd383nj1r01qlbdj3p8q0d383nj1r01qlbdj3p8qg';
const DEFAULT_POLYGON_KEY = 'nU1_qIjq8inMDa7CXUjPETsl6TY0OHQD';
const FALLBACK_EXCHANGE_RATE = 36.5;


// --- Toast Component ---
const Toast: React.FC<ActionableNotification & { onDismiss: () => void }> = ({ message, type, action, onDismiss }) => {
  useEffect(() => {
    if (!action) {
      const timer = setTimeout(onDismiss, 20000);
      return () => clearTimeout(timer);
    }
  }, [action, onDismiss]);

  const baseClasses = "flex items-center justify-between w-full max-w-sm p-4 text-gray-200 bg-gray-800 rounded-lg shadow-lg border";
  const typeClasses = type === 'success' ? 'border-green-500/50' : 'border-red-500/50';

  return (
    <div className={`${baseClasses} ${typeClasses} animate-fade-in-up`} role="alert">
      <div className="flex items-center">
        {type === 'success' ? (
          <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        ) : (
          <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
        )}
        <p className="ml-3 text-sm font-medium">{message}</p>
      </div>
      <div className="flex items-center ml-4">
        {action && (
          <button onClick={action.onClick} className="text-sm font-semibold text-blue-400 hover:text-blue-300 bg-blue-600/20 hover:bg-blue-600/40 px-3 py-1 rounded-md mr-2">
            {action.label}
          </button>
        )}
        <button onClick={onDismiss} className="p-1.5 rounded-full hover:bg-gray-700">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        </button>
      </div>
    </div>
  );
};


export function App() {
  // --- State Management ---
  const [activePage, setActivePage] = useState<string>('Portfolio');
  const [rawPortfolios, setRawPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [latestPrices, setLatestPrices] = useState<Record<string, SupabaseLatestPrice>>({});
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('loading');
  const [dbError, setDbError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ActionableNotification[]>([]);
  const [currency, setCurrency] = useState<'USD' | 'THB'>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(FALLBACK_EXCHANGE_RATE);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('untested');
  const [livePriceFetchStatus, setLivePriceFetchStatus] = useState<LivePriceFetchStatus>({ phase: 'idle', progress: 0, details: { current: 0, total: 0 } });
  const [justUpdatedSymbols, setJustUpdatedSymbols] = useState(new Set<string>());
  const [autoRefreshSettings, setAutoRefreshSettings] = useState<Record<string, boolean>>({});
  const [viewedPortfolioId, setViewedPortfolioId] = useState<string | null>(null);
  const [historicalDataCache, setHistoricalDataCache] = useState<Record<string, HistoricalDataPoint[]>>({});
  const [rawPriceDataCache, setRawPriceDataCache] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [chartApiStatus, setChartApiStatus] = useState<Record<string, ChartApiStatus>>({});
  const [fetchProgress, setFetchProgress] = useState<Record<string, FetchProgress>>({});
  const [marketStatus, setMarketStatus] = useState<'open' | 'closed' | 'unknown'>('unknown');
  const [snapshotBackfillStatus, setSnapshotBackfillStatus] = useState<Record<string, SnapshotBackfillStatus>>({});
  const [isApiPaused, setIsApiPaused] = useState(false);
  const [stockMetadata, setStockMetadata] = useState<Record<string, StockMetadata>>({});
  const [isSwitchingPortfolio, setIsSwitchingPortfolio] = useState(false);
  const [displayMethod, setDisplayMethod] = useState<DisplayMethod>('TWR');
  
  const autoRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processedPortfoliosRef = useRef(new Set<string>());
  const isPausedRef = useRef(isApiPaused);
  useEffect(() => { isPausedRef.current = isApiPaused; }, [isApiPaused]);

  // --- Notification System ---
  const addNotification = useCallback((message: string, type: 'success' | 'error', action?: ActionableNotification['action']) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, action }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // --- Portfolio Calculation Logic ---
  const calculatePortfolioData = useCallback((allTransactions: Transaction[], currentPortfolios: Portfolio[], currentLatestPrices: Record<string, SupabaseLatestPrice>): Portfolio[] => {
    // 1. Prepare data for the selector
    const selectorTxs: Parameters<typeof buildPortfolioSelector>[0] = allTransactions.map(t => ({
      portfolio_id: t.portfolioId,
      date: t.date,
      symbol: t.symbol,
      type: t.type, // The selector handles BUY/SELL on 'Cash' asset as deposits/withdrawals
      asset: t.asset,
      amount: t.amount,
      price: t.price,
      fee: t.fee,
    }));

    // Add cash deposits from portfolio's initial_cash, which was previously ignored
    currentPortfolios.forEach(p => {
        if (p.initial_cash > 0) {
            selectorTxs.push({
                portfolio_id: p.id,
                date: p.created_at || new Date(0).toISOString(),
                symbol: 'CASH',
                // Changed type to 'BUY' for initial cash deposits to align with database constraints and selector logic.
                type: 'BUY',
                asset: 'Cash',
                amount: p.initial_cash,
                price: 1,
                fee: 0,
            });
        }
    });

    const selectorPrices = Object.entries(currentLatestPrices).reduce((acc, [symbol, priceInfo]) => {
        acc[symbol] = priceInfo.price;
        return acc;
    }, {} as Record<string, number>);

    // 2. Map over portfolios and run the selector
    return currentPortfolios.map(portfolio => {
        const overview = buildPortfolioSelector(selectorTxs, selectorPrices, portfolio.id);

        // 3. Map the overview back to the app's 'Portfolio' structure
        const portfolioData: PortfolioItem[] = overview.positions.map(pos => {
            const priceInfo = currentLatestPrices[pos.symbol];
            const totalCost = pos.marketValue - pos.unrealizedPnL;
            const dayChange = priceInfo?.change ?? 0;

            const originalTx = allTransactions.find(t => t.symbol === pos.symbol && t.portfolioId === portfolio.id);

            return {
                symbol: pos.symbol,
                name: '...', // Placeholder as before
                logo: '', // Placeholder as before
                lastPrice: pos.marketPrice,
                dayChange: dayChange,
                dayChangePercent: priceInfo?.percent_change ?? 0,
                dayReturn: pos.shares * dayChange,
                totalReturn: pos.unrealizedPnL,
                totalReturnPercent: pos.unrealizedPnLPct,
                quantity: pos.shares,
                avgCost: pos.avgCost,
                totalCost: totalCost,
                currentValue: pos.marketValue,
                portfolioPercent: overview.nav > 0 ? (pos.marketValue / overview.nav) * 100 : 0,
                sector: 'N/A', // Placeholder as before
                assetType: originalTx?.asset || 'Stock',
                stockType: originalTx?.stockType || null,
            };
        });

        const totalDayReturn = portfolioData.reduce((sum, item) => sum + item.dayReturn, 0);

        const cashSummary: SummaryData = {
            currentValue: overview.cashBalance,
            portfolioPercent: overview.nav > 0 ? (overview.cashBalance / overview.nav) * 100 : 0,
            dayReturn: 0,
            totalReturn: 0,
            totalReturnPercent: 0,
            totalCost: overview.cashBalance,
        };

        const totalCostOfHoldings = portfolioData.reduce((sum, p) => sum + p.totalCost, 0);

        const portfolioTxsForSimpleReturn = allTransactions.filter(tx => tx.portfolioId === portfolio.id);
        const simpleReturnData = calculateSimpleReturn(portfolioTxsForSimpleReturn, overview.nav);

        const totalSummary: SummaryData = {
            currentValue: overview.nav,
            totalCost: totalCostOfHoldings + cashSummary.currentValue, // NAV at cost
            totalReturn: overview.unrealizedPnL + overview.realizedPnL,
            dayReturn: totalDayReturn,
            totalReturnPercent: overview.invested > 0 
                ? ((overview.unrealizedPnL + overview.realizedPnL) / overview.invested) * 100 
                : 0,
            portfolioPercent: 100,
            simpleReturn: simpleReturnData,
        };
        
        return {
            ...portfolio,
            data: portfolioData,
            cash: cashSummary,
            total: totalSummary,
        };
    });
  }, []);

  // --- Reactive Portfolio Calculation ---
  const partiallyCalculatedPortfolios = useMemo(() => {
    return calculatePortfolioData(transactions, rawPortfolios, latestPrices);
  }, [transactions, rawPortfolios, latestPrices, calculatePortfolioData]);
  
  // --- Metadata Fetching Effect ---
  useEffect(() => {
    const fetchAndCacheMetadata = async () => {
        if (partiallyCalculatedPortfolios.length === 0) return;

        const allSymbols = new Set<string>();
        partiallyCalculatedPortfolios.forEach(p => p.data.forEach(item => allSymbols.add(item.symbol)));

        const symbolsToFetch = Array.from(allSymbols).filter(symbol => !stockMetadata[symbol] && symbol !== 'CASH');
        if (symbolsToFetch.length === 0) return;

        // 1. Check Supabase cache first
        const { data: dbData } = await supabase
            .from('stock_metadata')
            .select('symbol, name, sector, logo')
            .in('symbol', symbolsToFetch);
        
        const foundMetadata: Record<string, StockMetadata> = {};
        if (dbData) {
            dbData.forEach(item => {
                foundMetadata[item.symbol] = { name: item.name, sector: item.sector, logo: item.logo };
            });
            setStockMetadata(prev => ({ ...prev, ...foundMetadata }));
        }

        const symbolsStillMissing = symbolsToFetch.filter(symbol => !foundMetadata[symbol]);
        if (symbolsStillMissing.length === 0) return;

        // 2. Fetch from Finnhub API for the rest
        const apiKey = localStorage.getItem('finnhub_api_key') || DEFAULT_FINNHUB_KEY;
        const newMetadataToCache: (StockMetadata & { symbol: string })[] = [];
        const newMetadataForState: Record<string, StockMetadata> = {};

        for (const symbol of symbolsStillMissing) {
            try {
                const response = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`);
                if (!response.ok) continue;
                const profile: unknown = await response.json();
                
                // FIX: Safely handle 'unknown' from response.json()
                if (
                    profile &&
                    typeof profile === 'object'
                ) {
                    const p = profile as Record<string, unknown>;
                    if (
                        'finnhubIndustry' in p &&
                        p.finnhubIndustry &&
                        typeof p.finnhubIndustry === 'string'
                    ) {
                        const metadata: StockMetadata = {
                            name: typeof p.name === 'string' ? p.name : 'N/A',
                            sector: p.finnhubIndustry,
                            logo: typeof p.logo === 'string' ? p.logo : '',
                        };
                        newMetadataToCache.push({ symbol, ...metadata });
                        newMetadataForState[symbol] = metadata;
                    }
                }
                 await new Promise(resolve => setTimeout(resolve, 350)); // Rate limit
            } catch (e) { console.error(`Failed to fetch metadata for ${symbol}`, e); }
        }

        // 3. Update state and DB cache
        if (Object.keys(newMetadataForState).length > 0) {
            setStockMetadata(prev => ({ ...prev, ...newMetadataForState }));
            const { error: upsertError } = await supabase.from('stock_metadata').upsert(newMetadataToCache, { onConflict: 'symbol' });
            if (upsertError) console.error("Failed to cache stock metadata:", upsertError);
        }
    };

    const timer = setTimeout(fetchAndCacheMetadata, 500); // Debounce fetch
    return () => clearTimeout(timer);
  }, [partiallyCalculatedPortfolios]);

  // --- Final Portfolio merging metadata and detecting mode ---
  const portfolios = useMemo(() => {
    return partiallyCalculatedPortfolios.map(portfolio => {
        const dataWithMetadata = portfolio.data.map(item => {
            const metadata = stockMetadata[item.symbol];
            if (metadata) {
                return { ...item, name: metadata.name, sector: metadata.sector, logo: metadata.logo };
            }
            return item;
        });

        // Detect portfolio mode
        const portfolioTxs = transactions.filter(t => t.portfolioId === portfolio.id);
        const hasCashFlows = portfolioTxs.some(t => {
          // Traditional deposit/withdraw types
          if (t.type === 'DEPOSIT' || t.type === 'WITHDRAW') {
            return true;
          }
          
          // Cash transactions disguised as stock purchases (current system)
          if (t.symbol === 'CASH' && (t.type === 'BUY' || t.type === 'SELL')) {
            return true;
          }
          
          // Alternative asset-based check
          if (t.asset === 'Cash' && (t.type === 'BUY' || t.type === 'SELL')) {
            return true;
          }
          
          return false;
        }) || portfolio.initial_cash > 0;
        const portfolio_mode: 'CASH_AWARE' | 'STOCKS_ONLY' = hasCashFlows ? 'CASH_AWARE' : 'STOCKS_ONLY';

        return {
            ...portfolio,
            data: dataWithMetadata,
            portfolio_mode,
        };
    });
  }, [partiallyCalculatedPortfolios, stockMetadata, transactions]);

  // --- Display Method State Management ---
  useEffect(() => {
    if (selectedPortfolioId) {
        const portfolio = portfolios.find(p => p.id === selectedPortfolioId);
        const savedMethod = localStorage.getItem(`return_method_${selectedPortfolioId}`) as DisplayMethod;
        if (savedMethod) {
            setDisplayMethod(savedMethod);
        } else if (portfolio) {
            setDisplayMethod(portfolio.portfolio_mode === 'CASH_AWARE' ? 'TWR' : 'SIMPLE');
        } else {
            setDisplayMethod('TWR');
        }
    }
  }, [selectedPortfolioId, portfolios]);

  const handleDisplayMethodChange = useCallback((method: DisplayMethod) => {
    setDisplayMethod(method);
    if (selectedPortfolioId) {
        localStorage.setItem(`return_method_${selectedPortfolioId}`, method);
    }
  }, [selectedPortfolioId]);


  // --- Portfolio Selection ---
  const handleSelectPortfolio = (id: string | null) => {
    if (id === selectedPortfolioId) return;
    setIsSwitchingPortfolio(true);
    setSelectedPortfolioId(id);
  };

  useEffect(() => {
    if (isSwitchingPortfolio) {
        // This effect runs after portfolios are recalculated based on the new selectedPortfolioId
        const timer = setTimeout(() => setIsSwitchingPortfolio(false), 400); // Small delay for animations
        return () => clearTimeout(timer);
    }
  }, [portfolios, isSwitchingPortfolio]);
  
  // --- Historical Price Data Fetching (Moved from PerformanceChartPage) ---
    const fetchHistoricalPrices = useCallback(async (portfolioId: string | null) => {
        if (!portfolioId) return;

        const portfolio = portfolios.find(p => p.id === portfolioId);
        const portfolioTxs = transactions.filter(t => t.portfolioId === portfolioId);
        if (!portfolio || portfolioTxs.length === 0) {
            setChartApiStatus(prev => ({ ...prev, [portfolioId]: { status: 'idle', error: null } }));
            return;
        }

        setChartApiStatus(prev => ({ ...prev, [portfolioId]: { status: 'loading', error: null } }));

        const symbolsInPortfolio = Array.from(new Set(portfolioTxs.map(t => t.symbol).filter(s => s !== 'CASH')));
        const allSymbols = Array.from(new Set([...symbolsInPortfolio, 'SPY', 'SCHG']));

        setFetchProgress(prev => ({ ...prev, [portfolioId]: { phase: 'checking_cache', progress: 0, details: { current: 0, total: allSymbols.length } } }));
        const { data: cachedPrices, error: cacheError } = await supabase
            .from('historical_prices')
            .select('symbol, date, price')
            .in('symbol', allSymbols);
        
        if (cacheError) {
            setChartApiStatus(prev => ({ ...prev, [portfolioId]: { status: 'error', error: `Failed to fetch from cache: ${cacheError.message}` } }));
            return;
        }

        const priceDataFromCache: Record<string, Record<string, number>> = {};
        const latestDates: Record<string, string> = {};

        // FIX: Add type guard to safely process cached prices.
        if (Array.isArray(cachedPrices)) {
            for (const item of cachedPrices) {
                if (
                    item &&
                    typeof item === 'object' &&
                    'symbol' in item && typeof item.symbol === 'string' &&
                    'date' in item && typeof item.date === 'string' &&
                    'price' in item && typeof item.price === 'number'
                ) {
                    const { symbol, date, price } = item;
                    if (!priceDataFromCache[symbol]) {
                        priceDataFromCache[symbol] = {};
                    }
                    priceDataFromCache[symbol][date] = price;
                    if (!latestDates[symbol] || date > latestDates[symbol]) {
                        latestDates[symbol] = date;
                    }
                }
            }
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const toDate = today.toISOString().split('T')[0];
        const sortedTxs = portfolioTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstTxDateEver = sortedTxs.length > 0 ? new Date(new Date(sortedTxs[0].date).toISOString().split('T')[0]) : new Date();

        const symbolsToFetch: { symbol: string, from: string }[] = [];
        for (const symbol of allSymbols) {
            const latestCachedDate = latestDates[symbol];
            if (latestCachedDate) {
                // For existing symbols, fetch from the day after the last cached date
                const nextDay = new Date(latestCachedDate);
                nextDay.setUTCDate(nextDay.getUTCDate() + 1);
                const nextDayStr = nextDay.toISOString().split('T')[0];
                if (nextDayStr < toDate) {
                    symbolsToFetch.push({ symbol, from: nextDayStr });
                }
            } else {
                // For new symbols, find the first transaction date and fetch starting 7 days prior
                const symbolTxs = sortedTxs.filter(tx => tx.symbol === symbol);
                let firstTxDateForSymbol: Date;

                if (symbolTxs.length > 0) {
                    firstTxDateForSymbol = new Date(symbolTxs[0].date);
                } else {
                    // Handle benchmark symbols (like SPY) that might not have transactions
                    firstTxDateForSymbol = new Date(firstTxDateEver);
                }

                const fetchStartDate = new Date(firstTxDateForSymbol);
                fetchStartDate.setDate(fetchStartDate.getDate() - 7);
                const from = fetchStartDate.toISOString().split('T')[0];
                
                symbolsToFetch.push({ symbol, from });
            }
        }

        if (symbolsToFetch.length === 0) {
            if (portfolioId) {
                setRawPriceDataCache(prev => ({ ...prev, [portfolioId]: priceDataFromCache }));
                setFetchProgress(prev => ({ ...prev, [portfolioId]: { ...(prev[portfolioId] || { phase: 'idle', progress: 0, details: { current: 0, total: 0 } }), phase: 'calculating' } }));
            }
            return;
        }

        if (portfolioId) {
            setFetchProgress(prev => ({ ...prev, [portfolioId]: { phase: 'fetching_api', progress: 0, details: { current: 0, total: symbolsToFetch.length } } }));
        }
        const apiKey = localStorage.getItem('polygon_api_key') || DEFAULT_POLYGON_KEY;
        const newPriceDataFromApi: Record<string, Record<string, number>> = {};
        const pricesToUpsert: { symbol: string; date: string; price: number }[] = [];
        const failedSymbols: string[] = [];
        
        interface PolygonAggsResponse { status?: string; results?: { t: number; c: number }[]; error?: unknown; message?: unknown; }

        for (let i = 0; i < symbolsToFetch.length; i++) {
            const { symbol, from } = symbolsToFetch[i];

            while (isPausedRef.current) {
                setFetchProgress(prev => {
                    if (typeof portfolioId === 'string') {
                        return { ...prev, [portfolioId]: { ...(prev[portfolioId] || { phase: 'idle', progress: 0, details: { current: 0, total: 0 } }), phase: 'paused' }};
                    }
                    return prev;
                });
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            setFetchProgress(prev => {
                if (typeof portfolioId === 'string') {
                    const currentProgress = prev[portfolioId] || { phase: 'idle', progress: 0, details: { current: 0, total: 0 } };
                    if (currentProgress.phase === 'paused') return { ...prev, [portfolioId]: { ...currentProgress, phase: 'fetching_api' }};
                }
                return prev;
            });
             setFetchProgress(prev => {
                if (typeof portfolioId === 'string') {
                    return { ...prev, [portfolioId]: { ...(prev[portfolioId] || { phase: 'idle', progress: 0, details: { current: 0, total: 0 } }), currentSymbol: symbol, details: { current: i, total: symbolsToFetch.length }, progress: (i / symbolsToFetch.length) * 100 }};
                }
                return prev;
            });
            
            try {
                const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${from}/${toDate}?adjusted=true&sort=asc&limit=5000&apiKey=${apiKey}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    let errorMessage = `API responded with status ${response.status}`;
                    try {
                        const errorData: unknown = await response.json();
                        if (typeof errorData === 'object' && errorData !== null) {
                            const errorRecord = errorData as Record<string, unknown>;
                            if (typeof errorRecord.message === 'string') {
                                errorMessage = errorRecord.message;
                            } else if (typeof errorRecord.error === 'string') {
                                errorMessage = errorRecord.error;
                            }
                        }
                    } catch (e) { /* Ignore if response body isn't JSON */ }
                    throw new Error(errorMessage);
                }

                // @google/genai Coding Guidelines: FIX: Use a defined interface for the API response and avoid casting to `unknown`.
                const data: PolygonAggsResponse = await response.json();

                if (data.status === "ERROR") {
                    let errorString = 'Unknown Polygon error';
                    const err = data.error;
                    const msg = data.message;
                    
                    if (typeof err === 'string') {
                        errorString = err;
                    } else if (typeof msg === 'string') {
                        errorString = msg;
                    } else if (err || msg) {
                        try {
                            errorString = JSON.stringify(err || msg);
                        } catch {
                            errorString = 'Unstringifiable error content';
                        }
                    }
                    throw new Error(`Polygon API error for ${symbol}: ${errorString}`);
                }

                if (data.results) {
                    if (!newPriceDataFromApi[symbol]) newPriceDataFromApi[symbol] = {};
                    data.results.forEach(bar => {
                        const dateStr = new Date(bar.t).toISOString().split('T')[0];
                        newPriceDataFromApi[symbol][dateStr] = bar.c;
                        pricesToUpsert.push({ symbol, date: dateStr, price: bar.c });
                    });
                }
            } catch (error) {
                console.error(`Skipping symbol ${symbol} due to fetch error:`, error);
                failedSymbols.push(symbol);
            }

            if (i < symbolsToFetch.length - 1) { // Don't wait after the last one
                await new Promise(resolve => setTimeout(resolve, 13000));
            }
        }

        const combinedPriceData = { ...priceDataFromCache };
        for (const symbol in newPriceDataFromApi) {
            combinedPriceData[symbol] = { ...(combinedPriceData[symbol] || {}), ...newPriceDataFromApi[symbol] };
        }

        if(portfolioId) {
            setRawPriceDataCache(prev => ({ ...prev, [portfolioId]: combinedPriceData }));
            
            setFetchProgress(prev => ({ ...prev, [portfolioId]: { ...(prev[portfolioId] || { phase: 'idle', progress: 0, details: { current: 0, total: 0 } }), phase: 'saving_to_cache' }}));
        }
        if (pricesToUpsert.length > 0) {
            const { error: upsertError } = await supabase.from('historical_prices').upsert(pricesToUpsert, { onConflict: 'symbol,date' });
            if (upsertError) {
                console.warn("Failed to update historical_prices cache:", upsertError.message);
            }
        }

        if (failedSymbols.length > 0) {
            const errorMessage = `Skipped symbols due to API errors: ${failedSymbols.join(', ')}. Please try a Force Refresh later.`;
            if (portfolioId) {
                setChartApiStatus(prev => ({ ...prev, [portfolioId]: { status: 'error', error: errorMessage } }));
            }
        }
        
        if (portfolioId) {
            setFetchProgress(prev => ({ ...prev, [portfolioId]: { ...(prev[portfolioId] || { phase: 'idle', progress: 0, details: { current: 0, total: 0 } }), phase: 'calculating' } }));
        }

    }, [portfolios, transactions, setChartApiStatus, setFetchProgress, setRawPriceDataCache, isPausedRef]);

    // --- Background Snapshot Calculation ---
    useEffect(() => {
        const runRecentBackfill = async (portfolioId: string) => {
            if (!portfolioId || processedPortfoliosRef.current.has(portfolioId)) {
                return;
            }
            
            const priceCache = rawPriceDataCache['all'] || rawPriceDataCache[portfolioId];
            if (transactions.length === 0 || !priceCache || Object.keys(priceCache).length === 0) {
                return; // Not ready to run
            }

            processedPortfoliosRef.current.add(portfolioId);

            // This function now specifically handles only RECENT missing data.
            // The full historical population is a manual process via the Database Test page.
            await backfillPortfolioSnapshots(
                portfolioId,
                transactions,
                priceCache,
                (progress) => {
                    setSnapshotBackfillStatus(prev => ({ ...prev, [portfolioId]: progress }));
                }
            );
            
            // Dispatch event to tell summary component to refetch
            window.dispatchEvent(new CustomEvent('snapshotsUpdated', { detail: { portfolioId } }));
        };

        if (selectedPortfolioId) {
            runRecentBackfill(selectedPortfolioId);
        }

    }, [selectedPortfolioId, transactions, rawPriceDataCache]);

  // --- Market Status, Currency, and Auto-Refresh Logic ---
  const checkMarketStatus = useCallback(async () => {
    try {
      const apiKey = localStorage.getItem('finnhub_api_key') || DEFAULT_FINNHUB_KEY;
      const response = await fetch(`https://finnhub.io/api/v1/stock/market-status?exchange=US&token=${apiKey}`);
      if (!response.ok) {
        throw new Error('Failed to fetch market status from Finnhub API');
      }
      const data: unknown = await response.json();
      if (data && typeof data === 'object' && 'isOpen' in data && typeof (data as { isOpen: unknown }).isOpen === 'boolean') {
        setMarketStatus((data as { isOpen: boolean }).isOpen ? 'open' : 'closed');
      }
    } catch (error) {
      console.error("Error checking market status:", error);
    }
  }, []);

  const fetchExchangeRate = useCallback(async () => {
    const cachedRate = localStorage.getItem('exchange_rate_usd_thb');
    const cachedTimestamp = localStorage.getItem('exchange_rate_timestamp');
    const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
    const cacheAge = cachedTimestamp ? Date.now() - parseInt(cachedTimestamp, 10) : Infinity;

    if (cachedRate && cacheAge < CACHE_DURATION) {
        setExchangeRate(parseFloat(cachedRate));
        return;
    }

    try {
        const apiKey = localStorage.getItem('polygon_api_key') || DEFAULT_POLYGON_KEY;
        const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/C:USDTHB/prev?adjusted=true&apiKey=${apiKey}`);
        if (!response.ok) {
            let errorMessage = `Polygon API responded with status ${response.status}`;
            try {
                const errorData: unknown = await response.json();
                // FIX: Add type guard to safely access properties on 'unknown' type.
                if (typeof errorData === 'object' && errorData !== null) {
                    const errorRecord = errorData as Record<string, unknown>;
                    if (typeof errorRecord.message === 'string') {
                        errorMessage = errorRecord.message;
                    } else if (typeof errorRecord.error === 'string') {
                        errorMessage = errorRecord.error;
                    }
                }
            } catch(e) { /* ignore if response is not json */ }

            throw new Error(errorMessage);
        }
        const data: unknown = await response.json();
        
        // FIX: Safely handle 'unknown' from response.json() by replacing `any` cast with proper type guarding.
        if (
            data &&
            typeof data === 'object' &&
            'results' in data
        ) {
            const dataWithResults = data as { results: unknown };
            if (Array.isArray(dataWithResults.results) && dataWithResults.results.length > 0) {
                const firstResult = dataWithResults.results[0];
                if (
                    firstResult &&
                    typeof firstResult === 'object' &&
                    'c' in firstResult
                ) {
                    const firstResultWithC = firstResult as { c: unknown };
                    if (typeof firstResultWithC.c === 'number') {
                        const rate = firstResultWithC.c;
                        setExchangeRate(rate);
                        localStorage.setItem('exchange_rate_usd_thb', String(rate));
                        localStorage.setItem('exchange_rate_timestamp', String(Date.now()));
                    } else {
                         throw new Error("Invalid data structure for 'c' property from Polygon API");
                    }
                } else {
                    throw new Error("Invalid data structure for results item from Polygon API");
                }
            } else {
                throw new Error("Invalid data structure: 'results' is not an array or is empty.");
            }
        } else {
            throw new Error("Invalid data structure from Polygon API");
        }
    } catch (error) {
        console.warn("Could not fetch live exchange rate, using last known value.", error);
        if (cachedRate) {
             setExchangeRate(parseFloat(cachedRate)); // Use stale cache if fetch fails
        }
    }
  }, []);

  const handleToggleAutoRefresh = (portfolioId: string) => {
    setAutoRefreshSettings(prev => ({
      ...prev,
      [portfolioId]: !prev[portfolioId]
    }));
  };

  const handleCurrencyChange = (newCurrency: 'USD' | 'THB') => {
    setCurrency(newCurrency);
    localStorage.setItem('preferred_currency', newCurrency);
  };
  
  // --- Data Fetching and Initialization ---
  const safeLoadData = useCallback(async () => {
    const FIXED_USER_ID = 'c3777843-1f45-4496-a29f-0efd49cf0027';
    setLoadingPhase('loading');
    setDbError(null);

    const mapTxFromDb = (tx: any): Transaction => ({
        id: tx.id, date: tx.date, symbol: tx.symbol, type: tx.type, asset: tx.asset,
        amount: tx.amount, price: tx.price, fee: tx.fee,
        portfolioId: tx.portfolio_id, stockType: tx.stock_type, note: tx.note,
        status: tx.status
    });

    try {
      const { data: portfoliosData, error: portfoliosError } = await supabase.from('portfolios').select('*').not('name', 'like', '[DELETED]%').order('created_at', { ascending: true });
      if (portfoliosError) throw portfoliosError;

      let finalPortfolios = portfoliosData || [];
      
      if (finalPortfolios.length === 0) {
        const portfoliosWithUser = basePortfolioSeeds.map(p => ({ ...p, user_id: FIXED_USER_ID }));
        const { data: seededPortfolios, error: seedError } = await supabase.from('portfolios').insert(portfoliosWithUser).select();
        if (seedError) throw seedError;
        finalPortfolios = seededPortfolios || [];
        addNotification('Database seeded with sample portfolios.', 'success');
      }

      const initialAutoRefreshSettings = finalPortfolios.reduce((acc, p) => {
          acc[p.id] = true;
          return acc;
      }, {} as Record<string, boolean>);
      setAutoRefreshSettings(initialAutoRefreshSettings);

      setRawPortfolios(finalPortfolios.map(p => ({
        ...p, data: [],
        cash: { dayReturn: 0, totalReturn: 0, totalReturnPercent: 0, totalCost: 0, currentValue: 0, portfolioPercent: 0 },
        total: { dayReturn: 0, totalReturn: 0, totalReturnPercent: 0, totalCost: 0, currentValue: 0, portfolioPercent: 0 },
      })));

      setLoadingPhase('selecting');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSelectedPortfolioId(currentId => {
          if (currentId && finalPortfolios.some(p => p.id === currentId)) {
              return currentId;
          }
          const doctorBankPortfolio = finalPortfolios.find(p => p.name === "Doctorbank Growth");
          if (doctorBankPortfolio) {
              return doctorBankPortfolio.id;
          }
          if (finalPortfolios.length > 0) {
              return finalPortfolios[0].id;
          }
          return null;
      });

      const { data: transactionsData, error: transactionsError } = await supabase.from('transactions').select('*');
      if (transactionsError) throw transactionsError;

      let finalTransactions: Transaction[] = (transactionsData || []).map(mapTxFromDb);
      
      if (finalTransactions.length === 0 && finalPortfolios.length > 0) {
          const portfolioMap = new Map(finalPortfolios.map(p => [p.name, p.id]));
          const transactionsToInsert = seedTransactions.map(tx => ({
              ...tx, type: 'BUY' as const, fee: 0, amount: tx.quantity, price: tx.avgCost,
              portfolio_id: portfolioMap.get(tx.portfolioName), stock_type: tx.stockType,
              user_id: FIXED_USER_ID,
              portfolio_name: tx.portfolioName
          })).filter(tx => tx.portfolio_id);
          const { data: seededTxs, error: txSeedError } = await supabase.from('transactions').insert(transactionsToInsert).select();
          if (txSeedError) throw txSeedError;
          finalTransactions = (seededTxs || []).map(mapTxFromDb);
          addNotification('Database seeded with sample transactions.', 'success');
      }
      setTransactions(finalTransactions);

      const { data: priceData, error: priceError } = await supabase.from('latest_prices').select('*');
      if (priceError) console.warn("Could not load cloud price cache:", priceError.message);
      if (priceData) {
          const priceMap = priceData.reduce((acc, price: any) => {
              if (price && typeof price.symbol === 'string' && typeof price.price === 'number' && typeof price.change === 'number' && typeof price.percent_change === 'number') {
                acc[price.symbol] = { 
                    price: price.price, 
                    change: price.change,
                    percent_change: price.percent_change
                };
              }
              return acc;
          }, {} as Record<string, SupabaseLatestPrice>);
          setLatestPrices(priceMap);
      }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Supabase fetch error:", error);
        setDbError(`Failed to connect to the database. Error: ${errorMessage}`);
        addNotification(`Database connection failed: ${errorMessage}`, 'error');
    } finally {
        setLoadingPhase('ready');
    }
  }, [addNotification]);

    const triggerAutoCloudBackup = useCallback(async (summary: string) => {
      try {
        const { data: portfoliosData, error: pError } = await supabase.from('portfolios').select('*');
        const { data: transactionsData, error: tError } = await supabase.from('transactions').select('*');

        if (pError || tError) {
            console.error("Failed to fetch data for cloud backup:", pError || tError);
            // Silently fail as per user request, but log it.
            console.warn('Auto cloud backup failed: could not fetch current data.');
            return;
        }

        const backupData = { portfolios: portfoliosData || [], transactions: transactionsData || [] };
        const metadata = { summary, portfolioCount: portfoliosData?.length || 0, transactionCount: transactionsData?.length || 0 };

        const { data: lastBackup } = await supabase.from('cloud_backups').select('backup_sequence').order('created_at', { ascending: false }).limit(1);
        const firstBackup: { backup_sequence?: number } | null = Array.isArray(lastBackup) && lastBackup.length > 0 ? lastBackup[0] : null;
        const backupSequence = (firstBackup && typeof firstBackup.backup_sequence === 'number') ? firstBackup.backup_sequence : 0;
        const nextSequence = (backupSequence % 10) + 1;
        const backupEntry = {
            backup_sequence: nextSequence, backup_name: `Auto-backup ${new Date().toISOString()}`,
            backup_data: backupData, metadata: metadata, backup_type: 'auto' as const
        };
        const { error } = await supabase.from('cloud_backups').upsert(backupEntry, { onConflict: 'backup_sequence' });
        if (error) throw error;
        console.log(`Cloud backup upserted on sequence ${nextSequence}. Summary: ${summary}`);
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Auto cloud backup failed and was suppressed. Error: ${errorMessage}`);
      }
    }, []);

  useEffect(() => {
    safeLoadData();
    checkMarketStatus();
    fetchExchangeRate();
    const preferredCurrency = localStorage.getItem('preferred_currency');
    if (preferredCurrency === 'THB' || preferredCurrency === 'USD') {
        setCurrency(preferredCurrency as 'USD' | 'THB');
    }
    const marketStatusInterval = setInterval(checkMarketStatus, 15 * 60 * 1000);

    const handleRefetch = () => {
        processedPortfoliosRef.current.clear(); // Clear processed list to allow re-backfill on manual refresh
        safeLoadData();
    };

    const handleAutoBackup = (event: Event) => {
      if (event instanceof CustomEvent) {
        const detail: unknown = event.detail;
        // @google/genai Coding Guidelines: FIX: Add type guards to safely access properties on 'unknown' type.
        // FIX: Safely handle 'unknown' from CustomEvent detail.
        if (detail !== null && typeof detail === 'object') {
            const detailRecord = detail as Record<string, unknown>;
            const summary = detailRecord.summary;
            if (typeof summary === 'string') {
                triggerAutoCloudBackup(summary);
            }
        }
      }
    };

    const handleBatchNotify = (event: Event) => {
        if (event instanceof CustomEvent) {
            const detail: unknown = event.detail;
            // @google/genai Coding Guidelines: FIX: Add type guards to safely access properties on 'unknown' type.
            // FIX: Safely handle 'unknown' from CustomEvent detail.
            if (detail !== null && typeof detail === 'object') {
                const detailRecord = detail as Record<string, unknown>;
                const message = detailRecord.message;
                const type = detailRecord.type;
                if (
                    typeof message === 'string' &&
                    typeof type === 'string' &&
                    (type === 'success' || type === 'error')
                ) {
                    addNotification(message, type);
                }
            }
        }
    };
    window.addEventListener('refetchData', handleRefetch);
    window.addEventListener('triggerAutoBackup', handleAutoBackup);
    window.addEventListener('batchNotification', handleBatchNotify);
    
    return () => {
        window.removeEventListener('refetchData', handleRefetch);
        window.removeEventListener('triggerAutoBackup', handleAutoBackup);
        window.removeEventListener('batchNotification', handleBatchNotify);
        clearInterval(marketStatusInterval);
    };
  }, [safeLoadData, triggerAutoCloudBackup, checkMarketStatus, fetchExchangeRate, addNotification]);
  
    // --- Trigger background fetch for historical prices ---
    useEffect(() => {
        if (selectedPortfolioId && transactions.length > 0 && portfolios.length > 0) {
            const portfolioId = selectedPortfolioId;
            const hasCache = rawPriceDataCache[portfolioId] && Object.keys(rawPriceDataCache[portfolioId]).length > 0;
            const isFetching = chartApiStatus[portfolioId]?.status === 'loading';
            if (!hasCache && !isFetching) {
                fetchHistoricalPrices(portfolioId);
            }
        }
    }, [selectedPortfolioId, transactions, portfolios, rawPriceDataCache, chartApiStatus, fetchHistoricalPrices]);
  
    // --- Live Price Fetching ---
  const handleRefreshPrices = useCallback(async (portfolioId: string | null) => {
    if (!portfolioId) return;

    const portfolioToRefresh = portfolios.find(p => p.id === portfolioId);
    if (!portfolioToRefresh || portfolioToRefresh.data.length === 0) {
        setLivePriceFetchStatus({ phase: 'idle', progress: 0, details: { current: 0, total: 0 } });
        return;
    }

    const symbols = Array.from(new Set(portfolioToRefresh.data.map(item => item.symbol)));
    const totalSymbols = symbols.length;
    setLivePriceFetchStatus({ phase: 'api', progress: 0, details: { current: 0, total: totalSymbols } });
    
    const apiKey = localStorage.getItem('finnhub_api_key') || DEFAULT_FINNHUB_KEY;
    const fetchedPrices: Record<string, SupabaseLatestPrice> = {};
    const updatedSymbols = new Set<string>();
    let completedCount = 0;

    const pricePromises = symbols.map(symbol => 
        fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`)
            .then(res => res.json())
            .then(data => {
                if (data.c !== undefined && data.c !== 0) {
                    fetchedPrices[symbol] = { price: data.c, change: data.d, percent_change: data.dp };
                    updatedSymbols.add(symbol);
                }
            })
            .catch(err => console.error(`Failed to fetch price for ${symbol}:`, err))
            .finally(() => {
                completedCount++;
                setLivePriceFetchStatus(prev => ({
                    ...prev, phase: 'api', progress: (completedCount / totalSymbols) * 100,
                    details: { current: completedCount, total: totalSymbols }
                }));
            })
    );
    await Promise.all(pricePromises);
    
    setLivePriceFetchStatus(prev => ({ ...prev, phase: 'saving' }));
    
    const pricesToUpsert = Object.entries(fetchedPrices).map(([symbol, data]) => ({ symbol, ...data }));
    if (pricesToUpsert.length > 0) {
        const { error } = await supabase.from('latest_prices').upsert(pricesToUpsert, { onConflict: 'symbol' });
        if (error) console.error("Error saving prices to cloud cache:", error);
    }

    setLivePriceFetchStatus(prev => ({ ...prev, phase: 'rendering' }));
    setLatestPrices(prev => ({ ...prev, ...fetchedPrices }));
    setJustUpdatedSymbols(updatedSymbols);

    setTimeout(() => {
        setLivePriceFetchStatus({ phase: 'completed', progress: 100, details: { current: totalSymbols, total: totalSymbols } });
        setTimeout(() => setLivePriceFetchStatus({ phase: 'idle', progress: 0, details: { current: 0, total: 0 } }), 1500);
    }, 100);
  }, [portfolios]);
  
    const handleForceChartRefresh = useCallback((portfolioId: string | null) => {
        if (!portfolioId) return;
        
        setHistoricalDataCache(prev => { const newCache = { ...prev }; delete newCache[portfolioId]; return newCache; });
        setRawPriceDataCache(prev => { const newCache = { ...prev }; delete newCache[portfolioId]; return newCache; });
        setChartApiStatus(prev => ({ ...prev, [portfolioId]: { status: 'idle', error: null } }));
        
        setTimeout(() => {
            fetchHistoricalPrices(portfolioId);
        }, 100);

    }, [fetchHistoricalPrices]);

  // --- Auto-Refresh Timer Effect ---
  useEffect(() => {
    if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
    }
    autoRefreshTimerRef.current = null;

    const isAutoRefreshEnabled = selectedPortfolioId ? !!autoRefreshSettings[selectedPortfolioId] : false;

    if (isAutoRefreshEnabled && marketStatus !== 'unknown') {
        const interval = marketStatus === 'open' ? 3 * 60 * 1000 : 15 * 60 * 1000;
        
        autoRefreshTimerRef.current = setInterval(() => {
            if (selectedPortfolioId) {
                handleRefreshPrices(selectedPortfolioId);
            }
        }, interval);
    }

    return () => {
        if (autoRefreshTimerRef.current) {
            clearInterval(autoRefreshTimerRef.current);
        }
    };
  }, [autoRefreshSettings, selectedPortfolioId, marketStatus, handleRefreshPrices]);

  // --- Transaction Handlers ---
  const handleSaveTransaction = async (tx: Omit<Transaction, 'id'> & { id?: string }, options?: { silent?: boolean }) => {
    const FIXED_USER_ID = 'c3777843-1f45-4496-a29f-0efd49cf0027';

    const portfolio = rawPortfolios.find(p => p.id === tx.portfolioId);
    if (!portfolio) {
        if (!options?.silent) addNotification(`Error: Portfolio with ID ${tx.portfolioId} not found.`, 'error');
        return;
    }

    const { id, portfolioId, stockType, status, ...rest } = tx;
    const transactionForDb = { 
        ...rest, 
        portfolio_id: portfolioId, 
        stock_type: stockType,
        user_id: FIXED_USER_ID,
        portfolio_name: portfolio.name,
        status: status || 'CONFIRMED'
    };

    const { data, error } = id  
      ? await supabase.from('transactions').update(transactionForDb).eq('id', id).select()
      : await supabase.from('transactions').insert(transactionForDb).select();
    
    if (error) {
      console.error('Supabase error details:', error);
      if (!options?.silent) addNotification(`Database error: ${error.message}`, 'error');
      return;
    }
    
    if (!options?.silent) {
        if (id) {
            addNotification(`Transaction in ${portfolio.name} updated.`, 'success');
        } else {
            addNotification(`Transaction added to ${portfolio.name}.`, 'success');
        }
        window.dispatchEvent(new CustomEvent('triggerAutoBackup', { detail: { summary: `${id ? 'Updated' : 'Added'} transaction for ${tx.symbol} in ${portfolio.name}` } }));
        await logActivity(id ? 'transaction_update' : 'transaction_add', { symbol: tx.symbol, type: tx.type, amount: tx.amount, price: tx.price, portfolio: portfolio.name });
        window.dispatchEvent(new Event('refetchData'));
    }
    
    return portfolio.name;
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    const txToDelete = transactions.find(tx => tx.id === transactionId);
    if (!txToDelete) {
        addNotification('Could not find transaction to delete.', 'error');
        return;
    }
    const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (error) {
      addNotification(`Error deleting transaction: ${error.message}`, 'error');
    } else {
      addNotification('Transaction deleted.', 'success');
      window.dispatchEvent(new CustomEvent('triggerAutoBackup', { detail: { summary: `Deleted transaction for ${txToDelete.symbol}` } }));
      await logActivity('transaction_delete', { symbol: txToDelete.symbol, amount: txToDelete.amount, date: txToDelete.date });
      window.dispatchEvent(new Event('refetchData'));
    }
  };

  const handleBulkSaveTransactions = async (txs: (Omit<Transaction, 'id'> & { id?: string })[]) => {
    let successCount = 0;
    const totalCount = txs.length;
    addNotification(`Saving ${totalCount} transactions...`, 'success');

    const promises = txs.map(tx => handleSaveTransaction(tx, { silent: true }));
    const results = await Promise.all(promises);
    successCount = results.filter(Boolean).length;

    if (successCount > 0) {
        addNotification(`Successfully saved ${successCount} of ${totalCount} transactions.`, 'success');
        window.dispatchEvent(new CustomEvent('triggerAutoBackup', { detail: { summary: `Bulk operation: Saved ${successCount} transactions.` } }));
        window.dispatchEvent(new Event('refetchData'));
    } else if (totalCount > 0) {
        addNotification(`Failed to save any of the ${totalCount} transactions.`, 'error');
    }
  };

  const handleBulkDeleteTransactions = async (transactionIds: string[]) => {
    let successCount = 0;
    const totalCount = transactionIds.length;
    addNotification(`Deleting ${totalCount} transactions...`, 'success');

    const { error } = await supabase.from('transactions').delete().in('id', transactionIds);
    
    if (error) {
        addNotification(`Error during bulk delete: ${error.message}`, 'error');
    } else {
        successCount = totalCount; // Assuming all or nothing from Supabase 'in' filter
    }

    if (successCount > 0) {
        addNotification(`Successfully deleted ${successCount} transactions.`, 'success');
        window.dispatchEvent(new CustomEvent('triggerAutoBackup', { detail: { summary: `Bulk operation: Deleted ${successCount} transactions.` } }));
        window.dispatchEvent(new Event('refetchData'));
    }
  };

  // --- Portfolio Handlers ---
    const handleCreatePortfolio = async (portfolioData: { name: string; initial_cash: number; icon: string; color_hex: string; description: string; }) => {
        const { data, error } = await supabase.from('portfolios').insert({
            name: portfolioData.name,
            initial_cash: portfolioData.initial_cash,
            icon: portfolioData.icon,
            color_hex: portfolioData.color_hex,
            description: portfolioData.description,
        }).select();

        if (error) {
            addNotification(`Error creating portfolio: ${error.message}`, 'error');
        } else if (data) {
            const newPortfolio = data[0];
            addNotification('Portfolio created', 'success', {
                label: 'View',
                onClick: () => {
                    handleSelectPortfolio(newPortfolio.id);
                }
            });
            window.dispatchEvent(new Event('refetchData'));
        }
    };

    const handleUpdatePortfolio = async (id: string, portfolioData: { name: string; initial_cash: number; icon: string; color_hex: string; description: string; }) => {
        const { error } = await supabase.from('portfolios').update({
            name: portfolioData.name,
            initial_cash: portfolioData.initial_cash,
            icon: portfolioData.icon,
            color_hex: portfolioData.color_hex,
            description: portfolioData.description,
        }).eq('id', id);

        if (error) {
            addNotification(`Error updating portfolio: ${error.message}`, 'error');
        } else {
            addNotification('Portfolio updated', 'success');
            await logActivity('portfolio_update', { name: portfolioData.name });
            // Targeted refresh of just portfolios
            const { data: portfoliosData, error: portfoliosError } = await supabase.from('portfolios').select('*').not('name', 'like', '[DELETED]%').order('created_at', { ascending: true });
            if (portfoliosError) {
                addNotification(`Failed to refresh portfolio list: ${portfoliosError.message}`, 'error');
            } else if (portfoliosData) {
                setRawPortfolios(portfoliosData.map(p => ({
                    ...p, data: [],
                    cash: { dayReturn: 0, totalReturn: 0, totalReturnPercent: 0, totalCost: 0, currentValue: 0, portfolioPercent: 0 },
                    total: { dayReturn: 0, totalReturn: 0, totalReturnPercent: 0, totalCost: 0, currentValue: 0, portfolioPercent: 0 },
                })));
            }
        }
    };

    const handleUpdatePortfolioGoal = async (portfolioId: string, goalData: { goal_amount: number; goal_currency: 'USD' | 'THB' }) => {
        const { error } = await supabase
            .from('portfolios')
            .update(goalData)
            .eq('id', portfolioId);

        if (error) {
            addNotification(`Error updating portfolio goal: ${error.message}`, 'error');
        } else {
            addNotification('Portfolio goal updated.', 'success');
            // Refetch portfolios to update state everywhere
            const { data: portfoliosData } = await supabase.from('portfolios').select('*').not('name', 'like', '[DELETED]%').order('created_at', { ascending: true });
            if (portfoliosData) {
                setRawPortfolios(portfoliosData.map(p => ({
                    ...p, data: [],
                    cash: { dayReturn: 0, totalReturn: 0, totalReturnPercent: 0, totalCost: 0, currentValue: 0, portfolioPercent: 0 },
                    total: { dayReturn: 0, totalReturn: 0, totalReturnPercent: 0, totalCost: 0, currentValue: 0, portfolioPercent: 0 },
                })));
            }
        }
    };

    const handleDeletePortfolio = async (id: string, name: string) => {
        const { count, error: countError } = await supabase
            .from('portfolios')
            .select('*', { count: 'exact', head: true })
            .not('name', 'like', '[DELETED]%');

        if (countError) {
            addNotification(`Error checking portfolio count: ${countError.message}`, 'error');
            return;
        }

        if (count !== null && count <= 1) {
            addNotification('Cannot delete the last remaining portfolio.', 'error');
            return;
        }

        const { error } = await supabase
            .from('portfolios')
            .update({ name: `[DELETED] ${name}` })
            .eq('id', id);
        
        if (error) {
            addNotification(`Error deleting portfolio: ${error.message}`, 'error');
        } else {
            addNotification(`Portfolio '${name}' deleted.`, 'success');
            await logActivity('portfolio_delete', { name });
            
            if (selectedPortfolioId === id) {
                const { data: remainingPortfolios } = await supabase
                    .from('portfolios')
                    .select('id, name')
                    .not('name', 'like', '[DELETED]%')
                    .order('created_at', { ascending: true })
                    .limit(1);

                if (remainingPortfolios && remainingPortfolios.length > 0) {
                    setSelectedPortfolioId(remainingPortfolios[0].id);
                } else {
                    setSelectedPortfolioId(null);
                }
            }
            window.dispatchEvent(new Event('refetchData'));
        }
    };
    
    // --- Manual Cloud Backup ---
    const handleManualBackup = useCallback(async (summary: string) => {
        const { data: portfoliosData, error: pError } = await supabase.from('portfolios').select('*');
        const { data: transactionsData, error: tError } = await supabase.from('transactions').select('*');

        if (pError || tError) {
            throw new Error(`Failed to fetch data for backup: ${pError?.message || tError?.message}`);
        }

        const backupData = { portfolios: portfoliosData || [], transactions: transactionsData || [] };
        const metadata = { summary, portfolioCount: portfoliosData?.length || 0, transactionCount: transactionsData?.length || 0 };
        
        const backupEntry = {
            backup_name: summary,
            backup_data: backupData, 
            metadata: metadata, 
            backup_type: 'manual' as const
        };
        const { error } = await supabase.from('cloud_backups').insert(backupEntry);
        if (error) throw error;
    }, []);
    
    // --- Render Logic ---
  const pages = ['Portfolio', 'Analysis', 'Performance', 'Transactions', 'Allocation Planner', 'Settings', 'Changelog'];

  return (
    <div className={`bg-gradient-to-br from-[#0B1220] to-[#111827] text-gray-200 min-h-screen font-sans transition-opacity duration-500 ${loadingPhase !== 'ready' ? 'opacity-0' : 'opacity-100'}`}>
      <nav className="bg-[#111827]/80 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
                <div className="flex-shrink-0 text-xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 text-transparent bg-clip-text">InvestTrack AI</div>
                <div className="hidden md:block">
                    <div className="ml-10 flex items-baseline space-x-4">
                    {pages.map(page => (
                        <button key={page} onClick={() => setActivePage(page)}
                        className={`${activePage === page ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium transition-colors`}>
                        {page}
                        </button>
                    ))}
                    </div>
                </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center bg-gray-800 border border-gray-700 p-1 rounded-md text-sm">
                  <button onClick={() => handleCurrencyChange('USD')} className={`px-3 py-1 rounded-md text-xs transition-colors ${currency === 'USD' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}>USD</button>
                  <button onClick={() => handleCurrencyChange('THB')} className={`px-3 py-1 rounded-md text-xs transition-colors ${currency === 'THB' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}>THB</button>
              </div>
              <SyncStatusIndicator status={dbError ? 'error' : 'synced'} />
            </div>
          </div>
        </div>
      </nav>
      
      {loadingPhase === 'loading' && <div className="text-center p-20 text-gray-500">Connecting to database...</div>}
      {loadingPhase === 'selecting' && <div className="text-center p-20 text-gray-500">Loading portfolio...</div>}
      
      <main className={`transition-opacity duration-300 ${isSwitchingPortfolio ? 'opacity-30' : 'opacity-100'}`}>
          <div style={{ display: activePage === 'Portfolio' ? 'block' : 'none' }}>
            <MainPage 
                portfolios={portfolios} 
                currency={currency} 
                exchangeRate={exchangeRate}
                onAddPortfolio={() => handleCreatePortfolio({ name: 'New Portfolio', initial_cash: 0, icon: '📁', color_hex: '#64748B', description: '' })}
                onRenamePortfolio={(id, name) => handleUpdatePortfolio(id, { name, initial_cash: 0, icon: '📁', color_hex: '#64748B', description: '' })}
                onDeletePortfolio={handleDeletePortfolio}
                onDeleteStock={() => {}}
                onRefreshPrices={handleRefreshPrices}
                livePriceFetchStatus={livePriceFetchStatus}
                justUpdatedSymbols={justUpdatedSymbols}
                autoRefreshSettings={autoRefreshSettings}
                onToggleAutoRefresh={handleToggleAutoRefresh}
                setViewedPortfolioId={setViewedPortfolioId}
                historicalDataCache={historicalDataCache}
                transactions={transactions}
                rawPriceDataCache={rawPriceDataCache}
                onPricesRendered={() => {}}
                marketStatus={marketStatus}
                selectedPortfolioId={selectedPortfolioId}
                setSelectedPortfolioId={setSelectedPortfolioId}
            />
          </div>
          <div style={{ display: activePage === 'Analysis' ? 'block' : 'none' }}>
            <AnalysisPage 
                portfolios={portfolios}
                currency={currency}
                exchangeRate={exchangeRate}
                rawPriceDataCache={rawPriceDataCache}
                selectedPortfolioId={selectedPortfolioId}
                setSelectedPortfolioId={setSelectedPortfolioId}
                onUpdatePortfolioGoal={handleUpdatePortfolioGoal}
            />
          </div>
          <div style={{ display: activePage === 'Performance' ? 'block' : 'none' }}>
            <PerformanceChartPage 
                portfolios={portfolios}
                transactions={transactions}
                historicalDataCache={historicalDataCache}
                setHistoricalDataCache={setHistoricalDataCache}
                rawPriceDataCache={rawPriceDataCache}
                setRawPriceDataCache={setRawPriceDataCache}
                chartApiStatus={chartApiStatus}
                setChartApiStatus={setChartApiStatus}
                fetchProgress={fetchProgress}
                setFetchProgress={setFetchProgress}
                isApiPaused={isApiPaused}
                setIsApiPaused={setIsApiPaused}
                onForceRefresh={handleForceChartRefresh}
                selectedPortfolioId={selectedPortfolioId}
                setSelectedPortfolioId={setSelectedPortfolioId}
                displayMethod={displayMethod}
                onDisplayMethodChange={handleDisplayMethodChange}
            />
          </div>
          <div style={{ display: activePage === 'Transactions' ? 'block' : 'none' }}>
            <TransactionPage 
                portfolios={portfolios}
                transactions={transactions}
                selectedPortfolioId={selectedPortfolioId}
                setSelectedPortfolioId={setSelectedPortfolioId}
                onSaveTransaction={handleSaveTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onBulkSaveTransactions={handleBulkSaveTransactions}
                onBulkDeleteTransactions={handleBulkDeleteTransactions}
                onCreatePortfolio={handleCreatePortfolio}
                onUpdatePortfolio={handleUpdatePortfolio}
                onDeletePortfolio={handleDeletePortfolio}
                exchangeRate={exchangeRate}
                currency={currency}
            />
          </div>
          <div style={{ display: activePage === 'Allocation Planner' ? 'block' : 'none' }}>
            <AllocationPlannerPage 
                portfolios={portfolios}
                selectedPortfolioId={selectedPortfolioId}
                setSelectedPortfolioId={setSelectedPortfolioId}
                setNotification={(message, type) => addNotification(message, type)}
                latestPrices={latestPrices}
                currency={currency}
                exchangeRate={exchangeRate}
                onBulkSaveTransactions={handleBulkSaveTransactions}
                onNavChange={setActivePage}
            />
          </div>
          <div style={{ display: activePage === 'Settings' ? 'block' : 'none' }}>
            <SettingPage 
                apiStatus={apiStatus}
                setApiStatus={setApiStatus}
                dbError={dbError}
                portfolios={portfolios}
                setNotification={(notification) => {
                    if (notification) {
                        addNotification(notification.message, notification.type);
                    }
                }}
                onManualBackup={handleManualBackup}
            />
          </div>
          <div style={{ display: activePage === 'Changelog' ? 'block' : 'none' }}>
            <ChangelogPage />
          </div>
      </main>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-3">
        {notifications.map(notification => (
          <Toast key={notification.id} {...notification} onDismiss={() => removeNotification(notification.id)} />
        ))}
      </div>
    </div>
  );
}