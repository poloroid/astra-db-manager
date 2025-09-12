const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveDatabase: (name, scbPath, credsPath) =>
    ipcRenderer.invoke('save-db', { name, scbPath, credsPath }),
  testConnection: (scbPath, credsPath) =>
    ipcRenderer.invoke('test-connection', { scbPath, credsPath })
});
