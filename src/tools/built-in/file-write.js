/**
 * file-write — Write a string to a local file.
 *
 * Requires config.allowFileWrite = true.
 * Creates or overwrites the file at the given path.
 */

import { writeFileSync } from 'node:fs';

/** @type {import('../executor.js').ToolManifest} */
export const manifest = Object.freeze({
  id: 'file-write',
  version: '1.0.0',
  description: 'Write text content to a local file. Creates or overwrites the file.',
  inputSchema: {
    type: 'object',
    properties: {
      path:    { type: 'string', description: 'Absolute or relative path to write to.' },
      content: { type: 'string', description: 'Text content to write (UTF-8).' },
    },
    required: ['path', 'content'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      path:         { type: 'string', description: 'The path that was written.' },
      bytesWritten: { type: 'number', description: 'Number of bytes written.' },
    },
    required: ['path', 'bytesWritten'],
    additionalProperties: false,
  },
});

/** Requires allowFileWrite config flag. */
export const requiredPermissions = ['allowFileWrite'];

/**
 * Write `input.content` to `input.path`.
 *
 * @param {{ path: string, content: string }} input
 * @param {object} _context  - Unused by this tool.
 * @returns {{ path: string, bytesWritten: number }}
 */
export function run(input, _context) {
  const { path, content } = input;
  writeFileSync(path, content, 'utf8');
  return { path, bytesWritten: Buffer.byteLength(content, 'utf8') };
}
