// Loads some of the web-src modules into a fresh `ag` object, the way the bundle does, so their pure functions can be tested.
import { readFileSync } from 'node:fs';

export function load(...names) {
  const ag = {};
  for (const name of ['core', ...names.filter((n) => n !== 'core')]) {
    const source = readFileSync(new URL(`../web-src/${name}.js`, import.meta.url), 'utf8');
    new Function('ag', source)(ag);
  }
  return ag;
}
