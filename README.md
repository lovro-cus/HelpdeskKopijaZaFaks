# HelpDesk

Spletna aplikacija za podporo strankam spletne trgovine z oblačili (izmišljena
trgovina **Kroj**). Vsako naročilo s težavo — vračilo, menjava, reklamacija,
sprememba naslova, izgubljen paket — je **ticket** s kronološko nitjo dogodkov.
Delo teče po **nivojih**: 1. nivo ticket odpre in preda naprej, 2. ali 3. nivo
ga zaključi.

Projekt za vaje pri faksu. Vsi podatki (stranke, naročila, pošta, zaloga) so
izmišljeni; aplikacija nima povezav z zunanjimi storitvami.

- Projekt teče **lokalno** (glej Hiter zagon). Testna kopija na strežniku:
  https://test.2-28-52-70.sslip.io — ogled: `gost` / `Gost-Kroj-2026`
- Dokumentacija: [Vzpostavitev](docs/VZPOSTAVITEV.md) ·
  [Funkcionalnosti](docs/FUNKCIONALNOSTI.md) ·
  [Stanje testiranja](docs/STANJE-TESTIRANJA.md)

## Hiter zagon

```bash
npm install
cp .env.example .env
npm run setup     # baza + izmišljeni podatki
npm run dev       # http://localhost:3000
```

Računi: `Admin` (administrator), `nina` in `ali` (1. nivo), `eva` (2. nivo),
`marko` (3. nivo) — geslo `DEMO_PASSWORD` iz `.env`. Račun `gost` je
administrator samo za ogled. Podrobnosti v [docs/VZPOSTAVITEV.md](docs/VZPOSTAVITEV.md).

## Funkcionalnosti

1. Odpiranje ticketa z artikli in slikami
2. Predaja ticketa višjemu nivoju
3. Zaključevanje ticketa in arhiv
4. Pošta strank (Prejeto) in odgovor stranki
5. Zaloga vrnjenih paketov in rezervacija za menjavo
6. Naročila pri dobavitelju (izvoz in uvoz Excela s trackingi)
7. Ocene zadovoljstva strank
8. Upravljanje uporabnikov
9. Katalog izdelkov in skupine
10. Nastavitve (vrste ticketov, prioritete, predloge pisem, jeziki)

Opis vsake: [docs/FUNKCIONALNOSTI.md](docs/FUNKCIONALNOSTI.md).

## Struktura

```
src/app/            strani (App Router) in API poti
src/components/     React komponente
src/lib/            poslovna logika, dostop do baze, strežniške akcije (lib/actions)
prisma/             shema baze in seme z izmišljenimi podatki (seed.ts)
tests/              enotski testi (node:test)
docs/               dokumentacija za vaje
scripts/deploy.sh   namestitev na strežnik
```

## Ukazi

```bash
npm run typecheck   # preverjanje tipov
npm test            # enotski testi
npm run db:seed     # POBRIŠE bazo in jo znova napolni
npm run build       # produkcijska gradnja
npm run deploy      # namestitev trenutnega commita na strežnik
```

## Tehnologija

Next.js 15 (App Router, strežniške akcije) · React 19 · TypeScript · Prisma +
SQLite · Tailwind CSS 4 · Docker.
