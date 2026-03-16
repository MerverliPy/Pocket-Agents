/**
 * repo-inspect-agent — Inspects a directory and returns a file listing.
 *
 * Uses the built-in `file-list` tool via context.invokeTool().
 * Demonstrates how agents compose built-in tools.
 *
 * Contract:
 *   Input:  { dir: string }
 *   Output: { dir: string, files: string[], count: number }
 *
 * Note: file-list returns entry names (not full paths). All entries including
 * subdirectory names are returned.
 *
 * Permissions required: none (file-list is always permitted in V1)
 */

export const manifest = Object.freeze({
  id: 'repo-inspect',
  version: '1.0.0',
  description: 'Lists files in a directory using the file-list built-in tool. ' +
    'Useful for inspecting workspace structure.',
  inputSchema: {
    type: 'object',
    properties: {
      dir: {
        type: 'string',
        description: 'Absolute or relative path to the directory to inspect',
      },
    },
    required: ['dir'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      dir: { type: 'string', description: 'The directory that was inspected' },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of matched file paths',
      },
      count: { type: 'number', description: 'Total number of files found' },
    },
    required: ['dir', 'files', 'count'],
    additionalProperties: false,
  },
});

/**
 * Execute the repo-inspect agent.
 *
 * @param {object} taskEnvelope - Validated TaskEnvelope
 * @param {object} context      - AgentContext
 * @returns {Promise<{ dir: string, files: string[], count: number }>}
 */
export async function execute(taskEnvelope, context) {
  const { dir } = taskEnvelope.input;
  context.logger.info('[repo-inspect-agent] inspecting directory', { dir });

  const result = await context.invokeTool('file-list', { dir });
  // file-list returns { entries: string[] } (names only, not full paths)
  const files = result.entries;

  return {
    dir,
    files,
    count: files.length,
  };
}
