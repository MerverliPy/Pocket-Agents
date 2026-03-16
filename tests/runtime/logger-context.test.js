/**
 * Tests for createLogger() — structured output shape and child() context binding.
 *
 * We capture stdout/stderr by temporarily replacing process.stdout.write and
 * process.stderr.write with in-memory collectors, then restore them.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger } from '../../src/runtime/logger.js';

// ---------------------------------------------------------------------------
// Utility: capture writes to a stream
// ---------------------------------------------------------------------------

/**
 * Temporarily replaces stream.write with a collector.
 * Returns { lines: string[], restore: fn }.
 *
 * @param {NodeJS.WriteStream} stream
 */
function captureStream(stream) {
  const lines = [];
  const original = stream.write.bind(stream);
  stream.write = (chunk) => { lines.push(chunk); return true; };
  return {
    lines,
    restore: () => { stream.write = original; },
  };
}

// ---------------------------------------------------------------------------
// Structured output shape
// ---------------------------------------------------------------------------

describe('createLogger — output shape', () => {
  it('log entries are valid JSON', () => {
    const cap = captureStream(process.stdout);
    try {
      const logger = createLogger('info');
      logger.info('hello world');
    } finally {
      cap.restore();
    }
    assert.equal(cap.lines.length, 1);
    assert.doesNotThrow(() => JSON.parse(cap.lines[0]));
  });

  it('entry has timestamp, level, and msg fields', () => {
    const cap = captureStream(process.stdout);
    let logger;
    try {
      logger = createLogger('info');
      logger.info('shape test');
    } finally {
      cap.restore();
    }
    const entry = JSON.parse(cap.lines[0]);
    assert.ok('timestamp' in entry, 'should have timestamp');
    assert.ok('level' in entry, 'should have level');
    assert.ok('msg' in entry, 'should have msg');
    assert.equal(entry.level, 'info');
    assert.equal(entry.msg, 'shape test');
    assert.match(entry.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });

  it('error and warn go to stderr', () => {
    const capErr = captureStream(process.stderr);
    const capOut = captureStream(process.stdout);
    try {
      const logger = createLogger('debug');
      logger.error('err msg');
      logger.warn('warn msg');
    } finally {
      capErr.restore();
      capOut.restore();
    }
    assert.equal(capErr.lines.length, 2);
    assert.equal(capOut.lines.length, 0);
  });

  it('info and debug go to stdout', () => {
    const capOut = captureStream(process.stdout);
    const capErr = captureStream(process.stderr);
    try {
      const logger = createLogger('debug');
      logger.info('info msg');
      logger.debug('debug msg');
    } finally {
      capOut.restore();
      capErr.restore();
    }
    assert.equal(capOut.lines.length, 2);
    assert.equal(capErr.lines.length, 0);
  });

  it('data fields are spread into the entry', () => {
    const cap = captureStream(process.stdout);
    try {
      const logger = createLogger('info');
      logger.info('with data', { code: 99, detail: 'x' });
    } finally {
      cap.restore();
    }
    const entry = JSON.parse(cap.lines[0]);
    assert.equal(entry.code, 99);
    assert.equal(entry.detail, 'x');
  });
});

// ---------------------------------------------------------------------------
// child() — context binding
// ---------------------------------------------------------------------------

describe('createLogger — child context', () => {
  it('createLogger returns an object with a child() method', () => {
    const logger = createLogger('info');
    assert.equal(typeof logger.child, 'function');
  });

  it('child() returns a frozen logger', () => {
    const logger = createLogger('info');
    const child = logger.child({ runId: 'r1' });
    assert.ok(Object.isFrozen(child));
  });

  it('child() returns a new logger (not the parent)', () => {
    const logger = createLogger('info');
    const child = logger.child({ runId: 'r1' });
    assert.notEqual(child, logger);
  });

  it('child logger has info, warn, error, debug, child methods', () => {
    const logger = createLogger('info');
    const child = logger.child({ runId: 'r1' });
    assert.equal(typeof child.info, 'function');
    assert.equal(typeof child.warn, 'function');
    assert.equal(typeof child.error, 'function');
    assert.equal(typeof child.debug, 'function');
    assert.equal(typeof child.child, 'function');
  });

  it('child context fields appear in every log entry', () => {
    const cap = captureStream(process.stdout);
    try {
      const logger = createLogger('info');
      const child = logger.child({ runId: 'run-abc', agentId: 'agent-1' });
      child.info('child log');
    } finally {
      cap.restore();
    }
    const entry = JSON.parse(cap.lines[0]);
    assert.equal(entry.runId, 'run-abc');
    assert.equal(entry.agentId, 'agent-1');
    assert.equal(entry.msg, 'child log');
  });

  it('parent logger does not include child context fields', () => {
    const capOut = captureStream(process.stdout);
    try {
      const logger = createLogger('info');
      logger.child({ runId: 'run-abc' }); // create child but use parent
      logger.info('parent log');
    } finally {
      capOut.restore();
    }
    const entry = JSON.parse(capOut.lines[0]);
    assert.ok(!('runId' in entry), 'parent log should not have runId');
  });

  it('child context is merged with per-call data (per-call data wins on conflict)', () => {
    const cap = captureStream(process.stdout);
    try {
      const logger = createLogger('info');
      const child = logger.child({ runId: 'ctx-run', toolId: 'tool-x' });
      child.info('override test', { runId: 'call-run' });
    } finally {
      cap.restore();
    }
    const entry = JSON.parse(cap.lines[0]);
    // Per-call data should override context when there is a conflict
    assert.equal(entry.runId, 'call-run');
    assert.equal(entry.toolId, 'tool-x');
  });

  it('nested child() merges contexts', () => {
    const cap = captureStream(process.stdout);
    try {
      const logger = createLogger('info');
      const child1 = logger.child({ runId: 'run-1' });
      const child2 = child1.child({ workflowId: 'wf-1' });
      child2.info('nested');
    } finally {
      cap.restore();
    }
    const entry = JSON.parse(cap.lines[0]);
    assert.equal(entry.runId, 'run-1');
    assert.equal(entry.workflowId, 'wf-1');
  });

  it('child respects parent log level filtering', () => {
    const cap = captureStream(process.stdout);
    try {
      const logger = createLogger('warn'); // debug suppressed
      const child = logger.child({ runId: 'r1' });
      child.debug('suppressed');
      child.info('also suppressed');
    } finally {
      cap.restore();
    }
    assert.equal(cap.lines.length, 0);
  });
});
