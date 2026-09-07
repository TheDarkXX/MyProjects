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

export interface SuggestionItem {
  action: 'ADD' | 'REDUCE' | 'SWAP' | 'REMOVE' | 'CUT';
  symbol: string;
  percent: number;
  category?: string;
  reason: string;
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

  const getTypeTheme = (type: string) => {
    switch (type) {
      case 'CONSERVATIVE':
        return {
          label: '🛡️ Conservative (แบ่งไม้ลดเสี่ยง)',
          pill: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          border: 'border-blue-500/40',
          bg: 'bg-blue-950/20',
          trancheA: '50% (ไม้ 1)',
          trancheB: '50% (ไม้ 2)',
          trancheSplit: '50 / 50',
        };
      case 'TREND_FOLLOWING':
        return {
          label: '📈 Trend Following (ปล่อยกำไรวิ่ง)',
          pill: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          border: 'border-purple-500/40',
          bg: 'bg-purple-950/20',
          trancheA: '30% (ตลาด)',
          trancheB: '70% (Trailing Stop)',
          trancheSplit: '30 / 70',
        };
      case 'AGGRESSIVE':
      default:
        return {
          label: '⚡ Aggressive (เคาะไม้เดียวจบ)',
          pill: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          border: 'border-amber-500/40',
          bg: 'bg-amber-950/20',
          trancheA: '100% (คำสั่งเดียว)',
          trancheB: null,
          trancheSplit: '100%',
        };
    }
  };

  const handleCopySlip = (option: StrategyOption) => {
    const isRecommended = selectedIdx === recommendedIdx;
    const curPrice = actualHolding?.currentPrice || fundamentals?.current_price;
    const slipText = [
      `📊 คำสั่งเทรด: ${suggestion.symbol} — ${suggestion.action} ${suggestion.percent}%`,
      `⚙️ กลยุทธ์: ${option.name}${isRecommended ? ' (👑 AI Recommended)' : ''}`,
      `📐 รูปแบบ: ${option.type}`,
      `📝 คำอธิบาย: ${option.description}`,
      option.exitPrice ? `🎯 ราคาเป้าหมาย: ${option.exitPrice}` : null,
      option.stopLoss ? `🛡️ จุดตัดขาดทุน / Trailing: ${option.stopLoss}` : null,
      curPrice ? `💵 ราคาตลาดปัจจุบัน: $${curPrice.toFixed(2)}` : null,
      actualHolding?.avgCost ? `🏷️ ต้นทุนผู้ใช้: $${actualHolding.avgCost.toFixed(2)} (P/L: ${actualHolding.pnlPercent ? (actualHolding.pnlPercent > 0 ? `+${actualHolding.pnlPercent.toFixed(1)}%` : `${actualHolding.pnlPercent.toFixed(1)}%`) : '0%'})` : null,
      `---`,
      `สร้างโดย AI Portfolio Advisor (จอมมารแห่ง Wall Street)`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(slipText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Simple Card fallback if executionStrategies is absent
  if (!hasStrategies || !suggestion.executionStrategies) {
    return (
      <div className="border border-[#232738] bg-[#12141F] rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded border ${getActionBadge(suggestion.action)}`}>
              {suggestion.action}
            </span>
            <span className="font-bold text-white text-[14px]">
              {suggestion.symbol} {suggestion.percent}%
            </span>
          </div>
          <p className="text-[13px] text-slate-200 mb-4 leading-relaxed font-normal">
            {suggestion.reason}
          </p>
        </div>
        <button
          onClick={() => onApplySuggestion && onApplySuggestion(suggestion)}
          className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg text-[13px] font-bold transition-colors border border-emerald-500/30 cursor-pointer"
        >
          นำคำแนะนำไปปรับใช้
        </button>
      </div>
    );
  }

  const options = suggestion.executionStrategies.options;
  const currentOption = options[selectedIdx] || options[0];
  const optionTheme = getTypeTheme(currentOption.type);

  return (
    <div className="border border-[#232738] bg-[#12141F] rounded-2xl p-5 flex flex-col justify-between hover:border-slate-600/80 transition-all shadow-md">
      <div>
        {/* Header: Action + Symbol + Holding context */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-md border ${getActionBadge(suggestion.action)}`}>
              {suggestion.action}
            </span>
            <span className="font-bold text-white text-base tracking-wide">
              {suggestion.symbol} {suggestion.percent}%
            </span>
          </div>

          {actualHolding && (
            <div className="flex items-center gap-2 text-xs">
              {actualHolding.actualPercent !== undefined && (
                <span className="bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  ถือจริง {actualHolding.actualPercent.toFixed(1)}%
                </span>
              )}
              {actualHolding.pnlPercent !== undefined && (
                <span className={`px-2 py-0.5 rounded font-semibold border ${
                  actualHolding.pnlPercent >= 0
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}>
                  P/L {actualHolding.pnlPercent >= 0 ? `+${actualHolding.pnlPercent.toFixed(1)}%` : `${actualHolding.pnlPercent.toFixed(1)}%`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Reason */}
        <p className="text-[13px] text-slate-200 mb-4 leading-relaxed font-normal bg-slate-900/40 p-3 rounded-xl border border-slate-800/70">
          {suggestion.reason}
        </p>

        {/* AI Justification Banner */}
        {suggestion.executionStrategies.justification && (
          <div className="mb-4 p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-2.5">
            <span className="text-base leading-tight">👑</span>
            <div className="text-[13px] text-slate-200 leading-snug">
              <span className="font-bold text-purple-300 mr-1.5">AI ฟันธงกลยุทธ์ที่ดีที่สุด:</span>
              <span>{suggestion.executionStrategies.justification}</span>
            </div>
          </div>
        )}

        {/* Strategy Selector Tabs (3 Archetypes) */}
        <div className="mb-3">
          <div className="text-[13px] font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span>เลือกแนวทางกลยุทธ์ปฏิบัติการ (3 Execution Options):</span>
            <span className="text-[13px] text-purple-300 font-normal">
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
                  <div className="text-[13px] text-slate-300 capitalize truncate mt-0.5">
                    {opt.type === 'CONSERVATIVE' ? '🛡️ แบ่งไม้' : opt.type === 'TREND_FOLLOWING' ? '📈 Trailing' : '⚡ ไม้เดียว'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Option Detail Card */}
        <div className={`rounded-xl p-3.5 border mb-4 ${optionTheme.bg} ${optionTheme.border}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${optionTheme.pill}`}>
              {optionTheme.label}
            </span>
            <span className="text-[13px] text-slate-300 font-medium">
              สัดส่วนไม้: {optionTheme.trancheSplit}
            </span>
          </div>

          {/* Tranche Visualizer Bar */}
          <div className="mb-3">
            <div className="flex w-full h-2 rounded-full overflow-hidden bg-slate-800 mb-1.5">
              {currentOption.type === 'CONSERVATIVE' && (
                <>
                  <div className="h-full bg-blue-500 w-1/2 border-r border-slate-900" title="ไม้ 1: 50%" />
                  <div className="h-full bg-cyan-400 w-1/2" title="ไม้ 2: 50%" />
                </>
              )}
              {currentOption.type === 'TREND_FOLLOWING' && (
                <>
                  <div className="h-full bg-purple-500 w-[30%] border-r border-slate-900" title="ไม้ 1 ตลาด: 30%" />
                  <div className="h-full bg-emerald-400 w-[70%]" title="ไม้ 2 Trailing Stop: 70%" />
                </>
              )}
              {currentOption.type === 'AGGRESSIVE' && (
                <div className="h-full bg-amber-500 w-full" title="ไม้เดียว 100%" />
              )}
            </div>
            <div className="flex justify-between text-[13px] text-slate-300">
              <span>{optionTheme.trancheA}</span>
              {optionTheme.trancheB && <span>{optionTheme.trancheB}</span>}
            </div>
          </div>

          {/* Detailed Strategy Description */}
          <p className="text-[13px] text-slate-200 leading-relaxed mb-3">
            {currentOption.description}
          </p>

          {/* Price Target and Stop Loss Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-700/40">
            {currentOption.exitPrice && (
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[13px] text-slate-300 block mb-0.5">🎯 ราคาเป้าหมาย / ทางออก:</span>
                <span className="text-[13px] font-bold text-emerald-300">{currentOption.exitPrice}</span>
              </div>
            )}
            {currentOption.stopLoss && (
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[13px] text-slate-300 block mb-0.5">🛡️ จุดตัดขาดทุน / Trailing Stop:</span>
                <span className="text-[13px] font-bold text-rose-300">{currentOption.stopLoss}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          type="button"
          onClick={() => handleCopySlip(currentOption)}
          className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[13px] font-medium transition-colors border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
          title="คัดลอกข้อความสรุปคำสั่งเทรดเพื่อนำไปวางในแอพเทรดหุ้น"
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
