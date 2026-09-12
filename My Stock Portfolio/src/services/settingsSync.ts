import { api } from './api';
import { useSyncStatusStore } from '../stores/syncStatusStore';

export const SYNC_KEYS = {
  INDICATORS: 'xchart_indicators_v1',
  TABS: 'xchart_tabs_state_v1',
  WATCHLIST: 'stock_xchart_watchlist_v3',
  DETAIL_COLLAPSED: 'stock_xchart_detail_collapsed',
  DRAWING_SETTINGS: 'tv_drawing_settings_v1',
  UI_PREFERENCES: 'ui_preferences_v1',
} as const;

export type SyncKey = typeof SYNC_KEYS[keyof typeof SYNC_KEYS];

type SyncHandler = (cloudValue: any) => void;
const syncHandlers = new Map<string, SyncHandler>();

export function registerSyncHandler(key: string, handler: SyncHandler) {
  syncHandlers.set(key, handler);
}

let isApplyingCloud = false;
export function isCloudSyncInProgress(): boolean {
  return isApplyingCloud;
}

const pushTimers = new Map<string, any>();

export function pushSettingDebounced(key: string, value: any, delayMs: number = 800) {
  if (isApplyingCloud) {
    return;
  }

  if (pushTimers.has(key)) {
    clearTimeout(pushTimers.get(key));
  }

  useSyncStatusStore.getState().setSyncing('push');
  useSyncStatusStore.getState().setPendingPushes(pushTimers.size + 1);

  const timer = setTimeout(async () => {
    pushTimers.delete(key);
    useSyncStatusStore.getState().setPendingPushes(pushTimers.size);
    try {
      await api.settings.save(key, value);
      if (pushTimers.size === 0) {
        useSyncStatusStore.getState().setSynced();
      }
    } catch (err: any) {
      console.warn(`[CloudSync] Failed to push setting '${key}':`, err);
      useSyncStatusStore.getState().setError(err?.message || `Failed to push setting '${key}'`);
    }
  }, delayMs);

  pushTimers.set(key, timer);
}

export async function pushSettingImmediate(key: string, value: any) {
  if (isApplyingCloud) return;
  useSyncStatusStore.getState().setSyncing('push');
  try {
    await api.settings.save(key, value);
    if (pushTimers.size === 0) {
      useSyncStatusStore.getState().setSynced();
    }
  } catch (err: any) {
    console.warn(`[CloudSync] Failed to push setting '${key}':`, err);
    useSyncStatusStore.getState().setError(err?.message || `Failed to push setting '${key}'`);
  }
}

let lastPullTime = 0;

export async function pullAllSettings(force = false) {
  const now = Date.now();
  if (!force && now - lastPullTime < 3000) {
    return;
  }
  lastPullTime = now;

  useSyncStatusStore.getState().setSyncing('pull');

  try {
    const res = await api.settings.getAll();
    if (!res || !res.success || !res.settings) {
      useSyncStatusStore.getState().setError(res?.error || 'Failed to fetch settings from cloud');
      return;
    }

    const cloudSettings: Record<string, { value: any; updated_at: string }> = res.settings;

    isApplyingCloud = true;
    try {
      for (const [key, handler] of syncHandlers.entries()) {
        const cloudEntry = cloudSettings[key];
        if (cloudEntry && cloudEntry.value !== undefined && cloudEntry.value !== null) {
          try {
            handler(cloudEntry.value);
          } catch (err) {
            console.error(`[CloudSync] Handler failed for key '${key}':`, err);
          }
        }
      }
    } finally {
      isApplyingCloud = false;
    }

    // Check for unseeded keys and push local storage
    checkAndSeedMissingSettings(cloudSettings);

    // Mark as successfully synced
    useSyncStatusStore.getState().setSynced();

  } catch (err: any) {
    console.warn('[CloudSync] Failed to pull settings from cloud:', err);
    useSyncStatusStore.getState().setError(err?.message || 'Failed to pull settings from cloud');
  }
}

export async function forceResync() {
  return pullAllSettings(true);
}

function checkAndSeedMissingSettings(cloudSettings: Record<string, any>) {
  if (typeof window === 'undefined') return;

  // 1. Indicators
  if (!cloudSettings[SYNC_KEYS.INDICATORS]?.value) {
    const local = localStorage.getItem(SYNC_KEYS.INDICATORS);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') {
          pushSettingImmediate(SYNC_KEYS.INDICATORS, parsed);
        }
      } catch {}
    }
  }

  // 2. Tabs
  if (!cloudSettings[SYNC_KEYS.TABS]?.value) {
    const local = localStorage.getItem(SYNC_KEYS.TABS);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
          pushSettingImmediate(SYNC_KEYS.TABS, parsed);
        }
      } catch {}
    }
  }

  // 3. Watchlist
  if (!cloudSettings[SYNC_KEYS.WATCHLIST]?.value) {
    const local = localStorage.getItem(SYNC_KEYS.WATCHLIST);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          pushSettingImmediate(SYNC_KEYS.WATCHLIST, parsed);
        }
      } catch {}
    }
  }

  // 4. Detail Collapsed
  if (cloudSettings[SYNC_KEYS.DETAIL_COLLAPSED]?.value === undefined) {
    const local = localStorage.getItem(SYNC_KEYS.DETAIL_COLLAPSED);
    if (local !== null) {
      pushSettingImmediate(SYNC_KEYS.DETAIL_COLLAPSED, local === 'true');
    }
  }

  // 5. Drawing settings
  if (!cloudSettings[SYNC_KEYS.DRAWING_SETTINGS]?.value) {
    const local = localStorage.getItem(SYNC_KEYS.DRAWING_SETTINGS);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') {
          pushSettingImmediate(SYNC_KEYS.DRAWING_SETTINGS, parsed);
        }
      } catch {}
    }
  }

  // 6. UI Preferences
  if (!cloudSettings[SYNC_KEYS.UI_PREFERENCES]?.value) {
    const theme = localStorage.getItem('theme') || 'dark';
    const currency = localStorage.getItem('preferred_currency') || 'USD';
    const sidebarMode = localStorage.getItem('stock_sidebar_mode') || 'normal';
    const hideHeader = localStorage.getItem('stock_xchart_hide_header') === 'true';
    const enable4H = localStorage.getItem('stock_xchart_enable_4h_forex') !== 'false';

    const uiPrefs = {
      theme,
      preferred_currency: currency,
      stock_sidebar_mode: sidebarMode,
      stock_xchart_hide_header: hideHeader,
      stock_xchart_enable_4h_forex: enable4H,
    };
    pushSettingImmediate(SYNC_KEYS.UI_PREFERENCES, uiPrefs);
  }
}

let isInitialized = false;

export function initSettingsSync() {
  if (isInitialized) {
    pullAllSettings(true);
    return;
  }
  isInitialized = true;

  pullAllSettings(true);

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      pullAllSettings(false);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        pullAllSettings(false);
      }
    });
  }
}
