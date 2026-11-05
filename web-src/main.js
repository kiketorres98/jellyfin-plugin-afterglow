/* Start-up: wait for the web client, read the plugin's settings, switch the features on. */

var DEFAULTS = { qualityMarks: true, sideMenu: true, hero: true, topTen: true, tonight: true };

// Looks every half second at first, then every few seconds for as long as the page is open: somebody may leave the
// sign-in page alone for a while and sign in later, and the features must start then.
function whenClientIsReady(callback, fastTriesLeft) {
  var client = window.ApiClient;
  if (client && client.getCurrentUserId && client.getCurrentUserId()) callback();
  else window.setTimeout(function () { whenClientIsReady(callback, fastTriesLeft - 1); }, fastTriesLeft > 0 ? 500 : 5000);
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
