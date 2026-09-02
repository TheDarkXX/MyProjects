import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { Holding } from '../../hooks/useHoldings';
import clsx from 'clsx';

interface Props {
  holdings: Holding[];
}

const COLORS = ['#823AFD', '#FC2D79', '#FD5514', '#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#a4de6c', '#d0ed57', '#8884d8'];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="#fff" className="font-bold text-lg">
        {payload.name}
      </text>
      <text x={cx} y={cy + 15} dy={8} textAnchor="middle" fill="#9898C8" className="text-sm">
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        fill={fill}
      />
    </g>
  );
};

export const AllocationPieChart: React.FC<Props> = ({ holdings }) => {
  const [mode, setMode] = useState<'weight' | 'profit'>('weight');
  const [activeIndex, setActiveIndex] = useState(0);

  const data = React.useMemo(() => {
    let result = holdings.map(h => ({
      name: h.symbol,
      value: mode === 'weight' ? h.currentValue : Math.max(0, h.totalReturn),
      color: '',
      rawValue: mode === 'weight' ? h.currentValue : h.totalReturn
    }));
    
    // Sort and filter out zeros
    result = result.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    
    // Assign colors
    return result.map((d, i) => ({
      ...d,
      color: COLORS[i % COLORS.length]
    }));
  }, [holdings, mode]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  if (data.length === 0) {
    return (
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 h-[400px] flex items-center justify-center text-[#9898C8]">
        No data for {mode === 'weight' ? 'allocation' : 'profit'} chart
      </div>
    );
  }

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 h-[400px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Allocation</h3>
        <div className="flex bg-[#1A1D2D] rounded-lg p-1">
          <button
            onClick={() => setMode('weight')}
            className={clsx("px-3 py-1 rounded-md text-sm font-medium transition-colors", mode === 'weight' ? "bg-[#823AFD] text-white" : "text-[#9898C8] hover:text-white")}
          >
            By Weight
          </button>
          <button
            onClick={() => setMode('profit')}
            className={clsx("px-3 py-1 rounded-md text-sm font-medium transition-colors", mode === 'profit' ? "bg-[#823AFD] text-white" : "text-[#9898C8] hover:text-white")}
          >
            By Profit
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center">
        <div className="w-1/2 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                onMouseEnter={onPieEnter}
                stroke="#111418"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#111418', borderColor: '#2A2E45', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="w-1/2 h-full overflow-y-auto custom-scrollbar pr-2 space-y-2">
          {data.map((entry, index) => (
            <div 
              key={entry.name}
              onMouseEnter={() => setActiveIndex(index)}
              className={clsx(
                "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                activeIndex === index ? "bg-[#1A1D2D]" : "hover:bg-[#1A1D2D]/50"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-white font-medium text-sm">{entry.name}</span>
              </div>
              <span className="text-[#9898C8] text-sm">
                ${entry.rawValue.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
