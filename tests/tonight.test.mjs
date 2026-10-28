import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { load } from './load.mjs';

const ag = load('tonight');
const MIN = 600000000;
const film = (Id, Genres, minutes) => ({ Id, Name: Id, Type: 'Movie', Genres, RunTimeTicks: minutes * MIN });
const pool = [
  film('comedy-short', ['Commedia'], 85),
  film('comedy-long', ['Commedia', 'Romance'], 140),
  film('horror', ['Horror', 'Thriller'], 100),
  film('kids', ['Animazione', 'Famiglia'], 90),
  film('action', ['Azione', 'Fantascienza'], 125),
  film('no-runtime', ['Commedia'], 0),
];
const ids = (films) => films.map((f) => f.Id);

describe('tonightDeck', () => {
  test('a mood keeps the films of its genres, in either language', () => {
    assert.deepEqual(ids(ag.tonightDeck(pool, 'laugh', 'any', 10)), ['comedy-short', 'comedy-long', 'no-runtime']);
    assert.equal(ag.tonightDeck([film('en', ['Comedy'], 90)], 'laugh', 'any', 10).length, 1);
    assert.deepEqual(ids(ag.tonightDeck(pool, 'scare', 'any', 10)), ['horror']);
    assert.deepEqual(ids(ag.tonightDeck(pool, 'family', 'any', 10)), ['kids']);
    assert.deepEqual(ids(ag.tonightDeck(pool, 'thrill', 'any', 10)), ['action']);
  });

  test('"any" keeps everything', () => {
    assert.equal(ag.tonightDeck(pool, 'any', 'any', 10).length, pool.length);
  });

  test('the length picks short (under 100 min) or a long evening (over 120 min)', () => {
    assert.deepEqual(ids(ag.tonightDeck(pool, 'any', 'short', 10)), ['comedy-short', 'kids']);
    assert.deepEqual(ids(ag.tonightDeck(pool, 'any', 'long', 10)), ['comedy-long', 'action']);
  });

  test('keeps at most `limit` films', () => {
    assert.equal(ag.tonightDeck(pool, 'any', 'any', 2).length, 2);
  });
});

describe('swipeVerdict', () => {
  test('a long drag to the right is "yes", to the left "no", a short one nothing', () => {
    assert.equal(ag.swipeVerdict(91, 300), 'yes');
    assert.equal(ag.swipeVerdict(-91, 300), 'no');
    assert.equal(ag.swipeVerdict(89, 300), null);
  });
});
