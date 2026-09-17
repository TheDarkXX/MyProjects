import React from 'react';
import { useDossierStore } from '../../../../stores/dossierStore';
import { TacticalMiniPulse } from '../charts/TacticalMiniPulse';
import { SpecificDriverGauge } from '../charts/SpecificDriverGauge';
import { DoublerConeChart } from '../charts/DoublerConeChart';
import { DossierVitalSigns } from '../DossierVitalSigns';
import { DossierMoatGuard } from '../DossierMoatGuard';
import { DossierExecutionSlip } from '../DossierExecutionSlip';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

export const DossierCockpitTab: React.FC = () => {
  const { data, columnMode } = useDossierStore();

  if (!data) return null;

  // Recent 4 Quarters mini momentum strip
  const recent4Q = (data.quarterlyFinancials || []).slice(0, 4).reverse();

  const renderMiniMomentumStrip = () => (
    <div className="bg-[#060B1C]/90 p-3 rounded-2xl border border-blue-900/40 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-[#CBD5E1] text-[13px] font-medium">Revenue YoY Momentum (4Q ล่าสุด)</span>
        </div>
        <span className="text-[12px] text-slate-400 font-normal">ดูตัวเต็ม 8Q ได้ที่แท็บ Financial Pulse</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {recent4Q.map((q, idx) => {
          const yoy = q.yoy_revenue_growth_pct ?? 0;
          const isPos = yoy > 0;
          return (
            <div
              key={q.fiscal_quarter || idx}
              className="p-2 rounded-xl bg-[#081024] border border-blue-900/30 text-center"
            >
              <div className="text-slate-400 text-[12px] font-mono">{q.fiscal_quarter}</div>
              <div className={`text-[13px] font-medium font-mono mt-0.5 flex items-center justify-center gap-0.5 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPos && <ArrowUpRight className="w-3 h-3" />}
                <span>{isPos ? '+' : ''}{yoy.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* MODE 2: Split 2 Columns */}
      {columnMode === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Column 1: Tactical Pulse + Specific Driver + Doubler Cone */}
          <div className="flex flex-col gap-3.5">
            <TacticalMiniPulse
              symbol={data.symbol}
              currentPrice={data.currentPrice}
              avgCost={data.holding?.avgCost || 0}
              ema50={data.radar?.ema50}
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

          {/* Column 2: Vital Signs + Execution Slip + Moat + Mini Momentum */}
          <div className="flex flex-col gap-3.5">
            <DossierVitalSigns data={data} />
            <DossierExecutionSlip data={data} />
            <DossierMoatGuard data={data} />
            {renderMiniMomentumStrip()}
          </div>
        </div>
      )}

      {/* MODE 3: Balanced 3 Columns (Recommended Sweet Spot on Ultra-Wide) */}
      {columnMode === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Column 1: Market Position & Execution */}
          <div className="flex flex-col gap-3.5">
            <TacticalMiniPulse
              symbol={data.symbol}
              currentPrice={data.currentPrice}
              avgCost={data.holding?.avgCost || 0}
              ema50={data.radar?.ema50}
              ema200={data.radar?.ema200}
              bankerFlow={data.radar?.bankerFlow}
            />
            <SpecificDriverGauge
              symbol={data.symbol}
              driver={data.specificDriver}
            />
            <DossierExecutionSlip data={data} />
          </div>

          {/* Column 2: 2X Growth Core Engine */}
          <div className="flex flex-col gap-3.5">
            <DossierVitalSigns data={data} />
            <DoublerConeChart
              symbol={data.symbol}
              currentPrice={data.currentPrice}
              basePrice={data.basePrice}
              targetPrice3Y={data.targetPrice3Y}
            />
          </div>

          {/* Column 3: Moat Defense & Quick Momentum */}
          <div className="flex flex-col gap-3.5">
            <DossierMoatGuard data={data} />
            {renderMiniMomentumStrip()}
          </div>
        </div>
      )}

      {/* MODE 4: Panoramic 4 Columns (Ultra-Wide Full Deck) */}
      {columnMode === 4 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
          {/* Column 1: Tactical Pulse & Driver */}
          <div className="flex flex-col gap-3.5">
            <TacticalMiniPulse
              symbol={data.symbol}
              currentPrice={data.currentPrice}
              avgCost={data.holding?.avgCost || 0}
              ema50={data.radar?.ema50}
              ema200={data.radar?.ema200}
              bankerFlow={data.radar?.bankerFlow}
            />
            <SpecificDriverGauge
              symbol={data.symbol}
              driver={data.specificDriver}
            />
          </div>

          {/* Column 2: Vital Signs */}
          <div className="flex flex-col gap-3.5">
            <DossierVitalSigns data={data} />
            {renderMiniMomentumStrip()}
          </div>

          {/* Column 3: Doubler Cone */}
          <div className="flex flex-col gap-3.5">
            <DoublerConeChart
              symbol={data.symbol}
              currentPrice={data.currentPrice}
              basePrice={data.basePrice}
              targetPrice3Y={data.targetPrice3Y}
            />
          </div>

          {/* Column 4: Execution Slip & Moat Guard */}
          <div className="flex flex-col gap-3.5">
            <DossierExecutionSlip data={data} />
            <DossierMoatGuard data={data} />
          </div>
        </div>
      )}
    </div>
  );
};
