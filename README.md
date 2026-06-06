# Agent Trajectory Inspector

A lightweight web tool for inspecting, replaying, and annotating AI agent runs — built to triage where LLM agents go wrong.

**Live demo:** [agent-trajectory-inspector.vercel.app](https://agent-trajectory-inspector.vercel.app/)

> 📸 _Screenshot/demo GIF will go here._

---

## Why this exists

LLM-based agents — language models equipped with tools, looping through thinking, calling tools, and observing results — fail in subtle ways. They pick the wrong tool, hallucinate UI elements, give up too early, or deviate from their own stated plan. The only way to figure out *why* a run failed is to inspect the trajectory step-by-step: every thought, tool call, observation, and action, in order.

This tool is a minimal version of the internal triage interface AI teams build for themselves (similar in spirit to Langfuse, Braintrust, or Langsmith). Focused on the specific reviewer workflow of replaying a run, locating the failure point, and annotating *why* it failed.

## What it does

- **Loads recorded agent trajectories** from JSON files.
- **Visualizes each run as a typed timeline** — 💭 thought, 🔧 tool call, 👁 observation, 🖱 action — with color-on-hover styling that lets the eye scan a long run quickly.
- **Renders a type-specific detail view** for the selected step — tool call arguments, reasoning text, observation content, and action targets surfaced differently per type.
- **Per-step annotations and failure flagging**, scoped per-trajectory and persisted in `localStorage`.
- **Switch between multiple trajectories** to compare success vs. failure runs side by side.
- **Generates new trajectories on-demand via an LLM** (Llama 3.3 70B via the Groq API) — type a goal, get back a structured trajectory you can immediately inspect.

## Live LLM generation — local-only by design (v1)

The live "Generate trajectory" feature is **only enabled in local development** for the v1 release. The reason: a Vite-bundled API key is exposed to the user's browser, which would let anyone visiting the live demo burn through the project's free-tier quota.

Run locally to use this feature:
```bash
git clone https://github.com/Tors428/agent-trajectory-inspector.git
cd agent-trajectory-inspector
npm install

# Add your Groq API key
echo "VITE_GROQ_API_KEY=<your-key>" > .env

npm run dev
```

Get a free Groq key at [console.groq.com/keys](https://console.groq.com/keys) — no billing required.

The deployed demo still showcases everything else: the inspector UI, the schema, the typed timeline, annotations, persistence, and pre-recorded trajectories illustrating success, failure, and a dark-pattern UI failure case.

## Design decisions

- **Inspector view over transcript view.** A single selected-step detail panel rather than rendering all step details inline. Scales when trajectories grow long; mirrors how real eval tools (Langfuse, Braintrust) are structured.
- **Trajectory data is immutable; annotations are an overlay.** The recorded run is treated as evidence; the reviewer's notes and failure flags live in a separate state layer. This mirrors how multi-reviewer eval pipelines work.
- **Discriminated unions for step shapes.** Each step has a `type` field that determines the shape of its `content`. Keeps the data model extensible — new step types can be added without breaking the rendering layer.
- **Composite keys (`trajId::stepId`) for annotation scoping.** A single flat dictionary holds annotations across all trajectories; namespacing avoids step-ID collisions across runs.
- **Color-on-interaction, not always-on.** Step types tint only on hover and selected state, keeping the resting timeline calm while still helping the eye scan.

## Tech stack

- **React** (functional components, hooks: `useState`, `useEffect`)
- **Vite** for build / dev server
- **Vanilla CSS** — no UI library, intentionally lightweight
- **localStorage** for client-side annotation persistence
- **Groq API** (Llama 3.3 70B) for live trajectory generation
- **Vercel** for deployment

## Roadmap

- [ ] **Backend proxy for live LLM generation** — move the API key to a Vercel serverless function so the deployed demo can also generate trajectories without exposing the key
- [ ] Export annotated runs as JSON for downstream eval analysis
- [ ] Side-by-side trajectory diffing for comparing model versions
- [ ] Auto-grading heuristics (did the agent succeed? where did the plan diverge from execution?)
- [ ] Server-side annotation storage for collaborative team review
- [ ] Connect to a real browser-controlling agent backend instead of LLM-simulated trajectories

## Run locally

```bash
git clone https://github.com/Tors428/agent-trajectory-inspector.git
cd agent-trajectory-inspector
npm install
echo "VITE_GROQ_API_KEY=<your-key>" > .env
npm run dev
```

Then open the localhost URL printed in the terminal.

## About

Built by [Toral Banerjee](https://github.com/Tors428) as part of ongoing work on AI agent reliability, dark-pattern research, and evaluation tooling.
