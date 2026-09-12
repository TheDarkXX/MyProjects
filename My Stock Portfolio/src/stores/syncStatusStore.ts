import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';
export type SyncOperation = 'idle' | 'push' | 'pull';

interface SyncStatusState {
  status: SyncStatus;
  operation: SyncOperation;
  lastSyncedAt: Date | null;
  lastError: string | null;
  pendingPushes: number;
  
  // Actions
  setSyncing: (op: SyncOperation) => void;
  setSynced: () => void;
  setError: (err: string) => void;
  setPendingPushes: (count: number) => void;
}

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  status: 'idle',
  operation: 'idle',
  lastSyncedAt: null,
  lastError: null,
  pendingPushes: 0,

  setSyncing: (op: SyncOperation) =>
    set({ status: 'syncing', operation: op, lastError: null }),

  setSynced: () =>
    set({
      status: 'synced',
      operation: 'idle',
      lastSyncedAt: new Date(),
      lastError: null,
    }),

  setError: (err: string) =>
    set({
      status: 'error',
      operation: 'idle',
      lastError: err,
    }),

  setPendingPushes: (count: number) =>
    set({ pendingPushes: Math.max(0, count) }),
}));
