# Soft Delete

When an engineer deletes one of their own activity cards, the deletion is not committed immediately. Instead, the application uses an optimistic delete with a short undo window, reducing the risk of accidental permanent removal.

Facilitator deletions performed from the facilitator panel do **not** use this soft-delete pattern — they are immediate and irreversible.

---

## Trigger

An engineer clicks the "×" delete button on one of their own activity cards on the engineer submission board. This initiates the soft-delete sequence.

Only the activity's owner (the engineer who created it) can trigger a soft delete. Other engineers cannot delete activities they do not own. See [permissions.md](./permissions.md) for the full access control rules.

---

## Immediate Effect (Optimistic UI)

The activity card disappears from the engineer's board immediately — before any server communication occurs. This is the optimistic part of the operation: the UI assumes the delete will succeed and acts accordingly.

At this stage, no socket event or REST call has been sent. The activity still exists on the server.

---

## Undo Toast

Simultaneously with the card disappearing, a toast notification appears at the bottom of the screen. The toast contains:

- A visible "Undo" button
- A visual drain animation — a progress bar or fill element that depletes over 5 seconds, giving the engineer a clear sense of how much time remains

The toast remains visible for the entire 5-second window.

---

## Undo Action

When the engineer clicks "Undo" at any point during the 5-second window:

1. The activity card is restored to its original position in the activity list.
2. The toast disappears.
3. No socket event or REST call is sent — the delete is cancelled entirely and the server is never notified.

---

## Confirmation (Commit)

When 5 seconds elapse without the engineer clicking "Undo":

1. The toast disappears.
2. The actual delete is committed by sending the `activity:delete` socket event to the server, or by calling the `DELETE /api/sessions/:id/activities/:aid` REST endpoint.
3. The server removes the activity, and `activity:deleted` is broadcast to all participants in the room.

Other participants in the session see the activity disappear from their views only at this point (when the server broadcasts the deletion). During the 5-second undo window, other participants still see the activity in their live feeds.

---

## Edge Cases

**Page navigation / component unmount during undo window:** When the engineer board component unmounts (e.g., the user navigates away, closes the tab, or refreshes the page) while a soft delete is pending, the 5-second timer is **cancelled** — the delete is **not** committed. The activity is preserved on the server. This means navigating away during the undo window acts as an implicit undo.

**Multiple soft deletes:** When an engineer initiates a new soft delete while a previous one is still in its undo window, the **previous pending delete is committed immediately** before the new undo window begins. The prior activity is deleted without waiting for its 5-second window to expire. The new deletion then starts its own fresh 5-second undo window.
