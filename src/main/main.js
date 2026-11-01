'use strict';

const path = require('node:path');
const {
  app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, powerMonitor,
  powerSaveBlocker, screen, shell, systemPreferences, Tray,
} = require('electron');
const { TimerEngine } = require('./timer');
const { Store } = require('./store');
const { createAutostart } = require('./autostart');
const { createTracking } = require('./tracking');
const { createOverlay } = require('./overlay');
const { THEME_IDS } = require('../shared/themes');

const ASSETS = path.join(__dirname, '../../assets');
const WINDOW_SIZE = { width: 420, height: 610 };
const QUICK_STARTS = [5, 25, 45];
const MINUTE = 60 * 1000;

let mainWindow = null;
let tray = null;
let isQuitting = false;
let blockerId = null;

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
  app.whenReady().then(bootstrap);
}

// Pencere kapansa da uygulama tepside çalışmaya devam eder.
app.on('window-all-closed', () => {});
app.on('before-quit', () => { isQuitting = true; });
app.on('activate', () => showWindow());

let engine;
let store;
let autostart;
let tracking;
let overlay;

function bootstrap() {
  app.setAppUserModelId('com.pixeltimer.app');
  if (process.platform === 'darwin') app.dock?.hide();

  store = new Store(path.join(app.getPath('userData'), 'settings.json'));
  engine = new TimerEngine();
  autostart = createAutostart(app);
  tracking = createTracking({ store, systemPreferences, shell });
  overlay = createOverlay();

  registerIpc();
  createTray();
  createWindow();

  engine.on('change', onTimerChange);
  engine.on('finished', onTimerFinished);
  engine.restore(store.get('timer'));
  tracking.sync();

  powerMonitor.on('resume', () => engine.tick());
  powerMonitor.on('unlock-screen', () => engine.tick());

  // Açılışta otomatik başlatıldıysa sessiz kal; onboarding bitmemişse her durumda göster.
  if (!store.get('onboardingDone') || !autostart.launchedAtLogin()) showWindow();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    ...WINDOW_SIZE,
    useContentSize: true,
    show: false,
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // Pencere gizliyken de bitiş sesi çalabilsin.
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
  });
}

function positionWindow() {
  const anchor = tray?.getBounds();
  const hasAnchor = anchor && anchor.width > 0;
  const point = hasAnchor ? { x: anchor.x, y: anchor.y } : screen.getCursorScreenPoint();
  const { workArea } = screen.getDisplayNearestPoint(point);
  const { width, height } = mainWindow.getBounds();
  let x = workArea.x + Math.round((workArea.width - width) / 2);
  let y = workArea.y + Math.round((workArea.height - height) / 2);
  if (hasAnchor) {
    x = Math.round(anchor.x + anchor.width / 2 - width / 2);
    // Tepsi ekranın üstündeyse (macOS) altına, altındaysa (Windows) üstüne aç.
    y = anchor.y < workArea.y + workArea.height / 2 ? workArea.y + 8 : workArea.y + workArea.height - height - 8;
  }
  x = Math.min(Math.max(x, workArea.x + 8), workArea.x + workArea.width - width - 8);
  y = Math.min(Math.max(y, workArea.y), workArea.y + workArea.height - height);
  mainWindow.setPosition(x, y);
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!mainWindow.isVisible()) positionWindow();
  mainWindow.show();
  mainWindow.focus();
  app.focus({ steal: true });
  mainWindow.webContents.send('window:shown');
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(ASSETS, 'trayTemplate.png'));
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('Pixel Timer');
  tray.on('click', () => {
    if (mainWindow.isVisible() && mainWindow.isFocused()) mainWindow.hide();
    else showWindow();
  });
  tray.on('right-click', () => tray.popUpContextMenu(buildTrayMenu()));
  updateTray(engine.getState());
}

function buildTrayMenu() {
  const state = engine.getState();
  const active = state.status === 'running' || state.status === 'paused';
  const items = [{ label: 'Pixel Timer’ı aç', click: showWindow }, { type: 'separator' }];
  if (active) {
    items.push({ label: `Kalan: ${formatTime(state.remainingMs)}`, enabled: false });
    items.push(state.status === 'running'
      ? { label: 'Duraklat', click: () => engine.pause() }
      : { label: 'Devam et', click: () => engine.resume() });
    items.push({ label: '+5 dakika', click: () => engine.add(5 * MINUTE) });
    items.push({ label: 'Durdur', click: () => engine.stop() });
  } else {
    for (const min of QUICK_STARTS) {
      items.push({ label: `${min} dakika başlat`, click: () => engine.start(min * MINUTE) });
    }
  }
  items.push({ type: 'separator' }, { label: 'Çıkış', click: () => app.quit() });
  return Menu.buildFromTemplate(items);
}

function updateTray(state) {
  if (!tray) return;
  const active = state.status === 'running' || state.status === 'paused';
  const text = active ? formatTime(state.remainingMs) : '';
  if (process.platform === 'darwin') {
    tray.setTitle(state.status === 'paused' ? `⏸ ${text}` : text, { fontType: 'monospacedDigit' });
  }
  tray.setToolTip(active ? `Pixel Timer: ${text}` : 'Pixel Timer');
}

function onTimerChange(state) {
  // Her saniye değil, yalnızca kayıt gerçekten değiştiğinde diske yazar.
  const snapshot = engine.snapshot();
  if (JSON.stringify(snapshot) !== JSON.stringify(store.get('timer'))) store.set({ timer: snapshot });
  updateTray(state);
  // App Nap sayacı geciktirmesin diye yalnızca çalışırken askıya almayı engeller.
  if (state.status === 'running' && blockerId === null) {
    blockerId = powerSaveBlocker.start('prevent-app-suspension');
  } else if (state.status !== 'running' && blockerId !== null) {
    powerSaveBlocker.stop(blockerId);
    blockerId = null;
  }
  mainWindow?.webContents.send('timer:changed', state);
}

function onTimerFinished({ missed, label }) {
  mainWindow?.webContents.send('timer:finished', { missed });
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: missed ? 'Sen yokken süre doldu' : 'Süre doldu!',
      body: missed ? 'Bilgisayar kapalıyken sayaç tamamlandı.' : `${label || 'Çalışma'} seansın tamamlandı. Eline sağlık!`,
      silent: true,
    });
    notification.on('click', showWindow);
    notification.show();
  }
  if (!missed && store.get('mascotEnabled')) overlay.play(store.get('themeId'));
}

const SETTING_VALIDATORS = {
  onboardingDone: (v) => typeof v === 'boolean',
  themeId: (v) => THEME_IDS.includes(v),
  soundEnabled: (v) => typeof v === 'boolean',
  mascotEnabled: (v) => typeof v === 'boolean',
  lastDurationMin: (v) => Number.isInteger(v) && v >= 1 && v <= 720,
};

function appState() {
  return {
    settings: {
      onboardingDone: store.get('onboardingDone'),
      themeId: store.get('themeId'),
      soundEnabled: store.get('soundEnabled'),
      mascotEnabled: store.get('mascotEnabled'),
      lastDurationMin: store.get('lastDurationMin'),
    },
    timer: engine.getState(),
    autostart: autostart.getState(),
    tracking: tracking.sync(),
    platform: process.platform,
  };
}

function registerIpc() {
  ipcMain.handle('app:getState', appState);
  ipcMain.handle('settings:set', (_e, patch) => {
    const accepted = {};
    for (const [key, value] of Object.entries(patch ?? {})) {
      if (!SETTING_VALIDATORS[key]?.(value)) throw new TypeError(`Geçersiz ayar: ${key}`);
      accepted[key] = value;
    }
    store.set(accepted);
    return appState().settings;
  });
  ipcMain.handle('timer:start', (_e, ms, label) => engine.start(ms, label));
  ipcMain.handle('timer:pause', () => engine.pause());
  ipcMain.handle('timer:resume', () => engine.resume());
  ipcMain.handle('timer:stop', () => engine.stop());
  ipcMain.handle('timer:add', (_e, ms) => engine.add(ms));
  ipcMain.handle('autostart:set', (_e, enabled) => autostart.setEnabled(enabled === true));
  ipcMain.handle('tracking:grant', () => tracking.grant());
  ipcMain.handle('tracking:deny', () => tracking.deny());
  ipcMain.handle('tracking:openSystemSettings', () => tracking.openSystemSettings());
  ipcMain.handle('overlay:preview', () => overlay.play(store.get('themeId')));
  ipcMain.handle('window:hide', () => mainWindow.hide());
  ipcMain.handle('app:quit', () => app.quit());
}
