import {
  customSeriesDefaultOptions,
  CustomSeriesOptions,
  CustomSeriesPricePlotValues,
  ICustomSeriesPaneRenderer,
  ICustomSeriesPaneView,
  PaneRendererCustomData,
  PriceToCoordinateConverter,
  Time,
  WhitespaceData,
} from 'lightweight-charts';
import { CanvasRenderingTarget2D } from 'fancy-canvas';

export interface BankerMCDXData {
  time: Time;
  banker: number;    // 0 to 20: Red (Smart Money)
  hotMoney: number;  // 0 to 20: Yellow cumulative top
  retail: number;    // 0 to 20: Green
}

export interface BankerMCDXOptions extends CustomSeriesOptions {
  bankerColor: string;
  hotMoneyColor: string;
  retailColor: string;
}

export const defaultBankerMCDXOptions: BankerMCDXOptions = {
  ...customSeriesDefaultOptions,
  bankerColor: '#C62828',    // Deep Crimson Red
  hotMoneyColor: '#FFF176',  // Soft Light Yellow
  retailColor: '#1B5E20',    // Deep Forest Green
  priceFormat: {
    type: 'custom',
    minMove: 1,
    formatter: (val: number) => val.toFixed(0),
  },
};

class BankerMCDXRenderer implements ICustomSeriesPaneRenderer {
  private _data: PaneRendererCustomData<Time, BankerMCDXData> | null = null;
  private _options: BankerMCDXOptions = defaultBankerMCDXOptions;

  update(data: PaneRendererCustomData<Time, BankerMCDXData>, options: BankerMCDXOptions) {
    this._data = data;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D, priceConverter: PriceToCoordinateConverter): void {
    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      const bars = this._data?.bars;
      if (!bars || bars.length === 0) return;

      const barSpacing = (this._data?.barSpacing ?? 6) * hRatio;

      // Crisp pixel width calculation to eliminate any uneven gaps or rasterization jitter
      let barWidth: number;
      if (barSpacing <= 2) {
        barWidth = Math.max(1, Math.floor(barSpacing));
      } else if (barSpacing <= 6) {
        barWidth = Math.max(1, Math.floor(barSpacing - 1));
      } else {
        barWidth = Math.max(1, Math.round(barSpacing * 0.75));
      }

      const yBase = Math.round((priceConverter(0) ?? 0) * vRatio);
      const yTop20 = Math.round((priceConverter(20) ?? 0) * vRatio);

      const visibleRange = this._data?.visibleRange;
      const startIndex = visibleRange ? Math.max(0, visibleRange.from) : 0;
      const endIndex = visibleRange ? Math.min(bars.length - 1, visibleRange.to) : bars.length - 1;

      for (let i = startIndex; i <= endIndex; i++) {
        const bar = bars[i];
        const orig = bar.originalData as BankerMCDXData;
        if (!orig) continue;

        const bVal = Math.max(0, Math.min(20, orig.banker ?? 0));
        let hVal = Math.max(0, Math.min(20, orig.hotMoney ?? 0));
        if (hVal === 0 && bVal > 0) {
          hVal = Math.min(20, bVal * 1.6);
        }
        const topYellow = Math.max(bVal, hVal);

        // Exact physical pixel positioning
        const xCenter = Math.round(bar.x * hRatio);
        const xLeft = Math.round(xCenter - barWidth / 2);

        const yBanker = Math.round((priceConverter(bVal) ?? yBase) * vRatio);
        const yYellowTop = Math.round((priceConverter(topYellow) ?? yBanker) * vRatio);
        const yGreenTop = yTop20;

        // 1. Red Base (Banker Institutional Flow): 0 to bVal
        if (bVal > 0 && yBase > yBanker) {
          ctx.fillStyle = this._options.bankerColor;
          ctx.fillRect(xLeft, yBanker, barWidth, yBase - yBanker);
        }

        // 2. Yellow Mid (Hot Money Speculative Flow): bVal to topYellow
        if (topYellow > bVal && yBanker > yYellowTop) {
          ctx.fillStyle = this._options.hotMoneyColor;
          ctx.fillRect(xLeft, yYellowTop, barWidth, yBanker - yYellowTop);
        }

        // 3. Green Top (Retail Floating Supply): topYellow to 20
        if (20 > topYellow && yYellowTop > yGreenTop) {
          ctx.fillStyle = this._options.retailColor;
          ctx.fillRect(xLeft, yGreenTop, barWidth, yYellowTop - yGreenTop);
        }
      }
    });
  }
}

export class BankerMCDXSeriesView implements ICustomSeriesPaneView<Time, BankerMCDXData, BankerMCDXOptions> {
  private _renderer: BankerMCDXRenderer = new BankerMCDXRenderer();

  renderer(): ICustomSeriesPaneRenderer {
    return this._renderer;
  }

  update(data: PaneRendererCustomData<Time, BankerMCDXData>, options: BankerMCDXOptions): void {
    this._renderer.update(data, options);
  }

  priceValueBuilder(plotRow: BankerMCDXData): CustomSeriesPricePlotValues {
    // Return max 20, min 0, and current value for scaling & tooltip
    return [20, 0, plotRow.banker ?? 0];
  }

  isWhitespace(data: BankerMCDXData | WhitespaceData<Time>): data is WhitespaceData<Time> {
    return (data as BankerMCDXData).banker === undefined;
  }

  defaultOptions(): BankerMCDXOptions {
    return defaultBankerMCDXOptions;
  }

  destroy(): void {
    // Clean up references
  }
}
