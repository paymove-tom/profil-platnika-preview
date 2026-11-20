/* Szkielet aplikacji: sidenav, urządzenie, tab bar, toasty, panel Stany.
   Trzyma referencje DOM (els) i flagę przebudowy listy stanów. */
import { PM, STATES } from './pm.js';
import { esc, qsa } from './util.js';
import { LOGO_INK, TABS } from './state.js';

export const els = {};
let statesDirty = true;

/* oznacza listę stanów do przebudowy (po PM.route) */
export function markStatesDirty() { statesDirty = true; }

const SB_ICONS =
  '<svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1" fill="#1a1a1a"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#1a1a1a"/><rect x="10" y="3" width="3" height="9" rx="1" fill="#1a1a1a"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#1a1a1a"/></svg>' +
  '<svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path d="M8 2.3c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8 .6 10.2 10.2 0 0 0 .8 3.5L2 4.7a8.5 8.5 0 0 1 6-2.4Zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2A6.8 6.8 0 0 0 8 4a6.8 6.8 0 0 0-4.8 1.9l1.2 1.2A5.1 5.1 0 0 1 8 5.7Zm0 3.4c.5 0 .9.2 1.2.5L8 10.8 6.8 9.6c.3-.3.7-.5 1.2-.5Z" fill="#1a1a1a"/></svg>' +
  '<svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true"><rect x=".5" y=".5" width="23" height="12" rx="3.5" stroke="#1a1a1a" stroke-opacity=".35" fill="none"/><rect x="2" y="2" width="20" height="9" rx="2" fill="#1a1a1a"/><path d="M25 4.5v4a2 2 0 0 0 0-4Z" fill="#1a1a1a" fill-opacity=".4"/></svg>';

export function buildShell() {
  var app = document.getElementById('app') || document.body;
  app.innerHTML = '';
  els.app = app;

  var tabsHtml = TABS.map(function (t) {
    return '<a class="tab" href="' + t.href + '" data-tab="' + t.id + '">' + PM.icon(t.icon, 24) + '<span>' + t.label + '</span></a>';
  }).join('');
  var sideHtml = TABS.map(function (t) {
    return '<a class="sidenav-link" href="' + t.href + '" data-tab="' + t.id + '">' + PM.icon(t.icon, 20) + '<span>' + t.label + '</span></a>';
  }).join('');

  app.innerHTML =
    '<nav class="sidenav" aria-label="Sekcje profilu">' +
      '<a class="sidenav-brand" href="#/portfel" aria-label="Paymove Wallet">' +
        '<img class="sidenav-logo" src="' + LOGO_INK + '" alt="Paymove" width="114" height="20">' +
        '<span class="wallet-word">Wallet</span>' +
      '</a>' +
      '<div class="sidenav-links">' + sideHtml + '</div>' +

    '</nav>' +
    '<main class="stage">' +

      '<div class="device">' +
        '<div class="statusbar"><span class="sb-time">9:41</span><span class="sb-icons">' + SB_ICONS + '</span></div>' +
        '<div class="view" data-view></div>' +
        '<nav class="tabbar" aria-label="Sekcje">' + tabsHtml + '</nav>' +
        '<div class="toast-wrap" aria-live="polite"></div>' +
      '</div>' +
    '</main>' +
    '<button class="states-fab" type="button" aria-label="Stany prototypu" aria-controls="pm-states" aria-expanded="false">' + PM.icon('layout-grid-line', 20) + '</button>' +
    '<div class="states-scrim" data-states-close></div>' +
    '<aside class="states-drawer" id="pm-states" aria-label="Stany prototypu" aria-hidden="true">' +
      '<div class="states-head"><span class="states-title">Stany</span><span class="states-count" data-states-count></span>' +
        '<button class="states-close" type="button" data-states-close aria-label="Zamknij">' + PM.icon('close-line', 18) + '</button></div>' +
      '<div class="states-body" data-states-body></div>' +
    '</aside>';

  var ann = document.createElement('div');
  ann.id = 'pm-route-announcer';
  ann.className = 'sr-only';
  ann.setAttribute('role', 'status');
  ann.setAttribute('aria-live', 'polite');
  app.appendChild(ann);
  els.announcer = ann;
  els.sidenav = app.querySelector('.sidenav');
  els.stage = app.querySelector('.stage');
  els.mockTitle = app.querySelector('[data-mock-title]');
  els.device = app.querySelector('.device');
  els.view = app.querySelector('[data-view]');
  els.tabbar = app.querySelector('.tabbar');
  els.toasts = app.querySelector('.toast-wrap');
  els.fab = app.querySelector('.states-fab');
  els.scrim = app.querySelector('.states-scrim');
  els.drawer = app.querySelector('.states-drawer');
  els.statesBody = app.querySelector('[data-states-body]');
  els.statesCount = app.querySelector('[data-states-count]');
}

export function updateNav(tab) {
  qsa(els.app, '[data-tab]').forEach(function (a) {
    var on = a.getAttribute('data-tab') === tab;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

/* curPath = bieżąca ścieżka routera (dawniej cur.path z closure) */
export function updateMockbar(def, curPath) {
  if (!els.mockTitle) return;
  els.mockTitle.innerHTML = def
    ? esc(def.group) + ' · ' + esc(def.label) + '<span class="mockbar-hash">' + esc(def.hash) + '</span>'
    : 'Brak stanu<span class="mockbar-hash">' + esc(curPath) + '</span>';
}

export function buildStates() {
  if (!els.statesBody) return;
  var groups = [], map = {};
  STATES.forEach(function (s) {
    if (!map[s.group]) { map[s.group] = { name: s.group, items: [] }; groups.push(map[s.group]); }
    map[s.group].items.push(s);
  });
  els.statesBody.innerHTML = groups.map(function (g) {
    return '<div class="states-group"><span class="eyebrow">' + esc(g.name) + '</span>' +
      g.items.map(function (s) {
        return '<a class="states-item" href="' + esc(s.hash) + '" data-state="' + esc(s.hash) + '"><span>' + esc(s.label) + '</span><code>' + esc(s.hash) + '</code></a>';
      }).join('') + '</div>';
  }).join('');
  els.statesCount.textContent = STATES.length + ' stanów';
  statesDirty = false;
}

/* curPath = bieżąca ścieżka routera */
export function updateStatesActive(curPath) {
  if (statesDirty) buildStates();
  qsa(els.statesBody, '.states-item').forEach(function (a) {
    var on = a.getAttribute('data-state') === curPath;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });
}

export function setDrawer(open) {
  if (!els.drawer) return;
  if (open && statesDirty) buildStates();
  els.drawer.classList.toggle('is-open', open);
  els.scrim.classList.toggle('is-open', open);
  els.drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  els.fab.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    var act = els.statesBody.querySelector('.states-item.is-active');
    if (act && act.scrollIntoView) act.scrollIntoView({ block: 'center' });
    var cl = els.drawer.querySelector('.states-close');
    if (cl) cl.focus({ preventScroll: true });
  }
}
PM.openStates = function () { setDrawer(true); };
PM.closeStates = function () { setDrawer(false); };
