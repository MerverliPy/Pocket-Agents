import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runAgentRun } from '../../src/cli/agent-run.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Point at the real example agents directory so CLI tests exercise full path
const AGENTS_DIR = resolve(__dirname, '..', '..', 'src', 'examples', 'agents');

describe('runAgentRun()', () => {
  describe('missing agentId', () => {
    it('returns an error when agentId is undefined', async () => {
      const { output, error } = await runAgentRun(undefined, '{}', { agentsDir: AGENTS_DIR });
      assert.equal(output, '');
      assert.ok(error.includes('Usage'));
    });
  });

  describe('missing --input', () => {
    it('returns an error when inputJson is undefined', async () => {
      const { output, error } = await runAgentRun('echo-agent', undefined, { agentsDir: AGENTS_DIR });
      assert.equal(output, '');
      assert.ok(error.includes('--input'));
    });
  });

  describe('invalid JSON input', () => {
    it('returns an error for malformed JSON', async () => {
      const { output, error } = await runAgentRun('echo-agent', 'not-json', { agentsDir: AGENTS_DIR });
      assert.equal(output, '');
      assert.ok(error.includes('not valid JSON'));
    });
  });

  describe('echo-agent success', () => {
    it('returns JSON output for a valid echo-agent run', async () => {
      const inputJson = JSON.stringify({ message: 'hello from cli test' });
      const { output, error } = await runAgentRun('echo-agent', inputJson, { agentsDir: AGENTS_DIR });
      assert.equal(error, null);
      const parsed = JSON.parse(output);
      assert.equal(parsed.message, 'hello from cli test');
    });
  });

  describe('api-transform success', () => {
    it('transforms fields using mapping rules', async () => {
      const inputJson = JSON.stringify({
        data:    { firstName: 'Alice', age: 30 },
        mapping: [{ from: 'firstName', to: 'name' }],
      });
      const { output, error } = await runAgentRun('api-transform', inputJson, { agentsDir: AGENTS_DIR });
      assert.equal(error, null);
      const parsed = JSON.parse(output);
      assert.deepEqual(parsed.transformed, { name: 'Alice' });
      assert.equal(parsed.appliedRules, 1);
    });
  });

  describe('unknown agent', () => {
    it('returns an error when agent is not registered', async () => {
      const { output, error } = await runAgentRun('no-such-agent', '{}', { agentsDir: AGENTS_DIR });
      assert.equal(output, '');
      assert.ok(error, 'Should have an error');
    });
  });

  describe('invalid input schema', () => {
    it('returns an error when input does not match agent schema', async () => {
      const inputJson = JSON.stringify({ wrong: 'field' }); // echo-agent needs { message }
      const { output, error } = await runAgentRun('echo-agent', inputJson, { agentsDir: AGENTS_DIR });
      assert.equal(output, '');
      assert.ok(error.includes('failed'));
    });
  });
});
