/**
 * config-show.js — Pocket-Agents `config:show` CLI command.
 *
 * Loads and prints the resolved configuration, redacting any values whose
 * key name matches a known secret pattern.
 *
 * Exported as pure functions so they are independently testable.
 */

import { loadConfig } from '../config/loader.js';

// ---------------------------------------------------------------------------
// Secret redaction
// ---------------------------------------------------------------------------

/**
 * Patterns matched against config key names (case-insensitive).
 * A key matching any pattern has its value replaced with [REDACTED].
 *
 * The current V1 config keys contain no secrets, but this list is maintained
 * so that any future addition of a secret-like key is automatically redacted.
 */
const SECRET_KEY_PATTERNS = [
  /secret/i,
  /token/i,
  /password/i,
  /api[_-]?key/i,
  /private/i,
  /credential/i,
];

/**
 * Return true when a config key name looks like it may hold a secret value.
 *
 * @param {string} key
 * @returns {boolean}
 */
function isSecretKey(key) {
  return SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Return the display value for a config key/value pair.
 * Secret keys are replaced with '[REDACTED]'.
 *
 * @param {string}  key
 * @param {unknown} value
 * @returns {string}
 */
function displayValue(key, value) {
  if (isSecretKey(key)) return '[REDACTED]';
  return String(value);
}

// ---------------------------------------------------------------------------
// Command logic
// ---------------------------------------------------------------------------

/**
 * Load the resolved config and return it alongside a formatted display string.
 *
 * @param {import('../config/loader.js').LoadConfigOptions} [opts]
 * @returns {{ config: import('../config/loader.js').PocketAgentsConfig, output: string }}
 */
export function runConfigShow(opts = {}) {
  const config = loadConfig(opts);
  const output = formatConfigOutput(config);
  return { config, output };
}

/**
 * Format a resolved config object as a human-readable string.
 * Secret-like keys are redacted.
 *
 * @param {import('../config/loader.js').PocketAgentsConfig} config
 * @returns {string}
 */
export function formatConfigOutput(config) {
  const lines = ['Resolved configuration:'];

  for (const [key, value] of Object.entries(config)) {
    const label = key.padEnd(28);
    lines.push(`  ${label}${displayValue(key, value)}`);
  }

  return lines.join('\n');
}
