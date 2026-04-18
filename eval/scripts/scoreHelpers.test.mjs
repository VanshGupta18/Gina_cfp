import test from 'node:test';
import assert from 'node:assert/strict';
import { cellMatches, DEFAULT_TABLE_ABS_TOL, scalarOk } from '../lib/scoreHelpers.mjs';

test('cellMatches treats close floats as equal with table tolerance', () => {
  assert.equal(cellMatches('13034.99', '13034.990', DEFAULT_TABLE_ABS_TOL), true);
  assert.equal(cellMatches('479.1554', '479.16', 0.02), true);
});

test('scalarOk uses default abs_tol when manifest omits abs_tol', () => {
  assert.equal(scalarOk(479.1554, { value: 479.16 }), true);
  assert.equal(scalarOk(158.13709570957096, { value: 158.14 }), true);
});

test('scalarOk respects explicit abs_tol zero', () => {
  assert.equal(scalarOk(1.001, { value: 1, abs_tol: 0 }), false);
});
