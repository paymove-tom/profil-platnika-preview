/* Podstawowe helpery (escape, atrybuty, DOM query) i formatery kwot/dat.
   Bez własnego stanu; przypisuje PM.esc/attrs/qsa/fmtSec i formatery. */
import { PM } from './pm.js';

export const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
export const MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

/* ---------- podstawy ---------- */
export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export function attrs(a) {
  if (!a) return '';
  if (typeof a === 'string') return a.trim() ? ' ' + a.trim() : '';
  var out = '';
  Object.keys(a).forEach(function (k) {
    var v = a[k];
    if (v === false || v == null) return;
    out += v === true ? ' ' + k : ' ' + k + '="' + esc(String(v)) + '"';
  });
  return out;
}
export function clone(o) { return JSON.parse(JSON.stringify(o || {})); }
export function qsa(root, sel) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
export function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
export function uid(p) { return (p || 'pm') + '-' + Math.random().toString(36).slice(2, 8); }

/* usuwa z UI dopiski meta typu „Przykład”, które zostały w starszych modułach */
const META_RE = /^\s*Przykład\.?\s*$/i;
export function stripMeta(root) {
  if (!root || !document.createTreeWalker) return;
  var walker = document.createTreeWalker(root, 4, null, false);
  var hits = [], n;
  while ((n = walker.nextNode())) if (META_RE.test(n.nodeValue || '')) hits.push(n);
  hits.forEach(function (t) {
    var p = t.parentNode;
    if (!p) return;
    var single = p.nodeType === 1 && p !== root && p.childNodes.length === 1 &&
      /^(SPAN|SMALL|CODE|EM|I|B|STRONG)$/.test(p.tagName);
    if (single && p.parentNode) p.parentNode.removeChild(p);
    else p.removeChild(t);
  });
}

export function fmtSec(s) { s = Math.max(0, s | 0); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }

PM.esc = esc;
PM.attrs = attrs;
PM.qsa = qsa;
PM.fmtSec = fmtSec;

/* ---------- formatowanie ---------- */
export const zl = PM.zl = function (n) {
  var v = Number(n) || 0;
  var neg = v < 0;
  var parts = Math.abs(v).toFixed(2).split('.');
  var int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  return (neg ? '-' : '') + int + ',' + parts[1] + '\u00a0zł';
};
export const zlInt = PM.zlInt = function (n) {
  var v = Math.round(Number(n) || 0);
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0zł';
};
export const date = PM.date = function (iso) {
  if (!iso) return '';
  var p = String(iso).split('-');
  return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : String(iso);
};
export const dateLong = PM.dateLong = function (iso) {
  if (!iso) return '';
  var p = String(iso).split('-');
  if (p.length !== 3) return String(iso);
  return parseInt(p[2], 10) + ' ' + MONTHS_GEN[parseInt(p[1], 10) - 1] + ' ' + p[0];
};
export const monthLabel = PM.monthLabel = function (key) {
  var p = String(key || '').split('-');
  var m = parseInt(p[1], 10);
  return (MONTHS[m - 1] || '') + ' ' + p[0];
};
export const groupByMonth = PM.groupByMonth = function (list) {
  var sorted = (list || []).slice().sort(function (a, b) {
    var ka = (a.data || '') + ' ' + (a.godzina || ''), kb = (b.data || '') + ' ' + (b.godzina || '');
    return ka < kb ? 1 : ka > kb ? -1 : 0;
  });
  var groups = [], map = {};
  sorted.forEach(function (p) {
    var k = String(p.data || '').slice(0, 7);
    if (!map[k]) { map[k] = { key: k, label: PM.monthLabel(k), items: [] }; groups.push(map[k]); }
    map[k].items.push(p);
  });
  return groups;
};
export const initials = PM.initials = function (u) {
  u = u || (PM.state && PM.state.user) || {};
  var s = ((u.imie || '').charAt(0) + (u.nazwisko || '').charAt(0)).toUpperCase();
  return s || 'PM';
};
