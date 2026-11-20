/* =====================================================================
   Profil płatnika Paymove · prototyp · js/core.js
   Zero zależności, bez modułów ES, bez fetch, działa z file://.

   ---------------------------------------------------------------------
   API (window.PM)
   ---------------------------------------------------------------------
   Router
     PM.route(hash, def)        rejestruje stan. def:
        title     tytuł dokumentu i paska makiety
        group     sekcja w panelu Stany (kolejność = kolejność rejestracji)
        label     nazwa w panelu Stany (domyślnie title)
        tab       'dane' | 'historia' | 'boty' | 'limity' | null (bez tab bara)
        render(ctx) => string HTML
                  a) pełny ekran: '<section class="screen">...</section>'
                     (najprościej przez PM.screen({...}))
                  b) sama treść: core owinie ją w PM.screen({content})
                  dla sheet:true render zwraca WNĘTRZE sheetu (core owija
                  w PM.sheet) albo gotowe '<div class="sheet-layer">'
        mount(root, ctx)  opcjonalnie, po wstawieniu do DOM.
                  root = div.device (ekran + sheet + toasty)
        sheet:true + base:'#/...'  rysuje ekran base, a nad nim sheet
        toast:'Zapisano'           toast pokazywany po renderze stanu
        back:'#/...'               przy auto owijaniu: przycisk wstecz w nagłówku
     PM.go(hash, {replace})     nawigacja; ten sam hash = ponowny render
     PM.current()               { hash, path, query, def }
     ctx = { hash, path, query, params, state, shot, def, isBase, el }
       hash z parametrami: '#/zakup/zaplacono?id=z-2611-zoo' (ctx.query.id)
     Nieznany hash => '#/dane', pusty => '#/login'. Brak stanu => ekran zastępczy.
     window.PM_STATES = [{ hash, group, label, title, tab }] w kolejności rejestracji.

   Stan
     PM.state         mutowalna kopia PM_DATA
     PM.resetState()  przywraca PM_DATA
     PM.bot(id), PM.purchase(id), PM.purchaseByStatus(status), PM.canRefund(p)
     PM.shot          true w trybie ?shot=1 (bez animacji, bez panelu, statycznie)

   Helpery HTML (zwracają string)
     PM.icon(nazwa, size?, cls?)           <img class="ico"> z assets/icons
     PM.botLogo(id, size?)                 biały kafelek .tile z prawdziwym logo
     PM.header({ back?, title?, tag? })    nagłówek z logo Paymove + "Przykład"
     PM.screen({ title, back, cls, content, contentCls, cta, header })
     PM.actions({ back, primary, secondary, legal })   wnętrze .cta-bar
     PM.btn(label, { variant, href, attrs, icon, iconRight, block, sm, loading, disabled, type, cls })
     PM.statusBadge(status), PM.statusInline(status), PM.statusLabel(status)
     PM.purchaseRow(p, { card=true, refund=false, href })
     PM.purchaseTimeline(p)
     PM.botRow(b|id, { href, wydal })
     PM.field({ id, label, value, placeholder, type, error, hint, mono, attrs, autofocus })
     PM.amountField({ id, label, value, min, max, step, error, hint, bot, divide, bare, disabled })
     PM.codeInput({ value, error, disabled, focusIndex })
     PM.toggle(id, on, { label, labelledby, target, disabled })
     PM.seg(items, active, attrs)          items: ['a'] lub [{ value, label, href }]
     PM.emptyState({ icon, title, text, cta: { label, href, variant } })
     PM.banner({ type, icon, title, text })
     PM.kv([{ k, v, mono, html }])
     PM.sheet({ body, cls, label })        sheet bez X i bez grabbera
     PM.spinner(cls?)

   Zachowania (wywołuj w mount)
     PM.bindAmount(root, onChange(id, value, wrap))   suwak <-> pole kwoty
     PM.setAmountError(root, id, msg|null)
     PM.bindCode(root, onComplete(code, api), onChange?)  6 pól kodu
     PM.countdown(el, sekundy, onDone)     w trybie shot statycznie
     PM.later(fn, ms), PM.every(fn, ms), PM.onLeave(fn)  czyszczone przy zmianie stanu,
                                           w trybie shot later/every nie startują
     PM.openSheet({ body }), PM.closeSheet()
     PM.toast(msg, { icon, duration })    w trybie shot zostaje na ekranie
     PM.css(cssString)                    moduł dokleja własny CSS (raz)
     PM.esc(s), PM.zl(n) => "86,00 zł", PM.zlInt(n) => "500 zł",
     PM.date('2026-11-12') => "12.11.2026", PM.dateLong(..) => "12 listopada 2026",
     PM.monthLabel('2026-11') => "Listopad 2026", PM.groupByMonth(lista)

   Delegacja (globalnie, działa od razu)
     [data-go="#/..."]            klik => PM.go
     [data-back]                  klik => history.back (lub data-back="#/...")
     [data-toast="tekst"]         klik => PM.toast
     .toggle[role=switch]         klik przełącza aria-checked, data-target
                                  wyszarza cel; zdarzenie 'pm:toggle' {id,on}
     .seg .seg-item (button)      klik ustawia aktywny; zdarzenie 'pm:seg' {value,seg}
     .scrim                       klik zamyka sheet (stan sheet => base)
   Po każdym renderze: document 'pm:render' {hash}, html[data-pm-ready=hash].

   ---------------------------------------------------------------------
   Przykład rejestracji stanu z modułu (np. js/s-dane.js)
   ---------------------------------------------------------------------
   PM.route('#/dane/adres', {
     title: 'Adres', group: '2 Moje dane', label: 'Edycja adresu', tab: 'dane',
     render: function (ctx) {
       var a = ctx.state.adres;
       return PM.screen({
         title: 'Adres',
         content:
           PM.field({ id: 'ulica', label: 'Ulica i numer', value: a.ulica }) +
           '<div class="input-row">' +
             PM.field({ id: 'kod', label: 'Kod', value: a.kod, attrs: { inputmode: 'numeric' } }) +
             PM.field({ id: 'miasto', label: 'Miasto', value: a.miasto }) +
           '</div>',
         cta: PM.actions({ back: '#/dane', primary: { label: 'Zapisz', attrs: { 'data-save': '' } } })
       });
     },
     mount: function (root, ctx) {
       root.querySelector('[data-save]').addEventListener('click', function () {
         ctx.state.adres.ulica = root.querySelector('#ulica').value;
         PM.go('#/dane/zapisano');
       });
     }
   });

   PM.route('#/dane/numer-usun', {
     title: 'Usuń numer', group: '2 Moje dane', tab: 'dane', sheet: true, base: '#/dane',
     render: function () {
       return '<div class="sheet-head"><h2 class="h-sheet">Usunąć GD 9876B?</h2></div>' +
         '<div class="sheet-actions">' + PM.btn('Usuń', { variant: 'danger-solid' }) +
         PM.btn('Anuluj', { variant: 'ghost', href: '#/dane' }) + '</div>';
     }
   });
   ===================================================================== */
(function () {
  'use strict';

  var DATA = window.PM_DATA || {};
  var PM = window.PM = window.PM || {};
  var STATES = window.PM_STATES = window.PM_STATES || [];
  var routes = {};
  var els = {};
  var scopes = { base: { timers: [], leave: [] }, sheet: { timers: [], leave: [] } };
  var mountScope = 'base';
  var started = false;
  var ready = false;
  var statesDirty = true;
  var cur = { hash: '', path: '', query: {}, def: null };
  var cssAdded = {};

  var html = document.documentElement;
  var SHOT = html.classList.contains('is-shot') || /[?&]shot=1(&|$)/.test(location.search || '');
  if (SHOT) html.classList.add('is-shot');
  if (/[?&]statusbar=1(&|$)/.test(location.search || '')) html.classList.add('show-statusbar');
  PM.shot = SHOT;
  /* ?demo=1 ukrywa panel Stany; ?demo=0 wyłącza; trzymane w sessionStorage */
  var qs = location.search || '';
  var DEMO = /[?&]demo=1(&|$)/.test(qs);
  try {
    if (DEMO) sessionStorage.setItem('pm-demo', '1');
    else if (/[?&]demo=0(&|$)/.test(qs)) sessionStorage.removeItem('pm-demo');
    else DEMO = sessionStorage.getItem('pm-demo') === '1';
  } catch (e) {}
  if (DEMO) html.classList.add('is-demo');
  PM.demo = DEMO;
  PM.version = '2.0';

  var LOGO_INK = 'assets/logos/logo_paymove_ink.svg';
  var TABS = [
    { id: 'portfel', label: 'Portfel', icon: 'bold-card-1', href: '#/portfel' },
    { id: 'dane', label: 'Dane', icon: 'user-3-line', href: '#/dane' },
    { id: 'historia', label: 'Historia', icon: 'history-line', href: '#/historia' },
    { id: 'boty', label: 'Boty', icon: 'robot-2-line', href: '#/boty' },
    { id: 'limity', label: 'Limity', icon: 'equalizer-line', href: '#/limity' }
  ];
  var BOT_LOGOS = {
    claude: 'assets/logos/claude-color.svg',
    chatgpt: 'assets/logos/openai.svg',
    grok: 'assets/logos/grok.svg',
    perplexity: 'assets/logos/perplexity-color.svg'
  };
  var BOT_NAMES = { claude: 'Claude', chatgpt: 'ChatGPT', grok: 'Grok', perplexity: 'Perplexity' };
  var STATUS = {
    'zaplacono': { label: 'Zapłacono', cls: 'ok', color: 'var(--ok)' },
    'w-toku': { label: 'W toku', cls: 'pending', color: 'var(--warn)' },
    'nieudana': { label: 'Nieudana', cls: 'fail', color: 'var(--err)' },
    'anulowano': { label: 'Anulowano', cls: 'cancel', color: 'var(--off)' },
    'zwrot-w-toku': { label: 'Zwrot w toku', cls: 'refund', color: 'var(--accent)' },
    'zwrocono': { label: 'Zwrócono', cls: 'refund', color: 'var(--accent)' }
  };
  var TYPES = {
    bilet: { label: 'Bilet', icon: 'ticket-2-line' },
    parking: { label: 'Parking', icon: 'parking-box-line' },
    usluga: { label: 'Usługa', icon: 'customer-service-2-line' }
  };
  var MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  var MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

  /* ---------- podstawy ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function attrs(a) {
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
  function clone(o) { return JSON.parse(JSON.stringify(o || {})); }
  function qsa(root, sel) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
  function uid(p) { return (p || 'pm') + '-' + Math.random().toString(36).slice(2, 8); }

  /* usuwa z UI dopiski meta typu „Przykład”, które zostały w starszych modułach */
  var META_RE = /^\s*Przykład\.?\s*$/i;
  function stripMeta(root) {
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

  PM.esc = esc;
  PM.attrs = attrs;
  PM.qsa = qsa;

  PM.css = function (str) {
    if (!str) return;
    var key = String(str).length + ':' + String(str).slice(0, 80);
    if (cssAdded[key] === str) return;
    cssAdded[key] = str;
    var st = document.createElement('style');
    st.setAttribute('data-pm-css', '');
    st.textContent = str;
    document.head.appendChild(st);
  };

  /* drobne reguły shellu, bez zmiany stylu bazowego */
  PM.css(
    '@media (min-width:520px){.hdr .ex-tag{display:none}}' +
    '@media (min-width:1024px){.app.no-nav .sidenav{display:none}.app.no-nav .stage{padding-left:24px}}' +
    '.mockbar-hash{margin-left:8px;opacity:.7}' +
    'a.card{text-decoration:none;color:inherit;display:block}' +
    'a.card.bot{display:flex}' +
    'a.card:hover{background:var(--card-hover)}' +
    '.row .by{margin-top:2px}' +
    /* lockup marki w sidenav: logo 20px, linia bazowa wordmarku ok. 4.9px nad dołem obrazka */
    '.sidenav-brand{display:flex;align-items:baseline;gap:6px}' +
    '.sidenav-brand .sidenav-logo{display:block;height:20px;width:auto;flex:none}' +
    '.sidenav-brand .wallet-word{margin:0;font:500 15px/1 var(--sans);letter-spacing:-.01em;color:var(--ts);transform:translateY(-4.9px)}'
  );

  /* ---------- formatowanie ---------- */
  PM.zl = function (n) {
    var v = Number(n) || 0;
    var neg = v < 0;
    var parts = Math.abs(v).toFixed(2).split('.');
    var int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
    return (neg ? '-' : '') + int + ',' + parts[1] + '\u00a0zł';
  };
  PM.zlInt = function (n) {
    var v = Math.round(Number(n) || 0);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0zł';
  };
  PM.date = function (iso) {
    if (!iso) return '';
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : String(iso);
  };
  PM.dateLong = function (iso) {
    if (!iso) return '';
    var p = String(iso).split('-');
    if (p.length !== 3) return String(iso);
    return parseInt(p[2], 10) + ' ' + MONTHS_GEN[parseInt(p[1], 10) - 1] + ' ' + p[0];
  };
  PM.monthLabel = function (key) {
    var p = String(key || '').split('-');
    var m = parseInt(p[1], 10);
    return (MONTHS[m - 1] || '') + ' ' + p[0];
  };
  PM.groupByMonth = function (list) {
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
  PM.initials = function (u) {
    u = u || (PM.state && PM.state.user) || {};
    var s = ((u.imie || '').charAt(0) + (u.nazwisko || '').charAt(0)).toUpperCase();
    return s || 'PM';
  };

  /* ---------- stan ---------- */
  PM.state = clone(DATA);
  PM.resetState = function () {
    PM.state = clone(DATA);
    return PM.state;
  };
  PM.today = (DATA.meta && DATA.meta.dzis) || '2026-11-15';

  PM.bot = function (id) {
    var list = (PM.state && PM.state.boty) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };
  PM.botName = function (id) {
    var b = PM.bot(id);
    return b ? b.nazwa : (BOT_NAMES[id] || id || '');
  };
  PM.purchase = function (id) {
    var list = (PM.state && PM.state.zakupy) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };
  PM.purchaseByStatus = function (status) {
    var map = (PM.state && PM.state.przyklady) || {};
    var p = map[status] ? PM.purchase(map[status]) : null;
    if (p) return p;
    var list = (PM.state && PM.state.zakupy) || [];
    for (var i = 0; i < list.length; i++) if (list[i].status === status) return list[i];
    return list[0] || null;
  };
  PM.canRefund = function (p) {
    return !!(p && p.status === 'zaplacono' && p.terminZwrotu && p.terminZwrotu >= PM.today);
  };
  PM.typeLabel = function (t) { return (TYPES[t] || { label: t || '' }).label; };
  PM.typeIcon = function (t) { return (TYPES[t] || { icon: 'inbox-line' }).icon; };
  PM.STATUS = STATUS;
  PM.TYPES = TYPES;

  /* ---------- helpery HTML ---------- */
  PM.icon = function (name, size, cls) {
    var st = size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '';
    return '<img class="ico' + (cls ? ' ' + esc(cls) : '') + '" src="assets/icons/' + esc(name) + '.svg" alt="" aria-hidden="true" draggable="false"' + st + '>';
  };

  PM.botLogo = function (id, size) {
    size = size || 44;
    var src = BOT_LOGOS[id];
    var name = PM.botName(id);
    var cls = 'tile', st = '';
    if (size === 18) cls += ' tile--xs';
    else if (size === 32) cls += ' tile--sm';
    else if (size === 64) cls += ' tile--lg';
    else if (size === 80) cls += ' tile--xl';
    else if (size !== 44) {
      st = ' style="width:' + size + 'px;height:' + size + 'px;border-radius:' + Math.min(10, Math.round(size * 0.28)) + 'px"';
    }
    var inner = src
      ? '<img src="' + src + '" alt="' + esc(name) + '" draggable="false">'
      : '<span class="mono-s">' + esc(String(name).slice(0, 2)) + '</span>';
    return '<span class="' + cls + '"' + st + ' title="' + esc(name) + '">' + inner + '</span>';
  };

  PM.spinner = function (cls) {
    return '<span class="spinner' + (cls ? ' ' + esc(cls) : '') + '" role="status" aria-label="Ładowanie"></span>';
  };

  PM.header = function (o) {
    o = o || {};
    var back = '';
    if (o.back) {
      var href = o.back === true ? '' : o.back;
      back = href
        ? '<a class="hdr-back" href="' + esc(href) + '" aria-label="Wstecz">' + PM.icon('arrow-left-s-line', 20) + '</a>'
        : '<a class="hdr-back" href="#" data-back aria-label="Wstecz">' + PM.icon('arrow-left-s-line', 20) + '</a>';
    }
    var tag = o.tag ? '<span class="ex-tag">' + esc(o.tag) + '</span>' : '';
    return '<header class="hdr"' + (o.title ? ' aria-label="' + esc(o.title) + '"' : '') + '>' +
      back + '<img class="hdr-logo" src="' + LOGO_INK + '" alt="Paymove" width="103" height="18">' + tag +
      '</header>';
  };

  function asBtn(x, variant) {
    if (!x) return '';
    if (typeof x === 'string') return x.trim().charAt(0) === '<' ? x : PM.btn(x, { variant: variant });
    var o = {};
    Object.keys(x).forEach(function (k) { o[k] = x[k]; });
    if (!o.variant) o.variant = variant;
    return PM.btn(o.label || '', o);
  }

  PM.actions = function (o) {
    o = o || {};
    var row = '';
    if (o.back) {
      var bh = o.back === true ? '' : o.back;
      row += bh
        ? '<a class="btn btn--secondary btn--icon" href="' + esc(bh) + '" aria-label="Wstecz">' + PM.icon('arrow-left-s-line', 22) + '</a>'
        : '<button class="btn btn--secondary btn--icon" type="button" data-back aria-label="Wstecz">' + PM.icon('arrow-left-s-line', 22) + '</button>';
    }
    row += asBtn(o.secondary, 'secondary') + asBtn(o.primary, 'primary');
    var out = row ? '<div class="act-row">' + row + '</div>' : '';
    if (o.extra) out += o.extra;
    if (o.legal) out += '<p class="legal">' + o.legal + '</p>';
    return out;
  };

  PM.screen = function (o) {
    o = o || {};
    var head = o.header === false ? '' : (typeof o.header === 'string' ? o.header : PM.header({ back: o.back, title: o.title, tag: o.tag }));
    var title = o.title && o.showTitle !== false
      ? (o.titleRight ? '<div class="title-row"><h1 class="title">' + esc(o.title) + '</h1>' + o.titleRight + '</div>' : '<h1 class="title">' + esc(o.title) + '</h1>')
      : '';
    var cta = '';
    if (o.cta) cta = /^\s*<div[^>]*class="[^"]*\bcta-bar\b/.test(o.cta) ? o.cta : '<div class="cta-bar">' + o.cta + '</div>';
    return '<section class="screen' + (o.cls ? ' ' + esc(o.cls) : '') + '"' + attrs(o.attrs) + '>' +
      head +
      '<div class="content' + (o.contentCls ? ' ' + esc(o.contentCls) : '') + '">' + title + (o.content || '') + '</div>' +
      cta +
      '</section>';
  };

  PM.btn = function (label, o) {
    o = o || {};
    var v = o.variant || 'primary';
    var cls = 'btn btn--' + v;
    if (o.block) cls += ' btn--block';
    if (o.sm) cls += ' btn--sm';
    if (o.iconOnly) cls += ' btn--icon';
    if (o.loading) cls += ' is-loading';
    if (o.disabled && o.href) cls += ' is-disabled';
    if (o.cls) cls += ' ' + o.cls;
    var inner = (o.icon ? PM.icon(o.icon, 20) : '') +
      (label ? '<span>' + (o.html ? label : esc(label)) + '</span>' : '') +
      (o.iconRight ? PM.icon(o.iconRight, 20) : '');
    var extra = attrs(o.attrs);
    if (o.loading) extra += ' aria-busy="true"';
    if (o.ariaLabel) extra += ' aria-label="' + esc(o.ariaLabel) + '"';
    if (o.href) {
      return '<a class="' + cls + '" href="' + esc(o.href) + '"' + (o.disabled ? ' aria-disabled="true" tabindex="-1"' : '') + extra + '>' + inner + '</a>';
    }
    return '<button class="' + cls + '" type="' + (o.type || 'button') + '"' + (o.disabled || o.loading ? ' disabled' : '') + extra + '>' + inner + '</button>';
  };

  PM.statusLabel = function (s) { return (STATUS[s] || { label: s || '' }).label; };
  PM.statusBadge = function (s) {
    var st = STATUS[s] || { label: s || '', cls: 'cancel' };
    return '<span class="badge badge--' + st.cls + '"><span class="dot"></span>' + esc(st.label) + '</span>';
  };
  PM.statusInline = function (s) {
    var st = STATUS[s] || { label: s || '', color: 'var(--off)' };
    return '<span class="status"><i class="dot" style="background:' + st.color + '"></i>' + esc(st.label) + '</span>';
  };

  PM.by = function (botId) {
    return '<span class="by">' + PM.botLogo(botId, 18) + 'przez ' + esc(PM.botName(botId)) + '</span>';
  };

  PM.purchaseHref = function (p) {
    return '#/zakup/' + p.status + '?id=' + encodeURIComponent(p.id);
  };

  PM.purchaseRow = function (p, o) {
    o = o || {};
    if (!p) return '';
    var href = o.href || PM.purchaseHref(p);
    var muted = p.status === 'anulowano' || p.status === 'nieudana';
    var strike = p.status === 'zwrocono';
    var row =
      '<a class="row" href="' + esc(href) + '">' +
        '<div class="thumb">' + PM.icon(p.ikona || PM.typeIcon(p.typ), 20) + '</div>' +
        '<div class="grow">' +
          '<div class="name ellipsis">' + esc(p.nazwa) + '</div>' +
          '<div class="meta">' + esc(PM.typeLabel(p.typ)) + ' · ' + esc(PM.date(p.data)) + '</div>' +
          '<div>' + PM.by(p.bot) + '</div>' +
        '</div>' +
        '<div class="right">' +
          '<div class="amount' + (muted || strike ? ' muted' : '') + (strike ? ' strike' : '') + '">' + PM.zl(p.kwota) + '</div>' +
          PM.statusInline(p.status) +
        '</div>' +
      '</a>';
    if (o.card === false) return row;
    var foot = '';
    if (o.refund && PM.canRefund(p)) {
      foot = '<div class="item-foot"><a class="chip" href="#/zwrot?id=' + encodeURIComponent(p.id) + '">Zgłoś zwrot</a></div>';
    }
    return '<div class="card" data-purchase="' + esc(p.id) + '">' + row + foot + '</div>';
  };

  PM.purchaseTimeline = function (p) {
    if (!p) return '';
    var who = PM.botName(p.bot);
    var when = PM.date(p.data) + ', ' + (p.godzina || '');
    var z = p.zwrot || {};
    var items = [];
    var placed = { c: 'is-done', t: 'Zlecone przez ' + who, m: when };
    switch (p.status) {
      case 'w-toku':
        items = [placed, { c: 'is-current', t: 'Czeka na potwierdzenie', m: 'W aplikacji banku' }, { c: 'is-todo', t: 'Zapłacono', m: '' }];
        break;
      case 'nieudana':
        items = [placed, { c: 'is-fail', t: 'Płatność nieudana', m: p.powodBledu || 'Bank odrzucił płatność' }];
        break;
      case 'anulowano':
        items = [placed, { c: '', t: 'Anulowano', m: p.powodAnulowania || 'Zakup anulowany' }];
        break;
      case 'zwrot-w-toku':
        items = [
          { c: 'is-done', t: 'Zapłacono', m: when },
          { c: 'is-done', t: 'Zgłoszono zwrot', m: PM.date(z.zgloszono) },
          { c: 'is-current', t: 'Zwrot w toku', m: z.przewidywane ? 'Decyzja do ' + PM.date(z.przewidywane) : 'Do 14 dni' },
          { c: 'is-todo', t: 'Zwrócono', m: '' }
        ];
        break;
      case 'zwrocono':
        items = [
          { c: 'is-done', t: 'Zapłacono', m: when },
          { c: 'is-done', t: 'Zgłoszono zwrot', m: PM.date(z.zgloszono) },
          { c: 'is-refund', t: 'Zwrócono ' + PM.zl(z.kwota != null ? z.kwota : p.kwota), m: PM.date(z.zakonczono) }
        ];
        break;
      default:
        items = [placed, { c: 'is-done', t: 'Potwierdzone w aplikacji banku', m: when }, { c: 'is-done', t: 'Zapłacono', m: '' }];
    }
    return '<ol class="timeline">' + items.map(function (i) {
      return '<li class="tl-item ' + i.c + '"><div class="tl-title">' + esc(i.t) + '</div>' +
        (i.m ? '<div class="tl-meta">' + esc(i.m) + '</div>' : '') + '</li>';
    }).join('') + '</ol>';
  };

  PM.botRow = function (b, o) {
    o = o || {};
    if (typeof b === 'string') b = PM.bot(b);
    if (!b) return '';
    var spent = o.wydal != null ? o.wydal : b.wydal;
    var last = o.ostatnio || b.ostatnio;
    var limit = b.limitMies || 0;
    var pct = limit > 0 ? clamp(Math.round(spent / limit * 100), 0, 100) : 0;
    var over = limit > 0 && spent >= limit;
    var warn = !over && pct >= 80;
    var href = o.href || '#/bot/' + b.id;
    return '<a class="card bot" href="' + esc(href) + '" data-bot="' + esc(b.id) + '">' +
      '<div class="bot-top">' +
        PM.botLogo(b.id, 44) +
        '<div class="grow"><div class="name">' + esc(b.nazwa) + '</div>' +
        '<div class="meta">' + PM.zl(spent) + ' · ' + esc(last) + '</div></div>' +
        '<img class="row-chev" src="assets/icons/arrow-right-s-line.svg" alt="" aria-hidden="true">' +
      '</div>' +
      '<div class="progress' + (over ? ' is-over' : warn ? ' is-warn' : '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="' + limit + '" aria-valuenow="' + spent + '" aria-label="Wydatki ' + esc(b.nazwa) + '"><i style="width:' + pct + '%"></i></div>' +
      '<div class="progress-meta' + (over ? ' is-over' : '') + '"><span>limit ' + PM.zlInt(limit) + '/mies.</span><span>' + (over ? 'limit wykorzystany' : pct + '%') + '</span></div>' +
      '</a>';
  };

  PM.field = function (o) {
    o = o || {};
    var id = o.id || uid('f');
    var a = {
      id: id, name: o.name || id, type: o.type || 'text',
      placeholder: o.placeholder || null, inputmode: o.inputmode || null,
      autocomplete: o.autocomplete || null, disabled: !!o.disabled,
      'aria-invalid': o.error ? 'true' : null,
      'data-autofocus': o.autofocus ? true : null,
      maxlength: o.maxlength || null
    };
    var extra = attrs(o.attrs);
    var input = o.textarea
      ? '<textarea class="textarea" id="' + esc(id) + '" name="' + esc(a.name) + '"' + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.disabled ? ' disabled' : '') + (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') + (o.autofocus ? ' data-autofocus' : '') + extra + '>' + esc(o.value || '') + '</textarea>'
      : '<input class="input' + (o.mono ? ' input--mono' : '') + '"' + attrs(a) + ' value="' + esc(o.value || '') + '"' + extra + '>';
    var top = o.label
      ? (o.labelRight ? '<div class="field-top"><label class="field-label" for="' + esc(id) + '">' + esc(o.label) + '</label>' + o.labelRight + '</div>'
        : '<label class="field-label" for="' + esc(id) + '">' + esc(o.label) + '</label>')
      : '';
    return '<div class="field' + (o.error ? ' is-error' : '') + (o.cls ? ' ' + esc(o.cls) : '') + '" data-field="' + esc(id) + '">' + top + input +
      (o.error ? '<p class="error-msg" role="alert">' + PM.icon('error-warning-line', 16) + esc(o.error) + '</p>' : '') +
      (o.hint ? '<p class="hint">' + esc(o.hint) + '</p>' : '') +
      '</div>';
  };

  function pctOf(v, min, max) { return max > min ? clamp((v - min) / (max - min) * 100, 0, 100) : 0; }

  PM.amountField = function (o) {
    o = o || {};
    var id = o.id || uid('amt');
    var min = o.min != null ? o.min : 0, max = o.max != null ? o.max : 1000, step = o.step || 10;
    var v = o.value != null ? Number(o.value) : min;
    var p = pctOf(v, min, max);
    var label = o.label || '';
    var who = o.bot ? PM.botLogo(o.bot, 32) : (o.who || '');
    var cls = (o.bare ? '' : 'lim ') + 'amount-field' + (o.divide ? ' divide' : '') + (o.error ? ' is-error' : '') + (o.cls ? ' ' + o.cls : '');
    return '<div class="' + cls + '" data-amount="' + esc(id) + '" data-min="' + min + '" data-max="' + max + '" data-step="' + step + '">' +
      '<div class="lim-h"><span class="who">' + who + '<label class="name" for="' + esc(id) + '-in">' + esc(label) + '</label></span>' + (o.right || '') + '</div>' +
      '<div class="amount-field-row">' +
        '<input class="range' + (o.error ? ' is-error' : '') + '" type="range" id="' + esc(id) + '-r" min="' + min + '" max="' + max + '" step="' + step + '" value="' + clamp(v, min, max) + '" style="--p:' + p + '%" aria-label="' + esc(label) + '"' + (o.disabled ? ' disabled' : '') + '>' +
        '<div class="money money--sm' + (o.error ? ' is-error' : '') + (o.disabled ? ' is-disabled' : '') + '"><input id="' + esc(id) + '-in" type="text" inputmode="numeric" autocomplete="off" value="' + Math.round(v) + '"' + (o.disabled ? ' disabled' : '') + '><span>zł</span></div>' +
      '</div>' +
      '<p class="error-msg" role="alert" data-amount-error' + (o.error ? '' : ' style="display:none"') + '>' + PM.icon('error-warning-line', 16) + '<span>' + esc(o.error || '') + '</span></p>' +
      (o.hint ? '<p class="hint">' + esc(o.hint) + '</p>' : '') +
      '</div>';
  };

  PM.setAmountError = function (root, id, msg) {
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

  PM.amountValue = function (root, id) {
    var inp = (root || document).querySelector('[data-amount="' + id + '"] .money input');
    return inp ? (parseInt(String(inp.value).replace(/\D/g, ''), 10) || 0) : 0;
  };

  PM.setAmount = function (root, id, value) {
    var w = (root || document).querySelector('[data-amount="' + id + '"]');
    if (!w) return;
    var min = +w.dataset.min, max = +w.dataset.max;
    var r = w.querySelector('input[type="range"]'), inp = w.querySelector('.money input');
    if (inp) inp.value = String(Math.round(value));
    if (r) { r.value = clamp(value, min, max); r.style.setProperty('--p', pctOf(value, min, max) + '%'); }
  };

  PM.bindAmount = function (root, onChange) {
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

  PM.codeInput = function (o) {
    o = o || {};
    var val = String(o.value || '').replace(/\D/g, '').slice(0, 6);
    var focusIdx = o.focusIndex != null ? o.focusIndex : Math.min(val.length, 5);
    var cells = '';
    for (var i = 0; i < 6; i++) {
      var ch = val.charAt(i);
      cells += '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1"' +
        (i === 0 ? ' autocomplete="one-time-code"' : ' autocomplete="off"') +
        ' aria-label="Cyfra ' + (i + 1) + ' z 6" value="' + ch + '"' +
        (ch ? ' class="is-filled"' : '') +
        (o.disabled ? ' disabled' : '') +
        (!o.disabled && o.focus !== false && i === focusIdx ? ' data-autofocus' : '') + '>';
    }
    return '<div class="code-input' + (o.error ? ' is-error' : '') + (o.disabled ? ' is-disabled' : '') + '" data-code role="group" aria-label="Kod z maila"' + (o.error ? ' aria-invalid="true"' : '') + '>' + cells + '</div>';
  };

  PM.bindCode = function (root, onComplete, onChange) {
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

  PM.toggle = function (id, on, o) {
    o = o || {};
    return '<button class="toggle" type="button" role="switch" id="' + esc(id) + '" aria-checked="' + (on ? 'true' : 'false') + '"' +
      (o.labelledby ? ' aria-labelledby="' + esc(o.labelledby) + '"' : '') +
      (o.label ? ' aria-label="' + esc(o.label) + '"' : '') +
      (o.target ? ' data-target="' + esc(o.target) + '"' : '') +
      (o.disabled ? ' disabled' : '') + attrs(o.attrs) + '></button>';
  };

  PM.seg = function (items, active, a) {
    items = (items || []).map(function (it) { return typeof it === 'string' ? { value: it, label: it } : it; });
    var out = '<div class="seg" role="tablist"' + attrs(a) + '>';
    items.forEach(function (it) {
      var on = String(it.value) === String(active);
      var cls = 'seg-item' + (on ? ' is-active' : '');
      var common = ' role="tab" aria-selected="' + (on ? 'true' : 'false') + '" data-seg-value="' + esc(it.value) + '"' + attrs(it.attrs);
      out += it.href
        ? '<a class="' + cls + '" href="' + esc(it.href) + '"' + common + '>' + esc(it.label) + '</a>'
        : '<button class="' + cls + '" type="button"' + common + '>' + esc(it.label) + '</button>';
    });
    return out + '</div>';
  };

  PM.emptyState = function (o) {
    o = o || {};
    var cta = '';
    if (o.cta) cta = typeof o.cta === 'string' ? o.cta : PM.btn(o.cta.label, { variant: o.cta.variant || 'secondary', href: o.cta.href, attrs: o.cta.attrs, icon: o.cta.icon });
    return '<div class="empty">' +
      '<div class="empty-ico">' + PM.icon(o.icon || 'inbox-line', 28) + '</div>' +
      (o.title ? '<p class="empty-title">' + esc(o.title) + '</p>' : '') +
      (o.text ? '<p class="empty-text">' + esc(o.text) + '</p>' : '') +
      cta + '</div>';
  };

  PM.banner = function (o) {
    o = o || {};
    var type = o.type || 'info';
    var defIcon = { info: 'information-line', warn: 'error-warning-line', ok: 'check-line', error: 'error-warning-line' }[type] || 'information-line';
    return '<div class="banner banner--' + type + '"' + (type === 'error' || type === 'warn' ? ' role="alert"' : '') + '>' +
      PM.icon(o.icon || defIcon, 20) +
      '<div class="grow">' +
        (o.title ? '<span class="banner-title">' + esc(o.title) + '</span>' : '') +
        (o.text ? '<span class="banner-text">' + (o.html ? o.text : esc(o.text)) + '</span>' : '') +
      '</div>' + (o.right || '') + '</div>';
  };

  PM.kv = function (rows, cls) {
    return '<dl class="kv' + (cls ? ' ' + cls : '') + '">' + (rows || []).map(function (r) {
      return '<div class="kv-row"><dt>' + esc(r.k) + '</dt><dd' + (r.mono ? ' class="mono"' : '') + '>' + (r.html ? r.v : esc(r.v)) + '</dd></div>';
    }).join('') + '</dl>';
  };

  PM.sheet = function (o) {
    o = o || {};
    return '<div class="sheet-layer">' +
      '<div class="scrim" data-sheet-scrim></div>' +
      '<div class="sheet' + (o.cls ? ' ' + esc(o.cls) : '') + '" role="dialog" aria-modal="true"' + (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + '>' + (o.body || '') + '</div>' +
      '</div>';
  };

  PM.openSheet = function (o) {
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
  PM.closeSheet = function (silent) {
    if (!els.device) return;
    qsa(els.device, '.sheet-layer[data-dynamic-sheet]').forEach(function (l) { l.remove(); });
  };

  /* ---------- toast ---------- */
  PM.toast = function (msg, o) {
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

  /* ---------- timery ---------- */
  /* zakresy: 'base' (ekran) i 'sheet' (warstwa sheeta); rejestracja w zakresie aktualnie montowanym */
  function scopeOf() { return scopes[mountScope] || scopes.base; }
  PM.later = function (fn, ms) {
    if (SHOT) return 0;
    var id = setTimeout(fn, ms || 0);
    scopeOf().timers.push({ t: 'to', id: id });
    return id;
  };
  PM.every = function (fn, ms) {
    if (SHOT) return 0;
    var id = setInterval(fn, ms || 1000);
    scopeOf().timers.push({ t: 'iv', id: id });
    return id;
  };
  PM.onLeave = function (fn) { if (typeof fn === 'function') scopeOf().leave.push(fn); };
  function clearScope(name) {
    var s = scopes[name];
    if (!s) return;
    var ts = s.timers; s.timers = [];
    ts.forEach(function (t) { if (t.t === 'to') clearTimeout(t.id); else clearInterval(t.id); });
    var fns = s.leave; s.leave = [];
    fns.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
  }
  function clearTimers() { clearScope('sheet'); clearScope('base'); }
  function fmtSec(s) { s = Math.max(0, s | 0); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  PM.fmtSec = fmtSec;
  PM.countdown = function (el, seconds, onDone) {
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

  /* ---------- router ---------- */
  function normHash(h) {
    h = String(h == null ? '' : h).trim();
    if (!h || h === '#') return '';
    if (h.charAt(0) !== '#') h = '#' + (h.charAt(0) === '/' ? '' : '/') + h;
    if (h.indexOf('#/') !== 0) h = '#/' + h.slice(1);
    if (h.length > 2 && h.charAt(h.length - 1) === '/' && h.indexOf('?') === -1) h = h.slice(0, -1);
    return h;
  }
  function splitHash(h) {
    var i = h.indexOf('?');
    var path = i === -1 ? h : h.slice(0, i);
    var query = {};
    if (i !== -1) {
      h.slice(i + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        try { query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } catch (e) { query[p[0]] = p[1] || ''; }
      });
    }
    return { hash: h, path: path, query: query };
  }
  PM.normHash = normHash;

  PM.route = function (hash, def) {
    var path = splitHash(normHash(hash)).path;
    if (!path) return PM;
    def = def || {};
    def.hash = path;
    def.group = def.group || 'Inne';
    def.label = def.label || def.title || path;
    if (def.tab === undefined) def.tab = null;
    if (def.base) def.base = normHash(def.base);
    var entry = { hash: path, group: def.group, label: def.label, title: def.title || def.label, tab: def.tab, sheet: !!def.sheet };
    if (routes[path]) {
      for (var i = 0; i < STATES.length; i++) if (STATES[i].hash === path) { STATES[i] = entry; break; }
    } else {
      STATES.push(entry);
    }
    routes[path] = def;
    statesDirty = true;
    return PM;
  };
  PM.routes = function () { return routes; };
  PM.has = function (hash) { return !!routes[splitHash(normHash(hash)).path]; };
  PM.current = function () { return { hash: cur.hash, path: cur.path, query: cur.query, def: cur.def }; };

  function setHashSilently(h) {
    try {
      history.replaceState(null, '', location.pathname + location.search + h);
    } catch (e) {
      location.replace(h);
      return false;
    }
    return true;
  }

  PM.go = function (hash, o) {
    o = o || {};
    var h = normHash(hash);
    if (!h) return;
    if (o.replace) {
      if (setHashSilently(h)) render();
      return;
    }
    if (h === normHash(location.hash)) render();
    else location.hash = h;
  };

  function makeCtx(sp, def, isBase) {
    return {
      hash: sp.hash, path: sp.path, query: sp.query, params: sp.query,
      state: PM.state, shot: SHOT, def: def, isBase: !!isBase, el: els.device
    };
  }

  function callRender(def, ctx) {
    if (!def || typeof def.render !== 'function') return '';
    var out = def.render(ctx);
    return out == null ? '' : String(out);
  }

  function wrapScreen(out, def) {
    if (/^\s*<(section|div)[^>]*class="[^"]*\bscreen\b/.test(out)) return out;
    return PM.screen({ content: out, back: def && def.back, cls: def && def.screenClass, cta: def && def.cta });
  }

  function wrapSheet(out, def) {
    if (/^\s*<div[^>]*class="[^"]*\bsheet-layer\b/.test(out)) return out;
    return PM.sheet({ body: out, label: def && (def.title || def.label) });
  }

  function fallbackScreen(path, err) {
    return PM.screen({
      title: err ? 'Coś poszło nie tak' : 'Nie ma takiego stanu',
      content: PM.emptyState({
        icon: 'error-warning-line',
        title: err ? 'Błąd ekranu' : 'Brak ekranu',
        text: path || 'Ten stan nie jest jeszcze gotowy.',
        cta: homeHash() ? { label: routes['#/portfel'] ? 'Wróć do portfela' : 'Wróć', href: homeHash() } : null
      })
    });
  }

  function firstStateHash() { return STATES.length ? STATES[0].hash : ''; }
  function homeHash() {
    return routes['#/portfel'] ? '#/portfel' : routes['#/dane'] ? '#/dane' : firstStateHash();
  }
  PM.home = homeHash;

  /* ---------- render: retencja bazy, animacje wejścia, fokus ---------- */
  var mounted = { screenKey: '', hash: '', sheet: false };
  var seen = {};
  var stale = false;
  var lastTab = null;
  var opener = null;
  var lastActivator = null;
  var announceTimer = 0;

  PM.css(
    '#pm-route-announcer{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
    '.screen[tabindex="-1"]:focus,.sheet[tabindex="-1"]:focus{outline:none}'
  );

  /* wymusza ponowny render bazy przy najbliższej zmianie trasy */
  PM.invalidate = function () { stale = true; };

  /* kończy skończone animacje CSS w root (bez spinnerów i pulsów) */
  function finishEntrance(root) {
    if (!root || typeof document.getAnimations !== 'function') return;
    var list;
    try { list = document.getAnimations(); } catch (e) { return; }
    list.forEach(function (a) {
      try {
        var ef = a.effect, tg = ef && ef.target;
        if (!a.animationName || !tg || !root.contains(tg)) return;
        var it = ef.getTiming ? ef.getTiming().iterations : 1;
        if (!isFinite(it)) return;
        a.finish();
      } catch (e) {}
    });
  }

  function announce(text) {
    if (SHOT || !els.announcer) return;
    clearTimeout(announceTimer);
    els.announcer.textContent = '';
    announceTimer = setTimeout(function () { els.announcer.textContent = text; }, 50);
  }

  /* zapamiętuje ostatnio kliknięty element (iOS nie fokusuje przycisków po tapnięciu) */
  function rememberActivator(e) {
    var t = e.target;
    lastActivator = t && t.closest ? t.closest('a[href],button,[tabindex]') : null;
  }

  function pickOpener() {
    var a = document.activeElement;
    if (a && a !== document.body && els.view.contains(a)) return a;
    return lastActivator && els.view.contains(lastActivator) ? lastActivator : null;
  }

  /* fokus na kontener, chyba że użytkownik już jest w środku box */
  function focusInto(box, target) {
    if (SHOT || !box || !target) return;
    var a = document.activeElement;
    if (a && a !== document.body && box.contains(a)) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    try { target.focus({ preventScroll: true }); } catch (e) {}
  }

  function insertSheet(sheetHtml, def) {
    var tmp = document.createElement('div');
    tmp.innerHTML = sheetHtml;
    var layer = tmp.firstElementChild;
    if (layer) {
      layer.setAttribute('data-route-sheet', def.base || '');
      els.device.insertBefore(layer, els.toasts);
    }
    return layer;
  }

  function render() {
    if (!ready) return;

    var h = normHash(location.hash);
    if (!h || h === '#/') {
      var target = routes['#/login'] ? '#/login' : homeHash();
      if (target) { setHashSilently(target); h = target; }
    }
    var sp = splitHash(h || '');
    var def = routes[sp.path];
    if (!def && sp.path) {
      var home = homeHash();
      if (home && routes[home]) {
        setHashSilently(home);
        sp = splitHash(home);
        def = routes[home];
      }
    }

    var prevHash = cur.hash;
    var sameHash = prevHash === sp.hash;
    cur = { hash: sp.hash, path: sp.path, query: sp.query, def: def || null };

    var baseDef = def && def.sheet && def.base ? routes[def.base] : null;
    var screenKey = baseDef ? baseDef.hash : sp.path;
    var ctx = makeCtx(sp, def, false);
    var baseCtx = baseDef ? makeCtx({ hash: baseDef.hash, path: baseDef.hash, query: sp.query }, baseDef, true) : null;
    var tab = def ? def.tab : null;
    if (tab == null && baseDef) tab = baseDef.tab;

    /* tryb: full | sheet (baza zostaje) | close (zdjęcie sheeta, baza zostaje) */
    var mode = 'full';
    if (!SHOT && !stale && def && mounted.screenKey) {
      if (baseDef && mounted.screenKey === baseDef.hash) mode = 'sheet';
      else if (!def.sheet && mounted.sheet && mounted.screenKey === sp.path &&
        (sp.hash === sp.path || sp.hash === mounted.hash)) mode = 'close';
    }
    if (def && def.sheet && !mounted.sheet) opener = pickOpener();

    var screenHtml = '', sheetHtml = '', failed = false, layer = null;

    if (mode === 'sheet') {
      clearScope('sheet');
      try {
        sheetHtml = wrapSheet(callRender(def, ctx), def);
      } catch (e) {
        console.error('[PM] render', sp.path, e);
        screenHtml = fallbackScreen(sp.path, e);
        sheetHtml = '';
        failed = true;
        mode = 'full';
      }
    }
    if (mode === 'full') {
      clearScope('sheet');
      clearScope('base');
      stale = false;
      if (!failed) {
        try {
          if (!def) {
            screenHtml = fallbackScreen(sp.path);
          } else if (def.sheet) {
            screenHtml = baseDef ? wrapScreen(callRender(baseDef, baseCtx), baseDef) : PM.screen({ content: '' });
            sheetHtml = wrapSheet(callRender(def, ctx), def);
          } else {
            screenHtml = wrapScreen(callRender(def, ctx), def);
          }
        } catch (e1) {
          console.error('[PM] render', sp.path, e1);
          screenHtml = fallbackScreen(sp.path, e1);
          sheetHtml = '';
          failed = true;
        }
      }
    } else if (mode === 'close') {
      clearScope('sheet');
    }

    /* DOM */
    els.device.classList.toggle('has-tabbar', !!tab);
    els.app.classList.toggle('no-nav', !tab);
    /* warstwy sheetów (route i dynamiczne) znikają przy każdej zmianie trasy, jak wcześniej */
    qsa(els.device, '.sheet-layer').forEach(function (l) { l.remove(); });

    if (mode === 'full') {
      if (SHOT) els.toasts.innerHTML = '';
      els.view.innerHTML = screenHtml;
      if (sheetHtml) layer = insertSheet(sheetHtml, def);
      /* przed pierwszym paintem: bez animacji wejścia przy powrotach */
      if (seen[screenKey] || (lastTab && tab) || sameHash) finishEntrance(els.view);
      if (layer && sameHash) finishEntrance(layer);
      seen[screenKey] = true;
    } else if (mode === 'sheet') {
      layer = insertSheet(sheetHtml, def);
      if (layer && sameHash) finishEntrance(layer);
    }

    updateNav(tab);
    updateMockbar(def);
    updateStatesActive();
    document.title = (def ? (def.title || def.label) + ' · ' : '') + 'Paymove Wallet';

    if (mode === 'full') {
      qsa(els.device, '.content, .sheet').forEach(function (c) { c.scrollTop = 0; });
      /* reset przewinięcia dokumentu (np. po onboardingu, gdzie przewija się html) */
      try {
        var se = document.scrollingElement || html;
        window.scrollTo(0, 0);
        se.scrollTop = 0;
        document.body.scrollTop = 0;
        if (window.requestAnimationFrame) requestAnimationFrame(function () { if (window.pageYOffset) window.scrollTo(0, 0); });
      } catch (e) {}
    }

    /* mount */
    if (!failed && mode !== 'close') {
      try {
        if (mode === 'full' && baseDef && typeof baseDef.mount === 'function') {
          mountScope = 'base';
          baseDef.mount(els.device, baseCtx);
        }
        if (def && typeof def.mount === 'function') {
          mountScope = def.sheet ? 'sheet' : 'base';
          def.mount(els.device, ctx);
        }
      } catch (e2) {
        console.error('[PM] mount', sp.path, e2);
      }
    }
    mountScope = layer ? 'sheet' : 'base';

    if (mode === 'full') stripMeta(els.device);
    else if (layer) stripMeta(layer);

    /* fokus */
    if (mode === 'close') {
      var back = opener;
      opener = null;
      if (!SHOT && back && els.view.contains(back)) { try { back.focus({ preventScroll: true }); } catch (e3) {} }
      else focusInto(els.view, els.view.querySelector('.screen'));
    } else {
      var af = layer ? layer.querySelector('[data-autofocus]') : els.device.querySelector('[data-autofocus]');
      if (af && !af.disabled) { try { af.focus({ preventScroll: true }); } catch (e4) {} }
      else if (layer) focusInto(layer, layer.querySelector('.sheet'));
      else focusInto(els.view, els.view.querySelector('.screen'));
    }
    if (!layer) opener = null;

    if (mode === 'full') {
      mounted.screenKey = failed ? '' : screenKey;
      mounted.hash = baseDef ? baseDef.hash : sp.hash;
    }
    mounted.sheet = !!layer;
    lastTab = tab;

    if (def && def.toast) PM.toast(def.toast);
    if (!sameHash) announce(document.title);

    if (html.classList.contains('is-booting')) setTimeout(function () { html.classList.remove('is-booting'); }, 400);
    html.setAttribute('data-pm-ready', sp.path || '');
    try { document.dispatchEvent(new CustomEvent('pm:render', { detail: { hash: sp.hash, path: sp.path } })); } catch (e5) {}
  }
  PM.render = render;

  /* ---------- shell ---------- */
  var SB_ICONS =
    '<svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1" fill="#1a1a1a"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#1a1a1a"/><rect x="10" y="3" width="3" height="9" rx="1" fill="#1a1a1a"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#1a1a1a"/></svg>' +
    '<svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path d="M8 2.3c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8 .6 10.2 10.2 0 0 0 .8 3.5L2 4.7a8.5 8.5 0 0 1 6-2.4Zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2A6.8 6.8 0 0 0 8 4a6.8 6.8 0 0 0-4.8 1.9l1.2 1.2A5.1 5.1 0 0 1 8 5.7Zm0 3.4c.5 0 .9.2 1.2.5L8 10.8 6.8 9.6c.3-.3.7-.5 1.2-.5Z" fill="#1a1a1a"/></svg>' +
    '<svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true"><rect x=".5" y=".5" width="23" height="12" rx="3.5" stroke="#1a1a1a" stroke-opacity=".35" fill="none"/><rect x="2" y="2" width="20" height="9" rx="2" fill="#1a1a1a"/><path d="M25 4.5v4a2 2 0 0 0 0-4Z" fill="#1a1a1a" fill-opacity=".4"/></svg>';

  function buildShell() {
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

  function updateNav(tab) {
    qsa(els.app, '[data-tab]').forEach(function (a) {
      var on = a.getAttribute('data-tab') === tab;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function updateMockbar(def) {
    if (!els.mockTitle) return;
    els.mockTitle.innerHTML = def
      ? esc(def.group) + ' · ' + esc(def.label) + '<span class="mockbar-hash">' + esc(def.hash) + '</span>'
      : 'Brak stanu<span class="mockbar-hash">' + esc(cur.path) + '</span>';
  }

  function buildStates() {
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

  function updateStatesActive() {
    if (statesDirty) buildStates();
    qsa(els.statesBody, '.states-item').forEach(function (a) {
      var on = a.getAttribute('data-state') === cur.path;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  function setDrawer(open) {
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

  function closeRouteSheet() {
    var layer = els.device && els.device.querySelector('.sheet-layer[data-route-sheet]');
    if (layer) {
      var base = layer.getAttribute('data-route-sheet');
      if (base) PM.go(base);
      return true;
    }
    if (els.device && els.device.querySelector('.sheet-layer[data-dynamic-sheet]')) { PM.closeSheet(); return true; }
    return false;
  }

  /* ---------- delegacja ---------- */
  function onClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;

    if (t.closest('.states-fab')) { setDrawer(!els.drawer.classList.contains('is-open')); return; }
    if (t.closest('[data-states-close]')) { setDrawer(false); return; }
    if (t.closest('.states-item')) { setDrawer(false); return; }

    var scrim = t.closest('.scrim');
    if (scrim && !SHOT) { e.preventDefault(); closeRouteSheet(); return; }

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
      else PM.go(homeHash());
      return;
    }

    var ts = t.closest('[data-toast]');
    if (ts) PM.toast(ts.getAttribute('data-toast'));
  }

  function onKey(e) {
    if (e.key !== 'Escape') return;
    if (els.drawer && els.drawer.classList.contains('is-open')) { setDrawer(false); return; }
    if (!SHOT) closeRouteSheet();
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

  /* ---------- start ---------- */
  var FONTS = ['400 16px Aeonik', '500 16px Aeonik', '700 16px Aeonik', '500 12px "IBM Plex Mono"'];

  /* pierwszy render po załadowaniu fontów, najdłużej 700 ms */
  function whenFonts(cb) {
    var done = false;
    function go() { if (done) return; done = true; cb(); }
    var f = document.fonts;
    if (!f || typeof f.load !== 'function' || typeof Promise === 'undefined') { go(); return; }
    try {
      Promise.race([
        Promise.all(FONTS.map(function (s) { return f.load(s); })),
        new Promise(function (res) { setTimeout(res, 700); })
      ]).then(go, go);
    } catch (e) { go(); }
  }

  PM.start = function () {
    if (started) { render(); return; }
    started = true;
    buildShell();
    buildStates();
    document.addEventListener('click', rememberActivator, true);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', render);
    initObFocus();
    whenFonts(function () { ready = true; render(); });
  };

  window.addEventListener('load', function () {
    if (!started) PM.start();
  });
})();
