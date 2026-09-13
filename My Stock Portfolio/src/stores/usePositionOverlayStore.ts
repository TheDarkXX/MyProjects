import { create } from 'zustand';
import {
  PositionOverlaySettings,
  DEFAULT_POSITION_OVERLAY_SETTINGS,
  CornerSnap,
} from '../types/positionOverlayConfig';
import { pushSettingDebounced, registerSyncHandler, SYNC_KEYS } from '../services/settingsSync';

const STORAGE_KEY = 'xchart_position_overlay_v1';

function loadSavedConfig(): PositionOverlaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_POSITION_OVERLAY_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_POSITION_OVERLAY_SETTINGS,
      ...parsed,
    };
  } catch (_) {
    return DEFAULT_POSITION_OVERLAY_SETTINGS;
  }
}

interface PositionOverlayState {
  config: PositionOverlaySettings;
  updateConfig: (partial: Partial<PositionOverlaySettings>) => void;
  toggleEnabled: () => void;
  toggleAvgCostLine: () => void;
  toggleHUD: () => void;
  toggleHudMode: () => void;
  togglePin: () => void;
  setHudPosition: (pos: { x: number; y: number } | null, snapCorner?: CornerSnap) => void;
  snapToCorner: (corner: CornerSnap) => void;
  resetPosition: () => void;
  resetToDefaults: () => void;
  applyCloudConfig: (cloudConfig: any) => void;
}

export const usePositionOverlayStore = create<PositionOverlayState>((set, get) => ({
  config: loadSavedConfig(),

  updateConfig: (partial) => {
    const newConfig = { ...get().config, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch (_) {}
    pushSettingDebounced(SYNC_KEYS.POSITION_OVERLAY, newConfig, 800);
    set({ config: newConfig });
  },

  toggleEnabled: () => {
    get().updateConfig({ enabled: !get().config.enabled });
  },

  toggleAvgCostLine: () => {
    get().updateConfig({ showAvgCostLine: !get().config.showAvgCostLine });
  },

  toggleHUD: () => {
    get().updateConfig({ showHUD: !get().config.showHUD });
  },

  toggleHudMode: () => {
    const next = get().config.hudMode === 'expanded' ? 'compact' : 'expanded';
    get().updateConfig({ hudMode: next });
  },

  togglePin: () => {
    get().updateConfig({ isPinned: !get().config.isPinned });
  },

  setHudPosition: (pos, snapCorner = 'custom') => {
    get().updateConfig({ hudPosition: pos, snapCorner });
  },

  snapToCorner: (corner) => {
    get().updateConfig({
      hudPosition: null, // Let CSS handle corner placement
      snapCorner: corner,
    });
  },

  resetPosition: () => {
    get().updateConfig({
      hudPosition: null,
      snapCorner: 'top-right',
      hudMode: 'expanded',
      isPinned: true,
    });
  },

  resetToDefaults: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    pushSettingDebounced(SYNC_KEYS.POSITION_OVERLAY, DEFAULT_POSITION_OVERLAY_SETTINGS, 800);
    set({ config: DEFAULT_POSITION_OVERLAY_SETTINGS });
  },

  applyCloudConfig: (cloudConfig) => {
    if (!cloudConfig || typeof cloudConfig !== 'object') return;
    try {
      const merged: PositionOverlaySettings = {
        ...DEFAULT_POSITION_OVERLAY_SETTINGS,
        ...cloudConfig,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      set({ config: merged });
    } catch (e) {
      console.warn('[usePositionOverlayStore] Failed to apply cloud config:', e);
    }
  },
}));

// Register cloud sync handler
registerSyncHandler(SYNC_KEYS.POSITION_OVERLAY, (cloudValue) => {
  usePositionOverlayStore.getState().applyCloudConfig(cloudValue);
});
