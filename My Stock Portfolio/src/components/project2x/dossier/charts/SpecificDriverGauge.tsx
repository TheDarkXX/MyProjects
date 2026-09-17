import React, { useState } from 'react';
import { Edit2, Check, X, HelpCircle } from 'lucide-react';
import { useDossierStore, SpecificDriverItem } from '../../../../stores/dossierStore';

interface SpecificDriverGaugeProps {
  symbol: string;
  driver: SpecificDriverItem | null;
  className?: string;
}

export const SpecificDriverGauge: React.FC<SpecificDriverGaugeProps> = ({
  symbol,
  driver,
  className = ''
}) => {
  const { updateDriver } = useDossierStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(driver ? String(driver.metric_value) : '0');
  const [isSaving, setIsSaving] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  if (!driver) {
    return (
      <div className={`bg-[#0B1226]/90 border border-blue-900/40 rounded-2xl p-4 shadow-xl flex items-center justify-center text-slate-400 text-sm ${className}`}>
        ไม่มีตัวเร่งเฉพาะตัวสำหรับ {symbol}
      </div>
    );
  }

  const value = driver.metric_value;
  const unit = driver.metric_unit || '';
  const safe = driver.safe_threshold ?? 75;
  const danger = driver.danger_threshold ?? 50;

  const isHealthy = value >= safe;
  const isDanger = value < danger;
  const isWarning = !isHealthy && !isDanger;

  // Arc Gauge Geometry (Semi-circle 180 degrees)
  const percent = unit === '%' ? Math.min(100, Math.max(0, value)) : Math.min(100, Math.max(0, (value / (safe * 1.3)) * 100));

  const handleSave = async () => {
    const num = parseFloat(editValue);
    if (isNaN(num)) return;
    setIsSaving(true);
    await updateDriver(driver.metric_key, num);
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <div className={`relative bg-[#0B1226]/95 border border-blue-900/60 rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <div className="flex items-center gap-1.5">
            <h4 className="text-[15px] font-semibold text-slate-100 uppercase tracking-wide">
              Key Driver: {driver.metric_label}
            </h4>
            {/* Info tooltip trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowInfo(!showInfo)}
                className="text-slate-400 hover:text-blue-300 transition-colors p-0.5"
                title="คลิกเพื่อดูคำอธิบาย"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              {showInfo && (
                <div className="absolute left-0 top-6 z-30 w-64 p-2.5 bg-[#141E38] border border-blue-600/40 rounded-xl shadow-2xl text-[12px] text-slate-200 leading-relaxed backdrop-blur-md">
                  <p className="font-semibold text-blue-300 mb-1">📌 ตัวเร่งเฉพาะตัว (Thesis KPI)</p>
                  <p>
                    ตัวชี้วัดพิเศษที่ชี้เป็นชี้ตายความได้เปรียบทางธุรกิจ (ไม่มี API ภายนอกดึงอัตโนมัติ) สามารถกดไอคอนดินสอเพื่ออัปเดตตัวเลขหลังฟัง Oppday หรืออ่านงบการเงิน
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Discreet Edit Trigger */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
            Oppday KPI
          </span>
          {!isEditing ? (
            <button
              onClick={() => {
                setEditValue(String(driver.metric_value));
                setIsEditing(true);
              }}
              className="p-1 text-slate-400 hover:text-blue-300 hover:bg-blue-600/20 rounded-lg transition-colors border border-transparent hover:border-blue-500/30 cursor-pointer"
              title="แก้ไขตัวเลขหลังอ่านงบ"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="p-1 rounded-lg bg-blue-600/30 text-blue-200 hover:bg-blue-600/50 border border-blue-500/50 cursor-pointer"
                title="บันทึก"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                title="ยกเลิก"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Gauge Visual */}
      <div className="flex items-center justify-center my-2">
        <div className="relative w-48 h-26 flex items-end justify-center">
          <svg className="w-48 h-26 overflow-visible" viewBox="0 0 160 90">
            <defs>
              <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="glow" />
                <feComposite in="SourceGraphic" in2="glow" operator="over" />
              </filter>
            </defs>

            {/* Background Track Arc (Deep Blue Slate) */}
            <path
              d="M 15 80 A 65 65 0 0 1 145 80"
              fill="none"
              stroke="#1E293B"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Value Progress Arc (Deep Red / Deep Blue) */}
            <path
              d="M 15 80 A 65 65 0 0 1 145 80"
              fill="none"
              stroke={isHealthy ? '#3B82F6' : isDanger ? '#DC2626' : '#64748B'}
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={204}
              strokeDashoffset={204 - (percent / 100) * 204}
              filter="url(#gaugeGlow)"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center Value Text */}
          <div className="absolute bottom-1 text-center">
            {isEditing ? (
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number"
                  step="any"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-22 bg-[#060A16] border border-blue-400 rounded px-2 py-0.5 text-center text-xl font-bold text-white focus:outline-none"
                  autoFocus
                />
                <span className="text-sm text-blue-300 font-bold">{unit}</span>
              </div>
            ) : (
              <div className="flex items-baseline justify-center gap-1">
                <span
                  className={`text-3xl font-black font-mono tracking-tight drop-shadow-md ${
                    isHealthy ? 'text-blue-300' : isDanger ? 'text-rose-400' : 'text-slate-200'
                  }`}
                >
                  {value}
                </span>
                <span className="text-sm font-bold text-slate-200 font-mono">
                  {unit}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Threshold Legend Bar */}
      <div className="mt-1 pt-2 border-t border-blue-900/40 flex items-center justify-between text-[13px] text-slate-300 font-normal">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
          <span className="text-rose-300">อันตราย: &lt;{danger}{unit}</span>
        </div>
        {isWarning && (
          <div className="flex items-center gap-1 text-[12px] text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-600/50">
            เฝ้าระวัง
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.7)]" />
          <span className="text-blue-300">ปลอดภัย: &ge;{safe}{unit}</span>
        </div>
      </div>
    </div>
  );
};
