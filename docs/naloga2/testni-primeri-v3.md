# Funkcionalni testni primeri za HelpDesk

Avtor primerov: agent Codex, model gpt-6.1-sol. Različica: 3.0. Datum priprave: 19. 10. 2026. Vir pregleda aplikacije: Git commit 6ac4b69. Dokument vsebuje načrt ročnih testov in rezultate njihove avtomatizirane izvedbe s Playwrightom. Podrobnosti so v zapisniku testiranja.

## Skupno okolje in priprava

Okolje za predvideno izvedbo je lokalna demo aplikacija HelpDesk na http://localhost:3000 z ločeno testno bazo SQLite, brez sočasnih uporabnikov. Zabeležiti je treba različico brskalnika in aplikacije ob dejanski izvedbi. Po prijavi je vmesnik slovenski, prednostni jezik brskalnika je sl-SI; neprijavljena stran je vedno angleška in uporablja gumb Sign in. Demo pošta ostane v aplikaciji in se ne dostavi v zunanji nabiralnik.

Za začetno pripravo so predvideni `bun install`, priprava `.env` po dokumentaciji, `bun run setup` in `bun run dev`. Pred vsakim primerom je treba na ločeni testni bazi izvesti `bun run db:seed` ter odstraniti prejšnjo prijavno sejo. Ta ukaz izbriše podatke in ni namenjen skupni ali produkcijski bazi. Ob dejanski izvedbi so bile odvisnosti nameščene z Bunom, testni strežnik na portu 3100 pa je uporabljal ločeno bazo naloga2-e2e.db. Lokalni strežnik za ogled na portu 3000 uporablja drugo bazo naloga2-functional.db.

Predvideno je privzeto demo geslo `Kroj-Demo-2026`. Za TP-02 se pred začetkom testnih korakov vsak zase prijavita `nina` in `eva` ter ob prvi prijavi zamenjata geslo: trenutno geslo `Kroj-Demo-2026`, novo in ponovljeno novo geslo `Nina-Test-2026!` oziroma `Eva-Test-2026!`, potrditev z »Shrani geslo«. Nato se odjavita. Za TP-03 se po enakem postopku pripravi samo Eva. Priprava ne potrebuje izvedbe drugega testnega primera.

Merilo uspeha za vsak primer je izpolnitev vseh pričakovanih odzivov in končnega pričakovanega rezultata. Pri negativnem primeru je uspeh pravilna zavrnitev, skupaj z ohranitvijo podatkov. Po vsakem primeru se uporabnik odjavi; pred naslednjim se podatki ponovno pripravijo s semenom v ločeni testni bazi. To je tudi postopek čiščenja vseh petih primerov.

## TP-01 Odpiranje novega ticketa

| Atribut | Vrednost |
|---|---|
| Cilj | Preveriti shranitev novega ticketa s podatki naročila in stranke. |
| Funkcionalnost | F-01, izvorna funkcionalnost 1 – Odpiranje ticketa. |
| Avtor in različica | Codex, gpt-6.1-sol; 3.0; 19. 10. 2026. |
| Prioriteta in vrsta | Visoka, ker gre za osnovni vhod v obravnavo; pozitiven. |
| Okolje | Skupno lokalno demo okolje. |
| Predpogoji | Sveže seme; naročilo 3001 ne obstaja. Prijavljen je Admin, odprta stran Tiketi. |
| Testni podatki | Vrsta Kakovost; naročilo 3001; naslov Raztrgan šiv na rokavu; e-mail nova.stranka@example.com; ime Nova Stranka; prioriteta Visoka; opis Po prvem nošenju se je šiv na levem rokavu raztrgal.; privzeti prevzemnik Administrator. |

| Korak | Dejanje | Pričakovani odziv |
|---|---|---|
| 1 | Klikni »Nov ticket«. | Odpre se obrazec »Nov ticket«. |
| 2 | Izberi »Kakovost« in vnesi številko naročila, naslov, e-mail ter opis iz testnih podatkov. | Izbrana je vrsta Kakovost, vpisane vrednosti so vidne v ustreznih poljih. |
| 3 | Izberi prioriteto »Visoka«, pusti privzetega prevzemnika, razpri »Podatki o stranki in pošiljki« in vpiši ime. | Prioriteta je Visoka, prevzemnik Administrator, ime Nova Stranka. |
| 4 | Klikni »Odpri naročilo«. | Odpre se stran novega ticketa s ključem oblike KRJ-n in naslovom Raztrgan šiv na rokavu. |
| 5 | Osveži stran in preglej podatke ter nit. | Naročilo je 3001, vrsta Kakovost, prioriteta Visoka, stranka Nova Stranka z navedenim e-mailom, status V delu, nivo L3 in prevzemnik Administrator. V niti je vpisani opis. |

Končni pričakovani rezultat in merilo uspeha: obstaja en nov ticket za naročilo 3001 z vsemi navedenimi vrednostmi, ki ostanejo shranjene po osvežitvi. Fiksna številka ključa ni del pričakovanja.

Stanje po izvedbi: nov ticket in vnos v niti sta vidna v aplikaciji. Čiščenje: skupni postopek.

## TP-02 Predaja ticketa drugemu nivoju

| Atribut | Vrednost |
|---|---|
| Cilj | Preveriti predajo skupini drugega nivoja in dostop prejemnika prek obvestila. |
| Funkcionalnost | F-02, izvorna funkcionalnost 2 – Predaja ticketa višjemu nivoju. |
| Avtor in različica | Codex, gpt-6.1-sol; 3.0; 19. 10. 2026. |
| Prioriteta in vrsta | Visoka, ker omogoča nadaljevanje obravnave; pozitiven. |
| Okolje | Skupno lokalno demo okolje. |
| Predpogoji | Sveže seme. KRJ-15, naročilo 2125, je V delu na L1 in dodeljen Nini Vidmar. Nina in Eva imata gesli pripravljeni po skupnem postopku. Prijavljena je nina. Eva nima začetnih obvestil; brez sočasnih dejanj drugih uporabnikov. |
| Testni podatki | Prejemnik 2. nivo — obvesti vse; komentar Stranka je poslala fotografije, prosim za odobritev refunda 59 EUR.; prijava prejemnice eva / Eva-Test-2026!. |

| Korak | Dejanje | Pričakovani odziv |
|---|---|---|
| 1 | Odpri /orders/KRJ-15. | Prikazan je ticket naročila 2125, lastnica Nina Vidmar, nivo L1 in status V delu. |
| 2 | Klikni »Predaj naprej«. | Odpre se obrazec predaje s poljem »Predaj komu«. |
| 3 | Izberi »2. nivo — obvesti vse«, vpiši komentar in potrdi z »Predaj naprej« v obrazcu. | Ticket preide na L2, ostane V delu in čaka na prevzem brez osebnega lastnika. V niti sta dogodek predaje in točen komentar. |
| 4 | Odjavi se, prijavi se kot eva in odpri zvonec »Obvestila«. | Prisotno je novo obvestilo za naročilo 2125 z avtorico Nina Vidmar in komentarjem predaje. |
| 5 | Klikni obvestilo. | Odpre se KRJ-15 za naročilo 2125; po osvežitvi ostane na L2 brez prevzemnika in s komentarjem predaje. |

Končni pričakovani rezultat in merilo uspeha: ticket je predan drugemu nivoju brez osebnega prevzemnika, Eva prejme povezano obvestilo in prek njega odpre pravi ticket.

Stanje po izvedbi: KRJ-15 je na L2, v niti je komentar; Eva ima obvestilo o predaji. Čiščenje: skupni postopek, ki povrne tudi spremenjeni demo gesli.

## TP-03 Zavrnitev zaključka brez potrditve vračila

| Atribut | Vrednost |
|---|---|
| Cilj | Preveriti varovalko pred zaključkom refunda brez izrecne potrditve vračila. |
| Funkcionalnost | F-03, izvorna funkcionalnost 3 – Zaključevanje ticketa. |
| Avtor in različica | Codex, gpt-6.1-sol; 3.0; 19. 10. 2026. |
| Prioriteta in vrsta | Visoka, ker preprečuje prezgodnje zaprtje obravnave; negativen. |
| Okolje | Skupno lokalno demo okolje. |
| Predpogoji | Sveže seme; KRJ-3, naročilo 1690, vrsta Refund, je V delu na L2 in dodeljen Evi Kranjc. Artikel Kroj Rain Jacket Yellow / M ima rešitev Vračilo. Eva je po skupni pripravi gesla prijavljena. |
| Testni podatki | Opis rešitve Refund 119 EUR izveden.; potrditveno polje vračila neoznačeno. Besedilo je samo testni vnos, finančna transakcija se ne izvaja. |

| Korak | Dejanje | Pričakovani odziv |
|---|---|---|
| 1 | Odpri /orders/KRJ-3 in klikni »Zaključi«. | Odpre se obrazec za zaključek s potrditvenim poljem »Potrjujem, da je vračilo prispelo oz. da vračilo ni bilo potrebno.«. |
| 2 | Polje pusti neoznačeno, v opis rešitve vnesi testno besedilo. | Besedilo je vpisano, potrditveno polje ni označeno. |
| 3 | Klikni »Zaključi in arhiviraj«. | Obrazec ostane odprt in pokaže »Potrdi, da je vračilo prispelo oz. da vračilo ni potrebno.«. |
| 4 | Osveži stran in preglej status ter nit; preveri Arhiv z iskanjem naročila 1690. | Ticket ostane V delu; ni novega dogodka o zaključku in ticketa ni v Arhivu. |

Končni pričakovani rezultat in merilo uspeha: prikazano je točno navedeno sporočilo; poskus ne zaključi in ne arhivira ticketa. Sam prikaz napake brez preverjanja stanja ne zadostuje.

Stanje po izvedbi: ticket in njegova nit ostaneta nespremenjena glede zaključka. Čiščenje: skupni postopek.

## TP-04 Odgovor stranki v demo nabiralniku

| Atribut | Vrednost |
|---|---|
| Cilj | Preveriti shranitev odgovora in premik pogovora v stanje čakanja na stranko. |
| Funkcionalnost | F-04, izvorna funkcionalnost 4 – Pregled pošte in odgovor stranki. |
| Avtor in različica | Codex, gpt-6.1-sol; 3.0; 19. 10. 2026. |
| Prioriteta in vrsta | Visoka, ker je odgovor stranki ključni tok podpore; pozitiven. |
| Okolje | Skupno lokalno demo okolje; pošiljanje se simulira. |
| Predpogoji | Sveže seme; prijavljen Admin. V Prejetem je odprt pogovor Lara Vzorčni, Vračilo — naročilo #2125, lara.vzorcni@example.com, povezan s KRJ-15, s tremi sporočili in brez prevzemnika. |
| Testni podatki | Odgovor Pozdravljeni, paket smo prejeli. Refund 59 EUR bo izveden v 3 delovnih dneh. Lep pozdrav, Kroj. |

| Korak | Dejanje | Pričakovani odziv |
|---|---|---|
| 1 | Odpri »Prejeto«, pogled »Odprto«, in izberi navedeni pogovor po imenu in naročilu. | Odpre se pogovor Lara Vzorčni za naročilo 2125 s povezavo »Odpri ticket«. |
| 2 | V polju odgovora izbriši predizpolnjeni osnutek in vpiši testni odgovor. | Polje vsebuje samo predvideni odgovor. |
| 3 | Klikni gumb za pošiljanje, ki je v trenutni slovenski implementaciji označen »Pošlji kot Ana«. | Pokaže se »Odgovor je bil poslan iz podpora@kroj.example.«, na koncu pogovora je novo odhodno sporočilo s točnim testnim besedilom. |
| 4 | Odpri pogled »Čakamo« in ponovno izberi isti pogovor. | Pogovor je v tem pogledu, odgovor je ohranjen; prevzemnik pogovora je Administrator. |
| 5 | Osveži stran, nato odpri povezani ticket prek »Odpri ticket«. | Odgovor ostane shranjen. Povezava odpre KRJ-15 za naročilo 2125; njegova lastnica ostane Nina Vidmar. |

Končni pričakovani rezultat in merilo uspeha: v demo pogovoru je en nov odhodni odgovor z vnesenim besedilom, pogovor čaka na stranko, povezava vodi na pravi ticket. Dostava zunanje e-pošte ni del tega testa.

Stanje po izvedbi: odgovor je shranjen, pogovor je v Čakamo in dodeljen Administratorju; lastništvo ticketa se ne spremeni. Čiščenje: skupni postopek.

Opomba za pregled: napis »Pošlji kot Ana« je v kodi fiksen in ni ime prijavljenega uporabnika. V dnevniku se za navaden odgovor uporablja besedilo »pismo o nadomestku«. Oboje sta kandidata za ločeno obravnavo kakovosti besedil, ne merili uspeha tega testa.

## TP-05 Zavrnitev podvojenega uporabniškega imena

| Atribut | Vrednost |
|---|---|
| Cilj | Preveriti zavrnitev novega računa z že obstoječim uporabniškim imenom. |
| Funkcionalnost | F-08, izvorna funkcionalnost 8 – Upravljanje uporabnikov. |
| Avtor in različica | Codex, gpt-6.1-sol; 3.0; 19. 10. 2026. |
| Prioriteta in vrsta | Srednja, ker ščiti enoličnost računov pri administratorskem opravilu; negativen. |
| Okolje | Skupno lokalno demo okolje. |
| Predpogoji | Sveže seme s šestimi aktivnimi uporabniki; nina že obstaja. Prijavljen je Admin. |
| Testni podatki | Ime in priimek Nina Dvojnik; uporabniško ime nina; jezik Slovenščina; nivo 1. nivo; začetno geslo Zacetno-Geslo-1; e-mail prazno; Administrator neoznačeno. |

| Korak | Dejanje | Pričakovani odziv |
|---|---|---|
| 1 | Odpri »Nadzorna plošča« in zavihek »Uporabniki«. | Seznam kaže šest aktivnih uporabnikov in šest skupaj; račun nina je prisoten. |
| 2 | Klikni »Dodaj uporabnika« in izpolni obrazec s testnimi podatki. | Odprt je obrazec »Nov uporabnik« z vpisanimi podatki. |
| 3 | Klikni »Ustvari«. | Račun se ne ustvari. Obrazec pokaže »To uporabniško ime je že zasedeno.«. |
| 4 | Klikni »Prekliči«, osveži seznam in preveri uporabnika nina. | Uporabnikov je še vedno šest, Nina Dvojnik ni na seznamu, obstoječa Nina Vidmar z uporabniškim imenom nina ostane na seznamu z istim nivojem. |

Končni pričakovani rezultat in merilo uspeha: točno navedeno opozorilo zavrne podvojeno ime; po osvežitvi ni novega računa in se vidni podatki obstoječega računa ne spremenijo.

Stanje po izvedbi: seznam uporabnikov ostane nespremenjen. Čiščenje: skupni postopek.

## Evidenca izvedbe

Spodaj so dejanski rezultati zadnjega zaključenega zagona. Status vključuje tudi dodatno zahtevo brez napak v konzoli; pri TP-02 in TP-03 so funkcionalni koraki uspešni, test pa pade pri tem dodatnem preverjanju.

| ID | Status | Dejanski rezultat | Izvajalec | Datum izvedbe | Različica preizkušene aplikacije | Dokazila | ID napake |
|---|---|---|---|---|---|---|---|
| TP-01 | Uspešen | Ticket za naročilo 3001 je shranjen s podatki stranke, prioriteto Visoka, vrsto Kakovost in opisom tudi po osvežitvi. | Codex s Playwrightom | 19. 10. 2026, 10:25:45 | 6ac4b69, lokalne spremembe testov | [Posnetek](dokazila/TP-01.png) | Ni ugotovljene napake |
| TP-02 | Neuspešen | KRJ-15 preide na L2 brez prevzemnika; Eva prejme obvestilo s komentarjem in prek njega odpre pravi ticket. Funkcionalni koraki uspešni; dodatno preverjanje konzole pade zaradi NAP-01. | Codex s Playwrightom | 19. 10. 2026, 10:25:58 | 6ac4b69, lokalne spremembe testov | [Posnetek](dokazila/TP-02.png) | NAP-01 |
| TP-03 | Neuspešen | Zaključek brez potrditve je zavrnjen s predvidenim opozorilom; KRJ-3 ostane odprt in ga ni v Arhivu. Funkcionalni koraki uspešni; dodatno preverjanje konzole pade zaradi NAP-01. | Codex s Playwrightom | 19. 10. 2026, 10:26:20 | 6ac4b69, lokalne spremembe testov | [Posnetek](dokazila/TP-03.png) | NAP-01 |
| TP-04 | Uspešen | Odgovor je shranjen enkrat in ostane po osvežitvi; pogovor je v Čakamo, povezan je s KRJ-15 in lastnica ticketa ostane Nina. | Codex s Playwrightom | 19. 10. 2026, 10:26:32 | 6ac4b69, lokalne spremembe testov | [Posnetek](dokazila/TP-04.png) | Ni ugotovljene napake |
| TP-05 | Uspešen | Podvojeno ime nina je zavrnjeno; račun Nina Dvojnik ni ustvarjen in seznam ostane pri šestih uporabnikih. | Codex s Playwrightom | 19. 10. 2026, 10:26:48 | 6ac4b69, lokalne spremembe testov | [Posnetek](dokazila/TP-05.png) | Ni ugotovljene napake |
