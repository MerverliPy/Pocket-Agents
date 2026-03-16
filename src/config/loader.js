/**
 * loader.js — Pocket-Agents configuration loader.
 *
 * Resolution precedence (lowest → highest):
 *   1. Built-in defaults
 *   2. Optional JSON config file (pocket-agents.config.json or PA_CONFIG_FILE)
 *   3. Environment variables (PA_* prefix)
 *   4. Programmatic overrides (passed directly to loadConfig)
 *
 * The loader accepts an optional `env` parameter so tests can pass a
 * synthetic environment without mutating process.env.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULTS, LOG_LEVELS } from './defaults.js';

// ---------------------------------------------------------------------------
// Types (JSDoc only — no TypeScript in V1)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PocketAgentsConfig
 * @property {string}  frameworkName            - Always 'pocket-agents'.
 * @property {string}  logLevel                 - One of error|warn|info|debug.
 * @property {string}  workspaceRoot            - Absolute path to project root.
 * @property {string}  dataDir                  - Absolute path to runtime data dir.
 * @property {boolean} allowShell               - Whether shell execution is allowed.
 * @property {boolean} allowHttp                - Whether outbound HTTP is allowed.
 * @property {boolean} allowFileWrite           - Whether filesystem writes are allowed.
 * @property {number}  defaultCommandTimeoutMs  - CLI command timeout in milliseconds.
 * @property {string}  eventsFile               - Path to JSONL event log; '' disables the sink.
 */

/**
 * @typedef {Object} LoadConfigOptions
 * @property {string}               [configFilePath]  - Explicit path to JSON config file.
 * @property {Record<string,string>}[env]             - Env vars object (default: process.env).
 * @property {Partial<PocketAgentsConfig>} [overrides] - Programmatic overrides (highest priority).
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return the first non-empty value from the list, or `fallback`.
 * Treats undefined, null, and '' as absent.
 *
 * @param {Array<unknown>} values
 * @param {unknown}        fallback
 * @returns {unknown}
 */
function firstPresent(values, fallback) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return fallback;
}

/**
 * Parse a string from an env var as a boolean.
 * '1', 'true', 'yes' (case-insensitive) → true; anything else → false.
 *
 * @param {string|undefined} raw
 * @returns {boolean|undefined} undefined when raw is absent so callers can fall through.
 */
function parseBool(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  return /^(1|true|yes)$/i.test(raw.trim());
}

/**
 * Parse a string from an env var as a positive integer.
 * Returns undefined when raw is absent or not a valid integer.
 *
 * @param {string|undefined} raw
 * @returns {number|undefined}
 */
function parseInt10(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Load and parse the optional JSON config file.
 * Returns an empty object when the file does not exist.
 * Throws a descriptive error when the file exists but is not valid JSON.
 *
 * @param {string|undefined} filePath
 * @returns {Partial<PocketAgentsConfig>}
 */
function loadFileConfig(filePath) {
  if (!filePath || !existsSync(filePath)) return {};

  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`[pocket-agents] Cannot read config file "${filePath}": ${err.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`[pocket-agents] Config file "${filePath}" is not valid JSON: ${err.message}`);
  }
}

/**
 * Determine the config file path to attempt.
 * Priority: explicit option → PA_CONFIG_FILE env var → ./pocket-agents.config.json
 *
 * @param {string|undefined}          explicitPath
 * @param {Record<string,string>}     env
 * @returns {string|undefined}
 */
function resolveConfigFilePath(explicitPath, env) {
  if (explicitPath) return explicitPath;
  if (env.PA_CONFIG_FILE) return env.PA_CONFIG_FILE;

  const candidate = resolve(process.cwd(), 'pocket-agents.config.json');
  return existsSync(candidate) ? candidate : undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load the resolved Pocket-Agents configuration.
 *
 * @param {LoadConfigOptions} [options]
 * @returns {Readonly<PocketAgentsConfig>}
 */
export function loadConfig({ configFilePath, env = process.env, overrides = {} } = {}) {
  const fileConfig = loadFileConfig(resolveConfigFilePath(configFilePath, env));

  // workspaceRoot: overrides > env > file > cwd
  const workspaceRoot = String(
    firstPresent(
      [overrides.workspaceRoot, env.PA_WORKSPACE_ROOT, fileConfig.workspaceRoot],
      process.cwd(),
    ),
  );

  // dataDir: overrides > env > file > derived from workspaceRoot
  const dataDir = String(
    firstPresent(
      [overrides.dataDir, env.PA_DATA_DIR, fileConfig.dataDir],
      resolve(workspaceRoot, '.pocket-agents'),
    ),
  );

  // logLevel: overrides > env > file > default; fall back to 'info' if invalid
  const rawLogLevel = firstPresent(
    [overrides.logLevel, env.PA_LOG_LEVEL, fileConfig.logLevel],
    DEFAULTS.logLevel,
  );
  const logLevel = LOG_LEVELS.includes(String(rawLogLevel)) ? String(rawLogLevel) : 'info';

  // boolean flags
  const allowShell = firstPresent(
    [overrides.allowShell, parseBool(env.PA_ALLOW_SHELL), fileConfig.allowShell],
    DEFAULTS.allowShell,
  );

  const allowHttp = firstPresent(
    [overrides.allowHttp, parseBool(env.PA_ALLOW_HTTP), fileConfig.allowHttp],
    DEFAULTS.allowHttp,
  );

  const allowFileWrite = firstPresent(
    [overrides.allowFileWrite, parseBool(env.PA_ALLOW_FILE_WRITE), fileConfig.allowFileWrite],
    DEFAULTS.allowFileWrite,
  );

  // integer
  const defaultCommandTimeoutMs = firstPresent(
    [overrides.defaultCommandTimeoutMs, parseInt10(env.PA_COMMAND_TIMEOUT_MS), fileConfig.defaultCommandTimeoutMs],
    DEFAULTS.defaultCommandTimeoutMs,
  );

  // optional string — empty string means disabled
  const eventsFile = String(
    firstPresent(
      [overrides.eventsFile, env.PA_EVENTS_FILE, fileConfig.eventsFile],
      DEFAULTS.eventsFile,
    ),
  );

  return Object.freeze({
    frameworkName: DEFAULTS.frameworkName, // immutable, not overridable
    logLevel,
    workspaceRoot,
    dataDir,
    allowShell: Boolean(allowShell),
    allowHttp: Boolean(allowHttp),
    allowFileWrite: Boolean(allowFileWrite),
    defaultCommandTimeoutMs: Number(defaultCommandTimeoutMs),
    eventsFile,
  });
}
