import test from 'node:test';
import assert from 'node:assert/strict';
import { total } from '../src/total.mjs';

test('empty basket total is zero', () => assert.equal(total([]), 0));
test('existing numeric behavior stays intact', () => {
  assert.equal(total([2, 3]), 5);
  assert.equal(total([-2, 3]), 1);
});
