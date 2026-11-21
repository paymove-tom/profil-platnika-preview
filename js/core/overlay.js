/* Warstwy nad ekranem: dynamiczny sheet (PM.openSheet/closeSheet) i toasty.
   Korzysta z els.device / els.toasts z shell.js. */
import { PM } from './pm.js';
import { SHOT } from './env.js';
import { esc, qsa, stripMeta } from './util.js';
import { els } from './shell.js';

export const openSheet = PM.openSheet = function (o) {
  if (!els.device) return null;
  PM.closeSheet(true);
  var wrap = document.createElement('div');
  wrap.innerHTML = PM.sheet(o);
  var layer = wrap.firstChild;
  layer.setAttribute('data-dynamic-sheet', '');
  els.device.insertBefore(layer, els.toasts);
  if (o && typeof o.mount === 'function') o.mount(layer);
  stripMeta(layer);
  return layer;
};
export const closeSheet = PM.closeSheet = function (silent) {
  if (!els.device) return;
  qsa(els.device, '.sheet-layer[data-dynamic-sheet]').forEach(function (l) {
    if (silent || SHOT || (PM.reducedMotion && PM.reducedMotion())) l.remove(); else dismissLayer(l);
  });
};
/* animowane zdjęcie warstwy sheeta (wyjazd w dół + wygaszenie scrimu), potem usunięcie z DOM */
export const dismissLayer = PM.dismissLayer = function (l) {
  if (!l || l.classList.contains('is-closing')) return;
  l.classList.add('is-closing');
  l.removeAttribute('data-route-sheet');
  l.removeAttribute('data-dynamic-sheet');
  l.setAttribute('aria-hidden', 'true');
  l.setAttribute('inert', '');
  setTimeout(function () { l.remove(); }, 240);
};

/* ---------- toast ---------- */
export const toast = PM.toast = function (msg, o) {
  o = o || {};
  if (!els.toasts) return null;
  var t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  var icon = o.icon === undefined ? 'bold-tick-circle' : o.icon;
  t.innerHTML = (icon ? PM.icon(icon, 20) : '') + '<span>' + esc(msg) + '</span>';
  while (els.toasts.children.length >= 2) els.toasts.removeChild(els.toasts.firstChild);
  els.toasts.appendChild(t);
  if (!SHOT) {
    setTimeout(function () {
      t.classList.add('is-leaving');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 240);
    }, o.duration || 2400);
  }
  return t;
};
