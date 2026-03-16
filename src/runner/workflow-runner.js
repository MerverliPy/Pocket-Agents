/**
 * workflow-runner.js — Sequential workflow execution engine for Pocket-Agents.
 *
 * runWorkflow() is the sole entry point for executing a workflow in V1.
 * It handles:
 *   1. Workflow manifest lookup from registry
 *   2. Workflow context initialisation (input + per-step outputs)
 *   3. Sequential step execution in manifest order
 *   4. Input mapping: dot-notation path resolution from workflow context
 *   5. Per-step timeout enforcement (timeoutMs)
 *   6. Per-step error policy (onError: 'fail' | 'continue')
 *   7. Lifecycle event emission (workflow.* and workflow.step.*)
 *   8. RunResult construction and schema validation
 *
 * Step types:
 *   agent     — delegates to runAgent(); ref = agentId
 *   tool      — invokes a BUILTIN_TOOL directly; ref = toolId
 *   transform — assembles an object from resolved inputMapping paths; no ref needed
 *   output    — semantic alias for transform; marks the final output step
 *
 * Design:
 *   - loadAgentModule is injected by the caller (same pattern as agent-runner.js)
 *   - runWorkflow never throws for expected errors — failures become RunResult.status='failed'
 *   - All state lives in workflowContext; no shared mutable state
 *
 * Non-goals (V1):
 *   - No branching or conditional logic
 *   - No loops
 *   - No parallel step execution
 *   - No distributed or cross-process execution
 */

import { randomUUID } from 'node:crypto';
import { get as registryGet } from '../core/registry/workflow-registry.js';
import { runAgent } from './agent-runner.js';
import { BUILTIN_TOOLS } from '../tools/index.js';
import { executeTool } from '../tools/executor.js';
import { emit } from '../events/event-bus.js';
import { validateRunResult } from '../core/validators/index.js';

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

/**
 * Safely emit a lifecycle event; skip silently if eventBus is null/undefined.
 *
 * @param {object|null} bus
 * @param {string} type
 * @param {string} runId
 * @param {string|null} stepId
 * @param {object} payload
 */
function safeEmit(bus, type, runId, stepId, payload) {
  if (!bus) return;
  emit(bus, {
    type,
    timestamp: new Date().toISOString(),
    runId,
    stepId: stepId ?? null,
    payload,
  });
}

// ---------------------------------------------------------------------------
// Input mapping
// ---------------------------------------------------------------------------

/**
 * Resolve a single path expression against the workflow context.
 *
 * Path format: dot-notation string traversing the workflowContext object.
 *   "input.foo"           → workflowContext.input.foo
 *   "steps.step1.bar"     → workflowContext.steps.step1.bar
 *
 * Non-string values are returned as-is (treated as literal values).
 * If a path leads to a missing key, returns undefined.
 *
 * @param {unknown} pathOrLiteral
 * @param {object} workflowContext  — { input, steps }
 * @returns {unknown}
 */
function resolvePath(pathOrLiteral, workflowContext) {
  if (typeof pathOrLiteral !== 'string') return pathOrLiteral;

  const parts = pathOrLiteral.split('.');
  let current = workflowContext;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Resolve all keys in an inputMapping object against the workflow context.
 *
 * @param {object|undefined} inputMapping
 * @param {object} workflowContext
 * @returns {object}
 */
function resolveInputMapping(inputMapping, workflowContext) {
  if (!inputMapping || Object.keys(inputMapping).length === 0) return {};

  const resolved = {};
  for (const [key, path] of Object.entries(inputMapping)) {
    resolved[key] = resolvePath(path, workflowContext);
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Timeout
// ---------------------------------------------------------------------------

/**
 * Race a promise against a timeout, cleaning up the timer on settlement.
 *
 * Using .finally(clearTimeout) ensures the timer is always cleared once the race
 * resolves — either because the Promise won (timer cleared early, no dangling ref) or
 * because the timeout won (clearTimeout on a fired timer is a safe no-op).
 *
 * @param {Promise<unknown>} promise
 * @param {number} ms
 * @returns {Promise<unknown>}
 */
function withTimeout(promise, ms) {
  let handle;
  const timeout = new Promise((_, reject) => {
    handle = setTimeout(
      () => reject(new Error(`Step timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(handle));
}

// ---------------------------------------------------------------------------
// Step execution by type
// ---------------------------------------------------------------------------

/**
 * Execute a single workflow step and return its output.
 *
 * @param {object}   step             — Step manifest object
 * @param {object}   workflowContext  — { workflowId, runId, input, steps }
 * @param {object}   runtime          — Assembled runtime
 * @param {Function} loadAgentModule  — (agentId) => Promise<{ manifest, execute }>
 * @returns {Promise<unknown>}         Step output value
 * @throws {Error}                     On any step execution failure
 */
async function executeStep(step, workflowContext, runtime, loadAgentModule) {
  const { id, type, ref } = step;
  const { config, logger, eventBus } = runtime;
  const { workflowId, runId } = workflowContext;

  // Resolve step input from workflow context using inputMapping
  const stepInput = resolveInputMapping(step.inputMapping, workflowContext);

  switch (type) {
    case 'agent': {
      if (!ref) {
        throw new Error(`Step "${id}" of type "agent" requires a ref (agentId)`);
      }

      // Build a TaskEnvelope conforming to task-envelope.schema.json
      const taskEnvelope = {
        taskId:     id,
        workflowId,
        runId,
        stepId:     id,
        agentId:    ref,
        input:      stepInput,
      };

      const agentResult = await runAgent(taskEnvelope, runtime, loadAgentModule);
      if (agentResult.status === 'failed') {
        throw new Error(agentResult.error);
      }
      return agentResult.output;
    }

    case 'tool': {
      if (!ref) {
        throw new Error(`Step "${id}" of type "tool" requires a ref (toolId)`);
      }

      const tool = BUILTIN_TOOLS.get(ref);
      if (!tool) {
        throw new Error(`Step "${id}": built-in tool not found: "${ref}"`);
      }

      return executeTool(tool, stepInput, {
        config,
        logger: logger.child ? logger.child({ stepId: id, workflowId }) : logger,
        eventBus,
        runId,
        stepId: id,
      });
    }

    case 'transform':
    case 'output': {
      // The step output IS the resolved inputMapping result.
      // No external call — purely assembles values from workflow context.
      return stepInput;
    }

    default:
      throw new Error(`Step "${id}": unknown step type "${type}"`);
  }
}

// ---------------------------------------------------------------------------
// RunResult builder
// ---------------------------------------------------------------------------

/**
 * Build and schema-validate a RunResult.
 *
 * @param {string}   workflowId
 * @param {string}   runId
 * @param {'success'|'partial'|'failed'} status
 * @param {object[]} stepResults
 * @param {unknown}  finalOutput
 * @param {string}   startedAt  — ISO 8601
 * @returns {Readonly<object>}  RunResult
 */
function buildRunResult(workflowId, runId, status, stepResults, finalOutput, startedAt) {
  const result = Object.freeze({
    workflowId,
    runId,
    status,
    startedAt,
    completedAt: new Date().toISOString(),
    steps: Object.freeze(stepResults.map((r) => Object.freeze({ ...r }))),
    finalOutput: finalOutput ?? null,
  });

  // Soft validation — log if invalid, indicates a runner bug
  const validation = validateRunResult(result);
  if (!validation.valid) {
    // eslint-disable-next-line no-console
    console.error('[workflow-runner] BUG: produced invalid RunResult', validation.errors);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a workflow by id, running all steps sequentially.
 *
 * @param {object}   runtime          — Assembled runtime (config, logger, eventBus, registries, stateStore)
 * @param {string}   workflowId       — Workflow id to look up in runtime.registries.workflows
 * @param {unknown}  input            — Workflow input (passed as workflowContext.input to steps)
 * @param {Function} loadAgentModule  — async (agentId: string) => { manifest, execute }
 *                                       Caller-injected; keeps runner path-agnostic.
 * @returns {Promise<Readonly<object>>} RunResult conforming to run-result.schema.json
 *
 * runWorkflow never throws for expected errors (workflow not found, step failures).
 * Programming errors (missing loadAgentModule) do throw.
 */
export async function runWorkflow(runtime, workflowId, input, loadAgentModule) {
  if (typeof loadAgentModule !== 'function') {
    throw new Error('[workflow-runner] loadAgentModule must be a function');
  }

  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const { logger, eventBus } = runtime;

  // ------------------------------------------------------------------
  // 1. Get workflow manifest from registry
  // ------------------------------------------------------------------
  let manifest;
  try {
    manifest = registryGet(runtime.registries.workflows, workflowId);
  } catch (err) {
    logger.error('[workflow-runner] workflow not registered', { workflowId, error: err.message });
    return buildRunResult(workflowId, runId, 'failed', [], null, startedAt);
  }

  // ------------------------------------------------------------------
  // 2. Emit workflow.started
  // ------------------------------------------------------------------
  safeEmit(eventBus, 'workflow.started', runId, null, {
    workflowId,
    stepCount: manifest.steps.length,
  });
  logger.info('[workflow-runner] workflow started', { workflowId, runId });

  // ------------------------------------------------------------------
  // 3. Execute steps sequentially
  // ------------------------------------------------------------------
  const workflowContext = {
    workflowId,
    runId,
    input:  input ?? {},
    steps:  {},
  };

  const stepResults = [];
  let finalOutput = null;
  let workflowFailed = false;

  for (const step of manifest.steps) {
    const stepStartMs = Date.now();

    safeEmit(eventBus, 'workflow.step.started', runId, step.id, {
      workflowId,
      type: step.type,
    });
    logger.info('[workflow-runner] step started', {
      workflowId, runId, stepId: step.id, type: step.type,
    });

    let stepOutput = null;
    let stepError = null;
    let stepStatus = 'failed';
    let durationMs = 0;

    try {
      const stepPromise = executeStep(step, workflowContext, runtime, loadAgentModule);
      const result = step.timeoutMs
        ? await withTimeout(stepPromise, step.timeoutMs)
        : await stepPromise;

      stepOutput = result;
      stepStatus = 'success';
      durationMs = Date.now() - stepStartMs;

      // Store step output in context for downstream steps to reference
      workflowContext.steps[step.id] = result;
      finalOutput = result;

      safeEmit(eventBus, 'workflow.step.completed', runId, step.id, { workflowId, durationMs });
      logger.info('[workflow-runner] step completed', {
        workflowId, runId, stepId: step.id, durationMs,
      });

    } catch (err) {
      stepError = err.message;
      stepStatus = 'failed';
      durationMs = Date.now() - stepStartMs;

      safeEmit(eventBus, 'workflow.step.failed', runId, step.id, {
        workflowId, error: stepError, durationMs,
      });
      logger.error('[workflow-runner] step failed', {
        workflowId, runId, stepId: step.id, error: stepError,
      });
    }

    stepResults.push({
      stepId:     step.id,
      status:     stepStatus,
      output:     stepOutput,
      error:      stepError,
      durationMs,
    });

    // Apply onError policy after recording the result
    if (stepStatus === 'failed') {
      const onError = step.onError ?? 'fail';
      if (onError === 'fail') {
        workflowFailed = true;
        break;
      }
      // onError === 'continue': keep going
    }
  }

  // ------------------------------------------------------------------
  // 4. Determine overall status and emit completion event
  // ------------------------------------------------------------------
  let overallStatus;
  if (workflowFailed) {
    overallStatus = 'failed';
  } else if (stepResults.some((r) => r.status === 'failed')) {
    overallStatus = 'partial';
  } else {
    overallStatus = 'success';
  }

  const totalDurationMs = Date.now() - new Date(startedAt).getTime();

  if (overallStatus === 'failed') {
    safeEmit(eventBus, 'workflow.failed', runId, null, {
      workflowId, durationMs: totalDurationMs,
    });
    logger.error('[workflow-runner] workflow failed', { workflowId, runId });
  } else {
    safeEmit(eventBus, 'workflow.completed', runId, null, {
      workflowId, status: overallStatus, durationMs: totalDurationMs,
    });
    logger.info('[workflow-runner] workflow completed', { workflowId, runId, status: overallStatus });
  }

  return buildRunResult(workflowId, runId, overallStatus, stepResults, finalOutput, startedAt);
}
