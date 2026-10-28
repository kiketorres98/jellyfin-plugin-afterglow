import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { addVersion, PLUGIN, versionEntry } from '../scripts/release.mjs';

const entry = (version) => versionEntry({ version, changelog: `v${version}`, checksum: 'ABC', timestamp: '2026-10-28T10:00:00Z' });

describe('manifest', () => {
  test('a version points at the release asset of its own tag', () => {
    const e = entry('0.2.0.0');
    assert.equal(e.sourceUrl, 'https://github.com/kiketorres98/jellyfin-plugin-afterglow/releases/download/v0.2.0.0/afterglow_0.2.0.0.zip');
    assert.equal(e.targetAbi, PLUGIN.targetAbi);
  });

  test('the first version creates the plugin entry', () => {
    const manifest = addVersion([], entry('0.1.0.0'));
    assert.equal(manifest.length, 1);
    assert.equal(manifest[0].guid, PLUGIN.guid);
    assert.deepEqual(manifest[0].versions.map((v) => v.version), ['0.1.0.0']);
  });

  test('the plugin entry carries the picture shown in the catalogue', () => {
    const manifest = addVersion([], entry('0.1.0.0'));
    assert.match(manifest[0].imageUrl, /^https:\/\/raw\.githubusercontent\.com\/kiketorres98\/jellyfin-plugin-afterglow\/main\/logo\.png$/);
  });

  test('a new version goes first and the old ones stay', () => {
    const manifest = addVersion(addVersion([], entry('0.1.0.0')), entry('0.2.0.0'));
    assert.deepEqual(manifest[0].versions.map((v) => v.version), ['0.2.0.0', '0.1.0.0']);
  });

  test('releasing the same version again replaces it instead of listing it twice', () => {
    const manifest = addVersion(addVersion([], entry('0.1.0.0')), { ...entry('0.1.0.0'), checksum: 'NEW' });
    assert.equal(manifest[0].versions.length, 1);
    assert.equal(manifest[0].versions[0].checksum, 'NEW');
  });

  test('other plugins in the same manifest are kept', () => {
    const other = { guid: 'other', name: 'Other', versions: [] };
    const manifest = addVersion([other], entry('0.1.0.0'));
    assert.deepEqual(manifest.map((p) => p.name), ['Afterglow', 'Other']);
  });
});
