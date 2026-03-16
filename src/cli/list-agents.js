/**
 * list-agents.js — Handler for the `list:agents` CLI command.
 *
 * Registers all known example agents and returns their ids, one per line.
 * Output is deterministic: ids are sorted alphabetically.
 */

import { createAgentRegistry, register, list } from '../core/registry/agent-registry.js';
import { manifest as echoAgentManifest } from '../examples/agents/echo-agent.js';

/**
 * Build a registry with all known example agents registered.
 *
 * Add additional example manifests here as new examples are introduced.
 *
 * @returns {Readonly<{ entries: Map }>}
 */
function buildAgentRegistry() {
  let registry = createAgentRegistry();
  registry = register(registry, echoAgentManifest);
  return registry;
}

/**
 * Run the list:agents command.
 *
 * @returns {{ output: string }}
 */
export function runListAgents() {
  const registry = buildAgentRegistry();
  const ids = list(registry);
  const output = ids.join('\n');
  return { output };
}
