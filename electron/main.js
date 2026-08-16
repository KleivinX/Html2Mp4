import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { ElectronRenderer } from './electron-renderer.js';

// Deterministic, headless-friendly offscreen rendering.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '38470';
process.env.PORT = PORT;

// Render with Electron's own Chromium — no extra browser is bundled.
globalThis.__h2m_createRenderer = (opts) => new ElectronRenderer(opts);

let mainWindow;

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      http.get(url, (res) => { res.destroy(); resolve(); })
        .on('error', () => {
          if (Date.now() - start > timeoutMs) reject(new Error('Server did not start in time'));
          else setTimeout(tryOnce, 250);
        });
    };
    tryOnce();
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 1120,
    minWidth: 760,
    minHeight: 680,
    backgroundColor: '#0B0A08',
    title: 'html2mp4',
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  // Open external links in the user's browser, never inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Start the embedded Express server (dynamic import so env vars above apply first).
  await import('../src/server.js');
  await waitForServer(`http://localhost:${PORT}/api/presets`);

  await mainWindow.loadURL(`http://localhost:${PORT}`);
  mainWindow.show();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
