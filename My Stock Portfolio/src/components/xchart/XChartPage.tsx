import React from 'react';
import { useXChartStore } from '../../stores/xchartStore';
import { XChartTabBar } from './XChartTabBar';
import { XChartPanel } from './XChartPanel';
import { MarketHeatmap } from './MarketHeatmap';
import { XChartWatchlistDock } from './XChartWatchlistDock';

export const XChartPage: React.FC = () => {
  const { tabs, activeTabId } = useXChartStore();
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-[#0B1220] overflow-hidden select-none">
      {/* Top Multi-Tab Bar */}
      <XChartTabBar />

      {/* Main Terminal Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Canvas / Chart / Heatmap Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {activeTab ? (
            activeTab.type === 'HEATMAP' ? (
              <MarketHeatmap key={activeTab.id} />
            ) : (
              <XChartPanel 
                key={activeTab.id} 
                symbol={activeTab.symbol} 
                tabId={activeTab.id} 
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              ไม่มีแท็บที่เปิดอยู่
            </div>
          )}
        </div>

        {/* Right Watchlist Dock */}
        <XChartWatchlistDock />
      </div>
    </div>
  );
};
