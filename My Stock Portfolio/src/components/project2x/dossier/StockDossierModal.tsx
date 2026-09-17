import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDossierStore } from '../../../stores/dossierStore';
import { DossierHeader } from './DossierHeader';
import { DossierCockpitTab } from './tabs/DossierCockpitTab';
import { DossierFinancialsTab } from './tabs/DossierFinancialsTab';
import { DossierThesisTab } from './tabs/DossierThesisTab';

const STOCKS_ORDER = ['NVDA', 'TSM', 'AVGO', 'VRT', 'MELI', 'APH', 'KLAC', 'ANET', 'CRWD', 'STRL', 'ALAB', 'PLTR', 'CLS'];

export const StockDossierModal: React.FC = () => {
  const {
    isOpen,
    closeDossier,
    data,
    selectedSymbol,
    selectSymbol,
    isLoading,
    error,
    activeSubTab
  } = useDossierStore();

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        closeDossier();
        return;
      }

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
  }, [isOpen, selectedSymbol, selectSymbol, closeDossier]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md">
        {/* Backdrop Click to Close */}
        <div className="absolute inset-0" onClick={closeDossier} />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-[99vw] 2xl:max-w-[2100px] max-h-[96vh] bg-gradient-to-br from-[#080818] via-[#0A0E1A] to-[#12162B] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.85)] rounded-3xl flex flex-col overflow-hidden"
        >
          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 scrollbar-thin scrollbar-thumb-violet-900/50 scrollbar-track-transparent">
            {/* Header with Switcher & Verdict */}
            <DossierHeader onClose={closeDossier} />

            {/* Loading State */}
            {isLoading && !data && (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-violet-300">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[13px] font-medium tracking-wide text-slate-300">กำลังประมวลผลข้อมูลเอ็กซเรย์ {selectedSymbol}...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-3 my-3 rounded-xl bg-[#FC2D79]/15 border border-[#FC2D79]/35 text-rose-200 text-[13px] font-medium">
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
