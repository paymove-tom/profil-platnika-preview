/* =====================================================================
   Profil płatnika Paymove · prototyp · js/s-auth.js
   Sekcja „1 Logowanie” (13 stanów, tab null):
     #/login, #/login/blad-mail, #/login/wyslano, #/login/kod,
     #/login/kod-czesciowy, #/login/kod-bledny, #/login/kod-wygasl,
     #/login/link, #/login/link-ok, #/onboarding,
     #/zgoda, #/zgoda/ok, #/zgoda/odmowa

   Stan przejściowy logowania trzymamy w PM.state._auth (znika przy
   PM.resetState i przy świeżym wczytaniu, więc zrzuty ?shot=1 renderują
   się zawsze z danych domyślnych PM_DATA).
   ===================================================================== */
(function () {
  'use strict';
  if (!window.PM || typeof PM.route !== 'function') return;

  var G = 'Logowanie';
  var LOGO_INK = 'assets/logos/logo_paymove_ink.svg';
  var SYGNET = 'assets/logos/sygnet.svg';
  var MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var SHORT = { imie: 'imię', mail: 'mail', adres: 'adres', tablice: 'numery rejestracyjne' };

  /* ---------- CSS modułu (ten sam język wizualny) ---------- */
  PM.css(
    '.auth-hdr{height:auto;padding:28px 16px 4px}' +
    '.auth-hdr .brand-logo{height:28px;width:auto}' +
    '.auth-strong{color:var(--tp);font-weight:500;word-break:break-all}' +
    '.auth-links{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}' +
    '.auth-cd{font-family:var(--mono);font-variant-numeric:tabular-nums;opacity:.75}' +
    '.auth-head{display:flex;flex-direction:column;gap:8px}' +
    '.zg-duo{gap:12px}' +
    '.zg-duo .duo-dots i{width:5px;height:5px}' +
    'button.check-row{width:100%;border:0;background:transparent;text-align:left;font:inherit;color:inherit;cursor:pointer;transition:background .15s ease}' +
    'button.check-row:hover{background:rgba(255,255,255,.45)}' +
    '.card>.check-row:first-child{border-top-left-radius:19px;border-top-right-radius:19px}' +
    '.card>.check-row:last-child{border-bottom-left-radius:19px;border-bottom-right-radius:19px}' +
    '.zg-mark{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--tp);flex:none;transition:background .15s ease,box-shadow .15s ease}' +
    '.zg-mark .ico{width:14px;height:14px;filter:invert(1)}' +
    '.check-row[aria-pressed="false"] .zg-mark{background:transparent;box-shadow:inset 0 0 0 1.5px var(--ring)}' +
    '.check-row[aria-pressed="false"] .zg-mark .ico{visibility:hidden}' +
    '.check-row[aria-pressed="false"] .name{color:var(--ts)}' +
    '.zg-chips{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 16px}' +
    '.zg-chips .chip{height:32px}'
  );

  /* ---------- pomocnicze ---------- */
  function auth() {
    if (!PM.state._auth) PM.state._auth = {};
    return PM.state._auth;
  }
  function L() {
    return (PM.state && PM.state.login) || (window.PM_DATA && window.PM_DATA.login) || {};
  }
  function userMail() {
    return auth().mail || L().mail || (PM.state.user && PM.state.user.mail) || '';
  }
  function mailError(v) {
    if (!v) return 'Wpisz mail';
    if (!MAIL_RE.test(v)) return 'Sprawdź format, np. anna@example.com';
    return null;
  }
  function afterLogin() {
    var a = auth();
    return a.zalogowany && !PM.state.user.pierwszeLogowanie ? '#/dane' : '#/onboarding';
  }
  function brandHeader() {
    return '<header class="hdr auth-hdr">' +
      '<img class="brand-logo" src="' + LOGO_INK + '" alt="Paymove" width="160" height="28">' +
      '<span class="ex-tag">Przykład</span>' +
      '</header>';
  }
  function showFieldError(root, id, msg) {
    var w = root.querySelector('[data-field="' + id + '"]');
    if (!w) return;
    w.classList.add('is-error');
    var inp = w.querySelector('input, textarea');
    if (inp) inp.setAttribute('aria-invalid', 'true');
    var e = w.querySelector('.error-msg');
    if (!e) {
      e = document.createElement('p');
      e.className = 'error-msg';
      e.setAttribute('role', 'alert');
      var hint = w.querySelector('.hint');
      if (hint) w.insertBefore(e, hint); else w.appendChild(e);
    }
    e.style.display = '';
    e.innerHTML = PM.icon('error-warning-line', 16) + PM.esc(msg);
  }
  function clearFieldError(root, id) {
    var w = root.querySelector('[data-field="' + id + '"]');
    if (!w) return;
    w.classList.remove('is-error');
    var inp = w.querySelector('input, textarea');
    if (inp) inp.removeAttribute('aria-invalid');
    var e = w.querySelector('.error-msg');
    if (e) e.style.display = 'none';
  }
  function statusScreen(o) {
    return PM.screen({
      title: o.title,
      showTitle: false,
      cls: o.cls,
      contentCls: 'content--center',
      content:
        '<div class="status-hero status-hero--c">' +
          (o.hero || '') +
          '<h1 class="display">' + PM.esc(o.title) + '</h1>' +
          (o.lead ? '<p class="lead-text">' + o.lead + '</p>' : '') +
        '</div>' + (o.extra || ''),
      cta: o.cta
    });
  }
  function duo(size) {
    var s = size || 64;
    var tileCls = s === 64 ? 'tile tile--lg' : s === 80 ? 'tile tile--xl' : 'tile';
    return '<div class="duo zg-duo">' +
      PM.botLogo('claude', s) +
      '<span class="duo-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '<span class="' + tileCls + '" title="Paymove"><img src="' + SYGNET + '" alt="Paymove" draggable="false"></span>' +
      '</div>';
  }

  /* =====================================================================
     1. Mail
     ===================================================================== */
  function renderMail(ctx, withError) {
    var a = auth();
    var value = '';
    var err = null;
    if (withError) {
      value = a.mailDraft != null ? a.mailDraft : (L().mailBledny || '');
      err = a.mailErr || mailError(value) || 'Sprawdź format, np. anna@example.com';
    }
    return PM.screen({
      title: 'Logowanie',
      showTitle: false,
      header: brandHeader(),
      contentCls: 'content--top',
      content:
        '<div class="auth-head">' +
          '<h1 class="title">Zaloguj się lub załóż konto</h1>' +
          '<p class="lead-text">Bez hasła. Wyślemy Ci kod i link na mail.</p>' +
        '</div>' +
        PM.field({
          id: 'login-mail', label: 'Mail', type: 'email', value: value,
          placeholder: 'Twój mail', inputmode: 'email', autocomplete: 'email',
          error: err, autofocus: true
        }),
      cta: PM.actions({
        primary: { label: 'Dalej', attrs: { 'data-mail-next': '' } },
        legal: 'Dalej oznacza akceptację regulaminu Paymove.'
      })
    });
  }

  function mountMail(root) {
    var inp = root.querySelector('#login-mail');
    var btn = root.querySelector('[data-mail-next]');
    if (!inp || !btn) return;
    function submit() {
      var v = String(inp.value || '').trim();
      var err = mailError(v);
      var a = auth();
      a.mailDraft = v;
      if (err) {
        a.mailErr = err;
        if (PM.current().path === '#/login/blad-mail') {
          showFieldError(root, 'login-mail', err);
          inp.focus();
        } else {
          PM.go('#/login/blad-mail');
        }
        return;
      }
      a.mailErr = null;
      a.mail = v;
      PM.go('#/login/wyslano');
    }
    btn.addEventListener('click', submit);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    inp.addEventListener('input', function () { clearFieldError(root, 'login-mail'); });
  }

  PM.route('#/login', {
    title: 'Logowanie', group: G, label: 'Mail pusty', tab: null,
    render: function (ctx) { return renderMail(ctx, false); },
    mount: mountMail
  });

  PM.route('#/login/blad-mail', {
    title: 'Logowanie', group: G, label: 'Zły format maila', tab: null,
    render: function (ctx) { return renderMail(ctx, true); },
    mount: mountMail
  });

  /* =====================================================================
     2. Wysłano
     ===================================================================== */
  PM.route('#/login/wyslano', {
    title: 'Sprawdź mail', group: G, label: 'Wysłano kod i link', tab: null,
    render: function () {
      var mins = L().waznoscMin || 10;
      return PM.screen({
        title: 'Sprawdź mail',
        showTitle: false,
        contentCls: 'content--top',
        content:
          '<div class="status-hero">' +
            '<span class="status-ico">' + PM.icon('mail-line', 28) + '</span>' +
            '<div class="auth-head">' +
              '<h1 class="title">Sprawdź mail</h1>' +
              '<p class="lead-text">Wysłaliśmy kod i link na <span class="auth-strong">' + PM.esc(userMail()) + '</span></p>' +
            '</div>' +
          '</div>' +
          '<section class="sec">' +
            '<div class="sec-h"><span>Wybierz jedną drogę</span></div>' +
            '<div class="card">' +
              '<a class="row" href="#/login/kod">' +
                '<div class="thumb">' + PM.icon('lock-line', 20) + '</div>' +
                '<div class="grow"><div class="name">Wpisz kod z maila</div><div class="meta">6 cyfr, ważny ' + mins + ' minut</div></div>' +
                '<img class="row-chev" src="assets/icons/arrow-right-s-line.svg" alt="" aria-hidden="true">' +
              '</a>' +
              '<a class="row" href="#/login/link">' +
                '<div class="thumb">' + PM.icon('link', 20) + '</div>' +
                '<div class="grow"><div class="name">Kliknij link w mailu</div><div class="meta">Zalogujemy Cię od razu</div></div>' +
                '<img class="row-chev" src="assets/icons/arrow-right-s-line.svg" alt="" aria-hidden="true">' +
              '</a>' +
            '</div>' +
          '</section>' +
          '<div class="auth-links">' +
            '<span class="meta">Nie ma maila? Sprawdź spam.</span>' +
            '<button class="textbtn" type="button" data-toast="Wysłaliśmy ponownie">Wyślij ponownie</button>' +
          '</div>',
        cta: PM.actions({ back: '#/login', primary: { label: 'Wpisz kod', href: '#/login/kod' } })
      });
    }
  });

  /* =====================================================================
     3. Kod z maila
     ===================================================================== */
  function renderCode(variant) {
    var a = auth();
    var value = '';
    var error = false;
    if (variant === 'czesciowy') value = L().kodCzesciowy || '482';
    if (variant === 'bledny') {
      value = a.kod || L().kodBledny || '482915';
      error = true;
    }
    var mins = L().waznoscMin || 10;
    return PM.screen({
      title: 'Kod z maila',
      showTitle: false,
      contentCls: 'content--top',
      content:
        '<div class="auth-head">' +
          '<h1 class="title">Wpisz kod z maila</h1>' +
          '<p class="lead-text">Wysłaliśmy 6 cyfr na <span class="auth-strong">' + PM.esc(userMail()) + '</span></p>' +
        '</div>' +
        '<div class="stack-12">' +
          PM.codeInput({ value: value, error: error }) +
          '<p class="error-msg" role="alert" data-code-error' + (error ? '' : ' style="display:none"') + '>' +
            PM.icon('error-warning-line', 16) + '<span>Kod nie pasuje. Sprawdź mail.</span></p>' +
          '<p class="hint">Kod jest ważny ' + mins + ' minut.</p>' +
        '</div>' +
        '<div class="auth-links">' +
          '<a class="textbtn" href="#/login">Zmień mail</a>' +
          '<button class="textbtn" type="button" data-toast="Wysłaliśmy nowy kod">Wyślij ponownie</button>' +
        '</div>' +
        '<span class="ex-tag">Kod w prototypie: ' + PM.esc(L().kodPoprawny || '123456') + '</span>',
      cta: PM.actions({
        back: '#/login/wyslano',
        primary: { label: 'Potwierdź', attrs: { 'data-code-submit': '' }, disabled: value.length < 6 }
      })
    });
  }

  function mountCode(root) {
    var btn = root.querySelector('[data-code-submit]');
    var errEl = root.querySelector('[data-code-error]');
    var api = null;

    function verify(code) {
      if (!api) return;
      if (code === (L().kodPoprawny || '123456')) {
        auth().kod = null;
        api.disable(true);
        if (errEl) errEl.style.display = 'none';
        if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
        PM.later(function () { PM.go(afterLogin()); }, 500);
        return;
      }
      auth().kod = code;
      if (PM.current().path === '#/login/kod-bledny') {
        api.setError(true);
        if (errEl) errEl.style.display = '';
      } else {
        PM.go('#/login/kod-bledny');
      }
    }

    api = PM.bindCode(root, function (code) { verify(code); }, function (code) {
      if (errEl && !api.el.classList.contains('is-error')) errEl.style.display = 'none';
      if (btn) btn.disabled = code.length < 6;
    });

    if (btn) {
      btn.addEventListener('click', function () {
        var code = api ? api.value() : '';
        if (code.length === 6) verify(code);
      });
    }
  }

  PM.route('#/login/kod', {
    title: 'Kod z maila', group: G, label: 'Kod pusty', tab: null,
    render: function () { return renderCode('pusty'); },
    mount: mountCode
  });

  PM.route('#/login/kod-czesciowy', {
    title: 'Kod z maila', group: G, label: 'Kod częściowy', tab: null,
    render: function () { return renderCode('czesciowy'); },
    mount: mountCode
  });

  PM.route('#/login/kod-bledny', {
    title: 'Kod z maila', group: G, label: 'Kod błędny', tab: null,
    render: function () { return renderCode('bledny'); },
    mount: mountCode
  });

  /* =====================================================================
     4. Kod wygasł
     ===================================================================== */
  PM.route('#/login/kod-wygasl', {
    title: 'Kod wygasł', group: G, label: 'Kod wygasł', tab: null,
    render: function () {
      var secs = L().ponownieZa || 42;
      var mins = L().waznoscMin || 10;
      return PM.screen({
        title: 'Kod wygasł',
        showTitle: false,
        contentCls: 'content--top',
        content:
          '<div class="auth-head">' +
            '<h1 class="title">Kod wygasł</h1>' +
            '<p class="lead-text">Kod działa ' + mins + ' minut. Wyślemy nowy na <span class="auth-strong">' + PM.esc(userMail()) + '</span></p>' +
          '</div>' +
          PM.codeInput({ value: '', disabled: true, focus: false }) +
          PM.banner({ type: 'warn', icon: 'time-line', title: 'Ten kod już nie zadziała', text: 'Poproś o nowy, gdy minie odliczanie.' }) +
          '<div class="auth-links"><a class="textbtn" href="#/login">Zmień mail</a></div>',
        cta: PM.actions({
          back: '#/login/wyslano',
          primary: {
            label: 'Wyślij ponownie za <span class="auth-cd" data-countdown>' + PM.fmtSec(secs) + '</span>',
            html: true, disabled: true, attrs: { 'data-resend': '' }
          }
        })
      });
    },
    mount: function (root) {
      var btn = root.querySelector('[data-resend]');
      var cd = root.querySelector('[data-countdown]');
      if (!btn || !cd) return;
      PM.countdown(cd, L().ponownieZa || 42, function () {
        btn.disabled = false;
        var sp = btn.querySelector('span');
        if (sp) sp.textContent = 'Wyślij ponownie';
      });
      btn.addEventListener('click', function () {
        PM.toast('Wysłaliśmy nowy kod');
        PM.go('#/login/kod');
      });
    }
  });

  /* =====================================================================
     5. Link z maila
     ===================================================================== */
  PM.route('#/login/link', {
    title: 'Potwierdzamy logowanie', group: G, label: 'Potwierdzanie linku', tab: null,
    render: function () {
      return statusScreen({
        title: 'Potwierdzamy logowanie…',
        cls: 'screen--accent',
        hero: PM.spinner('spinner--lg'),
        lead: 'Sprawdzamy link z maila. To potrwa chwilę.'
      });
    },
    mount: function () {
      auth().viaLink = true;
      PM.later(function () { PM.go('#/login/link-ok'); }, 1800);
    }
  });

  PM.route('#/login/link-ok', {
    title: 'Zalogowano', group: G, label: 'Zalogowano', tab: null,
    render: function () {
      return statusScreen({
        title: 'Zalogowano',
        cls: 'screen--ok',
        hero: '<span class="status-ico status-ico--ok">' + PM.icon('check-line', 28) + '</span>',
        lead: 'Konto <span class="auth-strong">' + PM.esc(userMail()) + '</span>',
        cta: PM.actions({ primary: { label: 'Dalej', href: afterLogin() } })
      });
    }
  });

  /* =====================================================================
     6. Onboarding: imię
     ===================================================================== */
  PM.route('#/onboarding', {
    title: 'Jak masz na imię', group: G, label: 'Imię (pierwszy login)', tab: null,
    render: function () {
      return PM.screen({
        title: 'Jak masz na imię?',
        showTitle: false,
        contentCls: 'content--top',
        content:
          '<div class="auth-head">' +
            '<h1 class="title">Jak masz na imię?</h1>' +
            '<p class="lead-text">Tak zwrócimy się do Ciebie w profilu.</p>' +
          '</div>' +
          PM.field({
            id: 'onb-imie', label: 'Imię', value: '', placeholder: 'Imię',
            autocomplete: 'given-name', maxlength: 40, autofocus: true,
            hint: 'Zmienisz je w Moich danych.'
          }),
        cta: PM.actions({ primary: { label: 'Dalej', attrs: { 'data-onb-next': '' } } })
      });
    },
    mount: function (root) {
      var inp = root.querySelector('#onb-imie');
      var btn = root.querySelector('[data-onb-next]');
      if (!inp || !btn) return;
      function submit() {
        var v = String(inp.value || '').trim().replace(/\s+/g, ' ');
        if (!v) {
          showFieldError(root, 'onb-imie', 'Wpisz imię');
          inp.focus();
          return;
        }
        var st = PM.state;
        st.user.imie = v.charAt(0).toUpperCase() + v.slice(1);
        st.user.inicjaly = PM.initials(st.user);
        st.user.pierwszeLogowanie = false;
        (st.pola || []).forEach(function (p) {
          if (p.id === 'imie') p.wartosc = st.user.imie + (st.user.nazwisko ? ' ' + st.user.nazwisko : '');
        });
        auth().zalogowany = true;
        PM.go('#/dane');
        PM.toast('Cześć, ' + st.user.imie);
      }
      btn.addEventListener('click', submit);
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
      });
      inp.addEventListener('input', function () { clearFieldError(root, 'onb-imie'); });
    }
  });

  /* =====================================================================
     7. Zgoda z linku w czacie
     ===================================================================== */
  function zgodaData() {
    return PM.state.zgoda || (window.PM_DATA && window.PM_DATA.zgoda) || {};
  }
  function poleById(id) {
    var list = PM.state.pola || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function limitMax() {
    return (PM.state.limity && PM.state.limity.miesieczny) || 1000;
  }
  function limitError(v) {
    if (!(v > 0)) return 'Ustaw limit większy niż 0 zł';
    if (v > limitMax()) return 'Limit bota nie może przekroczyć ogólnego ' + PM.zlInt(limitMax());
    return null;
  }

  PM.route('#/zgoda', {
    title: 'Zgoda dla Claude', group: G, label: 'Zgoda dla Claude', tab: null,
    render: function () {
      var z = zgodaData();
      var botId = z.bot || 'claude';
      var name = PM.botName(botId);
      var pola = z.pola || ['imie', 'mail', 'adres', 'tablice'];
      var limit = z.limitStart || 200;
      var opcje = z.opcjeLimitu || [100, 200, 300, 500];
      var rang = (PM.state.limity && PM.state.limity.zakresy && PM.state.limity.zakresy.bot) || { min: 0, max: 1000, step: 10 };

      var rows = pola.map(function (id) {
        var p = poleById(id) || { id: id, label: id, ikona: 'information-line', wartosc: '' };
        return '<button class="check-row" type="button" data-pole="' + PM.esc(p.id) + '" aria-pressed="true">' +
          '<div class="thumb thumb--sm">' + PM.icon(p.ikona, 18) + '</div>' +
          '<div class="grow"><div class="name">' + PM.esc(p.label) + '</div><div class="meta ellipsis">' + PM.esc(p.wartosc) + '</div></div>' +
          '<span class="zg-mark" aria-hidden="true">' + PM.icon('check-line', 14) + '</span>' +
          '</button>';
      }).join('');

      var chips = opcje.map(function (v) {
        return '<button class="chip' + (v === limit ? ' is-active' : '') + '" type="button" data-limit="' + v + '" aria-pressed="' + (v === limit ? 'true' : 'false') + '">' + PM.zlInt(v) + '</button>';
      }).join('');

      return PM.screen({
        title: name + ' chce używać Twoich danych',
        showTitle: false,
        contentCls: 'content--top',
        content:
          duo(64) +
          '<div class="auth-head">' +
            '<h1 class="title">' + PM.esc(name) + ' chce używać Twoich danych</h1>' +
            '<p class="lead-text">Do zakupów w Twoim imieniu. Zmienisz to w każdej chwili.</p>' +
          '</div>' +
          '<section class="sec">' +
            '<div class="sec-h"><span>Dane dla ' + PM.esc(name) + '</span><span class="count" data-zg-count>' + pola.length + ' z ' + pola.length + '</span></div>' +
            '<div class="card checks">' + rows + '</div>' +
          '</section>' +
          '<section class="sec">' +
            '<div class="sec-h"><span>Limit startowy</span><span class="tag">Przykład</span></div>' +
            '<div class="card">' +
              PM.amountField({
                id: 'zg-limit', label: 'Na miesiąc', value: limit,
                min: rang.min, max: rang.max, step: rang.step,
                right: '<span class="mono-s">' + PM.esc(z.okres || 'miesięcznie') + '</span>'
              }) +
              '<div class="zg-chips">' + chips + '</div>' +
            '</div>' +
          '</section>' +
          '<div class="card">' +
            '<div class="row">' +
              '<span class="tile"><img src="assets/logos/blik-mark-noborder.svg" alt="BLIK" draggable="false"></span>' +
              '<div class="grow"><div class="name">BLIK OneClick</div><div class="meta">Każdą płatność potwierdzasz w aplikacji banku</div></div>' +
            '</div>' +
          '</div>',
        cta: PM.actions({
          secondary: { label: 'Odmów', href: '#/zgoda/odmowa' },
          primary: { label: 'Zezwól', attrs: { 'data-zg-allow': '' } },
          legal: 'Dostęp odłączysz w zakładce Boty.'
        })
      });
    },
    mount: function (root) {
      var z = zgodaData();
      var botId = z.bot || 'claude';
      var rows = PM.qsa(root, '[data-pole]');
      var countEl = root.querySelector('[data-zg-count]');
      var allow = root.querySelector('[data-zg-allow]');
      var chips = PM.qsa(root, '[data-limit]');

      function updateCount() {
        var on = rows.filter(function (r) { return r.getAttribute('aria-pressed') === 'true'; }).length;
        if (countEl) countEl.textContent = on + ' z ' + rows.length;
      }
      function syncChips(v) {
        chips.forEach(function (c) {
          var a = Number(c.getAttribute('data-limit')) === Number(v);
          c.classList.toggle('is-active', a);
          c.setAttribute('aria-pressed', a ? 'true' : 'false');
        });
      }
      function validate(v) {
        var msg = limitError(v);
        PM.setAmountError(root, 'zg-limit', msg);
        if (allow) allow.disabled = !!msg;
        return !msg;
      }

      rows.forEach(function (r) {
        r.addEventListener('click', function () {
          var on = r.getAttribute('aria-pressed') !== 'true';
          r.setAttribute('aria-pressed', on ? 'true' : 'false');
          updateCount();
        });
      });

      PM.bindAmount(root, function (id, v) {
        if (id !== 'zg-limit') return;
        syncChips(v);
        validate(v);
      });

      chips.forEach(function (c) {
        c.addEventListener('click', function () {
          var v = Number(c.getAttribute('data-limit')) || 0;
          PM.setAmount(root, 'zg-limit', v);
          syncChips(v);
          validate(v);
        });
      });

      if (allow) {
        allow.addEventListener('click', function () {
          var limit = PM.amountValue(root, 'zg-limit');
          if (!validate(limit)) return;
          var chosen = rows.filter(function (r) { return r.getAttribute('aria-pressed') === 'true'; })
            .map(function (r) { return r.getAttribute('data-pole'); });

          var b = PM.bot(botId);
          if (!b) {
            var src = null;
            ((window.PM_DATA && window.PM_DATA.boty) || []).forEach(function (x) { if (x.id === botId) src = x; });
            b = src ? JSON.parse(JSON.stringify(src)) : { id: botId, nazwa: PM.botName(botId), limitTrans: 100, uprawnienia: {} };
            b.wydal = 0; b.zakupyMies = 0; b.ostatnio = 'nigdy'; b.ostatnioData = null;
            b.polaczono = PM.today;
            PM.state.boty = PM.state.boty || [];
            PM.state.boty.unshift(b);
          }
          b.uprawnienia = b.uprawnienia || {};
          rows.forEach(function (r) {
            b.uprawnienia[r.getAttribute('data-pole')] = r.getAttribute('aria-pressed') === 'true';
          });
          b.limitMies = limit;
          auth().zgoda = { bot: botId, pola: chosen, limit: limit };
          PM.go('#/zgoda/ok');
        });
      }
    }
  });

  PM.route('#/zgoda/ok', {
    title: 'Claude połączony', group: G, label: 'Claude połączony', tab: null,
    render: function () {
      var z = zgodaData();
      var saved = auth().zgoda || {};
      var botId = saved.bot || z.bot || 'claude';
      var name = PM.botName(botId);
      var pola = saved.pola || z.pola || ['imie', 'mail', 'adres', 'tablice'];
      var limit = saved.limit != null ? saved.limit : (z.limitStart || 200);
      var dostep = pola.length
        ? pola.map(function (id) { return SHORT[id] || id; }).join(', ')
        : 'brak';
      dostep = dostep.charAt(0).toUpperCase() + dostep.slice(1);

      return statusScreen({
        title: name + ' połączony',
        cls: 'screen--ok',
        hero: duo(64),
        lead: 'Płatności potwierdzasz w aplikacji banku.',
        extra:
          '<div class="card">' +
            PM.kv([
              { k: 'Dane', v: dostep },
              { k: 'Limit', v: PM.zlInt(limit) + ' / mies.' },
              { k: 'Płatność', v: 'BLIK OneClick' }
            ]) +
          '</div>',
        cta: PM.actions({
          secondary: { label: 'Ustawienia', href: '#/bot/' + botId },
          primary: { label: 'Wróć do czatu', attrs: { 'data-toast': 'Wracasz do czatu z ' + name } }
        })
      });
    }
  });

  PM.route('#/zgoda/odmowa', {
    title: 'Odmowa dostępu', group: G, label: 'Odmowa', tab: null,
    render: function () {
      var z = zgodaData();
      var name = PM.botName(z.bot || 'claude');
      return statusScreen({
        title: 'Odmówiono',
        hero: '<span class="status-ico">' + PM.icon('close-line', 28) + '</span>',
        lead: PM.esc(name) + ' nie dostał Twoich danych. Połączysz go później z czatu.',
        cta: PM.actions({
          secondary: { label: 'Zmień decyzję', href: '#/zgoda' },
          primary: { label: 'Wróć do czatu', attrs: { 'data-toast': 'Wracasz do czatu z ' + name } }
        })
      });
    }
  });
})();
