import * as THREE from 'three';
import { initials } from '../../lib/initials';

/** Site accents (global.css --sw / --viz): the card's stripes and the strap's marks use the two sides' colours. */
const SW = '#60a5fa', VIZ = '#f59e0b', INK = '#0b0b14', NAVY = '#1b1838';

/** Card face canvas size: CARD_W × CARD_H minus the rounded corners (1.08 × 1.56 world), at ~950 px per world unit. */
export const FACE_W = 1024, FACE_H = 1480;

export async function cardFaceTexture(name: string, role: string, photo: string | null): Promise<THREE.CanvasTexture> {
  const c = document.createElement('canvas');
  c.width = FACE_W; c.height = FACE_H;
  const g = c.getContext('2d')!;
  await document.fonts.ready;
  const W = FACE_W, H = FACE_H, cx = W / 2;
  g.textAlign = 'center';

  // Paper: a soft cool white with a faint diagonal sheen.
  const paper = g.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, '#fbfbff'); paper.addColorStop(.55, '#f1f1f8'); paper.addColorStop(1, '#e4e4f0');
  g.fillStyle = paper; g.fillRect(0, 0, W, H);

  // Header band with the punched slot the clip goes through, the brand marks and the two-side stripes under it.
  const HEAD = 230;
  g.fillStyle = INK; g.fillRect(0, 0, W, HEAD);
  g.fillStyle = '#26263a'; roundRect(g, cx - 110, 46, 220, 40, 20); g.fill();
  g.font = '700 54px "Sora Variable", sans-serif'; g.textBaseline = 'middle';
  g.fillStyle = SW; g.textAlign = 'left'; g.fillText('</>', 64, 160);
  g.fillStyle = VIZ; g.textAlign = 'right'; g.fillText('◇', W - 64, 160);
  g.textAlign = 'center'; g.fillStyle = '#c4c6e0'; g.font = '600 34px "Sora Variable", sans-serif';
  spaced(g, 'PORTFOLIO', cx, 162, 10);
  g.fillStyle = SW; g.fillRect(0, HEAD, W / 2, 14);
  g.fillStyle = VIZ; g.fillRect(W / 2, HEAD, W / 2, 14);

  // Photo or monogram, in a ring.
  const cy = 520, r = 210;
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  let drewPhoto = false;
  if (photo) {
    try {
      const img = new Image(); img.src = photo; await img.decode();
      const s = Math.max((2 * r) / img.width, (2 * r) / img.height);
      g.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
      drewPhoto = true;
    } catch { /* fall through to monogram */ }
  }
  if (!drewPhoto) {
    const mg = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    mg.addColorStop(0, '#3b2a7a'); mg.addColorStop(1, '#0e4a5a');
    g.fillStyle = mg; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    g.fillStyle = '#f5f5ff'; g.font = '800 150px "Sora Variable", sans-serif'; g.textBaseline = 'middle';
    g.fillText(initials(name), cx, cy + 8);
  }
  g.restore();
  g.lineWidth = 10; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, r + 5, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.strokeStyle = 'rgba(11,11,20,.14)'; g.beginPath(); g.arc(cx, cy, r + 12, 0, Math.PI * 2); g.stroke();

  // Name: the given names large, the patronymic smaller and spaced; then the role.
  const words = name.toUpperCase().split(' ');
  g.textBaseline = 'alphabetic'; g.fillStyle = INK;
  g.font = '800 70px "Sora Variable", sans-serif';
  fit(g, words.slice(0, 3).join(' '), 900);
  g.fillText(words.slice(0, 3).join(' '), cx, 900);
  g.font = '700 42px "Sora Variable", sans-serif'; g.fillStyle = '#464a68';
  spaced(g, words.slice(3).join(' '), cx, 968, 8);
  g.fillStyle = 'rgba(11,11,20,.18)'; g.fillRect(cx - 60, 1030, 120, 4);
  g.font = '650 46px "Inter Variable", sans-serif'; g.fillStyle = '#2f2270';
  fit(g, role, 900);
  g.fillText(role, cx, 1110);

  // Footer: the two sides' stripes.
  g.fillStyle = INK; g.fillRect(0, H - 120, W, 120);
  g.fillStyle = SW; g.fillRect(0, H - 134, W / 2, 14);
  g.fillStyle = VIZ; g.fillRect(W / 2, H - 134, W / 2, 14);
  g.fillStyle = '#b4b7d4'; g.font = '700 32px "Inter Variable", sans-serif'; g.textBaseline = 'middle';
  spaced(g, 'SOFTWARE  ·  3D VISUALIZATION', cx, H - 60, 4);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

/** Strap canvas: one tile of the repeating woven band. Width:height must match STRAP_TILE_ASPECT so the text keeps its
 *  proportions on the strap (Lanyard.tsx sizes the repeat from it). */
export const STRAP_TILE_ASPECT = 8;
export function strapTexture(label: string): THREE.CanvasTexture {
  const h = 256, w = h * STRAP_TILE_ASPECT;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  // Base fabric with a faint lengthwise sheen.
  const base = g.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#15132b'); base.addColorStop(.5, NAVY); base.addColorStop(1, '#15132b');
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  // Weave: fine alternating diagonal threads.
  g.lineWidth = 2;
  for (let x = -h; x < w + h; x += 8) {
    g.strokeStyle = (x / 8) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.12)';
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h * .35, h); g.stroke();
  }
  // Woven selvedge edges with a running stitch.
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 0, w, 22); g.fillRect(0, h - 22, w, 22);
  g.strokeStyle = 'rgba(196,198,224,.55)'; g.lineWidth = 4; g.setLineDash([22, 14]);
  for (const y of [32, h - 32]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.setLineDash([]);
  // Label and marks. Drawn rotated 180° so on the strap they read bottom-to-top, like the static badge: the strap's
  // texture runs from u=1 at the ring to u≈0.15 at the top (negative repeat), so in this rotated frame x = (1 − u)·w.
  // The label sits nearest the ring (u ≈ 0.42–0.98), the part of the strap that is on screen on desktop.
  g.save(); g.translate(w, h); g.rotate(Math.PI);
  g.textBaseline = 'middle'; g.textAlign = 'center';
  const mid = h / 2 + 4;
  g.font = '800 104px "Sora Variable", sans-serif';
  g.fillStyle = '#eef0ff';
  spaced(g, label.toUpperCase(), w * .3, mid, 14);
  g.font = '700 92px "Sora Variable", sans-serif';
  g.fillStyle = SW; g.fillText('</>', w * .7, mid);
  g.fillStyle = VIZ; g.fillText('◇', w * .82, mid);
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

/** Glossy highlight for the clear sleeve's front: soft diagonal light bands, transparent elsewhere, inside the
 *  sleeve's rounded outline. */
export function sheenTexture(aspect: number, radius: number): THREE.CanvasTexture {
  const w = 512, h = Math.round(w * aspect);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  roundRect(g, 0, 0, w, h, radius * w); g.clip();
  const band = g.createLinearGradient(0, 0, w, h * .55);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(.28, 'rgba(255,255,255,.0)');
  band.addColorStop(.36, 'rgba(255,255,255,.2)');
  band.addColorStop(.46, 'rgba(255,255,255,.04)');
  band.addColorStop(.52, 'rgba(255,255,255,.1)');
  band.addColorStop(.58, 'rgba(255,255,255,0)');
  g.fillStyle = band; g.fillRect(0, 0, w, h);
  // A thin bright rim, as light catches the sleeve's edge.
  g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.22)';
  roundRect(g, 3, 3, w - 6, h - 6, radius * w - 3); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
/** Letter-spaced text centred on x (canvas letterSpacing isn't available everywhere). */
function spaced(g: CanvasRenderingContext2D, text: string, x: number, y: number, gap: number) {
  const chars = [...text];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  const align = g.textAlign;
  g.textAlign = 'left';
  let cur = x - total / 2;
  chars.forEach((ch, i) => { g.fillText(ch, cur, y); cur += widths[i]! + gap; });
  g.textAlign = align;
}
/** Shrinks the current font until text fits maxW. */
function fit(g: CanvasRenderingContext2D, text: string, maxW: number) {
  let m = /(\d+)px/.exec(g.font), size = m ? +m[1]! : 40;
  while (g.measureText(text).width > maxW && size > 20) { size -= 2; g.font = g.font.replace(/\d+px/, `${size}px`); }
}
