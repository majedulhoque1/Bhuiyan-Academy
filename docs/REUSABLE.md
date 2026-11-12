# ♻️ Reusable assets — Bhuiyan Academy preview (2026-11-13)

| From | Part | Used as |
|---|---|---|
| Experius one (`D:\EXPERIUS\E X P E R I U S\Experius one`: `build.py`, `src/pages`, `css/tokens.css` structure, noindex/404/sitemap pattern) | static partial-assembly build | pattern for `build.py` here (rewritten lighter, not copied) |
| Experius one `demo-clinic-inquiry.html` | labelled demonstration pattern | portal "Demonstration · sample data" banner and copy |
| booking-crm-kit `reference/admin/src/_kit` (`d:\EXPERIUS\Websites\booking-crm-kit`) | AppShell / StatCard / EmptyState / StatusBadge | portal shell structure, ported to vanilla HTML/CSS |
| blitz `template.mjs` v3 + `shoot.mjs` (`C:\EXPERIUS-work\blitz\scripts`) | GSAP entrance recipe; 390px iframe screenshots | motion timing; before/after thumbnails for the pitch page |
| content asset `_render` pipeline (`D:\EXPERIUS\content asset\_render`) | HTML → PNG via headless Chrome | the two social posters |
| `experius-outreach` skill | WhatsApp/Messenger message rules | pitch messages |
| `prelaunch-seo-checklist` memory | 20-point launch check | preview QA (indexing stays off) |
| `anthropic-skills:docx` + `pdf` | document generation | the formal proposal |

## New reusable parts this build creates
- **Student portal shell** (`css/portal.css`, `src/partials/portal-shell.html`, `js/portal.js`): sidebar + topbar + notice/fee/result/timetable tables driven by a seed JSON and localStorage. Reusable for any coaching centre, school or training institute demo.
- **Programme panel** (zig-zag with serial numbers) and **proof ledger** (facts as hairline rows) for education sites.
- **The Pathway** scroll-drawn milestone rule (`js/motion.js`): reusable for any "route to outcome" story (treatment pathway, project phases).
- **Education content brief template** (`docs/CONTENT-BRIEF.md` fact register format).
- **BD-standard proposal DOCX** structure (`proposal/`), reusable for every Bangladeshi client.
