# Utemeljitev postavk testnega plana

Postavke smo izbrali po vzoru IEEE 829 / ISO/IEC/IEEE 29119-3. Vključili smo samo tiste, ki pri HelpDesku vplivajo na odločitev, kaj testiramo in kdaj je različica 1.1 pripravljena.

## Vključene postavke

| Postavka | Razdelek | Zakaj je vključena |
|---|---|---|
| Identifikacija plana | glava | Plan bo imel več različic (osnutek agenta, predelava). Brez oznake in izhodiščnega commita ne vemo, na katero kodo se nanaša. |
| Testni element in spremembe | 1, 1.1 | Plan opisuje *naslednjo* različico. Spremembe SP-1–SP-7 izhajajo iz napak in ugotovitev nalog 2, 4 in 5, zato določajo obseg. |
| Funkcionalnosti za testiranje | 2 | Pokaže, da testiramo samo funkcionalnosti, ki jih 1.1 spremeni, plus regresijo ključnih tokov. |
| Funkcionalnosti, ki jih ne testiramo | 3 | Izrecno izpuščanje prepreči napačno pričakovanje (npr. da smo testirali pošiljanje prave pošte, ki je v kopiji ni). |
| Pristop | 4 | Največji del plana. Določi, katero orodje iz prejšnjih nalog pokrije katero raven in kaj je novega (avtomatizacija EK/MV iz 5. naloge, nove mutacije). |
| Vstopna, izstopna merila, prekinitev | 5 | V 2. in 4. nalogi je bil rezultat »funkcionalno uspešno, test neuspešen« (NAP-01). Brez izrecnega merila (lokalni zagon je obvezen) bi tako stanje lahko spregledali. |
| Testno okolje | 6 | Lokalni in CI zagon se razlikujeta (dev/produkcija, Chrome/Chromium, ponovitve). Ta razlika je skrila NAP-01 v cevovodu. |
| Testni izdelki | 7 | Cevovod že ustvari poročila; plan pove, kje so in kdo pripravi ostalo. |
| Naloge, odgovornosti, razpored | 8 | Skupinsko delo in rok zagovora. Ločimo avtorja in pregledovalca testov. |
| Tveganja | 9 | Vsa tveganja so iz dejanskih izkušenj (NAP-01, ECONNRESET, test, ki vedno uspe, časovna omejitev predogleda T3). |
| Upravljanje napak | 10 | Oblika NAP-01 iz 2. naloge se je obnesla; dodali smo stopnje resnosti in pravilo, da napako zapre šele test. |
| Sledljivost | 11 | Povezuje spremembo → test → skripto → mutacijo. Nadaljuje matriko iz 2. naloge. |

## Izpuščene postavke

| Postavka | Zakaj je izpuščena |
|---|---|
| Potrebe po kadrih in usposabljanju | Skupina pozna orodja iz nalog 2–5 (Playwright, `node:test`, GitHub Actions). |
| Proračun in stroški | Vsa orodja so brezplačna; GitHub Actions je za javni repozitorij brezplačen. |
| Odobritve (podpisi) | Ni naročnika. Izdajo potrdi skupina v nalogi 8 razporeda. |
| Ločen seznam predmetov testiranja (test items) po datotekah | Spremembe in mesta v kodi so že v tabeli 1.1; ločen seznam bi bil podvojen. |
| Testiranje zmogljivosti, varnosti, dostopnosti | Utemeljeno v razdelku 3 kot zavestna izključitev, ne kot ločena postavka. |
| Podroben opis testnih primerov | Primeri so v `docs/naloga2` in `docs/naloga5`; plan se nanje sklicuje. |
| Slovar pojmov | Pojmi (EK, MV, ticket, nivo) so pojasnjeni v prejšnjih nalogah in pri ustni predstavitvi. |
