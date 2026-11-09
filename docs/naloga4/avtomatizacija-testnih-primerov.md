# Naloga 4 — Avtomatizacija testnih primerov in pregled skript

## Izhodišče

- **Testni primeri:** TP-01 do TP-05 iz `docs/naloga2/testni-primeri-v3.md` (različica 3.0). Pregled iz 3. naloge v repozitoriju ni shranjen, zato je osnova različica 3.0. Če je pregled zahteval spremembe primerov, jih je treba vnesti v primere in v skripte.
- **Orodje:** Playwright Test 1.64.1 (utemeljitev v `izbira-orodja.md`).
- **Avtor skript:** agent UI Claude Code (model Claude Opus 5.5), 5. 11. 2026.
- **Skripte:**

| Testni primer | Skripta |
|---|---|
| TP-01 Odpiranje novega ticketa | `tests/e2e/tp-01-nov-ticket.spec.ts` |
| TP-02 Predaja ticketa drugemu nivoju | `tests/e2e/tp-02-predaja-nivoju.spec.ts` |
| TP-03 Zavrnitev zaključka brez potrditve vračila | `tests/e2e/tp-03-zakljucek-brez-potrditve.spec.ts` |
| TP-04 Odgovor stranki v demo nabiralniku | `tests/e2e/tp-04-odgovor-stranki.spec.ts` |
| TP-05 Zavrnitev podvojenega uporabniškega imena | `tests/e2e/tp-05-podvojeno-uporabnisko-ime.spec.ts` |
| skupna priprava, prijava, lokatorji | `tests/e2e/support/helpers.ts` |

Vsak korak testnega primera je v skripti svoj `test.step` z isto številko in opisom (npr. »3. Klikni »Ustvari« → zavrnitev z opozorilom«). Koraki so zato vidni v HTML poročilu in v cevovodu, primerjava z dokumentom pa je neposredna. Predpogoji so ločen korak »Predpogoj: …«, končni rezultat (kjer je ločen od zadnjega koraka) pa korak »Končni rezultat: …«.

## Kaj je bilo narobe s skripto iz 2. naloge

Prejšnja skripta `tests/e2e/functional.spec.ts` (agent Codex) je bila pregledana po istih treh merilih. Nadomestile so jo nove skripte. Glavne ugotovitve:

| # | Ugotovitev | Merilo |
|---|---|---|
| 1 | V TP-03 je preverjanje Arhiva iskalo povezavo `a[href="/orders/KRJ-3"]`, Arhiv pa povezave izpiše kot `/orders/KRJ-n?view=archive`. Preverjanje je zato **uspelo vedno**, tudi če bi bil ticket arhiviran. | pričakovani rezultat |
| 2 | Predpogoji niso bili preverjeni: naročilo 3001 ne obstaja (TP-01), KRJ-15 je na L1 pri Nini (TP-02), Eva nima obvestil (TP-02), stanje KRJ-3 in artikel z rešitvijo Vračilo (TP-03), tri sporočila brez prevzemnika (TP-04), Nina na seznamu (TP-05). | predpogoji |
| 3 | Vmesni pričakovani odzivi niso bili preverjeni: odprt obrazec, izbrana vrsta Kakovost, vpisane vrednosti, privzeti prevzemnik (TP-01 koraki 1–3); obrazec predaje (TP-02 k. 2); besedilo potrditvenega polja (TP-03 k. 1); vrednosti obrazca (TP-05 k. 2). | koraki |
| 4 | Status, nivo in lastnik so se preverjali s `body` vsebuje »V delu«, »L3«, »Administrator«. To besedilo se pojavi tudi drugje na strani (nit, seznam, meni), zato preverjanje ne dokazuje stanja ticketa. | pričakovani rezultat |
| 5 | »Brez osebnega lastnika« (TP-02) se je preverjal samo z obstojem besedila »čaka, da ga nekdo …«, ne pa z odsotnostjo imena lastnika. | pričakovani rezultat |
| 6 | Končni rezultat TP-01 »obstaja **en** nov ticket za naročilo 3001« ni bil preverjen. | pričakovani rezultat |
| 7 | TP-05: nivo obstoječe Nine, prazen e-mail in neoznačena izbira Administrator niso bili preverjeni. | testni podatki |
| 8 | Lokatorji `.last()` za gumb »Predaj naprej« in za polje gesla sta odvisna od vrstnega reda elementov v DOM. | robustnost |

## Pregled novih skript

Oznake: ✔ izpolnjeno, ◐ izpolnjeno z utemeljenim odstopanjem.

### TP-01 Odpiranje novega ticketa

| Merilo | Ocena | Kako skripta to zagotovi |
|---|---|---|
| Predpogoji | ✔ | Sveže seme (fixture `freshDatabase`). Iskanje `?q=3001` (gre čez vsa stanja, tudi Arhiv) vrne 0 zadetkov. Admin je prijavljen in na strani Tiketi. |
| Testni podatki | ✔ | Vsi podatki iz primera so v objektu `data` na vrhu skripte: vrsta, naročilo, naslov, e-mail, ime, prioriteta, opis, prevzemnik. |
| Koraki 1–5 | ✔ | K1: dialog »Nov ticket« je viden. K2: `aria-pressed="true"` na gumbu Kakovost in vrednosti vseh štirih polj. K3: izbrana prioriteta Visoka, prevzemnik Administrator, ime stranke. K4: URL `KRJ-n`, naslov h1, ključ v glavi. K5: po osvežitvi številka naročila, vrsta, status, nivo in prioriteta v **glavi ticketa**; polja naročila, imena, e-maila in prioritete; prevzemnik v **okviru lastnika**; opis v niti natanko enkrat. |
| Končni rezultat | ✔ | Iskanje `?q=3001` vrne natanko 1 zadetek, ki vodi na ustvarjeni ključ. |
| Robustnost | ✔ | Lokatorji po vlogi in dostopnem imenu (`getByRole`, `exact`), omejeni na dialog ali glavo ticketa. Brez fiksnih pavz. Ključ ni vnaprej določen (pričakovanje je samo oblika `KRJ-n`). |

### TP-02 Predaja ticketa drugemu nivoju

| Merilo | Ocena | Kako skripta to zagotovi |
|---|---|---|
| Predpogoji | ✔ | Prva prijava Eve in Nine z zamenjavo gesla skozi vmesnik. Eva ima prazna obvestila (»Vse je pregledano«). K1 preveri izhodiščno stanje KRJ-15 (2125, V delu, L1, Nina Vidmar). |
| Testni podatki | ✔ | Prejemnik »2. nivo — obvesti vse«, točen komentar, novo geslo Eve. |
| Koraki 1–5 | ✔ | K2: polje »Predaj komu«. K3: obrazec se zapre; L2, V delu; okvir lastnika kaže »2. nivo« in »čaka, da ga nekdo s tega nivoja prevzame« (ime je nadomeščeno, ne samo dopisano); v niti natanko en dogodek »je predal« s komentarjem. K4: natanko eno obvestilo »#2125 · Nina Vidmar« s komentarjem. K5: obvestilo odpre KRJ-15; po osvežitvi L2, brez prevzemnika, komentar v niti. |
| Končni rezultat | ✔ | Pokrit v K3–K5. |
| Robustnost | ✔ | Gumb za potrditev je poiskan znotraj obrazca, ki vsebuje »Predaj komu« (namesto `.last()`). Čakanje z `expect` (samodejno ponavljanje do 15 s). |

### TP-03 Zavrnitev zaključka brez potrditve vračila

| Merilo | Ocena | Kako skripta to zagotovi |
|---|---|---|
| Predpogoji | ✔ | Eva prijavljena. KRJ-3: naročilo 1690, vrsta Refund, V delu, L2, prevzemnica Eva Kranjc. En artikel »Kroj Rain Jacket«, velikost M, rešitev Vračilo. Zapišeta se število dogodkov v niti in število ticketov v Arhivu. |
| Testni podatki | ✔ | Opis rešitve »Refund 119 EUR izveden.«, polje neoznačeno. |
| Koraki 1–4 | ◐ | K1: potrditveno polje z natančnim besedilom iz primera (in artiklom »Kroj Rain Jacket Yellow / M«). K2: vpisano besedilo, polje ni označeno. K3: točno sporočilo napake, obrazec ostane odprt. K4: po osvežitvi V delu, gumb »Zaključi« je še na voljo, število dogodkov v niti je nespremenjeno in vnesenega opisa ni v niti. V Arhivu je enako število ticketov in ni naročila 1690. |
| Odstopanje | ◐ | Primer predvideva »preveri Arhiv z iskanjem naročila 1690«. Iskanje v aplikaciji (`?q=`) pa namenoma ne upošteva stanja (»iskanje gre tudi po arhivu«, `src/lib/issue-filter.ts`), zato bi vrnilo tudi odprti KRJ-3 in ne bi dokazalo ničesar. Skripta zato preveri seznam Arhiva neposredno. Predlog: v naslednji različici primera besedilo koraka 4 spremeniti v »preveri seznam Arhiva«. |
| Robustnost | ✔ | Potrditveno polje po dostopnem imenu, velikost po atributu `title`. Brez fiksnih pavz. |

### TP-04 Odgovor stranki v demo nabiralniku

| Merilo | Ocena | Kako skripta to zagotovi |
|---|---|---|
| Predpogoji | ✔ | Admin prijavljen. Pogovor Lara Vzorčni, »Vračilo — naročilo #2125«, e-mail lara.vzorcni@example.com, povezava »Odpri ticket« na KRJ-15, tri sporočila, prevzemnik »Nedodeljeno«. |
| Testni podatki | ✔ | Točno besedilo odgovora. |
| Koraki 1–5 | ✔ | K1: pogled »Odprto« izbran izrecno, pogovor natanko enkrat na seznamu. K2: skripta počaka, da se naloži osnutek (polje ni prazno), ga izbriše in preveri, da polje vsebuje samo testni odgovor. K3: točna potrditev; sporočil je 4, zadnje je odhodno (podpora@kroj.example) z odgovorom; besedilo je na strani natanko enkrat. K4: pogovor je v »Čakamo«, odgovor ohranjen, prevzemnik Administrator. K5: po osvežitvi odgovor ostane (natanko enkrat), »Odpri ticket« vodi na KRJ-15 (2125), lastnica Nina Vidmar. |
| Končni rezultat | ✔ | Pokrit v K3–K5. |
| Robustnost | ✔ | Čakanje na osnutek prepreči tekmo med nalaganjem osnutka in vnosom. Navigacija se preverja z `expect(page).toHaveURL()`, ker Next.js menja naslov brez polnega nalaganja strani. |

### TP-05 Zavrnitev podvojenega uporabniškega imena

| Merilo | Ocena | Kako skripta to zagotovi |
|---|---|---|
| Predpogoji | ✔ | Admin prijavljen. K1 preveri »6 aktivnih · 6 skupaj« in vrstico @nina (Nina Vidmar, nivo 1). |
| Testni podatki | ✔ | Ime, uporabniško ime, jezik Slovenščina, 1. nivo in geslo so vpisani in preverjeni; e-mail je prazen, Administrator ni označen. |
| Koraki 1–4 | ✔ | K1: zavihek »Uporabniki« izbran izrecno. K2: dialog »Nov uporabnik« in vse vrednosti. K3: točno opozorilo, dialog ostane odprt. K4: dialog se zapre; po osvežitvi enak povzetek, natanko 6 polj »Ime«, med njimi ni »Nina Dvojnik«, »Nina Vidmar« natanko enkrat, vrstica @nina z istim imenom in nivojem. |
| Končni rezultat | ✔ | Pokrit v K3–K4. |
| Robustnost | ✔ | Vrstica uporabnika je poiskana po oznaki »@nina ·«, ne po položaju. |

## Robustnost (skupno)

- **Izbira elementov.** Lokatorji so po vlogi in dostopnem imenu (`getByRole`, `getByLabel`, `exact: true`) in omejeni na vsebnik (dialog, obrazec, glava ticketa). Za dva dela strani brez dostopnega imena sta v aplikacijo dodana atributa `data-testid="issue-header"` (glava ticketa) in `data-testid="issue-owner"` (okvir lastnika). To je edina sprememba aplikacije in ne vpliva na prikaz.
- **Čakanje.** Nobena skripta ne uporablja `waitForTimeout` ali fiksnih pavz. Vsa preverjanja so spletna (`expect(...)`), ki ponavljajo do 15 s. Pri odjemalski navigaciji se uporablja `toHaveURL` namesto `waitForURL`, ki bi v razvojnem načinu lahko čakal na dogodek `load`, ki ga ni.
- **Neodvisnost.** Shema baze se pripravi enkrat na delavca, seme pa pred **vsakim** testom (fixture `freshDatabase`). Vsak test ima nov kontekst brskalnika brez piškotkov, kar nadomesti odjavo po primeru. Gesla se pripravijo v vsakem testu znova, zato noben test ne potrebuje drugega. Testi tečejo zaporedno, ker si delijo eno testno bazo.
- **Napake brskalnika.** Fixture `browserErrors` zbere napake JavaScripta in `console.error` ter test podre, če obstajajo. To je dodatna zahteva, ki ni del testnih primerov.

## Preverjanje, da skripte res zaznajo napako (mutacijsko testiranje)

V aplikacijo sta bili začasno vneseni dve napaki. Skripte so se pognale proti produkcijski gradnji, nato je bila koda povrnjena (`git checkout`).

| Mutacija | Mesto | Pričakovano | Rezultat |
|---|---|---|---|
| Varovalka zaključka izklopljena: zaključek brez potrditve vračila uspe | `src/lib/actions/issues.ts`, pogoj `returnConfirmed` | TP-03 pade | **TP-03 pade v koraku 3**: sporočila »Potrdi, da je vračilo prispelo …« ni |
| Predaja nivoju ohrani osebnega lastnika | `src/lib/actions/issues.ts`, `assigneeId: null` → `me.id` | TP-02 pade | **TP-02 pade v koraku 3**: pričakovano »2. nivo«, prejeto »Nina Vidmarjaz« |

Skripta iz 2. naloge druge mutacije ne bi zaznala v koraku 3, ker je preverjala samo prisotnost besedila čakanja.

## Rezultati zagonov (5. 11. 2026)

| Način | Ukaz | Rezultat |
|---|---|---|
| CI (produkcijska gradnja, Chromium) | `CI=true bun run test:e2e` | 5/5 uspešnih |
| CI, vsak test 2× brez ponovitev | `CI=true bunx playwright test --repeat-each=2 --retries=0` | 10/10 uspešnih (stabilnost in neodvisnost) |
| Lokalno (`next dev`, Google Chrome) | `bun run test:e2e` | 3/5 uspešnih; TP-02 in TP-03 padeta **samo** pri preverjanju konzole zaradi NAP-01 |
| Enotski testi | `bun run test` | 281/281 |

NAP-01 (React opozorilo »Each child in a list should have a unique "key" prop« v `BulkOrderGrid`) se izpiše samo v razvojnem načinu, zato ga cevovod, ki testira produkcijsko gradnjo, ne zazna. Napaka ostaja odprta.

## Vključitev v cevovod

Skripte so del obstoječega cevovoda `.github/workflows/e2e.yml` (GitHub Actions), opisanega v `izbira-orodja.md`. Playwright pobere vse datoteke `tests/e2e/*.spec.ts`, zato dodatna nastavitev ni potrebna. Ob vsakem pushu na vejo `feature/naloga-2-funkcionalni-testi`:

1. posel »Tipi in enotski testi«: `typecheck` in `bun run test`,
2. posel »Funkcionalni testi (Playwright)«: produkcijska gradnja in TP-01 do TP-05,
3. rezultati: preverjanje »Rezultati funkcionalnih testov« (JUnit, po en vnos na testni primer), opombe ob vrsticah ob neuspehu ter artefakta `playwright-report` (HTML s koraki in posnetki) in `test-results` (posnetki, sledi, `junit.xml`, `results.json`).
