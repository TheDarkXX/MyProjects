import { useState, useEffect } from 'react';

export interface DeviceLayout {
  isMobile: boolean;       // < 640px (e.g. vivo X80 Pro ~393-412px)
  isTablet: boolean;       // Tablet mode: 640px-1023px OR iPad Air M2 13" Portrait (1024x1366)
  isDesktop: boolean;      // Desktop / Landscape mode (>= 1024px in landscape)
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

  const isMobile = w < 640;
  // Tablet is true if screen width is 640-1023px, OR if it is an iPad in portrait mode (w <= 1024 and h > w)
  const isTablet = !isMobile && (w < 1024 || (w <= 1024 && isPortrait));
  // Desktop is true when width >= 1024 in landscape
  const isDesktop = w >= 1024 && !isPortrait;
  const isCompact = !isDesktop;

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
