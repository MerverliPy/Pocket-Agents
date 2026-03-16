# Pocket-Agents — Known Issues

> Active issues, blockers, and risks tracked here.
> Resolved issues are marked ✅ and kept for historical reference.
> **Last updated:** 2026-03-16 (after Phase 8)

---

## Issue Format

```
## [KI-NNN] <Title>

**Severity:** critical | high | medium | low
**Phase:** <affected phase>
**Status:** open | investigating | blocked | ✅ resolved
**Reported:** YYYY-MM-DD
**Resolved:** YYYY-MM-DD (if resolved)

**Description:** <what the issue is>
**Impact:** <what breaks or is at risk>
**Workaround:** <temporary workaround if any>
**Resolution:** <how it was fixed, once resolved>
```

---

## Active Issues

### [KI-007] Workflow Step Schema: Breaking Change — `stepId`/`agentId` Removed

**Severity:** medium
**Phase:** 8
**Status:** open
**Reported:** 2026-03-16

**Description:** The `workflow-manifest.schema.json` step shape was updated in Phase 8 to use `id`/`type`/`ref` instead of `stepId`/`agentId`. Any workflow manifests written against the Phase 2–7 schema are now invalid.
**Impact:** Users who have written custom workflow manifests using the old `stepId`/`agentId` format will receive schema validation errors on registration.
**Workaround:** Update step definitions to use `id`, `type`, and `ref` fields. Example: `{ stepId: 'foo', agentId: 'bar' }` → `{ id: 'foo', type: 'agent', ref: 'bar' }`.
**Resolution:** _Not planned for reversal — the new format is a clean break. Document migration path in README or CHANGELOG when V1 is stabilised._

---

### [KI-008] `tool` Step Type Not Covered by Tests

**Severity:** low
**Phase:** 8
**Status:** open
**Reported:** 2026-03-16

**Description:** The `tool` step type in the workflow runner calls `executeTool` directly. It is implemented but not covered by a dedicated workflow-runner test (no test creates a workflow with `type: 'tool'`).
**Impact:** A regression in the `tool` step type could go undetected until a CLI or integration test is added.
**Workaround:** The `executeTool` function is independently tested in `tests/tools/executor.test.js`. The `tool` step path in `executeStep` is minimal (3 lines).
**Resolution:** _Pending — add a workflow-runner test with a tool step in a follow-up session._

---

### [KI-004] shell-exec Shell Injection Risk

**Severity:** medium
**Phase:** 6
**Status:** open
**Reported:** 2026-03-16

**Description:** The `shell-exec` tool passes the `command` string directly to `sh -c`. This is a shell injection vector if the command is constructed from untrusted input.
**Impact:** An agent or workflow constructing shell commands from user-supplied data could execute arbitrary shell commands.
**Workaround:** `allowShell` is `false` by default. Operators must opt in via `PA_ALLOW_SHELL=true`. Do not construct shell commands from untrusted data.
**Resolution:** _Pending — Phase 8+ may add an approved-command allowlist or sandboxed execution._

---

### [KI-005] Local LSP Diagnostics Unavailable (typescript-language-server Missing)

**Severity:** low
**Phase:** cross-phase tooling
**Status:** open
**Reported:** 2026-03-16

**Description:** LSP diagnostics calls fail because `typescript-language-server` is configured but not installed in the environment.
**Impact:** LSP-based verification step cannot be executed in-session for JS files.
**Workaround:** Use `npm test` and runtime command checks until LSP dependency is installed.
**Resolution:** _Pending — install `typescript-language-server` and `typescript` globally or in the dev environment._

---

## Risks (Pre-Implementation)

### [KI-001] AJV ESM Compatibility in Node 20+

**Severity:** medium
**Phase:** 1, 2
**Status:** ✅ resolved
**Reported:** 2026-03-16
**Resolved:** 2026-03-16

**Description:** AJV v8 supports ESM but requires careful import syntax. Some AJV plugins are CJS-only and will break ESM imports.
**Impact:** Schema validation module may fail to import if AJV plugins are added carelessly.
**Workaround:** Use only the core `ajv` package in V1. Avoid AJV plugins.
**Resolution:** ✅ Resolved — 2026-03-16. `import Ajv from 'ajv'` works correctly in Node 20 with `"type": "module"`. No plugins needed. All 42 validator tests pass.

---

### [KI-002] Node Built-In Test Runner — No Coverage Tooling Built In

**Severity:** low
**Phase:** 2, 3, 4, 5, 6
**Status:** open
**Reported:** 2026-03-16

**Description:** `node:test` does not include a built-in code coverage reporter in all Node 20 versions. Coverage requires `--experimental-coverage` flag, which may produce inconsistent output.
**Impact:** Coverage requirement (≥80%) may be hard to verify without adding a coverage tool.
**Workaround:** Use `node --test --experimental-coverage` and inspect the output manually during Phase 6.
**Resolution:** _Pending — evaluate during Phase 6 hardening._

---

### [KI-003] ESM `import.meta.url` Required for `__dirname` Equivalent

**Severity:** low
**Phase:** 2, 4
**Status:** open
**Reported:** 2026-03-16

**Description:** ESM modules do not have `__dirname` or `__filename`. File path resolution requires `import.meta.url` with `URL` and `fileURLToPath`.
**Impact:** Any module that needs to resolve paths relative to its own file (e.g., loading schema files) must use the ESM-compatible pattern.
**Workaround:** Use `new URL('../contracts/foo.schema.json', import.meta.url)` for path resolution.
**Resolution:** ✅ Resolved — 2026-03-16. Pattern `resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..')` confirmed working in `src/cli/doctor.js`.

---

## Resolved Issues

### [KI-006] `repo-inspect-agent` Used Wrong Field Name from `file-list`

**Severity:** low
**Phase:** 7
**Status:** ✅ resolved
**Reported:** 2026-03-16
**Resolved:** 2026-03-16

**Description:** The `repo-inspect-agent` initially referenced `result.files` after calling the `file-list` tool. The tool actually returns `{ entries: string[] }`, not `{ files: string[] }`.
**Impact:** `agent:run repo-inspect` failed with "Cannot read properties of undefined (reading 'length')".
**Resolution:** ✅ Fixed in same session — updated `repo-inspect-agent.js` to use `result.entries`. Also updated the agent manifest to remove the unsupported `pattern` input field (file-list does not accept it).
