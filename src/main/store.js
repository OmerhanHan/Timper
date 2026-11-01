'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULTS = Object.freeze({
  onboardingDone: false,
  themeId: 'pocket',
  soundEnabled: true,
  mascotEnabled: true,
  lastDurationMin: 25,
  timer: null,
  tracking: { consent: 'unset', decidedAt: null, policyVersion: null },
});

/** Ayarları tek bir JSON dosyasında tutar; yazma atomiktir, bozuk dosyada varsayılanlara döner. */
class Store {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { ...DEFAULTS, ...this.read() };
  }

  read() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn('Ayar dosyası okunamadı, varsayılanlar kullanılıyor:', err.message);
      return {};
    }
  }

  get(key) {
    return this.data[key];
  }

  set(patch) {
    Object.assign(this.data, patch);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.filePath);
  }
}

module.exports = { Store, DEFAULTS };
