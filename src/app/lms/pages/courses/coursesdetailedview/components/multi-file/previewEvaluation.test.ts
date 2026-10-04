import assert from 'node:assert/strict';
import { previewEvaluation } from './previewEvaluation';

const result = previewEvaluation({ score: 5, status: 'submitted', passed: 2, total: 4, perCase: [
  { index: 0, hidden: false, passed: true, input: 'visible', expectedOutput: 'ok' },
  { index: 1, hidden: true, passed: true, input: 'first hidden', expectedOutput: 'ok' },
  { index: 2, hidden: true, passed: false, input: 'failing hidden', expectedOutput: 'ok' },
  { index: 3, hidden: true, passed: true, input: 'locked hidden', expectedOutput: 'ok' },
] });
assert.deepEqual(result.testcase.cases.map((item) => item.unlocked), [true, true, true, false]);
assert.equal(result.testcase.cases[3].input, '');
assert.equal(result.testcase.cases[2].input, 'failing hidden');
const visibleFailed = previewEvaluation({ score: 0, status: 'submitted', passed: 1, total: 2, perCase: [
  { index: 0, hidden: false, passed: false }, { index: 1, hidden: true, passed: true, input: 'secret', expectedOutput: 'secret' },
] });
assert.equal(visibleFailed.testcase.cases[1].unlocked, false);
assert.equal(visibleFailed.testcase.cases[1].expectedOutput, '');
assert.equal(result.testcase.passed, 2);
assert.equal(result.testcase.total, 4);
console.log('7 preview grading parity checks passed');
