# Matrika povezav funkcionalnosti in testnih primerov

Projekt HelpDesk, različica dokumenta 3.0, 19. 10. 2026. Funkcionalnosti in izvorne številke izhajajo iz docs/FUNKCIONALNOSTI.md. Oznaka X pomeni neposredno preverjanje navedenega vidika funkcionalnosti. Pomišljaj pomeni, da primer tega vidika ne preverja.

| ID in izvorna številka | Funkcionalnost in preverjeni vidik | TP-01 | TP-02 | TP-03 | TP-04 | TP-05 |
|---|---|---|---|---|---|---|
| F-01 / 1 | Odpiranje ticketa s podatki naročila in stranke ter ohranitev po osvežitvi. | X | – | – | – | – |
| F-02 / 2 | Predaja na drugi nivo brez osebnega prevzemnika, komentar in obvestilo prejemnici. | – | X | – | – | – |
| F-03 / 3 | Zavrnitev zaključka refunda brez potrditve vračila in ohranitev odprtega statusa. | – | – | X | – | – |
| F-04 / 4 | Shranitev odgovora v demo pogovoru, stanje Čakamo in povezava s ticketom. | – | – | – | X | – |
| F-08 / 8 | Zavrnitev uporabniškega imena nina, ki že obstaja, brez novega računa. | – | – | – | – | X |

Vsak primer pokriva eno glavno funkcionalnost. Prijava in priprava gesla sta predpogoja in nista predstavljeni kot samostojno testirani funkcionalnosti. Obvestilo v TP-02 je del preverjanja predaje.

Matrika ne pomeni popolne pokritosti: TP-01 ne preverja prilog in artiklov, TP-03 ne preverja uspešnega zaključka ali vseh nivojskih pravic, TP-04 ne preverja zunanje dostave pošte, TP-05 ne preverja uspešnega ustvarjanja, deaktivacije in pravic gosta. Funkcionalnosti 5, 6, 7, 9 in 10 niso vključene. Pet izbranih področij od desetih ni merilo pokritosti vseh zahtev ali poti aplikacije.

Viri za pregled pričakovanj: prisma/seed.ts; src/lib/actions/issues.ts; src/lib/actions/admin.ts; src/lib/actions/auth.ts; src/components/InboxWorkspace.tsx; src/lib/i18n/dictionaries.ts. Vsi primeri so bili izvedeni s Playwrightom; dejanski rezultati in ločena presoja konzole so v zapisnik-testiranja.md.
