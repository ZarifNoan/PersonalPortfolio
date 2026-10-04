import { defineCollection, type SchemaContext } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { LANGUAGES, CATEGORIES } from './lib/taxonomy';

type ImageFn = SchemaContext['image'];

/** The first image is the cover (it opens first in the image viewer). `framed` is a pre-rendered device picture of
 * the screenshot (scripts/make-phone-frames.py) that the gallery shows instead; the image viewer keeps `src`. `group`
 * labels which subject a render belongs to (e.g. a multi-subject 3D project): consecutive renders sharing a group
 * get their own captioned mosaic section on the detail page. */
const images = (image: ImageFn) => z.array(z.object({ src: image(), alt: z.string().min(8), framed: image().optional(), group: z.string().optional() })).default([]);
const hex = z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a 6-digit hex colour like #1a2b3c');
/** Long description: paragraphs separated by blank lines (rendered as <p>s on the detail page). */
const details = z.string().min(40);
/** A team member for a software project. `photo` is a relative image path (project folder or a shared people folder); omitted until a photo exists. */
const member = (image: ImageFn) => z.object({ name: z.string().min(2), linkedin: z.url().optional(), photo: image().optional() });
const needImagesUnlessDraft = (d: { draft: boolean; images: unknown[] }, ctx: z.RefinementCtx) => {
  if (!d.draft && d.images.length === 0) ctx.addIssue({ code: 'custom', message: 'Published projects need at least one image', path: ['images'] });
};

const software = defineCollection({
  loader: glob({ pattern: '*/index.yaml', base: './src/content/software' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    /** The university course; omitted for work that was not coursework (the eyebrow then shows `type`). */
    course: z.string().optional(),
    /** Optional facts for the detail page, e.g. type "Final Year Project" or "Freelance client project". */
    type: z.string().optional(),
    /** Shown as "Client" on the detail page facts panel, e.g. for a freelance client project. */
    clientName: z.string().optional(),
    platform: z.string().optional(),
    year: z.number().int().optional(),
    /** The live website: adds a "Visit website" link (new tab) on the listing and the detail page. */
    url: z.url().optional(),
    /** Team members in display order; empty means an individual project (team size = members.length). */
    members: z.array(member(image)).default([]),
    order: z.number().int(),
    /** Device the app runs on: `phone` shows the gallery as phone screens, `laptop` as panels. */
    device: z.enum(['laptop', 'phone']).default('laptop'),
    /** `contain` for charts: the gallery lays them side by side without overlap, so nothing is hidden. */
    screenFit: z.enum(['cover', 'contain']).default('cover'),
    /** The listing picture and detail hero: a photo of a real device showing the app, rendered by
     * scripts/make-mockups.py (16:10). The alt describes the scene and the app. */
    mockup: z.object({ src: image(), alt: z.string().min(20) }),
    /** The app's own colours (sampled from its UI) for the gallery backdrop: a gradient and an accent. */
    theme: z.object({ from: hex, to: hex, accent: hex }),
    stack: z.array(z.string()).min(1),
    languages: z.array(z.enum(LANGUAGES)).min(1),
    description: z.string().min(40),
    details,
    images: images(image),
    draft: z.boolean().default(false),
  }).superRefine(needImagesUnlessDraft).superRefine((d, ctx) => {
    // Phone galleries show realistic phone renders, so every gallery screenshot (all but the cover) needs one.
    if (d.device !== 'phone') return;
    d.images.forEach((img, k) => {
      if (k > 0 && !img.framed) ctx.addIssue({ code: 'custom', message: 'Phone gallery screenshots need `framed` (run scripts/make-phone-frames.py)', path: ['images', k, 'framed'] });
    });
  }),
});

const visualization = defineCollection({
  loader: glob({ pattern: '*/index.yaml', base: './src/content/visualization' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    client: z.boolean(),
    /** Shown as "Client" on the detail page. */
    clientName: z.string().optional(),
    /** The client's website: the Client value on the detail page links to it (opens in a new tab). */
    clientUrl: z.url().optional(),
    category: z.enum(CATEGORIES),
    order: z.number().int(),
    description: z.string().min(40),
    details,
    images: images(image),
    draft: z.boolean().default(false),
  }).superRefine(needImagesUnlessDraft),
});

export const collections = { software, visualization };
