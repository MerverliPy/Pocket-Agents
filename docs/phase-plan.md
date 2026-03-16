# Pocket-Agents — Phase Plan (V1 Roadmap)

> **V1 only.** Each phase builds on the previous. Phases must be completed in order.
> **Last updated:** 2026-03-16

---

## Phase Summary

| Phase | Name | Status |
|---|---|---|
| 0 | Project Operating System | ✅ Complete |
| 1 | Repo Skeleton & Node.js Runtime Baseline | ✅ Complete |
| 2 | Contracts & Schemas | ⏳ Not Started |
| 3 | Core Runtime | ⏳ Not Started |
| 4 | Workflow Runner | ⏳ Not Started |
| 5 | Echo Agent & Tool | ⏳ Not Started |
| 6 | Hardening | ⏳ Not Started |

---

## Phase 0 — Project Operating System

### Objective
Establish the documentation and rules foundation before any runtime code is written. Future sessions can use these files as operating instructions.

### Scope
- Documentation only. No runtime code.

### Deliverables
- `CLAUDE.md`
- `GLOBAL-INSTRUCTION-BLOCK.md`
- `docs/PRD-v1.md`
- `docs/architecture.md`
- `docs/decisions.md`
- `docs/phase-plan.md`
- `docs/project-ops/agent-rules.md`
- `docs/project-ops/decision-log.md`
- `docs/project-ops/known-issues.md`
- `docs/project-ops/phase-progress.md`
- `docs/project-ops/next-step-recommendations.md`

### Acceptance Criteria
- All documentation files exist and are non-empty.
- PRD is V1-only and covers all required sections.
- Architecture and decisions align with locked baseline choices.
- Project ops files are initialized with useful templates.
- Future sessions can open these files and understand what to build next.

### Definition of Done
- All listed deliverables created.
- `phase-progress.md` updated to reflect Phase 0 complete.
- `next-step-recommendations.md` points to Phase 1.

### Dependencies
- None (first phase).

---

## Phase 1 — Repo Skeleton & Node.js Runtime Baseline ✅ Complete (2026-03-16)

### Objective
Create the minimal executable Node.js repository baseline: directory structure, `package.json`, CLI entry point with doctor command, and first tests.

### Scope
- No schemas. No agents. No workflows. No registries.

### Deliverables
- `package.json` (ESM, Node 20+, zero dependencies)
- `.gitignore`, `.env.example`, `README.md`
- `src/cli/index.js` — CLI entry point
- `src/cli/doctor.js` — doctor command logic
- `tests/cli/doctor.test.js` — 8 unit tests
- Directory scaffolding with `.gitkeep` files

### Acceptance Criteria — All Met
- `npm install` exits 0 ✅
- `node src/cli/index.js doctor` prints project name, node version, cwd, folder checks ✅
- `npm test` runs 8 tests, all pass ✅
- Folder layout matches docs ✅

### Definition of Done — Complete

---

## Phase 2 — Contracts & Schemas

### Objective
Define all public interface contracts as JSON Schema files. This is the source of truth for what agents, tools, workflows, and run results must look like.

### Scope
- JSON Schema files. AJV dependency. Validation script. Contract tests.

### Deliverables
- `contracts/agent.schema.json`
- `contracts/tool.schema.json`
- `contracts/workflow.schema.json`
- `contracts/workflow-result.schema.json`
- `contracts/memory-entry.schema.json`
- `contracts/event-record.schema.json`
- Add `ajv` to `package.json` dependencies
- `src/cli/validate-contracts.js` — schema compilation + sample validation script
- `tests/contracts/schemas.test.js` — contract unit tests

### Acceptance Criteria
- All schema files are valid JSON and parseable by AJV.
- Sample valid data passes each schema.
- Sample invalid data fails each schema with descriptive errors.
- `npm run validate-contracts` exits 0.

### Definition of Done
- All 6 schema files exist and pass validation.
- `package.json` is correct and installable.
- `decision-log.md` updated with any schema design choices.
- `phase-progress.md` updated.

### Dependencies
- Phase 0 complete (PRD and decisions provide schema requirements).

---

## Phase 2 — Core Runtime

### Objective
Build the foundational runtime modules: agent registry, tool registry, memory store, event bus, schema validator, and logger.

### Scope
- `src/registry/agent-registry.js`
- `src/registry/tool-registry.js`
- `src/memory/memory-store.js`
- `src/events/event-bus.js`
- `src/validation/schema-validator.js`
- `src/utils/id.js`
- `src/utils/logger.js`
- Unit tests for all modules

### Deliverables
- All 7 source modules.
- Unit tests covering each module at ≥80% coverage.

### Acceptance Criteria
- `AgentRegistry`: `register(def)`, `resolve(id)`, `list()` work correctly; duplicate registration throws.
- `ToolRegistry`: same interface as agent registry.
- `MemoryStore`: `get`, `set`, `delete`, `list`, `createScope(runId)` work; scopes are isolated.
- `EventBus`: `emit(event)`, `on(type, handler)`, `off(type, handler)` work; typed events only.
- `SchemaValidator`: validates against a loaded schema; returns structured errors; throws on unknown `$ref`.
- `logger`: outputs structured JSON lines to stdout; `log`, `warn`, `error` levels.
- `id`: `generateRunId()` returns a UUID v4 string.

### Definition of Done
- All modules implemented.
- All unit tests pass with `node --test`.
- Coverage ≥80% for all modules.
- `phase-progress.md` updated.

### Dependencies
- Phase 1 complete (schema files must exist for validator to load).

---

## Phase 3 — Workflow Runner

### Objective
Build the sequential workflow executor that chains steps, resolves agents and tools, maps outputs, and produces a `WorkflowRunResult`.

### Scope
- `src/runner/workflow-runner.js`
- `src/runner/step-executor.js`
- Unit tests for both modules
- Integration test: full workflow run with mock agent and tool

### Deliverables
- `workflow-runner.js`: loads workflow definition, validates it, executes steps in order.
- `step-executor.js`: resolves agent, resolves tools, validates input, calls `agent.run()`, validates output, emits events.
- Integration test confirming end-to-end step chaining.

### Acceptance Criteria
- Sequential steps execute in declared order.
- Output from step N is available to step N+1 via `outputKey`.
- Step failure halts the workflow; result status is `failed`.
- Empty steps array produces a `success` result with empty steps array.
- All events are emitted: `workflow.started`, `step.started`, `step.completed`, `step.failed`, `workflow.completed`.
- `WorkflowRunResult` conforms to `contracts/workflow-result.schema.json`.

### Definition of Done
- Runner and executor implemented.
- All unit and integration tests pass.
- Coverage ≥80%.
- `phase-progress.md` updated.

### Dependencies
- Phase 2 complete (registry, memory, event bus, validator must exist).

---

## Phase 4 — CLI Entry Point

### Objective
Build the minimal CLI entry point that accepts a workflow file path and executes the workflow.

### Scope
- `src/index.js`
- Update `package.json` with `"main"` and `"scripts"` fields.
- Integration test: CLI invocation via `node src/index.js`.

### Deliverables
- `src/index.js`: parses `--workflow <path>` argument, loads workflow, runs it, prints result, exits.
- Structured error output to stderr on failure (exit code 1).
- Structured success output to stdout (exit code 0).

### Acceptance Criteria
- `node src/index.js --workflow workflows/echo-workflow.json` executes without error (once echo workflow exists).
- Missing `--workflow` flag prints usage to stderr and exits 1.
- Workflow file not found prints error to stderr and exits 1.
- Workflow run failure prints result to stderr and exits 1.
- Workflow run success prints result to stdout and exits 0.

### Definition of Done
- `src/index.js` implemented.
- Integration test passes.
- `phase-progress.md` updated.

### Dependencies
- Phase 3 complete (workflow runner must exist).

---

## Phase 5 — Echo Agent & Tool

### Objective
Create a reference agent and tool implementation that can be used for end-to-end testing and as a template for real implementations.

### Scope
- `agents/echo-agent/index.js` — passes input through as output unchanged.
- `agents/echo-agent/definition.json`
- `tools/echo-tool/index.js` — appends a timestamp to its input message.
- `tools/echo-tool/definition.json`
- `workflows/echo-workflow.json` — uses echo agent + echo tool in a two-step workflow.
- Integration test: full end-to-end run of echo workflow.

### Acceptance Criteria
- `node src/index.js --workflow workflows/echo-workflow.json` completes with status `success`.
- Echo agent output matches input.
- Echo tool appends timestamp correctly.
- Integration test passes with real agent and tool (no mocks).
- All definitions conform to their JSON Schemas.

### Definition of Done
- All echo implementations created.
- End-to-end integration test passes.
- README documents how to run the echo workflow.
- `phase-progress.md` updated.

### Dependencies
- Phase 4 complete (CLI must exist).

---

## Phase 6 — Hardening

### Objective
Complete edge case handling, improve error messages, reach ≥80% test coverage across the project, and finalize the README.

### Scope
- Edge cases from PRD Section 9.
- Error message improvements.
- Missing test coverage.
- README.md completion.
- Final `decisions.md` and `known-issues.md` review.

### Deliverables
- All edge cases from PRD handled and tested.
- `README.md` with: project overview, prerequisites, installation, running the echo workflow, how to write an agent, how to write a tool, how to define a workflow.
- Test coverage report showing ≥80%.

### Acceptance Criteria
- All items in PRD testing checklist pass.
- All items in PRD build/deployment checklist pass.
- No known critical or high issues in `known-issues.md`.
- README is complete and accurate.

### Definition of Done
- All acceptance criteria met.
- `known-issues.md` reviewed and updated.
- `decision-log.md` reviewed and finalized.
- `phase-progress.md` shows all phases complete.

### Dependencies
- Phase 5 complete.

---

## Phase Dependencies Graph

```
Phase 0 (Docs)
  └─> Phase 1 (Repo Skeleton)
        └─> Phase 2 (Contracts & Schemas)
              └─> Phase 3 (Core Runtime)
                    └─> Phase 4 (Workflow Runner)
                          └─> Phase 5 (Echo Agent & Tool)
                                └─> Phase 6 (Hardening)
```

All phases are sequential. No parallel execution.
