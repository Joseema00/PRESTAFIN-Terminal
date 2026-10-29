const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('prestafin', Object.freeze({
  loadWorkspace: () => ipcRenderer.invoke('workspace:load'),
  saveWorkspace: value => ipcRenderer.invoke('workspace:save',value),
  exportWorkspace: () => ipcRenderer.invoke('workspace:export'),
  importWorkspace: () => ipcRenderer.invoke('workspace:import'),
  marketBundle: value => ipcRenderer.invoke('market:bundle',value),
  marketSearch: query => ipcRenderer.invoke('market:search',query),
  fundHistory: value => ipcRenderer.invoke('market:fundHistory',value),
  appInfo: () => ipcRenderer.invoke('app:info'),
}));
