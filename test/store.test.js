'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store, DEFAULTS } = require('../src/main/store');

const tempFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-timer-')), 'settings.json');

test('dosya yokken varsayılanlar kullanılır, yazılan değer kalıcıdır', () => {
  const file = tempFile();
  const store = new Store(file);
  assert.equal(store.get('themeId'), DEFAULTS.themeId);
  store.set({ themeId: 'neon' });
  assert.equal(new Store(file).get('themeId'), 'neon');
  assert.equal(new Store(file).get('soundEnabled'), DEFAULTS.soundEnabled);
});

test('bozuk dosya uygulamayı düşürmez', () => {
  const file = tempFile();
  fs.writeFileSync(file, '{bozuk');
  assert.equal(new Store(file).get('onboardingDone'), false);
  fs.writeFileSync(file, '[1,2]');
  assert.equal(new Store(file).get('onboardingDone'), false);
});
