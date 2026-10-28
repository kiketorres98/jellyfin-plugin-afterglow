import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { load } from './load.mjs';

const ag = load('topten');
const movie = (Id) => ({ Id, Name: Id, Type: 'Movie' });
const episode = (Id, SeriesId) => ({ Id, Name: Id, Type: 'Episode', SeriesId, SeriesName: SeriesId, SeriesPrimaryImageTag: 'tag' });

describe('topTitles', () => {
  test('ranks by how often a title was watched, newest first on a tie', () => {
    const plays = [movie('a'), movie('b'), movie('b'), movie('c')];
    assert.deepEqual(ag.topTitles(plays, 10, 3).map((i) => i.Id), ['b', 'a', 'c']);
  });

  test('every episode counts for its series, which opens in its place', () => {
    const plays = [episode('e1', 's1'), episode('e2', 's1'), movie('m'), movie('n')];
    const top = ag.topTitles(plays, 10, 3);
    assert.equal(top[0].Id, 's1');
    assert.equal(top[0].Type, 'Series');
    assert.equal(top[0].ImageTags.Primary, 'tag');
  });

  test('keeps at most `limit` titles', () => {
    assert.equal(ag.topTitles([movie('a'), movie('b'), movie('c'), movie('d')], 3, 3).length, 3);
  });

  test('shows nothing when fewer titles than the minimum were watched', () => {
    assert.deepEqual(ag.topTitles([movie('a'), movie('b')], 10, 3), []);
  });

  test('an episode with no series is ignored', () => {
    assert.deepEqual(ag.topTitles([{ Id: 'x', Type: 'Episode' }], 10, 1), []);
  });
});

describe('topTenSpot', () => {
  const sections = [
    { visible: true, monitor: '' },
    { visible: true, monitor: 'videoplayback,markplayed' },
    { visible: false, monitor: 'audioplayback,markplayed' },
    { visible: true, monitor: 'videoplayback,markplayed' },
  ];

  test('"top" goes under the billboard', () => {
    assert.deepEqual(ag.topTenSpot('top', sections), { place: 'top' });
  });

  test('"afterContinue" goes right after the first visible shelf of what is being watched', () => {
    assert.deepEqual(ag.topTenSpot('afterContinue', sections), { place: 'after', index: 1 });
  });

  test('"afterContinue" falls back to the top when there is no such shelf', () => {
    assert.deepEqual(ag.topTenSpot('afterContinue', [{ visible: true, monitor: '' }]), { place: 'top' });
  });

  test('"end" goes after the last shelf', () => {
    assert.deepEqual(ag.topTenSpot('end', sections), { place: 'end' });
  });

  test('an unknown position means the top', () => {
    assert.deepEqual(ag.topTenSpot('nonsense', sections), { place: 'top' });
  });
});
