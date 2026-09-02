import React from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useUiStore } from '../../stores/uiStore';
import { MoreVertical, Briefcase, Plus, Check } from 'lucide-react';
import clsx from 'clsx';

export const PortfolioList = () => {
  const { portfolios, activePortfolioId, setActivePortfolio } = usePortfolioStore();
  const { setActiveTab } = useUiStore();

  const handleSelect = (id: string) => {
    setActivePortfolio(id);
    setActiveTab('dashboard');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-[#111418] p-6 rounded-3xl border border-[#2A2E45]">
        <div>
          <h2 className="text-xl font-bold text-white">Your Portfolios</h2>
          <p className="text-[#9898C8] text-sm mt-1">Manage multiple investment strategies</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white px-6 py-3 rounded-xl font-bold shadow-[0_4px_16px_rgba(252,45,121,0.3)] hover:opacity-90 transition-opacity">
          <Plus className="w-5 h-5" />
          New Portfolio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolios.map(port => {
          const isActive = port.id === activePortfolioId;
          return (
            <div 
              key={port.id} 
              onClick={() => handleSelect(port.id)}
              className={clsx(
                "bg-[#111418] border rounded-3xl p-6 relative overflow-hidden group transition-all cursor-pointer",
                isActive ? "border-[#823AFD] ring-2 ring-[#823AFD]/30" : "border-[#2A2E45] hover:border-[#823AFD]"
              )}
            >
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg border border-white/10"
                    style={{ backgroundColor: (port.color_hex || '#823AFD') + '20', color: port.color_hex || '#823AFD' }}
                  >
                    {port.icon || '💼'}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{port.name}</h3>
                    <p className="text-[#9898C8] text-xs">{port.description || port.base_currency}</p>
                  </div>
                </div>
                {isActive && (
                  <span className="flex items-center gap-1 text-xs font-bold text-[#823AFD] bg-[#823AFD]/10 px-2.5 py-1 rounded-lg border border-[#823AFD]/20">
                    <Check className="w-3.5 h-3.5" /> Active
                  </span>
                )}
              </div>

              <div className="space-y-2 relative z-10">
                <p className="text-[#9898C8] text-sm">Base Currency</p>
                <div className="flex items-end gap-3">
                  <span className="text-xl font-bold text-white tabular-nums tracking-tight">
                    {port.base_currency}
                  </span>
                </div>
              </div>
              
              {/* Background Glow */}
              <div 
                className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[64px] opacity-10 group-hover:opacity-20 transition-opacity"
                style={{ backgroundColor: port.color_hex || '#823AFD' }}
              ></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
