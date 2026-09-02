import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { Bell, Search } from 'lucide-react';

export const Header = () => {
  const { activeTab } = useUiStore();

  return (
    <header className="h-20 bg-[#0F111A]/80 backdrop-blur-xl border-b border-[#1F2233] px-8 flex items-center justify-between sticky top-0 z-50">
      <div>
        <h1 className="text-2xl font-bold text-white capitalize tracking-tight">
          {activeTab}
        </h1>
        <p className="text-sm text-[#9898C8] mt-0.5">
          Welcome back to your portfolio dashboard
        </p>
      </div>

      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative group">
          <Search className="w-5 h-5 text-[#9898C8] absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-[#823AFD] transition-colors" />
          <input 
            type="text" 
            placeholder="Search assets..." 
            className="bg-[#1A1D2D] border border-[#2A2E45] rounded-full pl-10 pr-4 py-2 text-white placeholder-[#9898C8] focus:outline-none focus:border-[#823AFD] focus:ring-1 focus:ring-[#823AFD] transition-all w-64"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-[#9898C8] hover:text-white transition-colors bg-[#1A1D2D] rounded-full border border-[#2A2E45] hover:border-[#823AFD]">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#FC2D79] rounded-full border-2 border-[#0F111A]"></span>
        </button>

        {/* Profile */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#823AFD] to-[#FC2D79] p-0.5 shadow-[0_2px_10px_rgba(130,58,253,0.25)]">
          <div className="w-full h-full bg-[#0F111A] rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">AD</span>
          </div>
        </div>
      </div>
    </header>
  );
};
