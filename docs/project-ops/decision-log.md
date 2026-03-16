# Pocket-Agents — Decision Log

> Running log of major implementation choices. Most recent entries at the top.
> For locked baseline decisions, see `docs/decisions.md`.
> **Last updated:** 2026-03-16 (Phase 1)

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
