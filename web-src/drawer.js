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
