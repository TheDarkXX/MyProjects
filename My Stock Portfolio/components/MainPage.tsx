

import React, { useState, useEffect, useMemo, useRef } from 'react';
import PortfolioTable from './PortfolioTable';
import AlphaPickTable from './AlphaPickTable';
import Tabs from './Tabs';
import { alphaPickData } from '../data/portfolioData';
import { Portfolio, Transaction, LivePriceFetchStatus, SnapshotBackfillStatus, PortfolioAnalyticsCache, DisplayMethod } from '../types';
import PortfolioReturnsSummary from './PortfolioReturnsSummary';
import { usePortfolioAnalytics } from '../hooks/usePortfolioAnalytics';

interface MainPageProps {
  portfolios: Portfolio[];
  currency: 'USD' | 'THB';
  exchangeRate: number;
  onDeleteStock: (portfolioId: string, symbol: string) => void;
  onRefreshPrices: (portfolioId: string | null) => void;
  livePriceFetchStatus: LivePriceFetchStatus;
  justUpdatedSymbols: Set<string>;
  autoRefreshSettings: Record<string, boolean>;
  onToggleAutoRefresh: (portfolioId: string) => void;
  setViewedPortfolioId: (id: string | null) => void;
  transactions: Transaction[];
  rawPriceDataCache: Record<string, Record<string, Record<string, number>>>;
  onPricesRendered: () => void;
  marketStatus: 'open' | 'closed' | 'unknown';
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string | null) => void;
  snapshotBackfillStatus: SnapshotBackfillStatus | null;
  displayMethod: DisplayMethod;
  onDisplayMethodChange: (method: DisplayMethod) => void;
}

type SummaryTimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'Total';
type AnalyticsMode = 'transaction' | 'stock';

// --- UI Components ---
const ALL_TABLE_COLUMNS = [
    { key: 'symbol', label: 'Symbol' }, { key: 'lastPrice', label: 'Last Price' },
    { key: 'dayChangePercent', label: 'Day Change %' }, { key: 'dayReturn', label: 'Day Return' },
    { key: 'totalReturn', label: 'Total Return' }, { key: 'totalReturnPercent', label: 'Total Return %' },
    { key: 'quantity', label: 'Quantity' }, { key: 'avgCost', label: 'Avg Cost' },
    { key: 'totalCost', label: 'Total Cost' }, { key: 'currentValue', label: 'Current Value' },
    { key: 'portfolioPercent', label: 'Portfolio %' }, { key: 'sector', label: 'Sector' },
    { key: 'assetType', label: 'Asset Type' },
];
const OPTIONAL_COLUMNS = ['avgCost', 'sector', 'assetType'];

const ColumnVisibilityControl: React.FC<{
  visibleColumns: Set<string>;
  setVisibleColumns: React.Dispatch<React.SetStateAction<Set<string>>>;
}> = ({ visibleColumns, setVisibleColumns }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (key: string) => {
    setVisibleColumns(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        return newSet;
    });
  };
  
  const showAll = () => setVisibleColumns(new Set(ALL_TABLE_COLUMNS.map(c => c.key)));
  const hideOptional = () => setVisibleColumns(prev => new Set([...prev].filter(key => !OPTIONAL_COLUMNS.includes(key))));

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
        <span>Columns</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-30">
          <div className="p-2 grid grid-cols-1 gap-1 max-h-96 overflow-y-auto">
            {ALL_TABLE_COLUMNS.map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-3 p-2 h-10 rounded-md hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.has(key)}
                  onChange={() => handleToggle(key)}
                  disabled={key === 'symbol'}
                  className="h-4 w-4 rounded bg-gray-900 border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className={`text-sm ${key === 'symbol' ? 'text-gray-500' : ''}`}>{label}</span>
              </label>
            ))}
          </div>
          <div className="p-2 border-t border-gray-600 flex justify-between">
             <button onClick={showAll} className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded">Show All</button>
             <button onClick={hideOptional} className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded">Hide Optional</button>
          </div>
        </div>
      )}
    </div>
  );
};


const useAnimatedValue = (endValue: number, duration = 1200) => {
    const [currentValue, setCurrentValue] = useState(0);
    const frameRef = useRef<number | null>(null);
    const valueRef = useRef(0);

    useEffect(() => {
        valueRef.current = endValue;
        const startTime = performance.now();
        const startValue = 0;

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 5); // Ease out quint

            const nextValue = startValue + (valueRef.current - startValue) * easedProgress;
            setCurrentValue(nextValue);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [endValue, duration]);

    return currentValue;
};

const AnimatedNumber: React.FC<{ value: number | null; formatter: (val: number) => string; className?: string }> = ({ value, formatter, className }) => {
    if (value === null) {
        return <p className={className}>&nbsp;</p>;
    }
    const animatedValue = useAnimatedValue(value);
    return <p className={className}>{formatter(animatedValue)}</p>;
};

const RadialProgress: React.FC<{ percentage: number | null }> = ({ percentage }) => {
    const animatedPercentage = useAnimatedValue(percentage ?? 0, 1200);
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (animatedPercentage / 100) * circumference;

    return (
        <div className="relative w-24 h-24">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-gray-700" strokeWidth="8" stroke="currentColor" fill="transparent" r={radius} cx="50" cy="50" />
                {percentage !== null && (
                    <circle
                        className="text-green-400"
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="50"
                        cy="50"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-out' }}
                    />
                )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                {percentage !== null && (
                    <span className="text-2xl font-bold text-green-400">{`${Math.round(animatedPercentage)}%`}</span>
                )}
            </div>
        </div>
    );
};


const FetchStatusIndicator: React.FC<{ status: LivePriceFetchStatus }> = ({ status }) => {
    if (status.phase === 'idle' || status.phase === 'completed') return null;
    let text = '';
    let showProgress = false;
    switch (status.phase) {
        case 'local_cache': text = 'Cache (Local)...'; break;
        case 'cloud_cache': text = 'Cache (Cloud)...'; break;
        case 'api': text = `Fetching API (${status.details.current}/${status.details.total})...`; showProgress = true; break;
        case 'saving': text = 'Saving Cache...'; break;
        case 'rendering': text = 'Updating UI...'; break;
    }
    return (
        <div className="flex items-center space-x-2 animate-pulse">
            <span className="text-xs text-gray-400">{text}</span>
            {showProgress && (<div className="w-20 bg-gray-700 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-linear" style={{ width: `${status.progress}%` }}></div></div>)}
        </div>
    );
};

const AutoRefreshToggle: React.FC<{ isEnabled: boolean; onChange: () => void; marketStatus: 'open' | 'closed' | 'unknown'; }> = ({ isEnabled, onChange, marketStatus }) => {
    const intervalText = marketStatus === 'open' ? '3m' : '15m';
    return (
        <div className="flex items-center space-x-2" title={`Auto-refresh is ${isEnabled ? `ON (every ${intervalText})` : 'OFF'}`}>
            <span className={`text-xs ${isEnabled ? 'text-blue-400' : 'text-gray-500'}`}>
                {isEnabled ? `Auto (${intervalText})` : 'Auto (Off)'}
            </span>
            <button onClick={onChange} role="switch" aria-checked={isEnabled} className={`${isEnabled ? 'bg-blue-600' : 'bg-gray-600'} relative inline-flex items-center h-5 w-9 transition-colors rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500`}>
                <span className={`${isEnabled ? 'translate-x-5' : 'translate-x-1'} inline-block w-3 h-3 transform bg-white rounded-full transition-transform`} />
            </button>
        </div>
    );
};

const InfoIcon: React.FC<{ tooltipText: string }> = ({ tooltipText }) => (
    <div className="group relative inline-block ml-1.5 text-gray-500 cursor-help">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-2 text-xs text-left bg-gray-900 text-gray-300 border border-gray-600 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 whitespace-pre-wrap">{tooltipText}</div>
    </div>
);

const AnalyticsCard: React.FC<{ title: string; tooltipText: string; children: React.ReactNode }> = ({ title, tooltipText, children }) => (
    <div className="bg-gray-800/60 border border-gray-700 p-4 rounded-lg shadow-lg flex flex-col items-center justify-center text-center min-h-[210px] transition-all duration-300">
        <h4 className="text-md font-semibold text-white mb-2 flex items-center">{title} <InfoIcon tooltipText={tooltipText} /></h4>
        <div className="flex-grow flex flex-col items-center justify-center w-full">{children}</div>
    </div>
);

const AnalyticsSummary: React.FC<{
    analyticsData: PortfolioAnalyticsCache | null;
    analyticsMode: AnalyticsMode;
    error: string | null;
    animationKey: number;
}> = ({ analyticsData, analyticsMode, error, animationKey }) => {
    
    const canRenderData = analyticsData && analyticsData.success_rate_denominator > 0;
    const profitableText = analyticsMode === 'stock' ? 'profitable stocks' : 'profitable trades';
    const avgReturnText = analyticsMode === 'stock' ? 'Value-weighted return' : 'Avg. return per trade';
    
    const successRatePct = canRenderData ? analyticsData.success_rate_pct : null;
    const numerator = canRenderData ? analyticsData.success_rate_numerator : null;
    const denominator = canRenderData ? analyticsData.success_rate_denominator : null;
    const avgReturn = canRenderData ? analyticsData.avg_return_pct : null;

    if (error) {
        return <div className="col-span-1 sm:col-span-2 text-center text-red-400 bg-red-900/40 p-4 rounded-lg h-full flex items-center justify-center min-h-[210px]">{error}</div>;
    }

    return (
        <>
            <AnalyticsCard title="Success Rate" tooltipText="Methodology: Net-of-fees • Pre-calculated daily. '1D' is live-calculated.">
                <RadialProgress key={animationKey} percentage={successRatePct} />
                <div className="text-base text-gray-300 mt-2 h-[40px] flex flex-col items-center justify-center">
                    <div className="flex items-baseline space-x-1.5 h-[28px] items-center">
                        <AnimatedNumber
                            key={`${animationKey}-num`}
                            value={numerator}
                            formatter={(val) => Math.round(val).toString()}
                            className="text-white text-xl font-bold"
                        />
                        <span className="text-gray-400 text-base">out of</span>
                        <AnimatedNumber
                            key={`${animationKey}-den`}
                            value={denominator}
                            formatter={(val) => Math.round(val).toString()}
                            className="text-white text-xl font-bold"
                        />
                    </div>
                    <span className="font-sans">{profitableText}</span>
                </div>
            </AnalyticsCard>

            <AnalyticsCard title="Average Return" tooltipText="Methodology: Net-of-fees • Pre-calculated daily. '1D' is live-calculated.">
                 <div className="h-[48px] flex items-center">
                    <AnimatedNumber
                        key={animationKey}
                        value={avgReturn}
                        className={`text-4xl font-bold ${avgReturn === null || avgReturn >= 0 ? 'text-green-400' : 'text-red-500'}`}
                        formatter={(val) => `${val.toFixed(2)}%`}
                    />
                 </div>
                 <p className="text-base text-gray-300 mt-2 h-[20px]">
                    {avgReturnText}
                </p>
            </AnalyticsCard>
        </>
    );
};

// --- Main Page Component ---
const MainPage: React.FC<MainPageProps> = ({ 
    portfolios, currency, exchangeRate, onDeleteStock, 
    onRefreshPrices, livePriceFetchStatus, justUpdatedSymbols,
    autoRefreshSettings, onToggleAutoRefresh, setViewedPortfolioId,
    transactions, rawPriceDataCache, onPricesRendered,
    marketStatus, selectedPortfolioId, setSelectedPortfolioId, snapshotBackfillStatus,
    displayMethod, onDisplayMethodChange
}) => {
  const [summaryTimeRange, setSummaryTimeRange] = useState<SummaryTimeRange>('Total');
  const [analyticsMode, setAnalyticsMode] = useState<AnalyticsMode>('stock');
  
  const activePortfolio = useMemo(() => portfolios.find(p => p.id === selectedPortfolioId), [portfolios, selectedPortfolioId]);
  const activeTabName = useMemo(() => activePortfolio?.name || 'Alpha-Pick', [activePortfolio]);
  
  const { data: analyticsData, isLoading: isAnalyticsLoading, error: analyticsError } = usePortfolioAnalytics(
      activePortfolio, transactions, rawPriceDataCache, summaryTimeRange, analyticsMode
  );

  const [displayAnalyticsData, setDisplayAnalyticsData] = useState<PortfolioAnalyticsCache | null>(analyticsData);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
      if (!isAnalyticsLoading && analyticsData) {
          setDisplayAnalyticsData(analyticsData);
          setAnimationKey(k => k + 1);
      }
      else if (!isAnalyticsLoading && !analyticsData) {
          setDisplayAnalyticsData(null);
      }
  }, [analyticsData, isAnalyticsLoading]);

  const portfolioTabs = useMemo(() => portfolios.map(p => p.name), [portfolios]);
  const TABS_WITH_ALPHA = useMemo(() => [...portfolioTabs, "Alpha-Pick"], [portfolioTabs]);
  
  const handleTabChange = (tabName: string) => {
      if (tabName === 'Alpha-Pick') setSelectedPortfolioId(null);
      else {
          const portfolio = portfolios.find(p => p.name === tabName);
          if (portfolio) setSelectedPortfolioId(portfolio.id);
      }
  };

  useEffect(() => { if (livePriceFetchStatus.phase === 'rendering') { const timer = setTimeout(() => { onPricesRendered(); }, 1500); return () => clearTimeout(timer); } }, [livePriceFetchStatus.phase, onPricesRendered]);
  useEffect(() => { setViewedPortfolioId(activePortfolio?.id ?? null); }, [activePortfolio, setViewedPortfolioId]);

  const isFetching = !['idle', 'completed'].includes(livePriceFetchStatus.phase);

  // --- Column Visibility State ---
  const STORAGE_KEY = 'portfolioColumns.v2';
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) { console.error("Failed to load visible columns state", e); }
    return new Set(ALL_TABLE_COLUMNS.map(c => c.key));
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
  }, [visibleColumns]);

  const canDisplaySnapshot = !!displayAnalyticsData;
  const snapshotData = {
      evaluated: canDisplaySnapshot ? displayAnalyticsData.snapshot_evaluated_count : null,
      profitable: canDisplaySnapshot ? displayAnalyticsData.snapshot_profitable_count : null,
      transactions: canDisplaySnapshot ? displayAnalyticsData.transaction_count : null,
  };

  const ModeBadge: React.FC<{ portfolio: Portfolio }> = ({ portfolio }) => {
    if (!portfolio.portfolio_mode) return null;

    const isCashAware = portfolio.portfolio_mode === 'CASH_AWARE';
    const text = isCashAware ? 'Full Portfolio' : 'Stock Only';
    const classes = isCashAware 
      ? 'bg-blue-600 text-white' 
      : 'bg-orange-600 text-white';
    const tooltip = isCashAware
      ? 'Tracks all deposits, withdrawals, and cash balance for accurate time-weighted return'
      : 'Tracks stock buy/sell transactions only. Performance calculated using simple return method';

    return (
      <span
        title={tooltip}
        className={`text-xs font-semibold px-3 py-1 rounded-full ${classes}`}
      >
        {text}
      </span>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{activeTabName}</h1>
            {activePortfolio && <ModeBadge portfolio={activePortfolio} />}
          </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-4">
        <div className="flex-1 min-w-[200px]"><Tabs tabs={TABS_WITH_ALPHA} activeTab={activeTabName} setActiveTab={handleTabChange} /></div>
        <div className="flex items-center space-x-4 flex-shrink-0">
            {activePortfolio && (
                <div className="hidden sm:flex items-center space-x-3 text-sm text-gray-400 bg-gray-800/50 border border-gray-700/80 rounded-lg px-3 py-1.5">
                    <div className="flex items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mr-2 ${marketStatus === 'open' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={marketStatus === 'open' ? 'Market is Open' : 'Market is Closed'}></div>
                        <span className="text-base text-yellow-400">Market {marketStatus === 'open' ? 'Open' : 'Closed'}</span>
                    </div>
                    <span className="text-gray-600">|</span>
                    <AutoRefreshToggle 
                        isEnabled={!!autoRefreshSettings[activePortfolio.id]} 
                        onChange={() => onToggleAutoRefresh(activePortfolio.id)} 
                        marketStatus={marketStatus} 
                    />
                </div>
            )}
            <div className="flex items-center space-x-2">
                <div className="h-8 flex items-center min-w-[150px] justify-end"><FetchStatusIndicator status={livePriceFetchStatus} /></div>
                <button onClick={() => onRefreshPrices(selectedPortfolioId)} disabled={!activePortfolio || isFetching} title="Refresh Live Prices" className="flex-shrink-0 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B1220] focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"><svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg></button>
            </div>
        </div>
      </div>
      
      {activePortfolio && activeTabName !== "Alpha-Pick" && (
        <div className="mt-6 space-y-6">
            <PortfolioReturnsSummary 
                portfolio={activePortfolio}
                transactions={transactions}
                rawPriceDataCache={rawPriceDataCache}
                snapshotBackfillStatus={snapshotBackfillStatus} 
                currency={currency} 
                exchangeRate={exchangeRate} 
                displayMethod={displayMethod}
                onDisplayMethodChange={onDisplayMethodChange}
            />
            <div className="flex flex-wrap justify-between items-end gap-4">
                <h2 className="text-2xl font-bold text-white">Portfolio Summary</h2>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center bg-gray-800/60 border border-gray-700 p-1 rounded-md text-sm" title="Change analytics calculation mode"><button onClick={() => setAnalyticsMode('transaction')} className={`px-3 py-1 rounded-md text-xs transition-colors ${analyticsMode === 'transaction' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}>By Transaction</button><button onClick={() => setAnalyticsMode('stock')} className={`px-3 py-1 rounded-md text-xs transition-colors ${analyticsMode === 'stock' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}>By Stock</button></div>
                    <div className="flex items-center bg-gray-800/60 border border-gray-700 p-1 rounded-md text-sm">{(['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', 'Total'] as SummaryTimeRange[]).map(range => (<button key={range} onClick={() => setSummaryTimeRange(range)} className={`px-3 py-1 rounded-md text-xs transition-colors ${summaryTimeRange === range ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}>{range}</button>))}</div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <AnalyticsSummary
                            analyticsData={displayAnalyticsData}
                            analyticsMode={analyticsMode}
                            error={analyticsError}
                            animationKey={animationKey}
                         />
                    </div>
                </div>

                <div className="bg-gray-800/60 border border-gray-700 p-4 rounded-lg shadow-lg flex flex-col justify-center min-h-[210px]">
                    <h3 className="text-lg font-semibold text-white mb-3">Portfolio Snapshot</h3>
                    <div className="text-gray-300 list-inside space-y-4">
                        <div className="flex items-baseline">
                            <span className="w-2 h-2 bg-gray-500 rounded-full mr-3 flex-shrink-0"></span>
                            <div className="flex items-baseline space-x-2">
                                <AnimatedNumber
                                    key={`${animationKey}-snap-eval`}
                                    value={snapshotData.evaluated}
                                    formatter={v => Math.round(v).toString()} className="font-bold text-white text-xl"
                                />
                                <span className="text-gray-300 text-base font-sans">Total Holdings</span>
                            </div>
                        </div>
                        <div className="flex items-baseline">
                            <span className="w-2 h-2 bg-gray-500 rounded-full mr-3 flex-shrink-0"></span>
                            <div className="flex items-baseline flex-wrap">
                                <AnimatedNumber
                                    key={`${animationKey}-snap-prof`}
                                    value={snapshotData.profitable}
                                    formatter={v => Math.round(v).toString()} className="font-bold text-white text-xl"
                                />
                                <span className="text-gray-300 text-base mx-1.5 font-sans">of</span>
                                <AnimatedNumber
                                    key={`${animationKey}-snap-eval2`}
                                    value={snapshotData.evaluated}
                                    formatter={v => Math.round(v).toString()} className="font-bold text-white text-xl"
                                />
                                <span className="text-gray-300 text-base ml-2 font-sans">Profitable ({summaryTimeRange})</span>
                            </div>
                        </div>
                        <div className="flex items-baseline">
                            <span className="w-2 h-2 bg-gray-500 rounded-full mr-3 flex-shrink-0"></span>
                            <div className="flex items-baseline space-x-2">
                                <AnimatedNumber
                                    key={`${animationKey}-snap-txns`}
                                    value={snapshotData.transactions}
                                    formatter={v => Math.round(v).toString()} className="font-bold text-white text-xl"
                                />
                                <span className="text-gray-300 text-base font-sans">Transactions in Period ({summaryTimeRange})</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {(!isAnalyticsLoading && !analyticsError && (!displayAnalyticsData || displayAnalyticsData.success_rate_denominator === 0)) && (<div className="mt-4 text-center text-gray-500 text-sm p-4 bg-gray-800/40 rounded-lg">Not enough data to calculate analytics for the selected '{summaryTimeRange}' period.</div>)}
            {!isAnalyticsLoading && displayAnalyticsData?.warnings && displayAnalyticsData.warnings.length > 0 && (<div className="mt-2 space-y-1 text-left p-2">{displayAnalyticsData.warnings.map((warning, index) => (<p key={index} className="text-xs text-yellow-400/80">⚠️ {warning}</p>))}</div>)}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mt-8 mb-4">
        <h2 className="text-2xl font-bold text-white">Portfolio Overview</h2>
        {activeTabName !== 'Alpha-Pick' && (
          <ColumnVisibilityControl
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
          />
        )}
      </div>
      <div className="bg-[#111827] rounded-lg shadow-2xl shadow-black/30 overflow-hidden">
        {activeTabName === 'Alpha-Pick' ? ( <AlphaPickTable data={alphaPickData} /> ) : 
        ( activePortfolio ? <PortfolioTable key={activePortfolio.id} portfolioId={activePortfolio.id} data={activePortfolio.data.filter(item => item.symbol !== 'CASH')} cash={activePortfolio.cash} total={activePortfolio.total} currency={currency} exchangeRate={exchangeRate} onDeleteStock={onDeleteStock} justUpdatedSymbols={justUpdatedSymbols} visibleColumns={visibleColumns} /> : 
        <div className="p-10 text-center text-gray-500">Select or create a portfolio to view its details.</div> )}
      </div>
    </div>
  );
};

export default MainPage;