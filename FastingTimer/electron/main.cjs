// electron/main.cjs
// Core Process: Lifecycle, Dual-Window Manager, System Tray & IPC Router
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, powerMonitor, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const SimpleStore = require('./store.cjs');
const ToastNotifier = require('./toast-notifier.cjs');
const { StageDetector } = require('./stage-detector.cjs');
const KitchenTimer = require('./kitchen-timer.cjs');
const FastingEngine = require('./fasting-engine.cjs');

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (miniWindow) {
    if (miniWindow.isMinimized()) miniWindow.restore();
    miniWindow.show();
    miniWindow.focus();
    miniWindow.moveTop();
  }
  if (dashboardWindow) {
    dashboardWindow.show();
    dashboardWindow.focus();
  }
});

let miniWindow = null;
let dashboardWindow = null;
let tray = null;
let store = null;
let notifier = null;
let stageDetector = null;
let kitchenTimer = null;
let fastingEngine = null;

// Multi-Monitor Clamping Helper
function clampWindowPosition(x, y, width, height) {
  const displays = screen.getAllDisplays();
  const matchedDisplay = screen.getDisplayMatching({ x, y, width, height }) || screen.getPrimaryDisplay();
  const workArea = matchedDisplay.workArea;

  let clampedX = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - width));
  let clampedY = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - height));
  return { x: clampedX, y: clampedY };
}

// Map biological stages to real 3D Pixar PNG asset files
function getStageIconPath(stageKey) {
  const fileMap = {
    anabolic: '1-anabolic.png',
    fatburn: '2-fatburn.png',
    ketosis: '3-ketosis.png',
    autophagy: '4-autophagy.png',
    deepclean: '5-deepclean.png'
  };
  const filename = fileMap[stageKey] || '2-fatburn.png';
  return path.join(__dirname, '../src/assets/fasting', filename);
}

// Generate native 16x16 Tray Icon from real PNG asset
function createTrayIcon(stageKey = 'fatburn') {
  try {
    const iconPath = getStageIconPath(stageKey);
    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    }
  } catch (err) {
    console.error('[createTrayIcon Error]', err);
  }
  return nativeImage.createEmpty();
}

function createMiniWindow() {
  const primaryWorkArea = screen.getPrimaryDisplay().workArea;
  // Default to bottom-right corner of desktop
  const defaultX = primaryWorkArea.x + primaryWorkArea.width - 280;
  const defaultY = primaryWorkArea.y + primaryWorkArea.height - 320;

  // Prefer bottom-right if saved position was old centered default
  let savedPos = store.get('windowPosition', null);
  if (!savedPos || (savedPos.x < 1700 && savedPos.y < 500)) {
    savedPos = { x: defaultX, y: defaultY };
    store.set('windowPosition', savedPos);
  }

  const clamped = clampWindowPosition(savedPos.x, savedPos.y, 260, 290);

  miniWindow = new BrowserWindow({
    title: 'Fasting Sentinel',
    icon: createTrayIcon('fatburn'),
    width: 260,
    height: 290,
    x: clamped.x,
    y: clamped.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: false,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  miniWindow.setAlwaysOnTop(true, 'screen-saver');
  miniWindow.setVisibleOnAllWorkspaces(true);

  miniWindow.loadFile(path.join(__dirname, '../src/mini-widget.html'));

  miniWindow.once('ready-to-show', () => {
    if (miniWindow) {
      miniWindow.show();
      miniWindow.focus();
      miniWindow.moveTop();
    }
  });

  miniWindow.webContents.on('did-finish-load', () => {
    if (miniWindow) {
      miniWindow.show();
      miniWindow.focus();
      miniWindow.moveTop();
    }
  });

  miniWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('[MiniWindow Fail Load]', code, desc);
  });

  miniWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[MiniWindow Renderer] ${message}`);
  });

  // Save position on move
  miniWindow.on('moved', () => {
    if (!miniWindow) return;
    const [x, y] = miniWindow.getPosition();
    store.set('windowPosition', { x, y });
  });

  miniWindow.on('closed', () => {
    miniWindow = null;
  });
}

function createDashboardWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;

  dashboardWindow = new BrowserWindow({
    width: 440,
    height: 780,
    x: workArea.x + Math.round((workArea.width - 440) / 2),
    y: workArea.y + Math.round((workArea.height - 780) / 2),
    frame: false,
    show: false,
    backgroundColor: '#060a13',
    resizable: true,
    minWidth: 380,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  dashboardWindow.loadFile(path.join(__dirname, '../src/full-dashboard.html'));

  dashboardWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      dashboardWindow.hide();
    }
  });
}

function updateTray() {
  if (!tray) return;

  const fState = fastingEngine.getState();
  const kState = kitchenTimer.getState();

  let tooltip = '⏱️ Fasting Sentinel';
  let stageKey = (fState && fState.stage) ? fState.stage.key : 'fatburn';

  if (kState.isRunning) {
    const mins = Math.floor(kState.remainingSeconds / 60);
    const secs = kState.remainingSeconds % 60;
    tooltip = `🍳 ${kState.name}: ${mins}m ${secs}s`;
    stageKey = 'anabolic'; // Cool timer icon
  } else if (fState.activeSession) {
    const hrs = Math.floor(fState.elapsedSeconds / 3600);
    const mins = Math.floor((fState.elapsedSeconds % 3600) / 60);
    tooltip = `🔥 ${hrs}h ${mins}m (${fState.stage.name})`;
  }

  tray.setToolTip(tooltip);
  tray.setImage(createTrayIcon(stageKey));

  const contextMenu = Menu.buildFromTemplate([
    { label: tooltip, enabled: false },
    { type: 'separator' },
    {
      label: '🔮 แสดง/ซ่อน Floating Mini HUD',
      click: () => {
        if (miniWindow) {
          miniWindow.isVisible() ? miniWindow.hide() : miniWindow.show();
        } else {
          createMiniWindow();
        }
      }
    },
    {
      label: '📊 เปิด Full Dashboard',
      click: () => {
        if (dashboardWindow) {
          dashboardWindow.show();
          dashboardWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: '🥚 ต้มไข่ยางมะตูม (6 นาที)',
      click: () => kitchenTimer.start('ไข่ยางมะตูม', 6 * 60)
    },
    {
      label: '🥚 ต้มไข่ตานี (8 นาที)',
      click: () => kitchenTimer.start('ไข่ตานี', 8 * 60)
    },
    {
      label: '🍅 Focus Pomodoro (25 นาที)',
      click: () => kitchenTimer.start('Pomodoro', 25 * 60)
    },
    { type: 'separator' },
    {
      label: fState.activeSession ? '🍽️ จบ Fasting (เริ่มกินอาหาร)' : '🔥 เริ่ม Fasting (16:8)',
      click: () => {
        if (fState.activeSession) {
          fastingEngine.endSession();
        } else {
          fastingEngine.startSession('fasting', 16.0);
        }
      }
    },
    { type: 'separator' },
    {
      label: '❌ ออกจากโปรแกรม',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function setupTray() {
  tray = new Tray(createTrayIcon('fatburn'));
  updateTray();

  tray.on('click', () => {
    if (!miniWindow) {
      createMiniWindow();
      return;
    }
    if (miniWindow.isVisible()) {
      miniWindow.focus();
      miniWindow.moveTop();
    } else {
      miniWindow.show();
      miniWindow.focus();
      miniWindow.moveTop();
    }
  });

  tray.on('double-click', () => {
    if (dashboardWindow) {
      dashboardWindow.isVisible() ? dashboardWindow.hide() : dashboardWindow.show();
    }
  });
}

function broadcastEvent(channel, data) {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send(channel, data);
  }
  if (dashboardWindow && !dashboardWindow.isDestroyed() && dashboardWindow.isVisible()) {
    dashboardWindow.webContents.send(channel, data);
  }
}

app.whenReady().then(() => {
  store = new SimpleStore();
  notifier = new ToastNotifier({ appId: 'com.doctorbank.fasting' });
  stageDetector = new StageDetector(notifier);
  kitchenTimer = new KitchenTimer(notifier);
  fastingEngine = new FastingEngine(store, stageDetector);

  createMiniWindow();
  createDashboardWindow();
  setupTray();

  // Show dashboard prominently on initial start
  if (dashboardWindow) {
    dashboardWindow.show();
    dashboardWindow.focus();
  }

  // Start Fasting Engine
  fastingEngine.start();

  // Engine Event Listeners
  fastingEngine.on('tick', (state) => {
    broadcastEvent('fasting:tick', state);
    updateTray();
  });

  fastingEngine.on('state-changed', (state) => {
    broadcastEvent('app:state-changed', { type: 'fasting', state });
    updateTray();
  });

  kitchenTimer.on('tick', (state) => {
    broadcastEvent('kitchen:tick', state);
    updateTray();
  });

  kitchenTimer.on('completed', (state) => {
    broadcastEvent('kitchen:completed', state);
    updateTray();
  });

  kitchenTimer.on('state-changed', (state) => {
    broadcastEvent('app:state-changed', { type: 'kitchen', state });
    updateTray();
  });

  // PowerMonitor sleep/wake hooks
  powerMonitor.on('resume', () => {
    kitchenTimer.reconcileAfterResume();
    fastingEngine.syncWithVps();
  });

  // ─── IPC Handlers ───
  ipcMain.handle('fasting:get-state', () => fastingEngine.getState());
  ipcMain.handle('fasting:start', (e, { sessionType, targetHours }) => fastingEngine.startSession(sessionType, targetHours));
  ipcMain.handle('fasting:end', () => fastingEngine.endSession());
  ipcMain.handle('fasting:adjust-time', (e, deltaSeconds) => fastingEngine.adjustTime(deltaSeconds));

  ipcMain.handle('kitchen:get-state', () => kitchenTimer.getState());
  ipcMain.handle('kitchen:start', (e, { name, durationSeconds }) => kitchenTimer.start(name, durationSeconds));
  ipcMain.handle('kitchen:pause', () => kitchenTimer.pause());
  ipcMain.handle('kitchen:resume', () => kitchenTimer.resume());
  ipcMain.handle('kitchen:stop', () => kitchenTimer.stop());
  ipcMain.handle('kitchen:add-seconds', (e, secs) => kitchenTimer.addSeconds(secs));

  ipcMain.handle('window:toggle-always-on-top', () => {
    if (!miniWindow) return true;
    const current = miniWindow.isAlwaysOnTop();
    const next = !current;
    miniWindow.setAlwaysOnTop(next);
    store.set('alwaysOnTop', next);
    return next;
  });

  ipcMain.handle('window:toggle-full-dashboard', () => {
    if (!dashboardWindow) createDashboardWindow();
    if (dashboardWindow.isVisible()) {
      dashboardWindow.hide();
    } else {
      dashboardWindow.show();
      dashboardWindow.focus();
    }
  });

  ipcMain.handle('window:minimize-to-tray', () => {
    if (miniWindow) miniWindow.hide();
  });

  ipcMain.handle('window:close', () => {
    if (miniWindow) miniWindow.hide();
  });
});

app.on('window-all-closed', () => {
  // Keep running in tray on Windows
});
