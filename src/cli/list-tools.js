/**
 * list-tools.js — Handler for the `list:tools` CLI command.
 *
 * Registers all known example tools and returns their ids, one per line.
 * Output is deterministic: ids are sorted alphabetically.
 */

import { createToolRegistry, register, list } from '../core/registry/tool-registry.js';
import { manifest as echoToolManifest } from '../examples/tools/echo-tool.js';

/**
 * Build a registry with all known example tools registered.
 *
 * Add additional example manifests here as new examples are introduced.
 *
 * @returns {Readonly<{ entries: Map }>}
 */
function buildToolRegistry() {
  let registry = createToolRegistry();
  registry = register(registry, echoToolManifest);
  return registry;
}

/**
 * Run the list:tools command.
 *
 * @returns {{ output: string }}
 */
export function runListTools() {
  const registry = buildToolRegistry();
  const ids = list(registry);
  const output = ids.join('\n');
  return { output };
}
