import React, { useState, useMemo, useEffect } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useHoldings } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';
import { usePriceStore } from '../../stores/priceStore';
import { useBlueprintStore } from '../../stores/blueprintStore';
import { BlueprintEditor } from './BlueprintEditor';
import { api } from '../../services/api';
import { 
  Scale, SlidersHorizontal, DollarSign, ArrowRight, Check, Copy, Sparkles, 
  TrendingUp, Scissors, CheckCircle2, AlertCircle, CheckSquare, Square, 
  RefreshCw, Wallet, Filter, AlertTriangle 
} from 'lucide-react';
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

  // Selective Buy & Option C Remainder Strategy States
  const [remainderMode, setRemainderMode] = useState<'redistribute' | 'reserve'>('redistribute');
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string> | null>(null);
  const [technicals, setTechnicals] = useState<Record<string, any>>({});
  const [techLoading, setTechLoading] = useState<boolean>(false);

  // Sync data on load
  useEffect(() => {
    if (activePortfolioId) {
      fetchTransactions(activePortfolioId);
      fetchBlueprints(activePortfolioId);
    }
    fetchExchangeRate('USD', 'THB');
  }, [activePortfolioId, fetchTransactions, fetchExchangeRate, fetchBlueprints]);



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

  // Fetch technical indicators (EMA150, SMA200, SMA50) for Blueprint valuation signals
  useEffect(() => {
    if (blueprints.length === 0) return;
    const symbols = blueprints.map(b => b.symbol).filter(s => s && s !== 'CASH');
    if (symbols.length === 0) return;

    setTechLoading(true);
    Promise.allSettled(symbols.map(s => api.prices.technicals(s)))
      .then(results => {
        const map: Record<string, any> = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value) {
            map[symbols[i]] = r.value;
          }
        });
        setTechnicals(prev => ({ ...prev, ...map }));
      })
      .catch(err => console.warn('Failed to fetch technicals for rebalance:', err))
      .finally(() => setTechLoading(false));
  }, [blueprints]);

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

  // Price Gate Valuation Signal Helper (Target Price vs Technical Levels)
  const getBuySignal = useMemo(() => {
    return (symbol: string, currentPrice: number, targetPrice?: number | null) => {
      const tech = technicals[symbol];

      // Priority 1: Target Price from Blueprint
      if (targetPrice && targetPrice > 0) {
        if (currentPrice <= targetPrice) {
          const pctBelow = ((targetPrice - currentPrice) / targetPrice * 100).toFixed(1);
          return {
            signal: 'strong_buy' as const,
            label: 'STRONG BUY',
            icon: '🟢',
            detail: `ต่ำกว่าเป้า -${pctBelow}%`,
            subtext: `เป้า ${formatMoney(targetPrice, 2)}`,
            badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          };
        }
        if (currentPrice <= targetPrice * 1.10) {
          const pctAbove = ((currentPrice - targetPrice) / targetPrice * 100).toFixed(1);
          return {
            signal: 'fair' as const,
            label: 'FAIR',
            icon: '🟡',
            detail: `ใกล้เป้า (+${pctAbove}%)`,
            subtext: `เป้า ${formatMoney(targetPrice, 2)}`,
            badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          };
        }
        const pctAbove = ((currentPrice - targetPrice) / targetPrice * 100).toFixed(1);
        return {
          signal: 'expensive' as const,
          label: 'EXPENSIVE',
          icon: '🔴',
          detail: `สูงกว่าเป้า +${pctAbove}%`,
          subtext: `เป้า ${formatMoney(targetPrice, 2)}`,
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        };
      }

      // Priority 2: Technical Levels (EMA150 -> SMA200 -> SMA50)
      if (tech) {
        const anchor = tech.ema150 || tech.sma200 || tech.sma50;
        const anchorName = tech.ema150 ? 'EMA150' : (tech.sma200 ? 'SMA200' : 'SMA50');
        if (anchor && currentPrice <= anchor) {
          const pctBelow = ((anchor - currentPrice) / anchor * 100).toFixed(1);
          return {
            signal: 'strong_buy' as const,
            label: 'STRONG BUY',
            icon: '🟢',
            detail: `ต่ำกว่าแนวรับ ${anchorName} -${pctBelow}%`,
            subtext: `แนวรับ ${formatMoney(anchor, 2)}`,
            badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          };
        }
        if (anchor && currentPrice <= anchor * 1.10) {
          const pctAbove = ((currentPrice - anchor) / anchor * 100).toFixed(1);
          return {
            signal: 'fair' as const,
            label: 'FAIR',
            icon: '🟡',
            detail: `ใกล้แนวรับ ${anchorName} (+${pctAbove}%)`,
            subtext: `แนวรับ ${formatMoney(anchor, 2)}`,
            badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          };
        }
        if (anchor) {
          const pctAbove = ((currentPrice - anchor) / anchor * 100).toFixed(1);
          return {
            signal: 'expensive' as const,
            label: 'EXPENSIVE',
            icon: '🔴',
            detail: `สูงกว่าแนวรับ ${anchorName} +${pctAbove}%`,
            subtext: `แนวรับ ${formatMoney(anchor, 2)}`,
            badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          };
        }
      }

      // Fallback: No target price or technicals -> FAIR
      return {
        signal: 'fair' as const,
        label: 'FAIR',
        icon: '🟡',
        detail: 'ไม่มีราคาเป้าหมาย',
        subtext: 'จัดสรรตามสัดส่วน Blueprint',
        badgeClass: 'bg-slate-500/20 text-slate-200 border-slate-500/40'
      };
    };
  }, [technicals, currency, effectiveRate]);

  // Candidates in Blueprint with Deficit & Price Signals
  const cashflowCandidates = useMemo(() => {
    if (depositAmountUsd <= 0 || blueprints.length === 0) return [];
    const newTotalVal = totalNetWorth + depositAmountUsd;

    return combinedPortfolio
      .map(item => {
        const bp = blueprints.find(b => b.symbol === item.symbol);
        if (!bp) return null;
        const tgtPct = bp.target_percent;
        const targetVal = (tgtPct / 100) * newTotalVal;
        const currentVal = item.currentVal;
        const deficit = Math.max(0, targetVal - currentVal);
        const signalInfo = getBuySignal(item.symbol, item.price, bp.target_price);

        return {
          ...item,
          targetWeight: tgtPct,
          targetVal,
          deficit,
          targetPrice: bp.target_price,
          signalInfo,
          status: bp.status || (item.isWatchlist ? 'WATCHLIST' : 'OWNED'),
          currentWeight: totalNetWorth > 0 ? (item.currentVal / totalNetWorth) * 100 : 0
        };
      })
      .filter(Boolean) as any[];
  }, [combinedPortfolio, depositAmountUsd, totalNetWorth, blueprints, getBuySignal]);

  // Active selected symbols (Auto-select non-expensive by default, user can toggle freely)
  const activeSelectedSymbols = useMemo(() => {
    if (selectedSymbols !== null) {
      return selectedSymbols;
    }
    const nonExpensive = cashflowCandidates
      .filter(c => c.deficit > 0 && c.signalInfo.signal !== 'expensive')
      .map(c => c.symbol);
    if (nonExpensive.length > 0) {
      return new Set(nonExpensive);
    }
    return new Set(cashflowCandidates.filter(c => c.deficit > 0).map(c => c.symbol));
  }, [selectedSymbols, cashflowCandidates]);

  const toggleSymbol = (sym: string) => {
    const next = new Set(activeSelectedSymbols);
    if (next.has(sym)) {
      next.delete(sym);
    } else {
      next.add(sym);
    }
    setSelectedSymbols(next);
  };

  const selectAll = () => {
    setSelectedSymbols(new Set(cashflowCandidates.map(c => c.symbol)));
  };

  const selectBuySignalsOnly = () => {
    const buySignals = cashflowCandidates
      .filter(c => c.signalInfo.signal === 'strong_buy')
      .map(c => c.symbol);
    setSelectedSymbols(new Set(buySignals));
  };

  const selectFairAndStrong = () => {
    const good = cashflowCandidates
      .filter(c => c.signalInfo.signal !== 'expensive')
      .map(c => c.symbol);
    setSelectedSymbols(new Set(good));
  };

  const clearAllSelections = () => {
    setSelectedSymbols(new Set());
  };

  const signalCounts = useMemo(() => {
    let strongBuy = 0;
    let fair = 0;
    let expensive = 0;
    cashflowCandidates.forEach(c => {
      if (c.signalInfo.signal === 'strong_buy') strongBuy++;
      else if (c.signalInfo.signal === 'expensive') expensive++;
      else fair++;
    });
    return { strongBuy, fair, expensive };
  }, [cashflowCandidates]);

  // MODE 1: Smart Selective Buy Plan Calculation (Option C: Redistribute vs Reserve)
  const cashflowPlan = useMemo(() => {
    if (depositAmountUsd <= 0 || cashflowCandidates.length === 0) {
      return { items: [], totalAllocatedUsd: 0, cashReserveUsd: 0 };
    }

    const newTotalVal = totalNetWorth + depositAmountUsd;
    const totalBaseDeficit = cashflowCandidates.reduce((s, c) => s + c.deficit, 0);

    const selectedCandidates = cashflowCandidates.filter(c => activeSelectedSymbols.has(c.symbol));
    const items: any[] = [];
    let totalAllocatedUsd = 0;

    if (remainderMode === 'redistribute') {
      const selectedDeficit = selectedCandidates.reduce((s, c) => s + c.deficit, 0);
      const selectedWeight = selectedCandidates.reduce((s, c) => s + c.targetWeight, 0);

      cashflowCandidates.forEach(c => {
        const isSelected = activeSelectedSymbols.has(c.symbol);
        let allocatedUsd = 0;

        if (isSelected && selectedCandidates.length > 0) {
          if (selectedDeficit > 0) {
            allocatedUsd = (c.deficit / selectedDeficit) * depositAmountUsd;
          } else if (selectedWeight > 0) {
            allocatedUsd = (c.targetWeight / selectedWeight) * depositAmountUsd;
          } else {
            allocatedUsd = depositAmountUsd / selectedCandidates.length;
          }
        }

        const buyShares = c.price > 0 && allocatedUsd > 0 ? Number((allocatedUsd / c.price).toFixed(2)) : 0;
        const newVal = c.currentVal + allocatedUsd;
        const projectedWeight = newTotalVal > 0 ? (newVal / newTotalVal) * 100 : 0;

        items.push({
          ...c,
          isSelected,
          allocatedUsd,
          buyShares,
          projectedWeight
        });

        if (isSelected) {
          totalAllocatedUsd += allocatedUsd;
        }
      });
    } else {
      // 'reserve' mode: Allocate only baseline deficit share, remainder stays as Cash Reserve
      cashflowCandidates.forEach(c => {
        const isSelected = activeSelectedSymbols.has(c.symbol);
        let allocatedUsd = 0;

        if (isSelected) {
          if (totalBaseDeficit > 0) {
            allocatedUsd = (c.deficit / totalBaseDeficit) * depositAmountUsd;
          } else {
            allocatedUsd = (c.targetWeight / 100) * depositAmountUsd;
          }
        }

        const buyShares = c.price > 0 && allocatedUsd > 0 ? Number((allocatedUsd / c.price).toFixed(2)) : 0;
        const newVal = c.currentVal + allocatedUsd;
        const projectedWeight = newTotalVal > 0 ? (newVal / newTotalVal) * 100 : 0;

        items.push({
          ...c,
          isSelected,
          allocatedUsd,
          buyShares,
          projectedWeight
        });

        if (isSelected) {
          totalAllocatedUsd += allocatedUsd;
        }
      });
    }

    items.sort((a, b) => {
      if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
      return b.allocatedUsd - a.allocatedUsd || b.deficit - a.deficit;
    });

    const cashReserveUsd = Math.max(0, depositAmountUsd - totalAllocatedUsd);

    return {
      items,
      totalAllocatedUsd,
      cashReserveUsd
    };
  }, [cashflowCandidates, activeSelectedSymbols, remainderMode, depositAmountUsd, totalNetWorth]);

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
    const selectedBuys = cashflowPlan.items.filter(r => r.isSelected && r.allocatedUsd >= 5);
    if (selectedBuys.length === 0) return;

    const text = selectedBuys
      .map(r => `• BUY ${r.symbol}: +${r.buyShares} shares (~${formatMoney(r.allocatedUsd)}) [${r.signalInfo.label}]`)
      .join('\n');

    let header = `📋 Blueprint Cash-Flow Plan (Deposit: ${formatMoney(depositAmountUsd)}):\n` + text;
    if (remainderMode === 'reserve' && cashflowPlan.cashReserveUsd >= 1) {
      header += `\n• 💰 Cash Reserve (เงินสดคงเหลือ): ${formatMoney(cashflowPlan.cashReserveUsd)}`;
    }
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

              {/* MODE 1: CASHFLOW — SMART SELECTIVE BUY */}
              {mode === 'cashflow' && (
                <div className="space-y-6">
                  {/* 1. Cash Injection Box */}
                  <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider block font-heading">
                        จำนวนเงินที่จะเติมเข้าพอร์ต (New Cash Injection)
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-[#9898C8] mr-1">เติมด่วน:</span>
                        {[500, 1000, 2000, 5000].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setDepositAmountUsd(prev => (prev || 0) + amt)}
                            className="px-2.5 py-1 bg-[#1A1D2D] hover:bg-[#2A2E45] border border-[#2A2E45] text-white text-xs font-bold rounded-lg transition-all"
                          >
                            +{formatMoney(amt, 0)}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDepositAmountUsd(1000)}
                          className="px-2.5 py-1 bg-[#1A1D2D] hover:bg-rose-500/20 text-[#CBD5E1] hover:text-rose-400 border border-[#2A2E45] text-xs font-bold rounded-lg transition-all"
                        >
                          รีเซ็ต ($1,000)
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-[#CBD5E1] block">{currency === 'THB' ? 'เทียบเท่าดอลลาร์' : 'เทียบเท่าเงินบาท'}</span>
                        <span className="text-base font-bold text-emerald-400">
                          {currency === 'THB' ? `~$${depositAmountUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `~฿${(depositAmountUsd * effectiveRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Strategy Controls & Option C Remainder Strategy */}
                  <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg space-y-5">
                    {/* Option C Toggle */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#161926] border border-[#2A2E45]">
                      <div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider block font-heading">
                          ⚙️ การจัดสรรงบส่วนที่เหลือ (Option C Remainder Strategy)
                        </span>
                        <p className="text-xs text-[#CBD5E1] mt-0.5">
                          เมื่อเลือกซื้อเพียงบางตัว งบจากตัวที่ไม่ได้เลือกจะถูกจัดสรรอย่างไร
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#111418] p-1.5 rounded-xl border border-[#2A2E45] self-start lg:self-auto">
                        <button
                          type="button"
                          onClick={() => setRemainderMode('redistribute')}
                          className={clsx(
                            "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                            remainderMode === 'redistribute'
                              ? "bg-gradient-to-r from-[#823AFD] to-[#06B6D4] text-white shadow-md shadow-[#823AFD]/20"
                              : "text-[#CBD5E1] hover:text-white"
                          )}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          เกลี่ยให้ตัวที่เลือก (Redistribute)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemainderMode('reserve')}
                          className={clsx(
                            "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                            remainderMode === 'reserve'
                              ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-white shadow-md shadow-amber-500/20"
                              : "text-[#CBD5E1] hover:text-white"
                          )}
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          เก็บเป็นเงินสด (Cash Reserve)
                        </button>
                      </div>
                    </div>

                    {/* Quick Selection Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#CBD5E1] flex items-center gap-1.5 mr-1">
                          <Filter className="w-3.5 h-3.5 text-[#06B6D4]" /> เลือกหุ้นรอบนี้:
                        </span>
                        <button
                          type="button"
                          onClick={selectAll}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1A1D2D] hover:bg-[#2A2E45] text-white border border-[#2A2E45] transition-all"
                        >
                          เลือกทั้งหมด ({cashflowCandidates.length})
                        </button>
                        <button
                          type="button"
                          onClick={selectBuySignalsOnly}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1.5"
                        >
                          <span>🟢</span> เฉพาะ Strong Buy ({signalCounts.strongBuy})
                        </button>
                        <button
                          type="button"
                          onClick={selectFairAndStrong}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5"
                        >
                          <span>🟢+🟡</span> ตัวที่ราคาน่าซื้อ ({signalCounts.strongBuy + signalCounts.fair})
                        </button>
                        <button
                          type="button"
                          onClick={clearAllSelections}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1A1D2D] hover:bg-rose-500/20 text-[#CBD5E1] hover:text-rose-400 border border-[#2A2E45] transition-all"
                        >
                          ล้างที่เลือก
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[#CBD5E1]">
                          เลือกแล้ว <strong className="text-white text-sm">{activeSelectedSymbols.size}</strong> จาก {cashflowCandidates.length} ตัว
                        </span>
                      </div>
                    </div>

                    {/* Summary KPI Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#161926] border border-[#2A2E45]">
                      <div className="flex flex-col justify-between">
                        <span className="text-xs font-bold text-[#CBD5E1]">งบที่จะใช้เคาะซื้อ (Deploying)</span>
                        <span className="text-2xl font-black text-white mt-1">
                          {formatMoney(cashflowPlan.totalAllocatedUsd)}
                        </span>
                        <span className="text-xs text-emerald-400 mt-0.5">
                          {activeSelectedSymbols.size > 0 ? `กระจายลง ${activeSelectedSymbols.size} ตัวที่เลือก` : 'ยังไม่ได้เลือกหุ้น'}
                        </span>
                      </div>

                      <div className="flex flex-col justify-between">
                        <span className="text-xs font-bold text-[#CBD5E1]">เงินสดสำรองรอจังหวะ (Cash Reserve)</span>
                        <span className={clsx("text-2xl font-black mt-1", cashflowPlan.cashReserveUsd > 0 ? "text-amber-400" : "text-slate-400")}>
                          {formatMoney(cashflowPlan.cashReserveUsd)}
                        </span>
                        <span className="text-xs text-[#CBD5E1] mt-0.5">
                          {remainderMode === 'reserve' ? 'เก็บเงินสดไว้รอจังหวะราคาลง' : 'โหมดเกลี่ยเงินเต็มจำนวน ($0)'}
                        </span>
                      </div>

                      <div className="flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#CBD5E1]">สัญญาณราคาทั้งพอร์ต</span>
                          {techLoading && (
                            <span className="text-xs text-[#06B6D4] animate-pulse">โหลด technical...</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                            🟢 {signalCounts.strongBuy} Strong Buy
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1">
                            🟡 {signalCounts.fair} Fair
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 flex items-center gap-1">
                            🔴 {signalCounts.expensive} แพง
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Buying Plan Cards Grid */}
                  <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                          คำสั่งเคาะซื้อที่แนะนำตาม Blueprint
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#1A1D2D] text-emerald-400 border border-[#2A2E45]">
                            Smart Selective
                          </span>
                        </h3>
                        <p className="text-xs text-[#CBD5E1] mt-0.5">
                          คลิกการ์ดเพื่อติ๊กเลือก/ไม่เลือกซื้อในรอบนี้ ระบบจะคำนวณงบใหม่ทันที
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={copyBuyingPlan}
                        className="px-4 py-2 bg-[#1A1D2D] hover:bg-[#2A2E45] border border-[#2A2E45] text-white text-xs font-bold rounded-xl flex items-center gap-2 self-start sm:self-auto transition-all"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#823AFD]" />}
                        {copied ? 'คัดลอกเรียบร้อย!' : 'คัดลอกแผนเคาะซื้อ'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
                      {cashflowPlan.items.map((rec) => (
                        <div
                          key={rec.symbol}
                          onClick={() => toggleSymbol(rec.symbol)}
                          className={clsx(
                            "cursor-pointer transition-all duration-200 rounded-2xl p-5 shadow-sm space-y-4 border text-left relative select-none",
                            rec.isSelected
                              ? "bg-[#161926] border-emerald-500/70 shadow-[0_0_24px_rgba(16,185,129,0.14)] hover:border-emerald-400"
                              : "bg-[#121520]/80 border-[#2A2E45]/80 opacity-70 hover:opacity-100 hover:border-slate-500"
                          )}
                        >
                          {/* Top Row: Checkbox, Symbol, Live Price */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              {/* Checkbox */}
                              <div className={clsx(
                                "w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0",
                                rec.isSelected
                                  ? "bg-emerald-500 border-emerald-400 text-black shadow-md shadow-emerald-500/30"
                                  : "bg-[#1A1D2D] border-[#2A2E45] text-transparent hover:border-slate-400"
                              )}>
                                <Check className={clsx("w-4 h-4 stroke-[3]", rec.isSelected ? "text-slate-950" : "opacity-0")} />
                              </div>

                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#823AFD] to-[#FC2D79] flex items-center justify-center font-black text-white text-sm shrink-0">
                                {rec.symbol.slice(0, 3)}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-white text-base tracking-tight">{rec.symbol}</span>
                                  {rec.status === 'WATCHLIST' && (
                                    <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                      WATCHLIST
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-[#CBD5E1] block font-medium">
                                  เป้า Blueprint: <strong className="text-emerald-400">{rec.targetWeight}%</strong>
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-base font-extrabold text-white">{formatMoney(rec.price, 2)}</div>
                              <span className="text-xs text-[#CBD5E1]">ราคาตลาด</span>
                            </div>
                          </div>

                          {/* Price Gate Signal Pill */}
                          <div className={clsx("p-2.5 rounded-xl border flex items-center justify-between text-xs", rec.signalInfo.badgeClass)}>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span>{rec.signalInfo.icon}</span>
                              <span>{rec.signalInfo.label}</span>
                              <span className="text-[#CBD5E1] font-normal mx-0.5">|</span>
                              <span className="text-slate-200 font-semibold">{rec.signalInfo.detail}</span>
                            </div>
                            <div className="text-right text-xs font-medium text-[#CBD5E1]">
                              {rec.signalInfo.subtext}
                            </div>
                          </div>

                          {/* Buy Action Box */}
                          {rec.isSelected ? (
                            <div className="bg-[#1A1D2D] p-3.5 rounded-xl border border-emerald-500/40 flex items-center justify-between">
                              <div>
                                <span className="text-xs uppercase text-emerald-400 font-bold block flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> ซื้อรอบนี้ (Allocated)
                                </span>
                                <div className="text-lg font-black text-white mt-0.5">
                                  BUY +{rec.buyShares} หุ้น
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-[#CBD5E1] block">งบที่ใช้</span>
                                <div className="text-lg font-black text-emerald-400 mt-0.5">
                                  {formatMoney(rec.allocatedUsd)}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-[#161926]/70 p-3.5 rounded-xl border border-[#2A2E45] flex items-center justify-between text-slate-300">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-base">⏸️</span>
                                <div>
                                  <span className="text-xs font-bold text-slate-300 block">ข้ามการซื้อรอบนี้</span>
                                  <span className="text-xs text-[#9898C8]">
                                    {rec.signalInfo.signal === 'expensive' ? 'ราคายังแพง แนะนำรอจังหวะ' : 'คลิกการ์ดนี้เพื่อรวมเข้าแผน'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-[#823AFD] hover:text-white bg-[#1A1D2D] px-2.5 py-1 rounded-lg border border-[#2A2E45]">
                                + เลือกซื้อ
                              </span>
                            </div>
                          )}

                          {/* Weight Progression Bar */}
                          <div className="space-y-1.5 text-xs pt-1">
                            <div className="flex justify-between text-[#CBD5E1]">
                              <span>สัดส่วนในพอร์ต:</span>
                              <span>
                                <strong className="text-white">{(rec.currentWeight ?? 0).toFixed(1)}%</strong>
                                {rec.isSelected && (
                                  <>
                                    {' '}&rarr;{' '}
                                    <strong className="text-emerald-400">{(rec.projectedWeight ?? 0).toFixed(1)}%</strong>
                                  </>
                                )}
                                {' '}<span className="text-[#9898C8]">(เป้า {rec.targetWeight}%)</span>
                              </span>
                            </div>
                            <div className="w-full h-2 bg-[#1A1D2D] rounded-full overflow-hidden flex">
                              <div style={{ width: `${Math.max(0, Math.min(100, rec.currentWeight ?? 0))}%` }} className="bg-[#823AFD] h-full" />
                              {rec.isSelected && (
                                <div style={{ width: `${Math.max(0, Math.min(100, (rec.projectedWeight ?? 0) - (rec.currentWeight ?? 0)))}%` }} className="bg-emerald-400 h-full" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Empty selection warning */}
                      {cashflowPlan.items.filter(r => r.isSelected).length === 0 && (
                        <div className="col-span-full p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
                          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                          <div className="text-base font-bold text-white">ยังไม่ได้เลือกหุ้นที่จะซื้อในรอบนี้</div>
                          <p className="text-sm text-[#CBD5E1] max-w-md mx-auto">
                            มึงปลดติ๊กทั้งหมด งบ {formatMoney(depositAmountUsd)} จึงยังไม่ถูกจัดสรร คลิกเลือกหุ้นที่การ์ด หรือกดปุ่มด้านล่างเพื่อเลือกอัตโนมัติ
                          </p>
                          <div className="flex justify-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={selectFairAndStrong}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs rounded-xl transition-all"
                            >
                              เลือกตัวที่ราคาน่าซื้อ (🟢 + 🟡)
                            </button>
                            <button
                              type="button"
                              onClick={selectAll}
                              className="px-4 py-2 bg-[#1A1D2D] hover:bg-[#2A2E45] text-white font-bold text-xs rounded-xl border border-[#2A2E45] transition-all"
                            >
                              เลือกทั้งหมดตาม Blueprint
                            </button>
                          </div>
                        </div>
                      )}
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
