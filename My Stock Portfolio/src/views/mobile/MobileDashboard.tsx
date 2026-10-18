import React, { useState } from 'react';
import { MobileWatchlistSection } from './components/MobileWatchlistSection';
import { StockDetailDrawer } from '../../components/portfolio/StockDetailDrawer';

export const MobileDashboard: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  return (
    <div className="space-y-4 animate-fade-in-up pb-8 max-w-2xl mx-auto select-none">
      {/* Dedicated High-Density Cyber Watchlist (PC 7-Tier + Index + Benchmarks) */}
      <MobileWatchlistSection
        onSelectSymbol={(sym) => setSelectedSymbol(sym)}
      />

      {/* Stock Detail Drawer */}
      <StockDetailDrawer
        symbol={selectedSymbol}
        isOpen={!!selectedSymbol}
        onClose={() => setSelectedSymbol(null)}
      />
    </div>
  );
};
