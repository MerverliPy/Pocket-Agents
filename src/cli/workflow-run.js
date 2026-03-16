/**
 * workflow-run.js — CLI handler for the `workflow:run` command.
 *
 * Usage:
 *   node src/cli/index.js workflow:run <workflowId> --input '<json>'
 *
 * The handler:
 *   1. Parses and validates the JSON input
 *   2. Assembles the runtime
 *   3. Registers built-in example agents and workflows
 *   4. Calls runWorkflow() with a module loader that imports from src/examples/agents/
 *   5. Returns { output, error } for the CLI router
 *
 * The pure logic is exported as runWorkflowRun() so it can be unit-tested
 * without spawning a subprocess.
 */

import { fileURLToPath } from 'node:url';
import { join, dirname, resolve } from 'node:path';
import { createRuntime } from '../runtime/index.js';
import { register as registerAgent } from '../core/registry/agent-registry.js';
import { register as registerWorkflow } from '../core/registry/workflow-registry.js';
import { runWorkflow } from '../runner/workflow-runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_AGENTS_DIR    = resolve(__dirname, '..', 'examples', 'agents');
const DEFAULT_WORKFLOWS_DIR = resolve(__dirname, '..', 'examples', 'workflows');

// Known built-in example agent ids mapped to their filenames
const BUILTIN_AGENT_FILES = new Map([
  ['echo-agent',    'echo-agent.js'],
  ['repo-inspect',  'repo-inspect-agent.js'],
  ['api-transform', 'api-transform-agent.js'],
]);

// Known built-in example workflow ids mapped to their filenames
const BUILTIN_WORKFLOW_FILES = new Map([
  ['hello-workflow',         'hello-workflow.js'],
  ['repo-inspect-workflow',  'repo-inspect-workflow.js'],
  ['api-normalize-workflow', 'api-normalize-workflow.js'],
  ['content-admin-workflow', 'content-admin-workflow.js'],
]);

// ---------------------------------------------------------------------------
// Registration helpers
// ---------------------------------------------------------------------------

/**
 * Load and register all built-in example agents into the runtime's registry.
 *
 * @param {object} runtime
 * @param {string} agentsDir
 * @returns {Promise<object>}  Updated agent registry
 */
async function loadAgentRegistry(runtime, agentsDir) {
  let agentRegistry = runtime.registries.agents;

  for (const [agentId, filename] of BUILTIN_AGENT_FILES) {
    const modulePath = join(agentsDir, filename);
    try {
      const mod = await import(modulePath);
      agentRegistry = registerAgent(agentRegistry, mod.manifest);
    } catch (err) {
      runtime.logger.warn('[workflow-run] failed to load built-in agent', {
        agentId, modulePath, error: err.message,
      });
    }
  }

  return agentRegistry;
}

/**
 * Load and register all built-in example workflows into the runtime's registry.
 *
 * @param {object} runtime
 * @param {string} workflowsDir
 * @returns {Promise<object>}  Updated workflow registry
 */
async function loadWorkflowRegistry(runtime, workflowsDir) {
  let workflowRegistry = runtime.registries.workflows;

  for (const [workflowId, filename] of BUILTIN_WORKFLOW_FILES) {
    const modulePath = join(workflowsDir, filename);
    try {
      const mod = await import(modulePath);
      workflowRegistry = registerWorkflow(workflowRegistry, mod.manifest);
    } catch (err) {
      runtime.logger.warn('[workflow-run] failed to load built-in workflow', {
        workflowId, modulePath, error: err.message,
      });
    }
  }

  return workflowRegistry;
}

/**
 * Build a module loader that dynamically imports agent modules.
 * Maps agentId → file path. Unknown ids produce a 'not found' error.
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a workflow by id with a JSON input string.
 *
 * Pure logic — does not write to stdout/stderr. Returns { output, error }.
 *
 * @param {string|undefined} workflowId   - Workflow id to run (e.g. 'hello-workflow')
 * @param {string|undefined} inputJson    - JSON string for the workflow input
 * @param {object}           [opts]       - Optional overrides for testing
 * @param {string}           [opts.agentsDir]             - Override agents directory path
 * @param {string}           [opts.workflowsDir]          - Override workflows directory path
 * @param {object}           [opts.runtimeOverrides]      - Config overrides for createRuntime
 * @param {object[]}         [opts.workflowManifests]     - Pre-loaded workflow manifests (bypasses file loading)
 * @param {object[]}         [opts.agentManifests]        - Pre-loaded agent manifests (bypasses file loading)
 * @param {Map}              [opts.agentModules]          - Pre-loaded agent modules map (bypasses file loading)
 * @returns {Promise<{ output: string, error: string|null }>}
 */
export async function runWorkflowRun(workflowId, inputJson, opts = {}) {
  const {
    agentsDir    = DEFAULT_AGENTS_DIR,
    workflowsDir = DEFAULT_WORKFLOWS_DIR,
    runtimeOverrides = {},
    workflowManifests,
    agentManifests,
    agentModules,
  } = opts;

  // Validate workflowId presence
  if (!workflowId) {
    return { output: '', error: 'Usage: workflow:run <workflowId> --input <json>' };
  }

  // Parse input JSON
  if (!inputJson) {
    return { output: '', error: 'workflow:run: --input <json> is required' };
  }
  let parsedInput;
  try {
    parsedInput = JSON.parse(inputJson);
  } catch {
    return { output: '', error: `workflow:run: --input is not valid JSON: ${inputJson}` };
  }

  // Assemble runtime
  const baseRuntime = createRuntime(runtimeOverrides);

  // Build registries — use injected manifests if provided (test path), else load from disk
  let agentRegistry    = baseRuntime.registries.agents;
  let workflowRegistry = baseRuntime.registries.workflows;

  if (agentManifests) {
    // Test injection path — register pre-loaded manifests directly
    for (const m of agentManifests) {
      agentRegistry = registerAgent(agentRegistry, m);
    }
  } else {
    agentRegistry = await loadAgentRegistry(baseRuntime, agentsDir);
  }

  if (workflowManifests) {
    // Test injection path — register pre-loaded manifests directly
    for (const m of workflowManifests) {
      workflowRegistry = registerWorkflow(workflowRegistry, m);
    }
  } else {
    workflowRegistry = await loadWorkflowRegistry(baseRuntime, workflowsDir);
  }

  const runtime = {
    config:     baseRuntime.config,
    logger:     baseRuntime.logger,
    eventBus:   baseRuntime.eventBus,
    registries: {
      agents:    agentRegistry,
      tools:     baseRuntime.registries.tools,
      workflows: workflowRegistry,
    },
    stateStore: baseRuntime.stateStore,
  };

  // Build module loader — use injected map if provided (test path), else load from disk
  const loadAgentModule = agentModules
    ? async (agentId) => {
        if (agentModules.has(agentId)) return agentModules.get(agentId);
        throw new Error(`No module provided for agent id "${agentId}"`);
      }
    : makeModuleLoader(agentsDir);

  // Execute workflow
  let runResult;
  try {
    runResult = await runWorkflow(runtime, workflowId, parsedInput, loadAgentModule);
  } catch (err) {
    return { output: '', error: `workflow:run: unexpected error: ${err.message}` };
  }

  if (runResult.status === 'failed') {
    const failedStep = runResult.steps.find((s) => s.status === 'failed');
    const errorMsg = failedStep?.error ?? 'workflow failed';
    return { output: '', error: `workflow:run failed [${workflowId}]: ${errorMsg}` };
  }

  return { output: JSON.stringify(runResult, null, 2), error: null };
}
