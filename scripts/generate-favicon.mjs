import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const COLOR = { r: 229, g: 93, b: 0 };
const SIZES = [16, 32, 48, 64, 128, 256];
const outputPath = resolve("public", "favicon.ico");

function makeCrcTable() {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }

  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function createCirclePng(size) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  const center = (size - 1) / 2;
  const radius = size * 0.34;

  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * (stride + 1);
    raw[rowOffset] = 0;

    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt((dx * dx) + (dy * dy));
      const coverage = Math.max(0, Math.min(1, radius + 0.5 - distance));
      const pixelOffset = rowOffset + 1 + (x * 4);

      raw[pixelOffset] = COLOR.r;
      raw[pixelOffset + 1] = COLOR.g;
      raw[pixelOffset + 2] = COLOR.b;
      raw[pixelOffset + 3] = Math.round(coverage * 255);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(images.length * 16);
  let offset = header.length + directory.length;

  images.forEach((image, index) => {
    const entryOffset = index * 16;

    directory[entryOffset] = image.size === 256 ? 0 : image.size;
    directory[entryOffset + 1] = image.size === 256 ? 0 : image.size;
    directory[entryOffset + 2] = 0;
    directory[entryOffset + 3] = 0;
    directory.writeUInt16LE(1, entryOffset + 4);
    directory.writeUInt16LE(32, entryOffset + 6);
    directory.writeUInt32LE(image.png.length, entryOffset + 8);
    directory.writeUInt32LE(offset, entryOffset + 12);

    offset += image.png.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.png)]);
}

mkdirSync(dirname(outputPath), { recursive: true });

const images = SIZES.map((size) => ({ size, png: createCirclePng(size) }));
writeFileSync(outputPath, createIco(images));

console.log(`Wrote ${outputPath} with sizes: ${SIZES.join(", ")}`);
