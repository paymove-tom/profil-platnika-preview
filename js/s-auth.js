/* =====================================================================
   Paymove Wallet · prototyp · js/s-auth.js
   Sekcja „1 Logowanie i onboarding” (tab null):
     #/login                      social login (Google, Apple, Facebook)
     #/onboarding/start           powitanie po logowaniu: szklany sheet nad
                                  rozmytym ekranem logowania, podgląd 3 kroków
     #/onboarding/1               adres
     #/onboarding/2               numer rejestracyjny
     #/onboarding/3               BLIK (portfel), znacznik „Najszybsza płatność”
     #/onboarding/3/info          sheet przed bramką: zapłać i zapamiętaj sklep
     #/onboarding/3/checkout      sheet z iframe checkoutu BLIK
   Mail (tomasz.gesior@paymove.io) bierzemy z konta social, bez osobnego kroku.
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
  var CHECKOUT_URL = 'https://checkout.paymove.io/411718ba-b114-427f-8bc9-bbf18a798936?externalId=PgxIa97EVu';
  /* stan "zapłacono" kluczowany externalId: nowy link = przycisk Gotowe znów nieaktywny */
  var CHECKOUT_EXT = 'PgxIa97EVu';
  var CHECKOUT_ORIGIN = 'https://checkout.paymove.io';
  /* tryb embed bramki: wysyła do rodzica paymove:ready/resize/success/error/closed (postMessage na podany origin) */
  function embedUrl() {
    return CHECKOUT_URL + '&embed=1&origin=' + encodeURIComponent(window.location.origin);
  }
  function isGatewayMsg(e) {
    var d = e && e.data;
    return e.origin === CHECKOUT_ORIGIN && d && typeof d === 'object' && d.paymove === true && typeof d.type === 'string';
  }
  var DEFAULT_MAIL = 'tomasz.gesior@paymove.io';
  var KOD_RE = /^\d{2}-\d{3}$/;
  var PLATE_RE = /^[A-Z0-9]{4,8}$/;
  var STEPS = 3;
  var TERMS_URL = 'https://www.paymove.io/regulamin';
  var PRIVACY_URL = 'https://www.paymove.io/polityka-prywatnosci';
  var LOGIN_BOTS = [
    { id: 'claude', name: 'Claude', src: 'assets/logos/claude-color.svg' },
    { id: 'chatgpt', name: 'ChatGPT', src: 'assets/logos/openai.svg' },
    { id: 'perplexity', name: 'Perplexity', src: 'assets/logos/perplexity-color.svg' },
    { id: 'grok', name: 'Grok', src: 'assets/logos/grok.svg' }
  ];
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
    /* lockup: img 22px, linia bazowa wordmarku ok. 16.6px od góry (5.4px nad dołem obrazka);
       flex baseline wyrównuje tekst do dołu img, translateY podnosi go na linię wordmarku */
    '.au-brand{display:flex;align-items:baseline;gap:6px}' +
    '.au-brand img{display:block;height:22px;width:auto;flex:none}' +
    '.au-wallet{font:500 17px/1 var(--sans);letter-spacing:-.01em;color:var(--ts);transform:translateY(-5.4px)}' +
    '.au-login .content{gap:32px;padding-left:20px;padding-right:20px}' +
    '@media (min-width:1024px){.au-login .content{gap:24px}}' +
    '.au-login--b .content{gap:20px}' +
    '.au-login--b .au-cards{height:160px;transform:scale(.88)}' +
    /* wariant B: rząd botów */
    '.au-bots{display:flex;align-items:center;justify-content:center;gap:12px}' +
    '.au-bots-lbl{font:500 11px/14px var(--mono);color:var(--ts);letter-spacing:.02em;white-space:nowrap}' +
    '.au-bots-list{display:flex;gap:8px;margin:0;padding:0;list-style:none}' +
    '.au-bot{width:40px;height:40px;flex:none;border-radius:12px;background:#fff;border:1px solid var(--tile-border,var(--border));box-shadow:0 1px 2px rgba(0,0,0,.04);display:grid;place-items:center}' +
    '.au-bot img{display:block;width:22px;height:22px;object-fit:contain;filter:grayscale(.4);opacity:.85;transition:filter .2s ease,opacity .2s ease}' +
    '.au-bot:hover img{filter:none;opacity:1}' +
    /* linia prawna z linkami */
    '.au-legal{text-align:center}' +
    '.au-legal a{color:inherit;text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:1px;transition:color .15s ease}' +
    '.au-legal a:hover{color:var(--tp)}' +
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
    /* krok 4: BLIK, karta z tiltem 3D i połyskiem */
    '.au-b4{display:flex;flex-direction:column;gap:16px}' +
    '.au-bstage{position:relative;width:100%;max-width:340px;margin:0 auto 4px;perspective:1000px;animation:au-bin .7s cubic-bezier(.2,.8,.2,1) both}' +
    '@keyframes au-bin{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}' +
    '.au-bglow{position:absolute;left:14%;right:14%;bottom:-10px;height:46%;border-radius:50%;background:radial-gradient(closest-side,rgba(230,0,126,.5),rgba(230,0,126,0));filter:blur(20px);opacity:.55;z-index:0;pointer-events:none;animation:au-glow 4s ease-in-out infinite alternate}' +
    '@keyframes au-glow{from{opacity:.4;transform:scaleX(.92)}to{opacity:.7;transform:scaleX(1.04)}}' +
    '.au-bcard{position:relative;z-index:1;width:100%;aspect-ratio:1.586;border-radius:22px;padding:20px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;color:#fff;border:1px solid rgba(255,255,255,.08);background:radial-gradient(120% 90% at 100% 0%,rgba(230,0,126,.46) 0%,rgba(230,0,126,0) 58%),radial-gradient(70% 60% at 0% 100%,rgba(230,0,126,.12) 0%,rgba(230,0,126,0) 70%),#000;box-shadow:0 24px 48px -16px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.14);transform-origin:50% 60%;will-change:transform;animation:au-tilt 9s ease-in-out .7s infinite}' +
    '@keyframes au-tilt{0%,100%{transform:rotateX(0) rotateY(0)}25%{transform:rotateX(4deg) rotateY(-6deg)}75%{transform:rotateX(-2deg) rotateY(5deg)}}' +
    '.au-bcard::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(110deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.18) 48%,rgba(255,255,255,.05) 53%,rgba(255,255,255,0) 60%);background-size:260% 100%;background-repeat:no-repeat;background-position:100% 0;animation:au-shine 6s ease-in-out 1.4s infinite}' +
    '@keyframes au-shine{0%{background-position:100% 0}32%,100%{background-position:0% 0}}' +
    '.au-bcard .au-mini-foot{align-items:flex-end}' +
    '.au-bcard .au-mini-blik{height:32px}' +
    '.au-bcard .au-mini-st{color:rgba(255,255,255,.75)}' +
    '.au-bcard .au-mini-st i{background:#e6007e;box-shadow:0 0 0 0 rgba(230,0,126,.6);animation:au-dot 2.4s ease-out infinite}' +
    '@keyframes au-dot{0%{box-shadow:0 0 0 0 rgba(230,0,126,.6)}70%,100%{box-shadow:0 0 0 6px rgba(230,0,126,0)}}' +
    '.au-bcard .au-mini-name{font-size:18px;line-height:24px}' +
    '.au-bcard-sub{display:block;font:500 11px/14px var(--mono);color:rgba(255,255,255,.55);margin-top:4px;letter-spacing:.06em}' +
    '.au-bcard .au-mini-bots .tile{box-shadow:0 2px 6px rgba(0,0,0,.35)}' +
    '.au-perks .check-row{padding:12px 14px;gap:12px;align-items:center}' +
    '.au-perks .name{font:500 15px/20px var(--sans)}' +
    '.au-perks .meta{font-size:13px;line-height:18px;margin-top:2px}' +
    '.au-trust{display:flex;align-items:center;justify-content:center;gap:6px;margin:0;font:500 12px/16px var(--sans);color:var(--ts);text-align:center}' +
    '.au-trust .ico{width:14px;height:14px;opacity:.7;flex:none}' +
    '@media (max-width:1023px){.au-b4{gap:12px}.au-bstage{max-width:290px}.au-perks .check-row{padding:10px 14px}}' +
    '@media (min-width:1024px){' +
      '.au-b4{display:grid;grid-template-columns:240px minmax(0,1fr);gap:14px 20px;align-items:center}' +
      '.au-b4 .au-trust{grid-column:1/-1}' +
      '.au-bstage{max-width:240px;margin:0}' +
      '.au-bcard{border-radius:16px;padding:14px}' +
      '.au-bcard .au-mini-blik{height:22px}' +
      '.au-bcard .au-mini-st{font-size:10px}' +
      '.au-bcard .au-mini-name{font-size:15px;line-height:20px}' +
      '.au-bcard-sub{font-size:10px;line-height:12px;margin-top:2px}' +
      '.au-perks .check-row{padding:10px 12px}' +
    '}' +
    '.ob-step.au-still .au-bstage,.ob-step.au-still .au-b4 .au-in{animation:none}' +
    '@media (prefers-reduced-motion:reduce){.au-bstage,.au-bcard,.au-bcard::after,.au-bglow,.au-bcard .au-mini-st i,.au-b4 .au-in{animation:none}.au-bcard{transform:none}.au-bcard::after{opacity:0}}' +
    '.is-shot .au-bstage,.is-shot .au-bcard,.is-shot .au-bcard::after,.is-shot .au-bglow,.is-shot .au-bcard .au-mini-st i,.is-shot .au-b4 .au-in{animation:none}' +
    '.is-shot .au-bcard{transform:none}' +
    '.is-shot .au-bcard::after{opacity:0}' +
    '.au-claim{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}' +
    '.au-claim .title{font-size:28px;line-height:34px;letter-spacing:-.02em}' +
    '.au-claim .lead-text{max-width:320px}' +
    '.au-social{display:flex;flex-direction:column;gap:8px;width:100%;max-width:400px;margin:0 auto}' +
    '@media (min-width:1024px){.au-social{max-width:360px}}' +
    '.au-social .social-btn{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:48px;min-height:48px;padding:0 20px}' +
    '.au-social .social-btn .au-logo{position:static;left:auto;right:auto;top:auto;transform:none;margin:0}' +
    '.au-social .social-btn>span{flex:none;text-align:left}' +
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
    '.zg-chips .chip{height:32px}' +

    /* ---------- krok 4: portfel ---------- */
    '.au-vc{display:flex;flex-direction:column;align-items:center;gap:16px}' +
    '.au-vc-stack{position:relative;width:100%;max-width:290px;padding-top:80px}' +
    '.au-vc-card{position:absolute;top:0;left:0;right:0;aspect-ratio:1.586;display:flex;align-items:flex-start;justify-content:space-between;padding:12px 16px;border-radius:22px;border:1px solid var(--border);box-shadow:0 10px 24px -14px rgba(0,0,0,.3);animation:au-vc-back .5s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--d,0s)}' +
    '.au-vc-card--visa{left:8%;right:8%;z-index:1;background:linear-gradient(160deg,#f3f4f7,#e2e4ea);--d:0s}' +
    '.au-vc-card--mc{top:40px;left:4%;right:4%;z-index:2;background:linear-gradient(160deg,#e9ebef,#d6d9df);--d:.08s}' +
    '.au-vc-card svg{display:block;filter:grayscale(1);opacity:.5}' +
    '.au-vc-soon{font:500 11px/14px var(--mono);color:var(--ts);padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.7)}' +
    '.au-vc-front{position:relative;z-index:3;animation:au-vc-in .8s cubic-bezier(.2,.8,.2,1) .25s both}' +
    '@keyframes au-vc-back{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
    '@keyframes au-vc-in{from{opacity:0;transform:translateY(64px) scale(.97)}to{opacity:1;transform:none}}' +
    '.au-vc-pts{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}' +
    '.au-vc-pt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px 0 10px;border-radius:16px;background:var(--card);border:1px solid var(--border);font:500 13px/16px var(--sans);color:var(--tp)}' +
    '.au-vc-pt .ico{width:14px;height:14px;opacity:.75}' +
    '@media (min-width:1024px){.au-vc-stack{max-width:256px;padding-top:68px}.au-vc-card{border-radius:16px;padding:10px 14px}.au-vc-card--mc{top:34px}}' +

    /* warianty: stan statyczny (pod sheetem, reduced motion, zrzut) */
    '.ob-step.au-still .au-vb-in,.ob-step.au-still .au-vc-front,.ob-step.au-still .au-vc-card{animation:none}' +
    '@media (prefers-reduced-motion:reduce){.au-va-prop,.au-va-push,.au-va-paid,.au-va-s,.au-va-s .au-va-n,.au-va-s .name,.au-vb-in,.au-vc-front,.au-vc-card{animation:none}}' +
    '.is-shot .au-va-prop,.is-shot .au-va-push,.is-shot .au-va-paid,.is-shot .au-va-s,.is-shot .au-va-s .au-va-n,.is-shot .au-va-s .name,.is-shot .au-vb-in,.is-shot .au-vc-front,.is-shot .au-vc-card{animation:none}'
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
    var backHref = n === 1 ? '#/onboarding/start' : '#/onboarding/' + (n - 1);
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
        '<div class="ob-step' + anim + (o.stepCls ? ' ' + o.stepCls : '') + '">' +
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
          '<span class="au-mini-name">BLIK bez kodu</span>' +
          '<span class="au-mini-bots">' + PM.botLogo('claude', 18) + PM.botLogo('chatgpt', 18) + PM.botLogo('perplexity', 18) + '</span>' +
        '</div>' +
      '</div>' +
      '</div>';
  }

  function botsRow() {
    return '<div class="au-bots au-in" style="--d:.2s">' +
      '<span class="au-bots-lbl">Działa z</span>' +
      '<ul class="au-bots-list">' +
        LOGIN_BOTS.map(function (b) {
          return '<li class="au-bot" title="' + PM.esc(b.name) + '">' +
            '<img src="' + b.src + '" alt="' + PM.esc(b.name) + '" width="22" height="22" draggable="false"></li>';
        }).join('') +
      '</ul>' +
      '</div>';
  }

  function loginScreen(o) {
    o = o || {};
    var btns = PROVIDERS.map(function (p) {
      return '<button class="btn btn--secondary btn--block social-btn press" type="button" data-provider="' + p.id + '">' +
        SVG[p.id](20) + '<span>' + PM.esc(p.cta) + '</span></button>';
    }).join('');
    return PM.screen({
      title: 'Paymove Wallet',
      showTitle: false,
      cls: 'au-login' + (o.bots ? ' au-login--b' : ''),
      header: brandHeader(),
      contentCls: 'content--center',
      content:
        '<div class="wallet-hero">' + heroCards() + '</div>' +
        '<div class="au-claim au-in" style="--d:.16s">' +
          '<h1 class="title">Portfel zakupowy AI</h1>' +
          '<p class="lead-text">Zakupy robi AI. Kontrola nad pieniędzmi zostaje u Ciebie.</p>' +
        '</div>' +
        (o.bots ? botsRow() : ''),
      cta:
        '<div class="cta-bar">' +
          '<div class="au-social au-in" style="--d:.24s">' + btns + '</div>' +
          '<p class="legal au-legal">Kontynuując, akceptujesz ' +
            '<a href="' + TERMS_URL + '" target="_blank" rel="noopener">regulamin</a> i ' +
            '<a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">politykę prywatności</a>.</p>' +
        '</div>'
    });
  }

  /* mail z konta social trafia do stanu bez osobnego kroku */
  function prefillMail() {
    var o = ob();
    if (PM.state.user && !PM.state.user.mail) PM.state.user.mail = o.mail;
    var p = poleById('mail');
    if (p && !p.wartosc) p.wartosc = o.mail;
  }

  function loginMount(root) {
    var a = auth();
    a.obDir = null;
    a.obStill = false;
    var wrap = root.querySelector('.au-social');
    PM.qsa(root, '.au-legal a').forEach(function (l) {
      l.addEventListener('click', function (e) { e.stopPropagation(); });
    });
    PM.qsa(root, '[data-provider]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!wrap || wrap.classList.contains('is-busy')) return;
        wrap.classList.add('is-busy');
        b.classList.add('is-loading');
        b.setAttribute('aria-busy', 'true');
        auth().provider = b.getAttribute('data-provider');
        prefillMail();
        goSoon('#/onboarding/start', 900);
      });
    });
  }

  PM.route('#/login', {
    title: 'Zaloguj się', group: G, label: 'Logowanie (social)', tab: null,
    render: function () { return loginScreen({ bots: false }); },
    mount: loginMount
  });

  /* ---------- 1a. Powitanie po logowaniu: sheet ze sprężyną nad rozmytym logowaniem ---------- */
  PM.css(
    '.au-st{overflow:hidden;background:var(--bg)}' +
    /* tło: rozmyta sylwetka logowania, plamy w barwach makiety, przyciemnienie */
    '.au-st-ghost{position:absolute;inset:0;z-index:0;display:flex;flex-direction:column;pointer-events:none;filter:blur(12px) saturate(.9);opacity:.6;transform:scale(1.03);animation:au-st-recede .6s ease both}' +
    '.au-st-ghost *{animation:none!important}' +
    '.au-st-ghost-mid{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:0 20px}' +
    '.au-st-gl{display:block;height:14px;width:62%;max-width:240px;border-radius:7px;background:rgba(26,26,26,.55)}' +
    '.au-st-gl+.au-st-gl{width:80%;max-width:300px;height:10px;background:rgba(26,26,26,.2)}' +
    '.au-st-ghost-btns{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 20px 32px}' +
    '.au-st-ghost-btns i{display:block;width:100%;max-width:360px;height:48px;border-radius:999px;background:rgba(255,255,255,.85);border:1px solid var(--border)}' +
    '.au-st-blobs{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}' +
    '.au-st-blob{position:absolute;border-radius:50%;filter:blur(42px);animation:au-st-drift 14s ease-in-out infinite alternate}' +
    '.au-st-blob--1{width:280px;height:280px;left:-70px;top:4%;background:rgba(32,80,245,.22)}' +
    '.au-st-blob--2{width:240px;height:240px;right:-60px;top:28%;background:rgba(230,0,126,.15);animation-duration:17s;animation-direction:alternate-reverse}' +
    '.au-st-blob--3{width:300px;height:300px;left:22%;bottom:-90px;background:rgba(106,207,251,.24);animation-duration:19s}' +
    '.au-st-scrim{position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(180deg,rgba(242,243,247,.28) 0%,rgba(30,32,48,.16) 100%);animation:au-st-fade .4s ease both}' +

    /* warstwa i sheet */
    '.au-st-layer{position:relative;z-index:3;flex:1;min-height:0;display:flex;align-items:flex-end;justify-content:center;padding:16px 10px max(12px,env(safe-area-inset-bottom))}' +
    '.au-st-sheet{position:relative;width:100%;max-width:440px;max-height:100%;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;display:flex;flex-direction:column;gap:20px;padding:24px 22px 16px;border-radius:var(--r-sheet);border:1px solid rgba(255,255,255,.7);background:rgba(255,255,255,.74);-webkit-backdrop-filter:blur(44px);backdrop-filter:blur(44px);box-shadow:0 8px 24px rgba(31,41,82,.08),0 32px 72px -16px rgba(31,41,82,.32),inset 0 1px 0 rgba(255,255,255,.9);animation:au-st-spring .85s ease-out .08s both}' +
    '.au-st-sheet::-webkit-scrollbar{display:none}' +
    '@media (min-width:1024px){.au-st-layer{align-items:center;padding:24px}.au-st-sheet{max-width:460px;padding:28px 28px 20px}}' +

    /* ilustracja: stos kart, wachlarz, kłódka */
    '.au-st-art{position:relative;flex:none;height:128px}' +
    '.au-st-card{position:absolute;top:6px;left:50%;width:88px;height:104px;margin-left:-44px;border-radius:16px;padding:10px;display:flex;flex-direction:column;justify-content:space-between;background:rgba(255,255,255,.94);border:1px solid var(--border);box-shadow:0 12px 24px -12px rgba(31,41,82,.3),inset 0 1px 0 #fff;transform-origin:50% 90%;transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(1);animation:au-st-pop .35s ease .24s both,au-st-fan .75s cubic-bezier(.3,1.5,.5,1) .6s both}' +
    '.au-st-card--a{--x:-38px;--y:6px;--r:-9deg;--sy:-8px;--ss:.94;z-index:1}' +
    '.au-st-card--b{--x:38px;--y:0px;--r:6deg;--sy:0px;--ss:1;z-index:3}' +
    '.au-st-card--c{--x:66px;--y:8px;--r:11deg;--sy:-5px;--ss:.95;z-index:2;color:#fff;border-color:rgba(255,255,255,.08);background:radial-gradient(120% 90% at 100% 0%,rgba(230,0,126,.46) 0%,rgba(230,0,126,0) 60%),#000;box-shadow:0 14px 28px -12px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.14)}' +
    '.au-st-ci{width:28px;height:28px;border-radius:8px;background:var(--input-strong);display:grid;place-items:center}' +
    '.au-st-ci .ico{width:16px;height:16px}' +
    '.au-st-blik{display:block;height:18px;width:auto;margin-top:4px}' +
    '.au-st-cl{display:flex;flex-direction:column;gap:5px}' +
    '.au-st-cl i{display:block;height:5px;width:80%;border-radius:3px;background:var(--chip)}' +
    '.au-st-cl i+i{width:52%}' +
    '.au-st-card--c .au-st-cl i{background:rgba(255,255,255,.18)}' +
    '.au-st-cn{font:500 10px/12px var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--ts)}' +
    '.au-st-card--c .au-st-cn{color:rgba(255,255,255,.7)}' +
    '.au-st-lock{position:absolute;left:50%;bottom:0;z-index:4;width:40px;height:40px;margin-left:-20px;border-radius:50%;display:grid;place-items:center;background:var(--tp);color:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.9),0 10px 20px -6px rgba(0,0,0,.45);animation:au-st-lockin .5s cubic-bezier(.3,1.6,.5,1) 1.2s both}' +
    '.au-st-lock svg{display:block;overflow:visible}' +
    '.au-st-shackle{animation:au-st-snap .45s cubic-bezier(.3,1.7,.5,1) 1.55s both}' +
    '.au-st-lock::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--tp);opacity:0;pointer-events:none;animation:au-st-ring .7s ease-out 1.9s both}' +

    /* tekst */
    '.au-st-head{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}' +
    '.au-st-kick{font:500 12px/16px var(--mono);letter-spacing:.04em;color:var(--ts)}' +
    '.au-st-title{font:700 26px/32px var(--sans);letter-spacing:-.02em}' +
    '.au-st-lead{font:400 15px/22px var(--sans);color:var(--ts);max-width:360px}' +

    /* podgląd kroków */
    '.au-st-steps{list-style:none;margin:0;padding:0;border-radius:var(--r-card);background:rgba(255,255,255,.62);border:1px solid var(--border);box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}' +
    '.au-st-step{display:flex;align-items:center;gap:12px;padding:10px 14px}' +
    '.au-st-step+.au-st-step{border-top:1px solid var(--divider)}' +
    '.au-st-ico{width:36px;height:36px;border-radius:10px;background:var(--input-strong);display:grid;place-items:center;flex:none}' +
    '.au-st-ico .ico{width:18px;height:18px}' +
    '.au-st-ico--blik{background:#fff;border:1px solid var(--tile-border)}' +
    '.au-st-ico--blik img{width:22px;height:auto}' +
    '.au-st-nl{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '.au-st-step .name{font:500 15px/20px var(--sans)}' +
    '.au-st-step .meta{font-size:13px;line-height:18px}' +
    '.au-st-opt{flex:none;padding:3px 8px;border-radius:999px;background:var(--chip);font:500 11px/14px var(--mono);color:var(--ts);white-space:nowrap}' +

    /* CTA */
    '.au-st-foot{display:flex;flex-direction:column;align-items:center;gap:2px}' +
    '.au-st-foot .btn{width:100%;max-width:360px}' +
    '.au-st-skip{display:inline-flex;align-items:center;height:40px;padding:0 12px;font:500 14px/20px var(--sans);color:var(--ts);text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(142,142,147,.4);transition:color .15s ease}' +
    '.au-st-skip:hover{color:var(--tp)}' +

    /* klatki */
    '@keyframes au-st-fade{from{opacity:0}to{opacity:1}}' +
    '@keyframes au-st-recede{from{opacity:1;transform:none}to{opacity:.6;transform:scale(1.03)}}' +
    '@keyframes au-st-drift{from{transform:translate(0,0) scale(1)}to{transform:translate(24px,-18px) scale(1.08)}}' +
    '@keyframes au-st-spring{0%{opacity:0;transform:translateY(72px) scale(.96)}55%{opacity:1;transform:translateY(-8px) scale(1.006)}75%{transform:translateY(3px) scale(.999)}90%{transform:translateY(-1px) scale(1)}100%{opacity:1;transform:none}}' +
    '@keyframes au-st-pop{from{opacity:0}to{opacity:1}}' +
    '@keyframes au-st-fan{from{transform:translate(0px,var(--sy)) rotate(0deg) scale(var(--ss))}to{transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(1)}}' +
    '@keyframes au-st-lockin{from{opacity:0;transform:translateY(6px) scale(.4)}to{opacity:1;transform:none}}' +
    '@keyframes au-st-snap{from{transform:translateY(-4px)}to{transform:translateY(0)}}' +
    '@keyframes au-st-ring{0%{opacity:0;transform:scale(.9)}12%{opacity:.4}100%{opacity:0;transform:scale(1.7)}}' +

    /* bez ruchu: stan końcowy od razu */
    '@media (prefers-reduced-motion:reduce){.au-st *,.au-st *::before,.au-st *::after{animation:none!important}}' +
    '.is-shot .au-st *,.is-shot .au-st *::before,.is-shot .au-st *::after{animation:none!important}'
  );

  var LOCK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path class="au-st-shackle" d="M8 11V8a4 4 0 0 1 8 0v3"/>' +
    '<rect x="5" y="11" width="14" height="10" rx="2.5"/>' +
    '<path d="M12 15v2"/>' +
    '</svg>';

  function stArt() {
    return '<div class="au-st-art" aria-hidden="true">' +
      '<div class="au-st-card au-st-card--a">' +
        '<span class="au-st-ci">' + PM.icon('map-pin-line', 16) + '</span>' +
        '<span class="au-st-cl"><i></i><i></i></span>' +
        '<span class="au-st-cn">Adres</span>' +
      '</div>' +
      '<div class="au-st-card au-st-card--b">' +
        '<span class="au-st-ci">' + PM.icon('car-line', 16) + '</span>' +
        '<span class="au-st-cl"><i></i><i></i></span>' +
        '<span class="au-st-cn">Auto</span>' +
      '</div>' +
      '<span class="au-st-lock">' + LOCK_SVG + '</span>' +
      '</div>';
  }

  function stStep(o, d) {
    return '<li class="au-st-step au-in" style="--d:' + d + 's">' +
      '<span class="au-st-ico' + (o.blik ? ' au-st-ico--blik' : '') + '">' +
        (o.blik ? '<img src="assets/logos/blik-mark-noborder.svg" alt="" draggable="false">' : PM.icon(o.icon, 18)) +
      '</span>' +
      '<div class="grow">' +
        '<div class="au-st-nl"><span class="name">' + PM.esc(o.name) + '</span>' +
          (o.opt ? '<span class="au-st-opt">Możesz pominąć</span>' : '') + '</div>' +
        '<div class="meta">' + PM.esc(o.meta) + '</div>' +
      '</div>' +
      '</li>';
  }

  function startScreen() {
    var u = PM.state.user || {};
    var hi = u.imie ? 'Cześć, ' + u.imie : 'Cześć';
    var ghost =
      '<div class="au-st-ghost" aria-hidden="true">' +
        brandHeader() +
        '<div class="au-st-ghost-mid">' + heroCards() + '<i class="au-st-gl"></i><i class="au-st-gl"></i></div>' +
        '<div class="au-st-ghost-btns"><i></i><i></i><i></i></div>' +
      '</div>';
    var blobs =
      '<div class="au-st-blobs" aria-hidden="true">' +
        '<i class="au-st-blob au-st-blob--1"></i><i class="au-st-blob au-st-blob--2"></i><i class="au-st-blob au-st-blob--3"></i>' +
      '</div>';
    var steps =
      '<ul class="au-st-steps" aria-label="Kroki">' +
        stStep({ icon: 'map-pin-line', name: 'Adres', meta: 'Bot wpisze go, gdy zakup tego wymaga', opt: true }, 0.58) +
        stStep({ icon: 'car-line', name: 'Nr rejestracyjny', meta: 'Parking bez wpisywania numeru', opt: true }, 0.64) +
      '</ul>';
    return '<section class="screen au-st">' +
      ghost + blobs +
      '<div class="au-st-scrim" aria-hidden="true"></div>' +
      '<div class="au-st-layer">' +
        '<div class="au-st-sheet" role="dialog" aria-modal="true" aria-labelledby="au-st-title">' +
          stArt() +
          '<div class="au-st-head">' +
            '<span class="au-st-kick au-in" style="--d:.34s">' + PM.esc(hi) + '</span>' +
            '<h1 class="au-st-title au-in" id="au-st-title" style="--d:.4s">Zanim boty zaczną kupować</h1>' +
            '<p class="au-st-lead au-in" style="--d:.48s">Bezpiecznie zapiszemy dane do zamówień. Co Cię nie dotyczy, pomiń.</p>' +
          '</div>' +
          steps +
          '<div class="au-st-foot au-in" style="--d:.8s">' +
            PM.btn('Zaczynamy', { variant: 'primary', block: true, href: '#/onboarding/1', cls: 'press', iconRight: 'arrow-right-s-line' }) +
            '<a class="au-st-skip" href="#/portfel/bez-blik" data-st-skip>Pomiń wszystko</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '</section>';
  }

  PM.route('#/onboarding/start', {
    title: 'Zanim boty zaczną kupować', group: G, label: 'Onboarding · start (powitanie)', tab: null,
    render: function () { return startScreen(); },
    mount: function (root) {
      var a = auth();
      a.obDir = null;
      a.obStill = false;
      var skip = root.querySelector('[data-st-skip]');
      if (skip) {
        skip.addEventListener('click', function () {
          blik().polaczony = false;
          finish();
        });
      }
    }
  });


  /* =====================================================================
     2. Onboarding krok 1: adres
     ===================================================================== */
  PM.route('#/onboarding/1', {
    title: 'Adres', group: G, label: 'Krok 1 Adres', tab: null,
    render: function (ctx) {
      var a = ob().adres;
      return obScreen(1, ctx, {
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
          extra: PM.btn('Pomiń na razie', { variant: 'ghost', block: true, href: '#/onboarding/2', cls: 'press' })
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
        PM.go('#/onboarding/2');
      }
      btn.addEventListener('click', submit);
      [ulica, kod, miasto].forEach(function (i) { onEnter(i, submit); });
      ['ob-ulica', 'ob-kod', 'ob-miasto'].forEach(function (id) { bindClear(root, id); });
    }
  });

  /* =====================================================================
     3. Onboarding krok 2: numer rejestracyjny
     ===================================================================== */
  function normPlate(v) {
    return String(v || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').replace(/^\s+/, '');
  }

  PM.route('#/onboarding/2', {
    title: 'Twoje auto', group: G, label: 'Krok 2 Rejestracja', tab: null,
    render: function (ctx) {
      var v = ob().rejestracja || '';
      return obScreen(2, ctx, {
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
          extra: PM.btn('Pomiń na razie', { variant: 'ghost', block: true, href: '#/onboarding/3', cls: 'press' })
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
        PM.go('#/onboarding/3');
      }
      btn.addEventListener('click', submit);
      onEnter(inp, submit);
    }
  });

  /* =====================================================================
     4. Onboarding krok 3: BLIK
     ===================================================================== */
  /* ---------- checkout BLIK jako sheet nad dowolnym wariantem kroku 4 ---------- */
  function registerCheckout(baseHash, label) {
    PM.route(baseHash + '/checkout', {
      title: 'Konfiguracja BLIK', group: G, label: label || 'Checkout BLIK (sheet)', tab: null,
      sheet: true, base: baseHash,
      render: function () {
        var url = PM.esc(CHECKOUT_URL);
        var body =
          '<div class="au-sh-head">' +
            '<span class="au-blik-chip au-blik-chip--oc"><img src="' + BLIK_LOGO_FULL + '" alt="BLIK" draggable="false"></span>' +
            '<div class="grow"><h2 class="au-sh-title">Podepnij BLIK bez kodu</h2><p class="meta">Potwierdzisz w aplikacji banku</p></div>' +
            '<a class="au-newtab" href="' + url + '" target="_blank" rel="noopener">Otwórz w nowej karcie</a>' +
            '<a class="au-x press" href="' + baseHash + '" aria-label="Zamknij">' + PM.icon('close-line', 18) + '</a>' +
          '</div>' +
          '<div class="au-frame" data-frame>' +
            '<div class="au-frame-load">' + PM.spinner('spinner--lg') + '<span class="meta">Ładujemy płatność</span></div>' +
            '<iframe class="checkout-frame" scrolling="yes" data-src="' + PM.esc(embedUrl()) + '" title="Konfiguracja BLIK" allow="payment" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
          '</div>' +
          '<div class="au-sh-foot">' +
            '<p class="au-pay-st" data-pay-st role="status" aria-live="polite">' + PM.icon('time-line', 14) + '<span>Aktywuje się po potwierdzeniu płatności</span></p>' +
            PM.btn('Gotowe, BLIK podpięty', { variant: 'primary', block: true, cls: 'press', disabled: true, attrs: { 'data-blik-done': '' } }) +
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
        var st = root.querySelector('.sheet [data-pay-st]');
        function setSt(kind, text) {
          if (!st) return;
          st.className = 'au-pay-st' + (kind ? ' is-' + kind : '');
          st.innerHTML = (kind === 'ok' ? '<i class="au-pay-ok" aria-hidden="true"></i>' : PM.icon(kind === 'err' ? 'error-warning-line' : 'time-line', 14)) + '<span>' + PM.esc(text) + '</span>';
        }
        function enable() {
          if (!done) return;
          done.disabled = false;
          done.removeAttribute('disabled');
          done.removeAttribute('aria-disabled');
          done.classList.remove('is-disabled');
          setSt('ok', 'Płatność potwierdzona');
        }
        if (auth().blikPaid === CHECKOUT_EXT) enable();
        function onMsg(e) {
          if (!isGatewayMsg(e) || (ifr && e.source !== ifr.contentWindow)) return;
          var t = e.data.type;
          if (t === 'paymove:ready') loaded();
          else if (t === 'paymove:success') { auth().blikPaid = CHECKOUT_EXT; enable(); }
          else if (t === 'paymove:error') { if (auth().blikPaid !== CHECKOUT_EXT) setSt('err', 'Płatność nie przeszła. Spróbuj jeszcze raz w bramce.'); }
          else if (t === 'paymove:closed') { if (auth().blikPaid !== CHECKOUT_EXT) PM.go(baseHash); }
        }
        window.addEventListener('message', onMsg);
        PM.onLeave(function () { window.removeEventListener('message', onMsg); });
        if (done) {
          done.addEventListener('click', function () {
            if (done.disabled || auth().blikPaid !== CHECKOUT_EXT) return;
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
  }


  /* ---------- wspólne dla wariantów kroku 4 ---------- */
  var OKC = '<svg class="au-okc" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">' +
    '<circle cx="10" cy="10" r="10"/>' +
    '<path d="M6 10.4l2.6 2.6L14 7.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
  var VISA_SVG = '<svg viewBox="0 0 64 22" width="56" height="19" role="img" aria-label="Visa">' +
    '<text x="0" y="19" font-family="Arial,Helvetica,sans-serif" font-size="23" font-weight="900" font-style="italic" letter-spacing="-.5" fill="#1A1F71">VISA</text>' +
    '</svg>';
  var MC_SVG = '<svg viewBox="0 0 40 24" width="40" height="24" role="img" aria-label="Mastercard">' +
    '<circle cx="15" cy="12" r="12" fill="#EB001B"/>' +
    '<circle cx="25" cy="12" r="12" fill="#F79E1B"/>' +
    '<path d="M20 1.09A12 12 0 0 1 20 22.91A12 12 0 0 1 20 1.09Z" fill="#FF5F00"/>' +
    '</svg>';

  /* Znacznik „Najszybsza płatność” na karcie BLIK (krok 3). Błyskawica w currentColor. */
  var BOLT_SVG = '<svg class="au-fast-ico" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M13.2 2.2 4.6 13.4c-.3.4 0 .9.5.9h5.6l-1.3 7.2c-.1.6.6.9 1 .4l8.6-11.2c.3-.4 0-.9-.5-.9h-5.6l1.3-7.2c.1-.6-.6-.9-1-.4z"/>' +
    '</svg>';
  function fastBadge() {
    return '<span class="au-fast">' + BOLT_SVG + '<span>Najszybsza płatność</span></span>';
  }
  PM.css(
    '.au-fast{position:relative;z-index:1;display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 9px 0 7px;border-radius:999px;overflow:hidden;white-space:nowrap;color:#fff;font:500 11px/1 var(--sans);letter-spacing:.01em;' +
      'background:linear-gradient(100deg,#ff0000 0%,#e6007e 100%);' +
      'box-shadow:0 6px 16px -6px rgba(255,0,60,.75),inset 0 0 0 1px rgba(255,255,255,.2),inset 0 1px 0 rgba(255,255,255,.35);' +
      'animation:au-fast-in .5s cubic-bezier(.3,1.5,.5,1) .55s both}' +
    '.au-fast-ico{position:relative;z-index:1;display:block;width:12px;height:12px;flex:none}' +
    '.au-fast>span{position:relative;z-index:1}' +
    '.au-fast::after{content:"";position:absolute;top:0;bottom:0;left:0;width:60%;pointer-events:none;background:linear-gradient(100deg,rgba(255,255,255,0),rgba(255,255,255,.45),rgba(255,255,255,0));transform:translateX(-120%) skewX(-18deg);animation:au-fast-shine 4.5s ease-in-out 1.4s infinite}' +
    '@keyframes au-fast-in{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}' +
    '@keyframes au-fast-shine{0%{transform:translateX(-120%) skewX(-18deg)}30%,100%{transform:translateX(260%) skewX(-18deg)}}' +
    '@media (min-width:1024px){.au-fast{height:20px;padding:0 8px 0 6px;font-size:10px}.au-fast-ico{width:11px;height:11px}}' +
    '.ob-step.au-still .au-fast{animation:none}' +
    '@media (prefers-reduced-motion:reduce){.au-fast,.au-fast::after{animation:none!important}}' +
    '.is-shot .au-fast,.is-shot .au-fast::after{animation:none!important}'
  );

  /* Pełne, oficjalne logo BLIK (czarne tło + kropka). Używane w przycisku BLIK bez kodu i w chipie sheetu. */
  var BLIK_LOGO_FULL = 'assets/logos/blik-logo.svg';

  /* Przycisk w stylu BLIK bez kodu. Ma klasy btn / btn--primary i siedzi w .act-row,
     więc wysokość (48px), max-width (360/400) i układ dziedziczy z dotychczasowego primary. */
  function blikOneClickBtn(href) {
    return '<div class="act-row">' +
      '<a class="btn btn--primary au-blikbtn press" href="' + PM.esc(href) + '" aria-label="Podepnij BLIK bez kodu">' +
        '<span class="au-blikbtn-txt" aria-hidden="true">Podepnij</span>' +
        '<img class="au-blikbtn-logo" src="' + BLIK_LOGO_FULL + '" alt="" height="24" draggable="false">' +
        '<span class="au-blikbtn-txt" aria-hidden="true">bez kodu</span>' +
      '</a>' +
    '</div>';
  }

  function vCta(hash) {
    /* Mikrokopii pod przyciskiem nie dodajemy, bo lead mówi już o potwierdzeniu w aplikacji banku. */
    /* Najpierw objaśnienie (zapłać i zapamiętaj sklep), dopiero z niego wchodzimy do bramki. */
    return blikOneClickBtn(hash + '/info') +
      PM.actions({
        extra: PM.btn('Zrobię to później', { variant: 'ghost', block: true, cls: 'press', attrs: { 'data-ob-later': '' } })
      });
  }
  function vMount(root, ctx) {
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

  /* ---------- krok 3: portfel ---------- */
  PM.route('#/onboarding/3', {
    title: 'Podepnij BLIK', group: G, label: 'Krok 3 BLIK', tab: null,
    render: function (ctx) {
      return obScreen(3, ctx, {
        title: 'Dodaj BLIK do portfela',
        lead: 'Bot zapłaci bez przepisywania kodu, a Ty potwierdzisz w aplikacji banku.',
        body:
          '<div class="au-vc">' +
            '<div class="au-vc-stack">' +
              '<div class="au-vc-card au-vc-card--visa">' + VISA_SVG + '<span class="au-vc-soon">Wkrótce</span></div>' +
              '<div class="au-vc-card au-vc-card--mc">' + MC_SVG + '<span class="au-vc-soon">Wkrótce</span></div>' +
              '<span class="sr-only">BLIK bez kodu: najszybsza płatność w portfelu</span>' +
              '<div class="au-vc-front" aria-hidden="true">' +
                '<span class="au-bglow"></span>' +
                '<div class="au-bcard">' +
                  '<div class="au-mini-top">' +
                    '<img class="au-mini-blik" src="' + BLIK_LOGO + '" alt="" draggable="false">' +
                    fastBadge() +
                  '</div>' +
                  '<div class="au-mini-foot">' +
                    '<span><span class="au-mini-name">BLIK bez kodu</span><span class="au-bcard-sub">TOMASZ GĘSIOR</span></span>' +
                    '<span class="au-mini-bots">' + PM.botLogo('claude', 20) + PM.botLogo('chatgpt', 20) + PM.botLogo('perplexity', 20) + '</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="au-vc-pts au-in" style="--d:.6s">' +
              '<span class="au-vc-pt">' + PM.icon('shield-check-line', 14) + 'Limity ustawiasz sam</span>' +
              '<span class="au-vc-pt">' + PM.icon('check-line', 14) + 'Odłączysz kiedy chcesz</span>' +
            '</div>' +
          '</div>',
        cta: vCta('#/onboarding/3')
      });
    },
    mount: vMount
  });
  /* ---------- krok 3: objaśnienie przed bramką (zapłać i zapamiętaj sklep) ---------- */
  PM.css(
    /* sheet: sprężyna jak na powitaniu, przyciemnione i rozmyte tło kroku 3 */
    '.sheet-layer:has(.au-in3) .scrim{background:rgba(30,32,48,.22)}' +
    '.sheet.au-in3{max-width:420px;gap:34px;padding:34px 34px 34px;overflow-x:hidden;border-color:rgba(255,255,255,.7);background:rgba(255,255,255,.76);box-shadow:0 8px 24px rgba(31,41,82,.08),0 32px 72px -16px rgba(31,41,82,.32),inset 0 1px 0 rgba(255,255,255,.9);animation:au-st-spring .8s ease-out .04s both}' +
    '@media (min-width:1024px){.sheet.au-in3{max-width:500px;gap:34px;padding:55px 55px 34px}}' +

    /* ikona Paymove z plakietką „sklep dodany” */
    '.au-in3-art{position:relative;flex:none;display:flex;justify-content:center;padding:0 0 13px}' +
    '.au-in3-art::before{content:"";position:absolute;left:50%;top:50%;width:260px;height:160px;margin:-90px 0 0 -130px;border-radius:50%;background:radial-gradient(closest-side,rgba(230,0,126,.18),rgba(230,0,126,0));filter:blur(18px);pointer-events:none}' +
    '.au-in3-mark{position:relative;width:89px;height:89px}' +
    '.au-in3-mark>img.au-in3-sy{display:block;width:89px;height:89px;border-radius:26px;box-shadow:0 14px 28px -12px rgba(31,41,82,.45),0 0 0 1px rgba(26,26,26,.06)}' +
    '.au-in3-badge{position:absolute;right:-13px;bottom:-13px;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--cta-grad);border:3px solid #fff;box-shadow:0 6px 14px -4px rgba(230,0,126,.55)}' +
    '.au-in3-badge img{display:block;width:16px;height:16px;filter:brightness(0) invert(1)}' +

    /* tekst */
    '.au-in3-head{display:flex;flex-direction:column;align-items:center;gap:13px;text-align:center}' +
    '.au-in3-kick{display:inline-flex;align-items:center;gap:8px;font:500 16px/21px var(--sans);color:var(--ts)}' +
    '.au-in3-kick img{display:block;height:21px;width:auto;flex:none}.au-in3-kick span{display:block;line-height:21px}' +
    '.au-in3-title{font:700 26px/34px var(--sans);letter-spacing:-.02em;color:var(--tp);text-wrap:balance}' +
    '.au-in3-lead{font:400 16px/26px var(--sans);color:var(--ts);max-width:377px;text-wrap:balance}' +
    '.au-in3-lead b{font-weight:500;color:var(--tp)}' +

    /* kroki */
    '.au-in3-steps{list-style:none;margin:0;padding:0;border-radius:var(--r-card);background:rgba(255,255,255,.62);border:1px solid var(--border);box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}' +
    '.au-in3-step{display:flex;align-items:flex-start;gap:12px;padding:9px 14px;font:400 14px/19px var(--sans);color:var(--tp)}' +
    '.au-in3-step+.au-in3-step{border-top:1px solid var(--divider)}' +
    '.au-in3-n{width:22px;height:22px;flex:none;margin-top:-1px;border-radius:50%;display:grid;place-items:center;background:var(--chip);font:600 12px/16px var(--mono);color:var(--tp)}' +
    '.au-in3-step.is-key .au-in3-n{background:linear-gradient(135deg,#ff0000,#e6007e);color:#fff;box-shadow:0 4px 10px -4px rgba(230,0,126,.6)}' +
    '.au-in3-step b{font-weight:500}' +

    /* notka i CTA */
    '.au-in3-note{display:flex;align-items:flex-start;justify-content:center;gap:8px;margin:0;font:400 13px/21px var(--sans);color:var(--ts);text-align:center;text-wrap:balance}' +
    '.au-in3-note .ico{width:14px;height:14px;margin-top:1px;opacity:.7}' +
    '.au-in3-cta.act-row{gap:13px}' +
    '.au-in3-cta.act-row .btn{height:50px}' +
    '.au-in3-cta.act-row .btn.au-in3-back{flex:none;padding:0 22px}' +

    /* klatki: tylko transform i opacity */
    '@keyframes au-in3-pop{0%{opacity:0;transform:scale(.4)}100%{opacity:1;transform:scale(1)}}' +
    '.au-in3-badge{animation:au-in3-pop .45s cubic-bezier(.3,1.5,.5,1) .7s both}' +

    /* bez ruchu: przełącznik od razu ON, obwódka statyczna */
    '@media (prefers-reduced-motion:reduce){.sheet.au-in3,.au-in3 *,.au-in3 *::before,.au-in3 *::after{animation:none!important}}' +
    '.is-shot .sheet.au-in3,.is-shot .au-in3 *,.is-shot .au-in3 *::before,.is-shot .au-in3 *::after{animation:none!important}'
  );

  function in3Step(n, html, key, d) {
    return '<li class="au-in3-step au-in' + (key ? ' is-key' : '') + '" style="--d:' + d + 's">' +
      '<span class="au-in3-n" aria-hidden="true">' + n + '</span><span>' + html + '</span></li>';
  }

  PM.route('#/onboarding/3/info', {
    title: 'Zapłać i zapamiętaj sklep', group: G, label: 'Krok 3 · jak zapamiętać sklep (modal)', tab: null,
    sheet: true, base: '#/onboarding/3',
    render: function () {
      var body =
        '<div class="au-in3-art au-in" style="--d:.16s" aria-hidden="true">' +
          '<div class="au-in3-mark"><img class="au-in3-sy" src="' + SYGNET + '" alt="" draggable="false">' +
          '<span class="au-in3-badge">' + PM.icon('add-line', 16) + '</span></div>' +
        '</div>' +
        '<div class="au-in3-head">' +
          '<span class="au-in3-kick au-in" style="--d:.26s"><img src="' + BLIK_LOGO_FULL + '" alt="BLIK" height="22" draggable="false"><span>bez kodu</span></span>' +
          '<h2 class="au-in3-title au-in" style="--d:.32s">Zapłać i zapamiętaj sklep</h2>' +
          '<p class="au-in3-lead au-in" style="--d:.38s">Zapłać 1 zł BLIKIEM. W aplikacji banku wybierz <b>„Zapamiętaj sklep”</b>.</p>' +
        '</div>' +
        '<p class="au-in3-note au-in" style="--d:.5s">' + PM.icon('information-line', 14) +
          '<span>Dzięki temu kolejne płatności botów idą bez kodu.</span></p>' +
        '<div class="act-row au-in3-cta au-in" style="--d:.58s">' +
          PM.btn('Wróć', { variant: 'secondary', href: '#/onboarding/3', cls: 'press au-in3-back' }) +
          PM.btn('Rozumiem, dalej', { variant: 'primary', href: '#/onboarding/3/checkout', cls: 'press', iconRight: 'arrow-right-s-line' }) +
        '</div>';
      return PM.sheet({ body: body, cls: 'au-in3', label: 'Zapłać i zapamiętaj sklep' });
    },
    mount: function () {
      /* powrót na krok 3 (Wróć, scrim, Esc) bez ponownej animacji wejścia */
      auth().obStill = true;
    }
  });

  registerCheckout('#/onboarding/3', 'Checkout BLIK (sheet)');

  /* =====================================================================
     5. Gotowe
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
     6. Zgoda z linku w czacie (zachowana z poprzedniej wersji)
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
              '<div class="grow"><div class="name">BLIK bez kodu</div><div class="meta">Każdą płatność potwierdzasz w aplikacji banku</div></div>' +
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
              { k: 'Płatność', v: 'BLIK bez kodu' }
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
