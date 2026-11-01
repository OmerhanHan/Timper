'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('app:getState'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  timer: {
    start: (ms, label) => ipcRenderer.invoke('timer:start', ms, label),
    pause: () => ipcRenderer.invoke('timer:pause'),
    resume: () => ipcRenderer.invoke('timer:resume'),
    stop: () => ipcRenderer.invoke('timer:stop'),
    add: (ms) => ipcRenderer.invoke('timer:add', ms),
    onChange: (cb) => subscribe('timer:changed', cb),
    onFinished: (cb) => subscribe('timer:finished', cb),
  },
  autostart: { set: (enabled) => ipcRenderer.invoke('autostart:set', enabled) },
  tracking: {
    grant: () => ipcRenderer.invoke('tracking:grant'),
    deny: () => ipcRenderer.invoke('tracking:deny'),
    openSystemSettings: () => ipcRenderer.invoke('tracking:openSystemSettings'),
  },
  overlay: { preview: () => ipcRenderer.invoke('overlay:preview') },
  window: {
    hide: () => ipcRenderer.invoke('window:hide'),
    onShown: (cb) => subscribe('window:shown', cb),
  },
  quit: () => ipcRenderer.invoke('app:quit'),
});
