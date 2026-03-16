/**
 * agent-run.js — CLI handler for the `agent:run` command.
 *
 * Usage:
 *   node src/cli/index.js agent:run <agentId> --input '<json>'
 *
 * The handler:
 *   1. Parses and validates the JSON input
 *   2. Assembles the runtime
 *   3. Registers built-in example agents
 *   4. Builds a TaskEnvelope
 *   5. Calls runAgent() with a module loader that imports from src/examples/agents/
 *   6. Returns { output, error } for the CLI router
 *
 * The pure logic is exported as runAgentRun() so it can be unit-tested
 * without spawning a subprocess.
 */

import { fileURLToPath } from 'node:url';
import { join, dirname, resolve } from 'node:path';
import { createRuntime } from '../runtime/index.js';
import { register } from '../core/registry/agent-registry.js';
import { runAgent } from '../runner/agent-runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default agents directory (src/examples/agents relative to this file's location)
const DEFAULT_AGENTS_DIR = resolve(__dirname, '..', 'examples', 'agents');

// Known built-in example agent ids mapped to their filenames
const BUILTIN_AGENT_FILES = new Map([
  ['echo-agent',     'echo-agent.js'],
  ['repo-inspect',   'repo-inspect-agent.js'],
  ['api-transform',  'api-transform-agent.js'],
]);

/**
 * Load all built-in example agents and register them into the runtime's agent registry.
 *
 * Returns a new runtime with agents registered (the registry is immutable so we
 * rebuild the registries object with the updated agent registry).
 *
 * @param {object} runtime        - Assembled runtime
 * @param {string} [agentsDir]    - Override agents directory (used in tests)
 * @returns {Promise<object>}     Updated runtime with agents registered
 */
async function loadAndRegisterAgents(runtime, agentsDir = DEFAULT_AGENTS_DIR) {
  let agentRegistry = runtime.registries.agents;

  for (const [agentId, filename] of BUILTIN_AGENT_FILES) {
    const modulePath = join(agentsDir, filename);
    try {
      const mod = await import(modulePath);
      agentRegistry = register(agentRegistry, mod.manifest);
    } catch (err) {
      // Non-fatal: log and skip agents that fail to load
      runtime.logger.warn('[agent-run] failed to load built-in agent', {
        agentId,
        modulePath,
        error: err.message,
      });
    }
  }

  // Return a new runtime-like object with the updated registries.
  // We do NOT mutate the frozen runtime — we create a plain object with the
  // same shape that the runner expects.
  return {
    config:     runtime.config,
    logger:     runtime.logger,
    eventBus:   runtime.eventBus,
    registries: {
      agents:    agentRegistry,
      tools:     runtime.registries.tools,
      workflows: runtime.registries.workflows,
    },
    stateStore: runtime.stateStore,
  };
}

/**
 * Build a module loader function that dynamically imports agent modules.
 *
 * The loader maps agentId → file path using BUILTIN_AGENT_FILES.
 * Unknown agent ids produce a 'not found' error rather than a path traversal.
 *
 * @param {string} agentsDir
 * @returns {(agentId: string) => Promise<{ manifest: object, execute: Function }>}
 */
function makeModuleLoader(agentsDir) {
  return async function loadAgentModule(agentId) {
    const filename = BUILTIN_AGENT_FILES.get(agentId);
    if (!filename) {
      throw new Error(`No module file registered for agent id "${agentId}"`);
    }
    const modulePath = join(agentsDir, filename);
    return import(modulePath);
  };
}

/**
 * Run an agent by id with a JSON input string.
 *
 * Pure logic — does not write to stdout/stderr. Returns { output, error }.
 *
 * @param {string|undefined} agentId    - Agent id to run (e.g. 'echo-agent')
 * @param {string|undefined} inputJson  - JSON string for the agent input
 * @param {object}           [opts]     - Optional overrides for testing
 * @param {string}           [opts.agentsDir]     - Override agents directory path
 * @param {object}           [opts.runtimeOverrides] - Config overrides for createRuntime
 * @returns {Promise<{ output: string, error: string|null }>}
 */
export async function runAgentRun(agentId, inputJson, opts = {}) {
  const { agentsDir = DEFAULT_AGENTS_DIR, runtimeOverrides = {} } = opts;

  // Validate agentId presence
  if (!agentId) {
    return { output: '', error: 'Usage: agent:run <agentId> --input <json>' };
  }

  // Parse input JSON
  let parsedInput;
  try {
    if (!inputJson) {
      return { output: '', error: 'agent:run: --input <json> is required' };
    }
    parsedInput = JSON.parse(inputJson);
  } catch {
    return { output: '', error: `agent:run: --input is not valid JSON: ${inputJson}` };
  }

  // Assemble runtime + register agents
  const baseRuntime = createRuntime(runtimeOverrides);
  const runtime = await loadAndRegisterAgents(baseRuntime, agentsDir);

  // Build minimal task envelope
  const taskEnvelope = {
    taskId:     `cli-${Date.now()}`,
    workflowId: 'cli',
    runId:      `cli-${Date.now()}`,
    stepId:     'cli-step',
    agentId,
    input:      parsedInput,
  };

  const loadAgentModule = makeModuleLoader(agentsDir);

  let result;
  try {
    result = await runAgent(taskEnvelope, runtime, loadAgentModule);
  } catch (err) {
    return { output: '', error: `agent:run: unexpected error: ${err.message}` };
  }

  if (result.status === 'failed') {
    return { output: '', error: `agent:run failed: ${result.error}` };
  }

  return { output: JSON.stringify(result.output, null, 2), error: null };
}
