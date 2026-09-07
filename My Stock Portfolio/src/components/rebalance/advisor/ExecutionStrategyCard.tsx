import React, { useState } from 'react';

export interface StrategyOption {
  id: string;
  name: string;
  type: 'CONSERVATIVE' | 'TREND_FOLLOWING' | 'AGGRESSIVE';
  description: string;
  exitPrice?: string;
  stopLoss?: string;
}

export interface ExecutionStrategiesData {
  recommendedIndex: number;
  justification: string;
  options: StrategyOption[];
}

export interface FundingSource {
  type: 'ROTATION' | 'CASH_BUFFER' | 'FRESH_CAPITAL';
  label: string;
  fromSymbol?: string | null;
  amount?: number | null;
}

export interface SuggestionItem {
  action: 'ADD' | 'REDUCE' | 'SWAP' | 'REMOVE' | 'CUT';
  symbol: string;
  percent: number;
  category?: string;
  reason: string;
  fundingSource?: FundingSource;
  executionStrategies?: ExecutionStrategiesData;
}

interface ExecutionStrategyCardProps {
  suggestion: SuggestionItem;
  onApplySuggestion?: (s: SuggestionItem) => void;
  actualHolding?: {
    actualPercent?: number;
    pnlPercent?: number;
    avgCost?: number;
    currentPrice?: number;
    marketValue?: number;
    quantity?: number;
    isOrphan?: boolean;
  } | null;
  fundamentals?: {
    current_price?: number;
    target_mean_price?: number;
    target_high_price?: number;
    target_low_price?: number;
  } | null;
}

export const ExecutionStrategyCard: React.FC<ExecutionStrategyCardProps> = ({
  suggestion,
  onApplySuggestion,
  actualHolding,
  fundamentals,
}) => {
  const hasStrategies = Boolean(
    suggestion.executionStrategies?.options &&
    suggestion.executionStrategies.options.length > 0
  );

  const recommendedIdx = suggestion.executionStrategies?.recommendedIndex ?? 0;
  const initialIndex = Math.min(
    Math.max(recommendedIdx, 0),
    (suggestion.executionStrategies?.options?.length || 1) - 1
  );

  const [selectedIdx, setSelectedIdx] = useState<number>(initialIndex);
  const [copied, setCopied] = useState<boolean>(false);
  const [showTechAccordion, setShowTechAccordion] = useState<boolean>(false);

  const curPrice = actualHolding?.currentPrice || fundamentals?.current_price || 0;
  const avgCost = actualHolding?.avgCost || 0;
  const hasPosition = Boolean(actualHolding && ((actualHolding.quantity || 0) > 0 || avgCost > 0));

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ADD':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.25)]';
      case 'REDUCE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.25)]';
      case 'SWAP':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-[0_0_8px_rgba(56,189,248,0.25)]';
      case 'REMOVE':
      case 'CUT':
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]';
    }
  };

  const getFundingBadge = (funding?: FundingSource) => {
    if (!funding) {
      if (suggestion.action === 'REDUCE' || suggestion.action === 'CUT' || suggestion.action === 'REMOVE') {
        return {
          icon: '💰',
          label: 'ดึงเงินสดออกเพื่อเพิ่มสภาพคล่อง',
          pill: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      }
      return {
        icon: '💵',
        label: 'จัดสรรจากเงินสด / ทยอยสะสม DCA',
        pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    }

    switch (funding.type) {
      case 'ROTATION':
        return {
          icon: '🔄',
          label: funding.label || 'โยกเงินทุนจากการตัดขาย',
          pill: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.25)]',
        };
      case 'CASH_BUFFER':
        return {
          icon: '💵',
          label: funding.label || 'ใช้เงินสดสำรองในพอร์ต',
          pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.25)]',
        };
      case 'FRESH_CAPITAL':
      default:
        return {
          icon: '📥',
          label: funding.label || 'ทยอยสะสมด้วยเงินเติมใหม่ (DCA)',
          pill: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.25)]',
        };
    }
  };

  const getTypeTheme = (type: string) => {
    switch (type) {
      case 'CONSERVATIVE':
        return {
          label: '🛡️ Conservative (แบ่ง 2 ไม้ลดเสี่ยง)',
          pill: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          border: 'border-blue-500/40',
          bg: 'bg-blue-950/20',
          tranche1Title: 'ไม้ที่ 1: 50%',
          tranche1Desc: curPrice > 0 ? `เคาะเข้าทันที ณ โซนรอซื้อ ~$${curPrice.toFixed(2)}` : 'เคาะเข้าทันที 50% ณ โซนรอซื้อ',
          tranche2Title: 'ไม้ที่ 2: 50%',
          tranche2Desc: 'รอช้อนเมื่อย่อตัวแตะแนวรับสำคัญ หรือยืนยันโมเมนตัม',
        };
      case 'TREND_FOLLOWING':
        return {
          label: '📈 Trend Following (ปล่อยกำไรวิ่ง + Trailing)',
          pill: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          border: 'border-purple-500/40',
          bg: 'bg-purple-950/20',
          tranche1Title: 'ไม้ที่ 1: 30%',
          tranche1Desc: 'ล็อคกำไรส่วนแรกที่ราคาตลาด ป้องกันความผันผวน',
          tranche2Title: 'ไม้ที่ 2: 70%',
          tranche2Desc: 'ตั้ง Trailing Stop ปล่อยให้กำไรวิ่งต่อโดยไม่ขายหมู',
        };
      case 'AGGRESSIVE':
      default:
        return {
          label: '⚡ Aggressive (เคาะไม้เดียวจบ)',
          pill: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          border: 'border-amber-500/40',
          bg: 'bg-amber-950/20',
          tranche1Title: 'คำสั่งเดียว: 100%',
          tranche1Desc: 'เคาะรวดเดียวเต็มสัดส่วนตามแนวรับเป้าหมาย',
          tranche2Title: null,
          tranche2Desc: null,
        };
    }
  };

  const handleCopySlip = (option?: StrategyOption) => {
    const isRecommended = selectedIdx === recommendedIdx;
    const fundingBadge = getFundingBadge(suggestion.fundingSource);
    const opt = option || suggestion.executionStrategies?.options?.[selectedIdx];

    const slipLines = [
      `📊 คำสั่งเทรด: ${suggestion.symbol} (${suggestion.action} ${suggestion.percent}%)`,
      hasPosition
        ? `🏷️ ต้นทุนผู้ใช้: $${avgCost.toFixed(2)} | ราคาตลาด: $${curPrice.toFixed(2)} (P/L: ${actualHolding?.pnlPercent ? (actualHolding.pnlPercent > 0 ? `+${actualHolding.pnlPercent.toFixed(1)}%` : `${actualHolding.pnlPercent.toFixed(1)}%`) : '0%'})`
        : `🆕 หุ้นใหม่: ยังไม่มีในพอร์ต | ราคาตลาด: $${curPrice.toFixed(2)}`,
      `💰 แหล่งเงินทุน: ${fundingBadge.label}`,
      opt ? `⚙️ กลยุทธ์: ${opt.name}${isRecommended ? ' (👑 AI Recommended)' : ''}` : null,
      opt?.exitPrice ? `🟢 โซนราคาเป้าหมาย / รอซื้อ: ${opt.exitPrice}` : null,
      opt?.stopLoss ? `🔴 จุดตัดขาดทุน / ป้องกันทุน: ${opt.stopLoss}` : null,
      fundamentals?.target_mean_price ? `🎯 เป้าหมายสถาบัน (Consensus): $${fundamentals.target_mean_price.toFixed(2)}` : null,
      `📝 เหตุผล: ${suggestion.reason}`,
      `---`,
      `สร้างโดย AI Portfolio Advisor (จอมมารแห่ง Wall Street)`
    ].filter(Boolean);

    navigator.clipboard.writeText(slipLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Fallback for simple card without executionStrategies
  if (!hasStrategies || !suggestion.executionStrategies) {
    const fundingBadge = getFundingBadge(suggestion.fundingSource);
    return (
      <div className="border border-[#232738] bg-[#12141F] rounded-2xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getActionBadge(suggestion.action)}`}>
                {suggestion.action}
              </span>
              <span className="font-bold text-white text-[15px]">
                {suggestion.symbol} {suggestion.percent}%
              </span>
            </div>
            <div className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${fundingBadge.pill}`}>
              <span>{fundingBadge.icon}</span>
              <span className="truncate max-w-[200px]">{fundingBadge.label}</span>
            </div>
          </div>

          {/* Context box */}
          <div className="bg-[#181B2A] border border-[#2A2E45] rounded-xl p-3 mb-3 text-[13px]">
            {hasPosition ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400 mr-1">ต้นทุน:</span>
                  <span className="font-bold text-white">${avgCost.toFixed(2)}</span>
                  <span className="text-slate-400 ml-2">({actualHolding?.quantity?.toFixed(1) || 0} หุ้น)</span>
                </div>
                <div>
                  <span className="text-slate-400 mr-1">ราคาปัจจุบัน:</span>
                  <span className="font-bold text-white">${curPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    (actualHolding?.pnlPercent || 0) >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                  }`}>
                    {(actualHolding?.pnlPercent || 0) >= 0 ? `+${actualHolding?.pnlPercent?.toFixed(1)}%` : `${actualHolding?.pnlPercent?.toFixed(1)}%`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-slate-300">
                <span>🆕 ยังไม่มีหุ้นตัวนี้ในพอร์ต</span>
                <span>ราคาตลาดปัจจุบัน: <strong className="text-white">${curPrice.toFixed(2)}</strong></span>
              </div>
            )}
          </div>

          <p className="text-[13px] text-slate-200 mb-4 leading-relaxed font-normal">
            {suggestion.reason}
          </p>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => handleCopySlip()}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[13px] font-semibold transition-colors border border-slate-700 cursor-pointer"
          >
            {copied ? '✅ คัดลอกแล้ว!' : '📋 คัดลอกคำสั่ง'}
          </button>
          <button
            type="button"
            onClick={() => onApplySuggestion && onApplySuggestion(suggestion)}
            className="flex-1 py-2 bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 rounded-lg text-[13px] font-bold transition-colors border border-emerald-500/40 cursor-pointer"
          >
            ปรับใช้พิมพ์เขียว
          </button>
        </div>
      </div>
    );
  }

  const options = suggestion.executionStrategies.options;
  const currentOption = options[selectedIdx] || options[0];
  const optionTheme = getTypeTheme(currentOption.type);
  const fundingBadge = getFundingBadge(suggestion.fundingSource);

  return (
    <div className="border border-[#232738] bg-[#12141F] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-600/80 transition-all shadow-md">
      <div>
        {/* ========================================================= */}
        {/* 1. Header: Action + Symbol + Funding Source Badge         */}
        {/* ========================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-md border ${getActionBadge(suggestion.action)}`}>
              {suggestion.action}
            </span>
            <span className="font-bold text-white text-base tracking-wide">
              {suggestion.symbol} {suggestion.percent}%
            </span>
          </div>

          {/* Funding Source Badge */}
          <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${fundingBadge.pill}`}>
            <span>{fundingBadge.icon}</span>
            <span className="font-medium">{fundingBadge.label}</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. Context Box: Human-First "ต้นทุน vs ราคาปัจจุบัน"        */}
        {/* ========================================================= */}
        <div className="bg-[#181B2A] border border-[#2A2E45] rounded-xl p-3 mb-3 text-[13px]">
          {hasPosition ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center sm:text-left">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-300 block text-[13px]">🏷️ ต้นทุนของคุณ</span>
                <span className="text-sm font-bold text-white">${avgCost.toFixed(2)}</span>
                <span className="text-[13px] text-slate-300 block truncate">({actualHolding?.quantity?.toFixed(1) || 0} หุ้น)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-300 block text-[13px]">💵 ราคาตลาดปัจจุบัน</span>
                <span className="text-sm font-bold text-cyan-300">${curPrice.toFixed(2)}</span>
                <span className="text-[13px] text-slate-300 block">มูลค่า ~${Math.round(actualHolding?.marketValue || 0).toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-300 block text-[13px]">📊 กำไร/ขาดทุนสะสม</span>
                <span className={`text-sm font-bold block ${
                  (actualHolding?.pnlPercent || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}>
                  {(actualHolding?.pnlPercent || 0) >= 0 ? `+${actualHolding?.pnlPercent?.toFixed(1)}%` : `${actualHolding?.pnlPercent?.toFixed(1)}%`}
                </span>
                <span className="text-[13px] text-slate-300 block">สัดส่วนพอร์ต {actualHolding?.actualPercent?.toFixed(1) || 0}%</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-300 block text-[13px]">🎯 เป้าหมายพิมพ์เขียว</span>
                <span className="text-sm font-bold text-amber-300">{suggestion.percent}%</span>
                <span className="text-[13px] text-slate-300 block">
                  {actualHolding?.isOrphan ? 'เนื้อร้ายนอกแผน' : 'สัดส่วนเป้าหมาย'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-base">🆕</span>
                <div>
                  <span className="font-bold text-white block">สินทรัพย์ใหม่ที่ยังไม่มีในพอร์ต</span>
                  <span className="text-[13px] text-slate-300">วางแผนซื้อเพื่อสะสมตามพิมพ์เขียวเป้าหมาย {suggestion.percent}%</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[13px] text-slate-300 block">ราคาตลาดปัจจุบัน</span>
                <span className="text-sm font-bold text-emerald-300">${curPrice.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 3. Reason & AI Recommendation Justification               */}
        {/* ========================================================= */}
        <p className="text-[13px] text-slate-200 mb-3 leading-relaxed font-normal bg-slate-900/40 p-3 rounded-xl border border-slate-800/70">
          {suggestion.reason}
        </p>

        {suggestion.executionStrategies.justification && (
          <div className="mb-3 p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-2.5">
            <span className="text-base leading-tight shrink-0">👑</span>
            <div className="text-[13px] text-slate-200 leading-snug">
              <span className="font-bold text-purple-300 mr-1.5">AI ฟันธงกลยุทธ์ที่ดีที่สุด:</span>
              <span>{suggestion.executionStrategies.justification}</span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. Strategy Selector Tabs (3 Execution Options)           */}
        {/* ========================================================= */}
        <div className="mb-3">
          <div className="text-[13px] font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span>เลือกแนวทางกลยุทธ์ปฏิบัติการ (3 Options):</span>
            <span className="text-xs text-purple-300 font-bold">
              ⭐ แนะนำ: Option #{recommendedIdx + 1}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {options.map((opt, idx) => {
              const isSelected = idx === selectedIdx;
              const isRecommended = idx === recommendedIdx;
              return (
                <button
                  key={opt.id || idx}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={`px-2.5 py-2 rounded-xl text-left transition-all border relative cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.3)] text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-2 -right-1 bg-gradient-to-r from-amber-500 to-purple-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow">
                      👑 BEST
                    </span>
                  )}
                  <div className="text-[13px] font-bold truncate">{opt.name}</div>
                  <div className="text-xs text-slate-300 truncate mt-0.5">
                    {opt.type === 'CONSERVATIVE' ? '🛡️ แบ่ง 2 ไม้' : opt.type === 'TREND_FOLLOWING' ? '📈 Trailing' : '⚡ ไม้เดียว'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. Human-First Plain Action Grid & Tranche Step Boxes      */}
        {/* ========================================================= */}
        <div className={`rounded-xl p-3.5 border mb-3 ${optionTheme.bg} ${optionTheme.border}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${optionTheme.pill}`}>
              {optionTheme.label}
            </span>
            <span className="text-xs text-slate-300 font-medium">
              สไตล์: {currentOption.type}
            </span>
          </div>

          <p className="text-[13px] text-slate-200 leading-relaxed mb-3">
            {currentOption.description}
          </p>

          {/* Plain Action 4-Grid: Entry / Support / Stop Loss / Consensus Target */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {/* Box 1: Buy Target / Exit Price */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 block mb-0.5">
                {suggestion.action === 'REDUCE' || suggestion.action === 'CUT' ? '🟠 ราคาขาย / ลดสัดส่วน:' : '🟢 โซนราคาเข้าซื้อ (Buy Zone):'}
              </span>
              <span className="text-sm font-bold text-emerald-300 block">
                {currentOption.exitPrice || (curPrice > 0 ? `$${curPrice.toFixed(2)}` : 'ราคาตลาด')}
              </span>
              <span className="text-xs text-slate-400">
                {suggestion.action === 'REDUCE' || suggestion.action === 'CUT' ? 'ตั้งขายตามระดับราคานี้' : 'กรอบราคาเข้าซื้อที่ได้เปรียบ'}
              </span>
            </div>

            {/* Box 2: Protective Stop Loss */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 block mb-0.5">🔴 จุดตัดขาดทุน / ป้องกันทุน (Stop Loss):</span>
              <span className="text-sm font-bold text-rose-300 block">
                {currentOption.stopLoss || 'ไม่มี / ใช้ Trailing Stop'}
              </span>
              <span className="text-xs text-slate-400">ถอยทันทีเมื่อหลุดระดับนี้เพื่อหยุดเลือด</span>
            </div>

            {/* Box 3: Key Support Dip */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 block mb-0.5">🔵 แนวรับสำคัญ (Support Dip):</span>
              <span className="text-sm font-bold text-cyan-300 block">
                {fundamentals?.target_low_price ? `$${fundamentals.target_low_price.toFixed(2)}` : curPrice > 0 ? `~$${(curPrice * 0.95).toFixed(2)} (ย่อ 5%)` : 'แนวรับเทคนิคอล'}
              </span>
              <span className="text-xs text-slate-400">จุดรอช้อนไม้ถัดไปหากตลาดย่อตัว</span>
            </div>

            {/* Box 4: Institutional Consensus Target */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 block mb-0.5">🎯 เป้าหมายสถาบัน (Consensus Target):</span>
              <span className="text-sm font-bold text-amber-300 block">
                {fundamentals?.target_mean_price ? `$${fundamentals.target_mean_price.toFixed(2)}` : 'ตามการประเมินพื้นฐาน'}
              </span>
              <span className="text-xs text-slate-400">
                {fundamentals?.target_mean_price && curPrice > 0
                  ? `Upside ~${(((fundamentals.target_mean_price - curPrice) / curPrice) * 100).toFixed(1)}% ในกรอบ 6-12 เดือน`
                  : 'เป้าหมายราคาเฉลี่ยจาก Wall Street'}
              </span>
            </div>
          </div>

          {/* Tranche Steps Visualizer Boxes */}
          <div className="pt-2 border-t border-slate-700/50">
            <span className="text-xs font-bold text-slate-300 block mb-1.5">🪜 ขั้นตอนการเข้าซื้อ/ขายแบบเป็นระบบ (Tranche Execution Steps):</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-blue-500/30">
                <span className="text-xs font-bold text-blue-300 block">{optionTheme.tranche1Title}</span>
                <span className="text-[13px] text-slate-200 mt-0.5 block">{optionTheme.tranche1Desc}</span>
              </div>
              {optionTheme.tranche2Title && (
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-cyan-500/30">
                  <span className="text-xs font-bold text-cyan-300 block">{optionTheme.tranche2Title}</span>
                  <span className="text-[13px] text-slate-200 mt-0.5 block">{optionTheme.tranche2Desc}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 6. Technical Details Accordion (Collapsible)               */}
        {/* ========================================================= */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowTechAccordion(!showTechAccordion)}
            className="w-full py-1.5 px-3 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <span>📊</span>
              <span>ข้อมูลเชิงเทคนิคอลประกอบ (Technical Indicators)</span>
            </span>
            <span>{showTechAccordion ? '▲ ยุบเก็บ' : '▼ ขยายดู'}</span>
          </button>

          {showTechAccordion && (
            <div className="mt-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/90 text-[13px] text-slate-200 space-y-2 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-300 block text-xs">Trailing Stop แนะนำ</span>
                  <span className="font-bold text-purple-300 text-[13px]">{currentOption.stopLoss || '2×ATR Level'}</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-300 block text-xs">เป้าหมายราคาสูงสุด</span>
                  <span className="font-bold text-emerald-300 text-[13px]">
                    {fundamentals?.target_high_price ? `$${fundamentals.target_high_price.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-300 block text-xs">เป้าหมายราคาต่ำสุด</span>
                  <span className="font-bold text-rose-300 text-[13px]">
                    {fundamentals?.target_low_price ? `$${fundamentals.target_low_price.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
              </div>
              <p className="text-[13px] text-slate-300 leading-relaxed pt-1 border-t border-slate-800/60">
                💡 <strong>คำแนะนำเชิงเทคนิค:</strong> เข้าออเดอร์ตามขั้นตอนแบบแบ่งไม้เสมอเพื่อลดค่าความผันผวน (Drawdown Risk) และหลีกเลี่ยงการไล่ราคาเมื่อหุ้นหลุดออกจากแนวรับแรก
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 7. Action Footer Buttons                                   */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-800">
        <button
          type="button"
          onClick={() => handleCopySlip(currentOption)}
          className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[13px] font-semibold transition-colors border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
          title="คัดลอกข้อความสรุปคำสั่งเทรดพร้อมต้นทุนและแหล่งเงินทุน"
        >
          <span>{copied ? '✅' : '📋'}</span>
          <span>{copied ? 'คัดลอกคำสั่งแล้ว!' : 'คัดลอกคำสั่ง (Copy Slip)'}</span>
        </button>

        <button
          type="button"
          onClick={() => onApplySuggestion && onApplySuggestion(suggestion)}
          className="flex-1 py-2 px-3 bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 rounded-lg text-[13px] font-bold transition-colors border border-emerald-500/40 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>⚡</span>
          <span>นำไปปรับใช้ในพิมพ์เขียว</span>
        </button>
      </div>
    </div>
  );
};
