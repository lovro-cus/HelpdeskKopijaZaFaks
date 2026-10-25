Si tester programske opreme. Testiraš spletno aplikacijo HelpDesk – podporo strankam spletne trgovine z oblačili (izmišljena trgovina Kroj). Projekt je v mapi C:\HelpdeskKopijaZaFaks.

Naloga: oblikuj 5 testnih primerov za ročno funkcionalno testiranje po metodi črne skrinjice. Datotek v projektu ne spreminjaj, rezultat samo vrni kot odgovor.

Vir resnice je SAMO dokumentacija:
- docs/FUNKCIONALNOSTI.md – zahteve (funkcionalnosti 1–10, kdo jih sme izvajati in kje v aplikaciji so),
- docs/VZPOSTAVITEV.md – zagon, testni podatki in uporabniški računi.
Izvorne kode (mapa src/, prisma/, tests/) NE beri. Testni primer mora preverjati, ali aplikacija naredi to, kar zahteva dokumentacija – ne tega, kar je trenutno sprogramirano. Če dokumentacija česa ne določa (npr. natančnega besedila sporočila o napaki), tega ne izmišljuj, ampak opiši pričakovano vedenje (npr. »dejanje je zavrnjeno, ticket ostane odprt«).

Pričakovani rezultati morajo preverjati dejanski učinek zahteve, viden v aplikaciji. Primer: pri predaji ticketa ne zadošča, da se pokaže sporočilo o uspehu – preveri, da je ticket res na višjem nivoju (pri uporabniku tega nivoja je viden, prejemnik ima obvestilo, prejšnji lastnik ga nima več kot svojega). Stanje preverjaj skozi uporabniški vmesnik, ne v bazi.

Vsak testni primer naj ima te atribute (po ISO/IEC/IEEE 29119-3):
- ID (TP-01 … TP-05)
- naslov
- testirana funkcionalnost (številka in ime iz FUNKCIONALNOSTI.md)
- vir zahteve – dobesedni stavek ali vrstica tabele iz dokumentacije, iz katere izhaja pričakovani rezultat
- prioriteta (visoka / srednja / nizka) s kratko utemeljitvijo
- vrsta: pozitiven ali negativen
- predpogoji (stanje aplikacije, kateri uporabnik je prijavljen)
- testni podatki (konkretne vrednosti; uporabniki, gesla in podatki samo iz dokumentacije)
- koraki – oštevilčeni; pri vsakem koraku pričakovani odziv
- končni pričakovani rezultat – kako tester preveri, da se je zahtevano res zgodilo
- stanje po izvedbi, kot je vidno v aplikaciji

Pravila:
1. Vsaj dva primera naj bosta negativna (aplikacija mora zavrniti dejanje, ki ga dokumentacija ne dovoli).
2. Vsak primer je neodvisen od drugih in se začne na sveži bazi (`npm run db:seed`).
3. Pokrij 5 različnih funkcionalnosti; prednost imajo ključni tokovi (odpiranje, predaja, zaključevanje, pošta, upravljanje uporabnikov).
4. Upoštevaj vse, kar dokumentacija pravi o računih (npr. zamenjava gesla ob prvi prijavi), in to zapiši v predpogoje, ne v korake testa.

Oblika: v slovenščini, Markdown. Vsak testni primer kot svojo tabelo z dvema stolpcema (atribut | vrednost), koraki v ločeni tabeli (# | korak | pričakovani odziv). Na koncu naštej mesta, kjer je dokumentacija nejasna ali nepopolna za testiranje.
