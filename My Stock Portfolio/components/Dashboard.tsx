

import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Portfolio, PortfolioItem } from '../types';
import AllocationPieChart from './charts/AllocationPieChart';
import DistributionPieChart, { DistributionMode } from './charts/DistributionPieChart';
import Heatmap from './Heatmap';
import CostValueBars from './charts/CostValueBars';


interface DashboardProps {
  portfolio: Portfolio;
  currency: 'USD' | 'THB';
  exchangeRate: number;
  portfolioName: string; // Added from parent
  dashboardContainerRef: React.RefObject<HTMLElement>; // Added from parent
  portfolioPriceData: Record<string, Record<string, number>>;
  onUpdatePortfolioGoal: (portfolioId: string, goalData: { goal_amount: number; goal_currency: 'USD' | 'THB' }) => void;
}

const formatCurrency = (value: number, currency: 'USD' | 'THB', exchangeRate: number) => {
    const rate = currency === 'THB' ? exchangeRate : 1;
    const convertedValue = value * rate;

    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: currency,
    };
     if (currency === 'THB') {
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = 0;
    } else {
        options.minimumFractionDigits = 2;
        options.maximumFractionDigits = 2;
    }

    return new Intl.NumberFormat(currency === 'THB' ? 'th-TH' : 'en-US', options).format(convertedValue);
};

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const useAnimatedValue = (endValue: number, duration = 1200) => {
    const [currentValue, setCurrentValue] = useState(0);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        // Explicitly cancel any previous animation frame before starting a new one.
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
        }
        
        const startTime = performance.now();
        const startValue = 0; // Always start animation from 0

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 5); // Ease out quint

            const nextValue = startValue + (endValue - startValue) * easedProgress;
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

const GoalProgressBar: React.FC<{
  portfolio: Portfolio;
  portfolioValueThb: number;
  exchangeRate: number;
  onUpdateGoal: (data: { goal_amount: number; goal_currency: 'USD' | 'THB' }) => void;
}> = ({ portfolio, portfolioValueThb, exchangeRate, onUpdateGoal }) => {
  const [goalAmount, setGoalAmount] = useState(portfolio.goal_amount || 1000000);
  const [goalCurrency, setGoalCurrency] = useState<'USD' | 'THB'>(portfolio.goal_currency || 'THB');
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputCurrency, setInputCurrency] = useState<'USD' | 'THB'>(goalCurrency);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // This effect syncs the component's state with the portfolio prop when it changes.
    setGoalAmount(portfolio.goal_amount || 1000000);
    setGoalCurrency(portfolio.goal_currency || 'THB');
  }, [portfolio.id, portfolio.goal_amount, portfolio.goal_currency]);

  const goalAmountInThb = useMemo(() => {
    return goalCurrency === 'USD' ? goalAmount * exchangeRate : goalAmount;
  }, [goalAmount, goalCurrency, exchangeRate]);

  const progress = useMemo(() => {
    return goalAmountInThb > 0 ? Math.min((portfolioValueThb / goalAmountInThb) * 100, 100) : 0;
  }, [portfolioValueThb, goalAmountInThb]);

  const goalAchieved = portfolioValueThb >= goalAmountInThb;
  
  const barWidth = useAnimatedValue(progress, 1200);
  const animatedPercentageText = useAnimatedValue(progress, 1200);

  const handleSave = () => {
    const newGoal = parseFloat(inputValue.replace(/,/g, ''));
    if (!isNaN(newGoal) && newGoal > 0) {
      onUpdateGoal({ goal_amount: newGoal, goal_currency: inputCurrency });
      // Optimistically update local state for immediate feedback
      setGoalAmount(newGoal);
      setGoalCurrency(inputCurrency);
    }
    setIsEditing(false);
  };
  
  const handleCancel = () => {
      setIsEditing(false);
  };

  const handleEditClick = () => {
      setInputValue(new Intl.NumberFormat('en-US', {useGrouping: false}).format(goalAmount));
      setInputCurrency(goalCurrency);
      setIsEditing(true);
  }

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);
  
  const formattedCurrentValue = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(portfolioValueThb);
  const formattedGoalValue = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(goalAmount);

  return (
    <div className="bg-[#1F2937] p-4 rounded-[16px] shadow-lg border border-white/5 space-y-3">
      <div className="flex justify-between items-center text-sm">
        <h4 className="font-semibold text-white">Portfolio Goal</h4>
        {!isEditing && (
             <button onClick={handleEditClick} className="text-gray-400 hover:text-white transition-colors text-xs flex items-center gap-1 bg-gray-700/50 px-2 py-1 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                Edit Goal
            </button>
        )}
      </div>

        {isEditing ? (
             <div className="space-y-3 animate-fade-in-fast">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-white text-sm w-full"
                    />
                    <div className="flex items-center bg-gray-800 border border-gray-700 p-0.5 rounded-md">
                        <button type="button" onClick={() => setInputCurrency('USD')} className={`px-2 py-0.5 rounded text-xs transition-colors ${inputCurrency === 'USD' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}>USD</button>
                        <button type="button" onClick={() => setInputCurrency('THB')} className={`px-2 py-0.5 rounded text-xs transition-colors ${inputCurrency === 'THB' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}>THB</button>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                     <button onClick={handleCancel} className="px-3 py-1 text-xs rounded-md bg-gray-600 hover:bg-gray-500">Cancel</button>
                     <button onClick={handleSave} className="px-3 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-500">Save</button>
                </div>
             </div>
        ) : (
             <div>
                <p className="text-gray-200 text-lg text-right">
                    <span className="font-bold text-white">{formattedCurrentValue}</span> / {formattedGoalValue} {goalCurrency}
                    <span className="text-gray-400 ml-2">({progress.toFixed(1)}%)</span>
                </p>
             </div>
        )}

      <div className="w-full bg-gray-700/50 rounded-full h-8 relative overflow-hidden border border-black/20 shadow-inner">
        <div
          style={{ width: `${barWidth}%` }}
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 flex items-center justify-end pr-2"
        >
          {animatedPercentageText > 10 && (
            <span className="text-sm font-bold text-white/80" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {animatedPercentageText.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
       {goalAchieved && !isEditing && <p className="text-center font-bold text-emerald-500 mt-2 text-sm">🎉 Goal Achieved! 🎉</p>}
       <style>{`.animate-fade-in-fast { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
};

const PortfolioSummary: React.FC<{ portfolio: Portfolio; currency: 'USD' | 'THB'; exchangeRate: number; onUpdatePortfolioGoal: (portfolioId: string, goalData: { goal_amount: number; goal_currency: 'USD' | 'THB' }) => void; }> = ({ portfolio, currency, exchangeRate, onUpdatePortfolioGoal }) => {
  const data = useMemo(() => {
    const portfolioValue = portfolio.total.currentValue;
    const securitiesValue = portfolio.data.reduce((sum, item) => sum + item.currentValue, 0);
    const cashBalance = portfolio.cash.currentValue;
    const totalPL = portfolio.total.totalReturn;
    const totalPLPercent = portfolio.total.totalReturnPercent;
    const securitiesPercent = portfolioValue > 0 ? (securitiesValue / portfolioValue) * 100 : 0;
    const cashPercent = portfolioValue > 0 ? (cashBalance / portfolioValue) * 100 : 0;
    const portfolioValueThb = portfolioValue * exchangeRate;
    return { portfolioValue, securitiesValue, cashBalance, totalPL, totalPLPercent, securitiesPercent, cashPercent, portfolioValueThb };
  }, [portfolio, exchangeRate]);

  const SummaryCard: React.FC<{ title: string; value: number; thbValue: number; valueClass?: string; percentage?: number; percentageColor?: string; tooltip: string; children?: React.ReactNode }> = ({ title, value, thbValue, valueClass, percentage, percentageColor, tooltip, children }) => {
    const thbNumberPart = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(thbValue * exchangeRate);

    return (
        <div className="bg-[#1F2937] p-5 group relative transition-transform duration-300 ease-out hover:scale-[1.05] hover:z-10 rounded-[16px] shadow-lg shadow-black/30 border border-white/5">
        <div className="absolute -top-2 -right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="relative text-xs text-center p-2 bg-gray-900 border border-gray-600 rounded-md shadow-lg">
                {tooltip}
            </div>
        </div>
        <div className="flex justify-between items-start">
            <div>
            <h4 className="text-sm font-medium text-gray-400 transition-all group-hover:text-base">{title}</h4>
            <p className={`text-3xl font-bold mt-2 ${valueClass || 'text-white'} transition-all group-hover:text-4xl`}>{formatCurrency(value, 'USD', 1)}</p>
             <p className="text-xl text-gray-400 mt-1 transition-all group-hover:text-2xl">
                {thbNumberPart}
                <span className="text-base text-gray-500 ml-1.5">THB</span>
            </p>
            </div>
            {percentage !== undefined && (
            <p className={`text-xl font-medium ${percentageColor} transition-all group-hover:text-2xl`}>{percentage.toFixed(2)}%</p>
            )}
        </div>
        {children}
        </div>
    );
    };
    
  const formatUsdOnly = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const formatThbOnly = (value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);


  return (
    <div className="space-y-6">
       <GoalProgressBar 
          portfolio={portfolio} 
          portfolioValueThb={data.portfolioValueThb} 
          exchangeRate={exchangeRate}
          onUpdateGoal={(goalData) => onUpdatePortfolioGoal(portfolio.id, goalData)}
       />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Portfolio Value" value={data.portfolioValue} thbValue={data.portfolioValue} tooltip="Total value of all securities and cash." />
        <SummaryCard title="Securities Value" value={data.securitiesValue} thbValue={data.securitiesValue} percentage={data.securitiesPercent} percentageColor="text-blue-400" tooltip="Total value of all stocks, ETFs, etc." />
        <SummaryCard title="Cash Balance" value={data.cashBalance} thbValue={data.cashBalance} percentage={data.cashPercent} percentageColor="text-red-400" tooltip="Uninvested cash in your portfolio." />
        <SummaryCard title="Total P/L" value={data.totalPL} thbValue={data.totalPL} valueClass={data.totalPL >= 0 ? 'text-emerald-500' : 'text-red-500'} tooltip="Total profit or loss since inception.">
          <p className={`text-lg font-bold mt-1 ${data.totalPL >= 0 ? 'text-emerald-500' : 'text-red-500'} transition-all group-hover:text-xl`}>{formatPercent(data.totalPLPercent)}</p>
        </SummaryCard>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2 text-base">
            <span className="text-white font-semibold">
                Securities: {formatUsdOnly(data.securitiesValue)}
                <span className="text-gray-400"> ({formatThbOnly(data.securitiesValue * exchangeRate)})</span>
            </span>
            <span className="text-white font-semibold">
                Cash: {formatUsdOnly(data.cashBalance)}
                <span className="text-gray-400"> ({formatThbOnly(data.cashBalance * exchangeRate)})</span>
            </span>
        </div>
        <div className="w-full bg-slate-800 rounded-lg h-10 flex overflow-hidden shadow-inner">
          <div 
              title={`Securities: ${data.securitiesPercent.toFixed(2)}%`} 
              style={{ width: `${data.securitiesPercent}%` }} 
              className="bg-gradient-to-r from-[#3B82F6] to-[#1E40AF] h-full flex items-center justify-start pl-4 transition-all duration-300 ease-out hover:brightness-125 cursor-pointer relative"
          >
              <span className="text-base font-semibold text-white drop-shadow-lg">
                  {data.securitiesPercent.toFixed(1)}%
              </span>
          </div>
          <div 
              title={`Cash: ${data.cashPercent.toFixed(2)}%`} 
              style={{ width: `${data.cashPercent}%` }} 
              className="bg-gradient-to-r from-[#EF4444] to-[#DC2626] h-full flex items-center justify-end pr-4 transition-all duration-300 ease-out hover:brightness-125 cursor-pointer relative"
          >
               <span className="text-base font-semibold text-white drop-shadow-lg">
                  {data.cashPercent.toFixed(1)}%
               </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const PerformersTable: React.FC<{ title: string; data: Portfolio['data']; isTop: boolean; currency: 'USD' | 'THB'; exchangeRate: number; }> = ({ title, data, isTop, currency, exchangeRate }) => (
    <div className="bg-[#1E293B] border border-white/5 p-4 rounded-[20px] shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="space-y-3">
            {data.length > 0 ? data.map(item => (
                <div key={item.symbol} className="flex justify-between items-center text-sm">
                    <span className="font-bold">{item.symbol}</span>
                    <div className="text-right">
                        <span className={`font-semibold ${isTop ? 'text-emerald-500' : 'text-red-500'}`}>
                            {formatPercent(item.totalReturnPercent)}
                        </span>
                        <br />
                        <span className="text-xs text-gray-400">
                            {formatCurrency(item.currentValue, currency, exchangeRate)}
                        </span>
                    </div>
                </div>
            )) : <p className="text-gray-500 text-sm">No data available.</p>}
        </div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ portfolio, currency, exchangeRate, portfolioPriceData, onUpdatePortfolioGoal }) => {
    const [allocationMode, setAllocationMode] = useState<'value' | 'profit'>('value');
    const [distributionMode, setDistributionMode] = useState<DistributionMode>('stockType');

    if (!portfolio || !portfolio.data) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Loading portfolio data...
            </div>
        );
    }
    const { data } = portfolio;

    const topPerformers = useMemo(() => {
        return [...data].sort((a, b) => b.totalReturnPercent - a.totalReturnPercent).slice(0, 5);
    }, [data]);

    const bottomPerformers = useMemo(() => {
        return [...data].sort((a, b) => a.totalReturnPercent - b.totalReturnPercent).slice(0, 5);
    }, [data]);

    return (
        <div className="p-1 space-y-8">
            <header className="flex flex-wrap justify-between items-center bg-[#1F2937] border border-white/5 p-4 rounded-[20px]">
                <h2 className="text-2xl font-bold text-white">Analysis – {portfolio.name}</h2>
            </header>

            <PortfolioSummary portfolio={portfolio} currency={currency} exchangeRate={exchangeRate} onUpdatePortfolioGoal={onUpdatePortfolioGoal} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#1E293B] border border-white/5 p-4 rounded-[20px] shadow-lg">
                     <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                        <h3 className="text-lg font-semibold text-white">Portfolio Allocation</h3>
                        <div className="flex items-center bg-gray-800 p-1 rounded-md text-sm">
                            {(['value', 'profit'] as const).map(mode => (
                                 <button key={mode} onClick={() => setAllocationMode(mode)} className={`px-2 py-0.5 rounded-md text-xs transition-colors capitalize ${allocationMode === mode ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                                     {mode === 'value' ? 'Weight %' : 'Profit %'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <AllocationPieChart portfolio={portfolio} mode={allocationMode} formatCurrency={(v) => formatCurrency(v, currency, exchangeRate)} />
                </div>
                <div className="bg-[#1E293B] border border-white/5 p-4 rounded-[20px] shadow-lg">
                     <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                        <h3 className="text-lg font-semibold text-white">Holdings Distribution</h3>
                        <div className="flex items-center bg-gray-800 p-1 rounded-md text-sm">
                            {(['stockType', 'sector', 'assetType'] as DistributionMode[]).map(mode => (
                                 <button key={mode} onClick={() => setDistributionMode(mode)} className={`px-2 py-0.5 rounded-md text-xs transition-colors capitalize ${distributionMode === mode ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                                     {mode.replace('Type', ' Type')}
                                </button>
                            ))}
                        </div>
                    </div>
                    <DistributionPieChart portfolio={portfolio} mode={distributionMode} formatCurrency={(v) => formatCurrency(v, currency, exchangeRate)} />
                </div>
            </div>

            <div className="mt-8">
                <CostValueBars holdings={portfolio.data} currency={currency} exchangeRate={exchangeRate} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PerformersTable title="Top 5 Performers" data={topPerformers} isTop={true} currency={currency} exchangeRate={exchangeRate} />
                <PerformersTable title="Bottom 5 Performers" data={bottomPerformers} isTop={false} currency={currency} exchangeRate={exchangeRate} />
            </div>

            <div className="grid grid-cols-1">
                <Heatmap 
                  data={data}
                  currency={currency}
                  exchangeRate={exchangeRate}
                  portfolioPriceData={portfolioPriceData}
                />
            </div>
        </div>
    );
};

export default Dashboard;