# Funkcionalni testi HelpDesk

Pet testov v `functional.spec.ts` avtomatizira TP-01 do TP-05 iz `docs/naloga2/testni-primeri-v3.md` prek uporabniškega vmesnika.

## Zagon

```powershell
bun install
bun run test:e2e
```

Testi uporabljajo lokalno nameščeni Google Chrome, enega delavca in slovensko okolje brskalnika. Če Chrome ni nameščen, ga je treba namestiti ali zavestno spremeniti `channel` v `playwright.config.ts`. Prijavna stran je vedno angleška; po prijavi uporabnikov iz semena je vmesnik slovenski.

Pred zagonom ustavi druge strežnike `next dev` iz tega repozitorija: zagon uporablja isto mapo `.next`. Playwright sam zažene strežnik na `http://localhost:3100` in ga po koncu ustavi. Obstoječega strežnika na tem portu ne prevzame.

## Izolacija podatkov

Shema se pripravi samodejno. Pred vsakim testom se ponastavi izključno baza `prisma/naloga2-e2e.db`, določena prek `DATABASE_URL`. `prisma/dev.db` se ne spreminja. Priloge se zapisujejo v `uploads-sandbox/naloga2-e2e`. Vsak test dobi novo prijavno sejo brskalnika, priprava gesel pa poteka skozi vmesnik. Testi se ne zaganjajo vzporedno, ker imajo skupno testno bazo.

## Rezultati

`playwright-report/index.html` vsebuje poročilo, `test-results/results.json` strojno berljive rezultate, `test-results/` pa posnetke zaslona in sledi neuspešnih testov. Ustvarjene mape in testna baza niso vključene v Git.

```powershell
bunx playwright show-report
```

Testi poleg funkcionalnih korakov preverijo tudi napake v konzoli in neobravnavane napake JavaScripta. Oznaka `functional-result` v poročilu pove, ali je funkcionalni del uspel pred dodatnim preverjanjem konzole. Uspešen poslovni tok zato še ne pomeni, da celoten avtomatizirani test uspe. Napake konzole se ne ignorirajo.
