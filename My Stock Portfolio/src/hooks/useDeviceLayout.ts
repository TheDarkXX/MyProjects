import { useState, useEffect } from 'react';

export interface DeviceLayout {
  isMobile: boolean;       // < 640px (e.g. vivo X80 Pro ~393-412px)
  isTablet: boolean;       // Tablet mode: 640px-1023px OR iPad Air M2 13" (Portrait & Landscape 1366x1024)
  isDesktop: boolean;      // Desktop PC / Workstation (w > 1366, or non-touch desktop)
  isCompact: boolean;      // Mobile or Tablet layout active
  isHighDPI: boolean;      // DPR >= 2.0 (vivo X80 Pro ~3.5x, iPad Retina 2.0x)
  isPortrait: boolean;
  dpr: number;
}

function calculateLayout(): DeviceLayout {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isCompact: false,
      isHighDPI: false,
      isPortrait: false,
      dpr: 1,
    };
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const isPortrait = h > w;

  // Detect iPad specifically (iPadOS Safari identifies as Macintosh with touch points)
  const isIPad = (typeof navigator !== 'undefined') && (
    /iPad/i.test(navigator.userAgent) || 
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  );

  const hasTouch = (typeof navigator !== 'undefined') && (
    navigator.maxTouchPoints > 0 || 'ontouchstart' in window
  );

  const isMobile = w < 640;

  // Desktop workstation layout is active ONLY when:
  // 1. Not an iPad (iPad Air M2 13" in both portrait and landscape stays in mobile/tablet layout as requested)
  // 2. Not in portrait orientation
  // 3. Screen width exceeds 1366px (or >= 1280px without touch mouse PC)
  const isDesktop = !isIPad && !isPortrait && (hasTouch ? w > 1366 : w >= 1280);
  const isCompact = !isDesktop;
  const isTablet = isCompact && !isMobile;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isCompact,
    isHighDPI: dpr >= 2.0,
    isPortrait,
    dpr,
  };
}

export function useDeviceLayout(): DeviceLayout {
  const [layout, setLayout] = useState<DeviceLayout>(calculateLayout);

  useEffect(() => {
    const handleResize = () => {
      setLayout(calculateLayout());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return layout;
}
