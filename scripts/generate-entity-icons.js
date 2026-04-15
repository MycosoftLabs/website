#!/usr/bin/env node
/**
 * generate-entity-icons.js
 *
 * Creates 32x32 white-on-transparent PNG icons for deck.gl IconLayer (mask:true).
 * Uses ONLY built-in Node.js modules (zlib, fs, path) -- no canvas, sharp, or npm deps.
 *
 * Output:
 *   public/crep/icons/aircraft.png   -- diamond/plane silhouette
 *   public/crep/icons/satellite.png  -- cross/plus with center body
 *   public/crep/icons/vessel.png     -- upward-pointing triangle/arrow
 *
 * How it works:
 *   1. Draw shapes into a 32x32 RGBA pixel buffer (Uint8Array)
 *   2. Build raw PNG: signature, IHDR, IDAT (zlib-deflated), IEND
 *   3. Write binary files
 *
 * Run:  node scripts/generate-entity-icons.js
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 32;
const CX = 15.5; // center x (between pixels 15 and 16)
const CY = 15.5; // center y

// ── Pixel buffer helpers ─────────────────────────────────────────────────────

/** Create a 32x32 RGBA buffer (all transparent). */
function createBuffer() {
  return new Uint8Array(SIZE * SIZE * 4); // RGBA, all zeros = transparent black
}

/** Set pixel at (x, y) to white (255,255,255,255). */
function setWhite(buf, x, y) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  buf[i] = 255;     // R
  buf[i + 1] = 255; // G
  buf[i + 2] = 255; // B
  buf[i + 3] = 255; // A
}

/** Fill a circle centered at (cx, cy) with radius r. */
function fillCircle(buf, cx, cy, r) {
  const r2 = r * r;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        setWhite(buf, x, y);
      }
    }
  }
}

/** Fill a rectangle from (x0,y0) to (x1,y1) inclusive. */
function fillRect(buf, x0, y0, x1, y1) {
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(SIZE - 1, Math.floor(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(SIZE - 1, Math.floor(x1)); x++) {
      setWhite(buf, x, y);
    }
  }
}

/**
 * Fill a convex polygon defined by an array of [x, y] vertices.
 * Uses scanline: for each row, find min/max x of edges, fill between.
 */
function fillPolygon(buf, vertices) {
  // Find bounding box
  let minY = SIZE, maxY = 0;
  for (const [, vy] of vertices) {
    if (vy < minY) minY = vy;
    if (vy > maxY) maxY = vy;
  }
  minY = Math.max(0, Math.floor(minY));
  maxY = Math.min(SIZE - 1, Math.ceil(maxY));

  for (let y = minY; y <= maxY; y++) {
    const scanY = y + 0.5;
    const intersections = [];
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = vertices[i];
      const [x1, y1] = vertices[(i + 1) % n];
      if ((y0 <= scanY && y1 > scanY) || (y1 <= scanY && y0 > scanY)) {
        const t = (scanY - y0) / (y1 - y0);
        intersections.push(x0 + t * (x1 - x0));
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length - 1; i += 2) {
      const xStart = Math.max(0, Math.ceil(intersections[i]));
      const xEnd = Math.min(SIZE - 1, Math.floor(intersections[i + 1]));
      for (let x = xStart; x <= xEnd; x++) {
        setWhite(buf, x, y);
      }
    }
  }
}

// ── Shape drawing ────────────────────────────────────────────────────────────

/**
 * Aircraft icon: plane silhouette pointing up (north).
 * Body: thin vertical rectangle. Wings: wide horizontal bar. Tail: smaller bar.
 */
function drawAircraft(buf) {
  // Fuselage: narrow vertical body
  fillRect(buf, 14, 3, 17, 28);

  // Nose: triangle pointing up
  fillPolygon(buf, [
    [16, 1],
    [13, 7],
    [19, 7],
  ]);

  // Main wings: wide swept-back
  fillPolygon(buf, [
    [16, 11],  // center leading edge
    [2, 18],   // left wing tip
    [6, 20],   // left trailing edge
    [16, 16],  // center trailing edge
    [26, 20],  // right trailing edge
    [30, 18],  // right wing tip
  ]);

  // Tail fins: smaller swept shape
  fillPolygon(buf, [
    [16, 24],  // center leading edge
    [8, 28],   // left tip
    [10, 30],  // left trailing
    [16, 27],  // center trailing
    [22, 30],  // right trailing
    [24, 28],  // right tip
  ]);
}

/**
 * Satellite icon: cross/plus shape with solar panels and a center body.
 * Vertical bar + horizontal bar + center circle.
 */
function drawSatellite(buf) {
  // Vertical bar (solar panel arm)
  fillRect(buf, 14, 1, 17, 30);

  // Horizontal bar (solar panel arm)
  fillRect(buf, 1, 14, 30, 17);

  // Top-left solar panel
  fillRect(buf, 4, 4, 11, 11);

  // Bottom-right solar panel
  fillRect(buf, 20, 20, 27, 27);

  // Center body (circle)
  fillCircle(buf, CX, CY, 5);
}

/**
 * Vessel icon: upward-pointing triangle/arrowhead (bow = north).
 * Classic navigation arrow shape.
 */
function drawVessel(buf) {
  // Main arrowhead triangle
  fillPolygon(buf, [
    [16, 2],   // bow (top center)
    [27, 28],  // starboard stern
    [16, 22],  // center notch
    [5, 28],   // port stern
  ]);
}

// ── PNG construction ─────────────────────────────────────────────────────────

/** CRC32 lookup table. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Write a 4-byte big-endian unsigned int into buf at offset. */
function writeU32BE(buf, offset, value) {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

/**
 * Build a PNG chunk: length (4) + type (4) + data (N) + crc (4)
 */
function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(4 + 4 + data.length + 4);
  writeU32BE(chunk, 0, data.length);
  typeBytes.copy(chunk, 4);
  Buffer.from(data).copy(chunk, 8);
  // CRC covers type + data
  const crcData = Buffer.alloc(4 + data.length);
  typeBytes.copy(crcData, 0);
  Buffer.from(data).copy(crcData, 4);
  writeU32BE(chunk, 8 + data.length, crc32(crcData));
  return chunk;
}

/**
 * Build a minimal valid PNG file from a 32x32 RGBA pixel buffer.
 * PNG spec: signature + IHDR + IDAT + IEND
 */
function buildPNG(pixelBuf) {
  // PNG signature (8 bytes)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: width=32, height=32, bit depth=8, color type=6 (RGBA)
  const ihdrData = Buffer.alloc(13);
  writeU32BE(ihdrData, 0, SIZE);  // width
  writeU32BE(ihdrData, 4, SIZE);  // height
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = pngChunk("IHDR", ihdrData);

  // IDAT: raw image data with filter byte (0 = None) prepended to each row
  // Then zlib-compress the whole thing
  const rawRows = Buffer.alloc(SIZE * (1 + SIZE * 4));
  for (let y = 0; y < SIZE; y++) {
    const rowOffset = y * (1 + SIZE * 4);
    rawRows[rowOffset] = 0; // filter: None
    for (let x = 0; x < SIZE; x++) {
      const srcIdx = (y * SIZE + x) * 4;
      const dstIdx = rowOffset + 1 + x * 4;
      rawRows[dstIdx] = pixelBuf[srcIdx];     // R
      rawRows[dstIdx + 1] = pixelBuf[srcIdx + 1]; // G
      rawRows[dstIdx + 2] = pixelBuf[srcIdx + 2]; // B
      rawRows[dstIdx + 3] = pixelBuf[srcIdx + 3]; // A
    }
  }
  const compressed = zlib.deflateSync(rawRows);
  const idat = pngChunk("IDAT", compressed);

  // IEND chunk (empty)
  const iend = pngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const outDir = path.resolve(__dirname, "..", "public", "crep", "icons");

  // Ensure output directory exists
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const icons = [
    { name: "aircraft", draw: drawAircraft },
    { name: "satellite", draw: drawSatellite },
    { name: "vessel", draw: drawVessel },
  ];

  for (const { name, draw } of icons) {
    const buf = createBuffer();
    draw(buf);
    const png = buildPNG(buf);
    const outPath = path.join(outDir, `${name}.png`);
    fs.writeFileSync(outPath, png);
    console.log(`  ${name}.png  (${png.length} bytes) -> ${outPath}`);
  }

  console.log("\nAll entity icon PNGs generated successfully.");
}

main();
