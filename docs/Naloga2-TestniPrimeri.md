# 2. naloga – Oblikovanje testnih primerov

**Projekt:** HelpDesk – podpora strankam spletne trgovine z oblačili (izmišljena trgovina Kroj)
**Repozitorij:** https://github.com/lovro-cus/HelpdeskKopijaZaFaks
**Avtor:** Lovro Čuš
**Datum:** 25. 10. 2026 (prva oddaja 19. 10. 2026, popravljeno po povratni informaciji)

Vsebina:
1. Postopek
2. Končni ukaz za agenta (v3)
3. Testni primeri (ustvaril agent)
4. Matrika povezav zahtev, funkcionalnosti in testnih primerov
5. Izvedba testnih primerov
6. Komentar
7. Uporabljena orodja umetne inteligence
8. Priloga: prejšnja ukaza (v1, v2)

## 1. Postopek

1. **Ukaz v1:** dal sem ga agentu v novi seji. Agent je imel dostop do repozitorija, drugega konteksta ni dobil. Rezultat je bil površen.
2. **Ukaz v2:** zahteval je natančne atribute, podatke iz semena baze in imena iz vmesnika, ki jih je agent preveril v izvorni kodi. Primeri so bili natančni, a so preverjali tisto, kar je sprogramirano, ne tistega, kar zahteva dokumentacija.
3. **Povratna informacija profesorice:** testi morajo izhajati iz dokumentacije in preverjati, da se zahtevano res zgodi (predaja v drug nivo mora ticket dejansko prestaviti v drug nivo). Preverjati ne smejo samo tega, kar je zapisano v kodi.
4. **Ukaz v3:** edini vir resnice je dokumentacija (`docs/FUNKCIONALNOSTI.md`, `docs/VZPOSTAVITEV.md`), branje izvorne kode je prepovedano. Vsak pričakovani rezultat ima sklic na zahtevo in preverja dejanski učinek v vmesniku.
5. **Izvedba:** vseh pet primerov iz v3 sem ročno izvedel v lokalni aplikaciji (poglavje 5).

Testni primeri v poglavju 3 so taki, kot jih je vrnil agent. Nisem jih popravljal. Kaj bi spremenil sam, je zapisano v komentarju.

## 2. Končni ukaz za agenta (v3)

```text
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
```

## 3. Testni primeri (ustvaril agent)

Vir: samo `docs/FUNKCIONALNOSTI.md` (v nadaljevanju FUNK) in `docs/VZPOSTAVITEV.md` (VZP). V projektu nisem spremenil nobene datoteke.

**Skupni predpogoji za vse primere (SP)**
- SP-1: Projekt je nameščen po VZP »Lokalni zagon«. Datoteka `.env` je kopija `.env.example`, `DEMO_PASSWORD` ima privzeto vrednost `Kroj-Demo-2026`.
- SP-2: Pred vsakim primerom tester požene `npm run db:seed` (»POBRIŠE bazo in jo znova napolni«) in nato `npm run dev`. Aplikacija teče na `http://localhost:3000`.
- SP-3: Uporabniki `nina`, `ali`, `eva` in `marko` morajo po VZP ob prvi prijavi zamenjati geslo. Tester to opravi pred začetkom primera: prijavi se z `Kroj-Demo-2026` in nastavi novo geslo, ki si ga sam izbere in zapiše (npr. `Kroj-Test-2026!x`). Dokumentacija pravil za geslo ne navaja. `Admin` in `gost` zamenjave po dokumentaciji ne zahtevata.


### TP-01

| Atribut | Vrednost |
|---|---|
| ID | TP-01 |
| Naslov | Uporabnik 1. nivoja odpre nov ticket z enim artiklom |
| Testirana funkcionalnost | 1. Odpiranje ticketa |
| Vir zahteve | FUNK, tabela: »\| 1 \| Odpiranje ticketa \| vsi \| Tiketi → Nov ticket (bližnjica N) \|«; FUNK §1: »Ticket dobi ključ `KRJ-n` in se pokaže kot kvadrat v mreži.«; FUNK, Dodatno: »iskanje po naročilu, stranki, naslovu in trackingu« |
| Prioriteta | Visoka: to je vstopna točka vsega dela (»1. nivo odpre in preda«), brez nje ostali tokovi ne tečejo. |
| Vrsta | Pozitiven |
| Predpogoji | SP-1 do SP-3. Prijavljena je `nina` (1. nivo) z že zamenjanim geslom. Odprt je pogled Tiketi. |
| Testni podatki | Številka naročila: `990001`. Dokumentacija formata ne določa; v koraku 1 se preveri, da v semenu še ne obstaja. Stranka: `Testna Stranka`. Artikel: izdelek `majica`, barva `Črna`, velikost `L` (iz primera v FUNK §5), znesek `29,90`, rešitev `vračilo`. Vrsta težave: prva ponujena vrednost (seznam vrst se ureja v Nastavitvah, dokumentacija vrednosti ne našteva). |

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | V iskanje vpiši `990001`. | Ni zadetka, takega ticketa še ni. |
| 2 | V pogledu Tiketi klikni »Nov ticket«. | Odpre se obrazec za nov ticket s polji za številko naročila, stranko, artikle (izdelek, velikost, barva, znesek, rešitev) in vrsto težave. |
| 3 | Vpiši številko naročila in stranko iz testnih podatkov. | Vrednosti se prikažejo v poljih. |
| 4 | Dodaj artikel z izdelkom, barvo, velikostjo, zneskom in rešitvijo `vračilo`. | Artikel je na seznamu artiklov z vpisanimi vrednostmi. Rešitev omogoča izbiro med vračilo, menjava in brez ukrepa. |
| 5 | Izberi vrsto težave in shrani ticket. | Ticket je ustvarjen in dobi ključ v obliki `KRJ-n`. Tester si ključ zapiše. |
| 6 | Vrni se na pogled Tiketi. | V mreži je nov kvadrat z zapisanim ključem. |
| 7 | V iskanje vpiši `990001`. | Najden je natanko en ticket z zapisanim ključem. |
| 8 | Odpri ticket. | Prikazani so številka naročila `990001`, stranka `Testna Stranka`, artikel (majica, Črna, L, 29,90, vračilo) in izbrana vrsta težave. |

| Atribut | Vrednost |
|---|---|
| Končni pričakovani rezultat | Ticket res obstaja: ima ključ `KRJ-n`, je kvadrat v mreži, najde ga iskanje po naročilu, na njegovi strani pa so vsi vpisani podatki. Sporočilo o uspehu samo po sebi ne zadošča. |
| Stanje po izvedbi | V aplikaciji je en ticket več kot po semenu (seme jih ima 31). Ticket z naročilom `990001` je odprt in je ninin. |


### TP-02

| Atribut | Vrednost |
|---|---|
| ID | TP-02 |
| Naslov | Lastnik 1. nivoja preda ticket s komentarjem 2. nivoju |
| Testirana funkcionalnost | 2. Predaja ticketa višjemu nivoju |
| Vir zahteve | FUNK §2: »Lastnik ticket s komentarjem preda naslednjemu nivoju. Prejemnik dobi obvestilo v zvoncu.«; FUNK, uvod: »Delo teče po nivojih: 1. nivo odpre in preda, 2. ali 3. nivo zaključi.« |
| Prioriteta | Visoka: osrednji tok med nivoji. Napaka pomeni, da ticket obvisi pri 1. nivoju. |
| Vrsta | Pozitiven |
| Predpogoji | SP-1 do SP-3 za `nina` in `eva`. Seme ne pove, kateri ticket je ninin, zato `nina` pred začetkom odpre ticket po podatkih iz TP-01 (naročilo `990002`) in si zapiše njegov ključ. Prijavljena je `nina`. |
| Testni podatki | Ticket: naročilo `990002` (ključ zapisan v predpogojih). Komentar: `Stranka želi vračilo, prosim za obdelavo.` Prejemnik: 2. nivo, to je `eva`, edini uporabnik 2. nivoja po VZP. |

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | Kot `nina` odpri ticket `990002`. | Ticket je odprt. Viden je gumb »Predaj naprej«, ker je `nina` lastnica. |
| 2 | Klikni »Predaj naprej«. | Aplikacija zahteva komentar. Kot cilj je ponujen naslednji nivo (2. nivo). |
| 3 | Vpiši komentar in potrdi predajo. | Predaja je izvedena. V niti ticketa se pojavi dogodek predaje s komentarjem. |
| 4 | Kot `nina` preveri seznam svojih ticketov (npr. filter »moje«). | Ticketa `990002` ni več med nininimi. |
| 5 | Odjavi se in se prijavi kot `eva`. | Prijava uspe. |
| 6 | Odpri zvonec z obvestili. | Med obvestili je obvestilo o predaji ticketa `990002`. |
| 7 | Klikni obvestilo. | Odpre se ticket `990002`. Komentar iz koraka 3 je viden v niti, ticket je na 2. nivoju. |

| Atribut | Vrednost |
|---|---|
| Končni pričakovani rezultat | Ticket je na 2. nivoju: `eva` ga vidi kot svojega oziroma kot ticket svojega nivoja, v zvoncu ima obvestilo, komentar je v niti, `nina` pa ga nima več kot svojega. |
| Stanje po izvedbi | Ticket `990002` je odprt in dodeljen 2. nivoju (`eva`). V niti sta dogodek predaje in komentar. `eva` ima obvestilo v zvoncu. |


### TP-03

| Atribut | Vrednost |
|---|---|
| ID | TP-03 |
| Naslov | Uporabnik 1. nivoja ne more zaključiti ticketa |
| Testirana funkcionalnost | 3. Zaključevanje ticketa |
| Vir zahteve | FUNK, tabela: »\| 3 \| Zaključevanje ticketa \| nivo ≥ 2 \| stran ticketa → Zaključi \|«; FUNK §3: »Zaključi lahko samo nivo 2 ali več.«; »Zaključen ticket gre v Arhiv« |
| Prioriteta | Visoka: preverja pravice. Prezgodnje zaprtje 1. nivoja bi obšlo pregled višjega nivoja. |
| Vrsta | Negativen |
| Predpogoji | SP-1 do SP-3 za `nina`. `nina` pred začetkom odpre ticket po podatkih iz TP-01, a z naročilom `990003` in rešitvijo `brez ukrepa`, da zahteva po potrjenem vračilu paketa ne vpliva na rezultat. Prijavljena je `nina`. |
| Testni podatki | Ticket z naročilom `990003` (ključ zapisan v predpogojih), rešitev `brez ukrepa`. |

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | Kot `nina` odpri ticket `990003`. | Ticket je odprt. |
| 2 | Poišči dejanje »Zaključi« in ga poskusi izvesti. | Dejanje ni na voljo (gumba ni ali je onemogočen) ali pa je zavrnjeno. Natančnega besedila sporočila dokumentacija ne določa. |
| 3 | Osveži stran ticketa. | Ticket je še vedno odprt, v niti ni dogodka zaključka. |
| 4 | Odpri Arhiv. | Ticketa `990003` v Arhivu ni. |
| 5 | V pogledu Tiketi poišči `990003`. | Ticket je še vedno med odprtimi ticketi v mreži. |

| Atribut | Vrednost |
|---|---|
| Končni pričakovani rezultat | Uporabnik 1. nivoja ticketa ni zaključil: ticket ostane odprt, ni v Arhivu, v niti ni zaključka. |
| Stanje po izvedbi | Ticket `990003` je odprt in ninin, enak kot pred testom. |


### TP-04

| Atribut | Vrednost |
|---|---|
| ID | TP-04 |
| Naslov | Odgovor stranki s hitrim odgovorom iz Prejeto je viden tudi na strani ticketa |
| Testirana funkcionalnost | 4. Pregled pošte in odgovor stranki |
| Vir zahteve | FUNK §4: »Uporabnik prebere pogovor in odgovori s hitrim odgovorom (navodila za vračilo, vračilo ali menjava) ali lastnim besedilom. Na strani ticketa je ista pošta prikazana ob niti.«; VZP: »odgovor iz aplikacije se zapiše v pogovor, nikamor ne odide« |
| Prioriteta | Srednja: pogost tok dela podpore. V tej kopiji pošta ne odide, zato je napaka manj kritična kot pri ticketih. |
| Vrsta | Pozitiven |
| Predpogoji | SP-1 do SP-3 za `ali`. Prijavljen je `ali` (1. nivo, funkcionalnost je za »vsi«). Seme ima 33 pogovorov, a dokumentacija ne pove, kateri je povezan s ticketom. Tester zato v Prejeto (skupina »odprto«) izbere prvi pogovor, ki je povezan s ticketom, in si zapiše številko naročila. |
| Testni podatki | Pogovor: prvi pogovor v skupini »odprto«, povezan s ticketom (številka naročila zapisana). Hitri odgovor: `navodila za vračilo`. |

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | Odpri Prejeto. | Pogovori so razvrščeni v skupine odprto, moje, čakamo in brez ticketa. |
| 2 | V skupini »odprto« odpri izbrani pogovor. | Prikaže se celoten pogovor s stranko in povezava s ticketom (po številki naročila oziroma naslovu). |
| 3 | Izberi hitri odgovor »navodila za vračilo«. | Polje za odgovor se izpolni z besedilom predloge. |
| 4 | Pošlji odgovor. | Odgovor se kot zadnje sporočilo zapiše v pogovor. |
| 5 | Osveži Prejeto in znova odpri isti pogovor. | Odgovor je še vedno v pogovoru, torej je shranjen. |
| 6 | Prek povezave odpri ticket in na njegovi strani zavihek »Pošta«. | Ob niti je isti pogovor, vključno z odgovorom iz koraka 4. |

| Atribut | Vrednost |
|---|---|
| Končni pričakovani rezultat | Odgovor je trajno zapisan v pogovor in je enak v Prejeto in na strani povezanega ticketa (Pošta). |
| Stanje po izvedbi | Izbrani pogovor ima eno odhodno sporočilo več (navodila za vračilo), vidno v Prejeto in na strani ticketa. Ticket ostane odprt. |


### TP-05

| Atribut | Vrednost |
|---|---|
| ID | TP-05 |
| Naslov | Gost (admin samo za ogled) ne vidi sej in dnevnika dejavnosti in ne more ustvariti uporabnika |
| Testirana funkcionalnost | 8. Upravljanje uporabnikov |
| Vir zahteve | FUNK §8: »Vidi tudi aktivne seje in dnevnik dejavnosti (gost teh dveh ne vidi).«; VZP, tabela: »\| `gost` / `Gost-Kroj-2026` \| 3. nivo, admin samo za ogled (gesla ni mogoče zamenjati) \|«; FUNK §8: »Administrator ustvari račun …« |
| Prioriteta | Visoka: varnost in zasebnost. Račun gost je javno objavljen v VZP, zato mora biti res samo za ogled. |
| Vrsta | Negativen |
| Predpogoji | SP-1 in SP-2. Prijavljen je `gost` z geslom `Gost-Kroj-2026`. Zamenjava gesla ni potrebna, ker gesla ni mogoče zamenjati. |
| Testni podatki | Gost: `gost` / `Gost-Kroj-2026`. Novi račun, ki ga gost poskusi ustvariti: uporabniško ime `testgost`, 1. nivo. Administrator za kontrolo: `Admin` / `Kroj-Demo-2026`. |

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | Kot `gost` odpri Nadzorna plošča → Uporabniki. | Seznam uporabnikov je viden samo za ogled. |
| 2 | Poišči prikaz aktivnih sej in dnevnika dejavnosti. | Nobeden od obeh ni prikazan. |
| 3 | Poskusi ustvariti račun `testgost` (1. nivo). | Dejanje ni na voljo ali je zavrnjeno. Besedila sporočila dokumentacija ne določa. |
| 4 | Osveži seznam uporabnikov. | Uporabnika `testgost` ni. |
| 5 | Odjavi se in se prijavi kot `Admin`. | Prijava uspe. |
| 6 | Odpri Nadzorna plošča → Uporabniki. | Prikazani so aktivne seje in dnevnik dejavnosti (kontrola, da obstajata in ju gost res ni videl). Uporabnika `testgost` ni. |

| Atribut | Vrednost |
|---|---|
| Končni pričakovani rezultat | Gost ne vidi aktivnih sej in dnevnika dejavnosti in ne more ustvariti računa. To potrdi seznam uporabnikov, ki ga vidi administrator. |
| Stanje po izvedbi | Seznam uporabnikov je enak kot po semenu (Admin, nina, ali, eva, marko, gost). Novega računa ni. |


### Mesta, kjer je dokumentacija nejasna ali nepopolna za testiranje

1. **Testni podatki semena niso opisani.** Dokumentacija navaja samo število ticketov, paketov in pogovorov (31, 15, 33), ne pa katerih: kateri ticket je čigav, katere številke naročil obstajajo, kateri pogovori so povezani s ticketi. Zato si morajo TP-02 in TP-03 ticket ustvariti sami, TP-04 pa izbira pogovor med izvedbo.
2. **»ticket 1140«** (FUNK §5): ni jasno, ali je to številka naročila ali `KRJ-1140`. Seme ima samo 31 ticketov, kar kaže na naročilo.
3. **Odpiranje ticketa:** ni določeno, katera polja so obvezna, kakšna je oblika številke naročila, kaj se zgodi ob podvojeni številki naročila, kako se dodeli `n` v `KRJ-n` in kdo postane lastnik novega ticketa. Seznam »vrst težave« ni naveden.
4. **Predaja ticketa:** tabela pravi »Kdo: vsi«, besedilo pa »Lastnik … preda«. Ni jasno, ali sme predati tudi nekdo, ki ni lastnik. Ni določeno, ali se preda nivoju ali konkretnemu uporabniku, kdo postane lastnik ob več uporabnikih istega nivoja, kaj lahko naredi 3. nivo (višjega nivoja ni) in ali je komentar obvezen.
5. **»Zunanji vnos«:** ni opisano, kaj je vnos (komentar, slika, sprememba artikla) in kje je oznaka vidna.
6. **Zaključevanje:** ni našteto, katere vrste »zahtevajo vračilo«, niti kako je v aplikaciji vidno, da je paket »potrjeno nazaj«. Ni določeno, ali sme 2. nivo zaključiti tudi ticket, ki ni njegov.
7. **Samodejno ponovno odprtje:** če stranka po zaprtju znova piše, se ticket ponovno odpre. Nabiralnik je izmišljen in ni opisano, kako sprožiti novo dohodno sporočilo, zato zahteve ročno ni mogoče preveriti.
8. **Prejeto:** pomen skupin »moje« in »čakamo« ni opisan. Ni določeno, ali se pogovor po odgovoru premakne (npr. v »čakamo«). Ni opisano, kaj se zgodi, ko se številka naročila in naslov ne ujemata z istim ticketom.
9. **Gost »admin samo za ogled«:** ni jasno, katere admin strani gost vidi in ali so prepovedana dejanja skrita ali zavrnjena. Prav tako ni določeno, ali sme gost kot 3. nivo zaključevati in predajati tickete.
10. **Gesla:** pravila za novo geslo niso določena. Ni določeno, ali `npm run db:seed` ponastavi zahtevo za zamenjavo gesla ob prvi prijavi in ali jo ima tudi `Admin`.
11. **Pravice:** ni navedeno, kateri uporabniki v semenu imajo pravico »Zadovoljstvo« ali »Izdelki«. Pri F9 ni jasno, ali »administrator, pravica Izdelki« pomeni »ali« ali »in«. Ni opisano, kaj točno pomeni »področja urejanja«.
12. **Deaktivacija in ponastavitev gesla:** ni opisano, kaj se zgodi z aktivnimi sejami in ticketi deaktiviranega uporabnika, niti kako uporabnik dobi ponastavljeno geslo.
13. **Sporočila o napakah** in pragovi (npr. katera ocena je »nizka«, privzeta vrednost) niso določeni, zato negativni primeri lahko preverjajo le, da je dejanje zavrnjeno in da se stanje ne spremeni.
14. **Bližnjica N:** ni navedeno, kje deluje (na vseh straneh ali samo v pogledu Tiketi).

## 4. Matrika povezav zahtev, funkcionalnosti in testnih primerov

Zahteve so stavki iz `docs/FUNKCIONALNOSTI.md` (FUNK) in `docs/VZPOSTAVITEV.md` (VZP).
● – testni primer zahtevo neposredno preverja.
○ – testni primer se zahteve dotakne v predpogojih ali kontrolnem koraku.

| Funkcionalnost | Zahteva (vir) | TP-01 | TP-02 | TP-03 | TP-04 | TP-05 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| 1 Odpiranje ticketa | Ticket z naročilom, stranko, artikli in vrsto težave dobi ključ `KRJ-n` in se pokaže v mreži (FUNK §1) | ● | ○ | ○ | | |
| 2 Predaja višjemu nivoju | Lastnik ticket s komentarjem preda naslednjemu nivoju (FUNK §2) | | ● | | | |
| 2 Predaja višjemu nivoju | Prejemnik dobi obvestilo v zvoncu (FUNK §2) | | ● | | | |
| 3 Zaključevanje | Zaključi lahko samo nivo 2 ali več (FUNK §3, tabela) | | | ● | | |
| 3 Zaključevanje | Zaključen ticket gre v Arhiv (FUNK §3) | | | ○ | | |
| 4 Pošta in odgovor | Odgovor s hitrim odgovorom; na strani ticketa je ista pošta (FUNK §4) | | | | ● | |
| 4 Pošta in odgovor | Odgovor se zapiše v pogovor, nikamor ne odide (VZP) | | | | ● | |
| 8 Upravljanje uporabnikov | Administrator vidi seje in dnevnik dejavnosti, gost teh dveh ne vidi (FUNK §8) | | | | | ● |
| 8 Upravljanje uporabnikov | Gost je administrator samo za ogled (VZP) | | | | | ● |
| Dodatno: iskanje | Iskanje po naročilu (FUNK, Dodatno) | ● | | ○ | | |
| Računi | `nina`, `ali`, `eva`, `marko` ob prvi prijavi zamenjajo geslo (VZP) | ○ | ○ | ○ | ○ | |

Ti primeri ne pokrivajo funkcionalnosti 5 (rezervacija paketa iz zaloge), 6 (naročilo pri dobavitelju), 7 (zadovoljstvo strank), 9 (katalog izdelkov) in 10 (nastavitve).

## 5. Izvedba testnih primerov

Izvedeno 25. 10. 2026 v lokalni aplikaciji (`npm run dev`) na sveži bazi (`npm run db:seed`). Primeri so tekli zaporedno na isti bazi. Vsak je uporabljal svoje podatke (svoje naročilo, svoj pogovor), zato drug na drugega niso vplivali.

| Testni primer | Rezultat | Opažanje |
|---|---|---|
| TP-01 Odpiranje ticketa | **delno neuspešen** | Ticket je ustvarjen (`KRJ-157`), viden v mreži in najden z iskanjem `990001`. Naročilo, stranka, izdelek, znesek, rešitev in vrsta težave so shranjeni. **Barve in velikosti ni mogoče vnesti:** obrazec ponudi izbiro različice samo za izdelke iz kataloga, za vpisan izdelek »majica« ni polja. FUNK §1 pravi, da uporabnik vpiše »izdelek, velikost, barva«, in tega ne omejuje na katalog. Po ustvarjanju se odpre stran ticketa in ne mreža (korak 6 je zato potreboval vrnitev na Tiketi). |
| TP-02 Predaja višjemu nivoju | uspešen | Po predaji je ticket na 2. nivoju (»čaka, da ga nekdo s tega nivoja prevzame«), v niti sta dogodek predaje in komentar. Nina ga nima več v »Moja«. Eva ima v zvoncu obvestilo »#990002 · Nina Vidmar« s komentarjem, ticket je v njenem zavihku »Moj nivo«. Opažanje: kot cilj predaje so ponujeni tudi 1. nivo in posamezni uporabniki, FUNK pa govori o predaji »naslednjemu nivoju«. V niti piše »Nina Vidmar je predal« namesto »predala«. |
| TP-03 Zaključevanje (1. nivo) | uspešen | Nina na ticketu nima gumba »Zaključi«, namesto njega je besedilo »Zaključi lahko 2. nivo ali višji — ko končaš svoj del, predaj naprej.«. Po osvežitvi je ticket še »V delu«, ni ga v Arhivu, v niti ni zaključka. |
| TP-04 Odgovor stranki | uspešen | Hitri odgovor »Navodila za vračilo« izpolni polje, odgovor je po pošiljanju in po osvežitvi v pogovoru. Na strani ticketa `KRJ-1` je pod »Pošta« isti pogovor z odgovorom. Opažanja: stranka piše v nemščini, predloga je v slovenščini. Gumb se glasi »Pošlji kot Ana«, čeprav je prijavljen Ali. V niti ticketa piše »je stranki poslal/a pismo o nadomestku«, čeprav je šlo za navadna navodila za vračilo. |
| TP-05 Gost (samo ogled) | uspešen | Gost na Nadzorni plošči nima zavihkov Seje in Dejavnost, gumba »Dodaj uporabnika« ni, vsa polja (112) so onemogočena. Administrator vidi zavihka Seje in Dejavnost, uporabnika `testgost` ni. |

**Povzetek:** 4 uspešni, 1 delno neuspešen. Pri izvedbi so se pokazala tudi odstopanja, ki jih testi v v2 niso mogli najti, ker so imeli trenutno besedilo aplikacije zapisano kot pričakovano (»Pošlji kot Ana«, »pismo o nadomestku«, »je predal«).

## 6. Komentar

### Kaj sem moral popraviti v ukazu

**v1 → v2**
1. **Premalo atributov.** Manjkali so testirana funkcionalnost (brez nje ni matrike), prioriteta, vrsta, testni podatki in pričakovani odziv po korakih.
2. **Nedoločeni podatki.** Primeri so imeli korake, kot je »vpiši podatke stranke«, in odvisnosti, kot je »ticket iz TP-01«. Zahteval sem konkretne vrednosti in neodvisne primere.
3. **Dvoumen pričakovani rezultat.** Zapisano je bilo »gumba ni ali pa je dejanje zavrnjeno«. Zahteval sem en preverljiv izid.
4. **Mešani primeri.** En primer je preverjal pozitiven in negativen izid hkrati. Zahteval sem vsaj dva čista negativna primera.
5. **Nepregledna oblika.** Vseh pet primerov je bilo v eni široki tabeli.

**v2 → v3** (po povratni informaciji)

6. **Napačen vir resnice.** V v2 sem agentu naročil, naj imena gumbov, sporočila in podatke preveri v izvorni kodi. Zato je pričakovane rezultate prepisal iz trenutnega delovanja aplikacije, tudi kadar je to napačno. Takšen test vedno uspe in ne more najti napake. V v3 je vir resnice samo dokumentacija, branje kode pa je prepovedano.
7. **Preverjanje učinka namesto sporočila.** V v3 sem zahteval, da pričakovani rezultat preveri dejanski učinek zahteve v vmesniku. Pri predaji to pomeni, da je ticket pri drugem nivoju, prejemnik ima obvestilo in prejšnji lastnik ga nima več. Pojavitev sporočila o uspehu ne zadošča.
8. **Sledljivost do zahteve.** Dodal sem atribut »vir zahteve«, ki navede stavek iz dokumentacije. Matrika je zdaj prava sledljivost od zahteve do testa.
9. **Stanje po izvedbi skozi vmesnik.** V v2 je bilo zapisano z imeni tabel in stolpcev. V v3 je opisano tako, kot ga vidi tester.
10. **Nejasna dokumentacija.** Zahteval sem, da agent našteje, kje je dokumentacija pomanjkljiva. Našel je 14 mest, na primer da dokumentacija ne opiše testnih podatkov semena, ne določa obveznih polj in ne pove, ali predaja gre nivoju ali osebi.

### Kaj bi v testnih primerih spremenil sam

1. **TP-03 ima še vedno dvojen pričakovani odziv** (»gumba ni ali je onemogočen ali pa je dejanje zavrnjeno«). Vzrok ni v ukazu, ampak v dokumentaciji, ki tega ne določa. Najprej bi dopolnil dokumentacijo (»uporabnik 1. nivoja gumba Zaključi ne vidi«), nato test.
2. **TP-01 uporablja izdelek, ki ga ni v katalogu.** Ker dokumentacija kataloga ne našteje, je agent izbral »majica«. Dodal bi drugi primer z izdelkom iz kataloga, da se ločeno preveri vnos barve in velikosti. Ugotovitev iz izvedbe pa bi zapisal kot odstopanje od zahteve FUNK §1.
3. **TP-02 bi dodal korak, ki preveri, da Eva ticket lahko prevzame** (»Prevzemi nase«) in da ga nato vidi v »Moja«. Šele s tem je predaja zaključena. Dodal bi tudi negativni primer: 1. nivo ne sme predati ticketa nazaj na isti nivo, če dokumentacija predajo res omejuje na »naslednji nivo«.
4. **TP-04 ne preverja jezika odgovora.** FUNK §10 omenja »jezike pisem«. Dodal bi pričakovani rezultat, da je predloga v jeziku stranke, kar bi pokazalo odstopanje, ki sem ga opazil pri izvedbi.
5. **TP-04 izbira pogovor med izvedbo** (»prvi povezan pogovor«). Dokumentacija semena ne opisuje, zato bi v `VZPOSTAVITEV.md` dodal kratek seznam testnih podatkov (kateri ticket je čigav, kateri pogovor je povezan). Primeri bi bili tako ponovljivi.
6. **Predpogoji (zamenjava gesla, ustvarjanje ticketa)** so zahtevni za ročno izvedbo. Pri nadaljnjem testiranju bi jih avtomatiziral, na primer s pripravljenim stanjem baze.

## 7. Uporabljena orodja umetne inteligence

- **Claude Code** (Anthropic, model Claude Opus 5.5) kot programerski agent:
  - po ukazih v1, v2 in v3 je ustvaril testne primere; vsak ukaz je dobil v ločeni seji brez drugega konteksta,
  - pomagal mi je tudi pri pripravi ukazov, pri izvedbi primerov v brskalniku in pri oblikovanju tega dokumenta.

## 8. Priloga: prejšnja ukaza

### Ukaz v1

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

### Ukaz v2

```text
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
```

Rezultati vseh treh ukazov so v repozitoriju: `docs/naloga2/rezultat-v1.md`, `rezultat-v2.md`, `rezultat-v3.md`.
