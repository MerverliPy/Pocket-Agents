/**
 * Schema validators for all Pocket-Agents public contracts.
 *
 * Schemas are compiled eagerly at module load time so invalid schemas or
 * missing contract files cause a hard failure at startup, not mid-run.
 *
 * Each exported function returns { valid: boolean, errors: Array|null }.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve } from 'node:path';
import Ajv from 'ajv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contractsDir = resolve(__dirname, '..', '..', '..', 'contracts');

/**
 * Load and parse a JSON Schema file from the contracts directory.
 * @param {string} name - Schema filename without extension (e.g. 'agent-manifest')
 * @returns {object} Parsed JSON Schema object
 */
function loadSchema(name) {
  const schemaPath = join(contractsDir, `${name}.schema.json`);
  const raw = readFileSync(schemaPath, 'utf8');
  return JSON.parse(raw);
}

const ajv = new Ajv({ allErrors: true });

// Compile all schemas at module load time. Any missing file or invalid schema
// throws immediately, satisfying the "fail loudly at startup" principle.
const compiled = {
  taskEnvelope: ajv.compile(loadSchema('task-envelope')),
  agentManifest: ajv.compile(loadSchema('agent-manifest')),
  toolManifest: ajv.compile(loadSchema('tool-manifest')),
  workflowManifest: ajv.compile(loadSchema('workflow-manifest')),
  eventRecord: ajv.compile(loadSchema('event-record')),
  runResult: ajv.compile(loadSchema('run-result')),
  agentResult: ajv.compile(loadSchema('agent-result')),
};

/**
 * Run a compiled AJV validator against data.
 * @param {import('ajv').ValidateFunction} validator
 * @param {unknown} data
 * @returns {{ valid: boolean, errors: Array<object>|null }}
 */
function runValidation(validator, data) {
  const valid = validator(data);
  return valid
    ? { valid: true, errors: null }
    : { valid: false, errors: validator.errors };
}

/**
 * Validate a TaskEnvelope object.
 * @param {unknown} data
 * @returns {{ valid: boolean, errors: Array<object>|null }}
 */
export function validateTaskEnvelope(data) {
  return runValidation(compiled.taskEnvelope, data);
}

/**
 * Validate an AgentManifest object.
 * @param {unknown} data
 * @returns {{ valid: boolean, errors: Array<object>|null }}
 */
export function validateAgentManifest(data) {
  return runValidation(compiled.agentManifest, data);
}

/**
 * Validate a ToolManifest object.
 * @param {unknown} data
 * @returns {{ valid: boolean, errors: Array<object>|null }}
 */
export function validateToolManifest(data) {
  return runValidation(compiled.toolManifest, data);
}

/**
 * Validate a WorkflowManifest object.
 * @param {unknown} data
 * @returns {{ valid: boolean, errors: Array<object>|null }}
 */
export function validateWorkflowManifest(data) {
  return runValidation(compiled.workflowManifest, data);
}

/**
 * Validate an EventRecord object.
 * @param {unknown} data
 * @returns {{ valid: boolean, errors: Array<object>|null }}
 */
export function validateEventRecord(data) {
  return runValidation(compiled.eventRecord, data);
}

/**
 * Validate a RunResult object.
 * @param {unknown} data
 * @returns {{ valid: boolean, errors: Array<object>|null }}
 */
export function validateRunResult(data) {
  return runValidation(compiled.runResult, data);
}

/**
 * Validate an AgentResult object.
 * @param {unknown} data
 * @returns {{ valid: boolean, errors: Array<object>|null }}
 */
export function validateAgentResult(data) {
  return runValidation(compiled.agentResult, data);
}
