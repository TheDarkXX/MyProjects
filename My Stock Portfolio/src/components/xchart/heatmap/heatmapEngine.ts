import * as d3 from 'd3';
import { HeatmapItem, TileSizeTier, TreemapLeafNode, TreemapSectorNode, GroupBy, SizeMetric, ColorMetric } from './types';

/**
 * Exact TradingView 7-step color palette sampled directly from TradingView screenshot:
 * -3% and below: #F13948 (Vibrant Coral Red)
 * -2% (-3.0% to -1.5%): #B12A35 (Crimson Red)
 * -1% (-1.5% to -0.5%): #7F1B24 (Deep Burgundy Red)
 *  0% (-0.5% to +0.5%): #3D3D3D (Charcoal Neutral Gray)
 * +1% (+0.5% to +1.5%): #1A3327 (Dark Forest Green)
 * +2% (+1.5% to +3.0%): #0A6639 (Rich Pine Green)
 * +3% and above: #129955 (Vibrant Emerald Green)
 */
export function getTvColor(percent: number): string {
  if (percent >= 3.0) return '#129955';
  if (percent >= 1.5) return '#0A6639';
  if (percent >= 0.5) return '#1A3327';
  if (percent <= -3.0) return '#F13948';
  if (percent <= -1.5) return '#B12A35';
  if (percent <= -0.5) return '#7F1B24';
  return '#3D3D3D';
}

/**
 * Format Market Cap to readable US notation ($3.24T, $850.5B, $45.2M)
 */
export function formatMarketCap(val: number): string {
  if (!val || val <= 0) return '-';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toLocaleString()}`;
}

/**
 * Format Price ($185.35)
 */
export function formatPrice(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '-';
  return `$${val.toFixed(2)}`;
}

/**
 * Format Percent (+2.45%, -1.12%)
 */
export function formatPercent(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00%';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}%`;
}

/**
 * Calculate Tile Size Tier based on width and height
 * Ensures strict adherence to font-size >= 13px rule
 */
export function calculateTileTier(width: number, height: number): TileSizeTier {
  if (width >= 105 && height >= 75) return 'XL';
  if (width >= 80 && height >= 55) return 'L';
  if (width >= 56 && height >= 40) return 'M';
  if (width >= 40 && height >= 26) return 'S';
  return 'XS';
}

/**
 * Compute the Squarified Treemap Layout using d3
 */
export function computeTreemapLayout(
  items: HeatmapItem[],
  width: number,
  height: number,
  groupBy: GroupBy,
  sizeMetric: SizeMetric,
  colorMetric: ColorMetric
): TreemapSectorNode[] {
  if (!items || items.length === 0 || width <= 0 || height <= 0) {
    return [];
  }

  // Value getter based on chosen sizeMetric
  const getValue = (d: HeatmapItem): number => {
    if (sizeMetric === 'portfolioValue') {
      return Math.max(d.portfolioValue ?? d.marketCap ?? 1, 1);
    }
    if (sizeMetric === 'equal') {
      return 1;
    }
    // Default marketCap
    return Math.max(d.marketCap ?? 1000000000, 1);
  };

  // Color percentage getter based on colorMetric
  const getPercent = (d: HeatmapItem): number => {
    if (colorMetric === 'perf_total' && d.totalReturnPercent !== undefined) {
      return d.totalReturnPercent;
    }
    return d.percentChange ?? 0;
  };

  if (groupBy === 'none') {
    // Flat treemap without sector boundaries
    const hierarchyData = {
      name: 'root',
      children: items
    };

    const root = d3.hierarchy<any>(hierarchyData)
      .sum(d => (d.symbol ? getValue(d) : 0))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemapLayout = d3.treemap<any>()
      .size([width, height])
      .tile(d3.treemapSquarify.ratio(1.618))
      .paddingInner(2)
      .round(true);

    const rectRoot = treemapLayout(root) as d3.HierarchyRectangularNode<any>;

    const leaves: TreemapLeafNode[] = (rectRoot.leaves() as d3.HierarchyRectangularNode<any>[]).map(leaf => {
      const w = leaf.x1 - leaf.x0;
      const h = leaf.y1 - leaf.y0;
      const pct = getPercent(leaf.data);
      return {
        data: leaf.data,
        x0: leaf.x0,
        y0: leaf.y0,
        x1: leaf.x1,
        y1: leaf.y1,
        width: w,
        height: h,
        tier: calculateTileTier(w, h),
        color: getTvColor(pct)
      };
    });

    return [{
      name: 'All Stocks',
      x0: 0,
      y0: 0,
      x1: width,
      y1: height,
      width,
      height,
      leaves
    }];
  }

  // Group by sector
  const sectorGroups = new Map<string, HeatmapItem[]>();
  for (const item of items) {
    const sec = item.sector || 'Other';
    if (!sectorGroups.has(sec)) {
      sectorGroups.set(sec, []);
    }
    sectorGroups.get(sec)!.push(item);
  }

  const hierarchyData = {
    name: 'root',
    children: Array.from(sectorGroups.entries()).map(([sectorName, secItems]) => ({
      name: sectorName,
      children: secItems
    }))
  };

  const root = d3.hierarchy<any>(hierarchyData)
    .sum(d => (d.symbol ? getValue(d) : 0))
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  const treemapLayout = d3.treemap<any>()
    .size([width, height])
    .tile(d3.treemapSquarify.ratio(1.618))
    .paddingTop(26)      // Space for sector breadcrumb header
    .paddingInner(2)     // Tile gap
    .paddingOuter(3)     // Sector container gap
    .round(true);

  const rectRoot = treemapLayout(root) as d3.HierarchyRectangularNode<any>;

  // Map sector nodes
  const sectors: TreemapSectorNode[] = [];

  if (rectRoot.children) {
    for (const secNode of rectRoot.children as d3.HierarchyRectangularNode<any>[]) {
      const leaves: TreemapLeafNode[] = ((secNode.leaves() || []) as d3.HierarchyRectangularNode<any>[]).map(leaf => {
        const w = leaf.x1 - leaf.x0;
        const h = leaf.y1 - leaf.y0;
        const pct = getPercent(leaf.data);
        return {
          data: leaf.data,
          x0: leaf.x0,
          y0: leaf.y0,
          x1: leaf.x1,
          y1: leaf.y1,
          width: w,
          height: h,
          tier: calculateTileTier(w, h),
          color: getTvColor(pct)
        };
      });

      sectors.push({
        name: secNode.data.name,
        x0: secNode.x0,
        y0: secNode.y0,
        x1: secNode.x1,
        y1: secNode.y1,
        width: secNode.x1 - secNode.x0,
        height: secNode.y1 - secNode.y0,
        leaves
      });
    }
  }

  return sectors;
}
