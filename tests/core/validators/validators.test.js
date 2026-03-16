import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTaskEnvelope,
  validateAgentManifest,
  validateToolManifest,
  validateWorkflowManifest,
  validateEventRecord,
  validateRunResult,
} from '../../../src/core/validators/index.js';

// ---------------------------------------------------------------------------
// TaskEnvelope
// ---------------------------------------------------------------------------

describe('validateTaskEnvelope', () => {
  const valid = {
    taskId: 'task-001',
    workflowId: 'wf-echo',
    runId: 'run-abc123',
    stepId: 'step-1',
    agentId: 'echo-agent',
    input: { message: 'hello' },
  };

  it('accepts a valid TaskEnvelope', () => {
    const result = validateTaskEnvelope(valid);
    assert.equal(result.valid, true);
    assert.equal(result.errors, null);
  });

  it('accepts a TaskEnvelope with optional metadata', () => {
    const result = validateTaskEnvelope({ ...valid, metadata: { trace: 'x' } });
    assert.equal(result.valid, true);
  });

  it('accepts a TaskEnvelope where input is null', () => {
    const result = validateTaskEnvelope({ ...valid, input: null });
    assert.equal(result.valid, true);
  });

  it('rejects when required field taskId is missing', () => {
    const { taskId: _omit, ...data } = valid;
    const result = validateTaskEnvelope(data);
    assert.equal(result.valid, false);
    assert.ok(Array.isArray(result.errors));
  });

  it('rejects when required field input is missing', () => {
    const { input: _omit, ...data } = valid;
    const result = validateTaskEnvelope(data);
    assert.equal(result.valid, false);
  });

  it('rejects additional unknown properties', () => {
    const result = validateTaskEnvelope({ ...valid, unknownField: 'oops' });
    assert.equal(result.valid, false);
  });

  it('rejects when taskId is not a string', () => {
    const result = validateTaskEnvelope({ ...valid, taskId: 42 });
    assert.equal(result.valid, false);
  });
});

// ---------------------------------------------------------------------------
// AgentManifest
// ---------------------------------------------------------------------------

describe('validateAgentManifest', () => {
  const valid = {
    id: 'echo-agent',
    version: '1.0.0',
    description: 'An agent that echoes its input',
    inputSchema: { type: 'object', properties: { message: { type: 'string' } } },
    outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
  };

  it('accepts a valid AgentManifest', () => {
    const result = validateAgentManifest(valid);
    assert.equal(result.valid, true);
    assert.equal(result.errors, null);
  });

  it('accepts an AgentManifest with optional config', () => {
    const result = validateAgentManifest({ ...valid, config: { timeout: 5000 } });
    assert.equal(result.valid, true);
  });

  it('rejects an id with uppercase characters', () => {
    const result = validateAgentManifest({ ...valid, id: 'Echo-Agent' });
    assert.equal(result.valid, false);
  });

  it('rejects an invalid semver version', () => {
    const result = validateAgentManifest({ ...valid, version: '1.0' });
    assert.equal(result.valid, false);
  });

  it('rejects when description is missing', () => {
    const { description: _omit, ...data } = valid;
    const result = validateAgentManifest(data);
    assert.equal(result.valid, false);
  });

  it('rejects when inputSchema is not an object', () => {
    const result = validateAgentManifest({ ...valid, inputSchema: 'not-an-object' });
    assert.equal(result.valid, false);
  });

  it('rejects additional unknown properties', () => {
    const result = validateAgentManifest({ ...valid, extra: true });
    assert.equal(result.valid, false);
  });
});

// ---------------------------------------------------------------------------
// ToolManifest
// ---------------------------------------------------------------------------

describe('validateToolManifest', () => {
  const valid = {
    id: 'web-fetch',
    version: '0.2.1',
    description: 'Fetches the content of a URL',
    inputSchema: { type: 'object', properties: { url: { type: 'string' } } },
    outputSchema: { type: 'object', properties: { body: { type: 'string' } } },
  };

  it('accepts a valid ToolManifest', () => {
    const result = validateToolManifest(valid);
    assert.equal(result.valid, true);
    assert.equal(result.errors, null);
  });

  it('rejects when id is missing', () => {
    const { id: _omit, ...data } = valid;
    const result = validateToolManifest(data);
    assert.equal(result.valid, false);
  });

  it('rejects an invalid semver version', () => {
    const result = validateToolManifest({ ...valid, version: 'v1.2.3' });
    assert.equal(result.valid, false);
  });

  it('rejects when outputSchema is not an object', () => {
    const result = validateToolManifest({ ...valid, outputSchema: null });
    assert.equal(result.valid, false);
  });

  it('rejects additional unknown properties', () => {
    const result = validateToolManifest({ ...valid, config: {} });
    assert.equal(result.valid, false);
  });
});

// ---------------------------------------------------------------------------
// WorkflowManifest
// ---------------------------------------------------------------------------

describe('validateWorkflowManifest', () => {
  const valid = {
    id: 'echo-workflow',
    version: '1.0.0',
    description: 'Simple echo workflow',
    steps: [
      {
        stepId: 'step-1',
        agentId: 'echo-agent',
        toolIds: ['echo-tool'],
        outputKey: 'echoResult',
      },
    ],
  };

  it('accepts a valid WorkflowManifest', () => {
    const result = validateWorkflowManifest(valid);
    assert.equal(result.valid, true);
    assert.equal(result.errors, null);
  });

  it('accepts a WorkflowManifest with empty steps array', () => {
    const result = validateWorkflowManifest({ ...valid, steps: [] });
    assert.equal(result.valid, true);
  });

  it('accepts steps without optional toolIds, inputMapping, outputKey', () => {
    const result = validateWorkflowManifest({
      ...valid,
      steps: [{ stepId: 'step-1', agentId: 'echo-agent' }],
    });
    assert.equal(result.valid, true);
  });

  it('rejects when steps is missing', () => {
    const { steps: _omit, ...data } = valid;
    const result = validateWorkflowManifest(data);
    assert.equal(result.valid, false);
  });

  it('rejects a step missing agentId', () => {
    const result = validateWorkflowManifest({
      ...valid,
      steps: [{ stepId: 'step-1' }],
    });
    assert.equal(result.valid, false);
  });

  it('rejects an invalid semver version', () => {
    const result = validateWorkflowManifest({ ...valid, version: '1' });
    assert.equal(result.valid, false);
  });

  it('rejects additional unknown top-level properties', () => {
    const result = validateWorkflowManifest({ ...valid, author: 'test' });
    assert.equal(result.valid, false);
  });
});

// ---------------------------------------------------------------------------
// EventRecord
// ---------------------------------------------------------------------------

describe('validateEventRecord', () => {
  const valid = {
    type: 'agent.started',
    timestamp: '2026-03-16T12:00:00Z',
    runId: 'run-abc123',
    stepId: 'step-1',
    payload: { agentId: 'echo-agent' },
  };

  it('accepts a valid EventRecord', () => {
    const result = validateEventRecord(valid);
    assert.equal(result.valid, true);
    assert.equal(result.errors, null);
  });

  it('accepts stepId as null for run-level events', () => {
    const result = validateEventRecord({ ...valid, stepId: null });
    assert.equal(result.valid, true);
  });

  it('accepts an empty payload object', () => {
    const result = validateEventRecord({ ...valid, payload: {} });
    assert.equal(result.valid, true);
  });

  it('rejects a type without a dot separator', () => {
    const result = validateEventRecord({ ...valid, type: 'agentstarted' });
    assert.equal(result.valid, false);
  });

  it('rejects when timestamp is missing', () => {
    const { timestamp: _omit, ...data } = valid;
    const result = validateEventRecord(data);
    assert.equal(result.valid, false);
  });

  it('rejects when payload is not an object', () => {
    const result = validateEventRecord({ ...valid, payload: 'bad' });
    assert.equal(result.valid, false);
  });

  it('rejects additional unknown properties', () => {
    const result = validateEventRecord({ ...valid, source: 'runner' });
    assert.equal(result.valid, false);
  });
});

// ---------------------------------------------------------------------------
// RunResult
// ---------------------------------------------------------------------------

describe('validateRunResult', () => {
  const valid = {
    workflowId: 'echo-workflow',
    runId: 'run-abc123',
    status: 'success',
    startedAt: '2026-03-16T12:00:00Z',
    completedAt: '2026-03-16T12:00:01Z',
    steps: [
      {
        stepId: 'step-1',
        status: 'success',
        output: { result: 'hello' },
        error: null,
        durationMs: 42,
      },
    ],
    finalOutput: { result: 'hello' },
  };

  it('accepts a valid RunResult', () => {
    const result = validateRunResult(valid);
    assert.equal(result.valid, true);
    assert.equal(result.errors, null);
  });

  it('accepts a RunResult with empty steps', () => {
    const result = validateRunResult({ ...valid, steps: [], finalOutput: null });
    assert.equal(result.valid, true);
  });

  it('accepts status of partial', () => {
    const result = validateRunResult({ ...valid, status: 'partial' });
    assert.equal(result.valid, true);
  });

  it('accepts status of failed', () => {
    const result = validateRunResult({ ...valid, status: 'failed', finalOutput: null });
    assert.equal(result.valid, true);
  });

  it('rejects an invalid status value', () => {
    const result = validateRunResult({ ...valid, status: 'unknown' });
    assert.equal(result.valid, false);
  });

  it('rejects when runId is missing', () => {
    const { runId: _omit, ...data } = valid;
    const result = validateRunResult(data);
    assert.equal(result.valid, false);
  });

  it('rejects a step with invalid status', () => {
    const result = validateRunResult({
      ...valid,
      steps: [{ ...valid.steps[0], status: 'pending' }],
    });
    assert.equal(result.valid, false);
  });

  it('rejects a step with negative durationMs', () => {
    const result = validateRunResult({
      ...valid,
      steps: [{ ...valid.steps[0], durationMs: -1 }],
    });
    assert.equal(result.valid, false);
  });

  it('rejects additional unknown top-level properties', () => {
    const result = validateRunResult({ ...valid, extra: 'bad' });
    assert.equal(result.valid, false);
  });
});
