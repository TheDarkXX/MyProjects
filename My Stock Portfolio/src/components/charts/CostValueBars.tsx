import React, { useMemo, useState } from 'react';
import { PortfolioItem } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Tooltip ---
const CustomTooltip = ({ active, payload, currency, exchangeRate }: any) => {
  if (!active || !payload || !payload[0]) return null;
  
  const data = payload[0].payload;
  if (!data) return null;

  const gainLoss = data.currentValue - data.costBasis;
  const isGain = gainLoss >= 0;
  const gainPercent = data.gainPercent || 0;

  const formatUsd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  const formatThb = (value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value * exchangeRate);

  return (
    <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-3 shadow-xl backdrop-blur-sm space-y-1 leading-relaxed">
      <p className="font-bold text-white mb-1">
        {data.symbol} - {data.name}
      </p>
      <p className="text-sm font-semibold text-white">
        Value: {formatUsd(data.currentValue)} ({formatThb(data.currentValue)})
      </p>
      <p className="text-sm text-slate-300">
        Cost: {formatUsd(data.costBasis)} ({formatThb(data.costBasis)})
      </p>
      <p className={`text-sm font-bold ${isGain ? 'text-emerald-500' : 'text-rose-500'}`}>
        P/L: {formatUsd(gainLoss)} ({isGain ? '+' : ''}{isFinite(gainPercent) ? `${gainPercent.toFixed(2)}%` : 'N/A'})
      </p>
    </div>
  );
};

// --- Data Preparation & Sorting ---
const prepareChartData = (holdings: PortfolioItem[]) => {
  if (!holdings || !Array.isArray(holdings)) return [];
  const validHoldings = holdings.filter(h => h && h.symbol && typeof h.currentValue === 'number' && !isNaN(h.currentValue) && typeof h.totalCost === 'number' && !isNaN(h.totalCost));
  
  return validHoldings.map(holding => {
    const costBasis = Number(holding.totalCost || 0);
    const currentValue = Number(holding.currentValue || 0);
    const gainLoss = currentValue - costBasis;
    let gainPercent = 0;
    if (costBasis > 0) gainPercent = (gainLoss / costBasis) * 100;
    else if (currentValue > 0) gainPercent = Infinity;

    return {
      symbol: holding.symbol || 'N/A',
      name: holding.name || holding.symbol || 'Unknown',
      stockType: holding.stockType || 'N/A',
      costBasis: costBasis,
      currentValue: currentValue,
      gainPercent: gainPercent,
      gain: Math.max(0, gainLoss),
      loss: Math.max(0, -gainLoss),
      valueAboveCost: Math.max(0, gainLoss),
    };
  });
};

const sortData = (data: ReturnType<typeof prepareChartData>, sortBy: SortType) => {
  const sorted = [...data];
  switch(sortBy) {
    case 'value': return sorted.sort((a, b) => b.currentValue - a.currentValue);
    case 'cost': return sorted.sort((a, b) => b.costBasis - a.costBasis);
    case 'profitAmount': return sorted.sort((a, b) => (b.currentValue - b.costBasis) - (a.currentValue - a.costBasis));
    case 'profitPercent': return sorted.sort((a, b) => b.gainPercent - a.gainPercent);
    case 'alphabetical': return sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
    default: return sorted;
  }
};


// --- Component ---
interface CostValueBarsProps {
  holdings: PortfolioItem[];
  currency: 'USD' | 'THB';
  exchangeRate: number;
}
type SortType = 'value' | 'cost' | 'profitAmount' | 'profitPercent' | 'alphabetical';
const SORT_OPTIONS: { key: SortType; label: string }[] = [
  { key: 'value', label: 'Value' }, { key: 'cost', label: 'Cost' },
  { key: 'profitAmount', label: 'Profit $' }, { key: 'profitPercent', label: 'Profit %' },
  { key: 'alphabetical', label: 'A-Z' },
];

const CostValueBars: React.FC<CostValueBarsProps> = ({ holdings, currency, exchangeRate }) => {
  const [sortBy, setSortBy] = useState<SortType>('value');
  const chartData = useMemo(() => prepareChartData(holdings), [holdings]);
  const sortedData = useMemo(() => sortData(chartData, sortBy).slice(0, 10), [chartData, sortBy]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 shadow-lg">
        <h3 className="text-white font-semibold text-lg mb-4">Holdings Value vs Cost Breakdown</h3>
        <div className="flex items-center justify-center h-80">
            <p className="text-slate-400 text-center py-8">No valid holdings data available to display chart.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="text-white font-semibold text-lg">Holdings Value vs Cost Breakdown</h3>
        <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg">
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-200 ${
                sortBy === key ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={sortedData}
          margin={{ top: 5, right: 20, left: 20, bottom: 50 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis 
            dataKey="symbol" 
            stroke="#94a3b8"
            tick={{ fill: '#e2e8f0', fontSize: 12 }}
            interval={0}
            angle={-45}
            textAnchor="end"
          />
          <YAxis 
            stroke="#94a3b8"
            tick={{ fill: '#e2e8f0', fontSize: 12 }}
            tickFormatter={(value) => `$${Number(value).toLocaleString(undefined, {maximumFractionDigits: 0})}`}
            width={80}
          />
          <Tooltip content={<CustomTooltip currency={currency} exchangeRate={exchangeRate} />} cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}/>
          
          <Bar dataKey="costBasis" stackId="a" fill="#F97317" />
          <Bar dataKey="valueAboveCost" stackId="a" fill="#2856C7" radius={[8, 8, 0, 0]} />

        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CostValueBars;