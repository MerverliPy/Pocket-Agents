import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { manifest, run, requiredPermissions } from '../../../src/tools/built-in/file-list.js';
import { validateToolManifest } from '../../../src/core/validators/index.js';

describe('file-list — manifest', () => {
  it('validates against ToolManifest schema', () => {
    const { valid, errors } = validateToolManifest(manifest);
    assert.ok(valid, `invalid manifest: ${JSON.stringify(errors)}`);
  });

  it('id is file-list', () => {
    assert.equal(manifest.id, 'file-list');
  });

  it('requires no special permissions', () => {
    assert.deepEqual(requiredPermissions, []);
  });

  it('inputSchema requires dir', () => {
    assert.ok(manifest.inputSchema.required.includes('dir'));
  });

  it('outputSchema requires entries', () => {
    assert.ok(manifest.outputSchema.required.includes('entries'));
  });
});

describe('file-list — run()', () => {
  let tmpDir;

  before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pa-file-list-'));
    writeFileSync(join(tmpDir, 'alpha.txt'), '', 'utf8');
    writeFileSync(join(tmpDir, 'beta.txt'), '', 'utf8');
    mkdirSync(join(tmpDir, 'subdir'));
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns { entries } as array of strings', () => {
    const output = run({ dir: tmpDir }, {});
    assert.ok(Array.isArray(output.entries));
  });

  it('entries contains file and directory names', () => {
    const output = run({ dir: tmpDir }, {});
    assert.ok(output.entries.includes('alpha.txt'));
    assert.ok(output.entries.includes('beta.txt'));
    assert.ok(output.entries.includes('subdir'));
  });

  it('throws for a non-existent directory', () => {
    assert.throws(() => run({ dir: join(tmpDir, 'nope') }, {}));
  });

  it('returns empty array for an empty directory', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'pa-empty-'));
    try {
      const output = run({ dir: emptyDir }, {});
      assert.deepEqual(output.entries, []);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
