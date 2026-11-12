# Build contract (all agents follow this)

Static site. No framework, no npm build. Python 3 `build.py` assembles pages from partials so the header/footer live in one place.

## Layout
```
build.py                 # python build.py → writes *.html at root and portal/*.html
src/partials/head.html   # <head> template: {{title}}, {{description}}, noindex, fonts, css links
src/partials/header.html # top bar + nav (Programmes, Admissions, About, Contact · Student Portal button · WhatsApp)
src/partials/footer.html # claret wash, partner marks, address, legal links, "Demonstration preview built by EXPERIUS"
src/partials/portal-shell.html # STUDENT portal sidebar + topbar: {{portal_title}}, {{active}}
src/partials/office-shell.html # STAFF portal shell (used for every portal-admin-* page); sidebar links filtered by department in js/portal.js ROLES
src/pages/*.html         # page bodies with a front-matter comment: title, description, scripts (optional), layout: site|portal|bare
src/data/site.json       # content for public pages (rendered by build.py via simple {{json:...}} loops OR inlined by the page author — pick inline + keep json as the source; do not add a template engine)
src/data/portal-seed.json
css/tokens.css css/base.css css/site.css css/portal.css
js/motion.js (GSAP entrance + ScrollTrigger + Pathway)  js/site.js (nav, form validation)  js/portal.js (seed → localStorage → render)
assets/brand assets/partners assets/photos assets/old-site
portal/*.html social/ pitch/ proposal/ docs/
```

## build.py behaviour
- For each `src/pages/<name>.html`: parse the front-matter comment (`<!-- title: … \n description: … \n layout: site \n scripts: a.js,b.js -->`), wrap with the matching partials, write to `<name>.html` (or `portal/<name>.html` when `layout: portal`, file prefixed `portal-` in src is written as `portal/<name>.html`).
- All links root-relative (`/css/site.css`, `/portal/dashboard.html`), so the site works on Vercel at `/`. Local check: `python -m http.server 8080` from the project root.
- Every page gets `<meta name="robots" content="noindex,nofollow">` (preview), `<link rel="icon" href="/assets/brand/favicon.png">`, Open Graph title/description, `lang="en"`.
- `vercel.json`: `{"cleanUrls": true, "trailingSlash": false}` and a 404 rewrite to `/404.html`. Nothing else.
- GSAP from CDN: `https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js` and `ScrollTrigger.min.js`, loaded `defer` after `js/motion.js` uses `window.addEventListener('load')`.

## Shared rules
- Tokens come from docs/DESIGN.md verbatim into css/tokens.css. Nobody adds colours.
- `data-reveal` on sections; `.reveal-child` on staggered children. motion.js owns all animation. Portal pages get entrance only (no ScrollTrigger).
- Forms never submit anywhere: `js/site.js` validates, then shows an inline success panel with the demo note.
- WhatsApp sticky button is in footer.html so it appears everywhere.
- Images: `<img>` with width/height attributes, `loading="lazy"` except the hero.
- No `#` hrefs. Use real pages or `aria-disabled="true"` with a note.
- Spelling: sentence case, US spelling, no exclamation marks.
