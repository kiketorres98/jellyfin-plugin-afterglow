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
