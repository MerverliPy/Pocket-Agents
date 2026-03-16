/**
 * file-list — List the entries (files and directories) in a local directory.
 *
 * No special permissions required (directory reads are always allowed in V1).
 */

import { readdirSync } from 'node:fs';

/** @type {import('../executor.js').ToolManifest} */
export const manifest = Object.freeze({
  id: 'file-list',
  version: '1.0.0',
  description: 'List the names of all entries (files and subdirectories) in a directory.',
  inputSchema: {
    type: 'object',
    properties: {
      dir: { type: 'string', description: 'Absolute or relative path to the directory to list.' },
    },
    required: ['dir'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      entries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Names of the directory entries (not full paths).',
      },
    },
    required: ['entries'],
    additionalProperties: false,
  },
});

/** No special permissions required. */
export const requiredPermissions = [];

/**
 * List entries in `input.dir`.
 *
 * @param {{ dir: string }} input
 * @param {object} _context  - Unused by this tool.
 * @returns {{ entries: string[] }}
 * @throws {Error} ENOENT/ENOTDIR when the path does not exist or is not a directory.
 */
export function run(input, _context) {
  const entries = readdirSync(input.dir);
  return { entries };
}
