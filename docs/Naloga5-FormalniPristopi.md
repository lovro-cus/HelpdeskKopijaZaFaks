# 5. naloga – Uporaba formalnih pristopov snovanja testnih primerov

**Projekt:** HelpDesk (izmišljena trgovina Kroj) · **Repozitorij:** https://github.com/lovro-cus/HelpdeskKopijaZaFaks
**Avtor:** Lovro Čuš · **Datum:** 15. 11. 2026

## 1. Pristopa

Oba pristopa sodita med tehnike črne skrinjice: vhode izbiramo iz specifikacije, ne iz kode.

- **Ekvivalenčni razredi (EP, equivalence partitioning).** Množico vseh možnih vnosov razdelimo v razrede, znotraj katerih se mora sistem obnašati enako (vsi so sprejeti ali vsi zavrnjeni z istim razlogom). Iz vsakega razreda zadošča en predstavnik: če deluje en, predpostavimo, da delujejo vsi.
- **Analiza mejnih vrednosti (BVA, boundary value analysis).** Napake se najpogosteje skrivajo na robovih razredov (`<` namesto `<=`, napačna dolžina). Za vsako mejo testiramo vrednost **tik pod mejo, na meji in tik nad mejo**.

Oznake v tabelah: **V** = veljaven razred, **N** = neveljaven razred. Pričakovani rezultat vedno izhaja iz specifikacije. Kjer je dokumentacija pomanjkljiva, je pravilo dopolnjeno in označeno z **[dopolnjeno]**.

## 2. Izbor testnih primerov

| Testni primer | Izvor | Vnosi | Številski vnos |
|---|---|---|---|
| **TP-01** Odpiranje ticketa | 2. naloga, TP-01 | številka naročila, količina (kos), znesek artikla | da (3) |
| **TP-05** Ustvarjanje uporabnika | 2. naloga, TP-05 (v2) | uporabniško ime, začetno geslo | dolžina |
| **TP-06** Prag nizke ocene zadovoljstva | **nov** (2. naloga nima tretjega primera z vnosi) | prag »V pregled pod« | da |

Vse izpeljane vnose sem izvedel v lokalni aplikaciji (`npm run dev`, sveža baza `npm run db:seed`) 15. 11. 2026 kot `Admin`. Na koncu je baza ponastavljena.

---

## 3. TP-01 – Odpiranje ticketa: številka naročila, količina, znesek

**Osnovni testni primer:** Tiketi → Nov ticket, izberi vrsto »Refund«, vpiši številko naročila, ime stranke `Mejna Stranka`, dodaj artikel `majica` s količino in zneskom, klikni »Odpri naročilo«. Pri veljavnem vnosu se odpre stran novega ticketa z vpisanimi vrednostmi. Pri neveljavnem vnosu ticket ni ustvarjen, prikaže se sporočilo, ki pove, kaj je narobe.

### Specifikacija vnosov

Dokumentacija (`FUNKCIONALNOSTI.md` §1) pravi samo: »Uporabnik vpiše številko naročila, stranko, artikle (izdelek, velikost, barva, znesek, rešitev …)«. Pravil za vnos ne določa, zato jih dopolnjujem:

| Polje | Pravilo |
|---|---|
| Številka naročila | obvezna; **3–10 števk**, neobvezen `#` spredaj; brez črk in presledkov **[dopolnjeno]** |
| Količina (kos) | **celo število 1–9999**; 0, negativno, decimalno in nečiselno se zavrne s sporočilom **[dopolnjeno]** |
| Znesek | **0,00–9.999,99 EUR**, decimalna vejica ali pika, največ 2 decimalki; negativno in nečiselno se zavrne s sporočilom **[dopolnjeno]** |

### Ekvivalenčni razredi

| ID | Polje | Razred | V/N | Predstavnik |
|---|---|---|---|---|
| E1 | št. naročila | 3–10 števk | V | `50002` |
| E2 | št. naročila | prazno | N | `` |
| E3 | št. naročila | manj kot 3 števke | N | `7` |
| E4 | št. naročila | več kot 10 števk | N | `12345678901` |
| E5 | št. naročila | vsebuje črke ali druge znake | N | `ABC-77` |
| E6 | kos | celo število 1–9999 | V | `1` |
| E7 | kos | 0 ali negativno | N | `-1` |
| E8 | kos | nad 9999 | N | `10000` |
| E9 | znesek | 0,00–9.999,99 | V | `10` |
| E10 | znesek | negativen | N | `-0,01` |
| E11 | znesek | nad 9.999,99 | N | `100000` |
| E12 | znesek | nečiselni vnos | N | `abc` |

### Mejne vrednosti

| Polje | Meja | Pod mejo | Na meji | Nad mejo |
|---|---|---|---|---|
| št. naročila – spodnja | 3 števke | `12` (2) | `123` (3) | — |
| št. naročila – zgornja | 10 števk | — | `1234567890` (10) | `12345678901` (11) |
| kos – spodnja | 1 | `0` | `1` | — |
| kos – zgornja | 9999 | — | `9999` | `10000` |
| znesek – spodnja | 0,00 | `-0,01` | `0` | `0,01` |
| znesek – zgornja | 9.999,99 | — | `9999,99` | `10000,00` |

### Izpeljani testni vnosi in izvedba

| # | Vnos (št. / kos / znesek) | Pokrije | Pričakovano (po specifikaciji) | Dejansko | Izid |
|---|---|---|---|---|---|
| 1.1 | `50002` / `1` / `10` | E1, E6, E9 | ustvarjen | ustvarjen | ✅ |
| 1.2 | `` / – / – | E2 | zavrnjen, »obvezno« | brskalnik: »Izpolnite to polje« | ✅ |
| 1.3 | `12` | E3, meja | zavrnjen | **ustvarjen** (`12`) | ❌ |
| 1.4 | `7` | E3 | zavrnjen | **ustvarjen** (`7`) | ❌ |
| 1.5 | `123` | meja | ustvarjen | ustvarjen | ✅ |
| 1.6 | `1234567890` | meja | ustvarjen | ustvarjen | ✅ |
| 1.7 | `12345678901` | E4, meja | zavrnjen | **ustvarjen** | ❌ |
| 1.8 | `ABC-77` | E5 | zavrnjen | **ustvarjen** (`ABC-77`) | ❌ |
| 1.9 | kos `0` | E7, meja | zavrnjen s sporočilom | **ustvarjen, kos tiho spremenjen v 1** | ❌ |
| 1.10 | kos `-1` | E7 | zavrnjen s sporočilom | **ustvarjen, kos = 1** | ❌ |
| 1.11 | kos `9999` | meja | ustvarjen, kos 9999 | ustvarjen, kos 9999 | ✅ |
| 1.12 | kos `10000` | E8, meja | zavrnjen s sporočilom | **ustvarjen, kos = 1000** (zadnja števka odrezana) | ❌ |
| 1.13 | znesek `-0,01` | E10, meja | zavrnjen s sporočilom | **ustvarjen, znesek tiho izbrisan** | ❌ |
| 1.14 | znesek `0` | meja | ustvarjen, 0 | ustvarjen, 0 | ✅ |
| 1.15 | znesek `0,01` | meja | ustvarjen, 0,01 | ustvarjen, 0,01 | ✅ |
| 1.16 | znesek `9999,99` | meja | ustvarjen | ustvarjen | ✅ |
| 1.17 | znesek `10000,00` | E11, meja | zavrnjen | **ustvarjen** (10000) | ❌ |
| 1.18 | znesek `abc` | E12 | zavrnjen s sporočilom | **ustvarjen, znesek tiho izbrisan** | ❌ |

**Ugotovitve:** aplikacija za številko naročila zahteva samo, da ni prazna. Sprejme 1 števko, 11 števk in črke, zato lahko nastane ticket z napačno številko, ki ga iskanje po naročilu ne poveže z ničimer. Za količino in znesek namesto zavrnitve **tiho popravi** vnos (0 → 1, 10000 → 1000, −0,01 → prazno). Uporabnik ne izve, da se je shranilo nekaj drugega, kot je vpisal. To je huje od zavrnitve, ker gre za vrednosti vračil denarja.

---

## 4. TP-05 – Ustvarjanje uporabnika: uporabniško ime in začetno geslo

**Osnovni testni primer:** Nadzorna plošča → Uporabniki → »Dodaj uporabnika«, ime `Mejni Test`, vpiši uporabniško ime in začetno geslo, klikni »Ustvari«. Pri veljavnem vnosu je uporabnik ustvarjen. Pri neveljavnem ni ustvarjen in sporočilo pove, katero pravilo ni izpolnjeno.

### Specifikacija vnosov

Dokumentacija (§8) pravi samo »Administrator ustvari račun«. Del pravil kaže vmesnik sam (namig pod poljem in kontrolni seznam gesla). Ostalo dopolnjujem:

| Polje | Pravilo |
|---|---|
| Uporabniško ime | **3–32 znakov**, samo črke `A–Z a–z`, številke in `. _ -` (namig v vmesniku: »Črke, številke in . _ -«; dolžina **[dopolnjeno]**); edinstveno **ne glede na velike in male črke** (`Nina` = `nina`) **[dopolnjeno]** |
| Začetno geslo | **8–200 znakov**; vsaj ena velika črka, ena mala črka, ena številka in en poseben znak (kontrolni seznam v vmesniku; zgornja meja **[dopolnjeno]**) |

### Ekvivalenčni razredi

| ID | Polje | Razred | V/N | Predstavnik |
|---|---|---|---|---|
| U1 | ime | 3–32 dovoljenih znakov | V | `abc` |
| U2 | ime | manj kot 3 znaki | N | `ab` |
| U3 | ime | več kot 32 znakov | N | 33 × `a` |
| U4 | ime | presledek | N | `ana novak` |
| U5 | ime | nedovoljen znak | N | `ana@kroj` |
| U6 | ime | že obstaja z drugimi velikimi/malimi črkami | N | `Nina` |
| G1 | geslo | izpolnjuje vsa pravila, 8–200 | V | `Abcdef1!` |
| G2 | geslo | prekratko | N | `Abcde1!` |
| G3 | geslo | brez velike črke | N | `abcdef1!` |
| G4 | geslo | brez male črke | N | `ABCDEF1!` |
| G5 | geslo | brez številke | N | `Abcdefg!` |
| G6 | geslo | brez posebnega znaka | N | `Abcdefg1` |
| G7 | geslo | predolgo | N | 201 znak |

### Mejne vrednosti

| Polje | Meja | Pod mejo | Na meji | Nad mejo |
|---|---|---|---|---|
| ime – spodnja | 3 | 2 (`ab`) | 3 (`abc`) | — |
| ime – zgornja | 32 | — | 32 × `a` | 33 × `a` |
| geslo – spodnja | 8 | 7 (`Abcde1!`) | 8 (`Abcdef1!`) | — |
| geslo – zgornja | 200 | — | 200 znakov | 201 znak |

### Izpeljani testni vnosi in izvedba

| # | Vnos | Pokrije | Pričakovano | Dejansko | Izid |
|---|---|---|---|---|---|
| 5.1 | ime `abc` | U1, meja | ustvarjen | ustvarjen | ✅ |
| 5.2 | ime `ab` | U2, meja | zavrnjen z razlogom | zavrnjen, brskalnik: »Poskrbite za ujemanje z zahtevano obliko.« | ⚠️ |
| 5.3 | ime 32 × `a` | meja | ustvarjen | ustvarjen | ✅ |
| 5.4 | ime 33 × `a` | U3, meja | zavrnjen z razlogom | zavrnjen, isto splošno sporočilo | ⚠️ |
| 5.5 | `ana novak` | U4 | zavrnjen z razlogom | zavrnjen, isto splošno sporočilo | ⚠️ |
| 5.6 | `ana@kroj` | U5 | zavrnjen z razlogom | zavrnjen, isto splošno sporočilo | ⚠️ |
| 5.7 | `Nina` | U6 | zavrnjen, »že zasedeno« | **ustvarjen** (obstajata `nina` in `Nina`) | ❌ |
| 5.8 | geslo `Abcde1!` (7) | G2, meja | zavrnjen | gumb »Ustvari« onemogočen | ✅ |
| 5.9 | geslo `Abcdef1!` (8) | G1, meja | ustvarjen | ustvarjen | ✅ |
| 5.10 | `abcdef1!` | G3 | zavrnjen | gumb onemogočen | ✅ |
| 5.11 | `ABCDEF1!` | G4 | zavrnjen | gumb onemogočen | ✅ |
| 5.12 | `Abcdefg!` | G5 | zavrnjen | gumb onemogočen | ✅ |
| 5.13 | `Abcdefg1` | G6 | zavrnjen | gumb onemogočen | ✅ |
| 5.14 | geslo 200 znakov | meja | ustvarjen | ustvarjen | ✅ |
| 5.15 | geslo 201 znak | G7, meja | zavrnjen | zavrnjen: »Geslo je predolgo.« | ✅ |

**Ugotovitve:**
- Pravila za geslo delujejo na vseh mejah.
- Uporabniško ime je zavrnjeno pravilno, a z **enakim splošnim sporočilom brskalnika** za vse razloge (prekratko, predolgo, presledek, `@`). Uporabnik ne izve, kaj je narobe, zato je izid ⚠️ (delno).
- Ime **`Nina` je sprejeto, čeprav `nina` že obstaja**. Nastaneta dva računa, ki se razlikujeta le po veliki začetnici.
- Ob napaki na strežniku (5.15) se obrazec izprazni, kar je opažanje že iz 2. naloge.

---

## 5. TP-06 (nov) – Prag nizke ocene zadovoljstva

**Osnovni testni primer:** Urejanje → Zadovoljstvo, v polje »V pregled pod ___ /10« vpiši vrednost in klikni »Shrani«. Veljavna vrednost se shrani in velja po osvežitvi strani. Neveljavna se ne shrani, prikaže se sporočilo, prejšnja vrednost ostane.

### Specifikacija vnosov

Dokumentacija: ocena zadovoljstva je **1–10** (§7), »pragovi (npr. nizka ocena zadovoljstva)« se urejajo v nastavitvah (§10). Dopolnjujem:

| Polje | Pravilo |
|---|---|
| Prag »V pregled pod« | **celo število 2–10**. Prag 1 bi pomenil »pod 1«, česar nobena ocena ne doseže, zato je nesmiseln. Prag 10 pomeni, da gre v pregled vse razen 10. Obvezno polje **[dopolnjeno]** |

### Ekvivalenčni razredi

| ID | Razred | V/N | Predstavnik |
|---|---|---|---|
| P1 | celo število 2–10 | V | `5` |
| P2 | celo število pod 2 (vključno z negativnimi) | N | `-3` |
| P3 | celo število nad 10 | N | `11` |
| P4 | decimalno število | N | `5.5` |
| P5 | prazno | N | `` |
| P6 | nečiselni vnos | N | `abc` |

### Mejne vrednosti

| Meja | Pod mejo | Na meji | Nad mejo |
|---|---|---|---|
| spodnja: 2 | `1` | `2` | `3`* |
| zgornja: 10 | `9`* | `10` | `11` |

\* Vrednosti 3 in 9 sta v istem razredu kot `5`, zato ju pokriva predstavnik P1.

### Izpeljani testni vnosi in izvedba

Neveljavne vrednosti sem preveril dvakrat: v brskalniku in še mimo preverjanja brskalnika (`noValidate`). Tako se vidi, ali jih zavrne tudi strežnik.

| # | Vnos | Pokrije | Pričakovano | Dejansko – brskalnik | Dejansko – strežnik | Izid |
|---|---|---|---|---|---|---|
| 6.1 | `5` | P1 | shrani 5 | veljavno | »Shranjeno«, shranjeno 5 | ✅ |
| 6.2 | `1` | P2, meja | zavrne | »Vrednost mora biti večja od 2 ali enaka.« | »Vpiši celo število od 2 do 10.«, ostane prejšnja | ✅ |
| 6.3 | `2` | meja | shrani 2 | veljavno | »Shranjeno«, 2 | ✅ |
| 6.4 | `10` | meja | shrani 10 | veljavno | »Shranjeno«, 10 | ✅ |
| 6.5 | `11` | P3, meja | zavrne | »Vrednost mora biti manjša od 10 ali enaka.« | »Vpiši celo število od 2 do 10.« | ✅ |
| 6.6 | `-3` | P2 | zavrne | »… večja od 2 ali enaka.« | (enak razred kot 6.2) | ✅ |
| 6.7 | `5.5` | P4 | zavrne | »Vnesite veljavno vrednost. Najbližji veljavni vrednosti sta 5 in 6.« | — | ✅ |
| 6.8 | `` | P5 | zavrne | »Izpolnite to polje« | — | ✅ |
| 6.9 | `abc` | P6 | zavrne | polje številke ne sprejme črk | »Vpiši celo število od 2 do 10.« | ✅ |

**Ugotovitev:** prag je primer dobro izvedenega vnosa. Meje so na obeh straneh (brskalnik in strežnik) enake, sporočila povedo pravilo, vrednost ostane nespremenjena. Tako bi morala delovati tudi polja iz TP-01.

---

## 6. Povzetek

| Testni primer | Razredov (V + N) | Mejnih vnosov | Izvedenih vnosov | ✅ | ⚠️ | ❌ |
|---|---|---|---|---|---|---|
| TP-01 | 3 + 9 | 13 | 18 | 8 | 0 | 10 |
| TP-05 | 2 + 11 | 8 | 15 | 10 | 4 | 1 |
| TP-06 | 1 + 5 | 4 | 9 | 9 | 0 | 0 |

**Kaj sta pristopa pokazala:**
1. Prvotni TP-01 iz 2. naloge je imel en sam vnos (`990001`), ki je uspel. **Šele z razredi in mejami se je pokazalo**, da aplikacija pri številki naročila, količini in znesku ne preverja skoraj ničesar. Napačne vnose tiho popravi (0 → 1, 10000 → 1000).
2. Mejne vrednosti so našle napako, ki je predstavnik razreda ne bi: kos `9999` deluje, `10000` pa se spremeni v `1000`.
3. Razred »isto ime z drugimi velikimi črkami« (`Nina`) bi brez sistematične delitve na razrede verjetno izpustil.
4. Pomanjkljiva specifikacija je največja težava. Za vse tri primere je bilo pravila treba dopolniti, preden je sploh mogoče reči, kaj je pravilno.

## 7. Uporabljena orodja umetne inteligence

**Claude Code** (Anthropic, model Claude Opus 5.5) je pomagal pri izbiri polj, pripravi tabel razredov in mejnih vrednosti, izvedbi vnosov v lokalni aplikaciji prek brskalnika in pri oblikovanju dokumenta.
