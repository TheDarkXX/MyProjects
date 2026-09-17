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
  const { isOpen, closeDossier, data, selectedSymbol, selectSymbol, isLoading, error, columnMode } = useDossierStore();

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-[99vw] 2xl:max-w-[2100px] max-h-[96vh] bg-gradient-to-br from-[#040714] via-[#070D22] to-[#120716] border border-blue-900/60 shadow-[0_24px_64px_rgba(0,0,0,0.85)] rounded-3xl flex flex-col overflow-hidden"
        >
          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin scrollbar-thumb-blue-900/50 scrollbar-track-transparent">
            {/* Header with Switcher & Verdict */}
            <DossierHeader onClose={closeDossier} />

            {/* Loading State */}
            {isLoading && !data && (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-cyan-300">
                <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold tracking-wide">กำลังประมวลผลข้อมูลเอ็กซเรย์ {selectedSymbol}...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 my-4 rounded-xl bg-rose-500/20 border border-rose-500/50 text-white text-[13px] font-bold">
                ⚠️ เกิดข้อผิดพลาด: {error}
              </div>
            )}

            {/* Dynamic Multi-Column Grid (2, 3, or 4 Columns) */}
            {data && (
              <>
                {/* MODE 2: Split 2 Columns */}
                {columnMode === 2 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start mt-2">
                    {/* Column 1: Tactical Chart + Specific Driver + 3Y Doubler */}
                    <div className="flex flex-col gap-4">
                      <TacticalMiniProChart
                        symbol={data.symbol}
                        currentPrice={data.currentPrice}
                        avgCost={data.holding?.avgCost || 0}
                        ema50={data.radar?.ema50}
                        ema150={data.radar?.ema150}
                        ema200={data.radar?.ema200}
                        bankerFlow={data.radar?.bankerFlow}
                      />
                      <SpecificDriverGauge
                        symbol={data.symbol}
                        driver={data.specificDriver}
                      />
                      <DoublerConeChart
                        symbol={data.symbol}
                        currentPrice={data.currentPrice}
                        basePrice={data.basePrice}
                        targetPrice3Y={data.targetPrice3Y}
                      />
                    </div>

                    {/* Column 2: Vital Signs + Fundamental Pulse + Execution Slip + Moat */}
                    <div className="flex flex-col gap-4">
                      <DossierVitalSigns data={data} />
                      <FundamentalPulseChart
                        symbol={data.symbol}
                        data={data.quarterlyFinancials || []}
                      />
                      <DossierExecutionSlip data={data} />
                      <DossierMoatGuard data={data} />
                    </div>
                  </div>
                )}

                {/* MODE 3: Balanced 3 Columns (Recommended Sweet Spot) */}
                {columnMode === 3 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start mt-2">
                    {/* Column 1: Tactical Technical & Live Candle Chart + Specific Driver */}
                    <div className="flex flex-col gap-4">
                      <TacticalMiniProChart
                        symbol={data.symbol}
                        currentPrice={data.currentPrice}
                        avgCost={data.holding?.avgCost || 0}
                        ema50={data.radar?.ema50}
                        ema150={data.radar?.ema150}
                        ema200={data.radar?.ema200}
                        bankerFlow={data.radar?.bankerFlow}
                      />
                      <SpecificDriverGauge
                        symbol={data.symbol}
                        driver={data.specificDriver}
                      />
                    </div>

                    {/* Column 2: Growth Engine (4 Vital Signs + 3Y Doubler Cone) */}
                    <div className="flex flex-col gap-4">
                      <DossierVitalSigns data={data} />
                      <DoublerConeChart
                        symbol={data.symbol}
                        currentPrice={data.currentPrice}
                        basePrice={data.basePrice}
                        targetPrice3Y={data.targetPrice3Y}
                      />
                    </div>

                    {/* Column 3: Fundamental Pulse & Moat Defense & Execution Slip */}
                    <div className="flex flex-col gap-4">
                      <FundamentalPulseChart
                        symbol={data.symbol}
                        data={data.quarterlyFinancials || []}
                      />
                      <DossierExecutionSlip data={data} />
                      <DossierMoatGuard data={data} />
                    </div>
                  </div>
                )}

                {/* MODE 4: Panoramic 4 Columns (Ultra-Wide Full Deck) */}
                {columnMode === 4 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start mt-2">
                    {/* Column 1: Tactical Technical Chart */}
                    <div className="flex flex-col gap-4">
                      <TacticalMiniProChart
                        symbol={data.symbol}
                        currentPrice={data.currentPrice}
                        avgCost={data.holding?.avgCost || 0}
                        ema50={data.radar?.ema50}
                        ema150={data.radar?.ema150}
                        ema200={data.radar?.ema200}
                        bankerFlow={data.radar?.bankerFlow}
                      />
                    </div>

                    {/* Column 2: Vital Signs + Doubler Cone */}
                    <div className="flex flex-col gap-4">
                      <DossierVitalSigns data={data} />
                      <DoublerConeChart
                        symbol={data.symbol}
                        currentPrice={data.currentPrice}
                        basePrice={data.basePrice}
                        targetPrice3Y={data.targetPrice3Y}
                      />
                    </div>

                    {/* Column 3: Fundamental Pulse + Specific Driver */}
                    <div className="flex flex-col gap-4">
                      <FundamentalPulseChart
                        symbol={data.symbol}
                        data={data.quarterlyFinancials || []}
                      />
                      <SpecificDriverGauge
                        symbol={data.symbol}
                        driver={data.specificDriver}
                      />
                    </div>

                    {/* Column 4: Execution Slip + Moat Defense */}
                    <div className="flex flex-col gap-4">
                      <DossierExecutionSlip data={data} />
                      <DossierMoatGuard data={data} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
