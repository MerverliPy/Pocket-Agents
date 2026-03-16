/**
 * logger.js — Minimal structured logger for Pocket-Agents.
 *
 * Writes JSON-encoded log lines to stdout (info/debug) or stderr (warn/error).
 * Level filtering is applied: messages below the configured level are suppressed.
 *
 * Minimum log fields in every entry:
 *   timestamp, level, msg
 *
 * Optional context fields (set via child()):
 *   runId, workflowId, agentId, toolId
 *
 * Additional ad-hoc fields can be passed as the second argument to any log
 * method and are spread into the entry.
 *
 * Usage:
 *   const logger = createLogger('info');
 *   const runLogger = logger.child({ runId: 'run-abc' });
 *   runLogger.info('agent started', { agentId: 'agent-1' });
 *
 * This is a V1 implementation. A full logging library (e.g. pino) can replace
 * this module in a future phase without changing the caller interface.
 */

import { LOG_LEVELS } from '../config/defaults.js';

/**
 * @typedef {Object} Logger
 * @property {(msg: string, data?: object) => void} error
 * @property {(msg: string, data?: object) => void} warn
 * @property {(msg: string, data?: object) => void} info
 * @property {(msg: string, data?: object) => void} debug
 * @property {(context: object) => Readonly<Logger>}  child
 */

/**
 * Create a structured logger that respects the given log level.
 *
 * @param {string} [logLevel='info']   - Minimum level to emit. One of error|warn|info|debug.
 * @param {object} [boundContext={}]   - Fields merged into every log entry (used by child()).
 * @returns {Readonly<Logger>}
 */
export function createLogger(logLevel = 'info', boundContext = {}) {
  const resolvedLevel = LOG_LEVELS.includes(logLevel) ? logLevel : 'info';
  const threshold = LOG_LEVELS.indexOf(resolvedLevel);

  /**
   * Write a single log entry.
   *
   * Field order: timestamp, level, msg, then context fields, then ad-hoc data
   * (ad-hoc data wins over context on key conflicts).
   *
   * @param {string} level
   * @param {string} msg
   * @param {object} [data]
   */
  function write(level, msg, data = {}) {
    const levelIndex = LOG_LEVELS.indexOf(level);
    if (levelIndex > threshold) return; // level is less important → suppress

    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      msg,
      ...boundContext,
      ...data,
    });

    if (level === 'error' || level === 'warn') {
      process.stderr.write(entry + '\n');
    } else {
      process.stdout.write(entry + '\n');
    }
  }

  return Object.freeze({
    /** @param {string} msg @param {object} [data] */
    error: (msg, data) => write('error', msg, data),
    /** @param {string} msg @param {object} [data] */
    warn:  (msg, data) => write('warn',  msg, data),
    /** @param {string} msg @param {object} [data] */
    info:  (msg, data) => write('info',  msg, data),
    /** @param {string} msg @param {object} [data] */
    debug: (msg, data) => write('debug', msg, data),

    /**
     * Create a child logger with additional context fields bound to every entry.
     * The child inherits the parent's log level. Per-call data overrides context
     * fields on key conflicts.
     *
     * @param {object} context - Context fields (e.g. { runId, workflowId, agentId, toolId })
     * @returns {Readonly<Logger>}
     */
    child: (context) =>
      createLogger(resolvedLevel, { ...boundContext, ...context }),
  });
}
