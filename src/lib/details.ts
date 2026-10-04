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

/**
 * Splits a render list into labelled sections by its items' optional `group` (e.g. one render mosaic per booth in a
 * multi-subject 3D project). Consecutive items sharing a group stay together; when no item carries a group, the
 * whole list comes back as a single unlabelled section (so the gallery renders exactly as before). Empty input
 * yields no sections.
 */
export function groupSections<T extends { group?: string }>(items: readonly T[]): { label: string | undefined; items: T[] }[] {
  if (items.length === 0) return [];
  if (items.every((i) => !i.group)) return [{ label: undefined, items: [...items] }];
  const out: { label: string | undefined; items: T[] }[] = [];
  for (const it of items) {
    const last = out[out.length - 1];
    if (last && last.label === it.group) last.items.push(it);
    else out.push({ label: it.group, items: [it] });
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

/** A meta description of at most `max` characters: whole sentences if any fit, else whole words plus "…". */
export function metaDescription(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  let out = '';
  for (const s of t.split(/(?<=[.!?])\s+/)) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > max) break;
    out = next;
  }
  if (out) return out;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:–-]+$/, '')}…`;
}

export interface Member { name: string; linkedin?: string; photo?: unknown }

/**
 * The facts card on a software project page: type, client, course, platform and year (the type is skipped when the
 * course name already contains it; the course is omitted for work that was not coursework; the client is shown only
 * when `clientName` is set, e.g. a freelance client project naming who it was built for). Team size is shown in the
 * header eyebrow instead, not here.
 */
export function projectFacts(d: { type?: string; clientName?: string; course?: string; members: readonly Member[]; platform?: string; year?: number }): { label: string; value: string }[] {
  const typeIsInCourse = !!d.type && !!d.course && d.course.toLowerCase().includes(d.type.toLowerCase());
  return [
    d.type && !typeIsInCourse ? { label: 'Type', value: d.type } : null,
    d.clientName ? { label: 'Client', value: d.clientName } : null,
    d.course ? { label: 'Course', value: d.course } : null,
    d.platform ? { label: 'Platform', value: d.platform } : null,
    d.year ? { label: 'Year', value: String(d.year) } : null,
  ].filter((f): f is { label: string; value: string } => f !== null);
}

/** The eyebrow over a software project's title: the course (or, outside coursework, the type) and the team size. */
export function softwareEyebrow(d: { course?: string; type?: string; members: readonly unknown[] }): string {
  return [d.course ?? d.type, teamLabel(d.members)].filter(Boolean).join(' · ');
}

/** Initials for a placeholder avatar: the first letter of the first and last word, uppercased. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0]!.charAt(0);
  const last = words[words.length - 1]!.charAt(0);
  return (words.length === 1 ? first : first + last).toUpperCase();
}

/** Link attributes for a member's LinkedIn logo (new tab, no opener or referrer), or null without a URL. */
export function linkedinLink(m: Member): { href: string; target: '_blank'; rel: 'noopener noreferrer'; 'aria-label': string } | null {
  if (!m.linkedin) return null;
  return { href: m.linkedin, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${m.name} on LinkedIn (opens in a new tab)` };
}

export interface ExternalLink { href: string; target: '_blank'; rel: 'noopener noreferrer'; 'aria-label': string }

/**
 * The site-wide LinkedIn contact (footer, Home's "Let's Connect"), or null while `site.linkedin` is unset so the
 * site never shows a dead link. Named with Zarif's short form, distinct from a project team member's own link.
 */
export function siteLinkedinLink(url: string | null): ExternalLink | null {
  return linkedinLink({ name: 'Muhammad Zarif Nurhan', linkedin: url ?? undefined });
}

/**
 * The "Client" fact on a 3D project page: the client's name (or "Client project"/"Personal project" without one), and
 * a link to the client's website when `clientUrl` is set (new tab, no opener or referrer).
 */
export function clientFact(d: { client: boolean; clientName?: string; clientUrl?: string }): { name: string; link: ExternalLink | null } {
  const name = d.clientName ?? (d.client ? 'Client project' : 'Personal project');
  const link: ExternalLink | null = d.clientUrl
    ? { href: d.clientUrl, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${name} (opens in a new tab)` }
    : null;
  return { name, link };
}

/**
 * The "Visit website" link for a software project that is live on the web (new tab, no opener or referrer), or null
 * without a `url`. The accessible name uses the project's name: its title up to the en dash.
 */
export function websiteLink(d: { title: string; url?: string }): ExternalLink | null {
  if (!d.url) return null;
  const name = d.title.split(' – ')[0]!.trim();
  return { href: d.url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Visit the ${name} website (opens in a new tab)` };
}
