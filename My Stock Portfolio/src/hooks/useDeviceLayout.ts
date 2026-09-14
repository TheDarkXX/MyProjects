import { useState, useEffect } from 'react';

export interface DeviceLayout {
  isMobile: boolean;       // < 640px (e.g. vivo X80 Pro ~393-412px)
  isTablet: boolean;       // Tablet mode: 640px-1023px OR iPad Air M2 13" (Portrait & Landscape 1366x1024)
  isIPad: boolean;         // iPad-specific detection (Air M2 13", Pro, Mini)
  isDesktop: boolean;      // Desktop PC / Workstation (w > 1366, or non-touch desktop)
  isCompact: boolean;      // Mobile or Tablet layout active
  isHighDPI: boolean;      // DPR >= 2.0 (vivo X80 Pro ~3.5x, iPad Retina 2.0x)
  isPortrait: boolean;
  dpr: number;
}

export type LayoutMode = 'auto' | 'mobile' | 'desktop';

export function setLayoutMode(mode: LayoutMode) {
  if (typeof window === 'undefined') return;
  if (mode === 'auto') {
    localStorage.removeItem('stock_layout_mode');
  } else {
    localStorage.setItem('stock_layout_mode', mode);
  }
  window.dispatchEvent(new Event('resize'));
}

function calculateLayout(): DeviceLayout {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isIPad: false,
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

  // 1. Check URL parameters or hash for explicit mode override (?mode=mobile or ?mode=desktop)
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get('mode') || (window.location.pathname.includes('/mobile') ? 'mobile' : null);
  const hasMobileHash = window.location.hash.toLowerCase().includes('mobile');
  
  if (modeParam === 'mobile' || hasMobileHash) {
    try { localStorage.setItem('stock_layout_mode', 'mobile'); } catch {}
  } else if (modeParam === 'desktop') {
    try { localStorage.setItem('stock_layout_mode', 'desktop'); } catch {}
  }

  // 2. Check saved preference in localStorage
  let savedMode: string | null = null;
  try {
    savedMode = localStorage.getItem('stock_layout_mode');
  } catch {}

  // 3. Robust touch & iPad detection
  // Detect iPad specifically (iPadOS Safari & Chrome identify as Macintosh with touch points, or physical 1366x1024 / 1024x1366)
  const isIPad = (typeof navigator !== 'undefined') && (
    /iPad/i.test(navigator.userAgent) || 
    (navigator.userAgent.includes('Macintosh') && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window)) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 0) ||
    ((typeof screen !== 'undefined') && ((screen.width === 1024 && screen.height === 1366) || (screen.width === 1366 && screen.height === 1024)))
  );

  const hasTouch = (typeof navigator !== 'undefined') && (
    navigator.maxTouchPoints > 0 || 
    'ontouchstart' in window || 
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  );

  const isMobile = w < 640;

  // Determine isDesktop
  let isDesktop = false;
  if (isIPad && modeParam !== 'desktop') {
    // iPad Air M2 13" (and any iPad) ALWAYS defaults to mobile layout unless explicitly asked
    isDesktop = false;
  } else if (savedMode === 'mobile') {
    isDesktop = false;
  } else if (savedMode === 'desktop') {
    isDesktop = true;
  } else {
    // Auto Mode:
    // Any iPad (including iPad Air M2 13" in both portrait and landscape) stays in compact/mobile layout
    // Any touch device with width <= 1440 stays in compact layout
    // Any screen in portrait mode stays in compact layout
    if (isIPad || isPortrait || (hasTouch && w <= 1440)) {
      isDesktop = false;
    } else {
      isDesktop = w >= 1200 && !hasTouch;
    }
  }

  const isCompact = !isDesktop;
  const isTablet = isCompact && !isMobile;

  return {
    isMobile,
    isTablet,
    isIPad: !!isIPad,
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
