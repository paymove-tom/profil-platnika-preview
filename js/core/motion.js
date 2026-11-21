/* Ruch i mikrointerakcje (feedback t406/t409, research: feedback-t406/research.md):
   - przejścia ekranów: View Transitions API (fallback: Web Animations API), tylko .view, tab bar statyczny,
     zakładki = crossfade 180 ms z lekkim przesunięciem, w głąb = wjazd z prawej (iOS), powrót odwrotnie;
   - :active na iOS (pusty touchstart), haptyka tam, gdzie jest Vibration API (Android; iOS Safari jej nie ma);
   - licznik kwot przy pierwszym wejściu na ekran.
   Wszystko wyłączone w ?shot=1 i przy prefers-reduced-motion. */
import { PM } from './pm.js';
import { SHOT } from './env.js';

const html = document.documentElement;
const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
export function reduced() { return SHOT || !!(mq && mq.matches); }
PM.reducedMotion = reduced;

/* ---------- przejścia między ekranami ---------- */
let vt = null;
function swallow() {}
export function runTransition(kind, update) {
  if (!kind || reduced()) { update(); return; }
  if (vt) { try { vt.skipTransition(); } catch (e) {} }
  if (typeof document.startViewTransition === 'function') {
    html.setAttribute('data-nav', kind);
    let t = null;
    try { t = document.startViewTransition(update); } catch (e) { t = null; }
    if (t) {
      vt = t;
      /* skipTransition / przerwanie odrzuca ready ("Transition was skipped"): to nie jest błąd */
      if (t.ready && t.ready.catch) t.ready.catch(swallow);
      if (t.updateCallbackDone && t.updateCallbackDone.catch) t.updateCallbackDone.catch(function (err) { console.error('[PM] transition update', err); });
      const done = function () { if (vt === t) { vt = null; html.removeAttribute('data-nav'); } };
      if (t.finished) t.finished.then(done, done); else done();
      return;
    }
    html.removeAttribute('data-nav');
  }
  update();
  fallbackAnim(kind);
}

/* fallback (iOS 17 bez VT): tylko transform, bez opacity na .screen (zero migania) */
function fallbackAnim(kind) {
  const el = document.querySelector('.view > .screen');
  if (!el || typeof el.animate !== 'function') return;
  const frames = kind === 'tab'
    ? [{ transform: 'translateY(6px)' }, { transform: 'none' }]
    : [{ transform: 'translateX(' + (kind === 'back' ? '-' : '') + '24px)' }, { transform: 'none' }];
  el.animate(frames, { duration: kind === 'tab' ? 200 : 300, easing: 'cubic-bezier(.05,.7,.1,1)' });
}

/* ---------- :active na iOS, haptyka ---------- */
document.addEventListener('touchstart', function () {}, { passive: true });

function haptic(ms) {
  if (reduced() || typeof navigator.vibrate !== 'function') return;
  try { navigator.vibrate(ms); } catch (e) {}
}
PM.haptic = haptic;
document.addEventListener('click', function (e) {
  const t = e.target && e.target.closest ? e.target.closest('[data-tab], .btn--primary, .pf-tile, .pf-blik') : null;
  if (t) haptic(8);
}, true);

/* ---------- licznik kwot (pierwsze wejście na ekran w sesji) ---------- */
const counted = {};
function parseZl(txt) {
  const m = String(txt).replace(/[\u00a0\u202f ]/g, '').match(/^(-?)(\d+)(?:,(\d{2}))?zł$/);
  if (!m) return null;
  return { sign: m[1], val: parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 100 : 0), dec: !!m[3] };
}
function fmt(v, dec, sign) {
  const fixed = dec ? v.toFixed(2) : String(Math.round(v));
  const parts = fixed.split('.');
  const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  return sign + int + (dec ? ',' + parts[1] : '') + '\u00a0zł';
}
function countUp(el) {
  const p = parseZl(el.textContent);
  if (!p || p.val <= 0) return;
  const final = el.textContent, t0 = performance.now(), D = 640;
  el.style.fontVariantNumeric = 'tabular-nums';
  function step(now) {
    if (!el.isConnected) return;
    const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
    el.textContent = k < 1 ? fmt(p.val * e, p.dec, p.sign) : final;
    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
document.addEventListener('pm:render', function (e) {
  if (reduced()) return;
  const path = e.detail && e.detail.path;
  if (!path || counted[path]) return;
  counted[path] = true;
  document.querySelectorAll('.view .big-amount, .view .sum-val:not([data-sum]), .view .pm-count').forEach(countUp);
});
