# Pocket-Agents — Known Issues

> Active issues, blockers, and risks tracked here.
> Resolved issues are marked ✅ and kept for historical reference.
> **Last updated:** 2026-03-16

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

### [KI-004] shell-exec Shell Injection Risk

**Severity:** medium
**Phase:** 6
**Status:** open
**Reported:** 2026-03-16

**Description:** The `shell-exec` tool passes the `command` string directly to `sh -c`. This is a shell injection vector if the command is constructed from untrusted input.
**Impact:** An agent or workflow constructing shell commands from user-supplied data could execute arbitrary shell commands.
**Workaround:** `allowShell` is `false` by default. Operators must opt in via `PA_ALLOW_SHELL=true`. Do not construct shell commands from untrusted data.
**Resolution:** _Pending — Phase 7+ may add an approved-command allowlist or sandboxed execution._

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

_None yet._
