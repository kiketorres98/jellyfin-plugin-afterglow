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
