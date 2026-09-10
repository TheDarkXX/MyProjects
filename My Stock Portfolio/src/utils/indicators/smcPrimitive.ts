import {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  Time,
  SeriesType,
  Logical,
  Coordinate,
} from 'lightweight-charts';
import { CanvasRenderingTarget2D } from 'fancy-canvas';
import { SMCResult } from './smcLite';
import { SMCLiteConfig } from '../../types/indicatorConfig';

class SMCPaneRenderer implements IPrimitivePaneRenderer {
  private _primitive: SMCPrimitive;

  constructor(primitive: SMCPrimitive) {
    this._primitive = primitive;
  }

  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._primitive.chart;
    const series = this._primitive.series;
    const data = this._primitive.data;
    const config = this._primitive.config;

    if (!chart || !series || !data || !config) return;

    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;
      const { width: mediaWidth, height: mediaHeight } = scope.mediaSize;
      const timeScale = chart.timeScale();

      // Helper to get X coordinate from time or bar index
      const getX = (timeStr: string, index: number): number | null => {
        let t: Time = timeStr as Time;
        if (timeStr && timeStr.includes('T')) {
          t = Math.floor(new Date(timeStr).getTime() / 1000) as any;
        }
        let x = timeScale.timeToCoordinate(t);
        if (x === null) {
          x = timeScale.logicalToCoordinate(index as Logical);
        }
        return x !== null ? (x as number) : null;
      };

      // Helper to get Y coordinate from price
      const getY = (price: number): number | null => {
        const y = series.priceToCoordinate(price);
        return y !== null ? (y as number) : null;
      };

      // -----------------------------------------------------------
      // 1. Render Supply Zones (Navy Blue Boxes)
      // -----------------------------------------------------------
      if (config.showBoxes !== false && data.activeSupplyZones.length > 0) {
        for (const zone of data.activeSupplyZones) {
          const x1 = getX(zone.startTime, zone.startIndex);
          if (x1 === null && zone.startIndex < 0) continue;
          const leftX = x1 !== null ? Math.max(0, x1) : 0;
          const rightX = mediaWidth;

          const yTop = getY(zone.top);
          const yBottom = getY(zone.bottom);
          if (yTop === null || yBottom === null) continue;

          const boxY = Math.min(yTop, yBottom);
          const boxHeight = Math.max(2, Math.abs(yBottom - yTop));
          const boxWidth = Math.max(2, rightX - leftX);

          // Fill zone background
          ctx.fillStyle = config.supplyColor || 'rgba(30, 58, 95, 0.4)';
          ctx.fillRect(leftX, boxY, boxWidth, boxHeight);

          // Outline
          ctx.strokeStyle = config.supplyOutlineColor || 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(leftX, boxY, boxWidth, boxHeight);

          // POI Midline
          const yPoi = getY(zone.poi);
          if (config.showLines !== false && yPoi !== null) {
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = config.poiLabelColor || 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.moveTo(leftX, yPoi);
            ctx.lineTo(rightX, yPoi);
            ctx.stroke();
            ctx.restore();

            // Left "POI" pill badge
            ctx.save();
            ctx.font = 'bold 12px sans-serif';
            const poiText = 'POI';
            const poiMetrics = ctx.measureText(poiText);
            const badgeW = poiMetrics.width + 10;
            const badgeH = 16;
            const badgeX = leftX + 4;
            const badgeY = yPoi - badgeH / 2;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.stroke();

            ctx.fillStyle = '#F8FAFC';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(poiText, badgeX + badgeW / 2, yPoi);
            ctx.restore();
          }

          // Centered "SUPPLY" Text
          ctx.save();
          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const centerX = leftX + boxWidth / 2;
          ctx.fillText('SUPPLY', centerX, boxY + boxHeight / 2);
          ctx.restore();
        }
      }

      // -----------------------------------------------------------
      // 2. Render Demand Zones (Golden Khaki Boxes)
      // -----------------------------------------------------------
      if (config.showBoxes !== false && data.activeDemandZones.length > 0) {
        for (const zone of data.activeDemandZones) {
          const x1 = getX(zone.startTime, zone.startIndex);
          if (x1 === null && zone.startIndex < 0) continue;
          const leftX = x1 !== null ? Math.max(0, x1) : 0;
          const rightX = mediaWidth;

          const yTop = getY(zone.top);
          const yBottom = getY(zone.bottom);
          if (yTop === null || yBottom === null) continue;

          const boxY = Math.min(yTop, yBottom);
          const boxHeight = Math.max(2, Math.abs(yBottom - yTop));
          const boxWidth = Math.max(2, rightX - leftX);

          // Fill zone background
          ctx.fillStyle = config.demandColor || 'rgba(160, 130, 40, 0.35)';
          ctx.fillRect(leftX, boxY, boxWidth, boxHeight);

          // Outline
          ctx.strokeStyle = config.demandOutlineColor || 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(leftX, boxY, boxWidth, boxHeight);

          // POI Midline
          const yPoi = getY(zone.poi);
          if (config.showLines !== false && yPoi !== null) {
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = config.poiLabelColor || 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.moveTo(leftX, yPoi);
            ctx.lineTo(rightX, yPoi);
            ctx.stroke();
            ctx.restore();

            // Left "POI" pill badge
            ctx.save();
            ctx.font = 'bold 12px sans-serif';
            const poiText = 'POI';
            const poiMetrics = ctx.measureText(poiText);
            const badgeW = poiMetrics.width + 10;
            const badgeH = 16;
            const badgeX = leftX + 4;
            const badgeY = yPoi - badgeH / 2;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.stroke();

            ctx.fillStyle = '#F8FAFC';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(poiText, badgeX + badgeW / 2, yPoi);
            ctx.restore();
          }

          // Centered "DEMAND" Text
          ctx.save();
          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const centerX = leftX + boxWidth / 2;
          ctx.fillText('DEMAND', centerX, boxY + boxHeight / 2);
          ctx.restore();
        }
      }

      // -----------------------------------------------------------
      // 3. Render BOS Lines & Labels
      // -----------------------------------------------------------
      if (config.showLines !== false && data.bosLines.length > 0) {
        for (const bos of data.bosLines) {
          const x1 = getX(bos.startTime, bos.startIndex);
          const x2 = getX(bos.endTime, bos.endIndex);
          const y = getY(bos.level);

          if (x1 === null || x2 === null || y === null) continue;

          const startX = Math.min(x1, x2);
          const endX = Math.max(x1, x2);

          // Dashed line
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = config.bosLabelColor || 'rgba(226, 232, 240, 0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          ctx.stroke();
          ctx.restore();

          // Centered "BOS" pill badge
          ctx.save();
          ctx.font = 'bold 12px sans-serif';
          const text = 'BOS';
          const metrics = ctx.measureText(text);
          const pillW = metrics.width + 10;
          const pillH = 16;
          const midX = (startX + endX) / 2;
          const pillX = midX - pillW / 2;
          const pillY = y - pillH / 2;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 3);
          ctx.fill();
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#F8FAFC';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, midX, y);
          ctx.restore();
        }
      }

      // -----------------------------------------------------------
      // 4. Render Zigzag
      // -----------------------------------------------------------
      if (config.showZigzag && data.zigzagPoints.length > 1) {
        ctx.save();
        ctx.strokeStyle = config.zigzagColor || '#EAB308';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        let hasMoved = false;
        for (const pt of data.zigzagPoints) {
          const x = getX(pt.time, pt.index);
          const y = getY(pt.price);
          if (x !== null && y !== null) {
            if (!hasMoved) {
              ctx.moveTo(x, y);
              hasMoved = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        if (hasMoved) {
          ctx.stroke();
        }
        ctx.restore();
      }

      // -----------------------------------------------------------
      // 5. Render Price Action Labels (HH, LH, HL, LL)
      // -----------------------------------------------------------
      if (config.showPriceActionLabels && data.priceActionLabels.length > 0) {
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const label of data.priceActionLabels) {
          const x = getX(label.time, label.index);
          const y = getY(label.price);
          if (x === null || y === null) continue;

          const pillW = 26;
          const pillH = 16;
          const pillY = label.isHigh ? y - 14 - pillH / 2 : y + 14 - pillH / 2;
          const pillX = x - pillW / 2;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 3);
          ctx.fill();
          ctx.strokeStyle = config.swingTypeColor || 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = label.isHigh ? '#38BDF8' : '#FBBF24';
          ctx.fillText(label.text, x, pillY + pillH / 2);
        }
        ctx.restore();
      }
    });
  }
}

class SMCPaneView implements IPrimitivePaneView {
  private _renderer: SMCPaneRenderer;

  constructor(primitive: SMCPrimitive) {
    this._renderer = new SMCPaneRenderer(primitive);
  }

  renderer(): IPrimitivePaneRenderer {
    return this._renderer;
  }

  zOrder(): 'normal' | 'top' | 'bottom' {
    return 'normal';
  }
}

export class SMCPrimitive implements ISeriesPrimitive<Time> {
  chart: any = null;
  series: any = null;
  requestUpdate: (() => void) | null = null;
  data: SMCResult | null = null;
  config: SMCLiteConfig | null = null;

  private _paneView: SMCPaneView;

  constructor() {
    this._paneView = new SMCPaneView(this);
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

  setData(data: SMCResult, config: SMCLiteConfig): void {
    this.data = data;
    this.config = config;
    this.requestUpdate?.();
  }

  updateAllViews(): void {
    // Called when viewport changes
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }
}
