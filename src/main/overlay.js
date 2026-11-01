'use strict';

const path = require('node:path');
const { BrowserWindow, screen } = require('electron');

const DURATION_MS = 12000;

/**
 * Süre dolunca masaüstünde beliren tema figürü: imlecin olduğu ekranda şeffaf, tıklamaları
 * geçiren ve odak çalmayan bir pencere açar, figür gidince kendini kapatır.
 */
function createOverlay() {
  let win = null;
  let closeTimer = null;

  function close() {
    clearTimeout(closeTimer);
    closeTimer = null;
    if (win && !win.isDestroyed()) win.destroy();
    win = null;
  }

  function play(themeId) {
    close();
    // workArea: figür Dock ve görev çubuğunun altında kalmasın.
    const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const current = new BrowserWindow({
      ...workArea,
      transparent: true,
      frame: false,
      hasShadow: false,
      resizable: false,
      movable: false,
      focusable: false,
      skipTaskbar: true,
      show: false,
      backgroundColor: '#00000000',
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    win = current;
    current.setIgnoreMouseEvents(true);
    current.setAlwaysOnTop(true, 'screen-saver');
    current.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
    current.loadFile(path.join(__dirname, '../renderer/overlay.html'), { query: { theme: themeId, ms: String(DURATION_MS) } });
    current.once('ready-to-show', () => {
      if (!current.isDestroyed()) current.showInactive();
    });
    closeTimer = setTimeout(close, DURATION_MS);
  }

  return { play, close };
}

module.exports = { createOverlay };
