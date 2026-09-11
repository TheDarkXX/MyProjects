import { create } from 'zustand';
import { HorizontalLineDrawing, DrawingTool, DEFAULT_LINE_DRAWING } from '../types/drawingTypes';
import { snapToTickSize, detectSupportResistance } from '../utils/drawingUtils';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'hl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

function getStorageKey(symbol: string): string {
  return `tv_drawings_${symbol.toUpperCase().trim()}`;
}

function loadFromStorage(symbol: string): HorizontalLineDrawing[] {
  try {
    const raw = localStorage.getItem(getStorageKey(symbol));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Failed to load drawings for ${symbol}:`, err);
    return [];
  }
}

function saveToStorage(symbol: string, drawings: HorizontalLineDrawing[]): void {
  try {
    localStorage.setItem(getStorageKey(symbol), JSON.stringify(drawings));
  } catch (err) {
    console.error(`Failed to save drawings for ${symbol}:`, err);
  }
}

export interface DrawingState {
  drawingsBySymbol: Record<string, HorizontalLineDrawing[]>;
  activeTool: DrawingTool;
  selectedLineId: string | null;
  hoveredLineId: string | null;
  magnetMode: boolean;
  globalDrawingsVisible: boolean;
  isToolbarCollapsed: boolean;
  clipboardLine: HorizontalLineDrawing | null;

  // Actions
  loadDrawings: (symbol: string) => HorizontalLineDrawing[];
  getDrawings: (symbol: string) => HorizontalLineDrawing[];
  addLine: (symbol: string, line: Partial<HorizontalLineDrawing> & { price: number }) => string;
  updateLine: (symbol: string, id: string, updates: Partial<HorizontalLineDrawing>) => void;
  deleteLine: (symbol: string, id: string) => void;
  clearLines: (symbol: string) => void;
  cloneLine: (symbol: string, id: string, newPrice?: number) => string | null;
  setActiveTool: (tool: DrawingTool) => void;
  selectLine: (id: string | null) => void;
  hoverLine: (id: string | null) => void;
  toggleMagnetMode: () => void;
  toggleGlobalVisibility: () => void;
  toggleToolbarCollapsed: () => void;
  copySelectedLine: (symbol: string) => void;
  pasteClipboard: (symbol: string, atPrice?: number) => string | null;
  nudgeSelectedLine: (symbol: string, direction: 'up' | 'down', customTick?: number) => void;
  autoDetectSRLevels: (symbol: string, bars: any[]) => void;
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  drawingsBySymbol: {},
  activeTool: 'cursor',
  selectedLineId: null,
  hoveredLineId: null,
  magnetMode: false,
  globalDrawingsVisible: true,
  isToolbarCollapsed: false,
  clipboardLine: null,

  loadDrawings: (symbol: string) => {
    const sym = symbol.toUpperCase().trim();
    const stored = loadFromStorage(sym);
    set((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [sym]: stored,
      },
    }));
    return stored;
  },

  getDrawings: (symbol: string) => {
    const sym = symbol.toUpperCase().trim();
    const current = get().drawingsBySymbol[sym];
    if (current) return current;
    return get().loadDrawings(sym);
  },

  addLine: (symbol: string, lineData) => {
    const sym = symbol.toUpperCase().trim();
    const current = get().getDrawings(sym);
    const newLine: HorizontalLineDrawing = {
      ...DEFAULT_LINE_DRAWING,
      ...lineData,
      id: generateId(),
      createdAt: Date.now(),
    };

    const updated = [...current, newLine];
    saveToStorage(sym, updated);

    set((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [sym]: updated,
      },
      selectedLineId: newLine.id,
      activeTool: 'cursor', // TradingView behavior: switch back to cursor after placing
    }));

    return newLine.id;
  },

  updateLine: (symbol: string, id: string, updates: Partial<HorizontalLineDrawing>) => {
    const sym = symbol.toUpperCase().trim();
    const current = get().getDrawings(sym);
    const updated = current.map((d) => (d.id === id ? { ...d, ...updates } : d));
    saveToStorage(sym, updated);

    set((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [sym]: updated,
      },
    }));
  },

  deleteLine: (symbol: string, id: string) => {
    const sym = symbol.toUpperCase().trim();
    const current = get().getDrawings(sym);
    const updated = current.filter((d) => d.id !== id);
    saveToStorage(sym, updated);

    set((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [sym]: updated,
      },
      selectedLineId: state.selectedLineId === id ? null : state.selectedLineId,
      hoveredLineId: state.hoveredLineId === id ? null : state.hoveredLineId,
    }));
  },

  clearLines: (symbol: string) => {
    const sym = symbol.toUpperCase().trim();
    saveToStorage(sym, []);
    set((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [sym]: [],
      },
      selectedLineId: null,
      hoveredLineId: null,
    }));
  },

  cloneLine: (symbol: string, id: string, newPrice?: number) => {
    const sym = symbol.toUpperCase().trim();
    const current = get().getDrawings(sym);
    const target = current.find((d) => d.id === id);
    if (!target) return null;

    const priceOffset = newPrice !== undefined ? newPrice : target.price * 1.015;
    const cloned: HorizontalLineDrawing = {
      ...target,
      id: generateId(),
      price: snapToTickSize(priceOffset),
      createdAt: Date.now(),
    };

    const updated = [...current, cloned];
    saveToStorage(sym, updated);

    set((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [sym]: updated,
      },
      selectedLineId: cloned.id,
    }));

    return cloned.id;
  },

  setActiveTool: (tool: DrawingTool) => {
    set({ activeTool: tool });
  },

  selectLine: (id: string | null) => {
    set({ selectedLineId: id });
  },

  hoverLine: (id: string | null) => {
    set({ hoveredLineId: id });
  },

  toggleMagnetMode: () => {
    set((state) => ({ magnetMode: !state.magnetMode }));
  },

  toggleGlobalVisibility: () => {
    set((state) => ({ globalDrawingsVisible: !state.globalDrawingsVisible }));
  },

  toggleToolbarCollapsed: () => {
    set((state) => ({ isToolbarCollapsed: !state.isToolbarCollapsed }));
  },

  copySelectedLine: (symbol: string) => {
    const { selectedLineId } = get();
    if (!selectedLineId) return;
    const sym = symbol.toUpperCase().trim();
    const current = get().getDrawings(sym);
    const found = current.find((d) => d.id === selectedLineId);
    if (found) {
      set({ clipboardLine: found });
    }
  },

  pasteClipboard: (symbol: string, atPrice?: number) => {
    const { clipboardLine } = get();
    if (!clipboardLine) return null;
    const sym = symbol.toUpperCase().trim();
    const current = get().getDrawings(sym);

    const price = atPrice !== undefined ? atPrice : clipboardLine.price * 1.01;
    const newLine: HorizontalLineDrawing = {
      ...clipboardLine,
      id: generateId(),
      price: snapToTickSize(price),
      createdAt: Date.now(),
    };

    const updated = [...current, newLine];
    saveToStorage(sym, updated);

    set((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [sym]: updated,
      },
      selectedLineId: newLine.id,
    }));

    return newLine.id;
  },

  nudgeSelectedLine: (symbol: string, direction: 'up' | 'down', customTick?: number) => {
    const { selectedLineId } = get();
    if (!selectedLineId) return;
    const sym = symbol.toUpperCase().trim();
    const current = get().getDrawings(sym);
    const target = current.find((d) => d.id === selectedLineId);
    if (!target || target.locked) return;

    const step = customTick ?? (target.price < 5 ? 0.02 : target.price < 25 ? 0.10 : 0.25);
    const delta = direction === 'up' ? step : -step;
    const newPrice = snapToTickSize(Math.max(0.01, target.price + delta), customTick);

    get().updateLine(sym, selectedLineId, { price: newPrice });
  },

  autoDetectSRLevels: (symbol: string, bars: any[]) => {
    if (!bars || bars.length < 30) return;
    const detected = detectSupportResistance(bars, 15, 4);
    if (detected.length === 0) return;

    const sym = symbol.toUpperCase().trim();
    const current = get().getDrawings(sym);
    const newDrawings: HorizontalLineDrawing[] = [];

    detected.forEach((lvl, idx) => {
      // Avoid duplicate price
      const exists = current.some((d) => Math.abs(d.price - lvl.price) / lvl.price < 0.005);
      if (!exists) {
        newDrawings.push({
          ...DEFAULT_LINE_DRAWING,
          id: generateId(),
          price: lvl.price,
          color: lvl.type === 'support' ? '#26A69A' : '#EF5350',
          lineStyle: 'Dashed',
          lineWidth: 1,
          text: `${lvl.type === 'support' ? 'Support' : 'Resist'} ${idx + 1} (${lvl.strength}x)`,
          showPriceLabel: true,
          locked: false,
          visible: true,
          visibleOn: 'all',
          createdAt: Date.now(),
        });
      }
    });

    if (newDrawings.length > 0) {
      const updated = [...current, ...newDrawings];
      saveToStorage(sym, updated);
      set((state) => ({
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [sym]: updated,
        },
      }));
    }
  },
}));
