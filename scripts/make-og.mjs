// Regenerates the 1200×630 link-preview image: node scripts/make-og.mjs
// Written as JPEG (~100 KB); a PNG screenshot of the render is ~450 KB, too heavy for link previews.
import { chromium } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';

const img = readFileSync('src/assets/images/moltech-johor-warehouse/01-iso-tank-forklifts.png').toString('base64');
const html = `<!doctype html><html><body style="margin:0;width:1200px;height:630px;background:radial-gradient(circle at 85% 0%,#3b2a7a 0,transparent 45%),radial-gradient(circle at 0% 100%,#0e4a5a 0,transparent 45%),#0b0b14;color:#f5f5ff;font-family:Arial,sans-serif;display:flex;align-items:center;gap:40px;padding:0 60px;box-sizing:border-box">
<div style="flex:1"><div style="font-size:22px;color:#c4c6e0;margin-bottom:18px">&lt;/&gt; Software Development &nbsp;·&nbsp; ◇ 3D Visualization</div>
<div style="font-size:54px;font-weight:800;line-height:1.1">Muhammad Zarif Nurhan<br>Bin Mohd Arifin</div>
<div style="font-size:26px;color:#c4c6e0;margin-top:20px">Computer Science student who builds software and 3D spaces.</div></div>
<img src="data:image/png;base64,${img}" style="width:440px;height:440px;object-fit:cover;border-radius:24px;border:1px solid rgba(255,255,255,.18)"></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: 'public/og.jpg', type: 'jpeg', quality: 85 });
await browser.close();
console.log(`public/og.jpg written (${Math.round(statSync('public/og.jpg').size / 1024)} KB)`);
