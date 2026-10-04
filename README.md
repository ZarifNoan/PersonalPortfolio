# Zarif's Portfolio

Astro site for Muhammad Zarif Nurhan Bin Mohd Arifin. Design: `docs/superpowers/specs/2026-10-03-personal-website-design.md`.

## Run locally
```bash
npm install
npx playwright install chromium   # once: needed by the browser tests and the preview-image script
npm run dev        # http://localhost:4321
npm test           # unit tests
npm run test:e2e   # browser tests (builds the site and serves it on :4321)
npm run check      # type and template checks
```

## Add a software project
1. Create `src/content/software/<slug>/index.yaml` (copy an existing one). `<slug>` is also the detail page's URL:
   `/software/<slug>`.
2. Put images in `src/content/software/<slug>/images/` and list them under `images:` with `alt` text. The first
   image is the cover: it is shown on the device in the mockup photo and opens first in the image viewer; the others
   appear lower on the detail page as clean panels on the project's themed backdrop.
   - **`mockup:`** (`src` and `alt`) is the picture on the listing (with a "Learn More →" button) and the detail
     page's hero: a photo of a real device showing the app. Add a scene to `scripts/make-mockups.py` (a photo in
     `scripts/mockup-photos/`, its screen corners and lighting) and run `python scripts/make-mockups.py <slug>`; it
     writes `images/00-mockup.jpg`. The alt describes both the scene and the app.
   - **`theme:`** `{ from, to, accent }` (6-digit hex) are the app's own colours, sampled from its screenshots: the
     gallery backdrop is a `from`→`to` gradient with a soft pool of `accent`, and the hero gets a faint `accent` glow.
3. `languages` must use: Python, JavaScript, TypeScript, PHP, Java, SQL (add new ones to `src/lib/taxonomy.ts`).
4. `members:` lists the team in display order, each with a `name`, an optional `linkedin` URL (adds a LinkedIn
   badge after the name that opens their profile in a new tab) and an optional `photo`. Leave it as `members: []`
   for individual work: the page then says "Individual" in the header eyebrow and has no team block. The team
   size ("Team of 4") is counted from the list and shown in the header eyebrow (it is not repeated in the facts
   card).
   - **Photo:** without one, the team list shows a placeholder avatar (the member's initials in a circle). To add
     a real photo, put the image either in the project's own `images/` folder or in the shared `src/assets/people/`
     folder, then set `photo: ../../../assets/people/<file>.jpg` (or `./images/<file>.jpg` for a project-only
     photo). **Prefer the shared `src/assets/people/` folder** for anyone who appears in more than one project
     (e.g. Hakim, Jordan): one file there is reused across every project they're credited on, instead of
     duplicating the image per project.
5. `description` is the short text on the listing page; `details` is the long description on the detail page, with
   paragraphs separated by a blank line (use `details: |`).
6. `device` is `laptop` (desktop and web apps: overlapping panels) or `phone` (mobile apps: a row of realistic
   phones, alternately raised and lowered; a 2 x 2 grid on narrow screens). For `phone`, every gallery screenshot (all
   but the cover) needs `framed:`, a phone render made by `scripts/make-phone-frames.py`: add the screenshot to its
   `SCREENS` table (capture-border `crop`, and `trim`/`under` for fitting it below the status bar) and run
   `python scripts/make-phone-frames.py`; it writes `<screenshot>.phone.png` next to it. The image viewer still opens
   the plain screenshot.
   `screenFit: contain` is for charts: they sit side by side without overlapping. `type`, `platform` and `year` are
   optional facts on the page.
7. `course` is optional: leave it out for work that was not coursework (e.g. a client project). The eyebrow then
   shows the `type` instead ("Freelance client project · Individual") and the facts card has no Course row.
   `clientName` is optional too: when set, it adds a "Client" row to the facts panel (right after Type), naming who
   the project was built for.
8. `url` (optional) is the project's live website. When set, the listing shows a "Visit website ↗" link beside
   Learn More and the detail page shows one under the title; both open in a new tab (`rel="noopener noreferrer"`)
   and are named "Visit the <name> website (opens in a new tab)", where <name> is the title up to the en dash.
   `order: 0` puts a project before the coursework (client work leads the page).

## Add a 3D project
Same as above, under `src/content/visualization/` (page: `/3d/<slug>`). `category` is `Architectural Visualization`
or `Product Visualization`; `client: true` shows "Client Project" on the listing; `clientName` is shown as "Client"
on the detail page, linked to the client's site when `clientUrl` is set (opens in a new tab); `details` is the long description. Every render (cover included) appears in the page's mosaic. For a personal project covering more than
one subject (e.g. two different booth designs), tag each image's `group` with a short label (e.g. "Razova booth"):
renders sharing a group become their own captioned mosaic section on the detail page; without `group`, every project
renders one plain mosaic as before.

## Add your photo
The badge shows an "MZN" monogram until a photo is set. Two steps:
1. Save the photo as `public/badge/photo.jpg` (square, at least 600×600).
2. In `src/data/site.ts`, replace `null` in `badge: { photo: null as string | null, ... }` with `'/badge/photo.jpg'`.

Both the 3D card and the static fallback badge use it.

## Link preview image
`public/og.jpg` (1200×630, used for link previews) is generated by `node scripts/make-og.mjs`. Run it again after
changing the name, headline or featured render in that script. It shows a warehouse render, not the badge photo; to
put your photo in it after adding one, edit the image path in the script and rerun it.

## Photo credits
The home page's pick-a-side backgrounds are free photos from [Unsplash](https://unsplash.com) (Unsplash License:
free to use, no attribution required; credited here anyway). They are stock photos, not Zarif's projects. Files live
in `src/assets/home/` and are resized to WebP by `astro:assets`.
- Software Development: "turned-on MacBook Pro with programming codes display" by Arnold Francisca,
  https://unsplash.com/photos/f77Bh3inUpE (`software-desk.jpg`)
- 3D Visualization: "low angle photography of high-rise building" by Marc-Olivier Jodoin,
  https://unsplash.com/photos/-HIiNFXcbtQ (`skyscrapers.jpg`)

The device mockups on the software pages are free Unsplash photos too, with each project's own screenshot composited
onto the screen by `scripts/make-mockups.py` (sources in `scripts/mockup-photos/`, results in each project's
`images/00-mockup.jpg`):
- StockSense: "Photo of black MacBook Pro on table" by Dillon Shook, https://unsplash.com/photos/xbFX7qCoAqI
- JomLah: "White cup and MacBook" by Alex Knight, https://unsplash.com/photos/j4uuKnN43_M
- Fuzzy Logic: "A calm workspace" (silver iMac on a wooden table) by Clay Banks, https://unsplash.com/photos/TQYTWfN1b7M
- Fixer: "Hand holding a smartphone with a blank screen" by Jakub Żerdzicki, https://unsplash.com/photos/jSQCLQA99Og
- Primo Pinnacle: "Macbook pro on white table" (a meeting room) by Devin Pickell (image credit Nextiva.com),
  https://unsplash.com/photos/1eRS74C-alQ

The phones in the Fixer gallery are not photos: `scripts/make-phone-frames.py` draws them (no third-party asset).

## Deploy
The site URL is set in one place: `site` in `astro.config.mjs` (canonical links, the sitemap and `robots.txt` all
use it). Once the GitHub repo is connected to Vercel, pushing to `main` deploys automatically.
