/**
 * echo-agent — Echoes its input back as output unchanged.
 *
 * Useful for testing agent pipelines and verifying the runner lifecycle.
 *
 * Contract:
 *   Input:  { message: string }
 *   Output: { message: string }
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

/**
 * Execute the echo agent.
 *
 * @param {object} taskEnvelope - Validated TaskEnvelope
 * @param {object} context      - AgentContext (runId, logger, invokeTool, etc.)
 * @returns {Promise<{ message: string }>}
 */
export async function execute(taskEnvelope, context) {
  const { message } = taskEnvelope.input;
  context.logger.info('[echo-agent] echoing message', { message });
  return { message };
}
