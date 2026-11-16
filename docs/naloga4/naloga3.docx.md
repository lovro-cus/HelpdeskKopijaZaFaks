# eNormativi – testni primeri za funkcionalno testiranje

Oct 18, 2026 · @Vuk

## 1. Uvod

Pet testnih primerov pokriva pet poslovno najpomembnejših funkcionalnosti aplikacije eNormativi: prijavo, iskanje po šifri, izvoz v Excel, kvoto AI iskanj in dostop do plačljive zbirke 2008. Primere je ustvaril AI agent v dveh iteracijah ukaza; v dokumentu je končni ukaz (v2).

- **Aplikacija:** eNormativi (OCR norms), spletna aplikacija za iskanje, pregled in izvoz digitaliziranih gradbenih normativov. Produkcija: [app.enormativi.com](https://app.enormativi.com).
- **Tehnologije:** Flask, MongoDB, Meilisearch, Google Gemini (AI iskanje).
- **Vir zahtev:** interna specifikacija funkcionalnosti F1–F17 (docs/02-funkcionalnosti.md), ki ima vlogo SZPO.
- **Vrsta testiranja:** ročno funkcionalno testiranje po metodi črne škatle, v produkciji z namenskimi testnimi računi (test_*), ker ločenega testnega okolja ni.
- **Sestava:** 2 pozitivna primera (TC-02, TC-03), 3 negativni (TC-01, TC-04, TC-05); TC-04 uporablja mejne vrednosti.

## 2. Končni ukaz za agenta (v2)

Ukaz je bil podan agentu Claude Code (podagent tipa general-purpose), ki je imel bralni dostop do kode in baze aplikacije.

VLOGA\
Si izkušen tester programske opreme (ISTQB). Pripravljaš testno dokumentacijo za ročno funkcionalno testiranje (črna škatla) spletne aplikacije eNormativi.\

KONTEKST\
\- eNormativi je spletna aplikacija (Flask + MongoDB + Meilisearch + Gemini), v kateri gradbeni inženirji iščejo, pregledujejo in izvažajo digitalizirane gradbene normative.\
\- Specifikacija funkcionalnosti (F1–F17) je v /home/docker/tick/ocr-norms/docs/02-funkcionalnosti.md. To je tvoj glavni vir zahtev; ID-je funkcionalnosti uporabljaj točno tako, kot so tam.\
\- Koda je v /home/docker/tick/ocr-norms/app.py in /home/docker/tick/ocr-norms/templates/. Uporabi jo samo za preverjanje točnih besedil sporočil, imen gumbov, imen datotek in vedenja. Uporabniški vmesnik je v hrvaščini/srbščini, zato besedila iz vmesnika navajaj dobesedno v izvirnem jeziku.\
\- Testiranje poteka v produkcijskem okolju https://app.enormativi.com z namenskimi testnimi računi. Ločenega testnega okolja ni.\

NALOGA\
Ustvari natanko 5 testnih primerov za funkcionalno testiranje. Izberi poslovno najpomembnejše funkcionalnosti, vsak primer naj pokriva drugo glavno funkcionalnost. Med petimi primeri morajo biti vsaj 2 pozitivna in vsaj 2 negativna, vsaj en primer pa mora uporabiti tehniko mejnih vrednosti.\

PRAVILA ZA TESTNE PRIMERE\
1\. En testni primer = en cilj. Ne združuj več neodvisnih preverjanj v en primer. Največ 8 korakov.\
2\. Vsak korak je eno dejanje, ki ga tester izvede v brskalniku prek uporabniškega vmesnika (klik, vnos, odpiranje URL-ja). Ne uporabljaj API klicev, curl ali neposrednega dostopa do baze kot korakov. Testni primer mora izvesti tester, ki kode ne pozna.\
3\. Vsak korak ima svoj merljiv pričakovani rezultat (točno besedilo sporočila, število, ime datoteke …). Izogibaj se nejasnim izrazom, kot so »ustrezno«, »pravilno«, »deluje«.\
4\. Testni podatki morajo biti konkretni in obstoječi. Preveri jih v bazi samo z bralnimi poizvedbami, npr.:\
docker exec norme-mongodb mongosh --quiet norme --eval 'db.norms_2008.findOne({...},{title:1,norm_code:1,book:1,page_number:1})'\
Dovoljene so samo find, findOne, countDocuments in aggregate brez \$out/$merge. Ne piši v bazo, ne spreminjaj datotek, ne ustavljaj in ne zaganjaj vsebnikov.\
5\. Primeri ne smejo zahtevati ustavljanja storitev ali drugih posegov, ki bi motili prave uporabnike v produkciji. Vsaka sprememba (testni uporabnik, kvota, delovni prostor) mora biti narejena prek administracije in v postpogojih razveljavljena.\
6\. Testni računi naj imajo predpono test_ (npr. test_viewer). Gesla ne navajaj, napiši »geslo iz testnega trezorja«.\

PREDLOGA (uporabi jo za vsak primer, vsa polja so obvezna)\
\- ID (TC-01 …), Naslov, Cilj (en stavek)\
\- Sledljivost: ID funkcionalnosti iz specifikacije\
\- Vrsta: pozitivni / negativni; Tehnika načrtovanja: npr. ekvivalenčni razredi, mejne vrednosti, prehodi stanj, primeri uporabe\
\- Prioriteta (visoka/srednja/nizka) z enim stavkom utemeljitve\
\- Okolje: URL, brskalnik, vloga uporabnika\
\- Predpogoji\
\- Testni podatki (konkretne vrednosti)\
\- Koraki: tabela | # | Dejanje | Pričakovani rezultat |\
\- Merilo uspešnosti (kdaj je test uspešen)\
\- Postpogoji / čiščenje\
\- Ocena trajanja izvedbe (min)\
\- Pripravil, Datum priprave, Dejanski rezultat, Status (Ni izvedeno / Uspešno / Neuspešno), Opombe — zadnja tri pusti prazna za testerja.\

OBLIKA ODDAJE (slovenščina, Markdown)\
1\. Kratek uvod (2–3 stavki): katere funkcionalnosti si izbral in zakaj.\
2\. Pet testnih primerov po predlogi.\
3\. Matrika sledljivosti: vrstice so funkcionalnosti, ki jih primeri preverjajo (ID + kratek opis), stolpci so TC-01 … TC-05, v celicah X za glavno pokritost in (x) za delno. Pod matriko seznam pomembnih funkcionalnosti, ki jih ti primeri NE pokrivajo.\
4\. Ločen razdelek »Sumi napak, odkriti med pripravo«: če med branjem kode opaziš neskladje s specifikacijo, ga zapiši tukaj (z vrstico v app.py), ne v testni primer.\

Pred oddajo preveri vsak primer po pravilih 1–6 in ga popravi, če jih krši.

## 3. Testni primeri (izhod agenta)

Primeri so navedeni tako, kot jih je ustvaril agent po ukazu v2, brez mojih popravkov. Moje pripombe so v razdelku 5.

### Skupna priprava testnih računov

Pripravo opravi skrbnik prek administracije (Admin panel), prijavljen kot test_admin. Dne 18. 10. 2026 v bazi ni bilo nobenega uporabnika s predpono test_ in nobenega delovnega prostora test_ws_*.

- **S1:** zavihek »Radni prostori« → »Novi«. Vnesi Naziv test_ws_2008, »Podrazumijevani limit zahtjeva / mj.« 100, označi »Norme 2008«, za »Podrazumevana kolekcija« izberi »Norme 2008« in klikni »Kreiraj«.
- **S2:** zavihek »Korisnici« → »Novi korisnik«. Vnesi Korisničko ime test_viewer, Uloga »Viewer«, Lozinka iz testnega trezorja, Radni prostor test_ws_2008, »Vlastiti limit/mj.« pusti prazno in klikni »Kreiraj«.
- **Skupno čiščenje:** v zavihku »Korisnici« pri test_viewer klikni »Obriši« → »Obriši«; nato v zavihku »Radni prostori« pri test_ws_2008 klikni »Obriši« → »Obriši«.
- Vnosov v dnevniku aktivnosti in števcev porabe prek administracije ni mogoče izbrisati. Ostanejo kot sled testnih računov.

### TC-01: Prijava z napačnim geslom ne odpre seje

| Polje | Vrednost |
| --- | --- |
| ID | TC-01 |
| Naslov | Zavrnjena prijava obstoječega uporabnika z napačnim geslom |
| Cilj | Preveriti, da prijava z napačnim geslom prikaže sporočilo o napaki in uporabniku ne odpre seje. |
| Sledljivost | F1 |
| Vrsta | negativni |
| Tehnika načrtovanja | ekvivalenčni razredi (neveljavni razred: obstoječe uporabniško ime + napačno geslo) |
| Prioriteta | visoka. Prijava je edina zaščita plačljive vsebine; napaka bi vsebino odprla vsem. |
| Okolje | https://app.enormativi.com, Google Chrome (zadnja stabilna različica, namizni računalnik), neprijavljen uporabnik |
| Predpogoji | Račun test_viewer obstaja in ima v administraciji status »Aktivan« (S2). Brskalnik je v načinu Incognito, zato ni obstoječe seje. |
| Testni podatki | Korisničko ime: test_viewer; Lozinka: Napacna-Lozinka-01 (namerno napačna); URL zaščitene strani: https://app.enormativi.com/ |

| # | Dejanje | Pričakovani rezultat |
| --- | --- | --- |
| 1 | Odpri URL https://app.enormativi.com/login. | Naslov zavihka je »Prijava — Norme«. Vidni so naslov »Norme«, polji »Korisničko ime« in »Lozinka«, gumb »Prijava« in povezava »Zaboravili ste lozinku?«. Sporočila o napaki ni. |
| 2 | V polje »Korisničko ime« vnesi test_viewer. | Polje vsebuje besedilo test_viewer. |
| 3 | V polje »Lozinka« vnesi Napacna-Lozinka-01. | Polje prikazuje 18 zakritih znakov (pike). |
| 4 | Klikni gumb »Prijava«. | Nad obrazcem se prikaže rdeče sporočilo »Pogrešno korisničko ime ili lozinka.«. URL ostane https://app.enormativi.com/login. Polji sta prazni. Uporabniški meni z imenom test_viewer ni prikazan. |
| 5 | Odpri URL https://app.enormativi.com/. | Brskalnik preusmeri na URL, ki se začne z https://app.enormativi.com/login?next=. Prikazan je prijavni obrazec brez sporočila o napaki. Seznam normativov ni prikazan. |

| Polje | Vrednost |
| --- | --- |
| Merilo uspešnosti | Vsi pričakovani rezultati 1–5 se ujemajo. V koraku 4 je prikazano točno sporočilo »Pogrešno korisničko ime ili lozinka.«. V koraku 5 neprijavljen uporabnik ne dobi dostopa do seznama. |
| Postpogoji / čiščenje | Ni sprememb podatkov. Zapri okno Incognito. Račun test_viewer ostane za TC-02 in TC-03. |
| Ocena trajanja | 5 min |
| Pripravil | Claude (AI agent) |
| Datum priprave | 18. 10. 2026 |
| Dejanski rezultat | Izvedeno 18. 10. 2026 (razdelek 7). Koraki 1–5 se ujemajo: sporočilo »Pogrešno korisničko ime ili lozinka.«, URL ostane /login, polji prazni; / preusmeri na /login?next=… brez seznama. |
| Status | Uspešno |
| Opombe | Koraka 2–3 preverjena posredno (polje ima type=password). Parameter next vsebuje http:// namesto https://. |

### TC-02: Besedilno iskanje normativa po šifri GN v zbirki Normativi 2008

| Polje | Vrednost |
| --- | --- |
| ID | TC-02 |
| Naslov | Iskanje po šifri normativa GN-301-223 vrne pravi normativ kot prvi zadetek |
| Cilj | Preveriti, da besedilno iskanje po točni šifri GN (z velikimi ali malimi črkami) prikaže iskani normativ kot prvi rezultat. |
| Sledljivost | F3 (delno F2, F7) |
| Vrsta | pozitivni |
| Tehnika načrtovanja | primeri uporabe (»kalkulant poišče normativ po šifri«) + ekvivalenčni razredi (šifra z velikimi in z malimi črkami) |
| Prioriteta | visoka. Iskanje po šifri je najpogostejši način dela; če ne deluje, aplikacija ni uporabna. |
| Okolje | https://app.enormativi.com, Google Chrome, vloga viewer (test_viewer, delovni prostor test_ws_2008) |
| Predpogoji | S1 in S2 sta izvedena. Tester je prijavljen kot test_viewer. Gumb AI v iskalni vrstici ima oznako »AI« (AI način je izklopljen). |
| Testni podatki | Poizvedba 1: GN-301-223; poizvedba 2: gn-301-223. Pričakovani dokument: vg1_p0204, knjiga 1 (»Visokogradnja 1«), stran 204, šifra GN-301-223, klasifikacijska številka 1247 XX, 2 tabeli, naziv »ZIDANJE MAŠINSKIM ŠUPLJIM GLINENIM 12/25/25 CM. PREGRADNIH UNUTRAŠNJIH ZIDOVA …«. Šifra je v norms_2008 edinstvena (preverjeno 18. 10. 2026). |

| # | Dejanje | Pričakovani rezultat |
| --- | --- | --- |
| 1 | Odpri URL https://app.enormativi.com/?src=2008. | Izbirnik zbirke prikazuje »Norme 2008«. Naslov seznama je »Sve strane«, ob njem »— 1535 rezultata«. Iskalno polje ima napis »Pretraži GN kod, šifru, naziv…«. |
| 2 | V iskalno polje vnesi GN-301-223 in pritisni Enter. | Naslov je »Rezultati za „GN-301-223“«, ob njem »— N rezultata« (N ≥ 1). Prva kartica ima oznako »KNJ.1 STR.0204«, značko »Norma«, značko »GN-301-223«, klasifikacijo »1247 XX«, oznako »2 tabela« in naziv, ki se začne z »ZIDANJE MAŠINSKIM ŠUPLJIM GLINENIM 12/25/25 CM.«. |
| 3 | Klikni prvo kartico. | URL je https://app.enormativi.com/norms2008/vg1_p0204. V navigaciji piše »Knj.1 Str.204«, gumba za navigacijo sta »203« in »205«. Prikazane so značke »GN-301-223«, »1247 XX«, »Norma« in »Visokogradnja 1«. |
| 4 | Klikni gumb »Lista«. | Ponovno je prikazan seznam z naslovom »Rezultati za „GN-301-223“«, prva kartica je »KNJ.1 STR.0204«. |
| 5 | V iskalnem polju zamenjaj besedilo z gn-301-223 in pritisni Enter. | Naslov je »Rezultati za „gn-301-223“«. Prva kartica je ponovno »KNJ.1 STR.0204« s šifro »GN-301-223«. |

| Polje | Vrednost |
| --- | --- |
| Merilo uspešnosti | V korakih 2 in 5 je prva kartica »KNJ.1 STR.0204 / GN-301-223«. Korak 3 odpre stran vg1_p0204 s pravilnimi metapodatki. Skupno število zadetkov se ne preverja, ker iskalnik vrača tudi približne zadetke. |
| Postpogoji / čiščenje | Test ne spreminja podatkov. Iskanji se zapišeta v dnevnik aktivnosti (F16). Odjava: uporabniški meni → »Odjava«. |
| Ocena trajanja | 6 min |
| Pripravil | Claude (AI agent) |
| Datum priprave | 18. 10. 2026 |
| Dejanski rezultat | Koraki 1–5 se ujemajo. Prva kartica je obakrat KNJ.1 STR.0204 / GN-301-223; stran vg1_p0204 ima značke GN-301-223, 1247 XX, Norma, Visokogradnja 1; »Lista« vrne na /?q=GN-301-223&src=2008. |
| Status | Uspešno |
| Opombe | Iskanje po edinstveni šifri poroča »— 1535 rezultata« (vsa zbirka). Merilo uspešnosti števila ne preverja, za uporabnika pa je zavajajoče. |

### TC-03: Izvoz posamezne tabele normativa v Excel

| Polje | Vrednost |
| --- | --- |
| ID | TC-03 |
| Naslov | Izvoz druge tabele normativa GN-301-223 v datoteko .xlsx z ohranjeno glavo in združenimi celicami |
| Cilj | Preveriti, da gumb »Excel« pri posamezni tabeli prenese datoteko s pravilnim imenom, enim listom, naslovno vrstico normativa ter ohranjenimi večvrstičnimi glavami in združenimi celicami. |
| Sledljivost | F8 (delno F7) |
| Vrsta | pozitivni |
| Tehnika načrtovanja | primeri uporabe (»kalkulant prenese tabelo v svoj predračun«) |
| Prioriteta | visoka. Izvoz v Excel je glavni izhod iz aplikacije; napačni podatki gredo neposredno v uporabnikov predračun. |
| Okolje | https://app.enormativi.com, Google Chrome, vloga viewer (test_viewer). Nameščen Microsoft Excel ali LibreOffice Calc. |
| Predpogoji | S1 in S2 sta izvedena. Tester je prijavljen kot test_viewer. V mapi za prenose ni datoteke norme2008_knj1_str204_tbl1.xlsx. |
| Testni podatki | Stran https://app.enormativi.com/norms2008/vg1_p0204. Tabela 2: 6 stolpcev, 3 vrstice glave, 44 vrstic telesa. Prva vrstica telesa: A, 124809, 0.016, 1.052, 47137*, 15.50 (preverjeno v bazi 18. 10. 2026). |

| # | Dejanje | Pričakovani rezultat |
| --- | --- | --- |
| 1 | Odpri URL https://app.enormativi.com/norms2008/vg1_p0204. | V navigaciji piše »Knj.1 Str.204«. Prikazana je vrstica »Tabele:« s povezavama »Tabela 1« in »Tabela 2« ter razdelka »Tabela 1 (10 kolona)« in »Tabela 2 (6 kolona)«. V vsaki glavi je gumb »Excel«. |
| 2 | V glavi razdelka »Tabela 2 (6 kolona)« klikni gumb »Excel«. | Brskalnik prenese natanko eno datoteko norme2008_knj1_str204_tbl1.xlsx. Stran normativa ostane prikazana. |
| 3 | V seznamu prenosov klikni datoteko norme2008_knj1_str204_tbl1.xlsx. | (a) Natanko 1 list z imenom »Tabela 2«. (b) A1 je združena čez A1:F1, krepka, vsebuje naziv normativa »… \| GN-301-223 1247 XX«. (c) Glava v vrsticah 2–4, belo krepko besedilo na temno modrem ozadju; B2 »šifrapoziije« združena B2:B4; C2 »normativvremena« združena C2:D3; C4 = »jedinačno«, D4 = »ukupno«, F4 = »480083«. (d) Vrstica 5: A5 = »A« (združena A5:A10), B5 = »124809«, C5 = »0.016«, D5 = »1.052«, E5 = »47137*«, F5 = »15.50«. (e) Zadnja vrstica s podatki je 48. |

| Polje | Vrednost |
| --- | --- |
| Merilo uspešnosti | Ime datoteke, število in ime lista ter vsebina celic A1, B2, C2, C4, D4, F4, A5–F5 in zadnja vrstica 48 se ujemajo. Združeni obsegi A1:F1, B2:B4, C2:D3 in A5:A10 obstajajo. |
| Postpogoji / čiščenje | Izbriši preneseno datoteko. Vnos »Excel preuzimanje« v dnevniku aktivnosti je pričakovana sled. Odjava. |
| Ocena trajanja | 8 min |
| Pripravil | Claude (AI agent) |
| Datum priprave | 18. 10. 2026 |
| Dejanski rezultat | Datoteka norme2008_knj1_str204_tbl1.xlsx (7173 B): 1 list »Tabela 2«, A1:F1 krepko z nazivom in šifro, glava bela krepka na ozadju #1E3A5F, B2/C2/C4/D4/F4 in vrstica 5 kot pričakovano, zadnja vrstica 48, vsi zahtevani združeni obsegi obstajajo. |
| Status | Uspešno |
| Opombe | Datoteka je bila preverjena z openpyxl, ne odprta v Excelu; vizualni pregled ni bil narejen. |

### TC-04: Meja mesečne kvote AI iskanj

| Polje | Vrednost |
| --- | --- |
| ID | TC-04 |
| Naslov | Pri individualni kvoti 2 sta 1. in 2. AI iskanje dovoljena, 3. je zavrnjeno s stranjo o preseženi kvoti |
| Cilj | Preveriti, da sistem dovoli natanko toliko AI iskanj, kolikor znaša mesečna kvota, in naslednje zavrne (HTTP 429). |
| Sledljivost | F15 (delno F4) |
| Vrsta | negativni |
| Tehnika načrtovanja | mejne vrednosti: poraba pred iskanjem = meja − 2 (0), meja − 1 (1) in meja (2) |
| Prioriteta | srednja. Napaka ne ustavi dela uporabnikov, povzroči pa nenadzorovane stroške Gemini ali neupravičeno blokado plačnikov. |
| Okolje | https://app.enormativi.com, Google Chrome, vloga viewer (test_quota_01); za pripravo in čiščenje admin (test_admin) |
| Predpogoji | 1) Kot test_admin v zavihku »Korisnici« ustvari test_quota_01, Uloga »Viewer«, brez radnog prostora, »Vlastiti limit/mj.« 2. 2) Preveri: »Vlastiti limit« = 2, »Efektivni limit« = 2, »Ovaj mj.« = 0; če »Ovaj mj.« ni 0, uporabi ime test_quota_02. 3) Odjava; v oknu Incognito se prijavi kot test_quota_01. |
| Testni podatki | Meja = 2. AI poizvedbe: zidanje pregradnog zida opekom, oplata temelja, betoniranje armiranobetonske ploče. Datum ponastavitve pri izvedbi v oktobru 2026: 01.11.2026. Zbirka: Stare norme, 2739 strani. |

| # | Dejanje | Pričakovani rezultat |
| --- | --- | --- |
| 1 | Klikni uporabniški meni test_quota_01 (desno zgoraj). | Vrstica »AI pretrage« z vrednostjo »2/2« in besedilo »Resetuje se 01.11.2026«. |
| 2 | V iskalno polje vnesi zidanje pregradnog zida opekom. | Polje vsebuje vneseno besedilo; gumb AI ima oznako »AI«. |
| 3 | Klikni gumb »AI« v iskalni vrstici. | Med nalaganjem je vidno »AI pretraga u toku…«. Nato značka »AI mod«, naslov »AI rezultati za „zidanje pregradnog zida opekom“« in »— N rezultata«, 1 ≤ N ≤ 20. Gumb ima oznako »AI: ON«. |
| 4 | Klikni uporabniški meni. | »AI pretrage« = »1/2«. |
| 5 | V iskalnem polju zamenjaj besedilo z oplata temelja in pritisni Enter. | Značka »AI mod« in naslov »AI rezultati za „oplata temelja“« z 1–20 rezultati. |
| 6 | Klikni uporabniški meni. | »AI pretrage« = »0/2«, vrstica napredka je rdeča in polna. |
| 7 | Zamenjaj besedilo z betoniranje armiranobetonske ploče in pritisni Enter. | Naslov zavihka »Kvota iskorištena — Norme«. Prikazano »Mesečni limit AI pretrage iskorišćen«, »Iskoristili ste svih 2 AI pretraga za ovaj mesec.«, »Kvota se automatski obnavlja 01.11.2026.« in »AI pretrage: 2 / 2«. Rezultatov ni. V F12 → Network ima zahteva /?…&ai=1 status 429. |
| 8 | Klikni gumb »Nazad na pregled«. | Seznam »Sve strane — 2739 rezultata« brez značke »AI mod«. |

| Polje | Vrednost |
| --- | --- |
| Merilo uspešnosti | Iskanji pri porabi 0 in 1 vrneta AI rezultate, števec 2/2 → 1/2 → 0/2. Tretje iskanje je zavrnjeno s statusom 429 in na strani piše »AI pretrage: 2 / 2«. |
| Postpogoji / čiščenje | Odjava. Kot test_admin izbriši test_quota_01 (potrditev »Obrisati korisnika test_quota_01? Ova akcija se ne može poništiti.«). Števec porabe ostane, zato pri ponovni izvedbi v istem mesecu uporabi novo pripono. |
| Ocena trajanja | 12 min (s pripravo in čiščenjem) |
| Pripravil | Claude (AI agent) |
| Datum priprave | 18. 10. 2026 |
| Dejanski rezultat | Koraki 1, 2, 4, 6, 7, 8 se ujemajo (kvota 2/2 → 1/2 → 0/2, tretje iskanje HTTP 429 z vsemi pričakovanimi besedili). Koraka 3 in 5: značka »AI mod« in naslov sta prikazana, vendar »— 0 rezultata« namesto 1–20. |
| Status | Neuspešno |
| Opombe | Napaka: _gemini_rerank (app.py vrst. 380) ne najde zadetkov, ker Gemini vrne zaporedno številko kandidata (1–20) namesto številke strani, funkcija pa nima rezervnega vračila kandidatov. AI iskanje v starih normativih zato vrne 0 zadetkov, kvota se vseeno porabi. Potrjeno z ločenim klicem Gemini. |

### TC-05: Uporabnik brez pravice do zbirke 2008 ne dostopa do njenih podatkov

| Polje | Vrednost |
| --- | --- |
| ID | TC-05 |
| Naslov | Uporabnik delovnega prostora samo s »Stare norme« ne vidi in ne izvaža normativov 2008 |
| Cilj | Preveriti, da uporabnik, katerega delovni prostor nima dovoljene zbirke 2008, ne more prikazati, poiskati ali izvoziti njenih podatkov. |
| Sledljivost | F14 (delno F2, F3, F8) |
| Vrsta | negativni |
| Tehnika načrtovanja | ekvivalenčni razredi (neveljavni razred: delovni prostor z dovoljeno samo zbirko old) |
| Prioriteta | visoka. Zbirka 2008 je plačljiva dodatna vsebina; v produkciji jo ima 15 od 18 delovnih prostorov zaprto. |
| Okolje | https://app.enormativi.com, Google Chrome z odprtimi razvijalskimi orodji (F12 → Network), vloga viewer (test_stare); za pripravo admin (test_admin) |
| Predpogoji | 1) Kot test_admin ustvari delovni prostor test_ws_stare, limit 100, »Norme 2008« neoznačeno; v stolpcu »Kolekcije« je samo »Stare norme«. 2) Ustvari uporabnika test_stare, Uloga »Viewer«, Radni prostor test_ws_stare. 3) Odjava; v oknu Incognito se prijavi kot test_stare. |
| Testni podatki | Dokument 2008: vg1_p0204 (GN-301-223). Prva stran starih normativov: stran 42, »Montažna barake«, GN-100-101. Zadetek GN-301-223 v starih normativih: stran 154, »ZIDANJE FASADNIH ZIDOVA OD FASADNE OPEKE (puna)«. Število starih normativov: 2739. |

| # | Dejanje | Pričakovani rezultat |
| --- | --- | --- |
| 1 | Odpri URL https://app.enormativi.com/. | »Sve strane — 2739 rezultata«. Prva kartica »STR. 0042«, »Montažna barake«, »GN-100-101«. Izbirnika zbirke ni. Stranska filtra sta »Vrsta gradnje« in »Sekcija«, filtra »Knjiga« ni. |
| 2 | Odpri URL https://app.enormativi.com/?src=2008. | Prikaz je enak kot v koraku 1. Nobena kartica nima oznake »KNJ.«. |
| 3 | V iskalno polje vnesi GN-301-223 in pritisni Enter. | »Rezultati za „GN-301-223“«. Prva kartica »STR. 0154«, »ZIDANJE FASADNIH ZIDOVA OD FASADNE OPEKE (puna)«. Na prvi strani rezultatov ni kartice z oznako »KNJ.«. |
| 4 | Odpri URL https://app.enormativi.com/norms2008/vg1_p0204. | Stran za napako z gumbom »Nazad na početnu«. Naziv, tabele in gumbi »Excel«, »PDF«, »JPG« niso prikazani. V Network ima zahteva status 403. |
| 5 | Odpri URL https://app.enormativi.com/norms2008/vg1_p0204/export/excel. | Nobena datoteka se ne prenese. Stran za napako z gumbom »Nazad na početnu«. Status 403. |

| Polje | Vrednost |
| --- | --- |
| Merilo uspešnosti | V nobenem koraku niso prikazani ali preneseni podatki iz zbirke 2008. Korak 2 ostane na starih normativih, koraka 4 in 5 vrneta status 403. |
| Postpogoji / čiščenje | Odjava. Kot test_admin izbriši test_stare, nato delovni prostor test_ws_stare (potrditev »Obrisati radni prostor test_ws_stare?«). |
| Ocena trajanja | 12 min (s pripravo in čiščenjem) |
| Pripravil | Claude (AI agent) |
| Datum priprave | 18. 10. 2026 |
| Dejanski rezultat | Koraki 1–5 se ujemajo: uporabnik vidi samo stare normative (2739), ?src=2008 ostane na starih, iskanje GN-301-223 vrne STR. 0154, /norms2008/vg1_p0204 in izvoz Excel vrneta HTTP 403 brez podatkov. |
| Status | Uspešno |
| Opombe | Stran za 403 ima naslov »Stranica nije pronađena« in številko 404. Dodatni korak /image/vg1/page_0204.jpg: HTTP 200, slika (520 KB) prenesena — potrjena napaka v nadzoru dostopa (F14). |

## 4. Matrika sledljivosti

Pet primerov glavno pokriva pet funkcionalnosti (F1, F3, F8, F14, F15), delno pa še tri (F2, F4, F7). Opisi funkcionalnosti so povzeti po interni specifikaciji docs/02-funkcionalnosti.md. X = glavna pokritost, (x) = delna.

| Funkcionalnost | Opis | TC-01 | TC-02 | TC-03 | TC-04 | TC-05 |
| --- | --- | --- | --- | --- | --- | --- |
| F1 Prijava, odjava in vloge | Prijava z uporabniškim imenom in geslom, zaščita poti za neprijavljene | X |  |  |  |  |
| F2 Seznam in brskanje | Kartice normativov, dve zbirki, vidnost glede na delovni prostor |  | (x) |  |  | (x) |
| F3 Besedilno iskanje | Iskanje po nazivu, šifri GN, klasifikaciji in besedilu (Meilisearch / MongoDB) |  | X |  |  | (x) |
| F4 AI iskanje | Semantično iskanje z naravnim jezikom (Gemini), do 20 zadetkov |  |  |  | (x) |  |
| F7 Podrobni prikaz strani | Skenirana stran, metapodatki, tabele, navigacija |  | (x) | (x) |  |  |
| F8 Izvoz tabel v Excel | .xlsx z ohranjenimi glavami, združenimi celicami in oblikovanjem |  |  | X |  | (x) |
| F14 Delovni prostori in dostop do zbirk | Dovoljene zbirke na delovni prostor; 403 brez pravice |  |  |  |  | X |
| F15 Mesečne kvote AI iskanj | Individualna / delovni prostor / privzeta kvota; HTTP 429 ob prekoračitvi |  |  |  | X |  |

**Ni pokrito s temi primeri:** F5 predlogi med tipkanjem, F6 filtri, F9 izvoz v PDF in JPEG, F10 priljubljene, F11–F12 urejanje in pregled tabel, F13 upravljanje uporabnikov (uporabljeno samo kot priprava), F16 dnevnik aktivnosti, F17 OCR cevovod. Pri F1 ostajata nepokriti onemogočitev računa in odjava.

## 5. Komentar

Ukaz je bilo treba popraviti enkrat: prva različica je dala vsebinsko dobre, a preveč široke in težko izvedljive primere. Druga različica je končna.

### Prvi ukaz (v1)

Si izkušen tester programske opreme. Za spletno aplikacijo eNormativi (iskanje digitaliziranih gradbenih normativov) ustvari 5 testnih primerov za funkcionalno testiranje.\
Opis funkcionalnosti je v datoteki /home/docker/tick/ocr-norms/docs/02-funkcionalnosti.md, koda v /home/docker/tick/ocr-norms/app.py.\
Vsak testni primer naj vsebuje vse atribute, ki jih dober testni primer vsebuje. Odgovori v slovenščini, v obliki Markdown. Ne spreminjaj nobene datoteke, samo beri.

### Kaj je bilo treba v ukazu popraviti

| Težava v rezultatu v1 | Popravek v ukazu v2 |
| --- | --- |
| Atributi so se med primeri razlikovali (manjkali so okolje, cilj, tehnika, ocena trajanja, avtor). | Obvezna predloga z naštetimi polji. |
| En primer je združeval več preverjanj (TC-02 v1: 6 različnih preverjanj, tudi izklop iskalnika). | Pravilo 1: en primer = en cilj, največ 8 korakov. |
| Koraki so mešali uporabniški vmesnik, API klice in neposreden vpogled v MongoDB. | Pravilo 2: samo dejanja v brskalniku, izvedljiva brez poznavanja kode. |
| Testni podatki so bili ohlapni (»npr. knjiga 1, stran 12«, »preveri vnaprej v MongoDB«). | Pravilo 4: konkretni podatki, preverjeni z bralnimi poizvedbami v bazi. |
| TC-02 v1 je zahteval ustavitev Meilisearch, kar bi v produkciji pokvarilo iskanje pravim uporabnikom. | Kontekst »testira se v produkciji« + pravilo 5: brez posegov v storitve, vsaka sprememba se razveljavi. |
| Opombe o sumljivih napakah so bile vmešane v testne primere. | Ločen razdelek »Sumi napak«. |
| Ni bilo zahteve po mešanici vrst primerov in po matriki. | Vsaj 2 pozitivna, 2 negativna, 1 z mejnimi vrednostmi; matrika sledljivosti v izhodu. |

### Kaj bi v testnih primerih spremenil sam

1. **TC-01** preverja trivialen primer (napačno geslo). Zamenjal bi ga s primerom iz v1: admin onemogoči račun, aktivna seja uporabnika takoj preneha (F1 + F13). Ta primer ima večjo poslovno težo.
2. **TC-03, korak 3** ima v enem pričakovanem rezultatu pet preverjanj (a–e). Razdelil bi ga na več korakov. Dodal bi opombo, da so napake v glavi (»šifrapoziije«) napake OCR v izvornih podatkih in ne napaka izvoza. Opozoril bi tudi na zmedo pri imenu: gumb pri »Tabela 2« prenese datoteko …_tbl1.xlsx.
3. **TC-04** je označen kot negativni, čeprav so koraki 1–6 pozitivni. Vrsto bi popravil na »pozitivni + negativni (mejne vrednosti)«.
4. **TC-05, korak 4** pričakuje le »stran za napako«. Aplikacija pri 403 prikaže stran z napisom »404«, kar je napaka. Pričakovani rezultat bi zapisal po specifikaciji (stran 403), da test to napako ujame. Dodal bi še korak z neposrednim URL-jem slike /image/vg1/page_0204.jpg.
5. Račun test_admin v produkciji ne obstaja. V predpogoje bi dodal, kdo ga ustvari, ali pa bi uporabil obstoječ skrbniški račun.
6. Polje »Pripravil« bi dopolnil s poljem »Pregledal« (moje ime), ker sem primere pregledal in odobril.

### Sumi napak, ki jih je agent našel med pripravo

Agent je našel 13 sumov. V kodi sem preveril spodnjih pet; ostale je treba še preveriti.

| Sum napake | Mesto v kodi | Povezava |
| --- | --- | --- |
| Slike strani 2008 dostopne tudi brez pravice do zbirke (/image/ nima collection_required) | app.py vrst. 1843 | F14 |
| Pri 403 se prikaže stran »404 / Stranica nije pronađena« | app.py vrst. 2871 | F1, F14 |
| Odprta preusmeritev po prijavi (next se ne preverja) | app.py vrst. 1320 | F1 (varnost) |
| AI kvota se porabi, tudi ko klic Gemini ne uspe | app.py vrst. 1507 | F4, F15 |
| Izvoz z ?tbl=-1 izvozi zadnjo tabelo namesto 404 | app.py vrst. 1965 | F8 |

## 6. Uporabljena orodja generativne umetne inteligence

| Orodje | Model | Namen |
| --- | --- | --- |
| Claude Code (Anthropic), razširitev za VS Code | Claude Opus 5.5 | Glavni agent: priprava in popravek ukaza, zagon podagenta, preverjanje navedb agenta v kodi in bazi, oblikovanje tega dokumenta |
| Claude Code podagent (general-purpose) | Claude Opus 5.5 | Ustvarjanje testnih primerov in matrike po ukazih v1 in v2 (bralni dostop do kode in baze MongoDB) |
| Claude Docs | — | Urejanje in izvoz dokumenta |

Teste (razdelek 7) je izvedel Claude Code s skripto v Pythonu (requests, BeautifulSoup, openpyxl). Končni pregled testnih primerov in odločitev o popravkih (razdelek 5) sta moja.

## 7. Poročilo o izvedbi

Izvedenih je bilo vseh 5 primerov: 4 so uspešni, TC-04 je neuspešen zaradi napake v AI iskanju. Izvedba je potekala 18. 10. 2026 v produkciji (https://app.enormativi.com).

| TC | Status | Kratek rezultat |
| --- | --- | --- |
| TC-01 | Uspešno | 5/5 korakov; napačno geslo zavrnjeno, seja ni odprta |
| TC-02 | Uspešno | 5/5 korakov; GN-301-223 je prvi zadetek z velikimi in malimi črkami |
| TC-03 | Uspešno | 3/3 korakov; ime datoteke, list, glava in združene celice se ujemajo |
| TC-04 | Neuspešno | 6/8 korakov; meja kvote deluje, AI iskanje vrne 0 zadetkov |
| TC-05 | Uspešno | 5/5 korakov; dostop do zbirke 2008 zavrnjen s 403; dodatni korak s sliko neuspešen |

**Način izvedbe.** Koraki niso bili izvedeni ročno v brskalniku Chrome, ampak z avtomatizirano skripto, ki pošilja enake HTTP zahteve kot brskalnik (prijava, iskanje, klik na kartico, prenos datoteke) in v vrnjenem HTML preveri pričakovana besedila. Datoteka .xlsx je bila preverjena s knjižnico openpyxl. Vizualnih lastnosti (zakriti znaki gesla, animacija nalaganja, barve na zaslonu) skripta ne vidi; preverjene so bile posredno iz HTML-a.

**Testni računi.** Za izvedbo je bil začasno ustvarjen račun test_admin, nato prek administracije test_ws_2008, test_ws_stare, test_viewer, test_quota_01 in test_stare. Po izvedbi so bili vsi izbrisani. V bazi ostane zapis porabe za test_quota_01 (2 AI iskanji v oktobru), kot predvideva TC-04.

### Napake, potrjene z izvedbo

| Napaka | Primer | Mesto v kodi | Resnost |
| --- | --- | --- | --- |
| AI iskanje v starih normativih vrne 0 zadetkov: Gemini vrne zaporedno številko namesto številke strani, rezervnega vračila ni; kvota se vseeno porabi | TC-04 | app.py vrst. 380 | visoka |
| Slika strani iz zbirke 2008 je dostopna uporabniku brez pravice (/image/vg1/page_0204.jpg → HTTP 200) | TC-05 (dodatni korak) | app.py vrst. 1843 | visoka |
| Stran za 403 prikaže »404 / Stranica nije pronađena« | TC-05 | app.py vrst. 2871 | nizka |
| Iskanje po edinstveni šifri poroča »1535 rezultata« (vsa zbirka) | TC-02 | iskanje Meilisearch | nizka |
