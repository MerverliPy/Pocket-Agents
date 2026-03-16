import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { manifest, run, requiredPermissions } from '../../../src/tools/built-in/file-read.js';
import { validateToolManifest } from '../../../src/core/validators/index.js';

describe('file-read — manifest', () => {
  it('validates against ToolManifest schema', () => {
    const { valid, errors } = validateToolManifest(manifest);
    assert.ok(valid, `invalid manifest: ${JSON.stringify(errors)}`);
  });

  it('id is file-read', () => {
    assert.equal(manifest.id, 'file-read');
  });

  it('requires no special permissions', () => {
    assert.deepEqual(requiredPermissions, []);
  });

  it('inputSchema requires path', () => {
    assert.ok(manifest.inputSchema.required.includes('path'));
  });

  it('outputSchema requires content and size', () => {
    assert.ok(manifest.outputSchema.required.includes('content'));
    assert.ok(manifest.outputSchema.required.includes('size'));
  });
});

describe('file-read — run()', () => {
  let tmpDir;
  let testFile;
  const content = 'hello from file-read test\n';

  before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pa-file-read-'));
    testFile = join(tmpDir, 'test.txt');
    writeFileSync(testFile, content, 'utf8');
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns { content, size } for an existing file', () => {
    const output = run({ path: testFile }, {});
    assert.equal(output.content, content);
    assert.equal(typeof output.size, 'number');
    assert.ok(output.size > 0);
  });

  it('size matches the byte length of the content', () => {
    const output = run({ path: testFile }, {});
    assert.equal(output.size, Buffer.byteLength(content, 'utf8'));
  });

  it('throws for a non-existent file', () => {
    assert.throws(() => run({ path: join(tmpDir, 'nonexistent.txt') }, {}));
  });

  it('returns string content for a file containing JSON', () => {
    const jsonFile = join(tmpDir, 'data.json');
    writeFileSync(jsonFile, '{"key":"value"}', 'utf8');
    const output = run({ path: jsonFile }, {});
    assert.equal(output.content, '{"key":"value"}');
  });
});
