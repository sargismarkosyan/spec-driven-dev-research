# Suggestion Rules

The engineer submission board displays a suggestions panel that surfaces activities other teammates have already submitted. This helps engineers recognize shared pain points and submit activities that are consistent with (or distinct from) what their colleagues have described.

Suggestions are derived entirely from live session data — they are not AI-generated and require no external service.

---

## Source Data

Suggestions are drawn from the **team feed**: the set of activities submitted by engineers other than the current user. The current user's own activities are never surfaced as suggestions to themselves.

---

## Deduplication (Grouping)

Activities in the team feed are grouped to prevent the same concept from appearing as multiple separate suggestions.

**Deduplication key:** The first 30 characters of the activity title, converted to lowercase.

When two or more activities share the same 30-character lowercase prefix, they are collapsed into a single suggestion. The suggestion shows a count of how many teammates submitted a similar activity (e.g., "2 on the team").

---

## Already-Submitted Filter

Before displaying a suggestion, the system checks whether the current engineer has already submitted something similar.

**Exclusion rule:** A suggestion is excluded when its first 20 lowercase characters match the first 20 lowercase characters of any activity the current engineer has already submitted.

This filter uses a shorter window (20 chars) than the grouping key (30 chars) to cast a wider exclusion net — it errs toward hiding suggestions the engineer has already addressed rather than showing redundant prompts.

---

## Maximum Displayed

At most **4 suggestions** are shown at any time. When there are more than 4 eligible suggestions after grouping and filtering, only the top 4 are displayed.

---

## Sort Order

Suggestions are sorted by **count descending** — the suggestion representing the largest number of teammates' activities appears first. This surfaces the most commonly reported shared pain points at the top of the list.

When two suggestions have the same count, the sort order is unspecified (insertion order or creation time may be used as a tiebreaker).

---

## Tap / Click Behavior

When an engineer clicks or taps a suggestion:

- The suggestion **pre-fills only the title field** of the add-activity form with the suggestion's title text.
- The three required questions — time per occurrence (tpo), frequency (freq), and energy — are **not pre-filled**. The engineer must answer all three themselves.
- The form does not auto-submit. The engineer reviews the pre-filled title, adjusts it if needed, and fills in the questions before submitting.

The purpose of the tap behavior is to provide a starting point for the title field, reducing typing friction. It does not submit an activity on the engineer's behalf.

---

## Live Updates

Suggestions update in real time as new activities are broadcast to the room via `activity:added`. When a new teammate activity arrives, the suggestion list is recomputed against the current engineer's submitted activities and the updated team feed.
