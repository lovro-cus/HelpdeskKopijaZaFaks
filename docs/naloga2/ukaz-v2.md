Si tester programske opreme. V mapi C:\HelpdeskKopijaZaFaks je projekt HelpDesk – spletna aplikacija za podporo strankam spletne trgovine z oblačili (izmišljena trgovina Kroj). Opis funkcionalnosti je v docs/FUNKCIONALNOSTI.md (funkcionalnosti so oštevilčene 1–10), navodila za zagon in računi v docs/VZPOSTAVITEV.md.

Naloga: oblikuj 5 testnih primerov za ročno funkcionalno testiranje (črna skrinjica, skozi uporabniški vmesnik). Datotek v projektu ne spreminjaj, rezultat samo vrni kot odgovor.

Vsak testni primer naj ima te atribute (po ISO/IEC/IEEE 29119-3):
- ID (TP-01 … TP-05)
- naslov
- testirana funkcionalnost (številka in ime iz FUNKCIONALNOSTI.md)
- prioriteta (visoka / srednja / nizka) s kratko utemeljitvijo
- vrsta: pozitiven ali negativen
- predpogoji (stanje aplikacije in baze, kateri uporabnik je prijavljen)
- testni podatki (konkretne vrednosti)
- koraki – oštevilčeni; pri vsakem koraku napiši pričakovani odziv aplikacije
- končni pričakovani rezultat
- stanje po izvedbi (kaj se je spremenilo v bazi)

Pravila:
1. Uporabljaj samo podatke, ki res obstajajo po `npm run setup` – preveri jih v prisma/seed.ts (uporabniki, njihove nastavitve ob prvi prijavi, številke naročil, pogovori v pošti). Ne izmišljuj si računov in ticketov. Če je treba nekaj vpisati (npr. novo številko naročila), napiši točno vrednost.
2. Imena gumbov, zavihkov in sporočil napiši točno tako, kot so v slovenskem vmesniku – preveri jih v src/lib/i18n/dictionaries.ts (slovenski del) in v komponentah v src/components.
3. Pričakovani rezultat mora biti en, preverljiv izid. Ne piši »gumba ni ali pa je dejanje zavrnjeno« – v kodi preveri, kaj se zgodi.
4. Vsaj dva primera naj bosta negativna (aplikacija mora pravilno zavrniti dejanje ali nepravilen vnos) in navedi točno sporočilo, ki ga uporabnik vidi.
5. Vsak primer mora biti neodvisen od drugih: začne se na sveži bazi (`npm run db:seed`) in ne potrebuje rezultata drugega primera.
6. Pokrij 5 različnih funkcionalnosti; prednost imajo ključni tokovi (ticket, predaja, zaključevanje, pošta, pravice).

Oblika: v slovenščini, Markdown. Vsak testni primer kot svojo tabelo z dvema stolpcema (atribut | vrednost), koraki naj bodo v ločeni tabeli (# | korak | pričakovani odziv). Na koncu dodaj kratek seznam predpostavk, ki jih nisi mogel preveriti v kodi.
