# Bhuiyan Academy preview

A demonstration redesign of the Bhuiyan Academy website and two redesigned social posts, built by EXPERIUS from information the Academy has published on its own site and Facebook page. It is a preview, not the Academy's live website.

## Run locally

```
python build.py        # assembles src/pages + src/partials into the root
python serve.py 8080   # local server with clean URLs
```

## Structure

- `src/pages`, `src/partials`: page bodies and shared header, footer and portal shell
- `src/data`: site content
- `css`, `js`: design tokens, styles, motion (GSAP)
- `archive/portal-demo/`: the student and staff portal demo, removed from the live site 2026-11-16 (the Academy only needs the website). Not built, not deployed.
- `social/`: the two redesigned posts and their captions
- `docs/`: design system, content brief with fact register, build contract

Every page is `noindex`.
