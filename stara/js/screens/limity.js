/* =====================================================================
   Profil płatnika Paymove · prototyp · js/s-limity.js
   Sekcja 6: Limity (9 stanów).

   #/limity                      ogólne: transakcja, okres (miesięczny), potwierdzenie wł., lista per bot
   #/limity/dzienny              okres dzienny
   #/limity/potwierdzenie-wyl    toggle potwierdzenia wyłączony, pole wyszarzone
   #/limity/bot-claude           limity per bot (?bot=chatgpt|grok|perplexity dla innych)
   #/limity/blad-bot             limit bota większy niż ogólny, komunikat przy polu
   #/limity/blad-transakcja      limit transakcji większy niż limit okresu
   #/limity/zapisano             widok ogólny + toast „Zapisano limity”
   #/potwierdzenie               sheet nad #/historia: Claude chce zapłacić 240,00 zł
   #/potwierdzenie/zatwierdzono  sukces, zakup trafia do historii

   Render czysto z hasha (warianty nadpisują widok, nie stan).
   Mutacje PM.state tylko po akcji użytkownika (Zapisz, zatwierdzenie).
   Słuchacze zdarzeń wiązane do elementu .screen / .sheet-layer,
   które są wymieniane przy każdym renderze (bez wycieków).
   ===================================================================== */
import { PM } from '../core/index.js';
import { DATA } from '../data.js';

var GROUP = 'Limity';
var PID = 'z-2611-potw';

  /* ---------- pomocnicze ---------- */
function L() { return PM.state.limity || {}; }
function rng(key) {
  var z = (L().zakresy || {})[key] || {};
  return { min: z.min != null ? z.min : 0, max: z.max != null ? z.max : 1000, step: z.step || 10 };
}
function assign(a, b) {
  var o = {};
  Object.keys(a || {}).forEach(function (k) { o[k] = a[k]; });
  Object.keys(b || {}).forEach(function (k) { o[k] = b[k]; });
  return o;
}
function digits(inp) {
  var d = String(inp.value).replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 7);
  if (inp.value !== d) inp.value = d;
  return d === '' ? 0 : Number(d);
}
function chev() {
  return '<img class="row-chev" src="assets/icons/arrow-right-s-line.svg" alt="" aria-hidden="true">';
}
function blikTile() {
  return '<span class="tile tile--wide pm-blik"><img src="assets/logos/blik-logo.svg" alt="BLIK"></span>';
}
function screenEl(root) {
  return root.querySelector('[data-view] > .screen') || root.querySelector('.screen');
}
function botLimitHref(id) {
  return id === 'claude' ? '#/limity/bot-claude' : '#/limity/bot-claude?bot=' + encodeURIComponent(id);
}

/* =====================================================================
   Ekran ogólny
   ===================================================================== */
function mainView(over) {
  var l = L();
  return assign({
    okres: l.okres || 'miesieczny',
    trans: l.transakcja,
    miesieczny: l.miesieczny,
    dzienny: l.dzienny,
    potw: !!l.potwierdzenie,
    prog: l.potwierdzeniePowyzej
  }, over);
}

function periodLabel(okres) { return okres === 'dzienny' ? 'dzienny' : 'miesięczny'; }

function checkMain(v) {
  var per = Number(v[v.okres]) || 0;
  var res = { trans: null, bots: {}, any: false };
  if (Number(v.trans) > per) {
    res.trans = 'Więcej niż limit ' + periodLabel(v.okres) + ' ' + PM.zlInt(per);
    res.any = true;
  }
  if (v.okres === 'miesieczny') {
    (PM.state.boty || []).forEach(function (b) {
      if ((b.limitMies || 0) > per) { res.bots[b.id] = true; res.any = true; }
    });
  }
  return res;
}

function periodField(v) {
  var d = v.okres === 'dzienny';
  var r = rng(d ? 'dzienny' : 'miesieczny');
  var spent = d ? L().wydanoDzis : L().wydanoMies;
  return PM.amountField({
    id: 'l-okres', bare: true,
    label: d ? 'Na dzień' : 'Na miesiąc',
    value: v[v.okres], min: r.min, max: r.max, step: r.step,
    hint: (d ? 'Wydano dziś ' : 'Wydano w tym miesiącu ') + PM.zl(spent || 0)
  });
}

function botMeta(b, over) {
  return over ? 'Więcej niż limit ogólny' : 'Na transakcję ' + PM.zlInt(b.limitTrans || 0);
}

function botRows(err) {
  var list = PM.state.boty || [];
  if (!list.length) {
    return '<div class="row"><div class="grow meta">Brak połączonych botów</div></div>';
  }
  return list.map(function (b) {
    var over = !!err.bots[b.id];
    return '<a class="row pm-lim-bot" href="' + PM.esc(botLimitHref(b.id)) + '" data-lim-bot="' + PM.esc(b.id) + '">' +
      PM.botLogo(b.id, 32) +
      '<div class="grow"><div class="name">' + PM.esc(b.nazwa) + '</div>' +
      '<div class="meta' + (over ? ' text-err' : '') + '" data-lim-bot-meta>' + PM.esc(botMeta(b, over)) + '</div></div>' +
      '<span class="val">' + PM.zlInt(b.limitMies || 0) + '</span>' + chev() +
      '</a>';
  }).join('');
}

function renderMain(over) {
  var v = mainView(over);
  var err = checkMain(v);
  var rt = rng('transakcja');
  var rp = rng('potwierdzenie');

  var potw =
    '<div class="lim divide">' +
      '<div class="tog"><span class="name" id="t-potw-lbl">Potwierdzaj powyżej</span>' +
        PM.toggle('t-potw', v.potw, { labelledby: 't-potw-lbl', target: 'm-potw' }) + '</div>' +
      '<div class="money' + (v.potw ? '' : ' off is-disabled') + '" id="m-potw">' +
        '<input type="text" inputmode="numeric" autocomplete="off" value="' + Math.round(v.prog || 0) + '" aria-label="Próg potwierdzenia" data-max="' + rp.max + '"' + (v.potw ? '' : ' disabled') + '>' +
        '<span>zł</span></div>' +
      '<p class="hint">Powyżej tej kwoty zatwierdzasz zakup w aplikacji banku.</p>' +
    '</div>';

  var content =
    '<section class="sec">' +
      '<div class="sec-h"><span>Ogólne</span></div>' +
      '<div class="card">' +
        PM.amountField({
          id: 'l-trans', label: 'Na jedną transakcję', value: v.trans,
          min: rt.min, max: rt.max, step: rt.step, error: err.trans
        }) +
        '<div class="lim divide pm-okres">' +
          PM.seg([{ value: 'dzienny', label: 'Dzienny' }, { value: 'miesieczny', label: 'Miesięczny' }], v.okres, { 'data-seg': 'okres', 'aria-label': 'Okres limitu' }) +
          periodField(v) +
        '</div>' +
        potw +
      '</div>' +
    '</section>' +
    '<section class="sec">' +
      '<div class="sec-h"><span>Dla botów</span><span class="count">miesięcznie</span></div>' +
      '<div class="card" data-lim-bots>' + botRows(err) + '</div>' +
    '</section>';

  return PM.screen({
    title: 'Limity',
    content: content,
    cta: PM.actions({
      back: true,
      primary: { label: 'Zapisz', attrs: { 'data-lim-save': '' }, disabled: err.any }
    })
  });
}

function mountMain(root, over) {
  var screen = screenEl(root);
  if (!screen) return;
  var d = mainView(over);
  var save = screen.querySelector('[data-lim-save]');

  function apply() {
    var res = checkMain(d);
    PM.setAmountError(screen, 'l-trans', res.trans);
    PM.qsa(screen, '[data-lim-bot]').forEach(function (row) {
      var b = PM.bot(row.getAttribute('data-lim-bot'));
      var m = row.querySelector('[data-lim-bot-meta]');
      if (!b || !m) return;
      var o = !!res.bots[b.id];
      m.textContent = botMeta(b, o);
      m.classList.toggle('text-err', o);
    });
    if (save) save.disabled = res.any;
    return res;
  }

  function onAmt(id, val) {
    if (id === 'l-trans') d.trans = val;
    else if (id === 'l-okres') d[d.okres] = val;
    apply();
  }

  PM.bindAmount(screen, onAmt);

  screen.addEventListener('pm:seg', function (e) {
    if (!e.detail || e.detail.seg !== 'okres') return;
    d.okres = e.detail.value === 'dzienny' ? 'dzienny' : 'miesieczny';
    var old = screen.querySelector('[data-amount="l-okres"]');
    if (old) {
      var tmp = document.createElement('div');
      tmp.innerHTML = periodField(d);
      old.parentNode.replaceChild(tmp.firstElementChild, old);
      PM.bindAmount(screen, onAmt);
    }
    apply();
  });

  screen.addEventListener('pm:toggle', function (e) {
    if (e.detail && e.detail.id === 't-potw') d.potw = !!e.detail.on;
  });

  var prog = screen.querySelector('#m-potw input');
  if (prog) {
    prog.addEventListener('input', function () { d.prog = digits(prog); });
    prog.addEventListener('focus', function () { try { prog.select(); } catch (er) {} });
    prog.addEventListener('blur', function () { if (prog.value === '') { prog.value = '0'; d.prog = 0; } });
  }

  if (save) {
    save.addEventListener('click', function () {
      if (apply().any) return;
      var l = L();
      l.transakcja = d.trans;
      l.okres = d.okres;
      l.miesieczny = d.miesieczny;
      l.dzienny = d.dzienny;
      l.potwierdzenie = d.potw;
      l.potwierdzeniePowyzej = d.prog;
      PM.go('#/limity/zapisano');
    });
  }

  apply();
}

/* =====================================================================
   Limity per bot
   ===================================================================== */
function checkBot(v) {
  var l = L();
  var res = { mies: null, trans: null, any: false };
  if (l.okres === 'miesieczny' && v.mies > (l.miesieczny || 0)) {
    res.mies = 'Więcej niż limit ogólny ' + PM.zlInt(l.miesieczny);
  }
  if (v.trans > v.mies) res.trans = 'Więcej niż limit miesięczny bota';
  else if (v.trans > (l.transakcja || 0)) res.trans = 'Więcej niż limit ogólny na transakcję ' + PM.zlInt(l.transakcja);
  res.any = !!(res.mies || res.trans);
  return res;
}

function botId(ctx) {
  var q = (ctx && ctx.query && ctx.query.bot) || 'claude';
  return String(q);
}

function progressHtml(spent, limit) {
  var pct = limit > 0 ? Math.min(100, Math.max(0, Math.round(spent / limit * 100))) : 0;
  var over = limit > 0 && spent >= limit;
  return '<div class="progress' + (over ? ' is-over' : pct >= 80 ? ' is-warn' : '') + '" data-bot-prog><i style="width:' + pct + '%"></i></div>' +
    '<div class="progress-meta' + (over ? ' is-over' : '') + '" data-bot-prog-meta><span>limit ' + PM.zlInt(limit) + '/mies.</span><span>' + (over ? 'limit wykorzystany' : pct + '%') + '</span></div>';
}

function renderBot(ctx, over) {
  var id = botId(ctx);
  var b = PM.bot(id);
  if (!b) {
    return PM.screen({
      title: 'Limity bota', back: '#/limity',
      content: PM.emptyState({
        icon: 'robot-2-line', title: 'Bot odłączony', text: 'Ten bot nie jest już połączony.',
        cta: { label: 'Wróć do limitów', href: '#/limity' }
      })
    });
  }
  var v = assign({ mies: b.limitMies || 0, trans: b.limitTrans || 0 }, over);
  var e = checkBot(v);
  var r = rng('bot');
  var l = L();
  var hint = l.okres === 'miesieczny'
    ? 'Limit ogólny: ' + PM.zlInt(l.miesieczny) + ' miesięcznie'
    : 'Limit ogólny: ' + PM.zlInt(l.dzienny) + ' dziennie';

  var content =
    '<div class="pm-bot-head">' + PM.botLogo(b.id, 64) +
      '<div class="stack-4"><h1 class="title">' + PM.esc(b.nazwa) + '</h1><p class="meta">Limity bota</p></div>' +
    '</div>' +
    '<div class="card pad">' +
      '<div class="sum"><span class="sum-label">Wydano w tym miesiącu</span><span class="sum-val">' + PM.zl(b.wydal || 0) + '</span></div>' +
      progressHtml(b.wydal || 0, v.mies) +
    '</div>' +
    '<section class="sec">' +
      '<div class="sec-h"><span>Limity</span></div>' +
      '<div class="card">' +
        PM.amountField({ id: 'b-mies', label: 'Na miesiąc', value: v.mies, min: r.min, max: r.max, step: r.step, error: e.mies, hint: hint }) +
        PM.amountField({ id: 'b-trans', label: 'Na jedną transakcję', value: v.trans, min: r.min, max: r.max, step: r.step, error: e.trans, divide: true }) +
      '</div>' +
    '</section>' +
    '<div class="card">' +
      '<a class="row" href="#/bot/' + PM.esc(b.id) + '">' +
        '<div class="thumb thumb--sm">' + PM.icon('shield-check-line', 18) + '</div>' +
        '<div class="grow name">Uprawnienia i zakupy</div>' + chev() +
      '</a>' +
    '</div>';

  return PM.screen({
    title: 'Limity ' + b.nazwa, showTitle: false, back: '#/limity',
    content: content,
    cta: PM.actions({
      back: '#/limity',
      primary: { label: 'Zapisz', attrs: { 'data-bot-save': '', 'data-bot-id': b.id }, disabled: e.any }
    })
  });
}

function mountBot(root, ctx, over) {
  var screen = screenEl(root);
  var b = PM.bot(botId(ctx));
  if (!screen || !b) return;
  var v = assign({ mies: b.limitMies || 0, trans: b.limitTrans || 0 }, over);
  var save = screen.querySelector('[data-bot-save]');

  function apply() {
    var e = checkBot(v);
    PM.setAmountError(screen, 'b-mies', e.mies);
    PM.setAmountError(screen, 'b-trans', e.trans);
    var p = screen.querySelector('[data-bot-prog]');
    var pm = screen.querySelector('[data-bot-prog-meta]');
    if (p && pm) {
      var tmp = document.createElement('div');
      tmp.innerHTML = progressHtml(b.wydal || 0, v.mies);
      p.parentNode.replaceChild(tmp.children[0], p);
      pm.parentNode.replaceChild(tmp.children[0], pm);
    }
    if (save) save.disabled = e.any;
    return e;
  }

  PM.bindAmount(screen, function (id, val) {
    if (id === 'b-mies') v.mies = val;
    else if (id === 'b-trans') v.trans = val;
    apply();
  });

  if (save) {
    save.addEventListener('click', function () {
      if (apply().any) return;
      b.limitMies = v.mies;
      b.limitTrans = v.trans;
      PM.go('#/limity/zapisano');
    });
  }
  apply();
}

/* =====================================================================
   Potwierdzenie płatności (sheet nad historią)
   ===================================================================== */
function potw() { return PM.state.potwierdzenie || {}; }

function renderPotwierdzenie() {
  var p = potw();
  var bot = p.bot || 'claude';
  var name = PM.botName(bot);
  var meta = [p.miejsce, p.tablica].filter(Boolean).join(' · ');
  return '' +
    '<div class="pm-sheet-top"><span class="eyebrow eyebrow--s">Prośba o płatność</span></div>' +
    '<div class="sheet-head">' +
      '<div class="duo">' + PM.botLogo(bot, 44) +
        '<span class="duo-dots"><i></i><i></i><i></i></span>' +
        '<span class="tile"><img src="assets/logos/sygnet.svg" alt="Paymove"></span>' +
      '</div>' +
      '<h2 class="h-sheet">' + PM.esc(name) + ' prosi o ' + PM.zl(p.kwota) + '</h2>' +
    '</div>' +
    '<div class="card">' +
      '<div class="row">' +
        '<div class="thumb">' + PM.icon(PM.typeIcon(p.typ || 'parking'), 20) + '</div>' +
        '<div class="grow"><div class="name">' + PM.esc(p.produkt) + '</div>' +
          '<div class="meta">' + PM.esc(meta) + '</div></div>' +
      '</div>' +
    '</div>' +
    PM.banner({ type: 'warn', title: 'Powyżej Twojego progu ' + PM.zl(p.prog), text: 'Dlatego prosimy o Twoje potwierdzenie.' }) +
    '<div class="card pm-bank" data-bank role="button" tabindex="0" aria-label="Zatwierdź w aplikacji">' +
      '<div class="row">' +
        '<div class="thumb">' + PM.icon('smartphone-line', 20) + '</div>' +
        '<div class="grow"><div class="name">Zatwierdź w aplikacji</div>' +
          '<div class="meta pm-inline">' + blikTile() + 'bez kodu</div></div>' +
        PM.spinner() +
      '</div>' +
    '</div>' +
    '<div class="sheet-actions">' +
      PM.btn('Odrzuć', { variant: 'secondary', block: true, attrs: { 'data-reject': '' } }) +
    '</div>';
}

function mountPotwierdzenie(root) {
  var layer = root.querySelector('.sheet-layer[data-route-sheet]');
  if (!layer) return;
  var bank = layer.querySelector('[data-bank]');
  function approve() { PM.go('#/potwierdzenie/zatwierdzono'); }
  if (bank) {
    bank.addEventListener('click', approve);
    bank.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); approve(); }
    });
  }
  var rej = layer.querySelector('[data-reject]');
  if (rej) {
    rej.addEventListener('click', function () {
      PM.go('#/historia');
      PM.toast('Płatność odrzucona', { icon: 'bold-close-circle' });
    });
  }
  /* symulacja: bank potwierdza po chwili (w trybie shot nie startuje) */
  PM.later(approve, 5000);
}

function approvedPurchase() {
  var p = potw();
  return {
    id: PID, typ: p.typ || 'parking', nazwa: p.produkt, opis: '24 h',
    tablica: p.tablica, miejsce: p.miejsce,
    kwota: p.kwota, data: p.data || PM.today, godzina: p.godzina || '10:04',
    status: 'zaplacono', bot: p.bot || 'claude', terminZwrotu: '2026-11-29',
    nrTransakcji: p.nrTransakcji, metoda: 'BLIK bez kodu'
  };
}

function renderZatwierdzono() {
  var z = PM.purchase(PID) || approvedPurchase();
  var content =
    '<div class="status-hero">' +
      '<div class="status-ico status-ico--ok">' + PM.icon('check-line', 28) + '</div>' +
      '<h1 class="display">Zapłacono</h1>' +
      '<p class="lead-text">Płatność zatwierdzona w aplikacji banku.</p>' +
    '</div>' +
    '<section class="sec">' +
      '<div class="sec-h"><span>Zakup</span></div>' +
      PM.purchaseRow(z) +
    '</section>' +
    '<div class="card">' +
      PM.kv([
        { k: 'Metoda', v: '<span class="pm-inline">' + blikTile() + 'bez kodu</span>', html: true },
        { k: 'Potwierdzenie', v: 'W aplikacji banku' },
        { k: 'Data', v: PM.date(z.data) + ', ' + (z.godzina || '') },
        { k: 'Nr transakcji', v: z.nrTransakcji || '', mono: true }
      ]) +
    '</div>';
  return PM.screen({
    title: 'Zapłacono', showTitle: false, cls: 'screen--ok', contentCls: 'content--top',
    content: content,
    cta: PM.actions({ primary: { label: 'Zobacz w historii', href: '#/historia' } })
  });
}

function mountZatwierdzono() {
  if (PM.purchase(PID)) return;
  var z = approvedPurchase();
  PM.state.zakupy = PM.state.zakupy || [];
  PM.state.zakupy.unshift(z);
  var b = PM.bot(z.bot);
  if (b) {
    b.wydal = (b.wydal || 0) + (z.kwota || 0);
    b.ostatnio = 'dziś';
    b.ostatnioData = z.data;
    b.zakupyMies = (b.zakupyMies || 0) + 1;
  }
}

/* =====================================================================
   Rejestracja stanów (kolejność z wspolne.md)
   ===================================================================== */
function mainRoute(hash, label, over, extra) {
  var def = {
    title: 'Limity', group: GROUP, label: label, tab: 'limity',
    render: function () { return renderMain(over); },
    mount: function (root) { mountMain(root, over); }
  };
  if (extra) Object.keys(extra).forEach(function (k) { def[k] = extra[k]; });
  PM.route(hash, def);
}

mainRoute('#/limity', 'Ogólne, okres miesięczny', { okres: 'miesieczny' });
mainRoute('#/limity/dzienny', 'Okres dzienny', { okres: 'dzienny' });
mainRoute('#/limity/potwierdzenie-wyl', 'Potwierdzenie wyłączone', { okres: 'miesieczny', potw: false });

PM.route('#/limity/bot-claude', {
  title: 'Limity bota', group: GROUP, label: 'Limity Claude', tab: 'limity',
  render: function (ctx) { return renderBot(ctx, null); },
  mount: function (root, ctx) { mountBot(root, ctx, null); }
});

PM.route('#/limity/blad-bot', {
  title: 'Limity bota', group: GROUP, label: 'Błąd: limit bota', tab: 'limity',
  render: function () { return renderBot({ query: { bot: 'claude' } }, { mies: 1200 }); },
  mount: function (root) { mountBot(root, { query: { bot: 'claude' } }, { mies: 1200 }); }
});

mainRoute('#/limity/blad-transakcja', 'Błąd: limit transakcji', { okres: 'miesieczny', trans: 1200 });
mainRoute('#/limity/zapisano', 'Zapisano', null, { toast: 'Zapisano limity' });

PM.route('#/potwierdzenie', {
  title: 'Potwierdź płatność', group: GROUP, label: 'Prośba o potwierdzenie',
  sheet: true, base: '#/historia',
  render: renderPotwierdzenie,
  mount: mountPotwierdzenie
});

PM.route('#/potwierdzenie/zatwierdzono', {
  title: 'Zapłacono', group: GROUP, label: 'Zatwierdzono', tab: 'historia',
  render: renderZatwierdzono,
  mount: mountZatwierdzono
});
