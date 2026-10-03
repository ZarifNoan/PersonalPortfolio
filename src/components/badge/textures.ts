import * as THREE from 'three';
import { initials } from '../../lib/initials';

export async function cardFaceTexture(name: string, role: string, photo: string | null): Promise<THREE.CanvasTexture> {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1434;
  const g = c.getContext('2d')!;
  await document.fonts.ready;
  const grad = g.createLinearGradient(0, 0, 1024, 1434);
  grad.addColorStop(0, '#f8f8ff'); grad.addColorStop(1, '#dcdcf0');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 1434);
  g.fillStyle = '#0b0b14'; g.fillRect(0, 0, 1024, 120);
  g.fillStyle = '#f5f5ff'; g.font = '700 44px "Sora Variable", sans-serif'; g.textAlign = 'center';
  g.fillText('</>   ◇', 512, 80);
  const cx = 512, cy = 520, r = 260;
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
    g.fillStyle = '#f5f5ff'; g.font = '800 170px "Sora Variable", sans-serif'; g.textBaseline = 'middle';
    g.fillText(initials(name), cx, cy + 6);
  }
  g.restore();
  g.textBaseline = 'alphabetic'; g.fillStyle = '#0b0b14';
  const words = name.toUpperCase().split(' ');
  g.font = '800 68px "Sora Variable", sans-serif';
  g.fillText(words.slice(0, 3).join(' '), 512, 940);
  g.font = '600 46px "Sora Variable", sans-serif'; g.fillStyle = '#4b4f6b';
  g.fillText(words.slice(3).join(' '), 512, 1010);
  g.font = '600 44px "Inter Variable", sans-serif'; g.fillStyle = '#3b2a7a';
  g.fillText(role, 512, 1150);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

export function strapTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1e1b3a'; g.fillRect(0, 0, 1024, 128);
  g.fillStyle = '#c4c6e0'; g.font = '700 56px "Sora Variable", sans-serif'; g.textBaseline = 'middle';
  g.fillText('</>  ◇  ZARIF   </>  ◇  ZARIF', 24, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
