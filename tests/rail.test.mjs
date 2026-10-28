import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { load } from './load.mjs';

const ag = load('rail');

const view = (Id, Name, CollectionType) => ({ Id, Name, CollectionType });

describe('viewHref', () => {
  test('points each kind of library at the page the web client uses for it', () => {
    assert.equal(ag.viewHref(view('a1', 'Film', 'movies')), '#/movies?topParentId=a1&collectionType=movies');
    assert.equal(ag.viewHref(view('b2', 'Serie', 'tvshows')), '#/tv?topParentId=b2&collectionType=tvshows');
    assert.equal(ag.viewHref(view('c3', 'Collezioni', 'boxsets')), '#/boxsets?topParentId=c3&collectionType=boxsets');
    assert.equal(ag.viewHref(view('d4', 'Musica', 'music')), '#/music?topParentId=d4&collectionType=music');
  });

  test('a library of a kind it does not know still opens, as a plain list', () => {
    assert.equal(ag.viewHref(view('e5', 'Altro', 'homevideos')), '#/list?parentId=e5');
    assert.equal(ag.viewHref(view('f6', 'Senza tipo', undefined)), '#/list?parentId=f6');
  });
});

describe('railItems', () => {
  const views = [view('a1', 'Film', 'movies'), view('b2', 'Serie TV', 'tvshows'), view('c3', 'Collezioni', 'boxsets')];

  test('home and favourites first, then the libraries in the server order, with their own names', () => {
    const items = ag.railItems(views, { language: 'it', extras: [] });
    assert.deepEqual(items.map((i) => i.label), ['Home', 'Preferiti', 'Film', 'Serie TV', 'Collezioni']);
    assert.deepEqual(items.map((i) => i.icon), ['home', 'heart', 'film', 'tv', 'collection']);
    assert.equal(items[0].href, '#/home');
    assert.equal(items[1].href, '#/home?tab=1');
  });

  test('the labels follow the language, English by default', () => {
    assert.equal(ag.railItems([], { language: 'en', extras: [] })[1].label, 'Favorites');
    assert.equal(ag.railItems([], { language: 'xx', extras: [] })[1].label, 'Favorites');
  });

  test('links other plugins added to the menu (Discover, Requests) keep their place after the libraries', () => {
    const extras = [{ label: 'Discover', href: '#/home?seerrfinTab=discover', icon: 'compass' }];
    const labels = ag.railItems(views, { language: 'it', extras }).map((i) => i.label);
    assert.deepEqual(labels.slice(-2), ['Collezioni', 'Discover']);
  });

  test('libraries of kinds that have no page of their own here (live TV, books…) are left out', () => {
    const all = [...views, view('x', 'TV', 'livetv'), view('y', 'Libri', 'books')];
    const labels = ag.railItems(all, { language: 'it', extras: [] }).map((i) => i.label);
    assert.ok(!labels.includes('TV') && !labels.includes('Libri'));
  });
});

describe('isActive', () => {
  const items = [
    { href: '#/home' }, { href: '#/home?tab=1' }, { href: '#/movies?topParentId=a1&collectionType=movies' },
  ];

  test('the home page matches home only, the favourites tab only favourites', () => {
    assert.equal(ag.isActive(items[0], '#/home'), true);
    assert.equal(ag.isActive(items[1], '#/home'), false);
    assert.equal(ag.isActive(items[1], '#/home?tab=1'), true);
    assert.equal(ag.isActive(items[0], '#/home?tab=1'), false);
  });

  test('a library matches while you are inside it, whatever else the address carries', () => {
    assert.equal(ag.isActive(items[2], '#/movies?topParentId=a1&collectionType=movies&sortBy=x'), true);
    assert.equal(ag.isActive(items[2], '#/movies?topParentId=zzz&collectionType=movies'), false);
  });
});

describe('railShownOn', () => {
  test('is shown on the ordinary pages', () => {
    ['#/home', '#/home?tab=1', '#/movies?topParentId=a1', '#/details?id=x', '#/search', '#/mypreferencesmenu', '#/list?parentId=a'].forEach((hash) => {
      assert.equal(ag.railShownOn(hash), true, hash);
    });
  });

  test('is not shown in the dashboard, its plugin pages, the player or the sign-in pages', () => {
    ['#/dashboard', '#/dashboard/users', '#/configurationpage?name=x', '#/plugins', '#/addplugin?name=a', '#/video', '#/login', '#/selectserver', '#/wizardstart', '#/forgotpassword', '#/quickconnect'].forEach((hash) => {
      assert.equal(ag.railShownOn(hash), false, hash);
    });
  });

  test('treats an empty address as the home page', () => {
    assert.equal(ag.railShownOn(''), true);
  });
});
