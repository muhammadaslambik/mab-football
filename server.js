// Server statis kecil tanpa dependensi (tidak perlu npm install).
// Jalankan: npm start  ->  buka http://localhost:8080
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
};

// Hanya folder/file yang memang bagian dari game yang boleh diakses browser.
const PUBLIC = ['index.html', 'css', 'src', 'assets', 'vendor'];

// Three.js: pakai file lokal vendor/three.module.js bila ada (offline, `npm run vendor`);
// bila belum ada, browser diarahkan ke CDN (butuh internet).
const THREE_VERSION = '0.160.1';
const THREE_CDN = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js`;

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.resolve(ROOT, '.' + urlPath);
  const rel = path.relative(ROOT, filePath);
  const top = rel.split(path.sep)[0];
  if (rel.startsWith('..') || path.isAbsolute(rel) || !PUBLIC.includes(top)) {
    res.writeHead(404).end('Not found');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err && urlPath === '/vendor/three.module.js') {
      res.writeHead(302, { Location: THREE_CDN, 'Cache-Control': 'no-store' }).end();
      return;
    }
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store', // selalu muat ulang saat kode diedit
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('MAB-Football berjalan di  http://localhost:' + PORT);
  console.log('Tekan Ctrl+C untuk berhenti.');
});
