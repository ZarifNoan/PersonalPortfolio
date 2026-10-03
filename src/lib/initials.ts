const SKIP = new Set(['bin', 'binti', 'bt', 'b.']);
export function initials(fullName: string, count = 3): string {
  return fullName.trim().split(/\s+/).filter((w) => !SKIP.has(w.toLowerCase())).slice(0, count).map((w) => w[0]!.toUpperCase()).join('');
}
