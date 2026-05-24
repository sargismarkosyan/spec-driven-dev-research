# 08 — AI Skills

AI skills are task definitions written in Markdown that instruct an AI assistant (such as Claude) on how to perform a specific analysis or generation task using the Work Audit MCP server. Each skill file lives in the project at `skills/<name>/SKILL.md`.

When a facilitator invokes a skill, the AI agent reads the skill's SKILL.md file to understand the required steps, calls the appropriate MCP tools to fetch data, performs the analysis, and returns a structured response. Skills do not modify any session data — all write operations are either explicitly excluded from skills or require facilitator confirmation before proceeding.

## Skill Invocation Model

Skills are invoked by an AI assistant that has access to the Work Audit MCP server tools. The assistant reads the relevant SKILL.md, follows the prescribed steps in order, and returns the result to the facilitator. Skills are not automated background jobs — they run on demand when the facilitator requests them.

## Table of Contents

| File | Contents |
|---|---|
| [summarize-session.md](./summarize-session.md) | Skill: produce a plain-English summary with statistics for the current session state |
| [find-best-opportunities.md](./find-best-opportunities.md) | Skill: identify and rank the top automation opportunities by effort and team verdict |
| [draft-backlog.md](./draft-backlog.md) | Skill: convert flagged activities into draft backlog items in the facilitator's preferred format |

## Related Sections

- MCP tools available to skills: see [../07-mcp-server/tools.md](../07-mcp-server/tools.md)
- The effort calculation formula (for AI skills to compute effort from `tpo` and `freq`): see [../02-data-model/calculations.md](../02-data-model/calculations.md)
- Note: MCP tools do NOT enrich activities with a pre-computed `effortHrsPerWk` field. Skills that need effort values must compute them from the `tpo` and `freq` fields using the formula in calculations.md.
