import { create } from 'zustand';
import {
  HorizontalLineDrawing,
  DrawingTool,
  DEFAULT_LINE_DRAWING,
  DrawingSettings,
  DEFAULT_DRAWING_SETTINGS,
} from '../types/drawingTypes';
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

const SETTINGS_STORAGE_KEY = 'tv_drawing_settings_v1';

function loadSettingsFromStorage(): DrawingSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_DRAWING_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DRAWING_SETTINGS, ...parsed };
  } catch (e) {
    return DEFAULT_DRAWING_SETTINGS;
  }
}

function saveSettingsToStorage(settings: DrawingSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {}
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
  toastNotification: string | null;
  drawingSettings: DrawingSettings;

  // Actions
  setToastNotification: (msg: string | null) => void;
  updateDrawingSettings: (partial: Partial<DrawingSettings>) => void;
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
  toastNotification: null,
  drawingSettings: loadSettingsFromStorage(),

  setToastNotification: (msg: string | null) => {
    set({ toastNotification: msg });
  },

  updateDrawingSettings: (partial: Partial<DrawingSettings>) => {
    const current = get().drawingSettings;
    const updated = { ...current, ...partial };
    saveSettingsToStorage(updated);
    set({ drawingSettings: updated });
  },

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
    const settings = get().drawingSettings;

    const newLine: HorizontalLineDrawing = {
      ...DEFAULT_LINE_DRAWING,
      color: lineData.color ?? settings.defaultLineColor,
      lineWidth: lineData.lineWidth ?? settings.defaultLineWidth,
      lineStyle: lineData.lineStyle ?? settings.defaultLineStyle,
      showPriceLabel: false, // In-canvas badges only
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
    const detected = detectSupportResistance(bars, 12, 2);
    if (detected.length === 0) return;

    const sym = symbol.toUpperCase().trim();
    const current = get().getDrawings(sym);
    const settings = get().drawingSettings;

    // Keep manual user lines, replace previous auto-generated lines
    const manualLines = current.filter((d) => !d.isAuto);

    let resCount = 1;
    let supCount = 1;

    const newDrawings: HorizontalLineDrawing[] = detected.map((lvl) => {
      const isSup = lvl.type === 'support';
      const label = isSup ? `S${supCount++}` : `R${resCount++}`;
      return {
        ...DEFAULT_LINE_DRAWING,
        id: generateId(),
        price: lvl.price,
        color: isSup ? settings.supportColor : settings.resistanceColor,
        lineStyle: isSup ? settings.supportStyle : settings.resistanceStyle,
        lineWidth: isSup ? settings.supportWidth : settings.resistanceWidth,
        text: `${label} (${lvl.price.toFixed(2)})`,
        showPriceLabel: false, // In-canvas badges only! Never blocks Price Scale!
        locked: false,
        visible: true,
        visibleOn: 'all',
        isAuto: true,
        alertEnabled: false,
        createdAt: Date.now(),
      };
    });

    const updated = [...manualLines, ...newDrawings];
    saveToStorage(sym, updated);

    set((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [sym]: updated,
      },
      toastNotification: `✨ Auto S/R: Placed ${newDrawings.length} Key Levels for ${sym}`,
    }));

    setTimeout(() => {
      set((state) => ({
        toastNotification: state.toastNotification?.includes(sym) ? null : state.toastNotification,
      }));
    }, 4500);
  },
}));
