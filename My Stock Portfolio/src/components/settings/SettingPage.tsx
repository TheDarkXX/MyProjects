import React from 'react';
import { Database, Shield, Download, Upload, Moon, Briefcase, Plus, Check } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import clsx from 'clsx';

export const SettingPage = () => {
  const { 
    addNotification, 
    sidebarMode, 
    setSidebarMode, 
    xchartHideHeader, 
    setXChartHideHeader,
    xchartEnable4HForex,
    setXChartEnable4HForex
  } = useUiStore();
  const { portfolios, activePortfolioId, setActivePortfolio } = usePortfolioStore();

  const handleBackup = async () => {
    try {
      // In a real implementation this would call api.backup.create()
      addNotification?.({ type: 'success', message: 'Backup generated successfully. (Simulated)' });
    } catch (e) {
      addNotification?.({ type: 'error', message: 'Failed to generate backup' });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
          <p className="text-[#9898C8] mt-2">Manage your portfolio configurations and system data</p>
        </div>
      </div>

      {/* 1. Portfolio Management */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#823AFD]/20 to-[#823AFD]/5 text-[#823AFD]">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Portfolio Management</h2>
              <p className="text-slate-300 text-sm mt-0.5">จัดการและสลับพอร์ตการลงทุน หรือเพิ่มพอร์ตกลยุทธ์ใหม่</p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_4px_16px_rgba(252,45,121,0.3)] hover:opacity-90 transition-opacity self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            New Portfolio
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map(port => {
            const isActive = port.id === activePortfolioId;
            return (
              <div 
                key={port.id} 
                onClick={() => setActivePortfolio(port.id)}
                className={clsx(
                  "bg-[#0B1220] border rounded-2xl p-5 relative overflow-hidden group transition-all cursor-pointer",
                  isActive ? "border-[#823AFD] ring-2 ring-[#823AFD]/30" : "border-[#2A2E45] hover:border-[#823AFD]"
                )}
              >
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg border border-white/10"
                      style={{ backgroundColor: (port.color_hex || '#823AFD') + '20', color: port.color_hex || '#823AFD' }}
                    >
                      {port.icon || '💼'}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base">{port.name}</h3>
                      <p className="text-slate-300 text-xs">{port.description || port.base_currency}</p>
                    </div>
                  </div>
                  {isActive && (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  )}
                </div>

                <div className="space-y-1 relative z-10">
                  <p className="text-slate-400 text-xs font-semibold">Base Currency</p>
                  <span className="text-lg font-bold text-white tabular-nums tracking-tight">
                    {port.base_currency}
                  </span>
                </div>
                
                {/* Background Glow */}
                <div 
                  className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[64px] opacity-10 group-hover:opacity-20 transition-opacity"
                  style={{ backgroundColor: port.color_hex || '#823AFD' }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Security & Access */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#FC2D79]/20 to-[#FC2D79]/5 text-[#FC2D79]">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Security & Access</h2>
          </div>
          
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#2A2E45]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-medium">Master Password</h3>
                  <p className="text-[#9898C8] text-sm mt-1">Managed securely via environment variables</p>
                </div>
                <span className="px-3 py-1 text-xs font-medium bg-green-500/10 text-green-400 rounded-full border border-green-500/20">Secured</span>
              </div>
              <div className="mt-4 text-xs font-mono text-[#9898C8] bg-[#111418] p-3 rounded-xl border border-[#2A2E45]">
                /root/stock-portfolio/server/.env
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#2A2E45]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-medium">API Keys</h3>
                  <p className="text-[#9898C8] text-sm mt-1">Finnhub & Polygon data providers</p>
                </div>
                <span className="px-3 py-1 text-xs font-medium bg-green-500/10 text-green-400 rounded-full border border-green-500/20">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#823AFD]/20 to-[#823AFD]/5 text-[#823AFD]">
              <Database className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Data Management</h2>
          </div>
          
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#2A2E45]">
              <h3 className="text-white font-medium mb-1">Export Database</h3>
              <p className="text-[#9898C8] text-sm mb-4">Download a full JSON backup of your portfolios, transactions, and settings.</p>
              <button 
                onClick={handleBackup}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2A2E45] hover:bg-[#3B405A] text-white font-medium flex items-center justify-center space-x-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Backup</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#2A2E45] opacity-50">
              <h3 className="text-white font-medium mb-1">Restore Database</h3>
              <p className="text-[#9898C8] text-sm mb-4">Upload a JSON backup to restore your data. (Coming soon)</p>
              <button disabled className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#111418] text-[#9898C8] font-medium flex items-center justify-center space-x-2 cursor-not-allowed">
                <Upload className="w-4 h-4" />
                <span>Upload Backup</span>
              </button>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)] lg:col-span-2">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#FD5514]/20 to-[#FD5514]/5 text-[#FD5514]">
              <Moon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Preferences</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#2A2E45] flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Theme</h3>
                <p className="text-[#9898C8] text-sm mt-1">Application color scheme</p>
              </div>
              <div className="px-4 py-2 rounded-lg bg-[#111418] border border-[#823AFD] text-[#823AFD] font-medium text-sm">
                Electric Dark
              </div>
            </div>
            
            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#2A2E45] flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Currency</h3>
                <p className="text-[#9898C8] text-sm mt-1">Default display currency</p>
              </div>
              <div className="px-4 py-2 rounded-lg bg-[#111418] border border-[#2A2E45] text-white font-medium text-sm">
                USD ($)
              </div>
            </div>

            {/* Left Sidebar Layout (Normal vs Compact) */}
            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#2A2E45] flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">Left Sidebar</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                    {sidebarMode === 'normal' ? 'Normal' : 'Compact'}
                  </span>
                </div>
                <p className="text-[#9898C8] text-xs mt-1">
                  เลือกแสดงผลแบบเต็ม (Normal) หรือย่อเหลือแต่ไอคอน (Compact)
                </p>
              </div>

              <div className="flex items-center gap-2 p-1 rounded-xl bg-[#111418] border border-[#2A2E45]">
                <button
                  type="button"
                  onClick={() => setSidebarMode('normal')}
                  className={clsx(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    sidebarMode === 'normal'
                      ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  Normal (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarMode('compact')}
                  className={clsx(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    sidebarMode === 'compact'
                      ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  Compact
                </button>
              </div>
            </div>

            {/* X-Chart Top Bar Auto-Hide */}
            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#2A2E45] flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">X-Chart Top Bar</h3>
                  <span className={clsx(
                    "text-xs px-2 py-0.5 rounded-full font-semibold border",
                    xchartHideHeader 
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  )}>
                    {xchartHideHeader ? 'Hidden (Full Screen)' : 'Visible'}
                  </span>
                </div>
                <p className="text-[#CBD5E1] text-xs mt-1">
                  ซ่อน Header หลักในหน้า X-Chart เพื่อขยายพื้นที่กราฟเต็มจอ ไม่กินที่แนวตั้ง
                </p>
              </div>

              <div className="flex items-center gap-2 p-1 rounded-xl bg-[#111418] border border-[#2A2E45]">
                <button
                  type="button"
                  onClick={() => setXChartHideHeader(false)}
                  className={clsx(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    !xchartHideHeader
                      ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  แสดง Header
                </button>
                <button
                  type="button"
                  onClick={() => setXChartHideHeader(true)}
                  className={clsx(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    xchartHideHeader
                      ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  ซ่อน (Full Screen)
                </button>
              </div>
            </div>

            {/* USD/THB 4-Hour Timeframe Toggle */}
            <div className="p-5 rounded-2xl bg-[#0B1220] border border-[#2A2E45] flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">USD/THB 4H Timeframe</h3>
                  <span className={clsx(
                    "text-xs px-2 py-0.5 rounded-full font-semibold border",
                    xchartEnable4HForex 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  )}>
                    {xchartEnable4HForex ? 'Enabled (Active)' : 'Disabled'}
                  </span>
                </div>
                <p className="text-[#CBD5E1] text-[13px] mt-1 leading-relaxed">
                  เปิด/ปิดปุ่มและชุดข้อมูลแท่งเทียน 4H ย้อนหลัง 2 ปี บนกราฟคู่เงิน USD/THB (THB=X)
                </p>
              </div>

              <div className="flex items-center gap-2 p-1 rounded-xl bg-[#111418] border border-[#2A2E45]">
                <button
                  type="button"
                  onClick={() => setXChartEnable4HForex(true)}
                  className={clsx(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    xchartEnable4HForex
                      ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  เปิดใช้งาน (4H)
                </button>
                <button
                  type="button"
                  onClick={() => setXChartEnable4HForex(false)}
                  className={clsx(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    !xchartEnable4HForex
                      ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  ปิดใช้งาน
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
