import React, { useEffect, useMemo, useState } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePriceStore } from '../../stores/priceStore';
import { useUiStore } from '../../stores/uiStore';
import { useHoldings } from '../../hooks/useHoldings';
import { DividendSnowballCard } from './DividendSnowballCard';
import { LifecycleMatrixCard } from './LifecycleMatrixCard';
import { ConvictionGaugeCard } from './ConvictionGaugeCard';
import { Target, DollarSign, Activity, Award, ShieldCheck, Sparkles, LayoutGrid, Columns3, Rows2 } from 'lucide-react';
import clsx from 'clsx';

type ScorecardLayoutMode = '3col' | 'panoramic' | 'stacked';

export const ScorecardPage: React.FC = () => {
  const { activePortfolioId, portfolios } = usePortfolioStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { exchangeRate, fetchExchangeRate, fetchPrices } = usePriceStore();
  const { currency } = useUiStore();
  const { holdings } = useHoldings();

  // Layout preference persisted for Ultra-Wide displays (Default to 3col for 21:9)
  const [layoutMode, setLayoutMode] = useState<ScorecardLayoutMode>(() => {
    return (localStorage.getItem('scorecard_layout_mode') as ScorecardLayoutMode) || '3col';
  });

  const handleLayoutChange = (mode: ScorecardLayoutMode) => {
    setLayoutMode(mode);
    localStorage.setItem('scorecard_layout_mode', mode);
  };

  const activePortfolio = useMemo(() => {
    return portfolios.find(p => p.id === activePortfolioId);
  }, [portfolios, activePortfolioId]);

  // Extract active symbols from holdings to ensure prices are fetched
  const activeSymbols = useMemo(() => {
    return holdings.map(h => h.symbol).filter(Boolean);
  }, [holdings]);

  useEffect(() => {
    if (activePortfolioId) {
      fetchTransactions(activePortfolioId);
    }
    fetchExchangeRate('USD', 'THB');
  }, [activePortfolioId, fetchTransactions, fetchExchangeRate]);

  // Automatically fetch live prices for all holdings when visiting Scorecard
  useEffect(() => {
    if (activeSymbols.length > 0) {
      fetchPrices(activeSymbols);
    }
  }, [activeSymbols.join(','), fetchPrices]);

  // Quick stats summary
  const summary = useMemo(() => {
    const totalVal = holdings.reduce((sum, h) => sum + (h.currentValue || h.totalCost || 0), 0);

    // Filter dividend transactions
    const divTxs = transactions.filter(t => t.type === 'DIVIDEND' && t.status !== 'CANCELLED');
    const thisYear = new Date().getFullYear();
    const currYearDivs = divTxs
      .filter(t => new Date(t.date).getFullYear() === thisYear)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Projected Annual Dividend Income (estimated conservatively from portfolio value)
    const estimatedYieldPct = 0.024; // ~2.4% avg yield
    const padiUsd = totalVal * estimatedYieldPct;
    const monthlyPassiveUsd = padiUsd / 12;

    // Top holdings
    const sorted = [...holdings].sort((a, b) => {
      const valA = a.currentValue || a.totalCost || 0;
      const valB = b.currentValue || b.totalCost || 0;
      return valB - valA;
    });

    const top3Share = totalVal > 0 
      ? (sorted.slice(0, 3).reduce((s, h) => s + (h.currentValue || h.totalCost || 0), 0) / totalVal) * 100 
      : 0;

    return {
      totalVal,
      currYearDivs,
      padiUsd,
      monthlyPassiveUsd,
      top3Share,
      top3Names: sorted.slice(0, 3).map(h => h.symbol).join(', ') || '-',
    };
  }, [holdings, transactions]);

  const currSymbol = currency === 'THB' ? '฿' : '$';
  const formatMoney = (usdVal: number) => {
    const val = currency === 'THB' ? usdVal * exchangeRate : usdVal;
    return `${currSymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="w-full max-w-[2800px] mx-auto pb-16 space-y-6 px-1">
      {/* 1. Page Header & Ultra-Wide Layout Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#1F2233] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#823AFD] to-[#FC2D79] flex items-center justify-center shadow-lg shadow-[#823AFD]/20 text-white shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                Strategic Scorecard
                <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 tracking-wider">
                  Solo Investor Command Center
                </span>
              </h1>
              <p className="text-xs lg:text-sm text-[#9898C8] mt-0.5">
                ประเมินผลลัพธ์การลงทุน: พลังกระแสเงินสด (Joseph Carlson) และวินัยความเข้มข้น (Shay Boloor)
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Portfolio Tag & 21:9 Column Layout Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active Portfolio Badge */}
          <div className="flex items-center gap-2 bg-[#111418] border border-[#2A2E45] px-3 py-1.5 rounded-2xl text-xs">
            <span className="text-[#9898C8]">พอร์ตปัจจุบัน:</span>
            <span className="font-bold text-white">{activePortfolio?.name || 'Default Portfolio'}</span>
          </div>

          {/* 1 - 3 Column Layout Switcher Pill */}
          <div className="flex items-center bg-[#111418] border border-[#2A2E45] p-1 rounded-2xl text-xs gap-1 shadow-inner">
            <button
              onClick={() => handleLayoutChange('3col')}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                layoutMode === '3col'
                  ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                  : "text-[#9898C8] hover:text-white"
              )}
              title="3 Columns (เต็มตากว้างสะใจบนจอ Ultra-Wide 21:9)"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>3 คอลัมน์ (Ultra-Wide)</span>
            </button>

            <button
              onClick={() => handleLayoutChange('panoramic')}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                layoutMode === 'panoramic'
                  ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                  : "text-[#9898C8] hover:text-white"
              )}
              title="Panoramic (แถวบน 2 คอลัมน์ + แถวล่างไทม์ไลน์กว้าง)"
            >
              <Rows2 className="w-3.5 h-3.5" />
              <span>Panoramic (2:1)</span>
            </button>

            <button
              onClick={() => handleLayoutChange('stacked')}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                layoutMode === 'stacked'
                  ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                  : "text-[#9898C8] hover:text-white"
              )}
              title="1 Column (เรียงเดี่ยวยาวแนวดิ่ง)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>1 คอลัมน์</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Executive Summary Badges (แปลผลง่าย ชัดเจน ทันที) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
        {/* PADI */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider">
              ปันผลคาดการณ์รายปี (PADI)
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {formatMoney(summary.padiUsd)} <span className="text-xs font-normal text-[#9898C8]">/ปี</span>
          </div>
          <span className="text-xs text-emerald-400 font-semibold mt-1 block">
            ~{formatMoney(summary.monthlyPassiveUsd)} /เดือน กระแสเงินสดพาสซีฟ
          </span>
        </div>

        {/* 2026 Divs YTD */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-[#823AFD] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider">
              ปันผลรับสะสมปี {new Date().getFullYear()}
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {formatMoney(summary.currYearDivs)}
          </div>
          <span className="text-xs text-[#823AFD] font-semibold mt-1 block">
            รับเข้าพอร์ตจริงแล้ว สะสมเป็นเงินสด
          </span>
        </div>

        {/* Conviction */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider">
              สามทหารเสือกุมพอร์ต (Top 3 Weight)
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {summary.top3Share.toFixed(1)}%
          </div>
          <span className="text-xs text-amber-400 font-semibold mt-1 truncate block" title={summary.top3Names}>
            {summary.top3Names}
          </span>
        </div>

        {/* Posture */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider">
              กระบวนทัพหลัก (Strategic Posture)
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-white tracking-tight">
            {summary.top3Share >= 50 ? '🎯 Sniper' : summary.top3Share >= 35 ? '⚖️ Compounder' : '🏛️ Fortress'}
          </div>
          <span className="text-xs text-[#9898C8] mt-1 block">
            {summary.top3Share >= 50 ? 'เน้นสร้าง Alpha สูงสุด' : summary.top3Share >= 35 ? 'สมดุลการเติบโตและป้องกัน' : 'เน้นกระจายความเสี่ยง'}
          </span>
        </div>
      </div>

      {/* 3. Dynamic Section Layouts (3-Col vs Panoramic vs Stacked) */}
      {layoutMode === '3col' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Column 1: Cash Flow & Dividend Snowball Engine */}
          <div className="flex flex-col gap-6 min-w-0">
            <DividendSnowballCard transactions={transactions} exchangeRate={exchangeRate} />
          </div>

          {/* Column 2: Company Lifecycle Progression Matrix */}
          <div className="flex flex-col gap-6 min-w-0">
            <LifecycleMatrixCard holdings={holdings} exchangeRate={exchangeRate} isCompact={true} />
          </div>

          {/* Column 3: Conviction & Concentration Gauge */}
          <div className="flex flex-col gap-6 min-w-0">
            <ConvictionGaugeCard holdings={holdings} exchangeRate={exchangeRate} isCompact={true} />
          </div>
        </div>
      )}

      {layoutMode === 'panoramic' && (
        <div className="space-y-6">
          {/* Top Row: Dual Engines */}
          <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6 items-start">
            <div className="2xl:col-span-7 min-w-0">
              <DividendSnowballCard transactions={transactions} exchangeRate={exchangeRate} />
            </div>
            <div className="2xl:col-span-5 min-w-0">
              <ConvictionGaugeCard holdings={holdings} exchangeRate={exchangeRate} />
            </div>
          </div>

          {/* Bottom Row: Full Ultra-Wide Lifecycle Matrix */}
          <div className="w-full min-w-0">
            <LifecycleMatrixCard holdings={holdings} exchangeRate={exchangeRate} isCompact={false} />
          </div>
        </div>
      )}

      {layoutMode === 'stacked' && (
        <div className="space-y-6">
          <div className="min-w-0">
            <DividendSnowballCard transactions={transactions} exchangeRate={exchangeRate} />
          </div>
          <div className="min-w-0">
            <LifecycleMatrixCard holdings={holdings} exchangeRate={exchangeRate} isCompact={false} />
          </div>
          <div className="min-w-0">
            <ConvictionGaugeCard holdings={holdings} exchangeRate={exchangeRate} />
          </div>
        </div>
      )}
    </div>
  );
};
