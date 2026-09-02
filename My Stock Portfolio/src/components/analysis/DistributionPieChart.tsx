import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Holding } from '../../hooks/useHoldings';
import { useTransactionStore } from '../../stores/transactionStore';
import clsx from 'clsx';

interface Props {
  holdings: Holding[];
}

const COLORS = ['#FC2D79', '#823AFD', '#FD5514', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'];

export const DistributionPieChart: React.FC<Props> = ({ holdings }) => {
  const [mode, setMode] = useState<'Asset' | 'Stock Type'>('Asset');
  const { transactions } = useTransactionStore();

  const data = React.useMemo(() => {
    // Map each symbol to its latest asset/stock_type based on transactions
    const metadataMap: Record<string, { asset: string; stock_type: string }> = {};
    
    [...transactions]
      .filter(t => t.status === 'CONFIRMED' && t.type === 'BUY')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(tx => {
        if (tx.symbol) {
          metadataMap[tx.symbol] = {
            asset: tx.asset || 'Stock',
            stock_type: tx.stock_type || 'Unknown'
          };
        }
      });

    const groups: Record<string, number> = {};

    holdings.forEach(h => {
      if (h.currentValue <= 0) return;
      const meta = metadataMap[h.symbol] || { asset: 'Stock', stock_type: 'Unknown' };
      const key = mode === 'Asset' ? meta.asset : meta.stock_type;
      groups[key] = (groups[key] || 0) + h.currentValue;
    });

    let result = Object.entries(groups).map(([name, value]) => ({ name, value }));
    result.sort((a, b) => b.value - a.value);

    return result.map((d, i) => ({
      ...d,
      color: COLORS[i % COLORS.length]
    }));
  }, [holdings, transactions, mode]);

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 h-[400px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Distribution</h3>
        <div className="flex bg-[#1A1D2D] rounded-lg p-1">
          <button
            onClick={() => setMode('Asset')}
            className={clsx("px-3 py-1 rounded-md text-sm font-medium transition-colors", mode === 'Asset' ? "bg-[#823AFD] text-white" : "text-[#9898C8] hover:text-white")}
          >
            Asset
          </button>
          <button
            onClick={() => setMode('Stock Type')}
            className={clsx("px-3 py-1 rounded-md text-sm font-medium transition-colors", mode === 'Stock Type' ? "bg-[#823AFD] text-white" : "text-[#9898C8] hover:text-white")}
          >
            Type
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center">
        {data.length > 0 ? (
          <>
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
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
            
            <div className="w-1/2 h-full flex flex-col justify-center gap-3">
              {data.map((entry) => (
                <div key={entry.name} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-md" style={{ backgroundColor: entry.color }}></div>
                  <div className="flex-1 text-sm font-medium text-white">{entry.name}</div>
                  <div className="text-sm text-[#9898C8]">${entry.value.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="w-full text-center text-[#9898C8]">No distribution data available</div>
        )}
      </div>
    </div>
  );
};
