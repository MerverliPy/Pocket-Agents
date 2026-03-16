/**
 * workflow-run.test.js — Tests for the workflow:run CLI handler.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runWorkflowRun } from '../../src/cli/workflow-run.js';

// ---------------------------------------------------------------------------
// Stub loader helpers for tests
// ---------------------------------------------------------------------------

const ECHO_MODULE = {
  manifest: {
    id: 'echo-agent',
    version: '1.0.0',
    description: 'Echo',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
      additionalProperties: false,
    },
  },
  execute: async (envelope) => ({ message: envelope.input.message }),
};

// A simple workflow manifest to test with
const TEST_WORKFLOW = Object.freeze({
  id: 'test-workflow',
  version: '1.0.0',
  description: 'Workflow used in CLI handler tests',
  steps: [
    Object.freeze({
      id: 'echo',
      type: 'agent',
      ref: 'echo-agent',
      inputMapping: { message: 'input.message' },
    }),
  ],
});

// ---------------------------------------------------------------------------
// Tests: input validation
// ---------------------------------------------------------------------------

describe('runWorkflowRun — input validation', () => {
  it('returns error when workflowId is missing', async () => {
    const { output, error } = await runWorkflowRun(undefined, '{}');
    assert.ok(error);
    assert.ok(error.includes('Usage:'));
    assert.equal(output, '');
  });

  it('returns error when --input is not provided', async () => {
    const { output, error } = await runWorkflowRun('test-workflow', undefined);
    assert.ok(error);
    assert.ok(error.includes('--input'));
    assert.equal(output, '');
  });

  it('returns error when --input is not valid JSON', async () => {
    const { output, error } = await runWorkflowRun('test-workflow', 'not-json');
    assert.ok(error);
    assert.ok(error.toLowerCase().includes('json'));
    assert.equal(output, '');
  });
});

// ---------------------------------------------------------------------------
// Tests: successful execution
// ---------------------------------------------------------------------------

describe('runWorkflowRun — successful execution', () => {
  it('runs a workflow and returns JSON output', async () => {
    const { output, error } = await runWorkflowRun(
      'test-workflow',
      JSON.stringify({ message: 'hello-cli' }),
      {
        workflowManifests: [TEST_WORKFLOW],
        agentModules: new Map([['echo-agent', ECHO_MODULE]]),
        agentManifests: [ECHO_MODULE.manifest],
      },
    );

    assert.equal(error, null);
    assert.ok(output.length > 0);

    const parsed = JSON.parse(output);
    assert.equal(parsed.workflowId, 'test-workflow');
    assert.equal(parsed.status, 'success');
  });

  it('final output contains the last step output', async () => {
    const { output } = await runWorkflowRun(
      'test-workflow',
      JSON.stringify({ message: 'result-check' }),
      {
        workflowManifests: [TEST_WORKFLOW],
        agentModules: new Map([['echo-agent', ECHO_MODULE]]),
        agentManifests: [ECHO_MODULE.manifest],
      },
    );

    const parsed = JSON.parse(output);
    assert.deepEqual(parsed.finalOutput, { message: 'result-check' });
  });
});

// ---------------------------------------------------------------------------
// Tests: failure paths
// ---------------------------------------------------------------------------

describe('runWorkflowRun — failure paths', () => {
  it('returns error when workflow is not registered', async () => {
    const { output, error } = await runWorkflowRun(
      'nonexistent-workflow',
      '{}',
      {
        workflowManifests: [],
        agentModules: new Map(),
        agentManifests: [],
      },
    );

    assert.ok(error);
    assert.ok(error.includes('nonexistent-workflow') || error.includes('failed'));
    assert.equal(output, '');
  });

  it('returns error when a step fails', async () => {
    const FAIL_WORKFLOW = Object.freeze({
      id: 'fail-workflow',
      version: '1.0.0',
      description: 'Fails immediately',
      steps: [
        Object.freeze({
          id: 'bad-step',
          type: 'agent',
          ref: 'fail-agent',
          inputMapping: {},
        }),
      ],
    });

    const FAIL_MODULE = {
      manifest: {
        id: 'fail-agent',
        version: '1.0.0',
        description: 'Fails',
        inputSchema: { type: 'object', additionalProperties: true },
        outputSchema: { type: 'object', additionalProperties: true },
      },
      execute: async () => { throw new Error('step failure'); },
    };

    const { output, error } = await runWorkflowRun(
      'fail-workflow',
      '{}',
      {
        workflowManifests: [FAIL_WORKFLOW],
        agentModules: new Map([['fail-agent', FAIL_MODULE]]),
        agentManifests: [FAIL_MODULE.manifest],
      },
    );

    assert.ok(error);
    assert.equal(output, '');
  });
});
