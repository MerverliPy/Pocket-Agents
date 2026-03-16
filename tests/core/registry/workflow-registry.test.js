/**
 * Tests for src/core/registry/workflow-registry.js
 * TDD: written before implementation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorkflowRegistry,
  register,
  get,
  has,
  list,
} from '../../../src/core/registry/workflow-registry.js';

// ---------------------------------------------------------------------------
// Minimal valid manifests for testing
// ---------------------------------------------------------------------------

const VALID_MANIFEST = Object.freeze({
  id: 'hello-workflow',
  version: '1.0.0',
  description: 'A simple hello workflow',
  steps: [
    {
      id: 'step-1',
      type: 'agent',
      ref: 'echo-agent',
    },
  ],
});

const ANOTHER_MANIFEST = Object.freeze({
  id: 'another-workflow',
  version: '2.0.0',
  description: 'Another test workflow',
  steps: [],
});

// ---------------------------------------------------------------------------
// createWorkflowRegistry
// ---------------------------------------------------------------------------

describe('createWorkflowRegistry', () => {
  it('returns an object', () => {
    const registry = createWorkflowRegistry();
    assert.equal(typeof registry, 'object');
    assert.ok(registry !== null);
  });

  it('returns a frozen object', () => {
    const registry = createWorkflowRegistry();
    assert.ok(Object.isFrozen(registry));
  });

  it('starts empty — list returns empty array', () => {
    const registry = createWorkflowRegistry();
    assert.deepEqual(list(registry), []);
  });
});

// ---------------------------------------------------------------------------
// has
// ---------------------------------------------------------------------------

describe('has (workflow)', () => {
  it('returns false for unknown id', () => {
    const registry = createWorkflowRegistry();
    assert.equal(has(registry, 'no-such-workflow'), false);
  });

  it('returns true after registering a workflow', () => {
    const registry = createWorkflowRegistry();
    const updated = register(registry, VALID_MANIFEST);
    assert.equal(has(updated, 'hello-workflow'), true);
  });

  it('returns false for a different id that was not registered', () => {
    const registry = createWorkflowRegistry();
    const updated = register(registry, VALID_MANIFEST);
    assert.equal(has(updated, 'other-workflow'), false);
  });
});

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------

describe('register (workflow)', () => {
  it('returns a new registry object (not the same reference)', () => {
    const registry = createWorkflowRegistry();
    const updated = register(registry, VALID_MANIFEST);
    assert.notEqual(registry, updated);
  });

  it('returned registry contains the registered manifest', () => {
    const registry = createWorkflowRegistry();
    const updated = register(registry, VALID_MANIFEST);
    const found = get(updated, 'hello-workflow');
    assert.deepEqual(found, VALID_MANIFEST);
  });

  it('returned registry is frozen', () => {
    const registry = createWorkflowRegistry();
    const updated = register(registry, VALID_MANIFEST);
    assert.ok(Object.isFrozen(updated));
  });

  it('original registry is unchanged after register (immutability)', () => {
    const registry = createWorkflowRegistry();
    register(registry, VALID_MANIFEST);
    assert.equal(has(registry, 'hello-workflow'), false);
    assert.deepEqual(list(registry), []);
  });

  it('can register multiple manifests', () => {
    const registry = createWorkflowRegistry();
    const r1 = register(registry, VALID_MANIFEST);
    const r2 = register(r1, ANOTHER_MANIFEST);
    assert.equal(has(r2, 'hello-workflow'), true);
    assert.equal(has(r2, 'another-workflow'), true);
  });

  it('throws with code registry.duplicate on duplicate id', () => {
    const registry = createWorkflowRegistry();
    const updated = register(registry, VALID_MANIFEST);
    try {
      register(updated, VALID_MANIFEST);
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.code, 'registry.duplicate');
      assert.ok(err.message.includes('hello-workflow'));
    }
  });

  it('throws on invalid manifest (missing required field)', () => {
    const registry = createWorkflowRegistry();
    const invalid = { id: 'bad-workflow' }; // missing version, description, steps
    assert.throws(
      () => register(registry, invalid),
      (err) => {
        assert.ok(err.errors, 'should have .errors from AJV');
        return true;
      }
    );
  });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

describe('get (workflow)', () => {
  it('returns the manifest for a registered workflow', () => {
    const registry = createWorkflowRegistry();
    const updated = register(registry, VALID_MANIFEST);
    const found = get(updated, 'hello-workflow');
    assert.deepEqual(found, VALID_MANIFEST);
  });

  it('throws with code registry.not_found for unknown id', () => {
    const registry = createWorkflowRegistry();
    try {
      get(registry, 'no-such-workflow');
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.code, 'registry.not_found');
      assert.ok(err.message.includes('no-such-workflow'));
    }
  });
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe('list (workflow)', () => {
  it('returns empty array for empty registry', () => {
    const registry = createWorkflowRegistry();
    assert.deepEqual(list(registry), []);
  });

  it('returns sorted array of ids', () => {
    const registry = createWorkflowRegistry();
    const r1 = register(registry, ANOTHER_MANIFEST); // another-workflow
    const r2 = register(r1, VALID_MANIFEST);          // hello-workflow
    assert.deepEqual(list(r2), ['another-workflow', 'hello-workflow']);
  });

  it('returns array (not mutating the registry)', () => {
    const registry = createWorkflowRegistry();
    const updated = register(registry, VALID_MANIFEST);
    const ids = list(updated);
    ids.push('hacked');
    assert.deepEqual(list(updated), ['hello-workflow']);
  });
});
