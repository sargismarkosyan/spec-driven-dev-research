# 09 — Design System

The Work Audit design system defines the visual language, component vocabulary, and layout patterns used across every screen in the application. The system uses a warm paper palette that evokes printed documents and editorial print design. The aesthetic is deliberately analog and understated — not a typical SaaS product aesthetic.

All design tokens are implemented as CSS custom properties (prefixed with `--`). All reusable UI components use the `wa-*` CSS class prefix. The system is not a third-party component library — it is a bespoke stylesheet built for this application.

## Design Philosophy

The aesthetic is built around three ideas:

1. **Warm paper:** Backgrounds use warm off-white and tan tones rather than pure grey or white. This gives the application a tactile, document-like quality.
2. **Editorial typography:** Display headings use a serif font (Newsreader) that references editorial and editorial design. Body text uses a clean sans-serif (IBM Plex Sans). Data, codes, and metadata use a monospace (IBM Plex Mono).
3. **Restrained color:** Accent colors (rust, sage, amber, slate) are used sparingly and purposefully. Each accent color maps to a specific semantic meaning (rust = action/error, sage = positive, amber = warning/investigate, slate = neutral/manual).

## Table of Contents

| File | Contents |
|---|---|
| [color-tokens.md](./color-tokens.md) | All CSS custom property color tokens: backgrounds, text, borders, and accent colors with their semantic meanings |
| [typography.md](./typography.md) | Font families, typography utility classes, and usage rules |
| [components.md](./components.md) | All `wa-*` CSS component classes with their visual properties, states, and variants |
| [layout-patterns.md](./layout-patterns.md) | Structural layout patterns: full-viewport artboard, topbar, two-column, three-column, modal overlay, and canvas |
