# Typography

The design system uses three font families that serve distinct typographic roles. The combination creates an editorial, document-like reading experience that differentiates the application from standard product UIs.

---

## Font Families

### Display / Heading — Newsreader

**Stack:** `"Newsreader", Georgia, serif`

Newsreader is an editorial serif with high contrast strokes and refined proportions. It is used exclusively for large display headings and the application brand name. Its presence signals a transition from functional UI to editorial content — sections where the team's work is being presented rather than operated on.

**Usage rules:**
- Apply to H1-level display headings on key screens (lobby, landing, export view)
- Apply to the brand wordmark in the topbar
- Do not use for body text, labels, form fields, or data

### Body — IBM Plex Sans

**Stack:** `"IBM Plex Sans", system-ui, sans-serif`

IBM Plex Sans is a neutral, highly legible sans-serif designed for screen use. It is the default typeface for all body text, UI labels, button text, and prose content throughout the application.

**Usage rules:**
- Default font for all text that is not explicitly serif or monospace
- Use for: activity titles on cards, participant names, facilitator panel prose, navigation labels, button text, modal body text

### Monospace — IBM Plex Mono

**Stack:** `"IBM Plex Mono", monospace`

IBM Plex Mono is used for all text that represents data, codes, identifiers, or metadata. Its tabular spacing prevents layout shift when values change — especially important for timer displays that update every second.

**Usage rules:**
- Session IDs and facilitator token displays
- Timer countdown (prevents digit-width jitter)
- Activity sequence numbers
- Form labels (when using `.wa-label` or `.wa-eyebrow`)
- Status tickers and status chips
- Quadrant axis labels
- Any numeric metadata (counts, percentages, effort estimates)

---

## Typography Utility Classes

These classes are applied to individual elements to achieve specific typographic effects. They do not carry layout properties — use them in combination with layout classes.

### `.wa-display`

An editorial heading style for large display text.

| Property | Value |
|---|---|
| Font family | Newsreader, Georgia, serif |
| Font weight | 400 |
| Letter spacing | -0.01em |

Use for: main headings on the lobby screen, export title, and any editorial-scale text that anchors a screen.

### `.wa-mono`

A minimal monospace style for any content that should render in the monospace family without additional decoration.

| Property | Value |
|---|---|
| Font family | IBM Plex Mono, monospace |

Use for: session IDs, raw codes, inline data values.

### `.wa-eyebrow`

A small all-caps label style intended to appear above a heading or section to categorize or label it — the visual equivalent of an editorial eyebrow line.

| Property | Value |
|---|---|
| Font family | IBM Plex Mono, monospace |
| Font size | 11px |
| Text transform | uppercase |
| Letter spacing | 0.12em |
| Color | `--muted` |
| Font weight | 500 |

Use for: section labels above major content areas (e.g., "Session", "Activities", "Your submissions"), category labels in the facilitator panel.

### `.wa-num`

A compact numeric label style for sequential identifiers or counts displayed alongside content.

| Property | Value |
|---|---|
| Font family | IBM Plex Mono, monospace |
| Font size | 10px |
| Letter spacing | 0.08em |
| Color | `--muted-2` |

Use for: activity sequence numbers on cards (e.g., "#3"), small count badges, position indicators in ordered lists.

---

## Font Loading

All three typefaces are loaded as web fonts. Newsreader and IBM Plex Sans/Mono are sourced from Google Fonts or equivalent CDN. The application must not render with system fallback fonts in a way that causes layout shift — the font stack fallbacks (Georgia, system-ui, monospace) are chosen to minimize metric differences while web fonts load.
