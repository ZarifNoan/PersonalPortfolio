import { it, expect } from 'vitest';
import { visibleSorted } from '../../src/lib/projects';

it('drops drafts and sorts by order', () => {
  const e = (id: string, order: number, draft = false) => ({ id, data: { order, draft } });
  const out = visibleSorted([e('c', 3), e('johex', 4, true), e('a', 1), e('b', 2)]);
  expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
});
