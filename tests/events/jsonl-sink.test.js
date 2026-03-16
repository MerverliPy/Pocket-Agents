import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  appendEvent,
  readEvents,
  createJsonlSink,
} from '../../src/events/jsonl-sink.js';

// ---------------------------------------------------------------------------
// Minimal valid EventRecord
// ---------------------------------------------------------------------------

function makeEvent(overrides = {}) {
  return {
    type: 'agent.started',
    timestamp: '2026-03-16T00:00:00.000Z',
    runId: 'run-001',
    stepId: null,
    payload: { detail: 'test' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Temp directory per describe block
// ---------------------------------------------------------------------------

describe('appendEvent / readEvents', () => {
  let tmpDir;
  let sinkFile;

  before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pa-sink-test-'));
    sinkFile = join(tmpDir, 'events.jsonl');
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('appendEvent creates the file and writes a JSON line', () => {
    const evt = makeEvent();
    appendEvent(sinkFile, evt);
    assert.ok(existsSync(sinkFile), 'file should exist after appendEvent');
  });

  it('readEvents parses the appended event back correctly', () => {
    const evt = makeEvent({ runId: 'run-readback' });
    appendEvent(sinkFile, evt);
    const events = readEvents(sinkFile);
    // File may have events from previous test too — just check last one
    const last = events[events.length - 1];
    assert.equal(last.type, 'agent.started');
    assert.equal(last.runId, 'run-readback');
    assert.deepEqual(last.payload, { detail: 'test' });
  });

  it('appending multiple events produces multiple lines', () => {
    const tmpFile = join(tmpDir, 'multi.jsonl');
    appendEvent(tmpFile, makeEvent({ type: 'agent.started' }));
    appendEvent(tmpFile, makeEvent({ type: 'workflow.completed' }));
    appendEvent(tmpFile, makeEvent({ type: 'tool.called' }));
    const events = readEvents(tmpFile);
    assert.equal(events.length, 3);
    assert.equal(events[0].type, 'agent.started');
    assert.equal(events[1].type, 'workflow.completed');
    assert.equal(events[2].type, 'tool.called');
  });

  it('readEvents returns empty array when file does not exist', () => {
    const missing = join(tmpDir, 'nonexistent.jsonl');
    const events = readEvents(missing);
    assert.deepEqual(events, []);
  });

  it('readEvents tolerates a trailing newline', () => {
    const tmpFile = join(tmpDir, 'trailing.jsonl');
    appendEvent(tmpFile, makeEvent());
    // appendEvent always adds a trailing newline — readEvents must handle it
    const events = readEvents(tmpFile);
    assert.equal(events.length, 1);
  });

  it('each appended record is serialised as a single line of valid JSON', () => {
    const tmpFile = join(tmpDir, 'shape.jsonl');
    const evt = makeEvent({ payload: { nested: { a: 1 } } });
    appendEvent(tmpFile, evt);
    const events = readEvents(tmpFile);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0].payload, { nested: { a: 1 } });
  });
});

// ---------------------------------------------------------------------------
// createJsonlSink
// ---------------------------------------------------------------------------

describe('createJsonlSink', () => {
  let tmpDir;

  before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pa-sink2-test-'));
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns a frozen object with handler and readAll', () => {
    const sink = createJsonlSink(join(tmpDir, 'sink1.jsonl'));
    assert.ok(Object.isFrozen(sink));
    assert.equal(typeof sink.handler, 'function');
    assert.equal(typeof sink.readAll, 'function');
  });

  it('handler appends the event to the JSONL file', () => {
    const file = join(tmpDir, 'sink2.jsonl');
    const sink = createJsonlSink(file);

    sink.handler(makeEvent({ type: 'agent.started' }));
    sink.handler(makeEvent({ type: 'workflow.completed' }));

    assert.ok(existsSync(file));
  });

  it('readAll returns all previously appended events', () => {
    const file = join(tmpDir, 'sink3.jsonl');
    const sink = createJsonlSink(file);

    sink.handler(makeEvent({ type: 'agent.started', runId: 'r1' }));
    sink.handler(makeEvent({ type: 'tool.called', runId: 'r2' }));

    const events = sink.readAll();
    assert.equal(events.length, 2);
    assert.equal(events[0].runId, 'r1');
    assert.equal(events[1].runId, 'r2');
  });

  it('readAll returns empty array when nothing has been written', () => {
    const file = join(tmpDir, 'sink4.jsonl');
    const sink = createJsonlSink(file);
    const events = sink.readAll();
    assert.deepEqual(events, []);
  });
});
