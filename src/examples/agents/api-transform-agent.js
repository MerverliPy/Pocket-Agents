/**
 * api-transform-agent — Transforms a JSON payload by selecting and renaming fields.
 *
 * Accepts a data object and a mapping array, and returns a new object built
 * by applying the mapping rules. No external tools required — pure data logic.
 *
 * Contract:
 *   Input:
 *     data:    object   — source JSON object
 *     mapping: array    — [ { from: string, to: string } ]
 *
 *   Output:
 *     transformed: object   — new object with renamed/selected fields
 *     appliedRules: number  — count of mapping rules applied
 *
 * Example:
 *   Input:  { data: { firstName: 'Alice', age: 30 },
 *             mapping: [{ from: 'firstName', to: 'name' }] }
 *   Output: { transformed: { name: 'Alice' }, appliedRules: 1 }
 */

export const manifest = Object.freeze({
  id: 'api-transform',
  version: '1.0.0',
  description: 'Transforms a JSON payload by selecting and renaming fields via a mapping array. ' +
    'No external tools required.',
  inputSchema: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        description: 'Source JSON object to transform',
        additionalProperties: true,
      },
      mapping: {
        type: 'array',
        description: 'Field mapping rules',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Source field name' },
            to:   { type: 'string', description: 'Target field name' },
          },
          required: ['from', 'to'],
          additionalProperties: false,
        },
        minItems: 1,
      },
    },
    required: ['data', 'mapping'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      transformed: {
        type: 'object',
        description: 'The resulting object after applying mapping rules',
        additionalProperties: true,
      },
      appliedRules: {
        type: 'number',
        description: 'Number of mapping rules that matched a field in data',
      },
    },
    required: ['transformed', 'appliedRules'],
    additionalProperties: false,
  },
});

/**
 * Execute the api-transform agent.
 *
 * @param {object} taskEnvelope - Validated TaskEnvelope
 * @param {object} context      - AgentContext
 * @returns {Promise<{ transformed: object, appliedRules: number }>}
 */
export async function execute(taskEnvelope, context) {
  const { data, mapping } = taskEnvelope.input;
  context.logger.info('[api-transform-agent] applying mapping', { ruleCount: mapping.length });

  let appliedRules = 0;
  const transformed = {};

  for (const rule of mapping) {
    if (Object.prototype.hasOwnProperty.call(data, rule.from)) {
      transformed[rule.to] = data[rule.from];
      appliedRules += 1;
    }
  }

  context.logger.info('[api-transform-agent] transform complete', { appliedRules });
  return { transformed, appliedRules };
}
