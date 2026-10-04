import { defineCollection, type SchemaContext } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { LANGUAGES, CATEGORIES } from './lib/taxonomy';

type ImageFn = SchemaContext['image'];

/** The first image is the cover. `caption` is a short label shown in a gallery window's title bar. */
const images = (image: ImageFn) => z.array(z.object({ src: image(), alt: z.string().min(8), caption: z.string().optional() })).default([]);
/** Long description: paragraphs separated by blank lines (rendered as <p>s on the detail page). */
const details = z.string().min(40);
const member = z.object({ name: z.string().min(2), linkedin: z.url().optional() });
const needImagesUnlessDraft = (d: { draft: boolean; images: unknown[] }, ctx: z.RefinementCtx) => {
  if (!d.draft && d.images.length === 0) ctx.addIssue({ code: 'custom', message: 'Published projects need at least one image', path: ['images'] });
};

const software = defineCollection({
  loader: glob({ pattern: '*/index.yaml', base: './src/content/software' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    course: z.string(),
    /** Optional facts for the detail page, e.g. type "Final Year Project". */
    type: z.string().optional(),
    platform: z.string().optional(),
    year: z.number().int().optional(),
    /** Team members in display order; empty means an individual project (team size = members.length). */
    members: z.array(member).default([]),
    order: z.number().int(),
    /** Device frame for the mockup: a laptop for desktop/web apps, a hand-held phone for mobile apps. */
    device: z.enum(['laptop', 'phone']).default('laptop'),
    /** How the cover fills the mockup screen: crop from the top (UI screenshots) or fit whole (charts). */
    screenFit: z.enum(['cover', 'contain']).default('cover'),
    stack: z.array(z.string()).min(1),
    languages: z.array(z.enum(LANGUAGES)).min(1),
    description: z.string().min(40),
    details,
    images: images(image),
    draft: z.boolean().default(false),
  }).superRefine(needImagesUnlessDraft),
});

const visualization = defineCollection({
  loader: glob({ pattern: '*/index.yaml', base: './src/content/visualization' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    client: z.boolean(),
    /** Shown as "Client" on the detail page. */
    clientName: z.string().optional(),
    category: z.enum(CATEGORIES),
    order: z.number().int(),
    description: z.string().min(40),
    details,
    images: images(image),
    draft: z.boolean().default(false),
  }).superRefine(needImagesUnlessDraft),
});

export const collections = { software, visualization };
