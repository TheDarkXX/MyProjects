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
  TrendingDown
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
    fetchDashboard,
    fetchQuotas,
    resetQuotas,
    fetchRadar,
    calculateRecommendation,
    fetchConfig,
    updateConfig,
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
  const inputUsdEquivalent = (Number(inflowAmountInput) / fxRate) || 0;

  const coreQuotas = quotas.filter(q => q.category === 'Core');
  const moonshotQuotas = quotas.filter(q => q.category === 'Moonshot');

  return (
    <div className="min-h-screen bg-[#131722] text-slate-200 pb-20 selection:bg-[#2962FF] selection:text-white">
      {/* 1. MASTER HUD (STICKY HEADER) */}
      <div className="sticky top-0 z-30 bg-[#1E222D]/95 backdrop-blur-md border-b border-[#2A2E39] shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Left: Engine Identity */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#823AFD] to-[#2962FF] flex items-center justify-center shadow-lg shadow-[#823AFD]/20">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    Project 2X Autonomous Engine
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[13px] font-semibold bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/30">
                    Live
                  </span>
                </div>
                <p className="text-[13px] text-slate-300">
                  Target: ฿10,000,000 in 5 Years (CAGR 26%) • Dime! Ecosystem
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="px-3 py-2 rounded-lg bg-[#2A2E39] hover:bg-[#363A45] text-slate-200 text-[13px] font-medium transition-colors flex items-center gap-1.5"
                title="Refresh All Engine Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingDashboard || isLoadingRadar ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="px-3 py-2 rounded-lg bg-[#2A2E39] hover:bg-[#363A45] text-slate-200 text-[13px] font-medium transition-colors flex items-center gap-1.5"
                title="Engine Settings"
              >
                <Settings className="w-4 h-4" />
                <span>Config</span>
              </button>
            </div>
          </div>

          {/* HUD Summary Card */}
          <div className="mt-4 p-4 rounded-xl bg-[#131722] border border-[#2A2E39] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Grand Progress Ring + ETA (Cols 1-5) */}
            <div className="lg:col-span-5 flex items-center gap-5 border-b lg:border-b-0 lg:border-r border-[#2A2E39] pb-4 lg:pb-0 lg:pr-5">
              <ProgressRing
                percent={dashboard?.progress_percent || 0}
                size={96}
                strokeWidth={8}
                color="#26A69A"
                bgColor="#2A2E39"
              >
                <div className="text-center">
                  <span className="text-base font-extrabold text-white">
                    {(dashboard?.progress_percent || 0).toFixed(1)}%
                  </span>
                </div>
              </ProgressRing>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black text-white">
                    ฿{(dashboard?.total_val_thb || 0).toLocaleString()}
                  </span>
                  <span className="text-[13px] text-slate-400 font-medium">
                    / ฿{(dashboard?.goal_val_thb || 10000000).toLocaleString()}
                  </span>
                </div>

                {/* Confidence Band Selector */}
                <div className="mt-2 flex items-center gap-1.5">
                  {(['Conservative', 'Base', 'Bull'] as const).map((band) => (
                    <button
                      key={band}
                      onClick={() => setSelectedBand(band)}
                      className={`px-2 py-0.5 rounded text-[13px] font-semibold transition-all ${
                        selectedBand === band
                          ? 'bg-[#2962FF] text-white shadow-sm'
                          : 'bg-[#1E222D] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {band} {band === 'Base' ? '26%' : band === 'Conservative' ? '20%' : '32%'}
                    </button>
                  ))}
                </div>

                <div className="mt-1.5 flex items-center gap-2 text-[13px]">
                  <span className="text-slate-400">Target ETA:</span>
                  <span className="font-bold text-[#FFD740] bg-[#FFD740]/10 px-2 py-0.5 rounded border border-[#FFD740]/20">
                    {currentEtaItem?.targetDate || 'Calculating...'} ({currentEtaItem?.years || 0} Yrs)
                  </span>
                </div>
              </div>
            </div>

            {/* Key Metrics Grid (Cols 6-12) */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
              <div className="p-2.5 rounded-lg bg-[#1E222D] border border-[#2A2E39]">
                <div className="text-slate-400">Total Value (USD)</div>
                <div className="text-base font-bold text-slate-100 mt-0.5">
                  ${(dashboard?.total_val_usd || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#1E222D] border border-[#2A2E39]">
                <div className="text-slate-400">Monthly Inflow</div>
                <div className="text-base font-bold text-[#26A69A] mt-0.5">
                  ฿{(dashboard?.monthly_inflow_thb || 35000).toLocaleString()}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#1E222D] border border-[#2A2E39]">
                <div className="text-slate-400">Exchange Rate</div>
                <div className="text-base font-bold text-slate-100 mt-0.5">
                  ฿{fxRate.toFixed(2)}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#1E222D] border border-[#2A2E39]">
                <div className="text-slate-400">Dime Cash / FCD</div>
                <div className="text-base font-bold text-[#FFD740] mt-0.5 flex items-center gap-1">
                  ${(dashboard?.dime_cash_usd || 0).toLocaleString()}
                  <span className="text-[13px] text-[#26A69A]">✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TABS NAVIGATION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center gap-2 border-b border-[#2A2E39] pb-3 overflow-x-auto">
          <button
            onClick={() => setSelectedTab('vault')}
            className={`px-4 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'vault'
                ? 'bg-[#2962FF] text-white shadow-lg shadow-[#2962FF]/20'
                : 'bg-[#1E222D] text-slate-300 hover:text-white hover:bg-[#2A2E39]'
            }`}
          >
            <span>🧸</span>
            <span>Toy Vault (Share Collection)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[13px] bg-black/30 text-slate-200">
              {quotas.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedTab('radar')}
            className={`px-4 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'radar'
                ? 'bg-[#2962FF] text-white shadow-lg shadow-[#2962FF]/20'
                : 'bg-[#1E222D] text-slate-300 hover:text-white hover:bg-[#2A2E39]'
            }`}
          >
            <span>🎯</span>
            <span>Signal Radar (TradingView Screener)</span>
            {(dashboard?.active_sell_alerts_count || 0) > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[13px] bg-[#EF5350] text-white font-black animate-pulse">
                {dashboard?.active_sell_alerts_count} ALERTS
              </span>
            )}
          </button>

          <button
            onClick={() => setSelectedTab('inflow')}
            className={`px-4 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'inflow'
                ? 'bg-[#2962FF] text-white shadow-lg shadow-[#2962FF]/20'
                : 'bg-[#1E222D] text-slate-300 hover:text-white hover:bg-[#2A2E39]'
            }`}
          >
            <span>⚡</span>
            <span>Inflow Slip & Cash Sweep</span>
          </button>
        </div>
      </div>

      {/* 3. TAB CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* ============================================================ */}
        {/* TAB 1: 🧸 TOY VAULT (SHARE COLLECTION ALBUM) */}
        {/* ============================================================ */}
        {selectedTab === 'vault' && (
          <div className="space-y-8">
            {/* Header / Info bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-[#1E222D] border border-[#2A2E39]">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧸</span>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Share Collection Vault (สะสมของเล่นให้ครบโควต้า)
                  </h2>
                  <p className="text-[13px] text-slate-300 mt-0.5">
                    สะสมตามจำนวนหุ้นเป้าหมายที่คำนวณจาก $P_{'{base}'}$ คงที่ • สติ๊กเกอร์อัลบั้มเต็ม = พิชิต 10 ล้าน!
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (activePortfolioId && confirm('Reset quotas to the standard 12 Project 2X Commander stocks?')) {
                    resetQuotas(activePortfolioId);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-[#2A2E39] hover:bg-[#363A45] text-slate-300 text-[13px] font-medium transition-colors self-start sm:self-auto flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to 12 Commanders</span>
              </button>
            </div>

            {/* Core Commanders Group */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#26A69A] flex items-center gap-2">
                  <span>👑 CORE COMMANDERS (83% of Portfolio)</span>
                  <span className="text-slate-400 font-normal text-[13px]">
                    — 9 จอมราชันย์ผูกขาดโลก ถือยาว 10 ปี
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {coreQuotas.map((q) => {
                  const radarMatch = radar?.rows.find(r => r.symbol === q.symbol);
                  const isBuyZoneToday = radarMatch?.traffic_light === 'BUY_ZONE';

                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl bg-[#1E222D] border border-[#2A2E39] hover:border-[#2962FF]/50 transition-all flex flex-col justify-between relative group shadow-lg"
                    >
                      {/* Top status indicator */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-white">{q.symbol}</span>
                            <span className="px-1.5 py-0.5 rounded text-[13px] font-bold bg-[#2A2E39] text-slate-300">
                              {q.target_percent}%
                            </span>
                          </div>
                          <span className="text-[13px] text-slate-400">
                            Base: ${q.base_price.toFixed(2)}
                          </span>
                        </div>

                        {/* Signal Dot or Status Badge */}
                        <div className="flex flex-col items-end gap-1">
                          {isBuyZoneToday && (
                            <span className="px-2 py-0.5 rounded-full text-[13px] font-bold bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/40 flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#26A69A]" />
                              Buy Zone!
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[13px] font-bold uppercase ${
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

                      {/* Center: Progress Ring & Share Counter */}
                      <div className="my-4 flex items-center justify-between gap-4">
                        <ProgressRing
                          percent={q.progress_percent}
                          size={64}
                          strokeWidth={6}
                          color="#26A69A"
                        >
                          <span className="text-[13px] font-extrabold text-slate-200">
                            {q.progress_percent.toFixed(0)}%
                          </span>
                        </ProgressRing>

                        <div className="flex-1 text-right">
                          <div className="text-[13px] text-slate-400">Shares Owned</div>
                          <div className="text-base font-extrabold text-white">
                            {q.owned_shares} <span className="text-slate-400 font-normal">/ {q.target_shares}</span>
                          </div>
                          <div className="text-[13px] text-slate-400 mt-0.5">
                            Remain: <span className="text-slate-300 font-semibold">{Math.max(0, Number((q.target_shares - q.owned_shares).toFixed(4)))}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sparkline & Quick Action */}
                      <div className="mt-2 pt-2 border-t border-[#2A2E39]">
                        {radarMatch?.sparkline ? (
                          <div className="mb-2">
                            <MiniSparkline
                              closes={radarMatch.sparkline.closes}
                              ema150={radarMatch.sparkline.ema150}
                              ema200={radarMatch.sparkline.ema200}
                              height={32}
                              showEma={true}
                            />
                          </div>
                        ) : null}

                        <button
                          onClick={() => {
                            setSelectedTab('inflow');
                          }}
                          className="w-full py-1.5 rounded-lg bg-[#2A2E39] hover:bg-[#2962FF] text-slate-200 hover:text-white text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Fill via Inflow Slip</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Moonshot Strikes Group */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#823AFD] flex items-center gap-2">
                  <span>🚀 MOONSHOT STRIKES (11% of Portfolio)</span>
                  <span className="text-slate-400 font-normal text-[13px]">
                    — 4 ขุนพลโตกระโดด +100% Free-Ride Engine
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {moonshotQuotas.map((q) => {
                  const radarMatch = radar?.rows.find(r => r.symbol === q.symbol);
                  const isBuyZoneToday = radarMatch?.traffic_light === 'BUY_ZONE';

                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl bg-[#1E222D] border border-[#2A2E39] hover:border-[#823AFD]/50 transition-all flex flex-col justify-between relative shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-white">{q.symbol}</span>
                            <span className="px-1.5 py-0.5 rounded text-[13px] font-bold bg-[#2A2E39] text-slate-300">
                              {q.target_percent}%
                            </span>
                          </div>
                          <span className="text-[13px] text-slate-400">
                            Base: ${q.base_price.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {isBuyZoneToday && (
                            <span className="px-2 py-0.5 rounded-full text-[13px] font-bold bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/40 flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#26A69A]" />
                              Buy Zone!
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[13px] font-bold uppercase ${
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
                          <span className="text-[13px] font-extrabold text-slate-200">
                            {q.progress_percent.toFixed(0)}%
                          </span>
                        </ProgressRing>

                        <div className="flex-1 text-right">
                          <div className="text-[13px] text-slate-400">Shares Owned</div>
                          <div className="text-base font-extrabold text-white">
                            {q.owned_shares} <span className="text-slate-400 font-normal">/ {q.target_shares}</span>
                          </div>
                          <div className="text-[13px] text-slate-400 mt-0.5">
                            Remain: <span className="text-slate-300 font-semibold">{Math.max(0, Number((q.target_shares - q.owned_shares).toFixed(4)))}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#2A2E39]">
                        {radarMatch?.sparkline ? (
                          <div className="mb-2">
                            <MiniSparkline
                              closes={radarMatch.sparkline.closes}
                              ema150={radarMatch.sparkline.ema150}
                              ema200={radarMatch.sparkline.ema200}
                              height={32}
                              showEma={true}
                            />
                          </div>
                        ) : null}

                        <button
                          onClick={() => {
                            setSelectedTab('inflow');
                          }}
                          className="w-full py-1.5 rounded-lg bg-[#2A2E39] hover:bg-[#823AFD] text-slate-200 hover:text-white text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
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
        {/* TAB 2: 🎯 SIGNAL RADAR (TRADINGVIEW SCREENER) */}
        {/* ============================================================ */}
        {selectedTab === 'radar' && (
          <div className="space-y-6">
            {/* SELL ALERT BANNERS (IF ANY) */}
            {radar?.sellAlerts && radar.sellAlerts.length > 0 && (
              <div className="space-y-3">
                {radar.sellAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#EF5350]/15 border border-[#EF5350]/40 flex items-start gap-3 shadow-lg"
                  >
                    <AlertTriangle className="w-5 h-5 text-[#EF5350] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#EF5350] text-[14px]">
                          [{alert.layer}] {alert.symbol}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[13px] font-bold bg-[#EF5350] text-white">
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

            {/* Radar Table Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-[#1E222D] border border-[#2A2E39]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>TradingView Technical Radar</span>
                  <span className="text-[13px] font-normal text-slate-400">
                    (EMA 150 <span className="text-[#2962FF] font-bold">Blue</span> / EMA 200 <span className="text-[#FFD740] font-bold">Yellow</span> / Banker MCDX <span className="text-[#FF9800] font-bold">Orange</span>)
                  </span>
                </h2>
                <p className="text-[13px] text-slate-300 mt-0.5">
                  ระบบตรวจจับจุดช้อนซื้อต้นน้ำ & ไฟจราจร 5 Scenarios • คลิกที่แถวเพื่อกางกราฟและเหตุผลแทคติค
                </p>
              </div>

              <div className="flex items-center gap-2 text-[13px]">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/30 font-bold">
                  🟢 BUY ZONE
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FFD740]/20 text-[#FFD740] border border-[#FFD740]/30 font-bold">
                  🟡 WAIT
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EF5350]/20 text-[#EF5350] border border-[#EF5350]/30 font-bold">
                  🔴 DANGER
                </span>
              </div>
            </div>

            {/* Screener Table */}
            <div className="overflow-x-auto rounded-xl border border-[#2A2E39] bg-[#1E222D] shadow-xl">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#2A2E39] bg-[#131722] text-slate-300 font-bold uppercase tracking-wider">
                    <th className="p-3.5">Symbol</th>
                    <th className="p-3.5">Price</th>
                    <th className="p-3.5">vs EMA 150</th>
                    <th className="p-3.5">vs EMA 200</th>
                    <th className="p-3.5">Banker MCDX</th>
                    <th className="p-3.5">Signal & Scenario</th>
                    <th className="p-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2E39]">
                  {radar?.rows.map((row) => {
                    const isExpanded = expandedRadarRow === row.symbol;

                    return (
                      <React.Fragment key={row.symbol}>
                        <tr
                          onClick={() => setExpandedRadarRow(isExpanded ? null : row.symbol)}
                          className="hover:bg-[#2A2E39]/60 cursor-pointer transition-colors"
                        >
                          {/* Symbol */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white text-base">
                                {row.symbol}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[13px] bg-[#2A2E39] text-slate-300 font-semibold">
                                {row.category}
                              </span>
                            </div>
                            <span className="text-slate-400 text-[13px]">
                              Quota: {row.progress_percent}%
                            </span>
                          </td>

                          {/* Price */}
                          <td className="p-3.5">
                            <span className="font-extrabold text-slate-100 text-sm">
                              ${row.currentPrice.toFixed(2)}
                            </span>
                          </td>

                          {/* vs EMA 150 */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold ${
                                  row.distEma150 >= 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'
                                }`}
                              >
                                {row.distEma150 >= 0 ? '+' : ''}{row.distEma150}%
                              </span>
                              {row.ema150 && (
                                <span className="text-slate-400 text-[13px]">
                                  (${row.ema150.toFixed(2)})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* vs EMA 200 */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold ${
                                  row.distEma200 >= 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'
                                }`}
                              >
                                {row.distEma200 >= 0 ? '+' : ''}{row.distEma200}%
                              </span>
                              {row.ema200 && (
                                <span className="text-slate-400 text-[13px]">
                                  (${row.ema200.toFixed(2)})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Banker MCDX */}
                          <td className="p-3.5">
                            <div className="w-28">
                              <div className="flex items-center justify-between text-[13px] mb-1">
                                <span className="font-bold text-[#FF9800]">
                                  {row.banker.toFixed(1)}
                                </span>
                                <span className="text-slate-400">/ 20</span>
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
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[13px] font-extrabold flex items-center gap-1.5 ${
                                  row.traffic_light === 'BUY_ZONE'
                                    ? 'bg-[#26A69A]/20 text-[#26A69A] border border-[#26A69A]/40 animate-pulse'
                                    : row.traffic_light === 'WAIT'
                                    ? 'bg-[#FFD740]/20 text-[#FFD740] border border-[#FFD740]/40'
                                    : 'bg-[#EF5350]/20 text-[#EF5350] border border-[#EF5350]/40'
                                }`}
                              >
                                <span>{row.traffic_light === 'BUY_ZONE' ? '🟢' : row.traffic_light === 'WAIT' ? '🟡' : '🔴'}</span>
                                <span>{row.traffic_light}</span>
                              </span>
                              <span className="px-2 py-0.5 rounded text-[13px] bg-[#2A2E39] text-slate-200 font-medium">
                                {row.badge}
                              </span>
                            </div>
                          </td>

                          {/* Details Toggle */}
                          <td className="p-3.5 text-right">
                            <button className="p-1 rounded bg-[#2A2E39] text-slate-300 hover:text-white">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Chart & Playbook Row */}
                        {isExpanded && (
                          <tr className="bg-[#131722]/80 border-b border-[#2A2E39]">
                            <td colSpan={7} className="p-4">
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                                {/* 30-day Sparkline with overlays */}
                                <div className="lg:col-span-6 p-3 rounded-lg bg-[#1E222D] border border-[#2A2E39]">
                                  <div className="flex items-center justify-between text-[13px] mb-2 text-slate-300">
                                    <span className="font-bold">30-Day Trend vs Key EMAs</span>
                                    <div className="flex items-center gap-3">
                                      <span className="flex items-center gap-1 text-[#2962FF] font-semibold">
                                        <span className="w-2 h-0.5 bg-[#2962FF]" /> EMA 150
                                      </span>
                                      <span className="flex items-center gap-1 text-[#FFD740] font-semibold">
                                        <span className="w-2 h-0.5 bg-[#FFD740]" /> EMA 200
                                      </span>
                                    </div>
                                  </div>
                                  <MiniSparkline
                                    closes={row.sparkline.closes}
                                    ema150={row.sparkline.ema150}
                                    ema200={row.sparkline.ema200}
                                    height={80}
                                    showEma={true}
                                  />
                                </div>

                                {/* Tactical Reason Card */}
                                <div className="lg:col-span-6 p-3 rounded-lg bg-[#1E222D] border border-[#2A2E39] space-y-2">
                                  <div className="text-[13px] font-bold text-[#FFD740] flex items-center gap-1.5">
                                    <Info className="w-4 h-4" />
                                    <span>Sniper Radar Tactical Assessment:</span>
                                  </div>
                                  <p className="text-[13px] text-slate-200">
                                    {row.reason}
                                  </p>
                                  <p className="text-[13px] text-slate-300 bg-[#131722] p-2 rounded border border-[#2A2E39]">
                                    {row.reason_th}
                                  </p>
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
        {/* TAB 3: ⚡ INFLOW SLIP & CASH SWEEP */}
        {/* ============================================================ */}
        {selectedTab === 'inflow' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="p-6 rounded-2xl bg-[#1E222D] border border-[#2A2E39] shadow-2xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#26A69A] to-[#2962FF] flex items-center justify-center text-white font-bold">
                  ⚡
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Dime! Inflow Slip & FCD Cash Sweep
                  </h2>
                  <p className="text-[13px] text-slate-300">
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                    ฿
                  </span>
                  <input
                    type="number"
                    value={inflowAmountInput}
                    onChange={(e) => setInflowAmountInput(e.target.value)}
                    placeholder="35000"
                    className="w-full pl-10 pr-4 py-3 bg-[#131722] border border-[#2A2E39] focus:border-[#2962FF] rounded-xl text-xl font-bold text-white focus:outline-none transition-all"
                  />
                </div>

                <div className="flex items-center justify-between text-[13px] text-slate-400 pt-1">
                  <span>≈ ${inputUsdEquivalent.toFixed(2)} USD (at ฿{fxRate.toFixed(2)} / USD)</span>
                  <div className="flex items-center gap-1.5">
                    {[10000, 20000, 35000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setInflowAmountInput(String(amt))}
                        className="px-2 py-0.5 rounded bg-[#2A2E39] hover:bg-[#363A45] text-slate-300 hover:text-white text-[13px] font-medium transition-colors"
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
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#2962FF] to-[#823AFD] hover:from-[#1E50E6] hover:to-[#7029E6] text-white font-extrabold text-[14px] shadow-lg shadow-[#2962FF]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoadingRecommendation ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Analyzing Technical Radar & Quotas...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Calculate Optimal Inflow Mission</span>
                  </>
                )}
              </button>
            </div>

            {/* RECOMMENDATION RESULT CARD */}
            {recommendation && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
                {/* 1. Golden Setup Result */}
                {recommendation.type === 'GOLDEN_SETUP' && (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1E222D] to-[#131722] border-2 border-[#26A69A] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-4 py-1.5 bg-[#26A69A] text-slate-900 font-black text-[13px] rounded-bl-xl uppercase tracking-wider">
                      🎯 Prime Golden Setup
                    </div>

                    <div className="text-[13px] font-extrabold uppercase tracking-wider text-[#26A69A] mb-1">
                      TODAY'S MISSION RECOMMENDATION
                    </div>

                    <div className="text-2xl sm:text-3xl font-black text-white flex items-baseline gap-2">
                      <span>BUY {recommendation.shares_to_buy} SHARES OF</span>
                      <span className="text-[#26A69A] underline decoration-4 underline-offset-4">
                        {recommendation.symbol}
                      </span>
                    </div>

                    <div className="mt-3 p-4 rounded-xl bg-[#131722] border border-[#2A2E39] grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
                      <div>
                        <span className="text-slate-400">Order Price:</span>
                        <div className="text-base font-bold text-slate-100">
                          ${recommendation.price_per_share?.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Total USD:</span>
                        <div className="text-base font-bold text-[#26A69A]">
                          ${recommendation.total_usd?.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Total THB:</span>
                        <div className="text-base font-bold text-slate-100">
                          ฿{recommendation.total_thb?.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Quota Jump:</span>
                        <div className="text-base font-bold text-[#FFD740]">
                          {recommendation.current_progress}% → {recommendation.projected_progress}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-4 rounded-xl bg-[#26A69A]/10 border border-[#26A69A]/30 space-y-1 text-[13px]">
                      <div className="font-bold text-[#26A69A]">Execution Rationale:</div>
                      <p className="text-slate-200">{recommendation.reason}</p>
                      <p className="text-slate-300">(ไทย: {recommendation.reason_th})</p>
                    </div>

                    <div className="mt-4 text-[13px] text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#26A69A]" />
                      <span>Execute directly on Dime! app via Fractional Shares order ($1 minimum).</span>
                    </div>
                  </div>
                )}

                {/* 2. Early Bird Result */}
                {recommendation.type === 'EARLY_BIRD' && (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1E222D] to-[#131722] border-2 border-[#2962FF] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-4 py-1.5 bg-[#2962FF] text-white font-black text-[13px] rounded-bl-xl uppercase tracking-wider">
                      🦅 Early Bird Split
                    </div>

                    <div className="text-[13px] font-extrabold uppercase tracking-wider text-[#2962FF] mb-1">
                      2-STAGE EARLY BIRD STRATEGY
                    </div>

                    <div className="text-2xl font-black text-white">
                      BUY 25% ({recommendation.shares_to_buy} {recommendation.symbol}) + PARK 75% IN FCD
                    </div>

                    <div className="mt-3 p-4 rounded-xl bg-[#131722] border border-[#2A2E39] grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
                      <div>
                        <span className="text-slate-400">Buy Tranche (25%):</span>
                        <div className="text-base font-bold text-[#2962FF]">
                          ${recommendation.buy_usd?.toFixed(2)} ({recommendation.shares_to_buy} shares)
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Park in Dime FCD (75%):</span>
                        <div className="text-base font-bold text-[#FFD740]">
                          ${recommendation.park_fcd_usd?.toFixed(2)} (~{recommendation.fcd_yield_pct}% APY)
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Quota Jump:</span>
                        <div className="text-base font-bold text-slate-100">
                          {recommendation.current_progress}% → {recommendation.projected_progress}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-4 rounded-xl bg-[#2962FF]/10 border border-[#2962FF]/30 space-y-1 text-[13px]">
                      <div className="font-bold text-[#2962FF]">Execution Rationale:</div>
                      <p className="text-slate-200">{recommendation.reason}</p>
                      <p className="text-slate-300">(ไทย: {recommendation.reason_th})</p>
                    </div>
                  </div>
                )}

                {/* 3. Cash Sweep Result */}
                {recommendation.type === 'CASH_SWEEP' && (
                  <div className="p-6 rounded-2xl bg-[#1E222D] border-2 border-[#FFD740]/40 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2">
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

                    <div className="p-4 rounded-xl bg-[#131722] border border-[#2A2E39] my-4">
                      <div className="text-[13px] text-slate-400">Recommended Action:</div>
                      <div className="text-xl font-black text-[#FFD740] mt-1">
                        Park ${recommendation.total_usd?.toFixed(2)} (฿{recommendation.total_thb?.toLocaleString()}) in Dime! FCD
                      </div>
                      <div className="text-[13px] text-slate-300 mt-1">
                        Earn ~{recommendation.fcd_yield_pct}% APY while sitting on your hands and waiting for the market to give a discount.
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#FFD740]/10 border border-[#FFD740]/30 text-[13px] text-slate-200">
                      (ไทย: {recommendation.reason_th})
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. CONFIG SETTINGS MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#1E222D] border border-[#2A2E39] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A2E39] pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#2962FF]" />
                <span>Project 2X Engine Configuration</span>
              </h3>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#2A2E39] text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-[13px]">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Goal Amount (THB):
                </label>
                <input
                  type="number"
                  value={cfgGoalThb}
                  onChange={(e) => setCfgGoalThb(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#131722] border border-[#2A2E39] rounded-lg text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Monthly Inflow (THB):
                </label>
                <input
                  type="number"
                  value={cfgInflowThb}
                  onChange={(e) => setCfgInflowThb(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#131722] border border-[#2A2E39] rounded-lg text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Target CAGR (e.g. 0.26 for 26%):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cfgCagr}
                    onChange={(e) => setCfgCagr(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#131722] border border-[#2A2E39] rounded-lg text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Max Stock Ceiling %:
                  </label>
                  <input
                    type="number"
                    value={cfgCeiling}
                    onChange={(e) => setCfgCeiling(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#131722] border border-[#2A2E39] rounded-lg text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Dime! FCD Interest Yield (% APY):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={cfgFcdApy}
                  onChange={(e) => setCfgFcdApy(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#131722] border border-[#2A2E39] rounded-lg text-white font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2A2E39]">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#2A2E39] hover:bg-[#363A45] text-slate-300 text-[13px] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-5 py-2 rounded-lg bg-[#2962FF] hover:bg-[#1E50E6] text-white text-[13px] font-bold transition-all shadow-lg"
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
