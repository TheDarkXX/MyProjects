import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Holding } from '../../hooks/useHoldings';
import { useTransactionStore } from '../../stores/transactionStore';
import clsx from 'clsx';

interface Props {
  holdings: Holding[];
}

interface TreeNode {
  name: string;
  value?: number;
  returnPercent?: number;
  symbol?: string;
  children?: TreeNode[];
}

export const Heatmap: React.FC<Props> = ({ holdings }) => {
  const [timeRange, setTimeRange] = useState<'1D' | 'Total'>('Total');
  const { transactions } = useTransactionStore();

  const width = 800;
  const height = 400;

  const { data, colorScale } = useMemo(() => {
    const metadataMap: Record<string, { sector: string }> = {};
    
    [...transactions]
      .filter(t => t.status === 'CONFIRMED' && t.type === 'BUY')
      .forEach(tx => {
        if (tx.symbol) {
          metadataMap[tx.symbol] = {
            sector: tx.stock_type || 'Other' // Fallback to stock_type as sector
          };
        }
      });

    const sectors: Record<string, TreeNode[]> = {};
    
    holdings.forEach(h => {
      if (h.currentValue <= 0) return;
      const sector = metadataMap[h.symbol]?.sector || 'Other';
      if (!sectors[sector]) sectors[sector] = [];
      
      sectors[sector].push({
        name: h.symbol,
        symbol: h.symbol,
        value: h.currentValue,
        returnPercent: timeRange === '1D' ? h.dayChangePercent : h.totalReturnPercent
      });
    });

    const rootData: TreeNode = {
      name: 'Portfolio',
      children: Object.entries(sectors).map(([name, children]) => ({
        name,
        children
      }))
    };

    // Domain for color scale: typically -5% to +5% for 1D, or -20% to +20% for Total
    const maxVal = timeRange === '1D' ? 5 : 30;
    
    // Create a color scale (Red -> Gray -> Green)
    const color = d3.scaleLinear<string>()
      .domain([-maxVal, 0, maxVal])
      .range(['#823AFD', '#2A2E45', '#FC2D79'])
      .clamp(true);

    return { data: rootData, colorScale: color };
  }, [holdings, transactions, timeRange]);

  const root = useMemo(() => {
    if (!data.children || data.children.length === 0) return null;
    
    const hierarchy = d3.hierarchy<TreeNode>(data)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
      
    const treemap = d3.treemap<TreeNode>()
      .size([width, height])
      .paddingTop(20)
      .paddingRight(2)
      .paddingInner(2)
      .round(true);
      
    return treemap(hierarchy);
  }, [data, width, height]);

  if (!root) {
    return (
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 h-[500px] flex items-center justify-center text-[#9898C8]">
        No data available for heatmap
      </div>
    );
  }

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Heatmap</h3>
        <div className="flex bg-[#1A1D2D] rounded-lg p-1">
          <button
            onClick={() => setTimeRange('1D')}
            className={clsx("px-3 py-1 rounded-md text-sm font-medium transition-colors", timeRange === '1D' ? "bg-[#823AFD] text-white" : "text-[#9898C8] hover:text-white")}
          >
            1D
          </button>
          <button
            onClick={() => setTimeRange('Total')}
            className={clsx("px-3 py-1 rounded-md text-sm font-medium transition-colors", timeRange === 'Total' ? "bg-[#823AFD] text-white" : "text-[#9898C8] hover:text-white")}
          >
            Total
          </button>
        </div>
      </div>
      
      <div className="w-full overflow-x-auto relative custom-scrollbar">
        <div style={{ width: width, height: height }} className="relative mx-auto">
          <svg width={width} height={height} className="overflow-visible font-sans">
            {root.descendants().map((node, i) => {
              if (node.depth === 1) {
                // Sector headers
                return (
                  <g key={`group-${i}`}>
                    <rect
                      x={node.x0}
                      y={node.y0}
                      width={node.x1 - node.x0}
                      height={node.y1 - node.y0}
                      fill="transparent"
                      stroke="#2A2E45"
                      strokeWidth={1}
                    />
                    <text
                      x={node.x0 + 4}
                      y={node.y0 + 14}
                      fill="#9898C8"
                      fontSize={12}
                      fontWeight="bold"
                    >
                      {node.data.name}
                    </text>
                  </g>
                );
              } else if (node.depth === 2) {
                // Stock cells
                const width = node.x1 - node.x0;
                const height = node.y1 - node.y0;
                const returnPct = node.data.returnPercent || 0;
                
                // Hide tiny text
                const showText = width > 40 && height > 30;
                
                return (
                  <g key={`cell-${i}`} transform={`translate(${node.x0},${node.y0})`} className="group">
                    <rect
                      width={width}
                      height={height}
                      fill={colorScale(returnPct)}
                      stroke="#111418"
                      strokeWidth={2}
                      className="transition-colors hover:brightness-125"
                    />
                    {showText && (
                      <>
                        <text
                          x={width / 2}
                          y={height / 2 - 4}
                          textAnchor="middle"
                          fill="#fff"
                          fontSize={Math.min(14, width / 4)}
                          fontWeight="bold"
                        >
                          {node.data.name}
                        </text>
                        <text
                          x={width / 2}
                          y={height / 2 + 10}
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.8)"
                          fontSize={Math.min(11, width / 5)}
                        >
                          {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                        </text>
                      </>
                    )}
                    
                    <title>{`${node.data.name}\nValue: $${node.value?.toFixed(2)}\nReturn: ${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`}</title>
                  </g>
                );
              }
              return null;
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
