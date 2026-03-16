import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runDoctor, formatDoctorOutput } from '../../src/cli/doctor.js';

test('runDoctor returns the expected shape', () => {
  const result = runDoctor();
  assert.equal(typeof result.projectName, 'string');
  assert.equal(typeof result.nodeVersion, 'string');
  assert.equal(typeof result.cwd, 'string');
  assert.equal(typeof result.checks, 'object');
  assert.equal(typeof result.checks.contracts, 'boolean');
  assert.equal(typeof result.checks.docs, 'boolean');
  assert.equal(typeof result.checks.config, 'boolean');
});

test('runDoctor reports correct project name', () => {
  const result = runDoctor();
  assert.equal(result.projectName, 'pocket-agents');
});

test('runDoctor nodeVersion starts with v', () => {
  const result = runDoctor();
  assert.match(result.nodeVersion, /^v\d+\.\d+\.\d+/);
});

test('runDoctor detects existing docs folder', () => {
  const result = runDoctor();
  assert.equal(result.checks.docs, true);
});

test('runDoctor detects existing contracts folder', () => {
  const result = runDoctor();
  assert.equal(result.checks.contracts, true);
});

test('formatDoctorOutput includes project name', () => {
  const result = runDoctor();
  const output = formatDoctorOutput(result);
  assert.ok(output.includes('pocket-agents'), 'output should include project name');
});

test('formatDoctorOutput includes node version', () => {
  const result = runDoctor();
  const output = formatDoctorOutput(result);
  assert.ok(output.includes(result.nodeVersion), 'output should include node version');
});

test('formatDoctorOutput includes working dir', () => {
  const result = runDoctor();
  const output = formatDoctorOutput(result);
  assert.ok(output.includes(result.cwd), 'output should include cwd');
});
