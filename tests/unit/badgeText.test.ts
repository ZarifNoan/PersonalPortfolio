import { describe, it, expect } from 'vitest';
import { roleLines } from '../../src/lib/badgeText';

describe('roleLines (shared by the 3D card face and the static badge)', () => {
  it('splits the role at " · " into the lines printed over the photo', () => {
    expect(roleLines('Computer Science · 3D Visualization')).toEqual(['Computer Science', '3D Visualization']);
  });
  it('copes with a one-part role', () => {
    expect(roleLines('Engineer')).toEqual(['Engineer']);
  });
});
