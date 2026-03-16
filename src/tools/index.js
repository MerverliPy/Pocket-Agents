/**
 * tools/index.js — Built-in tool catalogue for Pocket-Agents.
 *
 * Exports a Map of all built-in tools keyed by tool id.
 * Each entry has the shape { manifest, requiredPermissions, run }.
 *
 * Usage:
 *   import { BUILTIN_TOOLS } from '../tools/index.js';
 *   const tool = BUILTIN_TOOLS.get('file-read');
 *   await executeTool(tool, input, context);
 */

import * as fileRead      from './built-in/file-read.js';
import * as fileWrite     from './built-in/file-write.js';
import * as fileList      from './built-in/file-list.js';
import * as shellExec     from './built-in/shell-exec.js';
import * as httpRequest   from './built-in/http-request.js';
import * as schemaValidate from './built-in/schema-validate.js';

const _ALL = [fileRead, fileWrite, fileList, shellExec, httpRequest, schemaValidate];

/**
 * Map of all built-in tools keyed by tool id.
 *
 * @type {Map<string, { manifest: object, requiredPermissions: string[], run: Function }>}
 */
export const BUILTIN_TOOLS = new Map(_ALL.map((tool) => [tool.manifest.id, tool]));

/**
 * Return the list of all built-in tool ids in sorted order.
 *
 * @returns {string[]}
 */
export function listBuiltinIds() {
  return [...BUILTIN_TOOLS.keys()].sort();
}
