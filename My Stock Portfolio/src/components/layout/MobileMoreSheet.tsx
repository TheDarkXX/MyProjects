import React, { useEffect } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { 
  PieChart, ShieldCheck, ReceiptText, Briefcase, 
  Settings, LogOut, X, ChevronRight, Sparkles 
} from 'lucide-react';
import clsx from 'clsx';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({ isOpen, onClose }) => {
  const { activeTab, setActiveTab } = useUiStore();
  const logout = useAuthStore((s) => s.logout);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const NAV_ITEMS = [
    { id: 'analysis', label: 'Analysis & Returns', desc: 'วิเคราะห์ผลตอบแทน & สัดส่วนพอร์ต', icon: PieChart, color: 'text-cyan-400' },
    { id: 'health', label: 'Health & Risk', desc: 'ตรวจสุขภาพพอร์ต & ความเสี่ยง', icon: ShieldCheck, color: 'text-emerald-400' },
    { id: 'transactions', label: 'Transactions', desc: 'ประวัติการซื้อขาย & Cash Flow', icon: ReceiptText, color: 'text-amber-400' },
    { id: 'portfolios', label: 'Portfolios', desc: 'จัดการพอร์ตทั้งหมดของคุณ', icon: Briefcase, color: 'text-purple-400' },
    { id: 'settings', label: 'Settings', desc: 'การตั้งค่า & Cloud Sync', icon: Settings, color: 'text-indigo-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div className="relative w-full max-w-xl bg-[#0D1019] border-t border-white/[0.1] rounded-t-3xl shadow-[0_-12px_48px_rgba(0,0,0,0.6)] p-5 z-10 animate-slide-up transform-gpu pb-safe">
        {/* Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FC2D79]" />
            <h3 className="text-base font-black text-white font-heading">เมนูเพิ่มเติม (More Features)</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav List */}
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={clsx(
                  "w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.98]",
                  isCurrent
                    ? "bg-[#823AFD]/15 border-[#823AFD]/40 shadow-sm"
                    : "bg-[#11141E]/60 border-white/[0.04] hover:bg-[#11141E] hover:border-white/[0.08]"
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/[0.06] bg-[#07090E]", item.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate font-heading">{item.label}</div>
                    <div className="text-[11px] text-slate-400 truncate">{item.desc}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            );
          })}

          {/* Switch to Desktop Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                onClose();
                localStorage.setItem('stock_layout_mode', 'desktop');
                window.location.href = window.location.pathname + '?mode=desktop';
              }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] font-bold text-xs transition-all cursor-pointer font-heading active:scale-[0.98] mb-2"
            >
              <span>🖥️</span>
              <span>สลับไปหน้าจอ Desktop (PC Version)</span>
            </button>
          </div>

          {/* Logout Button */}
          <div>
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs transition-all cursor-pointer font-heading active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ (Logout)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
