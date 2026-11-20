/* Zachowania montowane w mount(): pola kwot (suwak <-> pole), 6-cyfrowy kod, odliczanie.
   pctOf współdzielone z components.js. */
import { PM } from './pm.js';
import { SHOT } from './env.js';
import { qsa, clamp, fmtSec } from './util.js';

export function pctOf(v, min, max) { return max > min ? clamp((v - min) / (max - min) * 100, 0, 100) : 0; }

export const setAmountError = PM.setAmountError = function (root, id, msg) {
  var w = (root || document).querySelector('[data-amount="' + id + '"]');
  if (!w) return;
  var on = !!msg;
  w.classList.toggle('is-error', on);
  var r = w.querySelector('input[type="range"]'), m = w.querySelector('.money'), e = w.querySelector('[data-amount-error]');
  if (r) r.classList.toggle('is-error', on);
  if (m) m.classList.toggle('is-error', on);
  if (e) {
    e.style.display = on ? '' : 'none';
    var sp = e.querySelector('span');
    if (sp) sp.textContent = msg || '';
  }
};

export const amountValue = PM.amountValue = function (root, id) {
  var inp = (root || document).querySelector('[data-amount="' + id + '"] .money input');
  return inp ? (parseInt(String(inp.value).replace(/\D/g, ''), 10) || 0) : 0;
};

export const setAmount = PM.setAmount = function (root, id, value) {
  var w = (root || document).querySelector('[data-amount="' + id + '"]');
  if (!w) return;
  var min = +w.dataset.min, max = +w.dataset.max;
  var r = w.querySelector('input[type="range"]'), inp = w.querySelector('.money input');
  if (inp) inp.value = String(Math.round(value));
  if (r) { r.value = clamp(value, min, max); r.style.setProperty('--p', pctOf(value, min, max) + '%'); }
};

export const bindAmount = PM.bindAmount = function (root, onChange) {
  qsa(root, '[data-amount]').forEach(function (w) {
    if (w.__pmAmount) return;
    w.__pmAmount = true;
    var id = w.getAttribute('data-amount');
    var min = +w.dataset.min || 0, max = +w.dataset.max || 1000;
    var r = w.querySelector('input[type="range"]');
    var inp = w.querySelector('.money input');
    if (!r || !inp) return;
    function paint(v) { r.style.setProperty('--p', pctOf(v, min, max) + '%'); }
    function emit(v) { if (typeof onChange === 'function') onChange(id, v, w); }
    r.addEventListener('input', function () {
      var v = Number(r.value) || 0;
      inp.value = String(v);
      paint(v);
      emit(v);
    });
    inp.addEventListener('input', function () {
      var digits = String(inp.value).replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 7);
      if (inp.value !== digits) inp.value = digits;
      var v = digits === '' ? 0 : Number(digits);
      r.value = clamp(v, min, max);
      paint(v);
      emit(v);
    });
    inp.addEventListener('focus', function () { try { inp.select(); } catch (e) {} });
    inp.addEventListener('blur', function () {
      if (inp.value === '') { inp.value = String(min); r.value = min; paint(min); emit(min); }
    });
    inp.addEventListener('keydown', function (e) {
      var stepV = +w.dataset.step || 1, v = Number(inp.value) || 0;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        v = Math.max(0, v + (e.key === 'ArrowUp' ? stepV : -stepV));
        inp.value = String(v); r.value = clamp(v, min, max); paint(v); emit(v);
      }
    });
    paint(Number(inp.value) || 0);
  });
};

export const bindCode = PM.bindCode = function (root, onComplete, onChange) {
  var box = (root || document).querySelector('[data-code]');
  if (!box) return null;
  var inputs = qsa(box, 'input');
  var api = {
    el: box,
    value: function () { return inputs.map(function (i) { return i.value; }).join(''); },
    clear: function () { inputs.forEach(function (i) { i.value = ''; }); sync(); api.focus(0); },
    setError: function (on) { box.classList.toggle('is-error', !!on); if (on) box.setAttribute('aria-invalid', 'true'); else box.removeAttribute('aria-invalid'); },
    focus: function (i) { var t = inputs[i == null ? firstEmpty() : i]; if (t) t.focus({ preventScroll: true }); },
    disable: function (on) { box.classList.toggle('is-disabled', !!on); inputs.forEach(function (i) { i.disabled = !!on; }); }
  };
  function firstEmpty() {
    for (var i = 0; i < inputs.length; i++) if (!inputs[i].value) return i;
    return inputs.length - 1;
  }
  function sync() {
    inputs.forEach(function (i) { i.classList.toggle('is-filled', !!i.value); });
  }
  function changed() {
    sync();
    if (box.classList.contains('is-error')) api.setError(false);
    var code = api.value();
    if (typeof onChange === 'function') onChange(code, api);
    if (code.length === 6 && typeof onComplete === 'function') onComplete(code, api);
  }
  function fill(from, digits) {
    var i = from;
    for (var k = 0; k < digits.length && i < inputs.length; k++, i++) inputs[i].value = digits.charAt(k);
    api.focus(Math.min(i, inputs.length - 1));
    changed();
  }
  inputs.forEach(function (inp, idx) {
    inp.addEventListener('focus', function () { try { inp.select(); } catch (e) {} });
    inp.addEventListener('input', function () {
      var d = String(inp.value).replace(/\D/g, '');
      if (d.length > 1) { inp.value = ''; fill(idx, d); return; }
      inp.value = d;
      if (d && idx < inputs.length - 1) inputs[idx + 1].focus({ preventScroll: true });
      changed();
    });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace') {
        if (!inp.value && idx > 0) {
          e.preventDefault();
          inputs[idx - 1].value = '';
          inputs[idx - 1].focus({ preventScroll: true });
          changed();
        }
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault(); inputs[idx - 1].focus({ preventScroll: true });
      } else if (e.key === 'ArrowRight' && idx < inputs.length - 1) {
        e.preventDefault(); inputs[idx + 1].focus({ preventScroll: true });
      } else if (e.key.length === 1 && /\d/.test(e.key) && inp.value) {
        e.preventDefault(); inp.value = e.key;
        if (idx < inputs.length - 1) inputs[idx + 1].focus({ preventScroll: true });
        changed();
      }
    });
    inp.addEventListener('paste', function (e) {
      var t = (e.clipboardData || window.clipboardData);
      var d = t ? String(t.getData('text') || '').replace(/\D/g, '').slice(0, 6) : '';
      if (!d) return;
      e.preventDefault();
      fill(d.length === 6 ? 0 : idx, d);
    });
  });
  sync();
  return api;
};

export const countdown = PM.countdown = function (el, seconds, onDone) {
  if (!el) return;
  var left = seconds | 0;
  el.textContent = fmtSec(left);
  if (SHOT) return;
  var id = PM.every(function () {
    left -= 1;
    el.textContent = fmtSec(left);
    if (left <= 0) {
      clearInterval(id);
      if (typeof onDone === 'function') onDone();
    }
  }, 1000);
};
