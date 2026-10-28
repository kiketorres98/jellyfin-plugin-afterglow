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
