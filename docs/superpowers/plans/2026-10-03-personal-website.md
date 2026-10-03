# Personal Portfolio Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and ship Zarif's three-page portfolio site (Home, Software Development, 3D Visualization) with filterable alternating project sections, a full-screen image viewer, and a physics lanyard badge that travels down the Home page.

**Architecture:**
- An Astro static site. Projects live in two content collections (YAML data plus local images, validated by Zod), and Astro's image pipeline optimises the images at build time.
- Pages are plain HTML/CSS and fully readable without JavaScript.
- Small vanilla TS scripts add the filters, the gallery thumbnail swap, the image viewer and the scroll reveals.
- The lanyard is the only React island: React Three Fiber plus Rapier physics in a fixed full-screen canvas. Its anchor point is computed from DOM positions by a pure, unit-tested function. It falls back to a static HTML badge on phones, under reduced motion, without WebGL, or if the island errors.

**Tech Stack:** Astro 7, @astrojs/react 7, React 19, three 0.186, @react-three/fiber 9, @react-three/drei 10, @react-three/rapier 2, meshline 3, @fontsource-variable/sora and inter, Vitest 5, Playwright 1.63, PyMuPDF (asset extraction script only).

**Spec:** `docs/superpowers/specs/2026-10-03-personal-website-design.md`. Read it before starting any task.

## Global Constraints

- Project root: `D:\backup\Nurhan\PersonalWebsite`. All paths below are relative to it.
- Node ≥ 22.12 (installed: 24.18). Use npm.
- **API drift:** the versions are newer than some reference material. If an Astro, Vitest, R3F or Rapier API in this plan differs from the current docs (docs.astro.build, vitest.dev, r3f.docs.pmnd.rs, pmndrs/react-three-rapier README), follow the docs but **keep the file names, exported names and signatures given here**.
- Tab labels, verbatim: `Home`, `Software Development`, `3D Visualization`. Always spell "Visualization" with a z.
- Side symbols: `</>` for Software Development and `◇` for 3D Visualization.
- Full name, verbatim: `Muhammad Zarif Nurhan Bin Mohd Arifin`. Headline, verbatim: `Computer Science student who builds software and 3D spaces.`
- Email: `zrf.nurhan@gmail.com` (`mailto:`). Phone display: `+60 11-5878 5830`; `tel:` value `+601158785830`.
- Footer copyright: `© 2026 Muhammad Zarif Nurhan Bin Mohd Arifin`.
- Software filter values in display order: `Python, JavaScript, PHP, Java, SQL`. URL param: `lang`.
- 3D filter values in display order: `Architectural Visualization, Product Visualization`. URL param: `type`.
- URL values are slugs: `python`, `architectural-visualization`, and so on.
- Colours:
  - background `#0b0b14`
  - text `#f5f5ff`
  - muted `#c4c6e0`
  - software accent `#60a5fa`
  - 3D accent `#f59e0b`
- Fonts: Sora (headings, 600/800), Inter (body, 400/600).
- Breakpoints: below **900px**, the badge does not travel and the pick-a-side halves stack. Below **760px**, the nav collapses to a menu button.
- All project text and images must be present in the static HTML. JavaScript only enhances.
- Anything under `prefers-reduced-motion: reduce` gets no animation.
- **No CSS `transform`, `filter` or `contain` on any ancestor of the badge island.** These would break `position: fixed` on the canvas.
- Commits use the repo's configured identity and end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **Bad URL filter values** (`?lang=COBOL`, `?lang=PyThOn`, `?lang=`, `?type=foo`): the page must show **All** with every project visible. Matching is case-insensitive and never results in an empty page. *(Unit test in Task 2; e2e test in Task 5.)*
2. **Draft projects** (JOHEX, which has no images): must not appear, must not contribute filter buttons, and must not fail the build for lacking images. *(Unit test in Task 2; build check in Task 3.)*
3. **Odd image shapes from PDF extraction** (tall portrait pages, very wide diagrams): swapping thumbnails must not change the main image box height, so the layout doesn't jump. *(E2e test in Task 4.)*
4. **Image viewer edge cases:** Next on the last image wraps to the first. A project with one image shows no arrows and no thumbnail strip. Esc returns focus to the image that opened the viewer. *(E2e tests in Tasks 4 and 6.)*
5. **Badge environment changes:** reduced motion, no WebGL, or resizing across 900px mid-session must switch modes without reload or errors. The static badge must always show the name. *(E2e tests in Task 9.)*

---

## File Structure

```
astro.config.mjs                     Astro + React + sitemap config, site URL
package.json / tsconfig.json
vitest.config.ts                     unit tests in tests/unit
playwright.config.ts                 e2e tests in tests/e2e against `astro preview`
src/
  content.config.ts                  software + visualization collections (Zod)
  content/software/<slug>/index.yaml + images/*
  content/visualization/<slug>/index.yaml + images/*
  data/site.ts                       name, headline, about, contact, badge config
  lib/taxonomy.ts                    LANGUAGES, CATEGORIES, slugify()
  lib/filters.ts                     deriveOptions(), matches(), parseFilterParam()
  lib/projects.ts                    visibleSorted()
  lib/initials.ts                    initials()
  styles/global.css                  tokens, base, glow backgrounds, utilities
  layouts/Layout.astro               <head>, SEO/OG, nav, footer, lightbox, scripts
  components/Nav.astro
  components/Footer.astro
  components/FilterBar.astro
  components/ProjectSection.astro    alternating section + gallery markup
  components/Lightbox.astro          <dialog> markup
  components/home/Hero.astro
  components/home/About.astro
  components/home/PickSide.astro
  components/badge/anchor.ts         badgeAnchor() pure function
  components/badge/BadgeStatic.tsx   HTML/CSS fallback badge
  components/badge/textures.ts       canvas textures for card face and strap
  components/badge/Lanyard.tsx       R3F + Rapier scene
  components/badge/BadgeIsland.tsx   mode selection, error boundary, fallbacks
  scripts/filter.ts                  initFilter()
  scripts/gallery.ts                 initGalleries()
  scripts/lightbox.ts                initLightbox()
  scripts/reveal.ts                  initReveal()
  pages/index.astro / software.astro / 3d.astro
public/og.png                        1200×630 link preview (generated)
public/badge/                        photo.jpg goes here when supplied
scripts/extract_pdf_images.py        report PDF → candidate screenshots
scripts/make-og.mjs                  renders public/og.png with Playwright
tests/unit/*.test.ts
tests/e2e/*.spec.ts
```

---

### Task 1: Scaffold, design tokens, layout shell, nav and footer

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`
- Create: `src/data/site.ts`, `src/styles/global.css`, `src/layouts/Layout.astro`, `src/components/Nav.astro`, `src/components/Footer.astro`
- Create: `src/pages/index.astro`, `src/pages/software.astro`, `src/pages/3d.astro` (placeholder bodies, replaced in later tasks)
- Test: `tests/e2e/shell.spec.ts`

**Interfaces:**
- Produces:
  - `site` (from `src/data/site.ts`) with fields `name`, `shortName`, `headline`, `about: string[]`, `email`, `phoneDisplay`, `phoneTel`, `badge: { photo: string | null; role: string }`, `url`
  - `Layout.astro` props: `{ title: string; description: string; page: 'home' | 'software' | 'viz' }`, plus a default slot
  - the `<body>` gets class `page-<page>`.

- [ ] **Step 1: Scaffold the project and install dependencies**

From the project root, which already holds `.git`, `.gitignore` and `docs/`:

```bash
npm create astro@latest . -- --template minimal --typescript strict --no-install --no-git --skip-houston --yes
npx astro add react sitemap --yes
npm i three @react-three/fiber @react-three/drei @react-three/rapier meshline @fontsource-variable/sora @fontsource-variable/inter
npm i -D @types/three vitest @playwright/test @astrojs/check typescript
npx playwright install chromium
```

If `create astro` refuses because the directory isn't empty, scaffold into `tmp-scaffold/`, move its contents to the root (skipping `.gitignore`), and delete `tmp-scaffold/`. If `@astrojs/check` complains about TypeScript 7, run `npm i -D typescript@^5` and use that.

- [ ] **Step 2: Configure Astro, Vitest, Playwright and npm scripts**

`astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://zarifnurhan.vercel.app', // updated in Task 11 once the real Vercel URL exists
  integrations: [react(), sitemap()],
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' } });
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:4321' },
  webServer: { command: 'npm run build && npm run preview -- --port 4321', port: 4321, reuseExistingServer: true, timeout: 180_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
```

Add these to the `"scripts"` object in `package.json`:

```json
"test": "vitest run",
"test:e2e": "playwright test",
"check": "astro check"
```

- [ ] **Step 3: Write the failing shell e2e test**

`tests/e2e/shell.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

const pages = [
  { path: '/', tab: 'Home' },
  { path: '/software', tab: 'Software Development' },
  { path: '/3d', tab: '3D Visualization' },
];

for (const p of pages) {
  test(`${p.path} has nav, active tab and footer contacts`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(p.path);
    const nav = page.getByRole('navigation', { name: 'Main' });
    const toggle = page.getByRole('button', { name: 'Menu' });
    if (await toggle.isVisible()) await toggle.click();
    await expect(nav.getByRole('link', { name: p.tab })).toHaveAttribute('aria-current', 'page');
    for (const t of pages) await expect(nav.getByRole('link', { name: t.tab })).toBeVisible();
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: 'zrf.nurhan@gmail.com' })).toHaveAttribute('href', 'mailto:zrf.nurhan@gmail.com');
    await expect(footer.getByRole('link', { name: '+60 11-5878 5830' })).toHaveAttribute('href', 'tel:+601158785830');
    await expect(footer).toContainText('© 2026 Muhammad Zarif Nurhan Bin Mohd Arifin');
    expect(errors).toEqual([]);
  });
}
```

- [ ] **Step 4: Run the test to confirm it fails**

Run: `npx playwright test tests/e2e/shell.spec.ts`
Expected: FAIL. There's no `navigation` named "Main" yet.

- [ ] **Step 5: Write the site data, tokens, layout, nav and footer**

`src/data/site.ts`:

```ts
export const site = {
  name: 'Muhammad Zarif Nurhan Bin Mohd Arifin',
  shortName: 'Zarif',
  headline: 'Computer Science student who builds software and 3D spaces.',
  about: [
    "Hi, I'm Zarif, a final-year Computer Science (Honours) student at UCSI University.",
    'I work in two worlds. On one side, I build software, from full-stack web applications to systems that use AI to make smarter decisions. On the other, I create 3D visualisations in Blender for real clients, bringing spaces to life before they\u2019re built.',
    'Different tools, same goal: taking an idea that only exists on paper and turning it into something people can actually see and use.',
    "I'm currently looking for an internship where I can keep building, learn from experienced teams, and bring a bit of both worlds to the table.",
  ],
  email: 'zrf.nurhan@gmail.com',
  phoneDisplay: '+60 11-5878 5830',
  phoneTel: '+601158785830',
  badge: { photo: null as string | null, role: 'Computer Science · 3D Visualization' },
  url: 'https://zarifnurhan.vercel.app',
} as const;
```

`src/styles/global.css`:

```css
@import '@fontsource-variable/sora';
@import '@fontsource-variable/inter';

:root {
  --bg: #0b0b14; --text: #f5f5ff; --muted: #c4c6e0; --dim: #9a9dbd;
  --glass: rgba(255,255,255,.07); --glass-strong: rgba(255,255,255,.12); --border: rgba(255,255,255,.14);
  --sw: #60a5fa; --viz: #f59e0b;
  --glow-a: #3b2a7a; --glow-b: #0e4a5a;
  --radius: 16px; --max: 1180px; --gutter: clamp(16px, 4vw, 40px);
  --font-head: 'Sora Variable', system-ui, sans-serif;
  --font-body: 'Inter Variable', system-ui, sans-serif;
  color-scheme: dark;
}
.page-software { --glow-a: #1d3b7a; --glow-b: #0e2a4a; }
.page-viz { --glow-a: #6b3a0e; --glow-b: #3a250e; }

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body {
  margin: 0; min-height: 100vh; color: var(--text); font: 400 1rem/1.65 var(--font-body);
  background:
    radial-gradient(circle at 85% 0%, var(--glow-a) 0, transparent 42%),
    radial-gradient(circle at 0% 100%, var(--glow-b) 0, transparent 45%),
    var(--bg);
  background-attachment: fixed;
}
h1, h2, h3 { font-family: var(--font-head); line-height: 1.15; margin: 0; }
a { color: inherit; }
img { max-width: 100%; height: auto; display: block; }
:focus-visible { outline: 2px solid var(--sw); outline-offset: 3px; border-radius: 6px; }
.container { width: 100%; max-width: var(--max); margin-inline: auto; padding-inline: var(--gutter); }
.glass { background: var(--glass); border: 1px solid var(--border); border-radius: 999px; backdrop-filter: blur(8px); }
.sym { font-family: ui-monospace, 'Cascadia Code', monospace; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.page-title { padding-block: clamp(48px, 8vw, 96px) 24px; }
.page-title h1 { font-size: clamp(2rem, 5vw, 3.4rem); font-weight: 800; }
.page-title p { color: var(--muted); max-width: 60ch; margin: 12px 0 0; }
```

`src/components/Nav.astro`:

```astro
---
interface Props { page: 'home' | 'software' | 'viz' }
const { page } = Astro.props;
const links = [
  { key: 'home', href: '/', label: 'Home', sym: '' },
  { key: 'software', href: '/software', label: 'Software Development', sym: '</>' },
  { key: 'viz', href: '/3d', label: '3D Visualization', sym: '◇' },
] as const;
---
<header class="nav-wrap">
  <div class="container nav">
    <a class="brand" href="/">ZARIF</a>
    <button class="menu-btn glass" type="button" aria-expanded="false" aria-controls="nav-list">Menu</button>
    <nav aria-label="Main">
      <ul id="nav-list">
        {links.map((l) => (
          <li>
            <a href={l.href} aria-current={l.key === page ? 'page' : undefined}>
              {l.sym && <span class="sym" aria-hidden="true">{l.sym} </span>}{l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  </div>
</header>

<style>
  .nav-wrap { position: sticky; top: 0; z-index: 50; background: rgba(11,11,20,.72); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
  .nav { display: flex; align-items: center; justify-content: space-between; height: 64px; }
  .brand { font: 800 1.05rem var(--font-head); letter-spacing: .12em; text-decoration: none; }
  ul { list-style: none; display: flex; gap: 8px; margin: 0; padding: 0; }
  nav a { display: block; padding: 8px 14px; border-radius: 999px; text-decoration: none; color: var(--muted); font-weight: 600; font-size: .95rem; }
  nav a:hover { color: var(--text); background: var(--glass); }
  nav a[aria-current='page'] { color: var(--text); background: var(--glass-strong); border: 1px solid var(--border); }
  .menu-btn { display: none; color: var(--text); padding: 8px 16px; font: 600 .9rem var(--font-body); cursor: pointer; }
  @media (max-width: 759px) {
    .menu-btn { display: block; }
    nav { position: absolute; top: 64px; left: 0; right: 0; background: rgba(11,11,20,.96); border-bottom: 1px solid var(--border); display: none; }
    nav.open { display: block; }
    ul { flex-direction: column; padding: 12px var(--gutter) 20px; }
  }
</style>

<script>
  const btn = document.querySelector<HTMLButtonElement>('.menu-btn');
  const nav = document.querySelector('nav[aria-label="Main"]');
  btn?.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    nav?.classList.toggle('open', open);
  });
</script>
```

`src/components/Footer.astro`:

```astro
---
import { site } from '../data/site';
---
<footer class="footer">
  <div class="container row">
    <ul>
      <li><span aria-hidden="true">✉ </span><a href={`mailto:${site.email}`}>{site.email}</a></li>
      <li><span aria-hidden="true">☎ </span><a href={`tel:${site.phoneTel}`}>{site.phoneDisplay}</a></li>
    </ul>
    <p>© 2026 {site.name}</p>
  </div>
</footer>
<style>
  .footer { border-top: 1px solid var(--border); margin-top: 96px; padding-block: 28px; color: var(--dim); font-size: .9rem; }
  .row { display: flex; flex-wrap: wrap; gap: 12px 32px; justify-content: space-between; align-items: center; }
  ul { list-style: none; display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 0; padding: 0; }
  a { color: var(--muted); text-decoration: none; } a:hover { color: var(--text); text-decoration: underline; }
  p { margin: 0; }
</style>
```

`src/layouts/Layout.astro` (the lightbox and scripts are added in later tasks):

```astro
---
import '../styles/global.css';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import { site } from '../data/site';
interface Props { title: string; description: string; page: 'home' | 'software' | 'viz' }
const { title, description, page } = Astro.props;
const fullTitle = page === 'home' ? `${site.name} | Portfolio` : `${title} | ${site.name}`;
const canonical = new URL(Astro.url.pathname, Astro.site).toString();
const og = new URL('/og.png', Astro.site).toString();
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{fullTitle}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={og} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#0b0b14" />
  </head>
  <body class={`page-${page}`}>
    <a class="visually-hidden" href="#main">Skip to content</a>
    <Nav page={page} />
    <main id="main"><slot /></main>
    <Footer />
  </body>
</html>
```

Placeholder pages (each replaced later). `src/pages/index.astro`:

```astro
---
import Layout from '../layouts/Layout.astro';
---
<Layout title="Home" description="Portfolio of Muhammad Zarif Nurhan Bin Mohd Arifin: software development and 3D visualization." page="home"><div class="container page-title"><h1>Home</h1></div></Layout>
```

`src/pages/software.astro` and `src/pages/3d.astro` are the same, with `title`/`page` set to `"Software Development"`/`"software"` and `"3D Visualization"`/`"viz"`, and descriptions of `"Software projects by Muhammad Zarif Nurhan: AI systems, full-stack web apps and desktop software."` and `"3D architectural and product visualization by Muhammad Zarif Nurhan, made in Blender."`

Replace the template's `public/favicon.svg` with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b0b14"/><text x="32" y="42" font-family="Arial, sans-serif" font-weight="800" font-size="26" text-anchor="middle" fill="#f5f5ff">Z</text></svg>
```

Delete any template `public/favicon.ico`.

- [ ] **Step 6: Run the test and checks to confirm they pass**

Run: `npx playwright test tests/e2e/shell.spec.ts && npm run check`
Expected: 6 passed (3 pages × 2 viewports), and `astro check` reports 0 errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Astro site with layout, nav and footer"
```

---

### Task 2: Taxonomy, filter logic and project helpers (pure TS)

**Files:**
- Create: `src/lib/taxonomy.ts`, `src/lib/filters.ts`, `src/lib/projects.ts`, `src/lib/initials.ts`
- Test: `tests/unit/filters.test.ts`, `tests/unit/projects.test.ts`, `tests/unit/initials.test.ts`

**Interfaces:**
- Produces:
  - `LANGUAGES`: `readonly ['Python','JavaScript','PHP','Java','SQL']`
  - `CATEGORIES`: `readonly ['Architectural Visualization','Product Visualization']`
  - `slugify(value: string): string`
  - `deriveOptions(valueLists: readonly (readonly string[])[], order: readonly string[]): string[]`: returns the values present, in taxonomy order
  - `matches(itemSlugs: readonly string[], activeSlug: string | null): boolean`
  - `parseFilterParam(search: string, param: string, optionSlugs: readonly string[]): string | null`: returns the matching slug, or `null` for "All"
  - `visibleSorted<T extends { data: { draft: boolean; order: number } }>(entries: T[]): T[]`
  - `initials(fullName: string, count?: number): string`

- [ ] **Step 1: Write the failing tests**

`tests/unit/filters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { slugify, LANGUAGES, CATEGORIES } from '../../src/lib/taxonomy';
import { deriveOptions, matches, parseFilterParam } from '../../src/lib/filters';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Architectural Visualization')).toBe('architectural-visualization');
    expect(slugify('JavaScript')).toBe('javascript');
  });
});

describe('deriveOptions', () => {
  const projects = [['Python', 'JavaScript', 'SQL'], ['PHP', 'JavaScript', 'SQL'], ['Python'], ['Java', 'SQL']];
  it('returns present values in taxonomy order, deduplicated', () => {
    expect(deriveOptions(projects, LANGUAGES)).toEqual(['Python', 'JavaScript', 'PHP', 'Java', 'SQL']);
  });
  it('omits taxonomy values no project uses', () => {
    expect(deriveOptions([['Product Visualization']], CATEGORIES)).toEqual(['Product Visualization']);
  });
  it('returns [] for no projects', () => {
    expect(deriveOptions([], LANGUAGES)).toEqual([]);
  });
});

describe('matches', () => {
  it('matches everything when no filter is active', () => {
    expect(matches(['python'], null)).toBe(true);
    expect(matches([], null)).toBe(true);
  });
  it('matches only items that carry the slug', () => {
    expect(matches(['python', 'sql'], 'python')).toBe(true);
    expect(matches(['java', 'sql'], 'python')).toBe(false);
  });
  it('returns the expected projects for Python and Java', () => {
    const items = { stocksense: ['python', 'javascript', 'sql'], jomlah: ['php', 'javascript', 'sql'], fuzzy: ['python'], fixer: ['java', 'sql'] };
    const pick = (s: string) => Object.entries(items).filter(([, v]) => matches(v, s)).map(([k]) => k);
    expect(pick('python')).toEqual(['stocksense', 'fuzzy']);
    expect(pick('java')).toEqual(['fixer']);
    expect(pick('sql')).toEqual(['stocksense', 'jomlah', 'fixer']);
  });
});

describe('parseFilterParam', () => {
  const opts = ['python', 'javascript', 'php', 'java', 'sql'];
  it('reads a valid value', () => expect(parseFilterParam('?lang=python', 'lang', opts)).toBe('python'));
  it('is case-insensitive', () => expect(parseFilterParam('?lang=PyThOn', 'lang', opts)).toBe('python'));
  it('returns null for unknown values', () => expect(parseFilterParam('?lang=COBOL', 'lang', opts)).toBeNull());
  it('returns null for empty or missing values', () => {
    expect(parseFilterParam('?lang=', 'lang', opts)).toBeNull();
    expect(parseFilterParam('', 'lang', opts)).toBeNull();
    expect(parseFilterParam('?type=python', 'lang', opts)).toBeNull();
  });
  it('treats "all" as no filter', () => expect(parseFilterParam('?lang=all', 'lang', opts)).toBeNull());
});
```

`tests/unit/projects.test.ts`:

```ts
import { it, expect } from 'vitest';
import { visibleSorted } from '../../src/lib/projects';

it('drops drafts and sorts by order', () => {
  const e = (id: string, order: number, draft = false) => ({ id, data: { order, draft } });
  const out = visibleSorted([e('c', 3), e('johex', 4, true), e('a', 1), e('b', 2)]);
  expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
});
```

`tests/unit/initials.test.ts`:

```ts
import { it, expect } from 'vitest';
import { initials } from '../../src/lib/initials';

it('takes the first three name words, skipping bin/binti', () => {
  expect(initials('Muhammad Zarif Nurhan Bin Mohd Arifin')).toBe('MZN');
  expect(initials('Ali bin Abu')).toBe('AA');
  expect(initials('  siti   binti  ahmad  ', 2)).toBe('SA');
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run`
Expected: FAIL. The modules can't be resolved yet.

- [ ] **Step 3: Implement the modules**

`src/lib/taxonomy.ts`:

```ts
export const LANGUAGES = ['Python', 'JavaScript', 'PHP', 'Java', 'SQL'] as const;
export const CATEGORIES = ['Architectural Visualization', 'Product Visualization'] as const;
export type Language = (typeof LANGUAGES)[number];
export type Category = (typeof CATEGORIES)[number];

export function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
```

`src/lib/filters.ts`:

```ts
export function deriveOptions(valueLists: readonly (readonly string[])[], order: readonly string[]): string[] {
  const present = new Set(valueLists.flat());
  return order.filter((v) => present.has(v));
}

export function matches(itemSlugs: readonly string[], activeSlug: string | null): boolean {
  return activeSlug === null || itemSlugs.includes(activeSlug);
}

export function parseFilterParam(search: string, param: string, optionSlugs: readonly string[]): string | null {
  const raw = new URLSearchParams(search).get(param);
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  return optionSlugs.includes(v) ? v : null;
}
```

`src/lib/projects.ts`:

```ts
export function visibleSorted<T extends { data: { draft: boolean; order: number } }>(entries: T[]): T[] {
  return entries.filter((e) => !e.data.draft).sort((a, b) => a.data.order - b.data.order);
}
```

`src/lib/initials.ts`:

```ts
const SKIP = new Set(['bin', 'binti', 'bt', 'b.']);
export function initials(fullName: string, count = 3): string {
  return fullName.trim().split(/\s+/).filter((w) => !SKIP.has(w.toLowerCase())).slice(0, count).map((w) => w[0]!.toUpperCase()).join('');
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx vitest run`
Expected: PASS. All tests in the 3 files are green.

- [ ] **Step 5: Commit**

```bash
git add src/lib tests/unit
git commit -m "feat: add taxonomy, filter and project helpers with tests"
```

---

### Task 3: Content collections, assets and project data

**Files:**
- Create: `scripts/extract_pdf_images.py`, `src/content.config.ts`
- Create: `src/content/software/{stocksense,jomlah,fuzzy-logic,fixer}/index.yaml` and `images/`
- Create: `src/content/visualization/{moltech-johor-warehouse,slice-2025,gobami,johex}/index.yaml` and `images/`
- Modify: `.gitignore` (add `asset-candidates/`)

**Interfaces:**
- Consumes: `LANGUAGES`, `CATEGORIES` from Task 2.
- Produces: collections `software` and `visualization`.
  - Each entry's `data.images` is `{ src: ImageMetadata; alt: string }[]`.
  - Software fields: `title, course, team, order, stack[], languages[], description, images[], draft`.
  - Visualization fields: `title, client: boolean, category, order, description, images[], draft`.

- [ ] **Step 1: Write the extraction script**

`scripts/extract_pdf_images.py`:

```python
"""Extract candidate screenshots from report PDFs.
Usage: python scripts/extract_pdf_images.py
Writes asset-candidates/<project>/p<page>-<n>.png for embedded images >= 600px wide.
"""
from pathlib import Path
import pymupdf

DEGREE = Path(r"D:\backup\Nurhan\UCSI\Degree")
SOURCES = {
    "stocksense": [DEGREE / "Y3S1/Project Design and Implementation/Document/1002267337_StockSenseReport.pdf"],
    "jomlah": [DEGREE / "Y3S2/Web Programming/Assignment/Document/DONE/Report_JOMLAH - Centralize Event Management App.pdf"],
    "fuzzy-logic": [DEGREE / "Y3S2/Intelligent System/Assignment/Document/Done/1002267337_Report_FuzzyLogicStudentPerformance.pdf"],
    "fixer": [
        DEGREE / "Y2S3/BIC3203 Business Case Project/Assignment/BizCaseDoc/Fixer_BusinessCaseDocument.pdf",
        DEGREE / "Y2S3/BIC3203 Business Case Project/Assignment/FixerBizCase/User Manual.pdf",
    ],
}
OUT = Path("asset-candidates")

for project, pdfs in SOURCES.items():
    dest = OUT / project
    dest.mkdir(parents=True, exist_ok=True)
    for pdf in pdfs:
        doc = pymupdf.open(pdf)
        tag = "um" if "User Manual" in pdf.name else "r"
        for pno, page in enumerate(doc, start=1):
            for n, img in enumerate(page.get_images(full=True), start=1):
                pix = pymupdf.Pixmap(doc, img[0])
                if pix.width < 600:
                    continue
                if pix.n - pix.alpha >= 4:
                    pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                pix.save(dest / f"{tag}-p{pno:03d}-{n}.png")
        print(project, pdf.name, "done")
```

Add `asset-candidates/` to `.gitignore`.

- [ ] **Step 2: Run the extraction and pick the screenshots**

Run: `python scripts/extract_pdf_images.py`
Expected: four project folders under `asset-candidates/`, each containing PNGs.

Open the candidates with an image viewer, or the Read tool for agents. For each software project, choose **3–5** images using these rules:
- Prefer real UI screens: dashboards, forms, charts, app windows.
- Next best are result charts.
- Never use cover pages, logos, Gantt charts, text-only figures or blurry images.
- The first image becomes the cover, so make it the most impressive UI shot.

Copy the chosen images to `src/content/software/<slug>/images/` named `01-<what>.png`, `02-<what>.png`, … (for example `01-dashboard.png`). If a project has fewer than 3 usable images, use what exists (minimum 1) and note it in the commit message.

- [ ] **Step 3: Copy the 3D renders**

Source: `D:\backup\Nurhan\Blender\Image`. For each project, open every render, choose the **best 5**, and copy them to `src/content/visualization/<slug>/images/` as `01-<what>.png` and so on. The best render goes first.

| Slug | Source folder | Required picks |
|---|---|---|
| `moltech-johor-warehouse` | `MoltechJohorWarehouse/` | Include `0001.png` (ISO tank and forklifts) |
| `slice-2025` | `UMNO Jln Lingkaran 1/` | Include an overall exterior; `../Portfolio.png` shows the same scene and is a candidate |
| `gobami` | `Gobami Blender/` | `All.png` must be `01-collection.png`; then choose 4 of the themed or close-up shots |

Skip near-duplicate angles. Prefer a variety of wide, medium and detail shots. Create `src/content/visualization/johex/images/` with a `.gitkeep` file only.

- [ ] **Step 4: Write the content config**

`src/content.config.ts`:

```ts
import { defineCollection, z, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
import { LANGUAGES, CATEGORIES } from './lib/taxonomy';

type ImageFn = SchemaContext['image'];

const images = (image: ImageFn) => z.array(z.object({ src: image(), alt: z.string().min(8) })).default([]);
const needImagesUnlessDraft = (d: { draft: boolean; images: unknown[] }, ctx: z.RefinementCtx) => {
  if (!d.draft && d.images.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Published projects need at least one image', path: ['images'] });
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
```

If `SchemaContext` isn't exported under Astro 7, use whatever type the docs give for the `image` schema helper. If `z` must come from `astro/zod`, import it from there.

- [ ] **Step 5: Write the software data files**

Use the image filenames you chose in Step 2, and write a specific `alt` for each, describing what is on screen. Descriptions are verbatim from spec §6.3.

`src/content/software/stocksense/index.yaml`:

```yaml
title: StockSense – AI Inventory Prediction System
course: Final Year Project (Project Design and Implementation)
team: Individual
order: 1
stack: [Python, TensorFlow, Keras, NLTK, Electron, JavaScript, Chart.js, PostgreSQL]
languages: [Python, JavaScript, SQL]
description: >-
  Developed a desktop inventory management app that helps small and medium businesses (SMEs) restock
  before they run out. It uses an LSTM model built in TensorFlow/Keras to predict demand for each product
  from 5 years of sales data, and an NLP chatbot that answers stock questions typed in plain language.
  The app also handles stock management, low-stock alerts and a timestamped change history, with
  interactive Chart.js charts comparing past sales against predicted demand.
images:
  - src: ./images/01-dashboard.png
    alt: StockSense dashboard showing inventory levels and low-stock alerts
```

`src/content/software/jomlah/index.yaml`:

```yaml
title: JomLah – Centralized Event Management Platform
course: Web Programming
team: Team of 3
order: 2
stack: [PHP 8, MySQL, JavaScript, jQuery/AJAX, HTML5, CSS3]
languages: [PHP, JavaScript, SQL]
description: >-
  Developed a web platform where people can find and book events, organisers can host them, and admins
  approve and manage everything in one place. Each user role has its own area: attendees book tickets and
  leave reviews, organisers create and manage events, and admins approve events and manage users. Behind it
  is a 10-table MySQL database covering one-to-one, one-to-many and many-to-many relationships. Logins are
  secure with role-based access, prepared statements block SQL injection, and input is checked on both the
  browser and the server. jQuery/AJAX lets users search and book without reloading the page, and every main
  feature was checked against a written set of test cases.
images:
  - src: ./images/01-home.png
    alt: JomLah home page listing upcoming events
```

`src/content/software/fuzzy-logic/index.yaml`:

```yaml
title: Student Performance Prediction using Fuzzy Logic
course: Intelligent Systems
team: Individual
order: 3
stack: [Python, scikit-fuzzy, NumPy, pandas, scikit-learn, Matplotlib, Tkinter]
languages: [Python]
description: >-
  Developed an AI system that spots students at risk of failing early in the semester and recommends what
  the department should do about it. It uses 27 fuzzy logic rules to predict a performance score from
  attendance, test and project marks, then a second rule-based layer turns that score into a risk level and
  a ranked list of recommended actions. Tuning the model raised accuracy from 41.7% to 72.9% and cut the
  average error from 15.4 to 9.1 points, tested on 800 students with k-fold cross-validation. A Tkinter
  desktop app shows which rules fired for each prediction, so non-technical staff can see why a student
  was flagged.
images:
  - src: ./images/01-app.png
    alt: Tkinter app showing a student's predicted score, risk level and fired rules
```

`src/content/software/fixer/index.yaml`:

```yaml
title: Fixer – On-Demand Home Repair Service App
course: Business Case Project
team: Team of 3
order: 4
stack: [Java, JavaFX, Maven, PostgreSQL]
languages: [Java, SQL]
description: >-
  Designed a Grab-style app that connects customers with nearby repair workers to book home repair
  services. The work covered the requirements document and the system design, including use case,
  sequence, class and activity diagrams. It also included an 8-table PostgreSQL database for users, repair
  workers, service listings, bookings and in-app chat. The result is a clickable JavaFX prototype with 13
  screens, including sign-up and login, browsing services, booking, wallet top-up, ratings and activity
  history.
images:
  - src: ./images/01-home.png
    alt: Fixer prototype home screen with service categories
```

In each file, list **every** image you copied, not just the single example shown, and rename the example to match your files.

- [ ] **Step 6: Write the visualization data files**

Descriptions are verbatim from spec §6.4.

`src/content/visualization/moltech-johor-warehouse/index.yaml`:

```yaml
title: Moltech Johor Warehouse
client: true
category: Architectural Visualization
order: 1
description: >-
  Interior visualization of an industrial warehouse, featuring ISO tank containers, forklifts, safety
  barriers and hazard labelling, with realistic materials and lighting.
images:
  - src: ./images/01-iso-tank-forklifts.png
    alt: Warehouse interior with a blue-framed ISO tank container beside two forklifts
```

`src/content/visualization/slice-2025/index.yaml`:

```yaml
title: SLICE 2025 – School Leavers Inspiration & Success Initiatives
client: true
category: Architectural Visualization
order: 2
description: >-
  Event venue visualization for SLICE 2025, powered by DASEM: an education expo where universities and
  institutions meet school leavers to share their programmes. The scene lays out the venue at Rumah
  Komuniti Parlimen Sembrong, with a main tent, exhibition booths for each institution, canopies, entrance
  and exit gates, and perimeter fencing.
images:
  - src: ./images/01-overview.png
    alt: Night exterior of the community hall with a white event tent, booths, canopies and gated entrance
```

`src/content/visualization/gobami/index.yaml`:

```yaml
title: Gobami Product Visualization
client: false
category: Product Visualization
order: 3
description: >-
  Product visualization of Gobami, a thermos-style container that keeps both food and drinks warm,
  created for a friend's university assignment. The product is shown in six patterned designs: Chinese New
  Year, Hari Raya, Deepavali, Earth Day, Breast Cancer Awareness and Autism Awareness.
images:
  - src: ./images/01-collection.png
    alt: Six Gobami food containers in different festive patterns arranged on two shelves
```

`src/content/visualization/johex/index.yaml`:

```yaml
title: JOHEX Halal Expo
client: true
category: Architectural Visualization
order: 4
draft: true
description: >-
  Exhibition venue visualization for JOHEX, a halal expo showcasing all kinds of halal products, not just
  food.
images: []
```

As in Step 5, list every copied image with its own specific alt text.

- [ ] **Step 7: Verify the collections build, including the negative case**

Run: `npm run check && npm run build`
Expected: both succeed. JOHEX has no images but builds because it's a draft.

Then confirm validation catches mistakes:
1. Temporarily change `languages: [Python]` in `fuzzy-logic/index.yaml` to `languages: [Cobol]`.
2. Run `npm run build`. Expected: FAIL, with an error naming `languages`.
3. Revert the change.
4. Temporarily set `draft: false` in `johex/index.yaml` and run `npm run build`. Expected: FAIL with "Published projects need at least one image".
5. Revert the change.

- [ ] **Step 8: Commit**

```bash
git add .gitignore scripts/extract_pdf_images.py src/content.config.ts src/content
git commit -m "feat: add content collections with project data and images"
```

---

### Task 4: Project section, gallery and Software Development page

**Files:**
- Create: `src/components/ProjectSection.astro`, `src/scripts/gallery.ts`
- Modify: `src/pages/software.astro`
- Test: `tests/e2e/gallery.spec.ts`

**Interfaces:**
- Consumes: the `software` collection, `visibleSorted`, `slugify`.
- Produces:
  - `ProjectSection.astro` props: `{ id: string; title: string; eyebrow: string; tags: string[]; description: string; images: { src: ImageMetadata; alt: string }[]; filterSlugs: string[]; reverse: boolean; accent: 'sw' | 'viz' }`
  - DOM contract for later tasks:
    - `section[data-filter-item][data-filter-values="a b c"]`
    - `[data-gallery]` holding `JSON` of `{ src: string; alt: string }[]` (full-size URLs)
    - `[data-main-image] [data-slide][data-index]` (only one is not `hidden`)
    - `a[data-thumb][data-index]`
    - `a[data-open-lightbox]`
  - `initGalleries(root?: ParentNode): void`

- [ ] **Step 1: Write the failing test**

`tests/e2e/gallery.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('software page lists four projects in order with descriptions visible', async ({ page }) => {
  await page.goto('/software');
  const titles = page.locator('section[data-filter-item] h2');
  await expect(titles).toHaveText([
    'StockSense – AI Inventory Prediction System',
    'JomLah – Centralized Event Management Platform',
    'Student Performance Prediction using Fuzzy Logic',
    'Fixer – On-Demand Home Repair Service App',
  ]);
  await expect(page.locator('section[data-filter-item]').first()).toContainText('LSTM model');
});

test('thumbnail swaps the main image without changing its box height', async ({ page }) => {
  await page.goto('/software');
  const section = page.locator('section[data-filter-item]').first();
  const thumbs = section.locator('a[data-thumb]');
  test.skip((await thumbs.count()) < 2, 'needs 2+ images');
  const box = section.locator('[data-main-image]');
  const before = (await box.boundingBox())!.height;
  await thumbs.nth(1).click();
  await expect(section.locator('[data-slide][data-index="1"]')).toBeVisible();
  await expect(section.locator('[data-slide][data-index="0"]')).toBeHidden();
  await expect(thumbs.nth(1)).toHaveAttribute('aria-current', 'true');
  expect((await box.boundingBox())!.height).toBeCloseTo(before, 0);
});

test('single-image projects render no thumbnail strip', async ({ page }) => {
  await page.goto('/software');
  for (const s of await page.locator('section[data-filter-item]').all()) {
    const n = JSON.parse((await s.locator('[data-gallery]').getAttribute('data-gallery'))!).length;
    if (n === 1) await expect(s.locator('[data-thumbs]')).toHaveCount(0);
  }
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx playwright test tests/e2e/gallery.spec.ts --project=desktop`
Expected: FAIL. No `section[data-filter-item]` elements exist yet.

- [ ] **Step 3: Implement the ProjectSection component**

`src/components/ProjectSection.astro`:

```astro
---
import { Image, getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
interface Props {
  id: string; title: string; eyebrow: string; tags: string[]; description: string;
  images: { src: ImageMetadata; alt: string }[]; filterSlugs: string[]; reverse: boolean; accent: 'sw' | 'viz';
}
const { id, title, eyebrow, tags, description, images, filterSlugs, reverse, accent } = Astro.props;
const full = await Promise.all(images.map((i) => getImage({ src: i.src, width: Math.min(i.src.width, 2000), format: 'webp' })));
const gallery = JSON.stringify(full.map((f, k) => ({ src: f.src, alt: images[k]!.alt })));
const sizes = '(max-width: 899px) 100vw, 640px';
---
<section id={id} class:list={['project', `accent-${accent}`, { reverse }]} data-filter-item data-filter-values={filterSlugs.join(' ')} data-reveal aria-labelledby={`${id}-title`}>
  <div class="media" data-gallery={gallery}>
    <div class="main" data-main-image>
      {images.map((img, k) => (
        <a href={full[k]!.src} data-slide data-index={k} data-open-lightbox hidden={k !== 0} aria-label={`View larger: ${img.alt}`}>
          <Image src={img.src} alt={img.alt} widths={[480, 800, 1200]} sizes={sizes} loading={k === 0 ? 'eager' : 'lazy'} />
        </a>
      ))}
    </div>
    {images.length > 1 && (
      <ul class="thumbs" data-thumbs>
        {images.map((img, k) => (
          <li><a href={full[k]!.src} data-thumb data-index={k} aria-current={k === 0 ? 'true' : undefined} aria-label={`Show image ${k + 1}: ${img.alt}`}>
            <Image src={img.src} alt="" width={160} loading="lazy" />
          </a></li>
        ))}
      </ul>
    )}
  </div>
  <div class="text">
    <p class="eyebrow">{eyebrow}</p>
    <h2 id={`${id}-title`}>{title}</h2>
    <p class="desc">{description}</p>
    <ul class="tags" aria-label="Tech and tags">{tags.map((t) => <li class="glass">{t}</li>)}</ul>
  </div>
</section>

<style>
  .project { display: grid; grid-template-columns: 1.15fr 1fr; gap: clamp(24px, 4vw, 56px); align-items: center; padding-block: clamp(40px, 6vw, 72px); border-top: 1px solid var(--border); }
  .project.reverse .media { order: 2; }
  .main { aspect-ratio: 16 / 10; border-radius: var(--radius); overflow: hidden; background: #05050b; border: 1px solid var(--border); }
  .main a { display: block; width: 100%; height: 100%; cursor: zoom-in; }
  .main a[hidden] { display: none; }
  .main :global(img) { width: 100%; height: 100%; object-fit: contain; }
  .thumbs { list-style: none; display: flex; gap: 8px; margin: 10px 0 0; padding: 0; overflow-x: auto; }
  .thumbs a { display: block; width: 72px; aspect-ratio: 16 / 10; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); opacity: .6; transition: opacity .2s; }
  .thumbs a[aria-current='true'], .thumbs a:hover { opacity: 1; border-color: var(--accent); }
  .thumbs :global(img) { width: 100%; height: 100%; object-fit: cover; }
  .accent-sw { --accent: var(--sw); } .accent-viz { --accent: var(--viz); }
  .eyebrow { margin: 0 0 8px; color: var(--accent); font-weight: 600; font-size: .85rem; letter-spacing: .04em; }
  h2 { font-size: clamp(1.4rem, 2.6vw, 2rem); font-weight: 800; }
  .desc { color: var(--muted); margin: 14px 0 18px; }
  .tags { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; }
  .tags li { padding: 4px 12px; font-size: .8rem; color: var(--text); }
  @media (max-width: 899px) { .project { grid-template-columns: 1fr; } .project.reverse .media { order: 0; } }
</style>
```

- [ ] **Step 4: Implement the gallery script**

`src/scripts/gallery.ts`:

```ts
export function initGalleries(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-gallery]').forEach((g) => {
    const slides = g.querySelectorAll<HTMLElement>('[data-slide]');
    const thumbs = g.querySelectorAll<HTMLAnchorElement>('[data-thumb]');
    thumbs.forEach((t) => t.addEventListener('click', (ev) => {
      ev.preventDefault();
      const i = t.dataset.index!;
      slides.forEach((s) => { s.hidden = s.dataset.index !== i; });
      thumbs.forEach((x) => (x === t ? x.setAttribute('aria-current', 'true') : x.removeAttribute('aria-current')));
    }));
  });
}
```

- [ ] **Step 5: Build the Software Development page**

`src/pages/software.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';
import ProjectSection from '../components/ProjectSection.astro';
import { visibleSorted } from '../lib/projects';
import { slugify } from '../lib/taxonomy';
const projects = visibleSorted(await getCollection('software'));
---
<Layout title="Software Development" description="Software projects by Muhammad Zarif Nurhan: AI systems, full-stack web apps and desktop software." page="software">
  <div class="container">
    <header class="page-title" data-reveal>
      <h1><span class="sym" style="color:var(--sw)" aria-hidden="true">&lt;/&gt; </span>Software Development</h1>
      <p>AI systems, full-stack web applications and desktop software, built during my Computer Science degree.</p>
    </header>
    <!-- FilterBar inserted in Task 5 -->
    {projects.map((p, i) => (
      <ProjectSection
        id={p.id.split('/')[0]!}
        title={p.data.title}
        eyebrow={`${p.data.course} · ${p.data.team}`}
        tags={p.data.stack}
        description={p.data.description}
        images={p.data.images}
        filterSlugs={p.data.languages.map(slugify)}
        reverse={i % 2 === 1}
        accent="sw"
      />
    ))}
  </div>
</Layout>
<script>
  import { initGalleries } from '../scripts/gallery';
  initGalleries();
</script>
```

- [ ] **Step 6: Run the test to confirm it passes**

Run: `npx playwright test tests/e2e/gallery.spec.ts`
Expected: PASS on desktop and mobile. A skip is fine only if every project has a single image.

- [ ] **Step 7: Commit**

```bash
git add src/components/ProjectSection.astro src/scripts/gallery.ts src/pages/software.astro tests/e2e/gallery.spec.ts
git commit -m "feat: add alternating project sections and software page"
```

---

### Task 5: Filter bar with URL sync

**Files:**
- Create: `src/components/FilterBar.astro`, `src/scripts/filter.ts`
- Modify: `src/pages/software.astro` (insert the FilterBar)
- Test: `tests/e2e/filters.spec.ts`

**Interfaces:**
- Consumes: `deriveOptions`, `matches`, `parseFilterParam`, `slugify`, `LANGUAGES`, and the DOM contract from Task 4.
- Produces:
  - `FilterBar.astro` props: `{ param: 'lang' | 'type'; options: string[]; label: string }`
  - `initFilter(group: HTMLElement): void`. The group is `[data-filter-group][data-param]`, and it filters the `section[data-filter-item]` elements in the same `main`.

- [ ] **Step 1: Write the failing test**

`tests/e2e/filters.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test';

const titles = (page: Page) => page.locator('section[data-filter-item]:visible h2');

test('Python shows StockSense and Fuzzy Logic and updates the URL', async ({ page }) => {
  await page.goto('/software');
  const bar = page.getByRole('group', { name: 'Filter by language' });
  await expect(bar.getByRole('button')).toHaveText(['All', 'Python', 'JavaScript', 'PHP', 'Java', 'SQL']);
  await bar.getByRole('button', { name: 'Python' }).click();
  await expect(bar.getByRole('button', { name: 'Python' })).toHaveAttribute('aria-pressed', 'true');
  await expect(titles(page)).toHaveText([/^StockSense/, /^Student Performance/]);
  await expect(page).toHaveURL(/\?lang=python$/);
  await bar.getByRole('button', { name: 'All' }).click();
  await expect(titles(page)).toHaveCount(4);
  await expect(page).toHaveURL(/\/software$/);
});

test('Java shows only Fixer', async ({ page }) => {
  await page.goto('/software?lang=java');
  await expect(titles(page)).toHaveText([/^Fixer/]);
});

for (const q of ['?lang=COBOL', '?lang=', '?lang=%20', '?type=python']) {
  test(`bad param ${q} falls back to All`, async ({ page }) => {
    await page.goto(`/software${q}`);
    await expect(titles(page)).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });
}

test('param is case-insensitive', async ({ page }) => {
  await page.goto('/software?lang=PyThOn');
  await expect(titles(page)).toHaveCount(2);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx playwright test tests/e2e/filters.spec.ts --project=desktop`
Expected: FAIL. No group named "Filter by language" exists yet.

- [ ] **Step 3: Implement the FilterBar component and its script**

`src/components/FilterBar.astro`:

```astro
---
import { slugify } from '../lib/taxonomy';
interface Props { param: 'lang' | 'type'; options: string[]; label: string }
const { param, options, label } = Astro.props;
---
<div class="filters" role="group" aria-label={label} data-filter-group data-param={param} data-options={options.map(slugify).join(' ')} hidden>
  <button type="button" class="glass" data-filter-option="all" aria-pressed="true">All</button>
  {options.map((o) => <button type="button" class="glass" data-filter-option={slugify(o)} aria-pressed="false">{o}</button>)}
</div>
<style>
  .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .filters[hidden] { display: none; }
  button { color: var(--muted); padding: 8px 16px; font: 600 .9rem var(--font-body); cursor: pointer; transition: background .2s, color .2s; }
  button:hover { color: var(--text); }
  button[aria-pressed='true'] { color: #0b0b14; background: var(--text); border-color: var(--text); }
</style>
<script>
  import { initFilter } from '../scripts/filter';
  document.querySelectorAll<HTMLElement>('[data-filter-group]').forEach(initFilter);
</script>
```

The bar is `hidden` in the HTML and only revealed by JavaScript, so visitors without JS see every project and no dead buttons.

`src/scripts/filter.ts`:

```ts
import { matches, parseFilterParam } from '../lib/filters';

export function initFilter(group: HTMLElement): void {
  const param = group.dataset.param!;
  const optionSlugs = (group.dataset.options ?? '').split(' ').filter(Boolean);
  const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('[data-filter-option]'));
  const items = Array.from((group.closest('main') ?? document).querySelectorAll<HTMLElement>('[data-filter-item]'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const apply = (active: string | null, push: boolean) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.filterOption === 'all' ? null : b.dataset.filterOption) === active)));
    items.forEach((el) => {
      const show = matches((el.dataset.filterValues ?? '').split(' '), active);
      if (show === !el.hidden) return;
      if (show) { el.hidden = false; if (!reduce) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 }); }
      else el.hidden = true;
    });
    if (push) {
      const url = new URL(location.href);
      if (active) url.searchParams.set(param, active); else url.searchParams.delete(param);
      history.replaceState(null, '', url);
    }
  };

  buttons.forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.filterOption!;
    apply(v === 'all' ? null : v, true);
  }));
  group.hidden = false;
  apply(parseFilterParam(location.search, param, optionSlugs), false);
}
```

Add `[data-filter-item][hidden] { display: none !important; }` to `src/styles/global.css`.

- [ ] **Step 4: Insert the FilterBar into the Software Development page**

In `src/pages/software.astro`, add these imports to the frontmatter:

```ts
import FilterBar from '../components/FilterBar.astro';
import { deriveOptions } from '../lib/filters';
import { LANGUAGES } from '../lib/taxonomy';
const languageOptions = deriveOptions(projects.map((p) => p.data.languages), LANGUAGES);
```

Replace the `<!-- FilterBar inserted in Task 5 -->` comment with:

```astro
<FilterBar param="lang" options={languageOptions} label="Filter by language" />
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npx playwright test tests/e2e/filters.spec.ts tests/e2e/gallery.spec.ts`
Expected: PASS on both viewports.

- [ ] **Step 6: Commit**

```bash
git add src/components/FilterBar.astro src/scripts/filter.ts src/pages/software.astro src/styles/global.css tests/e2e/filters.spec.ts
git commit -m "feat: add language filter with URL sync"
```

---

### Task 6: Full-screen image viewer (lightbox)

**Files:**
- Create: `src/components/Lightbox.astro`, `src/scripts/lightbox.ts`
- Modify: `src/layouts/Layout.astro` (include `<Lightbox />` before `</body>`)
- Test: `tests/e2e/lightbox.spec.ts`

**Interfaces:**
- Consumes: the `[data-gallery]` JSON and the `a[data-open-lightbox][data-index]` elements from Task 4.
- Produces: `initLightbox(): void`, which binds every `[data-open-lightbox]` on the page to the single `dialog#lightbox`.

- [ ] **Step 1: Write the failing test**

`tests/e2e/lightbox.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('opens on click, wraps with arrows, closes with Esc and restores focus', async ({ page }) => {
  await page.goto('/software');
  const section = page.locator('section[data-filter-item]').first();
  const count = JSON.parse((await section.locator('[data-gallery]').getAttribute('data-gallery'))!).length;
  const opener = section.locator('[data-slide]:visible');
  await opener.focus();
  await page.keyboard.press('Enter');
  const dlg = page.getByRole('dialog', { name: 'Image viewer' });
  await expect(dlg).toBeVisible();
  const img = dlg.locator('img');
  const first = await img.getAttribute('src');
  if (count > 1) {
    for (let i = 0; i < count; i++) await page.keyboard.press('ArrowRight');
    await expect(img).toHaveAttribute('src', first!); // wrapped back to the first image
    await expect(dlg.getByText(`1 / ${count}`)).toBeVisible();
  } else {
    await expect(dlg.getByRole('button', { name: 'Next image' })).toBeHidden();
  }
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
  await expect(opener).toBeFocused();
});

test('backdrop click closes', async ({ page }) => {
  await page.goto('/software');
  await page.locator('section[data-filter-item] [data-slide]:visible').first().click();
  const dlg = page.getByRole('dialog', { name: 'Image viewer' });
  await expect(dlg).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dlg).toBeHidden();
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx playwright test tests/e2e/lightbox.spec.ts --project=desktop`
Expected: FAIL. No dialog exists yet.

- [ ] **Step 3: Implement the viewer**

`src/components/Lightbox.astro`:

```astro
<dialog id="lightbox" aria-label="Image viewer">
  <figure>
    <img alt="" />
    <figcaption><span data-lb-caption></span> <span class="count" data-lb-count></span></figcaption>
  </figure>
  <button type="button" class="nav prev glass" data-lb-prev aria-label="Previous image">‹</button>
  <button type="button" class="nav next glass" data-lb-next aria-label="Next image">›</button>
  <button type="button" class="close glass" data-lb-close aria-label="Close">✕</button>
</dialog>
<style>
  dialog { width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: transparent; color: var(--text); }
  dialog::backdrop { background: rgba(5,5,11,.92); }
  figure { margin: 0; height: 100%; display: grid; place-items: center; padding: 56px 72px 64px; pointer-events: none; }
  img { max-width: 100%; max-height: calc(100vh - 140px); object-fit: contain; pointer-events: auto; border-radius: 8px; }
  figcaption { color: var(--muted); font-size: .9rem; margin-top: 12px; text-align: center; }
  .count { color: var(--dim); margin-left: 8px; }
  button { position: fixed; color: var(--text); font-size: 1.6rem; width: 48px; height: 48px; cursor: pointer; display: grid; place-items: center; }
  .prev { left: 16px; top: 50%; } .next { right: 16px; top: 50%; } .close { right: 16px; top: 16px; font-size: 1.1rem; }
  [hidden] { display: none; }
</style>
<script>
  import { initLightbox } from '../scripts/lightbox';
  initLightbox();
</script>
```

`src/scripts/lightbox.ts`:

```ts
type Item = { src: string; alt: string };

export function initLightbox(): void {
  const dlg = document.getElementById('lightbox') as HTMLDialogElement | null;
  if (!dlg) return;
  const img = dlg.querySelector('img')!;
  const cap = dlg.querySelector<HTMLElement>('[data-lb-caption]')!;
  const count = dlg.querySelector<HTMLElement>('[data-lb-count]')!;
  const prev = dlg.querySelector<HTMLButtonElement>('[data-lb-prev]')!;
  const next = dlg.querySelector<HTMLButtonElement>('[data-lb-next]')!;
  let items: Item[] = [];
  let index = 0;
  let opener: HTMLElement | null = null;

  const show = (i: number) => {
    index = (i + items.length) % items.length;
    const it = items[index]!;
    img.onerror = () => { img.hidden = true; cap.textContent = it.alt; };
    img.hidden = false;
    img.src = it.src;
    img.alt = it.alt;
    cap.textContent = it.alt;
    count.textContent = `${index + 1} / ${items.length}`;
    const multi = items.length > 1;
    prev.hidden = !multi; next.hidden = !multi; count.hidden = !multi;
  };

  document.querySelectorAll<HTMLAnchorElement>('[data-open-lightbox]').forEach((a) => a.addEventListener('click', (ev) => {
    ev.preventDefault();
    items = JSON.parse(a.closest<HTMLElement>('[data-gallery]')!.dataset.gallery!);
    opener = a;
    show(Number(a.dataset.index ?? 0));
    dlg.showModal();
  }));

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  dlg.querySelector('[data-lb-close]')!.addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg || (ev.target as HTMLElement).tagName === 'FIGURE') dlg.close(); });
  dlg.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight' && items.length > 1) { ev.preventDefault(); show(index + 1); }
    if (ev.key === 'ArrowLeft' && items.length > 1) { ev.preventDefault(); show(index - 1); }
  });
  let startX = 0;
  dlg.addEventListener('touchstart', (e) => { startX = e.touches[0]!.clientX; }, { passive: true });
  dlg.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0]!.clientX - startX;
    if (Math.abs(dx) > 50 && items.length > 1) show(index + (dx < 0 ? 1 : -1));
  });
  dlg.addEventListener('close', () => opener?.focus());
}
```

In `src/layouts/Layout.astro`, import `Lightbox` from `'../components/Lightbox.astro'` and place `<Lightbox />` immediately after `<Footer />`.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx playwright test tests/e2e/lightbox.spec.ts`
Expected: PASS on both viewports.

- [ ] **Step 5: Commit**

```bash
git add src/components/Lightbox.astro src/scripts/lightbox.ts src/layouts/Layout.astro tests/e2e/lightbox.spec.ts
git commit -m "feat: add full-screen image viewer"
```

---

### Task 7: 3D Visualization page

**Files:**
- Modify: `src/pages/3d.astro`
- Test: `tests/e2e/viz.spec.ts`

**Interfaces:**
- Consumes: the `visualization` collection, `ProjectSection`, `FilterBar`, `deriveOptions`, `CATEGORIES`, `slugify`, `visibleSorted`, `initGalleries`.

- [ ] **Step 1: Write the failing test**

`tests/e2e/viz.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test';
const titles = (page: Page) => page.locator('section[data-filter-item]:visible h2');

test('3D page shows published projects in order, hides the JOHEX draft', async ({ page }) => {
  await page.goto('/3d');
  await expect(titles(page)).toHaveText(['Moltech Johor Warehouse', 'SLICE 2025 – School Leavers Inspiration & Success Initiatives', 'Gobami Product Visualization']);
  await expect(page.getByText('JOHEX')).toHaveCount(0);
  await expect(page.locator('section[data-filter-item]').first()).toContainText('Client Project');
  await expect(page.locator('section[data-filter-item]').nth(2)).toContainText('Personal Project');
});

test('category filter', async ({ page }) => {
  await page.goto('/3d');
  const bar = page.getByRole('group', { name: 'Filter by type' });
  await expect(bar.getByRole('button')).toHaveText(['All', 'Architectural Visualization', 'Product Visualization']);
  await bar.getByRole('button', { name: 'Product Visualization' }).click();
  await expect(titles(page)).toHaveText(['Gobami Product Visualization']);
  await expect(page).toHaveURL(/\?type=product-visualization$/);
  await page.goto('/3d?type=nonsense');
  await expect(titles(page)).toHaveCount(3);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx playwright test tests/e2e/viz.spec.ts --project=desktop`
Expected: FAIL. The page is still the placeholder.

- [ ] **Step 3: Build the page**

`src/pages/3d.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';
import ProjectSection from '../components/ProjectSection.astro';
import FilterBar from '../components/FilterBar.astro';
import { visibleSorted } from '../lib/projects';
import { deriveOptions } from '../lib/filters';
import { CATEGORIES, slugify } from '../lib/taxonomy';
const projects = visibleSorted(await getCollection('visualization'));
const categoryOptions = deriveOptions(projects.map((p) => [p.data.category]), CATEGORIES);
---
<Layout title="3D Visualization" description="3D architectural and product visualization by Muhammad Zarif Nurhan, made in Blender." page="viz">
  <div class="container">
    <header class="page-title" data-reveal>
      <h1><span class="sym" style="color:var(--viz)" aria-hidden="true">◇ </span>3D Visualization</h1>
      <p>Architectural and product visualization created in Blender, mostly for real clients.</p>
    </header>
    <FilterBar param="type" options={categoryOptions} label="Filter by type" />
    {projects.map((p, i) => (
      <ProjectSection
        id={p.id.split('/')[0]!}
        title={p.data.title}
        eyebrow={`${p.data.client ? 'Client Project' : 'Personal Project'} · ${p.data.category}`}
        tags={[p.data.category, 'Blender']}
        description={p.data.description}
        images={p.data.images}
        filterSlugs={[slugify(p.data.category)]}
        reverse={i % 2 === 1}
        accent="viz"
      />
    ))}
  </div>
</Layout>
<script>
  import { initGalleries } from '../scripts/gallery';
  initGalleries();
</script>
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx playwright test tests/e2e/viz.spec.ts tests/e2e/lightbox.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/3d.astro tests/e2e/viz.spec.ts
git commit -m "feat: add 3D visualization page with category filter"
```

---

### Task 8: Home page with hero, About Me, pick-a-side and static badge

**Files:**
- Create: `src/components/home/Hero.astro`, `src/components/home/About.astro`, `src/components/home/PickSide.astro`, `src/components/badge/BadgeStatic.tsx`
- Modify: `src/pages/index.astro`
- Test: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `site`, `initials`.
- Produces:
  - `BadgeStatic` React component, props `{ name: string; role: string; photo: string | null }`, rendering `div.badge-static`
  - DOM anchors for Task 9:
    - `[data-badge-slot]`: the right column of the hero, where the island mounts
    - `[data-badge-anchor="hero"]`: the same element
    - `[data-badge-anchor="split"]`: the divider element in pick-a-side, with zero width, centred
    - `[data-split]`: the pick-a-side section

- [ ] **Step 1: Write the failing test**

`tests/e2e/home.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('home shows name, headline, about, both sides and the badge', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Muhammad Zarif Nurhan Bin Mohd Arifin');
  await expect(page.getByText('Computer Science student who builds software and 3D spaces.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'About me' })).toBeVisible();
  await expect(page.getByText("Hi, I'm Zarif, a final-year Computer Science (Honours) student at UCSI University.")).toBeVisible();
  const sw = page.getByRole('link', { name: /Software Development/ }).last();
  const viz = page.getByRole('link', { name: /3D Visualization/ }).last();
  await expect(sw).toHaveAttribute('href', '/software');
  await expect(viz).toHaveAttribute('href', '/3d');
  await expect(page.locator('[data-badge-slot]')).toContainText('MZN');
});

test('pick-a-side stacks below 900px', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/');
  const halves = page.locator('[data-split] a');
  const [a, b] = [await halves.nth(0).boundingBox(), await halves.nth(1).boundingBox()];
  expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx playwright test tests/e2e/home.spec.ts --project=desktop`
Expected: FAIL. The page has only the "Home" heading.

- [ ] **Step 3: Implement the static badge and home sections**

`src/components/badge/BadgeStatic.tsx`:

```tsx
import { initials } from '../../lib/initials';

export default function BadgeStatic({ name, role, photo }: { name: string; role: string; photo: string | null }) {
  return (
    <div className="badge-static" aria-hidden="true">
      <div className="badge-strap" />
      <div className="badge-card">
        <div className="badge-clip" />
        {photo ? <img className="badge-photo" src={photo} alt="" /> : <div className="badge-photo badge-mono">{initials(name)}</div>}
        <div className="badge-name">{name.split(' ').slice(0, 3).join(' ').toUpperCase()}</div>
        <div className="badge-role">{role}</div>
      </div>
    </div>
  );
}
```

Add the badge styles to `src/styles/global.css` (global, because a React component renders the markup):

```css
.badge-static { display: flex; flex-direction: column; align-items: center; }
.badge-strap { width: 22px; height: 120px; background: repeating-linear-gradient(180deg, #1e1b3a 0 14px, #2a2650 14px 28px); border-radius: 2px; }
.badge-card { position: relative; width: 210px; aspect-ratio: 1 / 1.4; margin-top: -4px; background: linear-gradient(160deg, #f8f8ff, #dcdcf0); color: #0b0b14; border-radius: 18px; box-shadow: 0 30px 60px rgba(0,0,0,.55); display: flex; flex-direction: column; align-items: center; padding: 34px 16px 18px; transform: rotate(-4deg); }
.badge-clip { position: absolute; top: -10px; width: 44px; height: 16px; border-radius: 4px; background: #9ca3af; }
.badge-photo { width: 104px; height: 104px; border-radius: 50%; object-fit: cover; }
.badge-mono { display: grid; place-items: center; background: linear-gradient(135deg, #3b2a7a, #0e4a5a); color: #f5f5ff; font: 800 2rem var(--font-head); letter-spacing: .06em; }
.badge-name { margin-top: 16px; font: 800 .82rem/1.25 var(--font-head); text-align: center; letter-spacing: .03em; }
.badge-role { margin-top: 6px; font-size: .68rem; color: #4b4f6b; text-align: center; }
@media (prefers-reduced-motion: no-preference) { .badge-card { animation: badge-sway 6s ease-in-out infinite; transform-origin: 50% -130px; } }
@keyframes badge-sway { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(3deg); } }
```

These transforms apply to the static badge itself, which is not an ancestor of the fixed canvas, so they don't break the Global Constraint.

`src/components/home/Hero.astro`:

```astro
---
import { site } from '../../data/site';
---
<section class="hero container" aria-labelledby="hero-name">
  <div class="intro">
    <h1 id="hero-name">{site.name}</h1>
    <p class="headline">{site.headline}</p>
  </div>
  <div class="slot" data-badge-slot data-badge-anchor="hero"><slot /></div>
</section>
<style>
  .hero { display: grid; grid-template-columns: 1.3fr 1fr; align-items: center; gap: 32px; min-height: calc(100vh - 64px); padding-block: 48px; }
  h1 { font-size: clamp(2.2rem, 5.2vw, 4.2rem); font-weight: 800; letter-spacing: -.01em; }
  .headline { font-size: clamp(1.05rem, 1.6vw, 1.3rem); color: var(--muted); margin: 18px 0 0; max-width: 34ch; }
  .slot { position: relative; min-height: 460px; display: flex; justify-content: center; align-items: flex-start; }
  @media (max-width: 899px) {
    .hero { grid-template-columns: 1fr; min-height: auto; text-align: center; padding-top: 24px; }
    .slot { order: -1; min-height: 380px; }
    .headline { margin-inline: auto; }
  }
</style>
```

`src/components/home/About.astro`:

```astro
---
import { site } from '../../data/site';
---
<section class="about container" aria-labelledby="about-title" data-reveal>
  <h2 id="about-title">About me</h2>
  <div class="body">{site.about.map((p) => <p>{p}</p>)}</div>
</section>
<style>
  .about { display: grid; grid-template-columns: 200px minmax(0, 60ch); gap: 32px; padding-block: 72px; }
  h2 { font-size: .85rem; letter-spacing: .16em; text-transform: uppercase; color: var(--sw); padding-top: 6px; }
  p { margin: 0 0 16px; color: var(--muted); font-size: 1.08rem; }
  p:first-child { color: var(--text); font-size: 1.2rem; }
  @media (max-width: 899px) { .about { grid-template-columns: 1fr; gap: 12px; } }
</style>
```

The text column is capped at 60ch on the left, which leaves the right margin free for the travelling badge.

`src/components/home/PickSide.astro`:

```astro
<section class="split" data-split aria-label="Choose a side">
  <a class="half sw" href="/software">
    <span class="sym" aria-hidden="true">&lt;/&gt;</span>
    <span class="t">Software Development</span>
    <span class="s">AI systems, full-stack web apps and desktop software</span>
    <span class="go">Explore projects →</span>
  </a>
  <div class="divider" data-badge-anchor="split" aria-hidden="true"></div>
  <a class="half viz" href="/3d">
    <span class="sym" aria-hidden="true">◇</span>
    <span class="t">3D Visualization</span>
    <span class="s">Warehouses, event venues and products, made in Blender</span>
    <span class="go">← View renders</span>
  </a>
</section>
<style>
  .split { position: relative; display: grid; grid-template-columns: 1fr 1fr; min-height: 70vh; margin-top: 48px; border-block: 1px solid var(--border); }
  .divider { position: absolute; left: 50%; top: 0; bottom: 0; width: 0; border-left: 1px solid var(--border); }
  .half { display: flex; flex-direction: column; justify-content: flex-end; gap: 10px; padding: clamp(28px, 5vw, 64px); text-decoration: none; transition: background .3s; }
  .sw { background: radial-gradient(circle at 20% 20%, rgba(96,165,250,.22), transparent 60%); }
  .viz { background: radial-gradient(circle at 80% 20%, rgba(245,158,11,.22), transparent 60%); text-align: right; align-items: flex-end; }
  .sw:hover { background-color: rgba(96,165,250,.06); } .viz:hover { background-color: rgba(245,158,11,.06); }
  .sym { font-size: 2.4rem; } .sw .sym, .sw .go { color: var(--sw); } .viz .sym, .viz .go { color: var(--viz); }
  .t { font: 800 clamp(1.6rem, 3vw, 2.4rem) var(--font-head); }
  .s { color: var(--muted); max-width: 34ch; }
  .go { font-weight: 700; margin-top: 8px; }
  @media (max-width: 899px) {
    .split { grid-template-columns: 1fr; min-height: auto; }
    .divider { display: none; }
    .half { min-height: 40vh; }
    .viz { text-align: left; align-items: flex-start; }
    .viz .go::before { content: ''; }
  }
</style>
```

`src/pages/index.astro`:

```astro
---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/home/Hero.astro';
import About from '../components/home/About.astro';
import PickSide from '../components/home/PickSide.astro';
import BadgeStatic from '../components/badge/BadgeStatic.tsx';
import { site } from '../data/site';
---
<Layout title="Home" description="Portfolio of Muhammad Zarif Nurhan Bin Mohd Arifin: software development and 3D visualization." page="home">
  <Hero><BadgeStatic name={site.name} role={site.badge.role} photo={site.badge.photo} /></Hero>
  <About />
  <PickSide />
</Layout>
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx playwright test tests/e2e/home.spec.ts tests/e2e/shell.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/home src/components/badge/BadgeStatic.tsx src/pages/index.astro src/styles/global.css tests/e2e/home.spec.ts
git commit -m "feat: add home page with hero, about, pick-a-side and static badge"
```

---

### Task 9: Lanyard physics badge with travel and fallbacks

**Files:**
- Create: `src/components/badge/anchor.ts`, `src/components/badge/textures.ts`, `src/components/badge/Lanyard.tsx`, `src/components/badge/BadgeIsland.tsx`
- Modify: `src/pages/index.astro` (swap `BadgeStatic` for `<BadgeIsland client:idle />`)
- Test: `tests/unit/anchor.test.ts`, `tests/e2e/badge.spec.ts`

**Interfaces:**
- Consumes: `BadgeStatic`, `initials`, `site`, and the DOM anchors from Task 8.
- Produces:
  - `badgeAnchor(input: AnchorInput): { x: number; y: number; progress: number }`, where `AnchorInput = { heroX: number; splitX: number; splitTop: number; splitHeight: number; viewportH: number; hang: number }` (all in CSS px, viewport coordinates)
  - `TOP_OFFSET = -24`
  - `BadgeIsland` default export, props `{ name: string; role: string; photo: string | null }`. It renders `[data-badge-mode="static" | "3d-travel" | "3d-inline"]`.

**Behaviour contract for `badgeAnchor`:**
- `p = clamp((viewportH - splitTop) / (viewportH * 0.6), 0, 1)`
- `t = p²(3 − 2p)` (smoothstep)
- `x = heroX + (splitX − heroX)·t`
- `y = min(TOP_OFFSET, splitTop + splitHeight/2 − hang)`

Before the split section enters the viewport, the badge hangs at the hero's x from just above the top edge. As the split section rises, the anchor slides toward the divider. Once the split section's centre reaches the card's resting height, the anchor follows the section upward, so the badge scrolls away with it.

- [ ] **Step 1: Write the failing unit test**

`tests/unit/anchor.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { badgeAnchor, TOP_OFFSET } from '../../src/components/badge/anchor';

const base = { heroX: 1000, splitX: 720, splitHeight: 600, viewportH: 900, hang: 400 };

describe('badgeAnchor', () => {
  it('stays at the hero when the split section is below the fold', () => {
    expect(badgeAnchor({ ...base, splitTop: 2000 })).toEqual({ x: 1000, y: TOP_OFFSET, progress: 0 });
  });
  it('is halfway across at half progress', () => {
    const r = badgeAnchor({ ...base, splitTop: 900 - 270 });
    expect(r.progress).toBeCloseTo(0.5);
    expect(r.x).toBeCloseTo(860);
    expect(r.y).toBe(TOP_OFFSET);
  });
  it('reaches the divider at full progress', () => {
    const r = badgeAnchor({ ...base, splitTop: 360 });
    expect(r.progress).toBe(1);
    expect(r.x).toBe(720);
  });
  it('follows the section upward once centred under the card', () => {
    const r = badgeAnchor({ ...base, splitTop: -200 });
    expect(r.y).toBe(-200 + 300 - 400);
    expect(r.x).toBe(720);
  });
  it('is continuous at the lock point', () => {
    const lock = TOP_OFFSET + base.hang - base.splitHeight / 2;
    const a = badgeAnchor({ ...base, splitTop: lock + 0.5 }).y;
    const b = badgeAnchor({ ...base, splitTop: lock - 0.5 }).y;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run tests/unit/anchor.test.ts`
Expected: FAIL. The module can't be resolved yet.

- [ ] **Step 3: Implement `anchor.ts`**

`src/components/badge/anchor.ts`:

```ts
export const TOP_OFFSET = -24;
// Scene constants, shared with Lanyard.tsx so this module can compute hang without loading three.js.
export const CAMERA_Z = 13, FOV = 25;
export const SEG = 0.45;
export const CARD_W = 1.2, CARD_H = 1.68;
export const HANG_WORLD = 3 * SEG + CARD_H / 2; // rope length plus half the card height, at rest
/** World height visible at z=0 is 2·z·tan(fov/2); convert the hang to CSS px for a given viewport height. */
export const hangPx = (viewportH: number) => (HANG_WORLD / (2 * CAMERA_Z * Math.tan((FOV / 2) * Math.PI / 180))) * viewportH;

export interface AnchorInput { heroX: number; splitX: number; splitTop: number; splitHeight: number; viewportH: number; hang: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function badgeAnchor({ heroX, splitX, splitTop, splitHeight, viewportH, hang }: AnchorInput) {
  const progress = clamp((viewportH - splitTop) / (viewportH * 0.6), 0, 1);
  const t = progress * progress * (3 - 2 * progress);
  const x = heroX + (splitX - heroX) * t;
  const y = Math.min(TOP_OFFSET, splitTop + splitHeight / 2 - hang);
  return { x, y, progress };
}
```

Run: `npx vitest run tests/unit/anchor.test.ts`
Expected: PASS.

- [ ] **Step 4: Implement the canvas textures**

`src/components/badge/textures.ts`:

```ts
import * as THREE from 'three';
import { initials } from '../../lib/initials';

export async function cardFaceTexture(name: string, role: string, photo: string | null): Promise<THREE.CanvasTexture> {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1434;
  const g = c.getContext('2d')!;
  await document.fonts.ready;
  const grad = g.createLinearGradient(0, 0, 1024, 1434);
  grad.addColorStop(0, '#f8f8ff'); grad.addColorStop(1, '#dcdcf0');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 1434);
  g.fillStyle = '#0b0b14'; g.fillRect(0, 0, 1024, 120);
  g.fillStyle = '#f5f5ff'; g.font = '700 44px "Sora Variable", sans-serif'; g.textAlign = 'center';
  g.fillText('</>   ◇', 512, 80);
  const cx = 512, cy = 520, r = 260;
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  let drewPhoto = false;
  if (photo) {
    try {
      const img = new Image(); img.src = photo; await img.decode();
      const s = Math.max((2 * r) / img.width, (2 * r) / img.height);
      g.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
      drewPhoto = true;
    } catch { /* fall through to monogram */ }
  }
  if (!drewPhoto) {
    const mg = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    mg.addColorStop(0, '#3b2a7a'); mg.addColorStop(1, '#0e4a5a');
    g.fillStyle = mg; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    g.fillStyle = '#f5f5ff'; g.font = '800 170px "Sora Variable", sans-serif'; g.textBaseline = 'middle';
    g.fillText(initials(name), cx, cy + 6);
  }
  g.restore();
  g.textBaseline = 'alphabetic'; g.fillStyle = '#0b0b14';
  const words = name.toUpperCase().split(' ');
  g.font = '800 68px "Sora Variable", sans-serif';
  g.fillText(words.slice(0, 3).join(' '), 512, 940);
  g.font = '600 46px "Sora Variable", sans-serif'; g.fillStyle = '#4b4f6b';
  g.fillText(words.slice(3).join(' '), 512, 1010);
  g.font = '600 44px "Inter Variable", sans-serif'; g.fillStyle = '#3b2a7a';
  g.fillText(role, 512, 1150);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

export function strapTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1e1b3a'; g.fillRect(0, 0, 1024, 128);
  g.fillStyle = '#c4c6e0'; g.font = '700 56px "Sora Variable", sans-serif'; g.textBaseline = 'middle';
  g.fillText('</>  ◇  ZARIF   </>  ◇  ZARIF', 24, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
```

- [ ] **Step 5: Implement the Lanyard scene**

`src/components/badge/Lanyard.tsx` is adapted from the pmndrs/Vercel lanyard pattern. The rope is three joints of length `SEG`, and a spherical joint connects the card. The fixed body is kinematic, and each frame it moves to the anchor that `getAnchorPx()` returns, converted from pixels to world coordinates.

```tsx
import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint, type RapierRigidBody } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import { cardFaceTexture, strapTexture } from './textures';
import { CAMERA_Z, FOV, SEG, CARD_W, CARD_H } from './anchor';

extend({ MeshLineGeometry, MeshLineMaterial });
declare module '@react-three/fiber' {
  interface ThreeElements { meshLineGeometry: any; meshLineMaterial: any }
}

export interface LanyardProps {
  name: string; role: string; photo: string | null;
  /** Anchor in canvas-local CSS px. Called every frame. */
  getAnchorPx: () => { x: number; y: number };
  active: boolean;
}

export default function Lanyard({ active, ...p }: LanyardProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, CAMERA_Z], fov: FOV }}
      dpr={[1, 2]}
      frameloop={active ? 'always' : 'never'}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      eventPrefix="client"
      gl={{ alpha: true, antialias: true }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 5, 6]} intensity={1.6} />
      <Physics gravity={[0, -40, 0]} timeStep={1 / 60}>
        <Band {...p} />
      </Physics>
    </Canvas>
  );
}

type Seg = RapierRigidBody & { lerped?: THREE.Vector3 };

function Band({ name, role, photo, getAnchorPx }: Omit<LanyardProps, 'active'>) {
  const band = useRef<THREE.Mesh>(null!);
  const fixed = useRef<Seg>(null!), j1 = useRef<Seg>(null!), j2 = useRef<Seg>(null!), j3 = useRef<Seg>(null!), card = useRef<Seg>(null!);
  const [vec, dir, ang, rot] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const { size, viewport } = useThree();
  const [curve] = useState(() => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]));
  const [dragged, drag] = useState<false | THREE.Vector3>(false);
  const [face, setFace] = useState<THREE.Texture | null>(null);
  const [strap] = useState(() => strapTexture());
  useEffect(() => { let live = true; cardFaceTexture(name, role, photo).then((t) => live && setFace(t)); return () => { live = false; }; }, [name, role, photo]);

  const seg = { type: 'dynamic' as const, canSleep: true, colliders: false as const, angularDamping: 2, linearDamping: 2 };
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], SEG]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], SEG]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], SEG]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, CARD_H / 2, 0]]);

  useEffect(() => {
    if (!dragged) return;
    document.body.style.cursor = 'grabbing';
    const up = () => drag(false);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointerup', up); document.body.style.cursor = ''; };
  }, [dragged]);

  useFrame((state, delta) => {
    const a = getAnchorPx();
    const wx = (a.x / size.width - 0.5) * viewport.width;
    const wy = -(a.y / size.height - 0.5) * viewport.height;
    fixed.current?.setNextKinematicTranslation({ x: wx, y: wy, z: 0 });
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((r) => r.current?.wakeUp());
      card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
    }
    if (!fixed.current || !j1.current || !j2.current || !j3.current || !card.current) return;
    [j1, j2].forEach((ref) => {
      const r = ref.current!;
      if (!r.lerped) r.lerped = new THREE.Vector3().copy(r.translation() as THREE.Vector3);
      const d = Math.max(0.1, Math.min(1, r.lerped.distanceTo(r.translation() as THREE.Vector3)));
      r.lerped.lerp(r.translation() as THREE.Vector3, delta * (10 + d * 40));
    });
    curve.points[0]!.copy(j3.current.translation() as THREE.Vector3);
    curve.points[1]!.copy(j2.current.lerped!);
    curve.points[2]!.copy(j1.current.lerped!);
    curve.points[3]!.copy(fixed.current.translation() as THREE.Vector3);
    (band.current.geometry as any).setPoints(curve.getPoints(32));
    ang.copy(card.current.angvel() as THREE.Vector3);
    rot.copy(card.current.rotation() as unknown as THREE.Vector3);
    card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, true);
  });

  return (
    <>
      <RigidBody ref={fixed} type="kinematicPosition" colliders={false} />
      <RigidBody position={[0, -SEG, 0]} ref={j1} {...seg}><BallCollider args={[0.1]} /></RigidBody>
      <RigidBody position={[0, -2 * SEG, 0]} ref={j2} {...seg}><BallCollider args={[0.1]} /></RigidBody>
      <RigidBody position={[0, -3 * SEG, 0]} ref={j3} {...seg}><BallCollider args={[0.1]} /></RigidBody>
      <RigidBody position={[0, -3 * SEG - CARD_H / 2, 0]} ref={card} {...seg} type={dragged ? 'kinematicPosition' : 'dynamic'}>
        <CuboidCollider args={[CARD_W / 2, CARD_H / 2, 0.01]} />
        <RoundedBox
          args={[CARD_W, CARD_H, 0.03]} radius={0.08} smoothness={4}
          onPointerDown={(e) => { (e.target as Element)?.setPointerCapture?.(e.pointerId); drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current!.translation() as THREE.Vector3))); }}
          onPointerOver={() => { document.body.style.cursor = 'grab'; }}
          onPointerOut={() => { if (!dragged) document.body.style.cursor = ''; }}
        >
          <meshStandardMaterial map={face ?? undefined} color={face ? '#ffffff' : '#e8e8f4'} roughness={0.55} metalness={0.05} />
        </RoundedBox>
      </RigidBody>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial color="white" depthTest={false} resolution={[size.width, size.height]} useMap map={strap} repeat={[-4, 1]} lineWidth={0.22} />
      </mesh>
    </>
  );
}
```

`RoundedBox` maps the texture onto all six faces. That's acceptable: the edges are 0.03 thick, and the back showing the same face is fine. If the face texture looks stretched, set `tex.repeat`/`tex.offset` in `cardFaceTexture` so the 1024×1434 canvas covers the front face.

- [ ] **Step 6: Implement the island with mode selection and fallbacks**

`src/components/badge/BadgeIsland.tsx`:

```tsx
import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import BadgeStatic from './BadgeStatic';
import { badgeAnchor, hangPx, TOP_OFFSET } from './anchor';

const Lanyard = lazy(() => import('./Lanyard'));
type Mode = 'static' | '3d-travel' | '3d-inline';
type Props = { name: string; role: string; photo: string | null };

function webglOk(): boolean {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function BadgeIsland(props: Props) {
  const [mode, setMode] = useState<Mode>('static');
  const [active, setActive] = useState(true);
  const inlineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const wide = matchMedia('(min-width: 900px)');
    const decide = () => setMode(reduce.matches || !webglOk() ? 'static' : wide.matches ? '3d-travel' : '3d-inline');
    decide();
    reduce.addEventListener('change', decide); wide.addEventListener('change', decide);
    return () => { reduce.removeEventListener('change', decide); wide.removeEventListener('change', decide); };
  }, []);

  // Pause rendering when the tab is hidden, or (travel mode) once the split section has scrolled off the top.
  useEffect(() => {
    const check = () => {
      const split = document.querySelector('[data-split]')?.getBoundingClientRect();
      const onScreen = mode !== '3d-travel' || !split || split.bottom > 0;
      setActive(!document.hidden && onScreen);
    };
    check();
    addEventListener('scroll', check, { passive: true });
    document.addEventListener('visibilitychange', check);
    return () => { removeEventListener('scroll', check); document.removeEventListener('visibilitychange', check); };
  }, [mode]);

  const staticBadge = <BadgeStatic {...props} />;

  const getTravelAnchor = () => {
    const hero = document.querySelector('[data-badge-anchor="hero"]')!.getBoundingClientRect();
    const divider = document.querySelector('[data-badge-anchor="split"]')!.getBoundingClientRect();
    const split = document.querySelector('[data-split]')!.getBoundingClientRect();
    return badgeAnchor({ heroX: hero.left + hero.width / 2, splitX: divider.left, splitTop: split.top, splitHeight: split.height, viewportH: innerHeight, hang: hangPx(innerHeight) });
  };
  const getInlineAnchor = () => {
    const el = inlineRef.current;
    return { x: (el?.clientWidth ?? 0) / 2, y: TOP_OFFSET };
  };

  if (mode === 'static') return <div data-badge-mode="static">{staticBadge}</div>;

  const scene = (
    <Boundary fallback={staticBadge}>
      <Suspense fallback={staticBadge}>
        <Lanyard {...props} active={active} getAnchorPx={mode === '3d-travel' ? getTravelAnchor : getInlineAnchor} />
      </Suspense>
    </Boundary>
  );

  return mode === '3d-travel'
    ? <div data-badge-mode="3d-travel"><span className="visually-hidden">{props.name}</span><div style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none' }}>{scene}</div></div>
    : <div data-badge-mode="3d-inline" ref={inlineRef} style={{ position: 'relative', width: '100%', height: 380 }}>{scene}</div>;
}
```

Rendering pauses (`frameloop="never"`) while the tab is hidden or the split section is above the viewport. The scroll listener resumes it as soon as the section comes back.

In `src/pages/index.astro`, replace the `BadgeStatic` import and usage with:

```astro
import BadgeIsland from '../components/badge/BadgeIsland.tsx';
...
<Hero><BadgeIsland client:idle name={site.name} role={site.badge.role} photo={site.badge.photo} /></Hero>
```

The server render produces the static badge (mode starts as `static`), so the name shows before hydration and without JS.

- [ ] **Step 7: Write the badge e2e test**

`tests/e2e/badge.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('desktop uses travelling 3D badge, and the canvas does not block clicks', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('[data-badge-mode="3d-travel"] canvas')).toBeAttached({ timeout: 15_000 });
  await page.locator('[data-split]').scrollIntoViewIfNeeded();
  await page.getByRole('link', { name: /3D Visualization/ }).last().click();
  await expect(page).toHaveURL(/\/3d$/);
  expect(errors).toEqual([]);
});

test('reduced motion shows the static badge with the name', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-badge-mode="static"]')).toBeVisible();
  await expect(page.locator('[data-badge-slot]')).toContainText('MUHAMMAD ZARIF NURHAN');
  await expect(page.locator('[data-badge-slot] canvas')).toHaveCount(0);
  await ctx.close();
});

test('no WebGL falls back to the static badge', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error test override
    HTMLCanvasElement.prototype.getContext = function (t: string, ...a: unknown[]) { return /webgl/.test(t) ? null : orig.call(this, t, ...a); };
  });
  await page.goto('/');
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-badge-mode="static"]')).toBeVisible();
});

test('resizing across 900px switches mode without errors', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('[data-badge-mode="3d-travel"]')).toBeAttached({ timeout: 15_000 });
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(page.locator('[data-badge-mode="3d-inline"]')).toBeAttached();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('[data-badge-mode="3d-travel"]')).toBeAttached();
  expect(errors).toEqual([]);
});
```

Headless Chromium uses SwiftShader for WebGL, so the 3D tests run without a GPU. If `canvas` never attaches in CI-like headless runs, add `launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }` to the desktop project in `playwright.config.ts`.

- [ ] **Step 8: Run all tests**

Run: `npx vitest run && npx playwright test`
Expected: all tests PASS.

- [ ] **Step 9: Visual check and tuning**

Run `npm run dev` and open `http://localhost:4321` at 1440×900. Check:
1. The badge hangs on the right of the hero, with the strap coming from above the viewport.
2. Dragging the card swings it, and releasing it springs back.
3. Scrolling through About Me, the badge stays on the right and doesn't cover the text.
4. It slides to the divider and sits centred over the line.
5. It then scrolls away with the section.
6. Links under the canvas are still clickable.

If needed, tune `SEG`, `CARD_H`, `lineWidth` and the `0.6` progress window. Keep `anchor.test.ts` passing: tune constants, not the formula. Save screenshots to `.superpowers/screens/` (git-ignored) at scroll positions 0, 50% and the split section.

- [ ] **Step 10: Commit**

```bash
git add src/components/badge src/pages/index.astro tests/unit/anchor.test.ts tests/e2e/badge.spec.ts playwright.config.ts
git commit -m "feat: add physics lanyard badge with scroll travel and fallbacks"
```

---

### Task 10: Scroll reveals, link preview image and no-JS check

**Files:**
- Create: `src/scripts/reveal.ts`, `scripts/make-og.mjs`, `public/og.png` (generated)
- Modify: `src/layouts/Layout.astro` (add the reveal script and `html.js` class), `src/styles/global.css` (reveal styles)
- Test: `tests/e2e/nojs.spec.ts`, `tests/e2e/seo.spec.ts`

**Interfaces:**
- Consumes: the `[data-reveal]` attributes added in Tasks 4, 7 and 8.
- Produces: `initReveal(): void`.

- [ ] **Step 1: Write the failing tests**

`tests/e2e/nojs.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
test.use({ javaScriptEnabled: false });

test('all content is visible without JavaScript', async ({ page }) => {
  await page.goto('/software?lang=python');
  await expect(page.locator('section[data-filter-item]:visible')).toHaveCount(4);
  await expect(page.locator('[data-filter-group]')).toBeHidden();
  await page.goto('/3d');
  await expect(page.locator('section[data-filter-item]:visible')).toHaveCount(3);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'About me' })).toBeVisible();
  await expect(page.locator('[data-badge-slot]')).toContainText('MZN');
});
```

`tests/e2e/seo.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
for (const [path, title] of [['/', 'Muhammad Zarif Nurhan Bin Mohd Arifin | Portfolio'], ['/software', 'Software Development | Muhammad Zarif Nurhan Bin Mohd Arifin'], ['/3d', '3D Visualization | Muhammad Zarif Nurhan Bin Mohd Arifin']]) {
  test(`${path} meta`, async ({ page, request }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{40,}/);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og).toMatch(/\/og\.png$/);
    expect((await request.get('/og.png')).status()).toBe(200);
  });
}
test('sitemap exists', async ({ request }) => {
  expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
});
```

- [ ] **Step 2: Run the tests to see what fails**

Run: `npx playwright test tests/e2e/nojs.spec.ts tests/e2e/seo.spec.ts --project=desktop`
Expected: `seo` FAILS because `/og.png` returns 404. `nojs` may already pass, which confirms Tasks 4–8 respected the no-JS rule. Keep it as a regression test.

- [ ] **Step 3: Implement the reveals**

`src/scripts/reveal.ts`:

```ts
export function initReveal(): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  document.documentElement.classList.add('reveal-on');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  els.forEach((el) => io.observe(el));
}
```

Append to `src/styles/global.css`:

```css
.reveal-on [data-reveal] { opacity: 0; translate: 0 24px; transition: opacity .6s ease, translate .6s ease; }
.reveal-on [data-reveal].revealed { opacity: 1; translate: 0 0; }
.project { transition: translate .25s ease; }
```

`translate` (the individual property) is used on revealed sections. None of them is an ancestor of the badge island: the Hero has no `data-reveal`, so the Global Constraint holds.

In `src/layouts/Layout.astro`, add this before `</body>`:

```astro
<script>
  import { initReveal } from '../scripts/reveal';
  initReveal();
</script>
```

- [ ] **Step 4: Generate the link preview image**

`scripts/make-og.mjs`:

```js
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const img = readFileSync('src/content/visualization/moltech-johor-warehouse/images/01-iso-tank-forklifts.png').toString('base64');
const html = `<!doctype html><html><body style="margin:0;width:1200px;height:630px;background:radial-gradient(circle at 85% 0%,#3b2a7a 0,transparent 45%),radial-gradient(circle at 0% 100%,#0e4a5a 0,transparent 45%),#0b0b14;color:#f5f5ff;font-family:Arial,sans-serif;display:flex;align-items:center;gap:40px;padding:0 60px;box-sizing:border-box">
<div style="flex:1"><div style="font-size:22px;color:#c4c6e0;margin-bottom:18px">&lt;/&gt; Software Development &nbsp;·&nbsp; ◇ 3D Visualization</div>
<div style="font-size:54px;font-weight:800;line-height:1.1">Muhammad Zarif Nurhan<br>Bin Mohd Arifin</div>
<div style="font-size:26px;color:#c4c6e0;margin-top:20px">Computer Science student who builds software and 3D spaces.</div></div>
<img src="data:image/png;base64,${img}" style="width:440px;height:440px;object-fit:cover;border-radius:24px;border:1px solid rgba(255,255,255,.18)"></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('public/og.png written');
```

If the warehouse cover image was named differently in Task 3, update the path to match.

Run: `node scripts/make-og.mjs`
Expected: `public/og.png written`. Open the file and check that the text isn't clipped.

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npx playwright test`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/reveal.ts src/styles/global.css src/layouts/Layout.astro scripts/make-og.mjs public/og.png tests/e2e/nojs.spec.ts tests/e2e/seo.spec.ts
git commit -m "feat: add scroll reveals, link preview image and no-JS coverage"
```

---

### Task 11: Quality gate and deployment

**Files:**
- Create: `README.md`
- Modify: `astro.config.mjs` and `src/data/site.ts` (the real site URL, if it differs)

- [ ] **Step 1: Run Lighthouse on all three pages**

```bash
npm run build
npx astro preview --port 4321 &
npx lighthouse http://localhost:4321/ --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless=new" --output=json --output-path=./.superpowers/lh-home.json --quiet
npx lighthouse http://localhost:4321/software --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless=new" --output=json --output-path=./.superpowers/lh-software.json --quiet
npx lighthouse http://localhost:4321/3d --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless=new" --output=json --output-path=./.superpowers/lh-3d.json --quiet
node -e "for (const f of ['home','software','3d']) { const r=require('./.superpowers/lh-'+f+'.json'); console.log(f, Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,Math.round(v.score*100)]))) }"
```

If Chrome isn't found, set `CHROME_PATH` to Playwright's Chromium, printed by `node -e "console.log(require('@playwright/test').chromium.executablePath())"`.

Expected: every category scores ≥ 90 on every page. To fix a low score:
- **Performance:** reduce `widths`, lazy-load more, check that the island is `client:idle`.
- **Accessibility:** contrast and labels.
- **SEO:** meta tags.

Re-run until it passes, and commit any fixes as `fix: lighthouse <category> on <page>`.

- [ ] **Step 2: Visual check at three widths**

Take full-page screenshots of `/`, `/software` and `/3d` at 390, 820 and 1440px widths, using Playwright or the browser. Check:
- no horizontal scroll
- the nav menu works under 760px
- the pick-a-side halves stack under 900px
- the alternating sections stack with the image first.

Fix anything broken and commit.

- [ ] **Step 3: Write the README**

`README.md`:

````markdown
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
````

Commit: `git add README.md && git commit -m "docs: add README"`.

- [ ] **Step 4: Push to GitHub. STOP and ask Zarif first.**

Ask Zarif to confirm the repository name (suggested `portfolio`) and whether it should be public or private. Explain that a public repository lets recruiters see the code. Only after he confirms, run:

```bash
gh auth status   # if not logged in, ask him to run: ! gh auth login
gh repo create <name> --<public|private> --source . --remote origin --push
```

Expected: the repository URL is printed and `git log origin/main` matches the local log.

- [ ] **Step 5: Connect Vercel. Zarif does this, with guidance.**

Give Zarif these steps:
1. Go to vercel.com and sign up with GitHub (Hobby plan).
2. Choose **Add New → Project**, import the repository, and leave the Astro preset and defaults.
3. Click **Deploy**.
4. Send back the resulting `https://….vercel.app` URL.

When he sends the URL:
1. If it differs from `https://zarifnurhan.vercel.app`, update `site` in `astro.config.mjs` and `url` in `src/data/site.ts`.
2. Commit as `chore: set production URL` and push.
3. Confirm the deployed home page loads and the badge works.
4. Paste the URL into a link-preview checker, such as opengraph.xyz, to confirm the preview card shows.
