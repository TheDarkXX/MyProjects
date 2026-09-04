import React, { useEffect, useState } from 'react';
import { useBlueprintStore, BlueprintEntry } from '../../stores/blueprintStore';
import { useUiStore } from '../../stores/uiStore';
import { usePriceStore } from '../../stores/priceStore';
import { PRESET_TEMPLATES } from './StrategyConfigs';

interface BlueprintEditorProps {
  portfolioId: string;
}

export const BlueprintEditor: React.FC<BlueprintEditorProps> = ({ portfolioId }) => {
  const { blueprints, isLoading, error, fetchBlueprints, upsertBlueprint, deleteBlueprint, autoGenerate, applyTemplate } = useBlueprintStore();
  const { currency } = useUiStore();
  const { exchangeRate } = usePriceStore();

  const [newSymbol, setNewSymbol] = useState('');
  const [newTargetPercent, setNewTargetPercent] = useState<number | ''>('');
  const [newStatus, setNewStatus] = useState<'OWNED' | 'WATCHLIST'>('WATCHLIST');
  const [newTargetPrice, setNewTargetPrice] = useState<number | ''>('');

  const currSymbol = currency === 'THB' ? '฿' : '$';
  const effectiveRate = exchangeRate > 0 ? exchangeRate : 35.0;

  const formatPrice = (usd: number | null | undefined) => {
    if (!usd || isNaN(usd)) return '-';
    const val = currency === 'THB' ? usd * effectiveRate : usd;
    return `${currSymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  useEffect(() => {
    if (portfolioId) {
      fetchBlueprints(portfolioId);
    }
  }, [portfolioId, fetchBlueprints]);

  const handleAdd = async () => {
    if (!newSymbol || newTargetPercent === '') return;
    await upsertBlueprint(portfolioId, {
      symbol: newSymbol.toUpperCase(),
      target_percent: Number(newTargetPercent),
      target_price: newTargetPrice !== '' ? Number(newTargetPrice) : null,
      status: newStatus,
      category: 'Custom'
    });
    setNewSymbol('');
    setNewTargetPercent('');
    setNewTargetPrice('');
    setNewStatus('WATCHLIST');
  };

  const handleApplyTemplate = async (templateId: string) => {
    const template = PRESET_TEMPLATES.find(t => t.id === templateId);
    if (template && window.confirm(`คุณแน่ใจหรือไม่ที่จะใช้เทมเพลต ${template.name}? ระบบจะนำเข้าเป้าหมายของหุ้นกลุ่มนี้ลงใน Blueprint`)) {
      await applyTemplate(portfolioId, template.entries);
    }
  };

  const totalPercent = blueprints.reduce((acc, curr) => acc + curr.target_percent, 0);
  const isPercentValid = Math.abs(totalPercent - 100) < 0.01;

  if (isLoading && blueprints.length === 0) return <div className="p-8 text-center text-[#CBD5E1]">กำลังโหลด Blueprint...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Portfolio Blueprint Setup</h2>
          <p className="text-sm text-[#CBD5E1]">กำหนดสัดส่วนเป้าหมายในอุดมคติของคุณ ระบบ Smart Rebalance จะใช้ข้อมูลนี้แนะนำการซื้อขาย</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            className="bg-[#161926] border border-[#2A2E45] text-sm font-semibold rounded-xl px-4 py-2 text-white outline-none focus:border-[#823AFD]"
            onChange={(e) => handleApplyTemplate(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>เลือกเทมเพลตมาตรฐาน...</option>
            {PRESET_TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button 
            onClick={() => {
              if (window.confirm('สร้าง Blueprint อัตโนมัติจากหุ้นที่มีอยู่ในพอร์ตปัจจุบัน?')) autoGenerate(portfolioId);
            }}
            className="px-4 py-2 bg-[#1A1D2D] hover:bg-[#2A2E45] text-white text-sm font-bold rounded-xl border border-[#2A2E45] transition-colors"
          >
            Auto-Generate จากพอร์ตปัจจุบัน
          </button>
        </div>
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-sm text-[#CBD5E1]">
          <thead className="bg-[#161926] text-xs uppercase text-[#CBD5E1] border-b border-[#2A2E45]">
            <tr>
              <th className="px-6 py-4 font-bold">Symbol</th>
              <th className="px-6 py-4 font-bold text-right">Target %</th>
              <th className="px-6 py-4 font-bold text-center">Status</th>
              <th className="px-6 py-4 font-bold text-right">Target Price ({currSymbol})</th>
              <th className="px-6 py-4 font-bold">Category</th>
              <th className="px-6 py-4 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2E45]/60">
            {blueprints.map(bp => (
              <tr key={bp.symbol} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 font-black text-white text-base">{bp.symbol}</td>
                <td className="px-6 py-4 text-right font-black text-emerald-400 text-base">{bp.target_percent.toFixed(1)}%</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${bp.status === 'OWNED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                    {bp.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-white font-medium">{formatPrice(bp.target_price)}</td>
                <td className="px-6 py-4 text-[#CBD5E1]">{bp.category || 'Core'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => deleteBlueprint(portfolioId, bp.symbol)} className="text-rose-400 hover:text-rose-300 text-xs font-bold px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-all">ลบออก</button>
                </td>
              </tr>
            ))}
            
            {/* Add New Row */}
            <tr className="bg-[#161926]/70">
              <td className="px-6 py-3">
                <input 
                  type="text" 
                  placeholder="เช่น NVDA" 
                  value={newSymbol}
                  onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                  className="w-28 bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-3 py-1.5 text-sm text-white uppercase font-bold outline-none focus:border-[#823AFD]"
                />
              </td>
              <td className="px-6 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={newTargetPercent}
                    onChange={e => setNewTargetPercent(Number(e.target.value))}
                    className="w-20 bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-3 py-1.5 text-sm text-white text-right font-bold outline-none focus:border-[#10B981]"
                  />
                  <span className="text-white font-bold">%</span>
                </div>
              </td>
              <td className="px-6 py-3 text-center">
                <select 
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as 'OWNED' | 'WATCHLIST')}
                  className="bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none"
                >
                  <option value="WATCHLIST">Watchlist (ยังไม่มี)</option>
                  <option value="OWNED">Owned (ถืออยู่)</option>
                </select>
              </td>
              <td className="px-6 py-3 text-right">
                <input 
                  type="number" 
                  placeholder="ราคาเป้าหมาย ($)" 
                  value={newTargetPrice}
                  onChange={e => setNewTargetPrice(Number(e.target.value))}
                  className="w-28 bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-3 py-1.5 text-sm text-white text-right outline-none focus:border-[#823AFD]"
                />
              </td>
              <td className="px-6 py-3"></td>
              <td className="px-6 py-3 text-right">
                <button onClick={handleAdd} disabled={!newSymbol || newTargetPercent === ''} className="px-4 py-1.5 bg-[#823AFD] hover:bg-[#7220FB] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-40">
                  + เพิ่มหุ้น
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isPercentValid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
        <div>
          <div className={`text-base font-black ${isPercentValid ? 'text-emerald-400' : 'text-amber-400'}`}>
            สัดส่วนรวมทั้งหมด: {totalPercent.toFixed(1)}%
          </div>
          {!isPercentValid && (
            <div className="text-xs text-amber-300 mt-1 font-medium">
              สัดส่วนใน Blueprint ต้องรวมกันได้ 100% เพื่อให้การคำนวณ Rebalance แม่นยำ 
              {totalPercent < 100 ? ` (ยังขาดอีก ${(100 - totalPercent).toFixed(1)}%)` : ` (เกินไป ${(totalPercent - 100).toFixed(1)}%)`}
            </div>
          )}
        </div>
        {isPercentValid && (
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-500/20 px-4 py-1.5 rounded-full border border-emerald-500/40">
            <span>✓ Blueprint สมบูรณ์ พร้อม Rebalance</span>
          </div>
        )}
      </div>
    </div>
  );
};
