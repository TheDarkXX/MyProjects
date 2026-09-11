import {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  Time,
  SeriesType,
} from 'lightweight-charts';
import { CanvasRenderingTarget2D } from 'fancy-canvas';
import { TrendLineDrawing } from '../../types/drawingTypes';
import { timeToCoordinateSafe } from '../drawingUtils';

export interface TrendLinePreview {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  color?: string;
  lineWidth?: number;
}

class TrendLinePaneRenderer implements IPrimitivePaneRenderer {
  private _primitive: TrendLinePrimitive;

  constructor(primitive: TrendLinePrimitive) {
    this._primitive = primitive;
  }

  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._primitive.chart;
    const series = this._primitive.series;
    const trendLines = this._primitive.trendLines;
    const previewLine = this._primitive.previewLine;
    const selectedId = this._primitive.selectedId;

    if (!chart || !series) return;

    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;
      const { width: mediaWidth } = scope.mediaSize;
      const timeScale = chart.timeScale();

      // 1. Draw saved Trendlines
      if (trendLines && trendLines.length > 0) {
        for (const line of trendLines) {
          if (line.visible === false) continue;

          const x1 = timeToCoordinateSafe(timeScale, line.startTime);
          const y1 = series.priceToCoordinate(line.startPrice);
          const x2 = timeToCoordinateSafe(timeScale, line.endTime);
          const y2 = series.priceToCoordinate(line.endPrice);

          if (x1 === null || y1 === null || x2 === null || y2 === null) continue;

          ctx.save();
          ctx.strokeStyle = line.color || '#2962FF';
          ctx.lineWidth = line.lineWidth || 2;

          // Line dash style
          if (line.lineStyle === 'Dashed') {
            ctx.setLineDash([6, 6]);
          } else if (line.lineStyle === 'Dotted') {
            ctx.setLineDash([2, 3]);
          } else {
            ctx.setLineDash([]);
          }

          let endX = x2;
          let endY = y2;

          if (line.extendRight && x2 !== x1) {
            const slope = (y2 - y1) / (x2 - x1);
            endX = mediaWidth;
            endY = y1 + slope * (mediaWidth - x1);
          }

          // Draw main line
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // If selected, draw TradingView-style interactive anchor dots
          if (line.id === selectedId) {
            ctx.setLineDash([]);
            // Anchor 1
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = line.color || '#2962FF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x1, y1, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Anchor 2
            ctx.beginPath();
            ctx.arc(x2, y2, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }

          ctx.restore();
        }
      }

      // 2. Draw in-progress Preview Line during user drawing interaction
      if (previewLine) {
        ctx.save();
        ctx.strokeStyle = previewLine.color || '#3B82F6';
        ctx.lineWidth = previewLine.lineWidth || 2;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(previewLine.startX, previewLine.startY);
        ctx.lineTo(previewLine.currentX, previewLine.currentY);
        ctx.stroke();

        // Draw start and current anchor points
        ctx.setLineDash([]);
        ctx.fillStyle = '#60A5FA';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.arc(previewLine.startX, previewLine.startY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(previewLine.currentX, previewLine.currentY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    });
  }
}

class TrendLinePaneView implements IPrimitivePaneView {
  private _renderer: TrendLinePaneRenderer;

  constructor(primitive: TrendLinePrimitive) {
    this._renderer = new TrendLinePaneRenderer(primitive);
  }

  renderer(): IPrimitivePaneRenderer {
    return this._renderer;
  }

  zOrder(): 'normal' | 'top' | 'bottom' {
    return 'top';
  }
}

export class TrendLinePrimitive implements ISeriesPrimitive<Time> {
  chart: any = null;
  series: any = null;
  requestUpdate: (() => void) | null = null;

  trendLines: TrendLineDrawing[] = [];
  selectedId: string | null = null;
  previewLine: TrendLinePreview | null = null;

  private _paneView: TrendLinePaneView;

  constructor() {
    this._paneView = new TrendLinePaneView(this);
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

  setData(trendLines: TrendLineDrawing[], selectedId: string | null = null, previewLine: TrendLinePreview | null = null): void {
    this.trendLines = trendLines;
    this.selectedId = selectedId;
    this.previewLine = previewLine;
    this.requestUpdate?.();
  }

  updateAllViews(): void {
    // Viewport change hook
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }
}
