/* Finalny polish (t416): typografia PL, hairline po scrollu, drag-to-dismiss sheetów,
   spring/swipe toastów, ✓ rysowany, sheen karty BLIK, kopiowanie nr transakcji, wejście pasków.
   Zakres: ekrany i sheety poza onboardingiem/loginem/zgodą (klasa .pm-polish).
   Ruch wyłączony w ?shot=1 i przy prefers-reduced-motion (reduced()). Typografia działa zawsze (statyczna). */
import { PM } from './pm.js';
import { SHOT } from './env.js';
import { reduced } from './motion.js';

const html = document.documentElement;
const FLOW = /^#\/(login|onboarding|zgoda)/;
const ZG = '[class^="zg-"],[class*=" zg-"]';
const SHEET_EXCL = '.au-in3, .au-checkout, .au-ob, ' + ZG;
const mqTouch = window.matchMedia ? window.matchMedia('(max-width:1023px)') : { matches: true };

function okScreen(s) {
  return !!s && !s.matches('.au-ob, .au-done, .au-login') && !s.matches(ZG) && !s.querySelector(ZG);
}
function okLayer(l) {
  return !!l && html.classList.contains('pm-polish-on') && !l.querySelector(SHEET_EXCL);
}

/* =====================================================================
   1. Typografia PL (idempotentnie: WeakMap węzeł → przetworzony tekst)
   ===================================================================== */
const SKIP_SEL = 'script,style,code,pre,textarea,.mono,.plate,.input--mono,.zk-c-num,.pm-copy,[data-no-typo],[contenteditable="true"]';
const WIDOW_SEL = 'p,.hint,.lead-text,.sheet-text,.empty-text,.banner-text,.legal,.pf-alert-s';
const seenText = new WeakMap();
const UNIT = '(?:zł|gr|%|h|min|dni|osoby|os\\.)(?![a-ząćęłńóśźż])';
const RE_QUOTE = /"([^"\n]{1,200})"/g;
const RE_DASH = / - /g;
const RE_RANGE = new RegExp('(\\d)-(\\d+)(?=\\s?' + UNIT + ')', 'g');
const RE_UNIT = new RegExp('(\\d) (?=' + UNIT + ')', 'g');
const RE_THOUS = /(\d) (?=\d{3}(?!\d))/g;
let RE_SINGLE;
try { RE_SINGLE = new RegExp('(?<=^|[\\s\\u00a0(„])[aiouwzAIOUWZ] (?=\\S)', 'g'); }
catch (e) { RE_SINGLE = /(?:^|[\s\u00a0(„])[aiouwzAIOUWZ] (?=\S)/g; }

function fixText(s) {
  let t = s;
  if (t.indexOf('"') !== -1) t = t.replace(RE_QUOTE, '„$1”');
  if (t.indexOf(' - ') !== -1) t = t.replace(RE_DASH, '\u00a0– ');
  return t
    .replace(RE_RANGE, '$1–$2')
    .replace(RE_SINGLE, function (m) { return m.slice(0, -1) + '\u00a0'; })
    .replace(RE_UNIT, '$1\u00a0')
    .replace(RE_THOUS, '$1\u00a0');
}

function widow(el) {
  const txt = el.textContent || '';
  if (el.__pmWidow === txt) return;
  if (txt.length < 28 || el.closest(SKIP_SEL)) { el.__pmWidow = txt; return; }
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  let last = null, n;
  while ((n = w.nextNode())) if (/\S/.test(n.nodeValue)) last = n;
  if (last && last.parentElement && !last.parentElement.closest(SKIP_SEL)) {
    const v = last.nodeValue;
    const m = v.match(/ (\S{1,10})(\s*)$/);
    if (m) {
      const before = v.slice(0, m.index);
      const prev = (before.match(/(\S+)$/) || ['', ''])[1];
      if (prev && prev.length + m[1].length <= 22) {
        last.nodeValue = before + '\u00a0' + m[1] + m[2];
        seenText.set(last, last.nodeValue);
      }
    }
  }
  el.__pmWidow = el.textContent;
}

function typo(root) {
  /* t423: typografia zamrożona 1:1 z e2bf5c3 – bez twardych spacji, cudzysłowów i półpauz. */
  return;
  if (!root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n;
  while ((n = w.nextNode())) {
    const v = n.nodeValue;
    if (!v || v.length < 3 || seenText.get(n) === v) continue;
    const p = n.parentElement;
    if (!p || p.closest(SKIP_SEL)) { seenText.set(n, v); continue; }
    let t = fixText(v);
    const nx = n.nextSibling;
    if (nx && nx.nodeType === 1 && nx.tagName === 'A' && / $/.test(t) && (nx.textContent || '').length <= 24) {
      t = t.slice(0, -1) + '\u00a0';
    }
    if (t !== v) n.nodeValue = t;
    seenText.set(n, t);
  }
  root.querySelectorAll(WIDOW_SEL).forEach(widow);
}

/* =====================================================================
   2. Hairline nagłówka / CTA zależny od przewinięcia .content
   ===================================================================== */
function updScroll(c) {
  const s = c && c.parentElement;
  if (!s || !s.classList.contains('pm-polish')) return;
  const st = c.scrollTop;
  s.classList.toggle('is-scrolled', st > 1);
  s.classList.toggle('has-more', c.scrollHeight - c.clientHeight - st > 1);
}
let scrollRaf = 0, scrollEl = null;
document.addEventListener('scroll', function (e) {
  const t = e.target;
  if (!t || !t.classList || !t.classList.contains('content')) return;
  scrollEl = t;
  if (!scrollRaf) scrollRaf = requestAnimationFrame(function () { scrollRaf = 0; updScroll(scrollEl); });
}, { capture: true, passive: true });

/* =====================================================================
   3. Kopiowanie nr transakcji (dd.mono w .kv → wewnętrzny button, dt/dd bez zmian ról)
   ===================================================================== */
function markCopy(root) {
  root.querySelectorAll('.kv dd.mono').forEach(function (dd) {
    if (dd.querySelector('.pm-copy')) return;
    const v = (dd.textContent || '').trim();
    if (!v || dd.children.length) return;
    const dt = dd.previousElementSibling;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pm-copy';
    b.textContent = v;
    b.setAttribute('data-pm-copy', v);
    b.setAttribute('aria-label', (dt ? dt.textContent.trim() : 'Numer') + ' ' + v + '. Skopiuj');
    dd.textContent = '';
    dd.appendChild(b);
  });
}
function copyValue(el) {
  const v = el.getAttribute('data-pm-copy') || '';
  function ok() {
    el.classList.add('is-copied');
    if (PM.haptic) PM.haptic(8);
    PM.toast('Skopiowano numer');
    clearTimeout(el.__pmCopyT);
    el.__pmCopyT = setTimeout(function () { el.classList.remove('is-copied'); }, 1500);
  }
  function fallback() {
    try {
      const ta = document.createElement('textarea');
      ta.value = v;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
      document.body.appendChild(ta);
      ta.select();
      const r = document.execCommand('copy');
      ta.remove();
      if (r) ok();
    } catch (e) {}
  }
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(v).then(ok, fallback);
  else fallback();
}
document.addEventListener('click', function (e) {
  const b = e.target && e.target.closest ? e.target.closest('.pm-copy') : null;
  if (b) { e.preventDefault(); copyValue(b); }
});

/* =====================================================================
   4. Sheety: drag-to-dismiss (touch events: działają razem z natywnym scrollem iOS)
   ===================================================================== */
function bindDrag(l) {
  const sheet = l.querySelector('.sheet');
  const scrim = l.querySelector('.scrim');
  if (!sheet || sheet.querySelector('iframe')) return;
  let armed = false, drag = false, y0 = 0, ly = 0, lt = 0, v = 0, dy = 0, H = 0;

  function running() {
    try { return sheet.getAnimations().some(function (a) { return a.playState === 'running'; }); } catch (e) { return false; }
  }
  function scrollable() { return sheet.scrollHeight > sheet.clientHeight + 1; }
  function set(y) {
    dy = y;
    sheet.style.transform = y ? 'translate3d(0,' + y.toFixed(1) + 'px,0)' : '';
    if (scrim) scrim.style.opacity = y > 0 ? String(Math.max(0, 1 - y / (H + 40))) : '';
  }
  function back() {
    sheet.style.transition = 'transform 340ms cubic-bezier(.32,.72,0,1)';
    if (scrim) scrim.style.transition = 'opacity 240ms ease';
    set(0);
    setTimeout(function () { sheet.style.transition = ''; if (scrim) scrim.style.transition = ''; }, 360);
  }
  function dismiss() {
    const base = l.getAttribute('data-route-sheet');
    const dyn = l.hasAttribute('data-dynamic-sheet');
    if (!base && !dyn) { back(); return; }
    l.setAttribute('inert', '');
    l.style.pointerEvents = 'none';
    if (PM.haptic) PM.haptic(8);
    function finish() { if (!l.isConnected) return; l.remove(); if (base) PM.go(base); }
    if (reduced()) { finish(); return; }
    const remain = H + 40 - dy;
    const ms = Math.round(Math.max(140, Math.min(280, remain / Math.max(v, 1.4))));
    sheet.style.transition = 'transform ' + ms + 'ms cubic-bezier(.2,.6,.35,1)';
    if (scrim) scrim.style.transition = 'opacity ' + ms + 'ms ease-out';
    sheet.style.transform = 'translate3d(0,' + (H + 40) + 'px,0)';
    if (scrim) scrim.style.opacity = '0';
    setTimeout(finish, ms + 20);
  }

  sheet.addEventListener('touchstart', function (e) {
    armed = drag = false;
    if (e.touches.length !== 1 || !mqTouch.matches || l.classList.contains('is-closing') || l.hasAttribute('inert')) return;
    const tg = e.target;
    if (tg && tg.closest && tg.closest('input,textarea,select,.range,.money,.code-input,iframe')) return;
    if (sheet.scrollTop > 0 || running()) return;
    armed = true;
    y0 = ly = e.touches[0].clientY;
    lt = performance.now();
    v = 0; dy = 0;
  }, { passive: true });

  sheet.addEventListener('touchmove', function (e) {
    if (!armed) return;
    const y = e.touches[0].clientY, d = y - y0, now = performance.now();
    if (!drag) {
      if (d < 0 && scrollable()) { armed = false; return; }   /* w górę: natywny scroll */
      if (e.cancelable) e.preventDefault();
      if (Math.abs(d) < 4) return;
      drag = true;
      H = sheet.offsetHeight;
      sheet.style.transition = 'none';
      if (scrim) scrim.style.transition = 'none';
    }
    if (e.cancelable) e.preventDefault();
    v = (y - ly) / Math.max(1, now - lt);
    ly = y; lt = now;
    set(d > 0 ? d : -Math.min(36, Math.sqrt(-d) * 3));       /* rubber band w górę */
  }, { passive: false });

  function end() {
    if (!drag) { armed = false; return; }
    drag = armed = false;
    if (dy > 0 && (dy > H * 0.25 || (v > 0.5 && dy > 16))) dismiss();
    else back();
  }
  sheet.addEventListener('touchend', end);
  sheet.addEventListener('touchcancel', end);
}

function onLayer(l) {
  if (!l || l.__pmL || l.classList.contains('is-closing')) return;
  l.__pmL = 1;
  if (!okLayer(l)) return;
  l.classList.add('pm-polish');
  typo(l);
  markCopy(l);
  bindDrag(l);
}

/* =====================================================================
   5. Toasty: ✓ rysowany, swipe w górę
   ===================================================================== */
const CHECK_SVG = '<svg class="pm-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.25"/><path d="M8 12.3l2.7 2.7L16.2 9.5"/></svg>';

function bindToastSwipe(t) {
  let y0 = 0, ly = 0, lt = 0, v = 0, dy = 0, on = false;
  t.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    on = true; dy = 0; v = 0;
    y0 = ly = e.touches[0].clientY;
    lt = performance.now();
    t.style.transition = 'none';
  }, { passive: true });
  t.addEventListener('touchmove', function (e) {
    if (!on) return;
    if (e.cancelable) e.preventDefault();
    const y = e.touches[0].clientY, now = performance.now(), d = y - y0;
    v = (y - ly) / Math.max(1, now - lt);
    ly = y; lt = now;
    dy = d < 0 ? d : Math.min(12, Math.sqrt(d) * 1.6);
    t.style.transform = 'translate3d(0,' + dy.toFixed(1) + 'px,0)';
    t.style.opacity = d < 0 ? String(Math.max(0, 1 + d / 90)) : '';
  }, { passive: false });
  function end() {
    if (!on) return;
    on = false;
    if (dy < -24 || v < -0.4) {
      t.style.transition = 'transform 180ms cubic-bezier(.3,0,.8,.15), opacity 180ms linear';
      t.style.transform = 'translate3d(0,-72px,0)';
      t.style.opacity = '0';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 200);
    } else {
      t.style.transition = 'transform 420ms cubic-bezier(.34,1.56,.64,1), opacity 200ms ease';
      t.style.transform = '';
      t.style.opacity = '';
    }
  }
  t.addEventListener('touchend', end);
  t.addEventListener('touchcancel', end);
}

function onToast(t) {
  if (!t || t.__pmT || !html.classList.contains('pm-polish-on')) return;
  t.__pmT = 1;
  if (!reduced()) {
    const img = t.querySelector('img.ico[src*="bold-tick-circle"]');
    if (img) img.outerHTML = CHECK_SVG;
  }
  typo(t);
  bindToastSwipe(t);
}

/* =====================================================================
   6. Jednorazowe efekty wejścia: sheen karty BLIK, wzrost pasków postępu
   ===================================================================== */
const visited = {};
function enter(scr, path) {
  if (visited[path]) return;
  visited[path] = true;
  if (reduced()) return;
  if (scr.querySelector('.progress>i, .bar i')) {
    scr.classList.add('pm-enter');
    setTimeout(function () { scr.classList.remove('pm-enter'); }, 1000);
  }
}
function sheen() {
  if (reduced()) return;
  const card = document.querySelector('.view .pf-blik:not(.pf-blik--off)');
  if (!card || card.querySelector('.pm-sheen')) return;
  try { if (sessionStorage.getItem('pm-sheen')) return; sessionStorage.setItem('pm-sheen', '1'); } catch (e) {}
  const s = document.createElement('span');
  s.className = 'pm-sheen';
  s.setAttribute('aria-hidden', 'true');
  card.appendChild(s);
  setTimeout(function () { s.remove(); }, 1800);
}

/* =====================================================================
   7. Obserwatory (sheety dynamiczne, toasty) i obsługa pm:render
   ===================================================================== */
let mo = null;
function ensureObservers() {
  if (mo || typeof MutationObserver !== 'function') return;
  const dev = document.querySelector('.device');
  if (!dev) return;
  mo = new MutationObserver(function (recs) {
    for (let i = 0; i < recs.length; i++) {
      const added = recs[i].addedNodes;
      for (let j = 0; j < added.length; j++) {
        const n = added[j];
        if (n.nodeType !== 1) continue;
        if (n.classList.contains('sheet-layer')) onLayer(n);
        else if (n.classList.contains('toast')) onToast(n);
      }
    }
  });
  mo.observe(dev, { childList: true });
  const tw = dev.querySelector(':scope > .toast-wrap');
  if (tw) mo.observe(tw, { childList: true });
  else mo.observe(dev, { childList: true, subtree: true });
}

function onRender(e) {
  ensureObservers();
  const path = (e && e.detail && e.detail.path) || String(location.hash || '').split('?')[0];
  const scr = document.querySelector('.view > .screen');
  const ok = !FLOW.test(path) && okScreen(scr);
  html.classList.toggle('pm-polish-on', ok);
  if (scr && ok) {
    scr.classList.add('pm-polish');
    typo(scr);
    markCopy(scr);
    enter(scr, path);
    if (path === '#/portfel') sheen();
    const c = scr.querySelector(':scope > .content');
    if (c && !SHOT) requestAnimationFrame(function () { updScroll(c); });
  }
  document.querySelectorAll('.device > .sheet-layer').forEach(onLayer);
}

document.addEventListener('pm:render', onRender);
/* niezależnie od kolejności ładowania: jeśli pierwszy render już był */
if (html.hasAttribute('data-pm-ready')) onRender(null);
