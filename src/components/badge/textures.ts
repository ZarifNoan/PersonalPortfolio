import * as THREE from 'three';
import { initials } from '../../lib/initials';
import { faceLines } from '../../lib/badgeText';

/** Site accents (global.css --sw / --viz): the card's stripes and the strap's marks use the two sides' colours. */
const SW = '#60a5fa', VIZ = '#f59e0b', INK = '#0b0b14', NAVY = '#1b1838';

/** Card face canvas size: CARD_W × CARD_H minus the rounded corners (1.08 × 1.56 world), at ~950 px per world unit.
 *  On a 1440×900 screen the face is ~168 CSS px wide, so 1 CSS px ≈ 6 canvas px: text below ~55px here is too small to
 *  read. BadgeStatic mirrors this layout in CSS (container units; 1cqw = 10.24 canvas px). */
export const FACE_W = 1024, FACE_H = 1480;

/** Fonts the canvases use. Canvas text doesn't trigger font loading, so load the exact faces before drawing. */
const FONTS = ['800 92px "Sora Variable"', '700 64px "Sora Variable"', '650 60px "Inter Variable"'];
const fontsReady = () => (typeof document === 'undefined' ? Promise.resolve() : Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => undefined, () => undefined));

export async function cardFaceTexture(name: string, role: string, photo: string | null, label: string): Promise<THREE.CanvasTexture> {
  const c = document.createElement('canvas');
  c.width = FACE_W; c.height = FACE_H;
  const g = c.getContext('2d')!;
  await fontsReady();
  const W = FACE_W, H = FACE_H, cx = W / 2;
  const lines = faceLines(name, role);
  g.textAlign = 'center';

  // Paper: a soft cool white.
  const paper = g.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, '#fcfcff'); paper.addColorStop(1, '#ececf5');
  g.fillStyle = paper; g.fillRect(0, 0, W, H);

  // Header: ink band with the punched slot the clip goes through and the two sides' marks; stripes under it.
  g.fillStyle = INK; g.fillRect(0, 0, W, 200);
  g.fillStyle = '#2a2a40'; roundRect(g, cx - 100, 36, 200, 36, 18); g.fill();
  g.font = '700 64px "Sora Variable", sans-serif'; g.textBaseline = 'middle';
  g.fillStyle = SW; g.textAlign = 'left'; g.fillText('</>', 64, 136);
  g.fillStyle = VIZ; g.textAlign = 'right'; g.fillText('◇', W - 64, 136);
  g.textAlign = 'center';
  g.fillStyle = SW; g.fillRect(0, 200, W / 2, 16);
  g.fillStyle = VIZ; g.fillRect(W / 2, 200, W / 2, 16);

  // Photo or monogram, in a ring.
  const cy = 440, r = 165;
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
    g.fillStyle = '#f5f5ff'; g.font = '800 120px "Sora Variable", sans-serif'; g.textBaseline = 'middle';
    g.fillText(initials(name), cx, cy + 6);
  }
  g.restore();
  g.lineWidth = 10; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, r + 5, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.strokeStyle = 'rgba(11,11,20,.16)'; g.beginPath(); g.arc(cx, cy, r + 12, 0, Math.PI * 2); g.stroke();

  // Name: given names large on two lines, the patronymic smaller and spaced; a hairline; the role on two lines.
  g.textBaseline = 'alphabetic'; g.fillStyle = INK;
  lines.name.forEach((t, i) => { g.font = '800 92px "Sora Variable", sans-serif'; fit(g, t, 880); g.fillText(t, cx, 742 + i * 98); });
  let y = 742 + (lines.name.length - 1) * 98;
  if (lines.sub) {
    g.font = '700 56px "Sora Variable", sans-serif'; g.fillStyle = '#33364f';
    y += 84; spaced(g, lines.sub, cx, y, 6);
  }
  y += 52; g.fillStyle = 'rgba(11,11,20,.22)'; g.fillRect(cx - 60, y, 120, 5);
  g.font = '650 60px "Inter Variable", sans-serif'; g.fillStyle = '#2a1f6b';
  lines.role.forEach((t, i) => { fit(g, t, 920); g.fillText(t, cx, y + 92 + i * 74); });

  // Footer: stripes over an ink band with the strap's label.
  g.fillStyle = SW; g.fillRect(0, 1262, W / 2, 16);
  g.fillStyle = VIZ; g.fillRect(W / 2, 1262, W / 2, 16);
  g.fillStyle = INK; g.fillRect(0, 1278, W, H - 1278);
  g.fillStyle = '#d6d8ee'; g.font = '700 56px "Sora Variable", sans-serif'; g.textBaseline = 'middle';
  spaced(g, label.toUpperCase(), cx, 1380, 10);

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
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  drawStrap(c, label);
  // Redraw once the fonts have loaded (the card face waits for the same fonts, so this lands before the scene shows).
  fontsReady().then(() => { drawStrap(c, label); tex.needsUpdate = true; });
  return tex;
}

function drawStrap(c: HTMLCanvasElement, label: string) {
  const w = c.width, h = c.height;
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
