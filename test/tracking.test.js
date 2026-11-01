'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTracking, POLICY_VERSION } = require('../src/main/tracking');

function setup({ platform = 'darwin', trusted = false, collector = null, tracking } = {}) {
  const data = { tracking: tracking ?? { consent: 'unset', decidedAt: null, policyVersion: null } };
  const store = { get: (k) => data[k], set: (patch) => Object.assign(data, patch) };
  const prompts = [];
  const systemPreferences = {
    isTrustedAccessibilityClient(prompt) {
      if (prompt) prompts.push(true);
      return trusted;
    },
  };
  const opened = [];
  const shell = { openExternal: async (url) => opened.push(url) };
  return { data, prompts, opened, api: createTracking({ store, systemPreferences, shell, platform, collector, now: () => 42 }) };
}

function fakeCollector() {
  return { running: false, start() { this.running = true; }, stop() { this.running = false; } };
}

test('karar verilmeden sistem izni istenmez, toplayıcı başlamaz', () => {
  const collector = fakeCollector();
  const { api, prompts } = setup({ trusted: true, collector });
  assert.equal(api.sync().consent, 'unset');
  assert.equal(prompts.length, 0);
  assert.equal(collector.running, false);
});

test('izin verilince karar kaydedilir ve macOS izni istenir', () => {
  const { api, prompts, data } = setup();
  const state = api.grant();
  assert.equal(prompts.length, 1);
  assert.equal(state.consent, 'granted');
  assert.equal(state.os, 'missing');
  assert.deepEqual(data.tracking, { consent: 'granted', decidedAt: 42, policyVersion: POLICY_VERSION });
});

test('toplayıcı yalnızca iki izin de tamamsa çalışır, izin kalkınca durur', () => {
  const collector = fakeCollector();
  const missingOs = setup({ trusted: false, collector });
  missingOs.api.grant();
  assert.equal(collector.running, false);

  const { api } = setup({ trusted: true, collector });
  assert.equal(api.grant().collecting, true);
  assert.equal(collector.running, true);
  assert.equal(api.deny().collecting, false);
  assert.equal(collector.running, false);
});

test('Windows/Linux sistem izni istemez', () => {
  const { api, prompts } = setup({ platform: 'win32' });
  assert.equal(api.grant().os, 'not-required');
  assert.equal(prompts.length, 0);
});

test('ilke sürümü değişince eski onay geçersiz sayılır', () => {
  const { api } = setup({ trusted: true, tracking: { consent: 'granted', decidedAt: 1, policyVersion: POLICY_VERSION - 1 } });
  assert.equal(api.getState().consent, 'unset');
});
