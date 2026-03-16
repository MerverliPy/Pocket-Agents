/**
 * executor.js — Tool execution engine for Pocket-Agents.
 *
 * `executeTool` is the single entry point for running any tool (built-in or
 * registered). It handles:
 *   1. Input validation against the tool's inputSchema
 *   2. Permission checking against runtime config flags
 *   3. Lifecycle event emission (tool.started / tool.completed / tool.failed)
 *   4. Calling the tool's run() function
 *   5. Output validation against the tool's outputSchema
 *
 * The executor is transport-agnostic: it does not know or care whether the
 * tool is a built-in function, a remote call, or a subprocess adapter.
 *
 * Tool shape expected by the executor:
 *   {
 *     manifest:            { id, version, description, inputSchema, outputSchema }
 *     requiredPermissions: string[]     (names of config boolean flags, e.g. 'allowShell')
 *     run:                 (input, context) => any | Promise<any>
 *   }
 *
 * Context shape expected by the executor:
 *   {
 *     config:   PocketAgentsConfig     (checked for permission flags)
 *     logger:   Logger                 (structured logger)
 *     eventBus: EventBus | null        (null → events are silently skipped)
 *     runId:    string                 (default: 'cli')
 *     stepId:   string | null          (default: null)
 *   }
 */

import Ajv from 'ajv';
import { emit } from '../events/event-bus.js';

// ---------------------------------------------------------------------------
// Module-level AJV instance for tool I/O validation.
//
// This is intentionally separate from the contracts/validators.js AJV instance
// (which compiles fixed contract schemas). Here we compile arbitrary
// user-provided JSON Schemas at runtime.
//
// The cache Map is module-level mutable state — this is an intentional and
// documented exception to the immutability rule. Caches do not affect
// correctness: same schema always produces the same validator.
// ---------------------------------------------------------------------------

const _ajv = new Ajv({ allErrors: true });
const _validatorCache = new Map();

/**
 * Compile or retrieve a cached AJV validator for the given schema.
 *
 * @param {object} schema  - Any valid JSON Schema object.
 * @returns {import('ajv').ValidateFunction}
 */
function getValidator(schema) {
  const key = JSON.stringify(schema);
  if (!_validatorCache.has(key)) {
    _validatorCache.set(key, _ajv.compile(schema));
  }
  return _validatorCache.get(key);
}

/**
 * Validate data against a JSON Schema.
 *
 * @param {object}  schema
 * @param {unknown} data
 * @returns {{ valid: boolean, errors: Array|null }}
 */
function validateAgainst(schema, data) {
  const validate = getValidator(schema);
  const valid = validate(data);
  return { valid, errors: valid ? null : [...validate.errors] };
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal valid EventRecord for a tool lifecycle event.
 *
 * @param {string} type      - Event type (tool.started, tool.completed, tool.failed)
 * @param {string} runId
 * @param {string|null} stepId
 * @param {object} payload
 * @returns {object}
 */
function makeEvent(type, runId, stepId, payload) {
  return { type, timestamp: new Date().toISOString(), runId, stepId, payload };
}

/**
 * Safely emit an event; skip silently if bus is null.
 *
 * @param {object|null} bus
 * @param {string} type
 * @param {string} runId
 * @param {string|null} stepId
 * @param {object} payload
 */
function safeEmit(bus, type, runId, stepId, payload) {
  if (!bus) return;
  emit(bus, makeEvent(type, runId, stepId, payload));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a tool with validated I/O and lifecycle event emission.
 *
 * @param {{ manifest: object, requiredPermissions: string[], run: Function }} tool
 * @param {unknown} rawInput                - Raw input from the caller (validated before run)
 * @param {{ config: object, logger: object, eventBus: object|null, runId?: string, stepId?: string|null }} context
 * @returns {Promise<unknown>} Validated output from the tool
 *
 * @throws {Error} err.code = 'tool.input_invalid'      — rawInput fails schema validation
 * @throws {Error} err.code = 'tool.permission_denied'  — config flag is false
 * @throws {Error} (re-throws)                          — tool.run() threw
 * @throws {Error} err.code = 'tool.output_invalid'     — output fails schema validation
 */
export async function executeTool(tool, rawInput, context) {
  const { manifest, requiredPermissions = [], run } = tool;
  const {
    config,
    logger,
    eventBus,
    runId = 'cli',
    stepId = null,
  } = context;

  // 1. Validate input -------------------------------------------------------
  const inputResult = validateAgainst(manifest.inputSchema, rawInput);
  if (!inputResult.valid) {
    const err = new Error(`[${manifest.id}] invalid input: ${inputResult.errors.map((e) => e.message).join(', ')}`);
    err.code = 'tool.input_invalid';
    err.errors = inputResult.errors;
    throw err;
  }

  // 2. Check permissions ----------------------------------------------------
  for (const perm of requiredPermissions) {
    if (!config[perm]) {
      const err = new Error(`[${manifest.id}] permission denied: ${perm} is false`);
      err.code = 'tool.permission_denied';
      err.permission = perm;
      throw err;
    }
  }

  // 3. Emit tool.started ----------------------------------------------------
  const startMs = Date.now();
  safeEmit(eventBus, 'tool.started', runId, stepId, {
    toolId: manifest.id,
    input: rawInput,
  });

  // 4. Run ------------------------------------------------------------------
  let output;
  try {
    output = await run(rawInput, context);
  } catch (runErr) {
    safeEmit(eventBus, 'tool.failed', runId, stepId, {
      toolId: manifest.id,
      error: runErr.message,
      durationMs: Date.now() - startMs,
    });
    logger.error(`[${manifest.id}] run failed`, { error: runErr.message });
    throw runErr;
  }

  // 5. Validate output ------------------------------------------------------
  const outputResult = validateAgainst(manifest.outputSchema, output);
  if (!outputResult.valid) {
    const err = new Error(`[${manifest.id}] invalid output: ${outputResult.errors.map((e) => e.message).join(', ')}`);
    err.code = 'tool.output_invalid';
    err.errors = outputResult.errors;
    safeEmit(eventBus, 'tool.failed', runId, stepId, {
      toolId: manifest.id,
      error: err.message,
      durationMs: Date.now() - startMs,
    });
    throw err;
  }

  // 6. Emit tool.completed --------------------------------------------------
  safeEmit(eventBus, 'tool.completed', runId, stepId, {
    toolId: manifest.id,
    durationMs: Date.now() - startMs,
  });

  return output;
}
