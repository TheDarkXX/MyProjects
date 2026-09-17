import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDossierStore } from '../../../stores/dossierStore';
import { DossierHeader } from './DossierHeader';
import { DossierVitalSigns } from './DossierVitalSigns';
import { TacticalMiniProChart } from './charts/TacticalMiniProChart';
import { DoublerConeChart } from './charts/DoublerConeChart';
import { FundamentalPulseChart } from './charts/FundamentalPulseChart';
import { SpecificDriverGauge } from './charts/SpecificDriverGauge';
import { DossierMoatGuard } from './DossierMoatGuard';
import { DossierExecutionSlip } from './DossierExecutionSlip';

const STOCKS_ORDER = ['NVDA', 'TSM', 'AVGO', 'VRT', 'MELI', 'APH', 'KLAC', 'ANET', 'CRWD', 'STRL', 'ALAB', 'PLTR', 'CLS'];

export const StockDossierModal: React.FC = () => {
  const { isOpen, closeDossier, data, selectedSymbol, selectSymbol, isLoading, error } = useDossierStore();

  // Keyboard navigation: Escape to close, Arrow keys to switch stock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDossier();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (!selectedSymbol) return;
        const currentIndex = STOCKS_ORDER.indexOf(selectedSymbol);
        if (currentIndex === -1) return;

        let nextIndex = e.key === 'ArrowRight' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= STOCKS_ORDER.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = STOCKS_ORDER.length - 1;

        selectSymbol(STOCKS_ORDER[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedSymbol, closeDossier, selectSymbol]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-7xl max-h-[96vh] bg-[#070A12] border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {/* Header with Switcher & Verdict */}
            <DossierHeader onClose={closeDossier} />

            {/* Loading State */}
            {isLoading && !data && (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-cyan-400">
                <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold tracking-wide">กำลังรวบรวมข้อมูลเชิงลึก {selectedSymbol}...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 my-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                ⚠️ เกิดข้อผิดพลาด: {error}
              </div>
            )}

            {/* Main Content when loaded */}
            {data && (
              <div className="space-y-4">
                {/* 1. The 4 Vital Signs (Executive Tiles) */}
                <DossierVitalSigns data={data} />

                {/* 2. Top Chart: Tactical Pro Mini Chart */}
                <TacticalMiniProChart
                  symbol={data.symbol}
                  currentPrice={data.currentPrice}
                  avgCost={data.holding?.avgCost || 0}
                  ema50={data.radar?.ema50}
                  ema150={data.radar?.ema150}
                  ema200={data.radar?.ema200}
                  bankerFlow={data.radar?.bankerFlow}
                />

                {/* 3. Mid Grid: Doubler Cone + Fundamental Pulse */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-7">
                    <DoublerConeChart
                      symbol={data.symbol}
                      currentPrice={data.currentPrice}
                      basePrice={data.basePrice}
                      targetPrice3Y={data.targetPrice3Y}
                    />
                  </div>
                  <div className="lg:col-span-5">
                    <FundamentalPulseChart
                      symbol={data.symbol}
                      data={data.quarterlyFinancials || []}
                    />
                  </div>
                </div>

                {/* 4. Key Driver Arc Gauge */}
                <SpecificDriverGauge
                  symbol={data.symbol}
                  driver={data.specificDriver}
                />

                {/* 5. Execution Slip & Action Buttons */}
                <DossierExecutionSlip data={data} />

                {/* 6. Moat Guard & 5-Pillar Protocol */}
                <DossierMoatGuard data={data} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
