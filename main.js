const { app, BrowserWindow, ipcMain, Menu, Tray, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

// Config store
const store = new Store({
  defaults: {
    rpcUrl: 'http://129.151.164.202:8545',
    chainId: 12345,
    wallet: null,
    mining: false,
    threads: 2
  }
});

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'build', 'icon.png'),
    titleBarStyle: 'default',
    frame: true,
    show: false
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (store.get('mining')) {
      const choice = require('electron').dialog.showMessageBoxSync({
        type: 'question',
        buttons: ['Stop Mining & Exit', 'Minimize to Tray', 'Cancel'],
        defaultId: 2,
        message: 'Mining is still running!',
        detail: 'Do you want to stop mining and exit, or minimize to tray?'
      });
      
      if (choice === 0) {
        mainWindow.webContents.send('stop-mining');
        app.quit();
      } else if (choice === 1) {
        event.preventDefault();
        mainWindow.hide();
        createTray();
      }
    }
  });

  // Dev tools
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Menu
  const menu = Menu.buildFromTemplate(getMenuTemplate());
  Menu.setApplicationMenu(menu);

  return mainWindow;
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'build', 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Wallet', click: () => { mainWindow.show(); tray.destroy(); } },
    { label: 'Stop Mining', click: () => { mainWindow.webContents.send('stop-mining'); } },
    { label: 'Quit', click: () => { app.quit(); } }
  ]);
  tray.setToolTip('TKM Wallet');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow.show();
    tray.destroy();
  });
}

function getMenuTemplate() {
  return [
    {
      label: 'File',
      submenu: [
        { label: 'New Wallet', click: () => { mainWindow.webContents.send('new-wallet'); } },
        { label: 'Import Wallet', click: () => { mainWindow.webContents.send('import-wallet'); } },
        { type: 'separator' },
        { label: 'Exit', click: () => { app.quit(); } }
      ]
    },
    {
      label: 'Network',
      submenu: [
        { 
          label: 'RPC Settings', 
          click: () => { mainWindow.webContents.send('rpc-settings'); }
        },
        { type: 'separator' },
        { label: 'Refresh Blockchain', click: () => { mainWindow.webContents.send('refresh-chain'); } }
      ]
    },
    {
      label: 'Mining',
      submenu: [
        { 
          label: 'Start Mining', 
          click: () => { mainWindow.webContents.send('start-mining'); }
        },
        { 
          label: 'Stop Mining', 
          click: () => { mainWindow.webContents.send('stop-mining'); }
        },
        { type: 'separator' },
        {
          label: 'Mining Settings',
          click: () => { mainWindow.webContents.send('mining-settings'); }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'TKM Chain Docs', click: () => { shell.openExternal('https://docs.tkmchain.io'); } },
        { label: 'GitHub', click: () => { shell.openExternal('https://github.com/tkmchain'); } },
        { type: 'separator' },
        { label: 'About TKM Wallet', click: () => { mainWindow.webContents.send('about'); } }
      ]
    }
  ];
}

// IPC handlers
ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('store-delete', (event, key) => {
  store.delete(key);
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Auto-updater
if (process.env.NODE_ENV === 'production') {
  autoUpdater.checkForUpdatesAndNotify();
}
