import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runConfigShow, formatConfigOutput } from '../../src/cli/config-show.js';
import { loadConfig } from '../../src/config/loader.js';

describe('runConfigShow', () => {
  it('returns an object with config and output', () => {
    const result = runConfigShow({ env: {} });
    assert.equal(typeof result, 'object');
    assert.ok('config' in result);
    assert.ok('output' in result);
  });

  it('config is a resolved PocketAgentsConfig', () => {
    const { config } = runConfigShow({ env: {} });
    assert.equal(config.frameworkName, 'pocket-agents');
    assert.equal(typeof config.logLevel, 'string');
  });

  it('output is a non-empty string', () => {
    const { output } = runConfigShow({ env: {} });
    assert.equal(typeof output, 'string');
    assert.ok(output.length > 0);
  });
});

describe('formatConfigOutput', () => {
  it('includes all config keys in the output', () => {
    const config = loadConfig({ env: {} });
    const output = formatConfigOutput(config);

    for (const key of Object.keys(config)) {
      assert.ok(output.includes(key), `output should include key "${key}"`);
    }
  });

  it('includes "Resolved configuration:" header', () => {
    const config = loadConfig({ env: {} });
    const output = formatConfigOutput(config);
    assert.ok(output.includes('Resolved configuration:'));
  });

  it('shows frameworkName value in output', () => {
    const config = loadConfig({ env: {} });
    const output = formatConfigOutput(config);
    assert.ok(output.includes('pocket-agents'));
  });

  it('shows logLevel value in output', () => {
    const config = loadConfig({ env: {}, overrides: { logLevel: 'debug' } });
    const output = formatConfigOutput(config);
    assert.ok(output.includes('debug'));
  });

  it('shows boolean values as true/false strings', () => {
    const config = loadConfig({ env: {} });
    const output = formatConfigOutput(config);
    assert.ok(output.includes('false'), 'should show false for disabled flags');
  });

  it('redacts values for secret-like key names', () => {
    // Inject a fake config with a secret-like key to test redaction
    // (none of the real keys are secrets — this tests the mechanism)
    const fakeConfig = { secretKey: 'hunter2', apiToken: 'abc123', logLevel: 'info' };
    const output = formatConfigOutput(fakeConfig);
    assert.ok(output.includes('[REDACTED]'), 'secret keys should be redacted');
    assert.ok(!output.includes('hunter2'), 'secret value should not be visible');
    assert.ok(!output.includes('abc123'), 'token value should not be visible');
    assert.ok(output.includes('info'), 'non-secret values should remain visible');
  });

  it('does not redact non-secret keys', () => {
    const config = loadConfig({ env: {}, overrides: { allowShell: true } });
    const output = formatConfigOutput(config);
    assert.ok(!output.includes('[REDACTED]'), 'no redaction expected for standard config keys');
  });

  it('shows workspaceRoot path in output', () => {
    const config = loadConfig({ env: {}, overrides: { workspaceRoot: '/test/root' } });
    const output = formatConfigOutput(config);
    assert.ok(output.includes('/test/root'));
  });
});
