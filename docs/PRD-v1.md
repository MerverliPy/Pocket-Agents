# Pocket-Agents — Product Requirements Document (V1)

> **Scope:** V1 only. Future phases are deferred and noted explicitly.
> **Last updated:** 2026-03-16

---

## 1. Goals

1. Provide a lightweight, local-first framework for composing and running AI agents on a developer's machine.
2. Define stable, runtime-neutral contracts so agents, tools, and workflows remain portable across runtimes (Node.js V1; Python deferred).
3. Enable rapid experimentation with agent pipelines without cloud dependencies or operational overhead.
4. Establish a clean seam between orchestration logic and tool execution so the tool layer can be replaced independently.
5. Produce a codebase that can be extended to multi-agent orchestration without a rewrite.

---

## 2. Non-Goals (V1)

- No cloud deployment, remote execution, or distributed agent coordination.
- No UI, dashboard, or web server.
- No authentication, multi-user access, or role-based permissions.
- No persistent database (file-based state only in V1).
- No autonomous planning, reflection loops, or self-modification.
- No vector store or semantic search integration.
- No Python runtime in V1 (architecture must allow it; it is not built).
- No production-grade observability stack (structured logging only).
- No package publishing or CLI distribution in V1.

---

## 3. V1 Scope

### Included

| Area | Description |
|---|---|
| Agent interface | Typed contract defining agent identity, input, output, and lifecycle hooks |
| Tool contract | JSON Schema-backed interface for tool registration and invocation |
| Workflow runner | Sequential task runner that chains agents and tools |
| Memory/state abstraction | Simple in-memory key-value store with a replaceable interface |
| Event/logging model | Structured event emitter for pipeline observability |
| CLI entry point | Minimal `node src/index.js` runner — no published CLI binary |
| JSON Schema contracts | All public contracts validated with JSON Schema |
| Unit + integration tests | Using Node built-in test runner |

### Excluded (Deferred)

| Area | Defer to |
|---|---|
| Python agent runtime | V2 or plugin phase |
| Multi-agent coordination | V2 |
| Persistent storage (DB) | V2 |
| Remote tool execution | V2 |
| Cloud/serverless deployment | V2+ |
| UI / dashboard | V2+ |
| Semantic memory / RAG | V2+ |

---

## 4. Navigation (User Journey)

```
Developer
  └─> writes an agent definition (implements AgentContract)
  └─> writes tool definitions (implement ToolContract)
  └─> defines a workflow (ordered list of agent+tool steps)
  └─> runs: node src/index.js --workflow my-workflow.json
  └─> sees structured log output per step
  └─> receives final workflow output
```

No interactive prompts, no web UI. Pure programmatic / file-based.

---

## 5. Data Models

> **Phase 2 update:** Schema files have been created and validated in `contracts/`. The canonical
> definitions are the JSON Schema files; the JSON examples below are kept for readability.
> Schema naming uses a `-manifest` suffix for definition objects and deviates slightly from the
> original draft — see `docs/project-ops/decision-log.md` entry [2026-03-16] Phase 2.

### 5.1 AgentManifest (`contracts/agent-manifest.schema.json`)

```json
{
  "id": "string (unique, kebab-case, pattern: ^[a-z][a-z0-9-]*$)",
  "version": "string (semver, e.g. 1.0.0)",
  "description": "string",
  "inputSchema": "object (JSON Schema)",
  "outputSchema": "object (JSON Schema)",
  "config": "object (optional, agent-specific)"
}
```

### 5.2 ToolManifest (`contracts/tool-manifest.schema.json`)

```json
{
  "id": "string (unique, kebab-case)",
  "version": "string (semver)",
  "description": "string",
  "inputSchema": "object (JSON Schema)",
  "outputSchema": "object (JSON Schema)"
}
```

### 5.3 WorkflowManifest (`contracts/workflow-manifest.schema.json`)

```json
{
  "id": "string",
  "version": "string (semver)",
  "description": "string",
  "steps": [
    {
      "stepId": "string",
      "agentId": "string",
      "toolIds": ["string"] ,
      "inputMapping": "object (optional)",
      "outputKey": "string (optional)"
    }
  ]
}
```

### 5.4 TaskEnvelope (`contracts/task-envelope.schema.json`)

Wrapper dispatched to an agent when a workflow step is executed.

```json
{
  "taskId": "string",
  "workflowId": "string",
  "runId": "string",
  "stepId": "string",
  "agentId": "string",
  "input": "any",
  "metadata": "object (optional)"
}
```

### 5.5 RunResult (`contracts/run-result.schema.json`)

```json
{
  "workflowId": "string",
  "runId": "string",
  "status": "success | partial | failed",
  "startedAt": "ISO8601",
  "completedAt": "ISO8601",
  "steps": [
    {
      "stepId": "string",
      "status": "success | failed | skipped",
      "output": "any",
      "error": "string | null",
      "durationMs": "number (>= 0)"
    }
  ],
  "finalOutput": "any"
}
```

### 5.6 MemoryEntry (no schema in Phase 2 — deferred)

```json
{
  "key": "string",
  "value": "any",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

MemoryEntry is an internal store entry not exposed across runtime boundaries in V1.
A schema will be added if Python interop requires cross-process memory access.

### 5.7 EventRecord (`contracts/event-record.schema.json`)

```json
{
  "type": "string (dot-separated, e.g. agent.started, workflow.completed)",
  "timestamp": "ISO8601",
  "runId": "string",
  "stepId": "string | null",
  "payload": "object"
}
```

---

## 6. File / Folder Architecture

```
Pocket-Agents/
├── CLAUDE.md                         # Agent operating rules
├── GLOBAL-INSTRUCTION-BLOCK.md       # Master coding rules
├── package.json
├── .eslintrc.json (optional)
│
├── contracts/                        # JSON Schema for all public contracts
│   ├── agent.schema.json
│   ├── tool.schema.json
│   ├── workflow.schema.json
│   ├── workflow-result.schema.json
│   ├── memory-entry.schema.json
│   └── event-record.schema.json
│
├── src/
│   ├── index.js                      # CLI entry point
│   ├── runner/
│   │   ├── workflow-runner.js        # Sequential workflow executor
│   │   └── step-executor.js         # Single step execution
│   ├── registry/
│   │   ├── agent-registry.js        # In-memory agent registry
│   │   └── tool-registry.js         # In-memory tool registry
│   ├── memory/
│   │   └── memory-store.js          # In-memory KV store (replaceable interface)
│   ├── events/
│   │   └── event-bus.js             # Structured event emitter
│   ├── validation/
│   │   └── schema-validator.js      # JSON Schema validation wrapper
│   └── utils/
│       ├── id.js                    # UUID / ID generation
│       └── logger.js                # Structured console logger
│
├── agents/                           # Example / built-in agent implementations
│   └── echo-agent/
│       ├── index.js
│       └── definition.json
│
├── tools/                            # Example / built-in tool implementations
│   └── echo-tool/
│       ├── index.js
│       └── definition.json
│
├── workflows/                        # Example workflow definitions
│   └── echo-workflow.json
│
├── test/
│   ├── unit/
│   │   ├── runner/
│   │   ├── registry/
│   │   ├── memory/
│   │   └── validation/
│   └── integration/
│       └── workflow-run.test.js
│
└── docs/
    ├── PRD-v1.md
    ├── architecture.md
    ├── decisions.md
    ├── phase-plan.md
    └── project-ops/
        ├── agent-rules.md
        ├── decision-log.md
        ├── known-issues.md
        ├── phase-progress.md
        └── next-step-recommendations.md
```

---

## 7. Package Recommendations

| Package | Justification | Alternative |
|---|---|---|
| `ajv` | Best-in-class JSON Schema validator (v8, ESM-compatible) | `jsonschema` (slower) |
| `uuid` | UUID v4 generation for run/step IDs | Node `crypto.randomUUID()` (built-in, preferred) |
| None for test runner | Node built-in `node:test` + `node:assert` | Jest (avoid in V1) |
| None for logging | Custom structured logger over `console` | `pino` (defer to V2) |

**Default:** Use `node:crypto.randomUUID()` for IDs and Node built-in test runner. Add `ajv` only when schema validation is implemented.

---

## 8. Acceptance Criteria

### Agent Contract
- [ ] `AgentDefinition` conforms to `contracts/agent.schema.json`
- [ ] Agent lifecycle hooks (`init`, `run`, `teardown`) are invokable
- [ ] Invalid agent definitions are rejected with a clear error

### Tool Contract
- [ ] `ToolDefinition` conforms to `contracts/tool.schema.json`
- [ ] Tool input is validated before invocation
- [ ] Tool output is validated before passing downstream

### Workflow Runner
- [ ] Sequential steps execute in order
- [ ] Step failure stops the workflow and reports status `failed`
- [ ] Output from step N is available to step N+1 via `outputKey`
- [ ] `WorkflowRunResult` is emitted on completion

### Memory Store
- [ ] `get`, `set`, `delete`, `list` operations work correctly
- [ ] Store is scoped per workflow run by default
- [ ] Interface is replaceable (no direct coupling in caller code)

### Event Bus
- [ ] Events are emitted for: `workflow.started`, `workflow.completed`, `step.started`, `step.completed`, `step.failed`, `tool.invoked`, `tool.completed`
- [ ] Consumers can subscribe and unsubscribe

### Validation
- [ ] Schema validator wraps AJV and returns structured errors
- [ ] All contracts are validated on load

### CLI Entry Point
- [ ] `node src/index.js --workflow <path>` executes a workflow file
- [ ] Errors are printed to stderr with exit code 1
- [ ] Success output is printed to stdout

---

## 9. Edge Cases

| Case | Expected Behavior |
|---|---|
| Workflow file not found | Exit 1 with clear error message |
| Agent not registered | Workflow step fails with `agent.not_found` error |
| Tool not registered | Step fails with `tool.not_found` error |
| Schema validation failure on agent input | Step fails with validation error, downstream steps skipped |
| Circular outputKey dependency | Detected at workflow load time, not runtime |
| Empty steps array | Workflow completes immediately with empty result |
| Agent `run()` throws | Step status = `failed`, error captured, workflow halts |
| Memory key collision across runs | Each run gets its own scoped store |
| Unknown JSON Schema `$ref` | Validator throws on startup, not at runtime |

---

## 10. Testing Checklist

### Unit Tests
- [ ] `workflow-runner.js` — happy path, step failure, empty steps
- [ ] `step-executor.js` — agent invocation, tool invocation, output mapping
- [ ] `agent-registry.js` — register, get, list, duplicate detection
- [ ] `tool-registry.js` — register, get, list, duplicate detection
- [ ] `memory-store.js` — get, set, delete, list, run scoping
- [ ] `event-bus.js` — emit, subscribe, unsubscribe
- [ ] `schema-validator.js` — valid schema, invalid schema, unknown ref
- [ ] `logger.js` — structured output format

### Integration Tests
- [ ] Full workflow run with echo agent and echo tool
- [ ] Workflow run where step 2 depends on step 1 output
- [ ] Workflow run where an agent throws — verify result status

### Contract Tests
- [ ] All JSON Schema files parse without error
- [ ] Sample valid data passes each schema
- [ ] Sample invalid data fails each schema with expected errors

---

## 11. Build / Deployment Checklist

- [ ] `package.json` has `"type": "module"` for ESM
- [ ] `node --version` is 20+
- [ ] `npm test` runs Node built-in test suite
- [ ] No `node_modules` committed to git
- [ ] `.gitignore` covers `node_modules/`, `*.log`, `.env`
- [ ] All contracts in `contracts/` are valid JSON
- [ ] README documents how to run the echo workflow end-to-end

### Configuration (Phase 3+)

- [ ] Copy `.env.example` to `.env` and fill in values before running
- [ ] `node src/cli/index.js config:show` prints resolved configuration
- [ ] Verify security flags (`allowShell`, `allowHttp`, `allowFileWrite`) are `false` unless explicitly enabled
- [ ] `PA_LOG_LEVEL` is set to `info` or higher in production/CI

### Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PA_LOG_LEVEL` | `info` | Logging verbosity: error\|warn\|info\|debug |
| `PA_WORKSPACE_ROOT` | `process.cwd()` | Absolute path to workspace root |
| `PA_DATA_DIR` | `<workspaceRoot>/.pocket-agents` | Absolute path to runtime data dir |
| `PA_ALLOW_SHELL` | `false` | Permit shell execution by agents/tools |
| `PA_ALLOW_HTTP` | `false` | Permit outbound HTTP by agents/tools |
| `PA_ALLOW_FILE_WRITE` | `false` | Permit filesystem writes by agents/tools |
| `PA_COMMAND_TIMEOUT_MS` | `30000` | CLI command timeout in milliseconds |
| `PA_CONFIG_FILE` | auto-detect | Explicit path to `pocket-agents.config.json` |

---

## 12. Phased Implementation Plan

| Phase | Name | Summary |
|---|---|---|
| 0 | Project Operating System | Docs, rules, PRD, architecture — no runtime code |
| 1 | Contracts & Schemas | All JSON Schema files in `contracts/` |
| 2 | Core Runtime | Registry, memory, event bus, validator |
| 3 | Workflow Runner | Sequential runner, step executor |
| 4 | CLI Entry Point | `node src/index.js --workflow` |
| 5 | Echo Agent & Tool | Reference implementations + integration test |
| 6 | Hardening | Edge case handling, error messages, test coverage to 80% |

See `docs/phase-plan.md` for full detail.

---

## 13. Definition of Done Per Phase

| Phase | Definition of Done |
|---|---|
| 0 | All doc files exist, PRD complete, ops files initialized |
| 1 | All schemas created, parseable, sample data passes/fails correctly |
| 2 | Registry, memory, event bus, validator all unit-tested at 80%+ |
| 3 | Workflow runner passes all unit and integration tests |
| 4 | CLI runs echo workflow end-to-end from terminal |
| 5 | Echo agent + tool work in real workflow run, integration test passes |
| 6 | All edge cases handled, test coverage ≥ 80%, README complete |

---

## 14. Deferred: Future Backend / Auth Notes

> These items are intentionally excluded from V1. Documented here to preserve intent.

- **Persistent storage:** Replace `memory-store.js` in-memory implementation with a SQLite or file-backed adapter in V2. The interface (`get/set/delete/list`) is stable.
- **Remote agent execution:** Agent registry can be extended to resolve agents over HTTP/IPC. Interface seam exists in `agent-registry.js`.
- **Authentication:** No auth in V1. If multi-user support is added, it belongs at the CLI layer as a middleware wrapper.
- **Python agents:** Implement a `PythonAgentAdapter` that communicates via stdin/stdout JSON-RPC. The `AgentContract` interface is runtime-neutral.
- **Multi-agent orchestration:** The workflow runner's step model supports parallel step groups. Enable by adding a `parallel: true` flag to `WorkflowDefinition.steps` in a future phase.
- **Cloud deployment:** Wrap the workflow runner in a serverless handler (Lambda, Cloud Run). No changes to core runner needed.
