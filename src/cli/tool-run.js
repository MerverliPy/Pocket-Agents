/**
 * tool-run.js — `tool:run` CLI command.
 *
 * Executes a built-in tool by id with a JSON input payload and prints the
 * result as formatted JSON.
 *
 * Usage:
 *   node src/cli/index.js tool:run <toolId> --input <json>
 *
 * Examples:
 *   node src/cli/index.js tool:run schema-validate --input '{"schema":{"type":"string"},"data":"hi"}'
 *   node src/cli/index.js tool:run file-read --input '{"path":"./package.json"}'
 *
 * Returns { output: string } on success or { output: '', error: string } on failure.
 */

import { BUILTIN_TOOLS, listBuiltinIds } from '../tools/index.js';
import { executeTool } from '../tools/executor.js';
import { loadConfig } from '../config/loader.js';
import { createLogger } from '../runtime/logger.js';
import { createEventBus } from '../events/event-bus.js';

/**
 * Run the tool:run command.
 *
 * @param {string|undefined} toolId    - Tool id (e.g. 'schema-validate')
 * @param {string|undefined} inputJson - Raw JSON string for the tool input
 * @returns {Promise<{ output: string, error?: string }>}
 */
export async function runToolRun(toolId, inputJson) {
  if (!toolId) {
    return {
      output: '',
      error:  'Usage: tool:run <toolId> --input <json>',
    };
  }

  const tool = BUILTIN_TOOLS.get(toolId);
  if (!tool) {
    const available = listBuiltinIds().join(', ');
    return {
      output: '',
      error:  `Unknown tool: "${toolId}". Available built-in tools: ${available}`,
    };
  }

  let rawInput;
  try {
    rawInput = JSON.parse(inputJson ?? '{}');
  } catch {
    return {
      output: '',
      error:  '--input must be valid JSON (e.g. --input \'{"path":"./file.txt"}\')',
    };
  }

  const config  = loadConfig();
  const logger  = createLogger(config.logLevel);
  const eventBus = createEventBus();
  const context = { config, logger, eventBus, runId: 'cli', stepId: null };

  try {
    const result = await executeTool(tool, rawInput, context);
    return { output: JSON.stringify(result, null, 2) };
  } catch (err) {
    return { output: '', error: err.message };
  }
}
