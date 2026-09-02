import React from 'react';
import { Database, Shield, Download, Upload, Moon } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';

export const SettingPage = () => {
  const addNotification = useUiStore((s) => s.addNotification);

  const handleBackup = async () => {
    try {
      // In a real implementation this would call api.backup.create()
      addNotification({ type: 'success', message: 'Backup generated successfully. (Simulated)' });
    } catch (e) {
      addNotification({ type: 'error', message: 'Failed to generate backup' });
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>
        </div>

      </div>
    </div>
  );
};
