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

const THESIS_MAP: Record<string, StockThesisProfile> = {
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

  return (
    <div className="w-full space-y-4">
      {/* 3-Column Balanced Layout on Ultra-Wide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Column 1: The Narrative & TAM Expansion */}
        <div className="flex flex-col gap-4">
          {/* Narrative Block */}
          <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-blue-900/40 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-200 text-[16px] font-medium">Secular Trend Thesis</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[12px] font-medium">
                ทำไมถึงจะโตมหาศาล
              </span>
            </div>

            <div>
              <h3 className="text-slate-100 text-[15px] font-medium tracking-tight">
                {profile.trendTitle}
              </h3>
              <p className="text-slate-300 text-[14px] font-normal leading-relaxed mt-1.5">
                {profile.trendDesc}
              </p>
            </div>
          </div>

          {/* TAM Gauge Block */}
          <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-blue-900/40 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-200 text-[16px] font-medium">TAM (Total Addressable Market)</span>
              </div>
              <span className="text-emerald-300 text-[14px] font-mono font-medium">
                Share: ~{profile.marketSharePct}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#081024] border border-blue-900/30">
                <div className="text-slate-300 text-[13px] font-normal">TAM ปัจจุบัน</div>
                <div className="text-2xl font-semibold font-mono text-slate-100 mt-0.5">
                  ${profile.tamCurrentB}{profile.tamUnit}
                </div>
                <div className="text-[13px] text-slate-300 font-normal mt-0.5">ตลาดปัจจุบัน</div>
              </div>

              <div className="p-3 rounded-xl bg-[#081024] border border-blue-900/30">
                <div className="text-slate-300 text-[13px] font-normal">ศักยภาพ 3-5 ปี</div>
                <div className="text-2xl font-semibold font-mono text-emerald-400 mt-0.5">
                  ${profile.tamFuture3YB}{profile.tamUnit}
                </div>
                <div className="text-[13px] text-emerald-300 font-normal mt-0.5">โต {(profile.tamFuture3YB / profile.tamCurrentB).toFixed(1)}x เท่า</div>
              </div>
            </div>

            {/* Visual TAM Progress Bar */}
            <div className="space-y-1 mt-1">
              <div className="flex justify-between text-[13px] text-slate-300">
                <span>Room to Run</span>
                <span className="text-cyan-300 font-mono">ยังมีที่ว่างให้โตอีกมหาศาล</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                  style={{ width: `${Math.min(100, (profile.tamCurrentB / profile.tamFuture3YB) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Catalyst Timeline */}
          <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-blue-900/40 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-slate-200 text-[16px] font-medium">Catalyst Timeline (ตัวเร่งการเติบโต)</span>
            </div>

            <div className="space-y-2.5">
              {profile.catalysts.map((c, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-[#081024] border border-blue-900/30 flex items-start gap-3">
                  <span className="px-2.5 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-800 text-[12px] font-mono flex-shrink-0 mt-0.5 font-medium">
                    {c.period}
                  </span>
                  <div>
                    <div className="text-slate-100 text-[14px] font-medium">{c.title}</div>
                    <div className="text-slate-300 text-[13px] font-normal mt-0.5 leading-snug">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Deep Moat Architecture */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-blue-900/40 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-200 text-[16px] font-medium">Deep Moat Architecture</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-cyan-300 border border-blue-500/30 text-[12px] font-medium">
                คูเมืองที่คู่แข่งข้ามไม่ได้
              </span>
            </div>

            <div className="space-y-3">
              {profile.moats.map((m, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#081024] border border-blue-900/30">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-100 text-[14px] font-medium">{m.title}</span>
                    <span className="text-cyan-300 text-[14px] font-mono font-medium">{m.score}/{m.maxScore}</span>
                  </div>
                  <p className="text-slate-300 text-[13px] font-normal mt-1 leading-snug">
                    {m.reason}
                  </p>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                      style={{ width: `${(m.score / m.maxScore) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breach Red Flags */}
          <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-rose-900/40 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span className="text-rose-200 text-[16px] font-medium">Breach Red Flags (จุดตายที่ต้องเผ่น)</span>
            </div>
            <p className="text-slate-300 text-[13px] font-normal">
              หากสัญญาณเตือนต่อไปนี้เกิดขึ้น แสดงว่าคูเมืองกำลังถูกเจาะ ให้พิจารณาตัดลดความเสี่ยงทันที:
            </p>

            <div className="space-y-2">
              {profile.breachFlags.map((flag, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-rose-950/25 border border-rose-900/40 text-rose-200 text-[14px] font-normal flex items-start gap-2">
                  <span className="text-rose-400 font-semibold">⚠️</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Doubler Scenario Matrix & Milestones */}
        <div className="flex flex-col gap-4">
          {/* Scenarios */}
          <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-blue-900/40 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span className="text-slate-200 text-[16px] font-medium">Doubler Scenario Matrix (คาดการณ์กี่เด้ง)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[12px] font-medium">
                กรอบ 3 ปี
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Bear Case */}
              <div className="p-3 rounded-xl bg-[#081024] border border-blue-900/30">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 text-[14px] font-medium">🥉 Bear Case (กรณีเลวร้าย)</span>
                  <span className="text-amber-400 font-mono font-medium text-[14px]">{profile.scenarios.bear.multiple} (CAGR {profile.scenarios.bear.cagr})</span>
                </div>
                <p className="text-slate-300 text-[13px] font-normal mt-1 leading-snug">
                  {profile.scenarios.bear.desc}
                </p>
              </div>

              {/* Base Case (Target 2X) */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/70 via-indigo-950/70 to-emerald-950/70 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-300 text-[15px] font-medium">🥈 Base Case (เป้าหลัก 1 เด้ง)</span>
                  <span className="text-emerald-300 font-mono font-semibold text-[15px]">{profile.scenarios.base.multiple} (CAGR {profile.scenarios.base.cagr})</span>
                </div>
                <p className="text-slate-200 text-[14px] font-normal mt-1 leading-snug">
                  {profile.scenarios.base.desc}
                </p>
              </div>

              {/* Bull Case */}
              <div className="p-3 rounded-xl bg-[#081024] border border-blue-900/30">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 text-[14px] font-medium">🥇 Bull Case (กรณีเร่งตัวสุดขีด)</span>
                  <span className="text-purple-300 font-mono font-medium text-[14px]">{profile.scenarios.bull.multiple} (CAGR {profile.scenarios.bull.cagr})</span>
                </div>
                <p className="text-slate-300 text-[13px] font-normal mt-1 leading-snug">
                  {profile.scenarios.bull.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Milestones Roadmap */}
          <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-blue-900/40 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-200 text-[16px] font-medium">Milestone Roadmap (เช็กลิสต์รายปีสู่เป้า 1 เด้ง)</span>
            </div>

            <div className="space-y-2">
              {profile.milestones.map((m, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#081024] border border-blue-900/30 flex items-center justify-between text-[14px]">
                  <div className="flex items-center gap-2.5">
                    {m.status === 'DONE' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : m.status === 'PROGRESS' ? (
                      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0" />
                    )}
                    <span className="text-white font-medium">{m.year}:</span>
                    <span className="text-slate-300 font-normal">{m.goal}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[12px] font-mono font-medium ${
                    m.status === 'DONE'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : m.status === 'PROGRESS'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-800 text-slate-400'
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
