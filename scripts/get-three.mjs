// Mengunduh Three.js ke vendor/three.module.js supaya game bisa jalan tanpa internet.
// Jalankan sekali: npm run vendor
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.160.1';
const URL_ = `https://cdn.jsdelivr.net/npm/three@${VERSION}/build/three.module.js`;
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'vendor', 'three.module.js');

const res = await fetch(URL_);
if (!res.ok) {
  console.error('Gagal mengunduh Three.js:', res.status, res.statusText);
  process.exit(1);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
console.log(`Tersimpan: vendor/three.module.js (Three.js r${VERSION.split('.')[1]})`);
