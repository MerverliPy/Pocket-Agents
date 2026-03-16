/**
 * repo-inspect-workflow — Inspects a local directory and produces a structured file listing.
 *
 * Steps:
 *   1. inspect (agent): Runs repo-inspect-agent to list files in the input directory.
 *   2. result  (output): Selects dir, files, count from the inspect step output.
 *
 * Input:  { dir: string }
 * Output: { dir: string, files: string[], count: number }
 */

export const manifest = Object.freeze({
  id: 'repo-inspect-workflow',
  version: '1.0.0',
  description: 'Inspects a local directory using the repo-inspect agent and returns a structured file listing.',
  steps: [
    Object.freeze({
      id: 'inspect',
      type: 'agent',
      ref: 'repo-inspect',
      inputMapping: Object.freeze({ dir: 'input.dir' }),
      outputKey: 'inspectResult',
    }),
    Object.freeze({
      id: 'result',
      type: 'output',
      inputMapping: Object.freeze({
        dir:   'steps.inspect.dir',
        files: 'steps.inspect.files',
        count: 'steps.inspect.count',
      }),
    }),
  ],
});
