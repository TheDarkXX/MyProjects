// electron/preload.cjs
// Secure ContextBridge IPC Channel Layer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fastingAPI', {
  // Fasting Engine
  getFastingState: () => ipcRenderer.invoke('fasting:get-state'),
  startFasting: (sessionType, targetHours) => ipcRenderer.invoke('fasting:start', { sessionType, targetHours }),
  endFasting: () => ipcRenderer.invoke('fasting:end'),
  adjustTime: (deltaSeconds) => ipcRenderer.invoke('fasting:adjust-time', deltaSeconds),

  // Kitchen Timer Engine
  getKitchenState: () => ipcRenderer.invoke('kitchen:get-state'),
  startKitchenTimer: (name, durationSeconds) => ipcRenderer.invoke('kitchen:start', { name, durationSeconds }),
  pauseKitchenTimer: () => ipcRenderer.invoke('kitchen:pause'),
  resumeKitchenTimer: () => ipcRenderer.invoke('kitchen:resume'),
  stopKitchenTimer: () => ipcRenderer.invoke('kitchen:stop'),
  addKitchenSeconds: (extraSeconds) => ipcRenderer.invoke('kitchen:add-seconds', extraSeconds),

  // Window Controls
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  toggleFullDashboard: () => ipcRenderer.invoke('window:toggle-full-dashboard'),
  minimizeToTray: () => ipcRenderer.invoke('window:minimize-to-tray'),
  closeApp: () => ipcRenderer.invoke('window:close'),

  // Event Subscriptions
  onFastingTick: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('fasting:tick', handler);
    return () => ipcRenderer.removeListener('fasting:tick', handler);
  },
  onKitchenTick: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('kitchen:tick', handler);
    return () => ipcRenderer.removeListener('kitchen:tick', handler);
  },
  onKitchenCompleted: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('kitchen:completed', handler);
    return () => ipcRenderer.removeListener('kitchen:completed', handler);
  },
  onGlobalStateChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('app:state-changed', handler);
    return () => ipcRenderer.removeListener('app:state-changed', handler);
  }
});
