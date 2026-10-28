import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { load } from './load.mjs';

const ag = load('drawer');

describe('repeatedEntries', () => {
  test('finds the entries whose address already appeared earlier', () => {
    assert.deepEqual(ag.repeatedEntries(['#/home', '#/a', '#/b', '#/a', '#/b', '#/c']), [3, 4]);
  });

  test('finds nothing when every address is different', () => {
    assert.deepEqual(ag.repeatedEntries(['#/home', '#/a']), []);
  });

  test('entries without an address are never called repeats', () => {
    assert.deepEqual(ag.repeatedEntries([null, '', null, '#/a']), []);
  });
});
