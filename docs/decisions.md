# Pocket-Agents — Locked Baseline Decisions

> These decisions are **locked** for V1. Changing any of them requires a new entry in `docs/project-ops/decision-log.md` with rationale and impact analysis.
> **Last updated:** 2026-03-16

---

## Decision Index

| # | Decision | Status |
|---|---|---|
| D-001 | Node.js 20+ as primary runtime | Locked |
| D-002 | ESM JavaScript (no CommonJS) | Locked |
| D-003 | Local-first, single-process V1 | Locked |
| D-004 | Runtime-neutral contracts | Locked |
| D-005 | JSON Schema for public contracts | Locked |
| D-006 | Low dependency policy | Locked |
| D-007 | Node built-in test runner | Locked |
| D-008 | Optional Docker only | Locked |
| D-009 | No cloud/distributed architecture in V1 | Locked |
| D-010 | Future Python support without redesign | Locked |
| D-011 | Future multi-agent scaffolding without enabling it in V1 | Locked |
| D-012 | Contracts live in `/contracts` | Locked |
| D-013 | Immutable data patterns | Locked |
| D-014 | No TypeScript in V1 | Locked |

---

## D-001 — Node.js 20+ as Primary Runtime

**Decision:** Pocket-Agents targets Node.js 20 (LTS) as its minimum supported runtime.

**Rationale:**
- Node 20 is LTS and includes stable `node:test`, `crypto.randomUUID()`, and full ESM support.
- Avoids polyfills for built-in APIs.
- Aligns with long-term LTS support window.

**Constraints:**
- No `require()`. No `__dirname`. No CommonJS patterns.
- Uses `import.meta.url` for file path resolution.

**Impact if changed:** All file resolution patterns and import syntax must be revisited.

---

## D-002 — ESM JavaScript (No CommonJS)

**Decision:** All source files use ES Modules (`import`/`export`). `package.json` has `"type": "module"`.

**Rationale:**
- ESM is the standard going forward; CJS interop is a maintenance burden.
- Enables static analysis and future tree-shaking.
- Consistent with modern Node.js practices.

**Constraints:**
- Cannot use `require()` anywhere in `src/`.
- Dynamic imports (`await import()`) are allowed for plugin loading.
- File extensions required in imports: `import './foo.js'` not `import './foo'`.

**Impact if changed:** Significant rewrite of all import statements.

---

## D-003 — Local-First, Single-Process V1

**Decision:** V1 runs entirely within a single Node.js process on the developer's machine. No servers, no daemons, no subprocesses.

**Rationale:**
- Minimizes operational complexity.
- Enables rapid development and testing.
- Clear migration path to multi-process by replacing registry and event bus seams.

**Constraints:**
- No `http`, `net`, or `child_process` usage in V1 core.
- No persistent background workers.
- No IPC.

**Impact if changed:** Requires introduction of process management and IPC layer.

---

## D-004 — Runtime-Neutral Contracts

**Decision:** All public contracts (agent, tool, workflow) are defined in JSON Schema and contain no Node.js-specific types or patterns.

**Rationale:**
- Enables Python agents and other runtimes to implement the same contract.
- JSON Schema is supported across all major languages.
- Prevents accidental tight coupling to Node.js internals.

**Constraints:**
- No `Buffer`, `EventEmitter`, or Node-specific types in schema definitions.
- All values crossing contract boundaries must be JSON-serializable.

**Impact if changed:** Any language-specific types in contracts break Python interop.

---

## D-005 — JSON Schema for Public Contracts

**Decision:** Every public interface has a JSON Schema definition in `contracts/`. AJV (v8) is the validator.

**Rationale:**
- JSON Schema is the lingua franca for data validation across languages and tooling.
- AJV is the fastest, most complete JavaScript JSON Schema validator.
- Schemas serve as living documentation.

**Constraints:**
- Draft-07 syntax for maximum tooling compatibility.
- No external URL `$ref` references — all refs must resolve within `contracts/`.
- AJV is the only external dependency specifically justified in V1.

**Impact if changed:** All contract validation must be rewritten.

---

## D-006 — Low Dependency Policy

**Decision:** External npm packages are added only when the built-in Node.js API is clearly insufficient. Each package requires explicit justification in the decision log.

**Rationale:**
- Reduces supply chain risk.
- Reduces upgrade burden.
- Forces use of well-understood, stable code.

**Approved V1 packages:**
- `ajv` — JSON Schema validation (no viable built-in alternative)

**Rejected:**
- `jest`, `mocha`, `vitest` — Node built-in test runner is sufficient for V1.
- `pino`, `winston` — custom structured logger covers V1 needs.
- `express`, `fastify` — no HTTP server in V1.
- `dotenv` — no environment config beyond `process.env` in V1.

**Impact if changed:** Each added package must be re-evaluated for security and maintenance status.

---

## D-007 — Node Built-In Test Runner

**Decision:** Tests use `node:test` and `node:assert` exclusively. No Jest, Mocha, or Vitest.

**Rationale:**
- `node:test` is stable as of Node 18 and full-featured in Node 20.
- Zero configuration; no additional dependencies.
- Output is compatible with TAP and standard CI systems.

**Constraints:**
- Run tests with: `node --test test/**/*.test.js`
- No test framework-specific matchers or plugins.

**Impact if changed:** Test files must be rewritten for the new runner's API.

---

## D-008 — Optional Docker Only

**Decision:** Docker is optional and not required for development or testing in V1. A `Dockerfile` may be provided as a convenience but is not part of the core workflow.

**Rationale:**
- V1 is local-first. A Node.js install is the only requirement.
- Docker adds friction for local development.
- Future deployment scenarios may use containers, but V1 does not.

**Constraints:**
- No Docker-specific assumptions in source code.
- If a `Dockerfile` is added, it must be a thin wrapper around `node src/index.js`.

**Impact if changed:** No core code changes needed; deployment documentation update only.

---

## D-009 — No Cloud / Distributed Architecture in V1

**Decision:** V1 contains no cloud provider SDKs, no remote API calls from core logic, no message queues, no service discovery, and no distributed state.

**Rationale:**
- Operational simplicity is a primary goal.
- Cloud architecture adds latency, cost, and operational overhead not needed in V1.
- Architecture seams allow cloud integration without rewriting core in a future phase.

**Constraints:**
- `src/` must not import any AWS, GCP, Azure, or third-party cloud SDK.
- No HTTP client usage in core runner logic.
- No environment-specific configuration beyond file paths.

**Impact if changed:** Security review required; credential management strategy needed.

---

## D-010 — Future Python Support Without Redesign

**Decision:** The architecture must allow Python agents to be added in a future phase without redesigning core contracts or the workflow runner.

**Rationale:**
- Python is the dominant AI/ML language; many useful agent implementations exist in Python.
- Designing for it now prevents a costly rewrite later.

**Implementation path (deferred):**
- `PythonAgentAdapter` class in `src/registry/` wraps a Python subprocess.
- Communication over stdin/stdout using JSON-RPC.
- The adapter implements the same `AgentContract` interface as Node agents.
- `WorkflowRunner` is unmodified.

**Constraints:**
- No Python-specific code in V1.
- All contract types must be JSON-serializable (no Node.js Buffers or native objects).

**Impact if skipped:** Python support would require contract redesign.

---

## D-011 — Future Multi-Agent Scaffolding Without Enabling It in V1

**Decision:** V1 executes steps sequentially in a single process. The architecture preserves seams for multi-agent coordination but does not implement them.

**Rationale:**
- Multi-agent orchestration adds significant complexity (coordination, failure modes, distributed state).
- V1 scope does not require it.
- Seam-based design allows it to be enabled incrementally.

**Seams preserved:**
1. `AgentRegistry` resolver can be replaced with a remote resolver.
2. `WorkflowDefinition.steps` can be extended with a `parallel` flag.
3. `MemoryStore` interface is replaceable with shared state backends.
4. `EventBus` can be replaced with an external event stream.

**Constraints:**
- No parallel execution in V1.
- No agent-to-agent communication in V1.
- No coordinator or supervisor agent in V1.

**Impact if skipped:** Multi-agent requires full workflow runner rewrite.

---

## D-012 — Contracts Live in `/contracts`

**Decision:** All JSON Schema files for public interfaces live in `Pocket-Agents/contracts/` at the repo root. No schemas are embedded in source files.

**Rationale:**
- Schemas are language-agnostic and should not belong to any runtime module.
- Co-locating schemas enables external tooling (linters, generators, documentation) to consume them.
- Clear separation of interface from implementation.

**Impact if changed:** Validator paths and schema `$ref` resolution must be updated.

---

## D-013 — Immutable Data Patterns

**Decision:** No objects are mutated in-place. All transformations return new objects.

**Rationale:**
- Prevents hidden side effects across agent and tool boundaries.
- Makes debugging easier (state is traceable).
- Enables safe future concurrency.

**Constraints:**
- Use object spread (`{ ...obj, field: newValue }`) or `structuredClone()` for updates.
- `Array.push()` is allowed only for local-scope arrays before they are exported.
- Registry and store operations return new state — they do not modify in-place.

---

## D-014 — No TypeScript in V1

**Decision:** V1 source code is plain JavaScript (ESM). TypeScript is not added in V1.

**Rationale:**
- Adds build step complexity (tsc, tsconfig, declaration files).
- JSON Schema serves as the type contract layer.
- JSDoc comments can provide editor type hints without a compiler.
- TypeScript can be added in a future phase by migrating `.js` to `.ts` with no logic changes.

**Constraints:**
- JSDoc `@param` and `@returns` annotations are encouraged for public functions.
- No `.ts` files in V1.

**Impact if changed:** Build pipeline required; all files need type annotations.
