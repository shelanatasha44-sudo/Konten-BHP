// Membuat public/img/logo.svg dan public/img/logo.png dari logo geometris di alat/logo.mjs
// Jalankan: node alat/buat-logo.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { logoSvg } from './logo.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const svg = logoSvg();
fs.writeFileSync(new URL('../public/img/logo.svg', import.meta.url), svg);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 167, height: 183 }, deviceScaleFactor: 480 / 167 });
await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await p.screenshot({ path: new URL('../public/img/logo.png', import.meta.url).pathname, omitBackground: true });
await b.close();
console.log('ok');
