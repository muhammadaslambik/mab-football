// Loader Node untuk tes: mengganti modul 'three' dengan tiruan (Proxy) agar kode render3d
// bisa dijalankan tanpa Three.js asli dan tanpa GPU. Hanya menangkap kesalahan struktur kode
// (variabel/impor salah, urutan, dll) - BUKAN kebenaran API Three.js atau tampilan visual.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'render3d');

export function usedNames() {
  const names = new Set();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/THREE\.([A-Za-z0-9_]+)/g)) names.add(m[1]);
  }
  return [...names];
}

export async function resolve(specifier, context, next) {
  if (specifier === 'three') return { url: 'mock:three', shortCircuit: true };
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url !== 'mock:three') return next(url, context);
  const names = usedNames();
  const source = `
    function any() {
      const f = function () {};
      return new Proxy(f, {
        get(t, p) {
          if (p === Symbol.toPrimitive) return () => 0;
          if (p === 'then') return undefined;
          if (!(p in t)) t[p] = any();
          return t[p];
        },
        set(t, p, v) { t[p] = v; return true; },
        apply() { return any(); },
        construct() { return any(); },
      });
    }
    ${names.map((n) => `export const ${n} = any();`).join('\n')}
  `;
  return { format: 'module', source, shortCircuit: true };
}
