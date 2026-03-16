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
| Event log | In-process `EventBus` + optional JSONL file sink | Structured log stream, Kafka, NATS |

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

## 4. Configuration and Runtime Assembly (Phase 3)

### Configuration Resolution

Configuration is loaded by `src/config/loader.js` using a layered precedence model:

```
Lowest priority
  │  Built-in defaults           (src/config/defaults.js)
  │  JSON config file            (pocket-agents.config.json or PA_CONFIG_FILE)
  │  Environment variables       (PA_* prefix)
  ▼  Programmatic overrides      (passed directly to loadConfig)
Highest priority
```

The resolved config is a frozen object. `frameworkName` is immutable regardless of overrides.
`dataDir` is derived from `workspaceRoot` if not explicitly set.

### Runtime Assembly

`src/runtime/index.js` exports `createRuntime(configOverrides?)`, which:

1. Calls `loadConfig` to produce a frozen `PocketAgentsConfig`.
2. Creates a structured logger respecting `config.logLevel`.
3. Returns a frozen `Runtime` object with placeholder slots for future components.

```js
const runtime = createRuntime();
// runtime.config     → PocketAgentsConfig (always present)
// runtime.logger     → structured logger  (always present)
// runtime.eventBus   → in-process EventBus (Phase 4+)
// runtime.registries → null (Phase 5)
// runtime.stateStore → null (Phase 5)
```

All callers obtain the runtime via `createRuntime()`. Components are never constructed directly.
This centralizes startup wiring and makes future substitution straightforward.

If `config.eventsFile` is set (via `PA_EVENTS_FILE`), the runtime automatically attaches a
JSONL sink to the event bus so all emitted events are persisted to a local file.

---

## 4a. Structured Logging and Event Infrastructure (Phase 4)

### Logger

`src/runtime/logger.js` exports `createLogger(logLevel, boundContext?)`.
The returned object is frozen with `info`, `warn`, `error`, `debug`, and `child` methods.

Minimum fields in every log entry: `timestamp`, `level`, `msg`.

Optional context fields bound via `child()`: `runId`, `workflowId`, `agentId`, `toolId`.
Ad-hoc data passed per call is spread into the entry after context (per-call wins on conflict).

```js
const logger = createLogger('info');
const runLogger = logger.child({ runId: 'run-abc' });
runLogger.info('step complete', { toolId: 'shell' });
// → { "timestamp": "...", "level": "info", "msg": "step complete",
//     "runId": "run-abc", "toolId": "shell" }
```

`child()` returns a new frozen logger; the parent is unchanged. Nesting is supported.

### Event Bus

`src/events/event-bus.js` exports an immutable in-process event bus.

Key properties:
- No Node.js `EventEmitter` — plain `Map<type, Set<handler>>`.
- **No mutation**: every `subscribe` / `unsubscribe` call returns a new bus object.
- `emit(bus, eventRecord)` validates against `event-record.schema.json` before dispatching.
- `subscribeAll(bus, handler)` registers a wildcard handler (receives all event types).

```js
import { createEventBus, emit, subscribe, subscribeAll } from './events/event-bus.js';

let bus = createEventBus();
let unsub;
({ bus, unsubscribe: unsub } = subscribe(bus, 'agent.started', (e) => console.log(e)));
emit(bus, { type: 'agent.started', timestamp: '...', runId: 'r1', stepId: null, payload: {} });
bus = unsub(bus);
```

### JSONL Event Sink

`src/events/jsonl-sink.js` provides an optional file-backed event sink.

- `appendEvent(filePath, eventRecord)` — append one JSON line synchronously.
- `readEvents(filePath)` — read and parse all records; returns `[]` if file absent.
- `createJsonlSink(filePath)` — returns `{ handler, readAll }` suitable for `subscribeAll`.

The sink is transport-agnostic. In a future phase, `handler` can be replaced by a remote
producer without changing the event bus interface.

### CLI: `events:tail`

```sh
node src/cli/index.js events:tail [file]
```

Reads the JSONL event log and prints each record as formatted JSON to stdout.
File path is taken from the CLI argument or `PA_EVENTS_FILE` config. V1 is snapshot-only
(no live follow).

---

## 5. In-Memory Registries (Phase 5)

### Registry Design

Three registries provide in-memory manifest discovery: agent, tool, and workflow.
All registries follow the same immutable functional API — they are plain frozen data objects
operated on by standalone exported functions.

```
src/core/registry/
├── agent-registry.js     — createAgentRegistry, register, get, has, list
├── tool-registry.js      — createToolRegistry, register, get, has, list
└── workflow-registry.js  — createWorkflowRegistry, register, get, has, list
```

### Registry Shape

Each registry is a frozen object: `{ entries: Map<string, manifest> }`.

The `entries` Map is internal — callers never access it directly; they use the exported functions.

### Operations

| Function | Description |
|---|---|
| `createXRegistry()` | Returns a new empty frozen registry |
| `register(registry, manifest)` | Validates manifest; returns new registry with entry added |
| `get(registry, id)` | Returns manifest or throws `{ code: 'registry.not_found' }` |
| `has(registry, id)` | Returns boolean |
| `list(registry)` | Returns sorted array of registered ids |

### Error Codes

All registry errors use the `registry.*` namespace:
- `registry.duplicate` — id already registered
- `registry.not_found` — id not found

### Validation at Registration

Every `register()` call validates the manifest against its JSON Schema
(`validateAgentManifest`, `validateToolManifest`, `validateWorkflowManifest`) before adding it.
If validation fails, an Error with `.errors` (AJV errors array) is thrown immediately.
Invalid manifests never enter the registry.

### Runtime Assembly

`src/runtime/index.js` exports a `registries` field populated with all three empty registries:

```js
const runtime = createRuntime();
// runtime.registries.agents     → AgentRegistry
// runtime.registries.tools      → ToolRegistry
// runtime.registries.workflows  → WorkflowRegistry
```

### Example Manifests

Placeholder example manifests live in `src/examples/`:

```
src/examples/
├── agents/echo-agent.js        — exports manifest (AgentManifest)
├── tools/echo-tool.js          — exports manifest (ToolManifest)
└── workflows/hello-workflow.js — exports manifest (WorkflowManifest)
```

These are not executable — they are registry-ready definitions that demonstrate the manifest
format and are used by the CLI list commands.

### CLI Commands

```sh
node src/cli/index.js list:agents      # print registered agent ids
node src/cli/index.js list:tools       # print registered tool ids
node src/cli/index.js list:workflows   # print registered workflow ids
```

Each list command builds a fresh registry, registers all example manifests, and prints the
sorted ids one per line.

---

## 5a. Single-Process V1 Execution Model

```
┌─────────────────────────────────────────────────┐
│  Node.js Process                                 │
│                                                  │
│  CLI (src/cli/index.js)                          │
│    ├─> workflow:run → workflow-run.js            │
│    │       └─> runWorkflow(runtime, id, input)  │
│    │             ├─> WorkflowRegistry.get()      │
│    │             └─> [for each step]             │
│    │                   ├─> agent: runAgent()     │
│    │                   ├─> tool: executeTool()   │
│    │                   └─> transform/output:     │
│    │                         resolveInputMapping │
│    └─> agent:run  → agent-run.js                │
│            └─> runAgent(envelope, runtime, load) │
│                  ├─> AgentRegistry.get()         │
│                  ├─> loadAgentModule(agentId)    │
│                  ├─> SchemaValidator.validate()  │
│                  ├─> agent.execute(env, context) │
│                  └─> EventBus.emit(event)        │
│                                                  │
│  MemoryStore (run-scoped KV)                     │
│  EventBus (in-process emitter)                   │
│  Logger (stdout, structured)                     │
└─────────────────────────────────────────────────┘
```

All components share a single process memory space. No IPC, no message passing.

### Workflow Context and Input Mapping (Phase 8)

Each `runWorkflow` execution maintains a `workflowContext` object:

```
workflowContext = {
  workflowId: string,
  runId:      string,
  input:      <initial workflow input>,
  steps:      { [stepId]: <step output> }
}
```

Step `inputMapping` values are dot-notation paths resolved against this context:
- `"input.foo"` → `workflowContext.input.foo`
- `"steps.step1.bar"` → `workflowContext.steps.step1.bar`
- Non-string values are passed through as literals.

### Workflow Step Types (Phase 8)

| Type | Execution | `ref` |
|------|-----------|-------|
| `agent` | Delegates to `runAgent()` | Agent id (e.g. `echo-agent`) |
| `tool` | Delegates to `executeTool()` | Built-in tool id (e.g. `file-list`) |
| `transform` | Assembles object from resolved inputMapping | Not used |
| `output` | Same as `transform`; marks final output step | Not used |

### Workflow Lifecycle Events (Phase 8)

All events are emitted via the in-process EventBus:

| Event | Timing |
|-------|--------|
| `workflow.started` | Before first step |
| `workflow.step.started` | Before each step |
| `workflow.step.completed` | After each step succeeds |
| `workflow.step.failed` | After each step fails |
| `workflow.completed` | After last step (status: success or partial) |
| `workflow.failed` | When workflow stops due to a failed step (onError=fail) |

---

## 6. Contract Placement in `/contracts`

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

## 7. Future Multi-Agent Migration Strategy

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

## 8. Design Principles

| Principle | Rationale |
|---|---|
| Simple before extensible | V1 must ship. Abstractions are added only when a second use case exists. |
| Interfaces over implementations | Callers depend on the interface (defined in contracts), not the module internals. |
| Fail loudly at startup | Schema validation happens on load, not mid-run. |
| Deterministic execution | No randomness in workflow logic; only in ID generation. |
| Structured logging always | Every significant event is a typed, timestamped record — not a free-form string. |
