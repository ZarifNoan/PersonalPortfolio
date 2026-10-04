# Personal Portfolio Website: Design Spec

**Date:** 2026-10-03
**Owner:** Muhammad Zarif Nurhan Bin Mohd Arifin
**Location:** `D:\backup\Nurhan\PersonalWebsite`
**Status:** Approved in brainstorming, pending written-spec review

---

## 1. Purpose and success criteria

A personal portfolio site, linked from Zarif's internship resume, that presents him on **two equal sides**: Software Development and 3D Visualization.

The site succeeds when:

- A recruiter opening the link sees Zarif's full name, what he does, and a memorable interactive header within a couple of seconds.
- Both sides (software projects and 3D work) are one click from the home page, and each is equally prominent.
- Projects can be scanned without clicking into anything: every project's short description and cover are on its listing page, and its project page holds the full story and every image.
- New projects can be added by editing a data file and dropping images in a folder, with no layout code.
- Lighthouse scores 90+ for Performance, Accessibility, Best Practices and SEO on all three pages.
- It runs within Vercel's free Hobby plan (100 GB/month transfer).

## 2. Tech stack

| Concern | Choice |
|---|---|
| Site framework | **Astro** (current stable), static output |
| Interactive 3D | **React** island: `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier` (physics), `meshline` (strap) |
| Content | Astro content collections, validated with Zod schemas |
| Images | Astro `<Image>`/`<Picture>`: WebP/AVIF, responsive sizes, generated at build |
| Styling | Plain CSS with custom properties (design tokens), scoped Astro component styles |
| Fonts | Sora (headings), Inter (body), self-hosted via Fontsource |
| Unit tests | Vitest |
| End-to-end tests | Playwright |
| Hosting | Vercel (Hobby), auto-deploy from a GitHub repository |

## 3. Site structure

Three main pages, with tabs labelled **Home · Software Development · 3D Visualization**, plus a page for every published project (sections 3.2.1 and 3.3.1). On narrow screens the tabs collapse into a menu button. On a project page its section's tab is marked current (`aria-current="true"`).

### 3.1 Home (`/`)

1. **Header.** Left: full name "Muhammad Zarif Nurhan Bin Mohd Arifin", with the headline below it: "Computer Science student who builds software and 3D spaces." The name starts about 56px below the nav (the header is as tall as its content, not a full screen). Right: the lanyard badge (section 5).
2. **About Me** (compact top padding; paragraphs justified with hyphenation from 600px wide, like all running text — see §4), using the approved text:
   > Hi, I'm Zarif, a final-year Computer Science (Honours) student at UCSI University.
   >
   > I work in two worlds. On one side, I build software, from full-stack web applications to systems that use AI to make smarter decisions. On the other, I create 3D visualisations in Blender for real clients, bringing spaces to life before they're built.
   >
   > Different tools, same goal: taking an idea that only exists on paper and turning it into something people can actually see and use.
   >
   > I'm currently looking for an internship where I can keep building, learn from experienced teams, and bring a bit of both worlds to the table.
3. **Pick a side.** Two equal halves: **`</>` Software Development** (blue glow) and **◇ 3D Visualization** (amber glow). Each half links to its page. Each half has a background photo (free Unsplash photos, not Zarif's projects, credited in the README: code on a laptop screen for Software, low-angle glass towers for 3D) under its colour wash and a dark fade that keeps the text at WCAG AA. The photos are optimised by `astro:assets` (responsive WebP) and lazy-loaded.
4. **Footer** (shared, section 3.4).

### 3.2 Software Development (`/software`)

- Page title, then a **filter bar**: All · Python · JavaScript · PHP · Java · SQL. The buttons are generated from the projects' `languages` field, so new languages appear automatically.
- **Alternating project sections.** The image is on the left and text on the right, then swapped for the next project. Each section has:
  - project title
  - course and team type ("Individual" or "Team of N", counted from the members)
  - description (the short one)
  - tech stack tags
  - **one picture**: a **photographic device mockup**: a real photo (Unsplash, credited in the README) of a device in its own setting with the project's cover screenshot composited onto the screen with a perspective transform and matched lighting (StockSense: MacBook Pro in a bright office; JomLah: MacBook Pro on a café counter; Fuzzy Logic: iMac on a lamp-lit study desk; Fixer: phone in a hand by plants). Pre-rendered offline by `scripts/make-mockups.py` into `images/00-mockup.jpg` and served as a responsive `astro:assets` image.
  - a **Learn More →** button. The picture links to the project page too (for pointer users; hidden from keyboard and screen readers so the link isn't announced twice).
- Selecting a filter fades out non-matching projects. "All" is the default. The active filter is reflected in the URL (`?lang=python`) so filtered views can be shared.

#### 3.2.1 Software project page (`/software/<slug>`)

Generated from the collection (drafts get no page). In order:
1. "← All software projects" back link.
2. The large device mockup photo (same as the listing, bigger, with a faint glow in the app's accent colour); it opens the cover screenshot in the viewer.
3. Course · team line and the project name (h1).
4. **Team**: a vertical list, one member per row — a circular avatar (their photo, or an initials placeholder in the
   site's colours when no photo is set yet) on the left, their name, and a LinkedIn badge (new tab,
   `rel="noopener noreferrer"`, accessible via the link's `aria-label`; the badge SVG itself is `aria-hidden`) to
   the right of the name only when a URL is set. Omitted for individual projects.
5. A facts card: type, course, platform, year, and the tech stack chips. (Team size is not repeated here — it's
   already in the header eyebrow and, for team projects, in the team list below it.)
6. "About the project": the long description (2–4 paragraphs).
7. The other screenshots, with no heading, as overlapping clean panels (rounded corners, soft shadow, no window chrome) on a gradient backdrop in the app's own colours (`theme`), two or three per group; later groups mirror the composition. Mobile apps show realistic phones instead: each screenshot pre-rendered inside a modern smartphone (titanium band, side keys, dynamic island, iOS status bar and home indicator, glass sheen, contact shadow) by `scripts/make-phone-frames.py` as a transparent PNG (`framed`), in a spaced row with no overlap, alternately raised and lowered (a 2 × 2 grid with a subtle offset on phones). Every image opens the viewer. On phones the windows stack with a slight overlap.

### 3.3 3D Visualization (`/3d`)

- Same layout as the Software Development page.
- Filter bar: **All · Architectural Visualization · Product Visualization**.
- Each section has the project title, a Client or Personal label, a category tag, a description, the cover render as its one picture, and a **Learn More →** button to the project page.

#### 3.3.1 3D project page (`/3d/<slug>`)

"← All 3D work" back link, the name (h1), Category, Client and Tool (Blender), the long description, then every render (cover included) as a mosaic with no heading: a large feature beside two stacked tiles, then pairs (two columns on phones). Every render opens the viewer.

### 3.4 Shared elements

- **Top navigation** with the brand "NURHAN ARIFIN" (links home) and the active tab highlighted.
- **Footer** on every page: `zrf.nurhan@gmail.com` (a `mailto:` link), `+60 11-5878 5830` (a `tel:` link), and "© 2026 Muhammad Zarif Nurhan Bin Mohd Arifin".
- **Project pages** each have their own `<title>`, meta description, canonical URL and an Open Graph image cut from the project's cover (1200×630), and are in the sitemap.
- **Full-screen image viewer:** previous/next with arrow keys or swipe, closes with Esc or a click on the backdrop, and returns keyboard focus to the image that opened it.

### 3.5 Out of scope

Blog, contact form, light theme, CMS, analytics. (Individual project pages were added by change request 6. The
Team row was dropped from the facts card, and the team list became an avatar/name/LinkedIn-badge list, by change
request 7.)

## 4. Visual style: "Studio glow"

- **Background:** near-black (`#0b0b14`) with soft radial colour glows. The glow is purple/teal on Home, blue on Software Development, and amber on 3D Visualization.
- **Type:** Sora 600/800 for headings, Inter 400/600 for body text.
- **Running text** (About Me, page intros, listing descriptions, detail-page long descriptions and 3D leads) is justified with `hyphens: auto` through one shared `.justify` class, from 600px wide; below that it stays left-aligned (justifying a ~350px column opened wide gaps in screenshots). Headings, eyebrows, chips, buttons, nav, footer, facts panels, team lists and captions are never justified.
- **Controls:** rounded, glassy buttons and filter chips (translucent white fill with a hairline border).
- **Side symbols:** **`</>`** for Software Development and **◇** for 3D Visualization, used on the pick-a-side halves, page titles and nav.
- **Accent colours:** blue (`#60a5fa`) for software, amber (`#f59e0b`) for 3D.
- **Motion:** sections fade up on scroll, cards lift slightly on hover, and filtered items cross-fade. Everything is disabled under `prefers-reduced-motion`.

## 5. Lanyard badge

- A React Three Fiber scene with a Rapier rope-joint chain, hanging a 3D card from a fabric strap.
  - It swings under gravity and can be grabbed and dragged with mouse or touch, springing back on release.
  - **Card:** a printed card in a clear glossy plastic sleeve, joined to the strap by a metal clip and split ring. Front: header with the `</>` and ◇ marks, blue/amber accent stripes, photo, full name (given names large, "BIN MOHD ARIFIN" smaller), "Computer Science · 3D Visualization".
  - **Strap texture:** woven fabric with stitched edges and "NURHAN ARIFIN" plus the `</>` ◇ marks, at the correct aspect so the text is not stretched.
  - Lighting uses image-based light from three's procedural room environment (no HDR download).
- **Photo placeholder:** until Zarif supplies a photo, the card shows an **MZN** monogram. Swapping it in means replacing one image file.
- **Scroll travel (desktop Home page only).**
  - The canvas is fixed-position and lets pointer events pass through to the page, except on the card itself.
  - The badge hangs on the right of the header and stays in place, in the right margin beside About Me, while About Me is read.
  - Once About Me's bottom edge reaches the card's bottom, the anchor follows it up, so the badge scrolls away with About Me. It never travels to the pick-a-side section.
- **Fallbacks:**

  | Condition | Behaviour |
  |---|---|
  | Viewport under 900 px wide | Smaller badge above the name in the header; no travel. Pick-a-side halves stack vertically. |
  | `prefers-reduced-motion` | The badge renders still, with no physics or travel. |
  | No WebGL, or the scene fails to load | A static HTML/CSS badge (same strap text, clip, sleeve and card) is shown instead. |

- **Performance:**
  - The island hydrates `client:idle`, after the page has painted.
  - Rendering pauses when the badge is off-screen or the tab is hidden.
  - Physics runs at a fixed time step.

## 6. Content model

Two content collections, `software` and `visualization`. Each entry is a folder holding a data file plus its images:

```
src/content/software/stocksense/index.yaml
src/content/software/stocksense/images/*.png
src/content/visualization/moltech-johor-warehouse/index.yaml
src/content/visualization/moltech-johor-warehouse/images/*.png
```

### 6.1 Software schema

`title`, `course`, `members[]` (`{ name, linkedin?, photo? }` in display order; empty = Individual; team size = number of members; `photo` is an optional relative image path — the project's own `images/` folder, or the shared `src/assets/people/` folder for someone credited on more than one project; without one the team list shows an initials placeholder), `order`, `stack[]`, `languages[]` (drives the filter; must be one of the known values), `description` (short, listing page), `details` (long description; paragraphs separated by blank lines), `device` (`laptop` or `phone`, for the gallery layout), `screenFit` (`cover`, the default, or `contain` for charts), `mockup` (`{ src, alt }`: a photo of a real device showing the app, rendered by `scripts/make-mockups.py`; the listing picture and detail hero), `theme` (`{ from, to, accent }` hex colours sampled from the app's UI, for the gallery backdrop), optional `type`, `platform`, `year`, `images[]` (the first image is the cover, each with `src`, `alt` and, for `device: phone` gallery screenshots, a required `framed` phone render from `scripts/make-phone-frames.py`), `draft` (optional boolean; drafts are hidden and get no page).

### 6.2 Visualization schema

`title`, `client` (boolean; true shows "Client Project", false shows "Personal Project"), `clientName` (shown as "Client" on the project page), `clientUrl` (optional; the Client value links to it in a new tab with an external-link icon), `category` ("Architectural Visualization" or "Product Visualization"), `order`, `description`, `details` (long description), `images[]` (with `src` and `alt`), `draft`.

The build fails with a clear error if a required field is missing, an image path doesn't exist, or a language or category is not in the allowed list.

### 6.3 Software projects

| Order | Title | Course · Team | Languages | Stack |
|---|---|---|---|---|
| 1 | StockSense – AI Inventory Prediction System | Final Year Project (Project Design and Implementation) · Individual | Python, JavaScript, SQL | Python, TensorFlow, Keras, NLTK, Electron, JavaScript, Chart.js, PostgreSQL |
| 2 | JomLah – Centralized Event Management Platform | Web Programming · Team of 3 | PHP, JavaScript, SQL | PHP 8, MySQL, JavaScript, jQuery/AJAX, HTML5, CSS3 |
| 3 | Student Performance Prediction using Fuzzy Logic | Intelligent Systems · Team of 5 | Python | Python, scikit-fuzzy, NumPy, pandas, scikit-learn, Matplotlib, Tkinter |
| 4 | Fixer – On-Demand Home Repair Service App | Business Case Project · Team of 4 | Java, SQL | Java, JavaFX, Maven, PostgreSQL |

**Members** (display order, Zarif first). Hakim Bin Taufik
(`https://www.linkedin.com/in/hakim-taufik-866622370/`) and Jordan Septian
(`https://www.linkedin.com/in/jordanseptian9/`) have a LinkedIn URL on every project they appear on; everyone
else has none for now. No photos exist yet for anyone (every member shows the initials placeholder):
- StockSense: individual.
- JomLah: Muhammad Zarif Nurhan Bin Mohd Arifin, Jordan Septian, Hakim Bin Taufik.
- Fuzzy Logic: Muhammad Zarif Nurhan Bin Mohd Arifin, Jordan Septian, Hakim Bin Taufik, Mior Ahmad Danial, Yeap Hsien Hong. Its images are result charts produced by the system (plus its architecture diagram), not its interface; the cover is the calibration result.
- Fixer: Muhammad Zarif Nurhan Bin Mohd Arifin, Yogesh Sandeep Jayavant, Hakim Bin Taufik, Jordan Septian.

**Long descriptions** (`details`) are written only from the source reports below and the approved short text; team projects are described as team work.

**Descriptions:**

- **StockSense:** Developed a desktop inventory management app that helps small and medium businesses (SMEs) restock before they run out. It uses an LSTM model built in TensorFlow/Keras to predict demand for each product from 5 years of sales data, and an NLP chatbot that answers stock questions typed in plain language. The app also handles stock management, low-stock alerts and a timestamped change history, with interactive Chart.js charts comparing past sales against predicted demand.
- **JomLah:** Developed a web platform where people can find and book events, organisers can host them, and admins approve and manage everything in one place. Each user role has its own area: attendees book tickets and leave reviews, organisers create and manage events, and admins approve events and manage users. Behind it is a 10-table MySQL database covering one-to-one, one-to-many and many-to-many relationships. Logins are secure with role-based access, prepared statements block SQL injection, and input is checked on both the browser and the server. jQuery/AJAX lets users search and book without reloading the page, and every main feature was checked against a written set of test cases.
- **Fuzzy Logic:** Developed an AI system that spots students at risk of failing early in the semester and recommends what the department should do about it. It uses 27 fuzzy logic rules to predict a performance score from attendance, test and project marks, then a second rule-based layer turns that score into a risk level and a ranked list of recommended actions. Tuning the model raised accuracy from 41.7% to 72.9% and cut the average error from 15.4 to 9.1 points, tested on 800 students with k-fold cross-validation. A Tkinter desktop app shows which rules fired for each prediction, so non-technical staff can see why a student was flagged.
- **Fixer:** Designed a Grab-style app that connects customers with nearby repair workers to book home repair services. The work covered the requirements document and the system design, including use case, sequence, class and activity diagrams. It also included an 8-table PostgreSQL database for users, repair workers, service listings, bookings and in-app chat. The result is a clickable JavaFX prototype with 13 screens, including sign-up and login, browsing services, booking, wallet top-up, ratings and activity history.

**Screenshot source:** images are extracted from each project's report PDF:

- StockSense: `Y3S1/Project Design and Implementation/Document/1002267337_StockSenseReport.pdf`
- JomLah: `Y3S2/Web Programming/Assignment/Document/DONE/Report_JOMLAH - Centralize Event Management App.pdf`
- Fuzzy Logic: `Y3S2/Intelligent System/Assignment/Document/Done/1002267337_Report_FuzzyLogicStudentPerformance.pdf`
- Fixer: `Y2S3/BIC3203 Business Case Project/Assignment/BizCaseDoc/Fixer_BusinessCaseDocument.pdf`, plus `FixerBizCase/User Manual.pdf`

Paths are relative to `D:\backup\Nurhan\UCSI\Degree`. Each project gets 3–5 images, preferring UI screens and charts over diagrams and text.

### 6.4 3D projects

Renders come from `D:\backup\Nurhan\Blender\Image`. Each project uses its best 4–6 renders.

Clients shown on the project pages: Moltech (Moltech Johor Warehouse), DASEM (SLICE 2025), JOHEX (JOHEX, draft), and "Personal project (for a friend's university assignment)" (Gobami).

| Order | Title | Label | Category | Source folder | Description |
|---|---|---|---|---|---|
| 1 | Moltech Johor Warehouse | Client Project | Architectural Visualization | `MoltechJohorWarehouse/` | Interior visualization of an industrial warehouse, featuring ISO tank containers, forklifts, safety barriers and hazard labelling, with realistic materials and lighting. |
| 2 | SLICE 2025 – School Leavers Inspiration & Success Initiatives | Client Project | Architectural Visualization | `UMNO Jln Lingkaran 1/` | Event venue visualization for SLICE 2025, powered by DASEM: an education expo where universities and institutions meet school leavers to share their programmes. The scene lays out the venue at Rumah Komuniti Parlimen Sembrong, with a main tent, exhibition booths for each institution, canopies, entrance and exit gates, and perimeter fencing. |
| 3 | Gobami Product Visualization | Personal Project | Product Visualization | `Gobami Blender/` | Product visualization of Gobami, a thermos-style container that keeps both food and drinks warm, created for a friend's university assignment. The product is shown in six patterned designs: Chinese New Year, Hari Raya, Deepavali, Earth Day, Breast Cancer Awareness and Autism Awareness. |
| 4 | JOHEX Halal Expo | Client Project | Architectural Visualization | `Project/Johex/` (renders pending) | Exhibition venue visualization for JOHEX, a halal expo showcasing all kinds of halal products, not just food. Description to be expanded when renders are supplied. |

**Johex** is added with `draft: true` and hidden until renders exist.

## 7. Accessibility

- WCAG AA contrast.
- Visible focus rings.
- Every control is reachable by keyboard.
- Filter buttons use `aria-pressed`.
- The image viewer is a focus-trapped dialog with `aria-label`.
- Every image has descriptive `alt` text.
- The lanyard canvas is `aria-hidden`, and the same name and role text exists as real HTML.
- Motion is disabled under `prefers-reduced-motion`.

## 8. SEO and link previews

- Each page has its own `<title>` and meta description.
- Open Graph and Twitter card tags use a 1200×630 preview image (name, headline and a featured render), generated once and stored in `public/`.
- A sitemap is generated, and the canonical URL is set from site config.

## 9. Error handling

- **Build-time:** schema validation, plus checks for missing images and unknown filter values (section 6.2).
- **Runtime:**
  - The 3D badge falls back to a static image if WebGL is unavailable or the island throws an error, caught by an error boundary.
  - If an image fails to load inside the viewer, the viewer shows its alt text instead of breaking.
  - The site never depends on JavaScript for content: all project text and images are in the static HTML. Without JS, the filters show everything and every image is a plain link to its full-size file.

## 10. Testing

- **Vitest:**
  - the filter function returns the right projects for each language and category (e.g. Python → StockSense and Fuzzy Logic; Java → Fixer)
  - filter options are derived correctly from the data
  - draft entries are excluded.
- **Build:** `astro check` and `astro build` must pass, which also enforces the content schemas.
- **Playwright** (at desktop and mobile viewports):
  - nav links work
  - filters show and hide the right sections and update the URL
  - each listing section has one picture and a Learn More link to its project page; project pages show the team, facts, long description and images (all opening the viewer), with no horizontal scroll at 390/820/1440
  - the viewer opens and closes with mouse and keyboard
  - footer `mailto:` and `tel:` links are correct
  - there are no console errors.
- **Lighthouse:** 90+ in all four categories on all three pages and on project pages.
- **Manual check:** screenshots at phone, tablet and desktop widths.

## 11. Deployment

1. Git repository in `D:\backup\Nurhan\PersonalWebsite`; `.superpowers/` and build output are ignored.
2. Push to a new GitHub repository under Zarif's account. This needs his confirmation at that step.
3. Import the repository into Vercel once (framework preset: Astro). Every later push to `main` deploys automatically.
4. Default address: `<project>.vercel.app`. A custom domain can be added later.

## 12. Items Zarif will supply later

- A profile photo, for the lanyard badge and link preview.
- Johex renders and a confirmed description.
- Optionally, replacements for any auto-selected render or extracted screenshot.
- Team member photos (see §6.1 and the README): until supplied, every team list shows an initials placeholder.
