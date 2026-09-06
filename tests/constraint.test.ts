import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExecBoard, pxFn } from '../src/lab/board.ts';
import { evaluateConstraint, type Constraint, type Judgment } from '../src/lab/constraint.ts';
import { analyzePosition } from '../src/chess/analysis.ts';
import { checkingWitnessConstraint, kingInCheckConstraint, candidateLegalConstraint, registerChessConstraintPredicates } from '../src/chess/constraints.ts';

const pass: Constraint = { kind: 'constraint', id: 'pass', label: 'Pass', materials: {}, predicate: 'fn.test.pass', basis: { observations: [], assumptions: [] } };
const fail: Constraint = { kind: 'constraint', id: 'fail', label: 'Fail', materials: {}, predicate: 'fn.test.fail', basis: { observations: [], assumptions: [] } };
const unknown: Constraint = { kind: 'constraint', id: 'unknown', label: 'Unknown', materials: {}, predicate: 'fn.test.unknown', basis: { observations: [], assumptions: [] } };
function board() {
  const result = createExecBoard();
  result.register(pxFn<unknown, Judgment>('fn.test.pass'), () => ({ status: 'satisfied', reason: 'pass' }));
  result.register(pxFn<unknown, Judgment>('fn.test.fail'), () => ({ status: 'violated', reason: 'fail' }));
  result.register(pxFn<unknown, Judgment>('fn.test.unknown'), () => ({ status: 'unknown', reason: 'unknown' }));
  return result;
}

test('missing materials return unknown without reads and report unique required addresses', () => {
  const reader = board();
  const result = evaluateConstraint(reader, { ...pass, materials: { source: 'px.absent', alias: 'px.absent' }, basis: { observations: ['px.observed'], assumptions: ['px.absent'] } });
  assert.equal(result.status, 'unknown');
  assert.deepEqual(result.reads, []);
  assert.deepEqual(result.missing, ['px.absent', 'px.observed']);
});

test('groups use unknown semantics for all and any', () => {
  const reader = board();
  const all = evaluateConstraint(reader, { kind: 'constraint-group', id: 'all', label: 'All', operator: 'all', members: [pass, unknown] });
  assert.equal(all.status, 'unknown');
  assert.equal(all.children?.length, 2);
  assert.equal(evaluateConstraint(reader, { kind: 'constraint-group', id: 'any', label: 'Any', operator: 'any', members: [fail, unknown] }).status, 'unknown');
  assert.equal(evaluateConstraint(reader, { kind: 'constraint-group', id: 'all-fail', label: 'All fail', operator: 'all', members: [pass, fail, unknown] }).status, 'violated');
  assert.equal(evaluateConstraint(reader, { kind: 'constraint-group', id: 'any-pass', label: 'Any pass', operator: 'any', members: [fail, pass, unknown] }).status, 'satisfied');
  assert.throws(() => evaluateConstraint(reader, { kind: 'constraint-group', id: 'empty', label: 'Empty', operator: 'all', members: [] }));
});

test('predicate implementation errors propagate', () => {
  const reader = board();
  reader.register(pxFn<unknown, Judgment>('fn.test.throw'), () => { throw new Error('predicate defect'); });
  assert.throws(() => evaluateConstraint(reader, { ...pass, predicate: 'fn.test.throw' }), /predicate defect/);
});

test('chess constraints report the checking witnesses in a genuine checkmate specimen', () => {
  const analysis = analyzePosition({ pieces: [
    { square: 'f6', type: 'King', color: 'white' },
    { square: 'g7', type: 'Queen', color: 'white' },
    { square: 'h8', type: 'King', color: 'black' }
  ], sideToMove: 'black' });
  assert.equal(analysis.sides.black.checkmate, true);
  const reader = createExecBoard();
  reader.set('px.analysis', analysis); reader.set('px.side', 'black');
  registerChessConstraintPredicates(reader);
  const check = evaluateConstraint(reader, kingInCheckConstraint({ analysis: 'px.analysis', side: 'px.side' }));
  const witness = evaluateConstraint(reader, checkingWitnessConstraint({ analysis: 'px.analysis', side: 'px.side' }));
  assert.equal(check.status, 'satisfied');
  assert.equal(witness.status, 'satisfied');
  assert.equal((witness.details?.witnesses as readonly unknown[]).length, 1);
});


test('invalid chess predicate material is a programmer error', () => {
  const reader = createExecBoard();
  reader.set('px.candidate', { legal: true });
  registerChessConstraintPredicates(reader);
  assert.throws(() => evaluateConstraint(reader, candidateLegalConstraint({ candidate: 'px.candidate' })), /invalid material/);
});
