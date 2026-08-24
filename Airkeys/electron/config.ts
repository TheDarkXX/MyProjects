import Store from 'electron-store';
import { safeStorage } from 'electron';

export interface AppSettings {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  hotkey: string;
  language: string;
  micDeviceId: string;
  launchAtStartup: boolean;
  playSound: boolean;
  maxDurationSec: number;
  onboardingCompleted: boolean;
  stripFillersEnabled: boolean;
  aiPolishEnabled: boolean;
  customSystemPrompt: string;
  chatModel: string;
  translateHotkey: string;
  translateTargetLang: string;
  closeToTray: boolean;
  autoTuneThreshold: number;
  autoTuneModel: string;
  historyKeepDays: number;
}

// On disk, apiKey is kept as a base64-encoded blob encrypted via Electron's
// safeStorage (DPAPI on Windows) instead of plaintext — everywhere else in
// the app still deals with the plain AppSettings shape.
type StoredSettings = Omit<AppSettings, 'apiKey'> & { apiKeyEncrypted: string };

type ProviderKey = 'openai' | 'openrouter' | 'gemini' | 'groq' | 'custom';

export const PROVIDER_PRESETS: Record<
  Exclude<ProviderKey, 'custom'>,
  { baseUrl: string; chatModel: string; autoTuneModel: string }
> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    chatModel: 'gpt-4o-mini',
    autoTuneModel: 'gpt-4o',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    chatModel: 'google/gemini-2.5-flash',
    autoTuneModel: 'google/gemini-2.5-pro',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    chatModel: 'gemini-2.5-flash',
    autoTuneModel: 'gemini-2.5-pro',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    chatModel: 'openai/gpt-oss-120b',
    autoTuneModel: 'qwen/qwen3.6-27b',
  },
};

const defaults: StoredSettings = {
  apiKeyEncrypted: '',
  apiBaseUrl: 'https://openrouter.ai/api/v1',
  model: 'openai/whisper-large-v3-turbo',
  hotkey: 'Control+Space',
  language: '',
  micDeviceId: '',
  launchAtStartup: false,
  playSound: true,
  maxDurationSec: 120,
  onboardingCompleted: false,
  stripFillersEnabled: true,
  aiPolishEnabled: false,
  customSystemPrompt: '',
  chatModel: 'google/gemini-2.5-flash',
  autoTuneModel: 'google/gemini-2.5-pro',
  translateHotkey: 'Control+Alt+T',
  translateTargetLang: 'en',
  closeToTray: true,
  autoTuneThreshold: 10,
  historyKeepDays: 5,
};

const rawStore = new Store<StoredSettings>({ defaults });

function encryptApiKey(apiKey: string): string {
  if (!apiKey) return '';
  if (!safeStorage.isEncryptionAvailable()) return apiKey;
  return safeStorage.encryptString(apiKey).toString('base64');
}

function decryptApiKey(stored: string): string {
  if (!stored) return '';
  if (!safeStorage.isEncryptionAvailable()) return stored;
  try {
    return safeStorage.decryptString(Buffer.from(stored, 'base64'));
  } catch {
    // Blob is corrupted or from another machine/OS user — treat as unset
    // rather than crash the app.
    return '';
  }
}

// Migrate installs that still have a plaintext `apiKey` field from before
// encryption was added.
const legacyApiKey = (rawStore.store as unknown as { apiKey?: string }).apiKey;
if (legacyApiKey && !rawStore.get('apiKeyEncrypted')) {
  rawStore.set('apiKeyEncrypted', encryptApiKey(legacyApiKey));
  (rawStore as unknown as { delete(key: string): void }).delete('apiKey');
}

export function getSettings(): AppSettings {
  const { apiKeyEncrypted, ...rest } = rawStore.store;
  return { ...rest, apiKey: decryptApiKey(apiKeyEncrypted) };
}

export function setSettings(partial: Partial<AppSettings>): AppSettings {
  const { apiKey, ...rest } = partial;
  for (const [key, value] of Object.entries(rest)) {
    rawStore.set(key as keyof Omit<StoredSettings, 'apiKeyEncrypted'>, value as never);
  }
  if (apiKey !== undefined) {
    rawStore.set('apiKeyEncrypted', encryptApiKey(apiKey));
  }
  return getSettings();
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return getSettings()[key];
}
