# Blog Post Outline

**Working title:** "What Makes a Great Spec? Four Experiments with AI-Driven Development"
**Target publication:** Medium
**Audience:** Engineering managers and senior engineers

---

## Structure

### 1. Hook
The question nobody is asking loudly enough: when you hand a spec to an AI, what actually matters?

### 2. The Setup
- What spec-driven development is and why it's having a moment (brief, reference Thoughtworks radar)
- What we built to test it: Toil Tracker, and why we chose this app
- The four spec types we tested and why we ordered them this way

### 3. What We Expected the Output to Be
- Not just "does the code work"
- The four surfaces of an AI-native application: UI, API, MCP server, AI skills
- Why MCP and skills are the new frontier — and the most interesting signal

### 4. The Experiments (one section per)
Each follows the same structure:
- The spec (quoted or summarized)
- What Claude built in one shot
- What we had to fix, and how many iterations
- The MCP and skills quality specifically
- Score + one-sentence takeaway

### 5. The Comparison
- Side-by-side table of scores
- Where the gap between spec types was largest (hypothesis: MCP and skills)
- What each spec type got right that others missed
- The iteration cost curve: more spec = fewer corrections?

### 6. What We Learned
- The most surprising finding
- Which spec type produced the best MCP surface and why
- The minimum viable spec: what's the floor below which quality degrades sharply?
- Does more spec always mean better output — or does it constrain Claude in bad ways?

### 7. So What Should You Actually Write?
Practical takeaways for engineering teams:
- What to always include regardless of spec type
- When user-role specs beat technical specs
- The MCP surface as a design forcing function: if you can't describe your domain operations, your spec isn't done

### 8. What's Next
- Testing with different models
- Testing with the same spec types on different apps
- The Spec-as-Source thesis: could specs replace code as the primary artifact?

---

## Tone
Honest about what didn't work. Show the iterations, not just the final output. The research is the story, not the conclusion.
