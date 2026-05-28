// node generate-icons.js  — no external deps
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const dir = path.join(__dirname, 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

// ── Minimal PNG encoder ────────────────────────────────────────────────────
function writePNG(filePath, size, pixelFn) {
  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      const i = y * rowSize + 1 + x * 4;
      raw[i] = r; raw[i+1] = g; raw[i+2] = b; raw[i+3] = a;
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const tb = Buffer.from(type, 'ascii');
    const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
    const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
    return Buffer.concat([lb, tb, data, cb]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  fs.writeFileSync(filePath, Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]));
  console.log(`Created ${path.basename(filePath)} (${size}x${size})`);
}

// ── Lorcana drop pixel function ────────────────────────────────────────────
// Drop shape: top-center point, widens to a circle at bottom ~70% of height
function insideDrop(nx, ny) {
  // ny in [-1,1], nx in [-1,1], center at (0,0)
  // Drop: pointed at top (ny=-1), round at bottom (ny=+0.4)
  // Parametric: at height t (0=top, 1=bottom), radius = r(t)
  const t = (ny + 1) / 2; // 0 at top, 1 at bottom
  if (t < 0 || t > 1) return false;
  // radius grows from 0 at top to maxR at t=0.75, then shrinks slightly
  const maxR = 0.62;
  let r;
  if (t < 0.72) {
    r = maxR * Math.pow(t / 0.72, 0.55);
  } else {
    // circular bottom cap
    const cy = 0.72 - 1 + 0.28; // center of bottom circle in t-space
    const circleT = 0.72;
    const circleR = maxR;
    // distance from circle center
    const dy = (t - circleT) / (1 - circleT) * circleR;
    r = Math.sqrt(Math.max(0, circleR * circleR - dy * dy));
  }
  return Math.abs(nx) <= r;
}

function lorcanaPixel(x, y, size) {
  const cx = size / 2, cy = size / 2;
  const nx = (x - cx) / (size * 0.38);
  const ny = (y - cy * 0.95) / (size * 0.46);

  // Background nebula
  const dist = Math.sqrt(nx*nx + ny*ny);
  const blob1 = Math.max(0, 1 - Math.sqrt((nx+0.3)**2 + (ny+0.2)**2) / 0.9);
  const blob2 = Math.max(0, 1 - Math.sqrt((nx-0.4)**2 + (ny-0.3)**2) / 0.7);
  const bgR = Math.min(255, 12  + Math.round(blob1*55 + blob2*35));
  const bgG = Math.min(255, 8   + Math.round(blob1*8  + blob2*15));
  const bgB = Math.min(255, 28  + Math.round(blob1*75 + blob2*45));

  const inside = insideDrop(nx, ny);
  if (!inside) return [bgR, bgG, bgB, 255];

  // Gold fill gradient: lighter at top-left, darker at bottom-right
  const t = (ny + 1) / 2; // 0=top, 1=bottom
  const hl = Math.max(0, 1 - Math.sqrt((nx+0.15)**2 + (ny+0.5)**2) / 0.4); // highlight blob

  const r = Math.min(255, Math.round(160 + 80*(1-t) + hl*95));
  const g = Math.min(255, Math.round(90  + 60*(1-t) + hl*80));
  const b = Math.min(255, Math.round(0   + 10*(1-t) + hl*30));

  return [r, g, b, 255];
}

writePNG(path.join(dir, 'icon-192.png'), 192, lorcanaPixel);
writePNG(path.join(dir, 'icon-512.png'), 512, lorcanaPixel);
