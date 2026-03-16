# Pocket-Agents — Architecture

> **V1 only.** Future migration paths are noted but not implemented.
> **Last updated:** 2026-03-16

---

## 1. Repo Layout

```
Pocket-Agents/
├── CLAUDE.md                         # Agent operating rules
├── GLOBAL-INSTRUCTION-BLOCK.md       # Master session rules
├── package.json                      # ESM, Node 20+, minimal deps
│
├── contracts/                        # JSON Schema — public interface contracts
│   ├── agent.schema.json
│   ├── tool.schema.json
│   ├── workflow.schema.json
│   ├── workflow-result.schema.json
│   ├── memory-entry.schema.json
│   └── event-record.schema.json
│
├── src/                              # Runtime source (ESM modules)
│   ├── index.js                      # CLI entry point
│   ├── runner/                       # Workflow and step execution
│   ├── registry/                     # Agent and tool registries
│   ├── memory/                       # In-memory KV store
│   ├── events/                       # Structured event bus
│   ├── validation/                   # JSON Schema validator wrapper
│   └── utils/                        # ID generation, structured logger
│
├── agents/                           # Concrete agent implementations
├── tools/                            # Concrete tool implementations
├── workflows/                        # Workflow definition JSON files
│
├── test/
│   ├── unit/                         # Per-module unit tests
│   └── integration/                  # Full workflow run tests
│
└── docs/                             # All project documentation
    ├── PRD-v1.md
    ├── architecture.md
    ├── decisions.md
    ├── phase-plan.md
    └── project-ops/
```

### Key Conventions

- All source files are `.js` ESM modules (`import`/`export`, no `require`).
- Files stay under 800 lines; target 200–400 lines.
- Each module has a single responsibility.
- No barrel files (`index.js` re-exports) except at the package entry point.

---

## 2. Storage Strategy

### V1: In-Memory Only

All state lives in a single Node.js process. No files are written at runtime.

| Store | V1 Implementation | V2 Replacement Path |
|---|---|---|
| Agent registry | `Map` in `agent-registry.js` | Remote registry over HTTP |
| Tool registry | `Map` in `tool-registry.js` | Plugin registry / npm resolution |
| Workflow memory | `Map` in `memory-store.js` | SQLite, Redis, or file-backed adapter |
| Event log | In-process emitter | Structured log file or event stream |

### Interface Discipline

The memory store exposes only: `get(key)`, `set(key, value)`, `delete(key)`, `list()`, `createScope(runId)`.
Callers never access the underlying `Map` directly. This makes the backing store replaceable without touching callers.

---

## 3. Local-First Runtime Model

V1 is a single Node.js process that:

1. Loads workflow definition from a JSON file.
2. Validates the definition against `contracts/workflow.schema.json`.
3. Resolves agents and tools from in-memory registries.
4. Executes steps sequentially.
5. Emits structured events to the in-process event bus.
6. Writes structured log lines to stdout.
7. Returns a `WorkflowRunResult` and exits.

**No network calls. No subprocesses. No daemons.**

The process is started with `node src/index.js --workflow <path>` and exits when the workflow completes.

---

## 4. Single-Process V1 Execution Model

```
┌─────────────────────────────────────────────────┐
│  Node.js Process                                 │
│                                                  │
│  CLI (src/index.js)                              │
│    └─> WorkflowRunner                            │
│          └─> StepExecutor (per step)             │
│                ├─> AgentRegistry.resolve()       │
│                ├─> ToolRegistry.resolve()        │
│                ├─> SchemaValidator.validate()    │
│                ├─> agent.run(input, memory)      │
│                └─> EventBus.emit(event)          │
│                                                  │
│  MemoryStore (run-scoped KV)                     │
│  EventBus (in-process emitter)                   │
│  Logger (stdout, structured)                     │
└─────────────────────────────────────────────────┘
```

All components share a single process memory space. No IPC, no message passing.

---

## 5. Contract Placement in `/contracts`

All public contracts are JSON Schema files in `contracts/`.

### Purpose

Contracts define what is valid at every system boundary:
- What an agent definition must contain (`agent-manifest.schema.json`).
- What a tool's input and output must look like (`tool-manifest.schema.json`).
- What a workflow definition must contain (`workflow-manifest.schema.json`).
- What a task dispatched to an agent contains (`task-envelope.schema.json`).
- What a run result looks like (`run-result.schema.json`).
- What an event record looks like (`event-record.schema.json`).

### Rules

1. Every public interface has a corresponding schema file.
2. Schemas are validated with AJV on process startup — not lazily.
3. Schemas use JSON Schema Draft-07 for maximum tooling compatibility.
4. Schemas must not reference external URLs; all `$ref` targets must resolve within `$defs` in the same file.
5. Schema files are the source of truth; TypeScript types (if ever added) are derived from schemas.

### Schema File Naming

```
contracts/<concept>.schema.json
```

Current files (Phase 2):
- `contracts/agent-manifest.schema.json` — AgentManifest
- `contracts/tool-manifest.schema.json` — ToolManifest
- `contracts/workflow-manifest.schema.json` — WorkflowManifest
- `contracts/task-envelope.schema.json` — TaskEnvelope (input wrapper for agent execution)
- `contracts/event-record.schema.json` — EventRecord
- `contracts/run-result.schema.json` — RunResult

### Validator Placement

Runtime validators live in `src/core/validators/index.js`. Each exported function:
- Loads and compiles schemas at module load time (fail loudly at startup).
- Returns `{ valid: boolean, errors: Array|null }` — never throws at validation time.
- Is named `validate<SchemaName>` (e.g. `validateAgentManifest`).

AJV is compiled with `{ allErrors: true }` so all field errors are reported at once.

---

## 6. Future Multi-Agent Migration Strategy

V1 is deliberately single-process and sequential. The following seams are designed to support multi-agent orchestration in a future phase without rewriting core logic.

### Seam 1: Agent Registry → Remote Resolver

`agent-registry.js` currently resolves agents from in-memory registration.
In a future phase, the resolver can be replaced with an HTTP/IPC adapter that fetches agent metadata and proxies `run()` calls to remote processes.

**No changes to `workflow-runner.js` or `step-executor.js` are required.**

### Seam 2: Workflow Step Model → Parallel Groups

`WorkflowDefinition.steps` is currently a flat ordered array (sequential).
A future `parallel: true` flag can group steps for concurrent execution.
The step executor already handles individual step isolation — parallelism is an orchestration concern above it.

### Seam 3: Memory Store → Shared State Backend

The `memory-store.js` interface (`get/set/delete/list/createScope`) is stable.
A Redis or SQLite adapter can be dropped in to enable cross-process state sharing.

### Seam 4: Event Bus → External Event Stream

The in-process `EventBus` can be replaced with a Kafka or NATS producer.
Event consumers (logging, monitoring, agent coordination) already receive normalized `EventRecord` objects.

### Seam 5: Tool Execution → Sandboxed Process

Tools currently execute in-process (V1).
A future phase can route tool invocations through a subprocess boundary (Node `child_process`, Docker, or WASM sandbox) without changing the tool contract.

### Python Support

Agents implement the `AgentContract` interface.
A `PythonAgentAdapter` can wrap any Python process as an agent using JSON-RPC over stdin/stdout.
The `WorkflowRunner` does not know or care about the underlying runtime — it only calls `agent.run(input, memory)`.

---

## 7. Design Principles

| Principle | Rationale |
|---|---|
| Simple before extensible | V1 must ship. Abstractions are added only when a second use case exists. |
| Interfaces over implementations | Callers depend on the interface (defined in contracts), not the module internals. |
| Fail loudly at startup | Schema validation happens on load, not mid-run. |
| Deterministic execution | No randomness in workflow logic; only in ID generation. |
| Structured logging always | Every significant event is a typed, timestamped record — not a free-form string. |
