import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function detectDmux() {
  const result = spawnSync('dmux', ['--version'], {
    encoding: 'utf8',
  });

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function sanitizeWorkerName(raw, index) {
  const base = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!base) {
    return `workflow-${index + 1}`;
  }

  return base;
}

function parsePlanArgs(args) {
  const workflows = [];
  let name;
  let out;

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];

    if (token === '--name') {
      name = args[i + 1];
      i += 1;
      continue;
    }

    if (token === '--out') {
      out = args[i + 1];
      i += 1;
      continue;
    }

    workflows.push(token);
  }

  return { workflows, name, out };
}

export function runDmux(args = [], deps = {}) {
  const cwd = deps.cwd ?? process.cwd();
  const now = deps.now ?? new Date();
  const runDetectDmux = deps.detectDmux ?? detectDmux;
  const writeFile = deps.writeFile ?? writeFileSync;
  const mkdir = deps.mkdir ?? mkdirSync;

  const subcommand = args[0];

  if (!subcommand) {
    return {
      output: [
        'Usage: node src/cli/index.js dmux <subcommand>',
        'Subcommands:',
        '  check',
        '  plan <workflow...> [--name <session-name>] [--out <file>]',
      ].join('\n'),
      error: 'Missing dmux subcommand',
    };
  }

  if (subcommand === 'check') {
    const result = runDetectDmux();

    if (result.status !== 0) {
      return {
        output: [
          'dmux is not available in PATH.',
          'Install with: npm install -g dmux',
          'Reference: https://github.com/standardagents/dmux',
        ].join('\n'),
        error: 'dmux not installed',
      };
    }

    const versionLine = result.stdout.trim().split('\n')[0] ?? 'dmux detected';
    return {
      output: `dmux available: ${versionLine}`,
    };
  }

  if (subcommand === 'plan') {
    const { workflows, name, out } = parsePlanArgs(args.slice(1));

    if (workflows.length === 0) {
      return {
        output: 'Usage: node src/cli/index.js dmux plan <workflow...> [--name <session-name>] [--out <file>]',
        error: 'At least one workflow is required for dmux plan',
      };
    }

    const sessionName = name && name.trim() ? name.trim() : `pa-dmux-${now.toISOString().replace(/[:.]/g, '-')}`;
    const planDir = resolve(cwd, '.orchestration');
    const fileName = out && out.trim() ? out.trim() : `${sessionName}.json`;
    const filePath = resolve(planDir, fileName);

    const workers = workflows.map((workflow, index) => ({
      name: sanitizeWorkerName(workflow, index),
      task: `Run workflow ${workflow} when workflow runner is available.`,
      workflow,
      command: `node src/cli/index.js run:workflow ${workflow}`,
    }));

    const plan = {
      version: 1,
      kind: 'dmux-preparatory-plan',
      createdAt: now.toISOString(),
      sessionName,
      note: 'Preparatory plan only. Pocket-Agents V1 currently has no workflow runner command.',
      workers,
      nextSteps: [
        'Implement run:workflow CLI command in the workflow-runner phase.',
        'Start dmux and create one pane per worker.',
        'Run each worker.command in its dedicated pane.',
      ],
    };

    mkdir(planDir, { recursive: true });
    writeFile(filePath, `${JSON.stringify(plan, null, 2)}\n`);

    return {
      output: [
        `Wrote dmux preparatory plan: ${filePath}`,
        `Workers: ${workers.length}`,
        'This plan is forward-compatible with the future workflow-runner phase.',
      ].join('\n'),
      filePath,
    };
  }

  return {
    output: `Unknown dmux subcommand: ${subcommand}`,
    error: 'Unknown dmux subcommand',
  };
}
