import React, { useState } from 'react';
import { ScorecardPage } from '../scorecard/ScorecardPage';
import { RiskPage } from '../risk/RiskPage';
import { Target, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

interface HealthRiskPageProps {
  defaultTab?: 'scorecard' | 'risk';
}

export const HealthRiskPage: React.FC<HealthRiskPageProps> = ({ defaultTab = 'scorecard' }) => {
  const [activeTab, setActiveTab] = useState<'scorecard' | 'risk'>(defaultTab);

  return (
    <div className="space-y-6 pb-12 animate-fade-in-up">
      {/* Header & Mode Switcher */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#823AFD] via-[#06B6D4] to-[#10B981] flex items-center justify-center shadow-[0_4px_16px_rgba(130,58,253,0.3)] shrink-0">
            {activeTab === 'scorecard' ? (
              <Target className="w-6 h-6 text-white" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Health & Risk
              <span className="text-xs px-3 py-1 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-cyan-400 font-bold">
                Portfolio Intelligence
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              ประเมินสุขภาพหุ้นรายตัว (Scorecard) และตรวจวัดความผันผวนความเสี่ยงของพอร์ต (Risk & Alpha)
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#1A1D2D] p-1.5 rounded-2xl border border-[#2A2E45] gap-1 self-start xl:self-auto">
          <button
            onClick={() => setActiveTab('scorecard')}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'scorecard'
                ? "bg-gradient-to-r from-[#823AFD] to-[#06B6D4] text-white shadow-md"
                : "text-slate-300 hover:text-white"
            )}
          >
            <Target className="w-4 h-4" />
            Fundamental Scorecard
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'risk'
                ? "bg-gradient-to-r from-[#06B6D4] to-[#10B981] text-white shadow-md"
                : "text-slate-300 hover:text-white"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            Risk & Alpha
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'scorecard' && <ScorecardPage />}
        {activeTab === 'risk' && <RiskPage />}
      </div>
    </div>
  );
};

export default HealthRiskPage;
