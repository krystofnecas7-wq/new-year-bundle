/**
 * i18n.js, UI texty CZ + EN pro New Year Bundle.
 *
 * Obsah zón (tradice, perličky, výzvy) je zatím jen česky. Když zóna dostane
 * anglická pole (např. `en: { tradition, perlicka, challenge, prep }`), appka
 * je v EN režimu použije, jinak spadne na češtinu.
 *
 * Pravidlo projektu platí i tady: žádné pomlčky jako interpunkce.
 */

const STRINGS = {
  cs: {
    "brand": "New Year Bundle",
    "by": "by All Around Value",

    "menu.title": "Menu",
    "menu.intro": "Úvod",
    "menu.zone": "Aktuální zóna",
    "menu.map": "Mapa noci",
    "menu.rules": "Pravidla",
    "menu.profile": "Ty a tvoje parta",
    "menu.about": "O projektu",
    "menu.lang": "Jazyk",

    "cd.days": "DNÍ",
    "cd.hours": "HOD",
    "cd.min": "MIN",
    "cd.sec": "SEC",

    "intro.l1": "Jedna noc.",
    "intro.l2": "Celá planeta.",
    "intro.l3": "{n} půlnocí.",
    "intro.sub": "Projdeš Silvestr napříč světem. Od Kiribati, co vidí nový rok jako první, až po Americkou Samou, co ho vidí poslední.",
    "intro.countKicker": "Start celé noci za",
    "intro.running": "Noc právě běží. Planeta slaví bez tebe.",
    "intro.over": "Letošní noc je za námi. Příští Silvestr znovu.",
    "intro.cta": "Jdu do toho",
    "intro.ctaRunning": "Skoč do noci",
    "intro.howTitle": "Jak to funguje",
    "intro.how1t": "Čekej na zónu",
    "intro.how1d": "Appka ti řekne, kdo zrovna slaví.",
    "intro.how2t": "Splň výzvu",
    "intro.how2d": "Každá zóna má svůj úkol.",
    "intro.how3t": "Pošli check-in",
    "intro.how3d": "Přes Instagram, story nebo DM s tagem.",
    "intro.foot": "25 hodin. 37 pásem slitých do {n} zastávek. Žádná televizní půlnoc, celá noc.",

    "email.kicker": "Chceš echo, až to pojede naostro?",
    "email.kickerEnd": "Nech si říct, až to pojedeme příště.",
    "email.placeholder": "tvuj@email.cz",
    "email.btn": "Hoď mi echo",
    "email.ok": "Máme to. Žádný spam, max jedna zpráva, až to rozjedeme.",

    "rules.title": "Jak to celý funguje",
    "rules.sub": "Čti vsedě. Ve dvě ráno ti to bude k ničemu.",
    "rules.1t": "Jedna noc, {n} zastávek.",
    "rules.1d": "Celá planeta po půlnocích. Appka ti vždy řekne, kdo zrovna slaví a co máš dělat.",
    "rules.2t": "Splň výzvu, pošli check-in.",
    "rules.2d": "Check-in jede přes Instagram, story nebo DM s tagem. Ne nahráváním tady.",
    "rules.3t": "Nestíháš? Lajná verze platí.",
    "rules.3d": "Ale za míň bodů. Je to trest, ne pohodlí.",
    "rules.3x": "Symbolicky znamená míň slávy.",
    "rules.4t": "Appka počítá jen pro pocit.",
    "rules.4d": "Reálné výhry se počítají podle check-inů na Instagramu, ne podle téhle appky.",
    "rules.5t": "Výzva přijde s předstihem.",
    "rules.5d": "{m} minut před půlnocí zóny uvidíš, co tě čeká. Posledních 10 vteřin jede přes celý displej.",
    "rules.pauseT": "Pozor, pauzy",
    "rules.pauseD": "Afghánistán a Írán dneska neslaví. Jejich nový rok je Nowruz (perský nový rok na jarní rovnodennost). Žádná výzva, jen oddech. Schválně.",
    "rules.cta": "Jasně, jdeme na to",
    "rules.foot": "Bez omáčky. Teď už jen čekáš na další zónu.",

    "zone.nextIn": "Další zóna za",
    "zone.firstIn": "První zóna za",
    "zone.last": "Poslední zóna noci. Dojel jsi až na konec.",
    "zone.home": "u tebe doma",
    "zone.mapChip": "Mapa světa",
    "zone.about": "O pásmu",
    "zone.aboutPh": "Pásmo UTC {off}. Víc o zemi a pásmu doplníme z podkladů.",
    "zone.perl": "Perlička",
    "zone.trad": "Co se tam děje",
    "zone.now": "Teď je čas na tohle",
    "zone.penalty": "Trest za lajnou verzi:",
    "zone.held": "Nová info, ale tvůj úkol pořád běží od {t}, {z}.",
    "zone.heldPause": "Tvůj úkol pořád běží od {t}, {z}",
    "zone.pause": "Pauza. Tady se dneska schválně neslaví.",
    "zone.checkin": "Hotovo, pošli check-in",
    "zone.checkinAgain": "Check-in zapsán, klidně znovu",
    "zone.alive": "Jsem vzhůru",
    "zone.aliveDone": "Jsem vzhůru (zapsáno)",
    "zone.aliveMicro": "Žádná výzva, jen klid. Ukaž, že žiješ: co teď zrovna děláš?",
    "zone.checkinNote": "Check-in jede přes Instagram, ne nahráváním tady.",
    "zone.random": "Náhodná kravina, nesouvisí s ničím",
    "zone.nextZone": "Další zóna:",
    "zone.nothing": "Teď není potřeba nic.",
    "zone.preview": "Za chvíli TEĎ, naposled se nachystej",
    "zone.counter": "Postup {p} je jen soft signál appky. Reálné vyhodnocení jede podle Instagram check-inů.",
    "zone.waitTitle": "Ještě to nezačalo",
    "zone.waitSub": "Noc otevírá Kiribati. Zatím si v klidu nachystej první věc.",
    "zone.now.badge": "TEĎ",

    "big.celebrates": "{z} slaví za",
    "big.now": "TEĎ!",
    "big.go": "{z} slaví. Jedeš.",
    "big.ready": "Co tě čeká",
    "big.tap": "Ťukni pro zavření",

    "map.title": "Mapa noci",
    "map.sub": "Kde zrovna bouchá šampus. Táhni a přibliž.",
    "map.legendNow": "Slaví právě teď",
    "map.legendDone": "Tvůj check-in",
    "map.legendOther": "Čeká nebo prošlo",
    "map.upcoming": "Co tě čeká",
    "map.nowTag": "TEĎ",
    "map.in": "za {t}",
    "map.center": "Kde jsem",
    "map.back": "Zpět na zónu",
    "map.share": "Pochlub se do stories",
    "map.note": "Mapa je zatím jen náčrt. Opravdová přijde v další verzi.",
    "map.before": "Noc ještě nezačala",

    "end.kicker": "A je po noci",
    "end.done": "Zvládl jsi",
    "end.of": "z {n} pásem.",
    "end.l0": "Nula zón. Buď jsi prospal celou planetu, nebo jsi check-in nedal. Klídek, příští rok je další pokus.",
    "end.l1": "Pár zón v kapse. Social battery došla dřív, chápeme. Pořád lepší než gauč a jedna televizní půlnoc.",
    "end.l2": "To je slušná jízda. Většinu planety jsi protáhl, zbytek necháme na příští rok.",
    "end.l3": "Celá planeta. Všech {n} zastávek. Ty vole, ty jsi fakt nespal. Respekt.",
    "end.shareKicker": "Sdílej svůj flex",
    "end.shareLine": "Přežil jsem {x} pásem za jednu noc.",
    "end.shareSub": "Appka ti udělá kartičku do stories.",
    "end.shareBtn": "Sdílet do stories",
    "end.disc": "Tohle číslo je jen tvoje osobní shrnutí. Reálné vyhodnocení běží podle Instagram check-inů, ne podle appky.",
    "end.noBoxes": "Žádné škatulky typu vítěz nebo smolař. Jen kolik planety jsi protáhl.",

    "share.zoneLine": "Jsem v zóně {i} z {n}.",
    "share.zoneSub": "Zrovna slaví {z}. Ty ještě spíš?",
    "share.endKicker": "Přežil jsem",
    "share.endLine": "{x} pásem za jednu noc.",
    "share.endSub": "A ty jsi spal.",
    "share.saved": "Kartička se stáhla. Hoď ji do stories.",
    "share.fail": "Sdílení se nepovedlo. Zkus to znovu.",

    "profile.title": "Ty a tvoje parta",
    "profile.sub": "Nic zásadního. Jen ať víš, kdo s tebou nespí.",
    "profile.zones": "{p} zón",
    "profile.switch": "Změnit účet",
    "profile.add": "Přidat účet",
    "profile.rename": "Přejmenovat",
    "profile.accounts": "Účty na tomhle mobilu",
    "profile.you": "ty",
    "profile.use": "Přepnout",
    "profile.accountsHint": "Jeden mobil na celou partu? Přidej každému účet a přepínejte se.",
    "profile.inviteT": "Pozvi partu",
    "profile.inviteD": "Hoď jim link, ať trpíte spolu.",
    "profile.copy": "Kopírovat",
    "profile.copied": "Zkopírováno",
    "profile.inviteNote": "Každý pak jede na svém mobilu. Společný postup party napříč mobily přijde v další verzi.",
    "profile.group": "Parta: {g}",
    "profile.backupT": "Záloha, kdyby ti umřel mobil",
    "profile.backupD": "Postup žije jen v tomhle prohlížeči. Ulož si zálohu, ať o něj nepřijdeš.",
    "profile.backup": "Zálohovat postup",
    "profile.restore": "Obnovit ze zálohy",
    "profile.backupCode": "Tvůj záložní kód. Pošli si ho do poznámek nebo sám sobě.",
    "profile.restorePh": "Sem vlož záložní kód",
    "profile.restoreBtn": "Obnovit",
    "profile.restoreOk": "Obnoveno. Vítej zpátky.",
    "profile.restoreBad": "Tohle není platný kód. Zkontroluj, že jsi zkopíroval celý.",
    "profile.foot": "Skupina je jen pro pocit a srandu. Žádný veřejný žebříček, žádný tlak.",
    "profile.namePrompt": "Jméno nebo přezdívka:",
    "profile.defaultName": "Host",
    "profile.joined": "Jsi v partě {g}. Vítej.",

    "about.title": "O projektu",
    "about.p1": "New Year Bundle je Silvestr, co nekončí o půlnoci. Projdeš 37 časových pásem slitých do {n} zastávek a v každé tě čeká kus místní tradice, perlička a výzva.",
    "about.p2": "Letos je to online komunita a výzvy. Žádný alkohol, žádné placení. Časem z toho bude fyzické balení ve stylu adventního kalendáře, kde každá kolonka schovává pití z dané země.",
    "about.p3": "Za projektem stojí All Around Value. Tohle je naše první akce, další svátky přijdou.",
    "about.back": "Zpět",

    "demo.label": "Demo / test, tohle není opravdová funkce",
    "demo.on": "Demo: ZAP",
    "demo.off": "Demo: VYP",
    "demo.first": "Na první zónu",
    "demo.prev": "Zóna −1",
    "demo.next": "Zóna +1",
    "demo.plus1": "+1 min",
    "demo.plus5": "+5 min",
    "demo.before": "15 s před další",
    "demo.end": "Skoč na konec",
  },

  en: {
    "brand": "New Year Bundle",
    "by": "by All Around Value",

    "menu.title": "Menu",
    "menu.intro": "Home",
    "menu.zone": "Current zone",
    "menu.map": "Night map",
    "menu.rules": "Rules",
    "menu.profile": "You and your crew",
    "menu.about": "About",
    "menu.lang": "Language",

    "cd.days": "DAYS",
    "cd.hours": "HRS",
    "cd.min": "MIN",
    "cd.sec": "SEC",

    "intro.l1": "One night.",
    "intro.l2": "The whole planet.",
    "intro.l3": "{n} midnights.",
    "intro.sub": "You ride New Year's Eve across the globe. From Kiribati, the first to see the new year, all the way to American Samoa, the last.",
    "intro.countKicker": "The night starts in",
    "intro.running": "The night is on. The planet is partying without you.",
    "intro.over": "This year's night is done. See you next New Year's Eve.",
    "intro.cta": "I'm in",
    "intro.ctaRunning": "Jump into the night",
    "intro.howTitle": "How it works",
    "intro.how1t": "Wait for a zone",
    "intro.how1d": "The app tells you who is celebrating.",
    "intro.how2t": "Do the challenge",
    "intro.how2d": "Every zone has its own task.",
    "intro.how3t": "Send a check-in",
    "intro.how3d": "Via Instagram, story or DM with a tag.",
    "intro.foot": "25 hours. 37 time zones merged into {n} stops. No TV midnight, the whole night.",

    "email.kicker": "Want a ping when it goes live?",
    "email.kickerEnd": "Want to hear when we run it again?",
    "email.placeholder": "you@email.com",
    "email.btn": "Ping me",
    "email.ok": "Got it. No spam, one message max when we kick off.",

    "rules.title": "How the whole thing works",
    "rules.sub": "Read it sitting down. At 2 a.m. it will be useless.",
    "rules.1t": "One night, {n} stops.",
    "rules.1d": "The whole planet, midnight by midnight. The app always tells you who is celebrating and what to do.",
    "rules.2t": "Do the challenge, send a check-in.",
    "rules.2d": "Check-ins go through Instagram, story or DM with a tag. Not by uploading here.",
    "rules.3t": "Can't make it? The lazy version counts.",
    "rules.3d": "But for fewer points. It is a punishment, not a comfort.",
    "rules.3x": "Symbolic means less glory.",
    "rules.4t": "The app counts just for the feels.",
    "rules.4d": "Real prizes are counted from Instagram check-ins, not from this app.",
    "rules.5t": "The challenge shows up early.",
    "rules.5d": "{m} minutes before a zone's midnight you see what is coming. The last 10 seconds take over the whole screen.",
    "rules.pauseT": "Heads up, breaks",
    "rules.pauseD": "Afghanistan and Iran do not celebrate tonight. Their new year is Nowruz (the Persian new year on the spring equinox). No challenge, just a breather. On purpose.",
    "rules.cta": "Got it, let's go",
    "rules.foot": "No fluff. Now you just wait for the next zone.",

    "zone.nextIn": "Next zone in",
    "zone.firstIn": "First zone in",
    "zone.last": "Last zone of the night. You made it to the end.",
    "zone.home": "your time",
    "zone.mapChip": "World map",
    "zone.about": "About the zone",
    "zone.aboutPh": "Time zone UTC {off}. More about the country and zone coming soon.",
    "zone.perl": "Fun fact",
    "zone.trad": "What happens there",
    "zone.now": "Time for this",
    "zone.penalty": "Penalty for the lazy version:",
    "zone.held": "New info, but your task still runs from {t}, {z}.",
    "zone.heldPause": "Your task still runs from {t}, {z}",
    "zone.pause": "Break. Nobody celebrates here tonight, on purpose.",
    "zone.checkin": "Done, send check-in",
    "zone.checkinAgain": "Check-in logged, go again",
    "zone.alive": "I'm awake",
    "zone.aliveDone": "I'm awake (logged)",
    "zone.aliveMicro": "No challenge, just chill. Show you are alive: what are you up to?",
    "zone.checkinNote": "Check-ins go through Instagram, not by uploading here.",
    "zone.random": "Random nonsense, unrelated to anything",
    "zone.nextZone": "Next zone:",
    "zone.nothing": "Nothing needed right now.",
    "zone.preview": "Almost NOW, last chance to get ready",
    "zone.counter": "Progress {p} is just a soft signal. Real results come from Instagram check-ins.",
    "zone.waitTitle": "Not started yet",
    "zone.waitSub": "Kiribati opens the night. Get the first thing ready.",
    "zone.now.badge": "NOW",

    "big.celebrates": "{z} celebrates in",
    "big.now": "NOW!",
    "big.go": "{z} is celebrating. Go.",
    "big.ready": "What's coming",
    "big.tap": "Tap to close",

    "map.title": "Night map",
    "map.sub": "Where the champagne is popping. Drag and zoom.",
    "map.legendNow": "Celebrating now",
    "map.legendDone": "Your check-in",
    "map.legendOther": "Waiting or done",
    "map.upcoming": "What's coming",
    "map.nowTag": "NOW",
    "map.in": "in {t}",
    "map.center": "Where am I",
    "map.back": "Back to zone",
    "map.share": "Flex it in stories",
    "map.note": "The map is just a sketch for now. The real one comes next version.",
    "map.before": "The night has not started yet",

    "end.kicker": "And the night is over",
    "end.done": "You made",
    "end.of": "of {n} zones.",
    "end.l0": "Zero zones. Either you slept through the planet or skipped check-ins. Chill, next year is another shot.",
    "end.l1": "A few zones in the bag. Social battery died early, we get it. Still better than the couch and one TV midnight.",
    "end.l2": "Solid ride. You dragged yourself through most of the planet, the rest waits for next year.",
    "end.l3": "The whole planet. All {n} stops. Dude, you really did not sleep. Respect.",
    "end.shareKicker": "Share your flex",
    "end.shareLine": "I survived {x} time zones in one night.",
    "end.shareSub": "The app makes you a story card.",
    "end.shareBtn": "Share to stories",
    "end.disc": "This number is just your personal summary. Real results come from Instagram check-ins, not this app.",
    "end.noBoxes": "No winner or loser boxes. Just how much of the planet you made it through.",

    "share.zoneLine": "I'm in zone {i} of {n}.",
    "share.zoneSub": "{z} is celebrating right now. Still asleep?",
    "share.endKicker": "I survived",
    "share.endLine": "{x} time zones in one night.",
    "share.endSub": "And you slept.",
    "share.saved": "Card downloaded. Drop it in your stories.",
    "share.fail": "Sharing failed. Try again.",

    "profile.title": "You and your crew",
    "profile.sub": "Nothing serious. Just so you know who is not sleeping.",
    "profile.zones": "{p} zones",
    "profile.switch": "Switch account",
    "profile.add": "Add account",
    "profile.rename": "Rename",
    "profile.accounts": "Accounts on this phone",
    "profile.you": "you",
    "profile.use": "Switch",
    "profile.accountsHint": "One phone for the whole crew? Add an account for everyone and switch.",
    "profile.inviteT": "Invite your crew",
    "profile.inviteD": "Send them the link, suffer together.",
    "profile.copy": "Copy",
    "profile.copied": "Copied",
    "profile.inviteNote": "Everyone then runs on their own phone. Shared crew progress across phones comes next version.",
    "profile.group": "Crew: {g}",
    "profile.backupT": "Backup, in case your phone dies",
    "profile.backupD": "Progress lives only in this browser. Save a backup so you don't lose it.",
    "profile.backup": "Back up progress",
    "profile.restore": "Restore from backup",
    "profile.backupCode": "Your backup code. Send it to your notes or to yourself.",
    "profile.restorePh": "Paste your backup code here",
    "profile.restoreBtn": "Restore",
    "profile.restoreOk": "Restored. Welcome back.",
    "profile.restoreBad": "That is not a valid code. Make sure you copied all of it.",
    "profile.foot": "The crew is just for fun. No public leaderboard, no pressure.",
    "profile.namePrompt": "Name or nickname:",
    "profile.defaultName": "Guest",
    "profile.joined": "You are in crew {g}. Welcome.",

    "about.title": "About",
    "about.p1": "New Year Bundle is a New Year's Eve that does not end at midnight. You ride 37 time zones merged into {n} stops, each with a bit of local tradition, a fun fact and a challenge.",
    "about.p2": "This year it is an online community and challenges. No alcohol, no payments. Later it becomes a physical advent calendar style box, each slot hiding a drink from that country.",
    "about.p3": "The project is run by All Around Value. This is our first event, more holidays are coming.",
    "about.back": "Back",

    "demo.label": "Demo / test, not a real feature",
    "demo.on": "Demo: ON",
    "demo.off": "Demo: OFF",
    "demo.first": "First zone",
    "demo.prev": "Zone −1",
    "demo.next": "Zone +1",
    "demo.plus1": "+1 min",
    "demo.plus5": "+5 min",
    "demo.before": "15 s before next",
    "demo.end": "Jump to end",
  },
};

const LS_LANG = "nyb_lang";
let lang = "cs";
try {
  const saved = localStorage.getItem(LS_LANG);
  if (saved === "cs" || saved === "en") lang = saved;
} catch (e) {
  /* ignore */
}

export function getLang() {
  return lang;
}

export function setLang(next) {
  if (next !== "cs" && next !== "en") return;
  lang = next;
  try {
    localStorage.setItem(LS_LANG, next);
  } catch (e) {
    /* ignore */
  }
  if (typeof document !== "undefined") document.documentElement.lang = next;
}

/** Přelož klíč, {proměnné} nahradí z vars. Chybějící EN spadne na CZ. */
export function t(key, vars) {
  let s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.cs[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

/** Vrať pole zóny v aktuálním jazyce, když existuje, jinak česky. */
export function zf(zone, field) {
  if (!zone) return "";
  if (lang === "en" && zone.en && zone.en[field]) return zone.en[field];
  return zone[field];
}
