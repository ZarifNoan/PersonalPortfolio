/** A software project's own colours, sampled from its UI, for the backdrop of its screenshot gallery. */
export interface Theme { from: string; to: string; accent: string }

const HEX = /^#[0-9a-f]{6}$/i;

function rgb(hex: string): [number, number, number] {
  if (!HEX.test(hex)) throw new Error(`Expected a 6-digit hex colour like #1a2b3c, got "${hex}"`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** True for colours light enough that dark marks (text, focus rings) read better on them than white ones. */
export function isLight(hex: string): boolean {
  return luminance(rgb(hex)) > 0.4;
}

/** CSS custom properties for a themed gallery: the gradient ends, the accent, and a focus-ring colour that contrasts
 * with the gradient's midpoint. */
export function themeStyle(t: Theme): string {
  const a = rgb(t.from), b = rgb(t.to);
  rgb(t.accent);
  const mid = a.map((v, i) => Math.round((v + b[i]!) / 2)) as [number, number, number];
  const ring = luminance(mid) > 0.4 ? '#14141a' : '#ffffff';
  return `--theme-from:${t.from};--theme-to:${t.to};--theme-accent:${t.accent};--theme-ring:${ring}`;
}
