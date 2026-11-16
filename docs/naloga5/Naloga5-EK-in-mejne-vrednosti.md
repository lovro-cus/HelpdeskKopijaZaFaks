# 5. naloga – Ekvivalenčne kategorije in mejne vrednosti

**Projekt:** HelpDesk – podpora strankam spletne trgovine z oblačili (izmišljena trgovina Kroj)
**Osnova:** testni primeri iz 2. naloge (`docs/naloga2/testni-primeri-v3.md`, različica 3.0)
**Datum:** 16. 11. 2026
**Pripravil:** agent Claude Code; študent pregleda dokument in dopiše svoje ime pred oddajo.

## 1. Uvod

Naloga zahteva, da na treh testnih primerih z vnosi uporabimo dva pristopa črne škatle:

1. **particioniranje vhodnih podatkov na ekvivalenčne kategorije (EK)** – vhode razdelimo v razrede, v katerih se aplikacija obnaša enako. Iz vsakega razreda testiramo enega predstavnika.
2. **analiza mejnih vrednosti (MV)** – pri vsakem urejenem razponu testiramo vrednosti na meji in tik ob njej (min − 1, min, min + 1, max − 1, max, max + 1).

Izbrani testni primeri:

| ID | Testni primer | Vir | Vnosi | Številski vnos |
|---|---|---|---|---|
| TP-01 | Odpiranje novega ticketa | 2. naloga, dopolnjen | Št. naročila, Vrednost naročila | da – številka naročila in znesek |
| TP-05 | Ustvarjanje uporabnika (podvojeno in neveljavno ime) | 2. naloga, dopolnjen | Uporabniško ime, Ime in priimek, Nivo | da – nivo (1–5); dolžine vnosov |
| TP-06 | Zamenjava gesla ob prvi prijavi | **nov** | Trenutno geslo, Novo geslo, Ponovi novo geslo | da – dolžina gesla (8–200) |

TP-02, TP-03 in TP-04 nimata primernih vnosov (TP-03 ima samo potrditveno polje in prosto besedilo). Zato smo dodali TP-06.

### 1.1 Vir specifikacij

Aplikacija nima ločene specifikacije pravil za vnos. `docs/FUNKCIONALNOSTI.md` opisuje samo, kaj uporabnik vpiše, ne pa omejitev. Pravila smo zato vzeli iz:

- **vmesnika** – atributi polj (`required`, `maxLength`, `minLength`, `pattern`) in sprotni seznam zahtev za geslo,
- **strežniških akcij** – `src/lib/actions/issues.ts` (`createIssue`), `src/lib/actions/admin.ts` (`createUser`), `src/lib/actions/auth.ts` (`changeOwnPassword`), `src/lib/password-rules.ts`,
- **besedil napak** – slovenski del `src/lib/i18n/dictionaries.ts`.

Kjer pravila ni ali je pomanjkljivo, smo ga **smiselno dodali**. Dodana pravila so v tabelah označena z **[dodano]**. Pri njih je pričakovani rezultat zapisan po dodanem pravilu, ne po trenutnem delovanju kode. Če se koda obnaša drugače, je to v poglavju 5 zapisano kot sum napake ali odprto vprašanje.

### 1.2 Oznake

```text
EK-xx   ekvivalenčna kategorija         V = veljavna   N = neveljavna
MV-xx   mejna vrednost
TP-01.03  tretja izvedbena različica testnega primera TP-01
```

### 1.3 Skupni predpogoji

Enako kot v 2. nalogi: aplikacija teče lokalno (`bun run dev`, http://localhost:3000) z ločeno testno bazo. Pred vsakim testnim primerom požene tester `bun run db:seed`. Vmesnik je v slovenščini. Demo geslo je `Kroj-Demo-2026`. Če ena različica spremeni bazo (npr. ustvari ticket), naslednje različice uporabljajo druge vrednosti, zato seme ni treba pognati med različicami, razen kjer je to izrecno napisano.

Pri poljih z atributom `required`, `minLength` ali `pattern` vnos zavrne že brskalnik. Brskalnik pokaže svoje opozorilo ob polju. Besedilo je odvisno od brskalnika, zato ga ne navajamo dobesedno. Pri teh različicah je merilo uspeha: obrazec se ne pošlje in v bazi ni spremembe.

---

## 2. TP-01 – Odpiranje novega ticketa (dopolnjen)

### 2.1 Osnovni podatki

| Atribut | Vrednost |
|---|---|
| ID | TP-01 |
| Naslov | Odpiranje ticketa – preverjanje vnosa »Št. naročila« in »Vrednost naročila« |
| Funkcionalnost | F-01 – Odpiranje ticketa |
| Prioriteta | Visoka – številka naročila je ključ, po katerem aplikacija poveže ticket, pošto in pošiljke. Napačna ali podvojena številka pokvari vse nadaljnje tokove. |
| Vrsta | Pozitiven in negativen (različice) |
| Tehnika | Ekvivalenčne kategorije, mejne vrednosti |
| Predpogoji | Sveže seme. Prijavljen je `Admin`. Odprta je stran **Tiketi** (`/orders`). Naročila 3001–3199 in 912 ne obstajajo. Naročilo **2125** je odprto (KRJ-15, lastnica Nina Vidmar). Naročilo **0912** je zaključeno in arhivirano. |
| Fiksni testni podatki | Vrsta težave `Kakovost`; Naslov `Test EK/MV`; E-mail `nova.stranka@example.com`; Ime stranke `Nova Stranka`; Prioriteta privzeta; Prevzame privzeto (Administrator). Spreminja se samo vnos, ki ga navaja posamezna različica. |

### 2.2 Specifikacija vnosa

| # | Pravilo | Vir |
|---|---|---|
| S1-1 | »Št. naročila« je obvezna. Prazno polje zavrne brskalnik. Vnos samo iz presledkov zavrne strežnik s sporočilom »Št. naročila je obvezna.« | vmesnik (`required`), `createIssue` |
| S1-2 | Aplikacija odstrani presledke na začetku in koncu ter en vodilni znak `#`. | `createIssue` |
| S1-3 | Dovoljeni znaki: `A–Z`, `a–z`, `0–9`, `#`, `-`, `_`, `.` in presledek. Za druge znake (npr. `/`, `č`, `@`) strežnik vrne »Št. naročila vsebuje nedovoljene znake.« Isto sporočilo dobi vnos `#` sam, ker po odstranitvi `#` ostane prazen niz. | `createIssue` |
| S1-4 | Dolžina po čiščenju: **1–40 znakov**. Polje ne sprejme več kot 40 znakov (`maxLength=40`). | vmesnik, `createIssue` |
| S1-5 | Številka je enolična. Primerjava ne loči vodilnega `#`, presledkov in velikih/malih črk (`#2125`, `21 25`, `2125` so ista številka). Vodilne ničle niso odstranjene (`0912` in `912` sta različni številki). | `orderNumberKey` |
| S1-6 | Pri podvojeni odprti številki se odpre okno »Naročilo je že odprto« z besedilom »Naročilo #2125 je že odprto in ga ima Nina Vidmar.«. Pri podvojeni arhivirani številki se odpre okno »Naročilo je že arhivirano« z besedilom »Naročilo #0912 je že bilo obravnavano in arhivirano. Ga želiš ponovno odpreti?«. Ticket se ne ustvari. | `NewOrderSheet.tsx`, slovar |
| S2-1 **[dodano]** | »Vrednost naročila« ni obvezna. Prazno polje pomeni, da vrednost ni znana. | dodano |
| S2-2 **[dodano]** | Veljavna vrednost je število od **0,00 do 10 000,00** (EUR ali izbrana valuta). Decimalno ločilo je vejica ali pika. Dovoljeni sta največ **2 decimalki**. | dodano – trgovina z oblačili nima naročil nad 10 000 |
| S2-3 **[dodano]** | Negativna vrednost, vrednost nad 10 000,00, vrednost s 3 ali več decimalkami in neštevilski vnos so neveljavni. Aplikacija ticketa ne ustvari in prikaže napako »Vrednost naročila mora biti število med 0,00 in 10 000,00.« | dodano |

### 2.3 Ekvivalenčne kategorije

| EK | Vnos | Kategorija | V/N | Predstavnik |
|---|---|---|---|---|
| EK-01 | Št. naročila | samo števke, nova številka, dolžina 1–40 | V | `3001` |
| EK-02 | Št. naročila | z vodilnim `#` | V | `#3002` (shrani se `3002`) |
| EK-03 | Št. naročila | z drugimi dovoljenimi znaki (črke, `-`, `_`, `.`) | V | `KRJ-3003_a.b` |
| EK-04 | Št. naročila | presledki na začetku in koncu | V | `␣␣3004␣␣` (shrani se `3004`) |
| EK-05 | Št. naročila | prazno polje | N | `` (prazno) |
| EK-06 | Št. naročila | samo presledki | N | `␣␣␣` |
| EK-07 | Št. naročila | nedovoljen znak | N | `3005/1` |
| EK-08 | Št. naročila | nedovoljen znak – črka s strešico | N | `čč3006` |
| EK-09 | Št. naročila | samo `#` | N | `#` |
| EK-10 | Št. naročila | daljše od 40 znakov | N | 41 znakov (glej MV) |
| EK-11 | Št. naročila | podvojena odprta številka – enak zapis | N | `2125` |
| EK-12 | Št. naročila | podvojena odprta številka – drug zapis | N | `#21 25` |
| EK-13 | Št. naročila | podvojena arhivirana številka | N | `0912` |
| EK-14 | Št. naročila | vodilne ničle odstranjene – nova številka | V | `912` |
| EK-15 | Vrednost naročila | prazno | V | `` (prazno) |
| EK-16 | Vrednost naročila | celo število v razponu | V | `129` |
| EK-17 | Vrednost naročila | decimalna vejica, ≤ 2 decimalki | V | `129,50` |
| EK-18 | Vrednost naročila | decimalna pika, ≤ 2 decimalki | V | `129.50` |
| EK-19 | Vrednost naročila | negativno število | N | `-10` |
| EK-20 | Vrednost naročila | nad zgornjo mejo | N | `25000` |
| EK-21 | Vrednost naročila | 3 ali več decimalk | N | `12,345` |
| EK-22 | Vrednost naročila | neštevilski vnos | N | `sto evrov` |

### 2.4 Mejne vrednosti

Dolžina številke naročila (1–40 znakov):

```text
 dolžina:   0      1      2   ...   39     40     41
            |------[==========================]------|
            N      V      V          V      V      N
          MV-01  MV-02  MV-03      MV-04  MV-05  MV-06
```

Vrednost naročila (0,00–10 000,00) **[dodano]**:

```text
 znesek:  -0,01   0,00   0,01  ...  9 999,99  10 000,00  10 000,01
            |------[================================]---------|
            N      V      V            V          V          N
          MV-07  MV-08  MV-09        MV-10      MV-11      MV-12

 decimalke:  2 = V (MV-13: 0,99)    3 = N (MV-14: 0,999)
```

| MV | Vnos | Meja | Vrednost | V/N |
|---|---|---|---|---|
| MV-01 | Št. naročila | min − 1 (0 znakov) | `` | N |
| MV-02 | Št. naročila | min (1 znak) | `7` | V |
| MV-03 | Št. naročila | min + 1 (2 znaka) | `71` | V |
| MV-04 | Št. naročila | max − 1 (39 znakov) | `3` + 38 × `9` | V |
| MV-05 | Št. naročila | max (40 znakov) | `4` + 39 × `9` | V |
| MV-06 | Št. naročila | max + 1 (41 znakov) | `5` + 40 × `9` | N – polje sprejme le 40 znakov |
| MV-07 | Vrednost naročila | min − 0,01 | `-0,01` | N |
| MV-08 | Vrednost naročila | min | `0,00` | V |
| MV-09 | Vrednost naročila | min + 0,01 | `0,01` | V |
| MV-10 | Vrednost naročila | max − 0,01 | `9999,99` | V |
| MV-11 | Vrednost naročila | max | `10000,00` | V |
| MV-12 | Vrednost naročila | max + 0,01 | `10000,01` | N |
| MV-13 | Vrednost naročila | največ decimalk (2) | `0,99` | V |
| MV-14 | Vrednost naročila | 1 decimalka preveč (3) | `0,999` | N |

### 2.5 Koraki (skupni za vse različice)

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | Na strani **Tiketi** klikni **Nov ticket**. | Odpre se predal »Nov ticket«. Kazalec je v polju »Št. naročila«. |
| 2 | Izberi vrsto **Kakovost**. Vpiši Naslov in E-mail iz fiksnih podatkov. | Vrednosti so vpisane. |
| 3 | Klikni **Podatki o stranki in pošiljki**. Vpiši »Ime stranke«. | Razdelek se razpre. |
| 4 | V »Št. naročila« in »Vrednost naročila« vpiši vrednosti iz izbrane različice (tabela 2.6). Če različica ne navaja vrednosti naročila, polje pusti prazno. Če ne navaja številke naročila, uporabi `3100` + zaporedna številka različice (npr. `3115`). | Vrednosti so vpisane. Pri MV-06 polje vsebuje samo prvih 40 znakov. |
| 5 | Klikni **Odpri naročilo**. | Odziv iz stolpca »Pričakovani rezultat«. |
| 6 | Pri veljavni različici osveži stran ticketa in preveri vrednosti v razdelku s podrobnostmi. Pri neveljavni zapri predal in na strani **Tiketi** poišči številko. | Veljavna: vrednosti so shranjene. Neveljavna: novega ticketa ni. |

### 2.6 Izvedbene različice

| Različica | Št. naročila | Vrednost naročila | Pokrije | Pričakovani rezultat |
|---|---|---|---|---|
| TP-01.01 | `3001` | `129` | EK-01, EK-16 | Ticket se ustvari (`/orders/KRJ-n`). Številka 3001, »Vrednost naročila« 129. |
| TP-01.02 | `#3002` | – | EK-02, EK-15 | Ticket se ustvari s številko `3002` (brez `#`). Vrednost naročila je prazna. |
| TP-01.03 | `KRJ-3003_a.b` | `129,50` | EK-03, EK-17 | Ticket se ustvari s številko `KRJ-3003_a.b`. Vrednost 129,5. |
| TP-01.04 | `␣␣3004␣␣` | `129.50` | EK-04, EK-18 | Ticket se ustvari s številko `3004`. Vrednost 129,5. |
| TP-01.05 | `` (prazno) | – | EK-05, MV-01 | Brskalnik ne pošlje obrazca in označi polje »Št. naročila«. Ticket se ne ustvari. |
| TP-01.06 | `␣␣␣` | – | EK-06 | Predal ostane odprt s sporočilom »Št. naročila je obvezna.« Ticket se ne ustvari. |
| TP-01.07 | `3005/1` | – | EK-07 | Predal ostane odprt s sporočilom »Št. naročila vsebuje nedovoljene znake.« |
| TP-01.08 | `čč3006` | – | EK-08 | »Št. naročila vsebuje nedovoljene znake.« |
| TP-01.09 | `#` | – | EK-09 | »Št. naročila vsebuje nedovoljene znake.« |
| TP-01.10 | `7` | – | MV-02 | Ticket se ustvari s številko `7`. |
| TP-01.11 | `71` | – | MV-03 | Ticket se ustvari s številko `71`. |
| TP-01.12 | `3` + 38 × `9` (39 zn.) | – | MV-04 | Ticket se ustvari, številka ima 39 znakov. |
| TP-01.13 | `4` + 39 × `9` (40 zn.) | – | MV-05 | Ticket se ustvari, številka ima 40 znakov. |
| TP-01.14 | `5` + 40 × `9` (41 zn.) | – | MV-06, EK-10 | Polje sprejme samo 40 znakov (zadnji `9` ostane zunaj). Ticket se ustvari s 40-mestno številko `5` + 39 × `9`. 41-mestna številka se nikoli ne shrani. |
| TP-01.15 | `2125` | – | EK-11 | Odpre se okno »Naročilo je že odprto«: »Naročilo #2125 je že odprto in ga ima Nina Vidmar.« Nov ticket se ne ustvari. |
| TP-01.16 | `#21 25` | – | EK-12 | Enako okno kot TP-01.15 za #2125. |
| TP-01.17 | `0912` | – | EK-13 | Odpre se okno »Naročilo je že arhivirano«: »Naročilo #0912 je že bilo obravnavano in arhivirano. Ga želiš ponovno odpreti?«. Tester okno zapre brez ponovnega odpiranja. |
| TP-01.18 | `912` | – | EK-14 | Ticket se ustvari s številko `912` (ni podvojitev `0912`). |
| TP-01.19 | – | `-0,01` | MV-07 | **[dodano]** Predal ostane odprt s sporočilom »Vrednost naročila mora biti število med 0,00 in 10 000,00.« Ticket se ne ustvari. |
| TP-01.20 | – | `-10` | EK-19 | **[dodano]** Enako kot TP-01.19. |
| TP-01.21 | – | `0,00` | MV-08 | Ticket se ustvari. Vrednost 0. |
| TP-01.22 | – | `0,01` | MV-09 | Ticket se ustvari. Vrednost 0,01. |
| TP-01.23 | – | `9999,99` | MV-10 | Ticket se ustvari. Vrednost 9999,99. |
| TP-01.24 | – | `10000,00` | MV-11 | Ticket se ustvari. Vrednost 10000. |
| TP-01.25 | – | `10000,01` | MV-12 | **[dodano]** Napaka kot TP-01.19. |
| TP-01.26 | – | `25000` | EK-20 | **[dodano]** Napaka kot TP-01.19. |
| TP-01.27 | – | `0,99` | MV-13 | Ticket se ustvari. Vrednost 0,99. |
| TP-01.28 | – | `0,999` | MV-14 | **[dodano]** Napaka kot TP-01.19. |
| TP-01.29 | – | `12,345` | EK-21 | **[dodano]** Napaka kot TP-01.19. |
| TP-01.30 | – | `sto evrov` | EK-22 | **[dodano]** Napaka kot TP-01.19. |

**Končni pričakovani rezultat:** vse veljavne različice ustvarijo ticket s pravilno očiščeno številko in vrednostjo. Vse neveljavne različice ticketa ne ustvarijo in prikažejo navedeno sporočilo ali okno.

**Stanje po izvedbi:** v bazi so novi ticketi samo za veljavne različice. Čiščenje: `bun run db:seed`.

---

## 3. TP-05 – Ustvarjanje uporabnika (dopolnjen)

### 3.1 Osnovni podatki

| Atribut | Vrednost |
|---|---|
| ID | TP-05 |
| Naslov | Ustvarjanje uporabnika – preverjanje vnosa »Uporabniško ime«, »Ime in priimek« in »Nivo« |
| Funkcionalnost | F-08 – Upravljanje uporabnikov |
| Prioriteta | Srednja – napačno uporabniško ime prepreči prijavo ali povzroči zamenjavo računov. Opravilo izvaja samo administrator. |
| Vrsta | Pozitiven in negativen (različice) |
| Tehnika | Ekvivalenčne kategorije, mejne vrednosti |
| Predpogoji | Sveže seme. Obstaja 6 uporabnikov: `Admin`, `gost`, `nina`, `ali`, `eva`, `marko`. Prijavljen je `Admin`. Odprta je **Nadzorna plošča → Uporabniki**. |
| Fiksni testni podatki | Jezik `Slovenščina`; Nivo `1. nivo`; Začetno geslo `Zacetno-Geslo-1` (izpolnjuje vse zahteve); E-mail prazno; Administrator neoznačeno. Spreminja se samo vnos, ki ga navaja različica. Privzeto Ime in priimek: `Test Uporabnik`. |

### 3.2 Specifikacija vnosa

| # | Pravilo | Vir |
|---|---|---|
| S3-1 | »Uporabniško ime« ima **3–32 znakov**. Dovoljeni znaki: `A–Z`, `a–z`, `0–9`, `.`, `_`, `-`. Vmesnik to preveri z `minLength`, `maxLength=32` in `pattern`. Strežnik vrne »Uporabniško ime: 3–32 znakov; dovoljeni so črke, številke, . _ -.« | vmesnik, `createUser` |
| S3-2 | Uporabniško ime je enolično. Za obstoječe ime strežnik vrne »To uporabniško ime je že zasedeno.« | `createUser` |
| S3-3 **[dodano]** | Enoličnost ne loči velikih in malih črk. `Nina` in `NINA` sta zasedeni, ker obstaja `nina`. Razlog: dva računa, ki se razlikujeta samo po velikih črkah, uporabnik težko loči. | dodano |
| S3-4 | »Ime in priimek« je obvezno, **1–80 znakov** po odstranitvi presledkov na robovih. Prazno polje zavrne brskalnik, samo presledke strežnik s sporočilom »Ime je obvezno.« | vmesnik (`required`, `maxLength=80`), `createUser` |
| S3-5 | »Nivo« je celo število **1–5**. Vmesnik ponuja samo spustni seznam z vrednostmi 1–5. Za drugo vrednost strežnik vrne »Nivo mora biti med 1 in 5.« | vmesnik, `createUser`, `MAX_LEVEL = 5` |

### 3.3 Ekvivalenčne kategorije

| EK | Vnos | Kategorija | V/N | Predstavnik |
|---|---|---|---|---|
| EK-30 | Uporabniško ime | samo male črke, nova vrednost | V | `tester` |
| EK-31 | Uporabniško ime | mešanica črk, števk in `. _ -` | V | `Test.User_1-a` |
| EK-32 | Uporabniško ime | presledek v imenu | N | `test user` |
| EK-33 | Uporabniško ime | črka s strešico | N | `čebela` |
| EK-34 | Uporabniško ime | drug nedovoljen znak | N | `test@kroj` |
| EK-35 | Uporabniško ime | prekratko (< 3) | N | glej MV-30 |
| EK-36 | Uporabniško ime | predolgo (> 32) | N | glej MV-35 |
| EK-37 | Uporabniško ime | obstoječe – enak zapis | N | `nina` |
| EK-38 | Uporabniško ime | obstoječe – druge velike črke **[dodano]** | N | `NINA` |
| EK-39 | Ime in priimek | običajno ime s šumniki | V | `Žan Čuk` |
| EK-40 | Ime in priimek | prazno | N | `` |
| EK-41 | Ime in priimek | samo presledki | N | `␣␣␣` |
| EK-42 | Ime in priimek | daljše od 80 znakov | N | glej MV-41 |
| EK-43 | Nivo | vrednost iz seznama 1–5 | V | `3. nivo` |
| EK-44 | Nivo | vrednost zunaj seznama (0, 6, `abc`) | N | ni dosegljiva prek vmesnika – glej opombo |

> **Opomba k EK-44:** spustni seznam ne dovoli vnosa izven 1–5. Kategorija je neveljavna, a jo vmesnik v celoti zapre. Testiramo, da seznam ponuja **natanko** vrednosti 1–5 (TP-05.22). Neposreden poskus z vrednostjo 0 ali 6 bi zahteval spremembo zahteve v brskalniku, kar ni del testiranja črne škatle skozi vmesnik.

### 3.4 Mejne vrednosti

Dolžina uporabniškega imena (3–32) in imena (1–80):

```text
 uporabniško ime:   2      3      4   ...   31     32     33
                    |------[==========================]------|
                    N      V      V          V      V      N
                  MV-30  MV-31  MV-32      MV-33  MV-34  MV-35

 ime in priimek:    0      1      2   ...   79     80     81
                    |------[==========================]------|
                    N      V      V          V      V      N
                  MV-36  MV-37  MV-38      MV-39  MV-40  MV-41

 nivo (seznam):     0  |  1      2   ...    4      5  |  6
                    N  |  V      V          V      V  |  N
                  MV-42  MV-43  MV-44      MV-45  MV-46  MV-47
```

| MV | Vnos | Meja | Vrednost | V/N |
|---|---|---|---|---|
| MV-30 | Uporabniško ime | min − 1 (2) | `ab` | N |
| MV-31 | Uporabniško ime | min (3) | `abc` | V |
| MV-32 | Uporabniško ime | min + 1 (4) | `abcd` | V |
| MV-33 | Uporabniško ime | max − 1 (31) | `u` + 30 × `a` | V |
| MV-34 | Uporabniško ime | max (32) | `v` + 31 × `a` | V |
| MV-35 | Uporabniško ime | max + 1 (33) | `w` + 32 × `a` | N – polje sprejme le 32 znakov |
| MV-36 | Ime in priimek | min − 1 (0) | `` | N |
| MV-37 | Ime in priimek | min (1) | `N` | V |
| MV-38 | Ime in priimek | min + 1 (2) | `Na` | V |
| MV-39 | Ime in priimek | max − 1 (79) | 79 × `a` | V |
| MV-40 | Ime in priimek | max (80) | 80 × `b` | V |
| MV-41 | Ime in priimek | max + 1 (81) | 81 × `c` | N – polje sprejme le 80 znakov |
| MV-42 | Nivo | min − 1 (0) | ni v seznamu | N |
| MV-43 | Nivo | min (1) | `1. nivo` | V |
| MV-44 | Nivo | min + 1 (2) | `2. nivo` | V |
| MV-45 | Nivo | max − 1 (4) | `4. nivo` | V |
| MV-46 | Nivo | max (5) | `5. nivo` | V |
| MV-47 | Nivo | max + 1 (6) | ni v seznamu | N |

### 3.5 Koraki (skupni za vse različice)

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | Na zavihku **Uporabniki** klikni **Dodaj uporabnika**. | Odpre se obrazec »Nov uporabnik«. |
| 2 | Vpiši fiksne podatke in vrednosti iz izbrane različice (tabela 3.6). Če različica ne navaja uporabniškega imena, uporabi `test` + številka različice (npr. `test10`). | Vrednosti so vpisane. Gumb **Ustvari** je omogočen, ker začetno geslo izpolnjuje vse zahteve. |
| 3 | Klikni **Ustvari**. | Odziv iz stolpca »Pričakovani rezultat«. |
| 4 | Zapri obrazec, osveži seznam uporabnikov. | Veljavna različica: nov uporabnik je na seznamu z vpisanim imenom in nivojem. Neveljavna: število uporabnikov se ne spremeni. |

### 3.6 Izvedbene različice

| Različica | Uporabniško ime | Ime in priimek | Nivo | Pokrije | Pričakovani rezultat |
|---|---|---|---|---|---|
| TP-05.01 | `tester` | – | – | EK-30 | Sporočilo »Uporabnik Test Uporabnik je dodan in mora ob prvi prijavi zamenjati geslo.« Uporabnik je na seznamu. |
| TP-05.02 | `Test.User_1-a` | – | – | EK-31 | Uporabnik se ustvari. |
| TP-05.03 | `test user` | – | – | EK-32 | Brskalnik ne pošlje obrazca (vzorec polja). Uporabnik se ne ustvari. |
| TP-05.04 | `čebela` | – | – | EK-33 | Brskalnik ne pošlje obrazca. Uporabnik se ne ustvari. |
| TP-05.05 | `test@kroj` | – | – | EK-34 | Brskalnik ne pošlje obrazca. Uporabnik se ne ustvari. |
| TP-05.06 | `ab` | – | – | MV-30, EK-35 | Brskalnik ne pošlje obrazca (premalo znakov). Uporabnik se ne ustvari. |
| TP-05.07 | `abc` | – | – | MV-31 | Uporabnik se ustvari. |
| TP-05.08 | `abcd` | – | – | MV-32 | Uporabnik se ustvari. |
| TP-05.09 | `u` + 30 × `a` (31) | – | – | MV-33 | Uporabnik se ustvari. |
| TP-05.10 | `v` + 31 × `a` (32) | – | – | MV-34 | Uporabnik se ustvari. |
| TP-05.11 | `w` + 32 × `a` (33) | – | – | MV-35, EK-36 | Polje sprejme samo 32 znakov. Uporabnik se ustvari z 32-znakovnim imenom `w` + 31 × `a`. 33-znakovno ime se nikoli ne shrani. |
| TP-05.12 | `nina` | `Nina Dvojnik` | – | EK-37 | Obrazec ostane odprt s sporočilom »To uporabniško ime je že zasedeno.« Uporabnikov je še vedno 6. |
| TP-05.13 | `NINA` | `Nina Dvojnik` | – | EK-38 | **[dodano]** Sporočilo »To uporabniško ime je že zasedeno.« Uporabnik se ne ustvari. |
| TP-05.14 | – | `Žan Čuk` | – | EK-39 | Uporabnik se ustvari, ime je na seznamu zapisano s šumniki. |
| TP-05.15 | – | `` (prazno) | – | MV-36, EK-40 | Brskalnik ne pošlje obrazca. Uporabnik se ne ustvari. |
| TP-05.16 | – | `␣␣␣` | – | EK-41 | Obrazec ostane odprt s sporočilom »Ime je obvezno.« |
| TP-05.17 | – | `N` | – | MV-37 | Uporabnik se ustvari z imenom `N`. |
| TP-05.18 | – | `Na` | – | MV-38 | Uporabnik se ustvari. |
| TP-05.19 | – | 79 × `a` | – | MV-39 | Uporabnik se ustvari, ime ima 79 znakov. |
| TP-05.20 | – | 80 × `b` | – | MV-40 | Uporabnik se ustvari, ime ima 80 znakov. |
| TP-05.21 | – | 81 × `c` | – | MV-41, EK-42 | Polje sprejme samo 80 znakov. Uporabnik se ustvari z 80-znakovnim imenom. |
| TP-05.22 | – | – | odpri seznam | EK-44, MV-42, MV-47 | Spustni seznam »Nivo« ponuja natanko 5 možnosti: od »1. nivo« do »5. nivo«. Vrednosti 0 in 6 ni. |
| TP-05.23 | – | – | `1. nivo` | MV-43 | Uporabnik se ustvari na 1. nivoju. |
| TP-05.24 | – | – | `2. nivo` | MV-44 | Uporabnik se ustvari na 2. nivoju. |
| TP-05.25 | – | – | `3. nivo` | EK-43 | Uporabnik se ustvari na 3. nivoju. |
| TP-05.26 | – | – | `4. nivo` | MV-45 | Uporabnik se ustvari na 4. nivoju. |
| TP-05.27 | – | – | `5. nivo` | MV-46 | Uporabnik se ustvari na 5. nivoju. |

**Končni pričakovani rezultat:** veljavne različice ustvarijo račun s pravilnim imenom in nivojem. Neveljavne različice računa ne ustvarijo. Obstoječi račun `nina` se ne spremeni.

**Stanje po izvedbi:** novi računi samo za veljavne različice, vsi z `mustChangePw = true`. Čiščenje: `bun run db:seed`.

---

## 4. TP-06 – Zamenjava gesla ob prvi prijavi (nov)

### 4.1 Osnovni podatki

| Atribut | Vrednost |
|---|---|
| ID | TP-06 |
| Naslov | Zamenjava gesla ob prvi prijavi – preverjanje dolžine in sestave novega gesla |
| Funkcionalnost | F-08 – Upravljanje uporabnikov (račun, ki ga ustvari administrator, mora ob prvi prijavi zamenjati geslo) |
| Prioriteta | Visoka – geslo varuje dostop do podatkov strank. Šibko geslo je varnostno tveganje, prestrogo preverjanje pa zaklene uporabnika. |
| Vrsta | Pozitiven in negativen (različice) |
| Tehnika | Ekvivalenčne kategorije, mejne vrednosti |
| Predpogoji | Sveže seme. `nina` ima `mustChangePw = true` in geslo `Kroj-Demo-2026`. Tester se prijavi kot `nina` / `Kroj-Demo-2026` in je na strani `/geslo` (»Zamenjaj geslo«). |
| Fiksni testni podatki | »Trenutno geslo« `Kroj-Demo-2026`. »Ponovi novo geslo« = enako kot »Novo geslo«, razen kjer različica navaja drugače. |

### 4.2 Specifikacija vnosa

| # | Pravilo | Vir |
|---|---|---|
| S4-1 | Novo geslo ima **8–200 znakov**. Za manj kot 8 seznam zahtev kaže »Vsaj 8 znakov« kot neizpolnjeno in gumb **Shrani geslo** je onemogočen. Za več kot 200 strežnik vrne »Geslo je predolgo.« | `password-rules.ts`, `PasswordForm.tsx` |
| S4-2 | Novo geslo ima vsaj eno veliko črko, eno malo črko, eno števko in en poseben znak (vsak znak, ki ni črka ali števka – tudi presledek). Črke s strešico štejejo kot črke. Če zahteva ni izpolnjena, je gumb onemogočen. | `password-rules.ts` |
| S4-3 | »Ponovi novo geslo« mora biti enako »Novo geslo«. Sicer zahteva »Gesli se ujemata« ni izpolnjena in gumb je onemogočen. Strežnik vrne »Novi gesli se ne ujemata.« | `PasswordForm.tsx`, `changeOwnPassword` |
| S4-4 | Novo geslo mora biti drugačno od trenutnega. Sicer zahteva »Drugačno od trenutnega gesla« ni izpolnjena in gumb je onemogočen. | `PasswordForm.tsx`, `changeOwnPassword` |
| S4-5 | Napačno trenutno geslo strežnik zavrne s sporočilom »Trenutno geslo ni pravilno.« | `changeOwnPassword` |
| S4-6 | Po uspešni zamenjavi aplikacija preusmeri na `/orders`. | `changeOwnPassword` |

### 4.3 Ekvivalenčne kategorije

| EK | Vnos | Kategorija | V/N | Predstavnik |
|---|---|---|---|---|
| EK-50 | Novo geslo | izpolnjuje vse zahteve, ASCII | V | `Nina-Test-2026!` |
| EK-51 | Novo geslo | izpolnjuje vse zahteve, črke s strešico | V | `Čžš-Test-26` |
| EK-52 | Novo geslo | poseben znak je presledek | V | `Nina Test 2026` |
| EK-53 | Novo geslo | prekratko (< 8) | N | glej MV-50 |
| EK-54 | Novo geslo | predolgo (> 200) | N | glej MV-55 |
| EK-55 | Novo geslo | brez velike črke | N | `nina-test-2026!` |
| EK-56 | Novo geslo | brez male črke | N | `NINA-TEST-2026!` |
| EK-57 | Novo geslo | brez števke | N | `Nina-Test-dva!` |
| EK-58 | Novo geslo | brez posebnega znaka | N | `NinaTest2026` |
| EK-59 | Novo geslo | enako trenutnemu | N | `Kroj-Demo-2026` |
| EK-60 | Ponovi novo geslo | drugačno od novega | N | novo `Nina-Test-2026!`, ponovi `Nina-Test-2027!` |
| EK-61 | Trenutno geslo | napačno | N | `Napacno-Geslo-1` |

### 4.4 Mejne vrednosti

```text
 dolžina gesla:   7      8      9   ...   199    200    201
                  |------[==========================]------|
                  N      V      V          V      V      N
                MV-50  MV-51  MV-52      MV-53  MV-54  MV-55
```

| MV | Meja | Vrednost (izpolnjuje ostale zahteve) | Dolžina | V/N |
|---|---|---|---|---|
| MV-50 | min − 1 | `Ab1!xyz` | 7 | N |
| MV-51 | min | `Ab1!xyzw` | 8 | V |
| MV-52 | min + 1 | `Ab1!xyzwq` | 9 | V |
| MV-53 | max − 1 | `Ab1!` + 195 × `x` | 199 | V |
| MV-54 | max | `Ab1!` + 196 × `x` | 200 | V |
| MV-55 | max + 1 | `Ab1!` + 197 × `x` | 201 | N |

### 4.5 Koraki (skupni za vse različice)

| # | Korak | Pričakovani odziv |
|---|---|---|
| 1 | Na `/login` se prijavi kot `nina` / `Kroj-Demo-2026`. | Aplikacija preusmeri na `/geslo`, naslov »Zamenjaj geslo«. |
| 2 | Vpiši »Trenutno geslo«, »Novo geslo« in »Ponovi novo geslo« iz izbrane različice (tabela 4.6). | Seznam zahtev pod polji sproti kaže, katere zahteve so izpolnjene. |
| 3 | Preveri stanje gumba **Shrani geslo**. Če je omogočen, ga klikni. | Odziv iz stolpca »Pričakovani rezultat«. |
| 4 | Pri veljavni različici se odjavi in prijavi z novim geslom. Nato požene tester `bun run db:seed` pred naslednjo različico. | Prijava z novim geslom uspe, aplikacija ne zahteva nove zamenjave gesla. |

### 4.6 Izvedbene različice

| Različica | Novo geslo | Drugo | Pokrije | Pričakovani rezultat |
|---|---|---|---|---|
| TP-06.01 | `Ab1!xyz` (7) | – | MV-50, EK-53 | Zahteva »Vsaj 8 znakov« ni izpolnjena. Gumb **Shrani geslo** je onemogočen. Geslo se ne spremeni. |
| TP-06.02 | `Ab1!xyzw` (8) | – | MV-51 | Vse zahteve so izpolnjene. Po kliku aplikacija preusmeri na `/orders`. Prijava z `Ab1!xyzw` uspe. |
| TP-06.03 | `Ab1!xyzwq` (9) | – | MV-52 | Kot TP-06.02. |
| TP-06.04 | `Ab1!` + 195 × `x` (199) | – | MV-53 | Kot TP-06.02. |
| TP-06.05 | `Ab1!` + 196 × `x` (200) | – | MV-54 | Kot TP-06.02. |
| TP-06.06 | `Ab1!` + 197 × `x` (201) | – | MV-55, EK-54 | Gumb je omogočen (vmesnik ne preveri zgornje meje). Po kliku se pokaže »Geslo je predolgo.« Aplikacija ostane na `/geslo`. Prijava s starim geslom `Kroj-Demo-2026` še vedno vodi na `/geslo`. |
| TP-06.07 | `Nina-Test-2026!` | – | EK-50 | Kot TP-06.02. |
| TP-06.08 | `Čžš-Test-26` | – | EK-51 | Kot TP-06.02 (Č šteje kot velika črka). |
| TP-06.09 | `Nina Test 2026` | – | EK-52 | Kot TP-06.02 (presledek šteje kot poseben znak). |
| TP-06.10 | `nina-test-2026!` | – | EK-55 | »Vsaj ena velika črka« ni izpolnjena, gumb onemogočen. |
| TP-06.11 | `NINA-TEST-2026!` | – | EK-56 | »Vsaj ena mala črka« ni izpolnjena, gumb onemogočen. |
| TP-06.12 | `Nina-Test-dva!` | – | EK-57 | »Vsaj ena številka« ni izpolnjena, gumb onemogočen. |
| TP-06.13 | `NinaTest2026` | – | EK-58 | »Vsaj en poseben znak (!?#$%…)« ni izpolnjena, gumb onemogočen. |
| TP-06.14 | `Kroj-Demo-2026` | – | EK-59 | »Drugačno od trenutnega gesla« ni izpolnjena, gumb onemogočen. |
| TP-06.15 | `Nina-Test-2026!` | ponovi `Nina-Test-2027!` | EK-60 | »Gesli se ujemata« ni izpolnjena, gumb onemogočen. |
| TP-06.16 | `Nina-Test-2026!` | trenutno `Napacno-Geslo-1` | EK-61 | Gumb je omogočen. Po kliku se pokaže »Trenutno geslo ni pravilno.« Geslo se ne spremeni. |

**Končni pričakovani rezultat:** geslo se spremeni samo pri veljavnih različicah. Pri neveljavnih je gumb onemogočen ali strežnik vrne navedeno sporočilo, geslo pa ostane `Kroj-Demo-2026`.

**Stanje po izvedbi:** pri veljavni različici ima `nina` novo geslo in `mustChangePw = false`, stare seje so razveljavljene. Čiščenje: `bun run db:seed`.

---

## 5. Ugotovitve – pomanjkljive specifikacije in sumi napak

Ugotovitve so iz statičnega pregleda kode. Testov v brskalniku nismo izvedli.

| # | Testni primer | Ugotovitev | Vrsta |
|---|---|---|---|
| U-1 | TP-01.19–TP-01.30 | Polje »Vrednost naročila« nima nobenega preverjanja. Strežnik (`num` v `issues.ts`) sprejme negativno vrednost (`-10`) in poljubno veliko vrednost. Neštevilski vnos (`sto evrov`) tiho zavrže – ticket se ustvari brez vrednosti, uporabnik ne dobi opozorila. Po dodanem pravilu S2-2/S2-3 bi te različice **padle**. | sum napake / manjkajoča specifikacija |
| U-2 | TP-01.10, TP-01.11 | Aplikacija sprejme številko naročila z 1 ali 2 znakoma in s črkami. Funkcija `looksLikeOrderNumber` v isti kodi pa šteje za številko naročila samo 3–10 števk. Pravila si nasprotujeta. Odločiti je treba, katero velja za Shopify številke. | odprto vprašanje |
| U-3 | TP-01.17, TP-01.18 | `0912` in `912` sta različni naročili. Če Shopify vodilne ničle ignorira, lahko nastane podvojen ticket. | odprto vprašanje |
| U-4 | TP-01.14, TP-05.11, TP-05.21 | Strežnik vnos, daljši od meje, potiho odreže (`slice`), namesto da ga zavrne. Prek vmesnika to ni vidno zaradi `maxLength`, je pa neskladno s pravilom 1–40. | opažanje |
| U-5 | TP-05.13 | Iskanje obstoječega uporabnika (`findUnique` po `username`) loči velike in male črke. `NINA` se verjetno ustvari kot nov račun poleg `nina`. Po dodanem pravilu S3-3 bi različica **padla**. | sum napake |
| U-6 | TP-06.06 | Vmesnik ne preveri zgornje meje gesla (200). Uporabnik izve za napako šele po oddaji. Seznam zahtev naj vsebuje tudi »Največ 200 znakov«. | izboljšava |

## 6. Povzetek pokritosti

| Testni primer | EK (V / N) | MV | Izvedbene različice | Številski vnos |
|---|---|---|---|---|
| TP-01 | 22 (9 / 13) | 14 | 30 | številka naročila (dolžina), vrednost naročila (0,00–10 000,00) |
| TP-05 | 15 (4 / 11) | 18 | 27 | nivo (1–5), dolžina imena (3–32, 1–80) |
| TP-06 | 12 (3 / 9) | 6 | 16 | dolžina gesla (8–200) |
| **Skupaj** | **49** | **38** | **73** | |

Vsaka ekvivalenčna kategorija in vsaka mejna vrednost je pokrita z vsaj eno izvedbeno različico. Neveljavne kategorije so testirane vsaka v svoji različici, da ena napaka ne skrije druge.
