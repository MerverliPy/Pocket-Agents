#!/usr/bin/env node
/**
 * index.js — Pocket-Agents CLI entry point.
 *
 * Usage:
 *   node src/cli/index.js <command>
 *
 * Commands:
 *   doctor   Print environment health check
 */

import { runDoctor, formatDoctorOutput } from './doctor.js';

const [, , command] = process.argv;

if (!command) {
  process.stderr.write('Usage: node src/cli/index.js <command>\n');
  process.stderr.write('Commands: doctor\n');
  process.exit(1);
}

if (command === 'doctor') {
  const result = runDoctor();
  process.stdout.write(formatDoctorOutput(result) + '\n');
  process.exit(0);
}

process.stderr.write(`Unknown command: ${command}\n`);
process.stderr.write('Commands: doctor\n');
process.exit(1);
