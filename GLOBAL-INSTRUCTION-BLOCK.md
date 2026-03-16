# Global Instruction Block for Every Coding Phase

You are implementing one phase of the Pocket-Agents project.

## Project identity
- Repository root: `Pocket-Agents`
- Primary runtime: Node.js 20+
- Module format: ESM JavaScript
- V1 strategy: local-first, single-process, low operational complexity
- Architecture strategy: Node-first implementation with runtime-agnostic contracts for future Python support

## Core implementation rules
1. Build only the current phase.
2. Do not pre-build future phases unless required by current phase contracts.
3. Keep dependencies minimal.
4. Prefer built-in Node.js APIs first.
5. All public contracts must be represented with JSON Schema in `Pocket-Agents/contracts`.
6. Preserve stable boundaries around:
   - agent interface/lifecycle
   - workflow/task definitions
   - tool contract layer
   - input/output schemas
   - memory/state abstractions
   - event/logging model
7. Optimize for:
   - speed of implementation
   - low runtime overhead
   - deterministic behavior
   - low operational complexity
   - clean future migration to multi-agent orchestration
8. Do not introduce:
   - distributed systems
   - cloud-native architecture
   - vector databases
   - autonomous planning engines
   - service meshes
   - heavy dependency stacks
9. V1 is local-first and single-process.
10. Preserve future replaceable interfaces for:
   - persistence/state
   - registry
   - queueing
   - event transport
   - tool execution boundaries

## Documentation rules
All planning and implementation must remain V1-only unless explicitly marked as deferred.

The project must maintain these files:
- `Pocket-Agents/docs/PRD-v1.md`
- `Pocket-Agents/docs/architecture.md`
- `Pocket-Agents/docs/decisions.md`
- `Pocket-Agents/docs/phase-plan.md`
- `Pocket-Agents/docs/project-ops/agent-rules.md`
- `Pocket-Agents/docs/project-ops/decision-log.md`
- `Pocket-Agents/docs/project-ops/known-issues.md`
- `Pocket-Agents/docs/project-ops/phase-progress.md`
- `Pocket-Agents/docs/project-ops/next-step-recommendations.md`

## Mandatory end-of-session updates
After every completed implementation session, update:
1. `agent-rules.md` with new bug patterns and implementation lessons
2. `known-issues.md`
3. `phase-progress.md`
4. `next-step-recommendations.md`
5. `decision-log.md` after any major implementation choice

## Output requirements for each coding session
Return:
1. Summary of what was built
2. File/folder tree of additions and changes
3. Important design decisions
4. Exact commands to run
5. Exact tests added or updated
6. Remaining risks or known limitations

## Safety and scope discipline
- Do not silently expand scope.
- Do not replace simple solutions with abstract frameworks.
- Do not add packages without justification.
- Do not change previously locked decisions unless documenting the change clearly in the decision log.
