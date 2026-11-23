# Testni plan – HelpDesk 1.1

| Postavka | Vrednost |
|---|---|
| Oznaka plana | TPL-HD-1.1, različica 1.1 (osnutek agenta, kritično predelan; spremembe v `Povzetek-sprememb-osnutka.md`) |
| Testni element | HelpDesk (podpora strankam izmišljene trgovine Kroj), naslednja različica **1.1** |
| Izhodišče | Git commit `f238bab` (16. 11. 2026), veja `feature/naloga-2-funkcionalni-testi` |
| Datum | 22. 11. 2026 (osnutek), 23. 11. 2026 (predelava) |
| Skupina | [Študent A] – lastnik projekta HelpDesk; [Študent B] – lastnik projekta eNormativi (3. naloga) |
| Pripravil osnutek | agent Claude Code (Claude Opus 5.5) |
| Pregledal in predelal | [vpiši imena] |

## 1. Namen in obseg

Plan določa, kako bomo testirali različico 1.1 aplikacije HelpDesk. Različica 1.1 odpravi napake in neskladja, ki smo jih našli v nalogah 2–5, in razširi avtomatizirane teste. Plan ne opisuje testiranja različice 1.0; ta je dokumentirana v `docs/naloga2`, `docs/naloga4` in `docs/naloga5`.

### 1.1 Spremembe v različici 1.1

Testiranje se osredotoči na te spremembe. Vsaka ima vir v prejšnji nalogi.

| ID | Sprememba | Vir | Mesto v kodi |
|---|---|---|---|
| SP-1 | Odprava NAP-01: opozorilo Reacta »Each child in a list should have a unique "key" prop« na seznamu ticketov | 2. naloga, zapisnik; 4. naloga | verjetno `src/components/BulkOrderGrid.tsx`, `src/app/(app)/orders/page.tsx` (izvor v 2. nalogi ni potrjen) |
| SP-2 | Preverjanje polja »Vrednost naročila«: število 0,00–10 000,00, največ 2 decimalki, sicer sporočilo o napaki | 5. naloga, U-1 (pravili S2-2, S2-3) | `src/lib/actions/issues.ts` (`num`) |
| SP-3 | Uporabniško ime je enolično ne glede na velike in male črke (`NINA` = `nina`) | 5. naloga, U-5 (pravilo S3-3) | `src/lib/actions/admin.ts` (`createUser`) |
| SP-4 | Seznam zahtev za geslo pokaže tudi »Največ 200 znakov« | 5. naloga, U-6 | stran za zamenjavo gesla, `src/lib/password-rules.ts` |
| SP-5 | Odločitev o številki naročila je zapisana, koda se ne spremeni. Za odpiranje ticketa velja 1–40 znakov `[A-Za-z0-9#-_. ]` (ročna naročila, npr. `KRJ-3003_a.b`). `looksLikeOrderNumber` (3–10 števk) je samo hevristika iskanja, kdaj ponuditi »Odpri ticket«, in ni pravilo vnosa. `0912` in `912` sta različni naročili, ker seme že vsebuje številke z vodilno ničlo (`0912`, `0934` …). Komentar v kodi to zapiše. | 5. naloga, U-2, U-3 | `src/lib/actions/issues.ts` (`createIssue`, regularni izraz), `src/lib/order-number.ts` |
| SP-6 | Besedili: gumb »Pošlji kot Ana« pokaže ime prijavljenega uporabnika; dnevnik pri navadnem odgovoru ne piše »pismo o nadomestku« | 2. naloga, TP-04 opomba | `src/components/InboxWorkspace.tsx` (`send`), `src/lib/i18n/dictionaries.ts` (`thread.customerEmail.sent`) |
| SP-7 | Cevovod teče tudi ob pull requestu na `main` | 4. naloga, `izbira-orodja.md` (cevovod se na `main` ne sproži) | `.github/workflows/e2e.yml` |

## 2. Funkcionalnosti, ki jih testiramo

Oznake F-01 do F-10 so iz `docs/FUNKCIONALNOSTI.md`.

| Funkcionalnost | Zakaj | Kako | Testni primeri |
|---|---|---|---|
| F-01 Odpiranje ticketa | SP-2 spremeni preverjanje vnosa; SP-5 potrdi obstoječe pravilo | E2E + EK/MV različice | TP-01, TP-01.01–TP-01.30 |
| F-02 Predaja višjemu nivoju | SP-1 (seznam ticketov za L1/L2); regresija | E2E | TP-02 |
| F-03 Zaključevanje ticketa | SP-1; regresija varovalke vračila | E2E, mutacija M-1 | TP-03 |
| F-04 Pošta in odgovor stranki | SP-6 spremeni besedila | E2E | TP-04 |
| F-08 Upravljanje uporabnikov | SP-3 | E2E + EK/MV različice | TP-05, TP-05.01–TP-05.27 |
| Prva prijava in zamenjava gesla | SP-4; predpogoj TP-02 in TP-03 | E2E + EK/MV različice | TP-06, TP-06.01–TP-06.16 |

## 3. Funkcionalnosti, ki jih ne testiramo

| Funkcionalnost | Razlog |
|---|---|
| F-05 Rezervacija iz zaloge, F-06 Dobavitelj | 1.1 jih ne spreminja. Poslovno logiko pokrivajo enotski testi (`shipg-*`, `exchange-*`, `supplier-import`), ki tečejo v cevovodu. |
| F-07 Zadovoljstvo, F-09 Katalog, F-10 Nastavitve | 1.1 jih ne spreminja; pokrivajo jih enotski testi (`satisfaction*`, `catalog-*`, `config`). |
| Pošiljanje prave e-pošte, plačila | Aplikacija nima zunanjih integracij; pošta gre v tabelo `DemoMail`, klici izven `localhost` so zavrnjeni (`src/lib/sandbox.ts`). |
| Zmogljivost in obremenitev | Aplikacijo uporablja nekaj uporabnikov hkrati. Tveganje je nizko, orodja nimamo nastavljenega. |
| Firefox, WebKit | Podpora dela v Chromu; to ni preverjeno pri uporabnikih. 1.1 ne spreminja postavitve. Ostane kot tveganje R-6. |
| Avtomatiziran mobilni prikaz | 1.1 ne spreminja postavitve. Koda ima mobilno postavitev (`globals.css`, `@media (max-width: 639px)`, `hover: none`), zato mobilnega prikaza ne izključimo v celoti: pregledamo ga ročno v raziskovalnem testiranju (4.1, sklop C). |
| Dostopnost (WCAG) | 1.1 ne spreminja postavitve ali kontrol; orodja (npr. axe) nimamo nastavljenega. |
| Avtomatizirani varnostni testi | Izven obsega predmeta. Varnostni ukrepi po zasnovi so opisani v `docs/STANJE-TESTIRANJA.md`, razdelek 6. |

## 4. Pristop

### 4.1 Ravni in vrste testiranja

| Raven | Orodje | Kaj preveri | Kdaj | Vir |
|---|---|---|---|---|
| Statična analiza | TypeScript `strict` (`bun run typecheck`) | tipi, skladnost sheme Prisma s kodo | vsak push | stanje testiranja |
| Enotski testi | `node:test` + `tsx` (`bun run test`) | poslovna logika; trenutno 281 testov | vsak push | stanje testiranja |
| Funkcionalni E2E | Playwright 1.64.1 (`bun run test:e2e`) | TP-01–TP-05 skozi vmesnik, produkcijska gradnja | vsak push, PR na `main` | 4. naloga |
| Testi z EK in MV | Playwright, parametriziran test | 73 izvedbenih različic TP-01, TP-05, TP-06 | izbor `@hitro` ob vsakem pushu, vseh 73 ob PR na `main` | 5. naloga (zdaj samo dokument) |
| Preverjanje konzole | fixture `browserErrors` | brez napak JavaScripta in `console.error` | vsak E2E test | 2. in 4. naloga |
| Mutacijsko preverjanje testov | ročno vnesene napake | da testi zaznajo napako | enkrat pred izdajo | 4. naloga (M-1, M-2) |
| Raziskovalno ročno testiranje | Chrome, lokalna kopija | 3 sklopi po 20 min: A – vnos vrednosti naročila (SP-2: vejica/pika, presledki, lepljenje), B – uporabniki in geslo (SP-3, SP-4), C – mobilni prikaz 375 × 812 (orodja za razvijalce) v Prejetem in pri zamenjavi gesla | enkrat pred izdajo, 60 min | stanje testiranja, razdelek 4 |

### 4.2 Novi in spremenjeni testi

1. **TP-01, TP-05, TP-06 z EK in MV.** Različice iz 5. naloge postanejo podatkovna tabela v `tests/e2e/`. Vsaka različica je en `test()` z oznako različice (npr. `TP-01.19`). Različice, ki ne spremenijo baze, tečejo brez novega semena. Oznako `@hitro` dobijo vse mejne vrednosti (MV), vse različice [dodano] in ena veljavna različica na funkcionalnost. Ob pushu teče `--grep @hitro`, ob PR na `main` (SP-7) vseh 73. Tako push ostane pod 10 minutami, pred združitvijo pa teče celoten nabor.
2. **TP-02 in TP-03 v razvojnem načinu.** Po SP-1 morata uspeti tudi lokalno (`next dev`). V 4. nalogi sta lokalno padla samo zaradi NAP-01.
3. **Nov korak za SP-6 v TP-04.** Gumb za pošiljanje nosi ime prijavljenega uporabnika (Administrator), ne »Ana«.
4. **Popravek TP-03, korak 4.** Besedilo »preveri Arhiv z iskanjem naročila 1690« zamenjamo s »preveri seznam Arhiva«. Iskanje gre namenoma tudi po Arhivu (`src/lib/issue-filter.ts`), zato ne dokaže ničesar (4. naloga, odstopanje pri TP-03).
5. **Pričakovani rezultati z oznako [dodano].** V 5. nalogi so zapisani po pravilu, ki ga koda še ni imela (TP-01.19–TP-01.30, TP-05.13). V 1.1 so to pravila, zato morajo te različice uspeti.

### 4.3 Regresija

Celoten nabor (typecheck, 281+ enotskih testov, vsi E2E testi) teče ob vsakem pushu. Ročne regresije ni, razen raziskovalnega testiranja v 4.1.

### 4.4 Preverjanje, da testi zaznajo napako

Pred izdajo ponovimo mutaciji iz 4. naloge in dodamo dve novi. Po vsaki mutaciji povrnemo kodo z `git checkout`.

| ID | Mutacija | Mesto | Pričakovano |
|---|---|---|---|
| M-1 | Izklop pogoja `returnConfirmed` | `src/lib/actions/issues.ts` | TP-03 pade v koraku 3 |
| M-2 | `assigneeId: null` → `me.id` pri predaji nivoju | `src/lib/actions/issues.ts` | TP-02 pade v koraku 3 |
| M-3 | Odstranitev preverjanja zgornje meje vrednosti | `src/lib/actions/issues.ts` (`num`) | TP-01.25 pade |
| M-4 | Primerjava uporabniškega imena spet loči velike in male črke | `src/lib/actions/admin.ts` | TP-05.13 pade |

## 5. Merila

### 5.1 Vstopna merila

- `bun install --frozen-lockfile`, `bun run typecheck` in `bun run test` uspejo.
- Seme (`prisma/seed.ts`) vsebuje podatke, ki jih zahtevajo predpogoji (KRJ-3, KRJ-15, pogovor Lara Vzorčni, 6 uporabnikov).

### 5.2 Izstopna merila (različica je pripravljena za izdajo)

- Vsi enotski testi in vsi E2E testi (vseh 73 različic) uspejo v cevovodu (`CI=true`) ob PR na `main`.
- Študent A zažene celoten nabor E2E še lokalno (`next dev`, Windows 11, Chrome) in rezultat zapiše v poročilo. Lokalni zagon je obvezen, ker NAP-01 vidimo samo v razvojnem načinu. Ne zahtevamo ga od vseh članov: Študent B ima nameščen svoj projekt (eNormativi), ne HelpDeska.
- Nabor E2E uspe dvakrat zaporedoma brez ponovitev: `CI=true bunx playwright test --repeat-each=2 --retries=0`.
- Vse štiri mutacije M-1–M-4 povzročijo padec pričakovanega testa.
- Ni odprte napake z resnostjo visoka ali srednja. Odprte nizke napake so naštete v poročilu.
- NAP-01, U-1, U-5 in U-6 so zaprte ali zapisano prestavljene v naslednjo različico.

### 5.3 Merila za prekinitev in nadaljevanje

| Prekinemo, če | Nadaljujemo, ko |
|---|---|
| Gradnja (`next build`) ali `db:push` v cevovodu ne uspe | gradnja spet uspe |
| Več kot 2 E2E testa padeta v predpogoju (seme ne ustreza) | seme je popravljeno |
| Test uspe šele pri ponovitvi (`retries: 1`) | vzrok nestabilnosti je najden; test je popravljen ali označen in prijavljen kot napaka |

## 6. Testno okolje

| Lastnost | Lokalno | Cevovod (GitHub Actions) |
|---|---|---|
| Sistem | Windows 11 | `ubuntu-latest` |
| Strežnik | `next dev` na portu 3100 | `prisma db push` + `next build` + `next start` na portu 3100 |
| Brskalnik | nameščeni Google Chrome | Playwrightov Chromium |
| Baza | SQLite `prisma/naloga2-e2e.db`, seme pred vsakim testom | enako |
| Priloge | `uploads-sandbox/naloga2-e2e` | enako |
| Okolje brskalnika | `sl-SI`, 1440 × 1000 | enako |
| Ponovitve | 0 | 1 |
| Delavci | 1 (skupna baza) | 1 |

Demo geslo je `Kroj-Demo-2026`. Baze `prisma/dev.db` testi ne spreminjajo. Aplikacija nima zunanjih storitev, zato cevovod ne potrebuje skrivnosti.

```text
push / PR na main
  └─ "Tipi in enotski testi"   bun install → prisma generate → typecheck → bun run test
       └─ "Funkcionalni testi"  playwright install chromium → bun run test:e2e
            ├─ TP-01 … TP-05 (osnovni primeri)
            ├─ TP-01.xx, TP-05.xx, TP-06.xx (EK in MV)
            └─ vedno: playwright-report, test-results, JUnit (14 dni)
```

## 7. Testni izdelki

| Izdelek | Mesto | Kdo |
|---|---|---|
| Testni plan (ta dokument) | `docs/naloga6/` | skupina |
| Testni primeri TP-01–TP-06 z EK in MV | `docs/naloga2/testni-primeri-v3.md`, `docs/naloga5/` (posodobljeno za 1.1) | Študent A |
| Skripte E2E | `tests/e2e/*.spec.ts` | Študent A, agent |
| Poročilo Playwright (HTML, JUnit, JSON, posnetki, sledi) | artefakta cevovoda `playwright-report`, `test-results` | cevovod |
| Zapisnik mutacij M-1–M-4 | poročilo o testiranju | Študent B |
| Seznam napak | poročilo o testiranju, oblika kot NAP-01 | vsi |
| Poročilo o testiranju 1.1 | `docs/naloga6/` ali naslednja naloga | skupina |

## 8. Naloge, odgovornosti in razpored

| # | Naloga | Odgovoren | Rok |
|---|---|---|---|
| 1 | Zapis odločitve o SP-5 v komentar kode in v 5. nalogo (U-2, U-3 zaprta kot »namensko«) | Študent A | 25. 11. 2026 |
| 2 | Odprava SP-1–SP-4 in SP-6 v kodi | Študent A (z agentom) | 2. 12. 2026 |
| 3 | Parametrizirani testi EK in MV za TP-01, TP-05, TP-06 | Študent A (z agentom) | 2. 12. 2026 |
| 4 | Pregled skript po merilih 4. naloge (predpogoji, podatki, koraki, rezultat, robustnost) | Študent B | 4. 12. 2026 |
| 5 | Sprožilec cevovoda za PR na `main` (SP-7) | Študent A | 4. 12. 2026 |
| 6 | Mutacije M-1–M-4 | Študent B | 7. 12. 2026 |
| 7 | Raziskovalno testiranje (sklopi A–C, 3 × 20 min, zapis opažanj) | Študent B | 7. 12. 2026 |
| 8 | Poročilo o testiranju in odločitev o izdaji | skupina | 9. 12. 2026 |

Študent B pregleda skripte, ki jih napiše Študent A, in izvede mutacije. Tako testov ne potrdi ista oseba, ki jih je napisala. Agent UI piše kodo in teste samo po navodilu; vsak rezultat agenta preveri človek (glej 2. in 4. nalogo: agent je v skripti TP-03 iz 2. naloge zapisal preverjanje, ki je vedno uspelo).

## 9. Tveganja

### 9.1 Tveganja produkta

| ID | Tveganje | Verjetnost / vpliv | Ukrep |
|---|---|---|---|
| R-1 | Napaka, ki se pokaže samo v razvojnem načinu (kot NAP-01), ostane neopažena, ker cevovod testira produkcijsko gradnjo | srednja / nizek | izstopno merilo: lokalni zagon z `next dev` (Študent A) |
| R-2 | Nova preverjanja vnosa (SP-2, SP-3) zavrnejo podatke, ki so že v bazi (npr. obstoječa uporabnika z imenoma, ki se razlikujeta samo v velikih črkah) | nizka / srednji | pred izdajo poizvedba po obstoječih podatkih v demo bazi |
| R-3 | Strežnik občasno izpiše `aborted` / `ECONNRESET` (2. naloga); vzrok ni znan | srednja / nizek | spremljamo ponovitve v cevovodu (merilo 5.3) |
| R-4 | Strežnik vnos, daljši od meje, potiho odreže (`slice`) namesto zavrne (5. naloga, U-4) | nizka / nizek | zapis kot znana omejitev; prek vmesnika ni dosegljivo zaradi `maxLength` |

### 9.2 Tveganja projekta

| ID | Tveganje | Ukrep |
|---|---|---|
| R-5 | Agent UI napiše test, ki vedno uspe (primer: TP-03 v 2. nalogi) | pregled Študenta B; mutacije M-1–M-4 |
| R-6 | Avtomatizirano testiramo samo namizni Chrome; kateri brskalnik podpora res uporablja, ni preverjeno | mobilni prikaz ročno (sklop C); v poročilu zapisano kot omejitev |
| R-7 | 73 različic EK in MV podaljša cevovod | ob pushu samo `@hitro`, vseh 73 ob PR na `main`; različice brez spremembe baze tečejo brez novega semena; cilj pod 10 min ob pushu |
| R-8 | Vgrajeni predogled T3 se ne odzove (2. naloga: časovna omejitev 15 s) | uporabljamo samo Playwright |

## 10. Upravljanje napak

Napake zapišemo v enaki obliki kot NAP-01 v 2. nalogi: ID, opis, koraki za ponovitev, pričakovano, dejansko, verjetno mesto v kodi, resnost, stanje.

| Resnost | Pomen | Primer |
|---|---|---|
| visoka | poslovni tok ne deluje ali se izgubijo podatki | ticket se zaključi brez potrditve vračila (M-1) |
| srednja | napačen podatek se shrani brez opozorila | negativna vrednost naročila se shrani (U-1); nastaneta računa `nina` in `NINA` (U-5) |
| nizka | ne vpliva na poslovni tok | opozorilo Reacta v konzoli (NAP-01), besedilo »Pošlji kot Ana«, manjkajoča zahteva »Največ 200 znakov« (U-6) |

Stanja: odprta → v popravilu → popravljena → potrjena s testom → zaprta. Napako zapremo samo, če jo pokriva avtomatiziran test, ki pred popravkom pade. Izjema so napake postavitve iz raziskovalnega testiranja (npr. sklop C): te zapremo s posnetkom zaslona pred popravkom in po njem.

## 11. Sledljivost

| Sprememba / napaka | Funkcionalnost | Testni primer | Skripta | Mutacija |
|---|---|---|---|---|
| SP-1 / NAP-01 | F-02, F-03 | TP-02, TP-03 (lokalno) | `tp-02-…`, `tp-03-…` | – |
| SP-2 / U-1 | F-01 | TP-01.19–TP-01.30 | nova parametrizirana skripta TP-01 | M-3 |
| SP-3 / U-5 | F-08 | TP-05.13 | nova parametrizirana skripta TP-05 | M-4 |
| SP-4 / U-6 | prijava | TP-06.06 | nova skripta TP-06 | – |
| SP-5 / U-2, U-3 (odločitev, brez spremembe kode) | F-01 | TP-01.03, .10, .11, .17, .18 (pričakovani rezultati ostanejo) | parametrizirana TP-01 | – |
| SP-6 | F-04 | TP-04, nov korak | `tp-04-…` | – |
| regresija | F-02, F-03 | TP-02, TP-03 | `tp-02-…`, `tp-03-…` | M-1, M-2 |
| SP-7 | – | sprožitev cevovoda na PR | `.github/workflows/e2e.yml` | – |
