# Pocket-Agents — Next Step Recommendations

> Written at the end of each session to guide the next session.
> The agent reading this should treat it as the starting context for their work.
> **Last updated:** 2026-03-16 (after Phase 8 — Sequential Workflow Runner)

---

## Current Recommendation: Phase 9 — Hardening and Coverage

**Phase:** 9 (Hardening)
**Prerequisite:** Phase 8 complete ✅

---

## What to Do

### Option A — Coverage and Hardening

Phase 8 (workflow runner) is complete. The next natural step is hardening V1:

1. **Tool step test coverage** (KI-008)
   - Add a workflow-runner test with `type: 'tool'` step using a built-in tool (e.g. `schema-validate`)
   - Verify the tool step resolves inputMapping and calls executeTool correctly

2. **Connect dmux plan templates to real `workflow:run` command**
   - Update `src/cli/dmux.js` plan output templates to reference `workflow:run` (was previously `run:workflow`)
   - No new functionality — just update the template strings

3. **README update**
   - Document the `workflow:run` command and the workflow step format
   - Include a quick-start example showing a 2-step workflow

4. **Consider adding `--json` flag to suppress log output**
   - Currently the CLI outputs structured logs to stdout alongside the JSON result
   - A `--json` flag or `PA_LOG_LEVEL=error` env var would allow clean JSON-only output

### Option B — Phase 9: Python Agent Adapter (see `docs/decisions.md` D-010)

Phase 7–8 complete the Node-side agent/workflow execution. Next major capability is Python agent support:
1. Define a subprocess contract (stdin/stdout JSON-RPC or newline-delimited JSON)
2. Implement `PythonAgentAdapter` in `src/runner/`
3. Add `adapter` field to agent-manifest schema (optional, default: 'node')

---

## Files to Read Before Starting Phase 9

1. `GLOBAL-INSTRUCTION-BLOCK.md`
2. `CLAUDE.md`
3. `src/cli/dmux.js` — update template to reference `workflow:run`
4. `src/runner/workflow-runner.js` — understand the tool step type path (KI-008)
5. `docs/project-ops/known-issues.md` — review KI-007 and KI-008
6. `docs/project-ops/phase-progress.md`
7. This file

---

## Risks to Watch For

1. **Schema breaking change documented (KI-007)**: Any custom workflow manifests using old `stepId`/`agentId` format will fail to register. Document the migration path clearly before V1 is publicised.
2. **Tool step `ref` must match a BUILTIN_TOOLS key**: Tool step validation is runtime-only (no registry check at manifest registration time). A typo in `ref` on a tool step will produce a clear error at step execution time but not at registration time.
3. **Input mapping silently returns `undefined` for missing paths**: `resolvePath` returns `undefined` for paths that don't exist in the workflow context. Agent input validation will catch this if the agent's inputSchema marks the field as required, but otherwise it passes silently.

---

## Archive — Phase 8 Session Recommendations

### (Archived 2026-03-16 — Phase 8 complete)

Phase 8 delivered the sequential workflow runner. Delivered:
- `contracts/workflow-manifest.schema.json` — updated to Phase 8 step format (id/type/ref)
- `src/runner/workflow-runner.js` — runWorkflow() with 4 step types, input mapping, timeout, onError policy
- 3 new example workflows (repo-inspect, api-normalize, content-admin)
- `src/cli/workflow-run.js` + `workflow:run` CLI command
- 29 new tests (398 total) — all pass

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
