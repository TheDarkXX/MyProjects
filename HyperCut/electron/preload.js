const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  transcribe: (videoPath) => ipcRenderer.invoke('transcribe-video', videoPath),
  onTranscribeProgress: (callback) => ipcRenderer.on('transcribe-progress', (_event, value) => callback(value)),
  
  cutSilence: (params) => ipcRenderer.invoke('cut-silence', params),
  onCutSilenceProgress: (callback) => ipcRenderer.on('cut-silence-progress', (_event, value) => callback(value)),

  scanSilence: (params) => ipcRenderer.invoke('scan-silence', params),
  onScanSilenceProgress: (callback) => ipcRenderer.on('scan-silence-progress', (_event, value) => callback(value)),
  getAudioPeaks: (videoPath) => ipcRenderer.invoke('get-audio-peaks', videoPath),

  renderVideo: (renderData) => ipcRenderer.invoke('render-video', renderData),
  onRenderProgress: (callback) => ipcRenderer.on('render-progress', (_event, value) => callback(value)),

  // File dialog: opens native OS file picker
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
});
