# Zarif's Portfolio

Astro site for Muhammad Zarif Nurhan Bin Mohd Arifin. Design: `docs/superpowers/specs/2026-10-03-personal-website-design.md`.

## Run locally
```bash
npm install
npm run dev        # http://localhost:4321
npm test           # unit tests
npm run test:e2e   # browser tests
```

## Add a software project
1. Create `src/content/software/<slug>/index.yaml` (copy an existing one).
2. Put images in `src/content/software/<slug>/images/` and list them under `images:` with alt text.
3. `languages` must use: Python, JavaScript, PHP, Java, SQL (add new ones to `src/lib/taxonomy.ts`).

## Add a 3D project
Same as above, under `src/content/visualization/`. `category` is `Architectural Visualization` or `Product Visualization`; `client: true` shows "Client Project".

## Publish JOHEX
Add renders to `src/content/visualization/johex/images/`, list them in `index.yaml`, set `draft: false`.

## Add your photo
Save it as `public/badge/photo.jpg` (square, at least 600×600) and set `badge.photo` to `'/badge/photo.jpg'` in `src/data/site.ts`.

## Deploy
Push to `main`; Vercel deploys automatically.
