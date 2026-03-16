/**
 * Tests for src/cli/list-workflows.js
 * TDD: written before implementation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runListWorkflows } from '../../src/cli/list-workflows.js';

describe('runListWorkflows', () => {
  it('returns an object with output property', () => {
    const result = runListWorkflows();
    assert.equal(typeof result, 'object');
    assert.ok('output' in result);
    assert.equal(typeof result.output, 'string');
  });

  it('output is non-empty', () => {
    const { output } = runListWorkflows();
    assert.ok(output.length > 0);
  });

  it('output contains hello-workflow id', () => {
    const { output } = runListWorkflows();
    assert.ok(output.includes('hello-workflow'), `output should include hello-workflow, got: ${output}`);
  });

  it('output has one id per line', () => {
    const { output } = runListWorkflows();
    const lines = output.split('\n').filter((l) => l.trim() !== '');
    assert.ok(lines.length >= 1);
    for (const line of lines) {
      assert.match(line, /^[a-z][a-z0-9-]*$/, `each line should be a valid workflow id, got: ${line}`);
    }
  });

  it('all lines are registered workflow ids in sorted order', () => {
    const { output } = runListWorkflows();
    const lines = output.split('\n').filter((l) => l.trim() !== '');
    const sorted = [...lines].sort();
    assert.deepEqual(lines, sorted, 'ids should be in sorted order');
  });
});
