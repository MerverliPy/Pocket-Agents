import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { manifest, run, requiredPermissions } from '../../../src/tools/built-in/file-write.js';
import { validateToolManifest } from '../../../src/core/validators/index.js';

describe('file-write — manifest', () => {
  it('validates against ToolManifest schema', () => {
    const { valid, errors } = validateToolManifest(manifest);
    assert.ok(valid, `invalid manifest: ${JSON.stringify(errors)}`);
  });

  it('id is file-write', () => {
    assert.equal(manifest.id, 'file-write');
  });

  it('requires allowFileWrite permission', () => {
    assert.ok(requiredPermissions.includes('allowFileWrite'));
  });

  it('inputSchema requires path and content', () => {
    assert.ok(manifest.inputSchema.required.includes('path'));
    assert.ok(manifest.inputSchema.required.includes('content'));
  });

  it('outputSchema requires path and bytesWritten', () => {
    assert.ok(manifest.outputSchema.required.includes('path'));
    assert.ok(manifest.outputSchema.required.includes('bytesWritten'));
  });
});

describe('file-write — run()', () => {
  let tmpDir;

  before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pa-file-write-'));
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes content to the specified file', () => {
    const filePath = join(tmpDir, 'output.txt');
    run({ path: filePath, content: 'written content' }, {});
    assert.ok(existsSync(filePath));
    assert.equal(readFileSync(filePath, 'utf8'), 'written content');
  });

  it('returns { path, bytesWritten }', () => {
    const filePath = join(tmpDir, 'result.txt');
    const output = run({ path: filePath, content: 'abc' }, {});
    assert.equal(output.path, filePath);
    assert.equal(output.bytesWritten, Buffer.byteLength('abc', 'utf8'));
  });

  it('overwrites an existing file', () => {
    const filePath = join(tmpDir, 'overwrite.txt');
    run({ path: filePath, content: 'original' }, {});
    run({ path: filePath, content: 'updated' }, {});
    assert.equal(readFileSync(filePath, 'utf8'), 'updated');
  });

  it('writes an empty string', () => {
    const filePath = join(tmpDir, 'empty.txt');
    const output = run({ path: filePath, content: '' }, {});
    assert.equal(output.bytesWritten, 0);
    assert.equal(readFileSync(filePath, 'utf8'), '');
  });
});
