/* Globalna delegacja zdarzeń (klik, Escape) i korekta fokusu pól w onboardingu.
   Nie importuje routera: homeHash/closeRouteSheet przychodzą w initEvents(api). */
import { PM } from './pm.js';
import { SHOT } from './env.js';
import { qsa } from './util.js';
import { els, setDrawer } from './shell.js';

let api = null;

/* ---------- delegacja ---------- */
function onClick(e) {
  var t = e.target;
  if (!t || !t.closest) return;

  if (t.closest('.states-fab')) { setDrawer(!els.drawer.classList.contains('is-open')); return; }
  if (t.closest('[data-states-close]')) { setDrawer(false); return; }
  if (t.closest('.states-item')) { setDrawer(false); return; }

  var scrim = t.closest('.scrim');
  if (scrim && !SHOT) { e.preventDefault(); api.closeRouteSheet(); return; }

  var tg = t.closest('.toggle[role="switch"]');
  if (tg && !tg.disabled) {
    var on = tg.getAttribute('aria-checked') !== 'true';
    tg.setAttribute('aria-checked', on ? 'true' : 'false');
    var tid = tg.getAttribute('data-target');
    if (tid) {
      var target = document.getElementById(tid);
      if (target) {
        target.classList.toggle('off', !on);
        target.classList.toggle('is-disabled', !on);
        qsa(target, 'input,textarea,select,button').forEach(function (i) { i.disabled = !on; });
        if (target.matches('input,textarea,select,button')) target.disabled = !on;
      }
    }
    tg.dispatchEvent(new CustomEvent('pm:toggle', { bubbles: true, detail: { id: tg.id, on: on, el: tg } }));
    return;
  }

  var si = t.closest('.seg .seg-item');
  if (si && si.tagName === 'BUTTON') {
    var seg = si.closest('.seg');
    qsa(seg, '.seg-item').forEach(function (x) {
      var a = x === si;
      x.classList.toggle('is-active', a);
      x.setAttribute('aria-selected', a ? 'true' : 'false');
    });
    si.dispatchEvent(new CustomEvent('pm:seg', { bubbles: true, detail: { value: si.getAttribute('data-seg-value'), seg: seg.getAttribute('data-seg') || seg.id || '', el: si } }));
    return;
  }

  var go = t.closest('[data-go]');
  if (go) { e.preventDefault(); PM.go(go.getAttribute('data-go')); return; }

  var back = t.closest('[data-back]');
  if (back) {
    e.preventDefault();
    var bh = back.getAttribute('data-back');
    if (bh) PM.go(bh);
    else if (history.length > 1) history.back();
    else PM.go(api.homeHash());
    return;
  }

  var ts = t.closest('[data-toast]');
  if (ts) PM.toast(ts.getAttribute('data-toast'));
}

function onKey(e) {
  if (e.key !== 'Escape') return;
  if (els.drawer && els.drawer.classList.contains('is-open')) { setDrawer(false); return; }
  if (!SHOT) api.closeRouteSheet();
}

/* ---------- onboarding: pole nad klawiaturą (mobile) ----------
   Na mobile ekrany .au-ob przewijają cały dokument (CSS: html:has(.screen.au-ob)),
   iOS sam przewija do pola. Tu tylko korekta, gdy pole zostało pod przyklejonym
   nagłówkiem albo poza widocznym obszarem. Bez scrollTo, bez wymuszania wysokości. */
function initObFocus() {
  var mq = window.matchMedia ? window.matchMedia('(max-width:1023px)') : null;
  var FIELD = 'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]),textarea,select';
  var timer = 0;
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (mq && !mq.matches) return;
    if (!el || !el.matches || !el.matches(FIELD) || !el.closest('.screen.au-ob .content')) return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (document.activeElement !== el) return;
      var box = el.closest('.field') || el;
      var hdr = document.querySelector('.screen.au-ob .au-ob-hdr');
      var vv = window.visualViewport;
      var vTop = vv ? vv.offsetTop : 0;
      var vBottom = vTop + (vv ? vv.height : window.innerHeight);
      var hdrBottom = hdr ? hdr.getBoundingClientRect().bottom : 0;
      var boxTop = box.getBoundingClientRect().top;
      var inBottom = el.getBoundingClientRect().bottom;
      if (boxTop < Math.max(hdrBottom, vTop) || inBottom > vBottom) {
        try { box.scrollIntoView({ block: 'start' }); } catch (x) { box.scrollIntoView(true); }
      }
    }, 300);
  });
}

/* api = { go, homeHash, closeRouteSheet } z routera */
export function initEvents(a) {
  api = a;
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  initObFocus();
}
