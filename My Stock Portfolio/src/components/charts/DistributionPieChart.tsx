import React, { useMemo, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { Portfolio } from '../../types';

export type DistributionMode = 'stockType' | 'sector' | 'assetType';

interface DistributionPieChartProps {
  portfolio: Portfolio;
  mode: DistributionMode;
  formatCurrency: (value: number) => string;
}

const professionalColors = ['#3B82F6', '#14B8A6', '#F97316', '#8B5CF6', '#EC4899', '#F43F5E', '#EAB308', '#22C55E', '#6366F1', '#D946EF'];
const stockTypeColors: Record<string, string> = {
    'Compound': '#3B82F6',
    'Winner': '#F43F5E',
    'Small Cap': '#F59E0B',
    'Cash': '#64748B',
    'N/A': '#475569'
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 20} // Pop out effect
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#1E293B"
        strokeWidth={2}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload, total, formatCurrency }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0];
  const value = data.value;
  const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : 0;
  
  return (
    <div 
      style={{
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        border: '1px solid rgba(107, 114, 128, 0.5)',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
      }}
    >
      <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
        {data.name}
      </p>
      <p style={{ color: '#e5e7eb', fontSize: '12px', margin: 0 }}>
        {formatCurrency(value)} ({percentage}%)
      </p>
    </div>
  );
};

const DistributionPieChart: React.FC<DistributionPieChartProps> = ({ portfolio, mode, formatCurrency }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, [setActiveIndex]);

  const onPieLeave = useCallback(() => {
    setActiveIndex(null);
  }, [setActiveIndex]);

  const chartData = useMemo(() => {
    const groupedData: { [key: string]: number } = {};
    
    portfolio.data.forEach(item => {
        const key = String(item[mode] || 'N/A');
        groupedData[key] = (groupedData[key] || 0) + item.currentValue;
    });

    if ((mode === 'assetType' || mode === 'stockType') && portfolio.cash.currentValue > 0) {
         groupedData['Cash'] = (groupedData['Cash'] || 0) + portfolio.cash.currentValue;
    }
    
    return Object.entries(groupedData)
        .map(([name, value], index) => {
          let color: string;
          if (mode === 'stockType') {
            color = stockTypeColors[name] || stockTypeColors['N/A'];
          } else {
            color = professionalColors[index % professionalColors.length];
          }
          return { name, value, color };
        })
        .sort((a, b) => b.value - a.value);

  }, [portfolio, mode]);
  
  const totalValue = useMemo(() => chartData.reduce((sum, entry) => sum + entry.value, 0), [chartData]);

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">No data available for this view.</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-center w-full">
        <div className="relative w-full lg:w-2/3 h-72">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={110}
                        paddingAngle={2}
                        stroke="#1E293B"
                        strokeWidth={2}
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        onMouseEnter={onPieEnter}
                        onMouseLeave={onPieLeave}
                        animationDuration={800}
                        animationEasing="ease-out"
                    >
                        {chartData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip 
                        content={<CustomTooltip total={totalValue} formatCurrency={formatCurrency} />}
                        wrapperStyle={{ zIndex: 1000 }}
                        position={{ y: 0 }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
        <div className="flex-1 w-full lg:w-1/3">
            <div className="flex flex-col gap-1">
                {chartData.map((item, idx) => {
                  const isCash = item.name === 'Cash' && (mode === 'assetType' || mode === 'stockType');
                  const separatorClass = isCash ? 'border-t border-slate-700/50 mt-1 pt-1' : '';

                  return (
                    <div 
                        key={idx}
                        className={`flex items-center gap-3 px-3 py-1 rounded-lg transition-all duration-200 cursor-pointer ${activeIndex === idx ? 'bg-slate-700/80 scale-105' : 'bg-slate-800/50 hover:bg-slate-700/50'} ${separatorClass}`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onMouseLeave={() => setActiveIndex(null)}
                    >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-white">{item.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <span className="text-sm font-semibold text-white font-mono">{formatCurrency(item.value)}</span>
                            <span className="ml-2 text-xs text-gray-400 font-mono">
                                ({totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0.0'}%)
                            </span>
                        </div>
                    </div>
                )})}
            </div>
        </div>
    </div>
  );
};

export default DistributionPieChart;