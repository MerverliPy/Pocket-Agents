/**
 * Hello workflow manifest — minimal example.
 *
 * This file is not executable. It exports a registry-ready WorkflowManifest that
 * conforms to the workflow-manifest schema.
 *
 * Purpose: demonstrate how to define a workflow for the Pocket-Agents registry.
 * Steps use the Phase 8 format: id, type, ref, inputMapping, outputKey.
 */

/** @type {object} WorkflowManifest */
export const manifest = Object.freeze({
  id: 'hello-workflow',
  version: '1.0.0',
  description: 'A minimal hello-world workflow that runs the echo-agent once.',
  steps: [
    Object.freeze({
      id: 'echo-step',
      type: 'agent',
      ref: 'echo-agent',
      inputMapping: Object.freeze({ message: 'input.message' }),
      outputKey: 'echoResult',
    }),
  ],
});
