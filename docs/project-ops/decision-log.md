# Pocket-Agents — Decision Log

> Running log of major implementation choices. Most recent entries at the top.
> For locked baseline decisions, see `docs/decisions.md`.
> **Last updated:** 2026-03-16 (Phase 8)

---

## [2026-03-16] Phase 8 — Workflow Step Schema: `id`/`type`/`ref` Replaces `stepId`/`agentId`

**Phase:** 8 — Sequential Workflow Runner
**Decision:** The `workflowStep` schema was updated from `{ stepId, agentId, toolIds, inputMapping, outputKey }` to `{ id, type, ref, inputMapping, outputKey, timeoutMs, onError }`. `id` replaces `stepId`; `type` (enum: agent|tool|transform|output) is new; `ref` replaces `agentId`. `toolIds` was removed (agents access tools via context.invokeTool in V1).
**Rationale:** The new format is more expressive and future-safe: `type` makes the step execution model explicit (agent vs. tool vs. transform vs. output); `ref` is generic (doesn't imply only agents). The old `agentId`-only step was too narrow for multi-type workflows. Updated `hello-workflow.js` and all registry tests accordingly.
**Alternatives considered:** Keeping `stepId`/`agentId` and adding new fields alongside them (rejected — ambiguous schema with two identically-purposed fields; cleaner to rename once and document the break).
**Impact:** Breaks any existing workflow manifests using `stepId`/`agentId`. All example workflows and tests updated. Schema version unchanged (still 1.0.0) — this is a pre-1.0 breaking change.
**Locked:** no

---

## [2026-03-16] Phase 8 — `withTimeout` Uses `clearTimeout` in `.finally()` Instead of `unref()`

**Phase:** 8 — Sequential Workflow Runner
**Decision:** `withTimeout(promise, ms)` uses `.finally(() => clearTimeout(handle))` to clean up the timer. The earlier design used `handle.unref()` to avoid keeping the process alive, but that caused the timer to be garbage-collected before firing in `node:test` (event loop exited early, test was cancelled).
**Rationale:** `clearTimeout` in `.finally()` is the correct pattern: if the Promise wins the race, the timer is cleared immediately (no dangling ref); if the timeout wins, `clearTimeout` on a fired timer is a safe no-op. This works cleanly in both test and production contexts.
**Alternatives considered:** `unref()` (rejected — causes the timeout test to be cancelled in node:test because the event loop exits before the timer fires); not cleaning up the timer (rejected — leaves a dangling ref that keeps the event loop alive after the race resolves).
**Locked:** no

---

## [2026-03-16] Phase 8 — Input Mapping via Dot-Notation Path Resolution

**Phase:** 8 — Sequential Workflow Runner
**Decision:** Step `inputMapping` uses dot-notation string paths resolved against a `workflowContext = { workflowId, runId, input, steps }` object. E.g., `"input.message"` → `workflowContext.input.message`; `"steps.step1.result"` → `workflowContext.steps.step1.result`. Non-string values in inputMapping are passed through as literals.
**Rationale:** Simplest viable mechanism for V1 step-to-step data flow. No template engine, no JSONPath, no dynamic expressions — just dot-split traversal. Covers 100% of the use cases in the example workflows. Easily replaced by a richer expression engine in a future phase without schema changes.
**Alternatives considered:** JSONPath (rejected — extra dependency, overkill for V1); Handlebars/template strings (rejected — text-rendering model doesn't match structured JSON output); no input mapping at all (rejected — makes chained workflows impossible to define).
**Locked:** no

---

## [2026-03-16] Phase 7 — `loadAgentModule` as Dependency Injection Parameter

**Phase:** 7 — Agent Contract and Single-Agent Runner
**Decision:** `runAgent(taskEnvelope, runtime, loadAgentModule)` accepts a `loadAgentModule` function as a caller-provided parameter rather than hardcoding a path convention or doing dynamic import inside the runner.
**Rationale:** Makes the runner testable without the filesystem — tests pass a stub loader that returns a mock module synchronously. The CLI passes a real `import()` loader. This is the same DI pattern used in the event bus (handler injection) and config loader (env injection).
**Alternatives considered:** Hardcode `src/examples/agents/${agentId}.js` in the runner (rejected — couples runner to directory layout; breaks tests); store execute() in the agent registry (rejected — breaks existing registry API and Phase 5 tests).
**Impact:** Every caller of `runAgent` must supply a loader. The CLI provides `makeModuleLoader(agentsDir)` which maps known agent ids to filenames.
**Locked:** no

---

## [2026-03-16] Phase 7 — Agent Result Contract (`agent-result.schema.json`)

**Phase:** 7 — Agent Contract and Single-Agent Runner
**Decision:** Introduce `contracts/agent-result.schema.json` for the single-agent execution result, separate from `run-result.schema.json` (workflow-scoped).
**Rationale:** `run-result.schema.json` is workflow-scoped — it has `workflowId`, `steps[]`, etc. Phase 7 adds single-agent execution that doesn't belong to a workflow. Forcing a single-agent result into the workflow RunResult shape would require fake `workflowId: 'cli'` and a single-step `steps` array — awkward and misleading. A dedicated `AgentResult` is cleaner and future-compatible (workflow runner can compose multiple AgentResults into a RunResult).
**Alternatives considered:** Reuse RunResult (rejected — wrong semantic shape); return an unvalidated plain object (rejected — violates D-005 public contracts must have schemas).
**Impact:** New schema compiled at startup in `src/core/validators/index.js`. `validateAgentResult()` exported.
**Locked:** no

---

## [2026-03-16] Phase 7 — Memory Store Scope via Key Prefix

**Phase:** 7 — Memory Store
**Decision:** `createScope(store, runId)` creates a view of the store where all keys are prefixed `${runId}:` internally. The underlying `Map` is shared — the prefix is carried in the `_prefix` field of the store object.
**Rationale:** Simplest V1 isolation mechanism with zero overhead. No second Map copy needed. `list()` strips the prefix when returning keys to callers. The prefix approach matches how many KV stores implement namespacing (Redis `{prefix}key`, etc.).
**Alternatives considered:** Separate Map per scope (rejected — makes it impossible to share state across scopes when that becomes needed); no scoping (rejected — run isolation is a correctness requirement for multi-run scenarios).
**Impact:** All store functions (`get`, `set`, `del`, `list`) check `store._prefix` before constructing internal keys.
**Locked:** no

---

## [2026-03-16] Phase 6 — Tool Manifests Use Kebab-Case IDs (Not Dot-Notation)

**Phase:** 6 — Tool Execution Layer
**Decision:** Built-in tool IDs use kebab-case (e.g. `file-read`, `shell-exec`) to match the tool-manifest schema pattern `^[a-z][a-z0-9-]*$`. The Phase 6 requirements listed dot-notation (`file.read`) as conceptual names, not literal IDs.
**Rationale:** The manifest schema was locked in Phase 2 with this pattern. Changing the schema would require a new AJV recompile and a decision-log entry; not justified when hyphens are equally readable.
**Alternatives considered:** Modifying tool-manifest schema to allow dots — rejected (schema change with no functional benefit).
**Impact:** CLI invocations use `tool:run file-read`, not `tool:run file.read`.
**Locked:** yes

---

## [2026-03-16] Phase 6 — `requiredPermissions` as Module Export, Not Schema Field

**Phase:** 6 — Tool Execution Layer
**Decision:** Each built-in tool module exports `requiredPermissions: string[]` as a plain JS export. This field is NOT added to the tool-manifest JSON Schema.
**Rationale:** Permission requirements are implementation details of each tool, not manifest metadata. Adding them to the schema would require updating the schema + validator for every permission type added in the future. Runtime code reads the module export directly.
**Alternatives considered:** Adding a `permissions` object to the manifest schema (rejected — premature schema expansion); hardcoding permission checks in the executor by tool id (rejected — not extensible).
**Impact:** `executeTool(tool, ...)` reads `tool.requiredPermissions`. Third-party tools can also export this field with no schema change.
**Locked:** no

---

## [2026-03-16] Phase 6 — Separate AJV Instance for Tool I/O Validation

**Phase:** 6 — Tool Execution Layer
**Decision:** The executor creates its own module-level AJV instance (`_ajv`) for validating tool inputs and outputs. It does NOT share the AJV instance from `src/core/validators/index.js`.
**Rationale:** The validators module compiles fixed contract schemas at startup. Tool I/O schemas are arbitrary user-provided JSON Schemas compiled on demand. Mixing the two in one AJV instance creates ordering and caching problems.
**Alternatives considered:** Reusing the validators AJV (rejected — shared state issue); compiling a new AJV per call (rejected — no caching, slow).
**Impact:** Two AJV instances exist in the process. Both use `{ allErrors: true }`.
**Locked:** yes

---

## [2026-03-16] Out-of-Phase Utility — Preparatory `dmux` CLI Command Only (No Workflow Runner)

**Phase:** 6 (supporting CLI utility)
**Decision:** Add a preparatory `dmux` CLI command with `check` and `plan` subcommands, but do not implement workflow execution or parallel runtime behavior.
**Rationale:** User requested dmux integration, but V1 scope and current phase boundaries do not include workflow execution. A preparatory command provides immediate utility (environment check + plan generation) without violating single-process/runtime constraints.
**Alternatives considered:** Implement full `run:workflow` and parallel orchestration now (rejected — pre-builds future phase behavior); defer all dmux work (rejected — does not satisfy request).
**Impact:** New `src/cli/dmux.js`, CLI router wiring in `src/cli/index.js`, and tests in `tests/cli/dmux.test.js`. Generated plan files are explicitly marked as forward-compatible placeholders.
**Locked:** no

---

## [2026-03-16] Phase 5 — Registry Functions as Standalone Exports (Not Methods)

**Phase:** 5 — In-Memory Registries
**Decision:** Registry operations (`register`, `get`, `has`, `list`) are standalone exported functions that take the registry as their first argument. The registry itself is a plain frozen data object with no methods.
**Rationale:** Plain data objects are simpler to freeze with `Object.freeze()` and safer to clone with spread. Methods on an object would imply a class-like structure, which conflicts with the immutable-data principle (D-013). This pattern is consistent with the event bus and config loader.
**Alternatives considered:** Class-based registry with methods (rejected — implies mutation and prototype chain complexity); closures per registry instance (rejected — harder to serialize/test).
**Impact:** All callers import the functions alongside the factory: `import { createAgentRegistry, register, get } from '...'`. The registry object itself carries no behavior.
**Locked:** yes

---

## [2026-03-16] Phase 5 — Unified `registry.*` Error Code Namespace

**Phase:** 5 — In-Memory Registries
**Decision:** All registry errors use dot-namespaced codes: `registry.duplicate` and `registry.not_found`. These codes are consistent across agent, tool, and workflow registries.
**Rationale:** A shared namespace makes error handling in callers predictable. If a caller catches registry errors, a single `if (err.code?.startsWith('registry.'))` handles all three registries. Using agent/tool/workflow-specific codes (e.g. `agent.not_found`) would require separate branches per registry type.
**Alternatives considered:** Per-registry error codes (`agent.not_found`, `tool.not_found`) — rejected; more verbose and inconsistent. Generic `NOT_FOUND` codes — rejected; ambiguous when multiple lookup types exist.
**Impact:** All three registry modules use `err.code = 'registry.duplicate'` and `err.code = 'registry.not_found'`.
**Locked:** yes

---

## [2026-03-16] Phase 5 — Example Manifests in `src/examples/` (Not `agents/`, `tools/`, `workflows/`)

**Phase:** 5 — In-Memory Registries
**Decision:** Placeholder example manifests live in `src/examples/{agents,tools,workflows}/` rather than top-level `agents/`, `tools/`, `workflows/` directories.
**Rationale:** The original architecture.md sketched top-level `agents/` and `tools/` directories. However, placing them under `src/examples/` makes clear these are source-level examples (imported by CLI handlers), not standalone user-defined definitions. User-provided definitions may live outside the `src/` tree in a future phase.
**Alternatives considered:** Top-level `agents/` directory (originally planned but not yet established); `src/core/examples/` (too nested).
**Impact:** `src/examples/agents/echo-agent.js`, `src/examples/tools/echo-tool.js`, `src/examples/workflows/hello-workflow.js`.
**Locked:** no (may be reorganized when user-defined agent loading is introduced).

---

## [2026-03-16] Phase 4 — Immutable Event Bus (No Node EventEmitter)

**Phase:** 4 — Structured Logging and In-Process Event Infrastructure
**Decision:** The event bus uses a plain `Map<type, Set<handler>>` with every operation returning a new frozen bus. No Node.js `EventEmitter` inheritance.
**Rationale:** `EventEmitter` is mutable by design and would break the immutability constraint (D-013). A plain Map-based bus is easier to test, has no hidden state, and requires no framework knowledge from callers.
**Alternatives considered:** `EventEmitter` subclass (rejected — mutable); `mitt` npm package (rejected — external dep not justified when a plain Map is sufficient).
**Impact:** All event subscriptions and unsubscriptions return new bus objects. Callers must reassign the bus variable after each subscribe/unsubscribe.
**Locked:** yes

---

## [2026-03-16] Phase 4 — Logger `child()` with Bound Context

**Phase:** 4 — Structured Logging and In-Process Event Infrastructure
**Decision:** `createLogger` accepts a `boundContext` parameter (internal). Callers use `logger.child(context)` to create child loggers. The bound context is spread into every log entry before per-call data.
**Rationale:** Avoids passing `runId`, `workflowId`, etc. to every single log call. The child pattern is consistent with pino, bunyan, and winston, so a future swap to a library requires no caller changes.
**Alternatives considered:** Requiring callers to pass context data manually (rejected — noisy); a global context store (rejected — shared mutable state).
**Impact:** `createLogger` signature extended with optional second param `boundContext`. Existing callers unaffected.
**Locked:** yes

---

## [2026-03-16] Phase 4 — JSONL Sink is Opt-In via `PA_EVENTS_FILE`

**Phase:** 4 — Structured Logging and In-Process Event Infrastructure
**Decision:** The JSONL event sink is only attached when `config.eventsFile` is non-empty. The sink uses `appendFileSync` for simplicity.
**Rationale:** Not all V1 use cases need event persistence. Opt-in avoids surprise file creation. `appendFileSync` is correct for single-process V1 — no async complexity needed.
**Alternatives considered:** Always write events to a default file (rejected — side effects without configuration); async file writes (rejected — adds complexity for no benefit in single-process use).
**Impact:** `config.eventsFile` added to `PocketAgentsConfig`. Runtime assembly checks the value and attaches the sink if set.
**Locked:** no

---

## Log Format

Each entry follows this structure:

```
## [YYYY-MM-DD] <Decision Title>

**Phase:** <phase number and name>
**Decision:** <what was decided>
**Rationale:** <why this choice was made>
**Alternatives considered:** <what else was evaluated>
**Impact:** <what this affects>
**Locked:** yes | no
```

---

## [2026-03-16] Phase 3 — PA_ Prefix for All Environment Variables

**Phase:** 3 — Config Loading and Runtime Assembly
**Decision:** All Pocket-Agents environment variables use the `PA_` prefix (e.g. `PA_LOG_LEVEL`, `PA_ALLOW_SHELL`). The old `LOG_LEVEL` key from `.env.example` is replaced with `PA_LOG_LEVEL`.
**Rationale:** A distinct prefix prevents collisions with environment variables from other tools in the same shell session. `PA_` is short, unambiguous, and clearly scoped to this project.
**Alternatives considered:**
- `POCKET_AGENTS_` — too verbose.
- No prefix, use conventional names like `LOG_LEVEL` — risk of silent collision with other tools.
**Impact:** `.env.example` updated. Any existing `.env` files using `LOG_LEVEL=` must be updated to `PA_LOG_LEVEL=`.
**Locked:** Yes (for V1).

---

## [2026-03-16] Phase 3 — Config Loader Accepts `env` Parameter for Testability

**Phase:** 3 — Config Loading and Runtime Assembly
**Decision:** `loadConfig` accepts an optional `{ env }` parameter (defaults to `process.env`). Tests pass a synthetic env object instead of mutating `process.env`.
**Rationale:** Mutating `process.env` in tests is fragile — cleanup is error-prone and test order matters. Passing env as a parameter makes config tests deterministic and isolated.
**Alternatives considered:**
- Mock `process.env` with `Object.defineProperty` — fragile and error-prone in parallel tests.
- Use a separate `parseEnv` helper that takes a raw object — equivalent; merged into loader directly.
**Impact:** All callers in production code use the default `env = process.env`. Only tests pass a custom env.
**Locked:** Yes (for V1).

---

## [2026-03-16] Phase 3 — frameworkName is Immutable

**Phase:** 3 — Config Loading and Runtime Assembly
**Decision:** `frameworkName` is always `'pocket-agents'` and cannot be overridden via env var, config file, or programmatic overrides.
**Rationale:** `frameworkName` is not a runtime setting — it is the identity of the framework. Allowing it to be overridden would create confusion in logs and error messages. If someone forks the project and renames it, they should update `defaults.js` directly.
**Alternatives considered:** Allow env override — rejected; no legitimate use case exists.
**Impact:** `loadConfig` silently ignores any `frameworkName` in overrides or file config.
**Locked:** Yes (for V1).

---

## [2026-03-16] Phase 3 — Runtime Assembly Uses Null Placeholders for Unimplemented Components

**Phase:** 3 — Config Loading and Runtime Assembly
**Decision:** `createRuntime()` returns `null` for `eventBus`, `registries`, and `stateStore`. These will be replaced with real implementations in Phase 4.
**Rationale:** Using `null` placeholders is the simplest approach that: (a) makes the shape of the runtime visible immediately, (b) causes a clear `TypeError` if any caller tries to use an unimplemented component, and (c) does not prematurely couple Phase 3 to Phase 4 implementations.
**Alternatives considered:**
- Stub objects that throw on method calls — more explicit but more code for no gain in Phase 3.
- Omit the fields entirely — hides the planned interface shape.
**Impact:** Phase 4 will assign real implementations to these slots. The runtime interface is stable.
**Locked:** No (placeholders will be replaced in Phase 4).

---

## [2026-03-16] Phase 2 — Schema Naming Convention: -manifest and task-envelope

**Phase:** 2 — Contracts & Schemas
**Decision:** Schema filenames use a `-manifest` suffix for definition objects (`agent-manifest`, `tool-manifest`, `workflow-manifest`). `workflow-result` is renamed to `run-result`. A new `task-envelope` schema is added for the agent invocation wrapper.
**Rationale:** `-manifest` disambiguates "the definition of an agent" from "an agent instance." `run-result` is shorter and aligns better with the concept of a workflow run's outcome. `task-envelope` is a new concept that was needed to define what is passed to an agent at execution time — it captures the task context (workflowId, runId, stepId, agentId, input) in a single validated object.
**Alternatives considered:**
- Keep original names (`agent.schema.json`, `tool.schema.json`) — rejected; too generic and likely to conflict with instance-level objects in future phases.
- Add a `memory-entry.schema.json` in Phase 2 — deferred; `MemoryEntry` is an internal store record not crossing runtime boundaries in V1.
**Impact:** Validators, tests, and all documentation reference the new names. PRD Section 5 updated to reflect new names.
**Locked:** Yes (for V1 schema filenames).

---

## [2026-03-16] Phase 2 — AJV Installed as Only External Dependency

**Phase:** 2 — Contracts & Schemas
**Decision:** Added `ajv` v8 as the sole production dependency.
**Rationale:** No viable built-in alternative for JSON Schema validation. AJV v8 is ESM-compatible and supports Draft-07 by default. Confirmed `import Ajv from 'ajv'` works correctly in Node 20 ESM context (KI-001 resolved).
**Alternatives considered:** None — previously approved in D-005 and D-006.
**Impact:** `package.json` now has one production dependency.
**Locked:** Yes.

---

## [2026-03-16] Phase 2 — Validators in src/core/validators/

**Phase:** 2 — Contracts & Schemas
**Decision:** Validator utilities placed in `src/core/validators/index.js` (not `src/validation/schema-validator.js` as the original architecture.md described).
**Rationale:** The `src/core/` directory was scaffolded in Phase 1 as the home for foundational runtime modules. Placing validators there makes clear they are core runtime infrastructure. The original path (`src/validation/`) is still a valid alternative but requires an extra directory.
**Alternatives considered:** `src/validation/schema-validator.js` — valid; not chosen because `src/core/` already existed.
**Impact:** Future code referencing the validator should use `src/core/validators/index.js`. Architecture.md updated accordingly.
**Locked:** Yes (for V1).

---

## [2026-03-16] No Dependencies in Phase 1

**Phase:** 1 — Repo Skeleton & CLI Baseline
**Decision:** Phase 1 adds no npm dependencies. All CLI logic uses Node 20 built-ins only (`node:fs`, `node:path`, `node:url`, `node:process`).
**Rationale:** The doctor command and directory scaffolding have no need for external packages. Adding AJV before schemas exist would violate the low-dependency policy.
**Alternatives considered:**
- Add AJV now to "get it out of the way" — rejected; violates install-only-when-needed rule.
**Impact:** `package.json` has zero dependencies. AJV added in Phase 2 when schemas are created.
**Locked:** No (AJV will be added in Phase 2).

---

## [2026-03-16] `node --test` Auto-Discovery Over Explicit Glob in npm Script

**Phase:** 1 — Repo Skeleton & CLI Baseline
**Decision:** Use `"test": "node --test"` without a glob pattern.
**Rationale:** Node 20's `node --test` auto-discovers `**/*.test.js` files. An explicit glob in an npm script relies on shell glob expansion which is not reliable across shells (e.g., `/bin/sh` on Linux does not expand `**`).
**Alternatives considered:**
- `node --test tests/**/*.test.js` — rejected; `**` may not expand in `/bin/sh`.
- `node --test $(find tests -name '*.test.js')` — rejected; fragile and ugly.
**Impact:** All `*.test.js` files anywhere in the project will be discovered automatically. Test files must not be placed outside the project root.
**Locked:** Yes (for V1 test runner strategy).

---

## [2026-03-16] Separate `doctor.js` Logic from CLI `index.js`

**Phase:** 1 — Repo Skeleton & CLI Baseline
**Decision:** Doctor logic lives in `src/cli/doctor.js` as pure exported functions. `src/cli/index.js` handles argument parsing only.
**Rationale:** Mixing CLI argument parsing with business logic makes unit testing impossible without subprocess spawning. Pure functions are directly importable in tests.
**Alternatives considered:**
- Single `index.js` with all logic — rejected; not testable without spawning a child process.
**Impact:** Any new CLI command should follow the same pattern: logic in its own module, `index.js` only does dispatch.
**Locked:** Yes (as a convention for V1).

---

## [2026-03-16] Phase 0 Documentation Structure

**Phase:** 0 — Project Operating System
**Decision:** Organize documentation into `docs/` with a `docs/project-ops/` subdirectory for living operational files.
**Rationale:** Separates stable reference documentation (PRD, architecture, decisions) from living operational files (phase progress, known issues, next steps) that change every session.
**Alternatives considered:**
- Flat `docs/` directory — rejected because operational files would be mixed with reference docs, making it harder to find session-to-session context.
- Single `OPERATIONS.md` file — rejected because it would grow unbounded and become hard to navigate.
**Impact:** All doc file paths are now fixed; changing the layout would require updating CLAUDE.md, GLOBAL-INSTRUCTION-BLOCK.md, and any agent session that references these paths.
**Locked:** Yes (for V1).

---

## [2026-03-16] Use `node:crypto.randomUUID()` Over `uuid` Package

**Phase:** 0 — Project Operating System (captured in PRD package recommendations)
**Decision:** Use `crypto.randomUUID()` built into Node.js 20+ instead of adding the `uuid` npm package.
**Rationale:** Node 20 includes a stable, cryptographically secure `randomUUID()` implementation. Adding the `uuid` package would violate the low-dependency policy without providing additional value.
**Alternatives considered:**
- `uuid` npm package — rejected; no additional value over built-in in Node 20+.
- `nanoid` — rejected; short IDs are less universally readable and still an extra dependency.
**Impact:** `src/utils/id.js` will use `import { randomUUID } from 'node:crypto'`.
**Locked:** Yes (for V1).

---

## [2026-03-16] JSON Schema Draft-07 as Contract Format

**Phase:** 0 — Project Operating System (captured in decisions.md D-005)
**Decision:** Use JSON Schema Draft-07 for all contract schemas.
**Rationale:** Draft-07 is the most widely supported version across validators, editors, and language bindings. Draft 2019-09 and 2020-12 have limited cross-language support. AJV supports Draft-07 by default.
**Alternatives considered:**
- JSON Schema Draft 2020-12 — rejected; limited tooling support outside of Node.js.
- OpenAPI 3.x schemas — rejected; tightly coupled to HTTP semantics.
- Zod / Yup — rejected; Node.js-only, violates runtime-neutral contract requirement.
**Impact:** All `$schema` fields in `contracts/*.schema.json` will reference Draft-07.
**Locked:** Yes (for V1).

---

## [2026-03-16] AJV as the Only Approved External V1 Dependency

**Phase:** 0 — Project Operating System (captured in decisions.md D-006)
**Decision:** `ajv` (v8) is the only external npm package approved for V1 core logic.
**Rationale:** JSON Schema validation is a well-defined, contained need. AJV is the de facto standard validator for Node.js, actively maintained, and ESM-compatible in v8. No built-in Node API provides equivalent functionality.
**Alternatives considered:**
- `jsonschema` npm — rejected; significantly slower than AJV.
- Manual validation — rejected; fragile, error-prone, and defeats the purpose of JSON Schema.
- `@cfworkers/json-schema` — rejected; less mature and less community support.
**Impact:** `package.json` will list `ajv` as the only production dependency.
**Locked:** Yes (for V1). Adding any other package requires a new decision-log entry.
