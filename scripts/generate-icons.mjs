/**
 * Genera los iconos PNG de la PWA (192, 512 y maskable) sin dependencias externas.
 * Dibuja una caja de almacén blanca sobre el color corporativo.
 * Uso: node scripts/generate-icons.mjs
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const BG = [17, 76, 168];
const FG = [255, 255, 255];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** ¿El punto (x, y) normalizado a [0,1] forma parte del dibujo? */
function isForeground(x, y, padding) {
  const s = (v) => (v - padding) / (1 - 2 * padding);
  const u = s(x);
  const v = s(y);
  const t = 0.07; // grosor de línea
  const inBox = u >= 0.18 && u <= 0.82 && v >= 0.3 && v <= 0.82;
  const border = inBox && (u < 0.18 + t || u > 0.82 - t || v < 0.3 + t || v > 0.82 - t);
  const lid = u >= 0.12 && u <= 0.88 && v >= 0.18 && v <= 0.3 + t / 2;
  const handle = u >= 0.38 && u <= 0.62 && v >= 0.56 && v <= 0.56 + t;
  return border || lid || handle;
}

function png(size, { maskable = false } = {}) {
  const padding = maskable ? 0.12 : 0.04;
  const radius = maskable ? 0 : size * 0.18;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4;
      const dx = Math.max(radius - x, 0, x - (size - 1 - radius));
      const dy = Math.max(radius - y, 0, y - (size - 1 - radius));
      const inside = radius === 0 || dx * dx + dy * dy <= radius * radius;
      const color = isForeground(x / size, y / size, padding) ? FG : BG;
      raw.set([...color, inside ? 255 : 0], i);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = resolve(import.meta.dirname, '../src/assets/icon');
writeFileSync(resolve(dir, 'icon-192.png'), png(192));
writeFileSync(resolve(dir, 'icon-512.png'), png(512));
writeFileSync(resolve(dir, 'icon-maskable-512.png'), png(512, { maskable: true }));
writeFileSync(resolve(dir, 'favicon.png'), png(64));
console.log('Iconos generados en src/assets/icon');
