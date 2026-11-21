/* Zakresy timerów i callbacków wyjścia: 'base' (ekran) i 'sheet' (warstwa sheeta).
   Rejestracja trafia do zakresu aktualnie montowanego (ustawia router). */
import { PM } from './pm.js';
import { SHOT } from './env.js';

const scopes = { base: { timers: [], leave: [] }, sheet: { timers: [], leave: [] } };
let mountScope = 'base';

export function setMountScope(name) { mountScope = name; }
export function getMountScope() { return mountScope; }

function scopeOf() { return scopes[mountScope] || scopes.base; }

export const later = PM.later = function (fn, ms) {
  if (SHOT) return 0;
  var id = setTimeout(fn, ms || 0);
  scopeOf().timers.push({ t: 'to', id: id });
  return id;
};
export const every = PM.every = function (fn, ms) {
  if (SHOT) return 0;
  var id = setInterval(fn, ms || 1000);
  scopeOf().timers.push({ t: 'iv', id: id });
  return id;
};
export const onLeave = PM.onLeave = function (fn) { if (typeof fn === 'function') scopeOf().leave.push(fn); };

export function clearScope(name) {
  var s = scopes[name];
  if (!s) return;
  var ts = s.timers; s.timers = [];
  ts.forEach(function (t) { if (t.t === 'to') clearTimeout(t.id); else clearInterval(t.id); });
  var fns = s.leave; s.leave = [];
  fns.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
}
export function clearTimers() { clearScope('sheet'); clearScope('base'); }
