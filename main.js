const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const keytar = require('keytar');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('save-db', async (event, { name, scbPath, credsPath }) => {
  try {
    const creds = await fs.promises.readFile(credsPath, 'utf8');
    // Store credentials securely in the OS keychain
    await keytar.setPassword('astra-db-manager', name, creds);

    // TODO: copy the SCB file to app data directory if needed
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('test-connection', async (event, { scbPath, credsPath }) => {
  // TODO: implement real connectivity test using Astra DB SDK
  // Placeholder simulates success
  return { success: true };
});
