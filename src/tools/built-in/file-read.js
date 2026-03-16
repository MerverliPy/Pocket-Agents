/**
 * file-read — Read a local file and return its content as a string.
 *
 * No special permissions required (file reads are always allowed in V1).
 */

import { readFileSync, statSync } from 'node:fs';

/** @type {import('../executor.js').ToolManifest} */
export const manifest = Object.freeze({
  id: 'file-read',
  version: '1.0.0',
  description: 'Read a local file and return its text content and byte size.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the file to read.' },
    },
    required: ['path'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Full text content of the file (UTF-8).' },
      size:    { type: 'number', description: 'File size in bytes.' },
    },
    required: ['content', 'size'],
    additionalProperties: false,
  },
});

/** No special permissions required. */
export const requiredPermissions = [];

/**
 * Read the file at `input.path` and return its content.
 *
 * @param {{ path: string }} input
 * @param {object} _context  - Unused by this tool.
 * @returns {{ content: string, size: number }}
 * @throws {Error} ENOENT when the file does not exist.
 */
export function run(input, _context) {
  const { path } = input;
  const stat = statSync(path);
  const content = readFileSync(path, 'utf8');
  return { content, size: stat.size };
}
