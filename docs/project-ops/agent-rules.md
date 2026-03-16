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

### [2026-03-16] Phase 0 — Documentation-First Baseline

Phase 0 establishes that all documentation must precede runtime code. Key lessons:

- The PRD must be V1-only and explicitly call out deferred items — otherwise scope creep is invisible.
- `decisions.md` must capture *why* each decision was made, not just what it was, so future sessions can judge edge cases rather than blindly following rules.
- `phase-plan.md` must include acceptance criteria per phase so completion is unambiguous.
- Agent rules must explicitly require the session-close procedure — without it, project ops files drift out of sync quickly.
- All JSON Schema `$ref` references must resolve within the `contracts/` directory. External URL refs will fail in offline environments and break determinism.

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
