import { it, expect } from 'vitest';
import { initials } from '../../src/lib/initials';

it('takes the first three name words, skipping bin/binti', () => {
  expect(initials('Muhammad Zarif Nurhan Bin Mohd Arifin')).toBe('MZN');
  expect(initials('Ali bin Abu')).toBe('AA');
  expect(initials('  siti   binti  ahmad  ', 2)).toBe('SA');
});
