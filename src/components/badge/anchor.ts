export const TOP_OFFSET = -24;
// Scene constants, shared with Lanyard.tsx so this module can compute hang without loading three.js.
export const CAMERA_Z = 13, FOV = 25;
export const SEG = 0.45;
export const CARD_W = 1.2, CARD_H = 1.68;
export const HANG_WORLD = 3 * SEG + CARD_H / 2; // rope length plus half the card height, at rest
/** World height visible at z=0 is 2·z·tan(fov/2); CSS px per world unit for a given viewport height. */
export const pxPerWorld = (viewportH: number) => viewportH / (2 * CAMERA_Z * Math.tan((FOV / 2) * Math.PI / 180));
/** Anchor → resting card centre, in px. */
export const hangPx = (viewportH: number) => HANG_WORLD * pxPerWorld(viewportH);
/** Anchor → resting card bottom edge, in px. */
export const cardDropPx = (viewportH: number) => (HANG_WORLD + CARD_H / 2) * pxPerWorld(viewportH);

export interface AnchorInput {
  /** Horizontal rest position (viewport px): the hero slot, nudged into the margin beside About Me. */
  heroX: number;
  /** About Me's bottom edge, viewport px. */
  aboutBottom: number;
  /** cardDropPx for the current viewport. */
  drop: number;
}

/**
 * Where the strap's top end hangs, in viewport px. The badge hangs beside the hero and About Me while About is read:
 * x never moves, and y stays at TOP_OFFSET until About's bottom edge reaches the resting card's bottom edge. From then
 * on the card's bottom rides on About's bottom, so the badge scrolls away with About (continuous, no jump).
 */
export function badgeAnchor({ heroX, aboutBottom, drop }: AnchorInput) {
  return { x: heroX, y: Math.min(TOP_OFFSET, aboutBottom - drop) };
}
