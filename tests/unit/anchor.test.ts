import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as anchor from '../../src/components/badge/anchor';
import { badgeAnchor, cardDropPx, hangPx, pxPerWorld, CARD_H, TOP_OFFSET } from '../../src/components/badge/anchor';

const vh = 900;
const drop = cardDropPx(vh); // anchor → bottom edge of the resting card, in px
const base = { heroX: 1000, drop };
/** About's bottom edge (viewport px) at which it reaches the resting card's bottom edge. */
const lock = TOP_OFFSET + drop;

describe('badgeAnchor', () => {
  it('drop is the rope plus the whole card', () => {
    expect(drop).toBeCloseTo(hangPx(vh) + (CARD_H / 2) * pxPerWorld(vh));
  });
  it('rests at the hero position while About Me is still below the card', () => {
    expect(badgeAnchor({ ...base, aboutBottom: 3000 })).toEqual({ x: 1000, y: TOP_OFFSET });
    expect(badgeAnchor({ ...base, aboutBottom: lock + 1 })).toEqual({ x: 1000, y: TOP_OFFSET });
  });
  it('never slides sideways towards the pick-a-side divider', () => {
    for (const aboutBottom of [3000, 900, lock, 200, 0, -500]) expect(badgeAnchor({ ...base, aboutBottom }).x).toBe(1000);
  });
  it("leaves with About Me: once About's bottom passes the card, the card bottom follows it upward", () => {
    for (const aboutBottom of [lock - 1, 300, 0, -400]) {
      const { y } = badgeAnchor({ ...base, aboutBottom });
      expect(y + drop).toBeCloseTo(aboutBottom);
      expect(y).toBeLessThan(TOP_OFFSET);
    }
  });
  it('is continuous at the lock point (no jump)', () => {
    const a = badgeAnchor({ ...base, aboutBottom: lock + 0.5 }).y;
    const b = badgeAnchor({ ...base, aboutBottom: lock - 0.5 }).y;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
  });
  it('no longer exports the divider travel window', () => {
    expect('TRAVEL_START' in anchor).toBe(false);
    expect('TRAVEL_SPAN' in anchor).toBe(false);
  });
  it('stays free of three.js so the page can compute it before the scene loads', () => {
    const src = readFileSync(new URL('../../src/components/badge/anchor.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/from ['"]three['"]|@react-three/);
  });
});

describe('restX', () => {
  it('is the static card centre: the slot edge minus the right offset and half the card', () => {
    expect(anchor.restX(1000, 10)).toBe(1000 - 10 - 105);
  });
  it('STATIC_CARD_W mirrors the .badge-card width in global.css', () => {
    const css = readFileSync('src/styles/global.css', 'utf8');
    expect(css).toMatch(new RegExp(String.raw`\.badge-card \{[^}]*width: ${anchor.STATIC_CARD_W}px;`));
  });
});

describe('restCentreY', () => {
  it('is linear in the viewport height', () => {
    expect(anchor.restCentreY(900)).toBeCloseTo(TOP_OFFSET + 9 * anchor.REST_VH, 6);
  });
  it('Hero.astro mirrors TOP_OFFSET and REST_VH in the static strap', () => {
    const hero = readFileSync('src/components/home/Hero.astro', 'utf8');
    expect(parseFloat(hero.match(/--badge-rest-top: (-?[\d.]+)px/)![1])).toBe(TOP_OFFSET);
    expect(parseFloat(hero.match(/--badge-rest-vh: ([\d.]+)vh/)![1])).toBeCloseTo(anchor.REST_VH, 3);
  });
});
