import { describe, it, expect } from 'vitest';
import { themeStyle, isLight } from '../../src/lib/theme';

describe('isLight', () => {
  it('tells light colours from dark ones by relative luminance', () => {
    expect(isLight('#ffffff')).toBe(true);
    expect(isLight('#f2cfb6')).toBe(true);
    expect(isLight('#101720')).toBe(false);
    expect(isLight('#5b34d6')).toBe(false);
  });
  it('accepts upper-case hex', () => {
    expect(isLight('#FFFFFF')).toBe(true);
  });
  it('rejects anything that is not a 6-digit hex colour', () => {
    expect(() => isLight('blue')).toThrow(/hex/);
    expect(() => isLight('#fff')).toThrow(/hex/);
  });
});

describe('themeStyle', () => {
  it('exposes the gradient and accent as CSS custom properties', () => {
    const s = themeStyle({ from: '#13254a', to: '#0e4a52', accent: '#2f6dea' });
    expect(s).toContain('--theme-from:#13254a');
    expect(s).toContain('--theme-to:#0e4a52');
    expect(s).toContain('--theme-accent:#2f6dea');
  });
  it('picks a light focus ring on a dark backdrop and a dark one on a light backdrop', () => {
    expect(themeStyle({ from: '#13254a', to: '#0e4a52', accent: '#2f6dea' })).toContain('--theme-ring:#ffffff');
    expect(themeStyle({ from: '#f2cfb6', to: '#bcd3ea', accent: '#d94801' })).toContain('--theme-ring:#14141a');
  });
  it('judges the backdrop by both ends of the gradient', () => {
    // One light end and one dark end: the mix is mid-dark, so the ring stays light.
    expect(themeStyle({ from: '#ffffff', to: '#000000', accent: '#888888' })).toContain('--theme-ring:#ffffff');
  });
});
