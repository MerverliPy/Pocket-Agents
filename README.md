# Pocket-Agents

A lightweight, local-first framework for composing and running AI agents on your machine.

- **No cloud required** — runs entirely in a single Node.js process
- **ESM JavaScript** — modern module format throughout
- **Runtime-neutral contracts** — JSON Schema interfaces designed for future Python support
- **Low dependencies** — prefer Node built-ins; justify every package

---

## Prerequisites

- Node.js 20+
- npm 9+

---

## Installation

```bash
git clone <repo-url>
cd Pocket-Agents
npm install
```

---

## Commands

### Health check

```bash
node src/cli/index.js doctor
# or
npm run doctor
```

Prints project name, Node version, working directory, and whether key folders exist.

---

## Tests

```bash
npm test
```

Uses the Node.js built-in test runner (`node:test`). No extra packages required.

---

## Project Layout

```
Pocket-Agents/
├── contracts/          JSON Schema contracts for all public interfaces
├── docs/               Project documentation and planning
│   └── project-ops/    Living operational files (phase progress, issues, etc.)
├── examples/           Example agent and workflow definitions
├── src/
│   ├── agents/         Agent implementations
│   ├── cli/            CLI entry point and commands
│   ├── config/         Configuration loading
│   ├── core/           Core runtime logic
│   ├── events/         Event bus
│   ├── runtime/        Workflow and step execution
│   ├── state/          In-memory state / memory store
│   ├── tools/          Tool implementations
│   └── workflows/      Workflow definitions and loader
└── tests/              Test files (mirrors src/ structure)
```

---

## Configuration

Copy `.env.example` to `.env` and edit as needed:

```bash
cp .env.example .env
```

---

## Documentation

| File | Purpose |
|---|---|
| `docs/PRD-v1.md` | V1 product requirements |
| `docs/architecture.md` | System design and repo layout |
| `docs/decisions.md` | Locked baseline decisions |
| `docs/phase-plan.md` | Phase-by-phase V1 roadmap |
| `CLAUDE.md` | AI coding agent operating rules |
| `GLOBAL-INSTRUCTION-BLOCK.md` | Master session rules |

---

## License

MIT — see [LICENSE](LICENSE)
