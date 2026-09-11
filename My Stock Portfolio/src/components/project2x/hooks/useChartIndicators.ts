import { useMemo } from 'react';
import { Time, SeriesMarker, SeriesMarkerShape } from 'lightweight-charts';
import { computeEMA } from '../../../utils/computeEMA';
import { computeUltimateRSI, UltimateRSIResult } from '../../../utils/indicators/ultimateRSI';
import { computeTrendSpeed, TrendSpeedResult } from '../../../utils/indicators/trendSpeed';
import { computeSMCLite, SMCResult } from '../../../utils/indicators/smcLite';
import { computeAnchoredVWAP, AnchoredVWAPResult } from '../../../utils/indicators/anchoredVWAP';
import { computeSuperMoneySignal, SuperMoneySignalResult } from '../../../utils/indicators/superMoneySignal';
import {
  IndicatorSettings,
  RSIMarkerShape,
  RSIMarkerLocation,
} from '../../../types/indicatorConfig';
import {
  RawBarItem,
  Resolution,
  ChartStyle,
  PortfolioOverlayConfig,
  formatBarTime,
} from '../../../types/chart';

export interface UseChartIndicatorsProps {
  dates?: string[];
  closes: number[];
  opens?: number[];
  highs?: number[];
  lows?: number[];
  volumes?: number[];
  ema50?: (number | null)[];
  ema150?: (number | null)[];
  ema200?: (number | null)[];
  bankerSeries?: number[];
  hotMoneySeries?: number[];
  retailSeries?: number[];
  bankerMaSeries?: number[];
  resolution: Resolution;
  chartStyle: ChartStyle;
  indicatorConfig: IndicatorSettings;
  portfolioOverlay?: PortfolioOverlayConfig;
}

// Helper to map RSI marker shape to SeriesMarkerShape & text
const getRsiMarkerProps = (
  shape: RSIMarkerShape = 'circle'
): { shape: SeriesMarkerShape; text?: string; size: number } => {
  switch (shape) {
    case 'diamond':
      return { shape: 'circle', text: '◇', size: 0 };
    case 'cross':
      return { shape: 'circle', text: '+', size: 0 };
    case 'square':
      return { shape: 'square', text: undefined, size: 0.7 };
    case 'arrowUp':
      return { shape: 'arrowUp', text: undefined, size: 0.8 };
    case 'arrowDown':
      return { shape: 'arrowDown', text: undefined, size: 0.8 };
    case 'circle':
    default:
      return { shape: 'circle', text: undefined, size: 0.7 };
  }
};

const GLYPH_MAP: Record<string, string> = {
  arrowUp: '▲',
  arrowDown: '▼',
  arrowRight: '►',
  arrowDoubleUp: '⇈',
  circle: '●',
  circleOutline: '○',
  square: '■',
  squareOutline: '□',
  diamond: '◆',
  diamondOutline: '◇',
  triangle: '▲',
  triangleOutline: '△',
  triangleDown: '▼',
  hexagon: '⬡',
  star: '★',
  starOutline: '☆',
  sparkle: '✦',
  cross: '✚',
  xMark: '✖',
  check: '✔',
  bolt: '⚡',
  target: '🎯',
  fire: '🔥',
  flag: '⚑',
  dollar: '💲',
};

export function useChartIndicators({
  dates = [],
  closes = [],
  opens = [],
  highs = [],
  lows = [],
  volumes = [],
  ema50 = [],
  ema150 = [],
  ema200 = [],
  bankerSeries = [],
  hotMoneySeries = [],
  retailSeries = [],
  bankerMaSeries = [],
  resolution,
  chartStyle,
  indicatorConfig,
  portfolioOverlay,
}: UseChartIndicatorsProps) {
  // Dynamic client-side EMA recalculation with server fallback
  const activeEma1 = useMemo(() => {
    if (indicatorConfig.ema1.period === 50 && ema50 && ema50.length === closes.length) {
      return ema50;
    }
    return computeEMA(closes, indicatorConfig.ema1.period);
  }, [closes, ema50, indicatorConfig.ema1.period]);

  const activeEma2 = useMemo(() => {
    if (indicatorConfig.ema2.period === 150 && ema150 && ema150.length === closes.length) {
      return ema150;
    }
    return computeEMA(closes, indicatorConfig.ema2.period);
  }, [closes, ema150, indicatorConfig.ema2.period]);

  const activeEma3 = useMemo(() => {
    if (indicatorConfig.ema3.period === 200 && ema200 && ema200.length === closes.length) {
      return ema200;
    }
    return computeEMA(closes, indicatorConfig.ema3.period);
  }, [closes, ema200, indicatorConfig.ema3.period]);

  // Sanitize & build raw clean bars sorted by date ascending
  const rawCleanBars: RawBarItem[] = useMemo(() => {
    const total = (closes || []).length;
    if (total === 0) return [];

    const items: RawBarItem[] = [];
    const seenDates = new Set<string>();

    for (let i = 0; i < total; i++) {
      const d = dates[i];
      if (!d || seenDates.has(d)) continue;
      seenDates.add(d);

      const c = closes[i];
      if (typeof c !== 'number' || isNaN(c)) continue;

      let o = opens[i] !== undefined && !isNaN(opens[i]) ? opens[i] : (i > 0 ? closes[i - 1] : c * 0.998);
      let h = highs[i] !== undefined && !isNaN(highs[i]) ? highs[i] : Math.max(o, c);
      let l = lows[i] !== undefined && !isNaN(lows[i]) ? lows[i] : Math.min(o, c);

      // Synthesize realistic wicks if DB has only close prices
      if (h <= l) {
        const prevC = i > 0 ? closes[i - 1] : c;
        const spread = Math.max(c * 0.015, Math.abs(c - prevC) * 1.4);
        h = Math.max(o, c) + spread * 0.6;
        l = Math.min(o, c) - spread * 0.6;
      }

      const e50Val = activeEma1[i] !== undefined && activeEma1[i] !== null && !isNaN(activeEma1[i]!) ? activeEma1[i] : null;
      const e150Val = activeEma2[i] !== undefined && activeEma2[i] !== null && !isNaN(activeEma2[i]!) ? activeEma2[i] : null;
      const e200Val = activeEma3[i] !== undefined && activeEma3[i] !== null && !isNaN(activeEma3[i]!) ? activeEma3[i] : null;

      const bVal = bankerSeries[i] ?? 0;
      let hVal = hotMoneySeries[i] ?? 0;
      if (hVal === 0 && bVal > 0) {
        hVal = Math.min(20, bVal * 1.6);
      }
      const rVal = retailSeries[i] ?? Math.max(0, 20 - Math.max(bVal, hVal));

      const maLen = indicatorConfig.mcdx.maPeriod || 9;
      let bMaVal = bVal;
      if (maLen === 9 && bankerMaSeries[i] !== undefined) {
        bMaVal = bankerMaSeries[i];
      } else {
        const start = Math.max(0, i - maLen + 1);
        let sum = 0;
        let count = 0;
        for (let k = start; k <= i; k++) {
          sum += (bankerSeries[k] ?? 0);
          count++;
        }
        bMaVal = count > 0 ? sum / count : bVal;
      }

      items.push({
        time: d,
        open: Number(o.toFixed(2)),
        high: Number(h.toFixed(2)),
        low: Number(l.toFixed(2)),
        close: Number(c.toFixed(2)),
        volume: volumes[i] || 0,
        ema50: e50Val !== null ? Number(e50Val.toFixed(2)) : null,
        ema150: e150Val !== null ? Number(e150Val.toFixed(2)) : null,
        ema200: e200Val !== null ? Number(e200Val.toFixed(2)) : null,
        banker: Number(bVal.toFixed(2)),
        hotMoney: Number(hVal.toFixed(2)),
        retail: Number(rVal.toFixed(2)),
        bankerMa: Number(bMaVal.toFixed(2)),
      });
    }

    items.sort((a, b) => a.time.localeCompare(b.time));
    return items;
  }, [dates, closes, opens, highs, lows, volumes, activeEma1, activeEma2, activeEma3, bankerSeries, hotMoneySeries, retailSeries, bankerMaSeries, indicatorConfig.mcdx.maPeriod]);

  // Aggregate into Weekly bars (if resolution === '1W')
  const aggregatedBars: RawBarItem[] = useMemo(() => {
    if (resolution === '1D' || resolution === '4H' || rawCleanBars.length === 0) return rawCleanBars;

    const weeksMap = new Map<string, RawBarItem[]>();
    for (const bar of rawCleanBars) {
      const d = new Date(bar.time);
      const day = d.getUTCDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() + diffToMon);
      const monStr = monday.toISOString().split('T')[0];

      if (!weeksMap.has(monStr)) {
        weeksMap.set(monStr, []);
      }
      weeksMap.get(monStr)!.push(bar);
    }

    const weeklyBars: RawBarItem[] = [];
    for (const [monStr, days] of weeksMap.entries()) {
      if (days.length === 0) continue;
      const firstDay = days[0];
      const lastDay = days[days.length - 1];

      let weekHigh = -Infinity;
      let weekLow = Infinity;
      let weekVol = 0;

      for (const day of days) {
        if (day.high > weekHigh) weekHigh = day.high;
        if (day.low < weekLow) weekLow = day.low;
        weekVol += day.volume;
      }

      weeklyBars.push({
        time: monStr,
        open: firstDay.open,
        high: Number(weekHigh.toFixed(2)),
        low: Number(weekLow.toFixed(2)),
        close: lastDay.close,
        volume: weekVol,
        ema50: lastDay.ema50,
        ema150: lastDay.ema150,
        ema200: lastDay.ema200,
        banker: lastDay.banker,
        hotMoney: lastDay.hotMoney,
        retail: lastDay.retail,
        bankerMa: lastDay.bankerMa,
      });
    }

    weeklyBars.sort((a, b) => a.time.localeCompare(b.time));
    return weeklyBars;
  }, [rawCleanBars, resolution]);

  // Compute Heikin-Ashi if selected
  const displayBars: RawBarItem[] = useMemo(() => {
    if (chartStyle !== 'HEIKIN_ASHI' || aggregatedBars.length === 0) return aggregatedBars;

    const haResult: RawBarItem[] = [];
    let prevHaOpen = 0;
    let prevHaClose = 0;

    for (let i = 0; i < aggregatedBars.length; i++) {
      const b = aggregatedBars[i];
      const haClose = (b.open + b.high + b.low + b.close) / 4;
      const haOpen = i === 0 ? (b.open + b.close) / 2 : (prevHaOpen + prevHaClose) / 2;
      const haHigh = Math.max(b.high, haOpen, haClose);
      const haLow = Math.min(b.low, haOpen, haClose);

      prevHaOpen = haOpen;
      prevHaClose = haClose;

      haResult.push({
        ...b,
        open: Number(haOpen.toFixed(2)),
        high: Number(haHigh.toFixed(2)),
        low: Number(haLow.toFixed(2)),
        close: Number(haClose.toFixed(2)),
      });
    }
    return haResult;
  }, [aggregatedBars, chartStyle]);

  // Map for O(1) hover lookup by date string or unix timestamp seconds
  const rawBarsByDate = useMemo(() => {
    const map = new Map<string, RawBarItem>();
    for (const b of aggregatedBars) {
      map.set(b.time, b);
      if (b.time && b.time.includes('T')) {
        const sec = Math.floor(new Date(b.time).getTime() / 1000);
        map.set(String(sec), b);
      }
    }
    return map;
  }, [aggregatedBars]);

  // Compute My Ultimate RSI by doctorbank8989
  const ultimateRSIResult: UltimateRSIResult | null = useMemo(() => {
    if (aggregatedBars.length === 0) return null;
    const closes = aggregatedBars.map(b => b.close);
    const highs = aggregatedBars.map(b => b.high);
    const lows = aggregatedBars.map(b => b.low);
    const opens = aggregatedBars.map(b => b.open);
    return computeUltimateRSI(closes, highs, lows, opens, {
      length: indicatorConfig.ultimateRsi.length,
      smoType1: indicatorConfig.ultimateRsi.smoType1,
      smooth: indicatorConfig.ultimateRsi.smooth,
      smoType2: indicatorConfig.ultimateRsi.smoType2,
      source: indicatorConfig.ultimateRsi.source,
    });
  }, [
    aggregatedBars,
    indicatorConfig.ultimateRsi.length,
    indicatorConfig.ultimateRsi.smoType1,
    indicatorConfig.ultimateRsi.smooth,
    indicatorConfig.ultimateRsi.smoType2,
    indicatorConfig.ultimateRsi.source,
  ]);

  // Map for O(1) hover lookup of Ultimate RSI values by date
  const rsiDataByDate = useMemo(() => {
    const map = new Map<string, { arsi: number | null; signal: number | null; buyCross: boolean; reversal: boolean; buyZone: boolean }>();
    if (!ultimateRSIResult) return map;
    for (let i = 0; i < aggregatedBars.length; i++) {
      const b = aggregatedBars[i];
      const item = {
        arsi: ultimateRSIResult.arsi[i],
        signal: ultimateRSIResult.signal[i],
        buyCross: ultimateRSIResult.bullishCrossLow[i],
        reversal: ultimateRSIResult.bullishReversal[i],
        buyZone: ultimateRSIResult.buyZone[i],
      };
      map.set(b.time, item);
      if (b.time && b.time.includes('T')) {
        const sec = Math.floor(new Date(b.time).getTime() / 1000);
        map.set(String(sec), item);
      }
    }
    return map;
  }, [aggregatedBars, ultimateRSIResult]);

  // Compute Trend Speed Analyzer by Zeiierman
  const trendSpeedResult: TrendSpeedResult | null = useMemo(() => {
    if (aggregatedBars.length === 0) return null;
    const c = aggregatedBars.map(b => b.close);
    const o = aggregatedBars.map(b => b.open);
    const h = aggregatedBars.map(b => b.high);
    const l = aggregatedBars.map(b => b.low);
    return computeTrendSpeed(c, o, h, l, {
      maxLength: indicatorConfig.trendSpeed?.maxLength ?? 50,
      accelMultiplier: indicatorConfig.trendSpeed?.accelMultiplier ?? 0.01,
      enableTable: indicatorConfig.trendSpeed?.enableTable ?? true,
      lookbackPeriod: indicatorConfig.trendSpeed?.lookbackPeriod ?? 150,
      enableCandles: indicatorConfig.trendSpeed?.enableCandles ?? true,
      collectionPeriod: indicatorConfig.trendSpeed?.collectionPeriod ?? 100,
      upTrendColor: indicatorConfig.trendSpeed?.upTrendColor ?? '#F7D02C',
      dnTrendColor: indicatorConfig.trendSpeed?.dnTrendColor ?? '#FFF8DB',
      upHistColor1: indicatorConfig.trendSpeed?.upHistColor1 ?? '#F7D02C',
      upHistColor2: indicatorConfig.trendSpeed?.upHistColor2 ?? '#FFE600',
      dnHistColor1: indicatorConfig.trendSpeed?.dnHistColor1 ?? '#9E2A2B',
      dnHistColor2: indicatorConfig.trendSpeed?.dnHistColor2 ?? '#C83337',
    });
  }, [
    aggregatedBars,
    indicatorConfig.trendSpeed?.maxLength,
    indicatorConfig.trendSpeed?.accelMultiplier,
    indicatorConfig.trendSpeed?.enableTable,
    indicatorConfig.trendSpeed?.lookbackPeriod,
    indicatorConfig.trendSpeed?.enableCandles,
    indicatorConfig.trendSpeed?.collectionPeriod,
    indicatorConfig.trendSpeed?.upTrendColor,
    indicatorConfig.trendSpeed?.dnTrendColor,
    indicatorConfig.trendSpeed?.upHistColor1,
    indicatorConfig.trendSpeed?.upHistColor2,
    indicatorConfig.trendSpeed?.dnHistColor1,
    indicatorConfig.trendSpeed?.dnHistColor2,
  ]);

  // Map for O(1) hover lookup of Trend Speed values by date
  const trendSpeedDataByDate = useMemo(() => {
    const map = new Map<string, { speed: number | null; color: string; dynEma: number | null; dynColor: string }>();
    if (!trendSpeedResult) return map;
    for (let i = 0; i < aggregatedBars.length; i++) {
      const b = aggregatedBars[i];
      const item = {
        speed: trendSpeedResult.trendSpeed[i],
        color: trendSpeedResult.barColor[i],
        dynEma: trendSpeedResult.dynEma[i],
        dynColor: trendSpeedResult.dynTrendColor[i],
      };
      map.set(b.time, item);
      if (b.time && b.time.includes('T')) {
        const sec = Math.floor(new Date(b.time).getTime() / 1000);
        map.set(String(sec), item);
      }
    }
    return map;
  }, [aggregatedBars, trendSpeedResult]);

  // Compute FluidTrades - SMC Lite
  const smcLiteResult: SMCResult | null = useMemo(() => {
    if (aggregatedBars.length === 0 || !indicatorConfig.smcLite?.visible) return null;
    return computeSMCLite(aggregatedBars, indicatorConfig.smcLite);
  }, [aggregatedBars, indicatorConfig.smcLite]);

  // Compute Anchored VWAP
  const anchoredVWAPResult: AnchoredVWAPResult | null = useMemo(() => {
    if (aggregatedBars.length === 0 || !indicatorConfig.anchoredVwap?.visible) return null;
    return computeAnchoredVWAP(aggregatedBars, indicatorConfig.anchoredVwap);
  }, [aggregatedBars, indicatorConfig.anchoredVwap]);

  // Compute Super Money Signal V3
  const superMoneySignalResult: SuperMoneySignalResult | null = useMemo(() => {
    if (aggregatedBars.length === 0 || !indicatorConfig.superMoneySignal?.visible) return null;
    return computeSuperMoneySignal(aggregatedBars, indicatorConfig.superMoneySignal);
  }, [aggregatedBars, indicatorConfig.superMoneySignal]);

  // Calculate Ultimate RSI buy signals markers
  const calculatedRsiMarkers: SeriesMarker<Time>[] = useMemo(() => {
    if (!ultimateRSIResult || !indicatorConfig.ultimateRsi.visible) return [];
    const markers: SeriesMarker<Time>[] = [];
    const sigs = indicatorConfig.ultimateRsi.signals;
    const osPrice = indicatorConfig.ultimateRsi.osValue ?? 20;

    for (let i = 0; i < aggregatedBars.length; i++) {
      const bar = aggregatedBars[i];
      const t = formatBarTime(bar.time);

      let signalType: 'buyCross' | 'reversal' | 'buyZone' | null = null;

      if (sigs.buyCross && ultimateRSIResult.bullishCrossLow[i]) {
        signalType = 'buyCross';
      } else if (sigs.reversal && ultimateRSIResult.bullishReversal[i]) {
        signalType = 'reversal';
      } else if (sigs.buyZone && ultimateRSIResult.buyZone[i]) {
        signalType = 'buyZone';
      }

      if (!signalType) continue;

      let shape: RSIMarkerShape;
      let color: string;
      let location: RSIMarkerLocation;

      if (signalType === 'buyCross') {
        shape = sigs.buyCrossShape || 'diamond';
        color = sigs.buyCrossColor || '#FFFFFF';
        location = sigs.buyCrossLocation || 'bottom';
      } else if (signalType === 'reversal') {
        shape = sigs.reversalShape || 'circle';
        color = sigs.reversalColor || '#FFE600';
        location = sigs.reversalLocation || 'bottom';
      } else {
        shape = sigs.buyZoneShape || 'cross';
        color = sigs.buyZoneColor || '#22c55e';
        location = sigs.buyZoneLocation || 'bottom';
      }

      const props = getRsiMarkerProps(shape);
      const isBottom = location === 'bottom';

      if (isBottom) {
        markers.push({
          time: t,
          position: 'atPriceMiddle',
          price: osPrice,
          color,
          shape: props.shape,
          text: props.text,
          size: props.size,
        });
      } else {
        markers.push({
          time: t,
          position: 'belowBar',
          color,
          shape: props.shape,
          text: props.text,
          size: props.size,
        });
      }
    }
    return markers;
  }, [
    aggregatedBars,
    ultimateRSIResult,
    indicatorConfig.ultimateRsi.visible,
    indicatorConfig.ultimateRsi.signals,
    indicatorConfig.ultimateRsi.osValue,
  ]);

  // Calculate 3-Step Super Money Signals markers with individual sub-toggles
  const calculatedMarkers: SeriesMarker<Time>[] = useMemo(() => {
    if (!indicatorConfig.signals.visible || aggregatedBars.length < 2) return [];

    const markers: SeriesMarker<Time>[] = [];
    let lastType: string | null = null;
    let lastReadyIdx = -100;
    const { rebound, breakout, goldenStar, pullback } = indicatorConfig.signals.markers;
    const showText = indicatorConfig.signals.showText !== false;
    const userSize = indicatorConfig.signals.size ?? 1.2;
    const padding = indicatorConfig.signals.padding ?? 0;
    const sigColors = indicatorConfig.signals.colors || { rebound: '#FBBF24', breakout: '#FFE600', goldenStar: '#FFFFFF', pullback: '#FF1744' };

    const makeMarker = (
      time: Time,
      pos: 'below' | 'above',
      barHigh: number,
      barLow: number,
      color: string,
      shape: 'circle' | 'arrowUp' | 'arrowDown',
      textLabel: string,
      sizeMult: number,
      textOnly?: string
    ): SeriesMarker<Time> => {
      const finalSize = textOnly !== undefined ? 0 : Math.max(0.5, Math.round(userSize * sizeMult * 10) / 10);
      const text = textOnly !== undefined ? (showText ? `${textOnly} READY` : textOnly) : (showText ? textLabel : undefined);
      if (padding > 0) {
        const candleSpread = Math.abs(barHigh - barLow);
        const refPrice = pos === 'below' ? barLow : barHigh;
        const localUnit = Math.max(candleSpread, (refPrice || 1) * 0.015);
        const offset = localUnit * 0.6 + localUnit * (padding * 0.25);
        return {
          time,
          position: pos === 'below' ? 'atPriceBottom' : 'atPriceTop',
          price: pos === 'below' ? barLow - offset : barHigh + offset,
          color, shape, text, size: finalSize,
        };
      }
      return { time, position: pos === 'below' ? 'belowBar' : 'aboveBar', color, shape, text, size: finalSize };
    };

    for (let i = 0; i < aggregatedBars.length; i++) {
      const bar = aggregatedBars[i];
      const close = bar.close;
      const e50 = bar.ema50;
      const e150 = bar.ema150;
      const e200 = bar.ema200;
      const bVal = bar.banker;
      const prevBVal = i > 0 ? aggregatedBars[i - 1].banker : 0;
      const isBull = bar.close >= bar.open;

      const dist200 = e200 ? ((close - e200) / e200) * 100 : 0;
      const dist150 = e150 ? ((close - e150) / e150) * 100 : 0;
      const nearSupport = (e200 && dist200 >= -3.0 && dist200 <= 2.5) || (e150 && dist150 >= -2.5 && dist150 <= 2.5);

      // STEP 3: ★ SUPER MONEY
      if (goldenStar && bVal >= 10 && prevBVal < 10 && close > (e50 || close * 0.98)) {
        if (lastType !== 'SUPER') {
          markers.push(makeMarker(formatBarTime(bar.time), 'below', bar.high, bar.low, sigColors.goldenStar, 'arrowUp', '★ SUPER', 1.35));
          lastType = 'SUPER';
          continue;
        }
      }

      // STEP 2: ▲ BUY ZONE
      if (breakout && nearSupport && bVal > 0 && prevBVal === 0 && isBull) {
        if (lastType !== 'BUY') {
          markers.push(makeMarker(formatBarTime(bar.time), 'below', bar.high, bar.low, sigColors.breakout, 'arrowUp', '▲ BUY', 1.15));
          lastType = 'BUY';
          continue;
        }
      }

      // STEP 1: ● ● ● READY
      if (rebound && nearSupport && bVal === 0) {
        if (lastType !== 'READY' && lastType !== 'BUY' && lastType !== 'SUPER') {
          if (i - lastReadyIdx >= 14) {
            markers.push(makeMarker(formatBarTime(bar.time), 'below', bar.high, bar.low, sigColors.rebound, 'circle', '', 0, '● ● ●'));
            lastType = 'READY';
            lastReadyIdx = i;
            continue;
          }
        }
      }

      if (lastType === 'READY' && dist200 < -4) {
        lastType = null;
      }

      // EXIT: ▼ DANGER / STOP LOSS
      const inPosition = lastType === 'BUY' || lastType === 'SUPER';
      if (pullback && inPosition && ((dist200 < -5.0 && bVal === 0 && e200) || (prevBVal >= 10 && bVal < 5 && close < (e50 || close)))) {
        markers.push(makeMarker(formatBarTime(bar.time), 'above', bar.high, bar.low, sigColors.pullback, 'arrowDown', '▼ EXIT', 1.15));
        lastType = null;
      }
    }

    return markers;
  }, [aggregatedBars, indicatorConfig.signals]);

  // Combined Pane 0 Markers: Super Money Signals + SMC Lite Signals + Anchored VWAP
  const pane0Markers: SeriesMarker<Time>[] = useMemo(() => {
    const list: SeriesMarker<Time>[] = [];
    if (indicatorConfig.signals.visible) {
      list.push(...calculatedMarkers);
    }
    if (
      indicatorConfig.smcLite?.visible &&
      indicatorConfig.smcLite?.showArrows &&
      smcLiteResult?.signals &&
      smcLiteResult.signals.length > 0
    ) {
      const showBuy = indicatorConfig.smcLite.showBuySignal;
      const showSell = indicatorConfig.smcLite.showSellSignal;
      for (const sig of smcLiteResult.signals) {
        if (sig.type === 'BUY' && showBuy) {
          list.push({
            time: formatBarTime(sig.time),
            position: 'belowBar',
            color: '#10B981',
            shape: 'arrowUp',
            text: sig.text,
            size: 1.5,
          });
        } else if (sig.type === 'SELL' && showSell) {
          list.push({
            time: formatBarTime(sig.time),
            position: 'aboveBar',
            color: '#EF4444',
            shape: 'arrowDown',
            text: sig.text,
            size: 1.5,
          });
        }
      }
    }
    if (indicatorConfig.anchoredVwap?.visible && anchoredVWAPResult?.anchorTime) {
      list.push({
        time: formatBarTime(anchoredVWAPResult.anchorTime),
        position: 'belowBar',
        color: '#FFE600',
        shape: 'arrowUp',
        text: 'ANCHOR',
        size: 1.5,
      });
    }
    if (indicatorConfig.superMoneySignal?.visible && superMoneySignalResult) {
      const cfg = indicatorConfig.superMoneySignal;
      const showText = cfg.showText !== false;
      const userSize = cfg.size ?? 1.2;
      const padding = cfg.padding ?? 0;

      const resolveSuperVisual = (
        symbolKey: string,
        sizeMultiplier: number,
        label: string
      ): { shape: SeriesMarkerShape; size: number; text?: string } => {
        const scaledSize = Math.max(0.5, Math.round(userSize * sizeMultiplier * 10) / 10);

        if (symbolKey === 'arrowUp') {
          return { shape: 'arrowUp', size: scaledSize, text: showText ? label : undefined };
        }
        if (symbolKey === 'arrowDown') {
          return { shape: 'arrowDown', size: scaledSize, text: showText ? label : undefined };
        }
        if (symbolKey === 'circle') {
          return { shape: 'circle', size: scaledSize, text: showText ? label : undefined };
        }
        if (symbolKey === 'square') {
          return { shape: 'square', size: scaledSize, text: showText ? label : undefined };
        }

        const glyph = GLYPH_MAP[symbolKey] || '▲';
        const text = showText ? `${glyph} ${label}` : glyph;
        return {
          shape: 'circle',
          size: 0,
          text,
        };
      };

      const makeSuperMarker = (
        time: Time,
        bar: any,
        color: string,
        shapeKey: string,
        label: string,
        sizeMult: number,
        pos: 'below' | 'above' = 'below'
      ): SeriesMarker<Time> => {
        const visual = resolveSuperVisual(shapeKey, sizeMult, label);

        if (padding > 0) {
          const bHigh = typeof bar.high === 'number' && !isNaN(bar.high) ? bar.high : bar.close;
          const bLow = typeof bar.low === 'number' && !isNaN(bar.low) ? bar.low : bar.close;
          const candleSpread = Math.abs(bHigh - bLow);
          const refPrice = pos === 'below' ? bLow : bHigh;
          const localUnit = Math.max(candleSpread, (refPrice || 1) * 0.015);
          const offset = localUnit * 0.6 + localUnit * (padding * 0.25);
          const safePrice = pos === 'below' ? bLow - offset : bHigh + offset;
          return {
            time,
            position: pos === 'below' ? 'atPriceBottom' : 'atPriceTop',
            price: safePrice,
            color,
            shape: visual.shape,
            text: visual.text,
            size: visual.size,
          };
        }
        return {
          time,
          position: pos === 'below' ? 'belowBar' : 'aboveBar',
          color,
          shape: visual.shape,
          text: visual.text,
          size: visual.size,
        };
      };

      for (let i = 0; i < aggregatedBars.length; i++) {
        const bar = aggregatedBars[i];
        const t = formatBarTime(bar.time);
        if (cfg.showReadySignal && superMoneySignalResult.readySignals[i]) {
          list.push(makeSuperMarker(
            t,
            bar,
            cfg.readySignalColor ?? '#FFFFFF',
            cfg.readySignalShape ?? 'arrowUp',
            'READY',
            1.0,
            'below'
          ));
        }
        if (cfg.showBuySignal && superMoneySignalResult.buySignals[i]) {
          list.push(makeSuperMarker(
            t,
            bar,
            cfg.buySignalColor ?? '#FFE600',
            cfg.buySignalShape ?? 'arrowUp',
            'BUY',
            1.2,
            'below'
          ));
        }
        if (cfg.showNoSignal && superMoneySignalResult.noSignals[i]) {
          list.push(makeSuperMarker(
            t,
            bar,
            cfg.noSignalColor ?? '#800000',
            cfg.noSignalShape ?? 'arrowDown',
            'NO SIGNAL',
            1.0,
            cfg.noSignalShape === 'arrowDown' ? 'above' : 'below'
          ));
        }
      }
    }

    // Trade Execution Markers (User Portfolio Actual Trades)
    if (portfolioOverlay?.transactions && portfolioOverlay.transactions.length > 0) {
      for (const tx of portfolioOverlay.transactions) {
        if (!tx.date || !tx.price) continue;
        const t = formatBarTime(tx.date);
        if (tx.type === 'BUY') {
          list.push({
            time: t,
            position: 'belowBar',
            color: '#10B981',
            shape: 'arrowUp',
            text: `BUY @ $${tx.price.toFixed(2)}${tx.amount ? ` (${tx.amount} shs)` : ''}`,
            size: 1.5,
          });
        } else if (tx.type === 'SELL') {
          list.push({
            time: t,
            position: 'aboveBar',
            color: '#EF4444',
            shape: 'arrowDown',
            text: `SELL @ $${tx.price.toFixed(2)}${tx.amount ? ` (${tx.amount} shs)` : ''}`,
            size: 1.5,
          });
        }
      }
    }

    list.sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
    return list;
  }, [
    indicatorConfig.signals.visible,
    calculatedMarkers,
    indicatorConfig.smcLite,
    smcLiteResult,
    indicatorConfig.anchoredVwap?.visible,
    anchoredVWAPResult,
    indicatorConfig.superMoneySignal,
    superMoneySignalResult,
    portfolioOverlay?.transactions,
  ]);

  return {
    activeEma1,
    activeEma2,
    activeEma3,
    rawCleanBars,
    aggregatedBars,
    displayBars,
    rawBarsByDate,
    ultimateRSIResult,
    rsiDataByDate,
    trendSpeedResult,
    trendSpeedDataByDate,
    smcLiteResult,
    anchoredVWAPResult,
    superMoneySignalResult,
    calculatedMarkers,
    calculatedRsiMarkers,
    pane0Markers,
  };
}
