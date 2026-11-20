# Paymove Wallet · klikalna makieta (podstawa UI)

Statyczna aplikacja (vanilla JS, ES modules, **bez buildu**) hostowana na GitHub Pages. Routing po hashu (`#/portfel`), dane to mock. Lista stanów: panel „Stany” (desktop) i [stany.md](stany.md).

Live: https://paymove-tom.github.io/profil-platnika-preview/ (push na `main` = wdrożenie w ~30 s).

## Parametry URL
- `?demo=1` – ukrywa panel Stany (zapamiętane w sessionStorage, `?demo=0` wyłącza).
- `?shot=1` – tryb zrzutów: bez animacji i panelu, deterministyczny render.
- Panel Stany jest ukryty na telefonach i tabletach (<1024 px).

## Struktura
```
index.html            shell dokumentu, <link> do css/*, import map (cache busting), js/main.js
css/
  fonts, tokens, base   fonty, tokeny (kolory, cienie, promienie, typografia --t-*, easing), reset
  shell, cards, actions, forms, feedback, chrome   układ i komponenty (kolejność w index.html = kaskada)
  responsive, shot, checkout, blik-button, mobile-*  warianty desktop/telefon, checkout BLIK
  touch.css             obszary dotyku 44 px
  app-shell.css, screens/<ekran>.css   style ekranów
js/
  main.js               importuje rdzeń i ekrany (kolejność = kolejność w panelu Stany), start()
  data.js               mock danych (export DATA)
  core/                 env, util, pm (obiekt API window.PM), state, timers, behaviors,
                        components (budowniczowie HTML), shell, overlay (sheet, toast),
                        events (delegacja, klawiatura onboardingu), router, index
  screens/              auth, portfel, dane, historia, boty, limity, zakupy
```

## Jak dodać ekran
1. W `js/screens/<nazwa>.js` (albo nowym pliku) `import { PM } from '../core/index.js';` i zarejestruj trasę:
   `PM.route('#/moj/ekran', { title, group, label, tab, render(ctx){ return PM.screen({ title, content, cta }) }, mount(root, ctx){ ... } })`.
   Sheet: `sheet:true, base:'#/ekran-bazowy'` (baza zostaje w DOM, zmienia się tylko warstwa sheetu).
2. Style w `css/screens/<nazwa>.css`, wyłącznie na tokenach (`var(--...)`), bez CSS w JS.
3. Nowy plik: dodaj `<link>` (CSS) lub wpis w import mapie (JS) w `index.html` oraz `import` w `js/main.js`.
4. Pełne API (`PM.btn`, `PM.field`, `PM.sheet`, `PM.toast`, timery `PM.later/every/onLeave` z zakresami, `ctx`) opisane w nagłówku `js/core/pm.js`.

## Zasady wydajności i UX (nie psuć)
- Router nie czyści shellu: podmienia tylko `.view`; tab bar zostaje. Animacje wejścia grają tylko przy pierwszej wizycie ekranu (powroty i przełączanie zakładek kończą je od razu), fade ekranu tylko przy starcie (`html.is-booting`).
- Sheet nad ekranem bazowym nie przerysowuje bazy; timery mają zakresy `base`/`sheet`.
- `backdrop-filter` tylko na sheet, scrim, tab bar, sidenav, panel Stany. Nie dodawać `will-change` globalnie.
- Pola formularzy min. 16 px (brak zoomu iOS). Klawiatura iOS: `visualViewport` (checkout `is-kb`, onboarding `initObFocus`); `interactive-widget` w meta jest tylko dla Androida.
- Kontrolki mają obszar dotyku ≥44 px (`css/touch.css`).

## Checkout BLIK (iframe)
`js/screens/auth.js`: URL i `externalId` (`CHECKOUT_URL`, `CHECKOUT_EXT`). Wiadomości `paymove:ready|resize|success|error|closed` tylko z origin `https://checkout.paymove.io` i od naszego iframe; stan „zapłacone” kluczowany `externalId`. Nowy link weryfikacyjny = podmiana obu stałych.

## Deploy
```
tools/bump-version.sh      # podbija ?v=... w index.html (CSS, moduły, import map)
git add -A && git commit -m "..." && git push origin main
```
Wymagane: Safari 16.4+ / Chrome 89+ (import map). Bez tego strona pokazuje komunikat.
Testy i audyt mobilne (poza repo): `/workspace/makiety/profil-platnika/audyt/` (`audit.py`, `smoke.py`, `kb.py`, `shots.py`, `compare.py`).
