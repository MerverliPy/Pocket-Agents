/**
 * In-memory tool registry.
 *
 * All operations are immutable — they return new frozen registry objects and
 * never mutate the input registry.
 *
 * Registry shape:
 *   { entries: Map<string, ToolManifest> }
 *
 * The entries Map is internal. External callers use the exported functions.
 */

import { validateToolManifest } from '../validators/index.js';

/**
 * Create a new, empty tool registry.
 *
 * @returns {Readonly<{ entries: Map<string, object> }>}
 */
export function createToolRegistry() {
  return Object.freeze({ entries: new Map() });
}

/**
 * Register a tool manifest in the registry.
 *
 * Validates the manifest against the ToolManifest schema before registering.
 * Returns a new frozen registry with the tool added.
 *
 * @param {Readonly<{ entries: Map }>} registry
 * @param {object} manifest
 * @returns {Readonly<{ entries: Map }>}
 * @throws {Error} with err.errors (AJV errors) if manifest is invalid
 * @throws {Error} with err.code === 'registry.duplicate' if id is already registered
 */
export function register(registry, manifest) {
  const { valid, errors } = validateToolManifest(manifest);
  if (!valid) {
    const err = new Error(
      `Invalid tool manifest: ${errors.map((e) => e.message).join(', ')}`
    );
    err.errors = errors;
    throw err;
  }

  const { id } = manifest;

  if (registry.entries.has(id)) {
    const err = new Error(`Tool already registered: ${id}`);
    err.code = 'registry.duplicate';
    throw err;
  }

  const newEntries = new Map([...registry.entries, [id, manifest]]);
  return Object.freeze({ entries: newEntries });
}

/**
 * Retrieve a tool manifest by id.
 *
 * @param {Readonly<{ entries: Map }>} registry
 * @param {string} toolId
 * @returns {object} The registered manifest
 * @throws {Error} with err.code === 'registry.not_found' if id is not registered
 */
export function get(registry, toolId) {
  if (!registry.entries.has(toolId)) {
    const err = new Error(`Tool not found: ${toolId}`);
    err.code = 'registry.not_found';
    throw err;
  }
  return registry.entries.get(toolId);
}

/**
 * Check whether a tool id is registered.
 *
 * @param {Readonly<{ entries: Map }>} registry
 * @param {string} toolId
 * @returns {boolean}
 */
export function has(registry, toolId) {
  return registry.entries.has(toolId);
}

/**
 * List all registered tool ids in sorted order.
 *
 * @param {Readonly<{ entries: Map }>} registry
 * @returns {string[]}
 */
export function list(registry) {
  return [...registry.entries.keys()].sort();
}
