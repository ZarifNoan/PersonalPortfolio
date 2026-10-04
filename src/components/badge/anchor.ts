export const TOP_OFFSET = -24;
// Scene constants, shared with Lanyard.tsx so this module can compute hang without loading three.js.
export const CAMERA_Z = 13, FOV = 25;
export const SEG = 0.45;
export const CARD_W = 1.2, CARD_H = 1.68;
/** The strap ends at the top of the metal ring, this far above the card's top edge (clip + ring). */
export const CLIP_H = 0.2;
export const HANG_WORLD = 3 * SEG + CLIP_H + CARD_H / 2; // rope + clip/ring + half the card height, at rest
/** World height visible at z=0 is 2·z·tan(fov/2); CSS px per world unit for a given viewport height. */
export const pxPerWorld = (viewportH: number) => viewportH / (2 * CAMERA_Z * Math.tan((FOV / 2) * Math.PI / 180));
/** Anchor → resting card centre, in px. */
export const hangPx = (viewportH: number) => HANG_WORLD * pxPerWorld(viewportH);
/** The static badge's card in CSS px (global.css .badge-card: the clear sleeve). */
export const STATIC_CARD_W = 210, STATIC_CARD_H = 294;
/** The 3D card's visible size in world units: the static card's size on the reference 1440×900 screen (Lanyard.tsx
 *  draws the sleeve and face at this size around the CARD_W × CARD_H physics body). */
export const VIS_W = STATIC_CARD_W / pxPerWorld(900), VIS_H = STATIC_CARD_H / pxPerWorld(900);
/** Anchor → resting card bottom edge (the visible sleeve's), in px. */
export const cardDropPx = (viewportH: number) => (HANG_WORLD + VIS_H / 2) * pxPerWorld(viewportH);

/**
 * The 3D card's resting centre y (viewport px) while it hangs beside the hero: TOP_OFFSET + hangPx(vh). It is linear in
 * the viewport height, so Hero.astro's static strap mirrors it in CSS as TOP_OFFSET + REST_VH × 1vh (unit-tested).
 */
export const restCentreY = (viewportH: number) => TOP_OFFSET + hangPx(viewportH);
/** px of resting drop per 1vh: hangPx(100). */
export const REST_VH = hangPx(100);
/**
 * The badge's resting card-centre x (viewport px), shared by both badges so the static→3D swap doesn't move it: the
 * static badge hangs `rightOffset` px (Hero.astro's --badge-right on the slot) in from the hero slot's right edge, and
 * the 3D card comes to rest on the same centre line.
 */
export const restX = (slotRight: number, rightOffset: number) => slotRight - rightOffset - STATIC_CARD_W / 2;

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
