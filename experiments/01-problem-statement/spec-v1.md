# Spec v1: Problem Statement Only (archived)

> Original spec used in first-pass experiment. Archived when v2 specs were extracted from the Claude Design file.

---

Engineering teams accumulate repetitive, manual work over time but rarely stop to examine it. There is no established practice for auditing what engineers actually do day-to-day — which means improvement opportunities go unnoticed, toil compounds, and the team keeps doing work that could be automated, eliminated, or handed off.

Two people experience this problem differently.

**The engineer** is closest to the work. They know which of their daily activities are painful, repetitive, or feel like a waste of time — but that knowledge stays in their head. There is no structured way to surface it, and no forcing function to make it visible to the rest of the team. Engineers want to improve their own work process but need a way to capture and communicate what they know.

**The facilitator** is responsible for turning that knowledge into action. They need to look across everything the team does and identify what is worth fixing — specifically what is low effort to address and high value to the team. Without a structured view of the team's work, this is guesswork.

We need a tool that brings these two people together in a focused session: engineers describe their work honestly, and the facilitator gets what they need to make good prioritization decisions.

Build the full application as four outputs: a web UI, a backend API, an MCP server that exposes the app's operations to AI agents, and AI skills for common workflows within the tool.
