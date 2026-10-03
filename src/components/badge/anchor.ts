export const TOP_OFFSET = -24;
// Scene constants, shared with Lanyard.tsx so this module can compute hang without loading three.js.
export const CAMERA_Z = 13, FOV = 25;
export const SEG = 0.45;
export const CARD_W = 1.2, CARD_H = 1.68;
export const HANG_WORLD = 3 * SEG + CARD_H / 2; // rope length plus half the card height, at rest
/**
 * Scroll window for the sideways travel, as fractions of the viewport height. Progress runs 0→1 while the
 * split section's top moves from TRAVEL_START·vh to (TRAVEL_START − TRAVEL_SPAN)·vh.
 * Tuned at 1440×900: starting when the split section enters the viewport (1, 0.6) swept the card across the
 * About Me text, which sits just above it. Starting at 0.4·vh waits until that text has scrolled above the card.
 * The page ends soon after the split section (its top bottoms out near 0.1·vh at max scroll), so the travel
 * finishes at 0.15·vh, roughly when the section is centred, to land on the divider.
 */
export const TRAVEL_START = 0.4, TRAVEL_SPAN = 0.25;
/** World height visible at z=0 is 2·z·tan(fov/2); CSS px per world unit for a given viewport height. */
export const pxPerWorld = (viewportH: number) => viewportH / (2 * CAMERA_Z * Math.tan((FOV / 2) * Math.PI / 180));
export const hangPx = (viewportH: number) => HANG_WORLD * pxPerWorld(viewportH);

export interface AnchorInput { heroX: number; splitX: number; splitTop: number; splitHeight: number; viewportH: number; hang: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function badgeAnchor({ heroX, splitX, splitTop, splitHeight, viewportH, hang }: AnchorInput) {
  const progress = clamp((viewportH * TRAVEL_START - splitTop) / (viewportH * TRAVEL_SPAN), 0, 1);
  const t = progress * progress * (3 - 2 * progress);
  const x = heroX + (splitX - heroX) * t;
  const y = Math.min(TOP_OFFSET, splitTop + splitHeight / 2 - hang);
  return { x, y, progress };
}
