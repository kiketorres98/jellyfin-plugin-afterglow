import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { load } from './load.mjs';

const ag = load('rail', 'favorites', 'hero', 'topten', 'tonight');
const LANGUAGES = ['en', 'it', 'es', 'fr', 'de', 'pt'];
const shape = (value) => (typeof value === 'object' && value !== null ? Object.keys(value).sort().map((k) => `${k}:${shape(value[k])}`).join(',') : typeof value);

describe('the words of the plugin', () => {
  for (const [name, table] of Object.entries(ag.textTables || {})) {
    test(`${name} is written in every language, with the same entries as English`, () => {
      for (const language of LANGUAGES) {
        assert.ok(table[language], `${name}: ${language} is missing`);
        assert.equal(shape(table[language]), shape(table.en), `${name}: ${language} differs from en`);
      }
    });
  }

  test('all five groups of words are checked', () => {
    assert.deepEqual(Object.keys(ag.textTables || {}).sort(), ['favorites', 'hero', 'rail', 'tonight', 'topTen']);
  });
});

describe('tonightDeck with genres in other languages', () => {
  const MIN = 600000000;
  const film = (Id, Genres) => ({ Id, Genres, RunTimeTicks: 90 * MIN });
  const cases = [
    ['laugh', ['Comedia', 'Comédie', 'Komödie', 'Comédia']],
    ['scare', ['Terror', 'Horreur']],
    ['thrill', ['Acción', 'Aventure', 'Science-Fiction', 'Abenteuer', 'Ação', 'Ficção científica']],
    ['heart', ['Drame', 'Liebesfilm', 'Música']],
    ['family', ['Familia', 'Familial', 'Familie', 'Animação']],
  ];
  for (const [mood, genres] of cases) {
    test(`${mood} finds ${genres.join(', ')}`, () => {
      const pool = genres.map((g) => film(g, [g]));
      assert.equal(ag.tonightDeck(pool, mood, 'any', 20).length, genres.length);
    });
  }
});
