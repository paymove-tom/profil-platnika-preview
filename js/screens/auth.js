/* =====================================================================
   Paymove Wallet · prototyp · js/s-auth.js
   Sekcja „1 Logowanie i onboarding” (tab null):
     #/login                      social login (Google, Apple, Facebook)
     #/onboarding/1               adres
     #/onboarding/2               numer rejestracyjny
     #/onboarding/3               BLIK (portfel), znacznik „Najszybsza płatność”
     #/onboarding/3/info          sheet przed bramką: zapłać i zapamiętaj sklep
     #/onboarding/3/checkout      sheet z iframe checkoutu BLIK
   Mail (developer@paymove.io) bierzemy z konta social, bez osobnego kroku.
     #/onboarding/gotowe          sukces
     #/zgoda, #/zgoda/ok, #/zgoda/odmowa

   Stan przejściowy (kierunek animacji, dostawca logowania) trzymamy
   w PM.state._auth. Dane kroków w PM.state.onboarding, BLIK w
   PM.state.blik.polaczony. Świeże wczytanie (?shot=1) renderuje
   zawsze dane domyślne z PM_DATA.
   ===================================================================== */
import { PM } from '../core/index.js';
import { DATA } from '../data.js';

var G = '1 Logowanie i onboarding';
var LOGO_INK = 'assets/logos/logo_paymove_ink.svg';
var SYGNET = 'assets/logos/sygnet.svg';
var BLIK_LOGO = 'assets/logos/blik-logo.svg';
var CHECKOUT_URL = 'https://checkout.paymove.io/411718ba-b114-427f-8bc9-bbf18a798936?externalId=L44zBrXJ8b';
/* stan "zapłacono" kluczowany externalId: nowy link = przycisk Gotowe znów nieaktywny */
var CHECKOUT_EXT = 'L44zBrXJ8b';
var CHECKOUT_ORIGIN = 'https://checkout.paymove.io';
/* tryb embed bramki: wysyła do rodzica paymove:ready/resize/success/error/closed (postMessage na podany origin) */
function embedUrl() {
  return CHECKOUT_URL + '&embed=1&origin=' + encodeURIComponent(window.location.origin);
}
function isGatewayMsg(e) {
  var d = e && e.data;
  return e.origin === CHECKOUT_ORIGIN && d && typeof d === 'object' && d.paymove === true && typeof d.type === 'string';
}
var DEFAULT_MAIL = 'developer@paymove.io';
var KOD_RE = /^\d{2}-\d{3}$/;
var PLATE_RE = /^[A-Z0-9]{4,8}$/;
var STEPS = 3;
var TERMS_URL = 'https://www.paymove.io/regulamin';
var PRIVACY_URL = 'https://www.paymove.io/polityka-prywatnosci';
var LOGIN_BOTS = [
  { id: 'claude', name: 'Claude', src: 'assets/logos/claude-color.svg' },
  { id: 'chatgpt', name: 'ChatGPT', src: 'assets/logos/openai.svg' },
  { id: 'perplexity', name: 'Perplexity', src: 'assets/logos/perplexity-color.svg' },
  { id: 'grok', name: 'Grok', src: 'assets/logos/grok.svg' }
];
var SHORT = { imie: 'imię', mail: 'mail', adres: 'adres', tablice: 'numery rejestracyjne' };

/* ---------- oficjalne logotypy (inline SVG) ---------- */
var SVG = {
  google: function (s) {
    return '<svg class="au-logo" width="' + s + '" height="' + s + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
      '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
      '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
      '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
      '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
      '</svg>';
  },
  apple: function (s) {
    return '<svg class="au-logo" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path fill="#000000" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>' +
      '</svg>';
  },
  facebook: function (s) {
    return '<svg class="au-logo" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<circle cx="12" cy="12" r="12" fill="#1877F2"/>' +
      '<path fill="#FFFFFF" d="M16.671 15.469L17.203 12h-3.328V9.749c0-.949.465-1.874 1.956-1.874h1.513V4.922s-1.374-.234-2.686-.234c-2.741 0-4.533 1.66-4.533 4.668V12H7.078v3.469h3.047v8.385a12.09 12.09 0 0 0 3.75 0v-8.385h2.796z"/>' +
      '</svg>';
  }
};
var PROVIDERS = [
  { id: 'google', label: 'Google', cta: 'Dalej z Google' },
  { id: 'apple', label: 'Apple', cta: 'Dalej z Apple' },
  { id: 'facebook', label: 'Facebook', cta: 'Dalej z Facebookiem' }
];
var PROV = {};
PROVIDERS.forEach(function (p) { PROV[p.id] = p; });

/* ---------- CSS modułu (bazuje na klasach v2 wallet ze styles.css) ---------- */
  /* ---------- stan ---------- */
function auth() {
  if (!PM.state._auth) PM.state._auth = {};
  return PM.state._auth;
}
function ob() {
  var s = PM.state;
  if (!s.onboarding) s.onboarding = {};
  var o = s.onboarding;
  var def = DATA.onboarding || {};
  if (o.mail == null) o.mail = def.mail || DEFAULT_MAIL;
  if (!o.adres) o.adres = { ulica: '', kod: '', miasto: '' };
  if (o.rejestracja == null) o.rejestracja = '';
  return o;
}
function blik() {
  if (!PM.state.blik) PM.state.blik = { polaczony: false };
  return PM.state.blik;
}
function poleById(id) {
  var list = PM.state.pola || [];
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
function setPole(id, val) {
  var p = poleById(id);
  if (p) p.wartosc = val;
}
function finish() {
  auth().zalogowany = true;
  if (PM.state.user) PM.state.user.pierwszeLogowanie = false;
}
/* Dodawanie BLIK z portfela (#/portfel/dodaj-blik) odcina onboarding: kroki 1–3 i „Gotowe”
   przekierowują na portfel (także przez history.back). Flagę czyści dopiero ekran logowania. */
function obGuard() {
  return auth().addBlik ? '#/portfel' : null;
}
function goSoon(hash, ms) {
  if (PM.shot) { PM.go(hash); return; }
  PM.later(function () { PM.go(hash); }, ms || 600);
}

/* ---------- pola i błędy ---------- */
function showFieldError(root, id, msg) {
  var w = root.querySelector('[data-field="' + id + '"]');
  if (!w) return;
  w.classList.add('is-error');
  var inp = w.querySelector('input, textarea');
  if (inp) inp.setAttribute('aria-invalid', 'true');
  var e = w.querySelector('.error-msg');
  if (!e) {
    e = document.createElement('p');
    e.className = 'error-msg';
    e.setAttribute('role', 'alert');
    var hint = w.querySelector('.hint');
    if (hint) w.insertBefore(e, hint); else w.appendChild(e);
  }
  e.style.display = '';
  e.innerHTML = PM.icon('error-warning-line', 16) + PM.esc(msg);
}
function clearFieldError(root, id) {
  var w = root.querySelector('[data-field="' + id + '"]');
  if (!w) return;
  w.classList.remove('is-error');
  var inp = w.querySelector('input, textarea');
  if (inp) inp.removeAttribute('aria-invalid');
  var e = w.querySelector('.error-msg');
  if (e) e.style.display = 'none';
}
function bindClear(root, id) {
  var inp = root.querySelector('#' + id);
  if (inp) inp.addEventListener('input', function () { clearFieldError(root, id); });
}
function onEnter(inp, fn) {
  if (!inp) return;
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); fn(); }
  });
}

/* ---------- wspólne ekrany ---------- */
function brandHeader() {
  /* t418: logo przeniesione do stopki; nagłówek zostaje pusty, żeby układ loginu się nie przesunął */
  return '<header class="hdr au-hdr" aria-hidden="true"></header>';
}

function statusScreen(o) {
  return PM.screen({
    title: o.title,
    showTitle: false,
    tag: false,
    cls: o.cls,
    contentCls: 'content--center',
    content:
      '<div class="status-hero status-hero--c au-in">' +
        (o.hero || '') +
        '<h1 class="display">' + PM.esc(o.title) + '</h1>' +
        (o.lead ? '<p class="lead-text">' + o.lead + '</p>' : '') +
      '</div>' + (o.extra || ''),
    cta: o.cta
  });
}

function duo(size) {
  var s = size || 64;
  var tileCls = s === 64 ? 'tile tile--lg' : s === 80 ? 'tile tile--xl' : 'tile';
  return '<div class="duo zg-duo">' +
    PM.botLogo('claude', s) +
    '<span class="duo-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
    '<span class="' + tileCls + '" title="Paymove"><img src="' + SYGNET + '" alt="Paymove" draggable="false"></span>' +
    '</div>';
}

/* krok onboardingu: pasek postępu, wstecz, animowany kontener */
function obScreen(n, ctx, o) {
  var a = auth();
  var anim = (ctx && ctx.isBase) || a.obStill ? ' au-still' : (a.obDir === 'back' ? ' au-back' : '');
  var segs = '';
  for (var i = 1; i <= STEPS; i++) {
    segs += '<i class="' + (i < n ? 'is-done' : i === n ? 'is-active' : '') + '"></i>';
  }
  var backHref = n === 1 ? '#/login' : '#/onboarding/' + (n - 1);
  var header =
    '<header class="hdr au-ob-hdr">' +
      '<a class="hdr-back press" href="' + backHref + '" data-ob-back aria-label="Wstecz">' + PM.icon('arrow-left-s-line', 20) + '</a>' +
      '<div class="ob-progress" role="progressbar" aria-label="Postęp" aria-valuemin="1" aria-valuemax="' + STEPS + '" aria-valuenow="' + n + '">' + segs + '</div>' +
      '<span class="au-hdr-sp" aria-hidden="true"></span>' +
    '</header>';
  return PM.screen({
    title: o.title,
    showTitle: false,
    cls: 'au-ob',
    header: header,
    contentCls: 'content--top',
    content:
      '<div class="ob-step' + anim + (o.stepCls ? ' ' + o.stepCls : '') + '">' +
        '<div class="stack-24">' +
          (o.top || '') +
          '<div class="auth-head">' +
            '<span class="ob-kicker">Krok ' + n + ' z ' + STEPS + '</span>' +
            '<h1 class="title">' + PM.esc(o.title) + '</h1>' +
            (o.lead ? '<p class="lead-text">' + o.lead + '</p>' : '') +
          '</div>' +
          (o.body || '') +
        '</div>' +
      '</div>',
    cta: o.cta
  });
}

/* zwraca false dla ekranu bazowego pod sheetem */
function obMount(root, ctx) {
  if (ctx && ctx.isBase) return false;
  var a = auth();
  a.obDir = null;
  a.obStill = false;
  PM.qsa(root, '[data-ob-back]').forEach(function (el) {
    el.addEventListener('click', function () { auth().obDir = 'back'; });
  });
  return true;
}

/* =====================================================================
   1. Logowanie (tylko social)
   ===================================================================== */
function heroCards() {
  return '<div class="au-cards" aria-hidden="true">' +
    '<div class="au-mini au-mini--1"><i></i><i></i></div>' +
    '<div class="au-mini au-mini--2"><i></i><i></i></div>' +
    '<div class="au-mini au-mini--3">' +
      '<div class="au-mini-top">' +
        '<img class="au-mini-blik" src="' + BLIK_LOGO + '" alt="" draggable="false">' +
        '<span class="au-mini-st"><i></i>Aktywny</span>' +
      '</div>' +
      '<div class="au-mini-foot">' +
        '<span class="au-mini-name">BLIK bez kodu</span>' +
        '<span class="au-mini-bots">' + PM.botLogo('claude', 18) + PM.botLogo('chatgpt', 18) + PM.botLogo('perplexity', 18) + '</span>' +
      '</div>' +
    '</div>' +
    '</div>';
}

function botsRow() {
  return '<div class="au-bots au-in" style="--d:.2s">' +
    '<span class="au-bots-lbl">Działa z</span>' +
    '<ul class="au-bots-list">' +
      LOGIN_BOTS.map(function (b) {
        return '<li class="au-bot" title="' + PM.esc(b.name) + '">' +
          '<img src="' + b.src + '" alt="' + PM.esc(b.name) + '" width="22" height="22" draggable="false"></li>';
      }).join('') +
    '</ul>' +
    '</div>';
}

function loginScreen(o) {
  o = o || {};
  var btns = PROVIDERS.map(function (p) {
    return '<button class="btn btn--secondary btn--block social-btn press" type="button" data-provider="' + p.id + '">' +
      SVG[p.id](20) + '<span>' + PM.esc(p.cta) + '</span></button>';
  }).join('');
  return PM.screen({
    title: 'Paymove Wallet',
    showTitle: false,
    cls: 'au-login' + (o.bots ? ' au-login--b' : ''),
    header: brandHeader(),
    contentCls: 'content--center',
    content:
      '<div class="wallet-hero">' + heroCards() + '</div>' +
      '<div class="au-claim au-in" style="--d:.16s">' +
        '<h1 class="title">Portfel zakupowy AI</h1>' +
        '<p class="lead-text">AI robi zakupy, a kontrola nad pieniędzmi zostaje u Ciebie.</p>' +
      '</div>' +
      (o.bots ? botsRow() : ''),
    cta:
      '<div class="cta-bar">' +
        '<div class="au-social au-in" style="--d:.24s">' + btns + '</div>' +
        '<p class="legal au-legal">Kontynuując, akceptujesz ' +
          '<a href="' + TERMS_URL + '" target="_blank" rel="noopener">regulamin</a> i ' +
          '<a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">politykę prywatności</a>.</p>' +
      '</div>'
  });
}

/* mail z konta social trafia do stanu bez osobnego kroku */
function prefillMail() {
  var o = ob();
  if (PM.state.user && !PM.state.user.mail) PM.state.user.mail = o.mail;
  var p = poleById('mail');
  if (p && !p.wartosc) p.wartosc = o.mail;
}

function loginMount(root) {
  var a = auth();
  a.addBlik = false;
  a.obDir = null;
  a.obStill = false;
  var wrap = root.querySelector('.au-social');
  PM.qsa(root, '.au-legal a').forEach(function (l) {
    l.addEventListener('click', function (e) { e.stopPropagation(); });
  });
  PM.qsa(root, '[data-provider]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!wrap || wrap.classList.contains('is-busy')) return;
      wrap.classList.add('is-busy');
      b.classList.add('is-loading');
      b.setAttribute('aria-busy', 'true');
      auth().provider = b.getAttribute('data-provider');
      prefillMail();
      goSoon('#/onboarding/1', 900);
    });
  });
}

PM.route('#/login', {
  title: 'Zaloguj się', group: G, label: 'Logowanie (social)', tab: null,
  render: function () { return loginScreen({ bots: false }); },
  mount: loginMount
});

/* Stary adres powitania (usunięty modal) -> krok 1 */
function legacyStart() {
  if (/^#\/onboarding\/start/.test(location.hash)) PM.go('#/onboarding/1', { replace: true });
}
window.addEventListener('hashchange', legacyStart);
legacyStart();

/* =====================================================================
   2. Onboarding krok 1: adres
   ===================================================================== */
PM.route('#/onboarding/1', {
  guard: obGuard,
  title: 'Adres', group: G, label: 'Krok 1 Adres', tab: null,
  render: function (ctx) {
    var a = ob().adres;
    return obScreen(1, ctx, {
      title: 'Adres',
      lead: 'Bot wpisze go za Ciebie, gdy zakup tego wymaga.',
      body:
        '<div class="stack">' +
          PM.field({ id: 'ob-ulica', label: 'Ulica i numer', value: a.ulica, placeholder: 'np. Marszałkowska 10/4', autocomplete: 'street-address' }) +
          '<div class="input-row">' +
            PM.field({ id: 'ob-kod', label: 'Kod', value: a.kod, placeholder: '00-000', inputmode: 'numeric', autocomplete: 'postal-code', maxlength: 6 }) +
            PM.field({ id: 'ob-miasto', label: 'Miasto', value: a.miasto, placeholder: 'np. Warszawa', autocomplete: 'address-level2' }) +
          '</div>' +
        '</div>',
      cta: PM.actions({
        primary: { label: 'Zapisz i dalej', cls: 'press', attrs: { 'data-ob-next': '' } },
        extra: PM.btn('Pomiń na razie', { variant: 'ghost', block: true, href: '#/onboarding/2', cls: 'press' })
      })
    });
  },
  mount: function (root, ctx) {
    if (!obMount(root, ctx)) return;
    var ulica = root.querySelector('#ob-ulica');
    var kod = root.querySelector('#ob-kod');
    var miasto = root.querySelector('#ob-miasto');
    var btn = root.querySelector('[data-ob-next]');
    if (!ulica || !kod || !miasto || !btn) return;

    kod.addEventListener('input', function () {
      var d = String(kod.value).replace(/\D/g, '').slice(0, 5);
      var f = d.length > 2 ? d.slice(0, 2) + '-' + d.slice(2) : d;
      if (kod.value !== f) kod.value = f;
    });

    function submit() {
      var u = String(ulica.value || '').trim().replace(/\s+/g, ' ');
      var k = String(kod.value || '').trim();
      var m = String(miasto.value || '').trim().replace(/\s+/g, ' ');
      var first = null;
      if (!u) { showFieldError(root, 'ob-ulica', 'Wpisz ulicę i numer'); first = first || ulica; }
      if (!KOD_RE.test(k)) { showFieldError(root, 'ob-kod', k ? 'Format 00-000' : 'Wpisz kod'); first = first || kod; }
      if (!m) { showFieldError(root, 'ob-miasto', 'Wpisz miasto'); first = first || miasto; }
      if (first) { first.focus(); return; }
      ob().adres = { ulica: u, kod: k, miasto: m };
      PM.state.adres = { ulica: u, kod: k, miasto: m };
      setPole('adres', u + ', ' + k + ' ' + m);
      PM.go('#/onboarding/2');
    }
    btn.addEventListener('click', submit);
    [ulica, kod, miasto].forEach(function (i) { onEnter(i, submit); });
    ['ob-ulica', 'ob-kod', 'ob-miasto'].forEach(function (id) { bindClear(root, id); });
  }
});

/* =====================================================================
   3. Onboarding krok 2: numer rejestracyjny
   ===================================================================== */
function normPlate(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').replace(/^\s+/, '');
}

PM.route('#/onboarding/2', {
  guard: obGuard,
  title: 'Twoje auto', group: G, label: 'Krok 2 Rejestracja', tab: null,
  render: function (ctx) {
    var v = ob().rejestracja || '';
    return obScreen(2, ctx, {
      title: 'Twoje auto',
      lead: 'Parking zapłacisz bez wpisywania numeru. Bot weźmie go z profilu.',
      body:
        PM.field({
          id: 'ob-rej', label: 'Numer rejestracyjny', value: v, placeholder: 'WI 4821K',
          mono: true, autocomplete: 'off', maxlength: 10,
          attrs: { autocapitalize: 'characters', spellcheck: 'false' },
          hint: 'Kolejne auta dodasz w Moich danych.'
        }),
      cta: PM.actions({
        primary: { label: 'Dalej', cls: 'press', attrs: { 'data-ob-next': '' } },
        extra: PM.btn('Pomiń na razie', { variant: 'ghost', block: true, href: '#/onboarding/3', cls: 'press' })
      })
    });
  },
  mount: function (root, ctx) {
    if (!obMount(root, ctx)) return;
    var inp = root.querySelector('#ob-rej');
    var btn = root.querySelector('[data-ob-next]');
    if (!inp || !btn) return;

    inp.addEventListener('input', function () {
      var v = normPlate(inp.value);
      if (inp.value !== v) inp.value = v;
      clearFieldError(root, 'ob-rej');
    });

    function submit() {
      var v = normPlate(inp.value).trim();
      var compact = v.replace(/\s/g, '');
      if (!compact) { showFieldError(root, 'ob-rej', 'Wpisz numer albo pomiń ten krok'); inp.focus(); return; }
      if (!PLATE_RE.test(compact)) { showFieldError(root, 'ob-rej', 'Sprawdź numer, np. WI 4821K'); inp.focus(); return; }
      ob().rejestracja = v;
      var t = PM.state.tablice = PM.state.tablice || [];
      if (t.indexOf(v) === -1) t.unshift(v);
      setPole('tablice', t.join(', '));
      PM.go('#/onboarding/3');
    }
    btn.addEventListener('click', submit);
    onEnter(inp, submit);
  }
});

/* =====================================================================
   4. Onboarding krok 3: BLIK
   ===================================================================== */
/* ---------- checkout BLIK jako sheet nad dowolnym wariantem kroku 4 ---------- */
function registerCheckout(baseHash, label, opt) {
  opt = opt || {};
  PM.route(baseHash + '/checkout', {
    title: 'Konfiguracja BLIK', group: opt.group || G, label: label || 'Checkout BLIK (sheet)', tab: null,
    sheet: true, base: baseHash, guard: opt.guard,
    render: function () {
      var url = PM.esc(CHECKOUT_URL);
      var body =
        '<div class="au-sh-head">' +
          '<span class="au-blik-chip au-blik-chip--oc"><img src="' + BLIK_LOGO_FULL + '" alt="BLIK" draggable="false"></span>' +
          '<div class="grow"><h2 class="au-sh-title">Podepnij BLIK bez kodu</h2><p class="meta">Potwierdzisz w aplikacji banku</p></div>' +
          '<a class="au-x press" href="' + baseHash + '" aria-label="Zamknij">' + PM.icon('close-line', 18) + '</a>' +
        '</div>' +
        '<div class="au-frame" data-frame>' +
          '<div class="au-frame-load">' + PM.spinner('spinner--lg') + '<span class="meta">Ładujemy płatność</span></div>' +
          '<iframe class="checkout-frame" scrolling="yes" data-src="' + PM.esc(embedUrl()) + '" title="Konfiguracja BLIK" allow="payment" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
        '</div>' +
        '<div class="au-sh-foot">' +
          '<p class="au-pay-st" data-pay-st role="status" aria-live="polite">' + PM.icon('time-line', 14) + '<span>Aktywuje się po potwierdzeniu płatności</span></p>' +
          '<a class="au-newtab au-newtab--foot" href="' + url + '" target="_blank" rel="noopener">Otwórz w nowej karcie</a>' +
          PM.btn('Gotowe, BLIK podpięty', { variant: 'primary', block: true, cls: 'press', disabled: true, attrs: { 'data-blik-done': '' } }) +
        '</div>';
      return PM.sheet({ body: body, cls: 'au-checkout', label: 'Konfiguracja BLIK' });
    },
    mount: function (root) {
      auth().obStill = true;
      var fr = root.querySelector('.sheet [data-frame]');
      var ifr = fr && fr.querySelector('iframe');
      function loaded() { if (fr) fr.classList.add('is-loaded'); }
      if (ifr) {
        ifr.addEventListener('load', function () { if (ifr.getAttribute('src')) loaded(); });
        /* src dopiero po ułożeniu sheetu: checkout mierzy szerokość przy starcie */
        setTimeout(function () { ifr.src = ifr.getAttribute('data-src'); }, PM.shot ? 50 : 380);
      }
      PM.later(loaded, 8000);

      /* mobile: klawiatura w iframe zwęża visualViewport, modal dopasowuje się do niego.
         paymove:resize celowo ignorowany: wysokość iframe wynika z flex modala. */
      var kbSheet = root.querySelector('.sheet.au-checkout');
      var kbLayer = kbSheet && kbSheet.closest('.sheet-layer');
      var vv = window.visualViewport;
      var kbMq = window.matchMedia ? window.matchMedia('(max-width:519px)') : null;
      var kbBase = vv ? vv.height : 0;
      var kbCand = false;
      var kbOn = false;
      function kbApply(on) {
        if (!kbLayer) return;
        if (on) {
          kbLayer.style.setProperty('--kbh', Math.round(vv.height) + 'px');
          kbLayer.style.setProperty('--kbt', Math.round(vv.offsetTop) + 'px');
        } else {
          kbLayer.style.removeProperty('--kbh');
          kbLayer.style.removeProperty('--kbt');
        }
        if (on !== kbOn) {
          kbOn = on;
          kbLayer.classList.toggle('is-kb', on);
          kbSheet.classList.toggle('is-kb', on);
        }
      }
      function kbCheck() {
        if (!vv || !kbLayer || (kbMq && !kbMq.matches)) { kbApply(false); return; }
        var h = vv.height;
        var open = h < window.innerHeight - 120 || (kbCand && h < kbBase - 120);
        if (!open) {
          if (kbOn) kbCand = false;
          if (h > kbBase) kbBase = h;
        }
        kbApply(open);
      }
      function kbBlur() {
        setTimeout(function () {
          if (ifr && document.activeElement === ifr) { kbCand = true; kbCheck(); }
        }, 0);
      }
      function kbFocus() { kbCand = false; kbCheck(); }
      if (vv) { vv.addEventListener('resize', kbCheck); vv.addEventListener('scroll', kbCheck); }
      window.addEventListener('blur', kbBlur);
      window.addEventListener('focus', kbFocus);
      PM.onLeave(function () {
        if (vv) { vv.removeEventListener('resize', kbCheck); vv.removeEventListener('scroll', kbCheck); }
        window.removeEventListener('blur', kbBlur);
        window.removeEventListener('focus', kbFocus);
      });

      var done = root.querySelector('.sheet [data-blik-done]');
      var st = root.querySelector('.sheet [data-pay-st]');
      function setSt(kind, text) {
        if (!st) return;
        st.className = 'au-pay-st' + (kind ? ' is-' + kind : '');
        st.innerHTML = (kind === 'ok' ? '<i class="au-pay-ok" aria-hidden="true"></i>' : PM.icon(kind === 'err' ? 'error-warning-line' : 'time-line', 14)) + '<span>' + PM.esc(text) + '</span>';
      }
      function enable() {
        if (!done) return;
        done.disabled = false;
        done.removeAttribute('disabled');
        done.removeAttribute('aria-disabled');
        done.classList.remove('is-disabled');
        setSt('ok', 'Płatność potwierdzona');
      }
      if (auth().blikPaid === CHECKOUT_EXT) enable();
      function onMsg(e) {
        if (!isGatewayMsg(e) || (ifr && e.source !== ifr.contentWindow)) return;
        var t = e.data.type;
        if (t === 'paymove:ready') loaded();
        else if (t === 'paymove:success') { auth().blikPaid = CHECKOUT_EXT; enable(); }
        else if (t === 'paymove:error') { if (auth().blikPaid !== CHECKOUT_EXT) setSt('err', 'Płatność nie przeszła. Spróbuj jeszcze raz w bramce.'); }
        else if (t === 'paymove:closed') { if (auth().blikPaid !== CHECKOUT_EXT) PM.go(baseHash); }
      }
      window.addEventListener('message', onMsg);
      PM.onLeave(function () { window.removeEventListener('message', onMsg); });
      if (done) {
        done.addEventListener('click', function () {
          if (done.disabled || auth().blikPaid !== CHECKOUT_EXT) return;
          if (done.classList.contains('is-loading')) return;
          var b = blik();
          b.polaczony = true;
          if (!b.od) b.od = PM.date(PM.today);
          done.classList.add('is-loading');
          done.setAttribute('aria-busy', 'true');
          auth().obStill = false;
          if (opt.done) { goSoon(opt.done, 600); if (opt.doneToast) PM.later(function () { PM.toast(opt.doneToast); }, PM.shot ? 0 : 650); }
          else goSoon('#/onboarding/gotowe', 600);
        });
      }
    }
  });
}


/* ---------- wspólne dla wariantów kroku 4 ---------- */
var OKC = '<svg class="au-okc" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">' +
  '<circle cx="10" cy="10" r="10"/>' +
  '<path d="M6 10.4l2.6 2.6L14 7.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';
var VISA_SVG = '<svg viewBox="0 0 64 22" width="56" height="19" role="img" aria-label="Visa">' +
  '<text x="0" y="19" font-family="Arial,Helvetica,sans-serif" font-size="23" font-weight="900" font-style="italic" letter-spacing="-.5" fill="#1A1F71">VISA</text>' +
  '</svg>';
var MC_SVG = '<svg viewBox="0 0 40 24" width="40" height="24" role="img" aria-label="Mastercard">' +
  '<circle cx="15" cy="12" r="12" fill="#EB001B"/>' +
  '<circle cx="25" cy="12" r="12" fill="#F79E1B"/>' +
  '<path d="M20 1.09A12 12 0 0 1 20 22.91A12 12 0 0 1 20 1.09Z" fill="#FF5F00"/>' +
  '</svg>';

/* Znacznik „Najszybsza płatność” na karcie BLIK (krok 3). Błyskawica w currentColor. */
var BOLT_SVG = '<svg class="au-fast-ico" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" d="M13.2 2.2 4.6 13.4c-.3.4 0 .9.5.9h5.6l-1.3 7.2c-.1.6.6.9 1 .4l8.6-11.2c.3-.4 0-.9-.5-.9h-5.6l1.3-7.2c.1-.6-.6-.9-1-.4z"/>' +
  '</svg>';
function fastBadge() {
  return '<span class="au-fast">' + BOLT_SVG + '<span>Najszybsza płatność</span></span>';
}
  /* Pełne, oficjalne logo BLIK (czarne tło + kropka). Używane w przycisku BLIK bez kodu i w chipie sheetu. */
var BLIK_LOGO_FULL = 'assets/logos/blik-logo.svg';

/* Przycisk w stylu BLIK bez kodu. Ma klasy btn / btn--primary i siedzi w .act-row,
   więc wysokość (48px), max-width (360/400) i układ dziedziczy z dotychczasowego primary. */
function blikOneClickBtn(href) {
  return '<div class="act-row">' +
    '<a class="btn btn--primary au-blikbtn press" href="' + PM.esc(href) + '" aria-label="Podepnij BLIK bez kodu">' +
      '<span class="au-blikbtn-txt" aria-hidden="true">Podepnij</span>' +
      '<img class="au-blikbtn-logo" src="' + BLIK_LOGO_FULL + '" alt="" height="24" draggable="false">' +
      '<span class="au-blikbtn-txt" aria-hidden="true">bez kodu</span>' +
    '</a>' +
  '</div>';
}

function vCta(hash) {
  /* Mikrokopii pod przyciskiem nie dodajemy, bo lead mówi już o potwierdzeniu w aplikacji banku. */
  /* Najpierw objaśnienie (zapłać i zapamiętaj sklep), dopiero z niego wchodzimy do bramki. */
  return blikOneClickBtn(hash + '/info') +
    PM.actions({
      extra: PM.btn('Zrobię to później', { variant: 'ghost', block: true, cls: 'press', attrs: { 'data-ob-later': '' } })
    });
}
function vMount(root, ctx) {
  if (!obMount(root, ctx)) return;
  var later = root.querySelector('[data-ob-later]');
  if (later) {
    later.addEventListener('click', function () {
      blik().polaczony = false;
      finish();
      PM.go('#/portfel/bez-blik');
    });
  }
}

/* ---------- karta BLIK z Visa/Mastercard „Wkrótce” (krok 3 i dodawanie z portfela) ---------- */
function vcBody() {
  return (
        '<div class="au-vc">' +
          '<div class="au-vc-stack">' +
            '<div class="au-vc-card au-vc-card--visa">' + VISA_SVG + '<span class="au-vc-soon">Wkrótce</span></div>' +
            '<div class="au-vc-card au-vc-card--mc">' + MC_SVG + '<span class="au-vc-soon">Wkrótce</span></div>' +
            '<span class="sr-only">BLIK bez kodu: najszybsza płatność w portfelu</span>' +
            '<div class="au-vc-front" aria-hidden="true">' +
              '<span class="au-bglow"></span>' +
              '<div class="au-bcard">' +
                '<div class="au-mini-top">' +
                  '<img class="au-mini-blik" src="' + BLIK_LOGO + '" alt="" draggable="false">' +
                  fastBadge() +
                '</div>' +
                '<div class="au-mini-foot">' +
                  '<span><span class="au-mini-name">BLIK bez kodu</span><span class="au-bcard-sub">TOMASZ GĘSIOR</span></span>' +
                  '<span class="au-mini-bots">' + PM.botLogo('claude', 20) + PM.botLogo('chatgpt', 20) + PM.botLogo('perplexity', 20) + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
  );
}

/* ---------- krok 3: portfel ---------- */
PM.route('#/onboarding/3', {
  guard: obGuard,
  title: 'Podepnij BLIK', group: G, label: 'Krok 3 BLIK', tab: null,
  render: function (ctx) {
    return obScreen(3, ctx, {
      title: 'Dodaj BLIK do portfela',
      lead: 'Bot zapłaci bez przepisywania kodu, a Ty potwierdzisz w aplikacji banku.',
      body: vcBody(),
      cta: vCta('#/onboarding/3')
    });
  },
  mount: vMount
});
/* ---------- BLIK z portfela: osobny tryb bez kroków onboardingu ---------- */
var ADD = '#/portfel/dodaj-blik';
var GP = '0 Portfel';
PM.route(ADD, {
  title: 'Podepnij BLIK', group: GP, label: 'Dodaj BLIK (z portfela)', tab: null,
  render: function () {
    return PM.screen({
      title: 'Dodaj BLIK do portfela',
      showTitle: false,
      cls: 'au-addblik',
      header: '<header class="hdr au-add-hdr"><a class="hdr-back press" href="#/portfel" aria-label="Wróć do portfela">' + PM.icon('arrow-left-s-line', 20) + '</a></header>',
      contentCls: 'content--top',
      content:
        '<div class="stack-24">' +
          '<div class="auth-head">' +
            '<h1 class="title">Dodaj BLIK do portfela</h1>' +
            '<p class="lead-text">Bot zapłaci bez przepisywania kodu, a Ty potwierdzisz w aplikacji banku.</p>' +
          '</div>' +
          vcBody() +
        '</div>',
      cta: blikOneClickBtn(ADD + '/info') +
        PM.actions({ extra: PM.btn('Zrobię to później', { variant: 'ghost', block: true, cls: 'press', href: '#/portfel' }) })
    });
  },
  mount: function (root, ctx) {
    if (ctx && ctx.isBase) return;
    auth().addBlik = true;
  }
});

/* ---------- krok 3: objaśnienie przed bramką (zapłać i zapamiętaj sklep) ---------- */
  function in3Step(n, html, key, d) {
  return '<li class="au-in3-step au-in' + (key ? ' is-key' : '') + '" style="--d:' + d + 's">' +
    '<span class="au-in3-n" aria-hidden="true">' + n + '</span><span>' + html + '</span></li>';
}

function registerInfo(baseHash, label, opt) {
  opt = opt || {};
PM.route(baseHash + '/info', {
  title: 'Zapłać i zapamiętaj sklep', group: opt.group || G, label: label, tab: null,
  sheet: true, base: baseHash, guard: opt.guard,
  render: function () {
    var body =
      '<div class="au-in3-art au-in" style="--d:.16s" aria-hidden="true">' +
        '<div class="au-in3-mark"><img class="au-in3-sy" src="' + SYGNET + '" alt="" draggable="false">' +
        '<span class="au-in3-badge">' + PM.icon('add-line', 16) + '</span></div>' +
      '</div>' +
      '<div class="au-in3-head">' +
        '<span class="au-in3-kick au-in" style="--d:.26s"><img src="' + BLIK_LOGO_FULL + '" alt="BLIK" height="22" draggable="false"><span>bez kodu</span></span>' +
        '<h2 class="au-in3-title au-in" style="--d:.32s">Zapłać i zapamiętaj sklep</h2>' +
        '<p class="au-in3-lead au-in" style="--d:.38s">W aplikacji banku wybierz <b>„Zapamiętaj sklep”</b>.</p>' +
        '<p class="au-in3-note au-in" style="--d:.44s">' + PM.icon('information-line', 14) +
          '<span>Dzięki temu kolejne płatności nie będą korzystać z kodów BLIK.</span></p>' +
      '</div>' +
      '<div class="act-row au-in3-cta au-in" style="--d:.58s">' +
        PM.btn('Wróć', { variant: 'secondary', href: baseHash, cls: 'press au-in3-back' }) +
        PM.btn('Rozumiem, dalej', { variant: 'primary', href: baseHash + '/checkout', cls: 'press', iconRight: 'arrow-right-s-line' }) +
      '</div>';
    return PM.sheet({ body: body, cls: 'au-in3', label: 'Zapłać i zapamiętaj sklep' });
  },
  mount: function () {
    /* powrót na krok 3 (Wróć, scrim, Esc) bez ponownej animacji wejścia */
    auth().obStill = true;
  }
});
}

registerInfo('#/onboarding/3', 'Krok 3 · jak zapamiętać sklep (modal)', { guard: obGuard });
registerCheckout('#/onboarding/3', 'Checkout BLIK (sheet)', { guard: obGuard });
registerInfo(ADD, 'Dodaj BLIK · jak zapamiętać sklep (modal)', { group: GP });
registerCheckout(ADD, 'Dodaj BLIK · checkout (sheet)', { group: GP, done: '#/portfel', doneToast: 'BLIK podpięty' });

/* =====================================================================
   5. Gotowe
   ===================================================================== */
PM.route('#/onboarding/gotowe', {
  guard: obGuard,
  title: 'Wszystko gotowe', group: G, label: 'Gotowe', tab: null,
  render: function () {
    var o = ob();
    var a = o.adres || {};
    var adr = a.ulica ? a.ulica + ', ' + a.miasto : '';
    var podpiety = !!blik().polaczony;
    var rows = [
      { k: 'Mail', v: o.mail || DEFAULT_MAIL },
      { k: 'Adres', v: adr || 'Dodasz później' },
      { k: 'Auto', v: o.rejestracja || 'Dodasz później', mono: !!o.rejestracja },
      {
        k: 'BLIK', html: true,
        v: '<span class="status"><i class="dot" style="background:' + (podpiety ? 'var(--ok)' : 'var(--off)') + '"></i>' + (podpiety ? 'Podpięty' : 'Do podpięcia') + '</span>'
      }
    ];
    return statusScreen({
      title: 'Wszystko gotowe',
      cls: 'screen--ok au-done',
      hero:
        '<span class="success-check au-check" aria-hidden="true">' +
          '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="26"/><path d="M15 27l7.5 7.5L37 19"/></svg>' +
        '</span>',
      lead: 'Boty z dostępem zapłacą BLIKiem w ramach Twoich limitów.',
      extra: '<div class="card au-in" style="--d:.35s">' + PM.kv(rows) + '</div>',
      cta: PM.actions({ primary: { label: 'Przejdź do portfela', href: '#/portfel', cls: 'press' } })
    });
  },
  mount: function () {
    var a = auth();
    a.obDir = null;
    a.obStill = false;
    finish();
  }
});

/* =====================================================================
   6. Zgoda z linku w czacie (zachowana z poprzedniej wersji)
   ===================================================================== */
function zgodaData() {
  return PM.state.zgoda || DATA.zgoda || {};
}
function limitMax() {
  return (PM.state.limity && PM.state.limity.miesieczny) || 1000;
}
function limitError(v) {
  if (!(v > 0)) return 'Ustaw limit większy niż 0 zł';
  if (v > limitMax()) return 'Limit bota nie może przekroczyć ogólnego ' + PM.zlInt(limitMax());
  return null;
}

PM.route('#/zgoda', {
  title: 'Zgoda dla Claude', group: G, label: 'Zgoda dla Claude', tab: null,
  render: function () {
    var z = zgodaData();
    var botId = z.bot || 'claude';
    var name = PM.botName(botId);
    var pola = z.pola || ['imie', 'mail', 'adres', 'tablice'];
    var limit = z.limitStart || 200;
    var opcje = z.opcjeLimitu || [100, 200, 300, 500];
    var rang = (PM.state.limity && PM.state.limity.zakresy && PM.state.limity.zakresy.bot) || { min: 0, max: 1000, step: 10 };

    var rows = pola.map(function (id) {
      var p = poleById(id) || { id: id, label: id, ikona: 'information-line', wartosc: '' };
      return '<button class="check-row" type="button" data-pole="' + PM.esc(p.id) + '" aria-pressed="true">' +
        '<div class="thumb thumb--sm">' + PM.icon(p.ikona, 18) + '</div>' +
        '<div class="grow"><div class="name">' + PM.esc(p.label) + '</div><div class="meta ellipsis">' + PM.esc(p.wartosc) + '</div></div>' +
        '<span class="zg-mark" aria-hidden="true">' + PM.icon('check-line', 14) + '</span>' +
        '</button>';
    }).join('');

    var chips = opcje.map(function (v) {
      return '<button class="chip press' + (v === limit ? ' is-active' : '') + '" type="button" data-limit="' + v + '" aria-pressed="' + (v === limit ? 'true' : 'false') + '">' + PM.zlInt(v) + '</button>';
    }).join('');

    return PM.screen({
      title: name + ' chce używać Twoich danych',
      showTitle: false,
      tag: false,
      contentCls: 'content--top',
      content:
        duo(64) +
        '<div class="auth-head">' +
          '<h1 class="title">' + PM.esc(name) + ' chce używać Twoich danych</h1>' +
          '<p class="lead-text">Do zakupów w Twoim imieniu – zmienisz to w każdej chwili.</p>' +
        '</div>' +
        '<section class="sec">' +
          '<div class="sec-h"><span>Dane dla ' + PM.esc(name) + '</span><span class="count" data-zg-count>' + pola.length + ' z ' + pola.length + '</span></div>' +
          '<div class="card checks">' + rows + '</div>' +
        '</section>' +
        '<section class="sec">' +
          '<div class="sec-h"><span>Limit startowy</span></div>' +
          '<div class="card">' +
            PM.amountField({
              id: 'zg-limit', label: 'Na miesiąc', value: limit,
              min: rang.min, max: rang.max, step: rang.step,
              right: '<span class="mono-s">' + PM.esc(z.okres || 'miesięcznie') + '</span>'
            }) +
            '<div class="zg-chips">' + chips + '</div>' +
          '</div>' +
        '</section>' +
        '<div class="card">' +
          '<div class="row">' +
            '<span class="tile"><img src="assets/logos/blik-mark-noborder.svg" alt="BLIK" draggable="false"></span>' +
            '<div class="grow"><div class="name">BLIK bez kodu</div><div class="meta">Potwierdzasz w aplikacji banku</div></div>' +
          '</div>' +
        '</div>',
      cta: PM.actions({
        secondary: { label: 'Odmów', href: '#/zgoda/odmowa', cls: 'press' },
        primary: { label: 'Zezwól', cls: 'press', attrs: { 'data-zg-allow': '' } },
        legal: 'Dostęp odłączysz w zakładce Boty.'
      })
    });
  },
  mount: function (root) {
    var z = zgodaData();
    var botId = z.bot || 'claude';
    var rows = PM.qsa(root, '[data-pole]');
    var countEl = root.querySelector('[data-zg-count]');
    var allow = root.querySelector('[data-zg-allow]');
    var chips = PM.qsa(root, '[data-limit]');

    function updateCount() {
      var on = rows.filter(function (r) { return r.getAttribute('aria-pressed') === 'true'; }).length;
      if (countEl) countEl.textContent = on + ' z ' + rows.length;
    }
    function syncChips(v) {
      chips.forEach(function (c) {
        var a = Number(c.getAttribute('data-limit')) === Number(v);
        c.classList.toggle('is-active', a);
        c.setAttribute('aria-pressed', a ? 'true' : 'false');
      });
    }
    function validate(v) {
      var msg = limitError(v);
      PM.setAmountError(root, 'zg-limit', msg);
      if (allow) allow.disabled = !!msg;
      return !msg;
    }

    rows.forEach(function (r) {
      r.addEventListener('click', function () {
        var on = r.getAttribute('aria-pressed') !== 'true';
        r.setAttribute('aria-pressed', on ? 'true' : 'false');
        updateCount();
      });
    });

    PM.bindAmount(root, function (id, v) {
      if (id !== 'zg-limit') return;
      syncChips(v);
      validate(v);
    });

    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var v = Number(c.getAttribute('data-limit')) || 0;
        PM.setAmount(root, 'zg-limit', v);
        syncChips(v);
        validate(v);
      });
    });

    if (allow) {
      allow.addEventListener('click', function () {
        var limit = PM.amountValue(root, 'zg-limit');
        if (!validate(limit)) return;
        var chosen = rows.filter(function (r) { return r.getAttribute('aria-pressed') === 'true'; })
          .map(function (r) { return r.getAttribute('data-pole'); });

        var b = PM.bot(botId);
        if (!b) {
          var src = null;
          (DATA.boty || []).forEach(function (x) { if (x.id === botId) src = x; });
          b = src ? JSON.parse(JSON.stringify(src)) : { id: botId, nazwa: PM.botName(botId), limitTrans: 100, uprawnienia: {} };
          b.wydal = 0; b.zakupyMies = 0; b.ostatnio = 'nigdy'; b.ostatnioData = null;
          b.polaczono = PM.today;
          PM.state.boty = PM.state.boty || [];
          PM.state.boty.unshift(b);
        }
        b.uprawnienia = b.uprawnienia || {};
        rows.forEach(function (r) {
          b.uprawnienia[r.getAttribute('data-pole')] = r.getAttribute('aria-pressed') === 'true';
        });
        b.limitMies = limit;
        auth().zgoda = { bot: botId, pola: chosen, limit: limit };
        PM.go('#/zgoda/ok');
      });
    }
  }
});

PM.route('#/zgoda/ok', {
  title: 'Claude połączony', group: G, label: 'Claude połączony', tab: null,
  render: function () {
    var z = zgodaData();
    var saved = auth().zgoda || {};
    var botId = saved.bot || z.bot || 'claude';
    var name = PM.botName(botId);
    var pola = saved.pola || z.pola || ['imie', 'mail', 'adres', 'tablice'];
    var limit = saved.limit != null ? saved.limit : (z.limitStart || 200);
    var dostep = pola.length
      ? pola.map(function (id) { return SHORT[id] || id; }).join(', ')
      : 'brak';
    dostep = dostep.charAt(0).toUpperCase() + dostep.slice(1);

    return statusScreen({
      title: name + ' połączony',
      cls: 'screen--ok',
      hero: duo(64),
      lead: 'Płatności potwierdzasz w aplikacji banku.',
      extra:
        '<div class="card au-in" style="--d:.2s">' +
          PM.kv([
            { k: 'Dane', v: dostep },
            { k: 'Limit', v: PM.zlInt(limit) + ' / mies.' },
            { k: 'Płatność', v: 'BLIK bez kodu' }
          ]) +
        '</div>',
      cta: PM.actions({
        secondary: { label: 'Ustawienia', href: '#/bot/' + botId, cls: 'press' },
        primary: { label: 'Wróć do czatu', cls: 'press', attrs: { 'data-toast': 'Wracasz do czatu z ' + name } }
      })
    });
  }
});

PM.route('#/zgoda/odmowa', {
  title: 'Odmowa dostępu', group: G, label: 'Odmowa', tab: null,
  render: function () {
    var z = zgodaData();
    var name = PM.botName(z.bot || 'claude');
    return statusScreen({
      title: 'Odmówiono dostępu',
      hero: '<span class="status-ico">' + PM.icon('close-line', 28) + '</span>',
      lead: PM.esc(name) + ' nie dostał Twoich danych. Połączysz go później z czatu.',
      cta: PM.actions({
        secondary: { label: 'Zmień decyzję', href: '#/zgoda', cls: 'press' },
        primary: { label: 'Wróć do czatu', cls: 'press', attrs: { 'data-toast': 'Wracasz do czatu z ' + name } }
      })
    });
  }
});
