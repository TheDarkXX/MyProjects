import React from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { MoreVertical, Briefcase, Plus } from 'lucide-react';
import clsx from 'clsx';

const mockPortfolios = [
  { id: '1', name: 'Main Growth', description: 'Tech & AI focused', icon: '🚀', color_hex: '#823AFD', balance: 124500.00, gain: 12.5 },
  { id: '2', name: 'Dividend Yield', description: 'Safe income', icon: '💰', color_hex: '#22C55E', balance: 45000.00, gain: 4.2 },
  { id: '3', name: 'Crypto Bags', description: 'High risk', icon: '₿', color_hex: '#F59E0B', balance: 18200.00, gain: -15.4 },
];

export const PortfolioList = () => {
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
        {mockPortfolios.map(port => (
          <div key={port.id} className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 relative overflow-hidden group hover:border-[#823AFD] transition-colors cursor-pointer">
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg border border-white/10"
                  style={{ backgroundColor: port.color_hex + '20', color: port.color_hex }}
                >
                  {port.icon}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{port.name}</h3>
                  <p className="text-[#9898C8] text-xs">{port.description}</p>
                </div>
              </div>
              <button className="text-[#9898C8] hover:text-white p-1">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 relative z-10">
              <p className="text-[#9898C8] text-sm">Total Balance</p>
              <div className="flex items-end gap-3">
                <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
                  ${port.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={clsx(
                  "text-sm font-medium mb-1",
                  port.gain >= 0 ? "text-[#FC2D79]" : "text-[#823AFD]"
                )}>
                  {port.gain >= 0 ? '+' : ''}{port.gain}%
                </span>
              </div>
            </div>
            
            {/* Background Glow */}
            <div 
              className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[64px] opacity-10 group-hover:opacity-20 transition-opacity"
              style={{ backgroundColor: port.color_hex }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
};
