'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { THEMES } = require('../src/shared/themes');

function assertSprite(rows, palette, label) {
  const width = rows[0].length;
  rows.forEach((row, i) => {
    assert.equal(row.length, width, `${label} satır ${i} genişliği`);
    for (const char of row) assert.ok(char === '.' || palette[char], `${label} satır ${i}: paletsiz '${char}'`);
  });
}

for (const theme of THEMES) {
  test(`${theme.id}: sprite'lar düzgün ve aynı boyutta`, () => {
    const frames = [...theme.walk, ...theme.rest];
    frames.forEach((rows, i) => assertSprite(rows, theme.palette, `kare ${i}`));
    assertSprite(theme.goal, theme.palette, 'hedef');
    for (const rows of frames) {
      assert.equal(rows.length, frames[0].length, 'yükseklik');
      assert.equal(rows[0].length, frames[0][0].length, 'genişlik');
    }
    assert.ok(theme.rest.length >= 1);
  });
}
