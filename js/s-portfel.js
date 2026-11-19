/* =====================================================================
   Paymove Wallet · prototyp · js/s-portfel.js
   Sekcja: 0 Portfel (główny widok po zalogowaniu).
   Stany:
     #/portfel            portfel, BLIK wg PM.state.blik.polaczony
     #/portfel/bez-blik   portfel bez podpiętego BLIK (ustawia stan na false)
     #/portfel/blik       sheet zarządzania BLIK, "Odłącz" (mock) -> #/portfel/bez-blik
   Kontrakt: PM.state.blik = { polaczony, bank, od }.
   Klasy wspólne (styles.css, v2 wallet): .wallet-hero, .pay-card, .pay-card--blik,
   .pay-card--off, .pay-badge, .press. Poniżej drobne style pomocnicze .pf-*.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.PM || typeof PM.route !== 'function') return;

  var esc = PM.esc;
  var G = '0 Portfel';
  var BLIK_LOGO = 'assets/logos/blik-logo.svg';

  /* ---------- logotypy kart (inline SVG) ---------- */
  var VISA_SVG =
    '<svg viewBox="0 0 24 24" width="40" height="24" role="img" aria-label="Visa">' +
      '<path fill="#1A1F71" d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/>' +
    '</svg>';
  var MASTERCARD_SVG =
    '<svg viewBox="0 0 38 24" width="36" height="23" role="img" aria-label="Mastercard">' +
      '<circle cx="12" cy="12" r="12" fill="#EB001B"/>' +
      '<circle cx="26" cy="12" r="12" fill="#F79E1B"/>' +
      '<path fill="#FF5F00" d="M19 2.253A12 12 0 0 1 19 21.747A12 12 0 0 1 19 2.253Z"/>' +
    '</svg>';

  PM.css(
    '.pf-in{animation:pf-in .42s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--d,0ms)}' +
    '@keyframes pf-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
    '.pf-press{transition:transform .12s ease,background .15s ease}' +
    '.pf-press:active{transform:scale(.98)}' +

    /* powitanie */
    '.pf-hero{display:flex;align-items:center;gap:14px;padding:12px 0 8px}' +
    '.pf-hi{font:700 28px/34px var(--sans);letter-spacing:-.02em}' +
    '.pf-mail{font:400 15px/20px var(--sans);color:var(--ts);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +

    /* karta BLIK */
    '.pf-blik{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;gap:20px;min-height:188px;padding:20px;border-radius:var(--r-card);border:1px solid rgba(255,255,255,.06);background:linear-gradient(160deg,#262626 0%,#000 68%);color:#fff;text-decoration:none;box-shadow:0 16px 36px -14px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.12)}' +
    '.pf-blik::before{content:"";position:absolute;right:-56px;top:-56px;width:170px;height:170px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#ff0000 0%,#e83e49 49%,#ff00ff 100%);opacity:.85}' +
    '.pf-blik::after{content:"";position:absolute;right:-90px;top:-90px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(230,0,126,.28) 0%,rgba(230,0,126,0) 70%)}' +
    '.pf-blik>*{position:relative;z-index:1}' +
    '.pf-blik-logo{height:30px;width:auto}' +
    '.pf-blik .pf-name{font:500 20px/26px var(--sans);letter-spacing:-.01em}' +
    '.pf-blik .pf-sub{font:400 14px/20px var(--sans);color:rgba(255,255,255,.62)}' +
    '.pf-blik .pf-bank{font:500 12px/16px var(--mono);letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,.62)}' +
    '.pf-row{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
    '.pf-manage{display:inline-flex;align-items:center;gap:2px;height:32px;padding:0 10px 0 14px;border-radius:999px;background:rgba(255,255,255,.12);font:500 14px/20px var(--sans);color:#fff}' +
    '.pf-manage .ico{width:16px;height:16px;filter:invert(1)}' +

    /* badge */
    '.pf-badge{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px 0 8px;border-radius:999px;font:500 12px/16px var(--sans);white-space:nowrap;flex:none}' +
    '.pf-badge .dot{width:6px;height:6px}' +
    '.pf-badge--on{background:rgba(22,163,74,.22);color:#dcfce7}' +
    '.pf-badge--on .dot{background:#22c55e}' +
    '.pf-badge--ok{background:var(--ok-tint);color:var(--tp)}' +
    '.pf-badge--ok .dot{background:var(--ok)}' +
    '.pf-badge--soon{background:var(--chip);color:var(--ts);padding:0 10px}' +

    /* wkrótce: Visa, Mastercard */
    '.pf-off{filter:grayscale(1);opacity:.55;pointer-events:none;user-select:none}' +
    '.pf-off .row{padding:14px 16px}' +
    '.pf-logo{width:56px;height:38px;flex:none;border-radius:8px;background:#fff;border:1px solid var(--tile-border);display:grid;place-items:center}' +
    '.pf-logo svg{display:block}' +

    /* podepnij BLIK */
    '.pf-add{display:flex;align-items:center;gap:14px;padding:16px;text-decoration:none;color:inherit;border-style:dashed;border-color:rgba(26,26,26,.16)}' +
    '.pf-add:hover{background:var(--card-hover)}' +
    '.pf-add-logo{width:56px;height:38px;flex:none;border-radius:8px;background:#000;display:grid;place-items:center}' +
    '.pf-add-logo img{height:24px;width:auto}' +

    /* skróty */
    '.pf-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
    'a.card.pf-tile{display:flex;flex-direction:column;justify-content:space-between;gap:16px;min-height:118px;padding:16px;text-decoration:none;color:inherit}' +
    '.pf-tile .thumb{width:40px;height:40px;border-radius:12px}' +
    '.pf-tile .meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +

    /* sheet zarządzania */
    '.pf-sh-top{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
    '.pf-sh-logo{height:34px;width:auto}' +
    '.pf-x{width:36px;height:36px;flex:none;border-radius:50%;background:var(--chip);display:grid;place-items:center;text-decoration:none}' +
    '.pf-x:hover{background:var(--chip-hover)}' +
    '.pf-x .ico{width:18px;height:18px}'
  );

  /* ---------- pomocnicze ---------- */
  function plural(n, one, few, many) {
    if (n === 1) return one;
    var m10 = n % 10, m100 = n % 100;
    if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return few;
    return many;
  }

  function blik() {
    if (!PM.state.blik) PM.state.blik = { polaczony: true, bank: 'PKO BP', od: '19.11.2026' };
    return PM.state.blik;
  }

  function hdr() {
    return PM.header({ tag: false });
  }

  function chev(cls) {
    return '<img class="row-chev' + (cls ? ' ' + cls : '') + '" src="assets/icons/arrow-right-s-line.svg" alt="" aria-hidden="true">';
  }

  function d(ms) {
    return ' style="--d:' + ms + 'ms"';
  }

  function latestPurchase(list) {
    var groups = PM.groupByMonth(list || []);
    return groups.length && groups[0].items.length ? groups[0].items[0] : null;
  }

  /* ---------- bloki portfela ---------- */
  function heroBlock(st) {
    var u = st.user || {};
    var imie = u.imie || 'Tomasz';
    return '<div class="wallet-hero pf-hero pf-in">' +
      '<div class="avatar">' + esc(PM.initials(u)) + '</div>' +
      '<div class="pstack">' +
        '<h1 class="pf-hi">Cześć, ' + esc(imie) + '</h1>' +
        '<span class="pf-mail">' + esc(u.mail || '') + '</span>' +
      '</div>' +
      '</div>';
  }

  function blikCard(bl) {
    return '<a class="pay-card pay-card--blik pf-blik press pf-press" href="#/portfel/blik" aria-label="BLIK OneClick, aktywny. Zarządzaj">' +
      '<div class="pf-row">' +
        '<img class="pf-blik-logo" src="' + BLIK_LOGO + '" alt="BLIK" draggable="false">' +
        '<span class="pay-badge pf-badge pf-badge--on"><span class="dot"></span>Aktywny</span>' +
      '</div>' +
      '<div>' +
        '<div class="pf-name">BLIK OneClick</div>' +
        '<div class="pf-sub">Potwierdzasz w aplikacji banku</div>' +
      '</div>' +
      '<div class="pf-row">' +
        '<span class="pf-bank">' + esc(bl.bank || 'Bank') + (bl.od ? ' · od ' + esc(bl.od) : '') + '</span>' +
        '<span class="pf-manage">Zarządzaj' + PM.icon('arrow-right-s-line', 16) + '</span>' +
      '</div>' +
      '</a>';
  }

  function addBlikTile() {
    return PM.banner({
      type: 'warn',
      title: 'Brak metody płatności',
      text: 'Boty nie zapłacą, dopóki nie podepniesz BLIK.'
    }) +
    '<a class="card pf-add press pf-press" href="#/onboarding/3">' +
      '<span class="pf-add-logo"><img src="' + BLIK_LOGO + '" alt="BLIK" draggable="false"></span>' +
      '<div class="grow"><div class="name">Podepnij BLIK</div>' +
      '<div class="meta">Płacisz bez przepisywania kodu</div></div>' +
      chev() +
      '</a>';
  }

  function offCards() {
    function row(logo, name) {
      return '<div class="row">' +
        '<span class="pf-logo">' + logo + '</span>' +
        '<div class="grow"><div class="name">' + esc(name) + '</div>' +
        '<div class="meta">Jeszcze niewspierane na tym profilu</div></div>' +
        '<span class="pay-badge pf-badge pf-badge--soon">Wkrótce</span>' +
        '</div>';
    }
    return '<div class="card pay-card--off pf-off" aria-disabled="true">' +
      row(VISA_SVG, 'Visa') + row(MASTERCARD_SVG, 'Mastercard') +
      '</div>';
  }

  function methodsBlock(on, bl) {
    return '<section class="sec pf-in"' + d(60) + '>' +
      '<div class="sec-h"><span>Metody płatności</span></div>' +
      '<div class="stack-8">' +
        (on ? blikCard(bl) : addBlikTile()) +
        offCards() +
      '</div>' +
      '</section>';
  }

  function lastBlock(st) {
    var p = latestPurchase(st.zakupy);
    if (!p) return '';
    return '<section class="sec pf-in"' + d(120) + '>' +
      '<div class="sec-h"><span>Ostatni zakup</span><a href="#/historia">Wszystkie</a></div>' +
      PM.purchaseRow(p) +
      '</section>';
  }

  function tile(href, icon, name, meta) {
    return '<a class="card pf-tile press pf-press" href="' + esc(href) + '">' +
      '<div class="pf-row"><div class="thumb">' + PM.icon(icon, 20) + '</div>' + chev() + '</div>' +
      '<div><div class="name">' + esc(name) + '</div><div class="meta">' + esc(meta) + '</div></div>' +
      '</a>';
  }

  function shortcutsBlock(st) {
    var zakupy = (st.zakupy || []).length;
    var boty = (st.boty || []).length;
    var lim = st.limity || {};
    var limMeta = lim.okres === 'dzienny'
      ? PM.zlInt(lim.wydanoDzis || 0) + ' z ' + PM.zlInt(lim.dzienny || 0) + ' dziś'
      : PM.zlInt(lim.wydanoMies || 0) + ' z ' + PM.zlInt(lim.miesieczny || 0);
    return '<section class="sec pf-in"' + d(180) + '>' +
      '<div class="sec-h"><span>Twoje konto</span></div>' +
      '<div class="pf-grid">' +
        tile('#/historia', 'history-line', 'Historia', zakupy + ' ' + plural(zakupy, 'zakup', 'zakupy', 'zakupów')) +
        tile('#/boty', 'robot-2-line', 'Boty', boty + ' ' + plural(boty, 'połączony', 'połączone', 'połączonych')) +
        tile('#/limity', 'equalizer-line', 'Limity', limMeta) +
        tile('#/dane', 'user-3-line', 'Moje dane', 'Mail, adres, auta') +
      '</div>' +
      '</section>';
  }

  function renderWallet(ctx, forceOff) {
    var st = ctx.state;
    var bl = blik();
    var on = forceOff ? false : !!bl.polaczony;
    return PM.screen({
      title: 'Portfel',
      showTitle: false,
      header: hdr(),
      content: heroBlock(st) + methodsBlock(on, bl) + lastBlock(st) + shortcutsBlock(st)
    });
  }

  /* ---------- sheet zarządzania BLIK ---------- */
  function renderManage() {
    var bl = blik();
    var top = '<div class="pf-sh-top">' +
      '<img class="pf-sh-logo" src="' + BLIK_LOGO + '" alt="BLIK" draggable="false">' +
      '<a class="pf-x" href="#/portfel" aria-label="Zamknij">' + PM.icon('close-line', 18) + '</a>' +
      '</div>';

    if (!bl.polaczony) {
      return top +
        '<div class="sheet-head"><h2 class="h-sheet">BLIK nie jest podpięty</h2>' +
        '<p class="sheet-text">Podepnij go, żeby boty mogły płacić. Każdą płatność potwierdzasz w aplikacji banku.</p></div>' +
        '<div class="sheet-actions">' +
          PM.btn('Podepnij BLIK', { variant: 'primary', href: '#/onboarding/3', block: true, cls: 'press' }) +
          PM.btn('Zamknij', { variant: 'ghost', href: '#/portfel', block: true }) +
        '</div>';
    }

    return top +
      '<div class="sheet-head"><h2 class="h-sheet">BLIK OneClick</h2>' +
      '<p class="sheet-text">Płacisz bez przepisywania kodu. Każdą płatność potwierdzasz w aplikacji banku.</p></div>' +
      '<div class="card">' + PM.kv([
        { k: 'Status', v: '<span class="pay-badge pf-badge pf-badge--ok"><span class="dot"></span>Aktywny</span>', html: true },
        { k: 'Bank', v: bl.bank || 'Bank' },
        { k: 'Podpięty od', v: bl.od || '' },
        { k: 'Potwierdzenie', v: 'W aplikacji banku' }
      ]) + '</div>' +
      '<div class="sheet-actions">' +
        PM.btn('Odłącz BLIK', { variant: 'danger', block: true, attrs: { 'data-unlink': '' } }) +
        PM.btn('Zamknij', { variant: 'ghost', href: '#/portfel', block: true }) +
      '</div>' +
      '<p class="legal">Po odłączeniu boty nie zapłacą, dopóki znowu go nie podepniesz.</p>';
  }

  function mountManage(root) {
    var btn = root.querySelector('[data-unlink]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      btn.classList.add('is-loading');
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      function done() {
        blik().polaczony = false;
        PM.go('#/portfel/bez-blik');
        PM.toast('BLIK odłączony');
      }
      if (PM.shot) done();
      else PM.later(done, 700);
    });
  }

  /* ---------- rejestracja ---------- */
  PM.route('#/portfel', {
    title: 'Portfel', group: G, label: 'Portfel', tab: 'portfel',
    render: function (ctx) { return renderWallet(ctx, false); }
  });

  PM.route('#/portfel/bez-blik', {
    title: 'Portfel', group: G, label: 'Bez BLIK', tab: 'portfel',
    render: function (ctx) { return renderWallet(ctx, true); },
    mount: function () { blik().polaczony = false; }
  });

  PM.route('#/portfel/blik', {
    title: 'BLIK OneClick', group: G, label: 'Zarządzaj BLIK', tab: 'portfel',
    sheet: true, base: '#/portfel',
    render: function () { return renderManage(); },
    mount: function (root) { mountManage(root); }
  });
})();
