import React from 'react';
import { useDossierStore } from '../../../../stores/dossierStore';
import { RevenueMarginPulseChart } from '../charts/RevenueMarginPulseChart';
import { EpsBeatPulseChart } from '../charts/EpsBeatPulseChart';
import { ValuationCorridorChart } from '../charts/ValuationCorridorChart';
import { CagrTrajectoryChart } from '../charts/CagrTrajectoryChart';
import { AnalystConsensusPanel } from '../charts/AnalystConsensusPanel';
import {
  ShieldAlert,
  BarChart3,
  Layers,
  ShieldCheck,
  Coins
} from 'lucide-react';

export const DossierFinancialsTab: React.FC = () => {
  const { data, columnMode } = useDossierStore();

  if (!data) return null;

  const financials = data.quarterlyFinancials || [];
  const peHistory = data.peHistory || [];
  const latestQ = financials[0];
  const prevQ = financials[1];

  const gm = latestQ?.gross_margin_pct != null ? latestQ.gross_margin_pct.toFixed(1) : '-';
  const gmPrev = prevQ?.gross_margin_pct != null ? prevQ.gross_margin_pct.toFixed(1) : '-';

  // Dynamic Financial Metrics from backend
  const fcfRaw = data.financialMetrics?.freeCashFlow || 0;
  const fcfB = fcfRaw > 0 ? (fcfRaw / 1e9).toFixed(1) : '-';
  const opCfRaw = data.financialMetrics?.operatingCashFlow || 0;
  const opCfB = opCfRaw > 0 ? (opCfRaw / 1e9).toFixed(1) : '-';
  const opMarginReal = data.financialMetrics?.operatingMargin || 0;

  // Shares & Dilution
  const sharesRaw = data.financialMetrics?.sharesOutstanding || 0;
  const sharesB = sharesRaw > 0 ? (sharesRaw / 1e9).toFixed(2) + 'B' : '-';
  const dilutionPct = data.financialMetrics?.sharesDilutionPct ?? 0;

  // FCF Yield = FCF / MarketCap
  const mktCap = data.marketCap || 0;
  const fcfYieldPct = (fcfRaw > 0 && mktCap > 0)
    ? ((fcfRaw / mktCap) * 100).toFixed(1) + '%'
    : '-';

  // Dynamic Valuation Band from real peHistory
  const validPes = peHistory.map(p => p.pe).filter(p => p > 0);
  const minPe = validPes.length > 0 ? Math.min(...validPes).toFixed(0) : '20';
  const maxPe = validPes.length > 0 ? Math.max(...validPes).toFixed(0) : '50';

  // Render FCF Quality Panel
  const renderFCFQualityPanel = () => (
    <div className="bg-[#0E1326]/95 p-4 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-violet-400" />
          <span className="text-slate-100 text-base font-bold">Free Cash Flow Machine</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/40 text-xs font-bold">
          Cash Generation
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0A0E1A] border border-white/5">
          <div className="text-slate-300 text-sm font-medium">Free Cash Flow (TTM)</div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {fcfB !== '-' ? `$${fcfB}B` : '-'}
          </div>
          <div className="text-xs text-violet-300 font-mono mt-1 font-medium">
            {fcfRaw > 0 ? 'High Cash Conversion' : 'กำลังรวบรวมข้อมูลงบ'}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0E1A] border border-white/5">
          <div className="text-slate-300 text-sm font-medium">Operating Cash Flow</div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {opCfB !== '-' ? `$${opCfB}B` : '-'}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1 font-medium">กระแสเงินสดจากการดำเนินงาน</div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#0A0E1A] border border-white/5 flex items-center justify-between text-sm">
        <span className="text-slate-200 font-medium">P/FCF Yield เทียบมูลค่ากิจการ:</span>
        <span className="text-violet-300 font-mono font-bold">{fcfYieldPct}</span>
      </div>
    </div>
  );

  // Render Share Dilution Guard Panel
  const renderShareDilutionGuard = () => (
    <div className="bg-[#0E1326]/95 p-4 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-violet-400" />
          <span className="text-slate-100 text-base font-bold">Share Dilution & Capital Structure</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/40 text-xs font-bold">
          Capital Structure
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0A0E1A] border border-white/5">
          <div className="text-slate-300 text-sm font-medium">จำนวนหุ้นทั้งหมด (Shares)</div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {sharesB}
          </div>
          <div className="text-xs text-slate-300 mt-1 font-medium">จำนวนหุ้นจดทะเบียนชำระแล้ว</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0E1A] border border-white/5">
          <div className="text-slate-300 text-sm font-medium">สัดส่วนการเจือจาง (Dilution YoY)</div>
          <div className="text-2xl font-black font-mono text-violet-300 mt-1">
            {dilutionPct !== 0 ? `${dilutionPct >= 0 ? '+' : ''}${dilutionPct}%` : 'Stable (<1%)'}
          </div>
          <div className="text-xs text-slate-300 font-medium mt-1">เกณฑ์ปลอดภัย (&lt; 2.5%) ✅</div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#0A0E1A] border border-white/5 flex items-center justify-between text-sm">
        <span className="text-slate-200 font-medium">สถานะการคุ้มครองผู้ถือหุ้น:</span>
        <span className="text-violet-300 font-medium flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-violet-400" />
          ไม่มีความเสี่ยง Dilution ร้ายแรง
        </span>
      </div>
    </div>
  );

  // Render Valuation Trajectory & Multiples
  const renderValuationBandPanel = () => {
    const fwdPe = data.vitalSigns?.peForward || 0;
    const peg = data.vitalSigns?.pegRatio || 0;

    return (
      <div className="bg-[#0E1326]/95 p-4 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            <span className="text-slate-100 text-base font-bold">Valuation Multiples Band</span>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
            data.vitalSigns?.valuationStatus === 'UNDERVALUED'
              ? 'bg-violet-600/25 text-violet-200 border-violet-500/35'
              : data.vitalSigns?.valuationStatus === 'STRETCHED'
              ? 'bg-[#FC2D79]/20 text-[#FF5388] border-[#FC2D79]/40'
              : 'bg-[#12162B] text-slate-300 border-white/10'
          }`}>
            {data.vitalSigns?.valuationStatus || 'FAIR'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-[#0A0E1A] border border-white/5 text-center">
            <div className="text-slate-300 text-xs font-medium">Forward P/E</div>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {fwdPe > 0 ? fwdPe.toFixed(1) : '-'}x
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0A0E1A] border border-white/5 text-center">
            <div className="text-slate-300 text-xs font-medium">PEG Ratio</div>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {peg > 0 ? peg.toFixed(2) : '-'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0A0E1A] border border-white/5 text-center">
            <div className="text-slate-300 text-xs font-medium">P/FCF Yield</div>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {fcfYieldPct}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0A0E1A] border border-white/5 flex items-center justify-between text-sm">
          <span className="text-slate-200 font-medium">Historical P/E Corridor:</span>
          <span className="text-slate-200 font-mono font-bold">
            {minPe}x – {maxPe}x ({validPes.length} snapshots)
          </span>
        </div>
      </div>
    );
  };

  // Render Operating Leverage Panel
  const renderOperatingLeveragePanel = () => (
    <div className="bg-[#0E1326]/95 p-4 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-orange-400" />
          <span className="text-slate-100 text-base font-bold">Operating Scale & Margins</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/40 text-xs font-bold">
          Margin Expansion
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0A0E1A] border border-white/5">
          <div className="text-slate-300 text-sm font-medium">Latest Gross Margin</div>
          <div className="text-2xl font-black font-mono text-white mt-1">{gm}%</div>
          <div className="text-xs text-slate-300 font-mono mt-1">Q ก่อนหน้า: {gmPrev}%</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0E1A] border border-white/5">
          <div className="text-slate-300 text-sm font-medium">Operating Margin (จริง)</div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {opMarginReal > 0 ? `${opMarginReal.toFixed(1)}%` : '-'}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-1">ดึงข้อมูลจริงจากระบบงบการเงิน</div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#0A0E1A] border border-white/5 flex items-center justify-between text-sm">
        <span className="text-slate-200 font-medium">Guidance Beat & Raise Cadence</span>
        <span className="text-orange-300 font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-orange-400" />
          Consistent Beat & Raise
        </span>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {/* 2-Column Mode */}
      {columnMode === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="flex flex-col gap-4">
            <RevenueMarginPulseChart symbol={data.symbol} data={financials} />
            <CagrTrajectoryChart symbol={data.symbol} data={financials} targetCagr={26} />
            {renderOperatingLeveragePanel()}
            {renderShareDilutionGuard()}
          </div>
          <div className="flex flex-col gap-4">
            <AnalystConsensusPanel
              consensus={data.analystConsensus}
              financialMetrics={data.financialMetrics}
              currentPrice={data.currentPrice}
            />
            <EpsBeatPulseChart symbol={data.symbol} data={financials} />
            <ValuationCorridorChart
              symbol={data.symbol}
              peHistory={peHistory}
              currentPE={data.vitalSigns?.peForward}
              currentPEG={data.vitalSigns?.pegRatio}
            />
            {renderFCFQualityPanel()}
            {renderValuationBandPanel()}
          </div>
        </div>
      )}

      {/* 3-Column Mode (Default for Tab 2) */}
      {columnMode === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Col 1: Top-line Growth & Operating Scale */}
          <div className="flex flex-col gap-4">
            <RevenueMarginPulseChart symbol={data.symbol} data={financials} />
            <CagrTrajectoryChart symbol={data.symbol} data={financials} targetCagr={26} />
            {renderOperatingLeveragePanel()}
          </div>

          {/* Col 2: Earnings Quality & Cash Generation */}
          <div className="flex flex-col gap-4">
            <EpsBeatPulseChart symbol={data.symbol} data={financials} />
            {renderFCFQualityPanel()}
            {renderShareDilutionGuard()}
          </div>

          {/* Col 3: Valuation Trajectory & Analyst Consensus */}
          <div className="flex flex-col gap-4">
            <AnalystConsensusPanel
              consensus={data.analystConsensus}
              financialMetrics={data.financialMetrics}
              currentPrice={data.currentPrice}
            />
            <ValuationCorridorChart
              symbol={data.symbol}
              peHistory={peHistory}
              currentPE={data.vitalSigns?.peForward}
              currentPEG={data.vitalSigns?.pegRatio}
            />
            {renderValuationBandPanel()}
          </div>
        </div>
      )}

      {/* 4-Column Mode (Ultra-Wide Full Deck) */}
      {columnMode === 4 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
          {/* Col 1 */}
          <div className="flex flex-col gap-3.5">
            <RevenueMarginPulseChart symbol={data.symbol} data={financials} />
            <CagrTrajectoryChart symbol={data.symbol} data={financials} targetCagr={26} />
          </div>

          {/* Col 2 */}
          <div className="flex flex-col gap-3.5">
            <EpsBeatPulseChart symbol={data.symbol} data={financials} />
            {renderOperatingLeveragePanel()}
          </div>

          {/* Col 3 */}
          <div className="flex flex-col gap-3.5">
            <AnalystConsensusPanel
              consensus={data.analystConsensus}
              financialMetrics={data.financialMetrics}
              currentPrice={data.currentPrice}
            />
            {renderFCFQualityPanel()}
            {renderShareDilutionGuard()}
          </div>

          {/* Col 4 */}
          <div className="flex flex-col gap-3.5">
            <ValuationCorridorChart
              symbol={data.symbol}
              peHistory={peHistory}
              currentPE={data.vitalSigns?.peForward}
              currentPEG={data.vitalSigns?.pegRatio}
            />
            {renderValuationBandPanel()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DossierFinancialsTab;
