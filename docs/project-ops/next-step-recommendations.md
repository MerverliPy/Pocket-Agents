# Pocket-Agents — Next Step Recommendations

> Written at the end of each session to guide the next session.
> The agent reading this should treat it as the starting context for their work.
> **Last updated:** 2026-03-16 (after Phase 2)

---

## Current Recommendation: Start Phase 3 — Core Runtime

**Phase:** 3
**Prerequisite:** Phase 2 complete ✅

---

## What to Do

### Step 1 — Agent Registry (`src/core/registry/agent-registry.js`)

Implement an in-memory agent registry:
- `register(manifest)` — validates manifest with `validateAgentManifest`, stores in a `Map`
- `resolve(agentId)` — returns the registered agent or throws with a clear error
- `list()` — returns all registered agent IDs
- Duplicate registration should throw (or overwrite with a warning — decide and log)
- No mutation: registry state is a new `Map` on each `register` call, or use a frozen store pattern

### Step 2 — Tool Registry (`src/core/registry/tool-registry.js`)

Mirror of the agent registry, but for tools. Validates with `validateToolManifest`.

### Step 3 — Memory Store (`src/state/memory-store.js`)

Implement a run-scoped in-memory key-value store:
- `createScope(runId)` → returns a store scoped to that run
- `get(key)`, `set(key, value)`, `delete(key)`, `list()`
- No mutation: `set` and `delete` return a new store, not the same one
- Each scope is isolated; keys in one run are invisible to another

### Step 4 — Event Bus (`src/events/event-bus.js`)

Implement a simple in-process event emitter:
- `emit(eventRecord)` — validates with `validateEventRecord`, then dispatches
- `subscribe(type, handler)` — returns an unsubscribe function
- `subscribeAll(handler)` — receives all events regardless of type
- No Node.js `EventEmitter` dependency — implement directly with a `Map<type, Set<handler>>`

### Step 5 — Unit Tests

For each module, create tests under `tests/core/`:
- `tests/core/registry/agent-registry.test.js`
- `tests/core/registry/tool-registry.test.js`
- `tests/state/memory-store.test.js`
- `tests/events/event-bus.test.js`

All tests must use `node:test` and `node:assert/strict`. Follow the existing test structure in `tests/core/validators/validators.test.js`.

### Step 6 — Verify

```bash
npm test   # all tests pass, 0 failures
```

---

## Risks to Watch For

1. **Immutability in registry**: The `register` function must return a new registry state, not mutate the existing map. Follow D-013.
2. **Event bus type matching**: Use exact string equality for event type matching. No glob or wildcard matching in V1.
3. **Memory store scoping**: Run scopes must be completely isolated. Sharing a backing store is OK if the scope key is always prefixed — but do not let keys leak between runs.
4. **AJV errors in event bus**: `validateEventRecord` must be called before dispatching. If validation fails, throw with the AJV errors attached — do not silently drop the event.

---

## Files to Read Before Starting Phase 3

1. `GLOBAL-INSTRUCTION-BLOCK.md`
2. `CLAUDE.md`
3. `docs/decisions.md` — D-003, D-011, D-013
4. `docs/project-ops/known-issues.md`
5. `src/core/validators/index.js` — to understand the validator API you'll use
6. This file

---

## Archive — Phase 2 Session Recommendations

### (Archived 2026-03-16 — Phase 2 complete)

Phase 2 was Contracts & Schemas. Delivered:
- 6 JSON Schema files in `contracts/`
- `src/core/validators/index.js` with 6 exported validator helpers
- 42 new tests (50 total) — all pass
- AJV v8 installed as sole production dependency
- PRD and architecture docs updated
- KI-001 resolved

## Archive — Phase 1 Session Recommendations

### (Archived 2026-03-16 — Phase 1 complete)

Phase 1 was the repo skeleton: `package.json`, `.gitignore`, `.env.example`, `README.md`, `src/cli/index.js + doctor.js`, `tests/cli/doctor.test.js`, and directory scaffolding. All complete and verified.
