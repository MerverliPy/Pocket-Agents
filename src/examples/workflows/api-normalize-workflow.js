/**
 * api-normalize-workflow — Transforms an input payload using field mapping rules.
 *
 * Steps:
 *   1. transform (agent): Runs api-transform-agent to rename/select fields from data.
 *   2. result    (output): Selects transformed and appliedRules from the transform step.
 *
 * Input:
 *   data:    object   — source JSON object to transform
 *   mapping: array    — [ { from: string, to: string } ] field mapping rules
 *
 * Output:
 *   transformed:  object — new object with renamed/selected fields
 *   appliedRules: number — number of mapping rules that matched
 */

export const manifest = Object.freeze({
  id: 'api-normalize-workflow',
  version: '1.0.0',
  description: 'Transforms an input JSON payload using field mapping rules via the api-transform agent.',
  steps: [
    Object.freeze({
      id: 'transform',
      type: 'agent',
      ref: 'api-transform',
      inputMapping: Object.freeze({
        data:    'input.data',
        mapping: 'input.mapping',
      }),
      outputKey: 'transformResult',
    }),
    Object.freeze({
      id: 'result',
      type: 'output',
      inputMapping: Object.freeze({
        transformed:  'steps.transform.transformed',
        appliedRules: 'steps.transform.appliedRules',
      }),
    }),
  ],
});
