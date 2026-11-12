# Bhuiyan Academy preview

A demonstration redesign of the Bhuiyan Academy website, a clickable student portal and two redesigned social posts, built by EXPERIUS from information the Academy has published on its own site and Facebook page. It is a preview, not the Academy's live website. All student data in the portal is fictional.

## Run locally

```
python build.py        # assembles src/pages + src/partials into the root and /portal
python serve.py 8080   # local server with clean URLs
```

## Structure

- `src/pages`, `src/partials`: page bodies and shared header, footer and portal shell
- `src/data`: site content and the fictional portal seed
- `css`, `js`: design tokens, styles, motion (GSAP) and portal logic
- `portal/`: student portal demo (state in localStorage)
- `social/`: the two redesigned posts and their captions
- `docs/`: design system, content brief with fact register, build contract

Every page is `noindex`.
