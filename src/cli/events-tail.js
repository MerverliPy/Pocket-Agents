/**
 * events-tail.js — `events:tail` CLI command.
 *
 * Reads all EventRecords from the local JSONL event file and prints each one
 * as formatted JSON to stdout, newest-last.
 *
 * V1 scope: snapshot read only. Live-follow (tail -f) is deferred.
 *
 * Usage:
 *   node src/cli/index.js events:tail [file]
 *
 * If [file] is omitted, the command uses config.eventsFile (PA_EVENTS_FILE).
 * Exits with code 1 when no file path is available or the file cannot be read.
 */

import { loadConfig } from '../config/loader.js';
import { readEvents } from '../events/jsonl-sink.js';

/**
 * Run the events:tail command.
 *
 * @param {string|undefined} [fileArg]  - File path from CLI argument (optional).
 * @returns {{ output: string, count: number, error?: string }}
 */
export function runEventsTail(fileArg) {
  const config = loadConfig();
  const filePath = fileArg || config.eventsFile;

  if (!filePath) {
    return {
      output: '',
      count: 0,
      error:
        'No events file specified. ' +
        'Pass a file path as argument or set PA_EVENTS_FILE.',
    };
  }

  let events;
  try {
    events = readEvents(filePath);
  } catch (err) {
    return {
      output: '',
      count: 0,
      error: `Cannot read events file "${filePath}": ${err.message}`,
    };
  }

  if (events.length === 0) {
    return {
      output: `(no events in ${filePath})`,
      count: 0,
    };
  }

  const output = events
    .map((e) => JSON.stringify(e, null, 2))
    .join('\n---\n');

  return { output, count: events.length };
}
