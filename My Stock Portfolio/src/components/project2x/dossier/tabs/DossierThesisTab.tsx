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
  },
  PLTR: {
    trendTitle: 'Enterprise AI Operating System & Sovereign Defense Infrastructure',
    trendDesc: 'AIP (Artificial Intelligence Platform) และ Ontology เชื่อมต่อโมเดล LLM เข้ากับกระบวนการทำงานระดับ mission-critical ของกองทัพและองค์กรชั้นนำทั่วโลก',
    tamCurrentB: 65,
    tamFuture3YB: 220,
    tamUnit: '$B',
    marketSharePct: 35,
    catalysts: [
      { period: '2024-2025', title: 'AIP Bootcamps Conversion', desc: 'ลูกค้าทดลอง AIP Bootcamp ปิดการขายกลายเป็นสัญญาระยะยาวมูลค่าสูง' },
      { period: '2025', title: 'US Commercial Revenue Ramp', desc: 'รายได้ภาคเอกชนในสหรัฐฯ เติบโตมากกว่า 50% ต่อปีต่อเนื่อง' },
      { period: '2025-2026', title: 'S&P 500 Inclusion & Defense Scaling', desc: 'สัญญาภาครัฐระดับกระทรวงกลาโหมและขยายสู่รัฐบาลพันธมิตร NATO' }
    ],
    moats: [
      { title: 'Ontology Semantic Lock-in', score: 9.5, maxScore: 10, reason: 'ข้อมูลระดับองค์กรถูกจัดระเบียบผ่าน Ontology แทนที่ยากมาก' },
      { title: 'IL6 Defense Accreditation', score: 10, maxScore: 10, reason: 'ใบรับรองความปลอดภัยระดับสูงสุดของกองทัพสหรัฐฯ คู่แข่งเข้าไม่ถึง' },
      { title: 'Network Operating Velocity', score: 9.0, maxScore: 10, reason: 'การติดตั้งระบบรวดเร็วขึ้นเป็นระดับวันผ่าน AIP Bootcamps' }
    ],
    breachFlags: [
      'อัตราการเติบโตของ US Commercial ชะลอลงต่ำกว่า 25% YoY',
      'รัฐบาลสหรัฐฯ ลดงบประมาณโครงการซอฟต์แวร์ Defense Intelligence'
    ],
    scenarios: {
      bear: { cagr: '15%', multiple: '1.52x', desc: 'การขยายตลาดภาคเอกชนชะลอตัว P/E ลดระดับลง' },
      base: { cagr: '28%', multiple: '2.1x (1.1 เด้ง)', desc: 'AIP ขยายตัวในองค์กรชั้นนำ US Commercial โต 40%+ ต่อปี' },
      bull: { cagr: '42%', multiple: '3.0x (2 เด้ง)', desc: 'กลายเป็นระบบปฏิบัติการมาตรฐาน AI ของโลกธุรกิจสากล' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: 'เข้าสู่ S&P 500 และกำไร GAAP เป็นบวกทุกไตรมาส', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'รายได้ US Commercial ทะลุ $1B ต่อปี', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'ทำ Free Cash Flow Margin เกิน 35% อย่างต่อเนื่อง', status: 'PENDING' }
    ]
  },
  AVGO: {
    trendTitle: 'Custom Silicon (XPU/ASICs) & Enterprise Cloud Networking',
    trendDesc: 'ผู้ผลิตชิปสั่งทำเฉพาะทาง (Custom AI Accelerators) ให้ Google, Meta, ByteDance ร่วมกับระบบ VMWare Private Cloud',
    tamCurrentB: 120,
    tamFuture3YB: 380,
    tamUnit: '$B',
    marketSharePct: 55,
    catalysts: [
      { period: '2024-2025', title: 'Custom AI ASIC Ramp', desc: 'ส่งมอบชิป TPU รุ่นใหม่ให้ Hyper-scalers ยอดขาย AI โตกระฉูด' },
      { period: '2025', title: 'VMWare Synergy Realization', desc: 'ปรับโมเดล Subscription ดันกระแสเงินสดและมาร์จิ้นก้าวกระโดด' },
      { period: '2026', title: 'Tomahawk 6 / 1.6T Networking', desc: 'ชิปสวิตช์เครือข่ายความเร็วสูงพิเศษครองส่วนแบ่ง 70%+' }
    ],
    moats: [
      { title: 'Custom ASIC Dominance', score: 9.5, maxScore: 10, reason: 'มีความเชี่ยวชาญการออกแบบชิปที่ Hyper-scalers ขาดไม่ได้' },
      { title: 'VMware Infrastructure Lock-in', score: 9.0, maxScore: 10, reason: 'องค์กร Fortune 500 กว่า 80% พึ่งพา VMware ทำ Private Cloud' },
      { title: 'Unrivaled FCF Conversion', score: 9.5, maxScore: 10, reason: 'อัตราการแปลงรายได้เป็นกระแสเงินสดอิสระสูงกว่า 45%' }
    ],
    breachFlags: [
      'ลูกค้ารายใหญ่พัฒนาชิป ASIC เองทั้งหมดโดยไม่พึ่งพา Broadcom',
      'ลูกค้าองค์กรยกเลิกหรือต่อต้านการขึ้นราคา Subscription ของ VMWare'
    ],
    scenarios: {
      bear: { cagr: '14%', multiple: '1.48x', desc: 'ยอดขายเซมิคอนดักเตอร์ทั่วไปชะลอตัว ชะลอการซื้อ VMWare' },
      base: { cagr: '26%', multiple: '2.0x (1 เด้ง)', desc: 'ยอดขาย AI ชิปทะลุเป้า กระแสเงินสด VMWare ไหลเข้าต่อเนื่อง' },
      bull: { cagr: '38%', multiple: '2.6x - 2.9x', desc: 'ครองตลาด Custom Silicon AI และเพิ่มส่วนแบ่ง 70%+' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: 'บูรณาการ VMWare สำเร็จ ดันรายได้ AI ทะลุ $12B', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'ส่งมอบ Custom ASICs รุ่นที่ 3 ให้ลูกค้า Hyper-scaler 3 ราย', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'จ่ายเงินปันผลเติบโตทำสถิติสูงสุดใหม่ต่อเนื่อง', status: 'PENDING' }
    ]
  },
  CRWD: {
    trendTitle: 'Single-Agent Cloud Native Security & Autonomous AI SOC',
    trendDesc: 'ผู้นำแพลตฟอร์ม Falcon ปกป้องอุปกรณ์ปลายทาง ข้อมูลคลาวด์ และตัวตน ด้วยสถาปัตยกรรม Single Agent แบบครบวงจร',
    tamCurrentB: 100,
    tamFuture3YB: 225,
    tamUnit: '$B',
    marketSharePct: 38,
    catalysts: [
      { period: '2024-2025', title: 'Customer Commitment & ARR Retention', desc: 'ลูกค้าระดับ Enterprise ยังคงต่อสัญญาและขยายโมดูลการใช้งาน' },
      { period: '2025', title: 'Next-Gen SIEM & Cloud Security', desc: 'ขยายการใช้งาน Falcon Next-Gen SIEM แย่งส่วนแบ่งตลาดเดิม' },
      { period: '2026', title: 'Charlotte AI Automation', desc: 'ระบบ AI ช่วยวิเคราะห์ภัยคุกคามอัตโนมัติ ลดเวลาตอบสนองลง 90%' }
    ],
    moats: [
      { title: 'Single-Agent Architecture', score: 9.5, maxScore: 10, reason: 'ติดตั้งครั้งเดียวใช้งานได้ทุกโมดูล ลดภาระฝ่ายไอที' },
      { title: 'Massive Threat Graph Data Moat', score: 9.0, maxScore: 10, reason: 'ประมวลผลสัญญาณภัยคุกคามล้านล้านครั้งต่อวัน ยิ่งใช้ยิ่งเก่ง' },
      { title: 'High Module Multi-adoption', score: 9.0, maxScore: 10, reason: 'ลูกค้าใช้ 5+ โมดูลขึ้นไปเกิน 65% ของฐานลูกค้าทั้งหมด' }
    ],
    breachFlags: [
      'Net New ARR ติดลบติดต่อกัน 2 ไตรมาส',
      'คู่แข่งเช่น Microsoft Defender หรือ SentinelOne แย่งตลาด Enterprise'
    ],
    scenarios: {
      bear: { cagr: '13%', multiple: '1.45x', desc: 'การขยายโมดูลใหม่ชะลอตัว อัตราการต่อสัญญาลดลง' },
      base: { cagr: '27%', multiple: '2.05x (1 เด้ง)', desc: 'ARR โต 25%+ ต่อปี ขยายสู่ Identity และ Cloud Security สำเร็จ' },
      bull: { cagr: '39%', multiple: '2.7x - 3.0x', desc: 'ครองตลาด Next-Gen SIEM แทนที่ระบบเก่าทั้งหมด' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: 'ARR ทะลุ $4B และกระแสเงินสดอิสระทำสถิติสูงสุด', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'ขยาย Falcon Flex เพิ่มความคล่องตัวให้ลูกค้าองค์กร', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'บรรลุเป้าหมาย ARR $10B ในระยะยาว', status: 'PENDING' }
    ]
  },
  MELI: {
    trendTitle: 'The Undisputed E-Commerce & FinTech Monolith of Latin America',
    trendDesc: 'การรวมพลังระหว่าง Amazon และ PayPal แห่งละตินอเมริกา ทั้ง Mercado Libre (ช้อปปิ้ง) และ Mercado Pago (กระเป๋าเงินดิจิทัล)',
    tamCurrentB: 85,
    tamFuture3YB: 260,
    tamUnit: '$B',
    marketSharePct: 62,
    catalysts: [
      { period: '2024-2025', title: 'FinTech Credit Card Scaling', desc: 'ขยายบัตรเครดิตและสินเชื่อ Mercado Pago ในบราซิลและเม็กซิโก' },
      { period: '2025', title: 'Mercado Ads Monetization', desc: 'ธุรกิจโฆษณาบนแพลตฟอร์มขยายตัว มาร์จิ้นสูงหนุนกำไรสุทธิ' },
      { period: '2026', title: 'Logistics Network Hegemony', desc: 'จัดส่งวันเดียวถึง (Same-day Delivery) ครอบคลุม 80%+ ของเมืองหลัก' }
    ],
    moats: [
      { title: 'Logistics Supremacy (Envios)', score: 9.5, maxScore: 10, reason: 'เครือข่ายศูนย์กระจายสินค้าที่คู่แข่งหน้าใหม่ไม่มีวันตามทัน' },
      { title: 'Closed-Loop FinTech Synergy', score: 9.5, maxScore: 10, reason: 'ช้อปปิ้งและชำระเงินอยู่ในระบบเดียวกัน สร้างความผูกพันสูง' },
      { title: 'Extreme Brand Loyalty', score: 9.0, maxScore: 10, reason: 'เป็นแบรนด์อันดับ 1 ในใจผู้บริโภคบราซิล อาร์เจนตินา และเม็กซิโก' }
    ],
    breachFlags: [
      'NPL (หนี้เสีย) ของพอร์ตสินเชื่อ Mercado Pago พุ่งเกินเกณฑ์ควบคุม',
      'คู่แข่งต่างชาติทุ่มงบอุดหนุนราคาชิงส่วนแบ่งการตลาด'
    ],
    scenarios: {
      bear: { cagr: '15%', multiple: '1.52x', desc: 'ความเสี่ยงค่าเงินในละตินอเมริกาและหนี้เสียกดดันมาร์จิ้น' },
      base: { cagr: '29%', multiple: '2.15x (1.15 เด้ง)', desc: 'E-commerce + FinTech เติบโต 30%+ กระแสเงินสดแข็งแกร่ง' },
      bull: { cagr: '41%', multiple: '2.9x - 3.2x', desc: 'กลายเป็น Financial Super-App อันดับ 1 เบ็ดเสร็จ' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: 'ปริมาณธุรกรรมรวม GMV ทะลุสถิติใหม่ทุกไตรมาส', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'ขยายธุรกิจสินเชื่ออย่างรัดกุม คุม NPL ต่ำกว่า 8%', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'Mercado Ads สร้างสัดส่วนรายได้ 5%+ ของรายได้รวม', status: 'PENDING' }
    ]
  },
  ANET: {
    trendTitle: 'Ultra-High-Speed Ethernet for Ultra-Dense AI Clusters',
    trendDesc: 'ผู้นำระบบสวิตช์เครือข่าย Ethernet ความเร็ว 400G/800G/1.6T และระบบปฏิบัติการ EOS สำหรับเชื่อมต่อ GPU ใน Data Center',
    tamCurrentB: 45,
    tamFuture3YB: 140,
    tamUnit: '$B',
    marketSharePct: 48,
    catalysts: [
      { period: '2024-2025', title: '800G AI Switch Ramp', desc: 'ส่งมอบสวิตช์รุ่น 800G เชื่อมต่อคลัสเตอร์ AI ระดับแสนตัว' },
      { period: '2025', title: 'Ethernet for AI Consortium', desc: 'การขยายตัวของ Ultra Ethernet Consortium ชิงตลาด InfiniBand' },
      { period: '2026', title: 'Enterprise Campus Expansion', desc: 'ขยายส่วนแบ่งตลาดระบบเครือข่ายสำนักงานองค์กรระดับสากล' }
    ],
    moats: [
      { title: 'EOS Single Software Image', score: 9.5, maxScore: 10, reason: 'ใช้ระบบปฏิบัติการเดียวทุกรุ่น ไม่ต้องทดสอบโปรแกรมใหม่' },
      { title: 'Cloud-Titan Intimacy', score: 9.0, maxScore: 10, reason: 'ร่วมออกแบบระบบเน็ตเวิร์กกับ Microsoft และ Meta อย่างแนบแน่น' },
      { title: 'Operating Margin Excellence', score: 9.0, maxScore: 10, reason: 'บริหารจัดการต้นทุนยอดเยี่ยม ทำ Operating Margin ได้สูงกว่า 40%' }
    ],
    breachFlags: [
      'Nvidia ผลักดัน InfiniBand สำเร็จจนปิดกั้น Ethernet ใน AI คลัสเตอร์',
      'Hyper-scalers ลดงบประมาณการจัดซื้อสวิตช์เครือข่าย'
    ],
    scenarios: {
      bear: { cagr: '13%', multiple: '1.45x', desc: 'คู่แข่งเข้ามาตัดราคา งบลงทุนเน็ตเวิร์กชะลอตัว' },
      base: { cagr: '25%', multiple: '1.95x (1 เด้ง)', desc: 'AI Ethernet ครองส่วนแบ่งตามเป้า รายได้โต 20%+ ต่อปี' },
      bull: { cagr: '36%', multiple: '2.5x - 2.8x', desc: 'Ethernet ชนะขาดใน AI Data Center ขนาดใหญ่ทั่วโลก' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: 'รายได้จาก AI Data Center เติบโตทะลุเป้าหมาย $750M', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'เริ่มส่งมอบสถาปัตยกรรมระดับ 1.6T เชิงพาณิชย์', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'รักษา Gross Margin เหนือระดับ 60% อย่างยั่งยืน', status: 'PENDING' }
    ]
  },
  APH: {
    trendTitle: 'High-Speed Copper & Optical Interconnect for Next-Gen AI Racks',
    trendDesc: 'ผู้นำโลกด้านหัวเชื่อมต่อ (Connectors) และสายเคเบิลความเร็วสูงทองแดง/ออปติกสำหรับ GB200 NVL72 และเซิร์ฟเวอร์ AI ยุคใหม่',
    tamCurrentB: 40,
    tamFuture3YB: 110,
    tamUnit: '$B',
    marketSharePct: 46,
    catalysts: [
      { period: '2024-2025', title: 'GB200 NVL72 Copper Cable Harness Ramp', desc: 'ส่งมอบสายเคเบิลทองแดงความเร็วสูงนับพันเส้นต่อแร็ค AI' },
      { period: '2025', title: 'Fiber Optic Co-Packaged Optics (CPO)', desc: 'เปิดตัวคอนเน็กเตอร์ออปติกรุ่นใหม่รองรับการส่งผ่านข้อมูลระดับเทราบิต' },
      { period: '2025-2026', title: 'Industrial & Auto Content Surge', desc: 'การขยายตัวของระบบอิเล็กทรอนิกส์ในรถยนต์ EV และโรงงานอัจฉริยะ' }
    ],
    moats: [
      { title: 'Patented Interconnect Tech', score: 9.5, maxScore: 10, reason: 'สิทธิบัตรการออกแบบคอนเน็กเตอร์ทนความร้อนสูงและความหนาแน่นข้อมูลสูงสุด' },
      { title: 'Decentralized M&A Culture', score: 9.0, maxScore: 10, reason: 'ความสามารถในการเข้าซื้อกิจการ niche tech และสร้าง ROIC สูงต่อเนื่อง' },
      { title: 'Sole-Source Nvidia Supplier', score: 9.5, maxScore: 10, reason: 'เป็นผู้จัดหาระบบสายเชื่อมต่อหลักที่ได้รับการรับรองสำหรับ GB200' }
    ],
    breachFlags: [
      'Nvidia หรือ Cloud Titans เปลี่ยนไปใช้สายเคเบิลมาตรฐานเปิดจากคู่แข่ง',
      'Operating Margin ลดลงต่ำกว่า 18% จากการแข่งขันด้านราคา'
    ],
    scenarios: {
      bear: { cagr: '13%', multiple: '1.45x', desc: 'ยอดส่งมอบ AI Rack ล่าช้า รายได้กลุ่มไอทีเติบโตลดลง' },
      base: { cagr: '25%', multiple: '1.95x (1 เด้ง)', desc: 'ส่งมอบเคเบิล GB200 ตามนัด กำไรต่อหุ้นโต 22%+ ต่อปี' },
      bull: { cagr: '37%', multiple: '2.6x - 2.9x', desc: 'ความต้องการระบบสายเชื่อมต่อทะลักเกินคาด ดันกำไรโตสองเท่า' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: 'ส่งมอบชุดสายไฟ GB200 ชุดแรกตามสเปก', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'ขยายกำลังผลิตสายเคเบิลความเร็วสูง 100%', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'รักษา FCF Conversion สูงกว่า 90% ของกำไรสุทธิ', status: 'PENDING' }
    ]
  },
  KLAC: {
    trendTitle: 'Process Control & Yield Diagnostic Monopoly for Advanced Nodes',
    trendDesc: 'ผู้ผูกขาดเครื่องตรวจจับข้อบกพร่องของเวเฟอร์ในโรงงานชิป 3nm, 2nm และ HBM เมมโมรี่ ขาด KLA ไม่มีใครผลิตชิป AI สำเร็จ',
    tamCurrentB: 30,
    tamFuture3YB: 75,
    tamUnit: '$B',
    marketSharePct: 58,
    catalysts: [
      { period: '2024-2025', title: '2nm / Gate-All-Around Inspection', desc: 'ความซับซ้อนของโครงสร้าง 3 มิติต้องการการตรวจเช็กข้อบกพร่องเพิ่มขึ้น 2 เท่า' },
      { period: '2025', title: 'Advanced Packaging & HBM Defect Control', desc: 'ความต้องการเครื่องตรวจสอบแพ็กเกจจิ้ง CoWoS และ HBM4 พุ่งทะยาน' },
      { period: '2026', title: 'High-NA EUV Integration', desc: 'ระบบเลนส์ EUV กำลังขยายสูงเปิดรอบอัปเกรดเครื่องมือวินิจฉัยรุ่นใหม่' }
    ],
    moats: [
      { title: 'Diagnostic Monopoly', score: 9.8, maxScore: 10, reason: 'ครองส่วนแบ่งตลาด Process Control สูงกว่าคู่แข่งเบอร์ 2 ถึง 4 เท่า' },
      { title: 'Optical Metrology Algorithms', score: 9.5, maxScore: 10, reason: 'อัลกอริทึมวิเคราะห์ภาพเวเฟอร์เก็บข้อมูลมากว่า 40 ปี เลียนแบบไม่ได้' },
      { title: 'Extremely High Gross Margin', score: 9.5, maxScore: 10, reason: 'รักษา Gross Margin ระดับ 60%+ ตลอดทุกวัฏจักรเซมิคอนดักเตอร์' }
    ],
    breachFlags: [
      'มาตรการคว่ำบาตรชิปจีนขยายขอบเขตจนกระทบยอดขายเครื่องรุ่นหลัก',
      'โรงหล่อชิปลดงบ CapEx สำหรับเครื่องมือตรวจสอบเวเฟอร์'
    ],
    scenarios: {
      bear: { cagr: '12%', multiple: '1.40x', desc: 'ยอดขายในจีนหดตัว วัฏจักรชิปฟื้นตัวช้ากว่าคาด' },
      base: { cagr: '24%', multiple: '1.90x (0.9 เด้ง)', desc: '2nm + HBM ต้องการการตรวจวัดเพิ่ม ดันกำไรโต 20%+ ต่อปี' },
      bull: { cagr: '35%', multiple: '2.5x - 2.8x', desc: 'การปฏิวัติโครงสร้างชิปดันยอดสั่งซื้อเครื่องตรวจสอบทะลุเป้า' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: 'ส่งมอบเครื่องตรวจวัด HBM3e/CoWoS ล็อตใหญ่', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'เปิดตัวแพลตฟอร์ม Process Control สำหรับโหนด 2nm', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'ทำสถิติรายได้จากบริการ Service สัญญาผูกขาดสูงสุด', status: 'PENDING' }
    ]
  },
  STRL: {
    trendTitle: 'E-Infrastructure Foundation & Power Delivery for Hyperscale Data Centers',
    trendDesc: 'ผู้เชี่ยวชาญการปรับพื้นที่ วางระบบระบายน้ำ และติดตั้งโครงสร้างฐานรากสำหรับ AI Data Center ของ Hyperscalers ทั่วสหรัฐฯ',
    tamCurrentB: 20,
    tamFuture3YB: 60,
    tamUnit: '$B',
    marketSharePct: 25,
    catalysts: [
      { period: '2024-2025', title: 'Data Center E-Infrastructure Backlog', desc: 'ยอดจองงานก่อสร้างฐานราก AI Data Center สูงทำลายสถิติ' },
      { period: '2025', title: 'Power Substation & Grid Civil Works', desc: 'ขยายขอบเขตงานสู่สถานีไฟฟ้าย่อยรองรับแร็ค AI พลังงานกิกะวัตต์' },
      { period: '2026', title: 'High-Margin Transformation', desc: 'ยุติรับงานถนนมาร์จิ้นต่ำ มุ่งเน้น E-Infrastructure มาร์จิ้นสูง 100%' }
    ],
    moats: [
      { title: 'Critical Execution Speed', score: 9.0, maxScore: 10, reason: 'ส่งมอบพื้นที่ Data Center ตรงเวลา 100% สำคัญอย่างยิ่งต่อ Hyperscalers' },
      { title: 'Niche Engineering Equipment', score: 8.5, maxScore: 10, reason: 'มีกองเครื่องจักรกลหนักเฉพาะทางและทีมงานพร้อมใช้งานทั่วสหรัฐฯ' },
      { title: 'Expanding Operating Margins', score: 9.0, maxScore: 10, reason: 'มาร์จิ้นปรับตัวเพิ่มขึ้นต่อเนื่องจากการเลือกรับเฉพาะงานมูลค่าสูง' }
    ],
    breachFlags: [
      'Hyperscalers ชะลอการเปิดโครงการ Data Center แคมปัสใหม่',
      'ยอด Backlog ในกลุ่ม E-Infrastructure ลดลงต่อเนื่อง 2 ไตรมาส'
    ],
    scenarios: {
      bear: { cagr: '14%', multiple: '1.48x', desc: 'งานก่อสร้างชะลอตัว ดอกเบี้ยสูงกดดันการลงทุนอสังหาฯ' },
      base: { cagr: '28%', multiple: '2.10x (1.1 เด้ง)', desc: 'E-Infrastructure โต 30%+ มาร์จิ้นขยายตัวแตะระดับ 18-20%' },
      bull: { cagr: '40%', multiple: '2.8x - 3.2x', desc: 'วิกฤติต้องเร่งสร้าง Data Center ทั่วสหรัฐฯ ดันยอดจองล้นมือ' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: 'สัดส่วนกำไรจาก Data Center ทะลุ 50% ของกำไรรวม', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'เพิ่ม Backlog แตะระดับ $2.5B+ พร้อมอัตรากำไรขั้นต้น 20%+', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'ขึ้นแท่นเบอร์ 1 สหรัฐฯ ด้านโครงสร้างฐานราก AI Data Center', status: 'PENDING' }
    ]
  },
  ALAB: {
    trendTitle: 'Connectivity Silicon (PCIe 6, CXL & Retimers) for AI Cloud',
    trendDesc: 'ผู้นำชิปขยายสัญญาณ PCIe Retimers, Active Electrical Cables (AEC) และ CXL เชื่อมต่อ GPU, CPU และ Memory ไม่ให้ติดคอขวด',
    tamCurrentB: 12,
    tamFuture3YB: 45,
    tamUnit: '$B',
    marketSharePct: 70,
    catalysts: [
      { period: '2024-2025', title: 'PCIe Gen 5/6 Retimer Ramp in AI Servers', desc: 'เซิร์ฟเวอร์ AI 1 เครื่องใช้ชิป Retimer ของ Astera สูงสุด 16-32 ตัว' },
      { period: '2025', title: 'Taurus Active Electrical Cable (AEC)', desc: 'สายเชื่อมต่อสัญญาณอัจฉริยะช่วยลดการกินไฟและเพิ่มระยะเชื่อมต่อ' },
      { period: '2026', title: 'Leo CXL Memory Pooling Scale', desc: 'การแชร์หน่วยความจำผ่าน CXL ในคลัสเตอร์ AI ช่วยลดต้นทุน GPU' }
    ],
    moats: [
      { title: 'First-Mover Interop Software', score: 9.5, maxScore: 10, reason: 'ซอฟต์แวร์ COSMOS ตรวจสอบความสมบูรณ์สัญญาณเชื่อมโยงกับชิปทุกค่าย' },
      { title: 'Close Hyperscaler Co-Development', score: 9.0, maxScore: 10, reason: 'ร่วมออกแบบชิปกับ Nvidia, AWS, Microsoft ตั้งแต่วันแรก' },
      { title: 'Astronomical Gross Margin', score: 9.5, maxScore: 10, reason: 'ทำ Gross Margin ได้สูงกว่า 75% จากชิป Fabless คุณภาพพรีเมียม' }
    ],
    breachFlags: [
      'Broadcom หรือ Marvell เข้ามาแย่งส่วนแบ่งในตลาด PCIe Retimer อย่างหนัก',
      'สถาปัตยกรรมชิปรวมศูนย์แบบใหม่ลดความจำเป็นในการใช้ Retimer'
    ],
    scenarios: {
      bear: { cagr: '15%', multiple: '1.52x', desc: 'คู่แข่งเข้ามาตัดราคา ส่วนแบ่งตลาดลดลงเหลือ 45%' },
      base: { cagr: '32%', multiple: '2.30x (1.3 เด้ง)', desc: 'รายได้โต 40%+ ตามรอบการขยายตัวของคลัสเตอร์ AI รุ่นใหม่' },
      bull: { cagr: '45%', multiple: '3.2x - 3.6x', desc: 'ชิป CXL + AEC ติดตลาด ดันกำไรโต 5 เท่าตัวใน 3 ปี' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: 'ทำรายได้เติบโตเกิน 100% YoY หลังเข้าจดทะเบียนในตลาด', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'ส่งมอบชิป PCIe Gen 6 และ Taurus AEC เต็มกำลังผลิต', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'ขยายพอร์ตสู่ CXL Memory Expansion ใน Data Center', status: 'PENDING' }
    ]
  },
  CLS: {
    trendTitle: 'JDM Advanced Manufacturing for 800G AI Switches & Compute',
    trendDesc: 'พันธมิตรร่วมออกแบบและผลิตฮาร์ดแวร์สวิตช์เครือข่าย 800G/1.6T และ AI Rack ให้กับ Cloud Titans โดยตรง',
    tamCurrentB: 25,
    tamFuture3YB: 70,
    tamUnit: '$B',
    marketSharePct: 32,
    catalysts: [
      { period: '2024-2025', title: 'Hyperscaler 800G Switch Mass Production', desc: 'ผลิตสวิตช์เครือข่าย AI รุ่นเรือธงให้ลูกค้ารายใหญ่สร้างรายได้พุ่งทะยาน' },
      { period: '2025', title: '1.6T Networking Next-Gen Line', desc: 'เตรียมสายการผลิตสวิตช์ความเร็ว 1.6T เพื่อรองรับชิป AI รุ่นถัดไป' },
      { period: '2025-2026', title: 'Operating Margin Expansion via CCS', desc: 'สัดส่วนธุรกิจกลุ่ม Cloud Solutions เพิ่มขึ้นหนุน Margin รวมโต' }
    ],
    moats: [
      { title: 'JDM High-Complexity Engineering', score: 9.0, maxScore: 10, reason: 'ไม่ได้แค่รับจ้างประกอบ แต่ร่วมออกแบบวงจรความร้อนและไฟฟ้าขั้นสูง' },
      { title: 'Entrenched Hyperscaler Trust', score: 9.0, maxScore: 10, reason: 'ลูกค้าระดับท็อปคลาวด์พึ่งพา Celestica ในสายการผลิตชิ้นส่วนสำคัญ' },
      { title: 'Operating Discipline & Capital Return', score: 8.5, maxScore: 10, reason: 'ซื้อหุ้นคืนสม่ำเสมอและบริหารจัดการสินค้าคงคลังได้อย่างรัดกุม' }
    ],
    breachFlags: [
      'ลูกค้ารายใหญ่สุดตัดลดสัดส่วนคำสั่งซื้อสวิตช์เครือข่ายไปให้คู่แข่ง',
      'Operating Margin ในกลุ่มธุรกิจ CCS หดตัวต่ำกว่า 6%'
    ],
    scenarios: {
      bear: { cagr: '13%', multiple: '1.45x', desc: 'รอบการลงทุนเน็ตเวิร์กของคลาวด์ชะลอตัว ชิ้นส่วนขาดแคลน' },
      base: { cagr: '26%', multiple: '2.00x (1 เด้ง)', desc: 'สวิตช์ 800G/1.6T เติบโตตามแผน กำไรต่อหุ้นโต 20%+ ต่อปี' },
      bull: { cagr: '38%', multiple: '2.6x - 3.0x', desc: 'คำสั่งซื้อ AI Rack ทะลัก ได้งานเซิร์ฟเวอร์เสริมดันกำไรนิวไฮ' }
    },
    milestones: [
      { year: 'Y1 (2024)', goal: 'รายได้กลุ่ม CCS ขยายตัวแตะระดับ 65% ของพอร์ตรวม', status: 'DONE' },
      { year: 'Y2 (2025)', goal: 'ส่งมอบสายการผลิต 1.6T Networking Switch รุ่นแรก', status: 'PROGRESS' },
      { year: 'Y3 (2026)', goal: 'สร้าง ROIC เหนือระดับ 25% อย่างต่อเนื่อง', status: 'PENDING' }
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
  const { data, columnMode } = useDossierStore();

  if (!data) return null;

  const profile = THESIS_MAP[data.symbol] || DEFAULT_PROFILE(data.symbol);
  const totalMoatScore = profile.moats.reduce((acc, m) => acc + m.score, 0);
  const maxMoatScore = profile.moats.reduce((acc, m) => acc + m.maxScore, 0);
  const moatCompositePct = Math.round((totalMoatScore / maxMoatScore) * 100);

  // 1. Top Hero Banner
  const renderHeroBanner = () => (
    <div className="bg-gradient-to-br from-[#0E1326] via-[#12162B] to-[#1A0A14] border border-white/10 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {/* Circular Moat Score Visual with Neon Gradient */}
        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <defs>
              <linearGradient id="moatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#823AFD" />
                <stop offset="100%" stopColor="#FD5514" />
              </linearGradient>
            </defs>
            <path
              className="text-slate-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              stroke="url(#moatGrad)"
              strokeDasharray={`${moatCompositePct}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-base font-black font-mono text-white leading-none">{moatCompositePct}%</span>
            <span className="text-[9px] font-bold text-violet-300 uppercase mt-0.5">Moat</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-lg font-bold text-slate-100">{profile.trendTitle}</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-violet-600/25 text-violet-200 border border-violet-500/40 text-xs font-bold shadow-[0_0_10px_rgba(130,58,253,0.3)]">
              Moat Score: {moatCompositePct}/100
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {profile.trendDesc}
          </p>
        </div>
      </div>

      {/* Right Metric Badges */}
      <div className="flex items-center gap-3">
        {data.portfolioWeightPct !== undefined && data.portfolioWeightPct > 0 && (
          <div className="bg-[#0A0E1A] border border-white/10 rounded-xl px-3.5 py-2 flex flex-col">
            <span className="text-xs text-slate-400 font-medium">สัดส่วนในพอร์ท</span>
            <span className="text-lg font-black font-mono text-violet-300">
              {data.portfolioWeightPct.toFixed(1)}%
            </span>
          </div>
        )}
        <div className="bg-[#0A0E1A] border border-white/10 rounded-xl px-3.5 py-2 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Market Share</span>
          <span className="text-lg font-black font-mono text-pink-300">
            ~{profile.marketSharePct}%
          </span>
        </div>
      </div>
    </div>
  );

  // 2. TAM Gauge Block
  const renderTAMBlock = () => (
    <div className="bg-[#0E1326]/95 p-4 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-3.5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-950/60 border border-violet-500/30 text-violet-300 shadow-[0_0_10px_rgba(130,58,253,0.3)]">
            <Globe2 className="w-5 h-5" />
          </div>
          <span className="text-slate-100 text-base font-bold">TAM (Total Addressable Market)</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/40 text-xs font-bold">
          Share: ~{profile.marketSharePct}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0A0E1A] border border-white/10">
          <div className="text-slate-400 text-xs font-medium">TAM ปัจจุบัน</div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            ${profile.tamCurrentB}{profile.tamUnit}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-1">ขนาดตลาดปัจจุบัน</div>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-br from-pink-950/30 to-[#0A0E1A] border border-[#FC2D79]/40">
          <div className="text-pink-300 text-xs font-medium">ศักยภาพ 3-5 ปี</div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            ${profile.tamFuture3YB}{profile.tamUnit}
          </div>
          <div className="text-xs text-pink-400 font-bold mt-1">
            เติบโต {(profile.tamFuture3YB / profile.tamCurrentB).toFixed(1)}x เท่า 🚀
          </div>
        </div>
      </div>

      {/* Visual TAM Progress Bar */}
      <div className="space-y-1.5 mt-0.5">
        <div className="flex justify-between text-xs text-slate-300 font-medium">
          <span>Room to Run</span>
          <span className="text-violet-300 font-mono font-medium">ยังมีที่ว่างให้โตอีกมหาศาล</span>
        </div>
        <div className="w-full h-2.5 bg-[#0A0E1A] rounded-full overflow-hidden border border-white/10 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-orange-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(253,85,20,0.4)]"
            style={{ width: `${Math.min(100, (profile.tamCurrentB / profile.tamFuture3YB) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );

  // 3. Catalyst Timeline Block
  const renderCatalystTimeline = () => (
    <div className="bg-[#0E1326]/95 p-4 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-3.5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-950/60 border border-violet-500/30 text-violet-300 shadow-[0_0_10px_rgba(130,58,253,0.3)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-slate-100 text-base font-bold">Catalyst Timeline (ตัวเร่ง)</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/40 text-xs font-bold">
          Growth Drivers
        </span>
      </div>

      <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-violet-500 before:via-purple-500 before:to-orange-500">
        {profile.catalysts.map((c, i) => (
          <div key={i} className="relative p-3 rounded-xl bg-[#0A0E1A] hover:bg-[#12162B] border border-white/10 hover:border-violet-500/40 transition-all flex items-start gap-3">
            {/* Timeline Dot */}
            <span className="absolute -left-[19px] top-4 w-3 h-3 rounded-full bg-violet-400 border-2 border-[#0E1326] shadow-[0_0_10px_rgba(130,58,253,0.9)]" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-violet-600/25 text-violet-200 border border-violet-500/40 text-xs font-mono font-bold">
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
  );

  // 4. Deep Moat Architecture
  const renderMoatArchitecture = () => (
    <div className="bg-[#0E1326]/95 p-4 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-3.5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-950/60 border border-violet-500/30 text-violet-300 shadow-[0_0_10px_rgba(130,58,253,0.3)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-slate-100 text-base font-bold">Deep Moat Architecture</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/40 text-xs font-bold">
          คูเมือง 3 มิติ
        </span>
      </div>

      <div className="space-y-2.5">
        {profile.moats.map((m, idx) => (
          <div key={idx} className="p-3.5 rounded-xl bg-[#0A0E1A] border border-white/10 hover:border-violet-500/30 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-100 text-sm font-bold">{m.title}</span>
              <span className="text-violet-300 text-xs font-mono font-bold bg-violet-950/60 px-2 py-0.5 rounded border border-violet-800/60">
                {m.score}/{m.maxScore}
              </span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed mb-2">
              {m.reason}
            </p>
            <div className="w-full h-2 bg-[#12162B] rounded-full overflow-hidden border border-white/5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-orange-500 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(130,58,253,0.5)]"
                style={{ width: `${(m.score / m.maxScore) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 5. Breach Red Flags (Danger Module)
  const renderBreachFlags = () => (
    <div className="bg-[#1A0A14]/95 p-4 rounded-2xl border border-[#FC2D79]/60 shadow-[0_0_25px_rgba(252,45,121,0.15)] flex flex-col gap-3 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-pink-950/60 border border-[#FC2D79]/40 text-[#FC2D79] shadow-[0_0_10px_rgba(252,45,121,0.3)]">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <span className="text-[#FF5388] text-base font-bold">Breach Red Flags (จุดตายที่ต้องเผ่น)</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-[#FC2D79]/20 text-[#FF5388] border border-[#FC2D79]/40 text-xs font-bold animate-pulse">
          🚨 KILL SWITCH
        </span>
      </div>
      <p className="text-slate-300 text-xs leading-relaxed">
        หากสัญญาณเตือนต่อไปนี้เกิดขึ้น แสดงว่าคูเมืองกำลังถูกเจาะ ให้พิจารณาตัดลดความเสี่ยงทันที:
      </p>

      <div className="space-y-2">
        {profile.breachFlags.map((flag, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-[#0A0E1A] border border-[#FC2D79]/40 text-rose-200 text-sm font-medium flex items-start gap-2.5 shadow-sm">
            <span className="text-[#FC2D79] font-bold text-base shrink-0 animate-pulse">⚠️</span>
            <span className="leading-snug">{flag}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // 6. Doubler Scenario Matrix (3Y)
  const renderScenarioMatrix = () => (
    <div className="bg-[#0E1326]/95 p-4 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-3.5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-950/60 border border-violet-500/30 text-violet-300 shadow-[0_0_10px_rgba(130,58,253,0.3)]">
            <Target className="w-5 h-5" />
          </div>
          <span className="text-slate-100 text-base font-bold">Doubler Scenario Matrix (3Y)</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/40 text-xs font-bold">
          กรอบ 3 ปี
        </span>
      </div>

      <div className="space-y-3">
        {/* Bear Case (Hot Pink) */}
        <div className="p-3 rounded-xl bg-[#1A0A14]/80 border border-[#FC2D79]/40 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#FF5388] text-sm font-bold">🥉 Bear Case (กรณีชะลอตัว)</span>
            <span className="text-[#FF5388] font-mono font-bold text-sm">
              {profile.scenarios.bear.multiple} ({profile.scenarios.bear.cagr})
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#0A0E1A] rounded-full mb-1.5 overflow-hidden">
            <div className="h-full bg-[#FC2D79] rounded-full shadow-[0_0_8px_rgba(252,45,121,0.6)]" style={{ width: '40%' }} />
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            {profile.scenarios.bear.desc}
          </p>
        </div>

        {/* Base Case (Target 2X Doubler - Electric Violet to Hot Pink) */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-violet-950/50 via-[#12162B] to-pink-950/30 border border-violet-500/60 shadow-[0_0_20px_rgba(130,58,253,0.25)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-violet-200 text-base font-bold flex items-center gap-1">
              🥈 Base Case (เป้าหมาย 1 เด้ง)
            </span>
            <span className="text-white font-mono font-black text-base">
              {profile.scenarios.base.multiple} <span className="text-violet-300 font-semibold">({profile.scenarios.base.cagr})</span>
            </span>
          </div>
          <div className="w-full h-2 bg-[#0A0E1A] rounded-full mb-2 overflow-hidden border border-white/5">
            <div className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-[#FC2D79] rounded-full shadow-[0_0_10px_rgba(252,45,121,0.5)]" style={{ width: '70%' }} />
          </div>
          <p className="text-slate-200 text-xs leading-relaxed">
            {profile.scenarios.base.desc}
          </p>
        </div>

        {/* Bull Case (Hot Pink / Magenta Glow) */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-pink-950/30 via-[#12162B] to-[#0A0E1A] border border-[#FC2D79]/40 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-pink-200 text-sm font-bold">🥇 Bull Case (เร่งตัวสุดขีด)</span>
            <span className="text-pink-300 font-mono font-bold text-sm">
              {profile.scenarios.bull.multiple} ({profile.scenarios.bull.cagr})
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#0A0E1A] rounded-full mb-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 via-[#FC2D79] to-pink-400 rounded-full shadow-[0_0_8px_rgba(252,45,121,0.6)]" style={{ width: '100%' }} />
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            {profile.scenarios.bull.desc}
          </p>
        </div>
      </div>
    </div>
  );

  // 7. Milestone Roadmap
  const renderMilestones = () => (
    <div className="bg-[#0E1326]/95 p-4 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-3.5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-950/60 border border-violet-500/30 text-violet-300 shadow-[0_0_10px_rgba(130,58,253,0.3)]">
            <Flag className="w-5 h-5" />
          </div>
          <span className="text-slate-100 text-base font-bold">Milestone Roadmap</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/40 text-xs font-bold">
          Execution Plan
        </span>
      </div>

      <div className="space-y-2">
        {profile.milestones.map((m, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-[#0A0E1A] border border-white/10 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2.5">
              {m.status === 'DONE' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : m.status === 'PROGRESS' ? (
                <Clock className="w-4 h-4 text-violet-300 shrink-0 animate-pulse" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
              )}
              <span className="text-white font-bold font-mono">{m.year}:</span>
              <span className="text-slate-300 text-xs">{m.goal}</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
              m.status === 'DONE'
                ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800'
                : m.status === 'PROGRESS'
                ? 'bg-violet-950 text-violet-200 border border-violet-700'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {m.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {/* Top Hero Banner */}
      {renderHeroBanner()}

      {/* MODE 2: Split 2 Columns */}
      {columnMode === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="flex flex-col gap-4">
            {renderTAMBlock()}
            {renderCatalystTimeline()}
            {renderMoatArchitecture()}
          </div>
          <div className="flex flex-col gap-4">
            {renderBreachFlags()}
            {renderScenarioMatrix()}
            {renderMilestones()}
          </div>
        </div>
      )}

      {/* MODE 3: Balanced 3 Columns (Default for Tab 3) */}
      {(columnMode === 3 || !columnMode) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Column 1: TAM & Catalyst Timeline */}
          <div className="flex flex-col gap-4">
            {renderTAMBlock()}
            {renderCatalystTimeline()}
          </div>

          {/* Column 2: Deep Moat & Breach Red Flags */}
          <div className="flex flex-col gap-4">
            {renderMoatArchitecture()}
            {renderBreachFlags()}
          </div>

          {/* Column 3: Doubler Scenario Matrix & Milestones */}
          <div className="flex flex-col gap-4">
            {renderScenarioMatrix()}
            {renderMilestones()}
          </div>
        </div>
      )}

      {/* MODE 4: Panoramic 4 Columns (Ultra-Wide Full Deck) */}
      {columnMode === 4 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
          <div className="flex flex-col gap-3.5">
            {renderTAMBlock()}
          </div>
          <div className="flex flex-col gap-3.5">
            {renderCatalystTimeline()}
          </div>
          <div className="flex flex-col gap-3.5">
            {renderMoatArchitecture()}
            {renderBreachFlags()}
          </div>
          <div className="flex flex-col gap-3.5">
            {renderScenarioMatrix()}
            {renderMilestones()}
          </div>
        </div>
      )}
    </div>
  );
};
