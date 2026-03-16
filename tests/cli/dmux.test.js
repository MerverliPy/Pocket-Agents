import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runDmux } from '../../src/cli/dmux.js';

describe('runDmux', () => {
  it('returns usage error when no subcommand is provided', () => {
    const result = runDmux([]);
    assert.equal(result.error, 'Missing dmux subcommand');
    assert.match(result.output, /Usage:/);
  });

  it('check returns success when dmux is detected', () => {
    const result = runDmux(['check'], {
      detectDmux: () => ({ status: 0, stdout: 'dmux 1.2.3\n', stderr: '' }),
    });

    assert.equal(result.error, undefined);
    assert.match(result.output, /dmux available:/);
    assert.match(result.output, /1.2.3/);
  });

  it('check returns install guidance when dmux is missing', () => {
    const result = runDmux(['check'], {
      detectDmux: () => ({ status: 1, stdout: '', stderr: 'not found' }),
    });

    assert.equal(result.error, 'dmux not installed');
    assert.match(result.output, /Install with:/);
  });

  it('plan returns usage error when no workflows are provided', () => {
    const result = runDmux(['plan']);
    assert.equal(result.error, 'At least one workflow is required for dmux plan');
    assert.match(result.output, /Usage:/);
  });

  it('plan writes a preparatory plan file with workers', () => {
    const writes = [];
    const mkdirCalls = [];
    const now = new Date('2026-03-16T12:00:00.000Z');

    const result = runDmux(['plan', 'alpha-workflow', 'beta/workflow'], {
      cwd: '/repo',
      now,
      mkdir: (path, opts) => {
        mkdirCalls.push({ path, opts });
      },
      writeFile: (path, data) => {
        writes.push({ path, data });
      },
    });

    assert.equal(result.error, undefined);
    assert.ok(result.filePath);
    assert.equal(mkdirCalls.length, 1);
    assert.equal(writes.length, 1);
    assert.match(result.output, /Wrote dmux preparatory plan:/);

    const plan = JSON.parse(writes[0].data);
    assert.equal(plan.kind, 'dmux-preparatory-plan');
    assert.equal(plan.workers.length, 2);
    assert.equal(plan.workers[0].name, 'alpha-workflow');
    assert.equal(plan.workers[1].name, 'beta-workflow');
  });

  it('plan honors --name and --out options', () => {
    const writes = [];

    const result = runDmux(['plan', 'main', '--name', 'session-x', '--out', 'custom.json'], {
      cwd: '/repo',
      now: new Date('2026-03-16T12:00:00.000Z'),
      mkdir: () => {},
      writeFile: (path, data) => {
        writes.push({ path, data });
      },
    });

    assert.equal(result.error, undefined);
    assert.equal(result.filePath, '/repo/.orchestration/custom.json');

    const plan = JSON.parse(writes[0].data);
    assert.equal(plan.sessionName, 'session-x');
  });

  it('returns error for unknown dmux subcommand', () => {
    const result = runDmux(['unknown']);
    assert.equal(result.error, 'Unknown dmux subcommand');
    assert.match(result.output, /Unknown dmux subcommand/);
  });
});
