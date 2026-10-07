# New Year Bundle, klikatelný preview (fáze 1 MVP)

Projdi celou planetou za jednu noc. 37 časových pásem slité do **31 check-in
bodů**, 31 půlnocí, jeden pořádný Silvestr. Tohle je prototyp PWA (webová appka,
co jde nainstalovat na plochu, žádný App Store, žádný build krok).

## Jak to spustit

Potřebuješ jen statický server, protože service worker a ES moduly chtějí
origin typu http nebo localhost (ne file://).

```bash
# z této složky
python3 -m http.server 8080
# nebo
npx serve .
```

Pak otevři [http://localhost:8080](http://localhost:8080).

### Když ladíš a změny se neukazují

Service worker cachuje app shell cache first pod pevným jménem `nyb-shell-v1`.
Je to schválně, ať appka jede i offline. Při vývoji ti ale starý cache může
držet starou verzi, takže úprava v `app.js`, `zones.js` nebo `styles.css` se po
reloadu nemusí hned objevit. Když se ti změny nezobrazují, máš tři možnosti:

1. Hard refresh (Ctrl Shift R, na Macu Cmd Shift R).
2. Zvedni číslo v názvu cache v `sw.js` (`nyb-shell-v1` na v2, v3 a tak dál).
3. Nebo v devtools odregistruj service worker (Application, Service Workers,
   Unregister) a dej reload.

## Demo / test mód

Celá noc trvá 25 hodin. Abys ji proklikal za pár vteřin, je tu demo mód.

Zapneš ho dvěma způsoby:

1. Přidej `?demo=1` do URL: [http://localhost:8080/?demo=1](http://localhost:8080/?demo=1)
2. Nebo klikni nahoře vpravo na tlačítko **Demo mód**.

V demo liště pak máš:

- **Na první zónu**, skočí na Kiribati (11:00).
- **Zóna -1 / Zóna +1**, krok po jednotlivých check-in bodech.
- **+1 min / +5 min**, posun času, hodí se vyzkoušet náhled výzvy a překlopení na TEĎ.
- **Skoč na konec**, rovnou na závěrečnou obrazovku.

Takhle projedeš i pauzy (Afghánistán, Írán), náhled další výzvy i konec noci.

## Co appka umí (preview)

- Onboarding: malá pravidla nahoře, velký odpočet do první zóny jako hero.
- Zóna: název, čas, tradice, perlička jako hlavní obsah, instrukce k výzvě,
  trest za lajnou verzi, check-in tlačítko a odpočet do další zóny.
- Mechanika noci: úkol drží, dokud nepřijde zóna s vlastní akcí. Info zóny jen
  přisypou kontext a perličku. Odpočet vždy tiká k nejbližší další zóně.
- Náhled výzvy: 5 minut předem (konstanta `CHALLENGE_PREVIEW_MINUTES` v
  `js/app.js`), pak v půlnoc TEĎ.
- Pauza: Afghánistán a Írán neslaví (Nowruz na jaře), žádná výzva, jen alive
  check jsem vzhůru.
- Check-in: otevře Instagram v novém panelu a zvedne lokální počítadlo.
- Počítadlo postupu vázané na naoko přihlášení, uložené v localStorage.
- Konec noci: osobní shrnutí zvládl jsi X pásem, žádné tiery ani škatulky.
- Email signup (bez backendu, ukládá do localStorage).
- Easter egg dole: náhodný absurdní fakt o zvířeti, pokaždé jiný.
- PWA: manifest, service worker (cache app shell pro offline), ikony.

## Důležité o počítadle

Číslo postupu v appce je jen soft signál, takové tiché byl jsem tu. Reálné
vyhodnocení výher jede podle Instagram check-inů, ne podle téhle appky. Je to
napsané i přímo v UI, ať je to jasné.

## Hotovo vs placeholder

**Hotovo:**

- Celá mechanika noci, náhled výzvy, pauza zóny, konec noci.
- Progress counter, naoko login, email signup, easter egg, demo mód.
- PWA shell: manifest, service worker, ikony.
- 5 ukázkových perliček s plným obsahem: Kiribati, Japonsko, Brazílie, Rusko,
  Americká Samoa.

**Placeholder:**

- Perličky u zbývajících zón mají zástupný text (datová struktura je hotová,
  stačí doplnit obsah).
- Ikony v `icons/` jsou jen jednoduché generované placeholdery (skript
  `scripts/make_icons.py`).
- Instagram URL je placeholder (`https://instagram.com/`), reálný handle je TBD.
- Žádný backend. Email i postup žijí jen v localStorage prohlížeče.

## Struktura

```
index.html              jedna stránka, tři obrazovky přepínané routerem
manifest.webmanifest    PWA manifest
sw.js                   service worker, cache app shell
css/styles.css          mobile first dark festive styl
js/app.js               router, stav, render, mechanika noci
js/zones.js             data zón (31 bodů)
js/time.js              hodiny a demo mód
js/animals.js           fakty pro easter egg
icons/                  placeholder PWA ikony
scripts/make_icons.py   generátor ikon
```
