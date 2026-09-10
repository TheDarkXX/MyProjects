import React, { useState } from 'react';

interface StockLogoProps {
  symbol: string;
  domain?: string;
  size?: number;
}

// In-memory set of domains that returned 404 or failed
const failedDomains = new Set<string>();

export const StockLogo: React.FC<StockLogoProps> = ({ symbol, domain, size = 20 }) => {
  const [hasError, setHasError] = useState(() => {
    return !domain || failedDomains.has(domain);
  });

  const handleError = () => {
    if (domain) {
      failedDomains.add(domain);
    }
    setHasError(true);
  };

  // 2-character monogram fallback
  const monogram = symbol.replace(/[^A-Z]/g, '').slice(0, 2);

  if (hasError || !domain) {
    return (
      <div
        className="rounded-full flex items-center justify-center font-bold text-white bg-slate-700/80 shadow-inner flex-shrink-0"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(9, Math.floor(size * 0.45))
        }}
        title={symbol}
      >
        {monogram}
      </div>
    );
  }

  const logoUrl = `https://logo.clearbit.com/${domain}`;

  return (
    <img
      src={logoUrl}
      alt={symbol}
      onError={handleError}
      loading="lazy"
      className="rounded-full object-cover bg-white/10 shadow-sm flex-shrink-0"
      style={{
        width: size,
        height: size
      }}
    />
  );
};
