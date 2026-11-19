# Paymove Wallet · lista stanów

Prototyp: `index.html` (statyczny, bez build stepu). Każdy stan otwiera się hashem, np. `index.html#/portfel`. Dodaj `?shot=1`, żeby ukryć panel Stany i animacje (tryb zrzutów). Panel Stany: okrągły przycisk w prawym dolnym rogu.

Pusty hash prowadzi do `#/login`, nieznany do `#/portfel`. Na desktopie (od 1024 px) ekrany z nawigacją stoją w karcie ~720 px obok bocznego menu, logowanie i onboarding w węższej karcie ~600 px na środku.

Stanów: 62. Dane w prototypie to mock.


## Portfel

| Hash | Stan |
|---|---|
| `#/portfel` | Portfel (okrojony): powitanie, BLIK OneClick, Twoje konto |
| `#/portfel/bez-blik` | Portfel bez BLIK |
| `#/portfel/blik` | Zarządzaj BLIK (sheet) |

## Logowanie i onboarding

| Hash | Stan |
|---|---|
| `#/login` | Logowanie: Google, Apple, Facebook |
| `#/onboarding/1` | Krok 1 · Adres |
| `#/onboarding/2` | Krok 2 · Numer auta |
| `#/onboarding/3` | Krok 3 · BLIK (portfel) |
| `#/onboarding/3/checkout` | Checkout BLIK (sheet) |
| `#/onboarding/gotowe` | Gotowe |
| `#/zgoda` | Zgoda dla Claude |
| `#/zgoda/ok` | Claude połączony |
| `#/zgoda/odmowa` | Odmowa |

## Moje dane

| Hash | Stan |
|---|---|
| `#/dane` | Domyślny |
| `#/dane/niepotwierdzony` | Mail niepotwierdzony |
| `#/dane/adres` | Edycja adresu |
| `#/dane/adres-blad` | Adres, zły kod |
| `#/dane/numer-dodaj` | Dodaj numer |
| `#/dane/numer-blad` | Numer, zły format |
| `#/dane/numer-duplikat` | Numer, duplikat |
| `#/dane/numer-usun` | Usuń numer (sheet) |
| `#/dane/bez-numerow` | Bez numerów |
| `#/dane/mail-zmien` | Zmiana maila |
| `#/dane/mail-kod` | Kod z maila |
| `#/dane/zapisano` | Zapisano |

## Historia

| Hash | Stan |
|---|---|
| `#/historia` | Wszystkie zakupy |
| `#/historia/bilety` | Filtr: bilety |
| `#/historia/parking` | Filtr: parking |
| `#/historia/uslugi` | Filtr: usługi |
| `#/historia/bot-claude` | Filtr: Claude |
| `#/historia/pusta` | Pusta historia |
| `#/historia-a` | Historia · wariant A (ikony kategorii) |
| `#/historia-b` | Historia · wariant B (monogramy i dni) |
| `#/historia-c` | Historia · wariant C (bilety i tablice) |
| `#/zakup/zaplacono` | Zakup: zapłacono |
| `#/zakup/w-toku` | Zakup: w toku |
| `#/zakup/nieudana` | Zakup: nieudana |
| `#/zakup/anulowano` | Zakup: anulowano |
| `#/zakup/zwrot-w-toku` | Zakup: zwrot w toku |
| `#/zakup/zwrocono` | Zakup: zwrócono |

## Zwrot

| Hash | Stan |
|---|---|
| `#/zwrot` | Zgłoszenie |
| `#/zwrot/blad` | Brak powodu |
| `#/zwrot/czesciowy` | Kwota częściowa |
| `#/zwrot/wysylanie` | Wysyłanie |
| `#/zwrot/wyslano` | Wysłano |
| `#/zwrot/niedostepny` | Po terminie |
| `#/zwrot/zwrocono` | Zwrócono |

## Boty

| Hash | Stan |
|---|---|
| `#/boty` | Lista botów |
| `#/boty/limit-przekroczony` | Limit przekroczony |
| `#/boty/pusta` | Brak botów |
| `#/bot/claude` | Szczegół · Claude |
| `#/bot/chatgpt` | Szczegół · ChatGPT |
| `#/bot/grok` | Szczegół · Grok |
| `#/bot/perplexity` | Szczegół · Perplexity |
| `#/bot/claude/odlacz` | Odłącz Claude (sheet) |
| `#/bot/claude/odlaczono` | Claude odłączony |

## Limity

| Hash | Stan |
|---|---|
| `#/limity` | Ogólne, okres miesięczny |
| `#/limity/dzienny` | Okres dzienny |
| `#/limity/potwierdzenie-wyl` | Potwierdzenie wyłączone |
| `#/limity/bot-claude` | Limity Claude |
| `#/limity/blad-bot` | Błąd: limit bota |
| `#/limity/blad-transakcja` | Błąd: limit transakcji |
| `#/limity/zapisano` | Zapisano |
| `#/potwierdzenie` | Prośba o potwierdzenie |
| `#/potwierdzenie/zatwierdzono` | Zatwierdzono |

