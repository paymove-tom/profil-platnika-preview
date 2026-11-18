# Profil płatnika Paymove · lista stanów

Prototyp: `index.html` (statyczny, bez build stepu). Każdy stan otwiera się hashem, np. `index.html#/limity`. Dodaj `?shot=1`, żeby ukryć panel Stany i animacje (tryb zrzutów). Panel Stany: okrągły przycisk w prawym dolnym rogu.

Stanów: 62. Kwoty i dane: przykład.


## Logowanie

| Hash | Stan | PNG |
|---|---|---|
| `#/login` | Mail pusty | `png/login.png` |
| `#/login/blad-mail` | Zły format maila | `png/login__blad-mail.png` |
| `#/login/wyslano` | Wysłano kod i link | `png/login__wyslano.png` |
| `#/login/kod` | Kod pusty | `png/login__kod.png` |
| `#/login/kod-czesciowy` | Kod częściowy | `png/login__kod-czesciowy.png` |
| `#/login/kod-bledny` | Kod błędny | `png/login__kod-bledny.png` |
| `#/login/kod-wygasl` | Kod wygasł | `png/login__kod-wygasl.png` |
| `#/login/link` | Potwierdzanie linku | `png/login__link.png` |
| `#/login/link-ok` | Zalogowano | `png/login__link-ok.png` |
| `#/onboarding` | Imię (pierwszy login) | `png/onboarding.png` |
| `#/zgoda` | Zgoda dla Claude | `png/zgoda.png` |
| `#/zgoda/ok` | Claude połączony | `png/zgoda__ok.png` |
| `#/zgoda/odmowa` | Odmowa | `png/zgoda__odmowa.png` |

## Moje dane

| Hash | Stan | PNG |
|---|---|---|
| `#/dane` | Domyślny | `png/dane.png` |
| `#/dane/niepotwierdzony` | Mail niepotwierdzony | `png/dane__niepotwierdzony.png` |
| `#/dane/adres` | Edycja adresu | `png/dane__adres.png` |
| `#/dane/adres-blad` | Adres, zły kod | `png/dane__adres-blad.png` |
| `#/dane/numer-dodaj` | Dodaj numer | `png/dane__numer-dodaj.png` |
| `#/dane/numer-blad` | Numer, zły format | `png/dane__numer-blad.png` |
| `#/dane/numer-duplikat` | Numer, duplikat | `png/dane__numer-duplikat.png` |
| `#/dane/numer-usun` | Usuń numer (sheet) | `png/dane__numer-usun.png` |
| `#/dane/bez-numerow` | Bez numerów | `png/dane__bez-numerow.png` |
| `#/dane/mail-zmien` | Zmiana maila | `png/dane__mail-zmien.png` |
| `#/dane/mail-kod` | Kod z maila | `png/dane__mail-kod.png` |
| `#/dane/zapisano` | Zapisano | `png/dane__zapisano.png` |

## Historia

| Hash | Stan | PNG |
|---|---|---|
| `#/historia` | Wszystkie zakupy | `png/historia.png` |
| `#/historia/bilety` | Filtr: bilety | `png/historia__bilety.png` |
| `#/historia/parking` | Filtr: parking | `png/historia__parking.png` |
| `#/historia/uslugi` | Filtr: usługi | `png/historia__uslugi.png` |
| `#/historia/bot-claude` | Filtr: Claude | `png/historia__bot-claude.png` |
| `#/historia/pusta` | Pusta historia | `png/historia__pusta.png` |
| `#/zakup/zaplacono` | Zakup: zapłacono | `png/zakup__zaplacono.png` |
| `#/zakup/w-toku` | Zakup: w toku | `png/zakup__w-toku.png` |
| `#/zakup/nieudana` | Zakup: nieudana | `png/zakup__nieudana.png` |
| `#/zakup/anulowano` | Zakup: anulowano | `png/zakup__anulowano.png` |
| `#/zakup/zwrot-w-toku` | Zakup: zwrot w toku | `png/zakup__zwrot-w-toku.png` |
| `#/zakup/zwrocono` | Zakup: zwrócono | `png/zakup__zwrocono.png` |

## Zwrot

| Hash | Stan | PNG |
|---|---|---|
| `#/zwrot` | Zgłoszenie | `png/zwrot.png` |
| `#/zwrot/blad` | Brak powodu | `png/zwrot__blad.png` |
| `#/zwrot/czesciowy` | Kwota częściowa | `png/zwrot__czesciowy.png` |
| `#/zwrot/wysylanie` | Wysyłanie | `png/zwrot__wysylanie.png` |
| `#/zwrot/wyslano` | Wysłano | `png/zwrot__wyslano.png` |
| `#/zwrot/niedostepny` | Po terminie | `png/zwrot__niedostepny.png` |
| `#/zwrot/zwrocono` | Zwrócono | `png/zwrot__zwrocono.png` |

## Boty

| Hash | Stan | PNG |
|---|---|---|
| `#/boty` | Lista botów | `png/boty.png` |
| `#/boty/limit-przekroczony` | Limit przekroczony | `png/boty__limit-przekroczony.png` |
| `#/boty/pusta` | Brak botów | `png/boty__pusta.png` |
| `#/bot/claude` | Szczegół · Claude | `png/bot__claude.png` |
| `#/bot/chatgpt` | Szczegół · ChatGPT | `png/bot__chatgpt.png` |
| `#/bot/grok` | Szczegół · Grok | `png/bot__grok.png` |
| `#/bot/perplexity` | Szczegół · Perplexity | `png/bot__perplexity.png` |
| `#/bot/claude/odlacz` | Odłącz Claude (sheet) | `png/bot__claude__odlacz.png` |
| `#/bot/claude/odlaczono` | Claude odłączony | `png/bot__claude__odlaczono.png` |

## Limity

| Hash | Stan | PNG |
|---|---|---|
| `#/limity` | Ogólne, okres miesięczny | `png/limity.png` |
| `#/limity/dzienny` | Okres dzienny | `png/limity__dzienny.png` |
| `#/limity/potwierdzenie-wyl` | Potwierdzenie wyłączone | `png/limity__potwierdzenie-wyl.png` |
| `#/limity/bot-claude` | Limity Claude | `png/limity__bot-claude.png` |
| `#/limity/blad-bot` | Błąd: limit bota | `png/limity__blad-bot.png` |
| `#/limity/blad-transakcja` | Błąd: limit transakcji | `png/limity__blad-transakcja.png` |
| `#/limity/zapisano` | Zapisano | `png/limity__zapisano.png` |
| `#/potwierdzenie` | Prośba o potwierdzenie | `png/potwierdzenie.png` |
| `#/potwierdzenie/zatwierdzono` | Zatwierdzono | `png/potwierdzenie__zatwierdzono.png` |

Desktop: `png/_desktop-historia.png`, `png/_desktop-limity.png`. Siatka wszystkich: `png/_przeglad.png`.
