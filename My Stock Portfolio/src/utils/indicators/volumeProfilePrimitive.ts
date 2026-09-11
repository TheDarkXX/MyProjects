import {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  Time,
  SeriesType,
} from 'lightweight-charts';
import { CanvasRenderingTarget2D } from 'fancy-canvas';
import { VolumeProfileConfig } from '../../types/indicatorConfig';
import { RawBarItem } from '../../types/chart';

class VolumeProfilePaneRenderer implements IPrimitivePaneRenderer {
  private _primitive: VolumeProfilePrimitive;

  constructor(primitive: VolumeProfilePrimitive) {
    this._primitive = primitive;
  }

  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._primitive.chart;
    const series = this._primitive.series;
    const bars = this._primitive.bars;
    const config = this._primitive.config;

    if (!chart || !series || !bars || bars.length === 0 || !config || config.visible === false) {
      return;
    }

    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;
      const { width: mediaWidth } = scope.mediaSize;
      const timeScale = chart.timeScale();
      const logicalRange = timeScale.getVisibleLogicalRange();

      if (!logicalRange) return;

      const fromIdx = Math.max(0, Math.floor(logicalRange.from));
      const toIdx = Math.min(bars.length - 1, Math.ceil(logicalRange.to));

      if (toIdx <= fromIdx) return;

      const visibleBars = bars.slice(fromIdx, toIdx + 1);
      if (visibleBars.length === 0) return;

      // 1. Calculate price extremes in visible range
      let minPrice = Infinity;
      let maxPrice = -Infinity;

      for (const b of visibleBars) {
        if (b.low < minPrice) minPrice = b.low;
        if (b.high > maxPrice) maxPrice = b.high;
      }

      if (minPrice >= maxPrice || !isFinite(minPrice) || !isFinite(maxPrice)) return;

      // 2. Create price bins (default: 40 bins)
      const rowSize = Math.max(10, Math.min(100, config.rowSize || 40));
      const binStep = (maxPrice - minPrice) / rowSize;
      const bins: {
        priceBottom: number;
        priceTop: number;
        buyVol: number;
        sellVol: number;
        totalVol: number;
      }[] = [];

      for (let i = 0; i < rowSize; i++) {
        bins.push({
          priceBottom: minPrice + i * binStep,
          priceTop: minPrice + (i + 1) * binStep,
          buyVol: 0,
          sellVol: 0,
          totalVol: 0,
        });
      }

      // 3. Accumulate volume into bins
      for (const b of visibleBars) {
        const isUp = b.close >= b.open;
        const vol = b.volume || 0;
        if (vol <= 0) continue;

        // Distribute volume proportionally over the candle high-low span
        const candleSpan = Math.max(0.0001, b.high - b.low);

        for (const bin of bins) {
          const overlapBottom = Math.max(b.low, bin.priceBottom);
          const overlapTop = Math.min(b.high, bin.priceTop);

          if (overlapTop > overlapBottom) {
            const overlapSpan = overlapTop - overlapBottom;
            const fraction = overlapSpan / candleSpan;
            const allocatedVol = vol * fraction;

            if (isUp) {
              bin.buyVol += allocatedVol;
            } else {
              bin.sellVol += allocatedVol;
            }
            bin.totalVol += allocatedVol;
          }
        }
      }

      // 4. Find Max Volume Bin & Point of Control (POC)
      let maxTotalVol = 0;
      let pocIndex = 0;
      let grandTotalVol = 0;

      for (let i = 0; i < bins.length; i++) {
        const b = bins[i];
        grandTotalVol += b.totalVol;
        if (b.totalVol > maxTotalVol) {
          maxTotalVol = b.totalVol;
          pocIndex = i;
        }
      }

      if (maxTotalVol <= 0) return;

      const pocBin = bins[pocIndex];
      const pocPrice = (pocBin.priceBottom + pocBin.priceTop) / 2;

      // 5. Draw Profile Bars
      const maxBarWidth = mediaWidth * ((config.widthPercent || 22) / 100);
      const isRight = (config.placement || 'right') === 'right';

      ctx.save();

      for (let i = 0; i < bins.length; i++) {
        const bin = bins[i];
        if (bin.totalVol <= 0) continue;

        const yTop = series.priceToCoordinate(bin.priceTop);
        const yBottom = series.priceToCoordinate(bin.priceBottom);

        if (yTop === null || yBottom === null) continue;

        const barY = Math.min(yTop, yBottom);
        const barHeight = Math.max(1, Math.abs(yBottom - yTop) - 0.5);

        const ratio = bin.totalVol / maxTotalVol;
        const totalW = ratio * maxBarWidth;
        const buyW = (bin.buyVol / bin.totalVol) * totalW;
        const sellW = totalW - buyW;

        if (isRight) {
          const startX = mediaWidth - totalW;
          // Buy Volume (Teal/Emerald)
          ctx.fillStyle = config.upColor || 'rgba(38, 166, 154, 0.45)';
          ctx.fillRect(startX, barY, buyW, barHeight);

          // Sell Volume (Rose/Red)
          ctx.fillStyle = config.downColor || 'rgba(239, 83, 80, 0.45)';
          ctx.fillRect(startX + buyW, barY, sellW, barHeight);
        } else {
          // Left placement
          ctx.fillStyle = config.upColor || 'rgba(38, 166, 154, 0.45)';
          ctx.fillRect(0, barY, buyW, barHeight);

          ctx.fillStyle = config.downColor || 'rgba(239, 83, 80, 0.45)';
          ctx.fillRect(buyW, barY, sellW, barHeight);
        }
      }

      // 6. Draw Point of Control (POC) Line (Red High Contrast)
      const pocY = series.priceToCoordinate(pocPrice);
      if (pocY !== null) {
        ctx.strokeStyle = config.pocColor || '#FF1744';
        ctx.lineWidth = config.pocLineWidth || 2;
        ctx.setLineDash([4, 2]);

        const lineStartX = isRight ? mediaWidth - maxBarWidth * 1.3 : 0;
        const lineEndX = isRight ? mediaWidth : maxBarWidth * 1.3;

        ctx.beginPath();
        ctx.moveTo(lineStartX, pocY);
        ctx.lineTo(lineEndX, pocY);
        ctx.stroke();

        // POC In-Canvas Badge
        ctx.setLineDash([]);
        const pocText = `POC $${pocPrice.toFixed(2)}`;
        ctx.font = 'bold 12px sans-serif';
        const metrics = ctx.measureText(pocText);
        const badgeW = metrics.width + 10;
        const badgeH = 18;
        const badgeX = isRight ? mediaWidth - badgeW - 6 : 6;
        const badgeY = pocY - badgeH / 2;

        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pocText, badgeX + badgeW / 2, pocY);
      }

      ctx.restore();
    });
  }
}

class VolumeProfilePaneView implements IPrimitivePaneView {
  private _renderer: VolumeProfilePaneRenderer;

  constructor(primitive: VolumeProfilePrimitive) {
    this._renderer = new VolumeProfilePaneRenderer(primitive);
  }

  renderer(): IPrimitivePaneRenderer {
    return this._renderer;
  }

  zOrder(): 'normal' | 'top' | 'bottom' {
    return 'bottom'; // Draw beneath candlesticks so candles remain crisp
  }
}

export class VolumeProfilePrimitive implements ISeriesPrimitive<Time> {
  chart: any = null;
  series: any = null;
  requestUpdate: (() => void) | null = null;

  bars: RawBarItem[] = [];
  config: VolumeProfileConfig | null = null;

  private _paneView: VolumeProfilePaneView;

  constructor() {
    this._paneView = new VolumeProfilePaneView(this);
  }

  attached(param: SeriesAttachedParameter<Time, SeriesType>): void {
    this.chart = param.chart;
    this.series = param.series;
    this.requestUpdate = param.requestUpdate;
    this.requestUpdate?.();
  }

  detached(): void {
    this.chart = null;
    this.series = null;
    this.requestUpdate = null;
  }

  setData(bars: RawBarItem[], config: VolumeProfileConfig): void {
    this.bars = bars;
    this.config = config;
    this.requestUpdate?.();
  }

  updateAllViews(): void {
    // Triggers on pan / zoom viewport change
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }
}
