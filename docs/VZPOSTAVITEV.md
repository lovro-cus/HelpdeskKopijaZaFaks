# Vzpostavitev — HelpDesk

HelpDesk je spletna aplikacija za podporo strankam spletne trgovine (izmišljena
trgovina oblačil **Kroj**). Vsi podatki so izmišljeni, aplikacija nima povezav
na zunanje storitve.

- Glavni način dela: lokalni zagon (spodaj)
- Testna kopija na strežniku: https://test.2-28-52-70.sslip.io
- Prijava za ogled: `gost` / `Gost-Kroj-2026`

## Tehnologije

| Del | Tehnologija |
|---|---|
| Ogrodje | Next.js 15 (App Router, strežniške akcije), React 19, TypeScript (strict) |
| Baza | SQLite prek Prisma ORM 6 |
| Oblikovanje | Tailwind CSS 4 |
| Testi | vgrajeni `node:test`, zagnan s `tsx` |
| Postavitev | Docker (Node 22 Alpine), Caddy kot obratni posrednik s HTTPS |

## Lokalni zagon

Zahteve: **Node.js 22 ali novejši**, npm, git.

```bash
git clone https://github.com/lovro-cus/HelpdeskKopijaZaFaks.git
cd HelpdeskKopijaZaFaks
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
npm run setup               # ustvari bazo (prisma/dev.db) in jo napolni z izmišljenimi podatki
npm run dev                 # http://localhost:3000
```

`npm run setup` požene `prisma db push` (shema → baza) in `prisma/seed.ts`, ki
ustvari 31 ticketov, 15 paketov v skladišču, 33 e-poštnih pogovorov, ocene
zadovoljstva in naročila pri dobavitelju.

Računi (geslo za vse razen gosta je `DEMO_PASSWORD` iz `.env`, privzeto `Kroj-Demo-2026`):

| Uporabnik | Vloga |
|---|---|
| `Admin` | administrator |
| `nina`, `ali` | 1. nivo (zahtevata zamenjavo gesla ob prvi prijavi) |
| `eva` | 2. nivo |
| `marko` | 3. nivo |
| `gost` / `Gost-Kroj-2026` | 3. nivo, admin samo za ogled (gesla ni mogoče zamenjati) |

### Uporabni ukazi

```bash
npm run typecheck   # preverjanje tipov (tsc --noEmit)
npm test            # enotski testi
npm run db:seed     # POBRIŠE bazo in jo znova napolni
npm run build       # produkcijska gradnja
```

## Brez zunanjih storitev

Aplikacija dela samo z lastno bazo:

- **pošta strank** je izmišljen nabiralnik v tabeli `DemoMail`
  (`src/lib/demo-mailbox.ts`); odgovor iz aplikacije se zapiše v pogovor,
  nikamor ne odide,
- **zaloga** so izmišljeni paketi v bazi (`ShipGermanCachedParcel`, `ShipgReturn`),
- **naročila trgovine, sledenje pošiljkam, AI in strojno prevajanje** niso
  povezani: moduli `src/lib/shopify.ts`, `shipgerman.ts`, `tracking/offline.ts`,
  `groq.ts`, `translation.ts` ohranijo vmesnik, a vrnejo »ni podatka« oz.
  »ni nastavljeno«,
- **sistemska pošta** ekipi se ne pošilja; obvestila so v zvoncu v aplikaciji,
- `src/lib/sandbox.ts` ob zagonu zavrne vsako zahtevo `fetch` izven `localhost`.

## Postavitev na strežnik

Aplikacija teče v Dockerju na lastnem strežniku (Ubuntu, Docker Compose).
`docker-compose.yml` zgradi sliko iz `Dockerfile`; ob zagonu zabojnik uskladi
shemo (`prisma db push`) in v prazno bazo zasadi izmišljene podatke
(`prisma/seed.cjs --if-empty`). Javni HTTPS zagotavlja Caddy z Let's Encrypt
certifikatom (domena `sslip.io`).

Namestitev trenutnega commita:

```bash
npm run deploy      # scripts/deploy.sh: git archive HEAD → SSH → docker compose up -d --build
```

Sveža baza na strežniku (npr. po spremembi semena):

```bash
ssh root@2.28.52.70 'cd /srv/helpdesk-faks/code && docker compose down -v'
npm run deploy
```

## Razhajanja, popravljena med vzpostavitvijo

Projekt je nastal iz večjega internega sistema, vezanega na spletno trgovino,
nabiralnik, zunanje skladišče in AI. Za vaje je bilo spremenjeno:

- odstranjena je koda vseh zunanjih integracij (API klienti, OAuth, webhooki,
  periodični urniki, cron poti) in gumbi zanje,
- odstranjena sta AI povzetek pošte in AI osnutek odgovora ter prevajanje,
- pošto nadomešča izmišljen nabiralnik v bazi,
- seme baze in katalog izdelkov sta izmišljena,
- dodan je račun za ogled `gost` (admin samo za ogled).
