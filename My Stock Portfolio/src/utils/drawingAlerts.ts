import { IPriceLine } from 'lightweight-charts';
import { HorizontalLineDrawing } from '../types/drawingTypes';

let lastAlertTime = 0;

/**
 * Trigger sound & visual flash alert when candle crosses horizontal line
 */
export function triggerPriceAlert(
  line: HorizontalLineDrawing,
  direction: 'up' | 'down',
  containerEl: HTMLElement | null,
  priceLine?: IPriceLine
): void {
  const now = Date.now();
  // Throttle alerts by 5 seconds to prevent audio spam
  if (now - lastAlertTime < 5000) return;
  lastAlertTime = now;

  // 1. Play Web Audio Beep
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(direction === 'up' ? 880 : 520, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (err) {
    console.warn('Web Audio Alert could not play:', err);
  }

  // 2. Visual flash on container
  if (containerEl) {
    containerEl.classList.add('price-alert-flash');
    setTimeout(() => {
      containerEl.classList.remove('price-alert-flash');
    }, 1200);
  }

  // 3. PriceLine quick flash
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
    }, 120);
  }
}
