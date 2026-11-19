/* =====================================================================
   Paymove Wallet · prototyp · js/s-auth.js
   Sekcja „1 Logowanie i onboarding” (tab null):
     #/login                      social login (Google, Apple, Facebook)
     #/onboarding/1               mail z konta
     #/onboarding/2               adres
     #/onboarding/3               numer rejestracyjny
     #/onboarding/4               BLIK
     #/onboarding/4/checkout      sheet z iframe checkoutu BLIK
     #/onboarding/gotowe          sukces
     #/zgoda, #/zgoda/ok, #/zgoda/odmowa

   Stan przejściowy (kierunek animacji, dostawca logowania) trzymamy
   w PM.state._auth. Dane kroków w PM.state.onboarding, BLIK w
   PM.state.blik.polaczony. Świeże wczytanie (?shot=1) renderuje
   zawsze dane domyślne z PM_DATA.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.PM || typeof PM.route !== 'function') return;

  var G = '1 Logowanie i onboarding';
  var LOGO_INK = 'assets/logos/logo_paymove_ink.svg';
  var SYGNET = 'assets/logos/sygnet.svg';
  var BLIK_LOGO = 'assets/logos/blik-logo.svg';
  var CHECKOUT_URL = 'https://checkout.paymove.io/f1a142f1-1f17-4a6b-8f89-6a0a7d529790?externalId=jQEEsNYhdc';
  var DEFAULT_MAIL = 'tomasz.gesior@paymove.io';
  var MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var KOD_RE = /^\d{2}-\d{3}$/;
  var PLATE_RE = /^[A-Z0-9]{4,8}$/;
  var STEPS = 4;
  var SHORT = { imie: 'imię', mail: 'mail', adres: 'adres', tablice: 'numery rejestracyjne' };

  /* ---------- oficjalne logotypy (inline SVG) ---------- */
  var SVG = {
    google: function (s) {
      return '<svg class="au-logo" width="' + s + '" height="' + s + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
        '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
        '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
        '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
        '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
        '</svg>';
    },
    apple: function (s) {
      return '<svg class="au-logo" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path fill="#000000" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>' +
        '</svg>';
    },
    facebook: function (s) {
      return '<svg class="au-logo" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<circle cx="12" cy="12" r="12" fill="#1877F2"/>' +
        '<path fill="#FFFFFF" d="M16.671 15.469L17.203 12h-3.328V9.749c0-.949.465-1.874 1.956-1.874h1.513V4.922s-1.374-.234-2.686-.234c-2.741 0-4.533 1.66-4.533 4.668V12H7.078v3.469h3.047v8.385a12.09 12.09 0 0 0 3.75 0v-8.385h2.796z"/>' +
        '</svg>';
    }
  };
  var PROVIDERS = [
    { id: 'google', label: 'Google', cta: 'Kontynuuj z Google' },
    { id: 'apple', label: 'Apple', cta: 'Kontynuuj z Apple' },
    { id: 'facebook', label: 'Facebook', cta: 'Kontynuuj z Facebookiem' }
  ];
  var PROV = {};
  PROVIDERS.forEach(function (p) { PROV[p.id] = p; });

  /* ---------- CSS modułu (bazuje na klasach v2 wallet ze styles.css) ---------- */
  PM.css(
    /* wejście elementów */
    '.au-in{animation:au-in .5s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--d,0s)}' +
    '@keyframes au-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +

    /* login */
    '.au-hdr{height:auto;padding:28px 20px 0}' +
    '.au-brand{display:flex;align-items:center;gap:8px}' +
    '.au-brand img{height:22px;width:auto}' +
    '.au-wallet{font:500 22px/24px var(--sans);letter-spacing:-.02em;color:var(--ts);transform:translateY(1px)}' +
    '.au-login .content{gap:32px;padding-left:20px;padding-right:20px}' +
    '.au-cards{position:relative;height:184px;width:100%;max-width:320px;margin:0 auto}' +
    '.au-mini{position:absolute;left:50%;top:50%;width:232px;height:144px;margin:-72px 0 0 -116px;border-radius:20px;border:1px solid var(--border);background:var(--card);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);box-shadow:var(--shadow-card);transform:var(--t);animation:au-card .7s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--d,0s)}' +
    '@keyframes au-card{from{opacity:0;transform:var(--t) translateY(18px)}to{opacity:1;transform:var(--t)}}' +
    '.au-mini--1{--t:translate(-28px,-16px) rotate(-9deg);--d:.04s}' +
    '.au-mini--2{--t:translate(24px,-8px) rotate(7deg);--d:.1s;background:rgba(255,255,255,.7)}' +
    '.au-mini--1 i,.au-mini--2 i{display:block;height:8px;border-radius:4px;background:var(--chip);margin:20px 0 0 18px;width:42%}' +
    '.au-mini--1 i+i,.au-mini--2 i+i{margin-top:8px;width:26%}' +
    '.au-mini--3{--t:translate(0,16px) rotate(-1.5deg);--d:.18s;display:flex;flex-direction:column;justify-content:space-between;padding:16px;color:#fff;border-color:rgba(255,255,255,.08);background:radial-gradient(120% 90% at 100% 0%,rgba(230,0,126,.38) 0%,rgba(255,0,0,0) 58%),#000;box-shadow:0 18px 40px -12px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.12)}' +
    '.au-mini-top,.au-mini-foot{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '.au-mini-blik{height:26px;width:auto}' +
    '.au-mini-st{display:inline-flex;align-items:center;gap:6px;font:500 11px/14px var(--mono);color:rgba(255,255,255,.7)}' +
    '.au-mini-st i{width:6px;height:6px;border-radius:50%;background:var(--ok)}' +
    '.au-mini-name{font:500 15px/20px var(--sans);color:#fff}' +
    '.au-mini-bots{display:flex;gap:4px}' +
    '.au-mini-bots .tile{border-color:transparent}' +
    '.au-claim{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}' +
    '.au-claim .title{font-size:28px;line-height:34px;letter-spacing:-.02em}' +
    '.au-claim .lead-text{max-width:320px}' +
    '.au-social{display:flex;flex-direction:column;gap:10px}' +
    '.au-social .social-btn{gap:10px}' +
    '.social-btn .au-logo{width:20px;height:20px;flex:none}' +
    '.social-btn.is-loading .au-logo{visibility:hidden}' +
    '.au-social.is-busy .social-btn:not(.is-loading){opacity:.5;pointer-events:none}' +

    /* onboarding */
    '.au-ob-hdr{gap:16px;height:56px;padding:0 16px}' +
    '.au-ob-hdr .ob-progress{flex:1;min-width:0}' +
    '.au-hdr-sp{width:36px;flex:none}' +
    '.ob-step.au-back{animation-name:au-ob-back}' +
    '.ob-step.au-still{animation:none}' +
    '@keyframes au-ob-back{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:none}}' +
    '.au-src{display:inline-flex;align-items:center;gap:6px;font:500 12px/16px var(--mono);color:var(--ts)}' +
    '.au-src .au-logo{width:14px;height:14px}' +
    '.au-plate{align-self:flex-start;display:flex;align-items:stretch;height:56px;border-radius:10px;background:#fff;border:2px solid var(--tp);overflow:hidden;box-shadow:var(--shadow-card)}' +
    '.au-plate-eu{width:28px;flex:none;background:#003399;color:#fff;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;font:600 11px/12px var(--mono)}' +
    '.au-plate-num{display:flex;align-items:center;min-width:184px;padding:0 16px;font:700 26px/32px var(--mono);letter-spacing:.06em;white-space:nowrap}' +
    '.au-plate-num.is-empty{color:var(--off)}' +
    '.au-blik-mark{width:72px;height:72px;border-radius:20px;background:#000;display:grid;place-items:center;flex:none;box-shadow:0 12px 28px -10px rgba(0,0,0,.4)}' +
    '.au-blik-mark img{max-width:78%;max-height:62%;width:auto;height:auto}' +
    '.au-points .check-row{padding:14px 16px}' +
    '.au-points .name{font:500 15px/20px var(--sans)}' +

    /* sheet checkoutu */
    '.sheet.au-checkout{max-width:520px;gap:14px;padding:20px 16px 16px}' +
    '.au-sh-head{display:flex;align-items:center;gap:12px}' +
    '.au-blik-chip{height:36px;padding:0 8px;border-radius:10px;background:#000;display:grid;place-items:center;flex:none}' +
    '.au-blik-chip img{height:24px;width:auto}' +
    '.au-sh-title{font:700 18px/24px var(--sans);letter-spacing:-.01em}' +
    '.au-x{width:36px;height:36px;border-radius:50%;background:var(--chip);display:grid;place-items:center;flex:none;text-decoration:none}' +
    '.au-x:hover{background:var(--chip-hover)}' +
    '.au-frame{position:relative;border-radius:var(--r-card);overflow:hidden;background:#fff;border:1px solid var(--border)}' +
    '.au-frame .checkout-frame{display:block;border:0;width:100%}' +
    '.au-frame-load{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#fff;transition:opacity .25s ease}' +
    '.au-frame.is-loaded .au-frame-load{opacity:0;pointer-events:none}' +
    '.is-shot .au-frame-load{display:none}' +
    '.au-sh-foot{display:flex;flex-direction:column;align-items:center;gap:12px}' +

    /* sukces */
    '.au-check{display:grid;place-items:center}' +
    '.au-check svg{display:block;width:72px;height:72px}' +
    '.au-check svg circle{fill:var(--ok);transform-origin:center;animation:au-pop .45s cubic-bezier(.2,.9,.3,1.3) both}' +
    '.au-check svg path{fill:none;stroke:#fff;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:34;stroke-dashoffset:0;animation:au-draw .4s .3s ease both}' +
    '@keyframes au-pop{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}' +
    '@keyframes au-draw{from{stroke-dashoffset:34}to{stroke-dashoffset:0}}' +
    '.au-done .card{width:100%}' +

    /* zgoda (z poprzedniej wersji) */
    '.auth-strong{color:var(--tp);font-weight:500;word-break:break-all}' +
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

  /* ---------- stan ---------- */
  function auth() {
    if (!PM.state._auth) PM.state._auth = {};
    return PM.state._auth;
  }
  function ob() {
    var s = PM.state;
    if (!s.onboarding) s.onboarding = {};
    var o = s.onboarding;
    var def = (window.PM_DATA && window.PM_DATA.onboarding) || {};
    if (o.mail == null) o.mail = def.mail || DEFAULT_MAIL;
    if (!o.adres) o.adres = { ulica: '', kod: '', miasto: '' };
    if (o.rejestracja == null) o.rejestracja = '';
    return o;
  }
  function blik() {
    if (!PM.state.blik) PM.state.blik = { polaczony: false };
    return PM.state.blik;
  }
  function poleById(id) {
    var list = PM.state.pola || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function setPole(id, val) {
    var p = poleById(id);
    if (p) p.wartosc = val;
  }
  function finish() {
    auth().zalogowany = true;
    if (PM.state.user) PM.state.user.pierwszeLogowanie = false;
  }
  function goSoon(hash, ms) {
    if (PM.shot) { PM.go(hash); return; }
    PM.later(function () { PM.go(hash); }, ms || 600);
  }

  /* ---------- pola i błędy ---------- */
  function mailError(v) {
    if (!v) return 'Wpisz mail';
    if (!MAIL_RE.test(v)) return 'Sprawdź format, np. jan@example.com';
    return null;
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
  function bindClear(root, id) {
    var inp = root.querySelector('#' + id);
    if (inp) inp.addEventListener('input', function () { clearFieldError(root, id); });
  }
  function onEnter(inp, fn) {
    if (!inp) return;
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); fn(); }
    });
  }

  /* ---------- wspólne ekrany ---------- */
  function brandHeader() {
    return '<header class="hdr au-hdr">' +
      '<span class="au-brand"><img src="' + LOGO_INK + '" alt="Paymove" width="126" height="22"><span class="au-wallet">Wallet</span></span>' +
      '</header>';
  }

  function statusScreen(o) {
    return PM.screen({
      title: o.title,
      showTitle: false,
      tag: false,
      cls: o.cls,
      contentCls: 'content--center',
      content:
        '<div class="status-hero status-hero--c au-in">' +
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

  /* krok onboardingu: pasek postępu, wstecz, animowany kontener */
  function obScreen(n, ctx, o) {
    var a = auth();
    var anim = (ctx && ctx.isBase) || a.obStill ? ' au-still' : (a.obDir === 'back' ? ' au-back' : '');
    var segs = '';
    for (var i = 1; i <= STEPS; i++) {
      segs += '<i class="' + (i < n ? 'is-done' : i === n ? 'is-active' : '') + '"></i>';
    }
    var backHref = n === 1 ? '#/login' : '#/onboarding/' + (n - 1);
    var header =
      '<header class="hdr au-ob-hdr">' +
        '<a class="hdr-back press" href="' + backHref + '" data-ob-back aria-label="Wstecz">' + PM.icon('arrow-left-s-line', 20) + '</a>' +
        '<div class="ob-progress" role="progressbar" aria-label="Postęp" aria-valuemin="1" aria-valuemax="' + STEPS + '" aria-valuenow="' + n + '">' + segs + '</div>' +
        '<span class="au-hdr-sp" aria-hidden="true"></span>' +
      '</header>';
    return PM.screen({
      title: o.title,
      showTitle: false,
      cls: 'au-ob',
      header: header,
      contentCls: 'content--top',
      content:
        '<div class="ob-step' + anim + '">' +
          '<div class="stack-24">' +
            (o.top || '') +
            '<div class="auth-head">' +
              '<span class="ob-kicker">Krok ' + n + ' z ' + STEPS + '</span>' +
              '<h1 class="title">' + PM.esc(o.title) + '</h1>' +
              (o.lead ? '<p class="lead-text">' + o.lead + '</p>' : '') +
            '</div>' +
            (o.body || '') +
          '</div>' +
        '</div>',
      cta: o.cta
    });
  }

  /* zwraca false dla ekranu bazowego pod sheetem */
  function obMount(root, ctx) {
    if (ctx && ctx.isBase) return false;
    var a = auth();
    a.obDir = null;
    a.obStill = false;
    PM.qsa(root, '[data-ob-back]').forEach(function (el) {
      el.addEventListener('click', function () { auth().obDir = 'back'; });
    });
    return true;
  }

  /* =====================================================================
     1. Logowanie (tylko social)
     ===================================================================== */
  function heroCards() {
    return '<div class="au-cards" aria-hidden="true">' +
      '<div class="au-mini au-mini--1"><i></i><i></i></div>' +
      '<div class="au-mini au-mini--2"><i></i><i></i></div>' +
      '<div class="au-mini au-mini--3">' +
        '<div class="au-mini-top">' +
          '<img class="au-mini-blik" src="' + BLIK_LOGO + '" alt="" draggable="false">' +
          '<span class="au-mini-st"><i></i>Aktywny</span>' +
        '</div>' +
        '<div class="au-mini-foot">' +
          '<span class="au-mini-name">BLIK OneClick</span>' +
          '<span class="au-mini-bots">' + PM.botLogo('claude', 18) + PM.botLogo('chatgpt', 18) + PM.botLogo('perplexity', 18) + '</span>' +
        '</div>' +
      '</div>' +
      '</div>';
  }

  PM.route('#/login', {
    title: 'Zaloguj się', group: G, label: 'Logowanie (social)', tab: null,
    render: function () {
      var btns = PROVIDERS.map(function (p) {
        return '<button class="btn btn--secondary btn--block social-btn press" type="button" data-provider="' + p.id + '">' +
          SVG[p.id](20) + '<span>' + PM.esc(p.cta) + '</span></button>';
      }).join('');
      return PM.screen({
        title: 'Paymove Wallet',
        showTitle: false,
        cls: 'au-login',
        header: brandHeader(),
        contentCls: 'content--center',
        content:
          '<div class="wallet-hero">' + heroCards() + '</div>' +
          '<div class="au-claim au-in" style="--d:.16s">' +
            '<h1 class="title">Portfel do zakupów przez AI</h1>' +
            '<p class="lead-text">Bot kupuje w Twoim imieniu. Ty ustawiasz limity i potwierdzasz płatność w banku.</p>' +
          '</div>',
        cta:
          '<div class="cta-bar">' +
            '<div class="au-social au-in" style="--d:.24s">' + btns + '</div>' +
            '<p class="legal">Kontynuując, akceptujesz regulamin i politykę prywatności.</p>' +
          '</div>'
      });
    },
    mount: function (root) {
      var a = auth();
      a.obDir = null;
      a.obStill = false;
      var wrap = root.querySelector('.au-social');
      PM.qsa(root, '[data-provider]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (!wrap || wrap.classList.contains('is-busy')) return;
          wrap.classList.add('is-busy');
          b.classList.add('is-loading');
          b.setAttribute('aria-busy', 'true');
          auth().provider = b.getAttribute('data-provider');
          goSoon('#/onboarding/1', 900);
        });
      });
    }
  });

  /* =====================================================================
     2. Onboarding krok 1: mail
     ===================================================================== */
  PM.route('#/onboarding/1', {
    title: 'Twój mail', group: G, label: 'Krok 1 Mail', tab: null,
    render: function (ctx) {
      var o = ob();
      var prov = PROV[auth().provider] || PROV.google;
      return obScreen(1, ctx, {
        title: 'Twój mail',
        lead: 'Mamy go z konta ' + PM.esc(prov.label) + '. Jeśli wolisz inny, zmień go tutaj.',
        body: PM.field({
          id: 'ob-mail', label: 'Mail', type: 'email', value: o.mail || DEFAULT_MAIL,
          inputmode: 'email', autocomplete: 'email',
          labelRight: '<span class="au-src">' + SVG[prov.id](14) + PM.esc(prov.label) + '</span>',
          hint: 'Tu wyślemy potwierdzenia zakupów.'
        }),
        cta: PM.actions({ primary: { label: 'Dalej', cls: 'press', attrs: { 'data-ob-next': '' } } })
      });
    },
    mount: function (root, ctx) {
      if (!obMount(root, ctx)) return;
      var inp = root.querySelector('#ob-mail');
      var btn = root.querySelector('[data-ob-next]');
      if (!inp || !btn) return;
      function submit() {
        var v = String(inp.value || '').trim();
        var err = mailError(v);
        if (err) {
          showFieldError(root, 'ob-mail', err);
          inp.focus();
          return;
        }
        ob().mail = v;
        if (PM.state.user) PM.state.user.mail = v;
        setPole('mail', v);
        PM.go('#/onboarding/2');
      }
      btn.addEventListener('click', submit);
      onEnter(inp, submit);
      bindClear(root, 'ob-mail');
    }
  });

  /* =====================================================================
     3. Onboarding krok 2: adres
     ===================================================================== */
  PM.route('#/onboarding/2', {
    title: 'Adres', group: G, label: 'Krok 2 Adres', tab: null,
    render: function (ctx) {
      var a = ob().adres;
      return obScreen(2, ctx, {
        title: 'Adres',
        lead: 'Bot wpisze go za Ciebie, gdy zakup tego wymaga.',
        body:
          '<div class="stack">' +
            PM.field({ id: 'ob-ulica', label: 'Ulica i numer', value: a.ulica, placeholder: 'np. Marszałkowska 10/4', autocomplete: 'street-address' }) +
            '<div class="input-row">' +
              PM.field({ id: 'ob-kod', label: 'Kod', value: a.kod, placeholder: '00-000', inputmode: 'numeric', autocomplete: 'postal-code', maxlength: 6 }) +
              PM.field({ id: 'ob-miasto', label: 'Miasto', value: a.miasto, placeholder: 'np. Warszawa', autocomplete: 'address-level2' }) +
            '</div>' +
          '</div>',
        cta: PM.actions({
          primary: { label: 'Zapisz i dalej', cls: 'press', attrs: { 'data-ob-next': '' } },
          extra: PM.btn('Pomiń na razie', { variant: 'ghost', block: true, href: '#/onboarding/3', cls: 'press' })
        })
      });
    },
    mount: function (root, ctx) {
      if (!obMount(root, ctx)) return;
      var ulica = root.querySelector('#ob-ulica');
      var kod = root.querySelector('#ob-kod');
      var miasto = root.querySelector('#ob-miasto');
      var btn = root.querySelector('[data-ob-next]');
      if (!ulica || !kod || !miasto || !btn) return;

      kod.addEventListener('input', function () {
        var d = String(kod.value).replace(/\D/g, '').slice(0, 5);
        var f = d.length > 2 ? d.slice(0, 2) + '-' + d.slice(2) : d;
        if (kod.value !== f) kod.value = f;
      });

      function submit() {
        var u = String(ulica.value || '').trim().replace(/\s+/g, ' ');
        var k = String(kod.value || '').trim();
        var m = String(miasto.value || '').trim().replace(/\s+/g, ' ');
        var first = null;
        if (!u) { showFieldError(root, 'ob-ulica', 'Wpisz ulicę i numer'); first = first || ulica; }
        if (!KOD_RE.test(k)) { showFieldError(root, 'ob-kod', k ? 'Format 00-000' : 'Wpisz kod'); first = first || kod; }
        if (!m) { showFieldError(root, 'ob-miasto', 'Wpisz miasto'); first = first || miasto; }
        if (first) { first.focus(); return; }
        ob().adres = { ulica: u, kod: k, miasto: m };
        PM.state.adres = { ulica: u, kod: k, miasto: m };
        setPole('adres', u + ', ' + k + ' ' + m);
        PM.go('#/onboarding/3');
      }
      btn.addEventListener('click', submit);
      [ulica, kod, miasto].forEach(function (i) { onEnter(i, submit); });
      ['ob-ulica', 'ob-kod', 'ob-miasto'].forEach(function (id) { bindClear(root, id); });
    }
  });

  /* =====================================================================
     4. Onboarding krok 3: numer rejestracyjny
     ===================================================================== */
  function normPlate(v) {
    return String(v || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').replace(/^\s+/, '');
  }

  PM.route('#/onboarding/3', {
    title: 'Twoje auto', group: G, label: 'Krok 3 Rejestracja', tab: null,
    render: function (ctx) {
      var v = ob().rejestracja || '';
      return obScreen(3, ctx, {
        title: 'Twoje auto',
        lead: 'Parking zapłacisz bez wpisywania numeru. Bot weźmie go z profilu.',
        body:
          '<div class="au-plate" aria-hidden="true">' +
            '<span class="au-plate-eu">PL</span>' +
            '<span class="au-plate-num' + (v ? '' : ' is-empty') + '" data-plate>' + PM.esc(v || 'WI 4821K') + '</span>' +
          '</div>' +
          PM.field({
            id: 'ob-rej', label: 'Numer rejestracyjny', value: v, placeholder: 'WI 4821K',
            mono: true, autocomplete: 'off', maxlength: 10,
            attrs: { autocapitalize: 'characters', spellcheck: 'false' },
            hint: 'Kolejne auta dodasz w Moich danych.'
          }),
        cta: PM.actions({
          primary: { label: 'Dalej', cls: 'press', attrs: { 'data-ob-next': '' } },
          extra: PM.btn('Pomiń na razie', { variant: 'ghost', block: true, href: '#/onboarding/4', cls: 'press' })
        })
      });
    },
    mount: function (root, ctx) {
      if (!obMount(root, ctx)) return;
      var inp = root.querySelector('#ob-rej');
      var plate = root.querySelector('[data-plate]');
      var btn = root.querySelector('[data-ob-next]');
      if (!inp || !btn) return;

      inp.addEventListener('input', function () {
        var v = normPlate(inp.value);
        if (inp.value !== v) inp.value = v;
        if (plate) {
          plate.textContent = v.trim() || 'WI 4821K';
          plate.classList.toggle('is-empty', !v.trim());
        }
        clearFieldError(root, 'ob-rej');
      });

      function submit() {
        var v = normPlate(inp.value).trim();
        var compact = v.replace(/\s/g, '');
        if (!compact) { showFieldError(root, 'ob-rej', 'Wpisz numer albo pomiń ten krok'); inp.focus(); return; }
        if (!PLATE_RE.test(compact)) { showFieldError(root, 'ob-rej', 'Sprawdź numer, np. WI 4821K'); inp.focus(); return; }
        ob().rejestracja = v;
        var t = PM.state.tablice = PM.state.tablice || [];
        if (t.indexOf(v) === -1) t.unshift(v);
        setPole('tablice', t.join(', '));
        PM.go('#/onboarding/4');
      }
      btn.addEventListener('click', submit);
      onEnter(inp, submit);
    }
  });

  /* =====================================================================
     5. Onboarding krok 4: BLIK
     ===================================================================== */
  PM.route('#/onboarding/4', {
    title: 'Podepnij BLIK', group: G, label: 'Krok 4 BLIK', tab: null,
    render: function (ctx) {
      var points = [
        { icon: 'time-line', t: 'Płacisz bez przepisywania kodu' },
        { icon: 'bank-line', t: 'Każdą płatność potwierdzasz w aplikacji banku' },
        { icon: 'link', t: 'Odłączysz BLIK, kiedy chcesz' }
      ].map(function (p) {
        return '<div class="check-row"><div class="thumb thumb--sm">' + PM.icon(p.icon, 18) + '</div><div class="grow name">' + PM.esc(p.t) + '</div></div>';
      }).join('');
      return obScreen(4, ctx, {
        title: 'Podepnij BLIK',
        lead: 'Tym zapłacą boty, którym dasz dostęp.',
        top: '<span class="au-blik-mark"><img src="' + BLIK_LOGO + '" alt="BLIK" draggable="false"></span>',
        body: '<div class="card checks au-points">' + points + '</div>',
        cta: PM.actions({
          primary: { label: 'Skonfiguruj płatność', href: '#/onboarding/4/checkout', cls: 'press' },
          extra: PM.btn('Zrobię to później', { variant: 'ghost', block: true, cls: 'press', attrs: { 'data-ob-later': '' } })
        })
      });
    },
    mount: function (root, ctx) {
      if (!obMount(root, ctx)) return;
      var later = root.querySelector('[data-ob-later]');
      if (later) {
        later.addEventListener('click', function () {
          blik().polaczony = false;
          finish();
          PM.go('#/portfel/bez-blik');
        });
      }
    }
  });

  PM.route('#/onboarding/4/checkout', {
    title: 'Konfiguracja BLIK', group: G, label: 'Checkout BLIK (sheet)', tab: null,
    sheet: true, base: '#/onboarding/4',
    render: function () {
      var url = PM.esc(CHECKOUT_URL);
      var body =
        '<div class="au-sh-head">' +
          '<span class="au-blik-chip"><img src="' + BLIK_LOGO + '" alt="BLIK" draggable="false"></span>' +
          '<div class="grow"><h2 class="au-sh-title">Podepnij BLIK</h2><p class="meta">Potwierdzisz w aplikacji banku</p></div>' +
          '<a class="au-x press" href="#/onboarding/4" aria-label="Zamknij">' + PM.icon('close-line', 18) + '</a>' +
        '</div>' +
        '<div class="au-frame" data-frame>' +
          '<div class="au-frame-load">' + PM.spinner('spinner--lg') + '<span class="meta">Ładujemy płatność</span></div>' +
          '<iframe class="checkout-frame" data-src="' + url + '" title="Konfiguracja BLIK" allow="payment" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
        '</div>' +
        '<div class="au-sh-foot">' +
          '<a class="textbtn" href="' + url + '" target="_blank" rel="noopener">Otwórz w nowej karcie</a>' +
          PM.btn('Gotowe, BLIK podpięty', { variant: 'primary', block: true, cls: 'press', attrs: { 'data-blik-done': '' } }) +
        '</div>';
      return PM.sheet({ body: body, cls: 'au-checkout', label: 'Konfiguracja BLIK' });
    },
    mount: function (root) {
      auth().obStill = true;
      var fr = root.querySelector('.sheet [data-frame]');
      var ifr = fr && fr.querySelector('iframe');
      function loaded() { if (fr) fr.classList.add('is-loaded'); }
      if (ifr) {
        ifr.addEventListener('load', function () { if (ifr.getAttribute('src')) loaded(); });
        /* src dopiero po ułożeniu sheetu: checkout mierzy szerokość przy starcie */
        setTimeout(function () { ifr.src = ifr.getAttribute('data-src'); }, PM.shot ? 50 : 380);
      }
      PM.later(loaded, 8000);

      var done = root.querySelector('.sheet [data-blik-done]');
      if (done) {
        done.addEventListener('click', function () {
          if (done.classList.contains('is-loading')) return;
          var b = blik();
          b.polaczony = true;
          if (!b.od) b.od = PM.date(PM.today);
          done.classList.add('is-loading');
          done.setAttribute('aria-busy', 'true');
          auth().obStill = false;
          goSoon('#/onboarding/gotowe', 600);
        });
      }
    }
  });

  /* =====================================================================
     6. Gotowe
     ===================================================================== */
  PM.route('#/onboarding/gotowe', {
    title: 'Wszystko gotowe', group: G, label: 'Gotowe', tab: null,
    render: function () {
      var o = ob();
      var a = o.adres || {};
      var adr = a.ulica ? a.ulica + ', ' + a.miasto : '';
      var podpiety = !!blik().polaczony;
      var rows = [
        { k: 'Mail', v: o.mail || DEFAULT_MAIL },
        { k: 'Adres', v: adr || 'Dodasz później' },
        { k: 'Auto', v: o.rejestracja || 'Dodasz później', mono: !!o.rejestracja },
        {
          k: 'BLIK', html: true,
          v: '<span class="status"><i class="dot" style="background:' + (podpiety ? 'var(--ok)' : 'var(--off)') + '"></i>' + (podpiety ? 'Podpięty' : 'Do podpięcia') + '</span>'
        }
      ];
      return statusScreen({
        title: 'Wszystko gotowe',
        cls: 'screen--ok au-done',
        hero:
          '<span class="success-check au-check" aria-hidden="true">' +
            '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="26"/><path d="M15 27l7.5 7.5L37 19"/></svg>' +
          '</span>',
        lead: 'Boty z dostępem zapłacą BLIKiem w ramach Twoich limitów.',
        extra: '<div class="card au-in" style="--d:.35s">' + PM.kv(rows) + '</div>',
        cta: PM.actions({ primary: { label: 'Przejdź do portfela', href: '#/portfel', cls: 'press' } })
      });
    },
    mount: function () {
      var a = auth();
      a.obDir = null;
      a.obStill = false;
      finish();
    }
  });

  /* =====================================================================
     7. Zgoda z linku w czacie (zachowana z poprzedniej wersji)
     ===================================================================== */
  function zgodaData() {
    return PM.state.zgoda || (window.PM_DATA && window.PM_DATA.zgoda) || {};
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
        return '<button class="chip press' + (v === limit ? ' is-active' : '') + '" type="button" data-limit="' + v + '" aria-pressed="' + (v === limit ? 'true' : 'false') + '">' + PM.zlInt(v) + '</button>';
      }).join('');

      return PM.screen({
        title: name + ' chce używać Twoich danych',
        showTitle: false,
        tag: false,
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
            '<div class="sec-h"><span>Limit startowy</span></div>' +
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
          secondary: { label: 'Odmów', href: '#/zgoda/odmowa', cls: 'press' },
          primary: { label: 'Zezwól', cls: 'press', attrs: { 'data-zg-allow': '' } },
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
          '<div class="card au-in" style="--d:.2s">' +
            PM.kv([
              { k: 'Dane', v: dostep },
              { k: 'Limit', v: PM.zlInt(limit) + ' / mies.' },
              { k: 'Płatność', v: 'BLIK OneClick' }
            ]) +
          '</div>',
        cta: PM.actions({
          secondary: { label: 'Ustawienia', href: '#/bot/' + botId, cls: 'press' },
          primary: { label: 'Wróć do czatu', cls: 'press', attrs: { 'data-toast': 'Wracasz do czatu z ' + name } }
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
          secondary: { label: 'Zmień decyzję', href: '#/zgoda', cls: 'press' },
          primary: { label: 'Wróć do czatu', cls: 'press', attrs: { 'data-toast': 'Wracasz do czatu z ' + name } }
        })
      });
    }
  });
})();
