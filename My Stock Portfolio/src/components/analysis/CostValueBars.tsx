import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Holding } from '../../hooks/useHoldings';
import clsx from 'clsx';

interface Props {
  holdings: Holding[];
}

type SortType = 'Value' | 'Cost' | 'Profit $' | 'Profit %' | 'A-Z';

export const CostValueBars: React.FC<Props> = ({ holdings }) => {
  const [sortBy, setSortBy] = useState<SortType>('Value');

  const data = React.useMemo(() => {
    let result = holdings
      .filter(h => h.currentValue > 0 || h.totalCost > 0)
      .map(h => ({
        name: h.symbol,
        cost: h.totalCost,
        value: h.currentValue,
        profit: h.totalReturn,
        profitPercent: h.totalReturnPercent
      }));

    switch (sortBy) {
      case 'Value':
        result.sort((a, b) => b.value - a.value);
        break;
      case 'Cost':
        result.sort((a, b) => b.cost - a.cost);
        break;
      case 'Profit $':
        result.sort((a, b) => b.profit - a.profit);
        break;
      case 'Profit %':
        result.sort((a, b) => b.profitPercent - a.profitPercent);
        break;
      case 'A-Z':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result.slice(0, 15); // Show top 15 max to avoid crowding
  }, [holdings, sortBy]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const cost = payload[0].value;
      const value = payload[1].value;
      const profit = value - cost;
      const percent = cost > 0 ? (profit / cost) * 100 : 0;
      
      return (
        <div className="bg-[#111418] border border-[#2A2E45] p-3 rounded-xl shadow-xl">
          <p className="font-bold text-white mb-2 text-lg">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-[#9898C8]">Cost Basis: <span className="text-white">${cost.toFixed(2)}</span></p>
            <p className="text-[#9898C8]">Current Value: <span className="text-white">${value.toFixed(2)}</span></p>
            <p className="text-[#9898C8]">Profit: <span className={profit >= 0 ? "text-[#FC2D79]" : "text-[#823AFD]"}>
              {profit >= 0 ? '+' : ''}${profit.toFixed(2)} ({percent.toFixed(2)}%)
            </span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 min-h-[450px] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Cost vs Value</h3>
        <div className="flex gap-2 bg-[#1A1D2D] p-1 rounded-lg">
          {(['Value', 'Cost', 'Profit $', 'Profit %', 'A-Z'] as SortType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSortBy(type)}
              className={clsx(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                sortBy === type ? "bg-[#823AFD] text-white" : "text-[#9898C8] hover:text-white"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 w-full mt-4">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2E45" vertical={false} />
              <XAxis dataKey="name" stroke="#CBD5E1" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#CBD5E1' }} />
              <YAxis stroke="#CBD5E1" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#CBD5E1' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1A1D2D', opacity: 0.4 }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="cost" name="Cost Basis" fill="#FD5514" radius={[4, 4, 0, 0]} />
              <Bar dataKey="value" name="Current Value" fill="#823AFD" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#9898C8]">
            No data available
          </div>
        )}
      </div>
    </div>
  );
};
