const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Store
  getStore: (key) => ipcRenderer.invoke('store-get', key),
  setStore: (key, value) => ipcRenderer.invoke('store-set', key, value),
  deleteStore: (key) => ipcRenderer.invoke('store-delete', key),

  // IPC
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  once: (channel, func) => {
    ipcRenderer.once(channel, (event, ...args) => func(...args));
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Window controls
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  hide: () => ipcRenderer.send('hide-window'),

  // Mining
  startMining: () => ipcRenderer.send('start-mining'),
  stopMining: () => ipcRenderer.send('stop-mining'),
  miningStatus: () => ipcRenderer.invoke('get-mining-status'),

  // Wallet
  newWallet: () => ipcRenderer.send('new-wallet'),
  importWallet: () => ipcRenderer.send('import-wallet'),
  exportWallet: () => ipcRenderer.invoke('export-wallet'),

  // Notifications
  notify: (title, body) => {
    new Notification(title, { body });
  }
});
