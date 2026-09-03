import React, { useEffect, useMemo } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePriceStore } from '../../stores/priceStore';
import { useUiStore } from '../../stores/uiStore';
import { useHoldings } from '../../hooks/useHoldings';
import { DividendSnowballCard } from './DividendSnowballCard';
import { LifecycleMatrixCard } from './LifecycleMatrixCard';
import { ConvictionGaugeCard } from './ConvictionGaugeCard';
import { Target, DollarSign, Activity, Award, ShieldCheck, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export const ScorecardPage: React.FC = () => {
  const { activePortfolioId, portfolios } = usePortfolioStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { exchangeRate, fetchExchangeRate } = usePriceStore();
  const { currency } = useUiStore();
  const { holdings } = useHoldings();

  const activePortfolio = useMemo(() => {
    return portfolios.find(p => p.id === activePortfolioId);
  }, [portfolios, activePortfolioId]);

  useEffect(() => {
    if (activePortfolioId) {
      fetchTransactions(activePortfolioId);
    }
    fetchExchangeRate('USD', 'THB');
  }, [activePortfolioId, fetchTransactions, fetchExchangeRate]);

  // Quick stats summary
  const summary = useMemo(() => {
    const totalVal = holdings.reduce((sum, h) => sum + h.currentValue, 0);

    // Filter dividend transactions
    const divTxs = transactions.filter(t => t.type === 'DIVIDEND' && t.status !== 'CANCELLED');
    const thisYear = new Date().getFullYear();
    const currYearDivs = divTxs
      .filter(t => new Date(t.date).getFullYear() === thisYear)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Projected Annual Dividend Income (estimate based on current dividend yield + LTM)
    // Conservatively use annualized LTM or 2.2% weighted yield
    const estimatedYieldPct = 0.024; // ~2.4% avg yield
    const padiUsd = totalVal * estimatedYieldPct;
    const monthlyPassiveUsd = padiUsd / 12;

    // Top holding
    const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
    const top3Share = totalVal > 0 
      ? (sorted.slice(0, 3).reduce((s, h) => s + h.currentValue, 0) / totalVal) * 100 
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
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Page Header & Brief */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F2233] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#823AFD] to-[#FC2D79] flex items-center justify-center shadow-lg shadow-[#823AFD]/20 text-white">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                Strategic Scorecard
                <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 tracking-wider">
                  Solo Investor Mode
                </span>
              </h1>
              <p className="text-xs lg:text-sm text-[#9898C8] mt-0.5">
                Institutional-grade evaluation blending Joseph Carlson’s Cash Flow with Shay Boloor’s Conviction
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9898C8]">Portfolio:</span>
          <span className="text-xs font-bold text-white px-3 py-1.5 rounded-xl bg-[#1A1D2D] border border-[#2A2E45]">
            {activePortfolio?.name || 'Default Portfolio'}
          </span>
        </div>
      </div>

      {/* 2. Top Executive Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PADI */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-[#823AFD] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider">
              Est. Annual Passive Income
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {formatMoney(summary.padiUsd)} <span className="text-xs font-normal text-[#9898C8]">/yr</span>
          </div>
          <span className="text-xs text-emerald-400 font-semibold mt-1 block">
            ~{formatMoney(summary.monthlyPassiveUsd)} /mo cash flow
          </span>
        </div>

        {/* 2026 Divs YTD */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-[#823AFD] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider">
              {new Date().getFullYear()} Dividends Received
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {formatMoney(summary.currYearDivs)}
          </div>
          <span className="text-xs text-[#823AFD] font-semibold mt-1 block">
            Accumulating in cash reserve
          </span>
        </div>

        {/* Conviction */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-[#823AFD] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider">
              Top 3 Conviction Weight
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
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-[#823AFD] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider">
              Strategic Posture
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-white tracking-tight">
            {summary.top3Share >= 55 ? '🎯 Sniper' : summary.top3Share >= 35 ? '⚖️ Compounder' : '🏛️ Fortress'}
          </div>
          <span className="text-xs text-[#9898C8] mt-1 block">
            {summary.top3Share >= 55 ? 'High alpha potential' : 'Balanced risk spread'}
          </span>
        </div>
      </div>

      {/* 3. Section 1: Cash Flow & Dividend Snowball Engine */}
      <DividendSnowballCard transactions={transactions} exchangeRate={exchangeRate} />

      {/* 4. Section 2: Company Lifecycle Progression Matrix */}
      <LifecycleMatrixCard holdings={holdings} exchangeRate={exchangeRate} />

      {/* 5. Section 3: Conviction & Concentration Gauge */}
      <ConvictionGaugeCard holdings={holdings} exchangeRate={exchangeRate} />
    </div>
  );
};
