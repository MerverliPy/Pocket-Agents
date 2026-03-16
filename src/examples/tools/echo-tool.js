/**
 * Echo tool manifest — placeholder example.
 *
 * This file is not executable. It exports a registry-ready ToolManifest that
 * conforms to the tool-manifest schema.
 *
 * Purpose: demonstrate how to define a tool for the Pocket-Agents registry.
 * Execution logic is deferred to a later phase.
 */

/** @type {import('../../core/validators/index.js').ToolManifest} */
export const manifest = Object.freeze({
  id: 'echo-tool',
  version: '1.0.0',
  description: 'Returns the input data unchanged. Useful for pass-through steps in workflows.',
  inputSchema: {
    type: 'object',
    properties: {
      data: { description: 'The data to pass through' },
    },
    required: ['data'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      data: { description: 'The passed-through data' },
    },
    required: ['data'],
    additionalProperties: false,
  },
});
