/* =====================================================================
   Profil płatnika Paymove · prototyp · js/core/pm.js
   Globalny obiekt PM (window.PM) i lista stanów (window.PM_STATES).
   Zero zależności, moduły ES bez buildu, bez fetch.

   ---------------------------------------------------------------------
   API (window.PM)
   ---------------------------------------------------------------------
   Router
     PM.route(hash, def)        rejestruje stan. def:
        title     tytuł dokumentu i paska makiety
        group     sekcja w panelu Stany (kolejność = kolejność rejestracji)
        label     nazwa w panelu Stany (domyślnie title)
        tab       'dane' | 'historia' | 'boty' | 'limity' | null (bez tab bara)
        render(ctx) => string HTML
                  a) pełny ekran: '<section class="screen">...</section>'
                     (najprościej przez PM.screen({...}))
                  b) sama treść: core owinie ją w PM.screen({content})
                  dla sheet:true render zwraca WNĘTRZE sheetu (core owija
                  w PM.sheet) albo gotowe '<div class="sheet-layer">'
        mount(root, ctx)  opcjonalnie, po wstawieniu do DOM.
                  root = div.device (ekran + sheet + toasty)
        sheet:true + base:'#/...'  rysuje ekran base, a nad nim sheet
        toast:'Zapisano'           toast pokazywany po renderze stanu
        back:'#/...'               przy auto owijaniu: przycisk wstecz w nagłówku
     PM.go(hash, {replace})     nawigacja; ten sam hash = ponowny render
     PM.current()               { hash, path, query, def }
     PM.render(), PM.invalidate(), PM.start()
     ctx = { hash, path, query, params, state, shot, def, isBase, el }
       hash z parametrami: '#/zakup/zaplacono?id=z-2611-zoo' (ctx.query.id)
     Nieznany hash => '#/dane', pusty => '#/login'. Brak stanu => ekran zastępczy.
     window.PM_STATES = [{ hash, group, label, title, tab }] w kolejności rejestracji.

   Stan
     PM.state         mutowalna kopia PM_DATA
     PM.resetState()  przywraca PM_DATA
     PM.bot(id), PM.purchase(id), PM.purchaseByStatus(status), PM.canRefund(p)
     PM.shot          true w trybie ?shot=1 (bez animacji, bez panelu, statycznie)

   Helpery HTML (zwracają string)
     PM.icon(nazwa, size?, cls?)           <img class="ico"> z assets/icons
     PM.botLogo(id, size?)                 biały kafelek .tile z prawdziwym logo
     PM.header({ back?, title?, tag? })    nagłówek z logo Paymove + "Przykład"
     PM.screen({ title, back, cls, content, contentCls, cta, header })
     PM.actions({ back, primary, secondary, legal })   wnętrze .cta-bar
     PM.btn(label, { variant, href, attrs, icon, iconRight, block, sm, loading, disabled, type, cls })
     PM.statusBadge(status), PM.statusInline(status), PM.statusLabel(status)
     PM.purchaseRow(p, { card=true, refund=false, href })
     PM.purchaseTimeline(p)
     PM.botRow(b|id, { href, wydal })
     PM.field({ id, label, value, placeholder, type, error, hint, mono, attrs, autofocus })
     PM.amountField({ id, label, value, min, max, step, error, hint, bot, divide, bare, disabled })
     PM.codeInput({ value, error, disabled, focusIndex })
     PM.toggle(id, on, { label, labelledby, target, disabled })
     PM.seg(items, active, attrs)          items: ['a'] lub [{ value, label, href }]
     PM.emptyState({ icon, title, text, cta: { label, href, variant } })
     PM.banner({ type, icon, title, text })
     PM.kv([{ k, v, mono, html }])
     PM.sheet({ body, cls, label })        sheet bez X i bez grabbera
     PM.spinner(cls?)

   Zachowania (wywołuj w mount)
     PM.bindAmount(root, onChange(id, value, wrap))   suwak <-> pole kwoty
     PM.setAmountError(root, id, msg|null)
     PM.bindCode(root, onComplete(code, api), onChange?)  6 pól kodu
     PM.countdown(el, sekundy, onDone)     w trybie shot statycznie
     PM.later(fn, ms), PM.every(fn, ms), PM.onLeave(fn)  czyszczone przy zmianie stanu,
                                           w trybie shot later/every nie startują
     PM.openSheet({ body }), PM.closeSheet()
     PM.toast(msg, { icon, duration })    w trybie shot zostaje na ekranie
     PM.esc(s), PM.zl(n) => "86,00 zł", PM.zlInt(n) => "500 zł",
     PM.date('2026-11-12') => "12.11.2026", PM.dateLong(..) => "12 listopada 2026",
     PM.monthLabel('2026-11') => "Listopad 2026", PM.groupByMonth(lista)

   Delegacja (globalnie, działa od razu)
     [data-go="#/..."]            klik => PM.go
     [data-back]                  klik => history.back (lub data-back="#/...")
     [data-toast="tekst"]         klik => PM.toast
     .toggle[role=switch]         klik przełącza aria-checked, data-target
                                  wyszarza cel; zdarzenie 'pm:toggle' {id,on}
     .seg .seg-item (button)      klik ustawia aktywny; zdarzenie 'pm:seg' {value,seg}
     .scrim                       klik zamyka sheet (stan sheet => base)
   Po każdym renderze: document 'pm:render' {hash}, html[data-pm-ready=hash].

   ---------------------------------------------------------------------
   Przykład rejestracji stanu z modułu (np. js/s-dane.js)
   ---------------------------------------------------------------------
   import { PM } from '../core/index.js';

   PM.route('#/dane/adres', {
     title: 'Adres', group: '2 Moje dane', label: 'Edycja adresu', tab: 'dane',
     render: function (ctx) {
       var a = ctx.state.adres;
       return PM.screen({
         title: 'Adres',
         content:
           PM.field({ id: 'ulica', label: 'Ulica i numer', value: a.ulica }) +
           '<div class="input-row">' +
             PM.field({ id: 'kod', label: 'Kod', value: a.kod, attrs: { inputmode: 'numeric' } }) +
             PM.field({ id: 'miasto', label: 'Miasto', value: a.miasto }) +
           '</div>',
         cta: PM.actions({ back: '#/dane', primary: { label: 'Zapisz', attrs: { 'data-save': '' } } })
       });
     },
     mount: function (root, ctx) {
       root.querySelector('[data-save]').addEventListener('click', function () {
         ctx.state.adres.ulica = root.querySelector('#ulica').value;
         PM.go('#/dane/zapisano');
       });
     }
   });

   PM.route('#/dane/numer-usun', {
     title: 'Usuń numer', group: '2 Moje dane', tab: 'dane', sheet: true, base: '#/dane',
     render: function () {
       return '<div class="sheet-head"><h2 class="h-sheet">Usunąć GD 9876B?</h2></div>' +
         '<div class="sheet-actions">' + PM.btn('Usuń', { variant: 'danger-solid' }) +
         PM.btn('Anuluj', { variant: 'ghost', href: '#/dane' }) + '</div>';
     }
   });
   ===================================================================== */

export const PM = window.PM = window.PM || {};
export const STATES = window.PM_STATES = window.PM_STATES || [];
