/* =====================================================================
   Profil płatnika Paymove · prototyp · js/s-historia.js
   Sekcje: 3 Historia (lista, filtry, szczegół zakupu) i 4 Zwrot.
   Każdy stan renderuje się deterministycznie z hasha (?shot=1).
   Parametry opcjonalne w hashu:
     #/historia?bot=chatgpt           filtr agenta
     #/historia/bilety?bot=claude     filtr typu + agenta
     #/zakup/<status>?id=<id>         konkretny zakup
     #/zwrot?id=<id>                  zwrot konkretnego zakupu
   ===================================================================== */
(function () {
  'use strict';
  if (!window.PM || typeof PM.route !== 'function') return;

  var esc = PM.esc;
  var G_H = 'Historia';
  var G_Z = 'Zwrot';
  var BLIK_LOGO = 'assets/logos/blik-logo.svg';
  var BOT_ORDER = ['claude', 'chatgpt', 'grok', 'perplexity'];
  var TYP_PATH = { bilet: '#/historia/bilety', parking: '#/historia/parking', usluga: '#/historia/uslugi' };
  var TYP_CHIPS = [
    { v: null, l: 'Wszystko' },
    { v: 'bilet', l: 'Bilety' },
    { v: 'parking', l: 'Parking' },
    { v: 'usluga', l: 'Usługi' }
  ];

  PM.css(
    '.hs-filters{display:flex;flex-direction:column;gap:12px}' +
    '.hs-bots.is-all .chip-bot{opacity:1}' +
    '.hs-active{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:32px}' +
    '.hs-active .left{display:flex;align-items:center;gap:8px;min-width:0}' +
    '.hs-top{display:flex;align-items:center;gap:12px;min-width:0}' +
    '.hs-amt{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
    '.hs-amt .meta{min-width:0}' +
    '.zw [hidden]{display:none!important}' +
    '.zw .textarea{min-height:104px}' +
    '.zw .radio-row span{min-width:0}' +
    '.zw-sent-amt{display:flex;align-items:baseline;gap:10px}'
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
  function parseAmount(s) {
    var t = String(s == null ? '' : s).replace(/\s/g, '').replace(',', '.');
    if (!/^\d+(\.\d{0,2})?$/.test(t)) return NaN;
    return parseFloat(t);
  }
  function fmtInput(n) {
    var v = Number(n) || 0;
    return (Math.round(v * 100) % 100 === 0) ? String(Math.round(v)) : v.toFixed(2).replace('.', ',');
  }
  function powodLabel(id) {
    var list = (PM.state.zwrot && PM.state.zwrot.powody) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].label;
    return 'Inny';
  }
  function terminDni() {
    return (PM.state.zwrot && PM.state.zwrot.terminDni) || 14;
  }
  function chev() {
    return '<img class="row-chev" src="assets/icons/arrow-right-s-line.svg" alt="" aria-hidden="true">';
  }
  function thumb(p) {
    return '<div class="thumb">' + PM.icon(p.ikona || PM.typeIcon(p.typ), 20) + '</div>';
  }
  function przyklad(key) {
    var map = PM.state.przyklady || {};
    return map[key] ? PM.purchase(map[key]) : null;
  }
  function missing(title) {
    return PM.screen({
      title: title || 'Zakup',
      content: PM.emptyState({
        icon: 'search-line',
        title: 'Nie ma takiego zakupu',
        text: 'Mógł zostać usunięty z historii.',
        cta: { label: 'Wróć do historii', href: '#/historia' }
      })
    });
  }

  /* podsumowanie zakupu z logo agenta */
  function summaryCard(p, o) {
    o = o || {};
    var amtCls = o.strike ? ' muted strike' : '';
    return '<div class="card"><div class="row">' +
      thumb(p) +
      '<div class="grow">' +
        '<div class="name ellipsis">' + esc(p.nazwa) + '</div>' +
        '<div class="meta">' + esc(PM.typeLabel(p.typ)) + ' · ' + esc(PM.date(p.data)) + '</div>' +
        '<div>' + PM.by(p.bot) + '</div>' +
      '</div>' +
      '<div class="right"><div class="amount' + amtCls + '">' + PM.zl(p.kwota) + '</div>' + (o.right || '') + '</div>' +
      '</div></div>';
  }

  /* =====================================================================
     3 HISTORIA · lista z filtrami
     ===================================================================== */
  function histHref(typ, bot) {
    if (!typ && bot === 'claude') return '#/historia/bot-claude';
    var h = typ ? TYP_PATH[typ] : '#/historia';
    return bot ? h + '?bot=' + encodeURIComponent(bot) : h;
  }

  function renderHistory(ctx, typ, fixedBot, forceEmpty) {
    var all = forceEmpty ? [] : (ctx.state.zakupy || []);

    if (!all.length) {
      return PM.screen({
        title: 'Historia',
        contentCls: 'content--center',
        content: PM.emptyState({
          icon: 'history-line',
          title: 'Brak zakupów',
          text: 'Tu zobaczysz zakupy, które zrobią Twoje boty.',
          cta: { label: 'Połączone boty', href: '#/boty', icon: 'robot-2-line' }
        })
      });
    }

    var bot = fixedBot || ctx.query.bot || null;
    if (bot && BOT_ORDER.indexOf(bot) === -1) bot = null;

    var list = all.filter(function (p) {
      return (!typ || p.typ === typ) && (!bot || p.bot === bot);
    });

    /* filtry typu */
    var typeChips = TYP_CHIPS.map(function (c) {
      var on = (c.v || null) === (typ || null);
      return '<a class="chip' + (on ? ' is-active' : '') + '" href="' + esc(histHref(c.v, bot)) + '"' +
        (on ? ' aria-current="true"' : '') + '>' + esc(c.l) + '</a>';
    }).join('');

    /* filtry agenta: prawdziwe logotypy */
    var ids = BOT_ORDER.filter(function (id) {
      return !!PM.bot(id) || all.some(function (p) { return p.bot === id; });
    });
    var botChips = ids.map(function (id) {
      var on = bot === id;
      return '<a class="chip-bot' + (on ? ' is-active' : '') + '" href="' + esc(histHref(typ, on ? null : id)) + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="Filtr: ' + esc(PM.botName(id)) + '">' +
        PM.botLogo(id, 32) + '</a>';
    }).join('');

    var filters = '<div class="hs-filters">' +
      '<div class="chips" role="group" aria-label="Typ zakupu">' + typeChips + '</div>' +
      '<div class="chips hs-bots' + (bot ? '' : ' is-all') + '" role="group" aria-label="Agent">' + botChips + '</div>' +
      '</div>';

    var active = '';
    if (bot) {
      active = '<div class="hs-active">' +
        '<span class="left">' + PM.by(bot) + '<span class="mono-s">· ' + list.length + ' ' + plural(list.length, 'zakup', 'zakupy', 'zakupów') + '</span></span>' +
        '<a class="textbtn" href="' + esc(histHref(typ, null)) + '">Wyczyść</a>' +
        '</div>';
    }

    var body;
    if (!list.length) {
      body = PM.emptyState({
        icon: 'search-line',
        title: 'Nic tu nie ma',
        text: 'Brak zakupów dla tego filtra.',
        cta: { label: 'Pokaż wszystko', href: '#/historia' }
      });
    } else {
      body = PM.groupByMonth(list).map(function (g, i) {
        return '<section class="sec">' +
          '<div class="sec-h"><span>' + esc(g.label) + '</span>' +
            (i === 0 ? '<span class="tag">Przykład</span>' : '<span class="count">' + g.items.length + '</span>') +
          '</div>' +
          g.items.map(function (p) { return PM.purchaseRow(p, { refund: true }); }).join('') +
          '</section>';
      }).join('');
    }

    return PM.screen({ title: 'Historia', content: filters + active + body });
  }

  PM.route('#/historia', {
    title: 'Historia', group: G_H, label: 'Wszystkie zakupy', tab: 'historia',
    render: function (ctx) { return renderHistory(ctx, null, null, false); }
  });
  PM.route('#/historia/bilety', {
    title: 'Historia · bilety', group: G_H, label: 'Filtr: bilety', tab: 'historia',
    render: function (ctx) { return renderHistory(ctx, 'bilet', null, false); }
  });
  PM.route('#/historia/parking', {
    title: 'Historia · parking', group: G_H, label: 'Filtr: parking', tab: 'historia',
    render: function (ctx) { return renderHistory(ctx, 'parking', null, false); }
  });
  PM.route('#/historia/uslugi', {
    title: 'Historia · usługi', group: G_H, label: 'Filtr: usługi', tab: 'historia',
    render: function (ctx) { return renderHistory(ctx, 'usluga', null, false); }
  });
  PM.route('#/historia/bot-claude', {
    title: 'Historia · Claude', group: G_H, label: 'Filtr: Claude', tab: 'historia',
    render: function (ctx) { return renderHistory(ctx, null, 'claude', false); }
  });
  PM.route('#/historia/pusta', {
    title: 'Historia pusta', group: G_H, label: 'Pusta historia', tab: 'historia',
    render: function (ctx) { return renderHistory(ctx, null, null, true); }
  });

  /* =====================================================================
     3 HISTORIA · szczegół zakupu
     ===================================================================== */
  function methodMeta(status) {
    switch (status) {
      case 'w-toku': return 'czeka na potwierdzenie w aplikacji banku';
      case 'nieudana': return 'brak potwierdzenia w aplikacji banku';
      case 'anulowano': return 'pieniądze nie zostały pobrane';
      default: return 'potwierdzone w aplikacji banku';
    }
  }

  function renderDetail(ctx, status) {
    var p = ctx.query.id ? PM.purchase(ctx.query.id) : null;
    if (!p) p = PM.purchaseByStatus(status);
    if (!p) return missing();

    var st = p.status;
    var z = p.zwrot || {};

    /* hero */
    var amtCls = '';
    var sub = '';
    if (st === 'zwrocono') {
      amtCls = ' muted strike';
      sub = 'Zwrócono ' + PM.zl(z.kwota != null ? z.kwota : p.kwota);
    } else if (st === 'zwrot-w-toku') {
      sub = 'Zwrot ' + PM.zl(z.kwota != null ? z.kwota : p.kwota) + (z.czesciowy ? ', częściowy' : '');
    } else if (st === 'anulowano') {
      amtCls = ' muted';
      sub = p.kwotaPierwotna ? 'Pierwotnie ' + PM.zl(p.kwotaPierwotna) + ', nie pobrano' : 'Nie pobrano';
    } else if (st === 'nieudana') {
      amtCls = ' muted';
      sub = 'Nie pobrano';
    }

    var hero = '<div class="card pad">' +
      '<div class="hs-top">' + thumb(p) +
        '<div class="grow"><div class="name">' + esc(p.opis || p.nazwa) + '</div>' +
        '<div class="meta">' + esc(PM.typeLabel(p.typ)) + ' · ' + esc(PM.dateLong(p.data)) + '</div></div>' +
      '</div>' +
      '<div class="hs-amt"><span class="big-amount' + amtCls + '">' + PM.zl(p.kwota) + '</span>' + PM.statusBadge(st) + '</div>' +
      '<div class="hs-amt"><span class="meta">' + esc(sub) + '</span><span class="ex-tag">Przykład</span></div>' +
      '</div>';

    /* banner tylko tam, gdzie jest akcja lub problem */
    var banner = '';
    if (st === 'w-toku') {
      banner = PM.banner({
        type: 'warn', icon: 'smartphone-line',
        title: 'Czeka na potwierdzenie',
        text: 'Zatwierdź płatność BLIK OneClick w aplikacji banku.',
        right: PM.spinner()
      });
    } else if (st === 'nieudana') {
      banner = PM.banner({
        type: 'error',
        title: 'Płatność nieudana',
        text: (p.powodBledu || 'Bank odrzucił płatność') + '. Pieniądze nie zostały pobrane.'
      });
    }

    /* status */
    var status = '<section class="sec"><div class="sec-h"><span>Status</span></div>' +
      '<div class="card">' + PM.purchaseTimeline(p) + '</div></section>';

    /* agent i metoda */
    var b = PM.bot(p.bot);
    var agentInner = PM.botLogo(p.bot, 44) +
      '<div class="grow"><div class="name">' + esc(PM.botName(p.bot)) + '</div>' +
      '<div class="meta">' + (b ? 'Agent, zlecił zakup' : 'Agent odłączony') + '</div></div>';
    var agent = b
      ? '<a class="row" href="#/bot/' + esc(p.bot) + '">' + agentInner + chev() + '</a>'
      : '<div class="row">' + agentInner + '</div>';
    var confirmed = st === 'zaplacono' || st === 'zwrot-w-toku' || st === 'zwrocono';
    var method = '<div class="row">' +
      '<span class="tile"><img src="' + BLIK_LOGO + '" alt="BLIK" draggable="false"></span>' +
      '<div class="grow"><div class="name">BLIK OneClick</div><div class="meta">' + esc(methodMeta(st)) + '</div></div>' +
      (confirmed ? PM.icon('shield-check-line', 20, 'ico--green') : '') +
      '</div>';
    var pay = '<section class="sec"><div class="sec-h"><span>Płatność</span></div>' +
      '<div class="card">' + agent + method + '</div></section>';

    /* szczegóły */
    var rows = [{ k: 'Data', v: PM.dateLong(p.data) + (p.godzina ? ', ' + p.godzina : '') }];
    if (p.miejsce) rows.push({ k: 'Miejsce', v: p.miejsce });
    if (p.tablica) rows.push({ k: 'Pojazd', v: '<span class="plate">' + esc(p.tablica) + '</span>', html: true });
    rows.push({ k: 'Nr transakcji', v: p.nrTransakcji || '', mono: true });
    if (st === 'zaplacono' && p.terminZwrotu) {
      rows.push({ k: 'Zwrot do', v: PM.date(p.terminZwrotu) + (PM.canRefund(p) ? '' : ', minął') });
    }
    var details = '<section class="sec"><div class="sec-h"><span>Szczegóły</span></div>' +
      '<div class="card">' + PM.kv(rows) + '</div></section>';

    /* akcje */
    var helpBtn = { label: 'Pomoc', icon: 'customer-service-2-line', attrs: { 'data-toast': 'Pomoc dostępna w pełnej wersji' } };
    var cta;
    if (st === 'zaplacono' && PM.canRefund(p)) {
      cta = PM.actions({
        back: '#/historia',
        primary: { label: 'Zgłoś zwrot', href: '#/zwrot?id=' + encodeURIComponent(p.id) },
        legal: 'Zwrot możliwy do ' + PM.date(p.terminZwrotu) + '.'
      });
    } else if (st === 'zaplacono') {
      cta = PM.actions({
        back: '#/historia',
        secondary: { label: 'Zgłoś zwrot', href: '#/zwrot/niedostepny?id=' + encodeURIComponent(p.id) },
        legal: p.terminZwrotu ? 'Termin zwrotu minął ' + PM.date(p.terminZwrotu) + '.' : ''
      });
    } else if (st === 'w-toku') {
      cta = PM.actions({
        back: '#/historia',
        secondary: { label: 'Odśwież status', icon: 'bold-refresh-2', attrs: { 'data-toast': 'Nadal czeka na potwierdzenie' } }
      });
    } else if (st === 'zwrot-w-toku') {
      cta = PM.actions({
        back: '#/historia',
        secondary: { label: 'Zgłoszenie zwrotu', href: '#/zwrot/wyslano?id=' + encodeURIComponent(p.id) }
      });
    } else if (st === 'zwrocono') {
      cta = PM.actions({
        back: '#/historia',
        secondary: { label: 'Szczegóły zwrotu', href: '#/zwrot/zwrocono?id=' + encodeURIComponent(p.id) }
      });
    } else {
      cta = PM.actions({ back: '#/historia', secondary: helpBtn });
    }

    return PM.screen({
      title: p.nazwa,
      content: hero + banner + status + pay + details,
      cta: cta
    });
  }

  [
    ['zaplacono', 'Zakup: zapłacono'],
    ['w-toku', 'Zakup: w toku'],
    ['nieudana', 'Zakup: nieudana'],
    ['anulowano', 'Zakup: anulowano'],
    ['zwrot-w-toku', 'Zakup: zwrot w toku'],
    ['zwrocono', 'Zakup: zwrócono']
  ].forEach(function (s) {
    PM.route('#/zakup/' + s[0], {
      title: 'Szczegół zakupu', group: G_H, label: s[1], tab: 'historia',
      render: function (ctx) { return renderDetail(ctx, s[0]); }
    });
  });

  /* =====================================================================
     4 ZWROT
     ===================================================================== */
  function defaultRefundPurchase() {
    var p = przyklad('zwrot');
    if (p && PM.canRefund(p)) return p;
    var list = PM.state.zakupy || [];
    for (var i = 0; i < list.length; i++) if (PM.canRefund(list[i])) return list[i];
    return p || list[0] || null;
  }

  function refundInfo(p) {
    var z = p.zwrot || {};
    var zgl = z.zgloszono || PM.today;
    return {
      kwota: z.kwota != null ? z.kwota : p.kwota,
      czesciowy: !!z.czesciowy,
      powod: z.powod || 'nie-skorzystalem',
      zgloszono: zgl,
      przewidywane: z.przewidywane || addDays(zgl, terminDni()),
      zakonczono: z.zakonczono || null
    };
  }

  var PRESETS = {
    '#/zwrot': { powod: null, opis: '', tryb: 'pelna' },
    '#/zwrot/blad': { powod: null, opis: '', tryb: 'pelna', error: true },
    '#/zwrot/czesciowy': { powod: 'nie-skorzystalem', opis: '', tryb: 'czesciowa', kwota: null, czesciowy: true },
    '#/zwrot/wysylanie': { powod: 'nie-skorzystalem', opis: 'Zmiana planów, nie skorzystaliśmy.', tryb: 'pelna', sending: true }
  };

  function partialDefault(p, preset) {
    if (preset.kwota != null) return preset.kwota;
    var ex = PM.state.zwrot && PM.state.zwrot.czesciowyPrzyklad;
    if (preset.czesciowy && ex != null && ex <= p.kwota) return ex;
    return Math.round(p.kwota / 2);
  }

  function renderForm(ctx, preset) {
    var p = ctx.query.id ? PM.purchase(ctx.query.id) : defaultRefundPurchase();
    if (!p) return missing('Zgłoś zwrot');

    if (ctx.query.id && !PM.canRefund(p) && !preset.sending) {
      if (p.status === 'zwrot-w-toku') return renderSent(ctx, p);
      if (p.status === 'zwrocono') return renderDone(ctx, p);
      return renderUnavailable(ctx, p);
    }

    var dis = !!preset.sending;
    var part = preset.tryb === 'czesciowa';
    var kw = partialDefault(p, preset);
    var sum = part ? kw : p.kwota;

    var powody = ((PM.state.zwrot && PM.state.zwrot.powody) || []).map(function (r) {
      var on = preset.powod === r.id;
      return '<label class="radio-row' + (dis ? ' is-disabled' : '') + '">' +
        '<input type="radio" name="zw-powod" value="' + esc(r.id) + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '>' +
        '<span>' + esc(r.label) + '</span></label>';
    }).join('');

    var powodSec = '<section class="sec">' +
      '<div class="sec-h"><span id="zw-powod-l">Powód</span></div>' +
      '<div class="card radio-list' + (preset.error ? ' is-error' : '') + '" role="radiogroup" aria-labelledby="zw-powod-l" data-powody>' + powody + '</div>' +
      '<p class="error-msg" role="alert" data-powod-err' + (preset.error ? '' : ' style="display:none"') + '>' +
        PM.icon('error-warning-line', 16) + '<span>Wybierz powód zwrotu</span></p>' +
      '</section>';

    var opis = preset.opis || '';
    var opisSec = PM.field({
      id: 'zw-opis', label: 'Opis', textarea: true, value: opis,
      placeholder: 'Opcjonalnie, kilka słów', maxlength: 300, disabled: dis,
      labelRight: '<span class="counter" data-count>' + opis.length + '/300</span>'
    });

    var segItems = [
      { value: 'pelna', label: 'Pełna', attrs: dis ? { disabled: true } : null },
      { value: 'czesciowa', label: 'Częściowa', attrs: dis ? { disabled: true } : null }
    ];
    var kwotaSec = '<section class="sec">' +
      '<div class="sec-h"><span>Kwota zwrotu</span><span class="tag">Przykład</span></div>' +
      PM.seg(segItems, preset.tryb, { 'data-seg': 'tryb', 'aria-label': 'Kwota zwrotu' }) +
      '<div class="field" data-partial' + (part ? '' : ' hidden') + '>' +
        '<label class="sr-only" for="zw-kwota">Kwota zwrotu w złotych</label>' +
        '<div class="money" data-money><input id="zw-kwota" type="text" inputmode="decimal" autocomplete="off" value="' + esc(fmtInput(kw)) + '"' + (dis ? ' disabled' : '') + '><span>zł</span></div>' +
        '<p class="error-msg" role="alert" data-kwota-err style="display:none">' + PM.icon('error-warning-line', 16) + '<span></span></p>' +
        '<p class="hint">Maksymalnie ' + PM.zl(p.kwota) + '</p>' +
      '</div>' +
      '</section>';

    var content = '<div class="stack zw" data-zwrot data-id="' + esc(p.id) + '">' +
      summaryCard(p) + powodSec + opisSec + kwotaSec +
      '</div>';

    var cta = '<div class="sum"><span class="sum-label">Do zwrotu</span><span class="sum-val" data-sum>' + PM.zl(sum) + '</span></div>' +
      PM.actions({
        back: PM.purchaseHref(p),
        primary: { label: 'Wyślij zgłoszenie', attrs: { 'data-send': '' }, loading: dis },
        legal: 'Zwrot trafi do weryfikacji. Pieniądze wrócą na konto, z którego płaciłeś BLIK OneClick.'
      });

    return PM.screen({ title: 'Zgłoś zwrot', content: content, cta: cta });
  }

  function finishRefund(p, d) {
    if (!p) return;
    var full = d.tryb !== 'czesciowa';
    p.status = 'zwrot-w-toku';
    p.zwrot = {
      kwota: full ? p.kwota : d.kwota,
      czesciowy: !full,
      powod: d.powod || 'inny',
      opis: d.opis || '',
      zgloszono: PM.today,
      przewidywane: addDays(PM.today, terminDni())
    };
    PM.go('#/zwrot/wyslano?id=' + encodeURIComponent(p.id));
  }

  function mountForm(root, ctx, preset) {
    var form = root.querySelector('[data-zwrot]');
    if (!form) return;
    var p = PM.purchase(form.getAttribute('data-id'));
    if (!p) return;

    var list = form.querySelector('[data-powody]');
    var perr = form.querySelector('[data-powod-err]');
    var partial = form.querySelector('[data-partial]');
    var money = form.querySelector('[data-money]');
    var kin = form.querySelector('#zw-kwota');
    var kerr = form.querySelector('[data-kwota-err]');
    var ta = form.querySelector('#zw-opis');
    var cnt = form.querySelector('[data-count]');
    var sumEl = root.querySelector('[data-sum]');
    var btn = root.querySelector('[data-send]');
    var tryb = preset.tryb;

    function powod() {
      var c = form.querySelector('input[name="zw-powod"]:checked');
      return c ? c.value : null;
    }
    function setPowodErr(on) {
      list.classList.toggle('is-error', !!on);
      perr.style.display = on ? '' : 'none';
    }
    function partialMsg(v) {
      if (isNaN(v) || v <= 0) return 'Podaj kwotę większą niż 0 zł';
      if (v > p.kwota) return 'Maksymalnie ' + PM.zl(p.kwota);
      return null;
    }
    function setKwotaErr(msg) {
      partial.classList.toggle('is-error', !!msg);
      money.classList.toggle('is-error', !!msg);
      kerr.style.display = msg ? '' : 'none';
      kerr.querySelector('span').textContent = msg || '';
    }
    function refreshSum() {
      var v = tryb === 'czesciowa' ? parseAmount(kin.value) : p.kwota;
      if (isNaN(v) || v < 0) v = 0;
      if (sumEl) sumEl.textContent = PM.zl(Math.min(v, p.kwota));
    }
    function setSending() {
      if (btn) {
        btn.classList.add('is-loading');
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
      }
      PM.qsa(form, 'input,textarea,button').forEach(function (el) { el.disabled = true; });
      PM.qsa(form, '.radio-row').forEach(function (el) { el.classList.add('is-disabled'); });
    }

    form.addEventListener('change', function (e) {
      if (e.target && e.target.name === 'zw-powod') setPowodErr(false);
    });

    form.addEventListener('pm:seg', function (e) {
      tryb = e.detail && e.detail.value === 'czesciowa' ? 'czesciowa' : 'pelna';
      partial.hidden = tryb !== 'czesciowa';
      if (tryb === 'czesciowa') {
        try { kin.focus({ preventScroll: true }); } catch (err) {}
      } else {
        setKwotaErr(null);
      }
      refreshSum();
    });

    kin.addEventListener('input', function () {
      var v = String(kin.value).replace(/[^\d,.]/g, '').replace('.', ',');
      var i = v.indexOf(',');
      if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/,/g, '').slice(0, 2);
      v = v.replace(/^0+(?=\d)/, '').slice(0, 9);
      if (kin.value !== v) kin.value = v;
      setKwotaErr(v === '' ? null : partialMsg(parseAmount(v)));
      refreshSum();
    });
    kin.addEventListener('blur', function () {
      var v = parseAmount(kin.value);
      if (kin.value !== '' && !isNaN(v)) kin.value = fmtInput(v);
    });

    if (ta && cnt) {
      ta.addEventListener('input', function () { cnt.textContent = ta.value.length + '/300'; });
    }

    if (btn) {
      btn.addEventListener('click', function () {
        var ok = true;
        var pw = powod();
        if (!pw) {
          setPowodErr(true);
          ok = false;
          try { list.scrollIntoView({ block: 'center', behavior: PM.shot ? 'auto' : 'smooth' }); } catch (err) {}
        }
        var kv = parseAmount(kin.value);
        if (tryb === 'czesciowa') {
          var msg = partialMsg(kv);
          if (msg) { setKwotaErr(msg); ok = false; }
        }
        if (!ok) return;
        var d = { powod: pw, opis: ta ? ta.value.trim() : '', tryb: tryb, kwota: tryb === 'czesciowa' ? kv : p.kwota };
        setSending();
        if (PM.shot) finishRefund(p, d);
        else PM.later(function () { finishRefund(p, d); }, 1400);
      });
    }

    refreshSum();

    /* stan wysyłania otwarty z panelu: po chwili przechodzi dalej */
    if (preset.sending) {
      PM.later(function () {
        finishRefund(p, {
          powod: preset.powod, opis: preset.opis, tryb: preset.tryb,
          kwota: preset.tryb === 'czesciowa' ? partialDefault(p, preset) : p.kwota
        });
      }, 1600);
    }
  }

  /* ---------- wysłano ---------- */
  function renderSent(ctx, p) {
    var info = refundInfo(p);
    var hero = '<div class="status-hero">' +
      '<div class="status-ico">' + PM.icon('refund-2-line', 28) + '</div>' +
      '<h1 class="display">Zgłoszenie wysłane</h1>' +
      PM.statusBadge('zwrot-w-toku') +
      '</div>';

    var steps = ((PM.state.zwrot && PM.state.zwrot.kroki) || []).map(function (s) {
      return '<li>' + esc(s) + '</li>';
    }).join('');
    var next = '<section class="sec"><div class="sec-h"><span>Co dalej</span></div>' +
      '<div class="card pad"><ol class="steps">' + steps + '</ol></div></section>';

    var kv = '<section class="sec"><div class="sec-h"><span>Zgłoszenie</span><span class="tag">Przykład</span></div>' +
      '<div class="card">' + PM.kv([
        { k: 'Do zwrotu', v: PM.zl(info.kwota) + (info.czesciowy ? ', częściowy' : '') },
        { k: 'Powód', v: powodLabel(info.powod) },
        { k: 'Zgłoszono', v: PM.date(info.zgloszono) },
        { k: 'Decyzja do', v: PM.date(info.przewidywane) }
      ]) + '</div></section>';

    return PM.screen({
      title: 'Zgłoszenie wysłane', showTitle: false, cls: 'screen--accent',
      contentCls: 'content--top',
      content: hero + summaryCard(p) + next + kv,
      cta: PM.actions({
        secondary: { label: 'Szczegóły', href: PM.purchaseHref(p) },
        primary: { label: 'Gotowe', href: '#/historia' }
      })
    });
  }

  /* ---------- niedostępny ---------- */
  function renderUnavailable(ctx, p) {
    var hero = '<div class="status-hero">' +
      '<div class="status-ico">' + PM.icon('time-line', 28) + '</div>' +
      '<div class="stack-8"><h1 class="title">Zwrot niedostępny</h1>' +
      '<p class="lead-text">' + (p.terminZwrotu
        ? 'Termin zgłoszenia minął ' + esc(PM.date(p.terminZwrotu)) + '.'
        : 'Dla tego zakupu nie można zgłosić zwrotu.') + '</p></div>' +
      '</div>';
    var help = PM.banner({
      type: 'info', icon: 'customer-service-2-line',
      title: 'Coś poszło nie tak?',
      text: 'Napisz do nas, sprawdzimy zakup.'
    });
    return PM.screen({
      title: 'Zwrot niedostępny', showTitle: false, contentCls: 'content--top',
      content: hero + summaryCard(p, { right: PM.statusInline(p.status) }) + help,
      cta: PM.actions({
        back: PM.purchaseHref(p),
        secondary: { label: 'Napisz do nas', icon: 'customer-service-2-line', attrs: { 'data-toast': 'Pomoc dostępna w pełnej wersji' } }
      })
    });
  }

  /* ---------- zwrócono ---------- */
  function renderDone(ctx, p) {
    var info = refundInfo(p);
    var hero = '<div class="status-hero">' +
      '<div class="status-ico status-ico--ok">' + PM.icon('check-line', 28) + '</div>' +
      '<h1 class="display">Zwrot zakończony</h1>' +
      '<div class="zw-sent-amt"><span class="big-amount">' + PM.zl(info.kwota) + '</span><span class="ex-tag">Przykład</span></div>' +
      '<p class="lead-text">Wróciło na konto, z którego płaciłeś.</p>' +
      '</div>';
    var status = '<section class="sec"><div class="sec-h"><span>Status</span></div>' +
      '<div class="card">' + PM.purchaseTimeline(p) + '</div></section>';
    var kv = '<section class="sec"><div class="sec-h"><span>Zwrot</span></div>' +
      '<div class="card">' + PM.kv([
        { k: 'Powód', v: powodLabel(info.powod) },
        { k: 'Zgłoszono', v: PM.date(info.zgloszono) },
        { k: 'Zakończono', v: PM.date(info.zakonczono || info.przewidywane) },
        { k: 'Metoda', v: 'BLIK OneClick' }
      ]) + '</div></section>';
    return PM.screen({
      title: 'Zwrot zakończony', showTitle: false, cls: 'screen--ok', contentCls: 'content--top',
      content: hero + summaryCard(p, { strike: true, right: PM.statusInline('zwrocono') }) + status + kv,
      cta: PM.actions({
        back: PM.purchaseHref(p),
        primary: { label: 'Wróć do historii', href: '#/historia' }
      })
    });
  }

  /* ---------- rejestracja ---------- */
  PM.route('#/zwrot', {
    title: 'Zgłoś zwrot', group: G_Z, label: 'Zgłoszenie', tab: 'historia',
    render: function (ctx) { return renderForm(ctx, PRESETS['#/zwrot']); },
    mount: function (root, ctx) { mountForm(root, ctx, PRESETS['#/zwrot']); }
  });
  PM.route('#/zwrot/blad', {
    title: 'Zgłoś zwrot', group: G_Z, label: 'Brak powodu', tab: 'historia',
    render: function (ctx) { return renderForm(ctx, PRESETS['#/zwrot/blad']); },
    mount: function (root, ctx) { mountForm(root, ctx, PRESETS['#/zwrot/blad']); }
  });
  PM.route('#/zwrot/czesciowy', {
    title: 'Zgłoś zwrot', group: G_Z, label: 'Kwota częściowa', tab: 'historia',
    render: function (ctx) { return renderForm(ctx, PRESETS['#/zwrot/czesciowy']); },
    mount: function (root, ctx) { mountForm(root, ctx, PRESETS['#/zwrot/czesciowy']); }
  });
  PM.route('#/zwrot/wysylanie', {
    title: 'Zgłoś zwrot', group: G_Z, label: 'Wysyłanie', tab: 'historia',
    render: function (ctx) { return renderForm(ctx, PRESETS['#/zwrot/wysylanie']); },
    mount: function (root, ctx) { mountForm(root, ctx, PRESETS['#/zwrot/wysylanie']); }
  });
  PM.route('#/zwrot/wyslano', {
    title: 'Zgłoszenie wysłane', group: G_Z, label: 'Wysłano', tab: 'historia',
    render: function (ctx) {
      var p = ctx.query.id ? PM.purchase(ctx.query.id) : przyklad('zwrot');
      return p ? renderSent(ctx, p) : missing('Zwrot');
    }
  });
  PM.route('#/zwrot/niedostepny', {
    title: 'Zwrot niedostępny', group: G_Z, label: 'Po terminie', tab: 'historia',
    render: function (ctx) {
      var p = ctx.query.id ? PM.purchase(ctx.query.id) : przyklad('po-terminie');
      return p ? renderUnavailable(ctx, p) : missing('Zwrot');
    }
  });
  PM.route('#/zwrot/zwrocono', {
    title: 'Zwrot zakończony', group: G_Z, label: 'Zwrócono', tab: 'historia',
    render: function (ctx) {
      var p = ctx.query.id ? PM.purchase(ctx.query.id) : przyklad('zwrocono');
      return p ? renderDone(ctx, p) : missing('Zwrot');
    }
  });
})();
