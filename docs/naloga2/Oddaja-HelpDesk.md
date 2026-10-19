# Funkcionalno testiranje aplikacije HelpDesk

Dokument za drugo nalogo vsebuje končni ukaz za agenta, pet testnih primerov, matriko povezav, komentar pregleda in navedbo uporabljenih orodij. Projekt HelpDesk podpira obravnavo težav pri naročilih izmišljene trgovine Kroj. Pripravljeni so trije pozitivni in dva negativna testna primera.

Datum: 19. 10. 2026. Različica dokumenta: 3.0. Avtor testnih primerov in te priprave: agent Codex. Študent pred oddajo dopiše svoje ime in pregleda predlog komentarja.

## Postopek priprave in pregleda

V repozitoriju so že bili shranjeni ukaz-v1.md, rezultat-v1.md, ukaz-v2.md in rezultat-v2.md. V tej seji so bili pregledani kot zgodovinski vhod. V prvem rezultatu so nepopolni testni podatki, odvisnost TP-02 od TP-01 in dvoumen izid »gumba ni ali pa je dejanje zavrnjeno«. Drugi ukaz izboljša strukturo in zahteva konkretne vrednosti, v drugem rezultatu pa še manjkajo evidenca izvedbe, čiščenje in jasna ločitev pričakovanj od sumljivih napisov trenutne kode.

Končni ukaz v3 je specifikacija za pripravo novega rezultata s trenutnim agentom Codex. Ne predstavlja dodatnega zagona v izolirani seji ali uporabe drugega agenta. Agent je pripravil novo različico petih primerov in jo statično primerjal z dokumentacijo, semenom baze, strežniškimi akcijami ter besedili vmesnika. V prvi fazi so bili primeri označeni Ni izvedeno. Po nadaljnjem naročilu uporabnika je agent pripravil in izvedel avtomatizacijo Playwright; dejanski rezultati so v evidenci in zapisniku spodaj. Prvotni ukaz prepoveduje izvajanje, ker velja za fazo načrtovanja. Stare navedbe o prejšnjih ročnih izvedbah ostajajo neodvisno nepotrjene.

## Končni ukaz za agenta

```text
Si agent za načrtovanje funkcionalnega testiranja projekta HelpDesk v trenutnem repozitoriju. Pripravi natanko pet neodvisnih ročnih testnih primerov v slovenščini, tri pozitivne in dva negativna. Pokrij odpiranje ticketa, predajo z obvestilom, zavrnitev zaključka brez potrditve vračila, odgovor stranki in zavrnitev podvojenega uporabniškega imena.

Preberi docs/FUNKCIONALNOSTI.md, docs/VZPOSTAVITEV.md, prisma/seed.ts in ustrezne komponente, strežniške akcije ter slovenski slovar v src/lib/i18n/dictionaries.ts. Uporabljaj konkretne obstoječe demo račune in tickete. Nove vhodne podatke določi vnaprej. Imena kontrol in besedila napak preveri v kodi. Loči poslovna pričakovanja od sumljivih napisov trenutne implementacije; sumljive napise opiši v opombah, ne določi jih kot merilo pravilnosti.

Vsak primer naj vsebuje ID TP-01 do TP-05, naslov, cilj, povezano funkcionalnost z izvorno številko, avtorja agenta, različico in datum, prioriteto z utemeljitvijo, vrsto, okolje, predpogoje, konkretne testne podatke, oštevilčene korake s pričakovanim odzivom pri vsakem koraku, končni pričakovani rezultat, merilo uspeha, stanje po izvedbi in navodilo za čiščenje. Dodaj evidenco izvedbe s polji status, dejanski rezultat, izvajalec, datum izvedbe, različica preizkušene aplikacije, dokazila in ID napake. Neizvedene primere označi kot »Ni izvedeno«, druga polja evidence pa kot »Ni podatka«.

Skupno okolje: lokalna demo aplikacija na http://localhost:3000, slovenski vmesnik in slovenščina kot prednostni jezik brskalnika, ločena testna baza brez sočasnih uporabnikov ter privzeto DEMO_PASSWORD=Kroj-Demo-2026. Za vsak primer predvidi samostojno pripravo s svežim semenom in odjavo prejšnje seje. Uporabljaj bun install, bun run setup, bun run dev in bun run db:seed. Ukaz za seme briše podatke in sodi samo v ločeno testno bazo. Pripravo računov z obvezno menjavo gesla opiši kot predpogoj, tudi kadar potrebujemo dva računa. Primer ne sme potrebovati rezultata drugega primera. Tickete iz semena identificiraj po ključu in naročilu; novemu ticketu ne napovej fiksnega ključa.

Testna dejanja in preverjanje naj potekajo skozi uporabniški vmesnik. Spremembe baze lahko pojasniš, vendar ne zahtevaj SQL kot pogoja za uspeh. Negativna primera morata imeti točno sporočilo in preverjanje, da se zavrnjena sprememba ni shranila. Pošiljanje pošte v tej kopiji preverjaj v demo pogovoru; ne zahtevaj dostave v zunanji nabiralnik. Ne zanašaj se na kratkotrajne napise med nalaganjem.

Na koncu pripravi matriko funkcionalnost × testni primer z jasnimi oznakami neposrednega preverjanja, kratkimi opisi, virom in pojasnilom omejitev pokritosti. Dodaj kratek pregled izboljšav glede na shranjena ukaza in rezultata v1 ter v2 in predloge, kaj bi človek še spremenil. To je predlog komentarja za študentov pregled, ne dokaz njegovega osebnega dela.

Testov ne izvajaj, brskalnika ne uporabljaj, ne ponastavljaj baze in ne spreminjaj aplikacijske kode. Ne navajaj, da so primeri uspešno izvedeni, niti da je izpolnjena skladnost s standardom, ki ga nisi preveril. Navedi dejansko uporabljeno orodje in model. Zgodovinske navedbe o drugih agentih označi kot nepotrjene, če jih ne moreš neodvisno preveriti. Rezultat vrni kot Markdown s tabelami korakov.
```


## Funkcionalni testni primeri za HelpDesk

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


## Matrika povezav funkcionalnosti in testnih primerov

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


## Zapisnik funkcionalnega testiranja HelpDesk

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


## Kratek komentar pregleda

Predlog komentarja za študentov pregled: začetni ukaz je dopuščal nedoločene podatke, odvisne primere in več možnih pričakovanih izidov. V drugem ukazu so bili dodani konkretni podatki iz semena, neodvisnost, natančna imena kontrol, negativni primeri in pričakovani odzivi pri korakih. Končna dopolnitev v3 zahteva še cilj, okolje, avtorja, različico, merilo uspeha, čiščenje in ločeno evidenco dejanske izvedbe. Ukazi uporabljajo Bun. Obvezna menjava gesla je priprava, notranjih tabel baze pa ni treba neposredno pregledovati za uspeh testa.

Primeri so bili nato avtomatizirani in dejansko izvedeni; zapisnik ločuje uspešne funkcionalne korake od neuspešne dodatne kontrole konzole. Pri nadaljnjem testiranju bi dodal pravice gosta, uspešen zaključek ter artikle pri odpiranju ticketa. Za uporabniška imena bi ločeno določil pričakovano obravnavo velikih in malih črk. Sumljiva napisa »Pošlji kot Ana« in »pismo o nadomestku« bi obravnaval kot kandidata za prijavo napake in dogovor o pravilnem besedilu, ne kot poslovni zahtevi. Ti dodatni predlogi niso vključeni med pet oddanih primerov.

## Uporabljena generativna orodja

V tej seji je bil uporabljen Codex v okolju T3 Code, model gpt-6.1-sol: za pregled obstoječih ukazov in rezultatov, pripravo končnega ukaza v3, generiranje petih primerov, pregled s kodo, matriko, komentar, oblikovanje dokumentov ter pripravo in izvedbo avtomatiziranih testov. Dodatni podagenti niso bili uporabljeni. Bun in Playwright sta tehnični orodji, ne generativna umetna inteligenca.

Prejšnje poročilo docs/Naloga2-TestniPrimeri.md navaja Claude Code in model Claude Opus 5.5 za stare različice. To je navedba obstoječega dokumenta; uporaba tega orodja in točnega modela v tej seji ni bila potrjena. Študent naj jo pred oddajo potrdi iz lastne evidence, če želi poročati tudi o zgodovinskem delu.

## Viri

Notranji viri projekta: docs/FUNKCIONALNOSTI.md, docs/VZPOSTAVITEV.md, prisma/seed.ts, src/lib/actions/issues.ts, src/lib/actions/admin.ts, src/lib/actions/auth.ts, src/components/InboxWorkspace.tsx in src/lib/i18n/dictionaries.ts. Pregledani so bili tudi shranjeni ukazi ter rezultati v docs/naloga2. Dokument ne uveljavlja formalne skladnosti s standardom za testno dokumentacijo.

## Priloga začetni ukaz

Zgodovinski ukaz v1 je spodaj naveden dobesedno. Njegova pot je del izvirnega besedila; končni ukaz v3 uporablja trenutni repozitorij.

```text
Si tester programske opreme. V mapi C:\HelpdeskKopijaZaFaks je projekt HelpDesk – spletna aplikacija za podporo strankam spletne trgovine z oblačili (izmišljena trgovina Kroj). Opis funkcionalnosti je v docs/FUNKCIONALNOSTI.md, navodila za zagon in računi v docs/VZPOSTAVITEV.md.

Naloga: oblikuj 5 testnih primerov za funkcionalno testiranje aplikacije.

Vsak testni primer naj ima:
- ID
- naslov
- predpogoje
- korake
- pričakovani rezultat

Testni primeri naj pokrijejo različne funkcionalnosti aplikacije. Zapiši jih v slovenščini v obliki tabele Markdown. Datotek v projektu ne spreminjaj, rezultat samo vrni kot odgovor.
```
