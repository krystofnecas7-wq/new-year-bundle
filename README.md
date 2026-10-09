# New Year Bundle (by All Around Value)

Jedna noc. Celá planeta. 31 půlnocí. PWA průvodce Silvestrem napříč 37
časovými pásmy (slitými do 31 zastávek). Fáze 1: online komunita a výzvy,
žádný alkohol, žádné platby, žádný backend.

Web běží na GitHub Pages:
https://krystofnecas7-wq.github.io/new-year-bundle/ (demo: přidej `?demo=1`)

## Lokální spuštění

```bash
node scripts/serve.mjs 8777   # nebo: python3 -m http.server 8777
```

Otevři http://localhost:8777/?demo=1

## Obrazovky

- **Úvod / coming soon**: velký nápis, flip countdown do startu noci, email, jak to funguje.
- **Pravidla**: 5 bodů plus poznámka o pauzách (Afghánistán, Írán).
- **Zóna**: sticky odpočet nahoře plus mini mapa, o pásmu, perlička, tradice,
  výzva s trestem za lajnou verzi, check-in přes Instagram, náhodná kravina,
  příprava na další zónu.
- **Velké odpočítávání**: posledních 10 vteřin přes celý displej, pak "TEĎ!".
  Ťuknutím jde zavřít.
- **Mapa noci**: NÁČRT. Hrubé kontinenty, zoom, posouvání, slavící zóna růžově,
  tvoje check-iny zeleně, seznam co tě čeká.
- **Ty a tvoje parta**: víc účtů na jednom mobilu, pozvánka odkazem, záloha
  a obnova postupu kódem.
- **O projektu**, **Konec noci** (shrnutí plus kartička do stories).
- **CZ / EN** přepínač (UI texty; obsah zón zatím česky).

## Mechanika

- Úkol drží, dokud nepřijde zóna s vlastní akcí. Info zóny jen přidají kontext.
- Odpočet míří vždy na nejbližší další zónu. Nad hodinu dny / hodiny / minuty,
  pod hodinu minuty / vteřiny.
- 5 minut předem náhled výzvy (`CHALLENGE_PREVIEW_MINUTES` v `js/app.js`).
- Postup v appce je jen soft signál. Reálné vyhodnocení jede přes IG check-iny.

## Demo mód

`?demo=1` nebo v menu. Tlačítka: první zóna, zóna ±1, +1 / +5 min,
**15 s před další** (ukáže velké odpočítávání), skok na konec.

## Soubory

```
index.html            kostra, obrazovky se vykreslují z js
css/styles.css        vzhled podle schválených návrhů (design/*.png)
js/app.js             router, mechanika noci, všechny obrazovky
js/zones.js           data 31 zastávek (perličky, výzvy, příprava)
js/time.js            hodiny, demo mód, výpočet půlnocí v českém čase
js/i18n.js            texty CZ a EN
js/facts.js           náhodné kraviny (várka 1, cíl 500+)
js/map.js             náčrt mapy světa
js/profiles.js        lokální účty, parta, záloha
js/share.js           kartička do stories
sw.js                 service worker (nejdřív síť, offline záloha)
design/               schválené vizuální návrhy
scripts/              testy a pomůcky
```

## Co chybí

- Texty "O pásmu" a perličky u většiny zón (doplní se z podkladů).
- Knihovna kravin: 241 z cílových 500+.
- Opravdová mapa, reálný Instagram handle, finální logo a ikony.
- Anglické verze obsahu zón.
- Zvuk u odpočtu (odloženo).
