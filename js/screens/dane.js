/* =====================================================================
   Profil płatnika Paymove · prototyp · js/s-dane.js
   Sekcja „Moje dane” (tab dane), 12 stanów:
     #/dane, #/dane/niepotwierdzony, #/dane/adres, #/dane/adres-blad,
     #/dane/numer-dodaj, #/dane/numer-blad, #/dane/numer-duplikat,
     #/dane/numer-usun (sheet, base #/dane), #/dane/bez-numerow,
     #/dane/mail-zmien, #/dane/mail-kod, #/dane/zapisano
   Zależności: js/data.js, js/core.js (API PM).
   ===================================================================== */
import { PM } from '../core/index.js';
import { DATA } from '../data.js';

var G = 'Moje dane';
var TAB = 'dane';
var PLATE_RE = /^[A-Z]{2,3} ?[A-Z0-9]{4,5}$/;
var KOD_RE = /^\d{2}-\d{3}$/;
var MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var esc = PM.esc;

  /* ---------- pomocnicze ---------- */
function normPlate(v) {
  return String(v || '').toUpperCase().replace(/\s+/g, ' ').trim();
}
function keyPlate(v) {
  return normPlate(v).replace(/\s/g, '');
}
function formatPlate(v) {
  var n = normPlate(v);
  if (n.indexOf(' ') !== -1) return n;
  var a3 = n.slice(0, 3), r3 = n.slice(3);
  if (/^[A-Z]{3}$/.test(a3) && r3.length >= 4 && r3.length <= 5) return a3 + ' ' + r3;
  return n.slice(0, 2) + ' ' + n.slice(2);
}
function hasPlate(list, v) {
  var k = keyPlate(v);
  for (var i = 0; i < (list || []).length; i++) if (keyPlate(list[i]) === k) return true;
  return false;
}
function plateError(v, list) {
  var n = normPlate(v);
  if (!n) return 'Wpisz numer rejestracyjny';
  if (!PLATE_RE.test(n)) return 'Sprawdź format, np. GD 12345';
  if (hasPlate(list, n)) return 'Ten numer już jest na liście';
  return null;
}

function syncPola(s) {
  (s.pola || []).forEach(function (p) {
    if (p.id === 'imie') p.wartosc = ((s.user.imie || '') + ' ' + (s.user.nazwisko || '')).trim();
    if (p.id === 'mail') p.wartosc = s.user.mail;
    if (p.id === 'adres') p.wartosc = s.adres.ulica + ', ' + s.adres.kod + ' ' + s.adres.miasto;
    if (p.id === 'tablice') p.wartosc = (s.tablice || []).join(', ');
  });
}

function botsLabel(n) {
  if (n === 1) return '1 połączony';
  var d = n % 10, h = n % 100;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return n + ' połączone';
  return n + ' połączonych';
}

function errP(id, msg) {
  return '<p class="error-msg" role="alert" data-err="' + esc(id) + '"' + (msg ? '' : ' hidden') + '>' +
    PM.icon('error-warning-line', 16) + '<span>' + esc(msg || '') + '</span></p>';
}

function showErr(root, id, msg) {
  var f = root.querySelector('[data-field="' + id + '"]');
  if (f) f.classList.toggle('is-error', !!msg);
  var inp = document.getElementById(id);
  if (inp) {
    if (msg) inp.setAttribute('aria-invalid', 'true');
    else inp.removeAttribute('aria-invalid');
  }
  var e = root.querySelector('[data-err="' + id + '"]');
  if (e) {
    e.hidden = !msg;
    var sp = e.querySelector('span');
    if (sp) sp.textContent = msg || '';
  }
}

function fld(o) {
  var at = {};
  var src = o.attrs || {};
  Object.keys(src).forEach(function (k) { at[k] = src[k]; });
  if (o.error) at['aria-invalid'] = 'true';
  return '<div class="stack-8">' +
    PM.field({
      id: o.id, label: o.label, value: o.value, placeholder: o.placeholder,
      type: o.type, mono: o.mono, inputmode: o.inputmode, autocomplete: o.autocomplete,
      maxlength: o.maxlength, autofocus: o.autofocus, attrs: at,
      cls: o.error ? 'is-error' : ''
    }) +
    errP(o.id, o.error) +
    (o.hint ? '<p class="hint">' + esc(o.hint) + '</p>' : '') +
    '</div>';
}

function onEnter(root, fn) {
  PM.qsa(root, '.content input').forEach(function (i) {
    i.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); fn(); }
    });
  });
}

function bindSave(root, fn) {
  var b = root.querySelector('[data-save]');
  if (b) b.addEventListener('click', function (e) { e.preventDefault(); fn(); });
  onEnter(root, fn);
}

/* ---------- ekran domyślny ---------- */
function daneScreen(ctx, o) {
  o = o || {};
  var s = ctx.state, u = s.user || {}, a = s.adres || {};
  var confirmed = o.unconfirmed ? false : u.mailPotwierdzony !== false;
  var plates = o.noPlates ? [] : (s.tablice || []);
  var bots = s.boty || [];
  var name = ((u.imie || '') + ' ' + (u.nazwisko || '')).trim();

  var badge = confirmed
    ? '<span class="badge badge--ok">' + PM.icon('check-line', 14) + 'Potwierdzony</span>'
    : '<span class="badge badge--pending"><span class="dot"></span>Niepotwierdzony</span>';

  var profile =
    '<div class="card pad profile">' +
      '<div class="avatar" aria-hidden="true">' + esc(PM.initials(u)) + '</div>' +
      '<div class="pstack grow">' +
        '<div class="pname">' + esc(name || 'Bez imienia') + '</div>' +
        '<div class="meta ellipsis dn-mail">' + esc(u.mail) + '</div>' +
        '<div class="dn-badges">' + badge +
          '<a class="textbtn" href="#/dane/mail-zmien">Zmień mail</a>' +
        '</div>' +
      '</div>' +
    '</div>';

  var banner = confirmed ? '' :
    '<div class="banner banner--warn dn-banner" role="alert">' +
      PM.icon('error-warning-line', 20) +
      '<div class="grow">' +
        '<div><span class="banner-title">Potwierdź mail</span>' +
        '<span class="banner-text">Bez tego nie wyślemy Ci potwierdzeń zakupów.</span></div>' +
        PM.btn('Potwierdź mail', { variant: 'primary', sm: true, href: '#/dane/mail-kod?cel=potwierdz' }) +
      '</div>' +
    '</div>';

  var adres =
    '<section class="sec">' +
      '<div class="sec-h"><span>Adres</span></div>' +
      '<div class="card"><div class="row">' +
        '<div class="thumb">' + PM.icon('map-pin-line', 20) + '</div>' +
        '<div class="grow"><div class="name ellipsis">' + esc(a.ulica) + '</div>' +
        '<div class="meta">' + esc(a.kod) + ' ' + esc(a.miasto) + '</div></div>' +
        '<a class="chip" href="#/dane/adres">Zmień</a>' +
      '</div></div>' +
    '</section>';

  var platesBody;
  if (!plates.length) {
    platesBody = '<div class="card dn-empty">' + PM.emptyState({
      icon: 'car-line',
      title: 'Brak numerów',
      text: 'Dodaj numer, a bot opłaci za Ciebie parking.',
      cta: { label: 'Dodaj numer', href: '#/dane/numer-dodaj', variant: 'secondary', icon: 'add-line' }
    }) + '</div>';
  } else {
    platesBody = '<div class="card">' +
      plates.map(function (p) {
        return '<div class="row">' +
          '<div class="thumb">' + PM.icon('car-line', 20) + '</div>' +
          '<div class="grow plate">' + esc(p) + '</div>' +
          '<a class="textbtn" href="#/dane/numer-usun?nr=' + encodeURIComponent(p) + '" aria-label="Usuń ' + esc(p) + '">Usuń</a>' +
        '</div>';
      }).join('') +
      '<a class="row" href="#/dane/numer-dodaj">' +
        '<div class="thumb">' + PM.icon('add-line', 20) + '</div>' +
        '<div class="grow name">Dodaj numer</div>' +
        '<img class="row-chev" src="assets/icons/arrow-right-s-line.svg" alt="" aria-hidden="true">' +
      '</a>' +
    '</div>';
  }
  var platesSec =
    '<section class="sec">' +
      '<div class="sec-h"><span>Numery rejestracyjne</span><span class="count">' + plates.length + '</span></div>' +
      platesBody +
    '</section>';

  var botsRow = bots.length
    ? '<div class="dn-logos">' + bots.map(function (b) { return PM.botLogo(b.id, 32); }).join('') + '</div>' +
      '<div class="grow meta">' + esc(botsLabel(bots.length)) + '</div>'
    : '<div class="thumb thumb--sm">' + PM.icon('robot-2-line', 20) + '</div>' +
      '<div class="grow meta">Brak połączonych agentów</div>';
  var botsSec =
    '<section class="sec">' +
      '<div class="sec-h"><span>Połączone boty</span><a href="#/boty">Zarządzaj</a></div>' +
      '<div class="card"><a class="row" href="#/boty" aria-label="Połączone boty">' +
        botsRow +
        '<img class="row-chev" src="assets/icons/arrow-right-s-line.svg" alt="" aria-hidden="true">' +
      '</a></div>' +
    '</section>';

  return PM.screen({
    title: 'Moje dane',
    content: profile + banner + adres + platesSec + botsSec,
    cta: PM.btn('Wyloguj', { variant: 'secondary', icon: 'logout-box-r-line', block: true, href: '#/login' })
  });
}

/* ---------- adres ---------- */
function adresScreen(ctx, o) {
  o = o || {};
  var a = ctx.state.adres || {};
  var v = o.values || a;
  var kodErr = o.kodError || null;
  var content =
    '<p class="lead-text">Użyjemy go przy zakupach, które wymagają adresu.</p>' +
    fld({ id: 'dn-ulica', label: 'Ulica i numer', value: v.ulica, placeholder: 'np. ul. Długa 12/4', autocomplete: 'street-address' }) +
    '<div class="stack-8">' +
      '<div class="input-row">' +
        PM.field({
          id: 'dn-kod', label: 'Kod', value: v.kod, placeholder: '00-000',
          inputmode: 'numeric', autocomplete: 'postal-code', maxlength: 6,
          autofocus: !!kodErr, cls: kodErr ? 'is-error' : '',
          attrs: kodErr ? { 'aria-invalid': 'true' } : null
        }) +
        PM.field({ id: 'dn-miasto', label: 'Miasto', value: v.miasto, placeholder: 'np. Gdańsk', autocomplete: 'address-level2' }) +
      '</div>' +
      errP('dn-kod', kodErr) +
      errP('dn-miasto', null) +
    '</div>';
  return PM.screen({
    title: 'Adres',
    content: content,
    cta: PM.actions({ back: '#/dane', primary: { label: 'Zapisz', attrs: { 'data-save': '' } } })
  });
}

function mountAdres(root, ctx) {
  var ul = root.querySelector('#dn-ulica');
  var kod = root.querySelector('#dn-kod');
  var mi = root.querySelector('#dn-miasto');
  if (!ul || !kod || !mi) return;

  kod.addEventListener('input', function () {
    var d = String(kod.value).replace(/\D/g, '').slice(0, 5);
    kod.value = d.length > 2 ? d.slice(0, 2) + '-' + d.slice(2) : d;
    showErr(root, 'dn-kod', null);
  });
  ul.addEventListener('input', function () { showErr(root, 'dn-ulica', null); });
  mi.addEventListener('input', function () { showErr(root, 'dn-miasto', null); });

  bindSave(root, function () {
    var vu = String(ul.value).trim(), vk = String(kod.value).trim(), vm = String(mi.value).trim();
    var eu = vu ? null : 'Wpisz ulicę i numer';
    var ek = !vk ? 'Wpisz kod pocztowy' : (KOD_RE.test(vk) ? null : 'Kod w formacie 00-000');
    var em = vm ? null : 'Wpisz miasto';
    showErr(root, 'dn-ulica', eu);
    showErr(root, 'dn-kod', ek);
    showErr(root, 'dn-miasto', em);
    var first = eu ? ul : ek ? kod : em ? mi : null;
    if (first) { first.focus(); return; }
    var s = ctx.state;
    s.adres.ulica = vu;
    s.adres.kod = vk;
    s.adres.miasto = vm;
    syncPola(s);
    PM.go('#/dane/zapisano');
  });
}

/* ---------- numer rejestracyjny ---------- */
function numerScreen(ctx, o) {
  o = o || {};
  var list = ctx.state.tablice || [];
  var chips = list.length
    ? '<section class="sec"><div class="sec-h"><span>Na liście</span><span class="count">' + list.length + '</span></div>' +
      '<div class="dn-chips">' + list.map(function (p) {
        return '<span class="chip">' + esc(p) + '</span>';
      }).join('') + '</div></section>'
    : '';
  var content =
    '<p class="lead-text">Bot użyje go do opłacenia parkingu i usług dla auta.</p>' +
    fld({
      id: 'dn-numer', label: 'Numer rejestracyjny', value: o.value || '',
      placeholder: 'np. GD 12345', mono: true, maxlength: 9, autofocus: true,
      error: o.error, hint: '2 lub 3 litery, potem 4 lub 5 znaków',
      attrs: { autocapitalize: 'characters', spellcheck: 'false', autocomplete: 'off' }
    }) +
    chips;
  return PM.screen({
    title: 'Dodaj numer',
    content: content,
    cta: PM.actions({ back: '#/dane', primary: { label: 'Dodaj', attrs: { 'data-save': '' } } })
  });
}

function mountNumer(root, ctx) {
  var inp = root.querySelector('#dn-numer');
  if (!inp) return;
  inp.addEventListener('input', function () {
    var pos = inp.selectionStart;
    var up = String(inp.value).toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    if (up !== inp.value) {
      inp.value = up;
      try { inp.setSelectionRange(pos, pos); } catch (e) {}
    }
    showErr(root, 'dn-numer', null);
  });
  bindSave(root, function () {
    var s = ctx.state;
    var err = plateError(inp.value, s.tablice);
    showErr(root, 'dn-numer', err);
    if (err) { inp.focus(); return; }
    s.tablice = (s.tablice || []).concat([formatPlate(inp.value)]);
    syncPola(s);
    PM.go('#/dane/zapisano');
  });
}

/* ---------- mail ---------- */
function mailZmienScreen(ctx) {
  var u = ctx.state.user || {};
  var content =
    '<p class="lead-text">Wyślemy kod na nowy adres.</p>' +
    '<div class="card"><div class="row">' +
      '<div class="thumb">' + PM.icon('mail-line', 20) + '</div>' +
      '<div class="grow"><div class="meta">Obecny</div><div class="name ellipsis">' + esc(u.mail) + '</div></div>' +
    '</div></div>' +
    fld({
      id: 'dn-mail', label: 'Nowy mail', value: '', type: 'email',
      placeholder: 'np. anna.k@example.com', inputmode: 'email', autocomplete: 'email',
      autofocus: true, hint: 'Do czasu potwierdzenia logujesz się obecnym mailem.',
      attrs: { autocapitalize: 'off', spellcheck: 'false' }
    });
  return PM.screen({
    title: 'Zmień mail',
    content: content,
    cta: PM.actions({ back: '#/dane', primary: { label: 'Wyślij kod', attrs: { 'data-save': '' } } })
  });
}

function mountMailZmien(root, ctx) {
  var inp = root.querySelector('#dn-mail');
  if (!inp) return;
  inp.addEventListener('input', function () { showErr(root, 'dn-mail', null); });
  bindSave(root, function () {
    var u = ctx.state.user;
    var v = String(inp.value).trim().toLowerCase();
    var err = !v ? 'Wpisz nowy mail'
      : !MAIL_RE.test(v) ? 'Sprawdź adres, np. anna@example.com'
      : v === String(u.mail || '').toLowerCase() ? 'To jest Twój obecny mail'
      : null;
    showErr(root, 'dn-mail', err);
    if (err) { inp.focus(); return; }
    u.nowyMail = v;
    PM.go('#/dane/mail-kod');
  });
}

function mailKodScreen(ctx) {
  var u = ctx.state.user || {};
  var cel = ctx.query.cel === 'potwierdz';
  var target = cel ? u.mail : (u.nowyMail || u.mail);
  var wazn = (ctx.state.login && ctx.state.login.waznoscMin) || 10;
  var za = (ctx.state.login && ctx.state.login.ponownieZa) || 42;
  var content =
    '<p class="lead-text">Wpisz 6 cyfr z maila wysłanego na <strong>' + esc(target) + '</strong>.</p>' +
    '<div class="stack-8">' +
      PM.codeInput({ value: '' }) +
      errP('dn-code', null) +
    '</div>' +
    '<div class="stack-4">' +
      '<p class="hint">Kod ważny ' + wazn + ' minut.</p>' +
      '<p class="hint dn-resend"><button class="link is-disabled" type="button" data-resend disabled>Wyślij ponownie</button>' +
      '<span class="countdown" data-cd>' + PM.fmtSec(za) + '</span></p>' +
    '</div>';
  return PM.screen({
    title: cel ? 'Potwierdź mail' : 'Nowy mail',
    content: content,
    cta: PM.actions({
      back: cel ? '#/dane/niepotwierdzony' : '#/dane/mail-zmien',
      primary: { label: 'Potwierdź', attrs: { 'data-save': '' } }
    })
  });
}

function mountMailKod(root, ctx) {
  var u = ctx.state.user;
  var cel = ctx.query.cel === 'potwierdz';
  var good = (ctx.state.login && ctx.state.login.kodPoprawny) || '123456';
  var za = (ctx.state.login && ctx.state.login.ponownieZa) || 42;
  var done = false;
  var api;

  function check(code) {
    if (done) return;
    if (code === good) {
      done = true;
      api.disable(true);
      if (!cel && u.nowyMail) u.mail = u.nowyMail;
      u.mailPotwierdzony = true;
      syncPola(ctx.state);
      PM.go('#/dane/zapisano');
    } else {
      api.setError(true);
      showErr(root, 'dn-code', 'Kod nie pasuje');
    }
  }

  api = PM.bindCode(root, check, function () { showErr(root, 'dn-code', null); });
  if (!api) return;

  var b = root.querySelector('[data-save]');
  if (b) b.addEventListener('click', function () {
    var code = api.value();
    if (code.length < 6) {
      api.setError(true);
      showErr(root, 'dn-code', 'Wpisz 6 cyfr');
      api.focus();
      return;
    }
    check(code);
  });

  var resend = root.querySelector('[data-resend]');
  var cd = root.querySelector('[data-cd]');
  function unlock() {
    if (!resend) return;
    resend.disabled = false;
    resend.classList.remove('is-disabled');
    if (cd) cd.hidden = true;
  }
  function lock() {
    if (!resend) return;
    resend.disabled = true;
    resend.classList.add('is-disabled');
    if (cd) cd.hidden = false;
    PM.countdown(cd, za, unlock);
  }
  if (resend) {
    resend.addEventListener('click', function () {
      PM.toast('Wysłaliśmy nowy kod', { icon: 'mail-line' });
      api.clear();
      showErr(root, 'dn-code', null);
      lock();
    });
  }
  PM.countdown(cd, za, unlock);
}

/* ---------- sheet usuwania ---------- */
function usunSheet(ctx) {
  var nr = normPlate(ctx.query.nr || 'GD 9876B');
  return '<div class="sheet-head">' +
      '<h2 class="h-sheet">Usunąć numer?</h2>' +
      '<p class="sheet-text">Boty nie opłacą już parkingu ani usług dla tego auta.</p>' +
    '</div>' +
    '<div class="card"><div class="row">' +
      '<div class="thumb">' + PM.icon('car-line', 20) + '</div>' +
      '<div class="grow plate">' + esc(nr) + '</div>' +
    '</div></div>' +
    '<div class="sheet-actions">' +
      PM.btn('Usuń', { variant: 'danger-solid', block: true, icon: 'delete-bin-line', attrs: { 'data-remove': '' } }) +
      PM.btn('Anuluj', { variant: 'ghost', block: true, href: '#/dane' }) +
    '</div>';
}

function mountUsun(root, ctx) {
  var b = root.querySelector('.sheet [data-remove]');
  if (!b) return;
  var nr = normPlate(ctx.query.nr || 'GD 9876B');
  b.addEventListener('click', function () {
    var s = ctx.state;
    var k = keyPlate(nr);
    var before = (s.tablice || []).length;
    s.tablice = (s.tablice || []).filter(function (p) { return keyPlate(p) !== k; });
    syncPola(s);
    PM.go('#/dane');
    if (s.tablice.length < before) PM.toast('Usunięto ' + nr);
  });
}

/* ---------- rejestracja stanów (kolejność jak w kontrakcie) ---------- */
PM.route('#/dane', {
  title: 'Moje dane', group: G, label: 'Domyślny', tab: TAB,
  render: function (ctx) { return daneScreen(ctx); }
});

PM.route('#/dane/niepotwierdzony', {
  title: 'Moje dane', group: G, label: 'Mail niepotwierdzony', tab: TAB,
  render: function (ctx) { return daneScreen(ctx, { unconfirmed: true }); }
});

PM.route('#/dane/adres', {
  title: 'Adres', group: G, label: 'Edycja adresu', tab: TAB,
  render: function (ctx) { return adresScreen(ctx); },
  mount: mountAdres
});

PM.route('#/dane/adres-blad', {
  title: 'Adres', group: G, label: 'Adres, zły kod', tab: TAB,
  render: function (ctx) {
    var a = ctx.state.adres || {};
    return adresScreen(ctx, {
      values: { ulica: a.ulica, kod: '80831', miasto: a.miasto },
      kodError: 'Kod w formacie 00-000'
    });
  },
  mount: mountAdres
});

PM.route('#/dane/numer-dodaj', {
  title: 'Dodaj numer', group: G, label: 'Dodaj numer', tab: TAB,
  render: function (ctx) { return numerScreen(ctx); },
  mount: mountNumer
});

PM.route('#/dane/numer-blad', {
  title: 'Dodaj numer', group: G, label: 'Numer, zły format', tab: TAB,
  render: function (ctx) { return numerScreen(ctx, { value: 'GD 12', error: 'Sprawdź format, np. GD 12345' }); },
  mount: mountNumer
});

PM.route('#/dane/numer-duplikat', {
  title: 'Dodaj numer', group: G, label: 'Numer, duplikat', tab: TAB,
  render: function (ctx) {
    var first = (ctx.state.tablice && ctx.state.tablice[0]) || 'WX 1234A';
    return numerScreen(ctx, { value: first, error: 'Ten numer już jest na liście' });
  },
  mount: mountNumer
});

PM.route('#/dane/numer-usun', {
  title: 'Usuń numer', group: G, label: 'Usuń numer (sheet)', tab: TAB,
  sheet: true, base: '#/dane',
  render: usunSheet,
  mount: mountUsun
});

PM.route('#/dane/bez-numerow', {
  title: 'Moje dane', group: G, label: 'Bez numerów', tab: TAB,
  render: function (ctx) { return daneScreen(ctx, { noPlates: true }); }
});

PM.route('#/dane/mail-zmien', {
  title: 'Zmień mail', group: G, label: 'Zmiana maila', tab: TAB,
  render: mailZmienScreen,
  mount: mountMailZmien
});

PM.route('#/dane/mail-kod', {
  title: 'Kod z maila', group: G, label: 'Kod z maila', tab: TAB,
  render: mailKodScreen,
  mount: mountMailKod
});

PM.route('#/dane/zapisano', {
  title: 'Moje dane', group: G, label: 'Zapisano', tab: TAB, toast: 'Zapisano',
  render: function (ctx) { return daneScreen(ctx); }
});
