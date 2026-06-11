---
name: tenzu-design
description: Use this skill to generate well-branded interfaces and assets for TENZU — a Japanese specialty shop selling dot-drawing (点描写) printables for families with children 4–9. Contains the 3-tier font system (Klee One / Zen Kurenaido / IBM Plex), Ink & Slate color palette with Seiji teal accent, white-paper + dot grid background, 4 strict divider types, the 9 task icon set, the shopkeeper-traces system, and four reference page mockups (landing, product, article, maker app).
user-invocable: true
---

Read `README.md` end-to-end first, then `specs/typography.md`, `specs/components.md`, and skim the rest of `specs/`.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy `assets/` and `colors_and_type.css` out and produce static HTML files that link to the CSS. The mockups under `mockups/` are templates — start from one of them rather than from scratch.

If working on production code, lift the token values from `colors_and_type.css` into your codebase and follow the rules in `specs/`. The voice rules in `README.md` § Content Fundamentals are owner-locked — do not soften, prettify, or "marketing-ize" the copy.

## Hard guardrails (never cross)

1. **Do not redesign the logo.** The 4-dot square symbol + Ξ-form E wordmark is locked.
2. **Do not touch voice.** NG vocabulary, the "prevention → expansion" shift, and the official F3 translation are owner-locked.
3. **Do not re-introduce rev.4 patterns.** Cream paper `#F4F2ED`, boxy cards with solid borders, wavy/hand-drawn underlines, paper-fiber noise, sensory tags, curation shelves, tab navigation — all rejected.
4. **Dark mode is deferred.** Set `<meta name="color-scheme" content="light">` and do not author dark variants.
5. **No anxiety marketing.** No "弱点" / "克服" / "処方箋" / "がんばろう" / "できた！". One-person shop voice: 「店主」.
6. **The product is paper + pencil + parent.** Never design a screen where a child is meant to solve dot drawings interactively.

## When the user invokes this skill without further guidance

Ask them what they want to build. Common asks:
- A new SKU's product page → start from `mockups/product.html`
- A new article in a pillar → start from `mockups/article.html`
- A landing variant → start from `mockups/landing.html`
- A maker tool extension → start from `mockups/maker.html`
- An infographic / share image → use `colors_and_type.css` and `specs/background.md`'s dot grid

Ask which surface, which level/task it's about, what content they have, and any deviation they want. Then produce HTML. Resist the urge to invent new components — the existing 4 divider types, 4 CTA tiers, and 5 memo types cover almost every case.

## Iconography fallbacks

The 9 task icons are in `assets/icons/task-*.svg`. For UI symbols not covered (undo, redo, clear, menu, close), draw simple inline SVGs at stroke 1.5 / round cap to match. **Do not use emoji.** **Do not pull Lucide / Heroicons** — they conflict with the hand-written warmth of TENZU.
