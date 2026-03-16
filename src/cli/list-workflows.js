/**
 * list-workflows.js — Handler for the `list:workflows` CLI command.
 *
 * Registers all known example workflows and returns their ids, one per line.
 * Output is deterministic: ids are sorted alphabetically.
 */

import { createWorkflowRegistry, register, list } from '../core/registry/workflow-registry.js';
import { manifest as helloWorkflowManifest } from '../examples/workflows/hello-workflow.js';

/**
 * Build a registry with all known example workflows registered.
 *
 * Add additional example manifests here as new examples are introduced.
 *
 * @returns {Readonly<{ entries: Map }>}
 */
function buildWorkflowRegistry() {
  let registry = createWorkflowRegistry();
  registry = register(registry, helloWorkflowManifest);
  return registry;
}

/**
 * Run the list:workflows command.
 *
 * @returns {{ output: string }}
 */
export function runListWorkflows() {
  const registry = buildWorkflowRegistry();
  const ids = list(registry);
  const output = ids.join('\n');
  return { output };
}
