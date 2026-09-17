import React from 'react';
import { RefreshCw, X, ArrowUpRight, ArrowDownRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useDossierStore } from '../../../stores/dossierStore';

interface DossierHeaderProps {
  onClose: () => void;
}

export const DossierHeader: React.FC<DossierHeaderProps> = ({ onClose }) => {
  const { data, selectedSymbol, selectSymbol, refreshFinancials, isRefreshing } = useDossierStore();

  if (!data) return null;

  const currentPrice = data.currentPrice || 0;
  const change = data.liveQuote?.change || 0;
  const changePct = data.liveQuote?.percent_change || 0;
  const isUp = change >= 0;

  // 13 Stocks List
  const stocks = [
    { symbol: 'NVDA', tier: 'Core 👑' },
    { symbol: 'TSM', tier: 'Core 👑' },
    { symbol: 'AVGO', tier: 'Core 👑' },
    { symbol: 'VRT', tier: 'Core 👑' },
    { symbol: 'MELI', tier: 'Core 👑' },
    { symbol: 'APH', tier: 'Core 👑' },
    { symbol: 'KLAC', tier: 'Core 👑' },
    { symbol: 'ANET', tier: 'Core 👑' },
    { symbol: 'CRWD', tier: 'Core 👑' },
    { symbol: 'STRL', tier: 'Moonshot 🚀' },
    { symbol: 'ALAB', tier: 'Moonshot 🚀' },
    { symbol: 'PLTR', tier: 'Moonshot 🚀' },
    { symbol: 'CLS', tier: 'Moonshot 🚀' }
  ];

  // Verdict Styling
  const verdictConfig = {
    BUY_ADD: {
      bg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
      pill: 'bg-emerald-500 text-slate-950 font-black',
      title: '🟢 BUY ADD ZONE (สะสมเพิ่มได้)',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />
    },
    HOLD_RIDE: {
      bg: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300',
      pill: 'bg-cyan-500 text-slate-950 font-black',
      title: '🟡 HOLD & RIDE TREND (ถือทับมือ)',
      icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />
    },
    TRIM_SELL: {
      bg: 'bg-rose-500/10 border-rose-500/40 text-rose-300',
      pill: 'bg-rose-500 text-white font-black',
      title: '🔴 TRIM / SELL ALERT (แจ้งเตือนความเสี่ยง)',
      icon: <AlertTriangle className="w-5 h-5 text-rose-400" />
    }
  }[data.verdict] || {
    bg: 'bg-slate-800/40 border-slate-700 text-slate-300',
    pill: 'bg-slate-700 text-white font-bold',
    title: 'HOLD & RIDE',
    icon: null
  };

  return (
    <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-4 mb-4">
      {/* Top Bar: Switcher Pills & Window Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Horizontal Quick Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {stocks.map((s) => {
            const isActive = s.symbol === selectedSymbol;
            return (
              <button
                key={s.symbol}
                onClick={() => selectSymbol(s.symbol)}
                className={`px-3 py-1.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 scale-105'
                    : 'bg-slate-900/80 text-slate-300 hover:text-slate-100 hover:bg-slate-800 border border-slate-800/80'
                }`}
              >
                <span>{s.symbol}</span>
                <span className={`text-[13px] opacity-75 font-normal ${isActive ? 'text-slate-950' : 'text-slate-400'}`}>
                  {s.symbol === 'NVDA' || s.symbol === 'TSM' || s.symbol === 'AVGO' ? '👑' : s.tier.includes('Moonshot') ? '🚀' : ''}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => refreshFinancials()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors"
            title="ดึงงบการเงินล่าสุดจาก Yahoo Finance เข้า SQLite"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">อัปเดตงบ</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Header Strip: Stock Profile + Executive Verdict Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left Col: Symbol, Category, Live Price */}
        <div className="lg:col-span-4 flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">
                {data.symbol}
              </h2>
              <span className={`px-2 py-0.5 rounded-md text-[13px] font-bold ${
                data.category === 'Core'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
              }`}>
                {data.category === 'Core' ? 'Core Commander 👑' : 'Moonshot Strike 🚀'}
              </span>
            </div>
            <p className="text-[13px] text-slate-400 font-medium">
              {data.name}
            </p>
          </div>

          {/* Price Box */}
          <div className="border-l border-slate-800 pl-4">
            <div className="text-2xl font-black text-slate-100 font-mono tracking-tight">
              ${currentPrice.toFixed(2)}
            </div>
            <div className={`flex items-center gap-1 text-[13px] font-bold font-mono ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)</span>
            </div>
          </div>
        </div>

        {/* Center/Right Col: The 3-Way Executive Verdict Bar */}
        <div className={`lg:col-span-8 p-3 rounded-2xl border ${verdictConfig.bg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {verdictConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wide">
                  {verdictConfig.title}
                </span>
                <span className="text-[13px] px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-200 font-mono">
                  Scenario {data.radar?.scenario || 1}
                </span>
              </div>
              <p className="text-[13px] text-slate-200 mt-0.5 leading-snug">
                {data.verdictReason}
              </p>
            </div>
          </div>

          {/* Doubler Progress Mini Bar */}
          <div className="flex-shrink-0 w-full sm:w-48 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-[13px] mb-1">
              <span className="text-slate-400">เป้า 1 เด้ง</span>
              <span className="text-emerald-400 font-bold font-mono">${data.targetPrice3Y.toFixed(0)}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${data.doublerProgressPct}%` }}
              />
            </div>
            <div className="text-right text-[13px] font-bold text-cyan-300 font-mono mt-0.5">
              {data.doublerProgressPct}% สู่เป้า
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
