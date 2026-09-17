import React, { useEffect } from 'react';
import { useDossierStore } from '../../../stores/dossierStore';
import { DossierHeader } from './DossierHeader';
import { DossierVitalSigns } from './DossierVitalSigns';
import { TacticalMiniProChart } from './charts/TacticalMiniProChart';
import { DoublerConeChart } from './charts/DoublerConeChart';
import { FundamentalPulseChart } from './charts/FundamentalPulseChart';
import { SpecificDriverGauge } from './charts/SpecificDriverGauge';
import { DossierMoatGuard } from './DossierMoatGuard';
import { DossierExecutionSlip } from './DossierExecutionSlip';
import { ScanSearch, Sparkles } from 'lucide-react';

const STOCKS_ORDER = ['NVDA', 'TSM', 'AVGO', 'VRT', 'MELI', 'APH', 'KLAC', 'ANET', 'CRWD', 'STRL', 'ALAB', 'PLTR', 'CLS'];

export const StockXRayPage: React.FC = () => {
  const { data, selectedSymbol, selectSymbol, openDossier, isLoading, error } = useDossierStore();

  // Auto-select first stock (NVDA) on page load if none selected
  useEffect(() => {
    if (!selectedSymbol) {
      openDossier('NVDA');
    }
  }, [selectedSymbol, openDossier]);

  // Keyboard navigation: Arrow Left / Right to switch stock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const currentSym = selectedSymbol || 'NVDA';
        const currentIndex = STOCKS_ORDER.indexOf(currentSym);
        if (currentIndex === -1) return;

        let nextIndex = e.key === 'ArrowRight' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= STOCKS_ORDER.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = STOCKS_ORDER.length - 1;

        selectSymbol(STOCKS_ORDER[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSymbol, selectSymbol]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 select-none">
      {/* Top Banner: Breadcrumb & Purpose */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#0C1222] via-[#0E172A] to-[#0A1020] border border-cyan-500/20 rounded-2xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
            <ScanSearch className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                Stock X-Ray
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[13px] font-extrabold">
                Project 2X Edition
              </span>
            </div>
            <p className="text-[13px] text-slate-300 font-medium mt-0.5">
              เอ็กซเรย์ไส้ใน 13 หุ้นคัดสรร • 4 สัญญาณชีพพื้นฐาน • 3 กราฟทรงพลัง • คูเมือง & แผนสั่งการ 3 ทิศทาง
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[13px] text-slate-300 flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>ใช้ปุ่ม <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[13px] border border-slate-700">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[13px] border border-slate-700">→</kbd> สลับหุ้น</span>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-[#070A12] border border-slate-800/90 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Header with 13-Stock Switcher & Verdict Strip */}
        <DossierHeader />

        {/* Loading State */}
        {isLoading && !data && (
          <div className="py-28 flex flex-col items-center justify-center gap-3 text-cyan-400">
            <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[14px] font-bold tracking-wide">กำลังสแกนข้อมูลเอ็กซเรย์ {selectedSymbol}...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 my-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[13px] font-medium">
            ⚠️ เกิดข้อผิดพลาด: {error}
          </div>
        )}

        {/* Main Content when loaded */}
        {data && (
          <div className="space-y-6 mt-4">
            {/* 1. 4 Vital Signs */}
            <DossierVitalSigns />

            {/* 2. Charts Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Col (7/12): Fundamental Pulse (EPS Beat + Margin) & Specific Driver Gauge */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <FundamentalPulseChart />
                <SpecificDriverGauge />
              </div>

              {/* Right Col (5/12): 3-Year 1-Doubler Cone Projection */}
              <div className="lg:col-span-5 flex flex-col">
                <DoublerConeChart />
              </div>
            </div>

            {/* 3. Tactical Mini Pro Chart (Lightweight Charts with EMA & Cost line) */}
            <div>
              <TacticalMiniProChart />
            </div>

            {/* 4. Moat Guard (Story, Moat Checklist, 5-Pillar Selling Protocols) */}
            <DossierMoatGuard />

            {/* 5. 3-Way Action Plan & Execution Slip */}
            <DossierExecutionSlip />
          </div>
        )}
      </div>
    </div>
  );
};
