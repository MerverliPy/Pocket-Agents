/**
 * Hello workflow manifest — placeholder example.
 *
 * This file is not executable. It exports a registry-ready WorkflowManifest that
 * conforms to the workflow-manifest schema.
 *
 * Purpose: demonstrate how to define a workflow for the Pocket-Agents registry.
 * Execution logic is deferred to a later phase.
 */

/** @type {import('../../core/validators/index.js').WorkflowManifest} */
export const manifest = Object.freeze({
  id: 'hello-workflow',
  version: '1.0.0',
  description: 'A minimal hello-world workflow that runs the echo-agent once.',
  steps: [
    Object.freeze({
      stepId: 'echo-step',
      agentId: 'echo-agent',
      toolIds: ['echo-tool'],
      inputMapping: Object.freeze({ message: 'input.message' }),
      outputKey: 'echoResult',
    }),
  ],
});
