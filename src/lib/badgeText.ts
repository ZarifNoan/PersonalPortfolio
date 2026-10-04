/** The role's lines on the badge card, shared by the 3D face (textures.ts) and the static badge (BadgeStatic.tsx) so
 *  both break the same way: split at " · " ("Computer Science · 3D Visualization" → two lines). */
export function roleLines(role: string) {
  return role.split(/\s+·\s+/);
}
