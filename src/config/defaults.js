/**
 * defaults.js — Hardcoded default configuration values for Pocket-Agents.
 *
 * These are the lowest-priority values. Every key can be overridden by a
 * config file or environment variable.
 *
 * Note: workspaceRoot and dataDir are NOT included here — they are computed
 * at load time in loader.js because they depend on process.cwd().
 */

/** @readonly */
export const DEFAULTS = Object.freeze({
  /** Immutable name of the framework. Cannot be overridden. */
  frameworkName: 'pocket-agents',

  /** Logging verbosity. One of: error | warn | info | debug */
  logLevel: 'info',

  /** Whether shell command execution is permitted. */
  allowShell: false,

  /** Whether outbound HTTP calls are permitted. */
  allowHttp: false,

  /** Whether agents and tools may write to the filesystem. */
  allowFileWrite: false,

  /** Maximum time in milliseconds for a CLI command to run before timeout. */
  defaultCommandTimeoutMs: 30_000,

  /**
   * Optional path to the local JSONL event log file.
   * Empty string means the JSONL sink is disabled.
   * Set via PA_EVENTS_FILE env var or config file.
   */
  eventsFile: '',
});

/** Ordered set of valid log level strings. */
export const LOG_LEVELS = Object.freeze(['error', 'warn', 'info', 'debug']);
