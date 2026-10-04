import { describe, it, expect } from 'vitest';
import { slugify, LANGUAGES, CATEGORIES } from '../../src/lib/taxonomy';
import { deriveOptions, matches, parseFilterParam } from '../../src/lib/filters';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Architectural Visualization')).toBe('architectural-visualization');
    expect(slugify('JavaScript')).toBe('javascript');
  });
});

describe('deriveOptions', () => {
  const projects = [['Python', 'JavaScript', 'SQL'], ['PHP', 'JavaScript', 'SQL'], ['Python'], ['Java', 'SQL']];
  it('returns present values in taxonomy order, deduplicated', () => {
    expect(deriveOptions(projects, LANGUAGES)).toEqual(['Python', 'JavaScript', 'PHP', 'Java', 'SQL']);
  });
  it('places TypeScript after JavaScript', () => {
    expect(deriveOptions([['SQL', 'TypeScript'], ['JavaScript']], LANGUAGES)).toEqual(['JavaScript', 'TypeScript', 'SQL']);
  });
  it('omits taxonomy values no project uses', () => {
    expect(deriveOptions([['Product Visualization']], CATEGORIES)).toEqual(['Product Visualization']);
  });
  it('returns [] for no projects', () => {
    expect(deriveOptions([], LANGUAGES)).toEqual([]);
  });
});

describe('matches', () => {
  it('matches everything when no filter is active', () => {
    expect(matches(['python'], null)).toBe(true);
    expect(matches([], null)).toBe(true);
  });
  it('matches only items that carry the slug', () => {
    expect(matches(['python', 'sql'], 'python')).toBe(true);
    expect(matches(['java', 'sql'], 'python')).toBe(false);
  });
  it('returns the expected projects for Python and Java', () => {
    const items = { stocksense: ['python', 'javascript', 'sql'], jomlah: ['php', 'javascript', 'sql'], fuzzy: ['python'], fixer: ['java', 'sql'] };
    const pick = (s: string) => Object.entries(items).filter(([, v]) => matches(v, s)).map(([k]) => k);
    expect(pick('python')).toEqual(['stocksense', 'fuzzy']);
    expect(pick('java')).toEqual(['fixer']);
    expect(pick('sql')).toEqual(['stocksense', 'jomlah', 'fixer']);
  });
});

describe('parseFilterParam', () => {
  const opts = ['python', 'javascript', 'php', 'java', 'sql'];
  it('reads a valid value', () => expect(parseFilterParam('?lang=python', 'lang', opts)).toBe('python'));
  it('is case-insensitive', () => expect(parseFilterParam('?lang=PyThOn', 'lang', opts)).toBe('python'));
  it('returns null for unknown values', () => expect(parseFilterParam('?lang=COBOL', 'lang', opts)).toBeNull());
  it('returns null for empty or missing values', () => {
    expect(parseFilterParam('?lang=', 'lang', opts)).toBeNull();
    expect(parseFilterParam('', 'lang', opts)).toBeNull();
    expect(parseFilterParam('?type=python', 'lang', opts)).toBeNull();
  });
  it('treats "all" as no filter', () => expect(parseFilterParam('?lang=all', 'lang', opts)).toBeNull());
});
