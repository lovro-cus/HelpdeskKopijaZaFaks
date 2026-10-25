# Testni primeri za HelpDesk (Kroj), ročno funkcionalno testiranje po metodi črne skrinjice

Vir: samo `docs/FUNKCIONALNOSTI.md` (v nadaljevanju FUNK) in `docs/VZPOSTAVITEV.md` (VZP). V projektu nisem spremenil nobene datoteke.

**Skupni predpogoji za vse primere (SP)**
- SP-1: Projekt je nameščen po VZP »Lokalni zagon«. Datoteka `.env` je kopija `.env.example`, `DEMO_PASSWORD` ima privzeto vrednost `Kroj-Demo-2026`.
- SP-2: Pred vsakim primerom tester požene `npm run db:seed` (»POBRIŠE bazo in jo znova napolni«) in nato `npm run dev`. Aplikacija teče na `http://localhost:3000`.
- SP-3: Uporabniki `nina`, `ali`, `eva` in `marko` morajo po VZP ob prvi prijavi zamenjati geslo. Tester to opravi pred začetkom primera: prijavi se z `Kroj-Demo-2026` in nastavi novo geslo, ki si ga sam izbere in zapiše (npr. `Kroj-Test-2026!x`). Dokumentacija pravil za geslo ne navaja. `Admin` in `gost` zamenjave po dokumentaciji ne zahtevata.

---

## TP-01

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

---

## TP-02

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

---

## TP-03

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

---

## TP-04

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

---

## TP-05

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

---

## Mesta, kjer je dokumentacija nejasna ali nepopolna za testiranje

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
