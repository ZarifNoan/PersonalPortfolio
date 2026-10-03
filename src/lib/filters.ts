export function deriveOptions(valueLists: readonly (readonly string[])[], order: readonly string[]): string[] {
  const present = new Set(valueLists.flat());
  return order.filter((v) => present.has(v));
}

export function matches(itemSlugs: readonly string[], activeSlug: string | null): boolean {
  return activeSlug === null || itemSlugs.includes(activeSlug);
}

export function parseFilterParam(search: string, param: string, optionSlugs: readonly string[]): string | null {
  const raw = new URLSearchParams(search).get(param);
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  return optionSlugs.includes(v) ? v : null;
}
