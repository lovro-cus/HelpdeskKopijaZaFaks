# Testni primeri za ročno funkcionalno testiranje – HelpDesk (Kroj)

Vse vrednosti so preverjene v kodi. Na kopiji baze v začasni mapi sem pognal `prisma/seed.ts` in pregledal, kaj ustvari. V projektu nisem spremenil nobene datoteke.

**Skupni predpogoj za vse primere:** aplikacija teče lokalno (`npm run dev`, http://localhost:3000), v `.env` velja privzeto `DEMO_PASSWORD` (`Kroj-Demo-2026`, preverjeno), pred vsakim primerom se požene `npm run db:seed`, vmesnik je v slovenščini (seme vsem nastavi `locale: "sl"`).

---

## TP-01 – Odpiranje novega ticketa za novo naročilo

| Atribut | Vrednost |
|---|---|
| ID | TP-01 |
| Naslov | Administrator odpre ticket za naročilo #3001 z vrsto »Kakovost« |
| Testirana funkcionalnost | 1 – Odpiranje ticketa |
| Prioriteta | Visoka – brez odpiranja ticketov aplikacija ne opravlja svojega osnovnega namena. |
| Vrsta | Pozitiven |
| Predpogoji | Sveža baza. Naročilo #3001 ne obstaja (seme ima 31 ticketov, KRJ-1 … KRJ-31). Prijavljen je `Admin` (3. nivo, administrator, ob prijavi ne menja gesla). Odprta je stran **Tiketi** (`/orders`). |
| Testni podatki | Vrsta težave: `Kakovost`; Št. naročila: `3001`; Naslov: `Raztrgan šiv na rokavu`; E-mail: `nova.stranka@example.com`; Kaj je stranka sporočila: `Po prvem nošenju se je šiv na levem rokavu raztrgal.`; Prevzame: `Administrator · 3. nivo (jaz)` (privzeto); Prioriteta: `Visoka`; Ime stranke: `Nova Stranka` |

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | V glavi klikni gumb **Nov ticket** (ali pritisni tipko N). | Odpre se predal z naslovom »Nov ticket« in podnaslovom »Obvezna sta številka naročila in vrsta težave.«. Kazalec je v polju »Št. naročila«. |
| 2 | Pod »Vrsta težave« klikni gumb **Kakovost**. | Gumb »Kakovost« je označen kot izbran. Na izbiro so »Refund«, »Zamenjava«, »Preklic«, »Naslov«, »Tracking«, »Neodpremljeno«, »Kakovost« in »Drugo«. |
| 3 | V »Št. naročila« vpiši `3001`, v »Naslov« `Raztrgan šiv na rokavu`, v »E-mail« `nova.stranka@example.com`. | Vrednosti so vpisane, opozoril ni. |
| 4 | V »Kaj je stranka sporočila« vpiši besedilo iz testnih podatkov. | Besedilo je vpisano. |
| 5 | V spustnem seznamu »Prioriteta« izberi **Visoka**. Pri »Prevzame« pusti privzeto vrednost. | Izbrano je »Visoka«, pri »Prevzame« ostane »Administrator · 3. nivo (jaz)«. |
| 6 | Klikni **Podatki o stranki in pošiljki** in v »Ime stranke« vpiši `Nova Stranka`. | Razpre se razdelek s polji o stranki, ime je vpisano. |
| 7 | Klikni **Odpri naročilo**. | Gumb za trenutek pokaže »Odpiram…«. Pogovorno okno »Ustvarim brez podatkov stranke?« se ne prikaže, ker sta e-mail in ime vpisana. Aplikacija preusmeri na stran novega ticketa `/orders/KRJ-<n>`. |
| 8 | Preglej stran ticketa. | Naslov je »Raztrgan šiv na rokavu«. Lastnik je »Administrator« s pripisom »jaz« in podnapisom »3. nivo · trenutno obravnava«. Status je »V delu«, oznaka nivoja »L3«. V niti sta vnosa »Administrator je odprl naročilo.« in komentar z besedilom iz koraka 4. |

| Atribut | Vrednost |
|---|---|
| Končni pričakovani rezultat | Ustvarjen je ticket za naročilo #3001 s ključem oblike `KRJ-<n>`, statusom »V delu«, na 3. nivoju, z lastnikom Administrator. |
| Stanje po izvedbi | V tabeli `Issue` je nova vrstica: `orderNumber=3001`, `orderNumberKey=3001`, `type=quality`, `priority=high`, `status=open`, `level=3`, `assigneeId` in `reporterId` sta oba Admin, `title`, `customerEmail` in `customerName` so vpisani. V tabeli `Event` sta dva nova vnosa (`created` in `comment`). Obvestila ni, ker je prevzemnik avtor sam. |

---

## TP-02 – Predaja ticketa 2. nivoju z obvestilom prejemniku

| Atribut | Vrednost |
|---|---|
| ID | TP-02 |
| Naslov | Nina (1. nivo) preda ticket #2125 2. nivoju; Eva dobi obvestilo v zvoncu |
| Testirana funkcionalnost | 2 – Predaja ticketa višjemu nivoju |
| Prioriteta | Visoka – predaja je osrednji tok dela po nivojih. Če ne deluje, ticket obtiči na 1. nivoju, ki ga ne sme zaključiti. |
| Vrsta | Pozitiven |
| Predpogoji | Sveža baza. Ticket **KRJ-15** (naročilo #2125, »Stranka prosi za refund«, vrsta Refund, artikel Kroj Merino Long Sleeve Gray / S z rešitvijo »Vračilo«) ima status »V delu«, je na 1. nivoju, lastnica je Nina Vidmar. `nina` in `eva` imata `mustChangePw = true`. Nihče ni prijavljen. V tabeli `Notification` ni zapisov (preverjeno po semenu: 0). |
| Testni podatki | Prijava `nina` / `Kroj-Demo-2026`, novo geslo `Nina-Test-2026!`. Komentar predaje: `Stranka je poslala fotografije, prosim za odobritev refunda 59 EUR.` Prijava `eva` / `Kroj-Demo-2026`, novo geslo `Eva-Test-2026!` |

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | Na `/login` vpiši »Uporabniško ime« `nina` in »Geslo« `Kroj-Demo-2026`, klikni **Prijava**. | Aplikacija preusmeri na `/geslo` z naslovom »Zamenjaj geslo« in besedilom »Ob prvi prijavi je treba nastaviti lastno geslo.«. |
| 2 | Vpiši »Trenutno geslo« `Kroj-Demo-2026`, »Novo geslo« in »Ponovi novo geslo« `Nina-Test-2026!`, klikni **Shrani geslo**. | Vse zahteve za geslo so izpolnjene. Aplikacija preusmeri na `/orders`. |
| 3 | Odpri `http://localhost:3000/orders/KRJ-15` (ali klikni ploščico #2125). | Prikaže se ticket #2125. Lastnica je »Nina Vidmar · jaz«. Vidni so gumbi »Na čakanje« in »Predaj naprej«, gumba »Zaključi« ni. Pod vrstico je besedilo »Zaključi lahko 2. nivo ali višji — ko končaš svoj del, predaj naprej.«. |
| 4 | Klikni **Predaj naprej**. | Odpre se plošča s poljem »Predaj komu«. Privzeto je izbrano »2. nivo — obvesti vse«. Pod poljem je namig »Pri predaji nivoju naročilo ostane nedodeljeno, dokler ga nekdo s tega nivoja ne prevzame.«. |
| 5 | V polje »Kaj si naredil in kaj mora narediti naslednji…« vpiši komentar iz testnih podatkov in klikni gumb **Predaj naprej** v plošči. | Gumb za trenutek pokaže »Predajam…«, nato se plošča zapre. Glava pokaže »2. nivo« s podnapisom »čaka, da ga nekdo s tega nivoja prevzame«, oznako »L2«, status »V delu« in gumb »Prevzemi nase«. V niti je nov vnos »Nina Vidmar je predal → L2«, pod njim je vpisani komentar. |
| 6 | Odpri uporabniški meni, klikni **Odjava**, nato se prijavi kot `eva` / `Kroj-Demo-2026` in zamenjaj geslo v `Eva-Test-2026!` (kot v korakih 1–2). | Po zamenjavi gesla se odpre `/orders`. Na ikoni zvonca je rdeča številka »1«. |
| 7 | Klikni ikono zvonca (Obvestila). | Odpre se seznam »Obvestila« z enim vnosom »#2125 · Nina Vidmar« in predogledom »Stranka je poslala fotografije, prosim za odobritev refunda 59 EUR.«. |
| 8 | Klikni ta vnos. | Odpre se ticket `/orders/KRJ-15`. |

| Atribut | Vrednost |
|---|---|
| Končni pričakovani rezultat | Ticket #2125 je na 2. nivoju brez lastnika, status je »V delu«. Eva ima v zvoncu obvestilo »#2125 · Nina Vidmar« s komentarjem predaje. |
| Stanje po izvedbi | `Issue` KRJ-15: `assigneeId=null`, `level=2`, `status=open`. V `Event` je nov vnos `kind=assign`, `fromValue="Nina Vidmar"`, `toValue="L2"`, `body` je komentar, `outsider=false`. V `Notification` je en zapis za Evo (`kind=handoff`, `actorName="Nina Vidmar"`). `User` nina in eva: novi `passwordHash`, `mustChangePw=false`. V `Session` so nove seje. |

---

## TP-03 – Zaključevanje refunda brez potrditve vračila

| Atribut | Vrednost |
|---|---|
| ID | TP-03 |
| Naslov | Eva (2. nivo) poskusi zaključiti refund #1690, ne da bi potrdila, da je vračilo prispelo |
| Testirana funkcionalnost | 3 – Zaključevanje ticketa |
| Prioriteta | Visoka – varovalka preprečuje refund ali zaprtje primera, preden je paket nazaj, kar bi pomenilo neposredno finančno izgubo. |
| Vrsta | Negativen |
| Predpogoji | Sveža baza. Ticket **KRJ-3** (naročilo #1690, »Vračilo prejeto — stranka čaka refund«, vrsta Refund, artikel Kroj Rain Jacket Yellow / M z rešitvijo »Vračilo«) ima status »V delu«, je na 2. nivoju, lastnica je Eva Kranjc. Nihče ni prijavljen, `eva` ima `mustChangePw = true`. |
| Testni podatki | Prijava `eva` / `Kroj-Demo-2026`, novo geslo `Eva-Test-2026!`. Opomba ob zaključku: `Refund 119 EUR izveden.` Potrditveno polje ostane **neoznačeno**. |

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | Prijavi se kot `eva` / `Kroj-Demo-2026` in na `/geslo` nastavi novo geslo `Eva-Test-2026!` (»Shrani geslo«). | Aplikacija preusmeri na `/orders`. |
| 2 | Odpri `http://localhost:3000/orders/KRJ-3`. | Prikaže se ticket #1690. Lastnica je »Eva Kranjc · jaz«, status »V delu«, oznaka »L2«. Vidni so gumbi »Na čakanje«, »Predaj naprej« in »Zaključi«. |
| 3 | Klikni **Zaključi**. | Odpre se plošča z neoznačenim potrditvenim poljem »Potrjujem, da je vračilo prispelo oz. da vračilo ni bilo potrebno.« in pripisom »Nazaj pride: Kroj Rain Jacket Yellow / M«. Pod tem so polje »Kako je bilo rešeno (znesek refunda, tracking zamenjave…)«, »Dokazilo« ter gumba »Prekliči« in »Zaključi in arhiviraj«. |
| 4 | Potrditvenega polja ne označi. V polje za opis rešitve vpiši `Refund 119 EUR izveden.` | Besedilo je vpisano, polje ostane neoznačeno. |
| 5 | Klikni **Zaključi in arhiviraj**. | Gumb za trenutek pokaže »Zaključujem…«. Plošča ostane odprta in v njej se pokaže napaka **»Potrdi, da je vračilo prispelo oz. da vračilo ni potrebno.«** |
| 6 | Osveži stran (F5). | Status je še vedno »V delu«, oznaka »L2«. V niti ni vnosa o zaključku. |

| Atribut | Vrednost |
|---|---|
| Končni pričakovani rezultat | Aplikacija zavrne zaključek s sporočilom »Potrdi, da je vračilo prispelo oz. da vračilo ni potrebno.«. Ticket #1690 ostane odprt (»V delu«) in ne gre v Arhiv. |
| Stanje po izvedbi | `Issue` KRJ-3 je nespremenjen (`status=open`, `closedAt=null`, `archivedAt=null`). V `Event` ni novega vnosa. Spremenita se le `User` eva (novo geslo, `mustChangePw=false`) in `Session`. |

---

## TP-04 – Odgovor stranki iz zavihka Prejeto

| Atribut | Vrednost |
|---|---|
| ID | TP-04 |
| Naslov | Administrator v Prejetem odgovori stranki Lari Vzorčni na pogovor o naročilu #2125 |
| Testirana funkcionalnost | 4 – Pregled pošte in odgovor stranki |
| Prioriteta | Visoka – komunikacija s stranko je glavni vhod in izhod podpore. Napaka pomeni neodgovorjene stranke. |
| Vrsta | Pozitiven |
| Predpogoji | Sveža baza. V Prejetem je v pogledu »Odprto« pogovor »Vračilo — naročilo #2125« s stranko Lara Vzorčni (`lara.vzorcni@example.com`). Pogovor je povezan s ticketom KRJ-15, ima 3 sporočila (zadnje je od stranke), nima dodeljenega uporabnika in ima status `open`. Prijavljen je `Admin`. |
| Testni podatki | Besedilo odgovora: `Pozdravljeni, paket smo prejeli. Refund 59 EUR bo izveden v 3 delovnih dneh. Lep pozdrav, Kroj` |

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | V glavi klikni **Prejeto**. | Odpre se stran »Prejeto« z izbranim pogledom »Odprto«. Na voljo so pogledi »Odprto«, »Moje«, »Nedodeljeno«, »Čakamo«, »Brez ticketa«, »Zaključeno«, »Vse«. |
| 2 | Na seznamu klikni pogovor **Lara Vzorčni** z zadevo »Vračilo — naročilo #2125«. | V sredini se pokaže glava »Vračilo — naročilo #2125« s podnapisom »Lara Vzorčni · #2125« in tri sporočila. Desno je »#2125« s povezavo »Odpri ticket«. Pod sporočili sta »Hitri odgovori« (»Navodila za vračilo«, »Vračilo + refund/menjava«) in gumb »Pošlji kot Ana«. |
| 3 | Klikni v polje za odgovor, izbriši predizpolnjeno besedilo (Ctrl+A, Delete) in vpiši besedilo iz testnih podatkov. | V polju je samo vpisano besedilo. |
| 4 | Klikni **Pošlji kot Ana**. | Stran se osveži in nad urejevalnikom se pokaže zeleno sporočilo **»Odgovor je bil poslan iz podpora@kroj.example.«**. Odgovor je zadnji (desno poravnan) v pogovoru. |
| 5 | Klikni pogled **Čakamo**. | Pogovor Lara Vzorčni je na seznamu. Predogled se začne z »↗ Pozdravljeni, paket smo prejeli…«, dodeljen je »Administrator«. V pogledu »Odprto« ga ni več. |
| 6 | Desno klikni **Odpri ticket**. | Odpre se KRJ-15. V niti je vnos »Administrator je stranki poslal/a pismo o nadomestku lara.vzorcni@example.com · Re: Vračilo — naročilo #2125«. Lastnica ticketa je še vedno Nina Vidmar. |

| Atribut | Vrednost |
|---|---|
| Končni pričakovani rezultat | Odgovor je zapisan v pogovor, pogovor preide v pogled »Čakamo«, aplikacija pokaže »Odgovor je bil poslan iz podpora@kroj.example.«. |
| Stanje po izvedbi | `DemoMail`: nova vrstica `direction=outgoing`, z istim `threadId` kot pogovor, `subject="Re: Vračilo — naročilo #2125"`. `CustomerEmailDraft`: nov zapis `status=sent`. `InboxConversation`: `status=waiting`, `lastDirection=outgoing`, `assigneeId=Admin`. `InboxSeen`: zapis za Admina. `Event`: nov vnos na KRJ-15, `kind=system`, `field=customer_email`, `toValue=sent`. `Issue` KRJ-15: `assigneeId` ostane Nina. |

---

## TP-05 – Ustvarjanje uporabnika z že zasedenim uporabniškim imenom

| Atribut | Vrednost |
|---|---|
| ID | TP-05 |
| Naslov | Administrator poskusi ustvariti novega uporabnika z uporabniškim imenom `nina` |
| Testirana funkcionalnost | 8 – Upravljanje uporabnikov |
| Prioriteta | Srednja – ne blokira dnevnega dela. Podvojen račun pa bi zrušil prijavo in sledljivost (kdo je kaj naredil), zato je preverjanje pomembno za pravice. |
| Vrsta | Negativen |
| Predpogoji | Sveža baza s 6 uporabniki (Admin, gost, nina, ali, eva, marko), vsi aktivni. Uporabnik `nina` obstaja. Prijavljen je `Admin`. |
| Testni podatki | Ime in priimek: `Nina Dvojnik`; E-mail: prazno; Jezik: `Slovenščina`; Uporabniško ime: `nina`; Nivo: `1. nivo`; Administrator: neoznačeno; Začetno geslo: `Zacetno-Geslo-1` |

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | V glavi klikni **Nadzorna plošča**. | Odpre se `/admin` z izbranim zavihkom »Uporabniki«. Napis kaže »6 aktivnih · 6 skupaj«, vidni so gumb »Dodaj uporabnika« in zavihki »Seje« ter »Dejavnost«. |
| 2 | Klikni **Dodaj uporabnika**. | Odpre se predal »Nov uporabnik« s podnapisom »Geslo določiš ti; uporabnik si ga ob prvi prijavi zamenja.«. |
| 3 | Vpiši »Ime in priimek« `Nina Dvojnik`, pri »Jezik« izberi `Slovenščina`, v »Uporabniško ime« vpiši `nina`, pri »Nivo« pusti »1. nivo«. | Vrednosti so vpisane. Pod uporabniškim imenom je namig »Črke, številke in . _ -«. |
| 4 | V »Začetno geslo« vpiši `Zacetno-Geslo-1`. | Vseh pet zahtev za geslo je izpolnjenih (vsaj 8 znakov, velika in mala črka, številka, poseben znak). |
| 5 | Klikni **Ustvari**. | Gumb za trenutek pokaže »Ustvarjam…«. Predal ostane odprt in v njem se pokaže napaka **»To uporabniško ime je že zasedeno.«** |
| 6 | Klikni **Prekliči** in preglej seznam uporabnikov. | Napis še vedno kaže »6 aktivnih · 6 skupaj«, uporabnika »Nina Dvojnik« ni. |

| Atribut | Vrednost |
|---|---|
| Končni pričakovani rezultat | Aplikacija zavrne ustvarjanje s sporočilom »To uporabniško ime je že zasedeno.«. Število uporabnikov ostane 6. |
| Stanje po izvedbi | Tabela `User` je nespremenjena (6 vrstic). Obstoječi `nina` ima nespremenjene `name`, `passwordHash`, `level` in `mustChangePw`. |

---

## Predpostavke in ugotovitve, ki jih v kodi nisem mogel v celoti preveriti

1. **Številka ključa novega ticketa (TP-01) ni stalna.** Ključ se tvori kot `KRJ-<id>` (`src/lib/actions/issues.ts`). Prisma na SQLite uporablja `AUTOINCREMENT`, `db:seed` pa števca ne ponastavi. Ključ je `KRJ-32` samo po prvem `npm run setup` na prazni bazi, po vsakem ponovnem `db:seed` je višji. Zato je v TP-01 pričakovan samo ključ oblike `KRJ-<n>`.
2. **Postavitev in uvrstitev pogovorov v Prejetem (TP-04)** sem preveril na kopiji baze, ki sem jo napolnil s semenom. Časi sporočil so relativni glede na trenutek semena, zato se lahko vrstni red na seznamu razlikuje. Pogovor je treba iskati po imenu »Lara Vzorčni«.
3. **Napis »Pošlji kot Ana« je fiksno zapisan** v `InboxWorkspace.tsx` in se ne spreminja glede na prijavljenega uporabnika. Uporabnika Ana v semenu ni. Najverjetneje je to napaka v besedilu vmesnika, ki je ostala iz izvornega sistema.
4. **Vnos v niti po odgovoru iz Prejetega** se glasi »je stranki poslal/a pismo o nadomestku«, tudi pri navadnem odgovoru, ki z nadomestkom nima zveze (`thread.customerEmail.sent`). Verjetno je to napaka v besedilu.
5. **Predizpolnjeno besedilo odgovora (TP-04)** pride iz `/api/inbox/[id]` in ga nisem preverjal dobesedno. Zato korak zahteva, da se izbriše.
6. **Brez dodajanja artiklov (TP-01).** Urejevalnik artiklov (`ItemsEditor.tsx`) dela s katalogom, zato sem ga izpustil. Odpiranje z artikli bi bilo vredno pokriti z dodatnim primerom.
7. **Napake se prikažejo v elementu `Notice`.** Natančnega mesta in barve na zaslonu nisem preverjal v brskalniku, samo besedilo in komponento.
8. **Neznan uporabnik ob prijavi dobi sporočilo v angleščini** (»Invalid username or password.«), ker `login()` takrat uporabi jezik `en`. Napačno geslo za obstoječega uporabnika vrne slovensko »Napačno uporabniško ime ali geslo.«. Tega ni v nobenem primeru, je pa kandidat za dodaten negativni primer.
9. **Edinstvenost uporabniškega imena** se preverja z `findUnique` na SQLite, kar je občutljivo na velike in male črke. `Nina` bi se verjetno ustvaril kljub obstoječemu `nina`. Tega v vmesniku nisem preveril.
10. **Začetno stanje obvestil (TP-02):** na moji kopiji je bila tabela `Notification` po semenu prazna. Predpostavljam, da v času izvajanja testa nobeno ozadno opravilo ne ustvari novih obvestil.
