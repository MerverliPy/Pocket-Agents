/**
 * Tests for the tool executor.
 *
 * The executor is tested with a lightweight mock tool so that the unit tests
 * are isolated from any specific built-in tool behaviour.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { executeTool } from '../../src/tools/executor.js';
import { createEventBus, subscribeAll } from '../../src/events/event-bus.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal valid tool that upper-cases the input value. */
const MOCK_TOOL = Object.freeze({
  manifest: Object.freeze({
    id: 'mock-tool',
    version: '1.0.0',
    description: 'Test tool for unit testing',
    inputSchema: {
      type: 'object',
      properties: { value: { type: 'string' } },
      required: ['value'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: { result: { type: 'string' } },
      required: ['result'],
      additionalProperties: false,
    },
  }),
  requiredPermissions: [],
  run: async (input) => ({ result: input.value.toUpperCase() }),
});

/** A mock tool that requires allowShell permission. */
const SHELL_MOCK_TOOL = Object.freeze({
  ...MOCK_TOOL,
  manifest: { ...MOCK_TOOL.manifest, id: 'shell-mock' },
  requiredPermissions: ['allowShell'],
});

/** A mock tool whose run() always throws. */
const FAILING_TOOL = Object.freeze({
  ...MOCK_TOOL,
  manifest: { ...MOCK_TOOL.manifest, id: 'failing-tool' },
  run: async () => { throw new Error('tool run failed'); },
});

/** A mock tool that returns output violating outputSchema. */
const BAD_OUTPUT_TOOL = Object.freeze({
  ...MOCK_TOOL,
  manifest: { ...MOCK_TOOL.manifest, id: 'bad-output-tool' },
  run: async () => ({ wrong_field: 123 }), // missing 'result'
});

/**
 * Create a minimal execution context.
 * @param {object} [configOverrides]
 */
function makeContext(configOverrides = {}) {
  const eventBus = createEventBus();
  const emitted = [];
  let busWithSub = eventBus;
  ({ bus: busWithSub } = subscribeAll(busWithSub, (e) => emitted.push(e)));

  return {
    context: {
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
      eventBus: busWithSub,
      runId: 'test-run-001',
      stepId: null,
    },
    emitted,
  };
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('executeTool — happy path', () => {
  it('returns the tool output for valid input', async () => {
    const { context } = makeContext();
    const output = await executeTool(MOCK_TOOL, { value: 'hello' }, context);
    assert.deepEqual(output, { result: 'HELLO' });
  });

  it('emits tool.started before run', async () => {
    const { context, emitted } = makeContext();
    await executeTool(MOCK_TOOL, { value: 'x' }, context);
    assert.ok(emitted.some((e) => e.type === 'tool.started'));
  });

  it('emits tool.completed after successful run', async () => {
    const { context, emitted } = makeContext();
    await executeTool(MOCK_TOOL, { value: 'x' }, context);
    assert.ok(emitted.some((e) => e.type === 'tool.completed'));
  });

  it('does not emit tool.failed on success', async () => {
    const { context, emitted } = makeContext();
    await executeTool(MOCK_TOOL, { value: 'x' }, context);
    assert.ok(!emitted.some((e) => e.type === 'tool.failed'));
  });

  it('tool.started payload contains toolId and input', async () => {
    const { context, emitted } = makeContext();
    await executeTool(MOCK_TOOL, { value: 'y' }, context);
    const started = emitted.find((e) => e.type === 'tool.started');
    assert.equal(started.payload.toolId, 'mock-tool');
    assert.deepEqual(started.payload.input, { value: 'y' });
  });

  it('tool.completed payload contains toolId and durationMs', async () => {
    const { context, emitted } = makeContext();
    await executeTool(MOCK_TOOL, { value: 'z' }, context);
    const completed = emitted.find((e) => e.type === 'tool.completed');
    assert.equal(completed.payload.toolId, 'mock-tool');
    assert.equal(typeof completed.payload.durationMs, 'number');
    assert.ok(completed.payload.durationMs >= 0);
  });

  it('works when eventBus is null (no events emitted, no throw)', async () => {
    const { context } = makeContext();
    const contextNobus = { ...context, eventBus: null };
    const output = await executeTool(MOCK_TOOL, { value: 'no-bus' }, contextNobus);
    assert.deepEqual(output, { result: 'NO-BUS' });
  });

  it('event records carry the runId from context', async () => {
    const { context, emitted } = makeContext();
    await executeTool(MOCK_TOOL, { value: 'r' }, context);
    const started = emitted.find((e) => e.type === 'tool.started');
    assert.equal(started.runId, 'test-run-001');
  });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe('executeTool — input validation', () => {
  it('throws with code tool.input_invalid for invalid input', async () => {
    const { context } = makeContext();
    await assert.rejects(
      () => executeTool(MOCK_TOOL, { value: 42 }, context), // value should be string
      (err) => {
        assert.equal(err.code, 'tool.input_invalid');
        assert.ok(Array.isArray(err.errors));
        return true;
      },
    );
  });

  it('throws when required input field is missing', async () => {
    const { context } = makeContext();
    await assert.rejects(
      () => executeTool(MOCK_TOOL, {}, context),
      (err) => err.code === 'tool.input_invalid',
    );
  });

  it('does NOT emit events when input validation fails (before run)', async () => {
    const { context, emitted } = makeContext();
    try { await executeTool(MOCK_TOOL, { value: 999 }, context); } catch { /* expected */ }
    assert.equal(emitted.length, 0, 'no events should be emitted for invalid input');
  });
});

// ---------------------------------------------------------------------------
// Permission checking
// ---------------------------------------------------------------------------

describe('executeTool — permission checking', () => {
  it('throws with code tool.permission_denied when required permission is false', async () => {
    const { context } = makeContext({ allowShell: false });
    await assert.rejects(
      () => executeTool(SHELL_MOCK_TOOL, { value: 'x' }, context),
      (err) => {
        assert.equal(err.code, 'tool.permission_denied');
        assert.equal(err.permission, 'allowShell');
        return true;
      },
    );
  });

  it('succeeds when required permission is true', async () => {
    const { context } = makeContext({ allowShell: true });
    const output = await executeTool(SHELL_MOCK_TOOL, { value: 'x' }, context);
    assert.deepEqual(output, { result: 'X' });
  });

  it('does not emit events when permission check fails', async () => {
    const { context, emitted } = makeContext({ allowShell: false });
    try { await executeTool(SHELL_MOCK_TOOL, { value: 'x' }, context); } catch { /* expected */ }
    assert.equal(emitted.length, 0, 'no events should be emitted for permission failure');
  });
});

// ---------------------------------------------------------------------------
// run() failure
// ---------------------------------------------------------------------------

describe('executeTool — run() failure', () => {
  it('re-throws when run() throws', async () => {
    const { context } = makeContext();
    await assert.rejects(
      () => executeTool(FAILING_TOOL, { value: 'x' }, context),
      /tool run failed/,
    );
  });

  it('emits tool.failed when run() throws', async () => {
    const { context, emitted } = makeContext();
    try { await executeTool(FAILING_TOOL, { value: 'x' }, context); } catch { /* expected */ }
    assert.ok(emitted.some((e) => e.type === 'tool.failed'));
    const failed = emitted.find((e) => e.type === 'tool.failed');
    assert.equal(failed.payload.toolId, 'failing-tool');
    assert.ok(typeof failed.payload.error === 'string');
  });

  it('emits tool.started before tool.failed', async () => {
    const { context, emitted } = makeContext();
    try { await executeTool(FAILING_TOOL, { value: 'x' }, context); } catch { /* expected */ }
    const types = emitted.map((e) => e.type);
    assert.ok(types.indexOf('tool.started') < types.indexOf('tool.failed'));
  });
});

// ---------------------------------------------------------------------------
// Output validation
// ---------------------------------------------------------------------------

describe('executeTool — output validation', () => {
  it('throws with code tool.output_invalid when output violates schema', async () => {
    const { context } = makeContext();
    await assert.rejects(
      () => executeTool(BAD_OUTPUT_TOOL, { value: 'x' }, context),
      (err) => err.code === 'tool.output_invalid',
    );
  });

  it('emits tool.failed when output is invalid', async () => {
    const { context, emitted } = makeContext();
    try { await executeTool(BAD_OUTPUT_TOOL, { value: 'x' }, context); } catch { /* expected */ }
    assert.ok(emitted.some((e) => e.type === 'tool.failed'));
  });
});
