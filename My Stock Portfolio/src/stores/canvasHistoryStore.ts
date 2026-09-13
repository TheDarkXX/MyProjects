import { create } from 'zustand';
import { executeUndo, executeRedo } from './canvasHistoryDispatcher';

export const MAX_HISTORY = 30;

export type CanvasActionType =
  | 'ADD_LINE'
  | 'DELETE_LINE'
  | 'UPDATE_LINE'
  | 'ADD_TRENDLINE'
  | 'DELETE_TRENDLINE'
  | 'UPDATE_TRENDLINE'
  | 'CLEAR_ALL_DRAWINGS'
  | 'AUTO_DETECT_SR'
  | 'TOGGLE_INDICATOR';

export type CanvasIconType = 'line' | 'trend' | 'indicator' | 'trash' | 'sparkles';

export interface CanvasCommand {
  id: string;
  type: CanvasActionType;
  symbol: string; // Ticker symbol or 'GLOBAL' for indicators
  description: string;
  iconType: CanvasIconType;
  timestamp: number;
  forwardData: any;
  inverseData: any;
}

interface CanvasHistoryState {
  past: CanvasCommand[];
  future: CanvasCommand[];
  isRestoring: boolean;
  isHistoryOpen: boolean;

  // Actions
  pushCommand: (cmd: Omit<CanvasCommand, 'id' | 'timestamp'>) => void;
  undo: (currentSymbol?: string) => CanvasCommand | null;
  redo: (currentSymbol?: string) => CanvasCommand | null;
  jumpToPast: (targetId: string, currentSymbol?: string) => void;
  jumpToFuture: (targetId: string, currentSymbol?: string) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  peekUndo: () => CanvasCommand | undefined;
  peekRedo: () => CanvasCommand | undefined;
  toggleHistoryOpen: () => void;
  setHistoryOpen: (open: boolean) => void;
  clearHistory: () => void;
}

export const useCanvasHistoryStore = create<CanvasHistoryState>((set, get) => ({
  past: [],
  future: [],
  isRestoring: false,
  isHistoryOpen: false,

  pushCommand: (cmdData) => {
    // Prevent recording commands while an undo/redo restore is actively running
    if (get().isRestoring) return;

    const newCommand: CanvasCommand = {
      ...cmdData,
      id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };

    set((state) => {
      const nextPast = [newCommand, ...state.past].slice(0, MAX_HISTORY);
      return {
        past: nextPast,
        future: [], // Standard linear history: new action wipes future
      };
    });
  },

  undo: (_currentSymbol?: string) => {
    const { past, future, isRestoring } = get();
    if (past.length === 0 || isRestoring) return null;

    const [cmdToUndo, ...remainingPast] = past;

    set({ isRestoring: true });
    try {
      executeUndo(cmdToUndo);
    } catch (err) {
      console.error('Failed to execute undo command:', err);
    } finally {
      set({
        past: remainingPast,
        future: [cmdToUndo, ...future],
        isRestoring: false,
      });
    }

    return cmdToUndo;
  },

  redo: (_currentSymbol?: string) => {
    const { past, future, isRestoring } = get();
    if (future.length === 0 || isRestoring) return null;

    const [cmdToRedo, ...remainingFuture] = future;

    set({ isRestoring: true });
    try {
      executeRedo(cmdToRedo);
    } catch (err) {
      console.error('Failed to execute redo command:', err);
    } finally {
      set({
        past: [cmdToRedo, ...past].slice(0, MAX_HISTORY),
        future: remainingFuture,
        isRestoring: false,
      });
    }

    return cmdToRedo;
  },

  jumpToPast: (targetId: string, currentSymbol?: string) => {
    const { past, isRestoring } = get();
    if (isRestoring || past.length === 0) return;

    const targetIdx = past.findIndex((c) => c.id === targetId);
    if (targetIdx === -1) return;

    // We want to undo up to and including the target command
    const countToUndo = targetIdx + 1;
    for (let i = 0; i < countToUndo; i++) {
      get().undo(currentSymbol);
    }
  },

  jumpToFuture: (targetId: string, currentSymbol?: string) => {
    const { future, isRestoring } = get();
    if (isRestoring || future.length === 0) return;

    const targetIdx = future.findIndex((c) => c.id === targetId);
    if (targetIdx === -1) return;

    // We want to redo up to and including the target command
    const countToRedo = targetIdx + 1;
    for (let i = 0; i < countToRedo; i++) {
      get().redo(currentSymbol);
    }
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  peekUndo: () => get().past[0],
  peekRedo: () => get().future[0],

  toggleHistoryOpen: () => set((state) => ({ isHistoryOpen: !state.isHistoryOpen })),
  setHistoryOpen: (open: boolean) => set({ isHistoryOpen: open }),

  clearHistory: () => set({ past: [], future: [], isHistoryOpen: false }),
}));
