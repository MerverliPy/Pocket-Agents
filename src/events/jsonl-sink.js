/**
 * jsonl-sink.js — Optional local JSONL event sink for Pocket-Agents.
 *
 * Writes one EventRecord as a JSON line per event to a local file.
 * Reading back is done synchronously — suitable for V1 single-process use.
 *
 * This module is transport-agnostic: in a future phase it can be replaced by
 * any sink (remote, queue, stream) without changing the event bus interface.
 */

import { appendFileSync, readFileSync, existsSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Low-level primitives
// ---------------------------------------------------------------------------

/**
 * Append a single EventRecord as a JSON line to the given file.
 * Creates the file if it does not exist.
 *
 * @param {string} filePath    - Absolute or relative path to the JSONL file.
 * @param {object} eventRecord - A valid EventRecord object.
 */
export function appendEvent(filePath, eventRecord) {
  appendFileSync(filePath, JSON.stringify(eventRecord) + '\n', 'utf8');
}

/**
 * Read and parse all EventRecord entries from a JSONL file.
 * Returns an empty array when the file does not exist.
 *
 * @param {string} filePath - Path to the JSONL file.
 * @returns {object[]}
 */
export function readEvents(filePath) {
  if (!existsSync(filePath)) return [];

  const raw = readFileSync(filePath, 'utf8');
  return raw
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line));
}

// ---------------------------------------------------------------------------
// Higher-level sink factory
// ---------------------------------------------------------------------------

/**
 * Create a JSONL sink bound to a specific file path.
 *
 * Returns a frozen object with:
 *   - `handler(eventRecord)` — append the event to the file (suitable for
 *     passing directly to `subscribeAll`)
 *   - `readAll()` — read back all events from the file
 *
 * @param {string} filePath - Path to the JSONL file.
 * @returns {Readonly<{ handler: Function, readAll: Function }>}
 */
export function createJsonlSink(filePath) {
  return Object.freeze({
    /**
     * Append an EventRecord to the JSONL file.
     * @param {object} eventRecord
     */
    handler(eventRecord) {
      appendEvent(filePath, eventRecord);
    },

    /**
     * Return all EventRecords written to the JSONL file so far.
     * @returns {object[]}
     */
    readAll() {
      return readEvents(filePath);
    },
  });
}
