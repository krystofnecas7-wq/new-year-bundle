// Testovací pomůcka: zabalí soubory appky do skriptu pro Playwright, který je
// podstrčí prohlížeči přes page.route (prohlížeč nevidí lokální server).
// Použití: node scripts/build_pw_route.cjs "http://nyb.test/?demo=1"
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const files = ["index.html", "manifest.webmanifest", "css/styles.css", "js/app.js", "js/zones.js", "js/time.js", "js/i18n.js", "js/facts.js", "js/map.js", "js/profiles.js", "js/share.js", "sw.js"];
const map = {};
for (const f of files) map["/" + f] = fs.readFileSync(path.join(root, f), "utf8");
map["/"] = map["/index.html"];
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webmanifest": "application/manifest+json" };
const url = process.argv[2] || "http://nyb.test/?demo=1";
const code = `async (page) => {
const files=${JSON.stringify(map)};
const types=${JSON.stringify(types)};
await page.unrouteAll();
await page.route("http://nyb.test/**", (route) => {
  let p=route.request().url().replace("http://nyb.test","").split("?")[0].split("#")[0]; if(!p) p="/";
  const body=files[p];
  if(body===undefined) return route.fulfill({status:404, body:"nf"});
  const ext=p==="/"?".html":p.slice(p.lastIndexOf("."));
  return route.fulfill({status:200, contentType: types[ext]||"text/plain", body});
});
await page.goto(${JSON.stringify(url)});
await page.waitForTimeout(900);
return "ok";
}`;
const out = path.join(root, ".kiro/artifacts/screenshots/pw_route.js");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, code);
console.log("written", out);
