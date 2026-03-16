/**
 * In-memory workflow registry.
 *
 * All operations are immutable — they return new frozen registry objects and
 * never mutate the input registry.
 *
 * Registry shape:
 *   { entries: Map<string, WorkflowManifest> }
 *
 * The entries Map is internal. External callers use the exported functions.
 */

import { validateWorkflowManifest } from '../validators/index.js';

/**
 * Create a new, empty workflow registry.
 *
 * @returns {Readonly<{ entries: Map<string, object> }>}
 */
export function createWorkflowRegistry() {
  return Object.freeze({ entries: new Map() });
}

/**
 * Register a workflow manifest in the registry.
 *
 * Validates the manifest against the WorkflowManifest schema before registering.
 * Returns a new frozen registry with the workflow added.
 *
 * @param {Readonly<{ entries: Map }>} registry
 * @param {object} manifest
 * @returns {Readonly<{ entries: Map }>}
 * @throws {Error} with err.errors (AJV errors) if manifest is invalid
 * @throws {Error} with err.code === 'registry.duplicate' if id is already registered
 */
export function register(registry, manifest) {
  const { valid, errors } = validateWorkflowManifest(manifest);
  if (!valid) {
    const err = new Error(
      `Invalid workflow manifest: ${errors.map((e) => e.message).join(', ')}`
    );
    err.errors = errors;
    throw err;
  }

  const { id } = manifest;

  if (registry.entries.has(id)) {
    const err = new Error(`Workflow already registered: ${id}`);
    err.code = 'registry.duplicate';
    throw err;
  }

  const newEntries = new Map([...registry.entries, [id, manifest]]);
  return Object.freeze({ entries: newEntries });
}

/**
 * Retrieve a workflow manifest by id.
 *
 * @param {Readonly<{ entries: Map }>} registry
 * @param {string} workflowId
 * @returns {object} The registered manifest
 * @throws {Error} with err.code === 'registry.not_found' if id is not registered
 */
export function get(registry, workflowId) {
  if (!registry.entries.has(workflowId)) {
    const err = new Error(`Workflow not found: ${workflowId}`);
    err.code = 'registry.not_found';
    throw err;
  }
  return registry.entries.get(workflowId);
}

/**
 * Check whether a workflow id is registered.
 *
 * @param {Readonly<{ entries: Map }>} registry
 * @param {string} workflowId
 * @returns {boolean}
 */
export function has(registry, workflowId) {
  return registry.entries.has(workflowId);
}

/**
 * List all registered workflow ids in sorted order.
 *
 * @param {Readonly<{ entries: Map }>} registry
 * @returns {string[]}
 */
export function list(registry) {
  return [...registry.entries.keys()].sort();
}
