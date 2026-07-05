// build.mjs
// ------------------------------------------------------------------
// Packages the extension into a single .zip file ready to upload to the
// Chrome Web Store or Firefox Add-ons.
//
// Run it with:   node scripts/build.mjs
// Output:        dist/quick-capture-v<version>.zip
//
// It only includes the files the extension actually needs (manifest,
// icons, and src/) — not the README, screenshots, or this script.
//
// The .zip is written using only Node's built-in modules, so there's
// nothing to install first.
// ------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Which files/folders go into the package.
const INCLUDE = ["manifest.json", "icons", "src"];

// ---- Gather the list of files to include -------------------------------
function walk(rel, out = []) {
  const abs = path.join(ROOT, rel);
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(abs).sort()) walk(path.join(rel, name), out);
  } else {
    out.push(rel.split(path.sep).join("/")); // use forward slashes inside the zip
  }
  return out;
}

const files = [];
for (const entry of INCLUDE) walk(entry, files);

// ---- Minimal ZIP writer (deflate) --------------------------------------
// A .zip is a series of "local file" records followed by a "central
// directory" that indexes them. We build both by hand.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const localParts = [];
const centralParts = [];
let offset = 0;

for (const name of files) {
  const data = fs.readFileSync(path.join(ROOT, name));
  const compressed = zlib.deflateRawSync(data, { level: 9 });
  const crc = crc32(data);
  const nameBuf = Buffer.from(name, "utf8");

  // Local file header (signature 0x04034b50).
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0, 6); // flags
  local.writeUInt16LE(8, 8); // method: deflate
  local.writeUInt16LE(0, 10); // mod time
  local.writeUInt16LE(0x21, 12); // mod date (arbitrary valid date)
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28); // extra length
  localParts.push(local, nameBuf, compressed);

  // Central directory record (signature 0x02014b50).
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6); // version needed
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0x21, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30); // extra
  central.writeUInt16LE(0, 32); // comment
  central.writeUInt16LE(0, 34); // disk number
  central.writeUInt16LE(0, 36); // internal attrs
  central.writeUInt32LE(0, 38); // external attrs
  central.writeUInt32LE(offset, 42); // offset of local header
  centralParts.push(central, nameBuf);

  offset += local.length + nameBuf.length + compressed.length;
}

const centralBuf = Buffer.concat(centralParts);
const localBuf = Buffer.concat(localParts);

// End of central directory record (signature 0x06054b50).
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(localBuf.length, 16);
end.writeUInt16LE(0, 20);

const zip = Buffer.concat([localBuf, centralBuf, end]);

// ---- Write it out ------------------------------------------------------
const version = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8")).version;
const distDir = path.join(ROOT, "dist");
fs.mkdirSync(distDir, { recursive: true });
const outPath = path.join(distDir, `quick-capture-v${version}.zip`);
fs.writeFileSync(outPath, zip);

console.log(`✓ Packaged ${files.length} files → dist/quick-capture-v${version}.zip (${(zip.length / 1024).toFixed(1)} KB)`);
