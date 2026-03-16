# Pocket-Agents — Next Step Recommendations

> Written at the end of each session to guide the next session.
> The agent reading this should treat it as the starting context for their work.
> **Last updated:** 2026-03-16 (after Phase 6 — Tool Execution Layer)

---

## Current Recommendation: Phase 7 — Run-Scoped Memory Store + Workflow Runner

**Phase:** 7
**Prerequisite:** Phase 6 complete ✅

---

## What to Do

### Step 1 — Memory Store (`src/state/memory-store.js`)

Run-scoped in-memory KV store (`stateStore` placeholder in runtime is still null):
- `createStore()` → returns new frozen store
- `createScope(store, runId)` → scoped store (keys prefixed `${runId}:` internally)
- `get(store, key)` → value or `undefined`
- `set(store, key, value)` → new store with key added/updated
- `del(store, key)` → new store with key removed
- `list(store)` → `[{ key, value }]` entries (strips prefix for scoped stores)
- **No mutation** — every operation returns new store object

Wire into `src/runtime/index.js`: replace `stateStore: null` with `stateStore: createStore()`.

### Step 2 — Workflow Runner (`src/runner/workflow-runner.js`)

A minimal sequential workflow executor:
- `runWorkflow(runtime, workflowId, input)` → validates manifest, executes steps in order
- Each step emits `step.started` + `step.completed` via `runtime.eventBus`
- Emit `workflow.started` and `workflow.completed` (or `workflow.failed`) run-level events
- No real agent execution — stub agent call with `{ output: input }` for Phase 7

### Step 3 — Connect `dmux` plans

The `dmux plan` command was added in Phase 5 as a forward-compatible utility. In Phase 7, wire `dmux run` to `runWorkflow`.

### Step 4 — Tests (TDD first)

- `tests/state/memory-store.test.js`
- `tests/runner/workflow-runner.test.js`
- Update `tests/runtime/runtime.test.js` to verify `stateStore` is no longer null

---

## Files to Read Before Starting Phase 7

1. `GLOBAL-INSTRUCTION-BLOCK.md`
2. `CLAUDE.md`
3. `src/runtime/index.js` — `stateStore` still null; update it
4. `src/core/registry/agent-registry.js` — pattern for memory store
5. `src/cli/dmux.js` — understand what dmux plan outputs for wiring
6. `contracts/workflow-manifest.schema.json` — step shape
7. This file

---

## What to Do

### Step 1 — Memory Store (`src/state/memory-store.js`)

Run-scoped in-memory key-value store (the `stateStore` placeholder in runtime is still null):
- `createStore()` → returns a new empty store (frozen)
- `createScope(store, runId)` → returns a store scoped to that run (keys prefixed internally with `${runId}:`)
- `get(store, key)` → returns value or `undefined`
- `set(store, key, value)` → returns new store with key added/updated
- `del(store, key)` → returns new store with key removed
- `list(store)` → returns array of `{ key, value }` entries
- **No mutation**: every operation returns a new store object

### Step 2 — Wire `stateStore` into Runtime Assembly

Update `src/runtime/index.js`:
```js
import { createStore } from '../state/memory-store.js';
// ...
stateStore: createStore(),
```

### Step 3 — Workflow Runner (`src/runner/workflow-runner.js`)

A minimal sequential workflow executor:
- `runWorkflow(runtime, workflowId, input)` → validates workflow manifest exists in registry, executes each step in order, collects results
- Each step invokes `runStep(runtime, step, context)` where `context` is the accumulated output of prior steps
- No actual agent execution in Phase 6 — stub out the agent call with a placeholder that returns `{ output: input }`
- Validate the workflow manifest using `validateWorkflowManifest` before executing
- Emit events via `runtime.eventBus` for key lifecycle moments: `workflow.started`, `workflow.completed`, `step.started`, `step.completed`

### Step 3a — Add `run:workflow` CLI command

- Create `src/cli/run-workflow.js` and route it from `src/cli/index.js`.
- Accept workflow id/path input and call the new workflow runner.
- Keep execution strictly single-process and sequential for V1.

### Step 3b — Connect preparatory dmux plans

- Keep `src/cli/dmux.js` as check/plan tooling.
- Update dmux plan command templates to reference the real `run:workflow` command once implemented.
- Do not add parallel execution inside Pocket-Agents runtime; dmux remains external orchestration.

### Step 4 — Unit Tests (TDD — write tests first)

Create:
- `tests/state/memory-store.test.js` — full coverage of createStore, get, set, del, list, createScope
- `tests/runner/workflow-runner.test.js` — tests for runWorkflow using registries populated with example manifests

### Step 5 — Verify

```bash
node --test   # all tests pass, 0 failures
node src/cli/index.js list:agents     # echo-agent
node src/cli/index.js list:workflows  # hello-workflow
```

---

## Risks to Watch For

1. **Memory store scoping**: Use `${runId}:${key}` as the internal key. `list(store)` for a scoped store should only return keys for that runId scope — strip the prefix before returning.
2. **Workflow runner — no real agent execution**: The runner must not try to execute agent code. Use a stub that returns the input unchanged. Real agent execution is Phase 7+.
3. **Immutability in memory store**: Same pattern as registries — `new Map([...store.entries, [key, value]])`.
4. **stateStore is still null**: Update both `src/runtime/index.js` and `tests/runtime/runtime.test.js` when wiring.

---

## Files to Read Before Starting Phase 6

1. `GLOBAL-INSTRUCTION-BLOCK.md`
2. `CLAUDE.md`
3. `src/runtime/index.js` — note: `stateStore` is still null; `registries` is now wired
4. `src/core/registry/agent-registry.js` — pattern to follow for memory store
5. `tests/runtime/runtime.test.js` — update stateStore assertion
6. `contracts/workflow-manifest.schema.json` — step shape
7. `src/cli/dmux.js` — align plan templates once `run:workflow` exists
8. This file

---

## Archive — Phase 5 Session Recommendations

### (Archived 2026-03-16 — Phase 5 complete)

Phase 5 delivered in-memory registries for agents, tools, and workflows. All three registries use immutable functional APIs (no class instances). Example manifests were created under `src/examples/`. CLI commands `list:agents`, `list:tools`, `list:workflows` were added. `runtime.registries` is now a frozen `{ agents, tools, workflows }` object. 71 new tests (235 total) — all pass.

## Archive — Phase 4 Session Recommendations

### (Archived 2026-03-16 — Phase 4 complete)

Phase 4 was Structured Logging and Event Infrastructure. Delivered:
- `src/events/event-bus.js` — immutable in-process event bus (Map-based, no EventEmitter)
- `src/events/jsonl-sink.js` — optional JSONL file sink (`appendEvent`, `readEvents`, `createJsonlSink`)
- `src/cli/events-tail.js` — `events:tail` command (snapshot read)
- `src/runtime/logger.js` updated — `child(context)` method for bound context fields
- `src/runtime/index.js` updated — eventBus wired; JSONL sink auto-attached if PA_EVENTS_FILE set
- `src/config/defaults.js` and `loader.js` updated — `eventsFile` config key
- 52 new tests (164 total) — all pass

## Archive — Phase 3 Session Recommendations

### (Archived 2026-03-16 — Phase 3 complete)

Phase 3 was Config Loading and Runtime Assembly. Delivered:
- `src/config/defaults.js` — hardcoded defaults
- `src/config/loader.js` — layered config loader (overrides > env > file > defaults)
- `src/runtime/logger.js` — minimal structured logger placeholder
- `src/runtime/index.js` — `createRuntime()` with config, logger, and null placeholders
- `src/cli/config-show.js` — `config:show` command with secret redaction
- `src/cli/index.js` updated to add `config:show` command
- `.env.example` updated with all `PA_*` env vars
- 62 new tests (112 total) — all pass

## Archive — Phase 2 Session Recommendations

### (Archived 2026-03-16 — Phase 2 complete)

Phase 2 was Contracts & Schemas. Delivered:
- 6 JSON Schema files in `contracts/`
- `src/core/validators/index.js` with 6 exported validator helpers
- 42 new tests (50 total) — all pass
- AJV v8 installed as sole production dependency

## Archive — Phase 1 Session Recommendations

### (Archived 2026-03-16 — Phase 1 complete)

Phase 1 was the repo skeleton: `package.json`, `.gitignore`, `.env.example`, `README.md`, `src/cli/index.js + doctor.js`, `tests/cli/doctor.test.js`, and directory scaffolding. All complete and verified.
