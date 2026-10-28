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
