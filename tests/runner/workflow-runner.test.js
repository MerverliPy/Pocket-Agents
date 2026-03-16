/**
 * workflow-runner.test.js — Tests for the sequential workflow execution engine.
 *
 * Uses stub loaders and inline manifests to avoid file system dependencies.
 * Follows the same patterns as agent-runner.test.js.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../../src/runtime/index.js';
import { register as registerAgent } from '../../src/core/registry/agent-registry.js';
import { register as registerWorkflow } from '../../src/core/registry/workflow-registry.js';
import { runWorkflow } from '../../src/runner/workflow-runner.js';
import { validateRunResult } from '../../src/core/validators/index.js';
import { subscribe } from '../../src/events/event-bus.js';

// ---------------------------------------------------------------------------
// Fixtures — agent manifests and modules
// ---------------------------------------------------------------------------

const ECHO_MANIFEST = Object.freeze({
  id: 'echo-agent',
  version: '1.0.0',
  description: 'Echoes input back as output',
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
});

const ECHO_MODULE = {
  manifest: ECHO_MANIFEST,
  execute: async (envelope) => ({ message: envelope.input.message }),
};

const FAIL_MANIFEST = Object.freeze({
  id: 'fail-agent',
  version: '1.0.0',
  description: 'Always throws',
  inputSchema: { type: 'object', additionalProperties: true },
  outputSchema: { type: 'object', additionalProperties: true },
});

const FAIL_MODULE = {
  manifest: FAIL_MANIFEST,
  execute: async () => { throw new Error('deliberate failure'); },
};

// ---------------------------------------------------------------------------
// Fixtures — workflow manifests
// ---------------------------------------------------------------------------

const SINGLE_STEP_WORKFLOW = Object.freeze({
  id: 'single-step',
  version: '1.0.0',
  description: 'One agent step',
  steps: [
    Object.freeze({
      id: 'echo-step',
      type: 'agent',
      ref: 'echo-agent',
      inputMapping: { message: 'input.message' },
      outputKey: 'echoResult',
    }),
  ],
});

const TWO_STEP_WORKFLOW = Object.freeze({
  id: 'two-step',
  version: '1.0.0',
  description: 'Two agent steps chained',
  steps: [
    Object.freeze({
      id: 'step1',
      type: 'agent',
      ref: 'echo-agent',
      inputMapping: { message: 'input.message' },
      outputKey: 'step1Result',
    }),
    Object.freeze({
      id: 'step2',
      type: 'agent',
      ref: 'echo-agent',
      inputMapping: { message: 'steps.step1.message' },
      outputKey: 'step2Result',
    }),
  ],
});

const TRANSFORM_WORKFLOW = Object.freeze({
  id: 'transform-workflow',
  version: '1.0.0',
  description: 'Agent step followed by transform and output',
  steps: [
    Object.freeze({
      id: 'echo',
      type: 'agent',
      ref: 'echo-agent',
      inputMapping: { message: 'input.message' },
    }),
    Object.freeze({
      id: 'enrich',
      type: 'transform',
      inputMapping: { text: 'steps.echo.message', extra: 'input.extra' },
    }),
    Object.freeze({
      id: 'final',
      type: 'output',
      inputMapping: { result: 'steps.enrich.text' },
    }),
  ],
});

const FAIL_FAST_WORKFLOW = Object.freeze({
  id: 'fail-fast',
  version: '1.0.0',
  description: 'Second step fails; fail-fast stops workflow',
  steps: [
    Object.freeze({
      id: 'step1',
      type: 'agent',
      ref: 'echo-agent',
      inputMapping: { message: 'input.message' },
    }),
    Object.freeze({
      id: 'step2',
      type: 'agent',
      ref: 'fail-agent',
      inputMapping: {},
    }),
    Object.freeze({
      id: 'step3',
      type: 'agent',
      ref: 'echo-agent',
      inputMapping: { message: 'input.message' },
    }),
  ],
});

const CONTINUE_ON_ERROR_WORKFLOW = Object.freeze({
  id: 'continue-on-error',
  version: '1.0.0',
  description: 'Step fails with onError=continue; workflow continues',
  steps: [
    Object.freeze({
      id: 'step1',
      type: 'agent',
      ref: 'fail-agent',
      inputMapping: {},
      onError: 'continue',
    }),
    Object.freeze({
      id: 'step2',
      type: 'agent',
      ref: 'echo-agent',
      inputMapping: { message: 'input.message' },
    }),
  ],
});

const EMPTY_STEPS_WORKFLOW = Object.freeze({
  id: 'empty-steps',
  version: '1.0.0',
  description: 'Zero steps',
  steps: [],
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a runtime with the given agents and workflows registered.
 */
function buildRuntime({ agents = [], workflows = [] } = {}) {
  const base = createRuntime();
  let agentReg = base.registries.agents;
  let workflowReg = base.registries.workflows;

  for (const m of agents) {
    agentReg = registerAgent(agentReg, m);
  }
  for (const m of workflows) {
    workflowReg = registerWorkflow(workflowReg, m);
  }

  return {
    config:     base.config,
    logger:     base.logger,
    eventBus:   base.eventBus,
    registries: { agents: agentReg, tools: base.registries.tools, workflows: workflowReg },
    stateStore: base.stateStore,
  };
}

/**
 * Stub module loader — maps agentId → module object synchronously.
 */
function makeLoader(moduleMap) {
  return async (agentId) => {
    if (moduleMap.has(agentId)) return moduleMap.get(agentId);
    throw new Error(`No module for agentId "${agentId}"`);
  };
}

const DEFAULT_LOADER = makeLoader(new Map([
  ['echo-agent', ECHO_MODULE],
  ['fail-agent', FAIL_MODULE],
]));

// ---------------------------------------------------------------------------
// Tests: runWorkflow — success paths
// ---------------------------------------------------------------------------

describe('runWorkflow — success paths', () => {
  it('executes a single agent step and returns success RunResult', async () => {
    const runtime = buildRuntime({
      agents: [ECHO_MANIFEST],
      workflows: [SINGLE_STEP_WORKFLOW],
    });

    const result = await runWorkflow(runtime, 'single-step', { message: 'hello' }, DEFAULT_LOADER);

    assert.equal(result.workflowId, 'single-step');
    assert.ok(typeof result.runId === 'string' && result.runId.length > 0);
    assert.equal(result.status, 'success');
    assert.ok(result.startedAt);
    assert.ok(result.completedAt);
    assert.equal(result.steps.length, 1);
    assert.equal(result.steps[0].stepId, 'echo-step');
    assert.equal(result.steps[0].status, 'success');
    assert.deepEqual(result.steps[0].output, { message: 'hello' });
    assert.equal(result.steps[0].error, null);
    assert.ok(result.steps[0].durationMs >= 0);
    assert.deepEqual(result.finalOutput, { message: 'hello' });
  });

  it('chains step outputs — second step receives first step output via inputMapping', async () => {
    const runtime = buildRuntime({
      agents: [ECHO_MANIFEST],
      workflows: [TWO_STEP_WORKFLOW],
    });

    const result = await runWorkflow(runtime, 'two-step', { message: 'chain-test' }, DEFAULT_LOADER);

    assert.equal(result.status, 'success');
    assert.equal(result.steps.length, 2);
    assert.deepEqual(result.steps[1].output, { message: 'chain-test' });
    assert.deepEqual(result.finalOutput, { message: 'chain-test' });
  });

  it('executes transform and output step types without calling runAgent', async () => {
    const runtime = buildRuntime({
      agents: [ECHO_MANIFEST],
      workflows: [TRANSFORM_WORKFLOW],
    });

    const result = await runWorkflow(
      runtime,
      'transform-workflow',
      { message: 'hi', extra: 'bonus' },
      DEFAULT_LOADER,
    );

    assert.equal(result.status, 'success');
    assert.equal(result.steps.length, 3);
    assert.deepEqual(result.steps[1].output, { text: 'hi', extra: 'bonus' });
    assert.deepEqual(result.steps[2].output, { result: 'hi' });
    assert.deepEqual(result.finalOutput, { result: 'hi' });
  });

  it('returns success for a workflow with zero steps', async () => {
    const runtime = buildRuntime({ workflows: [EMPTY_STEPS_WORKFLOW] });

    const result = await runWorkflow(runtime, 'empty-steps', {}, DEFAULT_LOADER);

    assert.equal(result.status, 'success');
    assert.equal(result.steps.length, 0);
    assert.equal(result.finalOutput, null);
  });
});

// ---------------------------------------------------------------------------
// Tests: runWorkflow — failure paths
// ---------------------------------------------------------------------------

describe('runWorkflow — failure paths', () => {
  it('returns failed RunResult when workflow is not registered', async () => {
    const runtime = buildRuntime();

    const result = await runWorkflow(runtime, 'nonexistent', {}, DEFAULT_LOADER);

    assert.equal(result.workflowId, 'nonexistent');
    assert.equal(result.status, 'failed');
    assert.equal(result.steps.length, 0);
    assert.equal(result.finalOutput, null);
  });

  it('stops at the failed step by default (onError=fail)', async () => {
    const runtime = buildRuntime({
      agents: [ECHO_MANIFEST, FAIL_MANIFEST],
      workflows: [FAIL_FAST_WORKFLOW],
    });

    const result = await runWorkflow(runtime, 'fail-fast', { message: 'test' }, DEFAULT_LOADER);

    assert.equal(result.status, 'failed');
    // step1 succeeded, step2 failed, step3 should NOT appear in results
    assert.equal(result.steps.length, 2);
    assert.equal(result.steps[0].stepId, 'step1');
    assert.equal(result.steps[0].status, 'success');
    assert.equal(result.steps[1].stepId, 'step2');
    assert.equal(result.steps[1].status, 'failed');
    assert.ok(result.steps[1].error);
  });

  it('continues after failed step when onError=continue and returns partial status', async () => {
    const runtime = buildRuntime({
      agents: [ECHO_MANIFEST, FAIL_MANIFEST],
      workflows: [CONTINUE_ON_ERROR_WORKFLOW],
    });

    const result = await runWorkflow(runtime, 'continue-on-error', { message: 'carry-on' }, DEFAULT_LOADER);

    assert.equal(result.status, 'partial');
    assert.equal(result.steps.length, 2);
    assert.equal(result.steps[0].stepId, 'step1');
    assert.equal(result.steps[0].status, 'failed');
    assert.equal(result.steps[1].stepId, 'step2');
    assert.equal(result.steps[1].status, 'success');
    assert.deepEqual(result.steps[1].output, { message: 'carry-on' });
  });

  it('times out a step that exceeds timeoutMs', async () => {
    const SLOW_MANIFEST = Object.freeze({
      id: 'slow-agent',
      version: '1.0.0',
      description: 'Slow agent for timeout testing',
      inputSchema: { type: 'object', additionalProperties: true },
      outputSchema: { type: 'object', additionalProperties: true },
    });

    // Use an explicit resolver so we can clean up the pending Promise after the
    // test completes — prevents "pending Promise" warnings in node:test.
    let resolveSlowExecute;
    const SLOW_MODULE = {
      manifest: SLOW_MANIFEST,
      execute: () => new Promise((resolve) => { resolveSlowExecute = resolve; }),
    };

    const TIMEOUT_WORKFLOW = Object.freeze({
      id: 'timeout-workflow',
      version: '1.0.0',
      description: 'Tests step timeout',
      steps: [
        Object.freeze({
          id: 'slow-step',
          type: 'agent',
          ref: 'slow-agent',
          inputMapping: {},
          timeoutMs: 50,
        }),
      ],
    });

    const loader = makeLoader(new Map([['slow-agent', SLOW_MODULE]]));
    const runtime = buildRuntime({
      agents: [SLOW_MANIFEST],
      workflows: [TIMEOUT_WORKFLOW],
    });

    const result = await runWorkflow(runtime, 'timeout-workflow', {}, loader);

    // Resolve the slow execute so runAgent can finish cleanly with no dangling Promises,
    // then drain the microtask queue before assertions so node:test sees no pending Promises.
    if (resolveSlowExecute) resolveSlowExecute({});
    await Promise.resolve(); // flush: execute() resolves → runAgent resumes
    await Promise.resolve(); // flush: runAgent output validation + buildResult

    assert.equal(result.status, 'failed');
    assert.equal(result.steps[0].status, 'failed');
    assert.ok(result.steps[0].error.includes('timed out'));
  });

  it('throws when loadAgentModule is not a function', async () => {
    const runtime = buildRuntime({ workflows: [SINGLE_STEP_WORKFLOW] });

    await assert.rejects(
      () => runWorkflow(runtime, 'single-step', {}, null),
      /loadAgentModule must be a function/,
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: RunResult shape
// ---------------------------------------------------------------------------

describe('runWorkflow — RunResult shape', () => {
  it('produces a RunResult with all required fields', async () => {
    const runtime = buildRuntime({
      agents: [ECHO_MANIFEST],
      workflows: [SINGLE_STEP_WORKFLOW],
    });

    const result = await runWorkflow(runtime, 'single-step', { message: 'x' }, DEFAULT_LOADER);

    // Check all required RunResult fields
    assert.ok(typeof result.workflowId === 'string');
    assert.ok(typeof result.runId === 'string');
    assert.ok(['success', 'partial', 'failed'].includes(result.status));
    assert.ok(typeof result.startedAt === 'string');
    assert.ok(typeof result.completedAt === 'string');
    assert.ok(Array.isArray(result.steps));
    assert.ok('finalOutput' in result);
  });

  it('RunResult passes validateRunResult schema check', async () => {
    const runtime = buildRuntime({
      agents: [ECHO_MANIFEST],
      workflows: [SINGLE_STEP_WORKFLOW],
    });

    const result = await runWorkflow(runtime, 'single-step', { message: 'validate-me' }, DEFAULT_LOADER);
    const validation = validateRunResult(result);

    assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  });
});

// ---------------------------------------------------------------------------
// Tests: event emission
// ---------------------------------------------------------------------------

describe('runWorkflow — event emission', () => {
  it('emits workflow.started and workflow.completed events', async () => {
    const runtime = buildRuntime({
      agents: [ECHO_MANIFEST],
      workflows: [SINGLE_STEP_WORKFLOW],
    });

    const emitted = [];
    const { bus: bus1, unsubscribe: unsub1 } = subscribe(
      runtime.eventBus,
      'workflow.started',
      (e) => emitted.push(e),
    );
    const { bus: bus2, unsubscribe: unsub2 } = subscribe(
      bus1,
      'workflow.completed',
      (e) => emitted.push(e),
    );

    // Use bus2 which has both subscriptions
    const runtimeWithBus = { ...runtime, eventBus: bus2 };

    await runWorkflow(runtimeWithBus, 'single-step', { message: 'events-test' }, DEFAULT_LOADER);

    const types = emitted.map((e) => e.type);
    assert.ok(types.includes('workflow.started'), 'workflow.started not emitted');
    assert.ok(types.includes('workflow.completed'), 'workflow.completed not emitted');

    unsub1(bus2);
    unsub2(bus2);
  });

  it('emits workflow.step.started and workflow.step.completed for each step', async () => {
    const runtime = buildRuntime({
      agents: [ECHO_MANIFEST],
      workflows: [TWO_STEP_WORKFLOW],
    });

    const stepStarted = [];
    const stepCompleted = [];
    const { bus: b1, unsubscribe: u1 } = subscribe(
      runtime.eventBus,
      'workflow.step.started',
      (e) => stepStarted.push(e),
    );
    const { bus: b2, unsubscribe: u2 } = subscribe(
      b1,
      'workflow.step.completed',
      (e) => stepCompleted.push(e),
    );

    const runtimeWithBus = { ...runtime, eventBus: b2 };

    await runWorkflow(runtimeWithBus, 'two-step', { message: 'x' }, DEFAULT_LOADER);

    assert.equal(stepStarted.length, 2);
    assert.equal(stepCompleted.length, 2);

    u1(b2);
    u2(b2);
  });

  it('emits workflow.failed when a step fails with default onError policy', async () => {
    const runtime = buildRuntime({
      agents: [ECHO_MANIFEST, FAIL_MANIFEST],
      workflows: [FAIL_FAST_WORKFLOW],
    });

    const failEvents = [];
    const { bus, unsubscribe } = subscribe(
      runtime.eventBus,
      'workflow.failed',
      (e) => failEvents.push(e),
    );

    const runtimeWithBus = { ...runtime, eventBus: bus };

    await runWorkflow(runtimeWithBus, 'fail-fast', { message: 'x' }, DEFAULT_LOADER);

    assert.equal(failEvents.length, 1);
    unsubscribe(bus);
  });
});

// ---------------------------------------------------------------------------
// Tests: input mapping
// ---------------------------------------------------------------------------

describe('runWorkflow — input mapping', () => {
  it('maps input.* paths from the top-level workflow input', async () => {
    const runtime = buildRuntime({
      agents: [ECHO_MANIFEST],
      workflows: [SINGLE_STEP_WORKFLOW],
    });

    const result = await runWorkflow(
      runtime,
      'single-step',
      { message: 'from-input' },
      DEFAULT_LOADER,
    );

    assert.deepEqual(result.steps[0].output, { message: 'from-input' });
  });

  it('maps steps.* paths from prior step outputs', async () => {
    const runtime = buildRuntime({
      agents: [ECHO_MANIFEST],
      workflows: [TWO_STEP_WORKFLOW],
    });

    const result = await runWorkflow(
      runtime,
      'two-step',
      { message: 'piped' },
      DEFAULT_LOADER,
    );

    // step2's input was mapped from step1's output
    assert.deepEqual(result.steps[1].output, { message: 'piped' });
  });

  it('produces empty object for transform step with no inputMapping', async () => {
    const NO_MAPPING_WORKFLOW = Object.freeze({
      id: 'no-mapping',
      version: '1.0.0',
      description: 'Transform with no inputMapping',
      steps: [
        Object.freeze({ id: 'xform', type: 'transform' }),
      ],
    });

    const runtime = buildRuntime({ workflows: [NO_MAPPING_WORKFLOW] });

    const result = await runWorkflow(runtime, 'no-mapping', {}, DEFAULT_LOADER);

    assert.equal(result.status, 'success');
    assert.deepEqual(result.steps[0].output, {});
  });
});
