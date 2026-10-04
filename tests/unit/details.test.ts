import { describe, it, expect } from 'vitest';
import { paragraphs, teamLabel, groupImages, mosaicLayout, metaDescription, projectFacts, linkedinLink, initials } from '../../src/lib/details';

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

describe('metaDescription', () => {
  it('keeps short text whole', () => {
    expect(metaDescription('A short line.', 160)).toBe('A short line.');
  });
  it('cuts at the last full sentence that fits', () => {
    expect(metaDescription('First sentence here. Second sentence is longer than the limit allows.', 30)).toBe('First sentence here.');
  });
  it('falls back to a word boundary with an ellipsis', () => {
    expect(metaDescription('One very long sentence without any stop at all in it', 20)).toBe('One very long…');
  });
  it('collapses whitespace', () => {
    expect(metaDescription('A\n  B', 160)).toBe('A B');
  });
});

describe('metaDescription with decimals', () => {
  it('does not treat a decimal point as a sentence end', () => {
    expect(metaDescription('Accuracy rose from 41.7% to 72.9% overall. Then more text follows here.', 50)).toBe('Accuracy rose from 41.7% to 72.9% overall.');
  });
});

describe('projectFacts', () => {
  const base = { course: 'Web Programming', members: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] };
  it('lists type, course, platform and year in order, skipping missing ones, with no Team row', () => {
    expect(projectFacts({ ...base, type: 'Course project', platform: 'Web app', year: 2026 })).toEqual([
      { label: 'Type', value: 'Course project' },
      { label: 'Course', value: 'Web Programming' },
      { label: 'Platform', value: 'Web app' },
      { label: 'Year', value: '2026' },
    ]);
    expect(projectFacts({ course: 'X', members: [] })).toEqual([{ label: 'Course', value: 'X' }]);
  });
  it('drops the type when the course already says it', () => {
    const f = projectFacts({ course: 'Final Year Project (Project Design and Implementation)', type: 'Final Year Project', members: [] });
    expect(f.map((x) => x.label)).toEqual(['Course']);
    expect(f.filter((x) => /final year project/i.test(x.value))).toHaveLength(1);
  });
  it('never includes a Team row, regardless of member count', () => {
    expect(projectFacts(base).map((x) => x.label)).not.toContain('Team');
  });
});

describe('initials', () => {
  it('takes the first letter of the first and last word', () => {
    expect(initials('Jordan Septian')).toBe('JS');
    expect(initials('Hakim Bin Taufik')).toBe('HT');
    expect(initials('Muhammad Zarif Nurhan Bin Mohd Arifin')).toBe('MA');
  });
  it('uses one letter for a single word', () => {
    expect(initials('Zarif')).toBe('Z');
  });
  it('uppercases the letters', () => {
    expect(initials('jordan septian')).toBe('JS');
  });
});

describe('linkedinLink', () => {
  it('is null without a URL', () => {
    expect(linkedinLink({ name: 'Jordan Septian' })).toBeNull();
  });
  it('opens the profile in a new tab safely, with a descriptive name', () => {
    expect(linkedinLink({ name: 'Jordan Septian', linkedin: 'https://www.linkedin.com/in/example' })).toEqual({
      href: 'https://www.linkedin.com/in/example',
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': 'Jordan Septian on LinkedIn (opens in a new tab)',
    });
  });
});
