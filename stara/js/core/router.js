/* Router hash: rejestracja stanów, render (retencja bazy, sheety, animacje, fokus)
   i start aplikacji. Właściciel routes/cur/mounted/started/ready. */
import { PM, STATES } from './pm.js';
import { SHOT } from './env.js';
import { qsa, stripMeta } from './util.js';
import { clearScope, setMountScope } from './timers.js';
import { els, buildShell, buildStates, updateNav, updateMockbar, updateStatesActive, markStatesDirty } from './shell.js';
import { initEvents } from './events.js';
import './components.js';
import './overlay.js';

const html = document.documentElement;
const routes = {};
let cur = { hash: '', path: '', query: {}, def: null };
let started = false;
let ready = false;

/* ---------- router ---------- */
export function normHash(h) {
  h = String(h == null ? '' : h).trim();
  if (!h || h === '#') return '';
  if (h.charAt(0) !== '#') h = '#' + (h.charAt(0) === '/' ? '' : '/') + h;
  if (h.indexOf('#/') !== 0) h = '#/' + h.slice(1);
  if (h.length > 2 && h.charAt(h.length - 1) === '/' && h.indexOf('?') === -1) h = h.slice(0, -1);
  return h;
}
export function splitHash(h) {
  var i = h.indexOf('?');
  var path = i === -1 ? h : h.slice(0, i);
  var query = {};
  if (i !== -1) {
    h.slice(i + 1).split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      try { query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } catch (e) { query[p[0]] = p[1] || ''; }
    });
  }
  return { hash: h, path: path, query: query };
}
PM.normHash = normHash;

PM.route = function (hash, def) {
  var path = splitHash(normHash(hash)).path;
  if (!path) return PM;
  def = def || {};
  def.hash = path;
  def.group = def.group || 'Inne';
  def.label = def.label || def.title || path;
  if (def.tab === undefined) def.tab = null;
  if (def.base) def.base = normHash(def.base);
  var entry = { hash: path, group: def.group, label: def.label, title: def.title || def.label, tab: def.tab, sheet: !!def.sheet };
  if (routes[path]) {
    for (var i = 0; i < STATES.length; i++) if (STATES[i].hash === path) { STATES[i] = entry; break; }
  } else {
    STATES.push(entry);
  }
  routes[path] = def;
  markStatesDirty();
  return PM;
};
PM.routes = function () { return routes; };
PM.has = function (hash) { return !!routes[splitHash(normHash(hash)).path]; };
PM.current = function () { return { hash: cur.hash, path: cur.path, query: cur.query, def: cur.def }; };

function setHashSilently(h) {
  try {
    history.replaceState(null, '', location.pathname + location.search + h);
  } catch (e) {
    location.replace(h);
    return false;
  }
  return true;
}

export const go = PM.go = function (hash, o) {
  o = o || {};
  var h = normHash(hash);
  if (!h) return;
  if (o.replace) {
    if (setHashSilently(h)) render();
    return;
  }
  if (h === normHash(location.hash)) render();
  else location.hash = h;
};

function makeCtx(sp, def, isBase) {
  return {
    hash: sp.hash, path: sp.path, query: sp.query, params: sp.query,
    state: PM.state, shot: SHOT, def: def, isBase: !!isBase, el: els.device
  };
}

function callRender(def, ctx) {
  if (!def || typeof def.render !== 'function') return '';
  var out = def.render(ctx);
  return out == null ? '' : String(out);
}

function wrapScreen(out, def) {
  if (/^\s*<(section|div)[^>]*class="[^"]*\bscreen\b/.test(out)) return out;
  return PM.screen({ content: out, back: def && def.back, cls: def && def.screenClass, cta: def && def.cta });
}

function wrapSheet(out, def) {
  if (/^\s*<div[^>]*class="[^"]*\bsheet-layer\b/.test(out)) return out;
  return PM.sheet({ body: out, label: def && (def.title || def.label) });
}

function fallbackScreen(path, err) {
  return PM.screen({
    title: err ? 'Coś poszło nie tak' : 'Nie ma takiego stanu',
    content: PM.emptyState({
      icon: 'error-warning-line',
      title: err ? 'Błąd ekranu' : 'Brak ekranu',
      text: path || 'Ten stan nie jest jeszcze gotowy.',
      cta: homeHash() ? { label: routes['#/portfel'] ? 'Wróć do portfela' : 'Wróć', href: homeHash() } : null
    })
  });
}

function firstStateHash() { return STATES.length ? STATES[0].hash : ''; }
export function homeHash() {
  return routes['#/portfel'] ? '#/portfel' : routes['#/dane'] ? '#/dane' : firstStateHash();
}
PM.home = homeHash;

/* ---------- render: retencja bazy, animacje wejścia, fokus ---------- */
const mounted = { screenKey: '', hash: '', sheet: false };
const seen = {};
let stale = false;
let lastTab = null;
let opener = null;
let lastActivator = null;
let announceTimer = 0;

/* wymusza ponowny render bazy przy najbliższej zmianie trasy */
PM.invalidate = function () { stale = true; };

/* kończy skończone animacje CSS w root (bez spinnerów i pulsów) */
function finishEntrance(root) {
  if (!root || typeof document.getAnimations !== 'function') return;
  var list;
  try { list = document.getAnimations(); } catch (e) { return; }
  list.forEach(function (a) {
    try {
      var ef = a.effect, tg = ef && ef.target;
      if (!a.animationName || !tg || !root.contains(tg)) return;
      var it = ef.getTiming ? ef.getTiming().iterations : 1;
      if (!isFinite(it)) return;
      a.finish();
    } catch (e) {}
  });
}

function announce(text) {
  if (SHOT || !els.announcer) return;
  clearTimeout(announceTimer);
  els.announcer.textContent = '';
  announceTimer = setTimeout(function () { els.announcer.textContent = text; }, 50);
}

/* zapamiętuje ostatnio kliknięty element (iOS nie fokusuje przycisków po tapnięciu) */
function rememberActivator(e) {
  var t = e.target;
  lastActivator = t && t.closest ? t.closest('a[href],button,[tabindex]') : null;
}

function pickOpener() {
  var a = document.activeElement;
  if (a && a !== document.body && els.view.contains(a)) return a;
  return lastActivator && els.view.contains(lastActivator) ? lastActivator : null;
}

/* fokus na kontener, chyba że użytkownik już jest w środku box */
function focusInto(box, target) {
  if (SHOT || !box || !target) return;
  var a = document.activeElement;
  if (a && a !== document.body && box.contains(a)) return;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  try { target.focus({ preventScroll: true }); } catch (e) {}
}

function insertSheet(sheetHtml, def) {
  var tmp = document.createElement('div');
  tmp.innerHTML = sheetHtml;
  var layer = tmp.firstElementChild;
  if (layer) {
    layer.setAttribute('data-route-sheet', def.base || '');
    els.device.insertBefore(layer, els.toasts);
  }
  return layer;
}

export function render() {
  if (!ready) return;

  var h = normHash(location.hash);
  if (!h || h === '#/') {
    var target = routes['#/login'] ? '#/login' : homeHash();
    if (target) { setHashSilently(target); h = target; }
  }
  var sp = splitHash(h || '');
  var def = routes[sp.path];
  if (!def && sp.path) {
    var home = homeHash();
    if (home && routes[home]) {
      setHashSilently(home);
      sp = splitHash(home);
      def = routes[home];
    }
  }

  var prevHash = cur.hash;
  var sameHash = prevHash === sp.hash;
  cur = { hash: sp.hash, path: sp.path, query: sp.query, def: def || null };

  var baseDef = def && def.sheet && def.base ? routes[def.base] : null;
  var screenKey = baseDef ? baseDef.hash : sp.path;
  var ctx = makeCtx(sp, def, false);
  var baseCtx = baseDef ? makeCtx({ hash: baseDef.hash, path: baseDef.hash, query: sp.query }, baseDef, true) : null;
  var tab = def ? def.tab : null;
  if (tab == null && baseDef) tab = baseDef.tab;

  /* tryb: full | sheet (baza zostaje) | close (zdjęcie sheeta, baza zostaje) */
  var mode = 'full';
  if (!SHOT && !stale && def && mounted.screenKey) {
    if (baseDef && mounted.screenKey === baseDef.hash) mode = 'sheet';
    else if (!def.sheet && mounted.sheet && mounted.screenKey === sp.path &&
      (sp.hash === sp.path || sp.hash === mounted.hash)) mode = 'close';
  }
  if (def && def.sheet && !mounted.sheet) opener = pickOpener();

  var screenHtml = '', sheetHtml = '', failed = false, layer = null;

  if (mode === 'sheet') {
    clearScope('sheet');
    try {
      sheetHtml = wrapSheet(callRender(def, ctx), def);
    } catch (e) {
      console.error('[PM] render', sp.path, e);
      screenHtml = fallbackScreen(sp.path, e);
      sheetHtml = '';
      failed = true;
      mode = 'full';
    }
  }
  if (mode === 'full') {
    clearScope('sheet');
    clearScope('base');
    stale = false;
    if (!failed) {
      try {
        if (!def) {
          screenHtml = fallbackScreen(sp.path);
        } else if (def.sheet) {
          screenHtml = baseDef ? wrapScreen(callRender(baseDef, baseCtx), baseDef) : PM.screen({ content: '' });
          sheetHtml = wrapSheet(callRender(def, ctx), def);
        } else {
          screenHtml = wrapScreen(callRender(def, ctx), def);
        }
      } catch (e1) {
        console.error('[PM] render', sp.path, e1);
        screenHtml = fallbackScreen(sp.path, e1);
        sheetHtml = '';
        failed = true;
      }
    }
  } else if (mode === 'close') {
    clearScope('sheet');
  }

  /* DOM */
  els.device.classList.toggle('has-tabbar', !!tab);
  els.app.classList.toggle('no-nav', !tab);
  /* warstwy sheetów (route i dynamiczne) znikają przy każdej zmianie trasy, jak wcześniej */
  qsa(els.device, '.sheet-layer').forEach(function (l) { l.remove(); });

  if (mode === 'full') {
    if (SHOT) els.toasts.innerHTML = '';
    els.view.innerHTML = screenHtml;
    if (sheetHtml) layer = insertSheet(sheetHtml, def);
    /* przed pierwszym paintem: bez animacji wejścia przy powrotach */
    if (seen[screenKey] || (lastTab && tab) || sameHash) finishEntrance(els.view);
    if (layer && sameHash) finishEntrance(layer);
    seen[screenKey] = true;
  } else if (mode === 'sheet') {
    layer = insertSheet(sheetHtml, def);
    if (layer && sameHash) finishEntrance(layer);
  }

  updateNav(tab);
  updateMockbar(def, cur.path);
  updateStatesActive(cur.path);
  document.title = (def ? (def.title || def.label) + ' · ' : '') + 'Paymove Wallet';

  if (mode === 'full') {
    qsa(els.device, '.content, .sheet').forEach(function (c) { c.scrollTop = 0; });
    /* reset przewinięcia dokumentu (np. po onboardingu, gdzie przewija się html) */
    try {
      var se = document.scrollingElement || html;
      window.scrollTo(0, 0);
      se.scrollTop = 0;
      document.body.scrollTop = 0;
      if (window.requestAnimationFrame) requestAnimationFrame(function () { if (window.pageYOffset) window.scrollTo(0, 0); });
    } catch (e) {}
  }

  /* mount */
  if (!failed && mode !== 'close') {
    try {
      if (mode === 'full' && baseDef && typeof baseDef.mount === 'function') {
        setMountScope('base');
        baseDef.mount(els.device, baseCtx);
      }
      if (def && typeof def.mount === 'function') {
        setMountScope(def.sheet ? 'sheet' : 'base');
        def.mount(els.device, ctx);
      }
    } catch (e2) {
      console.error('[PM] mount', sp.path, e2);
    }
  }
  setMountScope(layer ? 'sheet' : 'base');

  if (mode === 'full') stripMeta(els.device);
  else if (layer) stripMeta(layer);

  /* fokus */
  if (mode === 'close') {
    var back = opener;
    opener = null;
    if (!SHOT && back && els.view.contains(back)) { try { back.focus({ preventScroll: true }); } catch (e3) {} }
    else focusInto(els.view, els.view.querySelector('.screen'));
  } else {
    var af = layer ? layer.querySelector('[data-autofocus]') : els.device.querySelector('[data-autofocus]');
    if (af && !af.disabled) { try { af.focus({ preventScroll: true }); } catch (e4) {} }
    else if (layer) focusInto(layer, layer.querySelector('.sheet'));
    else focusInto(els.view, els.view.querySelector('.screen'));
  }
  if (!layer) opener = null;

  if (mode === 'full') {
    mounted.screenKey = failed ? '' : screenKey;
    mounted.hash = baseDef ? baseDef.hash : sp.hash;
  }
  mounted.sheet = !!layer;
  lastTab = tab;

  if (def && def.toast) PM.toast(def.toast);
  if (!sameHash) announce(document.title);

  if (html.classList.contains('is-booting')) setTimeout(function () { html.classList.remove('is-booting'); }, 400);
  html.setAttribute('data-pm-ready', sp.path || '');
  try { document.dispatchEvent(new CustomEvent('pm:render', { detail: { hash: sp.hash, path: sp.path } })); } catch (e5) {}
}
PM.render = render;

/* zamyka sheet trasy (powrót do base) albo dynamiczny sheet */
export function closeRouteSheet() {
  var layer = els.device && els.device.querySelector('.sheet-layer[data-route-sheet]');
  if (layer) {
    var base = layer.getAttribute('data-route-sheet');
    if (base) PM.go(base);
    return true;
  }
  if (els.device && els.device.querySelector('.sheet-layer[data-dynamic-sheet]')) { PM.closeSheet(); return true; }
  return false;
}

/* ---------- start ---------- */
const FONTS = ['400 16px Aeonik', '500 16px Aeonik', '700 16px Aeonik', '500 12px "IBM Plex Mono"'];

/* pierwszy render po załadowaniu fontów, najdłużej 700 ms */
function whenFonts(cb) {
  var done = false;
  function go() { if (done) return; done = true; cb(); }
  var f = document.fonts;
  if (!f || typeof f.load !== 'function' || typeof Promise === 'undefined') { go(); return; }
  try {
    Promise.race([
      Promise.all(FONTS.map(function (s) { return f.load(s); })),
      new Promise(function (res) { setTimeout(res, 700); })
    ]).then(go, go);
  } catch (e) { go(); }
}

export function start() {
  if (started) { render(); return; }
  started = true;
  buildShell();
  buildStates();
  document.addEventListener('click', rememberActivator, true);
  initEvents({ go: go, homeHash: homeHash, closeRouteSheet: closeRouteSheet });
  window.addEventListener('hashchange', render);
  whenFonts(function () { ready = true; render(); });
}
PM.start = start;

window.addEventListener('load', function () {
  if (!started) PM.start();
});
