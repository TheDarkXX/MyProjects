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
  const { data, selectedSymbol, selectSymbol, openDossier, isLoading, error, columnMode } = useDossierStore();

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
    <div className="w-full max-w-[99vw] 2xl:max-w-[2100px] mx-auto space-y-4 pb-20 select-none">
      {/* Top Banner: Breadcrumb & Purpose */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#060A1A] via-[#0A132E] to-[#1A0818] border border-blue-800/40 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600/30 to-rose-600/25 border border-blue-500/40 flex items-center justify-center text-cyan-300 shadow-md">
            <ScanSearch className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                Stock X-Ray
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600/40 via-indigo-600/40 to-rose-600/40 text-white border border-blue-400/50 text-[13px] font-black">
                Ultra-Wide Command Deck
              </span>
            </div>
            <p className="text-[13px] text-white font-bold mt-0.5">
              เอ็กซเรย์ 13 หุ้นคัดสรร • 4 สัญญาณชีพ • 3 กราฟหัวใจ • คูเมือง & แผนสั่งการ 3 ทิศทาง
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="px-3 py-1.5 rounded-xl bg-[#060A16]/90 border border-blue-900/50 text-[13px] text-white flex items-center gap-2 font-bold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>ใช้ปุ่ม <kbd className="px-1.5 py-0.5 rounded bg-blue-950 text-cyan-300 font-mono text-[13px] border border-blue-800">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-blue-950 text-cyan-300 font-mono text-[13px] border border-blue-800">→</kbd> สลับหุ้น</span>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-gradient-to-br from-[#040714] via-[#070D22] to-[#120716] border border-blue-900/50 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        {/* Header with 13-Stock Switcher & Verdict Strip */}
        <DossierHeader />

        {/* Loading State */}
        {isLoading && !data && (
          <div className="py-28 flex flex-col items-center justify-center gap-3 text-cyan-300">
            <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[14px] font-bold tracking-wide">กำลังสแกนข้อมูลเอ็กซเรย์ {selectedSymbol}...</span>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start mt-4">
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start mt-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start mt-4">
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
    </div>
  );
};
