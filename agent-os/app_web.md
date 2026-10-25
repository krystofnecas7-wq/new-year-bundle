# APPKA A WEB: NYB (New Year Bundle)

> Tenhle soubor popisuje online produkt projektu NYB: webovou appku (PWA), co umí, jak je postavená, kde běží, jak vypadá a co zbývá dodělat. Vznikl v odděleném chatu (Kiro Web), proto ho lokální Kiro bez tohoto souboru nezná. Zdroj pravdy o mechanice noci a zónách je `project_info.md`. Když se appka a ten dokument rozcházejí, platí `project_info.md` a appka se dorovná (viz tam bod 12).

## 1. Co to je a proč

* Online průvodce silvestrovskou nocí. Jedna PWA, co je zároveň výloha firmy (hub) i živý průvodce nocí.
* **PWA = progresivní webová appka.** Otevře se v prohlížeči, jde „nainstalovat“ na plochu, chová se jako appka, ale technicky i legálně je to pořád web. Žádný App Store, žádné poplatky obchodům, žádný review, žádné stahování z obchodu.
* **Proč PWA a ne nativní appka:** ve fázi 1 se neprodává alkohol ani neberou platby, takže odpadá legislativní peklo. Nativní appka by navíc znamenala pravidla Applu/Googlu, poplatky a review (Apple je prudič na „appky kolem alkoholu“). PWA je odpověď na „bez webu neexistuje firma, ale na obyč webu se ty věci dělají blbě“.

## 2. Kde to běží

* **Repo:** GitHub `krystofnecas7-wq/new-year-bundle` (veřejné).
* **Web:** GitHub Pages, https://krystofnecas7-wq.github.io/new-year-bundle/ (demo režim: přidat `?demo=1`).
* **Nasazení:** push do větve `main` se sám propíše na web. Service worker je „nejdřív síť“, takže nová verze naskočí po jednom obnovení (appka jednou sama reloadne, když se změní verze).
* **Pozn. k prostředí Kiro Web:** GitHub účet musí mít Kiro appka přidaná k repu (jinak push vrací 403). Zakládání repa a zapnutí GitHub Pages musel udělat ručně Kryštof, Kiro appka na to nemá práva.

## 3. Stack a struktura

* Čistý vanilla HTML/CSS/JS, ES moduly, žádný framework, žádný build krok. Záměrně jednoduché, ať to jde hostovat kdekoliv a vydrží to.
* Font Bricolage Grotesque (tučný, hravý).
* Soubory v repu:
  * `index.html` kostra, obrazovky se vykreslují z JS.
  * `css/styles.css` vzhled podle schválených návrhů.
  * `js/app.js` router, mechanika noci, všechny obrazovky, události.
  * `js/zones.js` data zón (perličky, tradice, výzvy, trest za lajnou verzi, příprava `prep`, pole `celebrates`). Pozn.: nese i pole `en` pro anglický obsah, zatím nevyplněné.
  * `js/time.js` hodiny, demo mód, výpočet půlnocí v českém čase (UTC+1) nezávisle na pásmu prohlížeče.
  * `js/i18n.js` texty CZ a EN (přepínač jazyka).
  * `js/facts.js` náhodné kraviny (knihovna, cíl 500+, zatím přes 240).
  * `js/map.js` mapa noci.
  * `js/land.js` tvary pevniny, generované z `scripts/build_land.mjs` (Natural Earth 1:110m, public domain).
  * `js/profiles.js` lokální účty, parta, záloha.
  * `js/share.js` kartička do stories.
  * `js/fx.js` ohňostroje v pozadí.
  * `sw.js` service worker (nejdřív síť, offline záloha).
  * `icons/` logo a ikony, `design/` schválené vizuální návrhy a logo.
  * `scripts/` testy a pomůcky (`mechanic_check.mjs` headless test mechaniky noci, `serve.mjs` lokální server, `build_land.mjs`, `build_pw_route.cjs` pro testování v prohlížeči).

## 4. Obrazovky

1. **Úvod / coming soon:** velký hravý nadpis „Jedna noc. Celá planeta. 31 půlnocí.“, flip countdown do startu noci, email signup, 3 karty „jak to funguje“, nenápadný přepínač CZ/EN a menu. Nahoře nálepky („25 h“, „0 % alkoholu letos“).
2. **Pravidla / jak to funguje:** 5 bodů a poznámka o pauzách (Afghánistán, Írán, Nowruz). Ukážou se po kliknutí na „Jdu do toho“, pak se na ně nikdo nemusí vracet.
3. **Obrazovka zóny (hlavní):** sticky odpočet nahoře + mini mapa s bodem „jsi tady“, pak pořadí: O pásmu, perlička, tradice (co se tam děje), výzva s trestem za lajnou verzi, check in tlačítko, pod ním nenápadně náhodná kravina, dole příprava na další zónu. Štítek pořadí (např. 17 / 31) a MEGA štítek.
4. **Velké odpočítávání:** posledních 10 vteřin před půlnocí zóny jede přes celý displej (10, 9, 8…), pak „TEĎ!“. Dá se zavřít ťuknutím. U MEGA zón vystřelí větší salva ohňostroje.
5. **Mapa noci:** skutečné kontinenty, růžový pruh ukazuje pásmo, kde je zrovna půlnoc (posouvá se celou noc na západ), slavící zóna pulzuje růžově, check iny zeleně. Zoom tlačítky, kolečkem i dvěma prsty, posouvání tažením, tlačítko „Kde jsem“. Dole seznam „co tě čeká“ a sdílení do stories.
6. **Ty a tvoje parta (profil):** schované v menu a pod kolečkem s iniciálou, ať neláká pozornost. Viz bod 6.
7. **O projektu:** o co jde, kdo za tím stojí (AAV), v menu.
8. **Konec noci:** obří číslo kolik pásem zvládl, osobní shrnutí v hlase značky, kartička do stories, disclaimer že reálné vyhodnocení je přes IG, email signup. Žádné veřejné škatulky.

## 5. Mechanika noci (jak appka řídí průchod)

* **Držení úkolu:** aktuální úkol je poslední zóna, co nese akci (`celebrates === true` a má výzvu). Info/pauzové zóny úkol NEposouvají, jen přisypou kontext a perličku. Takže lidé nemusí něco posílat co 15 minut.
* **Odpočet** vždy míří na nejbližší další zónu v čase. Nad hodinu formát dny / hodiny / minuty, pod hodinu minuty / vteřiny (flip dlaždice jako letištní cedule).
* **Náhled výzvy:** 5 minut před půlnocí akční zóny se ukáže plná výzva („za chvíli TEĎ, nachystej se“), ať se dá stihnout věc na odbití (hrozny, odpočet). Konstanta `CHALLENGE_PREVIEW_MINUTES` v `js/app.js`.
* **Příprava na další zónu:** dole běží po celou dobu aktuální zóny jen holá instrukce co si nachystat (např. „připrav si 12 hroznů a buďte pohromadě“), bez omáčky. Když další nic nechce: „Teď není potřeba nic.“
* **Datum:** appka ukazuje i datum zóny, aby bylo jasné, že pozdní zóny (Havaj 11:00) jsou už 1. 1. 2027, ne překryv s ranními.
* **Demo/test režim:** `?demo=1` nebo přes menu. Demo hodiny běží (drží posun oproti reálnému času), tlačítka: první zóna, zóna ±1, +1/+5 min, 15 s před další (spustí velké odpočítávání), skok na konec. Slouží k proklikání celé 25h noci za pár vteřin.

## 6. Účty, parta, check in (lokální, varianta A, bez backendu)

* Všechno žije v localStorage prohlížeče. Žádný server, protože ve fázi 1 operuje jeden člověk a nechce stavět a hostovat backend kvůli akci jednou za rok.
* **Check in:** jde přes Instagram (tlačítko otevře IG, člověk pošle DM/Story s tagem), NE nahráváním v appce. V appce se jen zvedne soft počítadlo. (Dřív se zvažovalo nahrávání v appce, zamítnuto kvůli úložišti a nočnímu hlídání.)
* **Víc účtů na jednom mobilu:** parta, co má jeden telefon, si přidá účet pro každého a přepíná se. Každý účet má příznak „u toho / spí“. Check in se zapíše VŠEM, kdo jsou u toho, ne jen tomu, kdo drží mobil. Nad tlačítkem je vidět, kolika lidem se zapíše.
* **Mazání účtu:** každý účet jde smazat (ptá se ještě jednou „fakt smazat / ne“). Poslední účet se nesmaže, jen vyčistí na nového hosta. Jméno se zadává přímo v appce (ne systémové okno, to na mobilu vypadalo blbě).
* **Pozvánka:** odkaz s kódem party. Kamarád se přes něj přidá ke skupině. ALE postup se mezi různými mobily NESDÍLÍ (to chce backend, fáze 2). Propisuje se jen mezi účty na jednom mobilu.
* **Záloha:** ruční export/import postupu kódem (pojistka proti vybitému mobilu). Appka vygeneruje kód, člověk si ho pošle sám sobě, na jiném zařízení ho vloží. Reálné vyhodnocení ale stejně běží podle IG, takže ztráta počítadla není ztráta hry.

## 7. Vizuální styl (schváleno z moodboardu)

* **Nálada:** tmavá noc („coming soon“ pocit, šetří oči i baterku v noci) + teplé hravé akcenty ve stylu „HAPPI“. NEbrat grunge/collage hustotu, bije s čitelností pro opilého a unaveného.
* **Barevná paleta (nese význam):**
  * teplý gradient oranžová → růžová = AKCE / „teď“ (tlačítka, slaví teď),
  * zlatavě žlutá = ČAS / skóre (countdown, body); zároveň můstek k logu,
  * zelená = živé / „u toho“ stavy,
  * zbytek je tmavě fialovo-modrá noc.
* **Prvky:** flip countdown (letištní cedule), tučná hravá typografie, velké nebojácné nadpisy na MEGA momenty, čisté karty, ohňostroje jemně v pozadí (motiv rachejtlí).
* **Čitelnost:** krátké věty, tučně klíčové slovo/číslo, přímá výzva na čtenáře. Texty bez pomlček, drzý kámošský tón (viz `project_info.md` bod 5 a Style Guide).
* **Postup prací:** napřed vizuální návrh (obrázek/mockup), schválení, teprve pak kód. Schválené mockupy jsou v `design/`.

## 8. Logo a ikona (návrh)

* Zeměkoule jako ciferník, ručičky na 23:59 (minuta do půlnoci), kolem jiskry z ohňostroje. Teplý oranžovo-růžový přechod. Jednoduché a tučné, čitelné i jako malá ikona na ploše.
* Z původního Kryštofova nástřelu (zeměkoule + hodiny + oslava) se vzala myšlenka, ne přeplácané „royal“ provedení (koruna, vločky), které by v malé velikosti splynulo.
* Soubory: `icons/logo.svg`, `icons/icon-192.png`, `icons/icon-512.png`, maskable varianty, apple-touch-icon, favicon. Logo je i na kartičce do stories (šíří značku při sdílení).
* **Status:** návrh. Když se nebude líbit, překreslí se.

## 9. Sdílení na sítě

* Při sdílení appka vygeneruje auto-grafiku do stories ve stylu appky (barvy, logo): v průběhu noci „Jsem v zóně 14 z 31, zrovna slaví X, ty ještě spíš?“, na konci „Přežil jsem 23 pásem za jednu noc“. Na mobilu přes systémové sdílení, na počítači se stáhne jako PNG. Smysl: každý příběh je reklama zdarma.

## 10. Co zbývá (TODO)

* **Sladit appku s `project_info.md`:** přegenerovat zóny na strukturu 34 časů, doplnit Fidži (13:00) a Grónsko (03:00), srovnat výzvy s průvodcem v2. (Viz `project_info.md` bod 12.)
* **Obsah zón:** dopsat „O pásmu“ a perličky pro všechny zóny (plné má zatím 5). To jsou Kryštofovy podklady z průvodce.
* **Kraviny:** doplnit knihovnu na 500+ (zatím přes 240).
* **Instagram:** napojit reálný IG handle na check in tlačítko (zatím placeholder).
* **EN obsah zón:** UI je CZ/EN, ale obsah zón zatím jen CZ.
* **Zvuk/vibrace u odpočtu:** odloženo na později.
* **Backend (fáze 2):** skutečné účty a sdílení postupu party mezi zařízeními.
* **Logo:** potvrdit nebo překreslit.
