export function visibleSorted<T extends { data: { draft: boolean; order: number } }>(entries: T[]): T[] {
  return entries.filter((e) => !e.data.draft).sort((a, b) => a.data.order - b.data.order);
}
