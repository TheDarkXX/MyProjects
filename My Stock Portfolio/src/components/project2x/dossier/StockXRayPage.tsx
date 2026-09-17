import React, { useEffect } from 'react';
import { useDossierStore } from '../../../stores/dossierStore';
import { DossierHeader } from './DossierHeader';
import { DossierCockpitTab } from './tabs/DossierCockpitTab';
import { DossierFinancialsTab } from './tabs/DossierFinancialsTab';
import { DossierThesisTab } from './tabs/DossierThesisTab';
import { ScanSearch, Sparkles } from 'lucide-react';

const STOCKS_ORDER = ['NVDA', 'TSM', 'AVGO', 'VRT', 'MELI', 'APH', 'KLAC', 'ANET', 'CRWD', 'STRL', 'ALAB', 'PLTR', 'CLS'];

export const StockXRayPage: React.FC = () => {
  const { data, selectedSymbol, selectSymbol, closeDossier, isLoading, error, activeSubTab } = useDossierStore();

  // Auto-select first stock (NVDA) on page load and ensure modal overlay is closed
  useEffect(() => {
    closeDossier();
    if (!selectedSymbol) {
      selectSymbol('NVDA');
    }
  }, [selectedSymbol, selectSymbol, closeDossier]);

  // Keyboard navigation: Arrow Left / Right to switch stock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    <div className="w-full max-w-[99vw] 2xl:max-w-[2100px] mx-auto space-y-3.5 pb-20 select-none">
      {/* Top Banner: Breadcrumb & Ergonomic Typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#060A1A] via-[#0A132E] to-[#1A0818] border border-blue-800/40 rounded-2xl p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/25 to-rose-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-300 shadow-sm">
            <ScanSearch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                Stock X-Ray
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-600/30 to-rose-600/30 text-slate-200 border border-blue-400/40 text-[12px] font-medium">
                Ultra-Wide Command Deck
              </span>
            </div>
            <p className="text-[13px] text-slate-300 font-normal mt-0.5">
              13 หุ้นคัดสรร • 3 แท็บระบบ (Mission Control | Financial Pulse | 2X Thesis & Moat)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="px-3 py-1 rounded-xl bg-[#060A16]/80 border border-blue-900/40 text-[13px] text-slate-300 flex items-center gap-2 font-normal">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ใช้ปุ่ม <kbd className="px-1.5 py-0.5 rounded bg-blue-950 text-cyan-300 font-mono text-[12px] border border-blue-800">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-blue-950 text-cyan-300 font-mono text-[12px] border border-blue-800">→</kbd> สลับหุ้น</span>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-gradient-to-br from-[#040714] via-[#070D22] to-[#120716] border border-blue-900/40 rounded-3xl p-3.5 sm:p-4 shadow-2xl relative overflow-hidden">
        {/* Header with 13-Stock Switcher, Power Tube & 3 Sub-tabs */}
        <DossierHeader />

        {/* Loading State */}
        {isLoading && !data && (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-cyan-300">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] font-medium tracking-wide text-slate-300">กำลังสแกนข้อมูลเอ็กซเรย์ {selectedSymbol}...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3 my-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-[13px] font-medium">
            ⚠️ เกิดข้อผิดพลาด: {error}
          </div>
        )}

        {/* Active Sub-Tab View */}
        {data && (
          <div className="mt-2 transition-all duration-300">
            {activeSubTab === 'cockpit' && <DossierCockpitTab />}
            {activeSubTab === 'financials' && <DossierFinancialsTab />}
            {activeSubTab === 'thesis' && <DossierThesisTab />}
          </div>
        )}
      </div>
    </div>
  );
};
