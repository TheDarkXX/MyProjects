import React, { useState } from 'react';
import { useXChartStore, XChartTab } from '../../stores/xchartStore';
import { 
  CandlestickChart, 
  Coins, 
  LayoutGrid, 
  X, 
  Plus, 
  Search,
  Check
} from 'lucide-react';
import clsx from 'clsx';

export const XChartTabBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTabId, closeTab, addTab } = useXChartStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [customTicker, setCustomTicker] = useState('');

  const handleCreateTab = (type: 'STOCK' | 'CURRENCY' | 'HEATMAP', symbol: string, title?: string) => {
    addTab({ type, symbol, title });
    setShowAddModal(false);
    setCustomTicker('');
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTicker.trim()) return;
    const clean = customTicker.trim().toUpperCase();
    const isCurrency = clean.includes('=X');
    handleCreateTab(isCurrency ? 'CURRENCY' : 'STOCK', clean, clean);
  };

  return (
    <div className="bg-[#0F111A] border-b border-[#1F2233] px-3 pt-2 flex items-center justify-between select-none shrink-0 h-12 overflow-x-auto custom-scrollbar">
      {/* Tabs List */}
      <div className="flex items-center gap-1.5 h-full">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={clsx(
                'group flex items-center gap-2.5 px-3.5 py-1.5 h-9 rounded-t-xl text-sm font-semibold transition-all cursor-pointer border-t border-x relative',
                isActive
                  ? 'bg-[#151926] text-white border-[#2A2E45] border-b-transparent shadow-sm'
                  : 'bg-transparent text-slate-300 hover:text-white hover:bg-white/5 border-transparent'
              )}
            >
              {/* Active Tab Neon Top Indicator */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#823AFD] via-[#FC2D79] to-[#FD5514] rounded-t-full" />
              )}

              {/* Tab Icon */}
              {tab.type === 'STOCK' && (
                <CandlestickChart className={clsx('w-4 h-4', isActive ? 'text-rose-400' : 'text-slate-400')} />
              )}
              {tab.type === 'CURRENCY' && (
                <Coins className={clsx('w-4 h-4', isActive ? 'text-amber-400' : 'text-slate-400')} />
              )}
              {tab.type === 'HEATMAP' && (
                <LayoutGrid className={clsx('w-4 h-4', isActive ? 'text-emerald-400' : 'text-slate-400')} />
              )}

              {/* Title */}
              <span className="truncate max-w-[130px] font-heading">{tab.title}</span>

              {/* Close Button */}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={clsx(
                    'p-1 rounded-md transition-colors cursor-pointer ml-1',
                    isActive
                      ? 'text-slate-400 hover:text-white hover:bg-white/10'
                      : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10'
                  )}
                  title="Close tab"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Tab Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10 cursor-pointer ml-1"
          title="Open New Tab (+)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add Tab Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#1F2233]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">เปิดแท็บใหม่ (Open New Tab)</h3>
                  <p className="text-xs text-slate-300">ค้นหาหุ้น ค่าเงิน หรือภาพรวมตลาด</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Ticker Input */}
            <form onSubmit={handleCustomSubmit} className="space-y-2">
              <label className="text-xs font-semibold text-slate-200">พิมพ์ชื่อย่อหุ้น (Symbol / Ticker)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customTicker}
                    onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
                    placeholder="e.g. NVDA, AAPL, THB=X"
                    autoFocus
                    className="w-full bg-[#0B1220] border border-[#2A2E45] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customTicker.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#823AFD] to-[#FC2D79] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0"
                >
                  เปิดกราฟ
                </button>
              </div>
            </form>

            {/* Quick Preset Buttons */}
            <div className="space-y-2.5 pt-2 border-t border-[#1F2233]">
              <div className="text-xs font-semibold text-slate-300">แท็บแนะนำยอดนิยม (Quick Presets)</div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleCreateTab('STOCK', 'VRT', 'VRT')}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <CandlestickChart className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-sm font-bold text-white">VRT (Vertiv Holdings)</div>
                      <div className="text-xs text-slate-300">Project 2X Main Runner</div>
                    </div>
                  </div>
                  <span className="text-xs text-purple-400 font-semibold">+ เปิดแท็บ</span>
                </button>

                <button
                  onClick={() => handleCreateTab('CURRENCY', 'THB=X', 'USD/THB')}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-sm font-bold text-white">USD/THB (อัตราแลกเปลี่ยน)</div>
                      <div className="text-xs text-slate-300">กราฟค่าเงินบาทเทียบดอลลาร์</div>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 font-semibold">+ เปิดแท็บ</span>
                </button>

                <button
                  onClick={() => handleCreateTab('HEATMAP', 'HEATMAP', 'Market Heatmap')}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-sm font-bold text-white">Market Heatmap (ภาพรวมตลาด)</div>
                      <div className="text-xs text-slate-300">S&P 500 Mega-Cap Heatmap</div>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">+ เปิดแท็บ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
