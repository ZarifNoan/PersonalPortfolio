import { describe, it, expect } from 'vitest';
import { badgeAnchor, TOP_OFFSET, TRAVEL_START, TRAVEL_SPAN } from '../../src/components/badge/anchor';

const base = { heroX: 1000, splitX: 720, splitHeight: 600, viewportH: 900, hang: 400 };
// Split-section top (px) at which travel starts and ends for the 900px viewport above.
const startTop = 900 * TRAVEL_START, endTop = 900 * (TRAVEL_START - TRAVEL_SPAN);

describe('badgeAnchor', () => {
  it('waits until About Me has scrolled past the card, and lands while the split section is on screen', () => {
    // The card rests in the top ~half of the viewport and About's text sits just above the split section, so
    // travel must not start until the split section is well up the screen (tuned at 1440×900). The page ends
    // shortly after the split section, so its top never reaches the viewport top: travel must finish above 0.
    expect(TRAVEL_START).toBeLessThanOrEqual(0.5);
    expect(badgeAnchor({ ...base, splitTop: startTop + 1 }).progress).toBe(0);
    expect(endTop).toBeGreaterThan(0);
    expect(badgeAnchor({ ...base, splitTop: endTop - 1 }).x).toBe(base.splitX);
  });
  it('stays at the hero when the split section is below the fold', () => {
    expect(badgeAnchor({ ...base, splitTop: 2000 })).toEqual({ x: 1000, y: TOP_OFFSET, progress: 0 });
  });
  it('is halfway across at half progress', () => {
    const r = badgeAnchor({ ...base, splitTop: (startTop + endTop) / 2 });
    expect(r.progress).toBeCloseTo(0.5);
    expect(r.x).toBeCloseTo(860);
    expect(r.y).toBe(TOP_OFFSET);
  });
  it('reaches the divider at full progress', () => {
    const r = badgeAnchor({ ...base, splitTop: endTop - 1 });
    expect(r.progress).toBe(1);
    expect(r.x).toBe(720);
  });
  it('follows the section upward once centred under the card', () => {
    const r = badgeAnchor({ ...base, splitTop: -200 });
    expect(r.y).toBe(-200 + 300 - 400);
    expect(r.x).toBe(720);
  });
  it('is continuous at the lock point', () => {
    const lock = TOP_OFFSET + base.hang - base.splitHeight / 2;
    const a = badgeAnchor({ ...base, splitTop: lock + 0.5 }).y;
    const b = badgeAnchor({ ...base, splitTop: lock - 0.5 }).y;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
  });
});
