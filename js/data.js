/* =====================================================================
   Profil płatnika Paymove · prototyp · js/data.js
   Dane przykładowe (mock). Wszystkie kwoty i dane to przykład.
   core.js robi z tego głęboką kopię: PM.state (mutowalna), PM.resetState().

   Konwencje:
   - kwoty: liczby w złotych (86 = 86,00 zł), formatuje PM.zl()
   - daty: 'RRRR-MM-DD', godziny: 'GG:MM'
   - typ zakupu: bilet | parking | usluga
   - status: zaplacono | w-toku | nieudana | anulowano | zwrot-w-toku | zwrocono
   - bot: claude | chatgpt | grok | perplexity
   ===================================================================== */
window.PM_DATA = {
  meta: {
    przyklad: true,
    dzis: '2026-11-15',
    miesiac: '2026-11',
    metoda: 'BLIK OneClick',
    metodaOpis: 'potwierdzone w aplikacji banku'
  },

  user: {
    imie: 'Tomasz',
    nazwisko: 'Gęsior',
    inicjaly: 'TG',
    mail: 'tomasz.gesior@paymove.io',
    mailPotwierdzony: true,
    nowyMail: 'tomasz@gesior.pl',
    pierwszeLogowanie: false
  },

  adres: {
    ulica: 'ul. Długa 12/4',
    kod: '80-831',
    miasto: 'Gdańsk'
  },

  tablice: ['WX 1234A', 'GD 9876B'],

  /* metoda płatności BLIK OneClick (portfel, onboarding krok 4) */
  blik: { polaczony: true, bank: 'PKO BP', od: '19.11.2026' },

  /* onboarding po social loginie: mail z konta Google, reszta pusta */
  onboarding: {
    mail: 'tomasz.gesior@paymove.io',
    adres: { ulica: '', kod: '', miasto: '' },
    rejestracja: ''
  },

  /* pola danych, do których bot może mieć dostęp (zgoda i uprawnienia) */
  pola: [
    { id: 'imie', label: 'Imię', ikona: 'user-3-line', wartosc: 'Tomasz Gęsior' },
    { id: 'mail', label: 'Mail', ikona: 'mail-line', wartosc: 'tomasz.gesior@paymove.io' },
    { id: 'adres', label: 'Adres', ikona: 'map-pin-line', wartosc: 'ul. Długa 12/4, 80-831 Gdańsk' },
    { id: 'tablice', label: 'Numery rejestracyjne', ikona: 'car-line', wartosc: 'WX 1234A, GD 9876B' }
  ],

  typy: {
    bilet: { label: 'Bilet', mnoga: 'Bilety', ikona: 'ticket-2-line' },
    parking: { label: 'Parking', mnoga: 'Parking', ikona: 'parking-box-line' },
    usluga: { label: 'Usługa', mnoga: 'Usługi', ikona: 'customer-service-2-line' }
  },

  statusy: {
    'zaplacono': { label: 'Zapłacono', cls: 'ok' },
    'w-toku': { label: 'W toku', cls: 'pending' },
    'nieudana': { label: 'Nieudana', cls: 'fail' },
    'anulowano': { label: 'Anulowano', cls: 'cancel' },
    'zwrot-w-toku': { label: 'Zwrot w toku', cls: 'refund' },
    'zwrocono': { label: 'Zwrócono', cls: 'refund' }
  },

  zakupy: [
    /* ---------- listopad 2026 ---------- */
    {
      id: 'z-2611-teatr', typ: 'bilet', nazwa: 'Teatr Szekspirowski',
      opis: 'Hamlet, 2 bilety, rząd 7', miejsce: 'ul. Bogusławskiego 1, Gdańsk',
      kwota: 128, data: '2026-11-15', godzina: '09:12',
      status: 'w-toku', bot: 'claude', terminZwrotu: '2026-11-29',
      nrTransakcji: 'PM-2611-1509-12', metoda: 'BLIK OneClick'
    },
    {
      id: 'z-2611-zoo', typ: 'bilet', nazwa: 'Zoo Gdańsk',
      opis: '2 bilety normalne', miejsce: 'ul. Karwieńska 3, Gdańsk Oliwa',
      kwota: 86, data: '2026-11-12', godzina: '14:32',
      status: 'zaplacono', bot: 'claude', terminZwrotu: '2026-11-26',
      nrTransakcji: 'PM-2611-1214-32', metoda: 'BLIK OneClick'
    },
    {
      id: 'z-2611-baltycka', typ: 'parking', nazwa: 'Galeria Bałtycka',
      opis: 'Postój 3 h', tablica: 'GD 9876B', miejsce: 'al. Grunwaldzka 141, Gdańsk',
      kwota: 12, data: '2026-11-10', godzina: '17:05',
      status: 'zaplacono', bot: 'chatgpt', terminZwrotu: '2026-11-24',
      nrTransakcji: 'PM-2611-1017-05', metoda: 'BLIK OneClick'
    },
    {
      id: 'z-2611-stolik', typ: 'usluga', ikona: 'restaurant-line', nazwa: 'Rezerwacja stolika',
      opis: 'Restauracja Szafarnia 10, 4 osoby', miejsce: 'ul. Szafarnia 10, Gdańsk',
      kwota: 0, kwotaPierwotna: 120, data: '2026-11-08', godzina: '20:40',
      status: 'anulowano', bot: 'grok', terminZwrotu: null,
      powodAnulowania: 'Restauracja odwołała rezerwację',
      nrTransakcji: 'PM-2611-0820-40', metoda: 'BLIK OneClick'
    },
    {
      id: 'z-2611-pralnia', typ: 'usluga', nazwa: 'Pralnia Wrzeszcz',
      opis: 'Odbiór i pranie płaszcza', miejsce: 'ul. Grunwaldzka 76, Gdańsk',
      kwota: 40, data: '2026-11-06', godzina: '11:20',
      status: 'zaplacono', bot: 'perplexity', terminZwrotu: '2026-11-20',
      nrTransakcji: 'PM-2611-0611-20', metoda: 'BLIK OneClick'
    },
    {
      id: 'z-2611-oliwa', typ: 'parking', nazwa: 'Parking Gdańsk Oliwa',
      opis: 'Strefa A, 12 h', tablica: 'WX 1234A', miejsce: 'ul. Grunwaldzka 482, Gdańsk',
      kwota: 48, data: '2026-11-05', godzina: '08:02',
      status: 'zaplacono', bot: 'claude', terminZwrotu: '2026-11-19',
      nrTransakcji: 'PM-2611-0508-02', metoda: 'BLIK OneClick'
    },
    {
      id: 'z-2611-olivia', typ: 'bilet', nazwa: 'Hala Olivia',
      opis: 'Lodowisko, 2 wejścia', miejsce: 'al. Grunwaldzka 470, Gdańsk',
      kwota: 32, data: '2026-11-04', godzina: '18:45',
      status: 'nieudana', bot: 'chatgpt', terminZwrotu: null,
      powodBledu: 'Brak potwierdzenia w aplikacji banku',
      nrTransakcji: 'PM-2611-0418-45', metoda: 'BLIK OneClick'
    },
    {
      id: 'z-2611-muzeum', typ: 'bilet', nazwa: 'Muzeum II Wojny Światowej',
      opis: '2 bilety ulgowe', miejsce: 'pl. Władysława Bartoszewskiego 1, Gdańsk',
      kwota: 74, data: '2026-11-02', godzina: '10:15',
      status: 'zaplacono', bot: 'chatgpt', terminZwrotu: '2026-11-16',
      nrTransakcji: 'PM-2611-0210-15', metoda: 'BLIK OneClick'
    },
    {
      id: 'z-2611-myjnia', typ: 'usluga', nazwa: 'Myjnia Przymorze',
      opis: 'Mycie ręczne', tablica: 'WX 1234A', miejsce: 'ul. Obrońców Wybrzeża 2, Gdańsk',
      kwota: 80, data: '2026-11-01', godzina: '13:30',
      status: 'zaplacono', bot: 'claude', terminZwrotu: '2026-11-15',
      nrTransakcji: 'PM-2611-0113-30', metoda: 'BLIK OneClick'
    },

    /* ---------- październik 2026 ---------- */
    {
      id: 'z-2610-helios', typ: 'bilet', nazwa: 'Kino Helios Forum',
      opis: '2 bilety, sala 4', miejsce: 'ul. Targ Sienny 7, Gdańsk',
      kwota: 54, data: '2026-10-28', godzina: '19:50',
      status: 'zwrot-w-toku', bot: 'chatgpt', terminZwrotu: '2026-11-11',
      zwrot: { kwota: 54, czesciowy: false, powod: 'nie-skorzystalem', zgloszono: '2026-11-09', przewidywane: '2026-11-23' },
      nrTransakcji: 'PM-2610-2819-50', metoda: 'BLIK OneClick'
    },
    {
      id: 'z-2610-lotnisko', typ: 'parking', nazwa: 'Parking Lotnisko Gdańsk',
      opis: 'Parking P2, 3 dni', tablica: 'GD 9876B', miejsce: 'ul. Słowackiego 200, Gdańsk',
      kwota: 96, data: '2026-10-21', godzina: '05:40',
      status: 'zwrocono', bot: 'perplexity', terminZwrotu: '2026-11-04',
      zwrot: { kwota: 96, czesciowy: false, powod: 'bledna-kwota', zgloszono: '2026-10-24', zakonczono: '2026-10-30' },
      nrTransakcji: 'PM-2610-2105-40', metoda: 'BLIK OneClick'
    },
    {
      id: 'z-2610-lechia', typ: 'bilet', nazwa: 'Lechia Gdańsk',
      opis: 'Mecz ligowy, 2 bilety', miejsce: 'Polsat Plus Arena, Gdańsk',
      kwota: 120, data: '2026-10-18', godzina: '16:00',
      status: 'zaplacono', bot: 'grok', terminZwrotu: '2026-10-25',
      nrTransakcji: 'PM-2610-1816-00', metoda: 'BLIK OneClick'
    },
    {
      id: 'z-2610-rower', typ: 'usluga', nazwa: 'Serwis rowerowy Rowerownia',
      opis: 'Przegląd sezonowy', miejsce: 'ul. Kartuska 18, Gdańsk',
      kwota: 65, data: '2026-10-09', godzina: '12:10',
      status: 'zaplacono', bot: 'claude', terminZwrotu: '2026-10-23',
      nrTransakcji: 'PM-2610-0912-10', metoda: 'BLIK OneClick'
    }
  ],

  /* który zakup pokazuje który stan szczegółu (#/zakup/<status>) */
  przyklady: {
    'zaplacono': 'z-2611-zoo',
    'w-toku': 'z-2611-teatr',
    'nieudana': 'z-2611-olivia',
    'anulowano': 'z-2611-stolik',
    'zwrot-w-toku': 'z-2610-helios',
    'zwrocono': 'z-2610-lotnisko',
    'po-terminie': 'z-2610-lechia',
    'zwrot': 'z-2611-zoo'
  },

  boty: [
    {
      id: 'claude', nazwa: 'Claude', firma: 'Anthropic', logo: 'assets/logos/claude-color.svg',
      wydal: 214, ostatnio: 'dziś', ostatnioData: '2026-11-15', zakupyMies: 3,
      limitMies: 500, limitTrans: 200, polaczono: '2026-09-14',
      uprawnienia: { imie: true, mail: true, adres: true, tablice: true }
    },
    {
      id: 'chatgpt', nazwa: 'ChatGPT', firma: 'OpenAI', logo: 'assets/logos/openai.svg',
      wydal: 86, ostatnio: '2 dni temu', ostatnioData: '2026-11-13', zakupyMies: 2,
      limitMies: 300, limitTrans: 150, polaczono: '2026-10-02',
      uprawnienia: { imie: true, mail: true, adres: false, tablice: true }
    },
    {
      id: 'grok', nazwa: 'Grok', firma: 'xAI', logo: 'assets/logos/grok.svg',
      wydal: 0, ostatnio: 'nigdy', ostatnioData: null, zakupyMies: 0,
      limitMies: 200, limitTrans: 100, polaczono: '2026-10-15',
      uprawnienia: { imie: true, mail: true, adres: false, tablice: false }
    },
    {
      id: 'perplexity', nazwa: 'Perplexity', firma: 'Perplexity AI', logo: 'assets/logos/perplexity-color.svg',
      wydal: 40, ostatnio: 'tydzień temu', ostatnioData: '2026-11-06', zakupyMies: 1,
      limitMies: 200, limitTrans: 100, polaczono: '2026-10-20',
      uprawnienia: { imie: true, mail: true, adres: true, tablice: false }
    }
  ],

  /* wariant #/boty/limit-przekroczony */
  warianty: {
    limitPrzekroczony: { bot: 'chatgpt', wydal: 300, ostatnio: 'dziś' }
  },

  limity: {
    transakcja: 200,
    okres: 'miesieczny',          /* dzienny | miesieczny */
    miesieczny: 1000,
    dzienny: 300,
    potwierdzenie: true,
    potwierdzeniePowyzej: 100,
    wydanoMies: 340,
    wydanoDzis: 128,
    zakresy: {
      transakcja: { min: 0, max: 1000, step: 10 },
      miesieczny: { min: 0, max: 5000, step: 50 },
      dzienny: { min: 0, max: 1000, step: 10 },
      potwierdzenie: { min: 0, max: 1000, step: 10 },
      bot: { min: 0, max: 1000, step: 10 }
    }
  },

  /* sheet #/potwierdzenie */
  potwierdzenie: {
    bot: 'claude',
    kwota: 240,
    produkt: 'Parking Gdańsk Oliwa 24 h',
    typ: 'parking',
    miejsce: 'ul. Grunwaldzka 482, Gdańsk',
    tablica: 'WX 1234A',
    prog: 200,
    nrTransakcji: 'PM-2611-1510-04',
    data: '2026-11-15',
    godzina: '10:04'
  },

  /* #/zgoda: wejście z linku w czacie */
  zgoda: {
    bot: 'claude',
    pola: ['imie', 'mail', 'adres', 'tablice'],
    limitStart: 200,
    okres: 'miesięcznie',
    opcjeLimitu: [100, 200, 300, 500]
  },

  login: {
    mail: 'tomasz.gesior@paymove.io',
    mailBledny: 'tomasz.gesior@paymove',
    kodPoprawny: '123456',
    kodCzesciowy: '482',
    kodBledny: '482915',
    ponownieZa: 42,
    waznoscMin: 10
  },

  zwrot: {
    powody: [
      { id: 'nie-skorzystalem', label: 'Nie skorzystałem' },
      { id: 'bledna-kwota', label: 'Błędna kwota' },
      { id: 'bez-zgody', label: 'Zakup bez mojej zgody' },
      { id: 'inny', label: 'Inny' }
    ],
    terminDni: 14,
    czesciowyPrzyklad: 43,
    kroki: [
      'Sprawdzamy zgłoszenie u sprzedawcy',
      'Decyzja do 14 dni',
      'Pieniądze wrócą na konto, z którego płaciłeś'
    ]
  }
};
