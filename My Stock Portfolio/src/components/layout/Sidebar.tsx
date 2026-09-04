import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useHoldings } from '../../hooks/useHoldings';
import { LayoutDashboard, ReceiptText, Settings, LogOut, Briefcase, TrendingUp, TrendingDown, PieChart, LineChart, Target, ShieldCheck, Scale } from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'performance', label: 'Performance', icon: LineChart },
  { id: 'risk', label: 'Risk & Alpha', icon: ShieldCheck },
  { id: 'scorecard', label: 'Scorecard', icon: Target },
  { id: 'rebalance', label: 'Smart Rebalance', icon: Scale },
  { id: 'analysis', label: 'Analysis', icon: PieChart },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'portfolios', label: 'Portfolios', icon: Briefcase },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar = () => {
  const { activeTab, setActiveTab } = useUiStore();
  const logout = useAuthStore((s) => s.logout);
  const { holdings } = useHoldings();

  const topWinners = [...holdings].filter(h => h.dayChangePercent > 0).sort((a, b) => b.dayChangePercent - a.dayChangePercent).slice(0, 3);
  const topLosers = [...holdings].filter(h => h.dayChangePercent < 0).sort((a, b) => a.dayChangePercent - b.dayChangePercent).slice(0, 3);

  return (
    <aside className="w-72 bg-[#0F111A] border-r border-[#1F2233] flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.2)] h-screen overflow-y-auto custom-scrollbar">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#823AFD] via-[#FC2D79] to-[#FD5514] flex items-center justify-center shadow-[0_4px_12px_rgba(130,58,253,0.28)]">
          <span className="text-white font-bold text-sm">SP</span>
        </div>
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#9898C8]">
          StockPro
        </h2>
      </div>

      {/* Nav */}
      <nav className="px-4 py-2 space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium",
                isActive 
                  ? "bg-[#1A1D2D] text-white shadow-[0_4px_12px_rgba(130,58,253,0.15)] border border-[#2A2E45]" 
                  : "text-[#9898C8] hover:bg-[#1A1D2D]/50 hover:text-white hover:translate-x-1"
              )}
            >
              <Icon className={clsx("w-5 h-5", isActive ? "text-[#823AFD]" : "text-[#9898C8]")} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Top Movers */}
      {(topWinners.length > 0 || topLosers.length > 0) && (
        <div className="px-4 py-6 mt-4 border-t border-[#1F2233]">
          <h3 className="text-xs font-bold text-[#9898C8] uppercase tracking-wider mb-4 px-2">Top Movers Today</h3>
          
          {topWinners.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 px-2">
                <TrendingUp className="w-4 h-4 text-[#FC2D79]" />
                <span className="text-sm font-medium text-white">Winners</span>
              </div>
              <div className="space-y-2">
                {topWinners.map(h => (
                  <div key={h.symbol} className="flex justify-between items-center p-2 rounded-lg hover:bg-[#1A1D2D] transition-colors">
                    <span className="text-white text-sm font-bold">{h.symbol}</span>
                    <span className="text-[#FC2D79] text-sm font-medium">+{h.dayChangePercent.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topLosers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-2">
                <TrendingDown className="w-4 h-4 text-[#823AFD]" />
                <span className="text-sm font-medium text-white">Losers</span>
              </div>
              <div className="space-y-2">
                {topLosers.map(h => (
                  <div key={h.symbol} className="flex justify-between items-center p-2 rounded-lg hover:bg-[#1A1D2D] transition-colors">
                    <span className="text-white text-sm font-bold">{h.symbol}</span>
                    <span className="text-[#823AFD] text-sm font-medium">{h.dayChangePercent.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1"></div>

      {/* Footer */}
      <div className="p-4 border-t border-[#1F2233]">
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#FC2D79] hover:bg-[#FC2D79]/10 transition-all font-medium"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};
