import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
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

  if (!driver) {
    return (
      <div className={`bg-[#0B0F1A] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-center text-slate-400 text-sm ${className}`}>
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

  // Arc Gauge Geometry (Semi-circle 180 degrees)
  const radius = 60;
  const circumference = Math.PI * radius; // 188.5
  // Normalize percentage for the gauge (0-100% or scale relative to safe/danger)
  const percent = unit === '%' ? Math.min(100, Math.max(0, value)) : Math.min(100, Math.max(0, (value / (safe * 1.3)) * 100));
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const handleSave = async () => {
    const num = parseFloat(editValue);
    if (isNaN(num)) return;
    setIsSaving(true);
    await updateDriver(driver.metric_key, num);
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <div className={`relative bg-[#0B1226]/95 border border-blue-900/50 rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md ${className}`}>
      {/* Top Header & Edit Trigger */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h4 className="text-sm font-black text-white uppercase tracking-wider">
            Key Driver: {driver.metric_label}
          </h4>
        </div>

        {!isEditing ? (
          <button
            onClick={() => {
              setEditValue(String(driver.metric_value));
              setIsEditing(true);
            }}
            className="flex items-center gap-1.5 text-[13px] font-bold text-cyan-200 hover:text-white bg-blue-600/20 hover:bg-blue-600/40 px-2.5 py-1 rounded-lg transition-colors border border-blue-500/40 cursor-pointer"
            title="แก้ไขตัวเลขหลังอ่านงบ"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>แก้ไข</span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 cursor-pointer"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Gauge Visual */}
      <div className="flex items-center justify-center my-2">
        <div className="relative w-44 h-24 flex items-end justify-center">
          <svg className="w-44 h-24 overflow-visible" viewBox="0 0 160 90">
            {/* Background Track Arc */}
            <path
              d="M 15 80 A 65 65 0 0 1 145 80"
              fill="none"
              stroke="#1E293B"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Value Progress Arc */}
            <path
              d="M 15 80 A 65 65 0 0 1 145 80"
              fill="none"
              stroke={isHealthy ? '#10B981' : isDanger ? '#F43F5E' : '#38BDF8'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={204}
              strokeDashoffset={204 - (percent / 100) * 204}
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
                  className="w-20 bg-[#060A16] border border-cyan-400 rounded px-1.5 py-0.5 text-center text-lg font-bold text-white focus:outline-none"
                  autoFocus
                />
                <span className="text-sm text-cyan-200 font-bold">{unit}</span>
              </div>
            ) : (
              <div className="flex items-baseline justify-center gap-1">
                <span className={`text-3xl font-black font-mono tracking-tight drop-shadow-md ${isHealthy ? 'text-emerald-400' : isDanger ? 'text-rose-400' : 'text-cyan-200'}`}>
                  {value}
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  {unit}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Threshold Legend Bar */}
      <div className="mt-1 pt-2 border-t border-blue-900/40 flex items-center justify-between text-[13px] text-white">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-slate-200">อันตราย: &lt;{danger}{unit}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-200">ปลอดภัย: &ge;{safe}{unit}</span>
        </div>
      </div>
    </div>
  );
};
