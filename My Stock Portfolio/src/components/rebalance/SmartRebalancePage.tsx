import React, { useState, useMemo, useEffect } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useHoldings } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';
import { usePriceStore } from '../../stores/priceStore';
import { useBlueprintStore } from '../../stores/blueprintStore';
import { BlueprintEditor } from './BlueprintEditor';
import { Scale, SlidersHorizontal, DollarSign, ArrowRight, Check, Copy, Sparkles, TrendingUp, Scissors, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

type MainTab = 'blueprint' | 'tools';
type RebalanceMode = 'cashflow' | 'matrix' | 'trim' | 'dividend';

export const SmartRebalancePage: React.FC = () => {
  const { activePortfolioId, portfolios } = usePortfolioStore();
  const { fetchTransactions } = useTransactionStore();
  const { holdings, totalNetWorth } = useHoldings();
  const { currency } = useUiStore();
  const { prices, exchangeRate, fetchExchangeRate, fetchPrices, metadata, fetchMetadata } = usePriceStore();
  
  const { blueprints, fetchBlueprints } = useBlueprintStore();

  const [mainTab, setMainTab] = useState<MainTab>('blueprint');
  const [mode, setMode] = useState<RebalanceMode>('cashflow');
  const [depositAmountUsd, setDepositAmountUsd] = useState<number>(1000);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync data on load
  useEffect(() => {
    if (activePortfolioId) {
      fetchTransactions(activePortfolioId);
      fetchBlueprints(activePortfolioId);
    }
    fetchExchangeRate('USD', 'THB');
  }, [activePortfolioId, fetchTransactions, fetchExchangeRate, fetchBlueprints]);

  // Switch to tools tab if blueprints exist
  useEffect(() => {
    if (blueprints.length > 0 && mainTab === 'blueprint') {
      setMainTab('tools');
    }
  }, [blueprints.length]);

  const activeSymbols = useMemo(() => {
    const symbols = new Set<string>();
    holdings.forEach(h => { if (h.symbol) symbols.add(h.symbol); });
    blueprints.forEach(b => symbols.add(b.symbol));
    return Array.from(symbols);
  }, [holdings, blueprints]);

  useEffect(() => {
    if (activeSymbols.length > 0) {
      fetchPrices(activeSymbols);
      fetchMetadata(activeSymbols);
    }
  }, [activeSymbols.join(','), fetchPrices, fetchMetadata]);

  // Mode 3: Trim Simulator
  const [trimSymbol, setTrimSymbol] = useState<string>('');
  const [trimShares, setTrimShares] = useState<number>(1);
  const [targetFundSymbol, setTargetFundSymbol] = useState<string>('');

  const currSymbol = currency === 'THB' ? '฿' : '$';
  const effectiveRate = exchangeRate > 0 ? exchangeRate : 35.0;

  const formatMoney = (usd: number, decimals?: number) => {
    const safeUsd = typeof usd === 'number' && !isNaN(usd) ? usd : 0;
    const val = currency === 'THB' ? safeUsd * effectiveRate : safeUsd;
    const dec = decimals !== undefined ? decimals : (currency === 'THB' ? 0 : 2);
    return `${currSymbol}${val.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
  };

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
  }, [holdings]);

  React.useEffect(() => {
    if (!trimSymbol && sortedHoldings.length > 0) setTrimSymbol(sortedHoldings[0].symbol);
    if (!targetFundSymbol && sortedHoldings.length > 1) setTargetFundSymbol(sortedHoldings[1].symbol);
  }, [sortedHoldings, trimSymbol, targetFundSymbol]);

  // Combined Portfolio (Holdings + Watchlist from Blueprint)
  const combinedPortfolio = useMemo(() => {
    const map = new Map<string, any>();
    
    // Add existing holdings
    holdings.forEach(h => {
      const livePrice = prices[h.symbol]?.price || h.lastPrice || h.avgCost || 1;
      map.set(h.symbol, {
        symbol: h.symbol,
        currentQty: h.quantity,
        currentVal: h.currentValue || 0,
        price: livePrice,
        isWatchlist: false
      });
    });

    // Add blueprints
    blueprints.forEach(bp => {
      if (!map.has(bp.symbol)) {
        const livePrice = prices[bp.symbol]?.price || bp.target_price || 1;
        map.set(bp.symbol, {
          symbol: bp.symbol,
          currentQty: 0,
          currentVal: 0,
          price: livePrice,
          isWatchlist: true
        });
      }
    });

    return Array.from(map.values());
  }, [holdings, blueprints, prices]);

  // MODE 1: Cash-Flow Rebalancing Calculation based on Blueprint
  const cashflowRecommendations = useMemo(() => {
    if (depositAmountUsd <= 0 || blueprints.length === 0) return [];

    const newTotalVal = totalNetWorth + depositAmountUsd;
    const recommendations: any[] = [];
    const deficits: any[] = [];

    combinedPortfolio.forEach(item => {
      const bp = blueprints.find(b => b.symbol === item.symbol);
      if (!bp) return; // Skip if not in blueprint
      
      const tgtPct = bp.target_percent;
      const tgtVal = (tgtPct / 100) * newTotalVal;
      const currentVal = item.currentVal;
      const deficit = Math.max(0, tgtVal - currentVal);
      
      deficits.push({
        ...item,
        targetWeight: tgtPct,
        targetVal,
        deficit
      });
    });

    const totalDeficit = deficits.reduce((s, d) => s + d.deficit, 0);

    deficits.forEach(d => {
      let allocatedUsd = 0;
      if (totalDeficit > 0) {
        allocatedUsd = (d.deficit / totalDeficit) * depositAmountUsd;
      } else {
        allocatedUsd = (d.targetWeight / 100) * depositAmountUsd;
      }

      const buyShares = d.price > 0 ? Number((allocatedUsd / d.price).toFixed(2)) : 0;
      const newVal = d.currentVal + allocatedUsd;
      const projectedWeight = newTotalVal > 0 ? (newVal / newTotalVal) * 100 : 0;

      if (allocatedUsd >= 5) {
        recommendations.push({
          ...d,
          allocatedUsd,
          buyShares,
          currentWeight: totalNetWorth > 0 ? (d.currentVal / totalNetWorth) * 100 : 0,
          projectedWeight,
        });
      }
    });

    return recommendations.sort((a, b) => b.allocatedUsd - a.allocatedUsd);
  }, [combinedPortfolio, depositAmountUsd, totalNetWorth, blueprints]);

  // MODE 2: Target vs Actual Matrix based on Blueprint
  const matrixAnalysis = useMemo(() => {
    return combinedPortfolio.map(item => {
      const bp = blueprints.find(b => b.symbol === item.symbol);
      const actualPct = totalNetWorth > 0 ? (item.currentVal / totalNetWorth) * 100 : 0;
      const targetPct = bp ? bp.target_percent : 0;
      const deltaPct = actualPct - targetPct;
      const targetVal = (targetPct / 100) * totalNetWorth;
      const deltaVal = item.currentVal - targetVal;
      const sharesGap = Math.abs(deltaVal) / item.price;

      return {
        symbol: item.symbol,
        price: item.price,
        currentVal: item.currentVal,
        actualPct,
        targetPct,
        deltaPct,
        deltaVal,
        sharesGap,
        status: Math.abs(deltaPct) < 1.0 ? 'on_target' : deltaPct > 0 ? 'overweight' : 'underweight',
        inBlueprint: !!bp
      };
    });
  }, [combinedPortfolio, totalNetWorth, blueprints]);

  // MODE 3: Trim Simulation
  const trimHolding = useMemo(() => holdings.find(h => h.symbol === trimSymbol), [holdings, trimSymbol]);
  const targetAsset = useMemo(() => combinedPortfolio.find(h => h.symbol === targetFundSymbol), [combinedPortfolio, targetFundSymbol]);

  const trimProceedsUsd = useMemo(() => {
    if (!trimHolding) return 0;
    const price = prices[trimHolding.symbol]?.price || trimHolding.lastPrice || trimHolding.avgCost || 0;
    return trimShares * price;
  }, [trimHolding, trimShares, prices]);

  const newFundedShares = useMemo(() => {
    if (!targetAsset || trimProceedsUsd <= 0) return 0;
    const p = targetAsset.price || 1;
    return Number((trimProceedsUsd / p).toFixed(2));
  }, [targetAsset, trimProceedsUsd]);

  // MODE 4: Dividend DRIP Simulator
  const dividendStats = useMemo(() => {
    let totalAnnualIncomeUsd = 0;
    const items = holdings.map(h => {
      const meta = metadata[h.symbol] || {};
      const annualDiv = meta.annual_dividend || 0;
      const divYield = meta.dividend_yield || 0;
      
      const holdingIncome = annualDiv * h.quantity;
      totalAnnualIncomeUsd += holdingIncome;
      
      const yoc = h.avgCost > 0 ? (annualDiv / h.avgCost) * 100 : 0;
      const livePrice = prices[h.symbol]?.price || h.lastPrice || h.avgCost || 1;
      const dripShares = livePrice > 0 ? holdingIncome / livePrice : 0;

      return {
        symbol: h.symbol,
        quantity: h.quantity,
        avgCost: h.avgCost,
        currentPrice: livePrice,
        annualDiv,
        divYield,
        yoc,
        holdingIncome,
        dripShares
      };
    }).sort((a, b) => b.holdingIncome - a.holdingIncome);

    return { items, totalAnnualIncomeUsd };
  }, [holdings, metadata, prices]);

  const copyBuyingPlan = () => {
    const text = cashflowRecommendations
      .map(r => `• BUY ${r.symbol}: +${r.buyShares} shares (~${formatMoney(r.allocatedUsd)})`)
      .join('\n');
    const header = `📋 Blueprint Cash-Flow Plan (Deposit: ${formatMoney(depositAmountUsd)}):\n` + text;
    navigator.clipboard.writeText(header);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activePortfolioId) {
    return <div className="p-8 text-center text-slate-400">Please select a portfolio first.</div>;
  }

  return (
    <div className="w-full max-w-[2800px] mx-auto pb-16 space-y-6 px-1">
      {/* 1. Page Header & Tab Selector */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#823AFD] via-[#06B6D4] to-[#10B981] flex items-center justify-center shadow-[0_4px_16px_rgba(130,58,253,0.3)]">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Smart Rebalance v2
              <span className="text-xs px-3 py-1 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-emerald-400 font-bold">
                Blueprint Powered
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-[#9898C8] mt-1">
              วางพิมพ์เขียวพอร์ต แล้วให้ระบบคำนวณการปรับสมดุลอัตโนมัติ
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex bg-[#1A1D2D] p-1.5 rounded-2xl border border-[#2A2E45] gap-1 self-start xl:self-auto">
          <button
            onClick={() => setMainTab('blueprint')}
            className={clsx(
              "px-5 py-2 rounded-xl text-sm font-bold transition-all",
              mainTab === 'blueprint'
                ? "bg-gradient-to-r from-[#823AFD] to-[#06B6D4] text-white shadow-md"
                : "text-[#9898C8] hover:text-white"
            )}
          >
            Blueprint Setup
          </button>
          <button
            onClick={() => setMainTab('tools')}
            className={clsx(
              "px-5 py-2 rounded-xl text-sm font-bold transition-all",
              mainTab === 'tools'
                ? "bg-gradient-to-r from-[#06B6D4] to-[#10B981] text-white shadow-md"
                : "text-[#9898C8] hover:text-white"
            )}
          >
            Rebalance Tools
          </button>
        </div>
      </div>

      {mainTab === 'blueprint' ? (
        <BlueprintEditor portfolioId={activePortfolioId} />
      ) : (
        <>
          {blueprints.length === 0 ? (
            <div className="p-12 text-center bg-[#111418] border border-[#2A2E45] rounded-3xl">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Blueprint Found</h3>
              <p className="text-[#9898C8] mb-6">You need to set up your portfolio blueprint first before using rebalance tools.</p>
              <button 
                onClick={() => setMainTab('blueprint')}
                className="px-6 py-2 bg-[#823AFD] text-white font-bold rounded-xl"
              >
                Go to Blueprint Setup
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tool Mode Selector */}
              <div className="flex items-center bg-[#111418] border border-[#2A2E45] p-2 rounded-2xl gap-2 overflow-x-auto">
                <button
                  onClick={() => setMode('cashflow')}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    mode === 'cashflow' ? "bg-[#2A2E45] text-white" : "text-[#9898C8] hover:text-white"
                  )}
                >
                  <DollarSign className="w-3.5 h-3.5" /> 1. Cash-Flow (เติมเงิน)
                </button>
                <button
                  onClick={() => setMode('matrix')}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    mode === 'matrix' ? "bg-[#2A2E45] text-white" : "text-[#9898C8] hover:text-white"
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> 2. Gap Matrix
                </button>
                <button
                  onClick={() => setMode('trim')}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    mode === 'trim' ? "bg-[#2A2E45] text-white" : "text-[#9898C8] hover:text-white"
                  )}
                >
                  <Scissors className="w-3.5 h-3.5" /> 3. Trim Simulator
                </button>
                <button
                  onClick={() => setMode('dividend')}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    mode === 'dividend' ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md" : "text-[#9898C8] hover:text-white"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" /> 4. Dividend DRIP
                </button>
              </div>

              {/* MODE 1: CASHFLOW */}
              {mode === 'cashflow' && (
                <div className="space-y-6">
                  <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg">
                    <label className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider block font-heading mb-3">
                      จำนวนเงินที่จะเติมเข้าพอร์ต (New Cash Injection)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative max-w-md w-full">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold text-lg font-heading">{currSymbol}</span>
                        <input
                          type="number"
                          value={currency === 'THB' ? Math.round(depositAmountUsd * effectiveRate) : depositAmountUsd}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            setDepositAmountUsd(currency === 'THB' ? val / effectiveRate : val);
                          }}
                          className="w-full bg-[#161926] border border-[#2A2E45] focus:border-[#10B981] rounded-2xl py-3 pl-10 pr-4 text-2xl font-black text-white outline-none"
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[#CBD5E1] block">{currency === 'THB' ? 'เทียบเท่าดอลลาร์' : 'เทียบเท่าเงินบาท'}</span>
                        <span className="text-base font-bold text-emerald-400">
                          {currency === 'THB' ? `~$${depositAmountUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `~฿${(depositAmountUsd * effectiveRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buying Plan */}
                  <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg space-y-4">
                    <div className="flex justify-between">
                      <h3 className="text-xl font-bold text-white tracking-tight">คำสั่งเคาะซื้อที่แนะนำตาม Blueprint</h3>
                      <button onClick={copyBuyingPlan} className="px-4 py-2 bg-[#1A1D2D] hover:bg-[#2A2E45] border border-[#2A2E45] text-white text-xs font-bold rounded-xl flex items-center gap-2">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#823AFD]" />}
                        {copied ? 'คัดลอกเรียบร้อย!' : 'คัดลอกแผนเคาะซื้อ'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
                      {cashflowRecommendations.map((rec) => (
                        <div key={rec.symbol} className="bg-[#161926] border border-[#2A2E45] rounded-2xl p-5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#823AFD] to-[#FC2D79] flex items-center justify-center font-black text-white text-sm">
                                {rec.symbol.slice(0, 3)}
                              </div>
                              <div>
                                <div className="font-extrabold text-white text-base">{rec.symbol}</div>
                                {rec.isWatchlist && <span className="text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">WATCHLIST</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-white">{formatMoney(rec.price, 2)}</span>
                            </div>
                          </div>

                          <div className="bg-[#1A1D2D] p-3.5 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                            <div>
                              <span className="text-xs uppercase text-emerald-400 font-bold block">คำแนะนำ</span>
                              <div className="text-lg font-black text-white">BUY +{rec.buyShares} หุ้น</div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-[#CBD5E1] block">งบที่ใช้</span>
                              <div className="text-lg font-black text-emerald-400">{formatMoney(rec.allocatedUsd)}</div>
                            </div>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-[#CBD5E1]">
                              <span>สัดส่วนในพอร์ต:</span>
                              <span><strong className="text-white">{(rec.currentWeight ?? 0).toFixed(1)}%</strong> &rarr; <strong className="text-emerald-400">{(rec.projectedWeight ?? 0).toFixed(1)}%</strong> (เป้า {rec.targetWeight}%)</span>
                            </div>
                            <div className="w-full h-2 bg-[#1A1D2D] rounded-full overflow-hidden flex">
                              <div style={{ width: `${Math.max(0, Math.min(100, rec.currentWeight ?? 0))}%` }} className="bg-[#823AFD] h-full" />
                              <div style={{ width: `${Math.max(0, Math.min(100, (rec.projectedWeight ?? 0) - (rec.currentWeight ?? 0)))}%` }} className="bg-emerald-400 h-full" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: MATRIX */}
              {mode === 'matrix' && (
                <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-white tracking-tight mb-4">Blueprint Gap Matrix</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#2A2E45] text-xs uppercase text-[#CBD5E1] font-bold">
                          <th className="pb-3 px-4">Asset</th>
                          <th className="pb-3 px-4 text-right">Current Val</th>
                          <th className="pb-3 px-4 text-right">Actual %</th>
                          <th className="pb-3 px-4 text-center">Target %</th>
                          <th className="pb-3 px-4 text-right">Delta</th>
                          <th className="pb-3 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2A2E45]/60 text-sm">
                        {matrixAnalysis.map((item) => (
                          <tr key={item.symbol} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-4 font-extrabold text-white">
                              {item.symbol} {!item.inBlueprint && <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full ml-2">NOT IN BLUEPRINT</span>}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-white">{formatMoney(item.currentVal)}</td>
                            <td className="py-3 px-4 text-right font-bold text-white">{(item.actualPct ?? 0).toFixed(1)}%</td>
                            <td className="py-3 px-4 text-center font-bold text-emerald-400">{item.targetPct}%</td>
                            <td className="py-3 px-4 text-right">
                              <span className={clsx("font-bold text-xs px-2 py-0.5 rounded-md", item.deltaPct >= 0 ? "text-blue-400 bg-blue-500/10" : "text-amber-400 bg-amber-500/10")}>
                                {item.deltaPct > 0 ? '+' : ''}{(item.deltaPct ?? 0).toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-xs">
                              {item.status === 'on_target' ? (
                                <span className="text-emerald-400 font-bold">On Target</span>
                              ) : item.status === 'underweight' ? (
                                <span className="text-amber-400 font-bold">เติม +{(item.sharesGap ?? 0).toFixed(1)} หุ้น</span>
                              ) : (
                                <span className="text-blue-400 font-bold">เกินเป้า {formatMoney(item.deltaVal)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODE 3: TRIM */}
              {mode === 'trim' && (
                <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-white mb-6">Smart Trim Simulator</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#161926] p-5 rounded-2xl border border-[#2A2E45] space-y-4">
                      <span className="text-xs font-bold text-[#CBD5E1]">1. Trim Source (ขายตัดกำไร)</span>
                      <select value={trimSymbol} onChange={e => setTrimSymbol(e.target.value)} className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-2.5 text-white outline-none">
                        {sortedHoldings.map(h => (
                          <option key={h.symbol} value={h.symbol}>{h.symbol} (ถือ {h.quantity} หุ้น)</option>
                        ))}
                      </select>
                      {trimHolding && (
                        <div>
                          <input type="range" min="1" max={Math.max(1, Math.floor(trimHolding.quantity || 1))} value={trimShares} onChange={e => setTrimShares(Number(e.target.value))} className="w-full" />
                          <div className="mt-2 text-right text-rose-400 font-bold">ได้เงิน: +{formatMoney(trimProceedsUsd, 2)}</div>
                        </div>
                      )}
                    </div>
                    <div className="bg-[#161926] p-5 rounded-2xl border border-[#2A2E45] space-y-4">
                      <span className="text-xs font-bold text-[#CBD5E1]">2. Destination Asset (นำเงินไปซื้อต่อ)</span>
                      <select value={targetFundSymbol} onChange={e => setTargetFundSymbol(e.target.value)} className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-2.5 text-white outline-none">
                        {combinedPortfolio.filter(h => h.symbol !== trimSymbol).map(h => (
                          <option key={h.symbol} value={h.symbol}>{h.symbol} {h.isWatchlist ? '(Watchlist)' : `(ถือ ${h.currentQty} หุ้น)`}</option>
                        ))}
                      </select>
                      {targetAsset && (
                        <div className="mt-2 text-right text-emerald-400 font-bold">
                          ได้เพิ่ม: +{newFundedShares} หุ้น (~{formatMoney(targetAsset.price, 2)}/หุ้น)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 4: DIVIDEND DRIP */}
              {mode === 'dividend' && (
                <div className="space-y-6">
                  {/* Summary Banner */}
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-3xl p-6 shadow-lg flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-amber-500 flex items-center gap-2 mb-1">
                        <Sparkles className="w-5 h-5" /> Estimated Annual Dividend Income
                      </h3>
                      <p className="text-[#CBD5E1] text-sm">รายได้ปันผลคาดการณ์ต่อปี (ยังไม่หักภาษี)</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black text-amber-400 tabular-nums">
                        {formatMoney(dividendStats.totalAnnualIncomeUsd)}
                      </div>
                      <div className="text-sm font-bold text-amber-300 mt-1">
                        / ปี
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-white tracking-tight mb-4">DRIP Simulator (Dividend Reinvestment Plan)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-[#2A2E45] text-xs uppercase text-[#CBD5E1] font-bold">
                            <th className="pb-3 px-4">Asset</th>
                            <th className="pb-3 px-4 text-right">Shares Owned</th>
                            <th className="pb-3 px-4 text-right">Div Yield</th>
                            <th className="pb-3 px-4 text-right">Yield on Cost (YOC)</th>
                            <th className="pb-3 px-4 text-right">Est. Annual Income</th>
                            <th className="pb-3 px-4 text-center">DRIP (+Shares/yr)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A2E45]/60 text-sm">
                          {dividendStats.items.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-[#CBD5E1]">
                                No dividend paying stocks found in your portfolio. (หรือระบบยังดึง Metadata ไม่เสร็จ)
                              </td>
                            </tr>
                          ) : (
                            dividendStats.items.map((item) => (
                              <tr key={item.symbol} className="hover:bg-white/[0.02]">
                                <td className="py-3 px-4 font-extrabold text-white">
                                  {item.symbol}
                                </td>
                                <td className="py-3 px-4 text-right text-white font-medium">{item.quantity}</td>
                                <td className="py-3 px-4 text-right text-emerald-400 font-bold">{(item.divYield * 100).toFixed(2)}%</td>
                                <td className="py-3 px-4 text-right text-amber-400 font-bold">{item.yoc.toFixed(2)}%</td>
                                <td className="py-3 px-4 text-right text-white font-bold">{formatMoney(item.holdingIncome)}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-3 py-1 rounded-full text-xs">
                                    +{item.dripShares.toFixed(2)} shares
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
