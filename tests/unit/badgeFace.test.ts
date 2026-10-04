import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as anchor from '../../src/components/badge/anchor';
import { BADGE, FACE } from '../../src/components/badge/face';
import BadgeStatic from '../../src/components/badge/BadgeStatic';

const css = readFileSync('src/styles/global.css', 'utf8');
const hero = readFileSync('src/components/home/Hero.astro', 'utf8');
const about = readFileSync('src/components/home/About.astro', 'utf8');
/** The declaration block of one global.css rule (the first rule whose selector list is exactly `sel`). */
const rule = (sel: string) => {
  const m = new RegExp(String.raw`(?:^|\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \{([^}]*)\}`).exec(css);
  if (!m) throw new Error(`no rule ${sel}`);
  return m[1]!;
};
const px = (block: string, prop: string) => {
  const m = new RegExp(String.raw`(?:^|[;{\s])${prop}: (-?[\d.]+)px`).exec(block);
  if (!m) throw new Error(`no ${prop}px in ${block}`);
  return parseFloat(m[1]!);
};
/** `font: <weight> <size>px/<line-height>px …` */
const font = (block: string) => {
  const m = /font: (\d+) ([\d.]+)px\/([\d.]+)px/.exec(block);
  if (!m) throw new Error(`no font in ${block}`);
  return { weight: +m[1]!, size: +m[2]!, lh: +m[3]! };
};

describe('CR18 card geometry', () => {
  it('the card is narrower: 182 × 294 CSS px (≈ the golden ratio, close to a portrait ID card)', () => {
    expect(anchor.STATIC_CARD_W).toBe(182);
    expect(anchor.STATIC_CARD_H).toBe(294);
    expect(BADGE.w).toBe(182);
    expect(FACE.w).toBe(182 - 2 * BADGE.inset);
    expect(FACE.h).toBe(294 - 2 * BADGE.inset);
  });
  it('the physics body keeps the visible card proportions', () => {
    expect(anchor.CARD_W / anchor.CARD_H).toBeCloseTo(anchor.STATIC_CARD_W / anchor.STATIC_CARD_H, 3);
  });
  it('the narrower card keeps the old centre line: restX is 115px in from the slot edge', () => {
    const right = parseFloat(hero.match(/--badge-right: ([\d.]+)px/)![1]!);
    expect(anchor.restX(1000, right)).toBe(1000 - 115);
  });
  it("About.astro reserves exactly the badge footprint + sway lean + 24px clearance", () => {
    const right = parseFloat(hero.match(/--badge-right: ([\d.]+)px/)![1]!);
    const reserve = parseFloat(about.match(/calc\(100% - (\d+)px\)/)![1]!);
    // .badge-hang rotates about (50%, -100px); the card's bottom-left corner is W/2 left of and 410px below the pivot
    // (100 + ring 22 − 3 + card 294 − 3). At the +2.5° keyframe it moves left by:
    const a = (2.5 * Math.PI) / 180, half = anchor.STATIC_CARD_W / 2;
    const lean = Math.ceil(half * (1 - Math.cos(a)) + 410 * Math.sin(a));
    expect(reserve).toBe(232 + anchor.STATIC_CARD_W + right + lean + 24);
  });
});

describe('the static face (global.css) mirrors FACE, which textures.ts draws', () => {
  it("the face and its glare sit BADGE.inset from the card's outer edge, as the 3D card draws them (CSS inset is measured inside the 1px border)", () => {
    const card = rule('.badge-card');
    expect(card).toContain('border: 1px solid');
    expect(px(rule('.badge-face'), 'inset')).toBe(BADGE.inset - 1);
    expect(px(rule('.badge-card::after'), 'inset')).toBe(BADGE.inset - 1);
  });
  it('header band, stripe and marks', () => {
    const head = rule('.badge-head');
    expect(px(head, 'height')).toBe(FACE.head);
    expect(head).toContain(`border-bottom: ${FACE.stripe}px solid`);
    const slot = rule('.badge-slot');
    expect([px(slot, 'top'), px(slot, 'width'), px(slot, 'height')]).toEqual([FACE.slot.top, FACE.slot.w, FACE.slot.h]);
    const marks = rule('.badge-sw, .badge-viz');
    expect(px(marks, 'top')).toBe(FACE.mark.top);
    expect(font(marks)).toEqual({ weight: 700, size: FACE.mark.size, lh: FACE.mark.size });
    expect(rule('.badge-sw')).toContain(`left: ${FACE.mark.inset}px`);
  });
  it('full-bleed photo between the bands, no circle', () => {
    const photo = rule('.badge-photo');
    expect(px(photo, 'top')).toBe(FACE.photo.top);
    expect(px(photo, 'height')).toBe(FACE.photo.bottom - FACE.photo.top);
    expect(photo).toContain('object-fit: cover');
    expect(photo).not.toMatch(/border-radius/);
    expect(FACE.photo.top).toBe(FACE.head + FACE.stripe);
  });
  it('white fade and two-line role over the lower photo', () => {
    const fade = rule('.badge-fade');
    expect(px(fade, 'top')).toBe(FACE.photo.bottom - FACE.fade.h);
    expect(px(fade, 'height')).toBe(FACE.fade.h);
    for (const [at, a] of FACE.fade.stops) expect(fade).toContain(`rgba(255,255,255,${a}) ${Math.round(at * 100)}%`);
    const role = rule('.badge-role');
    expect(px(role, 'top')).toBe(FACE.role.top);
    expect(font(role)).toEqual({ weight: 650, size: FACE.role.size, lh: FACE.role.lh });
    expect(role).toContain(`color: ${FACE.role.color}`);
  });
  it('footer stripe, band and label', () => {
    const foot = rule('.badge-foot');
    expect(px(foot, 'top')).toBe(FACE.foot.top);
    expect(foot).toContain(`border-top: ${FACE.stripe}px solid`);
    expect(px(foot, 'padding-top')).toBe(FACE.label.top - FACE.foot.top - FACE.stripe);
    expect(font(foot)).toEqual({ weight: 700, size: FACE.label.size, lh: FACE.label.size });
    expect(px(foot, 'letter-spacing')).toBe(FACE.label.spacing);
    expect(FACE.photo.bottom).toBe(FACE.foot.top);
  });
});

describe('BadgeStatic', () => {
  const props = { name: 'Muhammad Zarif Nurhan Bin Mohd Arifin', role: 'Computer Science · 3D Visualization', label: 'NURHAN ARIFIN' };
  it('with a photo: full-bleed photo, the role on two lines, no full name and no monogram', () => {
    const html = renderToStaticMarkup(createElement(BadgeStatic, { ...props, photo: '/p.webp' }));
    expect(html).toMatch(/<img class="badge-photo" src="\/p.webp"/);
    expect(html).toContain('badge-fade');
    expect(html).toMatch(/badge-role"><span>Computer Science<\/span><span>3D Visualization<\/span>/);
    expect(html).not.toMatch(/MUHAMMAD|BIN MOHD|badge-name|badge-sub|badge-mono/);
  });
  it('without a photo: the MZN monogram fills the photo area, with the same fade and role', () => {
    const html = renderToStaticMarkup(createElement(BadgeStatic, { ...props, photo: null }));
    expect(html).toMatch(/class="badge-photo badge-mono"[^>]*>MZN</);
    expect(html).toContain('badge-fade');
    expect(html).not.toMatch(/<img|MUHAMMAD|BIN MOHD/);
  });
});
