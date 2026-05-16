# Evaluation Rubric

Used consistently across all four experiments. Fill in `findings.md` using these criteria.

---

## Iteration Tracking

Before scoring anything, record:

| # | Prompt | What was missing / wrong | What it fixed |
|---|---|---|---|
| 1 | _(initial prompt)_ | — | Initial generation |
| 2 | | | |
| 3 | | | |

**Total prompts to reach final state:** ___

---

## Scoring Dimensions (1–5)

### 1. Completeness
Are all four surfaces present and covering the core use case?

| Score | Meaning |
|---|---|
| 1 | One or more surfaces missing entirely |
| 2 | All surfaces present but one is a placeholder or stub |
| 3 | All surfaces present; some features incomplete within them |
| 4 | All surfaces complete with only minor gaps |
| 5 | All surfaces complete, coherent, and consistent with each other |

### 2. Code Correctness
Does it run? Does the core use case work end to end?

| Score | Meaning |
|---|---|
| 1 | Does not start; major errors prevent running |
| 2 | Starts but core features broken |
| 3 | Core features work; notable bugs in edge cases |
| 4 | Works well; only minor issues |
| 5 | Works correctly throughout; production-quality |

### 3. Architecture & Design Decisions
Did Claude make sensible structural choices unprompted?

| Score | Meaning |
|---|---|
| 1 | Wrong architecture; major structural problems |
| 2 | Workable but poor separation of concerns or tech choices |
| 3 | Reasonable choices; some decisions questionable |
| 4 | Good choices throughout; minor debatable decisions |
| 5 | Excellent choices; thoughtful tradeoffs clearly visible |

### 4. MCP Quality
Are the MCP tools well-designed for the domain?

| Score | Meaning |
|---|---|
| 1 | No MCP server, or a stub with no real tools |
| 2 | MCP server exists but tools are generic, wrong-named, or don't match the domain |
| 3 | Tools cover core operations; names and descriptions adequate |
| 4 | Tools well-named, well-described, cover all key domain operations |
| 5 | Tools excellent — right granularity, great descriptions, idiomatic MCP design |

### 5. Skills Quality
Are the AI skills genuinely useful and domain-specific?

| Score | Meaning |
|---|---|
| 1 | No skills, or generic placeholder |
| 2 | Skills exist but are not specific to this app's domain |
| 3 | Skills cover core workflows and are usable |
| 4 | Skills are well-crafted, domain-specific, and clearly useful |
| 5 | Skills are excellent — precise instructions, correct tool usage, genuinely save time |

---

## What to Note Beyond the Score

For each dimension, write a short observation — not just a number. The observations are the actual research output. The scores are just for comparison.

Key questions to answer per experiment:
- What did Claude invent that we didn't specify?
- What did it miss that seemed obvious?
- Where did the spec type clearly help or hurt?
- Did the MCP tools reflect the domain vocabulary of the spec?
- Did the skills reflect the workflows described in the spec?
