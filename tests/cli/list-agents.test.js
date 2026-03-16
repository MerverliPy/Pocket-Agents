/**
 * Tests for src/cli/list-agents.js
 * TDD: written before implementation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runListAgents } from '../../src/cli/list-agents.js';

describe('runListAgents', () => {
  it('returns an object with output property', () => {
    const result = runListAgents();
    assert.equal(typeof result, 'object');
    assert.ok('output' in result);
    assert.equal(typeof result.output, 'string');
  });

  it('output is non-empty', () => {
    const { output } = runListAgents();
    assert.ok(output.length > 0);
  });

  it('output contains echo-agent id', () => {
    const { output } = runListAgents();
    assert.ok(output.includes('echo-agent'), `output should include echo-agent, got: ${output}`);
  });

  it('output has one id per line', () => {
    const { output } = runListAgents();
    const lines = output.split('\n').filter((l) => l.trim() !== '');
    assert.ok(lines.length >= 1);
    for (const line of lines) {
      assert.match(line, /^[a-z][a-z0-9-]*$/, `each line should be a valid agent id, got: ${line}`);
    }
  });

  it('all lines are registered agent ids in sorted order', () => {
    const { output } = runListAgents();
    const lines = output.split('\n').filter((l) => l.trim() !== '');
    const sorted = [...lines].sort();
    assert.deepEqual(lines, sorted, 'ids should be in sorted order');
  });
});
