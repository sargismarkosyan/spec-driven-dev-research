# Implementation Index

This page resolves known conflicts between spec documents. **Experiment 05** (`experiments/05-calude-design/output/`) is the reference implementation as of v0.3. When a spec section disagrees with experiment 05, treat this index as authoritative until the underlying spec file is updated.

---

## Resolved Conflicts

| Topic | Superseded / stale wording | Canonical (experiment 05) | Primary spec |
|---|---|---|---|
| **Energy enum** | Three-value wire format: `energizing`, `neutral`, `draining` (design mocks, old API docs) | Four values: `energizing`, `fine`, `tedious`, `draining`. `fine` replaces mock `neutral`. | [02-data-model/enumerations.md](./02-data-model/enumerations.md) |
| **Engineer export** | "Export page" in engineer UI; engineers export via dedicated screen | **Facilitator only:** Export modal in facilitator topbar. Engineers have **no export UI**. Anyone with the session ID may call `GET /api/sessions/:id/export` or the MCP export tool. | [04-facilitator-flow/export-modal.md](./04-facilitator-flow/export-modal.md), [10-business-rules/permissions.md](./10-business-rules/permissions.md) |
| **Discussion visibility (engineer)** | Topbar shows engineer activity count; progress text in main column | Topbar shows **session-wide** `{classified}/{total} classified`. Main column: own read-only cards only. Sidebar: flagged priorities (all submitters) + progress bar + "{N} activities still to review." Engineers never see other engineers' non-flagged cards. | [03-engineer-flow/board-discussion.md](./03-engineer-flow/board-discussion.md) |
| **Activity / session IDs** | All activity IDs described generically as "UUID" | **Session ID:** 8-char truncated UUID. **Engineer-submitted activity:** full UUID v4. **Merged result activity:** 8-char truncated UUID. Source activities keep their original IDs. | [02-data-model/activity.md](./02-data-model/activity.md), [02-data-model/session.md](./02-data-model/session.md) |
| **Merged-source visibility** | Sources hidden everywhere including REST export and engineer board | **Facilitator** list/matrix/grouped/discuss views filter `isMergedSource`. **Engineer board** and **REST export** do **not** filter merged sources today — sources may still appear if the engineer authored them. | [10-business-rules/merge-rules.md](./10-business-rules/merge-rules.md) |

---

## Partial / Planned (stored in model, not fully enforced in experiment 05)

| Topic | Spec intent | Experiment 05 behavior |
|---|---|---|
| **`liveTeamFeed`** | When `false`, hide team feed and suggestions during active phase | Flag is saved on session creation; engineer board **always** shows the team feed regardless of the flag. |
| **Export filename (API vs modal)** | API suggests `{session.id}-audit.md` | API returns `{session.id}-audit.md`; facilitator download modal uses a slug of `{session.name}-audit.md`. Both are valid — UI uses name slug. |

---

## Stale references to fix when editing

Search the spec for these patterns and align with this index:

- `neutral` as an **energy wire value** (not verdict tone or design vocabulary)
- "export page" for engineers
- "engineer's activity count" in discussion topbar
- "exclude merged sources from export" without the experiment 05 caveat
- Generic "activity UUID" without distinguishing merged-result 8-char IDs

---

## Reference implementation paths

| Area | Location |
|---|---|
| Domain types & enums | `experiments/05-calude-design/output/src/store.ts`, `app/components/Primitives.tsx` |
| Server / REST / export | `experiments/05-calude-design/output/src/server.ts` |
| Engineer board (all phases) | `experiments/05-calude-design/output/app/session/[id]/board/page.tsx` |
| Facilitator views + export modal | `experiments/05-calude-design/output/app/session/[id]/facilitator/page.tsx` |
