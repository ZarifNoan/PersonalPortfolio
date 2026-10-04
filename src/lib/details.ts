/** Pure helpers for the project detail pages. */

/** Splits multi-paragraph text (paragraphs separated by blank lines) into paragraphs; wrapped lines are joined. */
export function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean).join(' '))
    .filter(Boolean);
}

/** "Individual" for zero or one member, otherwise "Team of N". */
export function teamLabel(members: readonly unknown[] | undefined): string {
  const n = members?.length ?? 0;
  return n <= 1 ? 'Individual' : `Team of ${n}`;
}

/**
 * Splits images into groups of at most `max` for the overlapping-window compositions. Groups are as even as
 * possible (largest first), so no image is left alone when it could share a backdrop.
 */
export function groupImages<T>(items: readonly T[], max: number): T[][] {
  if (items.length === 0) return [];
  const count = Math.ceil(items.length / max);
  const base = Math.floor(items.length / count);
  let extra = items.length % count;
  const out: T[][] = [];
  let i = 0;
  for (let g = 0; g < count; g++) {
    const size = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    out.push(items.slice(i, i + size));
    i += size;
  }
  return out;
}

export type MosaicTile = 'feature' | 'feature-end' | 'side' | 'half' | 'full';

/**
 * Tile sizes for the 3D render mosaic: a large feature with two stacked tiles beside it, then pairs of halves,
 * alternating; later trios put the feature on the other side. A single leftover image spans the full width.
 */
export function mosaicLayout(n: number): MosaicTile[] {
  const out: MosaicTile[] = [];
  let left = n;
  let trio = true;
  let trios = 0;
  while (left > 0) {
    if (left === 1) { out.push('full'); left -= 1; continue; }
    if (left === 2 || left === 4) { out.push('half', 'half'); left -= 2; trio = true; continue; }
    if (trio || left === 3) {
      out.push(...(trios % 2 === 0 ? (['feature', 'side', 'side'] as const) : (['side', 'side', 'feature-end'] as const)));
      trios++;
      left -= 3;
      trio = false;
    } else {
      out.push('half', 'half');
      left -= 2;
      trio = true;
    }
  }
  return out;
}
