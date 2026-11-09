# Naloga 4 — Orodje za avtomatizirano funkcionalno testiranje

## Projekt

HelpDesk je spletna aplikacija v TypeScriptu na ogrodju Next.js 15 (App Router, strežniške akcije) z Reactom 19, Prismo 6 in bazo SQLite. Paketni upravitelj je Bun, izvorna koda je na GitHubu. Pred to nalogo projekt ni imel cevovoda (CI); enotski testi (`node:test`) in preverjanje tipov so se poganjali ročno.

## Izbrano orodje: Playwright Test

`@playwright/test` 1.64.1 — odprtokodno (Apache 2.0) ogrodje za testiranje spletnih aplikacij prek pravega brskalnika (Chromium, Firefox, WebKit).

### Primerjava kandidatov

| Orodje | Jezik testov | Vključitev v cevovod | Oblika rezultatov | Ocena |
|---|---|---|---|---|
| **Playwright Test** | TS/JS | en ukaz `playwright test`; uradna predloga za GitHub Actions in Docker slika; sam zažene strežnik aplikacije (`webServer`) | `list`, `html`, `json`, `junit`, `github` (opombe v PR), posnetki, video, sledi | **izbrano** |
| Cypress | TS/JS | `cypress-io/github-action`; vzporedni zagon prek plačljivega Cypress Cloud | spec/mocha; JUnit in HTML z dodatki | primerno, a več omejitev (en zavihek, en izvor) |
| Selenium WebDriver | več jezikov | gonilniki in brskalniki ali Selenium Grid, testno ogrodje je treba dodati posebej | odvisno od dodanega ogrodja | preveč nastavljanja |
| Puppeteer | JS | samo knjižnica za upravljanje brskalnika | brez lastnih poročil | ni testno ogrodje |

### Utemeljitev

1. **Ujemanje z jezikom in ogrodjem.** Testi so v TypeScriptu, kot aplikacija, in lahko uvažajo njene nastavitve (`functionalEnv`). Dokumentacija Next.js navaja Playwright kot priporočeno orodje za E2E teste.
2. **Samostojna priprava okolja.** `webServer` zažene aplikacijo na vratih 3100 z ločeno bazo `naloga2-e2e.db`; testi pred vsakim primerom sami ponastavijo bazo s semenom. Cevovod ne potrebuje zunanje baze, storitev ali skrivnosti.
3. **Rezultati v oblikah za cevovod.**
   - izhodna koda 0 / 1 — neuspešen test ustavi cevovod,
   - `junit` (XML) — tabela rezultatov v GitHubu (Checks),
   - `github` — opombe ob vrsticah kode in povzetek zagona,
   - `html` — interaktivno poročilo s posnetki in sledmi (artefakt),
   - `json` — strojno berljivi rezultati.
4. **Ponovna uporaba.** Testni primeri TP-01 do TP-05 iz naloge 2 so bili že delno avtomatizirani; v tej nalogi so skripte prenovljene (`tests/e2e/tp-0*.spec.ts`, glej `avtomatizacija-testnih-primerov.md`).
5. **Brezplačno.** Vzporednost in deljenje testov (`--shard`) ne zahtevata plačljive storitve.

## Vključitev v cevovod

Cevovod je GitHub Actions, datoteka `.github/workflows/e2e.yml`. Sproži se ob `push` na vejo `feature/naloga-2-funkcionalni-testi` ter ročno (`workflow_dispatch`); na `main` se ne sproži.

```
push na feature/naloga-2-funkcionalni-testi
  └─ posel "Tipi in enotski testi"   bun install → prisma generate → typecheck → bun run test
       └─ posel "Funkcionalni testi"  (samo če je prvi uspel)
            bun install → prisma generate → playwright install chromium
            → bun run test:e2e  (CI=true: db push → next build → next start → 5 testov)
            → vedno: artefakta playwright-report in test-results, objava junit.xml
```

V načinu CI (`CI=true`) se konfiguracija razlikuje od lokalne:

| Nastavitev | Lokalno | CI |
|---|---|---|
| strežnik | `next dev` | `prisma db push` + `next build` + `next start` |
| brskalnik | nameščeni Google Chrome | Playwrightov Chromium |
| ponovitve | 0 | 1 (zazna nestabilne teste) |
| `test.only` | dovoljen | prepovedan (`forbidOnly`) |
| poročila | list, html, json, junit | + github |

## Navodilo za nastavitev

### 1. Namestitev orodja

```powershell
bun install                          # @playwright/test je v devDependencies
bunx playwright install chromium     # brskalnik za način CI
```

Za lokalni zagon testi uporabljajo nameščeni Google Chrome (`channel: "chrome"`). Na Linuxu brez grafičnega okolja se doda `--with-deps`, da se namestijo sistemske knjižnice.

### 2. Konfiguracija

`playwright.config.ts` določa mapo testov, ločeno testno bazo, slovensko okolje brskalnika, zaporedno izvajanje (skupna baza), poročila in samodejni zagon strežnika. Spremenljivka `CI` preklopi na produkcijsko gradnjo in Chromium.

### 3. Zagon

```powershell
bun run test:e2e                     # lokalno (razvojni strežnik, Chrome)
$env:CI="true"; bun run test:e2e     # kot v cevovodu (produkcijska gradnja, Chromium)
bunx playwright show-report          # odpre HTML poročilo
```

### 4. Rezultati

| Datoteka | Vsebina |
|---|---|
| `playwright-report/index.html` | HTML poročilo s koraki, posnetki in prilogami |
| `test-results/junit.xml` | JUnit XML za CI |
| `test-results/results.json` | JSON rezultati |
| `test-results/<test>/` | posnetki zaslona; sledi (`trace.zip`) neuspešnih testov |

V GitHubu so rezultati vidni kot preverjanje »Rezultati funkcionalnih testov«, poročilo in posnetki pa kot artefakta zagona (hranjena 14 dni).

## Preizkusni zagon

5. 11. 2026, lokalno v načinu CI (`CI=true`, Windows, Chromium headless shell 156, produkcijska gradnja): **5 od 5 testov uspešnih**, skupaj 1,8 min (od tega večina gradnja, testi 22 s). JUnit poročilo: `tests="5" failures="0"`.

Opomba: v nalogi 2 sta TP-02 in TP-03 padla zaradi napake NAP-01 (React opozorilo o manjkajočem `key`). React ta opozorila izpisuje samo v razvojnem načinu, zato jih produkcijska gradnja v cevovodu ne zazna. Napaka v kodi ostaja; lokalni zagon (`next dev`) jo še vedno pokaže.
