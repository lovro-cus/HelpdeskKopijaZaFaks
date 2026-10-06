import "server-only";

import { db } from "./db";

/**
 * Prvi zapis poteka — tisto, kar danes res delamo, vključno z mesti, kjer
 * poteka nihče ni določil. Vsebina od tu naprej živi v bazi: ekipa jo popravlja
 * sama, seme se zasadi samo v prazno tabelo in nikoli ne prepiše urejenega.
 */

type Seed = {
  key: string;
  title: string;
  subtitle?: string;
  steps: SeedStep[];
};

type SeedStep = {
  kind: string;
  title: string;
  body?: string;
  edgeLabel?: string;
  open?: string[];
  children?: SeedStep[];
};

const SEED: Seed[] = [
  {
    key: "0",
    title: "Prvi stik",
    subtitle: "mail prispe v podpora@kroj.example",
    steps: [
      {
        kind: "sys",
        title: "Prejeto — nit se veže na naročilo",
        body: "po številki v pismu · po e-naslovu stranke · sicer nov ticket",
      },
      {
        kind: "dec",
        title: "Kaj stranka hoče?",
        body: "odgovor določi vejo: A vračilo · B sledenje · C neodpremljeno · D naslov · E preklic · F kakovost",
        open: ["Ali pošljemo samodejno potrditev, da smo mail prejeli", "V kakšnem roku se zavežemo odgovoriti"],
      },
    ],
  },
  {
    key: "A",
    title: "Vračilo in menjava",
    subtitle: "najdaljša in najpogostejša pot",
    steps: [
      {
        kind: "dec",
        title: "Je paket že poslala?",
        children: [
          {
            kind: "mail",
            edgeLabel: "NE",
            title: "Pišemo, kam in kako vrniti",
            body: "in prosimo za tracking številko, ko odda paket",
            open: [
              "Naslov, kam stranka pošlje paket",
              "Kdo plača poštnino vračila",
              "Do kdaj sme stranka vrniti",
              "Kaj mora biti v paketu (številka naročila, embalaža)",
            ],
            children: [
              { kind: "wait", title: "Čakamo paket", body: "ticket na čakanju · tracking spremlja sistem" },
            ],
          },
          {
            kind: "act",
            edgeLabel: "DA",
            title: "Vprašamo tracking, preverimo register",
            body: "paket je pogosto že pri nas, a nepovezan — pošiljatelj je podjetje in ne stranka",
            open: ["Kaj odgovorimo, kadar stranka nima tracking številke in paketa ni v skladišču"],
          },
        ],
      },
      {
        kind: "sys",
        title: "Paket prispe — povežemo ga z naročilom",
        body: "gotovost ujemanja: visoka / srednja / nizka; pri nizki je odprema menjave blokirana",
      },
      {
        kind: "dec",
        title: "Stanje vsebine",
        body: "v redu → naprej",
        open: [
          "Kaj napišemo, ko je vrnjen kos poškodovan ali nošen",
          "Kaj, ko v paketu kos manjka",
          "Kaj, ko je vrnjen napačen kos",
          "Meja vrednosti, do katere odločimo v korist stranke brez spraševanja",
        ],
      },
      {
        kind: "mail",
        title: "Pismo: »Vračilo kupnine ali menjava?«",
        body: "predloga v jeziku stranke · ticket gre na čakanje",
        children: [
          {
            kind: "act",
            edgeLabel: "vračilo",
            title: "Vračilo kupnine",
            body: "izvede se v spletni trgovini",
            open: ["V kakšnem roku vrnemo denar po prejemu paketa", "Ali pošljemo potrditev, da je vračilo izvedeno"],
            children: [{ kind: "end", title: "Zaprto — denar vrnjen" }],
          },
          {
            kind: "mail",
            edgeLabel: "menjava",
            title: "Pismo: »Katero velikost naj pošljemo?«",
            body: "odgovor vpišemo kot želeno različico pri postavki",
            children: [
              {
                kind: "dec",
                title: "Je kos na zalogi?",
                children: [
                  {
                    kind: "act",
                    edgeLabel: "DA",
                    title: "Rezerviramo in odpremimo",
                    body: "odprema je mogoča samo pri visoki gotovosti ujemanja",
                    children: [
                      {
                        kind: "mail",
                        title: "Pismo: »Nadomestek je odposlan«",
                        body: "nastane samo ob odpremi, s tracking številko",
                        children: [{ kind: "end", title: "Zaprto — menjava odposlana" }],
                      },
                    ],
                  },
                  {
                    kind: "undef",
                    edgeLabel: "NE",
                    title: "Kosa ni na zalogi",
                    body: "danes se vsak odloči po svoje",
                    open: ["Ponudimo drugo barvo?", "Čakamo dobavo in koliko časa?", "Predlagamo vračilo kupnine?"],
                  },
                ],
              },
            ],
          },
          {
            kind: "undef",
            edgeLabel: "brez odgovora",
            title: "Stranka ne odgovori",
            body: "paket leži v skladišču: 14 dni brezplačno, nato 0,60 € na dan (opozorilo 10. dan)",
            open: [
              "Koliko opomnikov pošljemo in v kakšnih razmikih",
              "Kaj naredimo s paketom, ki po X dneh še leži",
              "Ali stranko na skladiščnino sploh opozorimo",
            ],
          },
        ],
      },
    ],
  },
  {
    key: "B",
    title: "Kje je moj paket",
    subtitle: "sledenje",
    steps: [
      {
        kind: "dec",
        title: "Se pošiljka premika?",
        children: [
          { kind: "act", edgeLabel: "DA", title: "Povemo, kje je", body: "in kdaj naj bi prispela" },
          {
            kind: "wait",
            edgeLabel: "NE",
            title: "Ročna pomoč",
            body: "48 h brez zapisa številke ali 7 dni brez dogodka; vpraša človek",
            open: [
              "Po kolikšnem času je paket izgubljen in kaj takrat ponudimo",
              "Kdo krije škodo",
              "Kaj s paketom, ki ga stranka ne prevzame in se vrne",
              "Kdo ureja carino in kdo plača dajatve",
            ],
          },
        ],
      },
    ],
  },
  {
    key: "C",
    title: "Naročilo ne odide",
    subtitle: "neodpremljeno",
    steps: [
      { kind: "sys", title: "Dnevno preverjanje naročil", body: "ob odpremi zapiše v nit in zbudi ticket iz čakanja" },
      {
        kind: "act",
        title: "Povemo stanje in pošljemo tracking",
        body: "za več naročil hkrati: skupinsko pismo, vsakemu v njegovem jeziku",
        open: ["Po kolikšni zamudi pišemo sami", "Kdaj ponudimo preklic namesto čakanja", "Ali ob veliki zamudi kaj ponudimo"],
      },
    ],
  },
  {
    key: "D",
    title: "Napačen naslov",
    steps: [
      {
        kind: "dec",
        title: "Je naročilo že odpremljeno?",
        children: [
          { kind: "act", edgeLabel: "NE", title: "Popravimo naslov", body: "v trgovini in v ticketu, stranki potrdimo" },
          {
            kind: "undef",
            edgeLabel: "DA",
            title: "Paket je že na poti",
            open: ["Preusmeritev pri prevozniku?", "Čakamo, da se vrne?", "Kdo plača drugo pošiljanje?"],
          },
        ],
      },
    ],
  },
  {
    key: "E",
    title: "Preklic naročila",
    steps: [
      {
        kind: "dec",
        title: "Je naročilo že odpremljeno?",
        children: [
          { kind: "end", edgeLabel: "NE", title: "Prekličemo in vrnemo denar" },
          {
            kind: "act",
            edgeLabel: "DA",
            title: "Preklic ni več mogoč → pot vračila (A)",
            open: ["Kje je meja »še se da preklicati«", "Ali za preklic po odpremi zaračunamo poštnino"],
          },
        ],
      },
    ],
  },
  {
    key: "F",
    title: "Poškodba ali napaka",
    subtitle: "reklamacija",
    steps: [
      { kind: "act", title: "Zahtevamo fotografijo", body: "pripnemo jo v ticket in presodimo, ali gre za napako ali za transport" },
      {
        kind: "undef",
        title: "Ponudimo nadomestek ali vračilo",
        open: [
          "Ali mora poškodovan kos nazaj, preden gre nadomestek ven",
          "Kdo plača poštnino vračila pri reklamaciji",
          "Kdaj gre reklamacija na proizvajalca in kdo o tem odloči",
        ],
      },
    ],
  },
  {
    key: "R",
    title: "Robni primeri",
    subtitle: "kar pot prelomi",
    steps: [
      { kind: "sys", title: "Paket pride brez najave", body: "poveže ga človek, ko prepozna vsebino" },
      { kind: "sys", title: "Pošiljatelj je podjetje, ne stranka", body: "sistem povezave ne predlaga — poveže se ročno" },
      { kind: "sys", title: "Dva paketa za eno naročilo", body: "vsak je svoj zapis, oba na istem ticketu" },
      { kind: "undef", title: "En paket za dve naročili", body: "en fizični paket sme pripadati samo enemu zapisu", open: ["Kako vodimo en paket za dve naročili"] },
      { kind: "sys", title: "Paket tega naročila je že odšel", body: "register javi in ponudi zaprtje zapisa" },
      { kind: "undef", title: "Stranka si premisli: vračilo → menjava", open: ["Kaj, če je denar že vrnjen"] },
      { kind: "sys", title: "Stranka piše z drugega e-naslova", body: "pismo se ne poveže samo — poveže se ročno" },
      { kind: "sys", title: "En mail, dve naročili", body: "primera vodimo ločeno, odgovor je en" },
      { kind: "undef", title: "Delno vračilo (2 od 3 kosov)", body: "postavke se označijo ločeno", open: ["Kako obračunamo poštnino pri delnem vračilu"] },
      { kind: "dec", title: "Menjava spet ne ustreza", body: "druga menjava je dovoljena: napaka pri nas → stranka kos obdrži; sicer ga vrne in sama plača menjavo" },
      { kind: "undef", title: "Jezik, ki ga ne pokrivamo", open: ["V katerem jeziku odgovorimo"] },
      { kind: "undef", title: "Grožnje, chargeback, pritožba", open: ["Kdo prevzame primer in v kakšnem roku"] },
      { kind: "undef", title: "Naročilo je staro več mesecev", open: ["Ali rok vračila oz. garancija še velja"] },
    ],
  },
];

let seeding: Promise<void> | null = null;

/** Zasadi seme samo v prazno tabelo — urejenega poteka nikoli ne prepiše. */
export async function ensureProcessSeeded(): Promise<void> {
  if (seeding) return seeding;
  seeding = (async () => {
    if ((await db.processBranch.count()) > 0) return;

    for (const [index, branch] of SEED.entries()) {
      const created = await db.processBranch.create({
        data: { key: branch.key, title: branch.title, subtitle: branch.subtitle ?? null, position: index },
      });
      await insert(created.id, null, branch.steps);
    }
  })().catch((error) => {
    // Ob spodletelem semenu poskusimo znova pri naslednjem branju.
    seeding = null;
    throw error;
  });
  return seeding;
}

async function insert(branchId: string, parentId: string | null, steps: SeedStep[]): Promise<void> {
  for (const [index, step] of steps.entries()) {
    const created = await db.processStep.create({
      data: {
        branchId,
        parentId,
        kind: step.kind,
        title: step.title,
        body: step.body ?? null,
        edgeLabel: step.edgeLabel ?? null,
        open: step.open?.join("\n") ?? null,
        position: index,
      },
    });
    if (step.children?.length) await insert(branchId, created.id, step.children);
  }
}
