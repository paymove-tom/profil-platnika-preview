/* Stan aplikacji (kopia DATA), wyszukiwanie botów/zakupów i stałe domenowe.
   Ustawia PM.state, PM.version, PM.shot, PM.demo. */
import { DATA as SRC } from '../data.js';
import { PM } from './pm.js';
import { SHOT, DEMO, VERSION } from './env.js';
import { clone } from './util.js';

export const DATA = SRC || {};

PM.shot = SHOT;
PM.demo = DEMO;
PM.version = VERSION;

export const LOGO_INK = 'assets/logos/logo_paymove_ink.svg';
export const TABS = [
  { id: 'portfel', label: 'Portfel', icon: 'bold-card-1', href: '#/portfel' },
  { id: 'dane', label: 'Dane', icon: 'user-3-line', href: '#/dane' },
  { id: 'historia', label: 'Historia', icon: 'history-line', href: '#/historia' },
  { id: 'boty', label: 'Boty', icon: 'robot-2-line', href: '#/boty' },
  { id: 'limity', label: 'Limity', icon: 'equalizer-line', href: '#/limity' }
];
export const BOT_LOGOS = {
  claude: 'assets/logos/claude-color.svg',
  chatgpt: 'assets/logos/openai.svg',
  grok: 'assets/logos/grok.svg',
  perplexity: 'assets/logos/perplexity-color.svg'
};
export const BOT_NAMES = { claude: 'Claude', chatgpt: 'ChatGPT', grok: 'Grok', perplexity: 'Perplexity' };
export const STATUS = {
  'zaplacono': { label: 'Zapłacono', cls: 'ok', color: 'var(--ok)' },
  'w-toku': { label: 'W toku', cls: 'pending', color: 'var(--warn)' },
  'nieudana': { label: 'Nieudana', cls: 'fail', color: 'var(--err)' },
  'anulowano': { label: 'Anulowano', cls: 'cancel', color: 'var(--off)' },
  'zwrot-w-toku': { label: 'Zwrot w toku', cls: 'refund', color: 'var(--accent)' },
  'zwrocono': { label: 'Zwrócono', cls: 'refund', color: 'var(--accent)' }
};
export const TYPES = {
  bilet: { label: 'Bilet', icon: 'ticket-2-line' },
  parking: { label: 'Parking', icon: 'parking-box-line' },
  usluga: { label: 'Usługa', icon: 'customer-service-2-line' }
};

/* ---------- stan ---------- */
PM.state = clone(DATA);
export const resetState = PM.resetState = function () {
  PM.state = clone(DATA);
  return PM.state;
};
PM.today = (DATA.meta && DATA.meta.dzis) || '2026-11-15';

export const bot = PM.bot = function (id) {
  var list = (PM.state && PM.state.boty) || [];
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
};
export const botName = PM.botName = function (id) {
  var b = PM.bot(id);
  return b ? b.nazwa : (BOT_NAMES[id] || id || '');
};
export const purchase = PM.purchase = function (id) {
  var list = (PM.state && PM.state.zakupy) || [];
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
};
export const purchaseByStatus = PM.purchaseByStatus = function (status) {
  var map = (PM.state && PM.state.przyklady) || {};
  var p = map[status] ? PM.purchase(map[status]) : null;
  if (p) return p;
  var list = (PM.state && PM.state.zakupy) || [];
  for (var i = 0; i < list.length; i++) if (list[i].status === status) return list[i];
  return list[0] || null;
};
export const canRefund = PM.canRefund = function (p) {
  return !!(p && p.status === 'zaplacono' && p.terminZwrotu && p.terminZwrotu >= PM.today);
};
export const typeLabel = PM.typeLabel = function (t) { return (TYPES[t] || { label: t || '' }).label; };
export const typeIcon = PM.typeIcon = function (t) { return (TYPES[t] || { icon: 'inbox-line' }).icon; };
PM.STATUS = STATUS;
PM.TYPES = TYPES;
