import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runToolRun } from '../../src/cli/tool-run.js';

describe('runToolRun', () => {
  it('returns error when toolId is missing', async () => {
    const result = await runToolRun(undefined, undefined);
    assert.ok(result.error, 'should return an error');
    assert.match(result.error, /Usage/i);
  });

  it('returns error for an unknown tool', async () => {
    const result = await runToolRun('no-such-tool', '{}');
    assert.ok(result.error, 'should return an error for unknown tool');
    assert.match(result.error, /Unknown tool/);
  });

  it('returns error when inputJson is not valid JSON', async () => {
    const result = await runToolRun('schema-validate', 'NOT JSON');
    assert.ok(result.error, 'should return an error for invalid JSON');
    assert.match(result.error, /JSON/i);
  });

  it('schema-validate with valid input returns formatted JSON output', async () => {
    const inputJson = JSON.stringify({ schema: { type: 'string' }, data: 'hello' });
    const result = await runToolRun('schema-validate', inputJson);
    assert.ok(!result.error, `unexpected error: ${result.error}`);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.valid, true);
  });

  it('schema-validate with invalid data returns valid:false', async () => {
    const inputJson = JSON.stringify({ schema: { type: 'string' }, data: 42 });
    const result = await runToolRun('schema-validate', inputJson);
    assert.ok(!result.error);
    const parsed = JSON.parse(result.output);
    assert.equal(parsed.valid, false);
  });

  it('file-read returns error for non-existent file (via error field)', async () => {
    const inputJson = JSON.stringify({ path: '/nonexistent/file.txt' });
    const result = await runToolRun('file-read', inputJson);
    assert.ok(result.error, 'should return error for missing file');
  });

  it('returns error when allowShell is false and shell-exec is called', async () => {
    // Default config has allowShell: false
    const inputJson = JSON.stringify({ command: 'echo hi' });
    const result = await runToolRun('shell-exec', inputJson);
    assert.ok(result.error, 'should return permission denied error');
    assert.match(result.error, /allowShell/i);
  });
});
