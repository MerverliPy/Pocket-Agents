# Pocket-Agents — Agent Rules

> Rules the coding agent must follow during every session and at session close.
> **Last updated:** 2026-03-16

---

## During Every Session

### Before Writing Code

1. Read `GLOBAL-INSTRUCTION-BLOCK.md` in full.
2. Read `CLAUDE.md` in full.
3. Read `docs/project-ops/phase-progress.md` to confirm which phase is active.
4. Read `docs/project-ops/next-step-recommendations.md` to understand what the last session intended.
5. Read `docs/project-ops/known-issues.md` to be aware of active blockers.
6. Read `docs/decisions.md` to confirm what is locked before making any implementation choice.

### During Implementation

- Build only the current phase. Do not start the next phase.
- Do not add packages without adding a corresponding entry to `docs/project-ops/decision-log.md`.
- Do not mutate objects. Return new copies.
- Write tests before or alongside implementation (TDD where feasible).
- Keep files under 800 lines; target 200–400 lines.
- Validate schema-crossing data at every boundary.
- Emit events for every significant lifecycle action.
- Log errors with structured context, not bare strings.

---

## Mandatory Session-Close Procedure

After every completed implementation session, the agent **must** perform all of the following updates before responding to the user with a summary.

### 1. Update `agent-rules.md`

Add any new bug patterns, gotchas, or implementation lessons discovered this session under the **Lessons Learned** section below. Format:

```
### [YYYY-MM-DD] <short title>
<What went wrong or what was learned>
<How to avoid it in future sessions>
```

### 2. Update `known-issues.md`

- Mark any resolved issues as `✅ Resolved` with the resolution date.
- Add any new issues discovered this session with severity and notes.

### 3. Update `phase-progress.md`

- Mark completed deliverables with `✅ Done` and the completion date.
- Update the current phase status field.
- Add any partial progress notes.

### 4. Update `next-step-recommendations.md`

- Clear or archive the previous session's recommendations.
- Write specific, actionable recommendations for the next session.
- Include which phase to work on, which files to create or edit, and any risks to be aware of.

### 5. Update `decision-log.md`

- After any major implementation choice (package addition, schema design decision, architecture choice), add a timestamped entry.
- Format: date, decision, rationale, alternatives considered.

---

## Scope Discipline Rules

- **Never** silently expand scope beyond the current phase.
- **Never** replace a simple solution with an abstract framework unless the second use case exists.
- **Never** add a package without a decision-log entry.
- **Never** change a locked decision in `docs/decisions.md` without updating that file and adding a decision-log entry.
- **Never** skip the session-close procedure, even if the session was short.

---

## Lessons Learned

> New lessons are added here by the agent at the end of each session.

### [2026-03-16] Phase 6 — Tool Execution Layer

Key lessons from implementing the tool execution layer and built-in tools:

- The executor's `_validatorCache` (module-level Map) is an intentional exception to the immutability rule. Document it clearly so future reviewers don't remove it or flag it as a bug.
- Do NOT reuse the AJV instance from `src/core/validators/index.js` for tool I/O validation. That instance compiles fixed schemas at startup. Tool I/O schemas are arbitrary user-provided schemas compiled at call time — they require a separate AJV instance.
- Built-in tool modules export `{ manifest, requiredPermissions, run }`. The `requiredPermissions` field is NOT part of the JSON Schema manifest — it is a runtime-only module export that the executor reads. Do not add it to the tool-manifest schema.
- The `run()` function on built-in tools is called with `(input, context)`. Most tools ignore `context`, but shell-exec uses `context.config.defaultCommandTimeoutMs`. Always pass context for forward compatibility.
- In ESM top-level module scripts, async CLI handlers (like `tool:run`) must use `await` at the top level rather than `.then()`. Without `await`, the synchronous code continues after the async if-block and hits the "Unknown command" fallthrough. ESM modules support top-level `await` in Node 18+.
- `spawnSync` is correct for V1 shell execution: it does not throw on non-zero exit codes, returning them in `result.status` instead. `execSync` would throw on failure, making it harder to return `{ exitCode }` for callers to handle.
- Tool IDs must match the `^[a-z][a-z0-9-]*$` pattern from the tool-manifest schema. Use hyphens (e.g. `file-read`, `shell-exec`), not dots (e.g. `file.read`). Dots are not in the schema's pattern.

### [2026-03-16] dmux Preparatory CLI — Respect Phase Boundaries with Forward-Compatible Utilities

When a user requests a capability that depends on a future phase (for example, parallel orchestration before a workflow runner exists), implement a thin preparatory utility rather than silently advancing scope. In this session, `dmux` support was delivered as `check` + `plan` commands only, with explicit placeholders for the future `run:workflow` command.

How to apply this pattern in future sessions:
- Deliver immediate user value with boundary-safe tooling (validation, planning, scaffolding).
- Keep command templates explicit about deferred dependencies.
- Record the scope decision in `decision-log.md` so later sessions can finish integration cleanly.

### [2026-03-16] Phase 0 — Documentation-First Baseline

Phase 0 establishes that all documentation must precede runtime code. Key lessons:

- The PRD must be V1-only and explicitly call out deferred items — otherwise scope creep is invisible.
- `decisions.md` must capture *why* each decision was made, not just what it was, so future sessions can judge edge cases rather than blindly following rules.
- `phase-plan.md` must include acceptance criteria per phase so completion is unambiguous.
- Agent rules must explicitly require the session-close procedure — without it, project ops files drift out of sync quickly.
- All JSON Schema `$ref` references must resolve within the `contracts/` directory. External URL refs will fail in offline environments and break determinism.

### [2026-03-16] Phase 5 — In-Memory Registries

Key lessons from implementing agent, tool, and workflow registries:

- Registry functions (`register`, `get`, `has`, `list`) are standalone exports, not methods on the registry object. This keeps the registry as a plain frozen data object (no prototype), which is simpler to freeze and clone.
- Use `new Map([...registry.entries, [id, manifest]])` to create a new Map without mutating. Never call `entries.set()` on the existing Map — it mutates shared state and breaks immutability.
- Error `code` values should use dot-namespaced lowercase strings: `'registry.duplicate'` and `'registry.not_found'`. Using a consistent namespace prefix makes error handling in callers predictable.
- Attach AJV `errors` array to the thrown Error when schema validation fails: `err.errors = errors`. This allows callers (and tests) to inspect individual field errors without re-running validation.
- The `list()` function must return a **new** sorted array via `[...entries.keys()].sort()`. Do not sort in-place on a `.keys()` iterator — spread first, then sort.
- Example manifests in `src/examples/` should be plain frozen JS objects exported as `manifest`. They are not executable — they serve as registry-ready definitions only. Document this clearly in the file header.
- The CLI list handlers (`list-agents.js`, etc.) follow the same pattern as earlier handlers: pure logic exported as `runListX()`, returning `{ output: string }`. The CLI entry point (`index.js`) only dispatches.
- `runtime.registries` is now a real frozen object `{ agents, tools, workflows }` — update the runtime test to check for this shape, not `null`.
- The `stateStore` field remains `null` — do not confuse it with `registries`. Keep placeholders where they are until the relevant phase.

### [2026-03-16] Phase 4 — Structured Logging and Event Infrastructure

Key lessons from implementing the structured logger upgrade, event bus, and JSONL sink:

- The `child(context)` pattern for loggers requires passing `boundContext` as a second parameter to `createLogger`. Keep it internal (`boundContext`) so external callers only ever call `.child()` — the second param is not part of the public API.
- When implementing an immutable event bus with `Map`, always use `new Map([...bus.handlers, [key, newSet]])` to clone. Never use `map.set()` on the existing handlers map — that mutates shared state.
- `subscribe` returns `{ bus, unsubscribe }` where `unsubscribe` is a function that takes the *current* bus at unsubscription time (not the bus at subscription time). This is important because the bus may have been updated (more subscriptions added) between subscribe and unsubscribe.
- Use a `Set` for handlers per type so that subscribing the same handler twice is idempotent. This makes duplicate-subscription bugs silent rather than calling the handler twice.
- `appendFileSync` is correct for single-process V1 JSONL event sinks. Do not introduce async file writing until multi-process use is required.
- `readEvents` must filter empty lines after `split('\n')`. `appendFileSync` always writes a trailing `\n`, so the last split element is always an empty string. `.filter(line => line.trim() !== '')` is the correct guard.
- When wiring the JSONL sink into runtime assembly, check `config.eventsFile` truthiness. An empty string (`''`) is the default — do not pass an empty string as a file path to `createJsonlSink`.
- The `events:tail` command should return a structured `{ output, count, error? }` object, not write to stdout directly. This makes the function testable without subprocess spawning.

### [2026-03-16] Phase 3 — Config Loading and Runtime Assembly

Key lessons from building the config system and runtime assembly layer:

- Accept an `env` parameter in the config loader (default: `process.env`) so tests can pass a synthetic env without mutating `process.env`. This pattern is essential for deterministic config tests.
- `firstPresent(values, fallback)` helper is cleaner than chained `??` operators when values can be empty strings (which `??` does not catch). Treat `undefined`, `null`, and `''` as all absent.
- `frameworkName` should be hardcoded in defaults and not overridable via env or file. Document this clearly in both code and PRD so future developers do not add an env var for it.
- `dataDir` is a "derived" config key — its default is computed from `workspaceRoot`, not a static string. Handle derived keys last in the loader, after all other keys are resolved.
- Always `Object.freeze()` the returned config and runtime objects. Immutability bugs are easy to introduce if callers can accidentally mutate shared state.
- For boolean env var parsing, define explicit allowed truthy strings (`1`, `true`, `yes`). Do not use JavaScript truthiness on raw string values — any non-empty string is truthy in JS, including `'false'`.
- For number env var parsing, use `parseInt(raw, 10)` and check `Number.isFinite(n) && n > 0`. A value of `0` or negative should fall back to the default rather than silently enabling a zero-timeout.
- `config:show` must redact secret-like keys by name pattern. Even if current config has no secrets, implement the redaction mechanism now so that any future addition of a secret-like key is automatically safe.
- Keep `LOG_LEVELS` as an ordered array (`['error', 'warn', 'info', 'debug']`) so that level comparison (`indexOf`) works correctly for suppression filtering in the logger.
- The `before`/`after` hooks in `node:test` are called at the `describe` block level, not globally. Temp directories for file config tests should be created in a `before` hook and removed in an `after` hook scoped to the describe block.

### [2026-03-16] Phase 2 — Contracts & Schema Validation

Key lessons from implementing JSON Schema contracts and AJV validators:

- `import Ajv from 'ajv'` works correctly in Node 20 ESM with `"type": "module"`. The fallback `import { default as Ajv } from 'ajv'` is not needed.
- AJV should be instantiated with `{ allErrors: true }` so all validation errors are reported at once — not just the first one. This is critical for useful error messages.
- Compile all schemas at module load time (not lazily). This surfaces missing files and schema errors immediately at startup, not mid-run.
- Use `$defs` (not `definitions`) in Draft-07 schemas. Both work in AJV v8, but `$defs` is the Draft-2019 forward-compatible name and is cleaner.
- `"additionalProperties": false` must be on every top-level object schema to prevent unknown fields from silently passing validation.
- Schema `$id` values do not need to be resolvable URLs. Using the filename (e.g. `"$id": "agent-manifest.schema.json"`) is clean and unambiguous.
- `"type": ["string", "null"]` is the correct Draft-07 pattern for nullable strings. Do not use `oneOf` for this case.
- When a field accepts any JSON value (e.g. `input`, `output`, `finalOutput`), omit the `type` keyword entirely in the schema property definition. An empty schema `{}` also works but is less readable.
- Remove `.gitkeep` from a directory when adding real files to it. Leaving it behind causes a harmless but misleading empty file.
- The `-manifest` suffix on definition schemas (`agent-manifest`, `tool-manifest`, `workflow-manifest`) prevents confusion between a definition object and an instance or runtime representation.
- `MemoryEntry` should be deferred until Python interop requires cross-process memory access. It is an internal store record in V1 and does not need a public contract schema.

### [2026-03-16] Phase 1 — Repo Skeleton and CLI Baseline

Key lessons from standing up the first executable code:

- `node --test` (no arguments) auto-discovers `**/*.test.js` files in Node 20. No glob needed in the npm script — safer than shell glob expansion which may not work in all shells.
- Separate pure logic (e.g., `doctor.js`) from the CLI entry point (`index.js`) so logic is independently testable without spawning a subprocess.
- `import.meta.url` + `resolve(fileURLToPath(...), '..', '..')` is the correct ESM pattern for finding the project root from a nested module. Do not use `__dirname`.
- Empty directories must use `.gitkeep` files to be tracked by git. Do not omit them — future sessions that clone the repo will be missing expected directories.
- The doctor command checks for `.env` as the "config file" indicator. This aligns with `.env.example` and is the most practical signal for developers.
- Phase numbering in `phase-plan.md` can diverge from what the user requests. Always update `phase-plan.md` when the user redefines a phase — the plan must reflect actual implementation order, not the original draft.
