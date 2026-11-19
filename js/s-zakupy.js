/* =====================================================================
   Paymove Wallet · prototyp · js/s-zakupy.js
   Sekcja: 0b Zakupy · warianty. Trzy style listy zakupów.
     A  ikony kategorii w miękkich kaflach + odznaka bota
     B  monogramy sprzedawców + chip kategorii, grupowanie po dniach z sumą
     C  bilety jako ticket stub, parking z tablicą PL, statusy jako pigułki
   Stany:
     #/historia-a  #/historia-b  #/historia-c
   Filtry historii działają w obrębie wariantu: ?typ=bilet|parking|usluga&bot=<id>
   Domyślne #/historia pozostaje bez zmian. Warianty dotyczą tylko historii.
   Dodatkowe zakupy (EXTRA) żyją tylko w tym pliku, nie trafiają do PM.state.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.PM || typeof PM.route !== 'function') return;

  var esc = PM.esc;
  var G = '0b Zakupy · warianty';
  var BOT_ORDER = ['claude', 'chatgpt', 'grok', 'perplexity'];
  var TYPY = ['bilet', 'parking', 'usluga'];
  var TYP_CHIPS = [
    { v: null, l: 'Wszystko' },
    { v: 'bilet', l: 'Bilety' },
    { v: 'parking', l: 'Parking' },
    { v: 'usluga', l: 'Usługi' }
  ];
  var MON = ['STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE', 'LIP', 'SIE', 'WRZ', 'PAŹ', 'LIS', 'GRU'];
  var CHARGED = { 'zaplacono': 1, 'w-toku': 1, 'zwrot-w-toku': 1 };
  var BLUE_F = 'invert(23%) sepia(93%) saturate(4385%) hue-rotate(229deg) brightness(97%) contrast(98%)';

  /* ---------- dodatkowe zakupy tylko dla wariantów ---------- */
  var EXTRA = [
    {
      id: 'zk-pkp', x: true, kat: 'pociag', typ: 'bilet', nazwa: 'PKP Intercity',
      opis: 'Gdańsk Główny → Warszawa Centralna', miejsce: 'Wagon 8, miejsce 45',
      kwota: 89, data: '2026-11-14', godzina: '07:15',
      status: 'zaplacono', bot: 'chatgpt', terminZwrotu: '2026-11-28',
      nrTransakcji: 'PM-2611-1407-15', metoda: 'BLIK OneClick'
    },
    {
      id: 'zk-ecs', x: true, kat: 'muzeum', typ: 'bilet', nazwa: 'Europejskie Centrum Solidarności',
      opis: 'Wystawa stała, 2 bilety normalne', miejsce: 'pl. Solidarności 1, Gdańsk',
      kwota: 60, data: '2026-11-13', godzina: '12:30',
      status: 'zaplacono', bot: 'perplexity', terminZwrotu: '2026-11-27',
      nrTransakcji: 'PM-2611-1312-30', metoda: 'BLIK OneClick'
    }
  ];

  /* ---------- ikony SVG (24x24, stroke 1.6, currentColor) ---------- */
  var SVG = {
    train: '<rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 9.5h14M12 3v6.5M8.5 16L7 20M15.5 16l1.5 4M6 20.5h12"/><circle cx="8.5" cy="12.8" r=".6"/><circle cx="15.5" cy="12.8" r=".6"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7.5 4v16M16.5 4v16M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21M7.5 12h9"/>',
    masks: '<path d="M3 5.6c2.6-1.5 6.4-1.5 9 0V10c0 3.1-2 5.5-4.5 5.5S3 13.1 3 10z"/><path d="M5.6 8.6h1.2M8.2 8.6h1.2M5.9 11.6c.9.8 2.3.8 3.2 0"/><path d="M14.3 9.2c2.1-.8 4.7-.6 6.7.6v4.4c0 3.1-2 5.5-4.5 5.5-1.6 0-3-.9-3.8-2.4"/><path d="M15.4 12.6h1.2M18 12.6h1.2M15.8 16.4c.9-.8 2.3-.8 3.2 0"/>',
    museum: '<path d="M3 9.5L12 4l9 5.5M4.5 9.5h15M6.5 10.5v6.5M10.2 10.5v6.5M13.8 10.5v6.5M17.5 10.5v6.5M4.5 17.5h15M3 20.5h18"/>',
    paw: '<circle cx="6.8" cy="10.2" r="1.7"/><circle cx="10" cy="6.4" r="1.7"/><circle cx="14.4" cy="6.4" r="1.7"/><circle cx="17.6" cy="10.2" r="1.7"/><path d="M12.2 12c-2.4 0-5 3.2-5 5.6 0 1.5 1.1 2.4 2.5 2.4 1 0 1.7-.5 2.5-.5s1.5.5 2.5.5c1.4 0 2.5-.9 2.5-2.4 0-2.4-2.6-5.6-5-5.6z"/>',
    music: '<path d="M9 17.5V6l11-2.5V15M9 9.5L20 7"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="15" r="2.5"/>',
    football: '<circle cx="12" cy="12" r="9"/><path d="M12 7.6l4.1 3-1.6 4.8h-5l-1.6-4.8z"/><path d="M12 3v4.6M16.1 10.6l4.4-1.5M14.5 15.4l2.7 3.8M9.5 15.4l-2.7 3.8M7.9 10.6L3.5 9.1"/>'
  };
  function svg(name, size) {
    return '<svg class="zk-svg" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + SVG[name] + '</svg>';
  }

  var EU_STARS = (function () {
    var s = '<svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">';
    for (var i = 0; i < 12; i++) {
      var a = i * Math.PI / 6;
      s += '<circle cx="' + (5 + 3.6 * Math.sin(a)).toFixed(2) + '" cy="' + (5 - 3.6 * Math.cos(a)).toFixed(2) + '" r=".7" fill="#ffd400"/>';
    }
    return s + '</svg>';
  })();

  /* ---------- kategorie ---------- */
  var CATS = {
    teatr: { label: 'Teatr', color: '#b0448f', svg: 'masks' },
    kino: { label: 'Kino', color: '#d2445f', svg: 'film' },
    muzeum: { label: 'Muzeum', color: '#9a6b2f', svg: 'museum' },
    zoo: { label: 'Zoo', color: '#5f8a22', svg: 'paw' },
    hala: { label: 'Hala', color: '#6656cc', svg: 'music' },
    sport: { label: 'Sport', color: '#12906a', svg: 'football' },
    pociag: { label: 'Pociąg', color: '#0f8790', svg: 'train' },
    parking: { label: 'Parking', color: '#2f5fe0', icon: 'parking-box-line', filt: 'zk-ico-blue' },
    restauracja: { label: 'Restauracja', color: '#e0702f', icon: 'restaurant-line', filt: 'ico--orange' },
    pralnia: { label: 'Pralnia', color: '#64748b', icon: 'customer-service-2-line', filt: 'ico--grey' },
    myjnia: { label: 'Myjnia', color: '#64748b', icon: 'car-line', filt: 'ico--grey' },
    serwis: { label: 'Serwis', color: '#64748b', icon: 'customer-service-2-line', filt: 'ico--grey' },
    bilet: { label: 'Bilet', color: '#64748b', icon: 'ticket-2-line', filt: 'ico--grey' }
  };
  var RULES = [
    [/teatr/, 'teatr'],
    [/kino|helios|multikino/, 'kino'],
    [/muzeum|centrum solidarno/, 'muzeum'],
    [/zoo/, 'zoo'],
    [/pkp|intercity|pociąg|skm/, 'pociag'],
    [/lechia|mecz|stadion/, 'sport'],
    [/hala|filharmonia|koncert/, 'hala'],
    [/restaurac|stolik/, 'restauracja'],
    [/pralnia/, 'pralnia'],
    [/myjnia/, 'myjnia'],
    [/serwis|rower/, 'serwis']
  ];

  function catKey(p) {
    if (p.kat && CATS[p.kat]) return p.kat;
    if (p.typ === 'parking') return 'parking';
    var s = (String(p.nazwa || '') + ' ' + String(p.opis || '')).toLowerCase();
    for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(s)) return RULES[i][1];
    return p.typ === 'bilet' ? 'bilet' : 'serwis';
  }
  function cat(p) { return CATS[catKey(p)]; }
  function catIcon(c, size) { return c.svg ? svg(c.svg, size) : PM.icon(c.icon, size, c.filt); }
  function rgba(hex, a) {
    var n = parseInt(String(hex).replace('#', ''), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function catStyle(c) {
    return ' style="--c:' + c.color + ';--ct:' + rgba(c.color, 0.1) + ';--ct2:' + rgba(c.color, 0.18) + '"';
  }

  /* ---------- style ---------- */
  PM.css(
    '.zk-static{cursor:default}' +
    '.zk-svg{display:block;flex:none}' +
    '.zk-ico-blue{filter:' + BLUE_F + '}' +

    /* A: kafel kategorii */
    '.zk-a-ico{position:relative;width:44px;height:44px;flex:none;border-radius:12px;display:grid;place-items:center;color:var(--c);background:linear-gradient(150deg,var(--ct2),var(--ct));box-shadow:inset 0 0 0 1px var(--ct),inset 0 1px 0 rgba(255,255,255,.6)}' +
    '.zk-a-ico .ico{width:22px;height:22px}' +
    '.zk-a-bot{position:absolute;right:-5px;bottom:-5px;display:block;border-radius:6px;box-shadow:0 0 0 2px #fff,0 2px 4px rgba(31,41,82,.12)}' +

    /* B: monogram i dni */
    '.zk-b-av{width:44px;height:44px;flex:none;border-radius:13px;display:grid;place-items:center;font:700 15px/1 var(--sans);letter-spacing:.01em;box-shadow:inset 0 0 0 1px rgba(26,26,26,.05),inset 0 1px 0 rgba(255,255,255,.7)}' +
    '.zk-b-av--3{font-size:12px;letter-spacing:.04em}' +
    '.zk-b-sub{display:flex;align-items:center;gap:8px;margin-top:4px;min-width:0}' +
    '.zk-b-chip{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:999px;background:var(--chip);font:500 11px/14px var(--sans);color:var(--tp);white-space:nowrap;flex:none}' +
    '.zk-b-chip i{width:6px;height:6px;border-radius:50%;flex:none}' +
    '.zk-b-time{font:500 12px/16px var(--mono);color:var(--ts)}' +
    '.zk-b-sub .tile{border-radius:5px}' +
    '.zk-b-sum{font-variant-numeric:tabular-nums}' +
    '.zk-b-day{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 16px 0;font:500 13px/18px var(--sans);color:var(--ts);font-variant-numeric:tabular-nums}' +
    '.zk-b-day:not(:first-child){border-top:1px solid var(--divider)}' +
    '.zk-b-day + .row{padding-top:8px}' +

    /* C: pigułki statusu */
    '.zk-c-pill{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 10px 0 6px;border-radius:999px;background:var(--chip);font:500 12px/16px var(--sans);color:var(--tp);white-space:nowrap;flex:none}' +
    '.zk-c-pill .ico{width:14px;height:14px}' +
    '.zk-c-pill--i{width:24px;padding:0;justify-content:center}' +
    '.zk-c-pill--ok{background:var(--ok-tint)}.zk-c-pill--ok .ico{filter:var(--ico-green)}' +
    '.zk-c-pill--pending{background:var(--warn-tint)}.zk-c-pill--pending .ico{filter:var(--ico-orange)}' +
    '.zk-c-pill--fail{background:var(--err-tint)}.zk-c-pill--fail .ico{filter:var(--ico-red)}' +
    '.zk-c-pill--cancel{color:var(--ts)}.zk-c-pill--cancel .ico{filter:var(--ico-grey)}' +
    '.zk-c-pill--refund{background:var(--accent-tint)}.zk-c-pill--refund .ico{filter:' + BLUE_F + '}' +

    /* C: ticket stub */
    'a.card.zk-c-ticket,.zk-c-ticket{display:flex;overflow:hidden;padding:0}' +
    '.zk-c-stub{width:72px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:16px 4px;background:linear-gradient(180deg,var(--ct2),var(--ct));text-align:center}' +
    '.zk-c-dd{font:700 30px/32px var(--sans);letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--tp)}' +
    '.zk-c-mm{font:600 11px/14px var(--mono);letter-spacing:.08em;color:var(--c)}' +
    '.zk-c-hh{margin-top:8px;font:500 12px/16px var(--mono);color:var(--ts)}' +
    '.zk-c-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding:14px 16px 14px 18px;border-left:1.5px dashed rgba(26,26,26,.16)}' +
    '.zk-c-kind{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px;min-width:0}' +
    '.zk-c-cat{display:inline-flex;align-items:center;gap:6px;font:600 11px/14px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--c)}' +
    '.zk-c-cat .ico{width:16px;height:16px}' +
    '.zk-c-place{display:flex;align-items:center;gap:4px;font:400 13px/18px var(--sans);color:var(--ts);min-width:0}' +
    '.zk-c-place .ico{width:14px;height:14px;opacity:.55}' +
    '.zk-c-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}' +
    '.zk-c-notch{position:absolute;left:63.75px;width:18px;height:18px;border-radius:50%;background:var(--bg);box-shadow:inset 0 0 0 1px var(--border);z-index:1}' +
    '.zk-c-notch--t{top:-10px}.zk-c-notch--b{bottom:-10px}' +

    /* C: parking z tablicą */
    'a.card.zk-c-park,.zk-c-park{display:flex;flex-direction:column;gap:12px;padding:16px}' +
    '.zk-c-ptop{display:flex;align-items:flex-start;gap:12px;min-width:0}' +
    '.zk-c-ptop .by{margin-top:4px}' +
    '.zk-c-pfoot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:12px;border-top:1px solid var(--divider)}' +
    '.zk-c-plate{display:inline-flex;align-items:stretch;height:30px;border-radius:5px;border:1.5px solid #1a1a1a;background:#fff;overflow:hidden;box-shadow:0 1px 2px rgba(31,41,82,.1);flex:none}' +
    '.zk-c-eu{width:18px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;background:#0a3a9f;color:#fff;font:700 8px/1 var(--sans);letter-spacing:.02em}' +
    '.zk-c-eu svg{width:10px;height:10px;display:block}' +
    '.zk-c-num{display:flex;align-items:center;padding:0 10px 0 8px;font:600 15px/1 var(--mono);letter-spacing:.08em;color:#1a1a1a;white-space:nowrap}' +

    /* C: usługa */
    'a.card.zk-c-serv,.zk-c-serv{display:flex;align-items:center;gap:12px;padding:14px 16px}' +
    '.zk-c-serv .right{gap:6px}' +

    /* C: małe karty w portfelu */
    '.zk-c-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}' +
    'a.card.zk-c-mini,.zk-c-mini{display:flex;flex-direction:column;gap:10px;padding:14px;min-width:0}' +
    '.zk-c-mtop{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '.zk-c-mico{width:36px;height:36px;border-radius:10px}' +
    '.zk-c-mico .ico{width:18px;height:18px}' +
    '.zk-c-mdate{margin-top:2px;font:500 12px/16px var(--mono);color:var(--ts)}' +
    '.zk-c-mfoot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;border-top:1.5px dashed rgba(26,26,26,.14)}'
  );

  /* ---------- pomocnicze ---------- */
  function plural(n, one, few, many) {
    if (n === 1) return one;
    var m10 = n % 10, m100 = n % 100;
    if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return few;
    return many;
  }
  function addDays(iso, n) {
    var d = new Date(String(iso) + 'T12:00:00Z');
    if (isNaN(d.getTime())) return iso;
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function items() { return ((PM.state && PM.state.zakupy) || []).concat(EXTRA); }
  function sortKey(p) { return (p.data || '') + ' ' + (p.godzina || ''); }
  function sortDesc(list) {
    return list.slice().sort(function (a, b) {
      var ka = sortKey(a), kb = sortKey(b);
      return ka < kb ? 1 : ka > kb ? -1 : 0;
    });
  }
  function link(p, cls, inner, extra) {
    extra = extra || '';
    if (p.x) return '<div class="' + cls + ' zk-static"' + extra + '>' + inner + '</div>';
    return '<a class="' + cls + '" href="' + esc(PM.purchaseHref(p)) + '"' + extra + '>' + inner + '</a>';
  }
  function amountCls(p) {
    if (p.status === 'zwrocono') return ' muted strike';
    if (p.status === 'anulowano' || p.status === 'nieudana') return ' muted';
    return '';
  }
  function dparts(iso) {
    var s = String(iso || '').split('-');
    return { day: s[2] || '', mon: MON[parseInt(s[1], 10) - 1] || '' };
  }
  function dayLabel(iso) {
    if (iso === PM.today) return 'Dziś';
    if (iso === addDays(PM.today, -1)) return 'Wczoraj';
    var l = PM.dateLong(iso);
    if (String(iso).slice(0, 4) === String(PM.today).slice(0, 4)) l = l.replace(/\s\d{4}$/, '');
    return l;
  }
  function groupByDay(list) {
    var out = [], map = {};
    sortDesc(list).forEach(function (p) {
      var k = p.data || '';
      if (!map[k]) { map[k] = { key: k, label: dayLabel(k), items: [], sum: 0 }; out.push(map[k]); }
      map[k].items.push(p);
      if (CHARGED[p.status]) map[k].sum += Number(p.kwota) || 0;
    });
    return out;
  }
  function monthHead(g, i) {
    return '<div class="sec-h"><span>' + esc(g.label) + '</span>' +
      (i === 0 ? '' : '<span class="count">' + g.items.length + '</span>') + '</div>';
  }
  function sec(title, href, body) {
    return '<section class="sec pf-in" style="--d:120ms">' +
      '<div class="sec-h"><span>' + esc(title) + '</span><a href="' + esc(href) + '">Wszystkie</a></div>' +
      body + '</section>';
  }

  /* =====================================================================
     A · ikony kategorii
     ===================================================================== */
  function tileA(p) {
    var c = cat(p);
    return '<span class="zk-a-ico"' + catStyle(c) + '>' + catIcon(c, 22) +
      '<span class="zk-a-bot">' + PM.botLogo(p.bot, 18) + '</span></span>';
  }
  function rowA(p, o) {
    o = o || {};
    var c = cat(p);
    var inner = tileA(p) +
      '<div class="grow"><div class="name ellipsis">' + esc(p.nazwa) + '</div>' +
      '<div class="meta ellipsis">' + esc(c.label) + ' · ' + esc(PM.date(p.data)) + '</div></div>' +
      '<div class="right"><div class="amount' + amountCls(p) + '">' + PM.zl(p.kwota) + '</div>' + PM.statusInline(p.status) + '</div>';
    var foot = '';
    if (o.refund && !p.x && PM.canRefund(p)) {
      foot = '<div class="item-foot"><a class="chip" href="#/zwrot?id=' + encodeURIComponent(p.id) + '">Zgłoś zwrot</a></div>';
    }
    return '<div class="card">' + link(p, 'row', inner) + foot + '</div>';
  }
  function listA(list) {
    return PM.groupByMonth(list).map(function (g, i) {
      return '<section class="sec">' + monthHead(g, i) +
        g.items.map(function (p) { return rowA(p, { refund: true }); }).join('') + '</section>';
    }).join('');
  }
  function lastA() {
    var p = sortDesc(items())[0];
    return p ? sec('Ostatni zakup', '#/historia-a', rowA(p)) : '';
  }

  /* =====================================================================
     B · monogramy i dni
     ===================================================================== */
  var HUES = [8, 26, 44, 145, 168, 192, 214, 248, 276, 322];
  function hashStr(s) {
    var h = 0;
    s = String(s || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }
  function initials(name) {
    var words = String(name || '').split(/\s+/).filter(function (w) {
      return /^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(w) && !/^[IVX]+$/.test(w);
    });
    if (!words.length) return '?';
    if (/^[A-ZĄĆĘŁŃÓŚŹŻ]{2,4}$/.test(words[0])) return words[0].slice(0, 3);
    return (words[0].charAt(0) + (words[1] ? words[1].charAt(0) : words[0].charAt(1))).toUpperCase();
  }
  function avatarB(p) {
    var h = HUES[hashStr(p.nazwa) % HUES.length];
    var ini = initials(p.nazwa);
    return '<span class="zk-b-av' + (ini.length > 2 ? ' zk-b-av--3' : '') + '" aria-hidden="true" style="' +
      'background:linear-gradient(150deg,hsl(' + h + ',72%,94%),hsl(' + h + ',62%,88%));color:hsl(' + h + ',48%,30%)">' +
      esc(ini) + '</span>';
  }
  function rowB(p) {
    var c = cat(p);
    var inner = avatarB(p) +
      '<div class="grow"><div class="name ellipsis">' + esc(p.nazwa) + '</div>' +
      '<div class="zk-b-sub">' +
        '<span class="zk-b-chip"><i style="background:' + c.color + '"></i>' + esc(c.label) + '</span>' +
        '<span class="zk-b-time">' + esc(p.godzina || '') + '</span>' + PM.botLogo(p.bot, 18) +
      '</div></div>' +
      '<div class="right"><div class="amount' + amountCls(p) + '">' + PM.zl(p.kwota) + '</div>' + PM.statusInline(p.status) + '</div>';
    return link(p, 'row', inner);
  }
  function listB(list) {
    return groupByDay(list).map(function (g) {
      return '<section class="sec">' +
        '<div class="sec-h"><span>' + esc(g.label) + '</span><span class="count zk-b-sum">' + PM.zl(g.sum) + '</span></div>' +
        '<div class="card">' + g.items.map(function (p) { return rowB(p); }).join('') + '</div>' +
        '</section>';
    }).join('');
  }
  function lastB() {
    var l = sortDesc(items()).slice(0, 3);
    if (!l.length) return '';
    var body = groupByDay(l).map(function (g) {
      return '<div class="zk-b-day"><span>' + esc(g.label) + '</span><span>' + PM.zl(g.sum) + '</span></div>' +
        g.items.map(function (p) { return rowB(p); }).join('');
    }).join('');
    return sec('Ostatnie zakupy', '#/historia-b', '<div class="card">' + body + '</div>');
  }

  /* =====================================================================
     C · bilety, tablice, pigułki
     ===================================================================== */
  var PILL = {
    'zaplacono': ['bold-tick-circle', 'ok'],
    'w-toku': ['bold-time-circle-1', 'pending'],
    'nieudana': ['bold-close-circle', 'fail'],
    'anulowano': ['bold-close-circle', 'cancel'],
    'zwrot-w-toku': ['bold-refresh-2', 'refund'],
    'zwrocono': ['bold-refresh-2', 'refund']
  };
  function pill(s, iconOnly) {
    var d = PILL[s] || ['bold-time-circle-1', 'cancel'];
    var label = PM.statusLabel(s);
    if (iconOnly) {
      return '<span class="zk-c-pill zk-c-pill--i zk-c-pill--' + d[1] + '" role="img" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + PM.icon(d[0], 14) + '</span>';
    }
    return '<span class="zk-c-pill zk-c-pill--' + d[1] + '">' + PM.icon(d[0], 14) + '<span>' + esc(label) + '</span></span>';
  }
  function plate(t) {
    return '<span class="zk-c-plate" role="img" aria-label="Tablica ' + esc(t) + '">' +
      '<span class="zk-c-eu">' + EU_STARS + '<b>PL</b></span>' +
      '<span class="zk-c-num">' + esc(t) + '</span></span>';
  }
  function ticketC(p) {
    var c = cat(p);
    var d = dparts(p.data);
    var inner =
      '<div class="zk-c-stub">' +
        '<span class="zk-c-dd">' + esc(d.day) + '</span>' +
        '<span class="zk-c-mm">' + esc(d.mon) + '</span>' +
        '<span class="zk-c-hh">' + esc(p.godzina || '') + '</span>' +
      '</div>' +
      '<div class="zk-c-main">' +
        '<div class="zk-c-kind"><span class="zk-c-cat">' + catIcon(c, 16) + esc(c.label) + '</span>' + PM.by(p.bot) + '</div>' +
        '<div class="name">' + esc(p.nazwa) + '</div>' +
        (p.opis ? '<div class="meta">' + esc(p.opis) + '</div>' : '') +
        (p.miejsce ? '<div class="zk-c-place">' + PM.icon('map-pin-line', 14) + '<span class="ellipsis">' + esc(p.miejsce) + '</span></div>' : '') +
        '<div class="zk-c-foot"><span class="amount' + amountCls(p) + '">' + PM.zl(p.kwota) + '</span>' + pill(p.status) + '</div>' +
      '</div>' +
      '<i class="zk-c-notch zk-c-notch--t" aria-hidden="true"></i><i class="zk-c-notch zk-c-notch--b" aria-hidden="true"></i>';
    return link(p, 'card zk-c-ticket', inner, catStyle(c));
  }
  function parkingC(p) {
    var c = cat(p);
    var when = PM.date(p.data) + (p.godzina ? ', ' + p.godzina : '');
    var meta = [p.opis, when].filter(Boolean).join(' · ');
    var inner =
      '<div class="zk-c-ptop">' +
        '<span class="zk-a-ico"' + catStyle(c) + '>' + catIcon(c, 22) + '</span>' +
        '<div class="grow"><div class="name ellipsis">' + esc(p.nazwa) + '</div>' +
          '<div class="meta ellipsis">' + esc(meta) + '</div>' +
          '<div>' + PM.by(p.bot) + '</div></div>' +
        '<div class="amount' + amountCls(p) + '">' + PM.zl(p.kwota) + '</div>' +
      '</div>' +
      '<div class="zk-c-pfoot">' + (p.tablica ? plate(p.tablica) : '<span></span>') + pill(p.status) + '</div>';
    return link(p, 'card zk-c-park', inner);
  }
  function serviceC(p) {
    var inner =
      '<div class="thumb">' + PM.icon(p.ikona || PM.typeIcon(p.typ), 20) + '</div>' +
      '<div class="grow"><div class="name ellipsis">' + esc(p.nazwa) + '</div>' +
        '<div class="meta ellipsis">' + esc(p.opis || PM.typeLabel(p.typ)) + '</div>' +
        '<div>' + PM.by(p.bot) + '</div></div>' +
      '<div class="right"><div class="amount' + amountCls(p) + '">' + PM.zl(p.kwota) + '</div>' + pill(p.status) + '</div>';
    return link(p, 'card zk-c-serv', inner);
  }
  function cardC(p) {
    if (p.typ === 'bilet') return ticketC(p);
    if (p.typ === 'parking') return parkingC(p);
    return serviceC(p);
  }
  function miniC(p) {
    var c = cat(p);
    var d = dparts(p.data);
    var inner =
      '<div class="zk-c-mtop"><span class="zk-a-ico zk-c-mico"' + catStyle(c) + '>' + catIcon(c, 18) + '</span>' + PM.botLogo(p.bot, 18) + '</div>' +
      '<div><div class="name ellipsis">' + esc(p.nazwa) + '</div>' +
        '<div class="zk-c-mdate">' + esc(d.day + ' ' + d.mon) + (p.godzina ? ' · ' + esc(p.godzina) : '') + '</div></div>' +
      '<div class="zk-c-mfoot"><span class="amount' + amountCls(p) + '">' + PM.zl(p.kwota) + '</span>' + pill(p.status, true) + '</div>';
    return link(p, 'card zk-c-mini', inner);
  }
  function listC(list) {
    return PM.groupByMonth(list).map(function (g, i) {
      return '<section class="sec">' + monthHead(g, i) +
        '<div class="stack-8">' + g.items.map(function (p) { return cardC(p); }).join('') + '</div>' +
        '</section>';
    }).join('');
  }
  function lastC() {
    var l = sortDesc(items()).slice(0, 3);
    if (!l.length) return '';
    var rest = l.slice(1);
    return sec('Ostatnie zakupy', '#/historia-c',
      cardC(l[0]) +
      (rest.length ? '<div class="zk-c-grid">' + rest.map(function (p) { return miniC(p); }).join('') + '</div>' : ''));
  }

  /* =====================================================================
     Ekrany
     ===================================================================== */
  function portfel(ctx, html) {
    if (typeof PM.portfelView === 'function') return PM.portfelView(ctx, html);
    return PM.screen({ title: 'Portfel', showTitle: false, content: html });
  }

  function vHref(base, typ, bot) {
    var q = [];
    if (typ) q.push('typ=' + encodeURIComponent(typ));
    if (bot) q.push('bot=' + encodeURIComponent(bot));
    return base + (q.length ? '?' + q.join('&') : '');
  }

  function filters(base, typ, bot, all) {
    var typeChips = TYP_CHIPS.map(function (c) {
      var on = (c.v || null) === (typ || null);
      return '<a class="chip' + (on ? ' is-active' : '') + '" href="' + esc(vHref(base, c.v, bot)) + '"' +
        (on ? ' aria-current="true"' : '') + '>' + esc(c.l) + '</a>';
    }).join('');
    var ids = BOT_ORDER.filter(function (id) {
      return !!PM.bot(id) || all.some(function (p) { return p.bot === id; });
    });
    var botChips = ids.map(function (id) {
      var on = bot === id;
      return '<a class="chip-bot' + (on ? ' is-active' : '') + '" href="' + esc(vHref(base, typ, on ? null : id)) + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="Filtr: ' + esc(PM.botName(id)) + '">' +
        PM.botLogo(id, 32) + '</a>';
    }).join('');
    return '<div class="hs-filters">' +
      '<div class="chips" role="group" aria-label="Typ zakupu">' + typeChips + '</div>' +
      '<div class="chips hs-bots' + (bot ? '' : ' is-all') + '" role="group" aria-label="Agent">' + botChips + '</div>' +
      '</div>';
  }

  function historia(ctx, v) {
    var base = '#/historia-' + v;
    var all = items();
    var typ = TYPY.indexOf(ctx.query.typ) !== -1 ? ctx.query.typ : null;
    var bot = BOT_ORDER.indexOf(ctx.query.bot) !== -1 ? ctx.query.bot : null;
    var list = all.filter(function (p) {
      return (!typ || p.typ === typ) && (!bot || p.bot === bot);
    });

    var active = '';
    if (bot) {
      active = '<div class="hs-active">' +
        '<span class="left">' + PM.by(bot) + '<span class="mono-s">· ' + list.length + ' ' + plural(list.length, 'zakup', 'zakupy', 'zakupów') + '</span></span>' +
        '<a class="textbtn" href="' + esc(vHref(base, typ, null)) + '">Wyczyść</a>' +
        '</div>';
    }

    var body;
    if (!list.length) {
      body = PM.emptyState({
        icon: 'search-line',
        title: 'Nic tu nie ma',
        text: 'Brak zakupów dla tego filtra.',
        cta: { label: 'Pokaż wszystko', href: base }
      });
    } else if (v === 'a') {
      body = listA(list);
    } else if (v === 'b') {
      body = listB(list);
    } else {
      body = listC(list);
    }

    return PM.screen({ title: 'Historia', content: filters(base, typ, bot, all) + active + body });
  }

  /* ---------- rejestracja ---------- */
  PM.route('#/historia-a', {
    title: 'Historia', group: G, label: 'Historia · wariant A (ikony kategorii)', tab: 'historia',
    render: function (ctx) { return historia(ctx, 'a'); }
  });
  PM.route('#/historia-b', {
    title: 'Historia', group: G, label: 'Historia · wariant B (monogramy i dni)', tab: 'historia',
    render: function (ctx) { return historia(ctx, 'b'); }
  });
  PM.route('#/historia-c', {
    title: 'Historia', group: G, label: 'Historia · wariant C (bilety i tablice)', tab: 'historia',
    render: function (ctx) { return historia(ctx, 'c'); }
  });
})();
