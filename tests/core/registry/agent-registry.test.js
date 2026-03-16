/**
 * Tests for src/core/registry/agent-registry.js
 * TDD: written before implementation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAgentRegistry,
  register,
  get,
  has,
  list,
} from '../../../src/core/registry/agent-registry.js';

// ---------------------------------------------------------------------------
// Minimal valid manifest for testing
// ---------------------------------------------------------------------------

const VALID_MANIFEST = Object.freeze({
  id: 'echo-agent',
  version: '1.0.0',
  description: 'Echoes its input back as output',
  inputSchema: { type: 'object' },
  outputSchema: { type: 'object' },
});

const ANOTHER_MANIFEST = Object.freeze({
  id: 'another-agent',
  version: '2.0.0',
  description: 'Another test agent',
  inputSchema: { type: 'object' },
  outputSchema: { type: 'object' },
});

// ---------------------------------------------------------------------------
// createAgentRegistry
// ---------------------------------------------------------------------------

describe('createAgentRegistry', () => {
  it('returns an object', () => {
    const registry = createAgentRegistry();
    assert.equal(typeof registry, 'object');
    assert.ok(registry !== null);
  });

  it('returns a frozen object', () => {
    const registry = createAgentRegistry();
    assert.ok(Object.isFrozen(registry));
  });

  it('starts empty — list returns empty array', () => {
    const registry = createAgentRegistry();
    assert.deepEqual(list(registry), []);
  });
});

// ---------------------------------------------------------------------------
// has
// ---------------------------------------------------------------------------

describe('has', () => {
  it('returns false for unknown id', () => {
    const registry = createAgentRegistry();
    assert.equal(has(registry, 'no-such-agent'), false);
  });

  it('returns true after registering an agent', () => {
    const registry = createAgentRegistry();
    const updated = register(registry, VALID_MANIFEST);
    assert.equal(has(updated, 'echo-agent'), true);
  });

  it('returns false for a different id that was not registered', () => {
    const registry = createAgentRegistry();
    const updated = register(registry, VALID_MANIFEST);
    assert.equal(has(updated, 'other-agent'), false);
  });
});

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------

describe('register', () => {
  it('returns a new registry object (not the same reference)', () => {
    const registry = createAgentRegistry();
    const updated = register(registry, VALID_MANIFEST);
    assert.notEqual(registry, updated);
  });

  it('returned registry contains the registered manifest', () => {
    const registry = createAgentRegistry();
    const updated = register(registry, VALID_MANIFEST);
    const found = get(updated, 'echo-agent');
    assert.deepEqual(found, VALID_MANIFEST);
  });

  it('returned registry is frozen', () => {
    const registry = createAgentRegistry();
    const updated = register(registry, VALID_MANIFEST);
    assert.ok(Object.isFrozen(updated));
  });

  it('original registry is unchanged after register (immutability)', () => {
    const registry = createAgentRegistry();
    register(registry, VALID_MANIFEST);
    assert.equal(has(registry, 'echo-agent'), false);
    assert.deepEqual(list(registry), []);
  });

  it('can register multiple manifests', () => {
    const registry = createAgentRegistry();
    const r1 = register(registry, VALID_MANIFEST);
    const r2 = register(r1, ANOTHER_MANIFEST);
    assert.equal(has(r2, 'echo-agent'), true);
    assert.equal(has(r2, 'another-agent'), true);
  });

  it('throws with code registry.duplicate on duplicate id', () => {
    const registry = createAgentRegistry();
    const updated = register(registry, VALID_MANIFEST);
    try {
      register(updated, VALID_MANIFEST);
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.code, 'registry.duplicate');
      assert.ok(err.message.includes('echo-agent'));
    }
  });

  it('throws on invalid manifest (missing required field)', () => {
    const registry = createAgentRegistry();
    const invalid = { id: 'bad-agent' }; // missing version, description, schemas
    assert.throws(
      () => register(registry, invalid),
      (err) => {
        assert.ok(err.errors, 'should have .errors from AJV');
        return true;
      }
    );
  });

  it('throws on manifest with invalid id pattern', () => {
    const registry = createAgentRegistry();
    const invalid = {
      ...VALID_MANIFEST,
      id: 'Invalid_ID', // uppercase and underscore not allowed
    };
    assert.throws(() => register(registry, invalid));
  });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

describe('get', () => {
  it('returns the manifest for a registered agent', () => {
    const registry = createAgentRegistry();
    const updated = register(registry, VALID_MANIFEST);
    const found = get(updated, 'echo-agent');
    assert.deepEqual(found, VALID_MANIFEST);
  });

  it('throws with code registry.not_found for unknown id', () => {
    const registry = createAgentRegistry();
    try {
      get(registry, 'no-such-agent');
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.code, 'registry.not_found');
      assert.ok(err.message.includes('no-such-agent'));
    }
  });
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe('list', () => {
  it('returns empty array for empty registry', () => {
    const registry = createAgentRegistry();
    assert.deepEqual(list(registry), []);
  });

  it('returns sorted array of ids', () => {
    const registry = createAgentRegistry();
    const r1 = register(registry, ANOTHER_MANIFEST); // another-agent
    const r2 = register(r1, VALID_MANIFEST);          // echo-agent
    assert.deepEqual(list(r2), ['another-agent', 'echo-agent']);
  });

  it('returns array (not mutating the registry)', () => {
    const registry = createAgentRegistry();
    const updated = register(registry, VALID_MANIFEST);
    const ids = list(updated);
    ids.push('hacked');
    // registry is not affected
    assert.deepEqual(list(updated), ['echo-agent']);
  });
});
