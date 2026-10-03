import { defineCollection, type SchemaContext } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { LANGUAGES, CATEGORIES } from './lib/taxonomy';

type ImageFn = SchemaContext['image'];

const images = (image: ImageFn) => z.array(z.object({ src: image(), alt: z.string().min(8) })).default([]);
const needImagesUnlessDraft = (d: { draft: boolean; images: unknown[] }, ctx: z.RefinementCtx) => {
  if (!d.draft && d.images.length === 0) ctx.addIssue({ code: 'custom', message: 'Published projects need at least one image', path: ['images'] });
};

const software = defineCollection({
  loader: glob({ pattern: '*/index.yaml', base: './src/content/software' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    course: z.string(),
    team: z.enum(['Individual', 'Team of 3']),
    order: z.number().int(),
    stack: z.array(z.string()).min(1),
    languages: z.array(z.enum(LANGUAGES)).min(1),
    description: z.string().min(40),
    images: images(image),
    draft: z.boolean().default(false),
  }).superRefine(needImagesUnlessDraft),
});

const visualization = defineCollection({
  loader: glob({ pattern: '*/index.yaml', base: './src/content/visualization' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    client: z.boolean(),
    category: z.enum(CATEGORIES),
    order: z.number().int(),
    description: z.string().min(40),
    images: images(image),
    draft: z.boolean().default(false),
  }).superRefine(needImagesUnlessDraft),
});

export const collections = { software, visualization };
