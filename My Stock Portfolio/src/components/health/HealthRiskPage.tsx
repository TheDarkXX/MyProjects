import React, { useState } from 'react';
import { ScorecardPage, ScorecardLayoutMode } from '../scorecard/ScorecardPage';
import { RiskPage } from '../risk/RiskPage';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { Target, ShieldCheck, Columns3, Rows2, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';

interface HealthRiskPageProps {
  defaultTab?: 'scorecard' | 'risk';
}

export const HealthRiskPage: React.FC<HealthRiskPageProps> = ({ defaultTab = 'scorecard' }) => {
  const [activeTab, setActiveTab] = useState<'scorecard' | 'risk'>(defaultTab);
  const { activePortfolioId, portfolios } = usePortfolioStore();

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId);

  // Layout preference persisted for Ultra-Wide displays (Default to 3col for 21:9)
  const [scorecardLayout, setScorecardLayout] = useState<ScorecardLayoutMode>(() => {
    return (localStorage.getItem('scorecard_layout_mode') as ScorecardLayoutMode) || '3col';
  });

  const handleScorecardLayoutChange = (mode: ScorecardLayoutMode) => {
    setScorecardLayout(mode);
    localStorage.setItem('scorecard_layout_mode', mode);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in-up">
      {/* 1. Dynamic Single Master Header (ยุบรวมชั้นเดียว ไม่ซ้ำซ้อน) */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Dynamic Icon, Title, Badge & Subtitle */}
        <div className="flex items-center gap-4">
          <div className={clsx(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white transition-all duration-300",
            activeTab === 'scorecard'
              ? "bg-gradient-to-tr from-[#823AFD] to-[#FC2D79] shadow-[#823AFD]/20"
              : "bg-gradient-to-br from-rose-500 via-[#823AFD] to-[#FC2D79] shadow-rose-500/20"
          )}>
            {activeTab === 'scorecard' ? (
              <Target className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
              <span>{activeTab === 'scorecard' ? 'Strategic Scorecard' : 'Risk & Alpha Management Center'}</span>
              <span className={clsx(
                "text-xs px-2.5 py-0.5 rounded-full font-bold tracking-wider uppercase border",
                activeTab === 'scorecard'
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              )}>
                {activeTab === 'scorecard' ? 'Solo Investor Command Center' : 'Level 3 Analytics'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {activeTab === 'scorecard'
                ? 'ประเมินผลลัพธ์การลงทุน: พลังกระแสเงินสด (Joseph Carlson) และวินัยความเข้มข้น (Shay Boloor)'
                : 'ศูนย์ควบคุมความเสี่ยง วัดผลความคุ้มค่าผลตอบแทนเทียบความเสี่ยง (Risk-Adjusted Return) และจุดย่อตัวของพอร์ต'
              }
            </p>
          </div>
        </div>

        {/* Right: Functional Controls & Tab Selector */}
        <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
          {/* Active Portfolio Badge */}
          <div className="flex items-center gap-2 bg-[#1A1D2D] border border-[#2A2E45] px-3.5 py-2 rounded-2xl text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">พอร์ต:</span>
            <span className="font-bold text-white">{activePortfolio?.name || 'Default Portfolio'}</span>
          </div>

          {/* Scorecard Layout Selector (Only when Scorecard tab is active) */}
          {activeTab === 'scorecard' && (
            <div className="flex items-center bg-[#1A1D2D] border border-[#2A2E45] p-1 rounded-2xl text-xs gap-1 shadow-inner">
              <button
                onClick={() => handleScorecardLayoutChange('3col')}
                className={clsx(
                  "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                  scorecardLayout === '3col'
                    ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                )}
                title="3 Columns (Ultra-Wide 21:9)"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">3 คอลัมน์</span>
              </button>

              <button
                onClick={() => handleScorecardLayoutChange('panoramic')}
                className={clsx(
                  "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                  scorecardLayout === 'panoramic'
                    ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                )}
                title="Panoramic (2:1)"
              >
                <Rows2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Panoramic</span>
              </button>

              <button
                onClick={() => handleScorecardLayoutChange('stacked')}
                className={clsx(
                  "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                  scorecardLayout === 'stacked'
                    ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                )}
                title="1 Column"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">1 คอลัมน์</span>
              </button>
            </div>
          )}

          {/* Mode Tab Selector */}
          <div className="flex bg-[#1A1D2D] p-1 rounded-2xl border border-[#2A2E45] gap-1">
            <button
              onClick={() => setActiveTab('scorecard')}
              className={clsx(
                "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer select-none",
                activeTab === 'scorecard'
                  ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              )}
            >
              <Target className="w-4 h-4" />
              <span>Scorecard</span>
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={clsx(
                "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer select-none",
                activeTab === 'risk'
                  ? "bg-gradient-to-r from-[#06B6D4] to-[#10B981] text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Risk & Alpha</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tab Content (เริ่มเนื้อหาจริงทันที ไม่มีการ์ดหัวข้อซ้อนอีก) */}
      <div>
        {activeTab === 'scorecard' && (
          <ScorecardPage 
            showHeader={false} 
            layoutMode={scorecardLayout} 
            onLayoutChange={handleScorecardLayoutChange} 
          />
        )}
        {activeTab === 'risk' && <RiskPage showHeader={false} />}
      </div>
    </div>
  );
};

export default HealthRiskPage;
