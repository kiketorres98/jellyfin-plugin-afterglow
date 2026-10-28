/* Side menu: the sections as a narrow rail of icons down the left side, opening when you point at it. */

var TEXT = {
  en: { home: 'Home', favorites: 'Favorites', tonight: 'Tonight', search: 'Search', surprise: 'Surprise me', settings: 'Settings', dashboard: 'Dashboard', menu: 'Sections' },
  it: { home: 'Home', favorites: 'Preferiti', tonight: 'Stasera', search: 'Cerca', surprise: 'Sorprendimi', settings: 'Impostazioni', dashboard: 'Pannello di controllo', menu: 'Sezioni' },
  es: { home: 'Inicio', favorites: 'Favoritos', tonight: 'Esta noche', search: 'Buscar', surprise: 'Sorpréndeme', settings: 'Ajustes', dashboard: 'Panel de control', menu: 'Secciones' },
  fr: { home: 'Accueil', favorites: 'Favoris', tonight: 'Ce soir', search: 'Rechercher', surprise: 'Surprenez-moi', settings: 'Paramètres', dashboard: 'Tableau de bord', menu: 'Sections' },
  de: { home: 'Start', favorites: 'Favoriten', tonight: 'Heute Abend', search: 'Suchen', surprise: 'Überrasch mich', settings: 'Einstellungen', dashboard: 'Dashboard', menu: 'Bereiche' },
  pt: { home: 'Início', favorites: 'Favoritos', tonight: 'Esta noite', search: 'Pesquisar', surprise: 'Surpreenda-me', settings: 'Definições', dashboard: 'Painel', menu: 'Secções' },
};
ag.textTables = ag.textTables || {};
ag.textTables.rail = TEXT;

function text(language, key) {
  return (TEXT[language] || TEXT.en)[key];
}

// Material icons (24x24 paths).
var ICONS = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  heart: 'M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5A5.5 5.5 0 0 1 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 3 5.5 5.5 0 0 1 22 8.5c0 3.78-3.4 6.86-8.55 11.54z',
  film: 'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z',
  tv: 'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z',
  collection: 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z',
  music: 'M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z',
  list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19zM12 10.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z',
  download: 'M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z',
  moon: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
  search: 'M10 3a7 7 0 015.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1110 3zm0 2a5 5 0 100 10 5 5 0 000-10z',
  dice: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM7.5 18a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0-9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0-9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.48.48 0 0 0-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z',
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
};

/** The address of a library's page in the web client. */
ag.viewHref = function (view) {
  var id = view.Id;
  var kinds = { movies: 'movies', tvshows: 'tv', boxsets: 'boxsets', music: 'music' };
  var page = kinds[view.CollectionType];
  return page ? '#/' + page + '?topParentId=' + id + '&collectionType=' + view.CollectionType : '#/list?parentId=' + id;
};

var VIEW_ICONS = { movies: 'film', tvshows: 'tv', boxsets: 'collection', music: 'music' };
// Kinds of library that open a normal page here; the others (live TV, books…) stay in the web client's own menus.
var SHOWN_VIEWS = { movies: true, tvshows: true, boxsets: true, music: true };

/**
 * The entries of the rail: home, favourites, the libraries, then what other plugins added (Discover, Requests…).
 * `options.extras` are { label, href, icon } entries found in the page.
 */
ag.railItems = function (views, options) {
  var language = options.language;
  var items = [
    { label: text(language, 'home'), href: '#/home', icon: 'home' },
    { label: text(language, 'favorites'), href: '#/home?tab=1', icon: 'heart' },
  ];
  (views || []).forEach(function (view) {
    if (!SHOWN_VIEWS[view.CollectionType]) return;
    items.push({ label: view.Name, href: ag.viewHref(view), icon: VIEW_ICONS[view.CollectionType] || 'list' });
  });
  return items.concat(options.extras || []);
};

// What tells two addresses apart: the page, and these parameters.
var KEY_PARAMS = ['tab', 'seerrfinTab', 'topParentId', 'parentId'];

function parseHash(hash) {
  var body = (hash || '').replace(/^#\/?/, '');
  var parts = body.split('?');
  var params = {};
  (parts[1] || '').split('&').forEach(function (pair) {
    if (!pair) return;
    var kv = pair.split('=');
    params[kv[0]] = decodeURIComponent(kv[1] || '');
  });
  return { path: parts[0] || 'home', params: params };
}

/** Whether `item` is the entry for the page the browser is on. */
ag.isActive = function (item, hash) {
  var wanted = parseHash(item.href);
  var here = parseHash(hash);
  if (wanted.path !== here.path) return false;
  return KEY_PARAMS.every(function (key) { return (wanted.params[key] || '') === (here.params[key] || ''); });
};

// Pages with their own full-screen or administrative layout: the rail would only get in the way there.
var NO_RAIL = /^(dashboard|configurationpage|plugins|addplugin|video|login|selectserver|wizard\w*|forgotpassword\w*|quickconnect|startup)$/i;

/** Whether the rail belongs on the page at `hash`. */
ag.railShownOn = function (hash) {
  var section = parseHash(hash).path.split('/')[0];
  return !NO_RAIL.test(section);
};

function svg(name) {
  var ns = 'http://www.w3.org/2000/svg';
  var node = document.createElementNS(ns, 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('class', 'ag-rail-icon');
  node.setAttribute('aria-hidden', 'true');
  var path = document.createElementNS(ns, 'path');
  path.setAttribute('d', ICONS[name] || ICONS.list);
  path.setAttribute('fill', 'currentColor');
  node.appendChild(path);
  return node;
}

function entry(tag, props, icon, label) {
  props.class = 'ag-rail-item ' + (props.class || '');
  return ag.el(tag, props, [svg(icon), ag.el('span', { class: 'ag-rail-text', text: label })]);
}

// The pointer must rest on the rail this long before it opens: brushing past it does nothing.
var HOVER_OPEN_MS = 180;

ag.startSideMenu = function () {
  if (ag.layout() !== 'desktop') return;
  var rail = ag.el('nav', { class: 'ag-rail', 'aria-label': text(ag.language(), 'menu') });
  var views = [];
  var signature = '';

  // ---- opening and closing ----
  var hovered = false;
  var focused = false;
  var timer = 0;
  function refreshOpen() { rail.classList.toggle('open', hovered || focused); }
  rail.addEventListener('mouseover', function () {
    if (hovered || timer) return;
    timer = window.setTimeout(function () { timer = 0; hovered = true; refreshOpen(); }, HOVER_OPEN_MS);
  });
  rail.addEventListener('mouseleave', function () {
    window.clearTimeout(timer);
    timer = 0;
    hovered = false;
    refreshOpen();
  });
  rail.addEventListener('focusin', function (event) {
    var keyboard = true;
    try { keyboard = event.target.matches(':focus-visible'); } catch (e) { keyboard = true; }
    focused = keyboard;
    refreshOpen();
  });
  rail.addEventListener('focusout', function (event) {
    if (!rail.contains(event.relatedTarget)) { focused = false; refreshOpen(); }
  });

  // ---- what is in it ----
  function extrasFromPage() {
    var extras = [];
    var wanted = [
      { match: 'seerrfinTab=discover', label: 'Discover', icon: 'compass' },
      { match: 'seerrfinTab=requests', label: 'Requests', icon: 'download' },
    ];
    wanted.forEach(function (w) {
      var link = document.querySelector('header a[href*="' + w.match + '"], .mainDrawer a[href*="' + w.match + '"]');
      if (link) extras.push({ label: w.label, href: link.getAttribute('href'), icon: w.icon });
    });
    return extras;
  }

  function surprise() {
    var base = { IncludeItemTypes: 'Movie', Recursive: true, SortBy: 'Random', Limit: 1, EnableImages: false };
    ag.items(Object.assign({ Filters: 'IsUnplayed' }, base)).then(function (r) {
      return r.Items && r.Items[0] ? r : ag.items(base);
    }).then(function (r) {
      if (r.Items && r.Items[0]) location.hash = '#/details?id=' + r.Items[0].Id;
    });
  }

  function build() {
    // Read now, not at start-up: the web client sets the page language a moment after it loads.
    var language = ag.language();
    var items = ag.railItems(views, { language: language, extras: extrasFromPage() });
    var nextSignature = language + '|' + items.map(function (i) { return i.href; }).join('|');
    if (nextSignature === signature) return;
    signature = nextSignature;

    var top = ag.el('div', { class: 'ag-rail-group' }, items.map(function (item) {
      return entry('a', { href: item.href, 'data-href': item.href }, item.icon, item.label);
    }));
    var tools = ag.el('div', { class: 'ag-rail-group ag-rail-tools' }, [
      entry('a', { href: '#/search', 'data-href': '#/search' }, 'search', text(language, 'search')),
      typeof ag.openTonight === 'function' ? entry('button', { type: 'button', onclick: function () { ag.openTonight(); } }, 'moon', text(language, 'tonight')) : null,
      entry('button', { type: 'button', onclick: surprise }, 'dice', text(language, 'surprise')),
      entry('a', { href: '#/mypreferencesmenu', 'data-href': '#/mypreferencesmenu' }, 'settings', text(language, 'settings')),
    ]);
    rail.textContent = '';
    rail.appendChild(top);
    rail.appendChild(tools);
    markActive();
  }

  function markActive() {
    rail.querySelectorAll('a[data-href]').forEach(function (link) {
      var active = ag.isActive({ href: link.getAttribute('data-href') }, location.hash);
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
  }

  // The web client's own top menu is replaced: mark its pieces so the stylesheet can hide them.
  function hideOriginalMenu() {
    var bar = document.querySelector('header.MuiAppBar-root');
    if (!bar) return;
    var anchor = bar.querySelector('a[href="#/home?tab=1"]');
    if (anchor && anchor.parentElement) anchor.parentElement.setAttribute('data-ag-hide', '');
    var logo = bar.querySelector('a[href="#/"]');
    if (logo) logo.setAttribute('data-ag-hide', '');
    var search = bar.querySelector('a[href="#/search"]');
    if (search) search.setAttribute('data-ag-hide', '');
  }

  // On pages that have their own layout (dashboard, player, sign-in) the rail steps aside and the page gets its room back.
  function syncVisibility() {
    var shown = ag.railShownOn(location.hash);
    rail.hidden = !shown;
    document.documentElement.classList.toggle('ag-rail-on', shown);
  }

  document.body.appendChild(rail);
  syncVisibility();

  var refresh = ag.debounce(function () { build(); hideOriginalMenu(); markActive(); }, 150);
  new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
  ag.onPageChange(function () { syncVisibility(); markActive(); });

  ag.items; // (the web client's API is ready: this runs after it signed in)
  window.ApiClient.getJSON(window.ApiClient.getUrl('Users/' + window.ApiClient.getCurrentUserId() + '/Views'))
    .then(function (result) { views = result.Items || []; signature = ''; build(); hideOriginalMenu(); })
    .catch(function () { build(); hideOriginalMenu(); });
};
