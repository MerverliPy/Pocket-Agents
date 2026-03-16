import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../../src/runtime/index.js';
import { register } from '../../src/core/registry/agent-registry.js';
import { runAgent } from '../../src/runner/agent-runner.js';

// ---------------------------------------------------------------------------
// Test fixtures
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
  execute: async (envelope, _ctx) => ({ message: envelope.input.message }),
};

/**
 * Build a runtime with the echo agent registered.
 */
function buildRuntime(registryOverride) {
  const base = createRuntime();
  let agentReg = base.registries.agents;
  if (!registryOverride) {
    agentReg = register(agentReg, ECHO_MANIFEST);
  }
  return {
    config:     base.config,
    logger:     base.logger,
    eventBus:   base.eventBus,
    registries: {
      agents:    registryOverride ?? agentReg,
      tools:     base.registries.tools,
      workflows: base.registries.workflows,
    },
    stateStore: base.stateStore,
  };
}

/**
 * Minimal valid task envelope targeting echo-agent.
 */
function makeEnvelope(overrides = {}) {
  return {
    taskId:     'task-001',
    workflowId: 'test-workflow',
    runId:      'run-001',
    stepId:     'step-1',
    agentId:    'echo-agent',
    input:      { message: 'hello' },
    ...overrides,
  };
}

// Module loaders
const echoLoader = async (agentId) => {
  if (agentId === 'echo-agent') return ECHO_MODULE;
  throw new Error(`Unknown agent: ${agentId}`);
};

const failingLoader = async () => {
  throw new Error('Module load error');
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runAgent()', () => {
  describe('success path', () => {
    it('returns AgentResult with status=success', async () => {
      const runtime = buildRuntime();
      const result = await runAgent(makeEnvelope(), runtime, echoLoader);

      assert.equal(result.status, 'success');
      assert.equal(result.agentId, 'echo-agent');
      assert.equal(result.runId, 'run-001');
      assert.equal(result.taskId, 'task-001');
      assert.equal(result.error, null);
      assert.deepEqual(result.output, { message: 'hello' });
    });

    it('result has timing fields', async () => {
      const runtime = buildRuntime();
      const result = await runAgent(makeEnvelope(), runtime, echoLoader);

      assert.ok(typeof result.startedAt === 'string');
      assert.ok(typeof result.completedAt === 'string');
      assert.ok(typeof result.durationMs === 'number' && result.durationMs >= 0);
    });

    it('result is frozen', async () => {
      const runtime = buildRuntime();
      const result = await runAgent(makeEnvelope(), runtime, echoLoader);
      assert.ok(Object.isFrozen(result));
    });
  });

  describe('failure — invalid task envelope', () => {
    it('returns status=failed when envelope is missing required field', async () => {
      const runtime = buildRuntime();
      const badEnvelope = { taskId: 'x' }; // missing workflowId, runId, etc.
      const result = await runAgent(badEnvelope, runtime, echoLoader);

      assert.equal(result.status, 'failed');
      assert.ok(result.error.includes('Invalid task envelope'));
    });
  });

  describe('failure — agent not in registry', () => {
    it('returns status=failed with descriptive error', async () => {
      const runtime = buildRuntime(); // empty registry (agent not registered)
      const base = createRuntime();
      const emptyRuntime = {
        config:     base.config,
        logger:     base.logger,
        eventBus:   base.eventBus,
        registries: base.registries, // empty registries
        stateStore: base.stateStore,
      };

      const result = await runAgent(makeEnvelope(), emptyRuntime, echoLoader);
      assert.equal(result.status, 'failed');
      assert.ok(result.error.includes('Agent not found'));
    });
  });

  describe('failure — module load error', () => {
    it('returns status=failed when loadAgentModule throws', async () => {
      const runtime = buildRuntime();
      const result = await runAgent(makeEnvelope(), runtime, failingLoader);

      assert.equal(result.status, 'failed');
      assert.ok(result.error.includes('Failed to load agent module'));
    });
  });

  describe('failure — module missing execute()', () => {
    it('returns status=failed when module has no execute()', async () => {
      const runtime = buildRuntime();
      const noExecLoader = async () => ({ manifest: ECHO_MANIFEST }); // no execute
      const result = await runAgent(makeEnvelope(), runtime, noExecLoader);

      assert.equal(result.status, 'failed');
      assert.ok(result.error.includes('does not export an execute() function'));
    });
  });

  describe('failure — invalid input', () => {
    it('returns status=failed when input does not match inputSchema', async () => {
      const runtime = buildRuntime();
      const envelope = makeEnvelope({ input: { message: 123 } }); // message must be string
      const result = await runAgent(envelope, runtime, echoLoader);

      assert.equal(result.status, 'failed');
      assert.ok(result.error.includes('invalid input'));
    });
  });

  describe('failure — execute() throws', () => {
    it('returns status=failed when execute() throws', async () => {
      const runtime = buildRuntime();
      const throwingLoader = async () => ({
        manifest: ECHO_MANIFEST,
        execute: async () => { throw new Error('boom'); },
      });

      const result = await runAgent(makeEnvelope(), runtime, throwingLoader);
      assert.equal(result.status, 'failed');
      assert.ok(result.error.includes('execute() threw'));
      assert.ok(result.error.includes('boom'));
    });
  });

  describe('failure — invalid output', () => {
    it('returns status=failed when execute() returns wrong shape', async () => {
      const runtime = buildRuntime();
      const badOutputLoader = async () => ({
        manifest: ECHO_MANIFEST,
        execute: async () => ({ wrongField: 'oops' }), // missing 'message'
      });

      const result = await runAgent(makeEnvelope(), runtime, badOutputLoader);
      assert.equal(result.status, 'failed');
      assert.ok(result.error.includes('invalid output'));
    });
  });

  describe('guard — loadAgentModule not a function', () => {
    it('throws synchronously when loadAgentModule is missing', async () => {
      const runtime = buildRuntime();
      await assert.rejects(
        () => runAgent(makeEnvelope(), runtime, null),
        /loadAgentModule must be a function/
      );
    });
  });

  describe('lifecycle events', () => {
    it('emits agent.started and agent.completed on success', async () => {
      const { createEventBus, subscribe } = await import('../../src/events/event-bus.js');
      const events = [];
      const base = createRuntime();
      let bus = base.eventBus;
      ({ bus } = subscribe(bus, 'agent.started', (e) => events.push(e.type)));
      ({ bus } = subscribe(bus, 'agent.completed', (e) => events.push(e.type)));

      let agentReg = base.registries.agents;
      agentReg = register(agentReg, ECHO_MANIFEST);

      const runtime = {
        config:     base.config,
        logger:     base.logger,
        eventBus:   bus,
        registries: { agents: agentReg, tools: base.registries.tools, workflows: base.registries.workflows },
        stateStore: base.stateStore,
      };

      await runAgent(makeEnvelope(), runtime, echoLoader);
      assert.ok(events.includes('agent.started'));
      assert.ok(events.includes('agent.completed'));
    });

    it('emits agent.failed on error', async () => {
      const { createEventBus, subscribe } = await import('../../src/events/event-bus.js');
      const events = [];
      const base = createRuntime();
      let bus = base.eventBus;
      ({ bus } = subscribe(bus, 'agent.failed', (e) => events.push(e.type)));

      let agentReg = base.registries.agents;
      agentReg = register(agentReg, ECHO_MANIFEST);

      const runtime = {
        config:     base.config,
        logger:     base.logger,
        eventBus:   bus,
        registries: { agents: agentReg, tools: base.registries.tools, workflows: base.registries.workflows },
        stateStore: base.stateStore,
      };

      await runAgent(makeEnvelope(), runtime, failingLoader);
      assert.ok(events.includes('agent.failed'));
    });
  });
});
