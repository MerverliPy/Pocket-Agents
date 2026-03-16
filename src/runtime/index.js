/**
 * runtime/index.js — Pocket-Agents runtime assembly.
 *
 * createRuntime() is the single entry point for assembling all runtime
 * components. The returned object is frozen and immutable.
 *
 * Shape of the runtime object (stable across phases):
 *   config       — Resolved PocketAgentsConfig (always present)
 *   logger       — Structured logger (always present)
 *   eventBus     — In-process event bus (Phase 4+)
 *   registries   — Agent + tool registries (null until Phase 5)
 *   stateStore   — Run-scoped KV store (null until Phase 5)
 *
 * If config.eventsFile is non-empty, a JSONL sink is automatically attached
 * to the event bus via subscribeAll so all emitted events are persisted.
 */

import { loadConfig } from '../config/loader.js';
import { createLogger } from './logger.js';
import { createEventBus, subscribeAll } from '../events/event-bus.js';
import { createJsonlSink } from '../events/jsonl-sink.js';
import { createAgentRegistry } from '../core/registry/agent-registry.js';
import { createToolRegistry } from '../core/registry/tool-registry.js';
import { createWorkflowRegistry } from '../core/registry/workflow-registry.js';

/**
 * @typedef {import('../config/loader.js').PocketAgentsConfig} PocketAgentsConfig
 */

/**
 * @typedef {Object} Runtime
 * @property {Readonly<PocketAgentsConfig>}                    config       - Resolved configuration.
 * @property {object}                                          logger       - Structured logger.
 * @property {Readonly<{ handlers: Map }>}                     eventBus     - In-process event bus.
 * @property {{ agents: object, tools: object, workflows: object }} registries - In-memory registries (Phase 5).
 * @property {null}                                            stateStore   - Placeholder — Phase 5.
 */

/**
 * Assemble and return the Pocket-Agents runtime context.
 *
 * All callers should use this function rather than constructing components
 * individually. This keeps startup wiring centralized.
 *
 * @param {Partial<PocketAgentsConfig>} [configOverrides] - Optional config overrides.
 * @returns {Readonly<Runtime>}
 */
export function createRuntime(configOverrides = {}) {
  const config = loadConfig({ overrides: configOverrides });
  const logger = createLogger(config.logLevel);

  // Wire in-process event bus
  let eventBus = createEventBus();

  // Attach optional JSONL sink when eventsFile is configured
  if (config.eventsFile) {
    const sink = createJsonlSink(config.eventsFile);
    ({ bus: eventBus } = subscribeAll(eventBus, sink.handler));
    logger.debug('JSONL event sink attached', { eventsFile: config.eventsFile });
  }

  return Object.freeze({
    config,
    logger,
    eventBus,

    // --- Phase 5 registries ---
    registries: Object.freeze({
      agents: createAgentRegistry(),
      tools: createToolRegistry(),
      workflows: createWorkflowRegistry(),
    }),

    /** @type {null} Run-scoped KV state store — placeholder until Phase 6. */
    stateStore: null,
  });
}
