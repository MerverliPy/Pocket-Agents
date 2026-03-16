/**
 * Echo agent manifest — placeholder example.
 *
 * This file is not executable. It exports a registry-ready AgentManifest that
 * conforms to the agent-manifest schema.
 *
 * Purpose: demonstrate how to define an agent for the Pocket-Agents registry.
 * Execution logic is deferred to a later phase.
 */

/** @type {import('../../core/validators/index.js').AgentManifest} */
export const manifest = Object.freeze({
  id: 'echo-agent',
  version: '1.0.0',
  description: 'Echoes its input back as output unchanged. Useful for testing pipelines.',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'The message to echo' },
    },
    required: ['message'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'The echoed message' },
    },
    required: ['message'],
    additionalProperties: false,
  },
});
