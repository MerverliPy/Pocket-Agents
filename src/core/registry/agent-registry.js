/**
 * In-memory agent registry.
 *
 * All operations are immutable — they return new frozen registry objects and
 * never mutate the input registry.
 *
 * Registry shape:
 *   { entries: Map<string, AgentManifest> }
 *
 * The entries Map is internal. External callers use the exported functions.
 */

import { validateAgentManifest } from '../validators/index.js';

/**
 * Create a new, empty agent registry.
 *
 * @returns {Readonly<{ entries: Map<string, object> }>}
 */
export function createAgentRegistry() {
  return Object.freeze({ entries: new Map() });
}

/**
 * Register an agent manifest in the registry.
 *
 * Validates the manifest against the AgentManifest schema before registering.
 * Returns a new frozen registry with the agent added.
 *
 * @param {Readonly<{ entries: Map }>} registry
 * @param {object} manifest
 * @returns {Readonly<{ entries: Map }>}
 * @throws {Error} with err.errors (AJV errors) if manifest is invalid
 * @throws {Error} with err.code === 'registry.duplicate' if id is already registered
 */
export function register(registry, manifest) {
  const { valid, errors } = validateAgentManifest(manifest);
  if (!valid) {
    const err = new Error(
      `Invalid agent manifest: ${errors.map((e) => e.message).join(', ')}`
    );
    err.errors = errors;
    throw err;
  }

  const { id } = manifest;

  if (registry.entries.has(id)) {
    const err = new Error(`Agent already registered: ${id}`);
    err.code = 'registry.duplicate';
    throw err;
  }

  const newEntries = new Map([...registry.entries, [id, manifest]]);
  return Object.freeze({ entries: newEntries });
}

/**
 * Retrieve an agent manifest by id.
 *
 * @param {Readonly<{ entries: Map }>} registry
 * @param {string} agentId
 * @returns {object} The registered manifest
 * @throws {Error} with err.code === 'registry.not_found' if id is not registered
 */
export function get(registry, agentId) {
  if (!registry.entries.has(agentId)) {
    const err = new Error(`Agent not found: ${agentId}`);
    err.code = 'registry.not_found';
    throw err;
  }
  return registry.entries.get(agentId);
}

/**
 * Check whether an agent id is registered.
 *
 * @param {Readonly<{ entries: Map }>} registry
 * @param {string} agentId
 * @returns {boolean}
 */
export function has(registry, agentId) {
  return registry.entries.has(agentId);
}

/**
 * List all registered agent ids in sorted order.
 *
 * @param {Readonly<{ entries: Map }>} registry
 * @returns {string[]}
 */
export function list(registry) {
  return [...registry.entries.keys()].sort();
}
