#!/usr/bin/env node
/**
 * index.js — Pocket-Agents CLI entry point.
 *
 * Usage:
 *   node src/cli/index.js <command> [args...]
 *
 * Commands:
 *   doctor            Print environment health check
 *   config:show       Print resolved configuration (secrets redacted)
 *   events:tail       Print all events from the local JSONL event log
 *   list:agents       Print registered agent ids (one per line)
 *   list:tools        Print registered tool ids (one per line)
 *   list:workflows    Print registered workflow ids (one per line)
 *   tool:run          Execute a built-in tool with a JSON input payload
 *   agent:run         Execute an agent with a JSON input payload
 *   workflow:run      Execute a workflow with a JSON input payload
 *   dmux              dmux utility commands (`check`, `plan`)
 */

import { runDoctor, formatDoctorOutput } from './doctor.js';
import { runConfigShow } from './config-show.js';
import { runEventsTail } from './events-tail.js';
import { runListAgents } from './list-agents.js';
import { runListTools } from './list-tools.js';
import { runListWorkflows } from './list-workflows.js';
import { runDmux } from './dmux.js';
import { runToolRun } from './tool-run.js';
import { runAgentRun } from './agent-run.js';
import { runWorkflowRun } from './workflow-run.js';

const COMMANDS = 'doctor, config:show, events:tail, list:agents, list:tools, list:workflows, tool:run, agent:run, workflow:run, dmux';
const [, , command, ...args] = process.argv;

if (!command) {
  process.stderr.write('Usage: node src/cli/index.js <command>\n');
  process.stderr.write(`Commands: ${COMMANDS}\n`);
  process.exit(1);
}

if (command === 'doctor') {
  const result = runDoctor();
  process.stdout.write(formatDoctorOutput(result) + '\n');
  process.exit(0);
}

if (command === 'config:show') {
  const { output } = runConfigShow();
  process.stdout.write(output + '\n');
  process.exit(0);
}

if (command === 'events:tail') {
  const fileArg = args[0];
  const { output, error } = runEventsTail(fileArg);
  if (error) {
    process.stderr.write(`events:tail: ${error}\n`);
    process.exit(1);
  }
  process.stdout.write(output + '\n');
  process.exit(0);
}

if (command === 'list:agents') {
  const { output } = runListAgents();
  process.stdout.write(output + '\n');
  process.exit(0);
}

if (command === 'list:tools') {
  const { output } = runListTools();
  process.stdout.write(output + '\n');
  process.exit(0);
}

if (command === 'list:workflows') {
  const { output } = runListWorkflows();
  process.stdout.write(output + '\n');
  process.exit(0);
}

if (command === 'tool:run') {
  const toolId   = args[0];
  const inputIdx = args.indexOf('--input');
  const inputJson = inputIdx !== -1 ? args[inputIdx + 1] : undefined;
  const { output, error } = await runToolRun(toolId, inputJson);
  if (error) {
    process.stderr.write(`tool:run: ${error}\n`);
    process.exit(1);
  }
  process.stdout.write(output + '\n');
  process.exit(0);
}

if (command === 'agent:run') {
  const agentId  = args[0];
  const inputIdx = args.indexOf('--input');
  const inputJson = inputIdx !== -1 ? args[inputIdx + 1] : undefined;
  const { output, error } = await runAgentRun(agentId, inputJson);
  if (error) {
    process.stderr.write(`${error}\n`);
    process.exit(1);
  }
  process.stdout.write(output + '\n');
  process.exit(0);
}

if (command === 'workflow:run') {
  const workflowId = args[0];
  const inputIdx  = args.indexOf('--input');
  const inputJson = inputIdx !== -1 ? args[inputIdx + 1] : undefined;
  const { output, error } = await runWorkflowRun(workflowId, inputJson);
  if (error) {
    process.stderr.write(`${error}\n`);
    process.exit(1);
  }
  process.stdout.write(output + '\n');
  process.exit(0);
}

if (command === 'dmux') {
  const { output, error } = runDmux(args);
  if (error) {
    process.stderr.write(output + '\n');
    process.exit(1);
  }
  process.stdout.write(output + '\n');
  process.exit(0);
}

process.stderr.write(`Unknown command: ${command}\n`);
process.stderr.write(`Commands: ${COMMANDS}\n`);
process.exit(1);
