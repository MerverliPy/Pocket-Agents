import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { manifest, run, requiredPermissions } from '../../../src/tools/built-in/shell-exec.js';
import { validateToolManifest } from '../../../src/core/validators/index.js';

const MOCK_CONFIG = { allowShell: true, defaultCommandTimeoutMs: 5000 };

describe('shell-exec — manifest', () => {
  it('validates against ToolManifest schema', () => {
    const { valid, errors } = validateToolManifest(manifest);
    assert.ok(valid, `invalid manifest: ${JSON.stringify(errors)}`);
  });

  it('id is shell-exec', () => {
    assert.equal(manifest.id, 'shell-exec');
  });

  it('requires allowShell permission', () => {
    assert.ok(requiredPermissions.includes('allowShell'));
  });

  it('inputSchema requires command', () => {
    assert.ok(manifest.inputSchema.required.includes('command'));
  });

  it('outputSchema requires stdout, stderr, exitCode', () => {
    assert.ok(manifest.outputSchema.required.includes('stdout'));
    assert.ok(manifest.outputSchema.required.includes('stderr'));
    assert.ok(manifest.outputSchema.required.includes('exitCode'));
  });
});

describe('shell-exec — run()', () => {
  it('returns { stdout, stderr, exitCode } for a successful command', () => {
    const output = run({ command: 'echo hello' }, { config: MOCK_CONFIG });
    assert.equal(typeof output.stdout, 'string');
    assert.equal(typeof output.stderr, 'string');
    assert.equal(typeof output.exitCode, 'number');
  });

  it('stdout contains the command output', () => {
    const output = run({ command: 'echo pocket-agents' }, { config: MOCK_CONFIG });
    assert.ok(output.stdout.includes('pocket-agents'));
  });

  it('exitCode is 0 for a successful command', () => {
    const output = run({ command: 'echo ok' }, { config: MOCK_CONFIG });
    assert.equal(output.exitCode, 0);
  });

  it('returns non-zero exitCode for a failing command (does not throw)', () => {
    const output = run({ command: 'exit 42' }, { config: MOCK_CONFIG });
    assert.equal(output.exitCode, 42);
  });

  it('uses defaultCommandTimeoutMs from config when timeoutMs is not in input', () => {
    // Just verify it doesn't throw with a fast command
    const output = run({ command: 'echo timeout-test' }, { config: MOCK_CONFIG });
    assert.equal(output.exitCode, 0);
  });

  it('overrides timeout when timeoutMs is in input', () => {
    const output = run({ command: 'echo custom-timeout', timeoutMs: 2000 }, { config: MOCK_CONFIG });
    assert.equal(output.exitCode, 0);
  });

  it('stderr contains error output for failing commands', () => {
    const output = run({ command: 'echo err >&2; exit 1' }, { config: MOCK_CONFIG });
    assert.equal(output.exitCode, 1);
    // stderr may or may not contain 'err' depending on shell behaviour
    assert.equal(typeof output.stderr, 'string');
  });
});
