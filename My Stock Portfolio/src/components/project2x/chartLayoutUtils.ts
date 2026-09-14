import { IndicatorSettings, SubPaneIndicatorId } from '../../types/indicatorConfig';

export interface ActiveSubPanesResult {
  list: { id: SubPaneIndicatorId; rank: number }[];
  paneMap: Partial<Record<SubPaneIndicatorId, number>>;
  count: number;
}

export function applyPaneLayoutHeights(
  chartInstance: any,
  containerHeight: number,
  cfg: IndicatorSettings,
  activeSubPanes: ActiveSubPanesResult,
  maximized: number | null,
  isMobile?: boolean
): void {
  if (!chartInstance) return;
  const panes = chartInstance.panes?.();
  if (!panes || panes.length === 0) return;

  const containerH = containerHeight || 650;

  if (panes.length < 2) {
    if (panes[0]?.setStretchFactor) panes[0].setStretchFactor(containerH);
    return;
  }

  if (maximized !== null) {
    const mainH = isMobile ? 50 : 60;
    const subMaxH = Math.max(150, containerH - mainH);
    if (panes[0]?.setStretchFactor) panes[0].setStretchFactor(mainH);
    for (let i = 1; i < panes.length; i++) {
      if (panes[i]?.setStretchFactor) {
        panes[i].setStretchFactor(maximized === i ? subMaxH : 0);
      }
    }
  } else {
    let subpanesSum = 0;
    const heights: number[] = [];
    const defaultSubH = isMobile ? 85 : 140;

    for (let i = 1; i < panes.length; i++) {
      let targetH = defaultSubH;
      if (activeSubPanes.paneMap.mcdx === i) {
        targetH = isMobile ? 85 : Math.max(80, cfg.paneHeights?.mcdx || 140);
      } else if (activeSubPanes.paneMap.ultimateRsi === i) {
        targetH = isMobile ? 85 : Math.max(80, cfg.paneHeights?.ultimateRsi || 140);
      } else if (activeSubPanes.paneMap.trendSpeed === i) {
        targetH = isMobile ? 85 : Math.max(80, cfg.paneHeights?.trendSpeed || 140);
      }
      heights[i] = targetH;
      subpanesSum += targetH;
    }

    const mainH = Math.max(isMobile ? 180 : 120, containerH - subpanesSum);
    if (panes[0]?.setStretchFactor) panes[0].setStretchFactor(mainH);
    for (let i = 1; i < panes.length; i++) {
      if (panes[i]?.setStretchFactor) {
        panes[i].setStretchFactor(heights[i]);
      }
    }
  }
}
