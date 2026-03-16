import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { manifest, run, requiredPermissions } from '../../../src/tools/built-in/schema-validate.js';
import { validateToolManifest } from '../../../src/core/validators/index.js';

describe('schema-validate — manifest', () => {
  it('validates against ToolManifest schema', () => {
    const { valid, errors } = validateToolManifest(manifest);
    assert.ok(valid, `invalid manifest: ${JSON.stringify(errors)}`);
  });

  it('id is schema-validate', () => {
    assert.equal(manifest.id, 'schema-validate');
  });

  it('requires no special permissions', () => {
    assert.deepEqual(requiredPermissions, []);
  });

  it('inputSchema requires schema and data', () => {
    assert.ok(manifest.inputSchema.required.includes('schema'));
    assert.ok(manifest.inputSchema.required.includes('data'));
  });

  it('outputSchema requires valid', () => {
    assert.ok(manifest.outputSchema.required.includes('valid'));
  });
});

describe('schema-validate — run()', () => {
  const STRING_SCHEMA = { type: 'string' };
  const OBJECT_SCHEMA = {
    type: 'object',
    properties: { name: { type: 'string' }, age: { type: 'number' } },
    required: ['name'],
    additionalProperties: false,
  };

  it('returns { valid: true, errors: null } for valid data', () => {
    const output = run({ schema: STRING_SCHEMA, data: 'hello' }, {});
    assert.equal(output.valid, true);
    assert.equal(output.errors, null);
  });

  it('returns { valid: false, errors: array } for invalid data', () => {
    const output = run({ schema: STRING_SCHEMA, data: 42 }, {});
    assert.equal(output.valid, false);
    assert.ok(Array.isArray(output.errors));
    assert.ok(output.errors.length > 0);
  });

  it('validates a complex object schema — valid case', () => {
    const output = run({ schema: OBJECT_SCHEMA, data: { name: 'Alice', age: 30 } }, {});
    assert.equal(output.valid, true);
  });

  it('validates a complex object schema — invalid case (missing required field)', () => {
    const output = run({ schema: OBJECT_SCHEMA, data: { age: 30 } }, {});
    assert.equal(output.valid, false);
    assert.ok(output.errors.some((e) => e.message.includes('required')));
  });

  it('validates a complex object schema — invalid case (extra property)', () => {
    const output = run({ schema: OBJECT_SCHEMA, data: { name: 'Bob', extra: true } }, {});
    assert.equal(output.valid, false);
  });

  it('works with a number schema', () => {
    const output = run({ schema: { type: 'number', minimum: 0 }, data: -1 }, {});
    assert.equal(output.valid, false);
  });

  it('works with an array schema', () => {
    const output = run({ schema: { type: 'array', items: { type: 'string' } }, data: ['a', 'b'] }, {});
    assert.equal(output.valid, true);
  });

  it('throws when schema is not a valid JSON Schema', () => {
    assert.throws(() => run({ schema: { type: 'totally-invalid-type' }, data: 'x' }, {}));
  });

  it('handles null data correctly', () => {
    const output = run({ schema: { type: 'null' }, data: null }, {});
    assert.equal(output.valid, true);
  });
});
