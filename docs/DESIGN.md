# Bhuiyan Academy preview — design system

Direction: **"Chambers, not campus."** Quiet legal heritage, British law-printing feel, built from the Academy's own crest (red + gold, scales of justice, 1989). Nothing here is up for debate during the build; if something is missing, choose the quieter option.

## Tokens (css/tokens.css — copy exactly)

```css
:root{
  --claret:#6B1F2A; --claret-deep:#4A1118; --claret-ink:#2E0A10;
  --ink:#1C1A17; --parchment:#F4EFE6; --paper:#FBF8F2;
  --gold:#B08D57; --gold-soft:#D9C7A3; --slate:#6E6A63; --line:#DDD5C6;
  --ok:#3E6B4A; --warn:#9A6A1C; --due:#8C2F2F;           /* portal badges only, desaturated */
  --font-display:"Source Serif 4",Georgia,serif;
  --font-serif:"Source Serif 4",Georgia,serif;
  --font-body:"Source Sans 3",system-ui,sans-serif;
  --font-mono:"Source Sans 3",system-ui,sans-serif; /* no monospace anywhere */
  --ease-out:cubic-bezier(0.16,1,0.3,1);
  --dur-reveal:700ms; --dur-hover:200ms;
  --radius-s:4px; --radius-m:8px; --radius-l:14px;
  --container:1200px; --gutter:clamp(20px,4vw,48px);
  --shadow:0 18px 40px -24px rgba(74,17,24,.35);     /* claret-tinted, never black */
}
```
Google Fonts: `Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400`, `Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400`. Revised 2026-11-13: Majedul said the Libre Caslon Display + Azeret Mono pairing looked "vibe coded"; headings are now Source Serif 4 semibold, labels are Source Sans 3 uppercase at .06–.07em tracking, numbers use tabular lining figures.

Never: pure white page bg, pure black text, Inter, Instrument Serif, Fraunces, Lucide icons, blue links, box-shadow with black, gradients other than the footer wash, more than one accent (gold is the accent; claret is the brand colour, not an accent).

## Type scale
| Role | Font | Size (desktop / mobile) | Notes |
|---|---|---|---|
| Hero h1 | display | clamp(2.6rem, 6vw, 5rem) | line-height .98, letter-spacing -.02em, `text-wrap:balance` |
| Section h2 | display | clamp(2rem, 3.6vw, 3rem) | line-height 1.05, -.015em |
| h3 / card title | serif 400 | 1.35rem | |
| Pull quote | serif italic | 1.5rem | gold hairline left |
| Body | body 400 | 1.0625rem / 1rem | line-height 1.65, max 64ch |
| Eyebrow / meta | mono 500 | .75rem | uppercase, letter-spacing .14em, gold |
| Numbers in tables | mono | inherit | `font-variant-numeric: tabular-nums` |

Sentence case everywhere. No all-caps except mono eyebrows.

## Surfaces & texture
- Page: parchment. Cards/panels: paper with 1px `--line` border OR spacing, never border + shadow + white together.
- Grain: fixed full-screen SVG feTurbulence overlay, opacity .035, `pointer-events:none`, `mix-blend-mode:multiply`.
- Crest watermark: `assets/brand/crest.png` at 4% opacity, 520px, bottom-right of hero and footer. Do not tint it.
- Hairline gold rules (1px `--gold`) separate sections; section padding `clamp(64px,10vw,128px)` top, +16px bottom.
- Footer: `linear-gradient(180deg,var(--claret) 0%,var(--claret-deep) 100%)`, text parchment, links gold-soft.
- Portal: sidebar `--claret-deep`, content parchment, panels paper.

## Layout
- 12-col grid, max 1200px, gutter var. Headlines left-aligned; body columns offset (headline cols 1–7, lead paragraph cols 8–12 on desktop).
- Programmes: 2-column zig-zag, alternating image/text, big mono serial `01`–`04` at 5rem gold-soft behind the title.
- Proof block: four facts as a ledger (rows with hairline rules), NOT stat cards: `600+ graduates` · `Since 1989` · `First CertHE centre in Bangladesh` · `UoL Recognised Teaching Centre`.
- Never three equal cards. Never centered hero + 3 cards + testimonial carousel.
- `min-height:100dvh` not `100vh`. Mobile baseline 390px; nav collapses to a full-screen claret sheet.

## Motion (GSAP 3 via CDN + ScrollTrigger; `js/motion.js`)
- Wrap everything in `if(!matchMedia('(prefers-reduced-motion: reduce)').matches)`; otherwise elements are visible, static.
- Entrance (home + every page): `[data-reveal]` children stagger 0.08s, y 24 → 0, opacity 0 → 1, 0.7s, expo.out; starts on `DOMContentLoaded`.
- Scroll reveals: every `section[data-reveal]`, `start:'top 82%'`, once.
- **Signature: The Pathway** (home only). A horizontal SVG rule inside a pinned section (pin ~1.6 viewport heights). `stroke-dashoffset` scrubbed from 1 → 0 as the user scrolls; five milestones fade in as the line passes them: `CertHE Common Law` → `LLB (UoL / UH SDL)` → `Bar Training (UH Bar School, UK)` → `Called to the Bar` → `Practice · Bench · Chambers`. Year labels in mono. Mobile: vertical variant, not pinned.
- Hover: links underline draws left→right (background-size trick), buttons lift `translateY(-2px)` + shadow, images scale 1.04 inside overflow-hidden; pressed `scale(.98)`. Focus-visible: 2px gold outline, offset 3px.

## Components
- **Buttons:** primary = claret bg, parchment text; secondary = 1px claret border; tertiary = text link with gold underline. Radius `--radius-s`. Mono eyebrow allowed inside buttons? No. Body 500.
- **WhatsApp sticky:** bottom-right, claret circle 56px, white glyph, label appears on hover; `href="https://wa.me/8801755557252"`.
- **Notice item:** mono date left (`12 Nov 2026`), serif title, slate summary, "Pinned" as a gold mono label, not a pill.
- **Programme panel:** eyebrow (awarding body), serial, title, 2 lines who-it-is-for, facts list (duration · assessment · entry), one tertiary link.
- **Form fields:** 1px line border, paper bg, label above in body 500, error in `--due` inline under field, no alerts, no placeholders as labels.
- **Badges (portal):** square-cornered, mono, tinted bg at 12% of ok/warn/due.
- **Tables (portal):** hairline rows, mono numbers, sticky header on scroll, zebra off.
- **Demo banner:** top of every portal page and the pitch page: parchment bar, mono text `DEMONSTRATION · SAMPLE DATA · BUILT BY EXPERIUS FOR BHUIYAN ACADEMY`.

## Icons
Phosphor (thin/regular) via inline SVG only where meaning needs it. No decorative icon rows. No rocket, shield, lightbulb.

## Imagery
Only the Academy's own photos (`assets/photos/`), slightly desaturated (`filter:saturate(.85)`), 3:2 or 4:5, `object-fit:cover`, `loading="lazy"` except hero. Partner marks (`assets/partners/`) in a quiet strip at 60% opacity → 100% on hover. No AI-generated people.

## Social posts (1080×1350)
Same tokens. Parchment ground, claret headline block, one gold rule, crest top-left 120px, partner mark bottom, WhatsApp number in mono. Max 28 words on an admissions poster. Module ledger: mono, 3 year-blocks, hairlines.
