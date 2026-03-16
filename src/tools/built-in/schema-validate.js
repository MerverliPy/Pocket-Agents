/**
 * schema-validate — Validate arbitrary data against a JSON Schema.
 *
 * No special permissions required.
 * Uses its own AJV instance to compile user-provided schemas at call time.
 */

import Ajv from 'ajv';

// Module-level AJV instance. Intentionally mutable (cache) — see executor.js comment.
const _ajv = new Ajv({ allErrors: true });

/** @type {import('../executor.js').ToolManifest} */
export const manifest = Object.freeze({
  id: 'schema-validate',
  version: '1.0.0',
  description: 'Validate any data value against a JSON Schema. Returns { valid, errors }.',
  inputSchema: {
    type: 'object',
    properties: {
      schema: { type: 'object', description: 'A valid JSON Schema object to validate against.' },
      data:   { description: 'The data value to validate (any type).' },
    },
    required: ['schema', 'data'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      valid:  { type: 'boolean', description: 'True when data is valid against the schema.' },
      errors: { description: 'AJV error objects when invalid; null when valid.' },
    },
    required: ['valid'],
    additionalProperties: false,
  },
});

/** No special permissions required. */
export const requiredPermissions = [];

/**
 * Validate `input.data` against `input.schema`.
 *
 * @param {{ schema: object, data: unknown }} input
 * @param {object} _context  - Unused by this tool.
 * @returns {{ valid: boolean, errors: Array|null }}
 * @throws {Error} when `input.schema` is not a valid JSON Schema.
 */
export function run(input, _context) {
  const { schema, data } = input;

  let validate;
  try {
    validate = _ajv.compile(schema);
  } catch (err) {
    throw new Error(`schema-validate: invalid JSON Schema — ${err.message}`);
  }

  const valid = validate(data);
  return { valid, errors: valid ? null : [...validate.errors] };
}
