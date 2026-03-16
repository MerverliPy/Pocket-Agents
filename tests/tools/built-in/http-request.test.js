/**
 * http-request tool tests.
 *
 * Actual HTTP calls are NOT made in unit tests. This suite covers:
 *   - Manifest validation
 *   - Permission checking (via the executor)
 *   - Input validation
 *
 * Integration tests requiring live HTTP are out of scope for V1 unit tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { manifest, requiredPermissions } from '../../../src/tools/built-in/http-request.js';
import { validateToolManifest } from '../../../src/core/validators/index.js';
import { executeTool } from '../../../src/tools/executor.js';
import * as httpRequest from '../../../src/tools/built-in/http-request.js';
import { createEventBus } from '../../../src/events/event-bus.js';

function makeContext(configOverrides = {}) {
  return {
    config: Object.freeze({
      allowShell: false,
      allowHttp: false,
      allowFileWrite: false,
      logLevel: 'error',
      defaultCommandTimeoutMs: 5000,
      ...configOverrides,
    }),
    logger: {
      info: () => {}, warn: () => {}, error: () => {}, debug: () => {},
      child() { return this; },
    },
    eventBus: createEventBus(),
    runId: 'test-http',
    stepId: null,
  };
}

describe('http-request — manifest', () => {
  it('validates against ToolManifest schema', () => {
    const { valid, errors } = validateToolManifest(manifest);
    assert.ok(valid, `invalid manifest: ${JSON.stringify(errors)}`);
  });

  it('id is http-request', () => {
    assert.equal(manifest.id, 'http-request');
  });

  it('requires allowHttp permission', () => {
    assert.ok(requiredPermissions.includes('allowHttp'));
  });

  it('inputSchema requires url', () => {
    assert.ok(manifest.inputSchema.required.includes('url'));
  });

  it('outputSchema requires status, headers, body', () => {
    assert.ok(manifest.outputSchema.required.includes('status'));
    assert.ok(manifest.outputSchema.required.includes('headers'));
    assert.ok(manifest.outputSchema.required.includes('body'));
  });
});

describe('http-request — permission check', () => {
  it('executor throws tool.permission_denied when allowHttp is false', async () => {
    const ctx = makeContext({ allowHttp: false });
    await assert.rejects(
      () => executeTool(httpRequest, { url: 'http://example.com' }, ctx),
      (err) => {
        assert.equal(err.code, 'tool.permission_denied');
        assert.equal(err.permission, 'allowHttp');
        return true;
      },
    );
  });
});
