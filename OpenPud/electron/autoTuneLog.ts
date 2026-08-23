import Store from 'electron-store';

export interface AutoTuneLogEntry {
  id: string;
  timestamp: number;
  trigger: 'auto' | 'manual';
  entriesAnalyzed: number;
  correctionsAdded: number;
  wordsAdded: number;
  corrections: { from: string; to: string }[];
  words: string[];
  error?: string;
}

interface AutoTuneLogSchema {
  logs: AutoTuneLogEntry[];
}

const logStore = new Store<AutoTuneLogSchema>({
  name: 'auto-tune-log',
  defaults: { logs: [] },
});

const MAX_LOGS = 100;

export function addAutoTuneLog(entry: Omit<AutoTuneLogEntry, 'id' | 'timestamp'>): AutoTuneLogEntry {
  const log: AutoTuneLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    ...entry,
  };
  const logs = [log, ...logStore.get('logs')].slice(0, MAX_LOGS);
  logStore.set('logs', logs);
  return log;
}

export function listAutoTuneLogs(): AutoTuneLogEntry[] {
  return logStore.get('logs');
}

export function clearAutoTuneLogs(): void {
  logStore.set('logs', []);
}
