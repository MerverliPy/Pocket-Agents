# Pocket-Agents — CLAUDE.md

## Read First

**Before doing anything in this repository, read `GLOBAL-INSTRUCTION-BLOCK.md` in its entirety.**
That file is the authoritative source of runtime rules, scope boundaries, and mandatory session-close procedures.

---

## Project Identity

| Field | Value |
|---|---|
| Repo root | `Pocket-Agents/` |
| Primary runtime | Node.js 20+ |
| Module format | ESM JavaScript |
| V1 strategy | Local-first, single-process |
| Contract layer | JSON Schema in `contracts/` |
| Python support | Deferred — architecture must allow it |
| Multi-agent | Deferred — interfaces must support it |

---

## Coding Behavior

1. **One phase at a time.** Do not implement Phase N+1 while Phase N is incomplete.
2. **Minimal dependencies.** Prefer Node built-ins. Justify every external package.
3. **Immutable data.** Never mutate objects in-place; return new copies.
4. **Small files.** Target 200–400 lines; hard stop at 800.
5. **Explicit error handling.** No silent swallowing. Surface errors with context.
6. **No magic.** Prefer boring, readable code over clever abstractions.
7. **No pre-building.** Do not scaffold future phases unless the current phase contract requires it.

---

## Scope Control

- Do not introduce distributed systems, cloud-native architecture, or service meshes in V1.
- Do not add autonomous planning engines, vector databases, or heavy dependency stacks.
- Do not silently expand scope beyond the current phase plan.
- Do not replace a simple solution with an abstract framework unless justified in `decisions.md`.

---

## Repository Is Local-First and Simple

V1 runs as a single Node.js process on the developer's machine.
No servers, no queues, no cloud dependencies in V1.
Future-facing interfaces (registry, queue, event transport, persistence) must be designed as replaceable seams — not wired up.

---

## Key Documentation Files

| File | Purpose |
|---|---|
| `GLOBAL-INSTRUCTION-BLOCK.md` | Master operating rules for every coding session |
| `docs/PRD-v1.md` | V1 product requirements — source of truth for scope |
| `docs/architecture.md` | System design and repo layout |
| `docs/decisions.md` | Locked baseline decisions |
| `docs/phase-plan.md` | Phase-by-phase V1 roadmap |
| `docs/project-ops/agent-rules.md` | Session-close rules for the agent |
| `docs/project-ops/decision-log.md` | Running log of major decisions |
| `docs/project-ops/known-issues.md` | Active issues and blockers |
| `docs/project-ops/phase-progress.md` | Phase completion status |
| `docs/project-ops/next-step-recommendations.md` | What to do next |

---

## Mandatory Session-Close Checklist

After every completed session, the agent **must** update:

- [ ] `docs/project-ops/agent-rules.md` — new bug patterns and lessons learned
- [ ] `docs/project-ops/known-issues.md` — any new or resolved issues
- [ ] `docs/project-ops/phase-progress.md` — mark completed work
- [ ] `docs/project-ops/next-step-recommendations.md` — what the next session should tackle
- [ ] `docs/project-ops/decision-log.md` — any major choices made this session
