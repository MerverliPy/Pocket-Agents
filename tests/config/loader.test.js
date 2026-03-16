import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../../src/config/loader.js';
import { DEFAULTS } from '../../src/config/defaults.js';

// ---------------------------------------------------------------------------
// Temp directory for file config tests
// ---------------------------------------------------------------------------

let tmpDir;

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'pa-config-test-'));
});

after(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Write a JSON config file in the temp directory and return its path.
 * @param {object} contents
 * @returns {string}
 */
function writeConfig(contents) {
  const path = join(tmpDir, `config-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(path, JSON.stringify(contents));
  return path;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

describe('loadConfig — defaults', () => {
  it('returns frameworkName as pocket-agents', () => {
    const cfg = loadConfig({ env: {} });
    assert.equal(cfg.frameworkName, 'pocket-agents');
  });

  it('returns default logLevel of info', () => {
    const cfg = loadConfig({ env: {} });
    assert.equal(cfg.logLevel, DEFAULTS.logLevel);
  });

  it('returns default allowShell of false', () => {
    const cfg = loadConfig({ env: {} });
    assert.equal(cfg.allowShell, false);
  });

  it('returns default allowHttp of false', () => {
    const cfg = loadConfig({ env: {} });
    assert.equal(cfg.allowHttp, false);
  });

  it('returns default allowFileWrite of false', () => {
    const cfg = loadConfig({ env: {} });
    assert.equal(cfg.allowFileWrite, false);
  });

  it('returns default defaultCommandTimeoutMs of 30000', () => {
    const cfg = loadConfig({ env: {} });
    assert.equal(cfg.defaultCommandTimeoutMs, 30_000);
  });

  it('returns a string for workspaceRoot', () => {
    const cfg = loadConfig({ env: {} });
    assert.equal(typeof cfg.workspaceRoot, 'string');
    assert.ok(cfg.workspaceRoot.length > 0);
  });

  it('returns a string for dataDir', () => {
    const cfg = loadConfig({ env: {} });
    assert.equal(typeof cfg.dataDir, 'string');
    assert.ok(cfg.dataDir.includes('.pocket-agents'));
  });

  it('returns a frozen object', () => {
    const cfg = loadConfig({ env: {} });
    assert.ok(Object.isFrozen(cfg));
  });
});

// ---------------------------------------------------------------------------
// Environment variable overrides
// ---------------------------------------------------------------------------

describe('loadConfig — env var overrides', () => {
  it('PA_LOG_LEVEL overrides default logLevel', () => {
    const cfg = loadConfig({ env: { PA_LOG_LEVEL: 'debug' } });
    assert.equal(cfg.logLevel, 'debug');
  });

  it('invalid PA_LOG_LEVEL falls back to info', () => {
    const cfg = loadConfig({ env: { PA_LOG_LEVEL: 'verbose' } });
    assert.equal(cfg.logLevel, 'info');
  });

  it('PA_ALLOW_SHELL=true enables allowShell', () => {
    const cfg = loadConfig({ env: { PA_ALLOW_SHELL: 'true' } });
    assert.equal(cfg.allowShell, true);
  });

  it('PA_ALLOW_SHELL=1 enables allowShell', () => {
    const cfg = loadConfig({ env: { PA_ALLOW_SHELL: '1' } });
    assert.equal(cfg.allowShell, true);
  });

  it('PA_ALLOW_SHELL=yes enables allowShell', () => {
    const cfg = loadConfig({ env: { PA_ALLOW_SHELL: 'yes' } });
    assert.equal(cfg.allowShell, true);
  });

  it('PA_ALLOW_SHELL=false keeps allowShell false', () => {
    const cfg = loadConfig({ env: { PA_ALLOW_SHELL: 'false' } });
    assert.equal(cfg.allowShell, false);
  });

  it('PA_ALLOW_HTTP=true enables allowHttp', () => {
    const cfg = loadConfig({ env: { PA_ALLOW_HTTP: 'true' } });
    assert.equal(cfg.allowHttp, true);
  });

  it('PA_ALLOW_FILE_WRITE=true enables allowFileWrite', () => {
    const cfg = loadConfig({ env: { PA_ALLOW_FILE_WRITE: 'true' } });
    assert.equal(cfg.allowFileWrite, true);
  });

  it('PA_COMMAND_TIMEOUT_MS overrides defaultCommandTimeoutMs', () => {
    const cfg = loadConfig({ env: { PA_COMMAND_TIMEOUT_MS: '60000' } });
    assert.equal(cfg.defaultCommandTimeoutMs, 60_000);
  });

  it('non-numeric PA_COMMAND_TIMEOUT_MS falls back to default', () => {
    const cfg = loadConfig({ env: { PA_COMMAND_TIMEOUT_MS: 'notanumber' } });
    assert.equal(cfg.defaultCommandTimeoutMs, 30_000);
  });

  it('PA_WORKSPACE_ROOT overrides workspaceRoot', () => {
    const cfg = loadConfig({ env: { PA_WORKSPACE_ROOT: '/custom/root' } });
    assert.equal(cfg.workspaceRoot, '/custom/root');
  });

  it('PA_DATA_DIR overrides dataDir', () => {
    const cfg = loadConfig({ env: { PA_DATA_DIR: '/custom/data' } });
    assert.equal(cfg.dataDir, '/custom/data');
  });

  it('dataDir is derived from PA_WORKSPACE_ROOT when PA_DATA_DIR is absent', () => {
    const cfg = loadConfig({ env: { PA_WORKSPACE_ROOT: '/my/ws' } });
    assert.equal(cfg.workspaceRoot, '/my/ws');
    assert.ok(cfg.dataDir.startsWith('/my/ws'));
  });
});

// ---------------------------------------------------------------------------
// File config overrides
// ---------------------------------------------------------------------------

describe('loadConfig — file config overrides', () => {
  it('file logLevel overrides default', () => {
    const path = writeConfig({ logLevel: 'warn' });
    const cfg = loadConfig({ configFilePath: path, env: {} });
    assert.equal(cfg.logLevel, 'warn');
  });

  it('file allowShell overrides default', () => {
    const path = writeConfig({ allowShell: true });
    const cfg = loadConfig({ configFilePath: path, env: {} });
    assert.equal(cfg.allowShell, true);
  });

  it('file defaultCommandTimeoutMs overrides default', () => {
    const path = writeConfig({ defaultCommandTimeoutMs: 15000 });
    const cfg = loadConfig({ configFilePath: path, env: {} });
    assert.equal(cfg.defaultCommandTimeoutMs, 15_000);
  });

  it('file workspaceRoot overrides default', () => {
    const path = writeConfig({ workspaceRoot: '/file/ws' });
    const cfg = loadConfig({ configFilePath: path, env: {} });
    assert.equal(cfg.workspaceRoot, '/file/ws');
  });

  it('env var overrides file config', () => {
    const path = writeConfig({ logLevel: 'warn' });
    const cfg = loadConfig({ configFilePath: path, env: { PA_LOG_LEVEL: 'error' } });
    assert.equal(cfg.logLevel, 'error');
  });

  it('env var PA_ALLOW_SHELL overrides file allowShell', () => {
    const path = writeConfig({ allowShell: true });
    const cfg = loadConfig({ configFilePath: path, env: { PA_ALLOW_SHELL: 'false' } });
    assert.equal(cfg.allowShell, false);
  });

  it('non-existent file path is silently ignored', () => {
    const cfg = loadConfig({ configFilePath: '/nonexistent/path.json', env: {} });
    assert.equal(cfg.logLevel, DEFAULTS.logLevel);
  });

  it('invalid JSON in config file throws an error', () => {
    const badPath = join(tmpDir, 'bad.json');
    writeFileSync(badPath, 'NOT JSON {{{');
    assert.throws(
      () => loadConfig({ configFilePath: badPath, env: {} }),
      /not valid JSON/i,
    );
  });
});

// ---------------------------------------------------------------------------
// Programmatic overrides (highest priority)
// ---------------------------------------------------------------------------

describe('loadConfig — programmatic overrides', () => {
  it('override logLevel takes precedence over env var', () => {
    const cfg = loadConfig({
      env: { PA_LOG_LEVEL: 'warn' },
      overrides: { logLevel: 'debug' },
    });
    assert.equal(cfg.logLevel, 'debug');
  });

  it('override allowShell takes precedence over file config', () => {
    const path = writeConfig({ allowShell: false });
    const cfg = loadConfig({
      configFilePath: path,
      env: {},
      overrides: { allowShell: true },
    });
    assert.equal(cfg.allowShell, true);
  });

  it('frameworkName cannot be overridden', () => {
    const cfg = loadConfig({ overrides: { frameworkName: 'something-else' } });
    assert.equal(cfg.frameworkName, 'pocket-agents');
  });

  it('override workspaceRoot takes precedence over env var', () => {
    const cfg = loadConfig({
      env: { PA_WORKSPACE_ROOT: '/env/ws' },
      overrides: { workspaceRoot: '/override/ws' },
    });
    assert.equal(cfg.workspaceRoot, '/override/ws');
  });
});

// ---------------------------------------------------------------------------
// Full precedence chain
// ---------------------------------------------------------------------------

describe('loadConfig — full precedence chain', () => {
  it('overrides > env > file > defaults (logLevel)', () => {
    const path = writeConfig({ logLevel: 'debug' });
    // file says debug, env says warn, override says error → override wins
    const cfg = loadConfig({
      configFilePath: path,
      env: { PA_LOG_LEVEL: 'warn' },
      overrides: { logLevel: 'error' },
    });
    assert.equal(cfg.logLevel, 'error');
  });

  it('env > file > defaults when no override (logLevel)', () => {
    const path = writeConfig({ logLevel: 'debug' });
    // file says debug, env says warn → env wins
    const cfg = loadConfig({
      configFilePath: path,
      env: { PA_LOG_LEVEL: 'warn' },
    });
    assert.equal(cfg.logLevel, 'warn');
  });

  it('file > defaults when no env or override (logLevel)', () => {
    const path = writeConfig({ logLevel: 'debug' });
    const cfg = loadConfig({ configFilePath: path, env: {} });
    assert.equal(cfg.logLevel, 'debug');
  });
});
