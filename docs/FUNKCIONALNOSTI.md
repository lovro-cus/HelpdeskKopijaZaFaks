# Ključne funkcionalnosti — HelpDesk

Aplikacija nadomešča skupinski klepet, v katerem podpora strankam poroča težave
z naročili. Vsako problematično naročilo je **ticket** s kronološko nitjo
dogodkov. Delo teče po **nivojih**: 1. nivo odpre in preda, 2. ali 3. nivo zaključi.

| # | Funkcionalnost | Kdo | Kje |
|---|---|---|---|
| 1 | Odpiranje ticketa | vsi | Tiketi → Nov ticket (bližnjica N) |
| 2 | Predaja ticketa višjemu nivoju | vsi | stran ticketa → Predaj naprej |
| 3 | Zaključevanje ticketa | nivo ≥ 2 | stran ticketa → Zaključi |
| 4 | Pregled pošte in odgovor stranki | vsi | Prejeto; stran ticketa → Pošta |
| 5 | Rezervacija paketa iz zaloge za menjavo | nivo ≥ 2 | stran ticketa; ShipG zaloga |
| 6 | Naročilo pri dobavitelju | nivo ≥ 2 | Dobavitelj |
| 7 | Pregled zadovoljstva strank | pravica »Zadovoljstvo« | Urejanje → Zadovoljstvo |
| 8 | Upravljanje uporabnikov | administrator | Nadzorna plošča → Uporabniki |
| 9 | Urejanje kataloga izdelkov | administrator, pravica »Izdelki« | Urejanje → Izdelki |
| 10 | Urejanje nastavitev | administrator | Nadzorna plošča → Nastavitve; Urejanje |

## 1. Odpiranje ticketa
Uporabnik vpiše številko naročila, stranko, artikle (izdelek, velikost, barva,
znesek, rešitev: vračilo / menjava / brez ukrepa) in vrsto težave. Doda lahko
slike (tudi s Ctrl+V). Ticket dobi ključ `KRJ-n` in se pokaže kot kvadrat v mreži.

## 2. Predaja ticketa višjemu nivoju
Lastnik ticket s komentarjem preda naslednjemu nivoju. Prejemnik dobi obvestilo
v zvoncu. Vsak sme dodati vnos k tujemu ticketu; tak vnos je označen kot
»zunanji vnos«.

## 3. Zaključevanje ticketa
Zaključi lahko samo nivo 2 ali več. Pri vrstah, ki zahtevajo vračilo, mora biti
paket potrjeno nazaj. Zaključen ticket gre v Arhiv; če stranka po zaprtju znova
piše, se ticket sam ponovno odpre.

## 4. Pregled pošte in odgovor stranki
Zavihek Prejeto zbere pogovore s strankami (odprto, moje, čakamo, brez ticketa)
in jih poveže s ticketi po številki naročila in naslovu. Uporabnik prebere
pogovor in odgovori s hitrim odgovorom (navodila za vračilo, vračilo ali menjava)
ali lastnim besedilom. Na strani ticketa je ista pošta prikazana ob niti.

## 5. Rezervacija paketa iz zaloge
Zaloga so vrnjeni paketi v zunanjem skladišču (pregled po paketih ali po sestavi).
Pri menjavi aplikacija sama poišče paket z želenim kosom (isti izdelek iz različnih
trgov šteje kot isti kos) in ga ponudi za rezervacijo. Primer: ticket 1140 →
majica Črna · L.

## 6. Naročilo pri dobavitelju
Če kosa ni v zalogi, gre zahteva dobavitelju. Uporabnik prenese seznam (Excel),
dobavitelj vrne datoteko s tracking številkami, ob uvozu se vsaka številka vpiše
v svoj ticket. Dobavitelj ima tudi lasten portal brez računa.

## 7. Pregled zadovoljstva strank
Vsak zaključen ticket ima oceno zadovoljstva 1–10 z razlogom (v kopiji izmišljeno). Stran prikaže
povprečje, porazdelitev in seznam nizkih ocen »Za pregled«, ki jih vodja označi
kot pregledane. Iz ocene se lahko pripravi zahvalno pismo stranki.

## 8. Upravljanje uporabnikov
Registracije ni. Administrator ustvari račun, določi nivo, administratorske
pravice, jezik vmesnika in področja urejanja, ponastavi geslo ali račun
deaktivira. Vidi tudi aktivne seje in dnevnik dejavnosti (gost teh dveh ne vidi).

## 9. Urejanje kataloga izdelkov
Izdelki z različicami (barva, velikost, spol) in skupine, ki združijo isti
fizični kos iz različnih trgov (npr. Everyday Chinos in Alltags-Chino).
Aplikacija sama predlaga, kateri izdelki spadajo skupaj.

## 10. Urejanje nastavitev
Vrste ticketov in prioritete, predloge pisem strankam, jeziki pisem, pragovi
(npr. nizka ocena zadovoljstva, starost paketov v skladišču), ime dobavitelja.

## Dodatno
- dvojezičen vmesnik (slovenščina, angleščina), svetla in temna tema,
- iskanje po naročilu, stranki, naslovu in trackingu,
- obvestila v zvoncu z nastavitvami po vrsti dogodka.
