/**
 * memory-store.js — Immutable run-scoped key-value store for Pocket-Agents.
 *
 * All operations return new frozen store objects. No in-place mutation.
 *
 * Store shape:
 *   { entries: Map<string, unknown> }
 *
 * Scoped stores prefix all keys internally with `${scopeId}:` so multiple
 * runs sharing the same store cannot accidentally read each other's entries.
 * `list()` on a scoped store strips the prefix before returning keys.
 *
 * Usage:
 *   let store = createStore();
 *   store = set(store, 'key', 'value');
 *   const v = get(store, 'key');            // 'value'
 *   store = del(store, 'key');
 *   list(store);                            // []
 *
 *   const scoped = createScope(store, 'run-abc');
 *   // all keys in scoped store are prefixed 'run-abc:' internally
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a frozen store object from an entries Map.
 *
 * @param {Map<string, unknown>} entries
 * @param {string|null} scopePrefix  Internal prefix applied to all keys ('scopeId:'), or null.
 * @returns {Readonly<{ entries: Map<string, unknown>, _prefix: string|null }>}
 */
function makeStore(entries, scopePrefix = null) {
  return Object.freeze({ entries, _prefix: scopePrefix });
}

/**
 * Resolve the internal storage key (with optional scope prefix).
 *
 * @param {Readonly<{ _prefix: string|null }>} store
 * @param {string} key
 * @returns {string}
 */
function internalKey(store, key) {
  return store._prefix ? `${store._prefix}${key}` : key;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new, empty store (not scoped).
 *
 * @returns {Readonly<{ entries: Map<string, unknown>, _prefix: null }>}
 */
export function createStore() {
  return makeStore(new Map(), null);
}

/**
 * Create a scoped view of a store, isolating keys by runId.
 *
 * All get/set/del/list operations on the scoped store prefix keys with
 * `${runId}:` internally, keeping different run entries separate.
 *
 * @param {Readonly<{ entries: Map<string, unknown> }>} store  - The parent store.
 * @param {string} runId                                       - The scope identifier.
 * @returns {Readonly<{ entries: Map<string, unknown>, _prefix: string }>}
 */
export function createScope(store, runId) {
  if (!runId || typeof runId !== 'string') {
    throw new Error('[memory-store] createScope: runId must be a non-empty string');
  }
  return makeStore(store.entries, `${runId}:`);
}

/**
 * Retrieve a value from the store.
 *
 * @param {Readonly<{ entries: Map<string, unknown>, _prefix: string|null }>} store
 * @param {string} key
 * @returns {unknown} The stored value, or undefined if not set.
 */
export function get(store, key) {
  return store.entries.get(internalKey(store, key));
}

/**
 * Store a value under the given key. Returns a new store.
 *
 * @param {Readonly<{ entries: Map<string, unknown>, _prefix: string|null }>} store
 * @param {string} key
 * @param {unknown} value
 * @returns {Readonly<{ entries: Map<string, unknown>, _prefix: string|null }>}
 */
export function set(store, key, value) {
  const k = internalKey(store, key);
  const newEntries = new Map([...store.entries, [k, value]]);
  return makeStore(newEntries, store._prefix);
}

/**
 * Remove a key from the store. Returns a new store.
 * If the key does not exist, returns an equivalent new store (no error).
 *
 * @param {Readonly<{ entries: Map<string, unknown>, _prefix: string|null }>} store
 * @param {string} key
 * @returns {Readonly<{ entries: Map<string, unknown>, _prefix: string|null }>}
 */
export function del(store, key) {
  const k = internalKey(store, key);
  const newEntries = new Map(
    [...store.entries].filter(([storedKey]) => storedKey !== k)
  );
  return makeStore(newEntries, store._prefix);
}

/**
 * List all key-value entries visible in this store.
 *
 * For scoped stores, only entries belonging to this scope are returned and
 * the internal prefix is stripped from the returned keys.
 *
 * @param {Readonly<{ entries: Map<string, unknown>, _prefix: string|null }>} store
 * @returns {Array<{ key: string, value: unknown }>}
 */
export function list(store) {
  const prefix = store._prefix ?? '';
  const result = [];
  for (const [k, v] of store.entries) {
    if (prefix === '' || k.startsWith(prefix)) {
      result.push({ key: k.slice(prefix.length), value: v });
    }
  }
  return result.sort((a, b) => a.key.localeCompare(b.key));
}
