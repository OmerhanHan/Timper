'use strict';
// Gerçek uygulamayı sürer. Ekran görüntüleri için: SHOTS=/klasör npm run test:e2e
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright-core');

const ROOT = path.join(__dirname, '../..');
const SHOTS = process.env.SHOTS;
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-timer-e2e-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  // VS Code içinden çalışırken bu değişken Electron'u düz Node olarak başlatır.
  const { ELECTRON_RUN_AS_NODE, ...env } = process.env;
  const app = await electron.launch({ args: [ROOT, `--user-data-dir=${userData}`], env });
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.waitForLoadState('domcontentloaded');
  // Figür penceresindeki hatalar da testi düşürsün.
  app.on('window', (win) => win.on('pageerror', (e) => errors.push(`figür: ${e.message}`)));
  return { app, page, errors };
}

async function shot(page, name) {
  if (!SHOTS) return;
  await sleep(250);
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

const status = (page) => page.evaluate(() => window.api.getState().then((s) => s.timer));
const visible = (app) => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible());

async function main() {
  let { app, page, errors } = await launch();

  // Onboarding
  await page.waitForSelector('[data-step="welcome"]:not([hidden])');
  await shot(page, '01-welcome');
  await page.click('[data-step="welcome"] [data-next]');
  await page.waitForSelector('[data-step="theme"]:not([hidden])');
  await shot(page, '02-theme');
  await page.click('[data-step="theme"] .theme-card[data-theme="cafe"]');
  assert.equal((await page.evaluate(() => window.api.getState())).settings.themeId, 'cafe');
  await shot(page, '03-theme-cafe');
  await page.click('[data-step="theme"] [data-next]');
  await shot(page, '04-background');
  await page.click('[data-step="background"] [data-next]');
  await shot(page, '05-tracking');
  await page.click('#ob-deny');
  await page.waitForSelector('#view-timer:not([hidden])');
  assert.equal((await page.evaluate(() => window.api.getState())).tracking.consent, 'denied');

  // Her tema için ana ekran
  for (const id of ['pocket', 'neon', 'cafe', 'dungeon', 'yilki']) {
    await page.evaluate((themeId) => window.api.setSettings({ themeId }), id);
    await page.reload();
    await page.waitForSelector('#view-timer:not([hidden])');
    await shot(page, `10-main-${id}`);
  }

  // Öneriler ve özel süre
  await page.click('.preset[data-min="45"]');
  assert.equal(await page.textContent('#time'), '45:00');
  await page.fill('#minutes', '9999');
  await page.dispatchEvent('#minutes', 'change');
  assert.equal(await page.inputValue('#minutes'), '720');
  assert.equal(await page.textContent('#time'), '12:00:00');
  await page.fill('#minutes', '-4');
  await page.dispatchEvent('#minutes', 'change');
  assert.equal(await page.inputValue('#minutes'), '1');
  await page.click('.preset[data-min="25"]');

  // Başlat, duraklat, süre ekle, durdur
  await page.click('#start');
  await page.waitForSelector('#controls:not([hidden])');
  assert.equal((await status(page)).status, 'running');
  await sleep(1200);
  await shot(page, '20-running');
  await page.click('#pause');
  await sleep(100);
  const paused = await status(page);
  assert.equal(paused.status, 'paused');
  await shot(page, '21-paused');
  await page.click('#add-five');
  await sleep(100);
  assert.equal((await status(page)).remainingMs, paused.remainingMs + 5 * 60000);
  await page.click('#stop');
  await page.waitForSelector('#setup:not([hidden])');

  // Pencere gizliyken sayaç biter
  await page.click('#hide-window');
  await sleep(100);
  assert.equal(await visible(app), false, 'kapat düğmesi pencereyi gizler');
  await page.evaluate(() => window.api.timer.start(2000, 'Test'));
  await sleep(2600);
  assert.equal((await status(page)).status, 'finished');
  const audio = await page.evaluate(() => { const a = new AudioContext(); return a.state; });
  assert.equal(audio, 'running', 'gizli pencerede ses çalabilmeli');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show());
  await page.waitForSelector('#finished:not([hidden])');
  await shot(page, '22-finished');
  await page.click('#done');

  // Ayarlar
  await page.click('#open-settings');
  await page.waitForSelector('#view-settings:not([hidden])');
  await shot(page, '30-settings');
  await page.evaluate(() => document.getElementById('view-settings').scrollTo(0, 9999));
  await shot(page, '31-settings-bottom');
  await page.click('#close-settings');

  // Süre dolunca figür gelir, durup konuşur, gider
  const next = app.waitForEvent('window');
  await page.evaluate(() => window.api.timer.start(1000, 'Test'));
  const figure = await next;
  await figure.waitForLoadState('domcontentloaded');
  const windows = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => ({ top: w.isAlwaysOnTop(), focusable: w.isFocusable() })));
  assert.ok(windows.some((w) => w.top && !w.focusable), 'figür penceresi üstte ve odaksız');
  await sleep(1000);
  assert.equal(await figure.isHidden('#bubble'), true, 'yürürken balon yok');
  if (SHOTS) await figure.screenshot({ path: path.join(SHOTS, '40-walking.png'), omitBackground: true });
  await sleep(2500);
  assert.equal(await figure.textContent('#bubble'), 'Süre doldu!');
  assert.equal(await figure.isVisible('#bubble'), true, 'dururken balon görünür');
  if (SHOTS) await figure.screenshot({ path: path.join(SHOTS, '41-talking.png'), omitBackground: true });
  await sleep(6800);
  assert.equal(await figure.isHidden('#bubble'), true, 'giderken balon kapanır');
  if (SHOTS) await figure.screenshot({ path: path.join(SHOTS, '42-leaving.png'), omitBackground: true });
  await sleep(2500);
  const left = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  assert.equal(left, 1, 'figür işi bitince pencere kapanır');
  await page.click('#done');

  // Her tema kendi figürüyle
  for (const id of ['pocket', 'neon', 'cafe', 'dungeon', 'yilki']) {
    await page.evaluate((themeId) => window.api.setSettings({ themeId }), id);
    const opened = app.waitForEvent('window');
    await page.evaluate(() => window.api.overlay.preview());
    const preview = await opened;
    await preview.waitForLoadState('domcontentloaded');
    await sleep(1200);
    if (SHOTS) await preview.screenshot({ path: path.join(SHOTS, `43-${id}-moving.png`), omitBackground: true });
    await sleep(2000);
    assert.equal(await preview.isVisible('#bubble'), true, `${id}: balon görünür`);
    if (SHOTS) await preview.screenshot({ path: path.join(SHOTS, `44-${id}-talking.png`), omitBackground: true });
  }
  await sleep(9000);
  await page.evaluate(() => window.api.setSettings({ themeId: 'yilki' }));

  // Figür kapatılınca bitişte pencere açılmaz
  await page.evaluate(() => window.api.setSettings({ mascotEnabled: false }));
  await page.evaluate(() => window.api.timer.start(1000, 'Test'));
  await sleep(1500);
  assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
  await page.click('#done');

  // Yeniden başlatmada sayaç sürer
  await page.evaluate(() => window.api.timer.start(60000, 'Odak'));
  assert.deepEqual(errors, []);
  await app.close();
  ({ app, page, errors } = await launch());
  await page.waitForSelector('#controls:not([hidden])');
  const restored = await status(page);
  assert.equal(restored.status, 'running');
  assert.ok(restored.remainingMs > 50000 && restored.remainingMs < 60000, String(restored.remainingMs));
  await page.evaluate(() => window.api.timer.stop());
  assert.deepEqual(errors, []);
  await app.close();

  fs.rmSync(userData, { recursive: true, force: true });
  console.log('E2E tamam');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
