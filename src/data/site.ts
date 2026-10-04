import type { ImageMetadata } from 'astro';
import badgePhoto from '../assets/images/badge/zarif-badge.jpg';

export const site = {
  name: 'Muhammad Zarif Nurhan Bin Mohd Arifin',
  shortName: 'Zarif',
  /** Nav brand and the text woven into the badge strap. */
  brand: 'NURHAN ARIFIN',
  headline: 'Computer Science student who builds software and 3D spaces.',
  about: [
    "Hi, I'm Zarif, a final-year Computer Science (Honours) student at UCSI University.",
    'I work in two worlds. On one side, I build software, from full-stack web applications to systems that use AI to make smarter decisions. On the other, I create 3D visualisations in Blender for real clients, bringing spaces to life before they’re built.',
    'Different tools, same goal: taking an idea that only exists on paper and turning it into something people can actually see and use.',
    "I'm currently looking for an internship where I can keep building, learn from experienced teams, and bring a bit of both worlds to the table.",
  ],
  email: 'zrf.nurhan@gmail.com',
  phoneDisplay: '+60 11-5878 5830',
  phoneTel: '+601158785830',
  /** null renders no LinkedIn link anywhere on the site (never a dead link), until this is set. */
  linkedin: 'https://www.linkedin.com/in/muhammad-zarif-nurhan-mohd-arifin-885782390/' as string | null,
  /** The lanyard card's photo, full-bleed between its header and footer bands (null shows the MZN monogram instead).
   *  Pre-cropped to the photo area's 168:201 shape, head with some headroom down to the folded arms; index.astro
   *  serves it as a WebP sized for the card. The role is printed over a white fade at the photo's bottom. */
  badge: { photo: badgePhoto as ImageMetadata | null, role: 'Computer Science · 3D Visualization' },
} as const;
