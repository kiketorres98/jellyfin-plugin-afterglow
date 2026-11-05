import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { load } from './load.mjs';

const ag = load('rail');

afterEach(() => {
  delete globalThis.location;
  delete globalThis.window;
});

describe('addresses that are not valid', () => {
  test('a "%" that is not an escape does not break reading the address', () => {
    globalThis.location = { hash: '#/search?query=100%&tab=%E0%A4%A' };
    assert.doesNotThrow(() => ag.pageParams());
    assert.equal(ag.pageParams().query, '100%');
    assert.equal(ag.pageName(), 'search');
  });

  test('the rail can still tell which page it is on', () => {
    assert.doesNotThrow(() => ag.isActive({ href: '#/home?tab=1' }, '#/home?tab=%E0%A4%A'));
    assert.equal(ag.railShownOn('#/search?query=100%'), true);
  });
});

describe('perUser', () => {
  function withUser(initial) {
    const current = { id: initial };
    globalThis.window = { ApiClient: { getCurrentUserId: () => current.id } };
    return current;
  }

  test('asks once per person: the same answer for the same user, a fresh one after another signs in', async () => {
    const who = withUser('anna');
    let calls = 0;
    const get = ag.perUser(async () => ({ call: ++calls }));
    assert.equal((await get()).call, 1);
    assert.equal((await get()).call, 1);
    who.id = 'bruno';
    assert.equal((await get()).call, 2);
    who.id = 'anna';
    assert.equal((await get()).call, 1, 'the first user still has the answer that was made for them');
  });

  test('a failed answer is not kept: the next ask tries again', async () => {
    withUser('anna');
    let calls = 0;
    const get = ag.perUser(async () => { calls += 1; if (calls === 1) throw new Error('offline'); return 'ok'; });
    await assert.rejects(get());
    assert.equal(await get(), 'ok');
  });
});

describe('retry gate', () => {
  test('lets an id be asked again only after the pause that follows a failure', () => {
    let now = 1000;
    const gate = ag.makeRetryGate(30000, () => now);
    assert.equal(gate.canAsk('a'), true);
    gate.failed('a');
    assert.equal(gate.canAsk('a'), false);
    assert.equal(gate.canAsk('b'), true);
    now += 29999;
    assert.equal(gate.canAsk('a'), false);
    now += 2;
    assert.equal(gate.canAsk('a'), true);
  });
});
