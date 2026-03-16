/**
 * shell-exec — Execute a shell command and return its output.
 *
 * Requires config.allowShell = true.
 *
 * Uses spawnSync('sh', ['-c', command]) so the full POSIX shell syntax is
 * available. Non-zero exit codes are returned in the output rather than
 * thrown, giving callers full control over error handling.
 *
 * SECURITY NOTE: This tool passes the command string directly to a shell.
 * It is intended for trusted local developer workflows. Callers must ensure
 * the command string comes from a trusted source. Shell injection is a known
 * risk documented in known-issues.md.
 */

import { spawnSync } from 'node:child_process';

/** @type {import('../executor.js').ToolManifest} */
export const manifest = Object.freeze({
  id: 'shell-exec',
  version: '1.0.0',
  description: 'Execute a shell command and return stdout, stderr, and exit code.',
  inputSchema: {
    type: 'object',
    properties: {
      command:   { type: 'string', description: 'Shell command to run (passed to sh -c).' },
      cwd:       { type: 'string', description: 'Working directory for the command.' },
      timeoutMs: { type: 'number', description: 'Timeout in ms (overrides config default).' },
    },
    required: ['command'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      stdout:   { type: 'string', description: 'Standard output from the command.' },
      stderr:   { type: 'string', description: 'Standard error from the command.' },
      exitCode: { type: 'number', description: 'Exit code (0 = success).' },
    },
    required: ['stdout', 'stderr', 'exitCode'],
    additionalProperties: false,
  },
});

/** Requires allowShell config flag. */
export const requiredPermissions = ['allowShell'];

/**
 * Execute the shell command in `input.command`.
 *
 * @param {{ command: string, cwd?: string, timeoutMs?: number }} input
 * @param {{ config: { defaultCommandTimeoutMs: number } }} context
 * @returns {{ stdout: string, stderr: string, exitCode: number }}
 */
export function run(input, context) {
  const { command, cwd, timeoutMs } = input;
  const timeout = timeoutMs ?? context.config?.defaultCommandTimeoutMs ?? 30_000;

  const result = spawnSync('sh', ['-c', command], {
    cwd: cwd || process.cwd(),
    timeout,
    encoding: 'utf8',
  });

  return {
    stdout:   result.stdout ?? '',
    stderr:   result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}
