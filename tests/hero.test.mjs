import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { load } from './load.mjs';

const ag = load('hero');
const title = (Id, Type, played, extra) => Object.assign({ Id, Type, Overview: 'x', BackdropImageTags: ['t'], UserData: { Played: !!played } }, extra);

describe('pickFeaturedSet', () => {
  const pool = ['a', 'b', 'c', 'd', 'e'].map((id) => title(id, 'Movie'));

  test('offers the number of titles asked for, the same ones all day', () => {
    const first = ag.pickFeaturedSet(pool, 10, 3).map((i) => i.Id);
    assert.equal(first.length, 3);
    assert.deepEqual(ag.pickFeaturedSet(pool, 10, 3).map((i) => i.Id), first);
  });

  test('another day brings other titles', () => {
    assert.notDeepEqual(ag.pickFeaturedSet(pool, 10, 3).map((i) => i.Id), ag.pickFeaturedSet(pool, 11, 3).map((i) => i.Id));
  });

  test('titles without a wide picture or a plot, and anything that is not a film or series, are left out', () => {
    const items = [title('ok', 'Movie'), title('nopic', 'Movie', false, { BackdropImageTags: [] }), title('noplot', 'Series', false, { Overview: '' }), title('ep', 'Episode')];
    assert.deepEqual(ag.pickFeaturedSet(items, 1, 3).map((i) => i.Id), ['ok']);
  });

  test('unwatched titles come first; watched ones only fill what is missing', () => {
    const items = [title('seen1', 'Movie', true), title('new1', 'Movie'), title('seen2', 'Movie', true)];
    const ids = ag.pickFeaturedSet(items, 0, 2).map((i) => i.Id);
    assert.equal(ids[0], 'new1');
    assert.equal(ids.length, 2);
  });
});

describe('slotOfDay', () => {
  test('splits the day in equal parts, one for each title', () => {
    assert.equal(ag.slotOfDay(new Date(2026, 0, 1, 1), 3), 0);
    assert.equal(ag.slotOfDay(new Date(2026, 0, 1, 12), 3), 1);
    assert.equal(ag.slotOfDay(new Date(2026, 0, 1, 23), 3), 2);
  });
});
