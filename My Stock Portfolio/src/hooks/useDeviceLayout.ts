import { useState, useEffect } from 'react';

export interface DeviceLayout {
  isMobile: boolean;       // < 640px (e.g. vivo X80 Pro ~393-412px)
  isTablet: boolean;       // 640px - 1279px (e.g. iPad Air M2 13" Portrait at 1024px, iPad 11" at 820px, Split View)
  isDesktop: boolean;      // >= 1280px (e.g. iPad Air M2 13" Landscape at 1366px, PC/Mac)
  isCompact: boolean;      // < 1280px (Mobile or Tablet layout active)
  isHighDPI: boolean;      // DPR >= 2.0 (vivo X80 Pro ~3.5x, iPad Retina 2.0x)
  dpr: number;
}

export function useDeviceLayout(): DeviceLayout {
  const [layout, setLayout] = useState<DeviceLayout>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isCompact: false,
        isHighDPI: false,
        dpr: 1,
      };
    }
    const w = window.innerWidth;
    const dpr = window.devicePixelRatio || 1;
    return {
      isMobile: w < 640,
      isTablet: w >= 640 && w < 1280,
      isDesktop: w >= 1280,
      isCompact: w < 1280,
      isHighDPI: dpr >= 2.0,
      dpr,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const dpr = window.devicePixelRatio || 1;
      setLayout({
        isMobile: w < 640,
        isTablet: w >= 640 && w < 1280,
        isDesktop: w >= 1280,
        isCompact: w < 1280,
        isHighDPI: dpr >= 2.0,
        dpr,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return layout;
}
