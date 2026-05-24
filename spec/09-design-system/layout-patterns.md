# Layout Patterns

These are the structural layout patterns used across the application's screens. Each pattern defines the spatial organization of a screen or region, independent of the specific content within it. All layouts use `.wa-screen` as the root element.

---

## Full-Viewport Artboard (wa-screen)

Every screen in the application uses `.wa-screen` as its outermost container. This element spans the full viewport width (100vw) and has a minimum height of 100dvh (dynamic viewport height — adjusts to the browser chrome height on mobile). It establishes the box-sizing, font, and color defaults for all children.

Content within `.wa-screen` does not overflow the viewport — scrolling is controlled at specific interior regions (e.g., the activity list within the center column), not at the page level.

---

## Topbar

The topbar is a fixed-height horizontal bar at the top of every screen.

| Property | Value |
|---|---|
| Effective height | 53px |
| Background | `--cream` |
| Border | 1px solid `--border-soft` on the bottom edge |
| Layout | flex row |

The topbar does not scroll with the page content below it. The remaining height below the topbar is available for the screen's main layout region.

**Left side of topbar:** Contains the brand unit (`.wa-brand` with `.wa-brandmark`) and, when appropriate, the session name or screen title.

**Right side of topbar:** Contains contextual action buttons, the participant avatar strip, or the session timer — depending on which screen is active.

---

## Two-Column Layout

Used on: create-session screen, join screen, lobby screen.

The space below the topbar is divided into two columns that together fill the remaining height. No scrolling occurs at the column level — content within each column may scroll internally if it overflows.

| Column | Width |
|---|---|
| Left column | approximately 50% or 1.1fr of available width |
| Right column | approximately 50% or 1fr of available width |

The left column typically contains the primary form or action area. The right column typically contains contextual information, a preview, or a participant list.

---

## Three-Column Layout (Engineer Board)

Used on: the engineer submission board during an active session.

The space below the topbar is divided into three columns that fill the remaining height.

| Column | Width | Contents |
|---|---|---|
| Left rail | 220px (fixed) | Category navigation or recall prompts |
| Center | 1fr (flexible) | The primary activity submission area — activity cards and the add-activity form |
| Right sidebar | 296px (fixed) | Team feed — a live view of other participants' submitted activities (when enabled) |

The center column's activity list scrolls internally. The left rail and right sidebar are fixed and do not scroll with the center.

---

## Three-Column Layout (Facilitator Live View)

Used on: the facilitator's live monitoring view during the active phase.

| Column | Width | Contents |
|---|---|---|
| Left panel | 260px (fixed) | Participant roster and session controls |
| Center | 1fr (flexible) | Activity feed — all submitted activities with classification controls |
| Right panel | auto | Automatability matrix visualization |

The center activity feed scrolls internally. The left and right panels are fixed.

---

## Modal Overlay

Modals are used for focused, multi-step interactions: merge dialog, session settings, and similar workflows.

### Backdrop

A semi-transparent overlay covers the entire viewport behind the modal:

| Property | Value |
|---|---|
| Background | `rgba(28,26,22,0.45)` — dark near-black at 45% opacity |
| Backdrop filter | `blur(2px)` on the underlying content |

### Modal Card

The modal card is centered within the viewport:

| Property | Value |
|---|---|
| Width | defined per modal context (edit modal: 760px; merge modal: 900px) |
| Max height | defined per modal context (edit modal: 92dvh; merge modal: 90dvh) |
| Background | `--cream` |
| Border radius | 8px |
| Box shadow | `0 24px 80px rgba(0,0,0,0.32)` |
| Border | 1px solid `--rule` |

### Scroll Behavior

The modal body (the main content area) scrolls internally when content exceeds the max height. The modal footer — which contains confirm and cancel actions — is positioned outside the scroll area, remaining always visible at the bottom of the modal card regardless of scroll position.

---

## Canvas (Pan-Zoom Viewport)

Used on: the design canvas or automatability matrix in presentation/explore mode.

The canvas is a full-height pan-zoom viewport that allows the facilitator to navigate a larger coordinate space than the visible screen.

| Property | Value |
|---|---|
| Height | full available height below topbar |
| Zoom range | 0.1× minimum to 8× maximum |
| Zoom behavior | centers on cursor position at time of zoom gesture |
| Transform | applied via CSS transform with hardware acceleration |

The canvas supports pan (click and drag) and zoom (scroll wheel or pinch). The transform origin follows the cursor position at the moment of zooming, so the point under the cursor remains stable.

The infinite scroll area for the activity matrix uses this canvas pattern.
