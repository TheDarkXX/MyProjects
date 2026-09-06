import React, { useState, useMemo, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { useBlueprintStore } from '../../stores/blueprintStore';
import { useHoldings } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';

import { HealthRadar } from './advisor/HealthRadar';
import { SectorGapChart } from './advisor/SectorGapChart';
import { RiskGauge } from './advisor/RiskGauge';
import { BeforeAfterDonut } from './advisor/BeforeAfterDonut';
import { StockVerdictCard } from './advisor/StockVerdictCard';
import { DrawdownMeter } from './advisor/DrawdownMeter';
import { TimelineStepper } from './advisor/TimelineStepper';

// Helper: Extract key macro themes dynamically from analysis text
const extractMacroPills = (text: string) => {
  if (!text) return [];
  const rules = [
    { regex: /ดอกเบี้ย|interest rate|fed|กนง/i, label: '🏦 วงจรอัตราดอกเบี้ย', color: 'bg-amber-500/20 text-amber-200 border-amber-500/40' },
    { regex: /เงินเฟ้อ|inflation|cpi/i, label: '📈 แรงกดดันเงินเฟ้อ', color: 'bg-rose-500/20 text-rose-200 border-rose-500/40' },
    { regex: /ai|ปัญญาประดิษฐ์|capex|ชิป|semiconductor|nvidia/i, label: '🤖 AI & Tech Capex Cycle', color: 'bg-purple-500/20 text-purple-200 border-purple-500/40' },
    { regex: /recession|ถดถอย|hard landing|ชะลอตัว/i, label: '📉 ภาวะเศรษฐกิจชะลอตัว', color: 'bg-orange-500/20 text-orange-200 border-orange-500/40' },
    { regex: /สภาพคล่อง|liquidity|m2|qt|qe/i, label: '💧 สภาพคล่องในระบบ', color: 'bg-sky-500/20 text-sky-200 border-sky-500/40' },
    { regex: /ภูมิรัฐศาสตร์|geopolitic|สงคราม|ไต้หวัน|ตะวันออกกลาง/i, label: '🌍 ความเสี่ยงภูมิรัฐศาสตร์', color: 'bg-red-500/20 text-red-200 border-red-500/40' },
    { regex: /พลังงาน|น้ำมัน|energy|opec/i, label: '🛢️ ความผันผวนพลังงาน', color: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40' },
  ];
  return rules.filter(r => r.regex.test(text)).slice(0, 4);
};

// Helper: Auto-detect weakness severity based on decisive keywords
const getWeaknessSeverity = (title: string, desc: string) => {
  const combined = `${title} ${desc}`.toLowerCase();
  if (/วิกฤต|หายนะ|ยาพิษ|กับดัก|ดอย|ล่ม|รุนแรง|เลือดสาด|ตัดทิ้ง|critical/i.test(combined)) {
    return {
      label: 'วิกฤตเร่งด่วน (Critical)',
      badge: 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.35)]',
      border: 'border-rose-500/40 hover:border-rose-500/70',
      bg: 'bg-rose-950/20'
    };
  }
  if (/กระจุก|ตึงตัว|ผันผวน|แบก|ชะลอ|หดตัว|เสี่ยงสูง|แพง|severe|elevated/i.test(combined)) {
    return {
      label: 'ความเสี่ยงสูง (High)',
      badge: 'bg-orange-500/25 text-orange-300 border-orange-500/50',
      border: 'border-orange-500/40 hover:border-orange-500/70',
      bg: 'bg-orange-950/20'
    };
  }
  return {
    label: 'เฝ้าระวัง (Watch)',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    border: 'border-amber-500/30 hover:border-amber-500/60',
    bg: 'bg-amber-950/15'
  };
};

// Helper: Auto-detect strength tier based on strategic keywords
const getStrengthTier = (title: string, desc: string) => {
  const combined = `${title} ${desc}`.toLowerCase();
  if (/moat|ป้อมปราการ|ผูกขาด|ไร้เทียมทาน|เสาหลัก|แข็งแกร่ง/i.test(combined)) {
    return {
      label: 'Wide Moat Fortress',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]',
      border: 'border-cyan-500/35 hover:border-cyan-500/60',
      bg: 'bg-cyan-950/15'
    };
  }
  if (/เติบโต|กำไร|วิ่งแรง|นวัตกรรม|ชนะ|beat|cash cow|growth/i.test(combined)) {
    return {
      label: 'High Compounder',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.3)]',
      border: 'border-emerald-500/35 hover:border-emerald-500/60',
      bg: 'bg-emerald-950/15'
    };
  }
  return {
    label: 'Defensive Shield',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    border: 'border-sky-500/30 hover:border-sky-500/50',
    bg: 'bg-sky-950/15'
  };
};

// Helper: Normalize missing exposure item to object format
const normalizeMissingExposure = (item: any) => {
  if (typeof item === 'object' && item !== null) {
    const sector = item.sector || item.title || 'สินทรัพย์ทางเลือก';
    const reason = item.reason || item.description || 'ช่วยกระจายความเสี่ยงและลดความเปราะบางของพอร์ต';
    const suggestion = item.suggestion || item.ticker || null;
    const priority = item.priority || 'HIGH';
    let icon = '🛡️';
    if (/health|การแพทย์|ยา/i.test(sector)) icon = '🏥';
    else if (/energy|พลังงาน|น้ำมัน/i.test(sector)) icon = '⚡';
    else if (/gold|ทอง|commodity|โภคภัณฑ์/i.test(sector)) icon = '🪙';
    else if (/tech|เทคโนโลยี/i.test(sector)) icon = '💻';
    else if (/staple|บริโภค|อาหาร/i.test(sector)) icon = '🛒';
    else if (/utility|สาธารณูปโภค/i.test(sector)) icon = '💡';
    else if (/finance|ธนาคาร/i.test(sector)) icon = '🏦';
    return { sector, reason, suggestion, priority, icon };
  }
  
  const str = String(item || '');
  let icon = '🛡️';
  let sector = str;
  let suggestion: string | null = null;
  let reason = 'เป็นหมวดสินทรัพย์ที่ช่วยเสริมความสมดุลและลดความผันผวนยามตลาดปรับฐาน';

  if (/health/i.test(str)) { icon = '🏥'; suggestion = 'XLV / UNH'; }
  else if (/energy|น้ำมัน/i.test(str)) { icon = '⚡'; suggestion = 'XLE / CVX'; }
  else if (/gold|ทอง|โภคภัณฑ์/i.test(str)) { icon = '🪙'; suggestion = 'GLD / IAU'; }
  else if (/consumer staple|สินค้าจำเป็น/i.test(str)) { icon = '🛒'; suggestion = 'XLP / PG'; }
  else if (/utilit/i.test(str)) { icon = '💡'; suggestion = 'XLU / NEE'; }
  else if (/finance|ธนาคาร/i.test(str)) { icon = '🏦'; suggestion = 'XLF / JPM'; }
  else if (/reit|อสังหา/i.test(str)) { icon = '🏢'; suggestion = 'VNQ / O'; }

  return { sector, reason, suggestion, priority: 'HIGH', icon };
};

const METRIC_GUIDES: Record<'beta' | 'pe' | 'risk' | 'cash', {
  title: string;
  subtitle: string;
  icon: string;
  whatIsIt: string;
  howToMeasure: string;
  howToInterpret: string;
  benchmarks: { label: string; range: string; desc: string; color: string }[];
}> = {
  beta: {
    title: 'Weighted Beta (β)',
    subtitle: 'ความผันผวนเฉลี่ยถ่วงน้ำหนักเทียบตลาด (S&P 500 = 1.0)',
    icon: '📊',
    whatIsIt: 'มาตรวัดความอ่อนไหวและความผันผวนของพอร์ตการลงทุน เมื่อเทียบกับการแกว่งตัวของดัชนีตลาดภาพรวม (S&P 500 มีค่า Beta = 1.0)',
    howToMeasure: 'คำนวณจากผลรวมของ (Beta ของหุ้นแต่ละตัว × น้ำหนัก Target % ใน Blueprint) หารด้วยน้ำหนักรวมทั้งหมด (ไม่นับรวมเงินสด)',
    howToInterpret: 'Beta = 1.0 พอร์ตแกว่งตามตลาดพอดี, Beta > 1.0 ผันผวนแรงกว่าตลาดทั้งขาขึ้นและขาลง, Beta < 1.0 ผันผวนต่ำกว่าตลาด ทนทานต่อการปรับฐาน',
    benchmarks: [
      { label: 'Balanced (สมดุล)', range: '0.85 – 1.15', desc: 'ระดับสมดุลมาตรฐาน เคลื่อนไหวสอดคล้องกับดัชนีตลาด ไม่เสี่ยงจนตระหนกยามตลาดพักฐาน', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40' },
      { label: 'Defensive (เกราะเหล็ก)', range: '< 0.85', desc: 'เน้นหุ้นมั่นคง ปันผลสูง ผันผวนต่ำมาก ปลอดภัยยามวิกฤต แต่อาจวิ่งช้ากว่าตลาดในขาขึ้นแรง', color: 'text-sky-300 bg-sky-500/20 border-sky-500/40' },
      { label: 'High Volatility (เสี่ยงสูง)', range: '> 1.35', desc: 'แกว่งตัวรุนแรง ตลาดลบ 10% พอร์ตอาจดิ่ง 15-25% เสี่ยง Drawdown หนักยามฟองสบู่แตก', color: 'text-rose-300 bg-rose-500/20 border-rose-500/40' },
    ]
  },
  pe: {
    title: 'Weighted P/E (Price-to-Earnings)',
    subtitle: 'ระดับความถูก-แพงของมูลค่าเฉลี่ยทั้งพอร์ต',
    icon: '🏷️',
    whatIsIt: 'อัตราส่วนราคาต่อกำไรสุทธิเฉลี่ยถ่วงน้ำหนัก สะท้อนว่าเรากำลังยอมจ่ายเงินกี่เท่าของกำไรสุทธิที่บริษัทในพอร์ตทำได้',
    howToMeasure: 'คำนวณจากผลรวมถ่วงน้ำหนักของค่า P/E Trailing / Forward ของหุ้นแต่ละตัวตามสัดส่วนใน Blueprint (ไม่นำหุ้นที่ขาดทุน P/E <= 0 มารวมคำนวณ)',
    howToInterpret: 'P/E สูง = ตลาดให้ความคาดหวังการเติบโตสูงลิบ แต่ราคาก็ตึงตัวเสี่ยง Valuation Compression, P/E ต่ำ = หุ้นราคาถูก มี Margin of Safety แต่อาจเติบโตช้า',
    benchmarks: [
      { label: 'Reasonable (สมเหตุสมผล)', range: '15x – 25x', desc: 'ระดับสมดุลของพอร์ต Quality Compounders ผสมผสานการเติบโตและกำไรจริง ไม่แพงฟุ่มเฟือย', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40' },
      { label: 'Elevated (เริ่มตึงตัว)', range: '26x – 35x', desc: 'เน้นหุ้นเทคโนโลยีหรือหุ้นเติบโตสูง ราคาวิ่งนำกำไรไปไกล เสี่ยงโดนเทขายหากงบไม่เป็นไปตามคาด', color: 'text-amber-300 bg-amber-500/20 border-amber-500/40' },
      { label: 'Extreme Hype (แพงจัด)', range: '> 35x', desc: 'พอร์ตเต็มไปด้วยหุ้นเก็งกำไรความหวัง หากดอกเบี้ยค้างสูงหรือเศรษฐกิจชะลอ หุ้นกลุ่มนี้จะปรับฐานแรงที่สุด', color: 'text-rose-300 bg-rose-500/20 border-rose-500/40' },
    ]
  },
  risk: {
    title: 'Risk Score (คะแนนความเสี่ยงรวม)',
    subtitle: 'ดัชนีประเมินความเปราะบางของพอร์ต (0 = ปลอดภัยสุด, 100 = เสี่ยงสูงสุด)',
    icon: '⚡',
    whatIsIt: 'คะแนนประเมินความเปราะบางต่อวิกฤตของพอร์ตโดยรวม สังเคราะห์ร่วมกันระหว่างค่าสถิติเชิงปริมาณ (Beta, Top 1 Weight, Sector Overlap) กับการวินิจฉัยของ AI',
    howToMeasure: 'ประมวลผลจากสูตร: (Weighted Beta × 40) + สัดส่วนหุ้นตัวใหญ่สุด + ความเสี่ยงจากการกระจุกตัวในเซกเตอร์เดี่ยว ปรับมาตราส่วนให้อยู่ในสเกล 0–100',
    howToInterpret: 'ยิ่งคะแนนสูง = พอร์ตยิ่งเปราะบางต่อวิกฤตตลาด, ยิ่งคะแนนต่ำ = พอร์ตมีเกราะป้องกันและกระจายความเสี่ยงแข็งแกร่ง',
    benchmarks: [
      { label: 'Safe / Well-Guarded', range: '< 50 / 100', desc: 'พอร์ตกระจายตัวดีเยี่ยม มี Moat หนาแน่น ไม่พึ่งพาหุ้นตัวใดตัวหนึ่งเกินไป ทนทานทุกสภาวะ', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40' },
      { label: 'Moderate Risk', range: '50 – 65 / 100', desc: 'ระดับความเสี่ยงมาตรฐานของพอร์ตหุ้นเติบโตแบบ Core & Satellites ควบคุมความผันผวนได้ดี', color: 'text-sky-300 bg-sky-500/20 border-sky-500/40' },
      { label: 'Elevated / Vulnerable', range: '> 65 / 100', desc: 'เปราะบางสูง มีการกระจุกตัวในหุ้นหรือกลุ่มอุตสาหกรรมเดียวเกิน 30-40% เสี่ยง Drawdown ลึกยามตลาดช็อก', color: 'text-rose-300 bg-rose-500/20 border-rose-500/40' },
    ]
  },
  cash: {
    title: 'Cash Allocation (สัดส่วนเงินสดสำรอง)',
    subtitle: 'กระสุนสำรองเชิงกลยุทธ์ (Dry Powder) ในพิมพ์เขียวเป้าหมาย',
    icon: '💵',
    whatIsIt: 'สัดส่วนเงินสด (CASH) ที่กันไว้ในพิมพ์เขียวเป้าหมาย เพื่อใช้เป็นกันชนลดความผันผวน และเป็นกระสุนคว้าโอกาสทองยามตลาดเทขายหนัก',
    howToMeasure: 'คำนวณจากเปอร์เซ็นต์เป้าหมาย (Target %) ของรายการ CASH เทียบกับสัดส่วน Blueprint ทั้งหมด 100%',
    howToInterpret: 'มีเงินสด = มีสภาพคล่องและมีสติยามวิกฤต ไม่ต้องจำใจขายหุ้นดีตอนราคาดิ่ง, ไม่มีเงินสด = พอร์ตลงสุดตามตลาดโดยไม่มีเงินสดช้อนซื้อ',
    benchmarks: [
      { label: 'Optimal Buffer (เหมาะสมที่สุด)', range: '10% – 20%', desc: 'มีสภาพคล่องพร้อมช้อนซื้อหุ้นชั้นยอดตอนตลาดปรับฐาน 10-15% โดยไม่ดึงผลตอบแทนพอร์ตตกต่ำ', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40' },
      { label: 'Low Buffer (กระสุนน้อย)', range: '< 5%', desc: 'ถือหุ้นเต็ม 100% ไร้ความยืดหยุ่น ยามตลาดตกหนักจะทำได้แค่นั่งมอง ไม่มีกระสุนช้อนซื้อของถูก', color: 'text-amber-300 bg-amber-500/20 border-amber-500/40' },
      { label: 'Cash Drag (เงินสดล้นเกิน)', range: '> 25%', desc: 'ถือเงินสดเยอะเกินไป เสียโอกาสรับผลตอบแทนทบต้น (Opportunity Cost) เงินสดแพ้เงินเฟ้อในระยะยาว', color: 'text-sky-300 bg-sky-500/20 border-sky-500/40' },
    ]
  }
};

interface AIBlueprintAdvisorProps {
  portfolioId: string;
  blueprints: any[];
  onApplySuggestion?: (suggestion: any) => void;
}

export function AIBlueprintAdvisor({ portfolioId, blueprints, onApplySuggestion }: AIBlueprintAdvisorProps) {
  const { holdings, cashBalance, cashWeight, totalNetWorth } = useHoldings();
  const hasRealHoldings = holdings && holdings.length > 0;

  // Map of actual holdings for fast O(1) lookup by symbol
  const actualHoldingsMap = useMemo(() => {
    const map = new Map<string, { actualPercent: number; pnlPercent: number; marketValue: number; avgCost: number; quantity: number; isOrphan: boolean }>();
    if (!holdings || holdings.length === 0) return map;
    holdings.forEach(h => {
      const sym = h.symbol?.toUpperCase();
      if (!sym || sym === 'CASH') return;
      const isOrphan = !blueprints.some(b => b.symbol?.toUpperCase() === sym);
      map.set(sym, {
        actualPercent: Number(h.weightPercent.toFixed(1)),
        pnlPercent: Number(h.totalReturnPercent.toFixed(1)),
        marketValue: Math.round(h.currentValue),
        avgCost: h.avgCost,
        quantity: h.quantity,
        isOrphan
      });
    });
    if (cashBalance > 0 || cashWeight > 0) {
      map.set('CASH', {
        actualPercent: Number(cashWeight.toFixed(1)),
        pnlPercent: 0,
        marketValue: Math.round(cashBalance),
        avgCost: Math.round(cashBalance),
        quantity: 1,
        isOrphan: false
      });
    }
    return map;
  }, [holdings, blueprints, cashBalance, cashWeight]);

  // Map of user blueprint target percentages
  const userBlueprintMap = useMemo(() => {
    const map = new Map<string, number>();
    blueprints.forEach(b => {
      if (b.symbol) {
        map.set(b.symbol.toUpperCase(), Number(b.target_percent || 0));
      }
    });
    return map;
  }, [blueprints]);

  const { currency } = useUiStore();
  const [mode, setMode] = useState<'strategist'>('strategist');
  const [activeTab, setActiveTab] = useState<'plan' | 'stocks' | 'stress' | 'macro'>('plan');
  const [activeMetricModal, setActiveMetricModal] = useState<'beta' | 'pe' | 'risk' | 'cash' | null>(null);
  const [loadingPhase, setLoadingPhase] = useState(0); 
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [fundamentals, setFundamentals] = useState<Record<string, any>>({});
  const [aiResult, setAiResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isStale, setIsStale] = useState(false);
  const [cachedCreatedAt, setCachedCreatedAt] = useState<string | null>(null);
  const [cachedModel, setCachedModel] = useState<string>('');
  const [modesSummary, setModesSummary] = useState<Record<string, any>>({
    strategist: null,
    deep: null,
    quick: null
  });

  // Safety & Undo states for Ideal Blueprint
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);
  const [previousBlueprintBackup, setPreviousBlueprintBackup] = useState<any[] | null>(() => {
    try {
      const saved = localStorage.getItem(`ai_advisor_backup_${portfolioId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sync snapshot from server on mount or portfolio change
  useEffect(() => {
    if (!portfolioId) return;
    let isCancelled = false;
    api.blueprints.getLatestSnapshot(portfolioId, 'ai_advisor')
      .then(res => {
        if (!isCancelled && res && res.found && Array.isArray(res.entries) && res.entries.length > 0) {
          setPreviousBlueprintBackup(res.entries);
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [portfolioId]);

  const handleApplyIdealBlueprint = async () => {
    if (!aiResult?.idealBlueprint || !portfolioId) return;

    try {
      setIsApplying(true);
      // 1. Snapshot previous blueprints to state, localStorage, and SQLite server
      const backup = blueprints.map(b => ({
        symbol: b.symbol,
        target_percent: Number(b.target_percent) || 0,
        category: b.category,
        status: b.status || 'OWNED',
        target_price: b.target_price || null,
        notes: b.notes || null
      }));
      setPreviousBlueprintBackup(backup);
      try {
        localStorage.setItem(`ai_advisor_backup_${portfolioId}`, JSON.stringify(backup));
        await api.blueprints.saveSnapshot(portfolioId, {
          source: 'ai_advisor',
          name: 'ก่อนปรับใช้ AI Ideal Blueprint',
          entries: backup
        }).catch(() => {});
      } catch (e) {}

      // 2. Apply all items from idealBlueprint
      const updates = aiResult.idealBlueprint.map((item: any) => {
        const symbol = item.symbol.toUpperCase();
        const existing = blueprints.find(b => b.symbol.toUpperCase() === symbol);
        return {
          portfolio_id: portfolioId,
          symbol,
          target_percent: Number(item.idealPercent) || 0,
          category: existing?.category || (symbol === 'CASH' ? 'Cash' : 'Compounders'),
          status: existing?.status || (symbol === 'CASH' ? 'OWNED' : 'WATCHLIST'),
          target_price: existing?.target_price || null,
          notes: existing?.notes || `ปรับตาม AI Deep Analysis: ${item.role || ''}`
        };
      });

      for (const entry of updates) {
        await api.blueprints.upsert(portfolioId, entry);
      }

      // 3. Refresh store to re-render charts & rebalance table immediately
      await useBlueprintStore.getState().fetchBlueprints(portfolioId);

      setIsConfirmModalOpen(false);
      setIsApplying(false);
      setApplySuccessMessage('✅ อัปเดตสัดส่วน Blueprint ตามคำแนะนำของ AI Deep Analysis เรียบร้อยแล้ว!');
      setTimeout(() => setApplySuccessMessage(null), 8000);
    } catch (err: any) {
      console.error('[Apply Ideal Blueprint Error]:', err);
      setIsApplying(false);
      setError(err.message || 'ไม่สามารถปรับสัดส่วนได้ กรุณาลองใหม่');
    }
  };

  const handleUndoAllocation = async () => {
    if (!portfolioId) return;

    try {
      setIsApplying(true);
      let backupToRestore = previousBlueprintBackup;
      
      // If not in memory, try fetching latest snapshot from server
      if (!backupToRestore || backupToRestore.length === 0) {
        const snap = await api.blueprints.getLatestSnapshot(portfolioId, 'ai_advisor').catch(() => null);
        if (snap && snap.found && Array.isArray(snap.entries) && snap.entries.length > 0) {
          backupToRestore = snap.entries;
        }
      }

      if (!backupToRestore || backupToRestore.length === 0) {
        throw new Error('ไม่พบข้อมูลสำรอง Blueprint ก่อนหน้า');
      }

      for (const entry of backupToRestore) {
        await api.blueprints.upsert(portfolioId, entry);
      }
      await useBlueprintStore.getState().fetchBlueprints(portfolioId);

      setPreviousBlueprintBackup(null);
      try {
        localStorage.removeItem(`ai_advisor_backup_${portfolioId}`);
      } catch (e) {}

      setIsApplying(false);
      setApplySuccessMessage('↩️ กู้คืนสัดส่วน Blueprint เดิมเรียบร้อยแล้ว!');
      setTimeout(() => setApplySuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('[Undo Allocation Error]:', err);
      setIsApplying(false);
      setError(err.message || 'ไม่สามารถกู้คืนสัดส่วนเดิมได้');
    }
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-load latest saved analysis on mount or portfolio change (defaults to highest tier mode)
  useEffect(() => {
    let isCancelled = false;

    async function loadLatest() {
      if (!portfolioId || !blueprints || blueprints.length === 0) return;

      try {
        const latest = await api.ai.latestAdvisor(portfolioId, blueprints);
        if (isCancelled) return;

        if (latest && latest.found) {
          if (latest.modesSummary) {
            setModesSummary(latest.modesSummary);
          }
          
          // Select highest available tier mode: strategist > deep > quick
          const activeMode = latest.highestMode || latest.mode || 'strategist';
          const activeData = (latest.modesSummary && latest.modesSummary[activeMode]) || latest;

          if (activeData && activeData.result) {
            setAiResult(activeData.result);
            setIsStale(Boolean(activeData.isStale));
            setCachedCreatedAt(activeData.createdAt || null);
            setCachedModel(activeData.modelUsed || '');
            setMode(activeMode as any);
            setLoadingPhase(4); // Immediately display cached results
          }

          // Silently fetch fundamentals in background if not already loaded so charts have live data
          const allSyms = new Set<string>();
          blueprints.forEach((b: any) => { if (b.symbol && b.symbol.toUpperCase() !== 'CASH') allSyms.add(b.symbol.toUpperCase()); });
          holdings.forEach((h: any) => { if (h.symbol && h.symbol.toUpperCase() !== 'CASH') allSyms.add(h.symbol.toUpperCase()); });
          const symbols = Array.from(allSyms);
          if (symbols.length > 0) {
            api.prices.fundamentalsBatch(symbols).then(funData => {
              if (funData && !isCancelled) {
                const normalized: Record<string, any> = {};
                Object.entries(funData).forEach(([k, v]) => {
                  normalized[k] = v;
                  normalized[k.toUpperCase()] = v;
                });
                setFundamentals(prev => ({ ...prev, ...normalized }));
              }
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('[Advisor] Failed to load latest analysis:', err);
      }
    }

    // Auto-load if in welcome phase or if results already shown (to check if blueprint changed)
    if (loadingPhase === 0 || loadingPhase === 4) {
      loadLatest();
    }

    return () => {
      isCancelled = true;
    };
  }, [portfolioId, blueprints]);

  // Auto-sync fundamentals for any recommended/verdict symbols not yet in memory
  useEffect(() => {
    if (!aiResult) return;

    const allSymbols = new Set<string>();
    aiResult.stockVerdicts?.forEach((v: any) => {
      if (v.symbol && v.symbol.toUpperCase() !== 'CASH') {
        allSymbols.add(v.symbol.toUpperCase());
      }
    });

    aiResult.idealBlueprint?.forEach((b: any) => {
      if (b.symbol && b.symbol.toUpperCase() !== 'CASH') {
        allSymbols.add(b.symbol.toUpperCase());
      }
    });

    const missing = Array.from(allSymbols).filter(sym => !fundamentals[sym]);
    if (missing.length > 0) {
      api.prices.fundamentalsBatch(missing).then(freshData => {
        if (freshData && Object.keys(freshData).length > 0) {
          const normalized: Record<string, any> = {};
          Object.entries(freshData).forEach(([k, v]) => {
            normalized[k] = v;
            normalized[k.toUpperCase()] = v;
          });
          setFundamentals(prev => ({ ...prev, ...normalized }));
        }
      }).catch(err => console.warn('[Advisor] Sync missing fundamentals error:', err));
    }
  }, [aiResult]);



  // Calculate sector weights dynamically from actual holdings (or blueprints if sandbox)
  const portfolioSectors = useMemo(() => {
    const sectors: Record<string, number> = {};
    if (hasRealHoldings) {
      let totalPct = 0;
      holdings.forEach(h => {
        const pct = Number(h.weightPercent) || 0;
        totalPct += pct;
        const sym = h.symbol?.toUpperCase();
        const f = fundamentals[sym] || fundamentals[h.symbol];
        const sector = f?.sector || h.sector || 'Other';
        sectors[sector] = (sectors[sector] || 0) + pct;
      });
      if (cashWeight > 0) {
        sectors['Cash'] = Number(cashWeight.toFixed(1));
        totalPct += cashWeight;
      }
      if (totalPct > 0 && Math.abs(totalPct - 100) > 1) {
        Object.keys(sectors).forEach(k => {
          sectors[k] = Number(((sectors[k] / totalPct) * 100).toFixed(1));
        });
      }
      return sectors;
    }

    if (!blueprints || blueprints.length === 0) return sectors;
    let totalPct = 0;
    blueprints.forEach((b: any) => {
      const pct = Number(b.target_percent) || 0;
      totalPct += pct;
      const sym = b.symbol?.toUpperCase();
      const f = fundamentals[sym] || fundamentals[b.symbol];
      const sector = f?.sector || b.category || 'Other';
      sectors[sector] = (sectors[sector] || 0) + pct;
    });

    if (totalPct > 0 && Math.abs(totalPct - 100) > 1) {
      Object.keys(sectors).forEach(k => {
        sectors[k] = Number(((sectors[k] / totalPct) * 100).toFixed(1));
      });
    }

    return sectors;
  }, [hasRealHoldings, holdings, cashWeight, blueprints, fundamentals]);

  // Calculate weighted average beta (Reality-First: from actual holdings if available, else blueprints)
  const weightedBeta = useMemo(() => {
    if (hasRealHoldings) {
      let totalWeight = 0;
      let sumBeta = 0;
      holdings.forEach(h => {
        const weight = Number(h.weightPercent) || 0;
        const sym = h.symbol?.toUpperCase();
        const f = fundamentals[sym] || fundamentals[h.symbol];
        const beta = typeof f?.beta === 'number' && f.beta > 0 ? f.beta : 1.0;
        sumBeta += weight * beta;
        totalWeight += weight;
      });
      return totalWeight > 0 ? Number((sumBeta / totalWeight).toFixed(2)) : 1.0;
    }

    if (!blueprints || blueprints.length === 0) return 1.0;
    let totalWeight = 0;
    let sumBeta = 0;
    blueprints.forEach((b: any) => {
      if (b.symbol?.toUpperCase() === 'CASH') return;
      const weight = Number(b.target_percent) || 0;
      const sym = b.symbol?.toUpperCase();
      const f = fundamentals[sym] || fundamentals[b.symbol];
      const beta = typeof f?.beta === 'number' && f.beta > 0 ? f.beta : 1.0;
      sumBeta += weight * beta;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Number((sumBeta / totalWeight).toFixed(2)) : 1.0;
  }, [hasRealHoldings, holdings, blueprints, fundamentals]);

  // Calculate cash percent (Reality-First: actual cashWeight if real holdings, else blueprint target)
  const cashPercent = useMemo(() => {
    if (hasRealHoldings) {
      return Number(cashWeight.toFixed(1));
    }
    if (!blueprints || blueprints.length === 0) return 0;
    const cashBp = blueprints.find((b: any) => b.symbol?.toUpperCase() === 'CASH');
    return Number(cashBp?.target_percent) || 0;
  }, [hasRealHoldings, cashWeight, blueprints]);

  // Calculate weighted average P/E (Reality-First: from actual holdings if available, else blueprints)
  const weightedPE = useMemo(() => {
    if (hasRealHoldings) {
      let totalWeight = 0;
      let sumPE = 0;
      holdings.forEach(h => {
        const weight = Number(h.weightPercent) || 0;
        const sym = h.symbol?.toUpperCase();
        const f = fundamentals[sym] || fundamentals[h.symbol];
        const pe = f?.pe_trailing || f?.pe_forward || 0;
        if (pe > 0 && pe < 250) {
          sumPE += weight * pe;
          totalWeight += weight;
        }
      });
      return totalWeight > 0 ? Number((sumPE / totalWeight).toFixed(1)) : null;
    }

    if (!blueprints || blueprints.length === 0) return null;
    let totalWeight = 0;
    let sumPE = 0;
    blueprints.forEach((b: any) => {
      if (b.symbol?.toUpperCase() === 'CASH') return;
      const weight = Number(b.target_percent) || 0;
      const sym = b.symbol?.toUpperCase();
      const f = fundamentals[sym] || fundamentals[b.symbol];
      const pe = f?.pe_trailing || f?.pe_forward || 0;
      if (pe > 0 && pe < 250) {
        sumPE += weight * pe;
        totalWeight += weight;
      }
    });
    return totalWeight > 0 ? Number((sumPE / totalWeight).toFixed(1)) : null;
  }, [hasRealHoldings, holdings, blueprints, fundamentals]);

  const runAnalysis = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      setMode('strategist');
      setLoadingPhase(1); 
      setProgress(15);
      setError('');
      setStatusMessage('กำลังวิเคราะห์โครงสร้างเป้าหมาย Blueprint และสัดส่วนพอร์ต...');

      // Step 1: Fetch fundamentals batch for all blueprint AND actual holdings symbols (excluding CASH)
      const allSymsSet = new Set<string>();
      blueprints.forEach((b: any) => {
        if (b.symbol && b.symbol.toUpperCase() !== 'CASH') allSymsSet.add(b.symbol.toUpperCase());
      });
      holdings.forEach((h: any) => {
        if (h.symbol && h.symbol.toUpperCase() !== 'CASH') allSymsSet.add(h.symbol.toUpperCase());
      });
      const symbols = Array.from(allSymsSet);
      let funData = { ...fundamentals };

      const missing = symbols.filter(s => !funData[s] && !funData[s.toUpperCase()]);
      if (missing.length > 0) {
        setLoadingPhase(2);
        setProgress(35);
        const displaySymbols = missing.slice(0, 4).join(', ') + (missing.length > 4 ? ` +อีก ${missing.length - 4} ตัว` : '');
        setStatusMessage(`กำลังดึงข้อมูลราคาตลาดและ Fundamental จาก Yahoo Finance (${displaySymbols})...`);
        
        try {
          const fresh = await api.prices.fundamentalsBatch(missing);
          if (fresh) {
            Object.entries(fresh).forEach(([k, v]) => {
              funData[k] = v;
              funData[k.toUpperCase()] = v;
            });
            setFundamentals(prev => ({ ...prev, ...funData }));
          }
        } catch (fErr) {
          console.warn('[Advisor] Fundamentals fetch non-blocking fallback:', fErr);
        }
      }

      setProgress(55);
      setStatusMessage(`กำลังประมวลผล 5-Axis Health Metrics และวิเคราะห์การกระจายตัว (Beta: ${weightedBeta})...`);

      // Step 2: Call AI Backend Advisor with Reality-First Payload
      setLoadingPhase(3);
      setProgress(70);
      setStatusMessage('กำลังเชื่อมต่อ Hermes: GPT 5.6 Terra (Deep Analysis Engine)...');

      // Simulation timer for dynamic feeling during AI generation
      let currentP = 70;
      const statusSteps = [
        'กำลังวิเคราะห์สภาวะเศรษฐกิจมหภาคและทิศทางอัตราดอกเบี้ย...',
        'กำลังตรวจสอบพอร์ตจริงเปรียบเทียบกับพิมพ์เขียวเป้าหมาย...',
        'กำลังประเมิน Stress Test และเจาะลึกหุ้นรายตัว...',
        'กำลังจัดทำแผนกลยุทธ์และขั้นตอน Action Roadmap...',
        'กำลังสังเคราะห์และตรวจสอบความสมบูรณ์ของผลการวิเคราะห์...'
      ];
      let stepIdx = 0;

      timerRef.current = setInterval(() => {
        if (currentP < 92) {
          currentP += 4;
          setProgress(currentP);
          if (stepIdx < statusSteps.length) {
            setStatusMessage(statusSteps[stepIdx]);
            stepIdx++;
          }
        }
      }, 3500);

      // Build reality-first actual holdings payload
      const actualHoldingsPayload = {
        totalNetWorth,
        cashBalance,
        cashWeight: Number(cashWeight.toFixed(1)),
        hasRealHoldings: holdings.length > 0,
        items: [
          {
            symbol: 'CASH',
            actualPercent: Number(cashWeight.toFixed(1)),
            marketValue: Math.round(cashBalance),
            quantity: 1,
            avgCost: Math.round(cashBalance),
            currentPrice: 1,
            pnlPercent: 0,
            isOrphan: false,
          },
          ...holdings.map(h => ({
            symbol: h.symbol,
            actualPercent: Number(h.weightPercent.toFixed(1)),
            marketValue: Math.round(h.currentValue),
            quantity: h.quantity,
            avgCost: h.avgCost,
            currentPrice: h.lastPrice,
            pnlPercent: Number(h.totalReturnPercent.toFixed(1)),
            isOrphan: !blueprints.some(b => b.symbol?.toUpperCase() === h.symbol?.toUpperCase())
          }))
        ]
      };

      const aiRes = await api.ai.advisor('strategist', blueprints, funData, portfolioId, true, actualHoldingsPayload);

      if (timerRef.current) clearInterval(timerRef.current);
      
      // Merge calculated fallback radar if AI didn't return one
      if (!aiRes.radarData) {
        aiRes.radarData = {
          diversification: Math.min(100, blueprints.length * 12),
          valuation: 70,
          growth: 75,
          risk: 100 - (aiRes.riskScore || 50),
          income: 50
        };
      }

      setStatusMessage('เสร็จสิ้นการวิเคราะห์ กำลังแสดงผล...');
      setProgress(100);
      setAiResult(aiRes);
      setIsStale(false);
      const nowIso = new Date().toISOString();
      setCachedCreatedAt(nowIso);
      setCachedModel('GPT-5.6 Terra (Deep Analysis)');
      setLoadingPhase(4); 
      setModesSummary(prev => ({
        ...prev,
        strategist: {
          found: true,
          isStale: false,
          mode: 'strategist',
          blueprint_hash: '',
          overallGrade: aiRes.overallGrade,
          result: aiRes,
          modelUsed: 'GPT-5.6 Terra (Deep Analysis)',
          createdAt: nowIso
        }
      })); 
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      console.error('[Advisor UI Error]:', err);
      setError(err.message || 'การวิเคราะห์ขัดข้อง กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง');
      setLoadingPhase(0);
    }
  };

  const getGradeColor = (grade: string) => {
    if (!grade) return 'text-sky-400';
    if (grade.startsWith('A')) return 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]';
    if (grade.startsWith('B')) return 'text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]';
    if (grade.startsWith('C')) return 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]';
    return 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]';
  };

  return (
    <div className="bg-[#181B2A] border border-[#232738] rounded-xl p-4 md:p-6 mb-8 mt-4 relative overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="text-2xl">🧠</span> AI Portfolio Advisor
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold tracking-wide">
              Deep Analysis
            </span>
          </h2>
          <p className="text-[13px] text-slate-300 mt-1">
            วิเคราะห์ Blueprint เชิงลึกรอบด้าน ทั้งจุดแข็ง จุดเสี่ยง หุ้นรายตัว จำลองวิกฤต (Stress Test) และพิมพ์เขียวเป้าหมาย
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {aiResult && loadingPhase === 4 && (
            <button 
              onClick={() => runAnalysis()}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:opacity-90 text-white text-[13px] font-bold rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.35)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>🔄</span>
              <span>วิเคราะห์ใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Progress Bar */}
      {loadingPhase > 0 && loadingPhase < 4 && (
        <div className="mb-6 p-4 bg-[#12141F] rounded-lg border border-[#232738] shadow-inner">
          <div className="flex justify-between items-center text-[13px] mb-2.5">
            <div className="flex items-center gap-2 text-slate-200 font-semibold min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
              </span>
              <span className="truncate">{statusMessage || 'กำลังประมวลผล...'}</span>
            </div>
            <span className="text-[#A855F7] font-bold shrink-0 ml-3">{progress}%</span>
          </div>
          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-[#A855F7] to-amber-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-rose-300 text-[13px] font-medium mb-6">
          ⚠️ {error}
        </div>
      )}

      {/* Welcome State */}
      {loadingPhase === 0 && (
        <div className="text-center py-10">
          <p className="text-[14px] text-slate-200 mb-2 font-medium">
            เริ่มวิเคราะห์ความแข็งแกร่งของ Blueprint พอร์ตการลงทุนของคุณ
          </p>
          <p className="text-[13px] text-slate-400 mb-6 max-w-lg mx-auto leading-relaxed">
            เจาะลึก 5 มิติความสมดุล, พิมพ์เขียวในอุดมคติ (Before/After), วินิจฉัยหุ้นรายตัว (Consensus & Verdicts), จำลองวิกฤตตลาด (Stress Test) และแผน Action Roadmap
          </p>
          <button 
            onClick={() => runAnalysis()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:opacity-95 text-white text-[14px] font-extrabold rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2.5 cursor-pointer mx-auto transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-lg">🧠</span>
            <span>เริ่มวิเคราะห์เชิงลึก (Deep Analysis)</span>
          </button>
        </div>
      )}

      {/* Results Section */}
      {loadingPhase === 4 && aiResult && (
        <div className="space-y-6 animate-fade-in">
          {/* Stale Blueprint Warning Banner */}
          {isStale && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-start sm:items-center gap-3">
                <span className="text-xl shrink-0 mt-0.5 sm:mt-0">⚠️</span>
                <div>
                  <div className="text-[14px] font-bold text-amber-300">
                    สัดส่วนพอร์ตหรือรายการหุ้นมีการเปลี่ยนแปลง
                  </div>
                  <div className="text-[13px] text-slate-200 mt-0.5">
                    ผลการวิเคราะห์นี้อ้างอิงจาก Blueprint เดิม{cachedCreatedAt ? ` (${new Date(cachedCreatedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})` : ''} แนะนำให้กดวิเคราะห์ใหม่เพื่อให้ได้คำแนะนำที่ตรงกับพอร์ตปัจจุบัน
                  </div>
                </div>
              </div>
              <button
                onClick={() => runAnalysis()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[13px] shrink-0 transition-colors shadow flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
              >
                <span>🔄</span> วิเคราะห์ใหม่ทันที
              </button>
            </div>
          )}

          {/* Up-to-date Meta Info Strip */}
          {!isStale && cachedCreatedAt && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#12141F] border border-[#232738] rounded-lg text-[13px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                <span className="text-slate-200 font-medium">ผลวิเคราะห์ล่าสุด</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">
                  โหมด: <span className="font-semibold text-purple-300">🧠 Deep Analysis</span>
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">
                  เมื่อ {new Date(cachedCreatedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button
                onClick={() => runAnalysis()}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded text-[13px] border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>🔄</span> วิเคราะห์ใหม่
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* 🏅 LAYER 1: EXECUTIVE INVESTMENT COCKPIT (Always on Top) */}
          {/* ========================================================= */}
          <div className="bg-[#12141F] border border-[#232738] rounded-xl p-4 md:p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#232738] pb-3">
              <div>
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <span className="text-xl">🏅</span> Executive Investment Cockpit
                </h3>
                <p className="text-[13px] text-slate-300 mt-0.5">
                  สรุปผลประเมินสุขภาพพอร์ตโดยรวม 5 มิติ และตัวชี้วัดความเสี่ยงสำคัญ
                </p>
              </div>
              {aiResult.portfolioStyle && (
                <div className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-purple-500/40 rounded-full text-purple-200 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-[0_0_12px_rgba(168,85,247,0.25)]">
                  <span>📊</span> Style: {aiResult.portfolioStyle}
                </div>
              )}
            </div>

            {/* Cockpit Grid: Grade (col 1) + 5-Axis Radar (col 2-3) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {/* Grade Card */}
              <div className="col-span-1 border border-[#2A2E45] rounded-xl p-5 flex flex-col items-center justify-center bg-[#181B2A]/80 shadow-inner">
                <div className="text-[13px] font-bold text-slate-300 mb-1 tracking-wider uppercase">Overall Grade</div>
                <div className={`text-6xl font-black ${getGradeColor(aiResult.overallGrade)} my-1`}>
                  {aiResult.overallGrade || 'B'}
                </div>
                <div className="text-[13px] text-slate-200 text-center font-medium mt-1">
                  {aiResult.overallGrade?.startsWith('A') ? 'พอร์ตสมดุลสูง ศักยภาพการเติบโตยอดเยี่ยม' :
                   aiResult.overallGrade?.startsWith('B') ? 'โครงสร้างดี มีจุดที่สามารถปรับให้แกร่งขึ้นได้' :
                   'ควรกระจายความเสี่ยงและลดการกระจุกตัว'}
                </div>
              </div>

              {/* 5-Axis Health Radar */}
              <div className="col-span-2 border border-[#2A2E45] rounded-xl p-4 bg-[#181B2A]/80 shadow-inner">
                <div className="flex items-center justify-between mb-1 px-2">
                  <span className="text-[13px] font-bold text-slate-200">5-Axis Portfolio Health Radar</span>
                  <span className="text-xs text-slate-400 font-semibold">คะแนนเต็ม 100</span>
                </div>
                <HealthRadar data={aiResult.radarData || {
                  diversification: 75,
                  valuation: 70,
                  growth: 70,
                  risk: 65,
                  income: 50
                }} />
              </div>
            </div>

            {/* Key Metric Badges Strip (4 Cards) with Interactive Tooltips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {/* Card 1: Weighted Beta */}
              <div 
                onClick={() => setActiveMetricModal('beta')}
                className="bg-[#181B2A] border border-[#2A2E45] hover:border-purple-500/50 hover:bg-[#1C2033] rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer group relative shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[13px] text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>Weighted Beta (β)</span>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveMetricModal('beta'); }}
                    className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 group-hover:text-purple-300 group-hover:bg-purple-500/20 text-xs font-bold flex items-center justify-center transition-colors"
                    title="คลิกเพื่อดูคำอธิบายและเกณฑ์วัดผล"
                  >
                    ⓘ
                  </button>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl font-black text-white">{weightedBeta.toFixed(2)}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    weightedBeta > 1.35 
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                      : weightedBeta < 0.85
                      ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {weightedBeta > 1.35 ? 'High Vol' : weightedBeta < 0.85 ? 'Defensive' : 'Balanced'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5 flex items-center justify-between">
                  <span>เทียบ S&P 500 (1.0)</span>
                  <span className="text-purple-400 font-medium group-hover:underline">ดูเกณฑ์ ➔</span>
                </div>
              </div>

              {/* Card 2: Weighted P/E */}
              <div 
                onClick={() => setActiveMetricModal('pe')}
                className="bg-[#181B2A] border border-[#2A2E45] hover:border-purple-500/50 hover:bg-[#1C2033] rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer group relative shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[13px] text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>Weighted P/E</span>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveMetricModal('pe'); }}
                    className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 group-hover:text-purple-300 group-hover:bg-purple-500/20 text-xs font-bold flex items-center justify-center transition-colors"
                    title="คลิกเพื่อดูคำอธิบายและเกณฑ์วัดผล"
                  >
                    ⓘ
                  </button>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl font-black text-purple-300">
                    {weightedPE !== null ? `${weightedPE}x` : 'N/A'}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    weightedPE && weightedPE > 35 
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                      : weightedPE && weightedPE > 25
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {weightedPE && weightedPE > 35 ? 'High Valuation' : weightedPE && weightedPE > 25 ? 'Elevated' : 'Reasonable'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5 flex items-center justify-between">
                  <span>ความถูกแพงของมูลค่า</span>
                  <span className="text-purple-400 font-medium group-hover:underline">ดูเกณฑ์ ➔</span>
                </div>
              </div>

              {/* Card 3: Risk Score */}
              <div 
                onClick={() => setActiveMetricModal('risk')}
                className="bg-[#181B2A] border border-[#2A2E45] hover:border-purple-500/50 hover:bg-[#1C2033] rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer group relative shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[13px] text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>Risk Score</span>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveMetricModal('risk'); }}
                    className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 group-hover:text-purple-300 group-hover:bg-purple-500/20 text-xs font-bold flex items-center justify-center transition-colors"
                    title="คลิกเพื่อดูคำอธิบายและเกณฑ์วัดผล"
                  >
                    ⓘ
                  </button>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl font-black text-white">
                    {aiResult.riskScore || 50}<span className="text-xs text-slate-400 font-normal">/100</span>
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    (aiResult.riskScore || 50) > 65 
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                      : (aiResult.riskScore || 50) >= 50
                      ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {(aiResult.riskScore || 50) > 65 ? 'Elevated' : (aiResult.riskScore || 50) >= 50 ? 'Moderate' : 'Safe'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5 flex items-center justify-between">
                  <span>ความเปราะบางของพอร์ต</span>
                  <span className="text-purple-400 font-medium group-hover:underline">ดูเกณฑ์ ➔</span>
                </div>
              </div>

              {/* Card 4: Cash Allocation */}
              <div 
                onClick={() => setActiveMetricModal('cash')}
                className="bg-[#181B2A] border border-[#2A2E45] hover:border-purple-500/50 hover:bg-[#1C2033] rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer group relative shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[13px] text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>Cash Allocation</span>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveMetricModal('cash'); }}
                    className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 group-hover:text-purple-300 group-hover:bg-purple-500/20 text-xs font-bold flex items-center justify-center transition-colors"
                    title="คลิกเพื่อดูคำอธิบายและเกณฑ์วัดผล"
                  >
                    ⓘ
                  </button>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl font-black text-emerald-400">{cashPercent}%</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    cashPercent >= 10 && cashPercent <= 25 
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                      : cashPercent > 25
                      ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {cashPercent > 25 ? 'Cash Drag' : cashPercent < 5 ? 'Low Buffer' : 'Optimal'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5 flex items-center justify-between">
                  <span>กระสุนสำรองยามวิกฤต</span>
                  <span className="text-purple-400 font-medium group-hover:underline">ดูเกณฑ์ ➔</span>
                </div>
              </div>
            </div>

            {/* Alert Banners: Concentration & Dividend Health */}
            {(aiResult.concentrationRisk || aiResult.dividendHealth) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {aiResult.concentrationRisk && (
                  <div className="border border-amber-500/30 rounded-lg p-3.5 bg-amber-500/10 flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">⚠️</span>
                    <div>
                      <h4 className="text-amber-300 font-bold text-[13px] mb-0.5">Concentration Risk</h4>
                      <p className="text-[13px] text-slate-200 leading-relaxed">{aiResult.concentrationRisk}</p>
                    </div>
                  </div>
                )}
                {aiResult.dividendHealth && (
                  <div className="border border-cyan-500/30 rounded-lg p-3.5 bg-cyan-500/10 flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">💰</span>
                    <div>
                      <h4 className="text-cyan-300 font-bold text-[13px] mb-0.5">Dividend Health</h4>
                      <p className="text-[13px] text-slate-200 leading-relaxed">{aiResult.dividendHealth}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 📑 LAYER 2: SEGMENTED TABS NAVIGATION                     */}
          {/* ========================================================= */}
          <div className="flex border-b border-[#232738] gap-1 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-4 py-2.5 rounded-t-lg font-bold text-[13px] transition-all flex items-center gap-2 shrink-0 border-b-2 ${
                activeTab === 'plan'
                  ? 'border-amber-400 text-amber-300 bg-[#12141F]'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🎯 แผนปรับพอร์ต (Portfolio Plan)</span>
              {aiResult.idealBlueprint?.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black">
                  {aiResult.idealBlueprint.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('stocks')}
              className={`px-4 py-2.5 rounded-t-lg font-bold text-[13px] transition-all flex items-center gap-2 shrink-0 border-b-2 ${
                activeTab === 'stocks'
                  ? 'border-purple-400 text-purple-300 bg-[#12141F]'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🔎 หุ้นรายตัว (Individual Stocks)</span>
              {aiResult.stockVerdicts?.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-black">
                  {aiResult.stockVerdicts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('stress')}
              className={`px-4 py-2.5 rounded-t-lg font-bold text-[13px] transition-all flex items-center gap-2 shrink-0 border-b-2 ${
                activeTab === 'stress'
                  ? 'border-rose-400 text-rose-300 bg-[#12141F]'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🌪️ จำลองวิกฤต (Stress Test & Risk)</span>
              {aiResult.stressTest?.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-black">
                  {aiResult.stressTest.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('macro')}
              className={`px-4 py-2.5 rounded-t-lg font-bold text-[13px] transition-all flex items-center gap-2 shrink-0 border-b-2 ${
                activeTab === 'macro'
                  ? 'border-sky-400 text-sky-300 bg-[#12141F]'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>🌐 ภาพรวม & สภาพตลาด (Macro & Overview)</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: 🎯 แผนปรับพอร์ต (Portfolio Plan)                     */}
          {/* ========================================================= */}
          {activeTab === 'plan' && (
            <div className="space-y-6 animate-fade-in">
              {/* Before vs After Donut Comparison */}
              {aiResult.idealBlueprint && aiResult.idealBlueprint.length > 0 && (
                <BeforeAfterDonut items={aiResult.idealBlueprint} isActualPortfolio={hasRealHoldings} />
              )}

              {/* Ideal Blueprint Allocation Table */}
              {aiResult.idealBlueprint && aiResult.idealBlueprint.length > 0 && (
                <div className="border border-amber-500/30 rounded-xl p-4 md:p-5 bg-[#12141F] shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                    <div>
                      <h4 className="text-amber-400 font-bold text-sm flex items-center gap-2">
                        <span className="text-base">🎯</span> ตารางพิมพ์เขียวเป้าหมายเชิงกลยุทธ์ (Ideal Blueprint)
                      </h4>
                      <p className="text-[13px] text-slate-300 mt-0.5">
                        {hasRealHoldings 
                          ? 'เปรียบเทียบสัดส่วนพอร์ตจริง กับแผนพิมพ์เขียวของคุณ และคำแนะนำที่ AI จอมมารปรับทัพ'
                          : 'เปรียบเทียบสัดส่วนเป้าหมายปัจจุบันกับสัดส่วนในอุดมคติที่ AI Deep Analysis แนะนำ'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => setIsConfirmModalOpen(true)}
                        disabled={isApplying}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[13px] font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-1.5 cursor-pointer"
                        title="คลิกเพื่อนำสัดส่วนเป้าหมายที่ AI แนะนำไปปรับใช้กับ Blueprint ทันที"
                      >
                        <span>⚡</span> ปรับใช้สัดส่วนนี้ (Apply)
                      </button>

                      {previousBlueprintBackup && (
                        <button
                          onClick={handleUndoAllocation}
                          disabled={isApplying}
                          className="px-3 py-1.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border border-sky-500/50 text-[13px] font-bold transition-all shadow-[0_0_12px_rgba(56,189,248,0.25)] flex items-center gap-1.5 cursor-pointer"
                          title="กู้คืนสัดส่วน Blueprint เดิมก่อนปรับใช้"
                        >
                          <span>↩️</span> ย้อนกลับสัดส่วนเดิม (Undo)
                        </button>
                      )}

                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-500/10 text-amber-300/80 border border-amber-500/20">
                        OPTIMIZED ALLOCATION
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#232738] text-[13px] text-slate-300">
                          <th className="py-2.5 px-3 font-semibold">สินทรัพย์</th>
                          <th className="py-2.5 px-3 font-semibold">บทบาทเชิงกลยุทธ์</th>
                          <th className="py-2.5 px-3 font-semibold text-right">
                            {hasRealHoldings ? 'พอร์ตจริง' : 'ปัจจุบัน'}
                          </th>
                          {hasRealHoldings && (
                            <th className="py-2.5 px-3 font-semibold text-right text-slate-400">
                              แผนคุณ
                            </th>
                          )}
                          <th className="py-2.5 px-3 font-semibold text-right text-amber-300">AI แนะนำ</th>
                          <th className="py-2.5 px-3 font-semibold text-center">การเปลี่ยนผ่าน</th>
                          <th className="py-2.5 px-3 font-semibold text-center">ส่วนต่าง</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#232738]/60">
                        {aiResult.idealBlueprint.map((item: any, idx: number) => {
                          const change = Number(item.change ?? (item.idealPercent - item.currentPercent));
                          const isNew = (item.currentPercent || 0) === 0 && item.idealPercent > 0;
                          const userPlanVal = userBlueprintMap.get((item.symbol || '').toUpperCase());
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white text-[14px]">{item.symbol}</span>
                                  {isNew && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                      ✨ NEW
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-[13px] text-slate-200">
                                {item.role || 'แกนหลักการเติบโต'}
                              </td>
                              <td className="py-3 px-3 text-[13px] text-slate-200 font-semibold text-right">
                                {item.currentPercent}%
                              </td>
                              {hasRealHoldings && (
                                <td className="py-3 px-3 text-[13px] text-slate-400 text-right">
                                  {typeof userPlanVal === 'number' ? `${userPlanVal}%` : '-'}
                                </td>
                              )}
                              <td className="py-3 px-3 text-[14px] text-amber-300 font-black text-right">
                                {item.idealPercent}%
                              </td>
                              {/* Visual Shift Bar */}
                              <td className="py-3 px-3">
                                <div className="w-24 mx-auto bg-slate-800/80 rounded-full h-2 overflow-hidden flex">
                                  <div
                                    style={{ width: `${Math.min(100, item.currentPercent * 2)}%` }}
                                    className="bg-slate-500 h-full"
                                    title={`ปัจจุบัน: ${item.currentPercent}%`}
                                  />
                                  <div
                                    style={{ width: `${Math.min(100, Math.abs(change) * 2)}%` }}
                                    className={`h-full ${change > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                    title={`ปรับเปลี่ยน: ${change > 0 ? `+${change}%` : `${change}%`}`}
                                  />
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${
                                  change > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                  change < 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                  'bg-slate-700/50 text-slate-300 border border-slate-600'
                                }`}>
                                  {change > 0 ? `+${change.toFixed(1)}%` : change < 0 ? `${change.toFixed(1)}%` : 'คงที่ (0%)'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Strategic Action Roadmap Stepper */}
              {aiResult.actionRoadmap && aiResult.actionRoadmap.length > 0 && (
                <TimelineStepper roadmap={aiResult.actionRoadmap} />
              )}

              {/* Actionable Suggestions */}
              {aiResult.suggestions && aiResult.suggestions.length > 0 && (
                <div>
                  <h4 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
                    <span>🔧</span> คำแนะนำปรับสัดส่วนเพิ่มเติม (Actionable Suggestions)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aiResult.suggestions.map((s: any, i: number) => (
                      <div key={i} className="border border-[#232738] bg-[#12141F] rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                              s.action === 'ADD' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                              s.action === 'REDUCE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                              s.action === 'SWAP' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                              'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}>
                              {s.action}
                            </span>
                            <span className="font-bold text-white text-[14px]">{s.symbol} {s.percent}%</span>
                          </div>
                          <p className="text-[13px] text-slate-200 mb-4 leading-relaxed font-normal">{s.reason}</p>
                        </div>
                        <button 
                          onClick={() => onApplySuggestion && onApplySuggestion(s)}
                          className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg text-[13px] font-bold transition-colors border border-emerald-500/30 cursor-pointer"
                        >
                          นำคำแนะนำไปปรับใช้
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: 🔎 หุ้นรายตัว (Individual Stocks)                   */}
          {/* ========================================================= */}
          {activeTab === 'stocks' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <div>
                  <h4 className="text-white font-bold text-sm flex items-center gap-2">
                    <span className="text-base">🔎</span> เจาะลึกรายตัว (Forward-Looking Stock Verdicts)
                  </h4>
                  <p className="text-[13px] text-slate-300 mt-0.5">
                    ประเมินคุณภาพหุ้นรายตัวพร้อมเป้าหมายราคา Wall Street Consensus, EPS Growth และ Earnings Beat Streak
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 self-start sm:self-auto">
                  {aiResult.stockVerdicts?.length || 0} รายการ
                </span>
              </div>

              {aiResult.stockVerdicts && aiResult.stockVerdicts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiResult.stockVerdicts.map((v: any, idx: number) => {
                    const upperSym = (v.symbol || '').toUpperCase();
                    const altSym = upperSym.includes('.') ? upperSym.replace('.', '-') : upperSym.includes('-') ? upperSym.replace('-', '.') : upperSym;
                    const funData = fundamentals[upperSym] || fundamentals[altSym] || fundamentals[v.symbol];
                    return (
                      <StockVerdictCard
                        key={idx}
                        verdict={v}
                        fundamentals={funData}
                        actualHolding={actualHoldingsMap.get(upperSym) || actualHoldingsMap.get(altSym) || null}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-[#12141F] border border-[#232738] rounded-xl text-slate-300 text-[13px]">
                  ไม่มีข้อมูลการวิเคราะห์หุ้นรายตัว กรุณากดวิเคราะห์ Deep Analysis ใหม่อีกครั้ง
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: 🌪️ จำลองวิกฤต (Stress Test & Risk)                  */}
          {/* ========================================================= */}
          {activeTab === 'stress' && (
            <div className="space-y-6 animate-fade-in">
              {/* Stress Test Scenarios */}
              {aiResult.stressTest && aiResult.stressTest.length > 0 ? (
                <div className="border border-rose-900/30 rounded-xl p-4 md:p-5 bg-gradient-to-b from-rose-950/20 via-[#12141F] to-[#12141F] shadow-lg space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <h4 className="text-rose-400 font-bold text-sm flex items-center gap-2">
                        <span className="text-base">🌪️</span> Portfolio Stress Test (สถานการณ์จำลองวิกฤต)
                      </h4>
                      <p className="text-[13px] text-slate-300 mt-0.5">
                        ประเมินความทนทานต่อสภาวะตลาดช็อกและระดับ Drawdown ที่อาจเกิดขึ้นกับพอร์ต
                      </p>
                    </div>
                    {totalNetWorth > 0 && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 self-start sm:self-auto">
                        มูลค่าพอร์ต: {currency === 'THB' ? '฿' : '$'}{Math.round(totalNetWorth).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiResult.stressTest.map((test: any, i: number) => (
                      <DrawdownMeter
                        key={i}
                        scenario={test.scenario}
                        estDrawdown={test.estDrawdown}
                        impact={test.impact}
                        portfolioTotalValue={totalNetWorth}
                        currency={currency}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-[#12141F] border border-[#232738] rounded-xl text-slate-300 text-[13px]">
                  ไม่มีข้อมูลการจำลอง Stress Test กรุณากดวิเคราะห์ Deep Analysis ใหม่อีกครั้ง
                </div>
              )}

              {/* Risk Gauge & Sector Gap Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-700/80 rounded-xl p-4 bg-[#12141F] shadow-md">
                  <RiskGauge score={aiResult.riskScore || 50} beta={weightedBeta} />
                </div>
                <div className="border border-slate-700/80 rounded-xl p-4 bg-[#12141F] overflow-x-auto shadow-md">
                  <SectorGapChart portfolioSectors={portfolioSectors} />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: 🌐 ภาพรวม & สภาพตลาด (Macro & Overview)             */}
          {/* ========================================================= */}
          {activeTab === 'macro' && (() => {
            const macroPills = extractMacroPills(aiResult.macroAnalysis || '');
            return (
              <div className="space-y-6 animate-fade-in">
                {/* Macro Analysis */}
                {aiResult.macroAnalysis && (
                  <div className="border border-purple-500/30 rounded-xl p-5 bg-gradient-to-r from-purple-950/25 via-[#181B2A] to-blue-950/20 shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3 gap-2">
                      <h4 className="text-purple-300 font-bold text-sm flex items-center gap-2">
                        <span className="text-base">🌐</span> การวิเคราะห์ภาพรวมเศรษฐกิจและธีมตลาด (Macro & Market Context)
                      </h4>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 self-start sm:self-auto">
                        CHIEF STRATEGIST PERSPECTIVE
                      </span>
                    </div>

                    {/* Macro Theme Pills */}
                    {macroPills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {macroPills.map((pill, idx) => (
                          <span key={idx} className={`text-xs font-bold px-2.5 py-1 rounded-full border ${pill.color} shadow-sm`}>
                            {pill.label}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-[14px] text-slate-200 leading-relaxed font-normal">
                      {aiResult.macroAnalysis}
                    </p>
                  </div>
                )}

                {/* Strengths & Weaknesses (Visual Cards with Severity) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="border border-emerald-500/30 rounded-xl p-4 md:p-5 bg-gradient-to-b from-emerald-950/15 to-[#12141F] shadow-md">
                    <div className="flex items-center justify-between mb-3.5">
                      <h4 className="text-emerald-400 font-bold flex items-center gap-2 text-sm">
                        <span>💪</span> จุดแข็งเชิงกลยุทธ์ (Strengths)
                      </h4>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {aiResult.strengths?.length || 0} จุดเด่น
                      </span>
                    </div>
                    <div className="space-y-3">
                      {aiResult.strengths?.map((s: any, i: number) => {
                        const sTitle = typeof s === 'object' && s !== null ? (s.title || 'จุดแข็งเชิงกลยุทธ์') : 'จุดแข็งเชิงกลยุทธ์';
                        const sDesc = typeof s === 'object' && s !== null ? (s.description || '') : String(s || '');
                        const tier = getStrengthTier(sTitle, sDesc);
                        return (
                          <div key={i} className={`p-3.5 rounded-xl border ${tier.border} ${tier.bg} transition-all`}>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h5 className="font-bold text-white text-[14px] flex items-center gap-1.5">
                                <span className="text-emerald-400 font-black text-sm">✓</span> {sTitle}
                              </h5>
                              <span className={`text-xs font-black px-2 py-0.5 rounded shrink-0 border ${tier.badge}`}>
                                {tier.label}
                              </span>
                            </div>
                            <p className="text-[13px] text-slate-200 leading-relaxed font-normal pl-4">
                              {sDesc}
                            </p>
                          </div>
                        );
                      })}
                      {(!aiResult.strengths || aiResult.strengths.length === 0) && (
                        <div className="text-[13px] text-slate-300 p-4 text-center bg-slate-900/40 rounded-lg">
                          ยังไม่พบจุดแข็งที่โดดเด่น
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weaknesses */}
                  <div className="border border-rose-500/30 rounded-xl p-4 md:p-5 bg-gradient-to-b from-rose-950/15 to-[#12141F] shadow-md">
                    <div className="flex items-center justify-between mb-3.5">
                      <h4 className="text-rose-400 font-bold flex items-center gap-2 text-sm">
                        <span>⚠️</span> จุดเสี่ยงและเนื้อร้าย (Weaknesses)
                      </h4>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {aiResult.weaknesses?.length || 0} แผลเสี่ยง
                      </span>
                    </div>
                    <div className="space-y-3">
                      {aiResult.weaknesses?.map((w: any, i: number) => {
                        const wTitle = typeof w === 'object' && w !== null ? (w.title || 'จุดเสี่ยงและแผลในพอร์ต') : 'จุดเสี่ยงและแผลในพอร์ต';
                        const wDesc = typeof w === 'object' && w !== null ? (w.description || '') : String(w || '');
                        const sev = getWeaknessSeverity(wTitle, wDesc);
                        return (
                          <div key={i} className={`p-3.5 rounded-xl border ${sev.border} ${sev.bg} transition-all`}>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h5 className="font-bold text-white text-[14px] flex items-center gap-1.5">
                                <span className="text-rose-400 font-black text-sm">!</span> {wTitle}
                              </h5>
                              <span className={`text-xs font-black px-2 py-0.5 rounded shrink-0 border ${sev.badge}`}>
                                {sev.label}
                              </span>
                            </div>
                            <p className="text-[13px] text-slate-200 leading-relaxed font-normal pl-4">
                              {wDesc}
                            </p>
                          </div>
                        );
                      })}
                      {(!aiResult.weaknesses || aiResult.weaknesses.length === 0) && (
                        <div className="text-[13px] text-slate-300 p-4 text-center bg-slate-900/40 rounded-lg">
                          ไม่พบจุดเสี่ยงที่มีนัยสำคัญ
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Missing Exposure (Rich Visual Cards) */}
                {aiResult.missingExposure && aiResult.missingExposure.length > 0 && (
                  <div className="border border-sky-500/30 bg-gradient-to-b from-sky-950/15 via-[#12141F] to-[#12141F] rounded-xl p-4 md:p-5 shadow-lg space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div>
                        <h4 className="text-sky-300 font-bold text-sm flex items-center gap-2">
                          <span>🔍</span> หลุมพรางที่ขาดหายไป (Missing Tactical Exposures)
                        </h4>
                        <p className="text-[13px] text-slate-300 mt-0.5">
                          กลุ่มอุตสาหกรรมหรือสินทรัพย์ที่พอร์ตยังขาด เพื่อสร้างความยืดหยุ่นและเกราะป้องกันในทุกวัฏจักร
                        </p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 self-start sm:self-auto">
                        PORTFOLIO GAPS
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                      {aiResult.missingExposure.map((item: any, idx: number) => {
                        const exp = normalizeMissingExposure(item);
                        return (
                          <div
                            key={idx}
                            className="border border-sky-500/25 bg-[#151828] hover:border-sky-500/50 rounded-xl p-4 flex flex-col justify-between transition-colors shadow-sm"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="font-bold text-white text-[14px] flex items-center gap-1.5">
                                  <span>{exp.icon}</span> {exp.sector}
                                </span>
                                <span className="text-xs font-black px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                                  {exp.priority}
                                </span>
                              </div>
                              <p className="text-[13px] text-slate-200 leading-relaxed mb-3 font-normal">
                                {exp.reason}
                              </p>
                            </div>
                            {exp.suggestion && (
                              <div className="pt-2.5 border-t border-[#232738] flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium">สินทรัพย์แนะนำ:</span>
                                <span className="font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                                  {exp.suggestion}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Metric Guide / Explanation Modal */}
      {activeMetricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#181B2A] border border-purple-500/40 rounded-2xl max-w-xl w-full p-6 shadow-[0_0_35px_rgba(168,85,247,0.25)] text-white relative">
            {/* Header with Close */}
            <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-[#232738]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-2xl shrink-0">
                  {METRIC_GUIDES[activeMetricModal].icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {METRIC_GUIDES[activeMetricModal].title}
                  </h3>
                  <p className="text-[13px] text-slate-300">
                    {METRIC_GUIDES[activeMetricModal].subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveMetricModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Switch Tabs */}
            <div className="grid grid-cols-4 gap-1.5 mb-5 p-1 bg-[#12141F] rounded-lg border border-[#232738]">
              {(['beta', 'pe', 'risk', 'cash'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveMetricModal(key)}
                  className={`py-1.5 px-2 rounded-md text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeMetricModal === key
                      ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span>{METRIC_GUIDES[key].icon}</span>
                  <span className="hidden sm:inline">{key === 'beta' ? 'Beta' : key === 'pe' ? 'P/E' : key === 'risk' ? 'Risk' : 'Cash'}</span>
                </button>
              ))}
            </div>

            {/* Content Sections */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* 1. คืออะไร */}
              <div>
                <h4 className="text-[13px] font-bold text-purple-300 flex items-center gap-1.5 mb-1">
                  <span>📌</span> คืออะไร (Concept)
                </h4>
                <p className="text-[13px] text-slate-200 leading-relaxed bg-[#12141F] p-3 rounded-lg border border-[#232738]">
                  {METRIC_GUIDES[activeMetricModal].whatIsIt}
                </p>
              </div>

              {/* 2. วัดผลยังไง */}
              <div>
                <h4 className="text-[13px] font-bold text-sky-300 flex items-center gap-1.5 mb-1">
                  <span>📐</span> วัดผลยังไง (Measurement & Formula)
                </h4>
                <p className="text-[13px] text-slate-200 leading-relaxed bg-[#12141F] p-3 rounded-lg border border-[#232738]">
                  {METRIC_GUIDES[activeMetricModal].howToMeasure}
                </p>
              </div>

              {/* 3. แปลผลยังไง */}
              <div>
                <h4 className="text-[13px] font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                  <span>🔍</span> แปลผลยังไง (Interpretation)
                </h4>
                <p className="text-[13px] text-slate-200 leading-relaxed bg-[#12141F] p-3 rounded-lg border border-[#232738]">
                  {METRIC_GUIDES[activeMetricModal].howToInterpret}
                </p>
              </div>

              {/* 4. เกณฑ์ ดี vs ไม่ดี */}
              <div>
                <h4 className="text-[13px] font-bold text-emerald-300 flex items-center gap-1.5 mb-2">
                  <span>⚖️</span> เกณฑ์ ดี vs เสี่ยง (Benchmarks & Status)
                </h4>
                <div className="space-y-2">
                  {METRIC_GUIDES[activeMetricModal].benchmarks.map((b, i) => (
                    <div 
                      key={i} 
                      className="p-3 bg-[#12141F] rounded-lg border border-[#232738] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${b.color}`}>
                          {b.label}
                        </span>
                        <span className="text-[13px] font-black text-white">{b.range}</span>
                      </div>
                      <p className="text-[13px] text-slate-300 sm:text-right flex-1 sm:max-w-[65%]">
                        {b.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Portfolio Reading Banner */}
              <div className="p-3 bg-gradient-to-r from-purple-950/40 via-[#12141F] to-indigo-950/30 rounded-xl border border-purple-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-semibold">ค่าปัจจุบันของ Blueprint พอร์ตคุณ</div>
                  <div className="text-base font-black text-white mt-0.5">
                    {activeMetricModal === 'beta' ? `${weightedBeta.toFixed(2)} (เทียบตลาด 1.0)` :
                     activeMetricModal === 'pe' ? (weightedPE !== null ? `${weightedPE}x (Forward/Trailing)` : 'N/A') :
                     activeMetricModal === 'risk' ? `${aiResult.riskScore || 50} / 100` :
                     `${cashPercent}% (สัดส่วนเป้าหมาย)`}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Live จาก Blueprint
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Close Button */}
            <div className="mt-5 pt-3 border-t border-[#232738] flex justify-end">
              <button
                onClick={() => setActiveMetricModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-[13px] transition-colors cursor-pointer"
              >
                เข้าใจแล้ว / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Applying Ideal Blueprint */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#181B2A] border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-[0_0_30px_rgba(245,158,11,0.25)] text-white relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
                🎯
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  ยืนยันการปรับสัดส่วน Blueprint ตามคำแนะนำ
                </h3>
                <p className="text-[13px] text-slate-300">
                  AI Deep Analysis Optimized Allocation
                </p>
              </div>
            </div>

            <p className="text-[13px] text-slate-200 leading-relaxed mb-3">
              ระบบจะอัปเดตสัดส่วนเป้าหมาย (Target %) ของสินทรัพย์ทั้งหมด {aiResult.idealBlueprint?.length || 0} รายการให้ตรงตามพิมพ์เขียวแนะนำในตารางทันที
            </p>

            <div className="bg-[#12141F] border border-[#232738] rounded-xl p-3 mb-4 max-h-48 overflow-y-auto divide-y divide-[#232738]/60">
              {aiResult.idealBlueprint?.map((item: any, idx: number) => {
                const change = Number(item.change ?? (item.idealPercent - item.currentPercent));
                return (
                  <div key={idx} className="flex justify-between items-center py-1.5 px-2 text-[13px]">
                    <div className="font-semibold text-white">{item.symbol}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{item.currentPercent}%</span>
                      <span className="text-slate-500">➔</span>
                      <span className="font-bold text-amber-300">{item.idealPercent}%</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                        change > 0 ? 'bg-emerald-500/20 text-emerald-300' :
                        change < 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {change > 0 ? `+${change}%` : `${change}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-[13px] text-blue-200 flex items-center gap-2 mb-6">
              <span>💡</span>
              <span>ระบบจะบันทึก Snapshot สัดส่วนเดิมไว้ให้อัตโนมัติ สามารถกดย้อนกลับ (Undo) ได้ทุกเมื่อ</span>
            </div>

            <div className="flex justify-end items-center gap-3">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isApplying}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[13px] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleApplyIdealBlueprint}
                disabled={isApplying}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-lg text-[13px] transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-2 cursor-pointer"
              >
                {isApplying ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>กำลังปรับสัดส่วน...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>ยืนยันการปรับสัดส่วน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast Banner */}
      {applySuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#181B2A] border border-emerald-500/40 rounded-xl p-4 shadow-[0_0_25px_rgba(52,211,153,0.3)] text-white flex items-center gap-3 animate-fade-in max-w-md">
          <span className="text-xl">🎉</span>
          <div className="text-[13px] text-slate-200 font-medium flex-1">
            {applySuccessMessage}
          </div>
          {previousBlueprintBackup && (
            <button
              onClick={handleUndoAllocation}
              className="px-3 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>↩️</span> Undo
            </button>
          )}
          <button
            onClick={() => setApplySuccessMessage(null)}
            className="text-slate-400 hover:text-white text-sm shrink-0 ml-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
