const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveDatabase: (name, scbPath, credsPath) =>
    ipcRenderer.invoke('save-db', { name, scbPath, credsPath }),
  testConnection: (scbPath, credsPath) =>
    ipcRenderer.invoke('test-connection', { scbPath, credsPath }),
  listScbEntries: (scbPath) =>
    ipcRenderer.invoke('scb-entries', scbPath),
  listScbEntriesFromData: (arrayBuffer) =>
    ipcRenderer.invoke('scb-entries-data', arrayBuffer),
  getScbConfig: (scbPath) =>
    ipcRenderer.invoke('scb-config', scbPath),
  getScbConfigFromData: (arrayBuffer) =>
    ipcRenderer.invoke('scb-config-data', arrayBuffer),
  getDatabases: () => ipcRenderer.invoke('get-databases')
  ,
  deleteDatabase: (slug) => ipcRenderer.invoke('delete-db', { slug })
  ,
  dbSchema: (slug) => ipcRenderer.invoke('db-schema', { slug }),
  describeTable: (slug, table) => ipcRenderer.invoke('describe-table', { slug, table }),
  describeType: (slug, type) => ipcRenderer.invoke('describe-type', { slug, type })
});
