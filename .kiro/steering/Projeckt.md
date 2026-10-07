# Project Context, New Year Bundle

## Co je cílem
Finální vize: fyzický produkt, balení na oslavu Nového roku ve stylu
adventního kalendáře, 37 kolonek (jedna na časové pásmo), každá s autentickým
alkoholem z dané země plus výzvou. Online průvodce. Komunita, co produkt
kupuje každý rok.

## Cílovka
20 plus, humor, výzvy, otrávení běžnými akcemi. Nejen mladí ochlasti, i
milovníci alkoholu jako ochutnávková sada. Sběratelé i pařani.

## Fáze projektu

### Fáze 1 (teď, Silvestr 2026): online komunita plus výzvy. Žádný alkohol. MVP.
- Web = PWA (progresivní webová appka): otevře se v prohlížeči, jde
  nainstalovat na plochu, chová se jak appka, legislativně i technicky je to
  web. Žádný App Store, žádné poplatky obchodům, žádný review.
- Web/PWA je zároveň hub (countdown, info o tradicích plus perličky, pravidla,
  email signup) i průvodce nocí (aktuální zóna, tradice, perlička, výzva,
  odpočet do další zóny).
- Check-in zůstává na Instagramu (DM/Story plus tag), vše padá do inboxu,
  operátor review druhý den.
- Počítadlo postupu v appce vázané na přihlášení (účet/zařízení): odklik v
  zóně zvedá ukazatel, soft signál "byl jsem tu". Reálné vyhodnocení vždy
  podle IG check-inů, appka slibuje jen "takhle si stojíš", ne výhru.
- Mechanika noci: některé zóny nesou akci, jiné jen info/kontext. Úkol drží,
  dokud nepřijde zóna s akcí. Odpočet tiká k nejbližší další zóně. Challenge
  se ukazuje s předstihem (default 5 min), pak "TEĎ" v půlnoc.
- První otevření: pravidla, odpočet do prvního pásma, pak aktuální zóna plus
  odpočet do další.
- Easter egg: dole skrytě náhodný absurdní fakt o zvířeti, pokaždé jiný.

Konec noci = osobní shrnutí ("zvládl jsi X pásem"), žádné veřejné tiery ani
škatulky. Tiery odměn (winner/took-part/ghosted) vypuštěny, k přepracování
později.

### Fáze 2
Předplatné s podklady plus výzvami přes celý rok (Halloween, Velikonoce, atd.).

### Fáze 3 (za zhruba 3 roky)
Fyzický autentický alkohol, až bude fun base.

## Noční mechanika (fáze 1)
- 25 hodin, 37 časových pásem (merge na 31 check-in bodů přes 5 merge skupin,
  viz zone-data.md).
- Check-in = DM nebo Story s tagem, okno 20 až 30 min po zóně (merge zóny mají
  společné okno).
- Aktivity nejsou volitelné, ale symbolická verze je povolená a nese nižší
  skóre/trest.
- Bodový systém: alive-check (nízký bod) vs. plná aktivita (vyšší body), ne
  binární "splnil/nesplnil".
- Práh pro "winner" tier = dosažitelný, ne 37/37 perfektní (přesný práh TBD).

## Verifikace (rok 1, jedna osoba operuje)
- Instagram DM plus Story s tagem, vše padá do inboxu, review až druhý den.
- Nerozlišuje se, jestli udělali přesně danou aktivitu, jen že byli vzhůru v
  daném okně.
- Automatizace (bot/no-code nástroj typu ManyChat) jako pojistka, aby operátor
  nemusel sedět vzhůru celou noc.
- Email signup na webu = owned audience, nezávislý na Instagramu.

## Trvalé pravidlo projektu: žádné pomlčky
NEPOUŽÍVAT pomlčky (žádná em dash, en dash, ani " - " spojovník ve funkci
pomlčky) v žádných UI textech ani nadpisech. Místo nich tečka, čárka,
dvojtečka, nová věta. Platí trvale, pro celý projekt.

## Co chybí / co je potřeba (průběžně)
- Aplikovat finální Style Guide na všechny zóny (probíhá).
- CZ plus EN verze.
- Web: countdown, info, email signup.
- Definovat přesný bodový práh pro winner tier.
- Feedback loop po akci (co změnit příští rok).
