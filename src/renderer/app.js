'use strict';

const { THEMES } = window.PixelThemes;
const { createStage, drawThemePreview } = window.Pixel;

const MINUTE = 60 * 1000;
const MIN_MINUTES = 1;
const MAX_MINUTES = 720;
const PRESETS = [
  { min: 5, label: 'Mola' },
  { min: 15, label: 'Sprint' },
  { min: 25, label: 'Pomodoro' },
  { min: 45, label: 'Odak' },
  { min: 60, label: 'Derin iş' },
  { min: 90, label: 'Maraton' },
];
const ONBOARDING_STEPS = ['welcome', 'theme', 'background', 'tracking'];

const $ = (id) => document.getElementById(id);

const state = {
  settings: null,
  timer: null,
  autostart: null,
  tracking: null,
  minutes: 25,
  view: 'timer',
  step: 0,
  obAutostart: true,
};

const theme = () => THEMES.find((t) => t.id === state.settings.themeId) ?? THEMES[0];

const stage = createStage($('stage'));
const welcomeStage = createStage($('welcome-stage'));

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function clampMinutes(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return state.minutes;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n));
}

function setSwitch(el, on) {
  el.setAttribute('aria-checked', String(on));
}

/* Tema */

function applyTheme() {
  const { colors } = theme();
  const style = document.documentElement.style;
  style.setProperty('--bg', colors.bg);
  style.setProperty('--panel', colors.panel);
  style.setProperty('--panel-alt', colors.panelAlt);
  style.setProperty('--ink', colors.ink);
  style.setProperty('--muted', colors.muted);
  style.setProperty('--accent', colors.accent);
  style.setProperty('--accent-ink', colors.accentInk);
  style.setProperty('--chrome', colors.chrome);
  stage.setTheme(theme());
  welcomeStage.setTheme(theme());
}

async function selectTheme(id) {
  state.settings = await api.setSettings({ themeId: id });
  applyTheme();
  renderThemeCards();
}

function buildThemeCards() {
  for (const grid of document.querySelectorAll('[data-theme-grid]')) {
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', 'Tema');
    for (const item of THEMES) {
      const card = document.createElement('button');
      card.className = 'theme-card';
      card.dataset.theme = item.id;
      card.setAttribute('role', 'radio');
      card.append(document.createElement('canvas'));
      const name = document.createElement('b');
      name.textContent = item.name;
      card.append(name);
      card.addEventListener('click', () => selectTheme(item.id));
      grid.append(card);
    }
  }
}

function renderThemeCards() {
  for (const card of document.querySelectorAll('.theme-card')) {
    card.setAttribute('aria-checked', String(card.dataset.theme === state.settings.themeId));
  }
}

let previewFrame = 0;
setInterval(() => {
  if (document.hidden || !state.settings) return;
  previewFrame++;
  for (const card of document.querySelectorAll('.theme-card')) {
    if (card.offsetParent === null) continue;
    drawThemePreview(card.querySelector('canvas'), THEMES.find((t) => t.id === card.dataset.theme), previewFrame);
  }
}, 125);

/* Görünümler */

function setView(view) {
  state.view = view;
  $('view-timer').hidden = view !== 'timer';
  $('view-onboarding').hidden = view !== 'onboarding';
  $('view-settings').hidden = view !== 'settings';
  $('open-settings').hidden = view !== 'timer';
  if (view === 'timer') stage.start(); else stage.stop();
  if (view === 'onboarding') renderOnboarding(); else welcomeStage.stop();
  if (view === 'settings') { renderSettings(); $('view-settings').scrollTop = 0; }
}

/* Sayaç */

const STATUS_TEXT = {
  idle: 'Süreni seç',
  paused: 'Duraklatıldı',
  finished: 'SÜRE DOLDU!',
};

function renderTimer() {
  const { status, remainingMs, durationMs, label } = state.timer;
  const idle = status === 'idle';
  const shownMs = idle ? state.minutes * MINUTE : remainingMs;
  const text = formatTime(shownMs);

  $('time').textContent = text;
  $('time').classList.toggle('long', text.length > 5);
  $('status-text').textContent = STATUS_TEXT[status] ?? (label ? `${label} sürüyor` : 'Çalışıyor');
  $('status-text').classList.toggle('done', status === 'finished');
  $('setup').hidden = !idle;
  $('controls').hidden = status !== 'running' && status !== 'paused';
  $('finished').hidden = status !== 'finished';
  $('pause').textContent = status === 'paused' ? 'DEVAM ET' : 'DURAKLAT';
  document.title = idle ? 'Pixel Timer' : `${text} · Pixel Timer`;

  const progress = status === 'finished' ? 1 : durationMs > 0 ? 1 - remainingMs / durationMs : 0;
  stage.update(status, progress);
}

function renderSetup() {
  $('minutes').value = state.minutes;
  for (const button of document.querySelectorAll('.preset')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.min) === state.minutes));
  }
  $('minus').disabled = state.minutes <= MIN_MINUTES;
  $('plus').disabled = state.minutes >= MAX_MINUTES;
}

function setMinutes(value) {
  state.minutes = clampMinutes(value);
  renderSetup();
  renderTimer();
}

function buildPresets() {
  for (const preset of PRESETS) {
    const button = document.createElement('button');
    button.className = 'btn preset';
    button.dataset.min = preset.min;
    const value = document.createElement('b');
    value.textContent = `${preset.min} dk`;
    const label = document.createElement('small');
    label.textContent = preset.label;
    button.append(value, label);
    button.addEventListener('click', () => setMinutes(preset.min));
    $('presets').append(button);
  }
}

function startTimer() {
  const minutes = clampMinutes($('minutes').value);
  setMinutes(minutes);
  const preset = PRESETS.find((p) => p.min === minutes);
  api.setSettings({ lastDurationMin: minutes }).then((settings) => { state.settings = settings; });
  api.timer.start(minutes * MINUTE, preset?.label ?? '');
}

/* Onboarding */

function renderAutostartNotes() {
  const { supported, status } = state.autostart;
  let note = 'Giriş yaptığında otomatik açılır.';
  if (!supported) note = 'Geliştirme modunda kapalı; paketlenmiş uygulamada çalışır.';
  else if (status === 'requires-approval') note = 'Sistem Ayarları > Genel > Oturum Açma Öğeleri’nden onaylaman gerekiyor.';
  for (const el of document.querySelectorAll('[data-autostart-note]')) el.textContent = note;
  $('ob-autostart').disabled = !supported;
  $('autostart').disabled = !supported;
}

function renderOnboarding() {
  const stepId = ONBOARDING_STEPS[state.step];
  for (const section of document.querySelectorAll('[data-step]')) section.hidden = section.dataset.step !== stepId;
  $('steps').replaceChildren(...ONBOARDING_STEPS.map((_, i) => {
    const dot = document.createElement('li');
    if (i <= state.step) dot.className = 'on';
    return dot;
  }));
  if (stepId === 'welcome') {
    welcomeStage.update('running', 0.5);
    welcomeStage.start();
  } else {
    welcomeStage.stop();
  }
  setSwitch($('ob-autostart'), state.obAutostart && state.autostart.supported);
  renderAutostartNotes();
}

async function nextStep() {
  if (ONBOARDING_STEPS[state.step] === 'background') {
    state.autostart = await api.autostart.set(state.obAutostart);
  }
  state.step = Math.min(state.step + 1, ONBOARDING_STEPS.length - 1);
  renderOnboarding();
}

async function finishOnboarding() {
  state.settings = await api.setSettings({ onboardingDone: true });
  setView('timer');
  renderTimer();
}

/* Ayarlar */

const TRACKING_TEXT = {
  unset: ['Karar verilmedi', 'Takip izni henüz sorulmadı. Hiçbir veri toplanmıyor.'],
  denied: ['İzin verilmedi', 'Hiçbir veri toplanmıyor.'],
  granted: ['İzin verildi', 'Bu sürümde henüz veri toplanmıyor; takip özelliği eklendiğinde devreye girer.'],
};

function renderSettings() {
  renderThemeCards();
  setSwitch($('autostart'), state.autostart.enabled);
  setSwitch($('sound'), state.settings.soundEnabled);
  setSwitch($('mascot'), state.settings.mascotEnabled);
  renderAutostartNotes();

  const { consent, os } = state.tracking;
  const [title, detail] = TRACKING_TEXT[consent];
  const osMissing = consent === 'granted' && os === 'missing';
  $('tracking-status').textContent = osMissing ? 'Sistem izni bekleniyor' : title;
  $('tracking-detail').textContent = osMissing
    ? 'Sistem Ayarları > Gizlilik ve Güvenlik > Erişilebilirlik’ten Pixel Timer’ı aç.'
    : detail;
  $('tracking-grant').hidden = consent === 'granted';
  $('tracking-deny').hidden = consent !== 'granted';
  $('tracking-open').hidden = !osMissing;
}

async function refreshSystemState() {
  const fresh = await api.getState();
  state.autostart = fresh.autostart;
  state.tracking = fresh.tracking;
  if (state.view === 'settings') renderSettings();
}

/* Olaylar */

function bindEvents() {
  $('hide-window').addEventListener('click', () => api.window.hide());
  $('open-settings').addEventListener('click', () => setView('settings'));
  $('close-settings').addEventListener('click', () => setView('timer'));

  $('minus').addEventListener('click', () => setMinutes(state.minutes - 1));
  $('plus').addEventListener('click', () => setMinutes(state.minutes + 1));
  $('minutes').addEventListener('change', (e) => setMinutes(e.target.value));
  $('minutes').addEventListener('keydown', (e) => { if (e.key === 'Enter') startTimer(); });
  $('start').addEventListener('click', startTimer);

  $('pause').addEventListener('click', () => (state.timer.status === 'paused' ? api.timer.resume() : api.timer.pause()));
  $('add-five').addEventListener('click', () => api.timer.add(5 * MINUTE));
  $('stop').addEventListener('click', () => api.timer.stop());
  $('done').addEventListener('click', () => api.timer.stop());
  $('again').addEventListener('click', () => api.timer.start(5 * MINUTE, ''));

  for (const button of document.querySelectorAll('[data-next]')) button.addEventListener('click', nextStep);
  for (const button of document.querySelectorAll('[data-back]')) {
    button.addEventListener('click', () => {
      state.step = Math.max(0, state.step - 1);
      renderOnboarding();
    });
  }
  $('ob-autostart').addEventListener('click', () => {
    state.obAutostart = !state.obAutostart;
    setSwitch($('ob-autostart'), state.obAutostart);
  });
  $('ob-grant').addEventListener('click', async () => {
    state.tracking = await api.tracking.grant();
    finishOnboarding();
  });
  $('ob-deny').addEventListener('click', async () => {
    state.tracking = await api.tracking.deny();
    finishOnboarding();
  });

  $('autostart').addEventListener('click', async () => {
    state.autostart = await api.autostart.set(!state.autostart.enabled);
    renderSettings();
  });
  $('sound').addEventListener('click', async () => {
    state.settings = await api.setSettings({ soundEnabled: !state.settings.soundEnabled });
    if (state.settings.soundEnabled) window.PixelSound.playJingle(theme().jingle);
    renderSettings();
  });
  $('mascot').addEventListener('click', async () => {
    state.settings = await api.setSettings({ mascotEnabled: !state.settings.mascotEnabled });
    renderSettings();
  });
  $('mascot-preview').addEventListener('click', () => api.overlay.preview());

  $('tracking-grant').addEventListener('click', async () => {
    state.tracking = await api.tracking.grant();
    renderSettings();
  });
  $('tracking-deny').addEventListener('click', async () => {
    state.tracking = await api.tracking.deny();
    renderSettings();
  });
  $('tracking-open').addEventListener('click', () => api.tracking.openSystemSettings());

  $('replay-onboarding').addEventListener('click', async () => {
    state.settings = await api.setSettings({ onboardingDone: false });
    state.step = 0;
    state.obAutostart = state.autostart.enabled || !state.autostart.supported;
    setView('onboarding');
  });
  $('quit').addEventListener('click', () => api.quit());

  api.timer.onChange((timer) => {
    state.timer = timer;
    renderTimer();
  });
  api.timer.onFinished(({ missed }) => {
    if (!missed && state.settings.soundEnabled) window.PixelSound.playJingle(theme().jingle);
  });
  // Kullanıcı sistem ayarlarından dönmüş olabilir.
  api.window.onShown(refreshSystemState);
  window.addEventListener('focus', refreshSystemState);
}

async function init() {
  const initial = await api.getState();
  state.settings = initial.settings;
  state.timer = initial.timer;
  state.autostart = initial.autostart;
  state.tracking = initial.tracking;
  state.minutes = initial.settings.lastDurationMin;
  state.obAutostart = true;

  applyTheme();
  buildPresets();
  buildThemeCards();
  renderThemeCards();
  bindEvents();
  renderSetup();
  renderTimer();
  setView(initial.settings.onboardingDone ? 'timer' : 'onboarding');
}

init();
