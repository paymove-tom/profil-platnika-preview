/* Środowisko uruchomienia: tryb shot (?shot=1), pasek statusu, tryb demo.
   Ustawia klasy na <html> przy imporcie. */

const html = document.documentElement;

export const SHOT = html.classList.contains('is-shot') || /[?&]shot=1(&|$)/.test(location.search || '');
if (SHOT) html.classList.add('is-shot');
if (/[?&]statusbar=1(&|$)/.test(location.search || '')) html.classList.add('show-statusbar');

/* ?demo=1 ukrywa panel Stany; ?demo=0 wyłącza; trzymane w sessionStorage */
const qs = location.search || '';
let demo = /[?&]demo=1(&|$)/.test(qs);
try {
  if (demo) sessionStorage.setItem('pm-stara-demo', '1');
  else if (/[?&]demo=0(&|$)/.test(qs)) sessionStorage.removeItem('pm-stara-demo');
  else demo = sessionStorage.getItem('pm-stara-demo') === '1';
} catch (e) {}
if (demo) html.classList.add('is-demo');

export const DEMO = demo;
export const VERSION = '2.0';
