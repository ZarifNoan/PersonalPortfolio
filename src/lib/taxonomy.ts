export const LANGUAGES = ['Python', 'JavaScript', 'PHP', 'Java', 'SQL'] as const;
export const CATEGORIES = ['Architectural Visualization', 'Product Visualization'] as const;
export type Language = (typeof LANGUAGES)[number];
export type Category = (typeof CATEGORIES)[number];

export function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
