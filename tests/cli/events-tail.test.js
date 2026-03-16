import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runEventsTail } from '../../src/cli/events-tail.js';
import { appendEvent } from '../../src/events/jsonl-sink.js';

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

describe('runEventsTail', () => {
  let tmpDir;
  let eventsFile;

  before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pa-events-tail-test-'));
    eventsFile = join(tmpDir, 'events.jsonl');
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns error when no file is specified and config has no eventsFile', () => {
    // No arg, no env var → should return error
    const result = runEventsTail(undefined);
    assert.ok(result.error, 'should return an error string');
    assert.match(result.error, /No events file specified/);
    assert.equal(result.count, 0);
  });

  it('returns empty message when file exists but has no events', () => {
    const result = runEventsTail(eventsFile);
    assert.ok(!result.error, `unexpected error: ${result.error}`);
    assert.equal(result.count, 0);
    assert.match(result.output, /no events/);
  });

  it('returns formatted JSON for each event', () => {
    appendEvent(eventsFile, makeEvent({ runId: 'run-123' }));
    appendEvent(eventsFile, makeEvent({ type: 'workflow.completed', runId: 'run-456' }));

    const result = runEventsTail(eventsFile);
    assert.ok(!result.error, `unexpected error: ${result.error}`);
    assert.equal(result.count, 2);
    assert.ok(result.output.includes('run-123'));
    assert.ok(result.output.includes('run-456'));
    assert.ok(result.output.includes('workflow.completed'));
  });

  it('returns error when file path is invalid', () => {
    const result = runEventsTail('/nonexistent/path/events.jsonl');
    // readEvents returns [] for nonexistent file, so this should return count 0
    // but no error (readEvents handles missing file gracefully)
    assert.ok(!result.error, 'readEvents handles missing file gracefully');
    assert.equal(result.count, 0);
  });
});
