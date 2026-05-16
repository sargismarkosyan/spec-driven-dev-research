# Spec: PM Requirements (High-Level)

> User stories and acceptance criteria only. No technical detail.

---

## Users

- **Team Lead** — facilitates the session, views aggregated results
- **Engineer** — submits and tags their own work activities

## User Stories

- As an engineer, I can add my daily work activities to a shared board so the team can see what everyone is doing.
- As an engineer, I can tag each activity with attributes: how much time it takes, whether I enjoy it, whether it feels repetitive, and whether I think it could be automated.
- As a team lead, I can see all activities across the team in one view, sorted or filtered by attribute.
- As a team lead, I can mark certain activities as "automation candidates" and export the list.
- As a team, we can run this as a live session — everyone submits at the same time and we discuss the results together.

## Acceptance Criteria

- A new session can be created with a name and shared via link.
- Engineers join the session and add activities without needing an account.
- Each activity has: title, time estimate (low / medium / high), enjoyment (like / neutral / dislike), automation potential (yes / maybe / no).
- The lead view shows a summary grouped by automation potential.
- Session data persists for at least the duration of the session.
