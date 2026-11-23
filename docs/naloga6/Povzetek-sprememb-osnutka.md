# Povzetek sprememb osnutka agenta

Osnutek testnega plana je pripravil agent Claude Code (22. 11. 2026). Osnutek sem pregledal 23. 11. 2026. Vsako predpostavko agenta sem preveril v kodi in v dokumentih nalog 2–5. Spodaj je za vsako predpostavko moja odločitev in seznam sprememb v planu.

## Predpostavke agenta in moje odločitve

| # | Mesto v planu | Predpostavka agenta | Kaj sem preveril | Moja odločitev |
|---|---|---|---|---|
| 1 | 1.1 | Različica 1.1 vsebuje SP-1–SP-7. | Vsaka sprememba ima vir v nalogi 2, 4 ali 5. SP-6 je samo besedilo, a ga TP-04 že pokriva (en korak več). Mesto v kodi pri SP-6 je bilo napačno: gumb »Pošlji kot Ana« je v `src/components/InboxWorkspace.tsx`, ne v `dictionaries.ts`. Izvor NAP-01 (SP-1) v 2. nalogi ni potrjen, osnutek pa ga navaja kot gotovega. | Obseg obdržim. SP-6 ostane, ker je poceni. Popravim mesto v kodi za SP-6 in SP-1 označim kot »verjetno«. |
| 2 | 1.1, SP-5 | Pravilo za številko naročila ni odločeno; plan zato blokira 4 različice (vstopno merilo, R-9). | `createIssue` sprejme 1–40 znakov. `looksLikeOrderNumber` (`src/lib/order-number.ts`, ne `issues.ts`) se uporablja samo v iskanju, da ponudi »Odpri ticket«. Seme vsebuje številke z vodilno ničlo (`0912`, `0934` …). | Pravili si ne nasprotujeta, ker imata različen namen. Velja 1–40 znakov; `0912` ≠ `912`. Koda se ne spremeni, odločitev zapišem v komentar. Odstranim vstopno merilo in R-9; različice TP-01.10, .11, .17, .18 ostanejo, kot so. |
| 3 | glava, 8 | Skupina ima dva člana, vloge Študent A / Študent B. | Razdelitev je smiselna: lastnik HelpDeska piše teste, drugi član jih pregleda in izvede mutacije (ločitev avtorja in preveritelja). | Vloge obdržim. **Imena vpišemo pred oddajo.** |
| 4 | 8 | Roki 25. 11. – 9. 12. 2026. | Vrstni red je pravilen: odločitev SP-5 → koda in testi → pregled → mutacije → poročilo. Plan opisuje naslednjo različico, zato roki niso vezani na rok oddaje te naloge. | Roke obdržim. |
| 5 | 3 | Mobilni prikaz in drugi brskalniki so izključeni, ker podpora uporablja namizni Chrome. | Tega ni nikjer v nalogah 2–5; v 2. nalogi je samo zapisano, da smo testirali namizni Chrome. Koda pa ima mobilno postavitev (`globals.css`: `@media (max-width: 639px)`, `hover: none`). | Firefox in WebKit ostaneta izključena. Mobilnega prikaza ne izključim v celoti: dodam ročni pregled (sklop C v raziskovalnem testiranju). Razlog v tabeli zapišem pošteno (»ni preverjeno«). |
| 6 | 4.2, R-7 | Vseh 73 različic teče ob vsakem pushu. | Vsaka različica potrebuje prijavo in oddajo obrazca. 73 različic lahko preseže cilj 10 min. | Avtomatiziramo vseh 73, ampak ob pushu teče samo izbor `@hitro` (vse MV, vse [dodano], ena veljavna na funkcionalnost). Vseh 73 teče ob PR na `main` (to omogoči SP-7). |
| 7 | 5.2 | Lokalni zagon mora uspeti (implicitno pri vseh članih). | Študent B ima nameščen svoj projekt (eNormativi), HelpDeska pa ne. NAP-01 je viden samo v `next dev`. | Lokalni zagon ostane obvezen, izvede ga Študent A (Windows 11, Chrome) in rezultat zapiše v poročilo. |
| 8 | 4.1 | Raziskovalno testiranje traja 60 min. | 60 min brez cilja ne da primerljivega rezultata. | Čas obdržim, razdelim ga na 3 sklope po 20 min z namenom: A – vnos vrednosti (SP-2), B – uporabniki in geslo (SP-3, SP-4), C – mobilni prikaz. |
| 9 | 10 | Stopnje resnosti in primeri. | Primeri so iz naših nalog. Manjkala sta U-5 in U-6. Pravilo »zapremo samo z avtomatiziranim testom« ne deluje za napake postavitve. | Stopnje obdržim. U-5 dodam pod srednja, U-6 pod nizka. Dodam izjemo: napako postavitve zapremo s posnetkom pred popravkom in po njem. |

## Spremembe v planu

| # | Kaj sem spremenil | Zakaj |
|---|---|---|
| 1 | SP-5: »odločitev je odprta« → zapisana odločitev (1–40 znakov, `0912` ≠ `912`, brez spremembe kode); popravljeno mesto v kodi | Agent je dve funkciji z različnim namenom razumel kot nasprotje. Seme dokazuje, da vodilne ničle obstajajo. |
| 2 | Odstranjeno vstopno merilo o SP-5 in tveganje R-9; posodobljena vrstica SP-5 v sledljivosti in naloga 1 v razporedu | Z odločitvijo blokade ni več. |
| 3 | SP-6: mesto v kodi `InboxWorkspace.tsx` in ključ `thread.customerEmail.sent` | Agent je navedel napačno datoteko. |
| 4 | SP-1: mesto v kodi označeno kot »verjetno« | V 2. nalogi izvor NAP-01 ni bil potrjen. |
| 5 | Poglavje 3: mobilni prikaz ločen od Firefoxa/WebKita, razlog popravljen | Trditev »podpora uporablja namizni Chrome« ni preverjena; aplikacija ima mobilno postavitev. |
| 6 | 4.1, 4.2, R-7: oznaka `@hitro` ob pushu, vseh 73 ob PR na `main` | Hiter cevovod ob pushu, celoten nabor pred združitvijo. |
| 7 | 4.1, razpored: raziskovalno testiranje v sklopih A–C | Vsak sklop ima namen in je vezan na spremembo v 1.1. |
| 8 | 5.2, R-1: lokalni zagon izvede Študent A in ga zapiše v poročilo | Zahteva mora biti izvedljiva; drugi član nima HelpDeska. |
| 9 | 10: U-5 (srednja), U-6 (nizka), izjema za napake postavitve | Primeri pokrijejo vse spremembe; pravilo zapiranja deluje tudi za sklop C. |
| 10 | Glava: različica plana 1.1, datum predelave | Iz glave je vidno, da plan ni več samo osnutek. |

## Pogovor z agentom

Izvoz obeh pogovorov z agentom: [agent_threads.md](agent_threads.md) (HTML: `agent_threads.html`).
