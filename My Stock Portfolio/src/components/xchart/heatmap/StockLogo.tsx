import React, { useState } from 'react';

interface StockLogoProps {
  symbol: string;
  domain?: string;
  size?: number;
}

// In-memory cache of failed logo sources to avoid redundant HTTP requests
const failedParqet = new Set<string>();
const failedGoogle = new Set<string>();

export const StockLogo: React.FC<StockLogoProps> = ({ symbol, domain, size = 20 }) => {
  const cleanSymbol = symbol.toUpperCase().replace('/', '.');
  
  // 0: Parqet, 1: Google Favicon, 2: Monogram Fallback
  const [stage, setStage] = useState<number>(() => {
    if (failedParqet.has(cleanSymbol)) {
      if (!domain || failedGoogle.has(domain)) return 2;
      return 1;
    }
    return 0;
  });

  const handleParqetError = () => {
    failedParqet.add(cleanSymbol);
    if (domain && !failedGoogle.has(domain)) {
      setStage(1);
    } else {
      setStage(2);
    }
  };

  const handleGoogleError = () => {
    if (domain) failedGoogle.add(domain);
    setStage(2);
  };

  // Monogram Fallback (2 chars)
  const monogram = symbol.replace(/[^A-Za-z0-9]/g, '').slice(0, 2);

  if (stage === 2) {
    return (
      <div
        className="rounded-full flex items-center justify-center font-bold text-white bg-[#262B3E] border border-white/10 shadow-sm flex-shrink-0 select-none"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(9, Math.floor(size * 0.42))
        }}
        title={symbol}
      >
        {monogram}
      </div>
    );
  }

  if (stage === 0) {
    return (
      <img
        src={`https://assets.parqet.com/logos/symbol/${cleanSymbol}?format=png`}
        alt={symbol}
        onError={handleParqetError}
        loading="lazy"
        className="rounded-full object-contain bg-black/40 border border-white/10 shadow-sm flex-shrink-0"
        style={{
          width: size,
          height: size
        }}
      />
    );
  }

  // stage === 1: Google Favicon V2
  return (
    <img
      src={`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`}
      alt={symbol}
      onError={handleGoogleError}
      loading="lazy"
      className="rounded-full object-contain bg-black/40 border border-white/10 shadow-sm flex-shrink-0"
      style={{
        width: size,
        height: size
      }}
    />
  );
};

