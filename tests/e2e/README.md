# Funkcionalni testi HelpDesk

Testi avtomatizirajo TP-01 do TP-05 iz `docs/naloga2/testni-primeri-v3.md` prek uporabniškega vmesnika. Vsak primer ima svojo datoteko (`tp-01-…spec.ts` do `tp-05-…spec.ts`), vsak korak primera pa je en `test.step` z isto številko. Skupna priprava, prijava in lokatorji so v `support/helpers.ts`. Pregled skript glede na testne primere je v `docs/naloga4/avtomatizacija-testnih-primerov.md`.

## Zagon

```powershell
bun install
bun run test:e2e                     # lokalno: next dev + nameščeni Google Chrome
$env:CI="true"; bun run test:e2e     # kot v cevovodu: produkcijska gradnja + Chromium
bunx playwright test tp-03           # samo en testni primer
```

Lokalni zagon uporablja nameščeni Google Chrome, enega delavca in slovensko okolje brskalnika. Z `CI=true` (tako teče v GitHub Actions, `.github/workflows/e2e.yml`) se namesto razvojnega strežnika zgradi in zažene produkcijska različica, testi pa uporabijo Playwrightov Chromium (`bunx playwright install chromium`). Podrobnosti so v `docs/naloga4/izbira-orodja.md`.

Pred zagonom ustavi druge strežnike `next dev` iz tega repozitorija: zagon uporablja isto mapo `.next`. Playwright sam zažene strežnik na `http://localhost:3100` in ga po koncu ustavi. Obstoječega strežnika na tem portu ne prevzame.

## Izolacija podatkov

Shema se pripravi enkrat na delavca, pred vsakim testom pa se ponastavi izključno baza `prisma/naloga2-e2e.db`, določena prek `DATABASE_URL`. `prisma/dev.db` se ne spreminja. Priloge se zapisujejo v `uploads-sandbox/naloga2-e2e`. Vsak test dobi nov kontekst brskalnika brez prijavne seje, priprava gesel pa poteka skozi vmesnik. Testi se ne zaganjajo vzporedno, ker imajo skupno testno bazo.

## Rezultati

`playwright-report/index.html` vsebuje poročilo s koraki, `test-results/junit.xml` in `test-results/results.json` strojno berljive rezultate, `test-results/` pa posnetke zaslona in sledi neuspešnih testov. Ustvarjene mape in testna baza niso vključene v Git.

```powershell
bunx playwright show-report
```

Testi poleg korakov testnih primerov preverijo tudi, da v brskalniku ni napak JavaScripta in `console.error`. V razvojnem načinu TP-02 in TP-03 zato padeta zaradi znane napake NAP-01 (opozorilo Reacta o manjkajočem `key`), čeprav so vsi funkcionalni koraki uspešni. Produkcijska gradnja tega opozorila ne izpiše.
