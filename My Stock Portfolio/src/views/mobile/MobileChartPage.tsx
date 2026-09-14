import React from 'react';
import { useXChartStore } from '../../stores/xchartStore';
import { XChartPanel } from '../../components/xchart/XChartPanel';
import { XChartWatchlistDock } from '../../components/xchart/XChartWatchlistDock';

export const MobileChartPage: React.FC = () => {
  const { tabs, activeTabId } = useXChartStore();
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-[#0B1220] overflow-hidden relative min-h-0 select-none">
      {/* Main Chart Area */}
      <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative min-h-0">
        {activeTab ? (
          <XChartPanel
            key={activeTab.id}
            symbol={activeTab.symbol}
            tabId={activeTab.id}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            ไม่มีแท็บที่เปิดอยู่
          </div>
        )}
      </div>

      {/* Slide-over Watchlist Drawer on mobile (renders when !watchlistCollapsed) */}
      <XChartWatchlistDock />
    </div>
  );
};
