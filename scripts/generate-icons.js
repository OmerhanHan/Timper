'use strict';
// assets/ içindeki uygulama ve tepsi ikonlarını piksel matrislerinden üretir: npm run icons
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const CLOCK = [
  '................',
  '.....######.....',
  '...##......##...',
  '..#....##....#..',
  '.#.....##.....#.',
  '.#.....##.....#.',
  '#......##......#',
  '#......##......#',
  '#......#####...#',
  '#......#####...#',
  '#..............#',
  '.#............#.',
  '.#............#.',
  '..#..........#..',
  '...##......##...',
  '.....######.....',
];

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    for (let x = 0; x < size; x++) Buffer.from(pixel(x, y)).copy(raw, row + 1 + x * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, '../assets');
const isInk = (x, y) => CLOCK[y][x] === '#';

// Tepsi ikonu: macOS'un renklendirdiği siyah şablon.
fs.writeFileSync(path.join(out, 'trayTemplate.png'), png(16, (x, y) => (isInk(x, y) ? [0, 0, 0, 255] : [0, 0, 0, 0])));
fs.writeFileSync(path.join(out, 'trayTemplate@2x.png'), png(32, (x, y) => (isInk(x >> 1, y >> 1) ? [0, 0, 0, 255] : [0, 0, 0, 0])));

// Uygulama ikonu: 20x20 hücrelik ızgarada, ortada saat olan yeşil konsol ekranı.
const CELLS = 20;
const SCALE = 1024 / CELLS;
fs.writeFileSync(path.join(out, 'icon.png'), png(1024, (px, py) => {
  const x = Math.floor(px / SCALE);
  const y = Math.floor(py / SCALE);
  const corner = (x === 0 || x === CELLS - 1) && (y === 0 || y === CELLS - 1);
  if (corner) return [0, 0, 0, 0];
  const edge = x === 0 || y === 0 || x === CELLS - 1 || y === CELLS - 1;
  if (edge) return [15, 56, 15, 255];
  const cx = x - 2;
  const cy = y - 2;
  if (cx >= 0 && cx < 16 && cy >= 0 && cy < 16 && isInk(cx, cy)) return [15, 56, 15, 255];
  return [155, 188, 15, 255];
}));
