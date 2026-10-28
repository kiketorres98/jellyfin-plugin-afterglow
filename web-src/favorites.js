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
