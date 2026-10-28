/*!
 * Afterglow for Jellyfin: the script of the Afterglow plugin (https://github.com/kiketorres98/jellyfin-plugin-afterglow).
 * Generated from web-src/ by scripts/build-web.mjs: edit the sources, not this file.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || window.__afterglow) return;
  window.__afterglow = { loaded: true };
  var ag = {};

  // ---------- core ----------
  (function (ag) {
    /* Core: small helpers shared by every feature. (All modules see the same `ag` object.) */
    
    /** Builds an element: ag.el('a', { class: 'x', href: '#/home' }, ['text', otherElement]). */
    ag.el = function (tag, props, children) {
      var node = document.createElement(tag);
      Object.keys(props || {}).forEach(function (key) {
        var value = props[key];
        if (value === undefined || value === null || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key.indexOf('on') === 0 && typeof value === 'function') node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value === true ? '' : value);
      });
      (children || []).forEach(function (child) {
        if (child === null || child === undefined) return;
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      });
      return node;
    };
    
    /** 'desktop', 'mobile' or 'tv', as the web client itself decided (it puts a layout-* class on <html>). */
    ag.layout = function () {
      var classes = document.documentElement.className;
      if (classes.indexOf('layout-tv') >= 0) return 'tv';
      if (classes.indexOf('layout-mobile') >= 0) return 'mobile';
      return 'desktop';
    };
    
    ag.debounce = function (fn, wait) {
      var timer = 0;
      return function () {
        var args = arguments;
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { fn.apply(null, args); }, wait);
      };
    };
    
    /** The part of the address after "#/" and before "?": "home", "movies", "details"… */
    ag.pageName = function () {
      return (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    };
    
    /** The query part of the address as an object. */
    ag.pageParams = function () {
      var query = (location.hash.split('?')[1] || '');
      var out = {};
      query.split('&').forEach(function (pair) {
        if (!pair) return;
        var parts = pair.split('=');
        out[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
      });
      return out;
    };
    
    /** Calls `callback` now and whenever the page changes (address change, or the web client drawing a new page). */
    ag.onPageChange = function (callback) {
      var run = ag.debounce(callback, 120);
      window.addEventListener('hashchange', run);
      window.addEventListener('popstate', run);
      document.addEventListener('viewshow', run);
      callback();
    };
    
    /** Like fetch, for this server's own API with the user's credentials. */
    ag.items = function (query) {
      var client = window.ApiClient;
      return client.getItems(client.getCurrentUserId(), query);
    };
    
    /** A web-client image address for an item. */
    ag.imageUrl = function (id, type, params) {
      return window.ApiClient.getUrl('Items/' + id + '/Images/' + type, params || {});
    };
    
    /** The page's language as two letters ("it", "en"…), for the few words the plugin writes itself. */
    ag.language = function () {
      return (document.documentElement.lang || navigator.language || 'en').slice(0, 2).toLowerCase();
    };
    
    /** The address of an item's page in the web client. */
    ag.itemHref = function (id) {
      return '#/details?id=' + id;
    };
    
    /** Plays an item with the web client's own player: opens its page and presses the Play button there. */
    ag.play = function (id) {
      ag.pendingPlay = { id: id, until: Date.now() + 8000 };
      if (location.hash === ag.itemHref(id)) ag.pressPendingPlay();
      else location.hash = ag.itemHref(id);
    };
    
    ag.pressPendingPlay = function () {
      var wanted = ag.pendingPlay;
      if (!wanted) return;
      if (Date.now() > wanted.until) { ag.pendingPlay = null; return; }
      if (ag.pageParams().id !== wanted.id) return;
      var button = document.querySelector('.btnPlay:not(.hide)');
      if (!button) { window.setTimeout(ag.pressPendingPlay, 250); return; }
      ag.pendingPlay = null;
      button.click();
    };
    
  })(ag);

  // ---------- quality ----------
  (function (ag) {
    /* Quality marks: small "4K" / "2K" / "HDR" / "Dolby Vision" marks in the corner of posters. */
    
    function resolutionLabel(video) {
      var width = video.Width || 0;
      var height = video.Height || 0;
      if (width >= 3400 || height >= 2000) return '4K';
      if (width >= 2400 || height >= 1300) return '2K';
      return undefined;
    }
    
    function rangeLabel(video) {
      var range = video.VideoRangeType || '';
      if (range.indexOf('DOVI') === 0) return 'Dolby Vision';
      if (range.indexOf('HDR') === 0 || range === 'HLG') return 'HDR';
      return undefined;
    }
    
    /** The marks for a video stream: resolution first (only 4K / 2K), then the range. Plain 1080p gets none. */
    ag.qualityLabels = function (video) {
      if (!video) return [];
      return [resolutionLabel(video), rangeLabel(video)].filter(Boolean);
    };
    
    ag.startQualityMarks = function () {
      var BATCH = 40;
      var cache = new Map(); // item id -> labels
      var asked = new Set();
    
      function apply(card, labels) {
        if (!labels.length || card.querySelector('.ag-tags')) return;
        var inList = card.classList.contains('listItem');
        var host = card.querySelector(inList ? '.listItemMediaInfo' : '.cardScalable');
        if (!host) return;
        var tags = ag.el('ul', { class: inList ? 'ag-tags ag-tags-row' : 'ag-tags', 'aria-label': 'Quality' }, labels.map(function (label) {
          return ag.el('li', { text: label });
        }));
        if (inList) host.insertBefore(tags, host.firstChild); else host.appendChild(tags);
      }
    
      function fetchLabels(ids) {
        return ag.items({ Ids: ids.join(','), Fields: 'MediaStreams', EnableImages: false, EnableUserData: false })
          .then(function (result) {
            (result.Items || []).forEach(function (item) {
              var video = (item.MediaStreams || []).filter(function (s) { return s.Type === 'Video'; })[0];
              var labels = ag.qualityLabels(video);
              cache.set(item.Id, labels);
              document.querySelectorAll('[data-id="' + item.Id + '"].card, [data-id="' + item.Id + '"].listItem').forEach(function (card) { apply(card, labels); });
            });
          })
          .catch(function () { ids.forEach(function (id) { asked.delete(id); }); });
      }
    
      function scan() {
        var wanted = [];
        document.querySelectorAll('.card[data-id], .listItem[data-id]').forEach(function (card) {
          var type = card.dataset.type;
          if (type !== 'Movie' && type !== 'Episode') return;
          var id = card.dataset.id;
          if (cache.has(id)) apply(card, cache.get(id));
          else if (!asked.has(id)) { asked.add(id); wanted.push(id); }
        });
        for (var i = 0; i < wanted.length; i += BATCH) fetchLabels(wanted.slice(i, i + BATCH));
      }
    
      var scheduleScan = ag.debounce(scan, 300);
      new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true });
      scan();
    };
    
  })(ag);

  // ---------- rail ----------
  (function (ag) {
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
    
  })(ag);

  // ---------- favorites ----------
  (function (ag) {
    /* Favourites page: a few words and a way forward instead of a blank screen when nothing has been marked yet. */    
        
    var EMPTY_TEXT = {    
      en: { title: 'No favorites yet', hint: 'Tap the heart on a movie, show or episode and it will be here.', action: 'Browse the home page' },    
      it: { title: 'Non hai ancora nessun preferito', hint: 'Tocca il cuore su un film, una serie o un episodio e lo ritroverai qui.', action: 'Vai alla home' },    
      es: { title: 'Aún no tienes favoritos', hint: 'Toca el corazón en una película, serie o episodio y lo encontrarás aquí.', action: 'Ir al inicio' },    
      fr: { title: 'Aucun favori pour le moment', hint: 'Touchez le cœur sur un film, une série ou un épisode et vous le retrouverez ici.', action: 'Aller à l’accueil' },    
      de: { title: 'Noch keine Favoriten', hint: 'Tippe auf das Herz bei einem Film, einer Serie oder einer Folge, dann findest du sie hier.', action: 'Zur Startseite' },    
      pt: { title: 'Ainda não tem favoritos', hint: 'Toque no coração de um filme, série ou episódio e vai encontrá-lo aqui.', action: 'Ir para o início' },    
    };    
    ag.textTables = ag.textTables || {};    
    ag.textTables.favorites = EMPTY_TEXT;    
        
    /** The words of the empty favourites page, in the page's language. */    
    ag.emptyFavoritesText = function (language) {    
      return EMPTY_TEXT[language] || EMPTY_TEXT.en;    
    };    
        
    var HEART = 'M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5A5.5 5.5 0 0 1 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 3 5.5 5.5 0 0 1 22 8.5c0 3.78-3.4 6.86-8.55 11.54z';    
        
    ag.startFavoritesHint = function () {    
      var checking = false;    
        
      function icon() {    
        var ns = 'http://www.w3.org/2000/svg';    
        var node = document.createElementNS(ns, 'svg');    
        node.setAttribute('viewBox', '0 0 24 24');    
        node.setAttribute('aria-hidden', 'true');    
        var path = document.createElementNS(ns, 'path');    
        path.setAttribute('d', HEART);    
        path.setAttribute('fill', 'currentColor');    
        node.appendChild(path);    
        return node;    
      }    
        
      function show(tab) {    
        if (tab.querySelector('.ag-empty')) return;    
        var words = ag.emptyFavoritesText(ag.language());    
        tab.appendChild(ag.el('div', { class: 'ag-empty', role: 'status' }, [    
          icon(),    
          ag.el('h2', { text: words.title }),    
          ag.el('p', { text: words.hint }),    
          ag.el('a', { class: 'ag-empty-action', href: '#/home', text: words.action }),    
        ]));    
      }    
        
      function check() {    
        var tab = document.getElementById('favoritesTab');    
        if (!tab || !tab.classList.contains('is-active')) return;    
        if (tab.querySelector('.card')) {    
          var stale = tab.querySelector('.ag-empty');    
          if (stale) stale.remove();    
          return;    
        }    
        if (checking) return;    
        checking = true;    
        // Ask the server rather than trust a page that may still be loading.    
        ag.items({ Recursive: true, Filters: 'IsFavorite', Limit: 1, EnableImages: false, EnableUserData: false })    
          .then(function (result) {    
            var current = document.getElementById('favoritesTab');    
            if (current && current.classList.contains('is-active') && !current.querySelector('.card') && !(result.Items || []).length) show(current);    
          })    
          .catch(function () {})    
          .then(function () { checking = false; });    
      }    
        
      var scheduled = ag.debounce(check, 400);    
      new MutationObserver(scheduled).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });    
      ag.onPageChange(check);    
    };    
    
  })(ag);

  // ---------- drawer ----------
  (function (ag) {
    /* The web client's own menu (phones, tablets, TV): hides an entry that another plugin put in twice. */
    
    /** The positions of the entries whose address already appeared earlier in `hrefs`. */
    ag.repeatedEntries = function (hrefs) {
      var seen = {};
      var repeats = [];
      hrefs.forEach(function (href, index) {
        if (!href) return;
        if (seen[href]) repeats.push(index);
        else seen[href] = true;
      });
      return repeats;
    };
    
    ag.startDrawerCleanup = function () {
      function clean() {
        var drawer = document.querySelector('.MuiDrawer-root');
        if (!drawer) return;
        var rows = Array.prototype.slice.call(drawer.querySelectorAll('li')).filter(function (row) { return row.querySelector('a[href]'); });
        var hrefs = rows.map(function (row) { return row.querySelector('a[href]').getAttribute('href'); });
        ag.repeatedEntries(hrefs).forEach(function (index) { rows[index].setAttribute('data-ag-dup', ''); });
    
        // A group left with nothing visible goes too, with the divider above it.
        drawer.querySelectorAll('.MuiList-root').forEach(function (list) {
          var items = list.querySelectorAll('li');
          if (!items.length || list.querySelector('li:not([data-ag-dup])')) return;
          list.setAttribute('data-ag-dup', '');
          var before = list.previousElementSibling;
          if (before && /MuiDivider/.test(before.className)) before.setAttribute('data-ag-dup', '');
        });
      }
      new MutationObserver(ag.debounce(clean, 100)).observe(document.body, { childList: true, subtree: true });
      clean();
    };
    
  })(ag);

  // ---------- hero ----------
  (function (ag) {
    /* Home billboard: a few titles in the spotlight, and the page takes the colours of the one on show. */    
        
    var HERO_COUNT = 3;    
    var POOL_SIZE = 60;    
    var ROTATE_MS = 9000;    
    var MS_PER_DAY = 86400000;    
    var FEATURABLE = { Movie: true, Series: true };    
        
    var HERO_TEXT = {    
      en: { movie: 'Featured movie', series: 'Featured series', play: 'Play', more: 'More info', label: 'Featured', show: 'Show ' },    
      it: { movie: 'Film in evidenza', series: 'Serie in evidenza', play: 'Riproduci', more: 'Altre info', label: 'In evidenza', show: 'Mostra ' },    
      es: { movie: 'Película destacada', series: 'Serie destacada', play: 'Reproducir', more: 'Más información', label: 'Destacados', show: 'Mostrar ' },    
      fr: { movie: 'Film à l’affiche', series: 'Série à l’affiche', play: 'Lecture', more: 'Plus d’infos', label: 'À l’affiche', show: 'Afficher ' },    
      de: { movie: 'Empfohlener Film', series: 'Empfohlene Serie', play: 'Abspielen', more: 'Mehr Infos', label: 'Empfohlen', show: 'Anzeigen: ' },    
      pt: { movie: 'Filme em destaque', series: 'Série em destaque', play: 'Reproduzir', more: 'Mais informações', label: 'Em destaque', show: 'Mostrar ' },    
    };    
    ag.textTables = ag.textTables || {};    
    ag.textTables.hero = HERO_TEXT;    
        
    function heroText() { return HERO_TEXT[ag.language()] || HERO_TEXT.en; }    
        
    /** Whole days since 1970 in the viewer's own time zone: the titles change at local midnight. */    
    ag.dayNumber = function (date) {    
      var now = date || new Date();    
      return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / MS_PER_DAY);    
    };    
        
    /** Which of `count` titles to show first: the day is split in equal parts. */    
    ag.slotOfDay = function (now, count) {    
      return Math.min(count - 1, Math.floor((now.getHours() / 24) * count));    
    };    
        
    function canFeature(item) {    
      return !!FEATURABLE[item.Type] && !!(item.BackdropImageTags && item.BackdropImageTags.length) && !!item.Overview;    
    }    
        
    /** The titles for the billboard: a few different ones picked by the day number. Unwatched first; watched ones fill up. */    
    ag.pickFeaturedSet = function (items, day, count) {    
      var usable = items.filter(canFeature);    
      var played = function (item) { return !!(item.UserData && item.UserData.Played); };    
      var unseen = usable.filter(function (item) { return !played(item); });    
      var seen = usable.filter(played);    
      function take(pool, wanted) {    
        if (pool.length <= wanted) return pool.slice();    
        var first = (Math.abs(day) * wanted) % pool.length;    
        var out = [];    
        for (var k = 0; k < wanted; k++) out.push(pool[(first + k) % pool.length]);    
        return out;    
      }    
      var chosen = take(unseen, count);    
      return chosen.length < count ? chosen.concat(take(seen, count - chosen.length)) : chosen;    
    };    
        
    // ---------- the colours behind the page ----------    
        
    var AMBIENT_WIDTH = 8; // a handful of pixels, stretched over the screen: only colours, no shapes, almost nothing to download    
        
    /** The fixed colour layer behind the page. `show(item)` fades to the colours of an item; `clear()` removes it. */    
    ag.ambient = (function () {    
      var host = null;    
      var layers = {};    
      function ensure() {    
        if (host && host.isConnected) return host;    
        host = ag.el('div', { class: 'ag-ambient', 'aria-hidden': 'true' });    
        layers = {};    
        document.body.insertBefore(host, document.body.firstChild);    
        return host;    
      }    
      return {    
        show: function (item) {    
          var tag = item.BackdropImageTags && item.BackdropImageTags[0];    
          if (!tag) return;    
          var root = ensure();    
          if (!layers[item.Id]) {    
            var layer = ag.el('div', { class: 'ag-ambient-layer' });    
            layer.style.backgroundImage = 'url("' + ag.imageUrl(item.Id, 'Backdrop', { maxWidth: AMBIENT_WIDTH, tag: tag }) + '")';    
            root.appendChild(layer);    
            layers[item.Id] = layer;    
          }    
          Object.keys(layers).forEach(function (id) { layers[id].classList.toggle('on', id === item.Id); });    
          document.documentElement.classList.add('ag-ambient-on');    
        },    
        clear: function () {    
          if (host) host.remove();    
          host = null;    
          layers = {};    
          document.documentElement.classList.remove('ag-ambient-on');    
        },    
      };    
    })();    
        
    // ---------- the billboard ----------    
        
    function isHome() {    
      var params = ag.pageParams();    
      return ag.pageName() === 'home' && !params.tab && !params.seerrfinTab;    
    }    
        
    function facts(item) {    
      var parts = [];    
      if (item.ProductionYear) parts.push(String(item.ProductionYear));    
      if (item.RunTimeTicks) {    
        var minutes = Math.round(item.RunTimeTicks / 600000000);    
        parts.push(minutes >= 60 ? Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'min' : minutes + ' min');    
      }    
      if (item.CommunityRating) parts.push('★ ' + item.CommunityRating.toFixed(1));    
      if (item.Genres && item.Genres.length) parts.push(item.Genres.slice(0, 3).join(' · '));    
      return parts.join('  ·  ');    
    }    
        
    function buildSlide(item, words) {    
      var tag = item.BackdropImageTags[0];    
      var logoTag = item.ImageTags && item.ImageTags.Logo;    
      var title = ag.el('h2', { class: 'ag-hero-title' });    
      if (logoTag) {    
        var logo = ag.el('img', { class: 'ag-hero-logo', src: ag.imageUrl(item.Id, 'Logo', { maxWidth: 600, tag: logoTag }), alt: item.Name, decoding: 'async' });    
        logo.addEventListener('error', function () { logo.replaceWith(document.createTextNode(item.Name)); });    
        title.appendChild(logo);    
      } else {    
        title.textContent = item.Name;    
      }    
      return ag.el('article', { class: 'ag-hero-slide', 'data-id': item.Id }, [    
        ag.el('img', { class: 'ag-hero-image', src: ag.imageUrl(item.Id, 'Backdrop', { maxWidth: 1600, tag: tag }), alt: '', decoding: 'async' }),    
        ag.el('div', { class: 'ag-hero-shade' }),    
        ag.el('div', { class: 'ag-hero-body' }, [    
          ag.el('p', { class: 'ag-hero-kicker', text: item.Type === 'Series' ? words.series : words.movie }),    
          title,    
          ag.el('p', { class: 'ag-hero-facts', text: facts(item) }),    
          ag.el('p', { class: 'ag-hero-overview', text: item.Overview }),    
          ag.el('div', { class: 'ag-hero-actions' }, [    
            ag.el('button', { type: 'button', class: 'ag-btn ag-btn-light', onclick: function () { ag.play(item.Id); }, text: '▶  ' + words.play }),    
            ag.el('a', { class: 'ag-btn ag-btn-glass', href: ag.itemHref(item.Id), text: words.more }),    
          ]),    
        ]),    
      ]);    
    }    
        
    function mountHero(items) {    
      var words = heroText();    
      var slides = items.map(function (item) { return buildSlide(item, words); });    
      var dots = ag.el('div', { class: 'ag-hero-dots', role: 'group', 'aria-label': words.label });    
      var hero = ag.el('section', { class: 'ag-hero', 'aria-label': words.label }, slides.concat(items.length > 1 ? [dots] : []));    
      var index = -1;    
      var paused = false;    
        
      function show(next) {    
        index = next;    
        slides.forEach(function (slide, i) { slide.classList.toggle('on', i === index); });    
        Array.prototype.forEach.call(dots.children, function (dot, i) { dot.setAttribute('aria-pressed', String(i === index)); });    
        ag.ambient.show(items[index]);    
      }    
      items.forEach(function (item, i) {    
        if (items.length < 2) return;    
        dots.appendChild(ag.el('button', { type: 'button', class: 'ag-hero-dot', 'aria-label': words.show + item.Name, onclick: function () { show(i); } }));    
      });    
        
      var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;    
      if (items.length > 1 && !calm && ag.layout() !== 'tv') {    
        var timer = window.setInterval(function () {    
          if (!hero.isConnected) { window.clearInterval(timer); return; }    
          if (!paused && isHome()) show((index + 1) % items.length);    
        }, ROTATE_MS);    
      }    
      hero.addEventListener('mouseenter', function () { paused = true; });    
      hero.addEventListener('mouseleave', function () { paused = false; });    
      hero.addEventListener('focusin', function () { paused = true; });    
      hero.addEventListener('focusout', function () { paused = false; });    
        
      show(ag.slotOfDay(new Date(), items.length));    
      return hero;    
    }    
        
    ag.startHero = function () {    
      var cached = null;    
      var loading = false;    
        
      function load() {    
        if (cached) return Promise.resolve(cached);    
        return ag.items({    
          IncludeItemTypes: 'Movie,Series', Recursive: true, SortBy: 'DateCreated', SortOrder: 'Descending', Limit: POOL_SIZE,    
          ImageTypes: 'Backdrop', Fields: 'Overview,Genres,CommunityRating,RunTimeTicks,ProductionYear', EnableUserData: true,    
        }).then(function (result) {    
          cached = ag.pickFeaturedSet(result.Items || [], ag.dayNumber(), HERO_COUNT);    
          return cached;    
        });    
      }    
        
      function sync() {    
        var home = document.getElementById('homeTab');    
        if (!isHome() || !home) {    
          document.documentElement.classList.remove('ag-hero-on');    
          if (!document.querySelector('.ag-tonight')) ag.ambient.clear();    
          return;    
        }    
        document.documentElement.classList.add('ag-hero-on');    
        if (home.querySelector('.ag-hero') || loading) return;    
        loading = true;    
        load().then(function (items) {    
          var current = document.getElementById('homeTab');    
          if (!items.length || !current || !isHome() || current.querySelector('.ag-hero')) return;    
          current.insertBefore(mountHero(items), current.firstChild);    
        }).catch(function () {}).then(function () { loading = false; });    
      }    
        
      new MutationObserver(ag.debounce(sync, 200)).observe(document.body, { childList: true, subtree: true });    
      ag.onPageChange(function () { sync(); ag.pressPendingPlay(); });    
    };    
    
  })(ag);

  // ---------- topten ----------
  (function (ag) {
    /* Top 10: the titles watched most on this account, as a row of posters with big numbers. */    
        
    var TOP_LIMIT = 10;    
    var MIN_TITLES = 3; // a ranking of fewer titles is not worth showing    
    var PLAYS_LOOKED_AT = 400;    
        
    var TOP_TEXT = {    
      en: { title: 'Your top 10' },    
      it: { title: 'I tuoi 10 più visti' },    
      es: { title: 'Tus 10 más vistos' },    
      fr: { title: 'Vos 10 plus regardés' },    
      de: { title: 'Deine 10 meistgesehenen' },    
      pt: { title: 'Os seus 10 mais vistos' },    
    };    
    ag.textTables = ag.textTables || {};    
    ag.textTables.topTen = TOP_TEXT;    
        
    /** An episode stands for its series: same id, name and poster, so the card opens the series page. */    
    function seriesOf(episode) {    
      if (!episode.SeriesId) return undefined;    
      return {    
        Id: episode.SeriesId,    
        Name: episode.SeriesName || episode.Name,    
        Type: 'Series',    
        ImageTags: episode.SeriesPrimaryImageTag ? { Primary: episode.SeriesPrimaryImageTag } : undefined,    
      };    
    }    
        
    /**    
     * The most watched titles: `plays` is everything watched, newest first. Every episode counts for its series;    
     * on a tie the title watched most recently goes first. Returns nothing below `minTitles` titles.    
     */    
    ag.topTitles = function (plays, limit, minTitles) {    
      var counts = {};    
      var order = [];    
      plays.forEach(function (play) {    
        var title = play.Type === 'Episode' ? seriesOf(play) : play;    
        if (!title) return;    
        if (counts[title.Id]) counts[title.Id].count += 1;    
        else { counts[title.Id] = { item: title, count: 1 }; order.push(title.Id); }    
      });    
      // `order` is first-seen (newest first) and the sort is stable, so ties stay in recency order.    
      var ranked = order.map(function (id) { return counts[id]; }).sort(function (a, b) { return b.count - a.count; });    
      return ranked.length < (minTitles === undefined ? MIN_TITLES : minTitles) ? [] : ranked.slice(0, limit).map(function (entry) { return entry.item; });    
    };    
        
    /**    
     * Where the shelf goes among the home page's shelves. `sections` describes them in order: { visible, monitor }, where    
     * `monitor` is the web client's data-monitor of the shelf (shelves of what is being watched start with "videoplayback").    
     * Returns { place: 'top' }, { place: 'end' } or { place: 'after', index }.    
     */    
    ag.topTenSpot = function (position, sections) {    
      if (position === 'end') return { place: 'end' };    
      if (position === 'afterContinue') {    
        for (var i = 0; i < sections.length; i++) {    
          if (sections[i].visible && /^videoplayback/.test(sections[i].monitor || '')) return { place: 'after', index: i };    
        }    
      }    
      return { place: 'top' };    
    };    
        
    function placeRow(home, row, position) {    
      var sectionsHost = home.querySelector('.sections');    
      var sections = sectionsHost ? Array.prototype.slice.call(sectionsHost.children) : [];    
      var spot = ag.topTenSpot(position, sections.map(function (section) {    
        var items = section.querySelector('.itemsContainer');    
        return { visible: section.offsetHeight > 0, monitor: (items && items.getAttribute('data-monitor')) || '' };    
      }));    
      if (spot.place === 'after' && sections[spot.index]) sections[spot.index].after(row);    
      else if (spot.place === 'end' && sectionsHost) sectionsHost.appendChild(row);    
      else {    
        var hero = home.querySelector('.ag-hero');    
        home.insertBefore(row, hero ? hero.nextSibling : home.firstChild);    
      }    
    }    
        
    function buildRow(titles) {    
      var words = TOP_TEXT[ag.language()] || TOP_TEXT.en;    
      var cards = titles.map(function (item, position) {    
        var tag = item.ImageTags && item.ImageTags.Primary;    
        return ag.el('a', { class: 'ag-top-card', href: ag.itemHref(item.Id), 'aria-label': (position + 1) + '. ' + item.Name }, [    
          ag.el('span', { class: 'ag-top-rank', 'aria-hidden': 'true', text: String(position + 1) }),    
          tag ? ag.el('img', { class: 'ag-top-poster', src: ag.imageUrl(item.Id, 'Primary', { maxWidth: 300, tag: tag }), alt: '', loading: 'lazy', decoding: 'async' })    
            : ag.el('span', { class: 'ag-top-poster ag-top-noimage', text: item.Name }),    
        ]);    
      });    
      return ag.el('section', { class: 'ag-top' }, [    
        ag.el('h2', { class: 'ag-top-title', text: words.title }),    
        ag.el('div', { class: 'ag-top-scroller' }, cards),    
      ]);    
    }    
        
    ag.startTopTen = function () {    
      var cached;    
      var loading = false;    
        
      function load() {    
        if (cached) return Promise.resolve(cached);    
        return ag.items({    
          IncludeItemTypes: 'Movie,Episode', Recursive: true, Filters: 'IsPlayed', SortBy: 'DatePlayed', SortOrder: 'Descending',    
          Limit: PLAYS_LOOKED_AT, EnableImageTypes: 'Primary', ImageTypeLimit: 1, EnableUserData: false,    
        }).then(function (result) {    
          cached = ag.topTitles(result.Items || [], TOP_LIMIT);    
          return cached;    
        });    
      }    
        
      function sync() {    
        var params = ag.pageParams();    
        var home = document.getElementById('homeTab');    
        if (ag.pageName() !== 'home' || params.tab || params.seerrfinTab || !home || home.querySelector('.ag-top') || loading) return;    
        loading = true;    
        load().then(function (titles) {    
          var current = document.getElementById('homeTab');    
          if (!titles.length || !current || current.querySelector('.ag-top')) return;    
          placeRow(current, buildRow(titles), (ag.config && ag.config.topTenPosition) || 'top');    
        }).catch(function () {}).then(function () { loading = false; });    
      }    
        
      new MutationObserver(ag.debounce(sync, 250)).observe(document.body, { childList: true, subtree: true });    
      ag.onPageChange(sync);    
    };    
    
  })(ag);

  // ---------- tonight ----------
  (function (ag) {
    /* Tonight: "what shall we watch?" Two questions, then a deck of unwatched films to pick or put away one by one. */    
        
    var TICKS_PER_MINUTE = 600000000;    
    var SHORT_UNDER_MIN = 100;    
    var LONG_OVER_MIN = 120;    
    var DECK_SIZE = 12;    
    var POOL_SIZE = 150;    
    /** A drag past this share of the card's width counts as a choice. */    
    var SWIPE_SHARE = 0.3;    
    // A card follows the finger, turning a little: this many pixels of drag per degree.    
    var DRAG_PER_DEGREE = 18;    
        
    // Genre names as Jellyfin returns them, in Italian and English.    
    var GENRES = {    
      laugh: ['commedia', 'comedy', 'comedia', 'comédie', 'komödie', 'comédia'],    
      scare: ['horror', 'terror', 'horreur'],    
      thrill: ['azione', 'avventura', 'fantascienza', 'action', 'adventure', 'science fiction',    
        'acción', 'aventura', 'ciencia ficción', 'aventure', 'science-fiction', 'abenteuer', 'ação', 'ficção científica'],    
      heart: ['dramma', 'drama', 'romance', 'romantico', 'musica', 'music',    
        'música', 'drame', 'musique', 'liebesfilm', 'romantik', 'musik'],    
      family: ['famiglia', 'family', 'animazione', 'animation',    
        'familia', 'animación', 'familial', 'famille', 'familie', 'família', 'animação'],    
    };    
        
    var TONIGHT_TEXT = {    
      en: {    
        tonight: 'Tonight', moodTitle: 'What kind of evening is it?', moodHint: 'Tell me what you feel like and I will suggest a few films.',    
        lengthTitle: 'How long is the evening?', lengthHint: 'Pick the length of the film.',    
        moods: { laugh: 'Laugh', scare: 'Get scared', thrill: 'Action and adventure', heart: 'Feel something', family: 'Family', any: 'Anything' },    
        lengths: { short: 'Short (under 100 min)', long: 'A long evening (over 120 min)', any: 'Does not matter' },    
        forTonight: 'For tonight', count: function (n, total) { return 'Film ' + n + ' of ' + total; },    
        watch: 'Watch it', another: 'Another', change: 'Change choices', close: 'Close', yes: 'This one!', no: 'No',    
        noneTitle: 'No film with these choices', noneHint: 'No unwatched film matches: try another mood or length.',    
        doneTitle: 'That was all!', doneHint: 'You have seen the whole hand. Try again?', restart: 'Start over', loading: 'Looking for films…',    
      },    
      it: {    
        tonight: 'Stasera', moodTitle: 'Che serata è?', moodHint: 'Dimmi cosa hai voglia di provare e ti propongo qualche film.',    
        lengthTitle: 'Quanto dura la serata?', lengthHint: 'Scegli la durata del film.',    
        moods: { laugh: 'Ridere', scare: 'Paura', thrill: 'Azione e avventura', heart: 'Emozionarmi', family: 'Famiglia', any: 'Qualsiasi cosa' },    
        lengths: { short: 'Breve (meno di 100 min)', long: 'Serata lunga (oltre 120 min)', any: 'Non importa' },    
        forTonight: 'Per stasera', count: function (n, total) { return 'Film ' + n + ' di ' + total; },    
        watch: 'Guardalo', another: 'Un altro', change: 'Cambia scelta', close: 'Chiudi', yes: 'Questo!', no: 'No',    
        noneTitle: 'Nessun film con queste scelte', noneHint: 'Nessun film da vedere corrisponde: prova a cambiare umore o durata.',    
        doneTitle: 'Finito!', doneHint: 'Hai visto tutta la mano. Vuoi riprovare?', restart: 'Ricomincia', loading: 'Cerco i film…',    
      },    
      es: {    
        tonight: 'Esta noche', moodTitle: '¿Qué tipo de noche es?', moodHint: 'Dime qué te apetece y te propongo algunas películas.',    
        lengthTitle: '¿Cuánto dura la noche?', lengthHint: 'Elige la duración de la película.',    
        moods: { laugh: 'Reír', scare: 'Pasar miedo', thrill: 'Acción y aventura', heart: 'Emocionarme', family: 'Familia', any: 'Lo que sea' },    
        lengths: { short: 'Corta (menos de 100 min)', long: 'Noche larga (más de 120 min)', any: 'Da igual' },    
        forTonight: 'Para esta noche', count: function (n, total) { return 'Película ' + n + ' de ' + total; },    
        watch: 'Verla', another: 'Otra', change: 'Cambiar elección', close: 'Cerrar', yes: '¡Esta!', no: 'No',    
        noneTitle: 'Ninguna película con estas opciones', noneHint: 'Ninguna película sin ver coincide: prueba otro ánimo u otra duración.',    
        doneTitle: '¡Eso es todo!', doneHint: 'Has visto toda la mano. ¿Probamos otra vez?', restart: 'Empezar de nuevo', loading: 'Buscando películas…',    
      },    
      fr: {    
        tonight: 'Ce soir', moodTitle: 'Quelle soirée ce soir ?', moodHint: 'Dites-moi ce qui vous tente et je vous propose quelques films.',    
        lengthTitle: 'Combien de temps dure la soirée ?', lengthHint: 'Choisissez la durée du film.',    
        moods: { laugh: 'Rire', scare: 'Avoir peur', thrill: 'Action et aventure', heart: 'Être ému', family: 'En famille', any: 'Peu importe' },    
        lengths: { short: 'Court (moins de 100 min)', long: 'Longue soirée (plus de 120 min)', any: 'Peu importe' },    
        forTonight: 'Pour ce soir', count: function (n, total) { return 'Film ' + n + ' sur ' + total; },    
        watch: 'Le regarder', another: 'Un autre', change: 'Changer mes choix', close: 'Fermer', yes: 'Celui-ci !', no: 'Non',    
        noneTitle: 'Aucun film avec ces choix', noneHint: 'Aucun film non vu ne correspond : essayez une autre envie ou une autre durée.',    
        doneTitle: 'C’est tout !', doneHint: 'Vous avez vu toute la sélection. On recommence ?', restart: 'Recommencer', loading: 'Recherche de films…',    
      },    
      de: {    
        tonight: 'Heute Abend', moodTitle: 'Was für ein Abend ist es?', moodHint: 'Sag mir, wonach dir ist, und ich schlage dir ein paar Filme vor.',    
        lengthTitle: 'Wie lang ist der Abend?', lengthHint: 'Wähle die Länge des Films.',    
        moods: { laugh: 'Lachen', scare: 'Gruseln', thrill: 'Action und Abenteuer', heart: 'Berührt werden', family: 'Familie', any: 'Egal' },    
        lengths: { short: 'Kurz (unter 100 Min.)', long: 'Langer Abend (über 120 Min.)', any: 'Egal' },    
        forTonight: 'Für heute Abend', count: function (n, total) { return 'Film ' + n + ' von ' + total; },    
        watch: 'Ansehen', another: 'Anderer', change: 'Auswahl ändern', close: 'Schließen', yes: 'Der!', no: 'Nein',    
        noneTitle: 'Kein Film mit dieser Auswahl', noneHint: 'Kein ungesehener Film passt: Probier eine andere Stimmung oder Länge.',    
        doneTitle: 'Das war’s!', doneHint: 'Du hast alle Vorschläge gesehen. Noch einmal?', restart: 'Neu starten', loading: 'Suche Filme …',    
      },    
      pt: {    
        tonight: 'Esta noite', moodTitle: 'Que tipo de noite é?', moodHint: 'Diga-me o que lhe apetece e proponho-lhe alguns filmes.',    
        lengthTitle: 'Quanto dura a noite?', lengthHint: 'Escolha a duração do filme.',    
        moods: { laugh: 'Rir', scare: 'Ter medo', thrill: 'Ação e aventura', heart: 'Emocionar-me', family: 'Família', any: 'Tanto faz' },    
        lengths: { short: 'Curto (menos de 100 min)', long: 'Noite longa (mais de 120 min)', any: 'Tanto faz' },    
        forTonight: 'Para esta noite', count: function (n, total) { return 'Filme ' + n + ' de ' + total; },    
        watch: 'Ver', another: 'Outro', change: 'Mudar escolha', close: 'Fechar', yes: 'Este!', no: 'Não',    
        noneTitle: 'Nenhum filme com estas escolhas', noneHint: 'Nenhum filme por ver corresponde: experimente outra disposição ou duração.',    
        doneTitle: 'Era só isto!', doneHint: 'Já viu todas as sugestões. Tentamos de novo?', restart: 'Recomeçar', loading: 'A procurar filmes…',    
      },    
    };    
    ag.textTables = ag.textTables || {};    
    ag.textTables.tonight = TONIGHT_TEXT;    
        
    function words() { return TONIGHT_TEXT[ag.language()] || TONIGHT_TEXT.en; }    
        
    function matchesMood(film, mood) {    
      if (mood === 'any') return true;    
      var wanted = GENRES[mood] || [];    
      return (film.Genres || []).some(function (genre) { return wanted.indexOf(genre.toLowerCase()) >= 0; });    
    }    
        
    function fitsLength(film, length) {    
      if (length === 'any') return true;    
      var minutes = (film.RunTimeTicks || 0) / TICKS_PER_MINUTE;    
      if (minutes <= 0) return false;    
      return length === 'short' ? minutes < SHORT_UNDER_MIN : minutes > LONG_OVER_MIN;    
    }    
        
    /** The films to show for the mood and length picked, in the order given (the server already shuffled them). */    
    ag.tonightDeck = function (pool, mood, length, limit) {    
      return pool.filter(function (film) { return matchesMood(film, mood) && fitsLength(film, length); }).slice(0, limit);    
    };    
        
    /** What a drag of `dx` pixels on a card `width` pixels wide means. */    
    ag.swipeVerdict = function (dx, width) {    
      if (dx > width * SWIPE_SHARE) return 'yes';    
      if (dx < -width * SWIPE_SHARE) return 'no';    
      return null;    
    };    
        
    ag.startTonight = function () {    
      var overlay = null;    
      var opener = null;    
      var state = null;    
        
      function close() {    
        if (!overlay) return;    
        overlay.remove();    
        overlay = null;    
        document.removeEventListener('keydown', onKey, true);    
        if (ag.ambient && ag.pageName() !== 'home') ag.ambient.clear();    
        if (opener && opener.isConnected) opener.focus();    
      }    
        
      function onKey(event) {    
        if (event.key === 'Escape') { event.stopPropagation(); close(); }    
      }    
        
      function panel() { return overlay.querySelector('.ag-tonight-panel'); }    
        
      function draw(children) {    
        var host = panel();    
        host.textContent = '';    
        children.forEach(function (child) { host.appendChild(child); });    
        var first = host.querySelector('[data-autofocus]');    
        if (first) first.focus();    
      }    
        
      function closeButton() {    
        return ag.el('button', { type: 'button', class: 'ag-tonight-close', 'aria-label': words().close, onclick: close, text: '✕' });    
      }    
        
      function choices(title, hint, options, labels, onPick) {    
        draw([    
          closeButton(),    
          ag.el('h2', { text: title }),    
          ag.el('p', { class: 'ag-muted', text: hint }),    
          ag.el('div', { class: 'ag-chips' }, options.map(function (id, i) {    
            return ag.el('button', { type: 'button', class: 'ag-chip', 'data-autofocus': i === 0 ? '' : false, onclick: function () { onPick(id); }, text: labels[id] });    
          })),    
        ]);    
      }    
        
      function restart() {    
        state = { mood: null, length: null, index: 0, deck: null };    
        askMood();    
      }    
        
      function askMood() {    
        var w = words();    
        choices(w.moodTitle, w.moodHint, ['laugh', 'scare', 'thrill', 'heart', 'family', 'any'], w.moods, function (mood) { state.mood = mood; askLength(); });    
      }    
        
      function askLength() {    
        var w = words();    
        choices(w.lengthTitle, w.lengthHint, ['short', 'long', 'any'], w.lengths, function (length) { state.length = length; deal(); });    
      }    
        
      function deal() {    
        draw([closeButton(), ag.el('p', { class: 'ag-muted', role: 'status', text: words().loading })]);    
        ag.items({    
          IncludeItemTypes: 'Movie', Recursive: true, Filters: 'IsUnplayed', SortBy: 'Random', Limit: POOL_SIZE,    
          Fields: 'Genres,Overview,RunTimeTicks,ProductionYear', EnableImageTypes: 'Primary,Backdrop', ImageTypeLimit: 1,    
        }).then(function (result) {    
          state.deck = ag.tonightDeck(result.Items || [], state.mood, state.length, DECK_SIZE);    
          state.index = 0;    
          showCard();    
        }).catch(function () { state.deck = []; showCard(); });    
      }    
        
      function endScreen(empty) {    
        var w = words();    
        draw([    
          closeButton(),    
          ag.el('h2', { text: empty ? w.noneTitle : w.doneTitle }),    
          ag.el('p', { class: 'ag-muted', text: empty ? w.noneHint : w.doneHint }),    
          ag.el('button', { type: 'button', class: 'ag-btn ag-btn-light', 'data-autofocus': '', onclick: restart, text: empty ? w.change : w.restart }),    
        ]);    
      }    
        
      function filmCard(film, onYes, onNo) {    
        var w = words();    
        var tag = film.ImageTags && film.ImageTags.Primary;    
        var dx = 0;    
        var startX = null;    
        var yes = ag.el('span', { class: 'ag-stamp ag-stamp-yes', 'aria-hidden': 'true', text: w.yes });    
        var no = ag.el('span', { class: 'ag-stamp ag-stamp-no', 'aria-hidden': 'true', text: w.no });    
        var card = ag.el('article', { class: 'ag-deck-card' }, [    
          tag ? ag.el('img', { class: 'ag-deck-poster', src: ag.imageUrl(film.Id, 'Primary', { maxWidth: 500, tag: tag }), alt: '', draggable: 'false', decoding: 'async' }) : null,    
          ag.el('div', { class: 'ag-deck-info' }, [    
            ag.el('h3', { text: film.Name }),    
            ag.el('p', { class: 'ag-deck-meta', text: [film.ProductionYear, (film.Genres || []).slice(0, 3).join(' · ')].filter(Boolean).join('  ·  ') }),    
            ag.el('p', { class: 'ag-deck-overview', text: film.Overview || '' }),    
          ]),    
          yes, no,    
        ]);    
        function move() {    
          card.style.transform = dx ? 'translateX(' + dx + 'px) rotate(' + dx / DRAG_PER_DEGREE + 'deg)' : '';    
          yes.style.opacity = Math.min(1, Math.max(0, dx / 120));    
          no.style.opacity = Math.min(1, Math.max(0, -dx / 120));    
        }    
        function release() {    
          if (startX === null) return;    
          var verdict = ag.swipeVerdict(dx, card.getBoundingClientRect().width);    
          startX = null;    
          dx = 0;    
          move();    
          if (verdict === 'yes') onYes(); else if (verdict === 'no') onNo();    
        }    
        card.addEventListener('pointerdown', function (event) { startX = event.clientX; if (card.setPointerCapture) card.setPointerCapture(event.pointerId); });    
        card.addEventListener('pointermove', function (event) { if (startX !== null) { dx = event.clientX - startX; move(); } });    
        card.addEventListener('pointerup', release);    
        card.addEventListener('pointercancel', release);    
        return card;    
      }    
        
      function showCard() {    
        var w = words();    
        var deck = state.deck || [];    
        var film = deck[state.index];    
        if (!film) { endScreen(deck.length === 0); return; }    
        if (ag.ambient && film.BackdropImageTags && film.BackdropImageTags.length) ag.ambient.show(film);    
        var pick = function () { close(); location.hash = ag.itemHref(film.Id); };    
        var skip = function () { state.index += 1; showCard(); };    
        draw([    
          closeButton(),    
          ag.el('h2', { text: w.forTonight }),    
          ag.el('p', { class: 'ag-muted', role: 'status', text: w.count(state.index + 1, deck.length) }),    
          filmCard(film, pick, skip),    
          ag.el('div', { class: 'ag-tonight-actions' }, [    
            ag.el('button', { type: 'button', class: 'ag-btn ag-btn-glass', onclick: skip, text: '✕  ' + w.another }),    
            ag.el('button', { type: 'button', class: 'ag-btn ag-btn-light', 'data-autofocus': '', onclick: pick, text: '▶  ' + w.watch }),    
          ]),    
          ag.el('button', { type: 'button', class: 'ag-link', onclick: restart, text: w.change }),    
        ]);    
      }    
        
      // Phones and TVs have no side rail: "Tonight" goes into the web client's own menu, under Favorites.    
      var MOON = 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z';    
        
      function addToDrawer() {    
        var drawer = document.querySelector('.MuiDrawer-root');    
        if (!drawer || drawer.querySelector('[data-ag-tonight]')) return;    
        var anchor = drawer.querySelector('a[href="#/home?tab=1"]');    
        var row = anchor && anchor.closest('li');    
        if (!row) return;    
        var copy = row.cloneNode(true);    
        copy.setAttribute('data-ag-tonight', '');    
        var link = copy.querySelector('a');    
        link.setAttribute('href', '#');    
        link.removeAttribute('aria-current');    
        link.classList.remove('Mui-selected');    
        var label = copy.querySelector('.MuiListItemText-primary, span.MuiTypography-root');    
        if (label) label.textContent = words().tonight;    
        var path = copy.querySelector('svg path');    
        if (path) path.setAttribute('d', MOON);    
        link.addEventListener('click', function (event) {    
          event.preventDefault();    
          event.stopPropagation();    
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); // closes the menu    
          ag.openTonight();    
        });    
        row.parentNode.insertBefore(copy, row.nextSibling);    
      }    
        
      if (ag.layout() !== 'desktop') {    
        new MutationObserver(ag.debounce(addToDrawer, 100)).observe(document.body, { childList: true, subtree: true });    
        addToDrawer();    
      }    
        
      ag.openTonight = function () {    
        if (overlay) return;    
        opener = document.activeElement;    
        overlay = ag.el('div', { class: 'ag-tonight', role: 'dialog', 'aria-modal': 'true', 'aria-label': words().tonight }, [ag.el('div', { class: 'ag-tonight-panel' })]);    
        overlay.addEventListener('mousedown', function (event) { if (event.target === overlay) close(); });    
        document.body.appendChild(overlay);    
        document.addEventListener('keydown', onKey, true);    
        restart();    
      };    
    };    
    
  })(ag);

  // ---------- main ----------
  (function (ag) {
    /* Start-up: wait for the web client, read the plugin's settings, switch the features on. */    
        
    var DEFAULTS = { qualityMarks: true, sideMenu: true, hero: true, topTen: true, tonight: true };    
        
    function whenClientIsReady(callback, triesLeft) {    
      var client = window.ApiClient;    
      if (client && client.getCurrentUserId && client.getCurrentUserId()) callback();    
      else if (triesLeft > 0) window.setTimeout(function () { whenClientIsReady(callback, triesLeft - 1); }, 500);    
    }    
        
    function loadConfig() {    
      return fetch(window.ApiClient.serverAddress() + '/Afterglow/config', { cache: 'no-store' })    
        .then(function (response) { return response.json(); })    
        .catch(function () { return {}; })    
        .then(function (config) {    
          var out = {};    
          Object.keys(DEFAULTS).forEach(function (key) { out[key] = config[key] === undefined ? DEFAULTS[key] : config[key] !== false; });    
          out.topTenPosition = typeof config.topTenPosition === 'string' ? config.topTenPosition : 'top';    
          out.qualityCorner = typeof config.qualityCorner === 'string' ? config.qualityCorner : 'bottomLeft';    
          return out;    
        });    
    }    
        
    ag.start = function () {    
      whenClientIsReady(function () {    
        loadConfig().then(function (config) {    
          ag.config = config;    
          document.documentElement.setAttribute('data-ag-corner', config.qualityCorner);    
          if (config.qualityMarks) ag.startQualityMarks();    
          if (ag.layout() !== 'desktop' && typeof ag.startDrawerCleanup === 'function') ag.startDrawerCleanup();    
          if (typeof ag.startFavoritesHint === 'function') ag.startFavoritesHint();    
          ['startTonight', 'startSideMenu', 'startHero', 'startTopTen'].forEach(function (name, index) {    
            var flag = ['tonight', 'sideMenu', 'hero', 'topTen'][index];    
            if (config[flag] && typeof ag[name] === 'function') ag[name]();    
          });    
        });    
      }, 240);    
    };    
    
  })(ag);

  ag.start();
})();
