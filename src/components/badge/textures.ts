import * as THREE from 'three';
import { initials } from '../../lib/initials';
import { roleLines } from '../../lib/badgeText';
import { BADGE, FACE } from './face';

/** Site accents (global.css --sw / --viz): the card's stripes and the strap's marks use the two sides' colours. */
const SW = '#60a5fa', VIZ = '#f59e0b', INK = '#0b0b14', NAVY = '#1b1838';

/** Fonts the canvases use. Canvas text doesn't trigger font loading, so load the exact faces before drawing. */
const FONTS = ['800 46px "Sora Variable"', '700 12px "Sora Variable"', '650 14px "Inter Variable"'];
const fontsReady = () => (typeof document === 'undefined' ? Promise.resolve() : Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => undefined, () => undefined));

/** A canvas texture shown 1:1 on screen: sampled without mipmaps, so text isn't averaged into the paper (6:1
 *  minification through trilinear mipmaps is what thinned and greyed the face text). */
function screenTexture(c: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** Loads and decodes the badge photo; null if it fails (the face then shows the monogram, as with no photo). */
async function loadPhoto(src: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image(); img.decoding = 'async'; img.src = src; await img.decode();
    return img;
  } catch { return null; }
}

/**
 * The printed card face, drawn at `scale` canvas px per static-badge CSS px (Lanyard passes the card's on-screen
 * size × DPR, so the texture maps 1:1 to device pixels at rest, like the static badge's DOM). The layout is face.ts
 * FACE in CSS px, the same numbers global.css gives the static face. Corners outside the face's rounded rect are
 * transparent. Resolves only once the photo has decoded and been drawn, so the 3D card is never revealed without it.
 */
export async function cardFaceTexture(name: string, role: string, photo: string | null, label: string, scale: number): Promise<THREE.CanvasTexture> {
  const c = document.createElement('canvas');
  c.width = Math.round(FACE.w * scale); c.height = Math.round(FACE.h * scale);
  const g = c.getContext('2d')!;
  const [img] = await Promise.all([photo ? loadPhoto(photo) : null, fontsReady()]);
  g.setTransform(c.width / FACE.w, 0, 0, c.height / FACE.h, 0, 0);
  const W = FACE.w, H = FACE.h, cx = W / 2;
  roundRect(g, 0, 0, W, H, FACE.r); g.clip();
  g.textAlign = 'center';

  // Paper: global.css .badge-face linear-gradient(170deg, #fcfcff, #ececf5) (the photo covers it between the bands).
  const paper = cssGradient(g, 170, 0, 0, W, H);
  paper.addColorStop(0, '#fcfcff'); paper.addColorStop(1, '#ececf5');
  g.fillStyle = paper; g.fillRect(0, 0, W, H);

  // Header: ink band with the punched slot the clip goes through and the two sides' marks; stripes under it.
  g.fillStyle = INK; g.fillRect(0, 0, W, FACE.head);
  g.fillStyle = '#2a2a40'; roundRect(g, cx - FACE.slot.w / 2, FACE.slot.top, FACE.slot.w, FACE.slot.h, FACE.slot.h / 2); g.fill();
  g.font = `700 ${FACE.mark.size}px "Sora Variable", sans-serif`;
  g.fillStyle = SW; g.textAlign = 'left'; lineText(g, '</>', FACE.mark.inset, FACE.mark.top, FACE.mark.size);
  g.fillStyle = VIZ; g.textAlign = 'right'; lineText(g, '◇', W - FACE.mark.inset, FACE.mark.top, FACE.mark.size);
  g.textAlign = 'center';
  stripes(g, FACE.head);

  // The photo, full-bleed between the stripes (object-fit: cover, centred), or the monogram on the site's gradient.
  const top = FACE.photo.top, bh = FACE.photo.bottom - top;
  if (img) {
    const s = Math.max(W / img.naturalWidth, bh / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    g.save(); g.beginPath(); g.rect(0, top, W, bh); g.clip();
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, (W - dw) / 2, top + (bh - dh) / 2, dw, dh);
    g.restore();
  } else {
    const mg = cssGradient(g, 135, 0, top, W, bh);
    mg.addColorStop(0, '#3b2a7a'); mg.addColorStop(1, '#0e4a5a');
    g.fillStyle = mg; g.fillRect(0, top, W, bh);
    g.fillStyle = '#f5f5ff'; g.font = `800 ${FACE.mono.size}px "Sora Variable", sans-serif`;
    lineText(g, initials(name), cx, FACE.mono.top, FACE.mono.size);
  }

  // White fade rising over the lower photo, and the role on it.
  const fadeTop = FACE.photo.bottom - FACE.fade.h;
  const fade = g.createLinearGradient(0, fadeTop, 0, FACE.photo.bottom);
  for (const [at, a] of FACE.fade.stops) fade.addColorStop(at, `rgba(255,255,255,${a})`);
  g.fillStyle = fade; g.fillRect(0, fadeTop, W, FACE.fade.h);
  g.font = `650 ${FACE.role.size}px "Inter Variable", sans-serif`; g.fillStyle = FACE.role.color;
  roleLines(role).forEach((t, i) => lineText(g, t, cx, FACE.role.top + i * FACE.role.lh, FACE.role.lh));

  // Footer: stripes over an ink band with the strap's label.
  stripes(g, FACE.foot.top);
  g.fillStyle = INK; g.fillRect(0, FACE.foot.top + FACE.stripe, W, H - FACE.foot.top - FACE.stripe);
  g.fillStyle = FACE.label.color; g.font = `700 ${FACE.label.size}px "Sora Variable", sans-serif`;
  spacedLine(g, label.toUpperCase(), cx, FACE.label.top, FACE.label.size, FACE.label.spacing);

  return screenTexture(c);
}

/** The blue/amber accent stripe (global.css border-image: linear-gradient(90deg, --sw 50%, --viz 50%)). */
function stripes(g: CanvasRenderingContext2D, y: number) {
  g.fillStyle = SW; g.fillRect(0, y, FACE.w / 2, FACE.stripe);
  g.fillStyle = VIZ; g.fillRect(FACE.w / 2, y, FACE.w / 2, FACE.stripe);
}

/** Baseline of a line box `lh` tall whose top is `top`, as CSS places it: half the leading below the top plus the
 *  font's ascent (Blink rounds the ascent and descent to whole px). */
function baseline(g: CanvasRenderingContext2D, text: string, top: number, lh: number) {
  const m = g.measureText(text);
  const A = Math.round(m.fontBoundingBoxAscent), D = Math.round(m.fontBoundingBoxDescent);
  return top + (lh - (A + D)) / 2 + A;
}
/** Draws text where CSS puts it in that line box. */
function lineText(g: CanvasRenderingContext2D, text: string, x: number, top: number, lh: number) {
  g.textBaseline = 'alphabetic';
  g.fillText(text, x, baseline(g, text, top, lh));
}

/** Letter-spaced, centred line. CSS letter-spacing also spaces after the last letter, so the visible text sits half a
 *  gap left of centre; canvas letterSpacing does the same. Without it, the letters are placed one by one. */
function spacedLine(g: CanvasRenderingContext2D, text: string, x: number, top: number, lh: number, gap: number) {
  if (typeof (g as Partial<CanvasRenderingContext2D>).letterSpacing === 'string') {
    g.letterSpacing = `${gap}px`;
    lineText(g, text, x, top, lh);
    g.letterSpacing = '0px';
    return;
  }
  const y = baseline(g, text, top, lh), chars = [...text], widths = chars.map((ch) => g.measureText(ch).width);
  let cur = x - (widths.reduce((s, w) => s + w, 0) + gap * chars.length) / 2;
  const align = g.textAlign; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  chars.forEach((ch, i) => { g.fillText(ch, cur, y); cur += widths[i]! + gap; });
  g.textAlign = align;
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
 * The clear sleeve's front, drawn from global.css .badge-card at `scale` canvas px per CSS px (BADGE: 182 × 294 CSS px): the
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
