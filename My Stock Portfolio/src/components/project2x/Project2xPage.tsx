import React, { useEffect, useState } from 'react';
import {
  Rocket,
  Target,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Trophy,
  Flame,
  ChevronDown,
  ChevronUp,
  Settings,
  DollarSign,
  Wallet,
  ArrowUpRight,
  Plus,
  X,
  Info,
  Layers,
  TrendingUp,
  TrendingDown,
  Coins,
  Landmark,
  Calendar,
  Zap,
  Activity
} from 'lucide-react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useProject2xStore } from '../../stores/project2xStore';
import { ProgressRing } from './ProgressRing';
import { MiniSparkline } from './MiniSparkline';

export const Project2xPage: React.FC = () => {
  const { activePortfolioId } = usePortfolioStore();
  const {
    selectedTab,
    setSelectedTab,
    dashboard,
    quotas,
    radar,
    recommendation,
    config,
    isLoadingDashboard,
    isLoadingQuotas,
    isLoadingRadar,
    isLoadingRecommendation,
    isSavingConfig,
    calculateRecommendation,
    updateConfig,
    resetQuotas,
    refreshAll
  } = useProject2xStore();

  const [selectedBand, setSelectedBand] = useState<'Conservative' | 'Base' | 'Bull'>('Base');
  const [inflowAmountInput, setInflowAmountInput] = useState<string>('35000');
  const [expandedRadarRow, setExpandedRadarRow] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Config modal state
  const [cfgGoalThb, setCfgGoalThb] = useState<number>(10000000);
  const [cfgInflowThb, setCfgInflowThb] = useState<number>(35000);
  const [cfgCagr, setCfgCagr] = useState<number>(0.26);
  const [cfgCeiling, setCfgCeiling] = useState<number>(30);
  const [cfgFcdApy, setCfgFcdApy] = useState<number>(4.5);

  useEffect(() => {
    if (activePortfolioId) {
      refreshAll(activePortfolioId);
    }
  }, [activePortfolioId]);

  useEffect(() => {
    if (config) {
      setCfgGoalThb(config.goal_amount_thb);
      setCfgInflowThb(config.monthly_inflow_thb);
      setCfgCagr(config.target_cagr);
      setCfgCeiling(config.max_stock_ceiling_pct);
      setCfgFcdApy(config.fcd_yield_pct);
      setInflowAmountInput(String(config.monthly_inflow_thb || 35000));
    }
  }, [config]);

  const handleRefresh = () => {
    if (activePortfolioId) {
      refreshAll(activePortfolioId);
    }
  };

  const handleSaveConfig = async () => {
    if (!activePortfolioId) return;
    await updateConfig(activePortfolioId, {
      goal_amount_thb: cfgGoalThb,
      monthly_inflow_thb: cfgInflowThb,
      target_cagr: cfgCagr,
      max_stock_ceiling_pct: cfgCeiling,
      fcd_yield_pct: cfgFcdApy
    });
    setIsConfigModalOpen(false);
  };

  const handleRunInflowCalc = () => {
    if (!activePortfolioId) return;
    const thb = Number(inflowAmountInput) || 35000;
    calculateRecommendation(activePortfolioId, thb);
  };

  const currentEtaItem = dashboard?.eta?.[selectedBand];
  const fxRate = dashboard?.fx_rate || 35.0;
  const numInput = parseFloat(inflowAmountInput);
  const inputUsdEquivalent = (!isNaN(numInput) && fxRate > 0) ? numInput / fxRate : 0;

  const coreQuotas = quotas.filter(q => q.category === 'Core');
  const moonshotQuotas = quotas.filter(q => q.category === 'Moonshot');

  return (
    <div className="w-full space-y-8 animate-fade-in-up pb-20 selection:bg-[#2962FF] selection:text-white">
      
      {/* ============================================================ */}
      {/* 1. TOP TITLE & ACTION BAR (NON-STICKY — NATURAL SCROLL) */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#823AFD] via-[#2962FF] to-[#26A69A] flex items-center justify-center shadow-[0_8px_24px_rgba(41,98,255,0.28)]">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight font-heading">
                Project 2X Autonomous Engine
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-extrabold bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/40 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#26A69A] animate-pulse" />
                Live Engine
              </span>
            </div>
            <p className="text-[13px] text-slate-300 mt-1 font-body">
              ภารกิจมุ่งเป้า ฿10,000,000 ใน 5 ปี (CAGR 26%) • กฎสะสมของเล่น 12 แม่ทัพ • Dime! Ecosystem
            </p>
          </div>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={handleRefresh}
            className="px-4 py-2.5 rounded-xl bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-slate-200 text-[13px] font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer hover:border-[#2962FF]/50"
            title="Sync Latest Market Data"
          >
            <RefreshCw className={`w-4 h-4 text-[#2962FF] ${isLoadingDashboard || isLoadingRadar ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2A2E39] text-slate-200 text-[13px] font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer hover:border-[#823AFD]/50"
            title="Engine Configuration"
          >
            <Settings className="w-4 h-4 text-[#823AFD]" />
            <span>Config</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. HERO SUMMARY CARDS (STYLE MATCHING DASHBOARD) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 xl:gap-6">
        
        {/* Card 1: Grand Progress & Goal Ring */}
        <div className="sm:col-span-2 bg-[#1E222D] border border-[#2A2E39] rounded-3xl p-5 relative overflow-hidden group shadow-lg flex flex-col justify-between">
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[64px] opacity-25 bg-[#26A69A] group-hover:opacity-40 transition-opacity" />
          
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-slate-300 font-bold text-[14px]">
              🎯 5-Year Goal Progress
            </span>
            <div className="flex items-center gap-1">
              {(['Conservative', 'Base', 'Bull'] as const).map((band) => (
                <button
                  key={band}
                  onClick={() => setSelectedBand(band)}
                  className={`px-2 py-0.5 rounded text-[13px] font-bold transition-all cursor-pointer ${
                    selectedBand === band
                      ? 'bg-[#2962FF] text-white shadow-sm'
                      : 'bg-[#131722] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {band === 'Base' ? 'Base 26%' : band === 'Conservative' ? '20%' : '32%'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <ProgressRing
              percent={dashboard?.progress_percent || 0}
              size={76}
              strokeWidth={7}
              color="#26A69A"
              bgColor="#131722"
            >
              <span className="text-base font-black text-white">
                {(dashboard?.progress_percent || 0).toFixed(1)}%
              </span>
            </ProgressRing>

            <div className="flex-1 min-w-0">
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums">
                ฿{(dashboard?.total_val_thb || 0).toLocaleString()}
              </div>
              <div className="text-[13px] text-slate-400 font-medium mt-0.5">
                Target: <span className="text-slate-200 font-bold">฿{(dashboard?.goal_val_thb || 10000000).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Target ETA */}
        <div className="bg-[#1E222D] border border-[#2A2E39] rounded-3xl p-5 relative overflow-hidden group shadow-lg flex flex-col justify-between">
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[64px] opacity-20 bg-[#FFD740] group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-[#131722] border border-[#2A2E39] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#FFD740]" />
            </div>
            <span className="text-[13px] font-bold text-[#FFD740] bg-[#FFD740]/15 px-2 py-0.5 rounded-lg border border-[#FFD740]/30">
              {currentEtaItem?.years || 0} Yrs
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-300 font-bold text-[13px] mb-1">Target ETA</h3>
            <div className="text-2xl xl:text-3xl font-black text-white tracking-tight tabular-nums">
              {currentEtaItem?.targetDate || 'Calculating...'}
            </div>
            <div className="text-[13px] text-slate-400 mt-1">
              Compound Pace: <span className="text-slate-200 font-semibold">{((currentEtaItem?.cagr || 0.26) * 100).toFixed(0)}% CAGR</span>
            </div>
          </div>
        </div>

        {/* Card 3: Portfolio Total Value (USD) */}
        <div className="bg-[#1E222D] border border-[#2A2E39] rounded-3xl p-5 relative overflow-hidden group shadow-lg flex flex-col justify-between">
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[64px] opacity-20 bg-[#2962FF] group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-[#131722] border border-[#2A2E39] flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#2962FF]" />
            </div>
            <span className="text-[13px] font-bold text-[#2962FF] bg-[#2962FF]/15 px-2 py-0.5 rounded-lg border border-[#2962FF]/30">
              Live FX
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-300 font-bold text-[13px] mb-1">Total Value (USD)</h3>
            <div className="text-2xl xl:text-3xl font-black text-white tracking-tight tabular-nums">
              ${(dashboard?.total_val_usd || 0).toLocaleString()}
            </div>
            <div className="text-[13px] text-slate-400 mt-1">
              Rate: <span className="text-slate-200 font-semibold">฿{fxRate.toFixed(2)} / USD</span>
            </div>
          </div>
        </div>

        {/* Card 4: Monthly Inflow Pace */}
        <div className="bg-[#1E222D] border border-[#2A2E39] rounded-3xl p-5 relative overflow-hidden group shadow-lg flex flex-col justify-between">
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[64px] opacity-20 bg-[#26A69A] group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-[#131722] border border-[#2A2E39] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#26A69A]" />
            </div>
            <span className="text-[13px] font-bold text-[#26A69A] bg-[#26A69A]/15 px-2 py-0.5 rounded-lg border border-[#26A69A]/30">
              DCA
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-300 font-bold text-[13px] mb-1">Monthly Inflow</h3>
            <div className="text-2xl xl:text-3xl font-black text-[#26A69A] tracking-tight tabular-nums">
              ฿{(dashboard?.monthly_inflow_thb || 35000).toLocaleString()}
            </div>
            <div className="text-[13px] text-slate-400 mt-1">
              ≈ ${( (dashboard?.monthly_inflow_thb || 35000) / fxRate ).toFixed(0)} USD / month
            </div>
          </div>
        </div>

        {/* Card 5: Dime! Cash & FCD Sweep */}
        <div className="bg-[#1E222D] border border-[#2A2E39] rounded-3xl p-5 relative overflow-hidden group shadow-lg flex flex-col justify-between">
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[64px] opacity-20 bg-[#FF9800] group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-[#131722] border border-[#2A2E39] flex items-center justify-center">
              <Landmark className="w-5 h-5 text-[#FF9800]" />
            </div>
            <span className="text-[13px] font-bold text-[#26A69A] bg-[#26A69A]/15 px-2 py-0.5 rounded-lg border border-[#26A69A]/30">
              ~{config?.fcd_yield_pct || 4.5}% APY
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-300 font-bold text-[13px] mb-1">Dime! Cash / FCD</h3>
            <div className="text-2xl xl:text-3xl font-black text-[#FFD740] tracking-tight tabular-nums flex items-center gap-1.5">
              ${(dashboard?.dime_cash_usd || 0).toLocaleString()}
              <span className="text-base text-[#26A69A]">✓</span>
            </div>
            <div className="text-[13px] text-slate-400 mt-1">
              Zero Idle Cash (Parked in FCD)
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. PROMINENT VIEW SWITCHER (NON-STICKY) */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between border-b border-[#2A2E39] pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-2 bg-[#1A1D2D] p-1.5 rounded-2xl border border-[#2A2E39] overflow-x-auto max-w-full">
          
          {/* Tab: Signal Radar (Chart Table) */}
          <button
            onClick={() => setSelectedTab('radar')}
            className={`px-5 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'radar'
                ? 'bg-[#2962FF] text-white shadow-lg shadow-[#2962FF]/25'
                : 'text-slate-300 hover:text-white hover:bg-[#2A2E39]'
            }`}
          >
            <Target className="w-4 h-4 text-emerald-400" />
            <span>🎯 Signal Radar & Chart Table (ตารางกราฟสัญญาณ)</span>
            {(dashboard?.active_sell_alerts_count || 0) > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[13px] bg-[#EF5350] text-white font-black animate-pulse">
                {dashboard?.active_sell_alerts_count} ALERTS
              </span>
            )}
          </button>

          {/* Tab: Toy Vault */}
          <button
            onClick={() => setSelectedTab('vault')}
            className={`px-5 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'vault'
                ? 'bg-[#2962FF] text-white shadow-lg shadow-[#2962FF]/25'
                : 'text-slate-300 hover:text-white hover:bg-[#2A2E39]'
            }`}
          >
            <span>🧸</span>
            <span>Toy Vault (อัลบั้มสะสมของเล่น 12 ตัว)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[13px] bg-black/40 text-slate-200">
              {quotas.length}
            </span>
          </button>

          {/* Tab: Inflow Slip */}
          <button
            onClick={() => setSelectedTab('inflow')}
            className={`px-5 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'inflow'
                ? 'bg-[#2962FF] text-white shadow-lg shadow-[#2962FF]/25'
                : 'text-slate-300 hover:text-white hover:bg-[#2A2E39]'
            }`}
          >
            <span>⚡</span>
            <span>Inflow Slip (สลิปคำนวณเติมเงิน Dime)</span>
          </button>

          {/* Tab: All-In-One */}
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-5 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'all'
                ? 'bg-[#823AFD] text-white shadow-lg shadow-[#823AFD]/25'
                : 'text-slate-300 hover:text-white hover:bg-[#2A2E39]'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-300" />
            <span>📊 All-In-One Cockpit (ดูทั้งหมด)</span>
          </button>
        </div>

        {/* Legend Indicator */}
        <div className="hidden lg:flex items-center gap-4 text-[13px] text-slate-300 font-medium bg-[#1A1D2D] px-4 py-2 rounded-xl border border-[#2A2E39]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#26A69A]" />
            <span>Candle Up / Buy</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#2962FF]" />
            <span className="text-[#2962FF] font-bold">EMA 150</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#FFD740]" />
            <span className="text-[#FFD740] font-bold">EMA 200</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9800]" />
            <span className="text-[#FF9800] font-bold">Banker Flow</span>
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. SIGNAL RADAR & CHART TABLE (THE PRIMARY VIEW) */}
      {/* ============================================================ */}
      {(selectedTab === 'radar' || selectedTab === 'all') && (
        <div className="space-y-6">
          
          {/* SELL ALERT BANNERS (IF ANY) */}
          {radar?.sellAlerts && radar.sellAlerts.length > 0 && (
            <div className="space-y-3">
              {radar.sellAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#EF5350]/15 border border-[#EF5350]/40 flex items-start gap-3.5 shadow-xl"
                >
                  <AlertTriangle className="w-5 h-5 text-[#EF5350] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#EF5350] text-[14px]">
                        [{alert.layer}] {alert.symbol}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[13px] font-bold bg-[#EF5350] text-white">
                        ACTION REQUIRED
                      </span>
                    </div>
                    <p className="text-[13px] text-slate-200 mt-1 font-medium">
                      {alert.message}
                    </p>
                    <p className="text-[13px] text-slate-300 mt-0.5">
                      (ไทย: {alert.message_th})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Section Heading */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-[#1E222D] border border-[#2A2E39]">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🎯 TradingView Technical Radar & Chart Table</span>
                <span className="text-[13px] font-normal text-slate-400">
                  (กราฟ 30 วัน + เส้น EMA 150/200 + แท่งสถาบัน Banker MCDX)
                </span>
              </h2>
              <p className="text-[13px] text-slate-300 mt-1">
                ตรวจจับจุดช้อนซื้อต้นน้ำ & ไฟจราจร 5 Scenarios สำหรับสไนเปอร์ • สแกนละเอียดทุกมิติ
              </p>
            </div>

            <div className="flex items-center gap-2 text-[13px]">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/40 font-bold">
                🟢 BUY ZONE
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFD740]/20 text-[#FFD740] border border-[#FFD740]/40 font-bold">
                🟡 WAIT
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF5350]/20 text-[#EF5350] border border-[#EF5350]/40 font-bold">
                🔴 DANGER
              </span>
            </div>
          </div>

          {/* Screener Table with Inline Charts */}
          <div className="overflow-x-auto rounded-2xl border border-[#2A2E39] bg-[#1E222D] shadow-2xl">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#2A2E39] bg-[#131722] text-slate-300 font-bold uppercase tracking-wider">
                  <th className="p-4">Symbol</th>
                  <th className="p-4">Price</th>
                  <th className="p-4 min-w-[200px]">30-Day Trend (EMA 150/200)</th>
                  <th className="p-4">vs EMA 150</th>
                  <th className="p-4">vs EMA 200</th>
                  <th className="p-4 min-w-[140px]">Banker Flow (0-20)</th>
                  <th className="p-4">Signal & Scenario</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2E39]">
                {radar?.rows.map((row) => {
                  const isExpanded = expandedRadarRow === row.symbol;

                  return (
                    <React.Fragment key={row.symbol}>
                      <tr
                        onClick={() => setExpandedRadarRow(isExpanded ? null : row.symbol)}
                        className="hover:bg-[#2A2E39]/60 cursor-pointer transition-colors group"
                      >
                        {/* Symbol */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-base">
                              {row.symbol}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[13px] font-bold ${
                              row.category === 'Core'
                                ? 'bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/30'
                                : 'bg-[#823AFD]/20 text-[#823AFD] border border-[#823AFD]/30'
                            }`}>
                              {row.category}
                            </span>
                          </div>
                          <span className="text-slate-400 text-[13px] font-medium mt-0.5 block">
                            Target: {row.target_percent}% ({row.progress_percent}% Owned)
                          </span>
                        </td>

                        {/* Price */}
                        <td className="p-4">
                          <span className="font-black text-slate-100 text-base tabular-nums">
                            ${row.currentPrice.toFixed(2)}
                          </span>
                        </td>

                        {/* 30-Day Inline Sparkline Chart with EMA Overlays */}
                        <td className="p-4">
                          {row.sparkline?.closes && row.sparkline.closes.length >= 2 ? (
                            <div className="w-[180px] xl:w-[220px]">
                              <MiniSparkline
                                closes={row.sparkline.closes}
                                ema150={row.sparkline.ema150}
                                ema200={row.sparkline.ema200}
                                height={44}
                                showEma={true}
                              />
                            </div>
                          ) : (
                            <div className="w-[180px] h-[44px] rounded bg-[#131722]/50 animate-pulse" />
                          )}
                        </td>

                        {/* vs EMA 150 */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-extrabold text-sm tabular-nums ${
                                row.distEma150 >= 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'
                              }`}
                            >
                              {row.distEma150 >= 0 ? '+' : ''}{row.distEma150}%
                            </span>
                          </div>
                          {row.ema150 && (
                            <span className="text-slate-400 text-[13px] font-medium">
                              ${row.ema150.toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* vs EMA 200 */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-extrabold text-sm tabular-nums ${
                                row.distEma200 >= 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'
                              }`}
                            >
                              {row.distEma200 >= 0 ? '+' : ''}{row.distEma200}%
                            </span>
                          </div>
                          {row.ema200 && (
                            <span className="text-slate-400 text-[13px] font-medium">
                              ${row.ema200.toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* Banker MCDX */}
                        <td className="p-4">
                          <div className="w-32">
                            <div className="flex items-center justify-between text-[13px] mb-1.5 font-bold">
                              <span className="text-[#FF9800]">
                                {row.banker.toFixed(1)}
                              </span>
                              <span className="text-slate-400 font-normal">/ 20</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-[#131722] overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#FF9800] to-[#FF6D00] rounded-full transition-all duration-500"
                                style={{ width: `${(row.banker / 20) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Signal & Scenario */}
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5">
                            <span
                              className={`px-3 py-1 rounded-lg text-[13px] font-black inline-flex items-center gap-1.5 w-fit ${
                                row.traffic_light === 'BUY_ZONE'
                                  ? 'bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/50 animate-pulse'
                                  : row.traffic_light === 'WAIT'
                                  ? 'bg-[#FFD740]/20 text-[#FFD740] border border-[#FFD740]/50'
                                  : 'bg-[#EF5350]/20 text-[#EF5350] border border-[#EF5350]/50'
                              }`}
                            >
                              <span>{row.traffic_light === 'BUY_ZONE' ? '🟢' : row.traffic_light === 'WAIT' ? '🟡' : '🔴'}</span>
                              <span>{row.traffic_light}</span>
                            </span>
                            <span className="text-[13px] text-slate-300 font-semibold">
                              {row.badge}
                            </span>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTab('inflow');
                                if (activePortfolioId) {
                                  calculateRecommendation(activePortfolioId, Number(inflowAmountInput) || 35000);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#2A2E39] hover:bg-[#2962FF] text-slate-200 hover:text-white text-[13px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Calculate Inflow"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Inflow</span>
                            </button>
                            <button className="p-1.5 rounded-lg bg-[#2A2E39] text-slate-300 group-hover:text-white">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Detailed Technical Cockpit */}
                      {isExpanded && (
                        <tr className="bg-[#131722] border-b border-[#2A2E39]">
                          <td colSpan={8} className="p-5">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                              {/* Large Chart View */}
                              <div className="lg:col-span-7 p-4 rounded-2xl bg-[#1E222D] border border-[#2A2E39]">
                                <div className="flex items-center justify-between text-[13px] mb-3 text-slate-300">
                                  <span className="font-bold text-white text-sm">
                                    {row.symbol} — 30-Day Historical Candlestick Trend
                                  </span>
                                  <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5 text-[#2962FF] font-bold">
                                      <span className="w-3 h-0.5 bg-[#2962FF]" /> EMA 150 (${row.ema150?.toFixed(2)})
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[#FFD740] font-bold">
                                      <span className="w-3 h-0.5 bg-[#FFD740]" /> EMA 200 (${row.ema200?.toFixed(2)})
                                    </span>
                                  </div>
                                </div>
                                <MiniSparkline
                                  closes={row.sparkline.closes}
                                  ema150={row.sparkline.ema150}
                                  ema200={row.sparkline.ema200}
                                  height={100}
                                  showEma={true}
                                />
                              </div>

                              {/* Tactical Playbook Rationale */}
                              <div className="lg:col-span-5 p-4 rounded-2xl bg-[#1E222D] border border-[#2A2E39] space-y-3">
                                <div className="text-[13px] font-extrabold text-[#FFD740] flex items-center gap-2">
                                  <Info className="w-4 h-4" />
                                  <span>Sniper Radar Tactical Assessment:</span>
                                </div>
                                <p className="text-[13px] text-slate-200 font-medium">
                                  {row.reason}
                                </p>
                                <div className="text-[13px] text-slate-300 bg-[#131722] p-3 rounded-xl border border-[#2A2E39] leading-relaxed">
                                  {row.reason_th}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. TOY VAULT (SHARE COLLECTION ALBUM) */}
      {/* ============================================================ */}
      {(selectedTab === 'vault' || selectedTab === 'all') && (
        <div className="space-y-8 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-[#1E222D] border border-[#2A2E39]">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧸</span>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Share Collection Vault (อัลบั้มสะสมของเล่นให้ครบโควต้า)
                </h2>
                <p className="text-[13px] text-slate-300 mt-0.5">
                  สะสมตามจำนวนหุ้นเป้าหมายที่คำนวณจาก $P_{'{base}'}$ คงที่ • สติ๊กเกอร์อัลบั้มเต็ม = พิชิต 10 ล้าน!
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (activePortfolioId && confirm('Reset quotas to standard 12 Project 2X Commander stocks?')) {
                  resetQuotas(activePortfolioId);
                }
              }}
              className="px-4 py-2 rounded-xl bg-[#2A2E39] hover:bg-[#363A45] text-slate-200 text-[13px] font-bold transition-all self-start sm:self-auto flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to 12 Commanders</span>
            </button>
          </div>

          {/* Core Commanders Group */}
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#26A69A] flex items-center gap-2 mb-4">
              <span>👑 CORE COMMANDERS (83% of Portfolio)</span>
              <span className="text-slate-400 font-normal text-[13px]">
                — 9 จอมราชันย์ผูกขาดโลก ถือยาว 10 ปี
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {coreQuotas.map((q) => {
                const radarMatch = radar?.rows.find(r => r.symbol === q.symbol);
                const isBuyZoneToday = radarMatch?.traffic_light === 'BUY_ZONE';

                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-[#1E222D] border border-[#2A2E39] hover:border-[#2962FF]/60 transition-all flex flex-col justify-between relative group shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-white">{q.symbol}</span>
                          <span className="px-2 py-0.5 rounded text-[13px] font-extrabold bg-[#2A2E39] text-slate-200">
                            {q.target_percent}%
                          </span>
                        </div>
                        <span className="text-[13px] text-slate-400 font-medium">
                          Base: ${q.base_price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {isBuyZoneToday && (
                          <span className="px-2.5 py-0.5 rounded-full text-[13px] font-extrabold bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/50 flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#26A69A]" />
                            Buy Zone!
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded text-[13px] font-black uppercase ${
                            q.status === 'LOCKED'
                              ? 'bg-[#FFD740]/20 text-[#FFD740] border border-[#FFD740]/40'
                              : q.status === 'COLLECTING'
                              ? 'bg-[#2962FF]/20 text-[#2962FF] border border-[#2962FF]/40'
                              : 'bg-slate-700/50 text-slate-400'
                          }`}
                        >
                          {q.status === 'LOCKED' ? 'LOCKED 🏆' : q.status}
                        </span>
                      </div>
                    </div>

                    <div className="my-4 flex items-center justify-between gap-4">
                      <ProgressRing
                        percent={q.progress_percent}
                        size={64}
                        strokeWidth={6}
                        color="#26A69A"
                      >
                        <span className="text-[13px] font-black text-slate-100">
                          {q.progress_percent.toFixed(0)}%
                        </span>
                      </ProgressRing>

                      <div className="flex-1 text-right">
                        <div className="text-[13px] text-slate-400">Shares Owned</div>
                        <div className="text-lg font-black text-white tabular-nums">
                          {q.owned_shares} <span className="text-slate-400 font-normal text-sm">/ {q.target_shares}</span>
                        </div>
                        <div className="text-[13px] text-slate-400 mt-0.5">
                          Remain: <span className="text-slate-200 font-bold">{Math.max(0, Number((q.target_shares - q.owned_shares).toFixed(4)))}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#2A2E39]">
                      {radarMatch?.sparkline?.closes && radarMatch.sparkline.closes.length >= 2 ? (
                        <div className="mb-3">
                          <MiniSparkline
                            closes={radarMatch.sparkline.closes}
                            ema150={radarMatch.sparkline.ema150}
                            ema200={radarMatch.sparkline.ema200}
                            height={36}
                            showEma={true}
                          />
                        </div>
                      ) : (
                        <div className="h-9 mb-3 rounded bg-[#131722]/50 animate-pulse" />
                      )}

                      <button
                        onClick={() => {
                          setSelectedTab('inflow');
                          if (activePortfolioId) {
                            calculateRecommendation(activePortfolioId, Number(inflowAmountInput) || 35000);
                          }
                        }}
                        className="w-full py-2 rounded-xl bg-[#2A2E39] hover:bg-[#2962FF] text-slate-200 hover:text-white text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Fill via Inflow Slip</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Moonshot Strikes Group */}
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#823AFD] flex items-center gap-2 mb-4">
              <span>🚀 MOONSHOT STRIKES (11% of Portfolio)</span>
              <span className="text-slate-400 font-normal text-[13px]">
                — 4 ขุนพลโตกระโดด +100% Free-Ride Engine
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {moonshotQuotas.map((q) => {
                const radarMatch = radar?.rows.find(r => r.symbol === q.symbol);
                const isBuyZoneToday = radarMatch?.traffic_light === 'BUY_ZONE';

                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-[#1E222D] border border-[#2A2E39] hover:border-[#823AFD]/60 transition-all flex flex-col justify-between relative group shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-white">{q.symbol}</span>
                          <span className="px-2 py-0.5 rounded text-[13px] font-extrabold bg-[#2A2E39] text-slate-200">
                            {q.target_percent}%
                          </span>
                        </div>
                        <span className="text-[13px] text-slate-400 font-medium">
                          Base: ${q.base_price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {isBuyZoneToday && (
                          <span className="px-2.5 py-0.5 rounded-full text-[13px] font-extrabold bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/50 flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#26A69A]" />
                            Buy Zone!
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded text-[13px] font-black uppercase ${
                            q.status === 'LOCKED'
                              ? 'bg-[#FFD740]/20 text-[#FFD740] border border-[#FFD740]/40'
                              : 'bg-[#823AFD]/20 text-[#823AFD] border border-[#823AFD]/40'
                          }`}
                        >
                          {q.status === 'LOCKED' ? 'LOCKED 🏆' : q.status}
                        </span>
                      </div>
                    </div>

                    <div className="my-4 flex items-center justify-between gap-4">
                      <ProgressRing
                        percent={q.progress_percent}
                        size={64}
                        strokeWidth={6}
                        color="#823AFD"
                      >
                        <span className="text-[13px] font-black text-slate-100">
                          {q.progress_percent.toFixed(0)}%
                        </span>
                      </ProgressRing>

                      <div className="flex-1 text-right">
                        <div className="text-[13px] text-slate-400">Shares Owned</div>
                        <div className="text-lg font-black text-white tabular-nums">
                          {q.owned_shares} <span className="text-slate-400 font-normal text-sm">/ {q.target_shares}</span>
                        </div>
                        <div className="text-[13px] text-slate-400 mt-0.5">
                          Remain: <span className="text-slate-200 font-bold">{Math.max(0, Number((q.target_shares - q.owned_shares).toFixed(4)))}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#2A2E39]">
                      {radarMatch?.sparkline?.closes && radarMatch.sparkline.closes.length >= 2 ? (
                        <div className="mb-3">
                          <MiniSparkline
                            closes={radarMatch.sparkline.closes}
                            ema150={radarMatch.sparkline.ema150}
                            ema200={radarMatch.sparkline.ema200}
                            height={36}
                            showEma={true}
                          />
                        </div>
                      ) : (
                        <div className="h-9 mb-3 rounded bg-[#131722]/50 animate-pulse" />
                      )}

                      <button
                        onClick={() => {
                          setSelectedTab('inflow');
                          if (activePortfolioId) {
                            calculateRecommendation(activePortfolioId, Number(inflowAmountInput) || 35000);
                          }
                        }}
                        className="w-full py-2 rounded-xl bg-[#2A2E39] hover:bg-[#823AFD] text-slate-200 hover:text-white text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Fill via Inflow Slip</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. INFLOW SLIP & CASH SWEEP */}
      {/* ============================================================ */}
      {(selectedTab === 'inflow' || selectedTab === 'all') && (
        <div className="max-w-4xl mx-auto space-y-6 pt-4">
          <div className="p-6 rounded-3xl bg-[#1E222D] border border-[#2A2E39] shadow-2xl space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#26A69A] to-[#2962FF] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                ⚡
              </div>
              <div>
                <h2 className="text-lg font-black text-white font-heading">
                  Dime! Inflow Slip & FCD Cash Sweep
                </h2>
                <p className="text-[13px] text-slate-300 font-body">
                  ใส่ยอดเงินที่ต้องการเติมเข้าพอร์ตวันนี้ → ระบบจะสแกนหาตัวที่เข้าจุดช้อนซื้อที่ดีที่สุด หรือสั่งพักเงินใน Dime FCD
                </p>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-slate-300">
                Deposit Inflow Amount (THB):
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">
                  ฿
                </span>
                <input
                  type="number"
                  value={inflowAmountInput}
                  onChange={(e) => setInflowAmountInput(e.target.value)}
                  placeholder="35000"
                  className="w-full pl-12 pr-4 py-3.5 bg-[#131722] border border-[#2A2E39] focus:border-[#2962FF] rounded-2xl text-2xl font-black text-white focus:outline-none transition-all tabular-nums"
                />
              </div>

              <div className="flex items-center justify-between text-[13px] text-slate-300 pt-1.5 flex-wrap gap-2">
                <span className="font-semibold">≈ ${inputUsdEquivalent.toFixed(2)} USD (at ฿{fxRate.toFixed(2)} / USD)</span>
                <div className="flex items-center gap-1.5">
                  {[10000, 20000, 35000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setInflowAmountInput(String(amt))}
                      className="px-2.5 py-1 rounded-lg bg-[#2A2E39] hover:bg-[#363A45] text-slate-200 hover:text-white text-[13px] font-bold transition-colors cursor-pointer"
                    >
                      ฿{(amt / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleRunInflowCalc}
              disabled={isLoadingRecommendation}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#2962FF] to-[#823AFD] hover:from-[#1E50E6] hover:to-[#7029E6] text-white font-black text-base shadow-xl shadow-[#2962FF]/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoadingRecommendation ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Analyzing Technical Radar & Quotas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <span>Calculate Optimal Inflow Mission</span>
                </>
              )}
            </button>
          </div>

          {/* RECOMMENDATION RESULT CARD */}
          {recommendation && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
              
              {/* Golden Setup */}
              {recommendation.type === 'GOLDEN_SETUP' && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1E222D] to-[#131722] border-2 border-[#26A69A] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-4 py-1.5 bg-[#26A69A] text-slate-900 font-black text-[13px] rounded-bl-xl uppercase tracking-wider">
                    🎯 Prime Golden Setup
                  </div>

                  <div className="text-[13px] font-black uppercase tracking-wider text-[#26A69A] mb-1">
                    TODAY'S MISSION RECOMMENDATION
                  </div>

                  <div className="text-2xl sm:text-3xl font-black text-white flex items-baseline gap-2 flex-wrap">
                    <span>BUY {recommendation.shares_to_buy} SHARES OF</span>
                    <span className="text-[#26A69A] underline decoration-4 underline-offset-4">
                      {recommendation.symbol}
                    </span>
                  </div>

                  <div className="mt-4 p-4 rounded-2xl bg-[#131722] border border-[#2A2E39] grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
                    <div>
                      <span className="text-slate-400">Order Price:</span>
                      <div className="text-base font-black text-slate-100 tabular-nums mt-0.5">
                        ${recommendation.price_per_share?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Total USD:</span>
                      <div className="text-base font-black text-[#26A69A] tabular-nums mt-0.5">
                        ${recommendation.total_usd?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Total THB:</span>
                      <div className="text-base font-black text-slate-100 tabular-nums mt-0.5">
                        ฿{recommendation.total_thb?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Quota Jump:</span>
                      <div className="text-base font-black text-[#FFD740] tabular-nums mt-0.5">
                        {recommendation.current_progress}% → {recommendation.projected_progress}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-2xl bg-[#26A69A]/10 border border-[#26A69A]/30 space-y-1.5 text-[13px]">
                    <div className="font-bold text-[#26A69A]">Execution Rationale:</div>
                    <p className="text-slate-200 font-medium">{recommendation.reason}</p>
                    <p className="text-slate-300">(ไทย: {recommendation.reason_th})</p>
                  </div>

                  <div className="mt-4 text-[13px] text-slate-300 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#26A69A]" />
                    <span>Execute directly on Dime! app via Fractional Shares order ($1 minimum).</span>
                  </div>
                </div>
              )}

              {/* Early Bird */}
              {recommendation.type === 'EARLY_BIRD' && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1E222D] to-[#131722] border-2 border-[#2962FF] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-4 py-1.5 bg-[#2962FF] text-white font-black text-[13px] rounded-bl-xl uppercase tracking-wider">
                    🦅 Early Bird Split
                  </div>

                  <div className="text-[13px] font-black uppercase tracking-wider text-[#2962FF] mb-1">
                    2-STAGE EARLY BIRD STRATEGY
                  </div>

                  <div className="text-2xl font-black text-white">
                    BUY 25% ({recommendation.shares_to_buy} {recommendation.symbol}) + PARK 75% IN FCD
                  </div>

                  <div className="mt-4 p-4 rounded-2xl bg-[#131722] border border-[#2A2E39] grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px]">
                    <div>
                      <span className="text-slate-400">Buy Tranche (25%):</span>
                      <div className="text-base font-black text-[#2962FF] tabular-nums mt-0.5">
                        ${recommendation.buy_usd?.toFixed(2)} ({recommendation.shares_to_buy} shares)
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Park in Dime FCD (75%):</span>
                      <div className="text-base font-black text-[#FFD740] tabular-nums mt-0.5">
                        ${recommendation.park_fcd_usd?.toFixed(2)} (~{recommendation.fcd_yield_pct}% APY)
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Quota Jump:</span>
                      <div className="text-base font-black text-slate-100 tabular-nums mt-0.5">
                        {recommendation.current_progress}% → {recommendation.projected_progress}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-2xl bg-[#2962FF]/10 border border-[#2962FF]/30 space-y-1.5 text-[13px]">
                    <div className="font-bold text-[#2962FF]">Execution Rationale:</div>
                    <p className="text-slate-200 font-medium">{recommendation.reason}</p>
                    <p className="text-slate-300">(ไทย: {recommendation.reason_th})</p>
                  </div>
                </div>
              )}

              {/* Cash Sweep */}
              {recommendation.type === 'CASH_SWEEP' && (
                <div className="p-6 rounded-3xl bg-[#1E222D] border-2 border-[#FFD740]/40 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center gap-3.5 mb-3">
                    <span className="text-3xl">💤</span>
                    <div>
                      <h3 className="text-xl font-black text-white">
                        No Golden Setup Today — Dime! Cash Sweep
                      </h3>
                      <p className="text-[13px] text-slate-300">
                        หุ้นทุกตัวยังไม่เข้าเงื่อนไขแนวรับ EMA 150/200 • ห้ามไล่ราคาเด็ดขาด
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#131722] border border-[#2A2E39] my-4">
                    <div className="text-[13px] text-slate-400 font-medium">Recommended Action:</div>
                    <div className="text-xl sm:text-2xl font-black text-[#FFD740] mt-1 tabular-nums">
                      Park ${recommendation.total_usd?.toFixed(2)} (฿{recommendation.total_thb?.toLocaleString()}) in Dime! FCD
                    </div>
                    <div className="text-[13px] text-slate-300 mt-1">
                      Earn ~{recommendation.fcd_yield_pct}% APY while sitting on your hands and waiting for the market to give a discount.
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FFD740]/10 border border-[#FFD740]/30 text-[13px] text-slate-200 leading-relaxed">
                    (ไทย: {recommendation.reason_th})
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. CONFIG SETTINGS MODAL */}
      {/* ============================================================ */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#1E222D] border border-[#2A2E39] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#2A2E39] pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#2962FF]" />
                <span>Project 2X Engine Configuration</span>
              </h3>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#2A2E39] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-[13px]">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Goal Amount (THB):
                </label>
                <input
                  type="number"
                  value={cfgGoalThb}
                  onChange={(e) => setCfgGoalThb(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#131722] border border-[#2A2E39] rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Monthly Inflow (THB):
                </label>
                <input
                  type="number"
                  value={cfgInflowThb}
                  onChange={(e) => setCfgInflowThb(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#131722] border border-[#2A2E39] rounded-xl text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Target CAGR (e.g. 0.26 for 26%):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cfgCagr}
                    onChange={(e) => setCfgCagr(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#131722] border border-[#2A2E39] rounded-xl text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Max Stock Ceiling %:
                  </label>
                  <input
                    type="number"
                    value={cfgCeiling}
                    onChange={(e) => setCfgCeiling(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#131722] border border-[#2A2E39] rounded-xl text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Dime! FCD Interest Yield (% APY):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={cfgFcdApy}
                  onChange={(e) => setCfgFcdApy(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#131722] border border-[#2A2E39] rounded-xl text-white font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2A2E39]">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#2A2E39] hover:bg-[#363A45] text-slate-300 text-[13px] font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-5 py-2.5 rounded-xl bg-[#2962FF] hover:bg-[#1E50E6] text-white text-[13px] font-bold transition-all shadow-lg cursor-pointer"
              >
                {isSavingConfig ? 'Saving...' : 'Save & Recalculate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
