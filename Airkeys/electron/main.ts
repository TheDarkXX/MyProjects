import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, Notification, screen, Tray } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSettings, setSettings, type AppSettings } from './config';
import { transcribeAudio, TranscriptionError } from './transcribe';
import { pasteAtCursor } from './pasteText';
import { addHistoryEntry, listHistory, clearHistory, historyStats, deleteHistoryEntry, cleanupOldHistory } from './history';
import {
  listDictionaryWords,
  setDictionaryWords,
  dictionaryPrompt,
  listCorrections,
  setCorrections,
  applyCorrections,
  type CorrectionRule,
} from './dictionary';
import { LlmError } from './llm';
import { maybeAutoTune, runAutoTune } from './autoTune';
import { listAutoTuneLogs, clearAutoTuneLogs } from './autoTuneLog';
import { polishText } from './polish';
import { stripFillers } from './stripFillers';
import { translateText } from './translate';
import { getActiveAppCategory } from './activeWindow';

type RecordingMode = 'dictate' | 'translate';

// Force software rendering to avoid GPU cache / GPU process crashes on this system
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

console.log('=== AirKeys main process starting ===');
console.log('PID:', process.pid);
console.log('VITE_DEV_SERVER_URL:', process.env.VITE_DEV_SERVER_URL);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

const WIDGET_WIDTH = 320;
const WIDGET_HEIGHT = 90;

let widget: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function widgetBounds() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return {
    x: Math.round((width - WIDGET_WIDTH) / 2),
    y: height - WIDGET_HEIGHT - 16,
  };
}

function createWidget() {
  const { x, y } = widgetBounds();
  widget = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  widget.setAlwaysOnTop(true, 'screen-saver');
  widget.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  widget.setIgnoreMouseEvents(true);

  if (VITE_DEV_SERVER_URL) {
    widget.loadURL(VITE_DEV_SERVER_URL);
  } else {
    widget.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  screen.on('display-metrics-changed', () => {
    if (!widget) return;
    const { x: nx, y: ny } = widgetBounds();
    widget.setPosition(nx, ny);
  });
}

function createMainWindow(route: string) {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send('nav:goto', route);
    return;
  }
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 760,
    minHeight: 520,
    title: 'AirKeys',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const url = VITE_DEV_SERVER_URL
    ? `${VITE_DEV_SERVER_URL}#${route}`
    : `file://${path.join(__dirname, '../dist/index.html')}#${route}`;
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });


  // When closing (clicking X), hide the window instead of destroying it if closeToTray is true
  mainWindow.on('close', (e) => {
    if (isQuitting) return; // app is shutting down, let the window close
    if (getSettings().closeToTray) {
      e.preventDefault();
      mainWindow?.hide();
    } else {
      // If they don't want to close to tray, quit the entire app when the main window is closed
      isQuitting = true;
      app.quit();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAI4SURBVFhH7VevT8NAFJ5EInElLSRIJJI/AbXghth1BIXEDbMg+RMmJpBIMj2Bn5lcMrMR2C5ZljRZlhz3eo+t7/raXvfD8SWfaPvuvrv3666Vf2wLeV6/lEHjek39jJ8Og6FXO5J+/U4G4ZtmpKk4znzxPvXr99KrHePQ3RFPGIgxJ5jFWRBK6YePsHCcpjxgF3qST07AnWIgvcYpTukOGDQLxJCftBxjb+g8wamLATvfl/gfYRHfXniBEtkwybar23nGmypKTkgcbvC+qBfxilJpxLsvme1bMPryHk5QksKUGzuI5aKnCFadFmuXpnhBSQrpiw9+AMe2WqLwBn21YG1tigFKbhDXfE6HsznvTFCUYtnk7W2mKuLnrH7FGfJsqWiEimqilr3EYnptxp7lDUobwAvLIJvVrlqhnhp11Tz57BoGXW0obVAmAZPuN4mX9IhrGMQzShtMfXHLG9rkxUhFOIRh5odPKG1gznXemDDL3c0+vgMUhwE2jNIG0Bw4Q5sk+8lOaVkWhQGSHqU3KD4DqPtzkRsGMUZJCkgMfgCSuLkI2WHQJ2MbJSkwDJnNyG69RcgMQ979EU4rdpAVY77vWyGCHmHZwJ0RpXgYLzAnInH/REVV6zuStuiUXeR0KcG2TEJB3M/sbE1SptRTqdLLAzYm58OpmFbncwE0J3Oh5CZ0ZlRq5zawMuBnhJs8l5BwTjF3AZQO1C+boAmix/SCS1zDyyJO0vjyCo0LGT8fUPQwqFR+AamN007Bw7giAAAAAElFTkSuQmCC',
  );
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('AirKeys');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'เปิดแอป', click: () => createMainWindow('/') },
      { label: 'ตั้งค่า', click: () => createMainWindow('/settings') },
      { type: 'separator' },
      { label: 'ออกจากโปรแกรม', click: () => {
          isQuitting = true;
          app.quit();
        } 
      },
    ]),
  );
  tray.on('click', () => createMainWindow('/'));
}

function applyLaunchAtStartup(enabled: boolean) {
  if (!app.isPackaged) return; // login item registration is unreliable for `electron .` dev launches
  app.setLoginItemSettings({ openAtLogin: enabled });
}

function registerHotkeys(settings: AppSettings) {
  globalShortcut.unregisterAll();
  const bindings: [string, RecordingMode][] = [
    [settings.hotkey, 'dictate'],
    [settings.translateHotkey, 'translate'],
  ];
  for (const [accelerator, mode] of bindings) {
    if (!accelerator) continue;
    const ok = globalShortcut.register(accelerator, () => {
      widget?.webContents.send('hotkey:toggle-recording', mode);
    });
    if (!ok) {
      console.error(`Failed to register hotkey (${mode}): ${accelerator}`);
    }
  }
}

app.whenReady().then(() => {
  createWidget();
  createTray();

  const settings = getSettings();
  cleanupOldHistory(settings.historyKeepDays ?? 5);

  registerHotkeys(getSettings());
  applyLaunchAtStartup(getSettings().launchAtStartup);

  // Always open main window so it shows on the taskbar by default
  const initialRoute = getSettings().onboardingCompleted ? '/' : '/onboarding';
  console.log(`[DEBUG] Creating main window with route: ${initialRoute}`);
  createMainWindow(initialRoute);
  console.log('[DEBUG] Main window created.');

  ipcMain.handle('settings:get', () => getSettings());

  ipcMain.handle('settings:set', (_e, partial: Partial<AppSettings>) => {
    const updated = setSettings(partial);
    if (partial.hotkey || partial.translateHotkey) registerHotkeys(updated);
    if (partial.launchAtStartup !== undefined) applyLaunchAtStartup(partial.launchAtStartup);
    return updated;
  });

  ipcMain.handle('app:open-main-window', (_e, route: string) => createMainWindow(route || '/'));

  ipcMain.handle(
    'transcription:run',
    async (
      _e,
      payload: { buffer: ArrayBuffer; mimeType: string; durationMs: number; mode?: RecordingMode },
    ) => {
      const settings = getSettings();
      const mode = payload.mode ?? 'dictate';
      try {
        const bias = dictionaryPrompt();
        let text = await transcribeAudio(Buffer.from(payload.buffer), payload.mimeType, settings, bias);

        // Cheap local pass before any LLM step — strips "อืมม" / "เอ่ออ" / "um"
        // without an API round-trip. Runs for both dictate and translate.
        if (settings.stripFillersEnabled) {
          text = stripFillers(text);
        }

        if (mode === 'translate') {
          // Corrections on the transcript before translate so wrong-script
          // substitutions don't get translated as-is.
          text = applyCorrections(text);
          text = await translateText(text, settings);
        } else {
          if (settings.aiPolishEnabled) {
            const category = await getActiveAppCategory();
            text = await polishText(text, settings, category);
          }
          // After polish: AI cleanup used to run after corrections and could
          // undo exact replacements the user configured (e.g. "บอก" → "or").
          text = applyCorrections(text);
        }

        await pasteAtCursor(text);
        addHistoryEntry(text, payload.durationMs);
        mainWindow?.webContents.send('history:updated');
        // Fire-and-forget: check if auto-tune threshold reached
        maybeAutoTune();
        return { ok: true as const, text };
      } catch (err) {
        const message =
          err instanceof TranscriptionError || err instanceof LlmError ? err.message : String(err);
        if (Notification.isSupported()) {
          new Notification({ title: 'ทำงานไม่สำเร็จ', body: message }).show();
        }
        return { ok: false as const, error: message };
      }
    },
  );

  ipcMain.handle('history:list', () => listHistory());
  ipcMain.handle('history:stats', () => historyStats());
  ipcMain.handle('history:clear', () => {
    clearHistory();
    mainWindow?.webContents.send('history:updated');
    return [];
  });
  ipcMain.handle('history:delete', (_e, id: string) => {
    deleteHistoryEntry(id);
    mainWindow?.webContents.send('history:updated');
    return true;
  });

  ipcMain.handle('dictionary:list', () => listDictionaryWords());
  ipcMain.handle('dictionary:set', (_e, words: string[]) => setDictionaryWords(words));
  ipcMain.handle('corrections:list', () => listCorrections());
  ipcMain.handle('corrections:set', (_e, rules: CorrectionRule[]) => setCorrections(rules));
  ipcMain.handle('auto-tune:run', async () => {
    const result = await runAutoTune('manual');
    return result;
  });
  ipcMain.handle('auto-tune:logs', () => listAutoTuneLogs());
  ipcMain.handle('auto-tune:clear-logs', () => {
    clearAutoTuneLogs();
    return [];
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWidget();
  });
});

app.on('window-all-closed', () => {
  // Widget + tray keep the app running in the background; only quit explicitly via tray menu.
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (tray) tray.destroy();
});
