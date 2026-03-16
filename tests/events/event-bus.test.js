import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEventBus,
  emit,
  subscribe,
  subscribeAll,
} from '../../src/events/event-bus.js';

// ---------------------------------------------------------------------------
// Minimal valid EventRecord for use across tests
// ---------------------------------------------------------------------------

/** @returns {object} A minimal valid EventRecord */
function makeEvent(overrides = {}) {
  return {
    type: 'agent.started',
    timestamp: '2026-03-16T00:00:00.000Z',
    runId: 'run-001',
    stepId: null,
    payload: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createEventBus
// ---------------------------------------------------------------------------

describe('createEventBus', () => {
  it('returns a frozen object', () => {
    const bus = createEventBus();
    assert.ok(Object.isFrozen(bus), 'bus should be frozen');
  });

  it('returns an object with a handlers Map', () => {
    const bus = createEventBus();
    assert.ok(bus.handlers instanceof Map, 'handlers should be a Map');
  });

  it('starts with an empty handlers Map', () => {
    const bus = createEventBus();
    assert.equal(bus.handlers.size, 0);
  });

  it('each call returns an independent bus', () => {
    const bus1 = createEventBus();
    const bus2 = createEventBus();
    assert.notEqual(bus1, bus2);
    assert.notEqual(bus1.handlers, bus2.handlers);
  });
});

// ---------------------------------------------------------------------------
// subscribe
// ---------------------------------------------------------------------------

describe('subscribe', () => {
  it('returns an object with { bus, unsubscribe }', () => {
    const bus = createEventBus();
    const result = subscribe(bus, 'agent.started', () => {});
    assert.ok('bus' in result, 'result should have bus');
    assert.ok('unsubscribe' in result, 'result should have unsubscribe');
    assert.equal(typeof result.unsubscribe, 'function');
  });

  it('returned bus is different from the input bus', () => {
    const bus = createEventBus();
    const { bus: newBus } = subscribe(bus, 'agent.started', () => {});
    assert.notEqual(newBus, bus);
  });

  it('returned bus is frozen', () => {
    const bus = createEventBus();
    const { bus: newBus } = subscribe(bus, 'agent.started', () => {});
    assert.ok(Object.isFrozen(newBus));
  });

  it('input bus is unchanged after subscribe', () => {
    const bus = createEventBus();
    subscribe(bus, 'agent.started', () => {});
    assert.equal(bus.handlers.size, 0, 'original bus should be unchanged');
  });

  it('returned bus has the handler registered for the type', () => {
    const bus = createEventBus();
    const handler = () => {};
    const { bus: newBus } = subscribe(bus, 'agent.started', handler);
    const handlers = newBus.handlers.get('agent.started');
    assert.ok(handlers instanceof Set);
    assert.ok(handlers.has(handler));
  });

  it('subscribing the same handler twice results in only one entry', () => {
    const bus = createEventBus();
    const handler = () => {};
    const { bus: bus2 } = subscribe(bus, 'agent.started', handler);
    const { bus: bus3 } = subscribe(bus2, 'agent.started', handler);
    const handlers = bus3.handlers.get('agent.started');
    assert.equal(handlers.size, 1, 'Set deduplicates duplicate handler references');
  });

  it('multiple different handlers for the same type are all registered', () => {
    const bus = createEventBus();
    const h1 = () => {};
    const h2 = () => {};
    const { bus: bus2 } = subscribe(bus, 'agent.started', h1);
    const { bus: bus3 } = subscribe(bus2, 'agent.started', h2);
    const handlers = bus3.handlers.get('agent.started');
    assert.equal(handlers.size, 2);
    assert.ok(handlers.has(h1));
    assert.ok(handlers.has(h2));
  });
});

// ---------------------------------------------------------------------------
// emit
// ---------------------------------------------------------------------------

describe('emit', () => {
  it('calls the handler registered for the event type', () => {
    const received = [];
    const bus = createEventBus();
    const { bus: bus2 } = subscribe(bus, 'agent.started', (e) => received.push(e));

    emit(bus2, makeEvent());

    assert.equal(received.length, 1);
    assert.equal(received[0].type, 'agent.started');
  });

  it('does not call handlers for other types', () => {
    const received = [];
    const bus = createEventBus();
    const { bus: bus2 } = subscribe(bus, 'agent.stopped', (e) => received.push(e));

    emit(bus2, makeEvent({ type: 'agent.started' }));

    assert.equal(received.length, 0);
  });

  it('calls all handlers for a type', () => {
    const calls = [];
    const bus = createEventBus();
    const { bus: bus2 } = subscribe(bus, 'agent.started', () => calls.push('h1'));
    const { bus: bus3 } = subscribe(bus2, 'agent.started', () => calls.push('h2'));

    emit(bus3, makeEvent());

    assert.deepEqual(calls, ['h1', 'h2']);
  });

  it('does not throw when there are no handlers for the type', () => {
    const bus = createEventBus();
    assert.doesNotThrow(() => emit(bus, makeEvent()));
  });

  it('throws when the event record is invalid (missing required field)', () => {
    const bus = createEventBus();
    assert.throws(
      () => emit(bus, { type: 'agent.started' }), // missing timestamp, runId, stepId, payload
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(Array.isArray(err.errors), 'err.errors should be an array');
        return true;
      },
    );
  });

  it('throws when event type does not match pattern', () => {
    const bus = createEventBus();
    assert.throws(() =>
      emit(bus, makeEvent({ type: 'INVALID_TYPE' })),
    );
  });

  it('passes the full event record to the handler', () => {
    let received = null;
    const bus = createEventBus();
    const { bus: bus2 } = subscribe(bus, 'workflow.completed', (e) => { received = e; });

    const evt = makeEvent({ type: 'workflow.completed', runId: 'run-xyz', payload: { result: 'ok' } });
    emit(bus2, evt);

    assert.equal(received.runId, 'run-xyz');
    assert.deepEqual(received.payload, { result: 'ok' });
  });
});

// ---------------------------------------------------------------------------
// subscribeAll (wildcard)
// ---------------------------------------------------------------------------

describe('subscribeAll', () => {
  it('wildcard handler receives events of any type', () => {
    const received = [];
    const bus = createEventBus();
    const { bus: bus2 } = subscribeAll(bus, (e) => received.push(e.type));

    emit(bus2, makeEvent({ type: 'agent.started' }));
    emit(bus2, makeEvent({ type: 'workflow.completed' }));

    assert.deepEqual(received, ['agent.started', 'workflow.completed']);
  });

  it('wildcard handler and type handler are both called', () => {
    const calls = [];
    let bus = createEventBus();
    ({ bus } = subscribe(bus, 'agent.started', () => calls.push('type-handler')));
    ({ bus } = subscribeAll(bus, () => calls.push('wildcard-handler')));

    emit(bus, makeEvent({ type: 'agent.started' }));

    assert.ok(calls.includes('type-handler'));
    assert.ok(calls.includes('wildcard-handler'));
    assert.equal(calls.length, 2);
  });
});

// ---------------------------------------------------------------------------
// unsubscribe
// ---------------------------------------------------------------------------

describe('unsubscribe', () => {
  it('returns a new bus without the handler', () => {
    const received = [];
    const bus = createEventBus();
    const { bus: bus2, unsubscribe } = subscribe(bus, 'agent.started', (e) => received.push(e));

    // Handler is active on bus2
    emit(bus2, makeEvent());
    assert.equal(received.length, 1);

    // After unsubscribe, handler is no longer active on bus3
    const bus3 = unsubscribe(bus2);
    emit(bus3, makeEvent());
    assert.equal(received.length, 1, 'handler should not be called after unsubscribe');
  });

  it('unsubscribe does not affect bus2 (immutability)', () => {
    const received = [];
    const bus = createEventBus();
    const { bus: bus2, unsubscribe } = subscribe(bus, 'agent.started', (e) => received.push(e));
    unsubscribe(bus2); // returns bus3, but bus2 is unchanged

    emit(bus2, makeEvent());
    assert.equal(received.length, 1, 'bus2 should still have the handler');
  });

  it('unsubscribe returns a frozen bus', () => {
    const bus = createEventBus();
    const { bus: bus2, unsubscribe } = subscribe(bus, 'agent.started', () => {});
    const bus3 = unsubscribe(bus2);
    assert.ok(Object.isFrozen(bus3));
  });
});
