import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { load } from './load.mjs';

const ag = load('favorites');

describe('emptyFavoritesText', () => {
  test('speaks Italian to an Italian page', () => {
    const text = ag.emptyFavoritesText('it');
    assert.match(text.title, /preferit/i);
    assert.match(text.hint, /cuore/i);
  });

  test('falls back to English for other languages', () => {
    const text = ag.emptyFavoritesText('ja');
    assert.match(text.title, /favorites/i);
    assert.match(text.hint, /heart/i);
  });
});
