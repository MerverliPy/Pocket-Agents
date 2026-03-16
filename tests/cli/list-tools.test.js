/**
 * Tests for src/cli/list-tools.js
 * TDD: written before implementation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runListTools } from '../../src/cli/list-tools.js';

describe('runListTools', () => {
  it('returns an object with output property', () => {
    const result = runListTools();
    assert.equal(typeof result, 'object');
    assert.ok('output' in result);
    assert.equal(typeof result.output, 'string');
  });

  it('output is non-empty', () => {
    const { output } = runListTools();
    assert.ok(output.length > 0);
  });

  it('output contains echo-tool id', () => {
    const { output } = runListTools();
    assert.ok(output.includes('echo-tool'), `output should include echo-tool, got: ${output}`);
  });

  it('output has one id per line', () => {
    const { output } = runListTools();
    const lines = output.split('\n').filter((l) => l.trim() !== '');
    assert.ok(lines.length >= 1);
    for (const line of lines) {
      assert.match(line, /^[a-z][a-z0-9-]*$/, `each line should be a valid tool id, got: ${line}`);
    }
  });

  it('all lines are registered tool ids in sorted order', () => {
    const { output } = runListTools();
    const lines = output.split('\n').filter((l) => l.trim() !== '');
    const sorted = [...lines].sort();
    assert.deepEqual(lines, sorted, 'ids should be in sorted order');
  });
});
