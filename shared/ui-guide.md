# UI Layout Guide — Toil Tracker

Shared across all experiments. These sketches define the expected screen layout and key UI elements. They are not full mockups — the visual design, color, and component style are left to the builder. The layout and information hierarchy should stay close to what is shown here.

---

## Screen 1 — Home (Create or Join)

```
┌─────────────────────────────────────────┐
│                                         │
│            Toil Tracker                 │
│    Audit your work. Find what to fix.   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  Session name...                │   │
│   └─────────────────────────────────┘   │
│   [ Create Session ]                    │
│                                         │
│   ─────────── or ───────────           │
│                                         │
│   Join a session via a shared link.     │
│                                         │
└─────────────────────────────────────────┘
```

---

## Screen 2 — Join Screen (engineer clicks a share link)

```
┌─────────────────────────────────────────┐
│            Toil Tracker                 │
│                                         │
│   Joining: Q3 Work Audit                │
│                                         │
│   What's your name?                     │
│   ┌─────────────────────────────────┐   │
│   │  e.g. Sarah                     │   │
│   └─────────────────────────────────┘   │
│                                         │
│   [ Join Session ]                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## Screen 3 — Engineer Board View

```
┌──────────────────────────────────────────────────────┐
│  Toil Tracker  │  Q3 Work Audit  │  👤 Sarah          │
├──────────────────────────────────────────────────────┤
│  [ + Add Activity ]                                  │
│                                                      │
│  ┌─────────────────┐   ┌─────────────────┐          │
│  │ Deploy to       │   │ Write weekly    │          │
│  │ staging         │   │ status email    │          │
│  │                 │   │                 │          │
│  │ ⏱ Medium       │   │ ⏱ Quick        │          │
│  │ 😐 Meh         │   │ 😞 No           │          │
│  │ 🔁 Yes         │   │ 🔁 Yes          │          │
│  │ 🤖 Maybe       │   │ 🤖 Yes          │          │
│  │           [edit]│   │           [edit]│          │
│  └─────────────────┘   └─────────────────┘          │
│                                                      │
│  3 colleagues are also adding activities...          │
└──────────────────────────────────────────────────────┘
```

---

## Screen 4 — Add / Edit Activity (modal)

```
┌──────────────────────────────────────────┐
│  Add Activity                       [✕]  │
│                                          │
│  What do you do?                         │
│  ┌────────────────────────────────────┐  │
│  │ e.g. "Deploy to staging"           │  │
│  └────────────────────────────────────┘  │
│                                          │
│  How long does it take?                  │
│  ● Quick   ○ Medium   ○ Significant      │
│                                          │
│  Do you enjoy it?                        │
│  ○ Yes   ● Meh   ○ No                   │
│                                          │
│  Is it repetitive?                       │
│  ● Yes   ○ Sometimes   ○ No             │
│                                          │
│  Could it be automated?                  │
│  ○ Yes   ● Maybe   ○ No                 │
│                                          │
│  [ Cancel ]          [ Add Activity ]    │
└──────────────────────────────────────────┘
```

---

## Screen 5 — Lead Results View

```
┌──────────────────────────────────────────────────────────────┐
│  Toil Tracker  │  Q3 Work Audit  │  Status: [Reviewing ▾]    │
├─────────────────────┬────────────────────┬───────────────────┤
│  ✅ Automate (8)    │  🤔 Maybe (12)     │  ❌ Keep (5)      │
├─────────────────────┼────────────────────┼───────────────────┤
│  ┌───────────────┐  │  ┌──────────────┐  │  ┌─────────────┐ │
│  │ Deploy to     │  │  │ Write weekly │  │  │ Team        │ │
│  │ staging       │  │  │ status email │  │  │ standup     │ │
│  │ Sarah · Med   │  │  │ Tom · Quick  │  │  │ Ali · Med   │ │
│  │ [★ Flag]      │  │  │ [★ Flag]     │  │  │ [★ Flag]    │ │
│  └───────────────┘  │  └──────────────┘  │  └─────────────┘ │
│                     │                    │                   │
│  ┌───────────────┐  │  ┌──────────────┐  │                   │
│  │ Run CI        │  │  │ Code review  │  │                   │
│  │ pipeline      │  │  │ allocation   │  │                   │
│  │ Tom · Quick   │  │  │ Sarah · Sig  │  │                   │
│  │ [★ Flag]      │  │  │ [★ Flag]     │  │                   │
│  └───────────────┘  │  └──────────────┘  │                   │
├─────────────────────┴────────────────────┴───────────────────┤
│  [ Export CSV ]                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Navigation Notes

- Engineers only ever see Screens 2 and 3
- The lead accesses Screen 5 via a separate URL token (`?lead=<token>`)
- Screen 4 appears as a modal overlay on top of Screen 3
- No persistent navigation — this is a single-session, single-purpose tool
