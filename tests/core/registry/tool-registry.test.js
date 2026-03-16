/**
 * Tests for src/core/registry/tool-registry.js
 * TDD: written before implementation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createToolRegistry,
  register,
  get,
  has,
  list,
} from '../../../src/core/registry/tool-registry.js';

// ---------------------------------------------------------------------------
// Minimal valid manifests for testing
// ---------------------------------------------------------------------------

const VALID_MANIFEST = Object.freeze({
  id: 'echo-tool',
  version: '1.0.0',
  description: 'Echoes its input back as output',
  inputSchema: { type: 'object' },
  outputSchema: { type: 'object' },
});

const ANOTHER_MANIFEST = Object.freeze({
  id: 'another-tool',
  version: '2.0.0',
  description: 'Another test tool',
  inputSchema: { type: 'object' },
  outputSchema: { type: 'object' },
});

// ---------------------------------------------------------------------------
// createToolRegistry
// ---------------------------------------------------------------------------

describe('createToolRegistry', () => {
  it('returns an object', () => {
    const registry = createToolRegistry();
    assert.equal(typeof registry, 'object');
    assert.ok(registry !== null);
  });

  it('returns a frozen object', () => {
    const registry = createToolRegistry();
    assert.ok(Object.isFrozen(registry));
  });

  it('starts empty — list returns empty array', () => {
    const registry = createToolRegistry();
    assert.deepEqual(list(registry), []);
  });
});

// ---------------------------------------------------------------------------
// has
// ---------------------------------------------------------------------------

describe('has (tool)', () => {
  it('returns false for unknown id', () => {
    const registry = createToolRegistry();
    assert.equal(has(registry, 'no-such-tool'), false);
  });

  it('returns true after registering a tool', () => {
    const registry = createToolRegistry();
    const updated = register(registry, VALID_MANIFEST);
    assert.equal(has(updated, 'echo-tool'), true);
  });

  it('returns false for a different id that was not registered', () => {
    const registry = createToolRegistry();
    const updated = register(registry, VALID_MANIFEST);
    assert.equal(has(updated, 'other-tool'), false);
  });
});

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------

describe('register (tool)', () => {
  it('returns a new registry object (not the same reference)', () => {
    const registry = createToolRegistry();
    const updated = register(registry, VALID_MANIFEST);
    assert.notEqual(registry, updated);
  });

  it('returned registry contains the registered manifest', () => {
    const registry = createToolRegistry();
    const updated = register(registry, VALID_MANIFEST);
    const found = get(updated, 'echo-tool');
    assert.deepEqual(found, VALID_MANIFEST);
  });

  it('returned registry is frozen', () => {
    const registry = createToolRegistry();
    const updated = register(registry, VALID_MANIFEST);
    assert.ok(Object.isFrozen(updated));
  });

  it('original registry is unchanged after register (immutability)', () => {
    const registry = createToolRegistry();
    register(registry, VALID_MANIFEST);
    assert.equal(has(registry, 'echo-tool'), false);
    assert.deepEqual(list(registry), []);
  });

  it('can register multiple manifests', () => {
    const registry = createToolRegistry();
    const r1 = register(registry, VALID_MANIFEST);
    const r2 = register(r1, ANOTHER_MANIFEST);
    assert.equal(has(r2, 'echo-tool'), true);
    assert.equal(has(r2, 'another-tool'), true);
  });

  it('throws with code registry.duplicate on duplicate id', () => {
    const registry = createToolRegistry();
    const updated = register(registry, VALID_MANIFEST);
    try {
      register(updated, VALID_MANIFEST);
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.code, 'registry.duplicate');
      assert.ok(err.message.includes('echo-tool'));
    }
  });

  it('throws on invalid manifest (missing required field)', () => {
    const registry = createToolRegistry();
    const invalid = { id: 'bad-tool' }; // missing version, description, schemas
    assert.throws(
      () => register(registry, invalid),
      (err) => {
        assert.ok(err.errors, 'should have .errors from AJV');
        return true;
      }
    );
  });

  it('throws on manifest with invalid id pattern', () => {
    const registry = createToolRegistry();
    const invalid = {
      ...VALID_MANIFEST,
      id: 'Invalid_Tool', // uppercase and underscore not allowed
    };
    assert.throws(() => register(registry, invalid));
  });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

describe('get (tool)', () => {
  it('returns the manifest for a registered tool', () => {
    const registry = createToolRegistry();
    const updated = register(registry, VALID_MANIFEST);
    const found = get(updated, 'echo-tool');
    assert.deepEqual(found, VALID_MANIFEST);
  });

  it('throws with code registry.not_found for unknown id', () => {
    const registry = createToolRegistry();
    try {
      get(registry, 'no-such-tool');
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.code, 'registry.not_found');
      assert.ok(err.message.includes('no-such-tool'));
    }
  });
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe('list (tool)', () => {
  it('returns empty array for empty registry', () => {
    const registry = createToolRegistry();
    assert.deepEqual(list(registry), []);
  });

  it('returns sorted array of ids', () => {
    const registry = createToolRegistry();
    const r1 = register(registry, ANOTHER_MANIFEST); // another-tool
    const r2 = register(r1, VALID_MANIFEST);          // echo-tool
    assert.deepEqual(list(r2), ['another-tool', 'echo-tool']);
  });

  it('returns array (not mutating the registry)', () => {
    const registry = createToolRegistry();
    const updated = register(registry, VALID_MANIFEST);
    const ids = list(updated);
    ids.push('hacked');
    assert.deepEqual(list(updated), ['echo-tool']);
  });
});
