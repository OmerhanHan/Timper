'use strict';

const { EventEmitter } = require('node:events');

const MIN_DURATION_MS = 1000;
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

function assertDuration(ms) {
  if (!Number.isInteger(ms) || ms < MIN_DURATION_MS || ms > MAX_DURATION_MS) {
    throw new RangeError(`Geçersiz süre: ${ms}`);
  }
}

/**
 * Sayaç ana süreçte, duvar saatine göre çalışır: `endsAt` saklandığı için pencere
 * gizliyken, uyku sonrasında ya da yeniden başlatmada sapma olmaz.
 *
 * Olaylar: 'change' (durum veya gösterilen saniye değişti), 'finished' ({ missed }).
 */
class TimerEngine extends EventEmitter {
  constructor({ now = Date.now, tickMs = 250 } = {}) {
    super();
    this.now = now;
    this.tickMs = tickMs;
    this.interval = null;
    this.lastShownSecond = null;
    this.status = 'idle';
    this.durationMs = 0;
    this.remainingMs = 0;
    this.endsAt = null;
    this.label = '';
  }

  getState() {
    const remainingMs = this.status === 'running' ? Math.max(0, this.endsAt - this.now()) : this.remainingMs;
    return {
      status: this.status,
      durationMs: this.durationMs,
      remainingMs,
      endsAt: this.endsAt,
      label: this.label,
    };
  }

  start(durationMs, label = '') {
    assertDuration(durationMs);
    this.status = 'running';
    this.durationMs = durationMs;
    this.remainingMs = durationMs;
    this.endsAt = this.now() + durationMs;
    this.label = String(label).slice(0, 40);
    this.startTicking();
    this.emitChange();
  }

  pause() {
    if (this.status !== 'running') return;
    this.remainingMs = Math.max(0, this.endsAt - this.now());
    this.endsAt = null;
    this.status = 'paused';
    this.stopTicking();
    this.emitChange();
  }

  resume() {
    if (this.status !== 'paused') return;
    this.endsAt = this.now() + this.remainingMs;
    this.status = 'running';
    this.startTicking();
    this.emitChange();
  }

  /** Sayacı iptal eder ya da bitmiş durumdan boşa döner. */
  stop() {
    if (this.status === 'idle') return;
    this.stopTicking();
    this.status = 'idle';
    this.durationMs = 0;
    this.remainingMs = 0;
    this.endsAt = null;
    this.label = '';
    this.emitChange();
  }

  /** Çalışan ya da duraklatılmış sayaca süre ekler; toplam üst sınırı aşamaz. */
  add(ms) {
    if (this.status !== 'running' && this.status !== 'paused') return;
    assertDuration(ms);
    const remaining = this.getState().remainingMs;
    const added = Math.min(ms, MAX_DURATION_MS - remaining);
    if (this.status === 'running') this.endsAt += added;
    else this.remainingMs += added;
    this.durationMs = Math.min(this.durationMs + added, MAX_DURATION_MS);
    this.emitChange();
  }

  /** Kalıcı kayıt için anlık görüntü; bitmiş sayaç geri yüklenmez. */
  snapshot() {
    if (this.status !== 'running' && this.status !== 'paused') return null;
    return {
      status: this.status,
      durationMs: this.durationMs,
      remainingMs: this.remainingMs,
      endsAt: this.endsAt,
      label: this.label,
    };
  }

  /** Önceki oturumdan devam eder. Bilgisayar kapalıyken dolduysa 'finished' { missed: true } yayınlar. */
  restore(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    const { status, durationMs, remainingMs, endsAt, label } = snapshot;
    if (!Number.isInteger(durationMs) || durationMs < MIN_DURATION_MS || durationMs > MAX_DURATION_MS) return;
    this.durationMs = durationMs;
    this.label = typeof label === 'string' ? label : '';

    if (status === 'paused' && Number.isFinite(remainingMs) && remainingMs > 0 && remainingMs <= durationMs) {
      this.status = 'paused';
      this.remainingMs = remainingMs;
      this.endsAt = null;
      this.emitChange();
    } else if (status === 'running' && Number.isFinite(endsAt)) {
      this.status = 'running';
      this.endsAt = endsAt;
      if (endsAt <= this.now()) {
        this.finish(true);
      } else {
        this.startTicking();
        this.emitChange();
      }
    } else {
      this.durationMs = 0;
      this.label = '';
    }
  }

  /** Uykudan uyanma gibi durumlarda bekletmeden kontrol eder. */
  tick() {
    if (this.status !== 'running') return;
    const remaining = this.endsAt - this.now();
    if (remaining <= 0) {
      this.finish(false);
      return;
    }
    if (Math.ceil(remaining / 1000) !== this.lastShownSecond) this.emitChange();
  }

  finish(missed) {
    this.stopTicking();
    this.status = 'finished';
    this.remainingMs = 0;
    this.endsAt = null;
    this.emitChange();
    this.emit('finished', { missed, label: this.label, durationMs: this.durationMs });
  }

  startTicking() {
    this.stopTicking();
    this.interval = setInterval(() => this.tick(), this.tickMs);
  }

  stopTicking() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  emitChange() {
    const state = this.getState();
    this.lastShownSecond = Math.ceil(state.remainingMs / 1000);
    this.emit('change', state);
  }
}

module.exports = { TimerEngine, MIN_DURATION_MS, MAX_DURATION_MS };
