# Stanje testiranja in zagotavljanja kakovosti — HelpDesk

Stanje na dan 6. 10. 2026. Ukazi se poženejo v korenu repozitorija.

## Pregled

| # | Aktivnost | Vrsta | Stanje | Orodje |
|---|---|---|---|---|
| 1 | Enotski testi poslovne logike | testiranje (avtomatizirano) | prisotno, 281 testov, vsi uspešni | `node:test`, `tsx` |
| 2 | Statično preverjanje tipov | statična analiza | prisotno, brez napak | TypeScript `strict` (`tsc --noEmit`) |
| 3 | Preverjanje gradnje | statična analiza | prisotno ob vsaki namestitvi | `next build` v Dockerju |
| 4 | Ročno testiranje v brskalniku | testiranje (ročno) | prisotno, nesistematično | brskalnik, izolirana kopija |
| 5 | Izolacija testnega okolja | zagotavljanje kakovosti | prisotno, pokrito s testi | `src/lib/sandbox.ts` |
| 6 | Varnostni ukrepi po zasnovi | zagotavljanje kakovosti | prisotno, brez avtomatiziranih testov | koda, HTTP glave |
| 7 | Integracijski in E2E testi | testiranje | **ni** | — |
| 8 | Merjenje pokritosti kode | metrika | **ni** | — |
| 9 | Neprekinjena integracija (CI) | proces | **ni** | — |
| 10 | Linter / formatiranje | statična analiza | **ni** | — |

## 1. Enotski testi

- **Vrsta:** avtomatizirani enotski testi (čiste funkcije brez baze in omrežja).
- **Stanje:** 42 testnih datotek v `tests/`, 281 testov, vsi uspešni (`npm test`).
- **Pokriti del:**
  - domena ticketov: statusi, nivoji, pravice zaključevanja, filtri, iskanje (`domain`, `issue-filter`, `search-scope`, `manage-permissions`),
  - katalog in ujemanje izdelkov med trgi (`catalog-*`, `exchange-product`),
  - zaloga in skladišče: ujemanje paketov z naročili, združevanje, odposlano, stroški skladiščenja (`shipg-*`, `shipgerman`, `storage-cost`, `ship-cutoff`),
  - pošta: razčlenjevanje e-pošte, povezovanje pogovorov s ticketi, predloge in jeziki pisem (`email-*`, `gmail-content`, `inbox-association`, `customer-email*`, `mail-*`, `letter-greeting`, `language-registry`),
  - menjave, dobavitelj, zadovoljstvo, obvestila (`exchange-round`, `supplier-import`, `satisfaction*`, `notify-prefs`, `rare-match`),
  - sledenje pošiljkam (`delivery-failure`, `order-status`), izolacija (`sandbox`).
- **Nepokrito:** strežniške akcije z bazo, React komponente, API poti, avtentikacija od začetka do konca.
- **Orodja:** vgrajeni Node test runner (`node:test`, `node:assert/strict`), zagon TypeScripta s `tsx`; katalog za teste je ločen fixture (`tests/support/`).

## 2. Statično preverjanje tipov

- **Vrsta:** statična analiza.
- **Stanje:** `npm run typecheck` brez napak; `tsconfig.json` ima `strict: true`.
- **Pokriti del:** vsa koda v `src/`, `prisma/`, `scripts/`, `tests/`; Prisma generira tipe iz sheme baze, zato se neusklajenost sheme in kode pokaže kot napaka.
- **Orodja:** TypeScript 5, Prisma Client.

## 3. Preverjanje gradnje

- **Vrsta:** statična analiza / dimni test.
- **Stanje:** vsaka namestitev (`npm run deploy`) zgradi produkcijsko sliko; neuspešna gradnja ustavi namestitev, star zabojnik teče naprej. Po namestitvi se preveri, da `/login` vrne HTTP 200 in da je zabojnik na novo ustvarjen.
- **Orodja:** Next.js build, Docker, `curl`.

## 4. Ročno testiranje

- **Vrsta:** ročno raziskovalno testiranje.
- **Stanje:** po spremembah se ključni tokovi preverijo v brskalniku na lokalni izolirani kopiji (prijava, ticket, Prejeto, zaloga, dobavitelj, ocene, administracija). Ni zapisanih testnih scenarijev ne zapisnika rezultatov.
- **Orodja:** brskalnik, lokalni strežnik (`npm run dev`), izmišljeni podatki iz `prisma/seed.ts`.

## 5. Izolacija testnega okolja

- **Vrsta:** zagotavljanje kakovosti (varno okolje za testiranje).
- **Stanje:** aplikacija nima zunanjih integracij; vsaka zahteva izven `localhost` se zavrne, pošta gre v tabelo `DemoMail`.
- **Pokriti del:** zaščita pred klici navzven je pokrita s testi (`tests/sandbox.test.ts`).
- **Orodja:** lastna koda (`src/lib/sandbox.ts`, `src/lib/demo-mailbox.ts`).

## 6. Varnostni ukrepi

- **Vrsta:** zagotavljanje kakovosti (varnost po zasnovi), brez avtomatiziranih varnostnih testov.
- **Stanje:** gesla s scrypt, neprozorni sejni žetoni (v bazi samo SHA-256), preverjanje pravic v vsaki strežniški akciji, priloge zunaj javne mape in strežene samo prijavljenim, CSP in varnostne HTTP glave, HTTPS. Pravila gesel so pokrita s testi.
- **Orodja:** Node `crypto`, Next.js middleware in `headers()`, Caddy.

## 7.–10. Manjkajoče aktivnosti

- **Integracijski in E2E testi:** ni testov, ki bi šli skozi bazo, strežniške akcije ali brskalnik. Kandidat: Playwright za ključne tokove (prijava → nov ticket → predaja → zaključek).
- **Pokritost kode:** se ne meri. Kandidat: `node --test --experimental-test-coverage` ali c8.
- **CI:** testi in preverjanje tipov se poganjajo ročno pred commitom, ne samodejno. Kandidat: GitHub Actions (`npm ci`, `npm run typecheck`, `npm test`).
- **Linter:** ESLint in Prettier nista nastavljena.

## Uporaba umetne inteligence

- **Orodji:** Claude Code (Anthropic) in OpenAI Codex kot programerska agenta.
- **Uporaba:** pisanje in spreminjanje kode aplikacije in testov, priprava izmišljenih podatkov, odstranitev zunanjih integracij, vzpostavitev na strežniku ter priprava teh dokumentov.
- **Preverjanje rezultata:** vsako spremembo smo preverili s `npm run typecheck` in `npm test` (vsi testi morajo biti uspešni), spremembe uporabniškega vmesnika ročno v brskalniku na lokalni kopiji, namestitev pa z odzivom strežnika (HTTP 200) in pregledom dnevnika zabojnika. Dokumente smo pregledali in primerjali z dejanskim stanjem kode.
- Aplikacija sama AI ne uporablja; ocene zadovoljstva so izmišljene.
