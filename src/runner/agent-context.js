/**
 * agent-context.js — AgentContext factory for Pocket-Agents.
 *
 * AgentContext is the object passed to every agent's execute() function.
 * It bundles all runtime services the agent needs without exposing the full
 * Runtime object (separation of concerns).
 *
 * AgentContext shape:
 *   {
 *     runId      — string (from task envelope)
 *     taskId     — string (from task envelope)
 *     agentId    — string (from task envelope)
 *     config     — Readonly<PocketAgentsConfig>
 *     logger     — child logger with { runId, agentId } bound
 *     eventBus   — in-process event bus (from runtime)
 *     registries — { agents, tools, workflows } (from runtime)
 *     stateStore — scoped memory store for this run
 *     invokeTool(toolId, input) — async helper for calling built-in tools
 *   }
 *
 * The invokeTool helper resolves tools from BUILTIN_TOOLS and delegates to
 * the tool executor. In V1, only built-in tools are available via invokeTool.
 */

import { BUILTIN_TOOLS } from '../tools/index.js';
import { executeTool } from '../tools/executor.js';
import { createScope } from '../state/memory-store.js';

/**
 * Create an AgentContext from the task envelope and assembled runtime.
 *
 * The returned object is frozen. The stateStore is scoped to runId so
 * concurrent runs (future feature) cannot interfere.
 *
 * @param {object} taskEnvelope  - Validated TaskEnvelope (must have runId, taskId, agentId)
 * @param {object} runtime       - Assembled runtime (config, logger, eventBus, registries, stateStore)
 * @returns {Readonly<object>}   AgentContext
 */
export function createAgentContext(taskEnvelope, runtime) {
  const { runId, taskId, agentId } = taskEnvelope;
  const { config, logger, eventBus, registries, stateStore } = runtime;

  // Bind runId + agentId into all log entries for this context
  const childLogger = logger.child({ runId, agentId });

  // Scope the store to this run so each run is isolated
  const scopedStore = stateStore ? createScope(stateStore, runId) : null;

  /**
   * Invoke a built-in tool by id.
   *
   * In V1, only BUILTIN_TOOLS are accessible via this helper. The tool
   * registry stores metadata-only manifests; it is not used for invocation.
   *
   * @param {string}  toolId  - Kebab-case tool id (e.g. 'file-read')
   * @param {unknown} input   - Input matching the tool's inputSchema
   * @returns {Promise<unknown>}
   * @throws {Error} err.code='context.tool_not_found' if toolId is not a built-in
   */
  async function invokeTool(toolId, input) {
    const tool = BUILTIN_TOOLS.get(toolId);
    if (!tool) {
      const err = new Error(`[agent-context] Tool not found: ${toolId}`);
      err.code = 'context.tool_not_found';
      throw err;
    }
    return executeTool(tool, input, {
      config,
      logger: childLogger,
      eventBus,
      runId,
      stepId: taskId,
    });
  }

  return Object.freeze({
    runId,
    taskId,
    agentId,
    config,
    logger: childLogger,
    eventBus,
    registries,
    stateStore: scopedStore,
    invokeTool,
  });
}
