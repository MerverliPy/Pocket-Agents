/**
 * doctor.js — Pocket-Agents environment health check.
 *
 * Exported as pure functions so the CLI entry point and tests
 * can both use them without spawning a subprocess.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path to the repository root (two levels up from src/cli/). */
const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

/**
 * Read the project name from package.json.
 * @returns {string}
 */
function readProjectName() {
  try {
    const raw = readFileSync(resolve(projectRoot, 'package.json'), 'utf8');
    const pkg = JSON.parse(raw);
    return pkg.name ?? '(unknown)';
  } catch {
    return '(unknown)';
  }
}

/**
 * Run the doctor check and return structured results.
 *
 * @returns {{
 *   projectName: string,
 *   nodeVersion: string,
 *   cwd: string,
 *   checks: { contracts: boolean, docs: boolean, config: boolean }
 * }}
 */
export function runDoctor() {
  return {
    projectName: readProjectName(),
    nodeVersion: process.version,
    cwd: process.cwd(),
    checks: {
      contracts: existsSync(resolve(projectRoot, 'contracts')),
      docs: existsSync(resolve(projectRoot, 'docs')),
      config: existsSync(resolve(projectRoot, '.env')),
    },
  };
}

/**
 * Format doctor results as a human-readable string.
 *
 * @param {ReturnType<typeof runDoctor>} result
 * @returns {string}
 */
export function formatDoctorOutput(result) {
  const ok = (v) => (v ? '✓' : '✗');
  return [
    `Project:          ${result.projectName}`,
    `Node version:     ${result.nodeVersion}`,
    `Working dir:      ${result.cwd}`,
    ``,
    `Checks:`,
    `  contracts/      ${ok(result.checks.contracts)}`,
    `  docs/           ${ok(result.checks.docs)}`,
    `  .env (config)   ${ok(result.checks.config)}`,
  ].join('\n');
}
