import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { LayoutDashboard, ReceiptText, Settings, LogOut, Briefcase, PieChart, LineChart, Target, ShieldCheck, Scale } from 'lucide-react';
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
