/**
 * agent-runner.js — Single-agent execution engine for Pocket-Agents.
 *
 * runAgent() is the sole entry point for executing an agent in V1.
 * It handles:
 *   1. TaskEnvelope validation
 *   2. Agent manifest lookup from registry
 *   3. Agent module loading via the caller-provided loadAgentModule()
 *   4. Input validation against the agent's inputSchema
 *   5. AgentContext construction
 *   6. Lifecycle event emission (agent.started / agent.completed / agent.failed)
 *   7. agent.execute(taskEnvelope, context) invocation
 *   8. Output validation against the agent's outputSchema
 *   9. AgentResult construction
 *
 * Design:
 *   - loadAgentModule is injected by the caller (enables testing without file system)
 *   - The runner never mutates the runtime
 *   - All errors are surfaced in AgentResult.error; nothing is swallowed silently
 *
 * Non-goals (V1):
 *   - No delegation, no multi-agent orchestration
 *   - No queue-based execution
 *   - No planner or autonomous loop
 */

import Ajv from 'ajv';
import { validateTaskEnvelope, validateAgentResult } from '../core/validators/index.js';
import { get as registryGet } from '../core/registry/agent-registry.js';
import { createAgentContext } from './agent-context.js';
import { emit } from '../events/event-bus.js';

// ---------------------------------------------------------------------------
// Module-level AJV for agent I/O validation (same pattern as executor.js)
// Separate from the contracts AJV instance — this compiles agent-defined schemas.
// ---------------------------------------------------------------------------

const _ajv = new Ajv({ allErrors: true });
const _validatorCache = new Map();

/**
 * Compile or retrieve a cached AJV validator for a schema.
 *
 * @param {object} schema
 * @returns {import('ajv').ValidateFunction}
 */
function getValidator(schema) {
  const key = JSON.stringify(schema);
  if (!_validatorCache.has(key)) {
    _validatorCache.set(key, _ajv.compile(schema));
  }
  return _validatorCache.get(key);
}

/**
 * Validate data against a JSON Schema.
 *
 * @param {object}  schema
 * @param {unknown} data
 * @returns {{ valid: boolean, errors: Array|null }}
 */
function validateAgainst(schema, data) {
  const validate = getValidator(schema);
  const valid = validate(data);
  return { valid, errors: valid ? null : [...validate.errors] };
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal EventRecord for an agent lifecycle event.
 *
 * @param {string} type   - 'agent.started' | 'agent.completed' | 'agent.failed'
 * @param {string} runId
 * @param {string} taskId
 * @param {object} payload
 * @returns {object}
 */
function makeEvent(type, runId, taskId, payload) {
  return {
    type,
    timestamp: new Date().toISOString(),
    runId,
    stepId: taskId,
    payload,
  };
}

/**
 * Safely emit a lifecycle event; skip silently if eventBus is null/undefined.
 *
 * @param {object|null} bus
 * @param {string} type
 * @param {string} runId
 * @param {string} taskId
 * @param {object} payload
 */
function safeEmit(bus, type, runId, taskId, payload) {
  if (!bus) return;
  emit(bus, makeEvent(type, runId, taskId, payload));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a single agent identified by taskEnvelope.agentId.
 *
 * @param {object}   taskEnvelope      - Must conform to task-envelope.schema.json
 * @param {object}   runtime           - Assembled runtime (config, logger, eventBus, registries, stateStore)
 * @param {Function} loadAgentModule   - async (agentId: string) => { manifest, execute }
 *                                       Caller supplies this to keep the runner path-agnostic.
 * @returns {Promise<Readonly<object>>} AgentResult conforming to agent-result.schema.json
 *
 * The returned AgentResult always has a status of 'success' or 'failed'.
 * Errors are captured in AgentResult.error — runAgent itself does not throw
 * (except for programming errors like missing loadAgentModule).
 */
export async function runAgent(taskEnvelope, runtime, loadAgentModule) {
  if (typeof loadAgentModule !== 'function') {
    throw new Error('[agent-runner] loadAgentModule must be a function');
  }

  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const { logger, eventBus } = runtime;

  // ------------------------------------------------------------------
  // 1. Validate task envelope
  // ------------------------------------------------------------------
  const envelopeResult = validateTaskEnvelope(taskEnvelope);
  if (!envelopeResult.valid) {
    const errorMsg = `Invalid task envelope: ${envelopeResult.errors.map((e) => e.message).join(', ')}`;
    logger.error('[agent-runner] task envelope invalid', { errors: envelopeResult.errors });
    return buildResult(taskEnvelope, 'failed', null, errorMsg, startedAt, startMs);
  }

  const { runId, taskId, agentId, input } = taskEnvelope;

  // ------------------------------------------------------------------
  // 2. Load agent manifest from registry
  // ------------------------------------------------------------------
  let manifest;
  try {
    manifest = registryGet(runtime.registries.agents, agentId);
  } catch (err) {
    const errorMsg = `Agent not found in registry: ${agentId}`;
    logger.error('[agent-runner] agent not registered', { agentId, error: err.message });
    safeEmit(eventBus, 'agent.failed', runId, taskId, { agentId, error: errorMsg });
    return buildResult(taskEnvelope, 'failed', null, errorMsg, startedAt, startMs);
  }

  // ------------------------------------------------------------------
  // 3. Load agent module
  // ------------------------------------------------------------------
  let agentModule;
  try {
    agentModule = await loadAgentModule(agentId);
  } catch (err) {
    const errorMsg = `Failed to load agent module "${agentId}": ${err.message}`;
    logger.error('[agent-runner] module load failed', { agentId, error: err.message });
    safeEmit(eventBus, 'agent.failed', runId, taskId, { agentId, error: errorMsg });
    return buildResult(taskEnvelope, 'failed', null, errorMsg, startedAt, startMs);
  }

  if (typeof agentModule?.execute !== 'function') {
    const errorMsg = `Agent module "${agentId}" does not export an execute() function`;
    logger.error('[agent-runner] module missing execute()', { agentId });
    safeEmit(eventBus, 'agent.failed', runId, taskId, { agentId, error: errorMsg });
    return buildResult(taskEnvelope, 'failed', null, errorMsg, startedAt, startMs);
  }

  // ------------------------------------------------------------------
  // 4. Validate input against agent's inputSchema
  // ------------------------------------------------------------------
  const inputResult = validateAgainst(manifest.inputSchema, input);
  if (!inputResult.valid) {
    const errorMsg = `[${agentId}] invalid input: ${inputResult.errors.map((e) => e.message).join(', ')}`;
    logger.error('[agent-runner] input validation failed', { agentId, errors: inputResult.errors });
    safeEmit(eventBus, 'agent.failed', runId, taskId, { agentId, error: errorMsg });
    return buildResult(taskEnvelope, 'failed', null, errorMsg, startedAt, startMs);
  }

  // ------------------------------------------------------------------
  // 5. Build AgentContext
  // ------------------------------------------------------------------
  const context = createAgentContext(taskEnvelope, runtime);

  // ------------------------------------------------------------------
  // 6. Emit agent.started
  // ------------------------------------------------------------------
  safeEmit(eventBus, 'agent.started', runId, taskId, { agentId });
  logger.info('[agent-runner] agent started', { runId, taskId, agentId });

  // ------------------------------------------------------------------
  // 7. Execute agent
  // ------------------------------------------------------------------
  let output;
  try {
    output = await agentModule.execute(taskEnvelope, context);
  } catch (err) {
    const errorMsg = `[${agentId}] execute() threw: ${err.message}`;
    logger.error('[agent-runner] agent execute failed', { agentId, error: err.message });
    safeEmit(eventBus, 'agent.failed', runId, taskId, {
      agentId,
      error: errorMsg,
      durationMs: Date.now() - startMs,
    });
    return buildResult(taskEnvelope, 'failed', null, errorMsg, startedAt, startMs);
  }

  // ------------------------------------------------------------------
  // 8. Validate output against agent's outputSchema
  // ------------------------------------------------------------------
  const outputResult = validateAgainst(manifest.outputSchema, output);
  if (!outputResult.valid) {
    const errorMsg = `[${agentId}] invalid output: ${outputResult.errors.map((e) => e.message).join(', ')}`;
    logger.error('[agent-runner] output validation failed', { agentId, errors: outputResult.errors });
    safeEmit(eventBus, 'agent.failed', runId, taskId, {
      agentId,
      error: errorMsg,
      durationMs: Date.now() - startMs,
    });
    return buildResult(taskEnvelope, 'failed', null, errorMsg, startedAt, startMs);
  }

  // ------------------------------------------------------------------
  // 9. Emit agent.completed and return success result
  // ------------------------------------------------------------------
  const durationMs = Date.now() - startMs;
  safeEmit(eventBus, 'agent.completed', runId, taskId, { agentId, durationMs });
  logger.info('[agent-runner] agent completed', { runId, taskId, agentId, durationMs });

  return buildResult(taskEnvelope, 'success', output, null, startedAt, startMs);
}

// ---------------------------------------------------------------------------
// Internal — result builder
// ---------------------------------------------------------------------------

/**
 * Build and validate an AgentResult object.
 *
 * @param {object}      taskEnvelope
 * @param {'success'|'failed'} status
 * @param {unknown}     output
 * @param {string|null} error
 * @param {string}      startedAt   - ISO 8601 start timestamp
 * @param {number}      startMs     - Date.now() at start (for durationMs)
 * @returns {Readonly<object>}
 */
function buildResult(taskEnvelope, status, output, error, startedAt, startMs) {
  const result = Object.freeze({
    runId:       taskEnvelope?.runId   ?? 'unknown',
    taskId:      taskEnvelope?.taskId  ?? 'unknown',
    agentId:     taskEnvelope?.agentId ?? 'unknown',
    status,
    output:      output ?? null,
    error:       error ?? null,
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs:  Date.now() - startMs,
  });

  // Validate against schema (soft — log if invalid but still return)
  const validation = validateAgentResult(result);
  if (!validation.valid) {
    // This should never happen — indicates a bug in the runner itself
    // eslint-disable-next-line no-console
    console.error('[agent-runner] BUG: produced invalid AgentResult', validation.errors);
  }

  return result;
}
