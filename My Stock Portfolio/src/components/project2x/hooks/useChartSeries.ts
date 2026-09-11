import { useEffect, useRef, RefObject } from 'react';
import {
  IChartApi,
  ISeriesApi,
  IPriceLine,
  Time,
  SeriesMarker,
} from 'lightweight-charts';
import { BankerMCDXData } from '../BankerMCDXPlugin';
import { SMCPrimitive } from '../../../utils/indicators/smcPrimitive';
import { SMCResult } from '../../../utils/indicators/smcLite';
import { AnchoredVWAPResult } from '../../../utils/indicators/anchoredVWAP';
import { TrendSpeedResult } from '../../../utils/indicators/trendSpeed';
import { UltimateRSIResult } from '../../../utils/indicators/ultimateRSI';
import { SuperMoneySignalResult } from '../../../utils/indicators/superMoneySignal';
import { IndicatorSettings } from '../../../types/indicatorConfig';
import {
  RawBarItem,
  TimeFrame,
  ChartStyle,
  formatBarTime,
  hexToRgba,
  getChartLineStyle,
} from '../../../types/chart';

export interface UseChartSeriesProps {
  chartRef: RefObject<IChartApi | null>;
  chartContainerRef: RefObject<HTMLDivElement | null>;
  displayBars: RawBarItem[];
  indicatorConfig: IndicatorSettings;
  trendSpeedResult: TrendSpeedResult | null;
  ultimateRSIResult: UltimateRSIResult | null;
  smcLiteResult: SMCResult | null;
  anchoredVWAPResult: AnchoredVWAPResult | null;
  superMoneySignalResult?: SuperMoneySignalResult | null;
  calculatedRsiMarkers: SeriesMarker<Time>[];
  pane0Markers: SeriesMarker<Time>[];
  chartStyle: ChartStyle;
  timeframe: TimeFrame;
  applyTimeframeRange: (tf: TimeFrame) => void;
  activeSubPanes: any;
  maximizedPane: number | null;
  applyPaneLayoutHeights: (chartInstance: any, cfg: IndicatorSettings, maximized: number | null) => void;
  setPaneOffsets: (offsets: Record<number, { top: number; height: number }>) => void;
}

export function useChartSeries({
  chartRef,
  chartContainerRef,
  displayBars,
  indicatorConfig,
  trendSpeedResult,
  ultimateRSIResult,
  smcLiteResult,
  anchoredVWAPResult,
  superMoneySignalResult,
  calculatedRsiMarkers,
  pane0Markers,
  chartStyle,
  timeframe,
  applyTimeframeRange,
  activeSubPanes,
  maximizedPane,
  applyPaneLayoutHeights,
  setPaneOffsets,
}: UseChartSeriesProps) {
  // Series references
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema150SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const upperEnvSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lowerEnvSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const mcdxSeriesRef = useRef<ISeriesApi<'Custom'> | null>(null);
  const bankerMaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiAreaSeriesRef = useRef<ISeriesApi<'Baseline'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSignalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const dynTrendSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const trendSpeedHistSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smcFastSmaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const smcSlowSmaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const smcPrimitiveRef = useRef<SMCPrimitive | null>(null);
  const anchoredVwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const anchoredUpperBandSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const anchoredLowerBandSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const markersPluginRef = useRef<any>(null);
  const rsiMarkersPluginRef = useRef<any>(null);
  const mcdxStrikeLineRef = useRef<IPriceLine | null>(null);
  const rsiObLineRef = useRef<IPriceLine | null>(null);
  const rsiMidLineRef = useRef<IPriceLine | null>(null);
  const rsiOsLineRef = useRef<IPriceLine | null>(null);

  // Update Data when displayBars or calculated markers change
  useEffect(() => {
    if (!chartRef.current || displayBars.length === 0) return;

    const recolorCandles = indicatorConfig.trendSpeed?.visible &&
      indicatorConfig.trendSpeed?.enableCandles &&
      indicatorConfig.trendSpeed?.plotCandleVisible &&
      trendSpeedResult;

    const candleData = displayBars.map((b, idx) => {
      const spColor = recolorCandles ? trendSpeedResult.barColor[idx] : undefined;
      return {
        time: formatBarTime(b.time),
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        ...(spColor ? {
          color: spColor,
          borderColor: spColor,
          wickColor: spColor,
        } : {}),
      };
    });

    const areaData = displayBars.map(b => ({
      time: formatBarTime(b.time),
      value: b.close,
    }));

    const e50Data = displayBars
      .filter(b => b.ema50 !== null)
      .map(b => ({ time: formatBarTime(b.time), value: b.ema50! }));

    const e150Data = displayBars
      .filter(b => b.ema150 !== null)
      .map(b => ({ time: formatBarTime(b.time), value: b.ema150! }));

    const e200Data = displayBars
      .filter(b => b.ema200 !== null)
      .map(b => ({ time: formatBarTime(b.time), value: b.ema200! }));

    const envPct = (indicatorConfig.envelope.percent || 4.0) / 100;
    const upperEnvData = displayBars
      .filter(b => b.ema200 !== null)
      .map(b => ({ time: formatBarTime(b.time), value: Number((b.ema200! * (1 + envPct)).toFixed(2)) }));

    const lowerEnvData = displayBars
      .filter(b => b.ema200 !== null)
      .map(b => ({ time: formatBarTime(b.time), value: Number((b.ema200! * (1 - envPct)).toFixed(2)) }));

    const mcdxData: BankerMCDXData[] = displayBars.map(b => ({
      time: formatBarTime(b.time),
      banker: b.banker,
      hotMoney: b.hotMoney,
      retail: b.retail,
    }));

    const bMaData = displayBars.map(b => ({
      time: formatBarTime(b.time),
      value: b.bankerMa,
    }));

    candleSeriesRef.current?.setData(candleData);
    areaSeriesRef.current?.setData(areaData);
    ema50SeriesRef.current?.setData(e50Data);
    ema150SeriesRef.current?.setData(e150Data);
    ema200SeriesRef.current?.setData(e200Data);
    upperEnvSeriesRef.current?.setData(upperEnvData);
    lowerEnvSeriesRef.current?.setData(lowerEnvData);
    mcdxSeriesRef.current?.setData(mcdxData as any);
    bankerMaSeriesRef.current?.setData(bMaData);

    if (ultimateRSIResult) {
      const arsiData: any[] = [];
      const arsiRawData: any[] = [];
      const sigData: any[] = [];
      const obVal = indicatorConfig.ultimateRsi.obValue;
      const osVal = indicatorConfig.ultimateRsi.osValue;
      const obColor = indicatorConfig.ultimateRsi.obColor || '#089981';
      const osColor = indicatorConfig.ultimateRsi.osColor || '#F23645';
      const rsiColor = indicatorConfig.ultimateRsi.rsiColor || '#FFFFFF';
      const autoColor = indicatorConfig.ultimateRsi.autoColor !== false;

      for (let i = 0; i < displayBars.length; i++) {
        const t = formatBarTime(displayBars[i].time);
        const aVal = ultimateRSIResult.arsi[i];
        const sVal = ultimateRSIResult.signal[i];

        if (aVal !== null) {
          arsiRawData.push({ time: t, value: aVal });

          if (!autoColor) {
            arsiData.push({ time: t, value: aVal, color: rsiColor });
          } else {
            const isCurrOb = aVal > obVal;
            const isCurrOs = aVal < osVal;
            const prevVal = i > 0 ? ultimateRSIResult.arsi[i - 1] : null;
            const isPrevOb = prevVal !== null && prevVal > obVal;
            const isPrevOs = prevVal !== null && prevVal < osVal;
            const isPrevExtreme = isPrevOb || isPrevOs;

            let pointColor = 'transparent';
            if (isCurrOb || isPrevOb) {
              pointColor = obColor;
            } else if (isCurrOs || isPrevOs) {
              pointColor = osColor;
            }

            const showLine = isCurrOb || isCurrOs || isPrevExtreme;
            arsiData.push({
              time: t,
              value: aVal,
              color: showLine ? pointColor : 'transparent',
            });
          }
        }
        if (sVal !== null) {
          sigData.push({ time: t, value: sVal });
        }
      }
      rsiAreaSeriesRef.current?.setData(arsiRawData);
      rsiSeriesRef.current?.setData(arsiData);
      rsiSignalSeriesRef.current?.setData(sigData);
      rsiMarkersPluginRef.current?.setMarkers(indicatorConfig.ultimateRsi.visible ? calculatedRsiMarkers : []);
    }

    if (trendSpeedResult) {
      if (dynTrendSeriesRef.current) {
        const dynData: any[] = [];
        for (let i = 0; i < displayBars.length; i++) {
          const val = trendSpeedResult.dynEma[i];
          if (val !== null) {
            dynData.push({
              time: formatBarTime(displayBars[i].time),
              value: val,
              color: trendSpeedResult.dynTrendColor[i],
            });
          }
        }
        dynTrendSeriesRef.current.setData(dynData);
      }

      if (trendSpeedHistSeriesRef.current) {
        const histData: any[] = [];
        for (let i = 0; i < displayBars.length; i++) {
          const sp = trendSpeedResult.trendSpeed[i];
          if (sp !== null) {
            histData.push({
              time: formatBarTime(displayBars[i].time),
              value: sp,
              color: trendSpeedResult.barColor[i],
            });
          }
        }
        trendSpeedHistSeriesRef.current.setData(histData);
      }
    }

    // SMC Lite Data Feed
    if (smcLiteResult && indicatorConfig.smcLite?.visible) {
      if (smcFastSmaSeriesRef.current) {
        const fastData: any[] = [];
        for (let i = 0; i < displayBars.length; i++) {
          const val = smcLiteResult.fastSMA[i];
          if (val !== null && !isNaN(val)) {
            fastData.push({ time: formatBarTime(displayBars[i].time), value: val });
          }
        }
        smcFastSmaSeriesRef.current.setData(fastData);
      }
      if (smcSlowSmaSeriesRef.current) {
        const slowData: any[] = [];
        for (let i = 0; i < displayBars.length; i++) {
          const val = smcLiteResult.slowSMA[i];
          if (val !== null && !isNaN(val)) {
            slowData.push({ time: formatBarTime(displayBars[i].time), value: val });
          }
        }
        smcSlowSmaSeriesRef.current.setData(slowData);
      }
      smcPrimitiveRef.current?.setData(smcLiteResult, indicatorConfig.smcLite);
    } else {
      smcFastSmaSeriesRef.current?.setData([]);
      smcSlowSmaSeriesRef.current?.setData([]);
      if (smcPrimitiveRef.current && indicatorConfig.smcLite) {
        smcPrimitiveRef.current.setData(
          {
            activeSupplyZones: [],
            activeDemandZones: [],
            bosLines: [],
            zigzagPoints: [],
            priceActionLabels: [],
            fastSMA: [],
            slowSMA: [],
            signals: [],
          },
          indicatorConfig.smcLite
        );
      }
    }

    // Anchored VWAP Data Feed
    if (anchoredVWAPResult && indicatorConfig.anchoredVwap?.visible) {
      const vwapData: any[] = [];
      const upperData: any[] = [];
      const lowerData: any[] = [];
      for (let i = 0; i < displayBars.length; i++) {
        const t = formatBarTime(displayBars[i].time);
        const v = anchoredVWAPResult.vwap[i];
        const ub = anchoredVWAPResult.upperBand[i];
        const lb = anchoredVWAPResult.lowerBand[i];
        if (v !== null && !isNaN(v)) vwapData.push({ time: t, value: v });
        if (ub !== null && !isNaN(ub)) upperData.push({ time: t, value: ub });
        if (lb !== null && !isNaN(lb)) lowerData.push({ time: t, value: lb });
      }
      anchoredVwapSeriesRef.current?.setData(vwapData);
      anchoredUpperBandSeriesRef.current?.setData(upperData);
      anchoredLowerBandSeriesRef.current?.setData(lowerData);
    } else {
      anchoredVwapSeriesRef.current?.setData([]);
      anchoredUpperBandSeriesRef.current?.setData([]);
      anchoredLowerBandSeriesRef.current?.setData([]);
    }

    markersPluginRef.current?.setMarkers(pane0Markers);
    applyTimeframeRange(timeframe);
  }, [
    displayBars,
    calculatedRsiMarkers,
    pane0Markers,
    ultimateRSIResult,
    trendSpeedResult,
    indicatorConfig.signals.visible,
    indicatorConfig.signals.padding,
    indicatorConfig.signals.size,
    indicatorConfig.signals.colors,
    indicatorConfig.ultimateRsi.visible,
    indicatorConfig.ultimateRsi.autoColor,
    indicatorConfig.ultimateRsi.obValue,
    indicatorConfig.ultimateRsi.osValue,
    indicatorConfig.ultimateRsi.obColor,
    indicatorConfig.ultimateRsi.osColor,
    indicatorConfig.ultimateRsi.rsiColor,
    indicatorConfig.ultimateRsi.showArea,
    indicatorConfig.trendSpeed,
    indicatorConfig.envelope.percent,
    timeframe,
    activeSubPanes,
    chartRef,
    applyTimeframeRange,
  ]);

  // Handle Style Switching
  useEffect(() => {
    if (!candleSeriesRef.current || !areaSeriesRef.current) return;
    if (chartStyle === 'AREA') {
      candleSeriesRef.current.applyOptions({ visible: false });
      areaSeriesRef.current.applyOptions({ visible: true });
    } else {
      candleSeriesRef.current.applyOptions({ visible: true });
      areaSeriesRef.current.applyOptions({ visible: false });
    }
  }, [chartStyle]);

  // Synchronize dynamic series options when indicatorConfig changes
  useEffect(() => {
    const sSize = indicatorConfig.signals.size ?? 1.2;
    const fSize = sSize <= 0.9 ? 11 : sSize <= 1.2 ? 13 : sSize <= 1.5 ? 15 : 18;
    chartRef.current?.applyOptions({ layout: { fontSize: fSize } });

    const showLabels = indicatorConfig.showAxisLabels;

    ema50SeriesRef.current?.applyOptions({
      color: indicatorConfig.ema1.color,
      lineWidth: indicatorConfig.ema1.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema1.lineStyle),
      visible: indicatorConfig.ema1.visible,
      lastValueVisible: showLabels,
      title: showLabels ? `EMA ${indicatorConfig.ema1.period}` : '',
    });
    ema150SeriesRef.current?.applyOptions({
      color: indicatorConfig.ema2.color,
      lineWidth: indicatorConfig.ema2.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema2.lineStyle),
      visible: indicatorConfig.ema2.visible,
      lastValueVisible: showLabels,
      title: showLabels ? `EMA ${indicatorConfig.ema2.period}` : '',
    });
    ema200SeriesRef.current?.applyOptions({
      color: indicatorConfig.ema3.color,
      lineWidth: indicatorConfig.ema3.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema3.lineStyle),
      visible: indicatorConfig.ema3.visible,
      lastValueVisible: showLabels,
      title: showLabels ? `EMA ${indicatorConfig.ema3.period}` : '',
    });
    upperEnvSeriesRef.current?.applyOptions({
      color: indicatorConfig.envelope.color,
      lineWidth: indicatorConfig.envelope.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.envelope.lineStyle),
      visible: indicatorConfig.envelope.visible,
      title: showLabels ? `+${indicatorConfig.envelope.percent}% Bedrock` : '',
    });
    lowerEnvSeriesRef.current?.applyOptions({
      color: indicatorConfig.envelope.color,
      lineWidth: indicatorConfig.envelope.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.envelope.lineStyle),
      visible: indicatorConfig.envelope.visible,
      title: showLabels ? `-${indicatorConfig.envelope.percent}% Bedrock` : '',
    });
    mcdxSeriesRef.current?.applyOptions({
      visible: indicatorConfig.mcdx.visible,
      lastValueVisible: showLabels,
      title: showLabels ? 'MCDX' : '',
      priceLineVisible: false,
      bankerColor: indicatorConfig.mcdx.bankerColor,
      hotMoneyColor: indicatorConfig.mcdx.hotMoneyColor,
      retailColor: indicatorConfig.mcdx.retailColor,
    } as any);

    if (mcdxSeriesRef.current && displayBars.length > 0) {
      const mcdxData: BankerMCDXData[] = displayBars.map(b => ({
        time: formatBarTime(b.time),
        banker: b.banker,
        hotMoney: b.hotMoney,
        retail: b.retail,
      }));
      mcdxSeriesRef.current.setData(mcdxData as any);
    }
    bankerMaSeriesRef.current?.applyOptions({
      visible: indicatorConfig.mcdx.visible,
      lastValueVisible: showLabels,
      title: showLabels ? 'Banker MA' : '',
      priceLineVisible: false,
      color: indicatorConfig.mcdx.maColor || '#FFFFFF',
      lineWidth: (indicatorConfig.mcdx.maWidth || 2) as any,
    });
    const obColor = indicatorConfig.ultimateRsi.obColor || '#089981';
    const osColor = indicatorConfig.ultimateRsi.osColor || '#F23645';
    const isRsiVisible = indicatorConfig.ultimateRsi.visible && indicatorConfig.ultimateRsi.rsiVisible !== false;
    const isSigVisible = indicatorConfig.ultimateRsi.visible && indicatorConfig.ultimateRsi.signalVisible !== false;
    const showArea = indicatorConfig.ultimateRsi.showArea !== false;
    const isObVisible = indicatorConfig.ultimateRsi.obVisible !== false;
    const isMidVisible = indicatorConfig.ultimateRsi.midVisible !== false;
    const isOsVisible = indicatorConfig.ultimateRsi.osVisible !== false;

    const midVal = indicatorConfig.ultimateRsi.midValue ?? 50;

    rsiAreaSeriesRef.current?.applyOptions({
      baseValue: { type: 'price', price: midVal },
      topFillColor1: hexToRgba(obColor, 0.35),
      topFillColor2: hexToRgba(obColor, 0.03),
      bottomFillColor1: hexToRgba(osColor, 0.03),
      bottomFillColor2: hexToRgba(osColor, 0.35),
      visible: isRsiVisible && showArea,
    });
    rsiSeriesRef.current?.applyOptions({
      visible: isRsiVisible,
      lastValueVisible: showLabels,
      title: showLabels ? 'ARSI (Extremes)' : '',
      priceLineVisible: false,
    });
    rsiSignalSeriesRef.current?.applyOptions({
      visible: isSigVisible,
      color: indicatorConfig.ultimateRsi.signalColor,
      lastValueVisible: showLabels,
      title: showLabels ? 'Signal' : '',
      priceLineVisible: false,
    });
    mcdxStrikeLineRef.current?.applyOptions({
      axisLabelVisible: showLabels,
      title: showLabels ? '10 STRIKE' : '',
    });
    rsiObLineRef.current?.applyOptions({
      price: indicatorConfig.ultimateRsi.obValue,
      color: isObVisible ? obColor : 'transparent',
      axisLabelVisible: showLabels && isObVisible,
      title: showLabels && isObVisible ? `${indicatorConfig.ultimateRsi.obValue} OB` : '',
    });
    rsiMidLineRef.current?.applyOptions({
      price: indicatorConfig.ultimateRsi.midValue ?? 50,
      color: isMidVisible ? (indicatorConfig.ultimateRsi.midColor || 'rgba(255, 255, 255, 0.25)') : 'transparent',
      axisLabelVisible: false,
      title: showLabels && isMidVisible ? `${indicatorConfig.ultimateRsi.midValue ?? 50} MID` : '',
    });
    rsiOsLineRef.current?.applyOptions({
      price: indicatorConfig.ultimateRsi.osValue,
      color: isOsVisible ? osColor : 'transparent',
      axisLabelVisible: showLabels && isOsVisible,
      title: showLabels && isOsVisible ? `${indicatorConfig.ultimateRsi.osValue} OS` : '',
    });

    const isDynTrendVisible = indicatorConfig.trendSpeed?.visible && indicatorConfig.trendSpeed?.dynamicTrendVisible;
    dynTrendSeriesRef.current?.applyOptions({
      visible: isDynTrendVisible,
      color: indicatorConfig.trendSpeed?.upTrendColor ?? '#F7D02C',
      lineWidth: (indicatorConfig.trendSpeed?.dynamicTrendLineWidth ?? 2) as any,
      lastValueVisible: showLabels,
      title: showLabels ? 'Dyn Trend' : '',
    });

    const isTrendSpeedVisible = indicatorConfig.trendSpeed?.visible && indicatorConfig.trendSpeed?.trendSpeedVisible;
    trendSpeedHistSeriesRef.current?.applyOptions({
      visible: isTrendSpeedVisible,
      lastValueVisible: showLabels,
      title: showLabels ? 'Trend Speed' : '',
    });

    // Update SMC Lite SMAs and Primitive
    const isSmcVisible = indicatorConfig.smcLite?.visible;
    const isSmcFastVisible = isSmcVisible && (indicatorConfig.smcLite?.showFastSMA ?? false) && (indicatorConfig.smcLite?.showSMA ?? true);
    smcFastSmaSeriesRef.current?.applyOptions({
      visible: isSmcFastVisible,
      color: indicatorConfig.smcLite?.fastSMAColor ?? '#3B82F6',
      lineWidth: (indicatorConfig.smcLite?.fastLineWidth ?? 1) as any,
      lastValueVisible: showLabels,
      title: showLabels ? `SMA ${indicatorConfig.smcLite?.smaFastLen ?? 15}` : '',
    });

    const isSmcSlowVisible = isSmcVisible && (indicatorConfig.smcLite?.showSlowSMA ?? true) && (indicatorConfig.smcLite?.showSMA ?? true);
    smcSlowSmaSeriesRef.current?.applyOptions({
      visible: isSmcSlowVisible,
      color: indicatorConfig.smcLite?.slowSMAColor ?? '#F59E0B',
      lineWidth: (indicatorConfig.smcLite?.slowLineWidth ?? 2) as any,
      lastValueVisible: showLabels,
      title: showLabels ? `SMA ${indicatorConfig.smcLite?.smaSlowLen ?? 200}` : '',
    });

    if (smcPrimitiveRef.current && indicatorConfig.smcLite) {
      smcPrimitiveRef.current.setData(
        smcLiteResult || {
          activeSupplyZones: [],
          activeDemandZones: [],
          bosLines: [],
          zigzagPoints: [],
          priceActionLabels: [],
          fastSMA: [],
          slowSMA: [],
          signals: [],
        },
        indicatorConfig.smcLite
      );
    }

    // Update Anchored VWAP options
    const isAvwapVisible = indicatorConfig.anchoredVwap?.visible;
    anchoredVwapSeriesRef.current?.applyOptions({
      visible: isAvwapVisible && (indicatorConfig.anchoredVwap?.vwapVisible ?? true),
      color: indicatorConfig.anchoredVwap?.vwapColor ?? '#FFFFFF',
      lineWidth: (indicatorConfig.anchoredVwap?.vwapLineWidth ?? 3) as any,
      lineStyle: getChartLineStyle(indicatorConfig.anchoredVwap?.vwapLineStyle ?? 'Solid'),
      lastValueVisible: showLabels,
      title: showLabels ? 'VWAP' : '',
    });

    anchoredUpperBandSeriesRef.current?.applyOptions({
      visible: isAvwapVisible && (indicatorConfig.anchoredVwap?.showBands ?? true) && (indicatorConfig.anchoredVwap?.upperBandVisible ?? false),
      color: indicatorConfig.anchoredVwap?.upperBandColor ?? '#94A3B8',
      lineWidth: (indicatorConfig.anchoredVwap?.upperBandLineWidth ?? 2) as any,
      lineStyle: getChartLineStyle(indicatorConfig.anchoredVwap?.upperBandLineStyle ?? 'Dashed'),
      lastValueVisible: showLabels,
      title: showLabels ? 'Upper Band' : '',
    });

    anchoredLowerBandSeriesRef.current?.applyOptions({
      visible: isAvwapVisible && (indicatorConfig.anchoredVwap?.showBands ?? true) && (indicatorConfig.anchoredVwap?.lowerBandVisible ?? false),
      color: indicatorConfig.anchoredVwap?.lowerBandColor ?? '#94A3B8',
      lineWidth: (indicatorConfig.anchoredVwap?.lowerBandLineWidth ?? 2) as any,
      lineStyle: getChartLineStyle(indicatorConfig.anchoredVwap?.lowerBandLineStyle ?? 'Dashed'),
      lastValueVisible: showLabels,
      title: showLabels ? 'Lower Band' : '',
    });

    markersPluginRef.current?.setMarkers(pane0Markers);
    rsiMarkersPluginRef.current?.setMarkers(indicatorConfig.ultimateRsi.visible ? calculatedRsiMarkers : []);

    applyPaneLayoutHeights(chartRef.current, indicatorConfig, maximizedPane);

    requestAnimationFrame(() => {
      const container = chartContainerRef.current;
      const panes = chartRef.current?.panes();
      if (!container || !panes) return;
      const containerRect = container.getBoundingClientRect();
      const newOffsets: Record<number, { top: number; height: number }> = {};
      for (let i = 1; i < panes.length; i++) {
        try {
          const el = panes[i].getHTMLElement();
          if (el) {
            const paneRect = el.getBoundingClientRect();
            newOffsets[i] = {
              top: Math.max(0, paneRect.top - containerRect.top),
              height: paneRect.height,
            };
          }
        } catch (e) {}
      }
      setPaneOffsets(newOffsets);
    });
  }, [
    indicatorConfig,
    displayBars,
    calculatedRsiMarkers,
    pane0Markers,
    smcLiteResult,
    anchoredVWAPResult,
    superMoneySignalResult,
    activeSubPanes,
    maximizedPane,
    applyPaneLayoutHeights,
    chartRef,
    chartContainerRef,
    setPaneOffsets,
  ]);

  return {
    candleSeriesRef,
    areaSeriesRef,
    ema50SeriesRef,
    ema150SeriesRef,
    ema200SeriesRef,
    upperEnvSeriesRef,
    lowerEnvSeriesRef,
    mcdxSeriesRef,
    bankerMaSeriesRef,
    rsiAreaSeriesRef,
    rsiSeriesRef,
    rsiSignalSeriesRef,
    dynTrendSeriesRef,
    trendSpeedHistSeriesRef,
    smcFastSmaSeriesRef,
    smcSlowSmaSeriesRef,
    smcPrimitiveRef,
    anchoredVwapSeriesRef,
    anchoredUpperBandSeriesRef,
    anchoredLowerBandSeriesRef,
    markersPluginRef,
    rsiMarkersPluginRef,
    mcdxStrikeLineRef,
    rsiObLineRef,
    rsiMidLineRef,
    rsiOsLineRef,
  };
}
