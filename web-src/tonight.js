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
