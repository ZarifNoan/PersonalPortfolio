import { STATIC_CARD_H, STATIC_CARD_W } from './anchor';

/** The static badge's card in CSS px (global.css .badge-card / .badge-face): a clear sleeve (radius 16) with the printed
 *  face inset 7px (radius 10). The 3D card reproduces these proportions exactly (Lanyard.tsx). */
export const BADGE = { w: STATIC_CARD_W, h: STATIC_CARD_H, r: 16, inset: 7, faceR: 10 } as const;

/**
 * The printed face's layout in CSS px from its top-left corner (168 × 280). global.css .badge-face and its children
 * use these exact numbers (pinned by tests/unit/badgeFace.test.ts) and textures.ts cardFaceTexture draws them, so the
 * static and 3D faces match line for line. Text is placed like a CSS line box: `top` is the line box's top edge and
 * the line height equals the font size unless `lh` says otherwise.
 *
 * Top to bottom: the ink header band with the clip slot and the two sides' marks, its blue/amber stripe; the photo
 * (or the MZN monogram), full-bleed between the stripes, with a white fade rising from its bottom and the role on two
 * lines over the fade; the footer stripe and ink band with the strap's label. The header and footer keep the heights
 * they had on the 210px card (38 + 3 and 3 + 35 px), so only the photo area changed shape.
 */
export const FACE = {
  w: BADGE.w - 2 * BADGE.inset, h: BADGE.h - 2 * BADGE.inset, r: BADGE.faceR,
  head: 38, stripe: 3,
  slot: { top: 7, w: 38, h: 7 },
  mark: { top: 20, size: 12, inset: 12 },
  photo: { top: 41, bottom: 242 },
  /** Monogram (no photo): Sora 800 initials in the upper photo area, over the site's purple → teal gradient. */
  mono: { top: 88, size: 46 },
  /** Transparent → white, bottom-up, over the lower photo: [position from the fade's top, white alpha]. */
  fade: { h: 88, stops: [[0, 0], [0.45, 0.8], [0.72, 0.95], [1, 1]] as [number, number][] },
  role: { top: 199, size: 14, lh: 17, color: '#2a1f6b' },
  foot: { top: 242 },
  label: { top: 258.5, size: 11, spacing: 2, color: '#d6d8ee' },
} as const;
