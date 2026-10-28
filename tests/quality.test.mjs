import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { load } from './load.mjs';

const { qualityLabels } = load('quality');

const video = (extra = {}) => ({ Type: 'Video', Width: 1920, Height: 1080, VideoRangeType: 'SDR', ...extra });

describe('qualityLabels', () => {
  test('marks 4K and 2K, and nothing for the usual 1080p or less', () => {
    assert.deepEqual(qualityLabels(video({ Width: 3840, Height: 2160 })), ['4K']);
    assert.deepEqual(qualityLabels(video({ Width: 2560, Height: 1440 })), ['2K']);
    assert.deepEqual(qualityLabels(video()), []);
    assert.deepEqual(qualityLabels(video({ Width: 1280, Height: 720 })), []);
  });

  test('a wide cinema picture is judged by its width: 3840x1600 is still 4K, 1920x800 is 1080p', () => {
    assert.deepEqual(qualityLabels(video({ Width: 3840, Height: 1600 })), ['4K']);
    assert.deepEqual(qualityLabels(video({ Width: 1920, Height: 800 })), []);
  });

  test('marks HDR and Dolby Vision', () => {
    assert.deepEqual(qualityLabels(video({ VideoRangeType: 'HDR10' })), ['HDR']);
    assert.deepEqual(qualityLabels(video({ VideoRangeType: 'HLG' })), ['HDR']);
    assert.deepEqual(qualityLabels(video({ VideoRangeType: 'DOVIWithHDR10Plus' })), ['Dolby Vision']);
  });

  test('says both when it is both, resolution first', () => {
    assert.deepEqual(qualityLabels(video({ Width: 3840, Height: 1602, VideoRangeType: 'DOVIWithHDR10' })), ['4K', 'Dolby Vision']);
  });

  test('no video stream, no marks', () => {
    assert.deepEqual(qualityLabels(undefined), []);
    assert.deepEqual(qualityLabels({}), []);
  });
});
