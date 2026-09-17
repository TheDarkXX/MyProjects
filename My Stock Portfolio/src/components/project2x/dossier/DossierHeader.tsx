import React from 'react';
import { RefreshCw, X, ArrowUpRight, ArrowDownRight, ShieldCheck, AlertTriangle, LayoutDashboard, LineChart, BrainCircuit } from 'lucide-react';
import { useDossierStore } from '../../../stores/dossierStore';
import { DoublerPowerTube } from './DoublerPowerTube';

interface DossierHeaderProps {
  onClose?: () => void;
}

export const DossierHeader: React.FC<DossierHeaderProps> = ({ onClose }) => {
  const {
    data,
    selectedSymbol,
    selectSymbol,
    refreshFinancials,
    isRefreshing,
    columnMode,
    setColumnMode,
    activeSubTab,
    setActiveSubTab
  } = useDossierStore();

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
      bg: 'bg-gradient-to-r from-emerald-950/60 via-[#0B162C] to-[#070E1F] border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      pill: 'bg-emerald-500 text-slate-950',
      title: '🟢 BUY ADD ZONE (สะสมเพิ่มได้)',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />
    },
    HOLD_RIDE: {
      bg: 'bg-gradient-to-r from-blue-950/60 via-[#0B162C] to-[#14081E] border-blue-500/50 shadow-[0_0_20px_rgba(56,189,248,0.15)]',
      pill: 'bg-cyan-500 text-slate-950',
      title: '🟡 HOLD & RIDE TREND (ถือทับมือ)',
      icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />
    },
    TRIM_SELL: {
      bg: 'bg-gradient-to-r from-rose-950/70 via-[#180814] to-[#0B162C] border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.25)]',
      pill: 'bg-rose-500 text-white',
      title: '🔴 TRIM / SELL ALERT (แจ้งเตือนความเสี่ยง)',
      icon: <AlertTriangle className="w-5 h-5 text-rose-400" />
    }
  }[data.verdict] || {
    bg: 'bg-[#0B1226] border-blue-900/50',
    pill: 'bg-slate-700 text-white',
    title: 'HOLD & RIDE',
    icon: null
  };

  return (
    <div className="flex flex-col gap-3.5 border-b border-blue-900/40 pb-3.5 mb-3.5">
      {/* Row 1: Switcher Pills & Window / Layout Controls */}
      <div className="flex items-center justify-between gap-3">
        {/* Horizontal Quick Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {stocks.map((s) => {
            const isActive = s.symbol === selectedSymbol;
            return (
              <button
                key={s.symbol}
                onClick={() => selectSymbol(s.symbol)}
                className={`px-3 py-1.5 rounded-xl text-[14px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 text-white shadow-[0_0_16px_rgba(59,130,246,0.4)] scale-105 border border-white/30 font-semibold'
                    : 'bg-[#0B1226]/90 text-slate-300 hover:text-white hover:bg-[#131D38] border border-blue-900/40'
                }`}
              >
                <span className={isActive ? 'font-semibold text-white' : 'text-slate-200'}>{s.symbol}</span>
                <span className="text-[13px]">
                  {s.symbol === 'NVDA' || s.symbol === 'TSM' || s.symbol === 'AVGO' ? '👑' : s.tier.includes('Moonshot') ? '🚀' : ''}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Actions: Column Layout Mode + Refresh + Close */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Ultra-Wide Column Switcher: Only show on multi-column tabs (Cockpit & Financials) */}
          {activeSubTab !== 'thesis' && (
            <div className="flex items-center bg-[#060A16] p-1 rounded-xl border border-blue-900/60 shadow-inner">
              <button
                onClick={() => setColumnMode(2)}
                className={`px-2.5 py-1 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                  columnMode === 2
                    ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)] font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-blue-950/40'
                }`}
                title="แสดง 2 คอลัมน์"
              >
                2 Col
              </button>
              <button
                onClick={() => setColumnMode(3)}
                className={`px-2.5 py-1 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                  columnMode === 3
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.6)] font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-blue-950/40'
                }`}
                title="แสดง 3 คอลัมน์ (แนะนำสำหรับ Ultra-Wide)"
              >
                3 Col ⭐
              </button>
              <button
                onClick={() => setColumnMode(4)}
                className={`px-2.5 py-1 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                  columnMode === 4
                    ? 'bg-gradient-to-r from-indigo-600 to-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)] font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-blue-950/40'
                }`}
                title="แสดง 4 คอลัมน์ (Ultra-Wide พาโนรามา)"
              >
                4 Col ⚡
              </button>
            </div>
          )}

          <button
            onClick={() => refreshFinancials()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[14px] font-medium bg-[#0B1226] border border-blue-900/50 hover:border-cyan-500/60 text-slate-200 hover:text-cyan-300 transition-colors cursor-pointer"
            title="ดึงงบการเงินล่าสุดจาก Yahoo Finance เข้า SQLite"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
            <span className="hidden sm:inline">อัปเดตงบ</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#0B1226] hover:bg-rose-950/40 text-slate-300 hover:text-white border border-blue-900/50 hover:border-rose-500/50 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Profile + Live Quote + 2X Power Tube */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center">
        {/* Left Col (4 cols): Symbol, Category, Price */}
        <div className="lg:col-span-4 flex items-center justify-between sm:justify-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
                {data.symbol}
              </h2>
              <span className={`px-2.5 py-0.5 rounded text-[12px] font-medium ${
                data.category === 'Core'
                  ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-200 border border-rose-500/30'
              }`}>
                {data.category === 'Core' ? 'Core 👑' : 'Moonshot 🚀'}
              </span>
            </div>
            <p className="text-[14px] text-slate-300 font-normal mt-0.5 truncate max-w-[220px]">
              {data.name}
            </p>
          </div>

          {/* Price Box */}
          <div className="border-l border-blue-900/50 pl-4 flex-shrink-0">
            <div className="text-3xl font-bold text-white font-mono tracking-tight">
              ${currentPrice.toFixed(2)}
            </div>
            <div className={`flex items-center gap-1 text-[14px] font-medium font-mono mt-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)</span>
            </div>
          </div>
        </div>

        {/* Right Col (8 cols): 2X Power Tube */}
        <div className="lg:col-span-8 w-full">
          <DoublerPowerTube
            currentPrice={currentPrice}
            avgCost={data.holding?.avgCost || 0}
            targetPrice3Y={data.targetPrice3Y}
            marketCap={data.marketCap}
            doublerProgressPct={data.doublerProgressPct}
            unrealizedPnlPct={data.holding?.unrealizedPnlPct || 0}
          />
        </div>
      </div>

      {/* Row 3: Executive Verdict Ribbon */}
      <div className={`p-3 rounded-2xl border ${verdictConfig.bg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {verdictConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-medium tracking-wide text-slate-200">
                {verdictConfig.title}
              </span>
              <span className="text-[12px] px-2 py-0.5 rounded bg-[#060A16] border border-blue-800/50 text-cyan-200 font-mono font-medium">
                Scenario {data.radar?.scenario || 1}
              </span>
            </div>
            <p className="text-[14px] text-slate-300 mt-0.5 font-normal leading-snug">
              {data.verdictReason}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-[14px] text-slate-300 font-normal">โควตา:</span>
          <span className="text-[14px] font-medium font-mono text-cyan-300">
            {data.holding?.shares || 0} / {data.holding?.targetShares || 0} หุ้น ({data.holding?.quotaProgressPct || 0}%)
          </span>
        </div>
      </div>

      {/* Row 4: 3-Subtab Navigation Switcher */}
      <div className="flex items-center gap-2 bg-[#060A16]/90 p-1.5 rounded-2xl border border-blue-900/50 shadow-inner">
        <button
          onClick={() => setActiveSubTab('cockpit')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-[15px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'cockpit'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-semibold shadow-[0_0_16px_rgba(59,130,246,0.4)] border border-white/20'
              : 'text-slate-300 hover:text-white hover:bg-blue-950/40'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-cyan-300" />
          <span>1. Mission Control (ค็อกพิทสั่งการ)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('financials')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-[15px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'financials'
              ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold shadow-[0_0_16px_rgba(147,51,234,0.4)] border border-white/20'
              : 'text-slate-300 hover:text-white hover:bg-blue-950/40'
          }`}
        >
          <LineChart className="w-4 h-4 text-pink-300" />
          <span>2. Financial Pulse (ตรวจงบ 8Q & กระแสเงินสด)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('thesis')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-[15px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'thesis'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-semibold shadow-[0_0_16px_rgba(16,185,129,0.4)] border border-white/20'
              : 'text-slate-300 hover:text-white hover:bg-blue-950/40'
          }`}
        >
          <BrainCircuit className="w-4 h-4 text-emerald-300" />
          <span>3. 2X Thesis & Moat (เรื่องเล่า & คาดการณ์กี่เด้ง)</span>
        </button>
      </div>
    </div>
  );
};

