import { describe, it, expect } from 'vitest';
import { paragraphs, teamLabel, groupImages, mosaicLayout } from '../../src/lib/details';

describe('paragraphs', () => {
  it('splits on blank lines and joins wrapped lines', () => {
    expect(paragraphs('One line\nwrapped here.\n\nSecond para.\n\n\n  Third.  \n')).toEqual([
      'One line wrapped here.',
      'Second para.',
      'Third.',
    ]);
  });
  it('handles CRLF and blank-with-spaces separators', () => {
    expect(paragraphs('A\r\n   \r\nB')).toEqual(['A', 'B']);
  });
  it('returns nothing for empty text', () => {
    expect(paragraphs('  \n\n ')).toEqual([]);
  });
});

describe('teamLabel', () => {
  it('is Individual with no members', () => {
    expect(teamLabel([])).toBe('Individual');
    expect(teamLabel(undefined)).toBe('Individual');
  });
  it('is Individual with one member', () => {
    expect(teamLabel([{ name: 'A' }])).toBe('Individual');
  });
  it('counts members', () => {
    expect(teamLabel([{ name: 'A' }, { name: 'B' }, { name: 'C' }])).toBe('Team of 3');
    expect(teamLabel([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }])).toBe('Team of 4');
  });
});

describe('groupImages', () => {
  const n = (k: number) => Array.from({ length: k }, (_, i) => i);
  const sizes = (k: number, max = 3) => groupImages(n(k), max).map((g) => g.length);
  it('keeps order and every item', () => {
    expect(groupImages(n(7), 3).flat()).toEqual(n(7));
  });
  it('never leaves a lone image when it can be paired', () => {
    expect(sizes(1)).toEqual([1]);
    expect(sizes(2)).toEqual([2]);
    expect(sizes(3)).toEqual([3]);
    expect(sizes(4)).toEqual([2, 2]);
    expect(sizes(5)).toEqual([3, 2]);
    expect(sizes(6)).toEqual([3, 3]);
    expect(sizes(7)).toEqual([3, 2, 2]);
  });
  it('respects a larger group size (phones)', () => {
    expect(sizes(4, 4)).toEqual([4]);
    expect(sizes(5, 4)).toEqual([3, 2]);
  });
  it('is empty for no images', () => {
    expect(groupImages([], 3)).toEqual([]);
  });
});

describe('mosaicLayout', () => {
  it('opens with a feature trio, then pairs', () => {
    expect(mosaicLayout(5)).toEqual(['feature', 'side', 'side', 'half', 'half']);
  });
  it('mirrors the second trio', () => {
    expect(mosaicLayout(6)).toEqual(['feature', 'side', 'side', 'side', 'side', 'feature-end']);
  });
  it('splits four into two pairs and fills a single with full width', () => {
    expect(mosaicLayout(4)).toEqual(['half', 'half', 'half', 'half']);
    expect(mosaicLayout(1)).toEqual(['full']);
    expect(mosaicLayout(2)).toEqual(['half', 'half']);
    expect(mosaicLayout(7)).toEqual(['feature', 'side', 'side', 'half', 'half', 'half', 'half']);
  });
  it('covers every image', () => {
    for (let k = 0; k < 12; k++) expect(mosaicLayout(k)).toHaveLength(k);
  });
});
