'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TimerEngine, MAX_DURATION_MS } = require('../src/main/timer');

function setup(start = 1_000_000) {
  const clock = { t: start };
  const engine = new TimerEngine({ now: () => clock.t });
  const finished = [];
  engine.on('finished', (e) => finished.push(e));
  return { clock, engine, finished };
}

test('kalan süre duvar saatinden hesaplanır ve bitişte finished yayınlanır', () => {
  const { clock, engine, finished } = setup();
  engine.start(60_000, 'Odak');
  clock.t += 20_000;
  assert.equal(engine.getState().remainingMs, 40_000);
  engine.tick();
  assert.equal(finished.length, 0);
  clock.t += 40_000;
  engine.tick();
  assert.equal(engine.getState().status, 'finished');
  assert.deepEqual(finished, [{ missed: false, label: 'Odak', durationMs: 60_000 }]);
  engine.tick();
  assert.equal(finished.length, 1, 'bitiş yalnızca bir kez yayınlanır');
});

test('duraklatma süreyi dondurur, devam etme kaldığı yerden sürdürür', () => {
  const { clock, engine } = setup();
  engine.start(60_000);
  clock.t += 10_000;
  engine.pause();
  clock.t += 500_000;
  assert.equal(engine.getState().remainingMs, 50_000);
  engine.resume();
  clock.t += 10_000;
  assert.equal(engine.getState().remainingMs, 40_000);
  engine.stop();
});

test('süre ekleme çalışırken ve duraklatılmışken işler, üst sınırı aşmaz', () => {
  const { engine } = setup();
  engine.start(60_000);
  engine.add(60_000);
  assert.equal(engine.getState().remainingMs, 120_000);
  engine.pause();
  engine.add(60_000);
  assert.equal(engine.getState().remainingMs, 180_000);
  engine.add(MAX_DURATION_MS);
  assert.equal(engine.getState().remainingMs, MAX_DURATION_MS);
  engine.stop();
});

test('geçersiz süreler reddedilir ve durum değişmez', () => {
  const { engine } = setup();
  for (const bad of [0, -1, 999, 1.5, NaN, '60000', MAX_DURATION_MS + 1, undefined]) {
    assert.throws(() => engine.start(bad), RangeError);
  }
  assert.equal(engine.getState().status, 'idle');
});

test('stop bitmiş sayacı boşa döndürür', () => {
  const { clock, engine } = setup();
  engine.start(1000);
  clock.t += 1000;
  engine.tick();
  engine.stop();
  assert.equal(engine.getState().status, 'idle');
  assert.equal(engine.snapshot(), null);
});

test('yeniden başlatmada çalışan sayaç kaldığı yerden sürer', () => {
  const first = setup();
  first.engine.start(60_000, 'Odak');
  const snapshot = JSON.parse(JSON.stringify(first.engine.snapshot()));
  first.engine.stop();

  const second = setup();
  second.clock.t = first.clock.t + 15_000;
  second.engine.restore(snapshot);
  assert.equal(second.engine.getState().status, 'running');
  assert.equal(second.engine.getState().remainingMs, 45_000);
  assert.equal(second.engine.getState().label, 'Odak');
  second.engine.stop();
});

test('kapalıyken dolan sayaç missed olarak biter', () => {
  const first = setup();
  first.engine.start(60_000);
  const snapshot = first.engine.snapshot();
  first.engine.stop();

  const second = setup();
  second.clock.t = first.clock.t + 120_000;
  second.engine.restore(snapshot);
  assert.equal(second.engine.getState().status, 'finished');
  assert.equal(second.finished[0].missed, true);
});

test('duraklatılmış sayaç geri yüklenir, bozuk kayıt yok sayılır', () => {
  const first = setup();
  first.engine.start(60_000);
  first.clock.t += 10_000;
  first.engine.pause();
  const snapshot = first.engine.snapshot();

  const second = setup();
  second.engine.restore(snapshot);
  assert.equal(second.engine.getState().status, 'paused');
  assert.equal(second.engine.getState().remainingMs, 50_000);

  for (const bad of [null, 'x', {}, { status: 'running', durationMs: 1000 }, { status: 'paused', durationMs: 1000, remainingMs: 5000 }, { status: 'weird', durationMs: 1000 }]) {
    const third = setup();
    third.engine.restore(bad);
    assert.equal(third.engine.getState().status, 'idle', JSON.stringify(bad));
  }
});
