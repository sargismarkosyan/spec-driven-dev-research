# Prompt Template

The constant part of every experiment prompt. The spec is inserted at the end.
The UI guide (`shared/ui-guide.md`) is attached as a file reference when running in Claude Code.

---

## The Prompt

```
Build the Toil Tracker application based on the spec below.

Write all generated files into the current directory using this structure:

  app/
    frontend/   ← web UI
    backend/    ← REST API + WebSocket server
  mcp-server/   ← MCP server (streamable HTTP transport)
  skills/       ← AI skill files (one SKILL.md per skill)

Rules:
- The frontend and backend are separate. The frontend talks to the backend via the REST API.
- The MCP server exposes the app's domain operations as MCP tools. It is a separate entry point from the REST API but can share the same codebase.
- Skills follow the Anthropic Claude Skills format: a directory per skill, each containing a SKILL.md with YAML frontmatter (name, description) and Markdown instructions.
- Do not use server-side rendering. The UI is a client-side app served as static files.

UI layout reference: see the attached ui-guide.md.

Spec:
---
[INSERT SPEC HERE]
---
```

---

## How to Run

1. Open a fresh Claude Code session
2. Set the working directory to `experiments/<experiment-id>/output/`
3. Attach `shared/ui-guide.md` as context
4. Paste the prompt above with the experiment's `spec.md` inserted
5. Let Claude generate the full output
6. For each follow-up prompt needed, log it in `iterations.md` before sending it
7. Once satisfied, record the final prompt count in `findings.md`

## What Stays Constant Across All Experiments

- The task description and output structure above
- The UI guide (`shared/ui-guide.md`)
- The model: Claude Sonnet 4.6
- A fresh session with no prior context

## What Changes

- The spec (the variable we are testing)
