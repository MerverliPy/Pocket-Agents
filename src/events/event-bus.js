/**
 * event-bus.js — Immutable in-process event bus for Pocket-Agents.
 *
 * Design principles:
 * - No Node.js EventEmitter — plain Map<type, Set<handler>>
 * - No mutation — every subscribe/unsubscribe returns a new bus object
 * - Validation — emit() validates the EventRecord against its JSON Schema
 * - Wildcard — subscribeAll() registers a handler for every event type
 *
 * Usage:
 *   let bus = createEventBus();
 *   let unsub;
 *   ({ bus, unsubscribe: unsub } = subscribe(bus, 'agent.started', handler));
 *   emit(bus, eventRecord);
 *   bus = unsub(bus);
 */

import { validateEventRecord } from '../core/validators/index.js';

/** Special type string used for wildcard (all-events) subscriptions. */
const WILDCARD = '*';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a frozen bus object from a handlers Map.
 *
 * @param {Map<string, Set<Function>>} handlers
 * @returns {Readonly<{ handlers: Map<string, Set<Function>> }>}
 */
function makeBus(handlers) {
  return Object.freeze({ handlers });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new, empty event bus.
 *
 * @returns {Readonly<{ handlers: Map<string, Set<Function>> }>}
 */
export function createEventBus() {
  return makeBus(new Map());
}

/**
 * Subscribe a handler to a specific event type.
 *
 * Returns a new bus with the handler registered and an `unsubscribe` function.
 * The `unsubscribe` function accepts the *current* bus and returns a new bus
 * without this handler. This is necessary because the bus may have changed
 * since this subscribe call.
 *
 * @param {Readonly<{ handlers: Map }>} bus
 * @param {string}   type     - Dot-separated event type (e.g. 'agent.started')
 * @param {Function} handler  - Called with the full EventRecord
 * @returns {{ bus: Readonly<{ handlers: Map }>, unsubscribe: Function }}
 */
export function subscribe(bus, type, handler) {
  const existing = bus.handlers.get(type) ?? new Set();
  const newSet = new Set([...existing, handler]);
  const newHandlers = new Map([...bus.handlers, [type, newSet]]);
  const newBus = makeBus(newHandlers);

  /**
   * Remove this handler from the given bus. Returns a new bus.
   *
   * @param {Readonly<{ handlers: Map }>} currentBus
   * @returns {Readonly<{ handlers: Map }>}
   */
  function unsubscribe(currentBus) {
    const curr = currentBus.handlers.get(type) ?? new Set();
    const updated = new Set([...curr].filter((h) => h !== handler));
    const updatedHandlers = new Map([...currentBus.handlers, [type, updated]]);
    return makeBus(updatedHandlers);
  }

  return { bus: newBus, unsubscribe };
}

/**
 * Subscribe a handler to all event types (wildcard).
 *
 * Equivalent to `subscribe(bus, '*', handler)`.
 *
 * @param {Readonly<{ handlers: Map }>} bus
 * @param {Function} handler
 * @returns {{ bus: Readonly<{ handlers: Map }>, unsubscribe: Function }}
 */
export function subscribeAll(bus, handler) {
  return subscribe(bus, WILDCARD, handler);
}

/**
 * Dispatch an event record to all matching subscribers.
 *
 * Validates the record against the EventRecord schema before dispatching.
 * Throws if the record is invalid. Calls type-specific handlers first, then
 * wildcard handlers.
 *
 * @param {Readonly<{ handlers: Map }>} bus
 * @param {object} eventRecord - Must conform to event-record.schema.json
 * @throws {Error} with `.errors` array when the record fails validation
 */
export function emit(bus, eventRecord) {
  const result = validateEventRecord(eventRecord);
  if (!result.valid) {
    const err = new Error('[pocket-agents] emit: invalid EventRecord');
    err.errors = result.errors;
    throw err;
  }

  // Type-specific handlers
  const typeHandlers = bus.handlers.get(eventRecord.type) ?? new Set();
  for (const handler of typeHandlers) {
    handler(eventRecord);
  }

  // Wildcard handlers
  const wildcardHandlers = bus.handlers.get(WILDCARD) ?? new Set();
  for (const handler of wildcardHandlers) {
    handler(eventRecord);
  }
}
