import { IPriceLine } from 'lightweight-charts';
import { HorizontalLineDrawing } from '../types/drawingTypes';

let lastAlertTime = 0;

export interface PriceAlertEventDetail {
  id: string;
  price: number;
  text: string;
  direction: 'up' | 'down';
  symbol?: string;
  timestamp: number;
}

/**
 * Trigger sound & visual flash alert when candle crosses horizontal line
 */
export function triggerPriceAlert(
  line: HorizontalLineDrawing,
  direction: 'up' | 'down',
  containerEl: HTMLElement | null,
  priceLine?: IPriceLine,
  symbol?: string
): void {
  const now = Date.now();
  // Throttle alerts by 4 seconds to prevent sound spam
  if (now - lastAlertTime < 4000) return;
  lastAlertTime = now;

  // 1. Play TradingView-style Dual-tone Harmonic Chime
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const nowTime = ctx.currentTime;

      // Note 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(direction === 'up' ? 587.33 : 880.0, nowTime); // D5 or A5
      gain1.gain.setValueAtTime(0.18, nowTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, nowTime + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(nowTime);
      osc1.stop(nowTime + 0.22);

      // Note 2 (Ascending or Descending Harmony)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(direction === 'up' ? 880.0 : 440.0, nowTime + 0.12); // A5 or A4
      gain2.gain.setValueAtTime(0.22, nowTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, nowTime + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(nowTime + 0.12);
      osc2.stop(nowTime + 0.45);
    }
  } catch (err) {
    console.warn('Web Audio Alert could not play:', err);
  }

  // 2. Dispatch Window Event for UI Banner Notification
  try {
    const detail: PriceAlertEventDetail = {
      id: line.id,
      price: line.price,
      text: line.text || `${line.price.toFixed(2)} THB`,
      direction,
      symbol,
      timestamp: now,
    };
    window.dispatchEvent(new CustomEvent('chart-price-alert', { detail }));
  } catch (_) {}

  // 3. Visual pulse on chart container
  if (containerEl) {
    containerEl.classList.remove('price-alert-flash');
    // Force reflow
    void containerEl.offsetWidth;
    containerEl.classList.add('price-alert-flash');
    setTimeout(() => {
      containerEl.classList.remove('price-alert-flash');
    }, 1400);
  }

  // 4. PriceLine strobe flash (3 quick pulses)
  if (priceLine) {
    let count = 0;
    const interval = setInterval(() => {
      priceLine.applyOptions({
        color: count % 2 === 0 ? '#FFFFFF' : line.color,
      });
      count++;
      if (count >= 6) {
        clearInterval(interval);
        priceLine.applyOptions({ color: line.color });
      }
    }, 110);
  }
}
