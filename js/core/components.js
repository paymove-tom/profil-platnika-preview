/* Komponenty HTML (zwracają string). Każdy przypisany do PM.<nazwa>;
   wewnętrzne wywołania idą przez PM.*, jak w oryginale. */
import { PM } from './pm.js';
import { esc, attrs, clamp, uid } from './util.js';
import { STATUS, BOT_LOGOS, LOGO_INK } from './state.js';
import { pctOf } from './behaviors.js';

export const icon = PM.icon = function (name, size, cls) {
  var st = size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '';
  return '<img class="ico' + (cls ? ' ' + esc(cls) : '') + '" src="assets/icons/' + esc(name) + '.svg" alt="" aria-hidden="true" draggable="false"' + st + '>';
};

export const botLogo = PM.botLogo = function (id, size) {
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

export const spinner = PM.spinner = function (cls) {
  return '<span class="spinner' + (cls ? ' ' + esc(cls) : '') + '" role="status" aria-label="Ładowanie"></span>';
};

export const header = PM.header = function (o) {
  o = o || {};
  var back = '';
  if (o.back) {
    var href = o.back === true ? '' : o.back;
    back = href
      ? '<a class="hdr-back" href="' + esc(href) + '" aria-label="Wstecz">' + PM.icon('arrow-left-s-line', 20) + '</a>'
      : '<a class="hdr-back" href="#" data-back aria-label="Wstecz">' + PM.icon('arrow-left-s-line', 20) + '</a>';
  }
  var tag = o.tag ? '<span class="ex-tag">' + esc(o.tag) + '</span>' : '';
  /* t418: logo Paymove nie jest już w nagłówku (jest w stopce, PM.brandFoot); pusty nagłówek = odstęp od góry */
  return '<header class="hdr' + (back || tag ? '' : ' hdr--bare') + '"' + (o.title ? ' aria-label="' + esc(o.title) + '"' : '') + '>' +
    back + tag +
    '</header>';
};

export function asBtn(x, variant) {
  if (!x) return '';
  if (typeof x === 'string') return x.trim().charAt(0) === '<' ? x : PM.btn(x, { variant: variant });
  var o = {};
  Object.keys(x).forEach(function (k) { o[k] = x[k]; });
  if (!o.variant) o.variant = variant;
  return PM.btn(o.label || '', o);
}

export const actions = PM.actions = function (o) {
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

/* t418: stopka z logo Paymove (małe, wyszarzone, na końcu treści) */
export const brandFoot = PM.brandFoot = function () {
  return '<div class="pm-foot"><img src="' + LOGO_INK + '" alt="Paymove" width="80" height="14" loading="lazy" decoding="async"></div>';
};

export const screen = PM.screen = function (o) {
  o = o || {};
  var head = o.header === false ? '' : (typeof o.header === 'string' ? o.header : PM.header({ back: o.back, title: o.title, tag: o.tag }));
  var title = o.title && o.showTitle !== false
    ? (o.titleRight ? '<div class="title-row"><h1 class="title">' + esc(o.title) + '</h1>' + o.titleRight + '</div>' : '<h1 class="title">' + esc(o.title) + '</h1>')
    : '';
  var cta = '';
  if (o.cta) cta = /^\s*<div[^>]*class="[^"]*\bcta-bar\b/.test(o.cta) ? o.cta : '<div class="cta-bar">' + o.cta + '</div>';
  return '<section class="screen' + (o.cls ? ' ' + esc(o.cls) : '') + '"' + attrs(o.attrs) + '>' +
    head +
    '<div class="content' + (o.contentCls ? ' ' + esc(o.contentCls) : '') + '" tabindex="0">' + title + (o.content || '') + '</div>' +
    cta +
    '</section>';
};

export const btn = PM.btn = function (label, o) {
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

export const statusLabel = PM.statusLabel = function (s) { return (STATUS[s] || { label: s || '' }).label; };
export const statusBadge = PM.statusBadge = function (s) {
  var st = STATUS[s] || { label: s || '', cls: 'cancel' };
  return '<span class="badge badge--' + st.cls + '"><span class="dot"></span>' + esc(st.label) + '</span>';
};
export const statusInline = PM.statusInline = function (s) {
  var st = STATUS[s] || { label: s || '', color: 'var(--off)' };
  return '<span class="status"><i class="dot" style="background:' + st.color + '"></i>' + esc(st.label) + '</span>';
};

export const by = PM.by = function (botId) {
  return '<span class="by">' + PM.botLogo(botId, 18) + 'przez ' + esc(PM.botName(botId)) + '</span>';
};

export const purchaseHref = PM.purchaseHref = function (p) {
  return '#/zakup/' + p.status + '?id=' + encodeURIComponent(p.id);
};

export const purchaseRow = PM.purchaseRow = function (p, o) {
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

export const purchaseTimeline = PM.purchaseTimeline = function (p) {
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

export const botRow = PM.botRow = function (b, o) {
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

export const field = PM.field = function (o) {
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

export const amountField = PM.amountField = function (o) {
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

export const codeInput = PM.codeInput = function (o) {
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

export const toggle = PM.toggle = function (id, on, o) {
  o = o || {};
  return '<button class="toggle" type="button" role="switch" id="' + esc(id) + '" aria-checked="' + (on ? 'true' : 'false') + '"' +
    (o.labelledby ? ' aria-labelledby="' + esc(o.labelledby) + '"' : '') +
    (o.label ? ' aria-label="' + esc(o.label) + '"' : '') +
    (o.target ? ' data-target="' + esc(o.target) + '"' : '') +
    (o.disabled ? ' disabled' : '') + attrs(o.attrs) + '></button>';
};

export const seg = PM.seg = function (items, active, a) {
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

export const emptyState = PM.emptyState = function (o) {
  o = o || {};
  var cta = '';
  if (o.cta) cta = typeof o.cta === 'string' ? o.cta : PM.btn(o.cta.label, { variant: o.cta.variant || 'secondary', href: o.cta.href, attrs: o.cta.attrs, icon: o.cta.icon });
  return '<div class="empty">' +
    '<div class="empty-ico">' + PM.icon(o.icon || 'inbox-line', 28) + '</div>' +
    (o.title ? '<p class="empty-title">' + esc(o.title) + '</p>' : '') +
    (o.text ? '<p class="empty-text">' + esc(o.text) + '</p>' : '') +
    cta + '</div>';
};

export const banner = PM.banner = function (o) {
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

export const kv = PM.kv = function (rows, cls) {
  return '<dl class="kv' + (cls ? ' ' + cls : '') + '">' + (rows || []).map(function (r) {
    return '<div class="kv-row"><dt>' + esc(r.k) + '</dt><dd' + (r.mono ? ' class="mono"' : '') + '>' + (r.html ? r.v : esc(r.v)) + '</dd></div>';
  }).join('') + '</dl>';
};

export const sheet = PM.sheet = function (o) {
  o = o || {};
  return '<div class="sheet-layer">' +
    '<div class="scrim" data-sheet-scrim></div>' +
    '<div class="sheet' + (o.cls ? ' ' + esc(o.cls) : '') + '" role="dialog" aria-modal="true"' + (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + '>' + (o.body || '') + '</div>' +
    '</div>';
};
