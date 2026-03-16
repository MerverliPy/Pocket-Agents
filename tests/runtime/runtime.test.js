import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../../src/runtime/index.js';

describe('createRuntime', () => {
  it('returns an object with the expected shape', () => {
    const rt = createRuntime();
    assert.ok(rt, 'runtime should be truthy');
    assert.equal(typeof rt, 'object');
    assert.ok('config' in rt);
    assert.ok('logger' in rt);
    assert.ok('eventBus' in rt);
    assert.ok('registries' in rt);
    assert.ok('stateStore' in rt);
  });

  it('config is a resolved PocketAgentsConfig', () => {
    const rt = createRuntime();
    assert.equal(typeof rt.config, 'object');
    assert.equal(rt.config.frameworkName, 'pocket-agents');
    assert.equal(typeof rt.config.logLevel, 'string');
    assert.equal(typeof rt.config.workspaceRoot, 'string');
    assert.equal(typeof rt.config.dataDir, 'string');
    assert.equal(typeof rt.config.allowShell, 'boolean');
    assert.equal(typeof rt.config.allowHttp, 'boolean');
    assert.equal(typeof rt.config.allowFileWrite, 'boolean');
    assert.equal(typeof rt.config.defaultCommandTimeoutMs, 'number');
    assert.equal(typeof rt.config.eventsFile, 'string');
  });

  it('config is frozen', () => {
    const rt = createRuntime();
    assert.ok(Object.isFrozen(rt.config));
  });

  it('runtime is frozen', () => {
    const rt = createRuntime();
    assert.ok(Object.isFrozen(rt));
  });

  it('logger has info, warn, error, debug methods', () => {
    const rt = createRuntime();
    assert.equal(typeof rt.logger.info, 'function');
    assert.equal(typeof rt.logger.warn, 'function');
    assert.equal(typeof rt.logger.error, 'function');
    assert.equal(typeof rt.logger.debug, 'function');
  });

  it('logger is frozen', () => {
    const rt = createRuntime();
    assert.ok(Object.isFrozen(rt.logger));
  });

  it('logger has a child() method', () => {
    const rt = createRuntime();
    assert.equal(typeof rt.logger.child, 'function');
  });

  it('eventBus is a live event bus (Phase 4)', () => {
    const rt = createRuntime();
    assert.ok(rt.eventBus !== null, 'eventBus should be non-null');
    assert.equal(typeof rt.eventBus, 'object');
    assert.ok(rt.eventBus.handlers instanceof Map, 'eventBus should have handlers Map');
  });

  it('registries is a live object with agents, tools, and workflows (Phase 5)', () => {
    const rt = createRuntime();
    assert.ok(rt.registries !== null, 'registries should be non-null');
    assert.equal(typeof rt.registries, 'object');
    assert.ok('agents' in rt.registries);
    assert.ok('tools' in rt.registries);
    assert.ok('workflows' in rt.registries);
  });

  it('stateStore is null (Phase 5 placeholder)', () => {
    const rt = createRuntime();
    assert.equal(rt.stateStore, null);
  });

  it('accepts config overrides and applies them', () => {
    const rt = createRuntime({ logLevel: 'debug', allowShell: true });
    assert.equal(rt.config.logLevel, 'debug');
    assert.equal(rt.config.allowShell, true);
  });

  it('frameworkName cannot be overridden', () => {
    const rt = createRuntime({ frameworkName: 'something-else' });
    assert.equal(rt.config.frameworkName, 'pocket-agents');
  });

  it('each call returns a new independent runtime', () => {
    const rt1 = createRuntime({ logLevel: 'debug' });
    const rt2 = createRuntime({ logLevel: 'warn' });
    assert.notEqual(rt1, rt2);
    assert.notEqual(rt1.config, rt2.config);
    assert.equal(rt1.config.logLevel, 'debug');
    assert.equal(rt2.config.logLevel, 'warn');
  });
});

// ---------------------------------------------------------------------------
// Logger behaviour
// ---------------------------------------------------------------------------

describe('createRuntime — logger level filtering', () => {
  it('logger methods are callable without throwing', () => {
    // Capture and suppress stdout/stderr to avoid noise in test output
    const rt = createRuntime({ logLevel: 'error' });
    // At 'error' level, info/debug/warn are suppressed — no output, no throw
    assert.doesNotThrow(() => rt.logger.info('suppressed'));
    assert.doesNotThrow(() => rt.logger.debug('suppressed'));
    assert.doesNotThrow(() => rt.logger.warn('suppressed'));
    assert.doesNotThrow(() => rt.logger.error('shown'));
  });

  it('logger accepts optional data object', () => {
    const rt = createRuntime({ logLevel: 'error' });
    assert.doesNotThrow(() => rt.logger.error('msg', { code: 42, detail: 'x' }));
  });
});
