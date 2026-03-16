# Pocket-Agents — Phase Progress

> Live tracking of what has been completed and what is in progress.
> Updated at the end of every session.
> **Last updated:** 2026-03-16

---

## Current Phase: 6 — Tool Execution Layer

**Status:** ✅ Complete

---

## Phase 6 — Tool Execution Layer

**Started:** 2026-03-16
**Completed:** 2026-03-16
**Status:** ✅ Complete

### Deliverables

| File | Status |
|---|---|
| `src/tools/executor.js` | ✅ Done — 2026-03-16 |
| `src/tools/index.js` | ✅ Done — 2026-03-16 |
| `src/tools/built-in/file-read.js` | ✅ Done — 2026-03-16 |
| `src/tools/built-in/file-write.js` | ✅ Done — 2026-03-16 |
| `src/tools/built-in/file-list.js` | ✅ Done — 2026-03-16 |
| `src/tools/built-in/shell-exec.js` | ✅ Done — 2026-03-16 |
| `src/tools/built-in/http-request.js` | ✅ Done — 2026-03-16 |
| `src/tools/built-in/schema-validate.js` | ✅ Done — 2026-03-16 |
| `src/cli/tool-run.js` | ✅ Done — 2026-03-16 |
| `src/cli/index.js` (tool:run added) | ✅ Done — 2026-03-16 |
| `tests/tools/executor.test.js` | ✅ Done — 2026-03-16 |
| `tests/tools/built-in/file-read.test.js` | ✅ Done — 2026-03-16 |
| `tests/tools/built-in/file-write.test.js` | ✅ Done — 2026-03-16 |
| `tests/tools/built-in/file-list.test.js` | ✅ Done — 2026-03-16 |
| `tests/tools/built-in/shell-exec.test.js` | ✅ Done — 2026-03-16 |
| `tests/tools/built-in/http-request.test.js` | ✅ Done — 2026-03-16 |
| `tests/tools/built-in/schema-validate.test.js` | ✅ Done — 2026-03-16 |
| `tests/cli/tool-run.test.js` | ✅ Done — 2026-03-16 |

### Verification

- `npm test` — ✅ 327/327 tests pass (92 new, 235 existing)
- `node src/cli/index.js tool:run schema-validate --input '{"schema":{"type":"string"},"data":"hi"}'` — ✅ `{"valid":true}`
- `node src/cli/index.js tool:run file-list --input '{"dir":"./src/tools"}'` — ✅ lists built-in tools
- `node src/cli/index.js tool:run shell-exec --input '{"command":"echo hi"}'` — ✅ error (allowShell=false)

### Notes

- Tool IDs use kebab-case (`file-read`, `shell-exec`) per the tool-manifest schema pattern.
- `requiredPermissions` is a module export, NOT part of the JSON Schema manifest.
- `shell-exec` uses `spawnSync` (not `execSync`) to avoid throwing on non-zero exit codes.
- `http-request` uses Node 20 global `fetch` — no extra dep needed.
- `schema-validate` uses its own AJV instance, separate from the contracts validator.
- `tool:run` CLI uses top-level ESM `await` (not `.then()`) to avoid async fallthrough.
- KI-004 (shell injection) documented in known-issues.md.

---

## Previous Phase: 5 — In-Memory Registries

**Status:** ✅ Complete

---

## Session Update — 2026-03-16 (dmux preparatory CLI utility)

**Scope:** User-requested CLI enhancement without advancing workflow-runner phase.

### Deliverables

| File | Status |
|---|---|
| `src/cli/dmux.js` | ✅ Done — added `dmux check` + `dmux plan` preparatory commands |
| `src/cli/index.js` | ✅ Done — wired `dmux` command into CLI router |
| `tests/cli/dmux.test.js` | ✅ Done — added command behavior coverage |

### Verification

- `npm test` — ❌ fails due to pre-existing missing modules unrelated to dmux (`src/cli/tool-run.js`, `src/tools/built-in/*`)
- `node src/cli/index.js dmux check` — ✅ command executed; environment correctly reported missing dmux binary

### Notes

- This session intentionally avoided implementing `run:workflow` to preserve phase/scope discipline.
- `dmux plan` writes forward-compatible orchestration plans under `.orchestration/`.

---

## Phase 0 — Project Operating System

**Started:** 2026-03-16
**Completed:** 2026-03-16
**Status:** ✅ Complete

### Deliverables

| File | Status |
|---|---|
| `CLAUDE.md` | ✅ Done — 2026-03-16 |
| `GLOBAL-INSTRUCTION-BLOCK.md` | ✅ Done — pre-existing, verified |
| `docs/PRD-v1.md` | ✅ Done — 2026-03-16 |
| `docs/architecture.md` | ✅ Done — 2026-03-16 |
| `docs/decisions.md` | ✅ Done — 2026-03-16 |
| `docs/phase-plan.md` | ✅ Done — 2026-03-16 |
| `docs/project-ops/agent-rules.md` | ✅ Done — 2026-03-16 |
| `docs/project-ops/decision-log.md` | ✅ Done — 2026-03-16 |
| `docs/project-ops/known-issues.md` | ✅ Done — 2026-03-16 |
| `docs/project-ops/phase-progress.md` | ✅ Done — 2026-03-16 |
| `docs/project-ops/next-step-recommendations.md` | ✅ Done — 2026-03-16 |

### Notes
- All documentation files created in a single session.
- `GLOBAL-INSTRUCTION-BLOCK.md` was pre-existing and used as input for all docs.
- No runtime code written; scope strictly followed.

---

## Phase 1 — Repo Skeleton & Node.js Runtime Baseline

**Started:** 2026-03-16
**Completed:** 2026-03-16
**Status:** ✅ Complete

> Note: User redefined Phase 1 from "Contracts & Schemas" (original plan) to "Repo Skeleton & CLI Baseline". phase-plan.md updated accordingly.

### Deliverables

| File | Status |
|---|---|
| `package.json` | ✅ Done — 2026-03-16 |
| `.gitignore` | ✅ Done — 2026-03-16 |
| `.env.example` | ✅ Done — 2026-03-16 |
| `README.md` | ✅ Done — 2026-03-16 |
| `src/cli/index.js` | ✅ Done — 2026-03-16 |
| `src/cli/doctor.js` | ✅ Done — 2026-03-16 |
| `tests/cli/doctor.test.js` | ✅ Done — 2026-03-16 |
| Directory scaffolding (`.gitkeep`) | ✅ Done — 2026-03-16 |

### Verification

- `npm install` — ✅ 0 packages installed, 0 vulnerabilities
- `node src/cli/index.js doctor` — ✅ correct output
- `npm test` — ✅ 8/8 tests pass

### Notes
- No external dependencies added. `node --test` auto-discovery used.
- KI-003 (ESM `import.meta.url`) confirmed resolved.
- Contracts & Schemas deferred to Phase 2.

---

## Phase 2 — Contracts & Schemas (Runtime-Neutral Contracts and Schema Validation)

**Started:** 2026-03-16
**Completed:** 2026-03-16
**Status:** ✅ Complete

### Deliverables

| File | Status |
|---|---|
| `contracts/agent-manifest.schema.json` | ✅ Done — 2026-03-16 |
| `contracts/tool-manifest.schema.json` | ✅ Done — 2026-03-16 |
| `contracts/workflow-manifest.schema.json` | ✅ Done — 2026-03-16 |
| `contracts/task-envelope.schema.json` | ✅ Done — 2026-03-16 |
| `contracts/event-record.schema.json` | ✅ Done — 2026-03-16 |
| `contracts/run-result.schema.json` | ✅ Done — 2026-03-16 |
| `src/core/validators/index.js` | ✅ Done — 2026-03-16 |
| `tests/core/validators/validators.test.js` | ✅ Done — 2026-03-16 |
| `docs/PRD-v1.md` (Section 5 updated) | ✅ Done — 2026-03-16 |
| `docs/architecture.md` (Section 5 updated) | ✅ Done — 2026-03-16 |

### Verification

- `npm install` — ✅ ajv installed, 0 vulnerabilities
- `npm test` — ✅ 50/50 tests pass (42 new, 8 existing)
- KI-001 (AJV ESM import) — ✅ Resolved. `import Ajv from 'ajv'` works in Node 20 ESM.

### Notes

- Schemas use JSON Schema Draft-07 with `$defs` for shared types (semver pattern, jsonSchema type).
- `memory-entry` schema deferred — MemoryEntry is an internal store record not crossing runtime boundaries in V1.
- Validator module compiles all schemas eagerly at startup (fail-loudly-at-startup principle).
- Schema naming changed from PRD draft — see decision-log entry [2026-03-16] Phase 2.

---

## Phase 3 — Config Loading and Runtime Assembly

**Started:** 2026-03-16
**Completed:** 2026-03-16
**Status:** ✅ Complete

### Deliverables

| File | Status |
|---|---|
| `src/config/defaults.js` | ✅ Done — 2026-03-16 |
| `src/config/loader.js` | ✅ Done — 2026-03-16 |
| `src/runtime/logger.js` | ✅ Done — 2026-03-16 |
| `src/runtime/index.js` | ✅ Done — 2026-03-16 |
| `src/cli/config-show.js` | ✅ Done — 2026-03-16 |
| `src/cli/index.js` (updated) | ✅ Done — 2026-03-16 |
| `.env.example` (updated) | ✅ Done — 2026-03-16 |
| `tests/config/loader.test.js` | ✅ Done — 2026-03-16 |
| `tests/runtime/runtime.test.js` | ✅ Done — 2026-03-16 |
| `tests/cli/config-show.test.js` | ✅ Done — 2026-03-16 |
| `docs/PRD-v1.md` (Section 11 updated) | ✅ Done — 2026-03-16 |
| `docs/architecture.md` (Section 4 added) | ✅ Done — 2026-03-16 |

### Verification

- `npm test` — ✅ 112/112 tests pass (62 new, 50 existing)
- `node src/cli/index.js config:show` — ✅ prints resolved config
- `node src/cli/index.js doctor` — ✅ still passes

### Notes

- Config precedence: overrides > env vars > JSON file > defaults (deterministic).
- `frameworkName` is hardcoded — not overridable via env or file.
- `dataDir` is derived from `workspaceRoot` if not explicitly set.
- Logger placeholder in `src/runtime/logger.js` — replaceable in a future phase.
- `eventBus`, `registries`, `stateStore` are `null` placeholders in the runtime — Phase 4.
- Secret redaction in `config:show` uses key-name patterns (no current keys are secrets).

---

## Phase 4 — Structured Logging and In-Process Event Infrastructure

**Started:** 2026-03-16
**Completed:** 2026-03-16
**Status:** ✅ Complete

### Deliverables

| File | Status |
|---|---|
| `src/events/event-bus.js` | ✅ Done — 2026-03-16 |
| `src/events/jsonl-sink.js` | ✅ Done — 2026-03-16 |
| `src/cli/events-tail.js` | ✅ Done — 2026-03-16 |
| `src/runtime/logger.js` (child() added) | ✅ Done — 2026-03-16 |
| `src/runtime/index.js` (eventBus wired) | ✅ Done — 2026-03-16 |
| `src/cli/index.js` (events:tail registered) | ✅ Done — 2026-03-16 |
| `src/config/defaults.js` (eventsFile added) | ✅ Done — 2026-03-16 |
| `src/config/loader.js` (eventsFile loaded) | ✅ Done — 2026-03-16 |
| `.env.example` (PA_EVENTS_FILE documented) | ✅ Done — 2026-03-16 |
| `tests/events/event-bus.test.js` | ✅ Done — 2026-03-16 |
| `tests/events/jsonl-sink.test.js` | ✅ Done — 2026-03-16 |
| `tests/runtime/logger-context.test.js` | ✅ Done — 2026-03-16 |
| `tests/cli/events-tail.test.js` | ✅ Done — 2026-03-16 |
| `docs/architecture.md` (Phase 4a section) | ✅ Done — 2026-03-16 |

### Verification

- `npm test` — ✅ 164/164 tests pass (52 new, 112 existing)
- `node src/cli/index.js events:tail /tmp/pa-test.jsonl` — ✅ prints formatted events
- `node src/cli/index.js events:tail` (no file) — ✅ error with clear message
- `node src/cli/index.js config:show` — ✅ shows eventsFile field

### Notes

- Event bus is fully immutable: every subscribe/unsubscribe returns a new frozen bus.
- `logger.child(ctx)` binds context fields (runId, workflowId, agentId, toolId) into every entry.
- JSONL sink is opt-in via PA_EVENTS_FILE; not attached unless configured.
- `events:tail` is a snapshot reader — live follow deferred to a future phase.
- `registries` and `stateStore` remain null — now Phase 5 placeholders.

---

## Phase 5 — In-Memory Registries

**Started:** 2026-03-16
**Completed:** 2026-03-16
**Status:** ✅ Complete

### Deliverables

| File | Status |
|---|---|
| `src/core/registry/agent-registry.js` | ✅ Done — 2026-03-16 |
| `src/core/registry/tool-registry.js` | ✅ Done — 2026-03-16 |
| `src/core/registry/workflow-registry.js` | ✅ Done — 2026-03-16 |
| `src/examples/agents/echo-agent.js` | ✅ Done — 2026-03-16 |
| `src/examples/tools/echo-tool.js` | ✅ Done — 2026-03-16 |
| `src/examples/workflows/hello-workflow.js` | ✅ Done — 2026-03-16 |
| `src/cli/list-agents.js` | ✅ Done — 2026-03-16 |
| `src/cli/list-tools.js` | ✅ Done — 2026-03-16 |
| `src/cli/list-workflows.js` | ✅ Done — 2026-03-16 |
| `src/cli/index.js` (list:* commands added) | ✅ Done — 2026-03-16 |
| `src/runtime/index.js` (registries wired) | ✅ Done — 2026-03-16 |
| `tests/core/registry/agent-registry.test.js` | ✅ Done — 2026-03-16 |
| `tests/core/registry/tool-registry.test.js` | ✅ Done — 2026-03-16 |
| `tests/core/registry/workflow-registry.test.js` | ✅ Done — 2026-03-16 |
| `tests/cli/list-agents.test.js` | ✅ Done — 2026-03-16 |
| `tests/cli/list-tools.test.js` | ✅ Done — 2026-03-16 |
| `tests/cli/list-workflows.test.js` | ✅ Done — 2026-03-16 |
| `tests/runtime/runtime.test.js` (registries assertions updated) | ✅ Done — 2026-03-16 |
| `docs/architecture.md` (Phase 5 section added) | ✅ Done — 2026-03-16 |

### Verification

- `node --test` — ✅ 235/235 tests pass (71 new, 164 existing)
- `node src/cli/index.js list:agents` — prints `echo-agent`
- `node src/cli/index.js list:tools` — prints `echo-tool`
- `node src/cli/index.js list:workflows` — prints `hello-workflow`
- `node src/cli/index.js config:show` — still passes unchanged

### Notes

- All three registries follow the same immutable pattern: standalone functions, plain frozen data objects, no class-based registries.
- Error codes `registry.duplicate` and `registry.not_found` are consistent across all three registries.
- `stateStore` remains `null` — deferred to Phase 6.
- Example manifests in `src/examples/` are not executable — they are registry-ready definitions only.

---

## Phase 6 — Hardening

**Started:** —
**Completed:** —
**Status:** ⏳ Not Started
