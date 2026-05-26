# Merge Feature — Layer 2: Problem Statement + Business Rules

Add a merge feature to this application. The feature should allow the facilitator to combine similar activities submitted by different engineers into a single consolidated activity.

---

## Business Rules

### Similarity Formula

`combinedScore = 0.85 × titleSimilarity + 0.10 × (sameFreq ? 1 : 0) + 0.05 × (sameTpo ? 1 : 0)`

Title similarity is the dominant factor (85%). Frequency match contributes 10%. TPO match contributes 5%.

**Title similarity: Jaccard Index**

Tokenization:
1. Convert to lowercase
2. Remove all non-alphanumeric characters
3. Split into words
4. Discard words with length ≤ 2 characters

Jaccard index: `|intersection of word sets| / |union of word sets|`

If both word sets are empty after tokenization, title similarity is 0.

**Display threshold:** Only show similarity badge when `combinedScore > 0.15`. Activities below this threshold are not shown as candidates.

**Candidate computation:** Client-side when merge modal opens — no network call.

### Merged Result Record

When merge completes, the server creates a new activity with:

- `id`: 8-character truncated UUID (first 8 chars of a random v4 UUID)
- `participantId`, `participantName`, `participantInitials`, `participantColor`: copied from the first source activity
- `title`, `tpo`, `freq`, `energy`: from the merge payload
- `teamAuto`: always set to `unclassified` — must be re-classified after merge
- `flagged`: false
- `discussionNote`: empty string
- `editHistory`: empty array (no creation entry)

### Source Activity Mutation

Each source activity is updated (not deleted):

- `isMergedSource`: set to `true`
- `mergedIntoId`: set to the ID of the newly created merged activity

Source activities remain in the `activities` map. They are excluded from facilitator list views via `isMergedSource`. Engineer board and REST export do NOT filter them.

### View Filtering

The following facilitator views filter out `isMergedSource: true` activities from their lists, counts, and trays:

- **Live view:** Activity stream excludes merged sources. Activity count totals exclude merged sources. Merged result cards show an expandable section revealing source cards in a dimmed state.
- **Matrix view:** Merged sources excluded from dot rendering
- **Grouped view:** Merged sources excluded from all three columns
- **Discuss view:** Merged sources excluded from pending tray and sidebar

The **engineer board** does NOT filter merged sources — a source may still appear if the original author views their own board.

The **REST export** does NOT filter merged sources — sources appear in their automatability section if classified.

### Permanence

Merge is permanent. There is no unmerge command. The `isMergedSource` flag is permanent for the lifetime of the session.

### Prerequisites

A merge requires:
1. At least 2 source activity IDs
2. A valid facilitator token
3. All source IDs must exist in the session

### Classification Reset

The merged result's `teamAuto` is always reset to `unclassified` regardless of source classifications. This is intentional — the merged activity is a new consolidated framing that may warrant a different verdict.

### Permissions

Merge is initiated by the facilitator only. Engineers have no merge capability. Merge is permanent — there is no undo.
