import React, { useMemo } from 'react';
import { Portfolio, PortfolioItem } from '../types';

const TopMoversCards: React.FC<{data: PortfolioItem[]}> = ({data}) => {
    const percentFormatter = (value: number) => `${value.toFixed(2)}%`;
    const movers = useMemo(() => data.filter(item => item.prevWeekReturnPct !== undefined).map(item => ({ ...item, change: item.totalReturnPercent - item.prevWeekReturnPct! })), [data]);
    const winners = movers.filter(m => m.change > 0).sort((a,b) => b.change - a.change).slice(0, 3);
    const losers = movers.filter(m => m.change < 0).sort((a,b) => a.change - b.change).slice(0, 3);
    const Card: React.FC<{ item: any, type: 'gainer' | 'loser'}> = ({ item, type }) => (
        <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="flex justify-between items-center mb-1"><span className="font-bold text-white">{item.symbol}</span><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${type === 'gainer' ? 'bg-[#10B981]' : 'bg-[#F43F5E]'}`}>{type === 'gainer' ? '▲' : '▼'} {item.change.toFixed(2)}%</span></div><div className="text-sm text-gray-400">{percentFormatter(item.totalReturnPercent)} Total</div>
        </div>
    );
    return (<div className="grid grid-cols-1 gap-4 h-full content-start"><div><h4 className="text-md font-semibold mb-2 text-[#10B981]">Top Winners</h4><div className="space-y-2">{winners.length > 0 ? winners.map(w => <Card key={w.symbol} item={w} type="gainer" />) : <p className="text-gray-500 text-sm">No weekly gains.</p>}</div></div><div><h4 className="text-md font-semibold mb-2 text-[#F43F5E]">Top Losers</h4><div className="space-y-2">{losers.length > 0 ? losers.map(l => <Card key={l.symbol} item={l} type="loser" />) : <p className="text-gray-500 text-sm">No weekly losses.</p>}</div></div></div>);
};

interface SidebarProps {
  portfolios: Portfolio[];
  selectedPortfolioId: string;
  setSelectedPortfolioId: (id: string | null) => void;
  showAllOption?: boolean;
  allOptionLabel?: string;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  showTopMovers?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  portfolios,
  selectedPortfolioId,
  setSelectedPortfolioId,
  showAllOption = false,
  allOptionLabel = 'All',
  onSelectAll,
  isAllSelected = false,
  showTopMovers = true,
}) => {
  const selectedPortfolioData = useMemo(() => {
    return portfolios.find(p => p.id === selectedPortfolioId)?.data ?? [];
  }, [portfolios, selectedPortfolioId]);

  return (
    <aside className="w-full md:w-1/5 bg-[#0F172A] p-4 md:border-r md:border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4 hidden md:block">Portfolios</h2>
      <nav>
        <ul className="flex flex-row md:flex-col -mx-2 md:mx-0">
          {showAllOption && (
             <li className="mb-2 px-2 md:px-0 flex-1">
                <button
                  onClick={onSelectAll}
                  className={`w-full text-left flex items-center p-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0F172A] focus:ring-blue-500 ${
                    isAllSelected
                      ? 'bg-[#1E293B] text-white font-bold'
                      : 'text-gray-400 hover:bg-[#1E293B]/50 hover:text-white'
                  }`}
                  title={allOptionLabel}
                >
                  <div className="w-1 h-6 rounded-full mr-3" />
                  <span className="mr-3 text-xl">📂</span>
                  <span className="flex-1 hidden md:inline">{allOptionLabel}</span>
                </button>
              </li>
          )}
          {portfolios.map((portfolio) => {
            return (
              <li key={portfolio.id} className="mb-2 px-2 md:px-0 flex-1">
                <button
                  onClick={() => setSelectedPortfolioId(portfolio.id)}
                  className={`w-full text-left flex items-center p-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0F172A] focus:ring-blue-500 ${
                    selectedPortfolioId === portfolio.id
                      ? 'bg-[#1E293B] text-white font-bold'
                      : 'text-gray-400 hover:bg-[#1E293B]/50 hover:text-white'
                  }`}
                  title={`${portfolio.name} • ${portfolio.icon}`}
                >
                  <div
                    className={`w-1 h-6 rounded-full mr-3 transition-opacity ${selectedPortfolioId === portfolio.id ? 'opacity-100' : 'opacity-0'}`}
                    style={{ backgroundColor: portfolio.color_hex }}
                  />
                  <span className="mr-3 text-xl">{portfolio.icon}</span>
                  <span className="flex-1 hidden md:inline">{portfolio.name}</span>
                  <div className="w-3 h-3 rounded-full hidden md:block" style={{ backgroundColor: portfolio.color_hex }} />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {showTopMovers && (
        <div className="mt-8 hidden md:block">
            <TopMoversCards data={selectedPortfolioData} />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;