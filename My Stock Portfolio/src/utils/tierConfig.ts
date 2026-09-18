export type CyberTier = 
  | 'TO_THE_MOON' 
  | 'BUY_NOW' 
  | 'BUY_ZONE' 
  | 'GET_READY' 
  | 'ON_RADAR' 
  | 'SLOW_BLEED' 
  | 'MAYDAY_EXIT'
  | 'WAIT'
  | 'DANGER';

export interface TierMetadata {
  id: CyberTier;
  label: string;
  icon: string;
  badgeClass: string;
  animClass: string;
  borderClass: string;
  glowClass: string;
  textClass: string;
  bgGradient: string;
  descriptionTh: string;
  rank: number;
}

export const TIER_CONFIG: Record<string, TierMetadata> = {
  TO_THE_MOON: {
    id: 'TO_THE_MOON',
    label: 'TO THE MOON',
    icon: '🚀',
    badgeClass: 'bg-gradient-to-r from-indigo-500 via-violet-600 to-purple-700 text-white font-black',
    animClass: 'animate-rocket-float',
    borderClass: 'border-violet-400/50',
    glowClass: 'shadow-[0_0_20px_rgba(139,92,246,0.5)]',
    textClass: 'text-violet-200',
    bgGradient: 'from-indigo-950/80 via-purple-950/70 to-[#0A0E1A]',
    descriptionTh: 'ขาขึ้นลอยฟ้า รันเทรนด์ปล่อยกำไรวิ่ง นั่งทับมือตามแผน',
    rank: 4
  },
  BUY_NOW: {
    id: 'BUY_NOW',
    label: 'BUY NOW!!',
    icon: '🔥',
    badgeClass: 'bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 text-white font-black',
    animClass: 'animate-fire-zoom',
    borderClass: 'border-orange-400/60',
    glowClass: 'shadow-[0_0_25px_rgba(239,68,68,0.6)]',
    textClass: 'text-orange-200',
    bgGradient: 'from-red-950/80 via-orange-950/70 to-[#0A0E1A]',
    descriptionTh: 'สัญญาณซื้อคมกริบ คอนเฟิร์มเหนือ EMA 9 และวอลุ่มหนุน เข้าซื้อเต็มสูบ!',
    rank: 1
  },
  BUY_ZONE: {
    id: 'BUY_ZONE',
    label: 'BUY ZONE',
    icon: '💰',
    badgeClass: 'bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold',
    animClass: '',
    borderClass: 'border-teal-400/50',
    glowClass: 'shadow-[0_0_18px_rgba(20,184,166,0.4)]',
    textClass: 'text-teal-200',
    bgGradient: 'from-teal-950/80 via-cyan-950/70 to-[#0A0E1A]',
    descriptionTh: 'โซนสะสมไม้แรก ทยอย DCA 25-50% ตามเทรนด์',
    rank: 2
  },
  GET_READY: {
    id: 'GET_READY',
    label: 'GET READY',
    icon: '⏳',
    badgeClass: 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold',
    animClass: 'animate-hourglass-flip',
    borderClass: 'border-amber-400/50',
    glowClass: 'shadow-[0_0_18px_rgba(245,158,11,0.4)]',
    textClass: 'text-amber-200',
    bgGradient: 'from-amber-950/80 via-yellow-950/60 to-[#0A0E1A]',
    descriptionTh: 'จ่อแนวรับใหญ่/สัญญาณไดเวอร์เจนซ์ หมุนนาฬิกาทรายเตรียมตัว รอแท่งเขียวผ่าน EMA 9!',
    rank: 3
  },
  ON_RADAR: {
    id: 'ON_RADAR',
    label: 'ON RADAR',
    icon: '📡',
    badgeClass: 'bg-gradient-to-r from-zinc-800 to-neutral-800 text-slate-200 font-semibold',
    animClass: '',
    borderClass: 'border-white/10',
    glowClass: 'shadow-none',
    textClass: 'text-slate-300',
    bgGradient: 'from-zinc-950/80 via-neutral-900/70 to-[#0A0E1A]',
    descriptionTh: 'ราคาวิ่งตามเทรนด์ปกติ เฝ้าสังเกตการณ์ในเรดาร์',
    rank: 5
  },
  SLOW_BLEED: {
    id: 'SLOW_BLEED',
    label: 'SLOW BLEED',
    icon: '🔪',
    badgeClass: 'bg-gradient-to-r from-pink-600 via-rose-500 to-red-400 text-white font-semibold',
    animClass: 'animate-bleed-drip',
    borderClass: 'border-rose-400/50',
    glowClass: 'shadow-[0_0_18px_rgba(244,63,94,0.4)]',
    textClass: 'text-rose-200',
    bgGradient: 'from-pink-950/80 via-rose-950/70 to-[#0A0E1A]',
    descriptionTh: 'หุ้นไหลซึมต่อเนื่อง ไร้แรงสถาบันซื้อ ถือเงินสด 100% รอโครงสร้างฟื้น',
    rank: 6
  },
  MAYDAY_EXIT: {
    id: 'MAYDAY_EXIT',
    label: 'MAYDAY EXIT',
    icon: '❌',
    badgeClass: 'bg-gradient-to-r from-red-700 via-rose-800 to-red-900 text-white font-black',
    animClass: 'animate-flash-alert',
    borderClass: 'border-red-500/80',
    glowClass: 'shadow-[0_0_25px_rgba(220,38,38,0.7)]',
    textClass: 'text-red-300',
    bgGradient: 'from-red-950/90 via-rose-950/80 to-[#0A0E1A]',
    descriptionTh: 'สัญญาณอันตรายขั้นวิกฤต หลุดต่ำกว่า EMA 200 ลึก พิจารณาหยุดขาดทุน!',
    rank: 7
  },
  // Legacy Fallbacks
  WAIT: {
    id: 'ON_RADAR',
    label: 'ON RADAR',
    icon: '📡',
    badgeClass: 'bg-gradient-to-r from-zinc-800 to-neutral-800 text-slate-200 font-semibold',
    animClass: '',
    borderClass: 'border-white/10',
    glowClass: 'shadow-none',
    textClass: 'text-slate-300',
    bgGradient: 'from-zinc-950/80 via-neutral-900/70 to-[#0A0E1A]',
    descriptionTh: 'เฝ้าสังเกตการณ์ในเรดาร์',
    rank: 5
  },
  DANGER: {
    id: 'MAYDAY_EXIT',
    label: 'MAYDAY EXIT',
    icon: '❌',
    badgeClass: 'bg-gradient-to-r from-red-700 via-rose-800 to-red-900 text-white font-black',
    animClass: 'animate-flash-alert',
    borderClass: 'border-red-500/80',
    glowClass: 'shadow-[0_0_25px_rgba(220,38,38,0.7)]',
    textClass: 'text-red-300',
    bgGradient: 'from-red-950/90 via-rose-950/80 to-[#0A0E1A]',
    descriptionTh: 'สัญญาณอันตราย หลุดต่ำกว่า EMA 200 ลึก',
    rank: 7
  }
};

export function getTierMetadata(trafficLight?: string | null): TierMetadata {
  if (!trafficLight) return TIER_CONFIG.ON_RADAR;
  return TIER_CONFIG[trafficLight] || TIER_CONFIG.ON_RADAR;
}

export function getTierRank(trafficLight?: string | null): number {
  return getTierMetadata(trafficLight).rank;
}
