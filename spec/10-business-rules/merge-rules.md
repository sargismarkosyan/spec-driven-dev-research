# Merge Rules

The merge feature allows the facilitator to combine two or more activities — typically those that describe the same or closely related work — into a single consolidated activity record. This reduces duplication in the discussion phase and gives a clearer picture of shared team pain points.

---

## Trigger

The facilitator initiates a merge from the facilitator live view by either:

- Clicking a "merge" action on an activity card, which opens the merge dialog pre-populated with that activity as the first source
- Selecting multiple activities in the merge modal

---

## Prerequisites

A merge operation requires:

1. At least 2 source activity IDs. Merging a single activity into itself is not permitted and will be rejected by the server.
2. A valid facilitator token in the request.
3. All source activity IDs must exist in the session.

---

## Merge Candidate Suggestions (Similarity Scoring)

Before the facilitator manually selects sources, the application suggests likely merge candidates using a similarity score.

### Formula

`combinedScore = 0.85 × titleSimilarity + 0.10 × (sameFreq ? 1 : 0) + 0.05 × (sameTpo ? 1 : 0)`

Title similarity contributes 85% of the score — it is the dominant factor. Frequency match contributes 10%. Time-per-occurrence match contributes 5%.

### Title Similarity Method: Jaccard Index

Title similarity is computed as the Jaccard index over the tokenized word sets of both titles.

**Tokenization steps:**

1. Convert the title to lowercase.
2. Remove all non-alphanumeric characters (strip punctuation, symbols).
3. Split into individual words.
4. Discard any word whose length is 2 characters or fewer (removes articles, prepositions, and abbreviations that create false matches).

**Jaccard index:** `|intersection of word sets| / |union of word sets|`

If both word sets are empty after tokenization, title similarity is 0.

### Display Threshold

Only activities with a `combinedScore` of 0.15 or higher are shown as merge candidates. Activities with lower scores are not surfaced as suggestions (they may still be manually selected).

### Candidate List

All non-source activities in the session are shown as candidates, sorted by `combinedScore` descending. There is no hard cap on candidate count — all eligible activities appear in the scrollable list. Activities that are already marked as `isMergedSource: true` are excluded. The candidate list is client-computed — no server API call is made.

### Similarity Percentage Display Colors

The displayed similarity percentage badge is colored according to the score:

| Score | Badge class | Meaning |
|---|---|---|
| > 0.60 (above 60%) | `is-rust` | High confidence match |
| > 0.30 (above 30%, up to 60%) | `is-amber` | Moderate confidence match |
| ≤ 0.30 (30% or below) | No accent class (neutral chip style) | Low confidence match |

Note: A similarity badge is only shown at all when `combinedScore > 0.15`. Scores at or below 0.15 are not displayed as candidates.

---

## Merged Result Record

When a merge completes, the server creates a new activity record with the following field values:

| Field | Value |
|---|---|
| `id` | An 8-character truncated UUID (first 8 characters of a random version-4 UUID) |
| `participantId` | Copied from the first source activity |
| `participantName` | Copied from the first source activity |
| `participantInitials` | Copied from the first source activity |
| `participantColor` | Copied from the first source activity |
| `title` | From the merge payload (facilitator-supplied or derived) |
| `tpo` | From the merge payload |
| `freq` | From the merge payload |
| `energy` | From the merge payload |
| `teamAuto` | Set to `unclassified` — must be re-classified after merge |
| `flagged` | Set to false |
| `discussionNote` | Set to empty string |
| `editHistory` | Initialized as an empty array — no creation entry is added for merged results |
| `mergedFromIds` | Array of all source activity IDs |
| `mergedFromNames` | Array of submitter names from all source activities |
| `mergedFromInitials` | Array of initials from all source activities |
| `mergedFromColors` | Array of colors from all source activities |
| `reportedBy` | Aggregated list of all reporter names across all sources (for display as "Reported by X + Y") |
| `reportedByInitials` | Aggregated initials from all reporters |
| `reportedByColors` | Aggregated colors from all reporters |

---

## Source Activity Mutation

Each source activity is updated (not deleted) after a merge:

| Field | New value |
|---|---|
| `isMergedSource` | true |
| `mergedIntoId` | The ID of the newly created merged activity |

Source activities remain in the session data. They are excluded from facilitator list views (live, matrix, grouped, discuss) via the `isMergedSource` flag. The engineer board and REST export do **not** currently filter merged sources — a source may still appear if the original author views their own board or if export includes all records in the activities map.

**Exception:** In the facilitator live view, the merged result card can be expanded to reveal its source cards in a dimmed state. This provides traceability — the facilitator can see which individual submissions were combined.

---

## Permanence

Merge is a permanent operation within a session. There is no "unmerge" command. If the facilitator merges activities incorrectly, they must create new activities manually to represent the correct split.

---

## Classification Reset

The merged result's `teamAuto` is always reset to `unclassified`, regardless of what the source activities were classified as. The team must re-classify the merged activity during the discussion phase. This is intentional — the merge represents a new consolidated framing of the work that may have a different verdict than any individual source.
