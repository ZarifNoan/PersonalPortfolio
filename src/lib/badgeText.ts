/** Patronymic markers: the name part from here on goes on the smaller line under the given names. */
const PATRONYMIC = new Set(['bin', 'binti', 'bt', 'b.']);

/**
 * Text lines on the badge card, shared by the 3D face (textures.ts) and the static badge (BadgeStatic.tsx) so both
 * break the same way: given names on up to two lines (first two words, then the rest), the patronymic ("BIN …") on a
 * smaller line, and the role split at " · ".
 */
export function faceLines(name: string, role: string) {
  const words = name.trim().toUpperCase().split(/\s+/);
  const cut = words.findIndex((w) => PATRONYMIC.has(w.toLowerCase()));
  const given = cut === -1 ? words : words.slice(0, cut);
  const sub = cut === -1 ? '' : words.slice(cut).join(' ');
  const nameLines = given.length > 2 ? [given.slice(0, 2).join(' '), given.slice(2).join(' ')] : [given.join(' ')];
  return { name: nameLines, sub, role: role.split(/\s+·\s+/) };
}
