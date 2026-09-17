import React from 'react';

export interface DossierTooltipRow {
  label: string;
  value: string | number;
  color?: string;
  subtext?: string;
}

interface DossierTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: any;
    color?: string;
    payload?: any;
  }>;
  label?: string;
  title?: string;
  customRows?: DossierTooltipRow[];
}

export const DossierTooltip: React.FC<DossierTooltipProps> = ({
  active,
  payload,
  label,
  title,
  customRows
}) => {
  if (!active || (!payload?.length && !customRows?.length)) return null;

  const headerTitle = title || label;

  return (
    <div className="bg-[#141E38]/95 backdrop-blur-md border border-cyan-500/40 rounded-xl px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)] min-w-[180px] z-50 pointer-events-none transition-all duration-150 animate-in fade-in-50 zoom-in-95">
      {headerTitle && (
        <div className="text-slate-200 text-sm font-semibold tracking-wider pb-1.5 mb-2 border-b border-slate-700/60 flex items-center justify-between">
          <span>{headerTitle}</span>
        </div>
      )}

      <div className="space-y-1.5">
        {customRows
          ? customRows.map((row, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  {row.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm"
                      style={{ backgroundColor: row.color }}
                    />
                  )}
                  {row.label}
                </span>
                <span className="font-mono font-semibold text-slate-100">
                  {row.value}
                </span>
              </div>
            ))
          : payload?.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm"
                    style={{ backgroundColor: entry.color || '#38BDF8' }}
                  />
                  {entry.name || 'Value'}:
                </span>
                <span className="font-mono font-semibold text-slate-100">
                  {typeof entry.value === 'number'
                    ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : entry.value}
                </span>
              </div>
            ))}
      </div>
    </div>
  );
};

export default DossierTooltip;
