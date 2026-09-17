import React from 'react';
import { useDossierStore } from '../../../../stores/dossierStore';
import {
  Brain,
  Globe2,
  ShieldCheck,
  Target,
  Flag,
  AlertOctagon,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';

// Curated Thesis Map for the 13 Stocks
interface StockThesisProfile {
  trendTitle: string;
  trendDesc: string;
  tamCurrentB: number;
  tamFuture3YB: number;
  tamUnit: string;
  marketSharePct: number;
  catalysts: Array<{ period: string; title: string; desc: string }>;
  moats: Array<{ title: string; score: number; maxScore: number; reason: string }>;
  breachFlags: string[];
  scenarios: {
    bear: { cagr: string; multiple: string; desc: string };
    base: { cagr: string; multiple: string; desc: string };
    bull: { cagr: string; multiple: string; desc: string };
  };
  milestones: Array<{ year: string; goal: string; status: 'DONE' | 'PROGRESS' | 'PENDING' }>;
}

export const THESIS_MAP: Record<string, StockThesisProfile> = {
  NVDA: {
    trendTitle: 'Accelerated Computing & AI Sovereign Data Centers',
    trendDesc: 'การเปลี่ยนผ่านจาก General-purpose CPU ไปสู่ GPU Accelerated Computing ทั่วโลก ทั้ง Hyper-scalers, ประเทศต่างๆ (Sovereign AI) และ Enterprise',
    tamCurrentB: 250,
    tamFuture3YB: 1000,
    tamUnit: '$B',
    marketSharePct: 88,
    catalysts: [
      { period: '2024-2025', title: 'Blackwell B200 / GB200 Ramp', desc: 'เริ่มส่งมอบชิปตระกูล Blackwell เต็มกำลังการผลิต พร้อมความต้องการล้นข้ามปี' },
      { period: '2025-2026', title: 'Rubin Architecture Debut', desc: 'สถาปัตยกรรมรุ่นถัดไป Rubin พร้อมหน่วยความจำ HBM4 ผลักดันขีดจำกัด AI' },
      { period: 'Ongoing', title: 'CUDA Software Ecosystem Lock-in', desc: 'นักพัฒนา 5+ ล้านคนทั่วโลกเขียนโค้ดบน CUDA ย้ายไปค่ายอื่นยากมาก' }
    ],
    moats: [
      { title: 'CUDA Software Moat', score: 10, maxScore: 10, reason: 'คูเมืองซอฟต์แวร์ที่แข็งแกร่งที่สุดในโลกไอที ย้ายค่ายต้องเขียนโปรแกรมใหม่หมด' },
      { title: 'Full-Stack Architecture', score: 9.5, maxScore: 10, reason: 'ไม่ได้ขายแค่ชิป แต่ขายทั้ง Rack, NVLink Switch, InfiniBand Network' },
      { title: 'Scale & R&D Velocity', score: 9.5, maxScore: 10, reason: 'ทุ่มงบวิจัยและพัฒนาสูงที่สุด ออกชิปรุ่นใหม่ทุก 1 ปีตามคำมั่น' }
    ],
    breachFlags: [
      'Gross Margin ดิ่งต่ำกว่า 68% ส่อแววแพลตฟอร์ม ASICs เริ่มแย่งตลาด',
      'Hyper-scalers (MSFT/GOOG/META) เริ่มตัดลดงบ AI CapEx ลงอย่างมีนัยสำคัญ'
    ],
    scenarios: {
      bear: { cagr: '14%', multiple: '1.48x', desc: 'AI CapEx ชะลอตัว ชิป Blackwell เลื่อนส่งมอบ P/E หดเหลือ 25x' },
      base: { cagr: '26%', multiple: '2.0x (1 เด้ง)', desc: 'Blackwell + Rubin ขายดีตามนัด กำไรโต 30% YoY P/E ทรงตัวที่ 32x ใน 3 ปี' },
      bull: { cagr: '38%', multiple: '2.6x - 3.0x', desc: 'Sovereign AI ระเบิด + องค์กรนำ AI Agent มาใช้จริงดันกำไรทะลุเป้า' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: 'Blackwell ส่งมอบตามกำหนด รายได้ทะลุ $120B+', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'Rubin Tape-out และขยาย Data Center Network', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'ขยายสู่ Physical AI & Robotics Ecosystem', status: 'PENDING' }
    ]
  },
  TSM: {
    trendTitle: 'Undisputed Monopoly in Leading-Edge Chip Foundry',
    trendDesc: 'ผู้ผูกขาดการรับจ้างผลิตชิปขั้นสูง 3nm และ 2nm ให้กับทั้ง Apple, Nvidia, AMD, Qualcomm ขาด TSM โลก AI หยุดเดิน',
    tamCurrentB: 150,
    tamFuture3YB: 350,
    tamUnit: '$B',
    marketSharePct: 92,
    catalysts: [
      { period: '2025', title: '2nm (N2) Mass Production', desc: 'เริ่มผลิตเทคโนโลยี 2 นาโนเมตรเชิงพาณิชย์ ลูกค้าจองคิวแน่นเอี้ยด' },
      { period: '2025-2026', title: 'CoWoS Packaging Expansion', desc: 'กำลังผลิตแพ็กเกจจิ้งขั้นสูง CoWoS โตเท่าตัว ปลดล็อกคอขวด AI' },
      { period: '2026', title: 'Arizona & Japan Fabs Yield Ramp', desc: 'โรงงานต่างประเทศเริ่มสร้างรายได้ ลดความเสี่ยงทางภูมิรัฐศาสตร์' }
    ],
    moats: [
      { title: 'Manufacturing Supremacy', score: 10, maxScore: 10, reason: 'Yield rate สูงที่สุดในโลก ไม่มีโรงหล่อใดแข่งขันในระดับ 3nm/2nm ได้' },
      { title: 'High Switching Cost', score: 9.5, maxScore: 10, reason: 'การย้ายโรงหล่อชิปต้องใช้เวลาและงบประมาณมหาศาล 2-3 ปี' },
      { title: 'Enormous CapEx Barrier', score: 10, maxScore: 10, reason: 'งบลงทุนปีละ $30B+ กีดกันคู่แข่งหน้าใหม่อย่างสิ้นเชิง' }
    ],
    breachFlags: [
      'ความขัดแย้งทางทหารบริเวณช่องแคบไต้หวัน',
      'Yield ของโรงงาน 2nm มีปัญหาไม่สามารถเริ่มผลิตตามกำหนดได้'
    ],
    scenarios: {
      bear: { cagr: '12%', multiple: '1.40x', desc: 'ปัญหาภูมิรัฐศาสตร์กดดัน P/E ติดหล่มอยู่ที่ 16x แม้กำไรยังเติบโต' },
      base: { cagr: '24%', multiple: '2.0x (1 เด้ง)', desc: '2nm สำเร็จ + CoWoS ขยายตัว กำไรโต 20%+ P/E ขยับขึ้นสู่ 22x' },
      bull: { cagr: '34%', multiple: '2.4x - 2.8x', desc: 'ราคาขายต่อแผ่นเวเฟอร์ปรับขึ้นต่อเนื่อง ตลาดคลายกังวลความเสี่ยงไต้หวัน' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: '3nm เต็มกำลังผลิต ขยาย CoWoS เพิ่ม 100%', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'โรงงาน N2 สำเร็จพร้อมส่งมอบชิปรุ่นแรก', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'โรงงานต่างประเทศเพิ่มสัดส่วนรายได้ 15%+', status: 'PENDING' }
    ]
  },
  VRT: {
    trendTitle: 'Thermal & Power Infrastructure for High-Density AI',
    trendDesc: 'ชิป AI ร้อนขึ้น 10 เท่า ต้องเปลี่ยนจากพัดลมระบายความร้อนเป็นระบบของเหลว (Liquid Cooling) Vertiv คือผู้นำเบอร์ 1',
    tamCurrentB: 35,
    tamFuture3YB: 95,
    tamUnit: '$B',
    marketSharePct: 42,
    catalysts: [
      { period: '2024-2025', title: 'Liquid Cooling Retrofit Wave', desc: 'การยกเครื่อง Data Center เก่าเพื่อรองรับแร็ค AI รุ่นใหม่' },
      { period: '2025', title: 'Nvidia Reference Design Partnership', desc: 'เป็นพาร์ตเนอร์หลักที่ร่วมออกแบบระบบระบายความร้อนกับ Nvidia' },
      { period: '2025-2026', title: 'Backlog Conversion Ramp', desc: 'ยอดจองล่วงหน้าสูงสุดเป็นประวัติการณ์ ทะยอยส่งมอบต่อเนื่อง' }
    ],
    moats: [
      { title: 'Direct Liquid Cooling Lead', score: 9.0, maxScore: 10, reason: 'เทคโนโลยี Coolant Distribution Unit (CDU) ได้รับการรับรองจากบิ๊กเทค' },
      { title: 'Global Field Service Network', score: 8.5, maxScore: 10, reason: 'มีวิศวกรซัพพอร์ตหน้างานกว่า 3,500 คนทั่วโลก' },
      { title: 'Critical Mission Reliability', score: 9.0, maxScore: 10, reason: 'Data Center ดับวินาทีเดียวเสียหายหลายล้านเหรียญ ไม่มีใครกล้าใช้ของโนเนม' }
    ],
    breachFlags: [
      'คู่แข่งหน้าใหม่ (เช่น Supermicro, Schneider) ตัดราคา CDU รุนแรง',
      'Gross Margin ลดลงต่ำกว่า 32% ติดต่อกัน 2 ไตรมาส'
    ],
    scenarios: {
      bear: { cagr: '15%', multiple: '1.50x', desc: 'คู่แข่งเข้ามาตัดราคา มาร์จิ้นเริ่มหดตัว เติบโตตามตลาดทั่วไป' },
      base: { cagr: '28%', multiple: '2.1x (1.1 เด้ง)', desc: 'Liquid Cooling ครองส่วนแบ่ง 45%+ รายได้โต 25% ต่อปีใน 3 ปีข้างหน้า' },
      bull: { cagr: '40%', multiple: '2.8x - 3.2x', desc: 'ความต้องการระบบไฟฟ้า + ระบายความร้อนทะลัก ยอดแบ็กล็อกพุ่งกระฉูด' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: 'Liquid Cooling กำลังการผลิตโต 45x จากปีก่อนหน้า', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'ขยายโรงงานในสหรัฐฯ และยุโรปรองรับคำสั่งซื้อล้น', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'ทำ Operating Margin ทะลุ 20% อย่างยั่งยืน', status: 'PENDING' }
    ]
  }
};

// Generic Fallback Profile for any other stock
const DEFAULT_PROFILE = (sym: string): StockThesisProfile => ({
  trendTitle: `Long-Term Growth Pillar & Market Expansion for ${sym}`,
  trendDesc: `ผู้นำในอุตสาหกรรมที่มีคูเมืองแข็งแกร่งและได้ประโยชน์จากเมกะเทรนด์การเติบโตระดับสากล พร้อมโอกาสเพิ่มรายได้และส่วนแบ่งตลาดในอีก 3 ปีข้างหน้า`,
  tamCurrentB: 50,
  tamFuture3YB: 180,
  tamUnit: '$B',
  marketSharePct: 28,
  catalysts: [
    { period: '2024-2025', title: 'Product Line Expansion', desc: 'เปิดตัวผลิตภัณฑ์ใหม่และขยายฐานลูกค้ากลุ่ม Enterprise' },
    { period: '2025', title: 'Operating Leverage Scaling', desc: 'รายได้เติบโตเร็วกว่าค่าใช้จ่าย หนุน Net Margin ขยายตัว' },
    { period: '2026', title: 'International Market Penetration', desc: 'รุกตลาดต่างประเทศเพื่อเร่งการเติบโตของรายได้ระยะยาว' }
  ],
  moats: [
    { title: 'Brand & Market Dominance', score: 8.5, maxScore: 10, reason: 'แบรนด์และตำแหน่งทางการตลาดเป็นที่ยอมรับในระดับสากล' },
    { title: 'High Customer Switching Cost', score: 8.0, maxScore: 10, reason: 'ระบบฝังตัวในกระบวนการทำงานของลูกค้า ยกเลิกหรือเปลี่ยนได้ยาก' },
    { title: 'Economies of Scale', score: 8.0, maxScore: 10, reason: 'ขนาดธุรกิจช่วยลดต้นทุนต่อหน่วย ได้เปรียบผู้เล่นหน้าใหม่' }
  ],
  breachFlags: [
    'Gross Margin ลดลงติดต่อกัน 3 ไตรมาส',
    'สูญเสียลูกค้ารายใหญ่เกินกว่า 5% ของรายได้รวม'
  ],
  scenarios: {
    bear: { cagr: '12%', multiple: '1.40x', desc: 'การเติบโตชะลอตัวเหลือตัวเลขหลักเดียว P/E ถูกลดระดับ' },
    base: { cagr: '26%', multiple: '2.0x (1 เด้ง)', desc: 'ธุรกิจโตตามแผน 20%+ ต่อปี บรรลุเป้าหมาย 1 เด้งในกรอบเวลา 3 ปี' },
    bull: { cagr: '36%', multiple: '2.5x - 2.8x', desc: 'เปิดตลาดใหม่สำเร็จ มาร์จิ้นระเบิดขยายตัวทะลุเป้า' }
  },
  milestones: [
    { year: 'Y1', goal: 'รายได้เติบโตตามเป้าหมายรายปี', status: 'DONE' },
    { year: 'Y2', goal: 'ขยาย Gross Margin และคุมต้นทุน', status: 'PROGRESS' },
    { year: 'Y3', goal: 'บรรลุเป้าหมาย 1 เด้ง 2X Target Price', status: 'PENDING' }
  ]
});

export const DossierThesisTab: React.FC = () => {
  const { data } = useDossierStore();

  if (!data) return null;

  const profile = THESIS_MAP[data.symbol] || DEFAULT_PROFILE(data.symbol);
  const totalMoatScore = profile.moats.reduce((acc, m) => acc + m.score, 0);
  const maxMoatScore = profile.moats.reduce((acc, m) => acc + m.maxScore, 0);
  const moatCompositePct = Math.round((totalMoatScore / maxMoatScore) * 100);

  return (
    <div className="w-full space-y-4">
      {/* Top Hero Banner: Moat Composite & Portfolio Context */}
      <div className="bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-4 shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Circular Moat Score Visual */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={moatCompositePct >= 85 ? 'text-blue-400' : moatCompositePct >= 70 ? 'text-blue-500' : 'text-slate-400'}
                strokeDasharray={`${moatCompositePct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-base font-black font-mono text-white leading-none">{moatCompositePct}%</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Moat</span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2.5">
              <span>{profile.trendTitle}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-xs font-semibold">
                Moat Score: {moatCompositePct}/100
              </span>
            </h3>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {profile.trendDesc}
            </p>
          </div>
        </div>

        {/* Right Metric Badges */}
        <div className="flex items-center gap-3">
          {data.portfolioWeightPct !== undefined && data.portfolioWeightPct > 0 && (
            <div className="bg-[#141E38] border border-blue-800/50 rounded-xl px-3.5 py-2 flex flex-col">
              <span className="text-xs text-slate-400 font-medium">สัดส่วนในพอร์ท</span>
              <span className="text-lg font-black font-mono text-blue-300">
                {data.portfolioWeightPct.toFixed(1)}%
              </span>
            </div>
          )}
          <div className="bg-[#141E38] border border-blue-900/50 rounded-xl px-3.5 py-2 flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Market Share</span>
            <span className="text-lg font-black font-mono text-blue-300">
              ~{profile.marketSharePct}%
            </span>
          </div>
        </div>
      </div>

      {/* 3-Column Balanced Layout on Ultra-Wide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Column 1: TAM & Catalyst Timeline */}
        <div className="flex flex-col gap-4">
          {/* TAM Gauge Block */}
          <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-blue-900/40 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-blue-400" />
                <span className="text-slate-100 text-base font-bold">TAM (Total Addressable Market)</span>
              </div>
              <span className="text-blue-300 text-sm font-mono font-bold">
                Share: ~{profile.marketSharePct}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#081024] border border-blue-900/30">
                <div className="text-slate-400 text-xs font-medium">TAM ปัจจุบัน</div>
                <div className="text-2xl font-black font-mono text-slate-100 mt-1">
                  ${profile.tamCurrentB}{profile.tamUnit}
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">ขนาดตลาดปัจจุบัน</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#081024] border border-blue-900/30">
                <div className="text-slate-400 text-xs font-medium">ศักยภาพ 3-5 ปี</div>
                <div className="text-2xl font-black font-mono text-blue-300 mt-1">
                  ${profile.tamFuture3YB}{profile.tamUnit}
                </div>
                <div className="text-xs text-blue-400 font-bold mt-1">
                  เติบโต {(profile.tamFuture3YB / profile.tamCurrentB).toFixed(1)}x เท่า 🚀
                </div>
              </div>
            </div>

            {/* Visual TAM Progress Bar */}
            <div className="space-y-1.5 mt-1">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>Room to Run</span>
                <span className="text-blue-300 font-mono">ยังมีที่ว่างให้โตอีกมหาศาล</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, (profile.tamCurrentB / profile.tamFuture3YB) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Catalyst Timeline with Visual Connector */}
          <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-blue-900/40 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="text-slate-100 text-base font-bold">Catalyst Timeline (ตัวเร่งการเติบโต)</span>
            </div>

            <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-800/60">
              {profile.catalysts.map((c, i) => (
                <div key={i} className="relative p-3 rounded-xl bg-[#081024] border border-blue-900/30 flex items-start gap-3">
                  {/* Timeline Dot */}
                  <span className="absolute -left-[19px] top-4 w-3 h-3 rounded-full bg-blue-400 border-2 border-[#060B1C] shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-xs font-mono font-bold">
                        {c.period}
                      </span>
                      <h4 className="text-slate-100 text-sm font-bold">{c.title}</h4>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Deep Moat Architecture */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#0B1226]/95 p-4 rounded-2xl border border-blue-900/60 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <span className="text-slate-100 text-base font-bold">Deep Moat Architecture</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-800 text-xs font-bold">
                คูเมือง 3 มิติ
              </span>
            </div>

            <div className="space-y-3">
              {profile.moats.map((m, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#070D1F] border border-blue-900/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-100 text-sm font-bold">{m.title}</span>
                    <span className="text-blue-300 text-sm font-mono font-bold">{m.score}/{m.maxScore}</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed mb-2">
                    {m.reason}
                  </p>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 rounded-full transition-all duration-700"
                      style={{ width: `${(m.score / m.maxScore) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breach Red Flags (Deep Red) */}
          <div className="bg-[#1A0A10]/95 p-4 rounded-2xl border border-rose-600/70 shadow-xl flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              <span className="text-rose-200 text-base font-bold">Breach Red Flags (จุดตายที่ต้องเผ่น)</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              หากสัญญาณเตือนต่อไปนี้เกิดขึ้น แสดงว่าคูเมืองกำลังถูกเจาะ ให้พิจารณาตัดลดความเสี่ยงทันที:
            </p>

            <div className="space-y-2">
              {profile.breachFlags.map((flag, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-sm font-medium flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold text-base shrink-0">⚠️</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Doubler Scenario Matrix & Milestones */}
        <div className="flex flex-col gap-4">
          {/* Scenarios Matrix: Bear (Deep Red) / Base (Midnight Blue) / Bull (Deep Indigo) */}
          <div className="bg-[#0B1226]/95 p-4 rounded-2xl border border-blue-900/60 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="text-slate-100 text-base font-bold">Doubler Scenario Matrix (3Y)</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-800 text-xs font-bold">
                กรอบ 3 ปี
              </span>
            </div>

            <div className="space-y-3">
              {/* Bear Case (Deep Red) */}
              <div className="p-3 rounded-xl bg-rose-950/25 border border-rose-800/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-rose-300 text-sm font-bold">🥉 Bear Case (กรณีชะลอตัว)</span>
                  <span className="text-rose-300 font-mono font-bold text-sm">
                    {profile.scenarios.bear.multiple} ({profile.scenarios.bear.cagr})
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full mb-1.5 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '40%' }} />
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {profile.scenarios.bear.desc}
                </p>
              </div>

              {/* Base Case (Target 2X - Institutional Blue) */}
              <div className="p-3.5 rounded-xl bg-blue-950/50 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-300 text-base font-bold flex items-center gap-1">
                    🥈 Base Case (เป้าหมาย 1 เด้ง)
                  </span>
                  <span className="text-white font-mono font-black text-base">
                    {profile.scenarios.base.multiple} ({profile.scenarios.base.cagr})
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full mb-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]" style={{ width: '70%' }} />
                </div>
                <p className="text-slate-200 text-xs leading-relaxed">
                  {profile.scenarios.base.desc}
                </p>
              </div>

              {/* Bull Case (Deep Indigo/Blue) */}
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-indigo-200 text-sm font-bold">🥇 Bull Case (เร่งตัวสุดขีด)</span>
                  <span className="text-indigo-200 font-mono font-bold text-sm">
                    {profile.scenarios.bull.multiple} ({profile.scenarios.bull.cagr})
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full mb-1.5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-700 via-blue-600 to-blue-400 rounded-full" style={{ width: '100%' }} />
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {profile.scenarios.bull.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Milestones Roadmap (Spin fix -> Pulse) */}
          <div className="bg-[#0B1226]/95 p-4 rounded-2xl border border-blue-900/60 shadow-xl flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-blue-400" />
              <span className="text-slate-100 text-base font-bold">Milestone Roadmap</span>
            </div>

            <div className="space-y-2">
              {profile.milestones.map((m, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#070D1F] border border-blue-900/40 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    {m.status === 'DONE' ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : m.status === 'PROGRESS' ? (
                      <Clock className="w-4 h-4 text-blue-300 shrink-0 animate-pulse" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                    )}
                    <span className="text-white font-bold font-mono">{m.year}:</span>
                    <span className="text-slate-300 text-xs">{m.goal}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                    m.status === 'DONE'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : m.status === 'PROGRESS'
                      ? 'bg-blue-900/40 text-blue-200 border border-blue-700'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
