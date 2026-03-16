/**
 * content-admin-workflow — Processes content through echo and transform steps.
 *
 * Demonstrates using agent, transform, and output step types together.
 *
 * Steps:
 *   1. echo    (agent):     Echoes the input content message.
 *   2. enrich  (transform): Assembles enriched content from echo output + additional inputs.
 *   3. result  (output):    Selects final fields from enriched content for output.
 *
 * Input:  { content: string, source: string, status: string }
 * Output: { content: string, source: string, status: string }
 */

export const manifest = Object.freeze({
  id: 'content-admin-workflow',
  version: '1.0.0',
  description: 'Processes a content item through echo and transform steps for admin review.',
  steps: [
    Object.freeze({
      id: 'echo',
      type: 'agent',
      ref: 'echo-agent',
      inputMapping: Object.freeze({ message: 'input.content' }),
      outputKey: 'echoResult',
    }),
    Object.freeze({
      id: 'enrich',
      type: 'transform',
      inputMapping: Object.freeze({
        content: 'steps.echo.message',
        source:  'input.source',
      }),
      outputKey: 'enriched',
    }),
    Object.freeze({
      id: 'result',
      type: 'output',
      inputMapping: Object.freeze({
        content: 'steps.enrich.content',
        source:  'steps.enrich.source',
        status:  'input.status',
      }),
    }),
  ],
});
