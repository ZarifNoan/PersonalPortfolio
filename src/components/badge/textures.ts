import * as THREE from 'three';
import { initials } from '../../lib/initials';
import { faceLines } from '../../lib/badgeText';
import { STATIC_CARD_H, STATIC_CARD_W } from './anchor';

/** Site accents (global.css --sw / --viz): the card's stripes and the strap's marks use the two sides' colours. */
const SW = '#60a5fa', VIZ = '#f59e0b', INK = '#0b0b14', NAVY = '#1b1838';

/** The static badge's card in CSS px (global.css .badge-card / .badge-face): a 210 × 294 clear sleeve (radius 16) with
 *  the printed face inset 7px (radius 10). The 3D card reproduces these proportions exactly (Lanyard.tsx), so the
 *  textures below are laid out in the same units. */
export const BADGE = { w: STATIC_CARD_W, h: STATIC_CARD_H, r: 16, inset: 7, faceR: 10 } as const;
const FACE_CSS_W = BADGE.w - 2 * BADGE.inset, FACE_CSS_H = BADGE.h - 2 * BADGE.inset; // 196 × 280

/** Card face layout units: the face is 1024 units wide (BadgeStatic mirrors this layout in CSS container units,
 *  1cqw = 10.24 units) and 1024 × 280 / 196 = 1463 tall, the static face's aspect. */
export const FACE_W = 1024, FACE_H = Math.round((FACE_W * FACE_CSS_H) / FACE_CSS_W);

/** Fonts the canvases use. Canvas text doesn't trigger font loading, so load the exact faces before drawing. */
const FONTS = ['800 92px "Sora Variable"', '700 64px "Sora Variable"', '650 60px "Inter Variable"'];
const fontsReady = () => (typeof document === 'undefined' ? Promise.resolve() : Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => undefined, () => undefined));

/** A canvas texture shown 1:1 on screen: sampled without mipmaps, so text isn't averaged into the paper (6:1
 *  minification through trilinear mipmaps is what thinned and greyed the face text). */
function screenTexture(c: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  return tex;
}

/**
 * The printed card face, drawn at `scale` canvas px per static-badge CSS px (Lanyard passes the card's on-screen
 * size × DPR, so the texture maps 1:1 to device pixels at rest, like the static badge's DOM text). Corners outside the
 * face's rounded rect are transparent.
 */
export async function cardFaceTexture(name: string, role: string, photo: string | null, label: string, scale: number): Promise<THREE.CanvasTexture> {
  const c = document.createElement('canvas');
  c.width = Math.round(FACE_CSS_W * scale); c.height = Math.round(FACE_CSS_H * scale);
  const g = c.getContext('2d')!;
  await fontsReady();
  g.setTransform(c.width / FACE_W, 0, 0, c.height / FACE_H, 0, 0);
  const W = FACE_W, H = FACE_H, cx = W / 2;
  const lines = faceLines(name, role);
  roundRect(g, 0, 0, W, H, (BADGE.faceR / FACE_CSS_W) * W); g.clip();
  g.textAlign = 'center';

  // Paper: global.css .badge-face linear-gradient(170deg, #fcfcff, #ececf5).
  const paper = cssGradient(g, 170, 0, 0, W, H);
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

  return screenTexture(c);
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

/**
 * The clear sleeve's front, drawn from global.css .badge-card at `scale` canvas px per CSS px (210 × 294 CSS px): the
 * faint glossy frame around the face (its background gradients, translucent so the dark page shows through, as it
 * does around the static card), the 1px light edge and inner top highlight, and the glare over the face's top-left
 * (.badge-card::after).
 */
export function sleeveTexture(scale: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = Math.round(BADGE.w * scale); c.height = Math.round(BADGE.h * scale);
  const g = c.getContext('2d')!;
  g.setTransform(c.width / BADGE.w, 0, 0, c.height / BADGE.h, 0, 0);
  const { w, h, r, inset, faceR } = BADGE;
  // background: linear-gradient(150deg, …), rgba(220,224,240,.08). Only the frame shows it (the face covers the rest).
  g.save();
  g.beginPath(); addRoundRect(g, 0, 0, w, h, r); addRoundRect(g, inset, inset, w - 2 * inset, h - 2 * inset, faceR);
  g.clip('evenodd');
  g.fillStyle = 'rgba(220,224,240,.08)'; g.fillRect(0, 0, w, h);
  const bg = cssGradient(g, 150, 0, 0, w, h);
  bg.addColorStop(0, 'rgba(255,255,255,.34)'); bg.addColorStop(.4, 'rgba(255,255,255,.08)'); bg.addColorStop(1, 'rgba(255,255,255,.18)');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.restore();
  // border: 1px solid rgba(255,255,255,.35)
  g.beginPath(); addRoundRect(g, 0, 0, w, h, r); addRoundRect(g, 1, 1, w - 2, h - 2, r - 1);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fill('evenodd');
  // box-shadow: inset 0 1px 0 rgba(255,255,255,.5): the padding box minus itself shifted down 1px.
  g.save(); g.beginPath(); addRoundRect(g, 1, 1, w - 2, h - 2, r - 1); g.clip();
  g.beginPath(); addRoundRect(g, 1, 1, w - 2, h - 2, r - 1); addRoundRect(g, 1, 2, w - 2, h - 2, r - 1);
  g.fillStyle = 'rgba(255,255,255,.5)'; g.fill('evenodd');
  g.restore();
  // ::after: linear-gradient(115deg, rgba(255,255,255,.3) 0 16%, transparent 28%) over the face.
  g.save(); roundRect(g, inset, inset, w - 2 * inset, h - 2 * inset, faceR); g.clip();
  const glare = cssGradient(g, 115, inset, inset, w - 2 * inset, h - 2 * inset);
  glare.addColorStop(0, 'rgba(255,255,255,.3)'); glare.addColorStop(.16, 'rgba(255,255,255,.3)'); glare.addColorStop(.28, 'rgba(255,255,255,0)');
  g.fillStyle = glare; g.fillRect(0, 0, w, h);
  g.restore();
  return screenTexture(c);
}

/** CSS px the drop-shadow texture extends past the sleeve: left/right, top, bottom. */
export const SHADOW_PAD = { side: 64, top: 40, bottom: 100 } as const;
/** The static card's drop shadow (box-shadow: 0 30px 60px rgba(0,0,0,.55)), cut out under the card as CSS clips it.
 *  Covers the sleeve plus SHADOW_PAD. */
export function shadowTexture(scale: number): THREE.CanvasTexture {
  const { w, h, r } = BADGE, { side, top, bottom } = SHADOW_PAD;
  const W = w + 2 * side, H = h + top + bottom;
  const c = document.createElement('canvas');
  c.width = Math.round(W * scale); c.height = Math.round(H * scale);
  const g = c.getContext('2d')!;
  const s = c.width / W;
  // Draw the shape off-canvas so only its shadow lands. Canvas shadows ignore the transform, so work in canvas px;
  // shadowBlur, like the CSS blur radius, is 2σ.
  const off = c.width + 1000;
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 60 * s; g.shadowOffsetX = off; g.shadowOffsetY = 30 * s;
  g.fillStyle = '#000';
  g.beginPath(); addRoundRect(g, side * s - off, top * s, w * s, h * s, r * s); g.fill();
  g.shadowColor = 'transparent';
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); addRoundRect(g, side * s, top * s, w * s, h * s, r * s); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); addRoundRect(g, x, y, w, h, r);
}
function addRoundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
/** A gradient matching CSS linear-gradient(<deg>) over the box: the gradient line passes through the box's centre at
 *  that angle (0deg = to top, clockwise), just long enough that the far corners sit at 0% and 100%. */
function cssGradient(g: CanvasRenderingContext2D, deg: number, x: number, y: number, w: number, h: number) {
  const a = (deg * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2, cx = x + w / 2, cy = y + h / 2;
  return g.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
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
