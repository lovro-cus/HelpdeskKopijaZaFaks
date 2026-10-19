# Zapisnik funkcionalnega testiranja HelpDesk

Datum izvedbe: 19. 10. 2026. Izvajalec: agent Codex, model gpt-6.1-sol, z avtomatizacijo Playwright 1.64.1. Testirana je lokalna koda na osnovi commita 6ac4b69 z dodanimi testi in dokumentacijo; aplikacijska koda ni bila popravljena.

V zadnjem zaključenem zagonu je vseh pet funkcionalnih tokov doseglo pričakovani izid. Celotni nabor E2E ima tri uspešne in dva neuspešna testa, saj TP-02 in TP-03 padeta pri dodatnem preverjanju napak konzole. Zagon bun run test:e2e zato vrne izhodno kodo 1. Rezultat ni predstavljen kot popolnoma uspešen nabor.

## Okolje in dokazila

Windows, Google Chrome 155.0.8059.82, prikaz 1440 × 1000, locale sl-SI. Aplikacija Next.js 15.5.26 v razvojnem načinu, testni naslov http://localhost:3100. SQLite prisma/naloga2-e2e.db se pred vsakim primerom samostojno napolni s semenom. Vsak primer uporablja nov kontekst brskalnika. Menjava gesla za Nino in Evo poteka skozi vmesnik.

Vgrajeni predogled T3 je bil poskušen najprej, vendar je dvakrat vrnil »Preview automation snapshot timed out after 15000ms.«. Uporabljen je bil Playwright z lokalnim Chromom. Posnetki potrjujejo prikaz vsebine; testi preverjajo interakcije, shranitev po osvežitvi, napake JavaScripta in konzolo. Za izbrane strani ni bila opažena prazna stran ali prekrivni prikaz napake ogrodja.

| Primer | Funkcionalni koraki | Celotni test | Napake v konzoli | Dokazila |
|---|---|---|---|---|
| TP-01 | Uspešni | Uspešen | 0 | [Posnetek](dokazila/TP-01.png), [konzola](dokazila/TP-01-konzola.json), [besedilo strani](dokazila/TP-01-stran.txt) |
| TP-02 | Uspešni | Neuspešen | 2 | [Posnetek](dokazila/TP-02.png), [konzola](dokazila/TP-02-konzola.json), [besedilo strani](dokazila/TP-02-stran.txt) |
| TP-03 | Uspešni | Neuspešen | 2 | [Posnetek](dokazila/TP-03.png), [konzola](dokazila/TP-03-konzola.json), [besedilo strani](dokazila/TP-03-stran.txt) |
| TP-04 | Uspešni | Uspešen | 0 | [Posnetek](dokazila/TP-04.png), [konzola](dokazila/TP-04-konzola.json), [besedilo strani](dokazila/TP-04-stran.txt) |
| TP-05 | Uspešni | Uspešen | 0 | [Posnetek](dokazila/TP-05.png), [konzola](dokazila/TP-05-konzola.json), [besedilo strani](dokazila/TP-05-stran.txt) |

Strojno berljiv povzetek je v dokazila/rezultati.json. Celotno lokalno poročilo je playwright-report/index.html, sledi neuspešnih testov pa so v test-results. Poročilo se odpre z bunx playwright show-report.

## Ugotovljena napaka NAP-01

React pri prikazu seznama ticketov za Nino in Evo poroča: Each child in a list should have a unique "key" prop. Opozorilo v konzoli navaja BulkOrderGrid in otroka iz OrdersPage. V TP-02 in TP-03 je bilo zabeleženo po dvakrat prek console.error. Funkcionalni del obeh primerov se zaključi uspešno, naknadna zahteva po prazni konzoli pa ne.

Ponovitev: pripravi sveže seme, prijavi Evo oziroma Nino, zamenjaj začetno geslo in odpri seznam ticketov. Preglej razvojno konzolo. Pričakovano je pravilno izrisovanje brez opozorila o manjkajočih ključih. Verjetno območje pregleda sta src/app/(app)/orders/page.tsx in src/components/BulkOrderGrid.tsx; natančen izvor ni bil potrjen. Predlagana prioriteta je nizka, ker v teh primerih ne blokira poslovnega toka. Napaka je dokumentirana in ni odpravljena.

## Ostale ugotovitve in omejitve

Prijavna stran je v kodi fiksno angleška; to je popravek predpogoja testov, ne dokaz vpliva jezika brskalnika. V Prejetem je treba pred urejanjem počakati, da se naložita pogovor in začetni osnutek. Avtomatizacija zato čaka na prikaz hitrih odgovorov in preveri točno vsebino polja pred pošiljanjem. Med pripravo avtomatizacije so bili popravljeni tudi preširok lokator role=status in čakanje na prehod med pogovori. Vmesni nepopolni zagoni niso uporabljeni kot končni rezultati.

Napis Pošlji kot Ana in opis pismo o nadomestku ostajata kandidata za uredniški popravek. Strežnik je med prehodi in zaključevanjem kontekstov občasno izpisal aborted oziroma ECONNRESET; funkcionalni koraki zadnjega zagona zaradi tega niso padli. Vzrok teh strežniških izpisov ni bil potrjen. Sporočila NO_COLOR/FORCE_COLOR so opozorila okolja testnega zagona.

Izveden je bil samo namizni Chrome, ne mobilni prikaz, druga brskalniška pogona ali produkcijska gradnja. Pošiljanje zunanje pošte in dejanske finančne transakcije niso del lokalne kopije.

## Dodatna preverjanja in ponovitev

bun run test: 281 uspešnih enotskih testov, brez neuspešnih. bun run typecheck: uspešno. git diff --check: brez napak v presledkih. Skript za pripravo dokumentov je preimenovan iz TypeScripta v JavaScript, da ne zahteva Bunovih tipov znotraj aplikacijskega preverjanja tipov.

Za ponovitev ustavi drug next dev v tem repozitoriju, nato poženi bun run test:e2e. Navodila in izolacija so v tests/e2e/README.md. Testi sami upravljajo strežnik na portu 3100 in ga ob koncu ustavijo. Lokalni strežnik za uporabnikov ogled je ponovno zagnan na http://localhost:3000 z ločeno demo bazo; prijava Admin / Kroj-Demo-2026.
