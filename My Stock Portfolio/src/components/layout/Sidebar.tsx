import React, { useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { 
  LayoutDashboard, ReceiptText, Settings, LogOut, 
  PieChart, ShieldCheck, Scale, Rocket, ChevronLeft, ChevronRight,
  CandlestickChart
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  id: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'insights',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'analysis', label: 'Analysis', icon: PieChart },
      { id: 'health', label: 'Health & Risk', icon: ShieldCheck },
    ],
  },
  {
    id: 'strategy',
    items: [
      { id: 'rebalance', label: 'Smart Rebalance', icon: Scale },
      { id: 'project2x', label: 'Project 2X', icon: Rocket },
      { id: 'xchart', label: 'X-Chart', icon: CandlestickChart },
    ],
  },
  {
    id: 'system',
    items: [
      { id: 'transactions', label: 'Transactions', icon: ReceiptText },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const Sidebar = () => {
  const { activeTab, setActiveTab, sidebarMode, toggleSidebarMode } = useUiStore();
  const logout = useAuthStore((s) => s.logout);
  const collapsed = sidebarMode === 'compact';

  return (
    <aside
      className={clsx(
        "bg-[#0F111A] border-r border-[#1F2233] flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.2)] h-screen overflow-y-auto custom-scrollbar shrink-0 transition-all duration-300 ease-in-out select-none",
        collapsed ? "w-[76px]" : "w-72"
      )}
    >
      {/* Brand & Show/Hide Toggle Button */}
      <div className={clsx("flex items-center border-b border-[#1F2233]/60", collapsed ? "p-4 flex-col gap-3 justify-center" : "p-5 justify-between")}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#823AFD] via-[#FC2D79] to-[#FD5514] flex items-center justify-center shadow-[0_4px_12px_rgba(130,58,253,0.28)] shrink-0">
            <span className="text-white font-bold text-sm">SP</span>
          </div>
          {!collapsed && (
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#9898C8] truncate">
              StockPro
            </h2>
          )}
        </div>

        {/* Show / Hide Toggle Button */}
        <button
          onClick={toggleSidebarMode}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-all cursor-pointer flex items-center justify-center"
          title={collapsed ? "Expand Sidebar (Widescreen OFF)" : "Collapse Sidebar (Widescreen ON)"}
          aria-label="Toggle Sidebar"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-cyan-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>

      {/* Nav with Exact 3 Groups Separated by Hairline Dividers */}
      <nav className={clsx("py-3 space-y-3", collapsed ? "px-2" : "px-4")}>
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.id} className="space-y-1.5">
            {sIdx > 0 && (
              <div className="pt-2 pb-2 px-1">
                <div className="border-t border-[#1F2233]" />
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={clsx(
                    "w-full flex items-center rounded-xl transition-all duration-200 text-sm font-semibold cursor-pointer",
                    collapsed ? "justify-center p-3" : "gap-3 px-4 py-2.5",
                    isActive 
                      ? "bg-[#1A1D2D] text-white shadow-[0_4px_16px_rgba(130,58,253,0.2)] border border-[#2A2E45]" 
                      : "text-slate-300 hover:bg-[#1A1D2D]/60 hover:text-white hover:translate-x-0.5"
                  )}
                >
                  <Icon className={clsx("w-5 h-5 shrink-0", isActive ? "text-[#823AFD]" : "text-slate-400")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex-1"></div>

      {/* Footer */}
      <div className={clsx("border-t border-[#1F2233]", collapsed ? "p-2" : "p-4")}>
        <button 
          onClick={logout}
          title="Sign Out"
          className={clsx(
            "w-full flex items-center rounded-xl text-[#FC2D79] hover:bg-[#FC2D79]/10 transition-all font-medium text-sm cursor-pointer",
            collapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
