/* =====================================================================
   Profil płatnika Paymove · prototyp · js/s-boty.js
   Sekcja „5 Boty” (tab boty).

   Stany (kolejność rejestracji = kolejność w panelu Stany):
     #/boty                       lista połączonych botów z paskiem wydatków
     #/boty/limit-przekroczony    ChatGPT z wykorzystanym limitem (banner warn, pasek .is-over)
     #/boty/pusta                 brak połączonych agentów + jak połączyć
     #/bot/claude                 szczegół bota
     #/bot/chatgpt                szczegół bota
     #/bot/grok                   szczegół bota
     #/bot/perplexity             szczegół bota
     #/bot/claude/odlacz          sheet potwierdzenia (base #/bot/claude), bez X i grabbera
     #/bot/claude/odlaczono       lista bez Claude + toast „Claude odłączony”

   Uwaga: kontrakt (wspolne.md, sekcja 5) wymienia 9 hashy. Rejestrujemy
   dokładnie te, bez dodawania własnych.

   Mutacje stanu (PM.state.boty[i]):
     odlaczony: true            bot odłączony (znika z listy, szczegół pokazuje „Połącz ponownie”)
     uprawnienia[pole]: bool    toggle dostępu do danych
   Render zależy tylko od hasha i PM.state, w trybie ?shot=1 stan jest świeży.
   ===================================================================== */
(function () {
  'use strict';

  var PM = window.PM;
  if (!PM || typeof PM.route !== 'function') return;

  var DATA = window.PM_DATA || {};
  var GROUP = 'Boty';
  var BOT_IDS = ['claude', 'chatgpt', 'grok', 'perplexity'];
  var FIELDS = [
    { id: 'imie', label: 'Imię', icon: 'user-3-line' },
    { id: 'mail', label: 'Mail', icon: 'mail-line' },
    { id: 'adres', label: 'Adres', icon: 'map-pin-line' },
    { id: 'tablice', label: 'Numery rejestracyjne', icon: 'car-line' }
  ];

  PM.css(
    '.bsum{display:flex;flex-direction:column;gap:4px}' +
    '.bsum-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px}' +
    '.bsum .meta{margin-top:2px}' +
    '.bspend{display:flex;flex-direction:column;gap:8px}' +
    '.bspend-amt{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}' +
    '.bspend-amt .meta{white-space:nowrap}' +
    '.perm-row .meta{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.perm-row.is-off .name,.perm-row.is-off .meta{color:var(--ts)}' +
    '.perm-row.is-off .thumb .ico{opacity:.45}' +
    '.boty-hint{text-align:center;padding:4px 16px 0}' +
    '.bsheet-logo{margin-bottom:4px}' +
    '.howto{padding:16px}' +
    '.boty-empty .empty{padding:32px 24px 8px}' +
    '.bdet-danger{align-self:center}'
  );

  /* ---------- dane ---------- */
  function rawBot(id) {
    var list = DATA.boty || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function getBot(id) {
    var b = PM.bot(id);
    if (b) return b;
    var r = rawBot(id);
    return r ? JSON.parse(JSON.stringify(r)) : null;
  }
  function activeBots(exclude) {
    return ((PM.state && PM.state.boty) || []).filter(function (b) {
      return !b.odlaczony && b.id !== exclude;
    });
  }
  function fieldValue(fid) {
    var s = PM.state || {};
    var u = s.user || {}, a = s.adres || {};
    switch (fid) {
      case 'imie': return ((u.imie || '') + ' ' + (u.nazwisko || '')).trim();
      case 'mail': return u.mail || '';
      case 'adres': return [a.ulica, ((a.kod || '') + ' ' + (a.miasto || '')).trim()].filter(Boolean).join(', ');
      case 'tablice': return (s.tablice || []).length ? s.tablice.join(', ') : 'Brak numerów';
    }
    return '';
  }
  function recentPurchases(botId, n) {
    var list = ((PM.state && PM.state.zakupy) || []).filter(function (p) { return p.bot === botId; });
    list.sort(function (a, b) {
      var ka = (a.data || '') + ' ' + (a.godzina || ''), kb = (b.data || '') + ' ' + (b.godzina || '');
      return ka < kb ? 1 : ka > kb ? -1 : 0;
    });
    return list.slice(0, n || 3);
  }
  function monthLabel() {
    var m = (DATA.meta && DATA.meta.miesiac) || String(PM.today || '').slice(0, 7);
    return PM.monthLabel(m);
  }

  /* ---------- lista ---------- */
  function listContent(bots, o) {
    o = o || {};
    var ov = o.override || null;
    if (!bots.length) return emptyContent();

    var sum = 0;
    bots.forEach(function (b) { sum += ov && ov.bot === b.id ? ov.wydal : (b.wydal || 0); });

    var out = '';

    if (ov) {
      var ob = getBot(ov.bot);
      out += PM.banner({
        type: 'warn',
        title: (ob ? ob.nazwa : '') + ' wykorzystał limit',
        text: PM.zl(ov.wydal) + ' z ' + PM.zlInt(ob ? ob.limitMies : 0) + ' w tym miesiącu. Kolejne zakupy tego bota odrzucimy, dopóki nie zmienisz limitu.',
        right: '<a class="chip" href="#/limity/bot-' + PM.esc(ov.bot) + '">Zmień</a>'
      });
    }

    out +=
      '<div class="card pad bsum">' +
        '<div class="bsum-top"><span class="eyebrow eyebrow--s">' + PM.esc(monthLabel()) + '</span></div>' +
        '<div class="big-amount">' + PM.zl(sum) + '</div>' +
        '<div class="meta">Wydały połączone boty</div>' +
      '</div>';

    out +=
      '<section class="sec">' +
        '<div class="sec-h"><span>Aktywne</span><span class="count">' + bots.length + '</span></div>' +
        '<div class="list">' +
          bots.map(function (b) {
            if (ov && ov.bot === b.id) return PM.botRow(b, { wydal: ov.wydal, ostatnio: ov.ostatnio });
            return PM.botRow(b);
          }).join('') +
        '</div>' +
      '</section>';

    out += '<p class="hint boty-hint">Nowego bota połączysz linkiem z czatu.</p>';
    return out;
  }

  function emptyContent() {
    return '<div class="boty-empty">' +
      PM.emptyState({
        icon: 'robot-2-line',
        title: 'Brak połączonych agentów',
        text: 'Agenta połączysz z czatu. Gdy poprosi o płatność, wyśle Ci link do Paymove.'
      }) +
      '</div>' +
      '<section class="sec">' +
        '<div class="sec-h"><span>Jak połączyć</span></div>' +
        '<div class="card howto">' +
          '<ol class="steps">' +
            '<li>Poproś agenta w czacie o zakup</li>' +
            '<li>Otwórz link, który wyśle agent</li>' +
            '<li>Zezwól na dostęp i ustaw limit</li>' +
          '</ol>' +
        '</div>' +
      '</section>' +
      PM.btn('Zobacz przykład zgody', { variant: 'secondary', href: '#/zgoda', block: true, iconRight: 'link' });
  }

  function listScreen(o) {
    o = o || {};
    var bots = o.empty ? [] : activeBots(o.exclude);
    return PM.screen({
      title: 'Połączone boty',
      content: o.empty ? emptyContent() : listContent(bots, o)
    });
  }

  /* ---------- szczegół ---------- */
  function progressHtml(spent, limit, name) {
    var pct = limit > 0 ? Math.min(100, Math.max(0, Math.round(spent / limit * 100))) : 0;
    var over = limit > 0 && spent >= limit;
    var warn = !over && pct >= 80;
    return '<div class="progress' + (over ? ' is-over' : warn ? ' is-warn' : '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="' + limit + '" aria-valuenow="' + spent + '" aria-label="Wydatki ' + PM.esc(name) + '"><i style="width:' + pct + '%"></i></div>' +
      '<div class="progress-meta' + (over ? ' is-over' : '') + '"><span>limit ' + PM.zlInt(limit) + '/mies.</span><span>' + (over ? 'limit wykorzystany' : pct + '%') + '</span></div>';
  }

  function permCount(b) {
    var u = b.uprawnienia || {};
    var n = 0;
    FIELDS.forEach(function (f) { if (u[f.id]) n++; });
    return n;
  }

  function detailScreen(id) {
    var b = getBot(id);
    if (!b) return PM.screen({ title: 'Bot', content: PM.emptyState({ icon: 'robot-2-line', title: 'Nie ma takiego bota' }) });
    var off = !!b.odlaczony;
    var u = b.uprawnienia || {};

    var hero =
      '<div class="card pad profile">' +
        PM.botLogo(b.id, 64) +
        '<div class="pstack grow">' +
          '<div class="pname">' + PM.esc(b.nazwa) + '</div>' +
          '<div class="meta">' + PM.esc(b.firma || '') + '</div>' +
          (off
            ? '<span class="badge badge--cancel"><span class="dot"></span>Odłączony</span>'
            : '<span class="badge badge--ok"><span class="dot"></span>Połączony od ' + PM.esc(PM.date(b.polaczono)) + '</span>') +
        '</div>' +
      '</div>';

    var notice = off
      ? PM.banner({ type: 'info', title: 'Bot odłączony', text: 'Nie zapłaci w Twoim imieniu i nie widzi Twoich danych. Historia zakupów zostaje.' })
      : '';

    var spend =
      '<section class="sec">' +
        '<div class="sec-h"><span>W tym miesiącu</span></div>' +
        '<div class="card pad bspend">' +
          '<div class="bspend-amt"><span class="big-amount">' + PM.zl(b.wydal) + '</span><span class="meta">z ' + PM.zlInt(b.limitMies) + '</span></div>' +
          progressHtml(b.wydal || 0, b.limitMies || 0, b.nazwa) +
        '</div>' +
        '<div class="card">' +
          PM.kv([
            { k: 'Na jedną transakcję', v: PM.zlInt(b.limitTrans) },
            { k: 'Zakupy w tym miesiącu', v: String(b.zakupyMies || 0) },
            { k: 'Ostatnio', v: b.ostatnio || 'nigdy' },
            { k: 'Płatność', html: true, v: '<span class="tile tile--wide"><img src="assets/logos/blik-logo.svg" alt="BLIK"></span>OneClick' },
            { k: 'Potwierdzenie', v: 'w aplikacji banku' }
          ]) +
          '<a class="row divide" href="#/limity/bot-' + PM.esc(b.id) + '">' +
            '<div class="thumb thumb--sm">' + PM.icon('equalizer-line', 20) + '</div>' +
            '<div class="grow name">Limity bota</div>' +
            '<img class="row-chev" src="assets/icons/arrow-right-s-line.svg" alt="" aria-hidden="true">' +
          '</a>' +
        '</div>' +
      '</section>';

    var perms =
      '<section class="sec">' +
        '<div class="sec-h"><span>Dostęp do danych</span><span class="count" data-perm-count>' + permCount(b) + ' z ' + FIELDS.length + '</span></div>' +
        '<div class="card">' +
          FIELDS.map(function (f) {
            var on = !!u[f.id];
            var lid = 'perm-l-' + b.id + '-' + f.id;
            return '<div class="row perm-row' + (on ? '' : ' is-off') + '" data-perm-row="' + f.id + '">' +
              '<div class="thumb">' + PM.icon(f.icon, 20) + '</div>' +
              '<div class="grow"><div class="name" id="' + lid + '">' + PM.esc(f.label) + '</div>' +
              '<div class="meta">' + PM.esc(fieldValue(f.id)) + '</div></div>' +
              PM.toggle('perm-' + f.id, on, { labelledby: lid, disabled: off, attrs: { 'data-perm': f.id } }) +
            '</div>';
          }).join('') +
        '</div>' +
        '<p class="hint">Bot widzi tylko włączone dane. Zmiana działa od razu.</p>' +
      '</section>';

    var recent = recentPurchases(b.id, 3);
    var histHref = b.id === 'claude' ? '#/historia/bot-claude' : '#/historia';
    var purchases =
      '<section class="sec">' +
        '<div class="sec-h"><span>Ostatnie zakupy</span>' + (recent.length ? '<a href="' + histHref + '">Wszystkie</a>' : '') + '</div>' +
        (recent.length
          ? '<div class="list">' + recent.map(function (p) { return PM.purchaseRow(p); }).join('') + '</div>'
          : '<div class="card"><div class="row"><div class="thumb">' + PM.icon('inbox-line', 20) + '</div><div class="grow"><div class="name">Brak zakupów</div><div class="meta">Ten bot jeszcze nic nie kupił</div></div></div></div>') +
      '</section>';

    var danger = '';
    if (!off) {
      danger = b.id === 'claude'
        ? PM.btn('Odłącz ' + b.nazwa, { variant: 'danger', href: '#/bot/claude/odlacz', icon: 'logout-box-r-line', cls: 'bdet-danger' })
        : PM.btn('Odłącz ' + b.nazwa, { variant: 'danger', icon: 'logout-box-r-line', cls: 'bdet-danger', attrs: { 'data-disconnect': b.id } });
    }

    var cta = off
      ? PM.actions({ back: '#/boty', primary: { label: 'Połącz ponownie', attrs: { 'data-reconnect': b.id } } })
      : PM.actions({ back: '#/boty', primary: { label: 'Limity bota', href: '#/limity/bot-' + b.id } });

    return PM.screen({
      title: b.nazwa,
      showTitle: false,
      attrs: { 'data-bot-detail': b.id },
      content: hero + notice + spend + perms + purchases + danger,
      cta: cta
    });
  }

  function sheetBody(b) {
    return '<div class="sheet-head">' +
        '<div class="bsheet-logo">' + PM.botLogo(b.id, 64) + '</div>' +
        '<h2 class="h-sheet">Odłączyć ' + PM.esc(b.nazwa) + '?</h2>' +
        '<p class="sheet-text">' + PM.esc(b.nazwa) + ' nie zapłaci już w Twoim imieniu i straci dostęp do Twoich danych. Historia zakupów zostaje.</p>' +
      '</div>' +
      '<div class="sheet-actions">' +
        PM.btn('Odłącz', { variant: 'danger-solid', block: true, attrs: { 'data-disconnect-confirm': b.id } }) +
        (b.id === 'claude'
          ? PM.btn('Anuluj', { variant: 'ghost', block: true, href: '#/bot/claude' })
          : PM.btn('Anuluj', { variant: 'ghost', block: true, attrs: { 'data-sheet-cancel': '' } })) +
      '</div>';
  }

  function setDisconnected(id, on) {
    var b = PM.bot(id);
    if (b) b.odlaczony = !!on;
  }

  function mountDetail(root, id) {
    var scr = root.querySelector('[data-bot-detail="' + id + '"]');
    if (!scr) return;

    scr.addEventListener('pm:toggle', function (e) {
      var tg = e.detail && e.detail.el;
      var fid = tg && tg.getAttribute('data-perm');
      if (!fid) return;
      var b = PM.bot(id);
      if (!b) return;
      if (!b.uprawnienia) b.uprawnienia = {};
      b.uprawnienia[fid] = !!e.detail.on;
      var row = scr.querySelector('[data-perm-row="' + fid + '"]');
      if (row) row.classList.toggle('is-off', !e.detail.on);
      var cnt = scr.querySelector('[data-perm-count]');
      if (cnt) cnt.textContent = permCount(b) + ' z ' + FIELDS.length;
      PM.toast(e.detail.on ? 'Dostęp włączony' : 'Dostęp wyłączony');
    });

    scr.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var rc = t.closest('[data-reconnect]');
      if (rc) {
        e.preventDefault();
        setDisconnected(id, false);
        var b = getBot(id);
        PM.go('#/bot/' + id);
        PM.toast((b ? b.nazwa : 'Bot') + ' połączony');
        return;
      }
      var dc = t.closest('[data-disconnect]');
      if (dc) {
        e.preventDefault();
        var bot = getBot(id);
        if (!bot) return;
        PM.openSheet({
          body: sheetBody(bot),
          label: 'Odłącz ' + bot.nazwa,
          mount: function (layer) {
            var ok = layer.querySelector('[data-disconnect-confirm]');
            var cancel = layer.querySelector('[data-sheet-cancel]');
            if (ok) ok.addEventListener('click', function () {
              setDisconnected(id, true);
              PM.closeSheet();
              PM.go('#/boty');
              PM.toast(bot.nazwa + ' odłączony');
            });
            if (cancel) cancel.addEventListener('click', function () { PM.closeSheet(); });
          }
        });
      }
    });
  }

  /* ---------- rejestracja stanów ---------- */
  PM.route('#/boty', {
    title: 'Połączone boty', group: GROUP, label: 'Lista botów', tab: 'boty',
    render: function () { return listScreen(); }
  });

  PM.route('#/boty/limit-przekroczony', {
    title: 'Połączone boty', group: GROUP, label: 'Limit przekroczony', tab: 'boty',
    render: function (ctx) {
      var v = (ctx.state.warianty && ctx.state.warianty.limitPrzekroczony) || { bot: 'chatgpt', wydal: 300, ostatnio: 'dziś' };
      return listScreen({ override: v });
    }
  });

  PM.route('#/boty/pusta', {
    title: 'Połączone boty', group: GROUP, label: 'Brak botów', tab: 'boty',
    render: function () { return listScreen({ empty: true }); }
  });

  BOT_IDS.forEach(function (id) {
    var rb = rawBot(id);
    var name = rb ? rb.nazwa : id;
    PM.route('#/bot/' + id, {
      title: name, group: GROUP, label: 'Szczegół · ' + name, tab: 'boty',
      render: function () { return detailScreen(id); },
      mount: function (root) { mountDetail(root, id); }
    });
  });

  PM.route('#/bot/claude/odlacz', {
    title: 'Odłącz Claude', group: GROUP, label: 'Odłącz Claude (sheet)', tab: 'boty',
    sheet: true, base: '#/bot/claude',
    render: function () { return sheetBody(getBot('claude')); },
    mount: function (root) {
      var ok = root.querySelector('.sheet [data-disconnect-confirm]');
      if (ok) ok.addEventListener('click', function () {
        setDisconnected('claude', true);
        PM.go('#/bot/claude/odlaczono');
      });
    }
  });

  PM.route('#/bot/claude/odlaczono', {
    title: 'Połączone boty', group: GROUP, label: 'Claude odłączony', tab: 'boty',
    toast: 'Claude odłączony',
    render: function () { return listScreen({ exclude: 'claude' }); },
    mount: function () { setDisconnected('claude', true); }
  });
})();
