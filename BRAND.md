# වැඩHUB brand

Reference sheet: [`brand/wedahub-brand-sheet.png`](brand/wedahub-brand-sheet.png).
This file records what the sheet specifies and what applying it to the app
actually costs. Nothing here is implemented yet — see "Status" at the bottom.

## Marks

- **Wordmark** — `වැඩ` in white (on dark) or near-black (on light), `HUB` in
  gold, with a short gold rule above `HU`. Sinhala and Latin sit on separate
  lines in the stacked lockup, inline in the horizontal one.
- **Tagline** — `PEOPLE | SKILLS | OPPORTUNITIES`, letterspaced caps.
- **Secondary line** — *Sri Lanka Builds Together* (script), *FOR A STRONGER
  SRI LANKA*.
- **Pillars** — Trades · Knowledge · Jobs · Business · Community.
- **Value props** — Find People · Share Knowledge · Grow Together.
- **App icon** — three variants: gold-on-black, black-on-gold, black-on-white.
- **Favicon** — single `ඩ` glyph, gold rule beneath, on black.

## Palette

| Token | Hex | Role |
|---|---|---|
| `--brand-ink` | `#0B0B0B` | Primary dark. Backgrounds, wordmark on light. |
| `--brand-gold` | `#D4A15E` | Accent. Fills, rules, icons, text **on dark only**. |
| `--brand-paper` | `#F7F7F7` | Light surface. |
| `--brand-grey` | `#4A4A4A` | Secondary text, muted UI. |
| `--brand-gold-text` | `#8A6224` | **Derived, not on the sheet.** See below. |

### The gold cannot be used for text on light backgrounds

`#D4A15E` on `#F7F7F7` is **2.16:1**. WCAG AA needs 4.5:1 for body text, so it
fails by a wide margin. On `#0B0B0B` it is 8.5:1 and completely fine, which is
why the sheet reads well — every gold element on it sits on black.

The app uses its current accent the opposite way: terracotta on white, for
labels, links and small bold text at 11–12px, in hundreds of places. Terracotta
manages **4.57:1** there, scraping AA. A straight swap to gold would drop all of
that to 2.16:1 and make the app materially harder to read in daylight on a
mid-range phone screen — which is the stated target device.

So the palette needs a fifth value the sheet does not supply. `#8A6224` is the
same hue darkened to **5.09:1** on paper. Gold stays for fills, dark surfaces,
rules and icons; `--brand-gold-text` carries anything gold-coloured that is
text on a light background.

## Typeface

The sheet names **Noto Sans Sinhala**. The app already loads it, as the Sinhala
member of a stack alongside Archivo (display) and Instrument Sans (body):

```
--th-display: 'Archivo', 'Noto Sans Sinhala', system-ui, sans-serif;
--th-body:    'Instrument Sans', 'Noto Sans Sinhala', system-ui, sans-serif;
```

The `HUB` on the sheet is a heavy geometric grotesque, not Noto — Archivo at
800 is a close match. I am reading the sheet as "Noto Sans Sinhala for Sinhala
text", which is what the code already does, rather than "replace Archivo for
Latin". **Confirm if that is wrong.**

## What applying this touches

The app has a token layer in `src/index.css` (~40 custom properties, 829
`var(--…)` call sites), but most colour is not going through it:

| | Count |
|---|---|
| Hardcoded 6-digit hex literals in `src/` | **1,921** |
| — of which are the current terracotta `#C2542B` | **238** |
| `var(--token)` references | 829 |

Roughly two-thirds of the colour in this app is baked into inline
`style={{ … }}` objects in JSX. Redefining `--terra` recolours about a third of
the UI and leaves the rest terracotta, which reads worse than leaving it alone.
A real rebrand is a mechanical pass over ~40 files.

Also in scope, and easy to miss:

- `.th-wordmark span { color: var(--terra) }` — the `HUB` half of the wordmark.
- `.site-logo-grid` — the 9-tile mark beside the wordmark, using six hardcoded
  browns (`#C4956A`, `#8B5C3A`, `#3C200E`, `#7A4828`, `#CB9462`, `#593018`)
  that are a third palette, matching neither the current theme nor this sheet.
- `theme-color` — `#C2542B`, in **both** `Layout.astro` and
  `manifest.webmanifest`.
- `background_color` in the manifest.
- Rendered assets: `favicon.png`, `favicon.svg`, `icon-192.png`, `icon-512.png`,
  `og.png`, and seven `apple-splash-*.png` files.

## Sequencing

Recommended: **its own PR, landing before the v1 feature work.**

It has no dependency on the identity model, the job flow or messaging, and
folding it in would bury those diffs under a thousand colour changes. More
practically: v1 adds roughly ten new screens. If the rebrand lands after them,
those screens get built in terracotta and then redone. If it lands first, every
new screen is born in the right brand and the work happens once.

## Status

Not implemented. Recorded here so the spec is in the repo rather than in a
chat log.
