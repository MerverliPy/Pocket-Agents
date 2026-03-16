import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createStore,
  createScope,
  get,
  set,
  del,
  list,
} from '../../src/state/memory-store.js';

describe('memory-store', () => {
  describe('createStore()', () => {
    it('returns a frozen object', () => {
      const store = createStore();
      assert.ok(Object.isFrozen(store));
    });

    it('starts with no entries', () => {
      const store = createStore();
      assert.deepEqual(list(store), []);
    });

    it('has null prefix (not scoped)', () => {
      const store = createStore();
      assert.equal(store._prefix, null);
    });
  });

  describe('set() and get()', () => {
    it('returns a new store with the key set', () => {
      const s0 = createStore();
      const s1 = set(s0, 'foo', 'bar');
      assert.notEqual(s0, s1);
      assert.equal(get(s1, 'foo'), 'bar');
    });

    it('does not mutate the original store', () => {
      const s0 = createStore();
      set(s0, 'foo', 'bar');
      assert.equal(get(s0, 'foo'), undefined);
    });

    it('supports overwriting an existing key', () => {
      let store = createStore();
      store = set(store, 'x', 1);
      store = set(store, 'x', 2);
      assert.equal(get(store, 'x'), 2);
    });

    it('returns undefined for missing keys', () => {
      const store = createStore();
      assert.equal(get(store, 'missing'), undefined);
    });

    it('supports any JSON-serialisable value', () => {
      let store = createStore();
      store = set(store, 'num', 42);
      store = set(store, 'obj', { a: 1 });
      store = set(store, 'arr', [1, 2, 3]);
      store = set(store, 'bool', false);
      store = set(store, 'nil', null);
      assert.equal(get(store, 'num'), 42);
      assert.deepEqual(get(store, 'obj'), { a: 1 });
      assert.deepEqual(get(store, 'arr'), [1, 2, 3]);
      assert.equal(get(store, 'bool'), false);
      assert.equal(get(store, 'nil'), null);
    });
  });

  describe('del()', () => {
    it('returns a new store without the deleted key', () => {
      let store = createStore();
      store = set(store, 'a', 1);
      store = set(store, 'b', 2);
      const store2 = del(store, 'a');
      assert.equal(get(store2, 'a'), undefined);
      assert.equal(get(store2, 'b'), 2);
    });

    it('does not mutate the original store', () => {
      let store = createStore();
      store = set(store, 'a', 1);
      del(store, 'a');
      assert.equal(get(store, 'a'), 1);
    });

    it('is a no-op when key does not exist', () => {
      const s0 = createStore();
      const s1 = del(s0, 'nonexistent');
      assert.deepEqual(list(s1), []);
    });
  });

  describe('list()', () => {
    it('returns empty array for empty store', () => {
      assert.deepEqual(list(createStore()), []);
    });

    it('returns all entries sorted by key', () => {
      let store = createStore();
      store = set(store, 'z', 3);
      store = set(store, 'a', 1);
      store = set(store, 'm', 2);
      const entries = list(store);
      assert.deepEqual(entries.map((e) => e.key), ['a', 'm', 'z']);
      assert.deepEqual(entries.map((e) => e.value), [1, 2, 3]);
    });

    it('reflects deleted keys', () => {
      let store = createStore();
      store = set(store, 'x', 1);
      store = del(store, 'x');
      assert.deepEqual(list(store), []);
    });
  });

  describe('createScope()', () => {
    it('throws when runId is missing', () => {
      const store = createStore();
      assert.throws(() => createScope(store, ''), /runId must be a non-empty string/);
    });

    it('throws when runId is not a string', () => {
      const store = createStore();
      assert.throws(() => createScope(store, null), /runId must be a non-empty string/);
    });

    it('returns a frozen object', () => {
      const scoped = createScope(createStore(), 'run-1');
      assert.ok(Object.isFrozen(scoped));
    });

    it('scoped get/set/del are isolated from the base store', () => {
      const base = createStore();
      const scoped1 = createScope(base, 'run-1');
      const scoped2 = createScope(base, 'run-2');

      let s1 = set(scoped1, 'key', 'run1-value');
      const s2 = set(scoped2, 'key', 'run2-value');

      assert.equal(get(s1, 'key'), 'run1-value');
      assert.equal(get(s2, 'key'), 'run2-value');
    });

    it('list() on scoped store only returns keys for that scope', () => {
      const base = createStore();
      const scoped1 = createScope(base, 'run-1');
      const scoped2 = createScope(base, 'run-2');

      // Each set returns a new store sharing the same underlying Map via reference
      // but scoped stores work independently because they use separate scopes.
      let s1 = set(scoped1, 'a', 1);
      s1 = set(s1, 'b', 2);
      const entries = list(s1);
      assert.deepEqual(entries.map((e) => e.key), ['a', 'b']);

      // Verify run-2 keys are not in run-1 listing
      const s2 = set(scoped2, 'c', 3);
      const s2entries = list(s2);
      assert.deepEqual(s2entries.map((e) => e.key), ['c']);
    });

    it('list() strips scope prefix from returned keys', () => {
      let scoped = createScope(createStore(), 'run-xyz');
      scoped = set(scoped, 'mykey', 42);
      const entries = list(scoped);
      assert.equal(entries[0].key, 'mykey');  // prefix stripped
      assert.equal(entries[0].value, 42);
    });

    it('del() in scoped store does not affect other scopes', () => {
      const base = createStore();
      let s1 = createScope(base, 'run-1');
      let s2 = createScope(base, 'run-2');

      s1 = set(s1, 'shared', 'val1');
      s2 = set(s2, 'shared', 'val2');

      s1 = del(s1, 'shared');
      assert.equal(get(s1, 'shared'), undefined);
      assert.equal(get(s2, 'shared'), 'val2');
    });
  });

  describe('immutability', () => {
    it('returned stores are frozen', () => {
      let store = createStore();
      store = set(store, 'k', 'v');
      assert.ok(Object.isFrozen(store));
      store = del(store, 'k');
      assert.ok(Object.isFrozen(store));
    });
  });
});
