/**
 * Izmišljeni demo podatki za kopijo za faks. Nobena oseba, naslov ali
 * sledilna številka ni resnična.
 *
 *   npm run db:seed              (POBRIŠE obstoječe podatke)
 *   npm run db:seed -- --if-empty   samo, če je baza prazna (zagon zabojnika)
 *
 * Geslo vseh računov: DEMO_PASSWORD iz okolja, sicer Kroj-Demo-2026.
 *
 * Za produkcijo uporabi `npm run db:bootstrap` — ta ustvari samo admina.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/password";
import { orderNumberKey } from "../src/lib/order-number";
import { GUEST_USERNAME, VUI_USERNAME } from "../src/lib/guest";

const db = new PrismaClient();

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "uploads");

// --- minimalen PNG zapisovalnik za demo priloge ----------------------------
// (Prave priloge nalagajo uporabniki; tu potrebujemo le nekaj vidnega.)

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** Nadomestna "fotografija": svetla ploskev z barvnim pasom in okvirjem. */
function placeholder(color: string) {
  mkdirSync(UPLOAD_DIR, { recursive: true });

  const W = 480;
  const H = 330;
  const [r, g, b] = hexToRgb(color);
  const raw = Buffer.alloc(H * (W * 3 + 1));

  for (let y = 0; y < H; y++) {
    const rowStart = y * (W * 3 + 1);
    raw[rowStart] = 0; // filtrirni bajt
    for (let x = 0; x < W; x++) {
      const i = rowStart + 1 + x * 3;
      const border = x < 10 || y < 10 || x >= W - 10 || y >= H - 10;
      const band = y >= 10 && y < 62 && !border;
      if (border) {
        raw[i] = 0xf0;
        raw[i + 1] = 0xf0;
        raw[i + 2] = 0xf2;
      } else if (band) {
        raw[i] = Math.round(255 - (255 - r) * 0.22);
        raw[i + 1] = Math.round(255 - (255 - g) * 0.22);
        raw[i + 2] = Math.round(255 - (255 - b) * 0.22);
      } else {
        const shade = 0xff - Math.round((y / H) * 10);
        raw[i] = shade;
        raw[i + 1] = shade;
        raw[i + 2] = shade;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bitna globina
  ihdr[9] = 2; // barvni tip: truecolor
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  const storedName = `${randomUUID()}.png`;
  writeFileSync(path.join(UPLOAD_DIR, storedName), png);
  return { storedName, mime: "image/png", size: png.length };
}

// --- podatki ---------------------------------------------------------------

type EventSeed = {
  kind: string;
  body?: string;
  field?: string;
  from?: string;
  to?: string;
  at: Date;
  by: string;
  outsider?: boolean;
  attach?: { filename: string; color: string };
};

type ItemSeed = {
  name: string;
  variant: string;
  replacementVariant?: string;
  amount?: number;
  resolution?: "refund" | "exchange" | "none";
};

type IssueSeed = {
  orderNumber: string;
  type: string;
  status: string;
  level: number;
  assignee: string;
  priority?: string;
  title?: string;
  customerName?: string;
  customerEmail?: string;
  items?: ItemSeed[];
  amount?: number;
  returnTracking?: string;
  replacementTracking?: string;
  waitingUntil?: Date;
  createdAt: Date;
  events: EventSeed[];
};

const ANA = "Nina Vidmar";
const HAMZA = "Ali Raza";
const SARA = "Eva Kranjc";
const TILEN = "Marko Zupan";

// Ime + priimek iz dveh seznamov različnih dolžin (10 in 11): do 110 ticketov
// ima vsak svojo stranko, zato se pošta različnih ticketov ne pomeša.
const FIRST_NAMES = ["Luka", "Mia", "Jan", "Zala", "Tim", "Lara", "Nik", "Ema", "Rok", "Sara"];
const LAST_NAMES = ["Testni", "Primerna", "Izmišljen", "Demo", "Vzorčni", "Poskusna", "Navidezni", "Fiktivna", "Učni", "Vaja", "Modelni"];
const fakeCustomer = (n: number) => `${FIRST_NAMES[n % FIRST_NAMES.length]} ${LAST_NAMES[n % LAST_NAMES.length]}`;

// Brez DE: tja se iz skladišča ne pošilja (glej domain.ts), drugje lahko.
const COUNTRIES = [
  { code: "SI", city: "1000 Ljubljana" },
  { code: "AT", city: "8010 Graz" },
  { code: "IT", city: "34100 Trieste" },
  { code: "HR", city: "10000 Zagreb" },
];

const fakeEmail = (name: string) =>
  `${name.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").trim().replace(/ +/g, ".")}@example.com`;

async function main() {
  if (process.argv.includes("--if-empty") && (await db.user.count()) > 0) {
    console.log("[seed] Baza že ima uporabnike — ne delam ničesar.");
    return;
  }

  await db.demoMail.deleteMany();
  await db.inboxConversation.deleteMany();
  await db.inboxSyncState.deleteMany();
  await db.shipgReturn.deleteMany();
  await db.shipGermanCachedParcel.deleteMany();
  await db.shipGermanSyncState.deleteMany();
  await db.attachment.deleteMany();
  await db.event.deleteMany();
  await db.issue.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  const password = process.env.DEMO_PASSWORD?.trim() || "Kroj-Demo-2026";
  const demoPw = await hashPassword(password);

  const users = await Promise.all([
    db.user.create({
      data: {
        username: "Admin",
        name: "Administrator",
        passwordHash: demoPw,
        level: 3,
        isAdmin: true,
        color: "#0071e3",
        locale: "sl",
      },
    }),
    db.user.create({
      data: {
        username: GUEST_USERNAME,
        name: "Gost (ogled)",
        // Admin za ogled upravljanja uporabnikov; administratorskih računov ne sme spreminjati (src/lib/guest.ts).
        isAdmin: true,
        // Da gost vidi tudi strani Urejanje (zaloga, izdelki, jeziki, zadovoljstvo).
        permissions: "warehouse,products,languages,satisfaction",
        passwordHash: await hashPassword(process.env.GUEST_PASSWORD?.trim() || "Gost-Kroj-2026"),
        level: 3,
        color: "#5e5ce6",
        locale: "sl",
      },
    }),
    db.user.create({
      data: {
        username: VUI_USERNAME,
        name: "VUI (ogled)",
        // Kot gost: ogled za predstavitev pri VUI, s preprostim geslom vui.
        isAdmin: true,
        permissions: "warehouse,products,languages,satisfaction",
        passwordHash: await hashPassword("vui"),
        level: 3,
        color: "#ff9f0a",
        locale: "sl",
      },
    }),
    db.user.create({
      data: {
        username: "nina",
        name: ANA,
        passwordHash: demoPw,
        level: 1,
        mustChangePw: true,
        locale: "sl",
        color: "#34c759",
      },
    }),
    db.user.create({
      data: {
        username: "ali",
        name: HAMZA,
        passwordHash: demoPw,
        level: 1,
        mustChangePw: true,
        locale: "sl",
        color: "#ff9500",
      },
    }),
    db.user.create({
      data: {
        username: "eva",
        name: SARA,
        passwordHash: demoPw,
        level: 2,
        mustChangePw: true,
        locale: "sl",
        color: "#af52de",
      },
    }),
    db.user.create({
      data: {
        username: "marko",
        name: TILEN,
        passwordHash: demoPw,
        level: 3,
        mustChangePw: true,
        locale: "sl",
        color: "#ff2d55",
      },
    }),
  ]);

  const id = new Map(users.map((u) => [u.name, u.id]));

  const seeds: IssueSeed[] = [
    {
      orderNumber: "1140",
      items: [{ name: "Kroj Essential T-Shirt", variant: "Black / M", replacementVariant: "Black / L", amount: 24.9, resolution: "exchange" }],
      type: "exchange",
      status: "open",
      level: 2,
      assignee: SARA,
      priority: "urgent",
      title: "Zamenjava majice M → L — vračilo prispelo pred petimi tedni",
      customerName: "Jana Primer",
      returnTracking: "TT100071271SI",
      createdAt: ago(41),
      events: [
        { kind: "created", at: ago(41), by: HAMZA },
        {
          kind: "comment",
          body: "Stranka želi majico eno številko večjo (L). Poslana return label.",
          at: ago(41),
          by: HAMZA,
        },
        { kind: "field", field: "Return tracking", to: "TT100071271SI", at: ago(37), by: HAMZA },
        {
          kind: "comment",
          body: "Paket prevzet v skladišču, artikel brez poškodb.",
          at: ago(35),
          by: HAMZA,
          attach: { filename: "prevzem-1140.png", color: "#0071e3" },
        },
        {
          kind: "assign",
          from: HAMZA,
          to: "Eva Kranjc · 2. nivo",
          body: "Vračilo je pri nas, prosim za odpremo zamenjave L.",
          at: ago(34),
          by: HAMZA,
        },
        {
          kind: "comment",
          body: "Stranka ponovno sprašuje — grozi s chargebackom. Prosim za prednostno obravnavo.",
          at: ago(2),
          by: ANA,
          outsider: true,
        },
      ],
    },
    {
      orderNumber: "1339",
      items: [{ name: "Kroj Slim Jeans", variant: "Blue / M / EU 46 / W32", replacementVariant: "Blue / L / EU 48 / W34", amount: 89, resolution: "exchange" }],
      type: "exchange",
      status: "open",
      level: 2,
      assignee: SARA,
      priority: "high",
      title: "Vračilo prejeto — čaka odpremo zamenjave",
      returnTracking: "0099900000",
      createdAt: ago(19),
      events: [
        { kind: "created", at: ago(19), by: ANA },
        { kind: "field", field: "Return tracking", to: "0099900000", at: ago(12), by: ANA },
        {
          kind: "comment",
          body: "Po trackingu dostavljeno, stranka sprašuje po zamenjavi.",
          at: ago(8),
          by: ANA,
        },
        {
          kind: "assign",
          from: ANA,
          to: "Eva Kranjc · 2. nivo",
          body: "Vračilo prispelo, predajam za odpremo.",
          at: ago(8),
          by: ANA,
        },
      ],
    },
    {
      orderNumber: "1690",
      items: [{ name: "Kroj Rain Jacket", variant: "Yellow / M", amount: 119, resolution: "refund" }],
      type: "refund",
      status: "open",
      level: 2,
      assignee: SARA,
      priority: "high",
      title: "Vračilo prejeto — stranka čaka refund",
      returnTracking: "TT100063352SI",
      amount: 119,
      createdAt: ago(17),
      events: [
        { kind: "created", at: ago(17), by: ANA },
        { kind: "field", field: "Return tracking", to: "TT100063352SI", at: ago(11), by: ANA },
        {
          kind: "assign",
          from: ANA,
          to: "Eva Kranjc · 2. nivo",
          body: "Paket prevzet, prosim za izvedbo refunda 119 EUR.",
          at: ago(9),
          by: ANA,
        },
      ],
    },
    {
      orderNumber: "2229",
      items: [{ name: "Kroj Oversized Hoodie", variant: "Gray / L", amount: 69, resolution: "refund" }],
      type: "quality",
      status: "waiting",
      level: 1,
      assignee: ANA,
      priority: "high",
      title: "Nezadovoljstvo s kakovostjo — poslana return label",
      waitingUntil: ago(-6),
      createdAt: ago(13),
      events: [
        { kind: "created", at: ago(13), by: ANA },
        {
          kind: "comment",
          body: "Stranka ni zadovoljna s kakovostjo, prosi za return label.",
          at: ago(13),
          by: ANA,
        },
        {
          kind: "status",
          to: "waiting",
          body: "Return label poslana, čakamo da stranka odda paket.",
          at: ago(12),
          by: ANA,
        },
      ],
    },
    {
      orderNumber: "2377",
      items: [{ name: "Kroj Merino Long Sleeve", variant: "Black / M", amount: 59, resolution: "refund" }],
      type: "quality",
      status: "open",
      level: 1,
      assignee: HAMZA,
      priority: "high",
      title: "Reklamacija kakovosti in zahteva za return label",
      createdAt: ago(12),
      events: [
        { kind: "created", at: ago(12), by: HAMZA },
        {
          kind: "comment",
          body: "Stranka pravi, da se je majica po prvem pranju skrčila, in zahteva return label.",
          at: ago(12),
          by: HAMZA,
        },
      ],
    },
    {
      orderNumber: "1314",
      items: [{ name: "Kroj Cargo Pants", variant: "Khaki / L / EU 48 / W34", amount: 84, resolution: "refund" }],
      type: "quality",
      status: "open",
      level: 3,
      assignee: TILEN,
      priority: "urgent",
      title: "Defekten artikel — stranka zahteva kritje poštnine",
      createdAt: ago(34),
      events: [
        { kind: "created", at: ago(34), by: ANA },
        {
          kind: "comment",
          body: "Stranka je prejela defekten artikel in vztraja, da poštnino vračila krijemo mi.",
          at: ago(34),
          by: ANA,
          attach: { filename: "defekt-1314.png", color: "#ffcc00" },
        },
        {
          kind: "assign",
          from: ANA,
          to: "Eva Kranjc · 2. nivo",
          body: "Potrebna odločitev o kritju poštnine.",
          at: ago(33),
          by: ANA,
        },
        {
          kind: "assign",
          from: SARA,
          to: "Marko Zupan · 3. nivo",
          body: "Znesek nad mojo mejo, potrebna potrditev vodstva.",
          at: ago(20),
          by: SARA,
        },
      ],
    },
    {
      orderNumber: "2071",
      items: [{ name: "Kroj Everyday Chinos", variant: "Beige / M / EU 46 / W32 / Women", amount: 79, resolution: "refund" }],
      type: "refund",
      status: "waiting",
      level: 1,
      assignee: ANA,
      returnTracking: "TT100055433SI",
      waitingUntil: ago(-3),
      createdAt: ago(11),
      events: [
        { kind: "created", at: ago(11), by: ANA },
        { kind: "field", field: "Return tracking", to: "TT100055433SI", at: ago(10), by: ANA },
        { kind: "status", to: "waiting", body: "Čakamo vračilo v tranzitu.", at: ago(10), by: ANA },
      ],
    },
    {
      orderNumber: "2009",
      items: [{ name: "Kroj Essential T-Shirt", variant: "White / S", amount: 24.9, resolution: "refund" }, { name: "Kroj Cotton Socks (3 pairs)", variant: "", amount: 14.9, resolution: "refund" }],
      type: "refund",
      status: "waiting",
      level: 1,
      assignee: HAMZA,
      returnTracking: "00999000001237",
      createdAt: ago(11),
      events: [
        { kind: "created", at: ago(11), by: HAMZA },
        {
          kind: "field",
          field: "Return tracking",
          to: "00999000001237",
          at: ago(10),
          by: HAMZA,
        },
        { kind: "status", to: "waiting", body: "Čakamo vračilo.", at: ago(10), by: HAMZA },
      ],
    },
    {
      orderNumber: "2283",
      items: [{ name: "Kroj Alltags-Chino", variant: "Marine / L / EU 48 / W34 / Herren", amount: 79, resolution: "refund" }],
      type: "refund",
      status: "waiting",
      level: 1,
      assignee: ANA,
      returnTracking: "TT100039595SI",
      createdAt: ago(9),
      events: [
        { kind: "created", at: ago(9), by: ANA },
        { kind: "field", field: "Return tracking", to: "TT100039595SI", at: ago(8), by: ANA },
        { kind: "status", to: "waiting", at: ago(8), by: ANA },
      ],
    },
    {
      orderNumber: "2269",
      items: [{ name: "Kroj Oversized Hoodie", variant: "Black / M", replacementVariant: "Black / XL", amount: 69, resolution: "exchange" }],
      type: "exchange",
      status: "waiting",
      level: 1,
      assignee: HAMZA,
      returnTracking: "00999000002474",
      createdAt: ago(9),
      events: [
        { kind: "created", at: ago(9), by: HAMZA },
        { kind: "field", field: "Return tracking", to: "00999000002474", at: ago(8), by: HAMZA },
        { kind: "status", to: "waiting", at: ago(8), by: HAMZA },
      ],
    },
    {
      orderNumber: "2203",
      items: [{ name: "Kroj Cargo Pants", variant: "Black / M / EU 46 / W32", amount: 84, resolution: "refund" }],
      type: "refund",
      status: "waiting",
      level: 1,
      assignee: ANA,
      returnTracking: "00999000000000",
      createdAt: ago(8),
      events: [
        { kind: "created", at: ago(8), by: ANA },
        { kind: "field", field: "Return tracking", to: "00999000000000", at: ago(8), by: ANA },
        { kind: "status", to: "waiting", at: ago(8), by: ANA },
      ],
    },
    {
      orderNumber: "1329",
      items: [{ name: "Kroj Slim Jeans", variant: "Black / S / EU 44 / W30", amount: 89, resolution: "refund" }],
      type: "refund",
      status: "open",
      level: 2,
      assignee: SARA,
      priority: "high",
      title: "Return tracking se ni posodobil od 13. julija",
      returnTracking: "TT100031676SI",
      createdAt: ago(28),
      events: [
        { kind: "created", at: ago(28), by: ANA },
        { kind: "field", field: "Return tracking", to: "TT100031676SI", at: ago(26), by: ANA },
        {
          kind: "assign",
          from: ANA,
          to: "Eva Kranjc · 2. nivo",
          body: "Tracking stoji od 13. julija, potrebna reklamacija pri kurirju.",
          at: ago(8),
          by: ANA,
        },
      ],
    },
    {
      orderNumber: "2774",
      items: [{ name: "Kroj Essential T-Shirt", variant: "Navy / M", amount: 24.9, resolution: "none" }],
      type: "address",
      status: "open",
      level: 1,
      assignee: HAMZA,
      priority: "urgent",
      title: "Sprememba naslova pred odpremo — Testna ulica 12",
      createdAt: ago(10),
      events: [
        { kind: "created", at: ago(10), by: HAMZA },
        {
          kind: "comment",
          body: "Naročilo je unfulfilled. Stranka želi spremembo naslova: Testna ulica 12.",
          at: ago(10),
          by: HAMZA,
        },
      ],
    },
    {
      orderNumber: "2749",
      items: [{ name: "Kroj Rain Jacket", variant: "Black / L", amount: 119, resolution: "refund" }],
      type: "cancel",
      status: "open",
      level: 2,
      assignee: SARA,
      priority: "high",
      title: "Stranka želi preklic — naročilo še ni odpremljeno",
      createdAt: ago(10),
      events: [
        { kind: "created", at: ago(10), by: ANA },
        {
          kind: "assign",
          from: ANA,
          to: "Eva Kranjc · 2. nivo",
          body: "Preklic in refund — potrebna izvedba v Shopifyju.",
          at: ago(10),
          by: ANA,
        },
      ],
    },
    {
      orderNumber: "2125",
      items: [{ name: "Kroj Merino Long Sleeve", variant: "Gray / S", amount: 59, resolution: "refund" }],
      type: "refund",
      status: "open",
      level: 1,
      assignee: ANA,
      title: "Stranka prosi za refund",
      createdAt: ago(10),
      events: [{ kind: "created", at: ago(10), by: ANA }],
    },
    {
      orderNumber: "2737",
      items: [{ name: "Kroj Oversized Hoodie", variant: "Green / S", amount: 69, resolution: "none" }],
      type: "tracking",
      status: "open",
      level: 1,
      assignee: HAMZA,
      title: "Tracking ne deluje",
      createdAt: ago(9),
      events: [{ kind: "created", at: ago(9), by: HAMZA }],
    },
    {
      orderNumber: "2763",
      items: [{ name: "Kroj Everyday Chinos", variant: "Navy / L / EU 48 / W34 / Men", amount: 79, resolution: "none" }],
      type: "tracking",
      status: "open",
      level: 1,
      assignee: ANA,
      title: "Naročeno 28. julija, tracking še ni dodan",
      createdAt: ago(9),
      events: [{ kind: "created", at: ago(9), by: ANA }],
    },
    {
      orderNumber: "2619",
      items: [{ name: "Kroj Slim Jeans", variant: "Blue / XL / EU 50 / W36", amount: 89, resolution: "none" }],
      type: "tracking",
      status: "open",
      level: 1,
      assignee: HAMZA,
      title: "Tracking se ni posodobil po 27. juliju",
      createdAt: ago(9),
      events: [{ kind: "created", at: ago(9), by: HAMZA }],
    },
    {
      orderNumber: "1108",
      items: [{ name: "Kroj Rain Jacket", variant: "Black / M", amount: 119, resolution: "refund" }, { name: "Kroj Cotton Socks (3 pairs)", variant: "", amount: 14.9, resolution: "refund" }],
      type: "refund",
      status: "closed",
      level: 2,
      assignee: SARA,
      priority: "low",
      title: "Refund izveden — 133,90 EUR",
      customerName: "Peter Vzorec",
      customerEmail: "peter.vzorec@example.com",
      amount: 133.9,
      returnTracking: "TT100047514SI",
      createdAt: ago(24),
      events: [
        { kind: "created", at: ago(24), by: ANA },
        { kind: "field", field: "Return tracking", to: "TT100047514SI", at: ago(20), by: ANA },
        {
          kind: "assign",
          from: ANA,
          to: "Eva Kranjc · 2. nivo",
          body: "Vračilo prejeto, prosim za refund.",
          at: ago(16),
          by: ANA,
        },
        {
          kind: "status",
          to: "closed",
          body: "Refund 133,90 EUR izveden v Shopifyju.",
          at: ago(15),
          by: SARA,
          attach: { filename: "refund-1108.png", color: "#248a3d" },
        },
      ],
    },
    {
      orderNumber: "1201",
      items: [{ name: "Kroj Cargo Pants", variant: "Black / M / EU 46 / W32", replacementVariant: "Black / L / EU 48 / W34", amount: 84, resolution: "exchange" }],
      type: "exchange",
      status: "closed",
      level: 2,
      assignee: SARA,
      priority: "low",
      title: "Zamenjava odposlana in dostavljena",
      replacementTracking: "TT100079190SI",
      createdAt: ago(30),
      events: [
        { kind: "created", at: ago(30), by: HAMZA },
        {
          kind: "assign",
          from: HAMZA,
          to: "Eva Kranjc · 2. nivo",
          body: "Vračilo prejeto, prosim za odpremo cargo hlač v velikosti L.",
          at: ago(22),
          by: HAMZA,
        },
        {
          kind: "status",
          to: "closed",
          body: "Zamenjava (L) odposlana, tracking TT100079190SI. Stranka potrdila prejem.",
          at: ago(12),
          by: SARA,
        },
      ],
    },
    // --- zaključeni (ocene zadovoljstva) ---------------------------------
    {
      orderNumber: "0912",
      type: "exchange",
      status: "closed",
      level: 2,
      assignee: SARA,
      priority: "low",
      title: "Zamenjava pulover S → M zaključena",
      items: [{ name: "Kroj Oversized Hoodie", variant: "Gray / S", replacementVariant: "Gray / M", amount: 69, resolution: "exchange" }],
      createdAt: ago(27),
      events: [
        { kind: "created", at: ago(27), by: ANA },
        { kind: "comment", body: "Stranka želi večjo številko, kos je nenošen. Poslana navodila za vračilo.", at: ago(27), by: ANA },
        { kind: "assign", from: ANA, to: "Eva Kranjc · 2. nivo", body: "Vračilo prispelo, prosim za odpremo M.", at: ago(19), by: ANA },
        { kind: "status", to: "closed", body: "Zamenjava M odposlana in dostavljena.", at: ago(9), by: SARA },
      ],
    },
    {
      orderNumber: "0934",
      type: "refund",
      status: "closed",
      level: 2,
      assignee: SARA,
      priority: "low",
      title: "Refund za jeans — 89 EUR",
      amount: 89,
      items: [{ name: "Kroj Slim Jeans", variant: "Black / M / EU 46 / W32", amount: 89, resolution: "refund" }],
      createdAt: ago(25),
      events: [
        { kind: "created", at: ago(25), by: HAMZA },
        { kind: "assign", from: HAMZA, to: "Eva Kranjc · 2. nivo", body: "Vračilo pregledano, kos brez napak. Prosim za refund.", at: ago(15), by: HAMZA },
        { kind: "status", to: "closed", body: "Refund 89 EUR izveden.", at: ago(14), by: SARA },
      ],
    },
    {
      orderNumber: "0950",
      type: "tracking",
      status: "closed",
      level: 1,
      assignee: ANA,
      priority: "low",
      title: "Paket obtičal pri kurirju — dostavljen",
      items: [{ name: "Kroj Essential T-Shirt", variant: "White / L", amount: 24.9, resolution: "none" }],
      createdAt: ago(22),
      events: [
        { kind: "created", at: ago(22), by: ANA },
        { kind: "comment", body: "Pri kurirju odprla poizvedbo, paket je bil napačno sortiran.", at: ago(21), by: ANA },
        { kind: "status", to: "closed", body: "Stranka potrdila prejem.", at: ago(17), by: ANA },
      ],
    },
    {
      orderNumber: "0967",
      type: "quality",
      status: "closed",
      level: 3,
      assignee: TILEN,
      priority: "medium",
      title: "Strgan šiv na jakni — delno vračilo kot kulanca",
      amount: 30,
      items: [{ name: "Kroj Rain Jacket", variant: "Black / L", amount: 30, resolution: "refund" }],
      createdAt: ago(20),
      events: [
        { kind: "created", at: ago(20), by: HAMZA, attach: { filename: "sev-0967.png", color: "#ff9500" } },
        { kind: "assign", from: HAMZA, to: "Marko Zupan · 3. nivo", body: "Stranka noče vračati, predlaga popust. Potrebna odločitev.", at: ago(19), by: HAMZA },
        { kind: "comment", body: "Ponudimo 30 EUR kulance, kos obdrži.", at: ago(18), by: TILEN },
        { kind: "status", to: "closed", body: "Stranka sprejela 30 EUR, refund izveden.", at: ago(16), by: TILEN },
      ],
    },
    {
      orderNumber: "0978",
      type: "address",
      status: "closed",
      level: 1,
      assignee: HAMZA,
      priority: "medium",
      title: "Popravek hišne številke pred odpremo",
      items: [{ name: "Kroj Cargo Pants", variant: "Green / M / EU 46 / W32", amount: 84, resolution: "none" }],
      createdAt: ago(18),
      events: [
        { kind: "created", at: ago(18), by: HAMZA },
        { kind: "status", to: "closed", body: "Naslov popravljen v naročilu, paket odposlan na pravi naslov.", at: ago(18), by: HAMZA },
      ],
    },
    {
      orderNumber: "0989",
      type: "refund",
      status: "closed",
      level: 2,
      assignee: SARA,
      priority: "medium",
      title: "Refund po dolgem čakanju — stranka nezadovoljna",
      amount: 59,
      items: [{ name: "Kroj Merino Long Sleeve", variant: "Black / S", amount: 59, resolution: "refund" }],
      createdAt: ago(35),
      events: [
        { kind: "created", at: ago(35), by: ANA },
        { kind: "comment", body: "Vračilo stoji v tranzitu že tri tedne.", at: ago(20), by: ANA, outsider: false },
        { kind: "assign", from: ANA, to: "Eva Kranjc · 2. nivo", body: "Paket končno prispel. Stranka je zelo jezna zaradi čakanja.", at: ago(8), by: ANA },
        { kind: "status", to: "closed", body: "Refund 59 EUR izveden, opravičilo poslano.", at: ago(7), by: SARA },
      ],
    },
    {
      orderNumber: "1003",
      type: "cancel",
      status: "closed",
      level: 2,
      assignee: SARA,
      priority: "low",
      title: "Preklic pred odpremo",
      amount: 79,
      items: [{ name: "Kroj Everyday Chinos", variant: "Navy / S / EU 44 / W30 / Women", amount: 79, resolution: "refund" }],
      createdAt: ago(12),
      events: [
        { kind: "created", at: ago(12), by: HAMZA },
        { kind: "assign", from: HAMZA, to: "Eva Kranjc · 2. nivo", body: "Naročilo še ni odpremljeno, prosim za preklic.", at: ago(12), by: HAMZA },
        { kind: "status", to: "closed", body: "Naročilo preklicano, denar vrnjen.", at: ago(11), by: SARA },
      ],
    },
    {
      orderNumber: "1021",
      type: "exchange",
      status: "closed",
      level: 2,
      assignee: SARA,
      priority: "low",
      title: "Zamenjava barve — majica bela → črna",
      items: [{ name: "Kroj Essential T-Shirt", variant: "White / M", replacementVariant: "Black / M", amount: 24.9, resolution: "exchange" }],
      createdAt: ago(16),
      events: [
        { kind: "created", at: ago(16), by: ANA },
        { kind: "assign", from: ANA, to: "Eva Kranjc · 2. nivo", body: "Vračilo prispelo, črna M je v zalogi.", at: ago(10), by: ANA },
        { kind: "status", to: "closed", body: "Črna M odposlana iz zaloge.", at: ago(6), by: SARA },
      ],
    },
    // --- menjave, ki gredo k dobavitelju (ni v zalogi) ------------------
    {
      orderNumber: "2801",
      type: "exchange",
      status: "open",
      level: 2,
      assignee: SARA,
      priority: "high",
      title: "Zamenjava dežne jakne S → M — ni v zalogi",
      items: [{ name: "Kroj Rain Jacket", variant: "Yellow / S", replacementVariant: "Yellow / M", amount: 119, resolution: "exchange" }],
      createdAt: ago(6),
      events: [
        { kind: "created", at: ago(6), by: HAMZA },
        { kind: "assign", from: HAMZA, to: "Eva Kranjc · 2. nivo", body: "Rumene M ni v zalogi, prosim naroči pri dobavitelju.", at: ago(5), by: HAMZA },
      ],
    },
    {
      orderNumber: "2815",
      type: "exchange",
      status: "waiting",
      level: 2,
      assignee: SARA,
      priority: "medium",
      title: "Merino majica M → L — čakamo dobavitelja",
      items: [{ name: "Kroj Merino Long Sleeve", variant: "Black / M", replacementVariant: "Black / L", amount: 59, resolution: "exchange" }],
      waitingUntil: ago(-4),
      createdAt: ago(9),
      events: [
        { kind: "created", at: ago(9), by: ANA },
        { kind: "assign", from: ANA, to: "Eva Kranjc · 2. nivo", body: "Črne L ni v zalogi.", at: ago(8), by: ANA },
        { kind: "status", to: "waiting", body: "Naročeno pri dobavitelju, izvoz poslan.", at: ago(7), by: SARA },
      ],
    },
    {
      orderNumber: "2830",
      type: "exchange",
      status: "open",
      level: 2,
      assignee: SARA,
      priority: "medium",
      title: "Chino bež → mornarska L — dobavitelj poslal",
      items: [{ name: "Kroj Everyday Chinos", variant: "Beige / L / EU 48 / W34 / Men", replacementVariant: "Navy / L / EU 48 / W34 / Men", amount: 79, resolution: "exchange" }],
      createdAt: ago(13),
      events: [
        { kind: "created", at: ago(13), by: HAMZA },
        { kind: "assign", from: HAMZA, to: "Eva Kranjc · 2. nivo", body: "Mornarske L ni v zalogi.", at: ago(12), by: HAMZA },
        { kind: "status", to: "waiting", body: "Naročeno pri dobavitelju.", at: ago(11), by: SARA },
        { kind: "status", to: "open", body: "Dobavitelj je vrnil tracking — preveri, ali je stranka prejela.", at: ago(3), by: SARA },
      ],
    },
  ];

  let n = 0;
  for (const s of seeds) {
    n++;
    const last = s.events[s.events.length - 1];

    const issue = await db.issue.create({
      data: {
        key: `KRJ-${n}`,
        orderNumber: s.orderNumber,
        orderNumberKey: orderNumberKey(s.orderNumber),
        type: s.type,
        status: s.status,
        level: s.level,
        priority: s.priority ?? "medium",
        title: s.title,
        customerName: s.customerName ?? fakeCustomer(n),
        customerEmail: s.customerEmail ?? fakeEmail(s.customerName ?? fakeCustomer(n)),
        customerAddress: `Testna ulica ${n * 3}, ${COUNTRIES[n % COUNTRIES.length].city}`,
        customerCountryCode: COUNTRIES[n % COUNTRIES.length].code,
        amount: s.amount,
        items: s.items
          ? {
              create: s.items.map((item, position) => ({
                name: item.name,
                variant: item.variant || null,
                replacementVariant: item.replacementVariant ?? null,
                qty: 1,
                amount: item.amount,
                resolution: item.resolution ?? "refund",
                position,
              })),
            }
          : undefined,
        returnTracking: s.returnTracking,
        replacementTracking: s.replacementTracking,
        waitingUntil: s.waitingUntil,
        assigneeId: id.get(s.assignee),
        reporterId: id.get(s.events[0].by),
        createdAt: s.createdAt,
        closedAt: s.status === "closed" ? last.at : null,
        archivedAt: s.status === "closed" ? last.at : null,
      },
    });

    for (const e of s.events) {
      const event = await db.event.create({
        data: {
          issueId: issue.id,
          kind: e.kind,
          body: e.body ?? (e.kind === "created" ? `Odprto naročilo #${s.orderNumber}.` : null),
          field: e.field,
          fromValue: e.from,
          toValue: e.to,
          outsider: e.outsider ?? false,
          authorId: id.get(e.by),
          createdAt: e.at,
        },
      });

      if (e.attach) {
        const f = placeholder(e.attach.color);
        await db.attachment.create({
          data: {
            issueId: issue.id,
            eventId: event.id,
            filename: e.attach.filename,
            storedName: f.storedName,
            mime: f.mime,
            size: f.size,
            createdAt: e.at,
          },
        });
      }
    }

    await db.issue.update({ where: { id: issue.id }, data: { updatedAt: last.at } });
  }

  const stock = await seedStock(id);
  const talk = await seedTalk(id);

  console.log(`Ustvarjenih ${seeds.length} naročil, ${stock} paketov v skladišču in ${users.length} uporabnikov.`);
  console.log(`Pošta: ${talk.threads} pogovorov · ocene: ${talk.scores} · dobavitelj: ${talk.supplier} naročil.`);
  console.log("Prijava: Admin (geslo: DEMO_PASSWORD ali Kroj-Demo-2026)");
  console.log("Demo računi: nina, ali, eva, marko — isto geslo (zahtevajo zamenjavo).");
  console.log(`Račun za ogled: ${GUEST_USERNAME} (geslo: GUEST_PASSWORD ali Gost-Kroj-2026).`);
}

// --- skladišče -------------------------------------------------------------
//
// Zaloga = vrnjeni paketi v (izmišljenem) zunanjem skladišču. Vsak paket je
// vrstica ShipGermanCachedParcel (kar "vidi" skladišče) in zapis ShipgReturn
// (kaj je v njem). Nekaj kosov se ujema z odprtimi menjavami (1140, 2269, 1339),
// da se vidi rezervacija iz zaloge.

type StockSeed = {
  order: string;
  customer: string;
  status: "stocked" | "check" | "expected";
  daysAgo: number;
  items: { name: string; variant: string | null }[];
  issueOrder?: string;
  location?: string;
};

const STOCK: StockSeed[] = [
  { order: "0981", customer: "Tina Hribar", status: "stocked", daysAgo: 12, location: "A-01-2", items: [{ name: "Kroj Essential T-Shirt", variant: "Black / L" }] },
  { order: "0995", customer: "Gregor Kos", status: "stocked", daysAgo: 16, location: "A-01-4", items: [{ name: "Kroj Slim Jeans", variant: "Blue / L / EU 48 / W34" }] },
  { order: "1012", customer: "Petra Golob", status: "stocked", daysAgo: 11, location: "A-02-1", items: [{ name: "Kroj Oversized Hoodie", variant: "Black / XL" }] },
  { order: "1033", customer: "Matej Novak", status: "stocked", daysAgo: 39, location: "A-02-3", items: [{ name: "Kroj Everyday Chinos", variant: "Navy / M / EU 46 / W32 / Men" }] },
  { order: "1047", customer: "Urška Zupančič", status: "stocked", daysAgo: 33, location: "A-03-1", items: [{ name: "Kroj Cargo Pants", variant: "Khaki / S / EU 44 / W30" }] },
  { order: "1058", customer: "Blaž Horvat", status: "stocked", daysAgo: 29, location: "A-03-2", items: [{ name: "Kroj Essential T-Shirt", variant: "White / M" }, { name: "Kroj Cotton Socks (3 pairs)", variant: null }] },
  { order: "1061", customer: "Katja Mlakar", status: "stocked", daysAgo: 26, location: "B-01-1", items: [{ name: "Kroj Rain Jacket", variant: "Black / M" }] },
  { order: "1075", customer: "Jure Kovač", status: "stocked", daysAgo: 21, location: "B-01-3", items: [{ name: "Kroj Merino Long Sleeve", variant: "Gray / L" }] },
  { order: "1080", customer: "Nika Turk", status: "stocked", daysAgo: 18, location: "B-02-2", items: [{ name: "Kroj Oversized Hoodie", variant: "Green / S" }] },
  { order: "1090", customer: "Lena Wagner", status: "stocked", daysAgo: 14, location: "B-02-4", items: [{ name: "Kroj Alltags-Chino", variant: "Schwarz / L / EU 48 / W34 / Damen" }] },
  { order: "1095", customer: "Aleš Bizjak", status: "stocked", daysAgo: 9, location: "B-03-1", items: [{ name: "Kroj Essential T-Shirt", variant: "Navy / XL" }, { name: "Kroj Essential T-Shirt", variant: "Black / XL" }] },
  // Prispelo, čaka pregled kosov.
  { order: "1690", customer: "Lara Poskusna", status: "check", daysAgo: 6, issueOrder: "1690", location: "IN-01", items: [{ name: "Kroj Rain Jacket", variant: "Yellow / M" }] },
  { order: "1339", customer: "Mia Primerna", status: "check", daysAgo: 4, issueOrder: "1339", location: "IN-02", items: [{ name: "Kroj Slim Jeans", variant: "Blue / M / EU 46 / W32" }] },
  // Na poti nazaj (iz ticketov s trackingom).
  { order: "2071", customer: "Ema Fiktivna", status: "expected", daysAgo: 10, issueOrder: "2071", items: [{ name: "Kroj Everyday Chinos", variant: "Beige / M / EU 46 / W32 / Women" }] },
  { order: "2009", customer: "Rok Učni", status: "expected", daysAgo: 10, issueOrder: "2009", items: [{ name: "Kroj Essential T-Shirt", variant: "White / S" }, { name: "Kroj Cotton Socks (3 pairs)", variant: null }] },
  { order: "2269", customer: "Jan Izmišljen", status: "expected", daysAgo: 8, issueOrder: "2269", items: [{ name: "Kroj Oversized Hoodie", variant: "Black / M" }] },
  { order: "2203", customer: "Zala Demo", status: "expected", daysAgo: 8, issueOrder: "2203", items: [{ name: "Kroj Cargo Pants", variant: "Black / M / EU 46 / W32" }] },
];

const CARRIERS = ["DHL", "GLS", "Pošta Slovenije", "DPD"];

async function seedStock(userId: Map<string, string>): Promise<number> {
  const verifier = userId.get(SARA);
  let parcelNo = 0;
  for (const [index, row] of STOCK.entries()) {
    const issue = row.issueOrder
      ? await db.issue.findFirst({ where: { orderNumber: row.issueOrder }, include: { items: true } })
      : null;
    // Stranka na zapisu je ista kot na ticketu.
    const customer = issue?.customerName ?? row.customer;
    const arrived = row.status !== "expected";
    const tracking = issue?.returnTracking ?? `TT${String(300000000 + index * 7717).padStart(9, "0")}SI`;
    let parcelId: string | null = null;
    if (arrived) {
      parcelNo++;
      parcelId = `SG-${410000 + parcelNo * 37}`;
      await db.shipGermanCachedParcel.create({
        data: {
          id: parcelId,
          arrivalDate: ago(row.daysAgo),
          barcode: `KR${880000 + parcelNo * 13}`,
          carrier: CARRIERS[index % CARRIERS.length],
          lengthMm: 300 + (index % 4) * 40,
          widthMm: 220 + (index % 3) * 30,
          heightMm: 60 + (index % 5) * 20,
          sender: customer,
          trackingNumber: tracking,
          weightGrams: 350 + row.items.length * 400 + (index % 4) * 90,
          location: row.location ?? "A-00-0",
          lastSeenAt: new Date(),
        },
      });
    }
    await db.shipgReturn.create({
      data: {
        orderNumber: row.order,
        customerName: customer,
        trackingNumber: tracking,
        issueId: issue?.id ?? null,
        shipgermanParcelId: parcelId,
        shipgermanMatchSource: parcelId ? "automatic" : null,
        shipgermanLinkedAt: parcelId ? ago(row.daysAgo) : null,
        status: row.status,
        receivedAt: arrived ? ago(row.daysAgo) : null,
        stockedAt: row.status === "stocked" ? ago(row.daysAgo - 1) : null,
        createdById: verifier,
        verifiedById: row.status === "stocked" ? verifier : null,
        createdAt: ago(row.daysAgo + 3),
        items: {
          create: row.items.map((item, position) => ({
            name: item.name,
            variant: item.variant,
            expectedQty: 1,
            receivedQty: row.status === "stocked" ? 1 : 0,
            condition: row.status === "stocked" ? "good" : "pending",
            position,
            issueItemId:
              issue?.items.find((own) => own.name === item.name && (own.variant ?? null) === item.variant)?.id ?? null,
          })),
        },
      },
    });
  }

  // Dva paketa brez zapisa: eden še ni identificiran, drugega ni mogoče.
  await db.shipGermanCachedParcel.createMany({
    data: [
      { id: "SG-419901", arrivalDate: ago(3), barcode: "KR899001", carrier: "GLS", lengthMm: 320, widthMm: 240, heightMm: 80, sender: "Neznan pošiljatelj", trackingNumber: "TT555000111SI", weightGrams: 720, location: "IN-03", lastSeenAt: new Date() },
      { id: "SG-419902", arrivalDate: ago(31), barcode: "KR899002", carrier: "DHL", lengthMm: 280, widthMm: 200, heightMm: 60, sender: "", trackingNumber: null, weightGrams: 410, location: "C-01-1", unidentifiable: true, lastSeenAt: new Date() },
    ],
  });
  await db.shipGermanSyncState.create({ data: { key: "inventory", status: "ok", fetchedAt: new Date() } });
  return parcelNo + 2;
}

// --- pogovori, ocene, dobavitelj ---------------------------------------------
//
// Izmišljena pošta strank (tabela DemoMail, glej src/lib/demo-mailbox.ts),
// pogovori v Prejeto, dodatni komentarji ekipe, ocene zadovoljstva zaprtih
// ticketov in naročila pri dobavitelju.

const DESK_MAIL = "podpora@kroj.example";
const HOUR = 3_600_000;

type Lang = "sl" | "de" | "en";
type MailIssue = {
  id: number;
  orderNumber: string;
  type: string;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  customerCountryCode: string | null;
  createdAt: Date;
  closedAt: Date | null;
  items: { name: string; variant: string | null; replacementVariant: string | null }[];
};

const LANG: Record<string, Lang> = { SI: "sl", AT: "de" };
const first = (name: string | null) => (name ?? "").split(" ")[0] || "";
const piece = (issue: MailIssue) => {
  const item = issue.items[0];
  if (!item) return "";
  const short = item.name.replace(/^Kroj /, "");
  return item.variant ? `${short} (${item.variant})` : short;
};
const wanted = (issue: MailIssue) => issue.items[0]?.replacementVariant ?? "";

/** Prvo sporočilo stranke glede na vrsto ticketa. */
const REQUEST: Record<string, Record<Lang, (i: MailIssue) => string>> = {
  exchange: {
    sl: (i) => `Pozdravljeni,\n\nnaročil(a) sem ${piece(i)}, a mi je premajhno. Ali lahko dobim ${wanted(i) || "večjo številko"}? Kos je nenošen.\n\nLep pozdrav,\n${i.customerName}`,
    de: (i) => `Hallo,\n\nich habe ${piece(i)} bestellt, leider passt es nicht. Kann ich es gegen ${wanted(i) || "eine andere Größe"} umtauschen? Ungetragen, mit Etikett.\n\nViele Grüße\n${i.customerName}`,
    en: (i) => `Hi,\n\nI ordered ${piece(i)} but it doesn't fit. Could I exchange it for ${wanted(i) || "another size"}? It's unworn.\n\nThanks,\n${i.customerName}`,
  },
  refund: {
    sl: (i) => `Pozdravljeni,\n\n${piece(i)} mi ni všeč, zato bi ga rad(a) vrnil(a) in dobil(a) denar nazaj. Kako naj ga pošljem?\n\nHvala,\n${i.customerName}`,
    de: (i) => `Guten Tag,\n\nich möchte ${piece(i)} zurückschicken und bitte um Erstattung. Wohin soll ich das Paket senden?\n\nMit freundlichen Grüßen\n${i.customerName}`,
    en: (i) => `Hello,\n\nI'd like to return ${piece(i)} and get a refund. Where should I send it?\n\nBest regards,\n${i.customerName}`,
  },
  quality: {
    sl: (i) => `Pozdravljeni,\n\npo prvem pranju se je ${piece(i)} precej skrčil(a), šiv ob strani pa se para. Prilagam fotografijo. Kaj lahko storite?\n\n${i.customerName}`,
    de: (i) => `Hallo,\n\nnach der ersten Wäsche ist ${piece(i)} eingelaufen und eine Naht hat sich gelöst. Das ist für den Preis enttäuschend.\n\n${i.customerName}`,
    en: (i) => `Hi,\n\nafter one wash ${piece(i)} shrank and a seam came loose. I'm quite disappointed with the quality.\n\n${i.customerName}`,
  },
  address: {
    sl: (i) => `Pozdravljeni,\n\npri naročilu #${i.orderNumber} sem se zmotil(a) v naslovu — pravilno je Testna ulica 12. Ali lahko popravite, preden paket odide?\n\nHvala!\n${i.customerName}`,
    de: (i) => `Hallo,\n\nbei Bestellung #${i.orderNumber} ist die Hausnummer falsch, richtig ist 12. Können Sie das vor dem Versand ändern?\n\nDanke!\n${i.customerName}`,
    en: (i) => `Hello,\n\nthe house number on order #${i.orderNumber} is wrong, it should be 12. Can you fix it before shipping?\n\nThank you!\n${i.customerName}`,
  },
  cancel: {
    sl: (i) => `Pozdravljeni,\n\nprosim za preklic naročila #${i.orderNumber}, premislil(a) sem se. Ali je še mogoče?\n\n${i.customerName}`,
    de: (i) => `Guten Tag,\n\nbitte stornieren Sie meine Bestellung #${i.orderNumber}, falls sie noch nicht versendet wurde.\n\n${i.customerName}`,
    en: (i) => `Hi,\n\nplease cancel order #${i.orderNumber} if it hasn't shipped yet.\n\n${i.customerName}`,
  },
  tracking: {
    sl: (i) => `Pozdravljeni,\n\nnaročil(a) sem pred več kot tednom, sledilna številka pa se ne premakne. Kje je moj paket (#${i.orderNumber})?\n\n${i.customerName}`,
    de: (i) => `Hallo,\n\nmeine Sendungsverfolgung für #${i.orderNumber} zeigt seit Tagen nichts Neues. Wo ist mein Paket?\n\n${i.customerName}`,
    en: (i) => `Hi,\n\nmy tracking for #${i.orderNumber} hasn't updated in days. Where is my parcel?\n\n${i.customerName}`,
  },
};

/** Naš prvi odgovor. */
const REPLY: Record<string, Record<Lang, (i: MailIssue) => string>> = {
  exchange: {
    sl: (i) => `Pozdravljeni ${first(i.customerName)},\n\nseveda, zamenjava ni težava. Kos pošljite na naš naslov za vračila (Kroj Info, Testna ulica 1, 1000 Ljubljana) in nam sporočite sledilno številko. Ko paket prispe, vam takoj pošljemo novo velikost.\n\nLep pozdrav,\nNina, Kroj`,
    de: (i) => `Hallo ${first(i.customerName)},\n\nder Umtausch ist kein Problem. Bitte senden Sie den Artikel an Kroj Info, Testna ulica 1, 1000 Ljubljana, Slowenien, und schicken Sie uns die Sendungsnummer. Sobald das Paket ankommt, versenden wir die neue Größe.\n\nFreundliche Grüße\nNina, Kroj`,
    en: (i) => `Hi ${first(i.customerName)},\n\nno problem at all. Please send the item to Kroj Info, Testna ulica 1, 1000 Ljubljana, Slovenia, and reply with the tracking number. As soon as it arrives we'll ship the new size.\n\nKind regards,\nNina, Kroj`,
  },
  refund: {
    sl: (i) => `Pozdravljeni ${first(i.customerName)},\n\nhvala za sporočilo. Kos vrnite na Kroj Info, Testna ulica 1, 1000 Ljubljana. Poštnino vračila krije kupec. Ko paket pregledamo, vam denar vrnemo v 3 delovnih dneh.\n\nLep pozdrav,\nNina, Kroj`,
    de: (i) => `Hallo ${first(i.customerName)},\n\nbitte senden Sie den Artikel an Kroj Info, Testna ulica 1, 1000 Ljubljana, Slowenien. Nach der Prüfung erstatten wir den Betrag innerhalb von 3 Werktagen.\n\nFreundliche Grüße\nNina, Kroj`,
    en: (i) => `Hi ${first(i.customerName)},\n\nplease send the item to Kroj Info, Testna ulica 1, 1000 Ljubljana, Slovenia. Once we inspect it, we'll refund you within 3 business days.\n\nKind regards,\nNina, Kroj`,
  },
  quality: {
    sl: (i) => `Pozdravljeni ${first(i.customerName)},\n\nžal nam je, da kos ni zdržal. Prosimo, pošljite še fotografijo etikete s sestavo — preverimo serijo in vam predlagamo rešitev (zamenjava ali vračilo denarja).\n\nLep pozdrav,\nAli, Kroj`,
    de: (i) => `Hallo ${first(i.customerName)},\n\ndas tut uns leid. Könnten Sie uns ein Foto des Pflegeetiketts schicken? Wir prüfen die Charge und bieten Ihnen Umtausch oder Erstattung an.\n\nFreundliche Grüße\nAli, Kroj`,
    en: (i) => `Hi ${first(i.customerName)},\n\nwe're sorry to hear that. Could you send a photo of the care label? We'll check the batch and offer you an exchange or a refund.\n\nKind regards,\nAli, Kroj`,
  },
  address: {
    sl: (i) => `Pozdravljeni ${first(i.customerName)},\n\nnaslov smo popravili, paket bo odšel na Testna ulica 12.\n\nLep pozdrav,\nAli, Kroj`,
    de: (i) => `Hallo ${first(i.customerName)},\n\nwir haben die Adresse korrigiert.\n\nFreundliche Grüße\nAli, Kroj`,
    en: (i) => `Hi ${first(i.customerName)},\n\nwe've corrected the address.\n\nKind regards,\nAli, Kroj`,
  },
  cancel: {
    sl: (i) => `Pozdravljeni ${first(i.customerName)},\n\nnaročilo še ni odpremljeno, zato ga lahko prekličemo. Denar boste prejeli v nekaj dneh.\n\nLep pozdrav,\nEva, Kroj`,
    de: (i) => `Hallo ${first(i.customerName)},\n\nIhre Bestellung war noch nicht versendet und wurde storniert. Die Erstattung folgt in wenigen Tagen.\n\nFreundliche Grüße\nEva, Kroj`,
    en: (i) => `Hi ${first(i.customerName)},\n\nyour order hadn't shipped yet, so we've cancelled it. The refund will arrive in a few days.\n\nKind regards,\nEva, Kroj`,
  },
  tracking: {
    sl: (i) => `Pozdravljeni ${first(i.customerName)},\n\npri kurirju smo odprli poizvedbo. Takoj ko dobimo odgovor, vam sporočimo.\n\nLep pozdrav,\nNina, Kroj`,
    de: (i) => `Hallo ${first(i.customerName)},\n\nwir haben beim Paketdienst eine Nachforschung eröffnet und melden uns, sobald wir mehr wissen.\n\nFreundliche Grüße\nNina, Kroj`,
    en: (i) => `Hi ${first(i.customerName)},\n\nwe've opened an inquiry with the carrier and will let you know as soon as we hear back.\n\nKind regards,\nNina, Kroj`,
  },
};

/** Drugi krog: stranka se oglasi še enkrat. */
const FOLLOW_UP: Record<Lang, (i: MailIssue) => string> = {
  sl: (i) => `Pozdravljeni,\n\npaket sem poslal(a), sledilna številka je v priponki pri pošti. Kdaj lahko pričakujem rešitev za #${i.orderNumber}?\n\n${i.customerName}`,
  de: (i) => `Hallo,\n\ndas Paket ist unterwegs. Wann kann ich mit einer Lösung für #${i.orderNumber} rechnen?\n\n${i.customerName}`,
  en: (i) => `Hi,\n\nthe parcel is on its way back. When can I expect this to be sorted for #${i.orderNumber}?\n\n${i.customerName}`,
};

/** Zaključno sporočilo pri zaprtem ticketu. */
const DONE: Record<Lang, (i: MailIssue) => string> = {
  sl: (i) => `Pozdravljeni ${first(i.customerName)},\n\nvse je urejeno — hvala za potrpežljivost. Če bo še kaj, smo tu.\n\nLep pozdrav,\nEva, Kroj`,
  de: (i) => `Hallo ${first(i.customerName)},\n\nalles ist erledigt — danke für Ihre Geduld.\n\nFreundliche Grüße\nEva, Kroj`,
  en: (i) => `Hi ${first(i.customerName)},\n\neverything is sorted — thank you for your patience.\n\nKind regards,\nEva, Kroj`,
};

const THANKS: Record<Lang, string> = {
  sl: "Hvala za hiter odziv, super!",
  de: "Vielen Dank, das ging schnell!",
  en: "Thanks a lot, that was quick!",
};

const SUBJECT: Record<string, string> = {
  exchange: "Menjava velikosti", refund: "Vračilo", quality: "Reklamacija", address: "Sprememba naslova",
  cancel: "Preklic naročila", tracking: "Kje je moj paket?",
};

/** Ocene zaključenih ticketov (1–10) z razlogom, kot bi ga napisal AI. */
const SCORES: Record<string, [number, string]> = {
  "1108": [8, "Stranka je bila vljudna, refund izveden v dogovorjenem roku. Na prvo vprašanje smo odgovorili šele naslednji dan."],
  "1201": [9, "Hitra zamenjava, stranka se je zahvalila. Brez zapletov."],
  "0912": [10, "Zamenjava v 9 dneh, jasna navodila, stranka pohvalila hitrost."],
  "0934": [7, "Refund izveden, a je stranka dvakrat spraševala, kje je denar."],
  "0950": [6, "Paket je obtičal pri kurirju; stranka je čakala skoraj teden dni na odgovor kurirja."],
  "0967": [8, "Kulanca 30 EUR je stranko pomirila, ton pogovora na koncu pozitiven."],
  "0978": [10, "Naslov popravljen v nekaj urah, pred odpremo."],
  "0989": [3, "Vračilo je tri tedne stalo v tranzitu, stranka je bila jezna in je zagrozila s slabo oceno."],
  "1003": [9, "Preklic izveden isti dan."],
  "1021": [7, "Zamenjava uspela, a stranka ni bila obveščena o odpremi."],
};

/** Dodatni interni komentarji ekipe (po številki naročila). */
const TEAM_TALK: Record<string, { by: string; days: number; body: string }[]> = {
  "1140": [
    { by: SARA, days: 3, body: "Črna L je v zalogi (paket od Tine H.), rezerviram jo danes." },
    { by: TILEN, days: 2.5, body: "Ok. Stranki ponudi še kodo za 10 % popusta zaradi čakanja." },
  ],
  "2229": [{ by: SARA, days: 5, body: "Če paket ne pride do konca tedna, pošlji opomnik." }],
  "2377": [
    { by: HAMZA, days: 11, body: "Zahtevala sem fotografijo etikete, čakamo." },
    { by: ANA, days: 10, body: "Pri isti seriji smo imeli že dve pritožbi — morda je težava v materialu." },
  ],
  "1314": [{ by: TILEN, days: 15, body: "Poštnino krijemo, gre za tovarniško napako. Pošlji predplačano nalepko." }],
  "2774": [{ by: SARA, days: 9, body: "Pazi: naročilo je že pripravljeno za odpremo, pohiti s popravkom." }],
  "2749": [{ by: SARA, days: 9, body: "Preklic izveden, čakam potrdilo plačilnega ponudnika." }],
  "2737": [{ by: HAMZA, days: 8, body: "Kurir pravi, da je paket v sortirnem centru Graz. Počakajmo dva dni." }],
};

async function seedTalk(userId: Map<string, string>): Promise<{ threads: number; scores: number; supplier: number }> {
  // Komentarji ekipe
  for (const [order, notes] of Object.entries(TEAM_TALK)) {
    const issue = await db.issue.findFirst({ where: { orderNumber: order } });
    if (!issue) continue;
    for (const note of notes) {
      await db.event.create({
        data: { issueId: issue.id, kind: "comment", body: note.body, authorId: userId.get(note.by), createdAt: new Date(Date.now() - note.days * DAY) },
      });
    }
  }

  // Pošta in Prejeto
  const issues: MailIssue[] = await db.issue.findMany({
    where: { customerEmail: { not: null } },
    select: {
      id: true, orderNumber: true, type: true, status: true, customerName: true, customerEmail: true,
      customerCountryCode: true, createdAt: true, closedAt: true,
      items: { select: { name: true, variant: true, replacementVariant: true }, orderBy: { position: "asc" } },
    },
  });
  let threads = 0;
  let mailNo = 0;
  const assignees = [userId.get(ANA), userId.get(HAMZA), null];
  for (const [index, issue] of issues.entries()) {
    const lang = LANG[issue.customerCountryCode ?? ""] ?? "en";
    const type = REQUEST[issue.type] ? issue.type : "refund";
    const customer = `${issue.customerName} <${issue.customerEmail}>`;
    const desk = `Kroj podpora <${DESK_MAIL}>`;
    const threadId = `demo-t${100 + index}`;
    const subject = `${SUBJECT[type]} — naročilo #${issue.orderNumber}`;
    const start = issue.createdAt.getTime() - 2 * HOUR;
    const end = issue.closedAt?.getTime() ?? Date.now();
    const at = (offset: number) => new Date(Math.min(start + offset, end - HOUR));

    const mails: { from: string; to: string; body: string; at: Date; dir: "incoming" | "outgoing" }[] = [
      { from: customer, to: desk, body: REQUEST[type]![lang](issue), at: at(0), dir: "incoming" },
      { from: desk, to: customer, body: REPLY[type]![lang](issue), at: at(5 * HOUR), dir: "outgoing" },
    ];
    if (issue.status === "closed") {
      mails.push({ from: desk, to: customer, body: DONE[lang](issue), at: new Date(end - 3 * HOUR), dir: "outgoing" });
      mails.push({ from: customer, to: desk, body: THANKS[lang], at: new Date(end - 2 * HOUR), dir: "incoming" });
    } else if (issue.status === "open" && index % 2 === 0) {
      // Stranka se je oglasila še enkrat in čaka odgovor.
      mails.push({ from: customer, to: desk, body: FOLLOW_UP[lang](issue), at: new Date(Date.now() - (6 + index) * HOUR), dir: "incoming" });
    }
    mails.sort((a, b) => a.at.getTime() - b.at.getTime());

    for (const mail of mails) {
      mailNo++;
      await db.demoMail.create({
        data: {
          id: `demo-m${1000 + mailNo}`, threadId, sentAt: mail.at, fromAddr: mail.from, toAddr: mail.to,
          subject: mail.dir === "outgoing" ? `Re: ${subject}` : subject, body: mail.body, direction: mail.dir,
        },
      });
    }
    const last = mails[mails.length - 1]!;
    await db.inboxConversation.create({
      data: {
        gmailThreadId: threadId,
        issueId: issue.id,
        subject,
        customerEmail: issue.customerEmail!,
        customerName: issue.customerName,
        lastMessageId: `demo-m${1000 + mailNo}`,
        lastMessageAt: last.at,
        lastSnippet: last.body.replace(/\s+/g, " ").slice(0, 140),
        lastDirection: last.dir,
        messageCount: mails.length,
        status: issue.status === "closed" ? "done" : last.dir === "outgoing" ? "waiting" : "open",
        assigneeId: assignees[index % assignees.length] ?? null,
      },
    });
    threads++;
  }

  // Dva maila brez ticketa: brez številke naročila in neznana stranka.
  const loose = [
    { thread: "demo-t900", name: "Vesna Neznana", email: "vesna.neznana@example.com", subject: "Vprašanje o velikostih",
      body: "Pozdravljeni,\n\nkakšna je razlika med S in M pri chino hlačah? Visoka sem 168 cm.\n\nVesna", hours: 5 },
    { thread: "demo-t901", name: "Tom Unknown", email: "tom.unknown@example.com", subject: "Return?",
      body: "Hi, I bought a hoodie as a gift but I don't have the order number. Can I still return it?\n\nTom", hours: 20 },
  ];
  for (const mail of loose) {
    mailNo++;
    const id = `demo-m${1000 + mailNo}`;
    const sentAt = new Date(Date.now() - mail.hours * HOUR);
    await db.demoMail.create({
      data: { id, threadId: mail.thread, sentAt, fromAddr: `${mail.name} <${mail.email}>`, toAddr: `Kroj podpora <${DESK_MAIL}>`, subject: mail.subject, body: mail.body, direction: "incoming" },
    });
    await db.inboxConversation.create({
      data: {
        gmailThreadId: mail.thread, unlinkedReason: "no_order", subject: mail.subject, customerEmail: mail.email, customerName: mail.name,
        lastMessageId: id, lastMessageAt: sentAt, lastSnippet: mail.body.replace(/\s+/g, " ").slice(0, 140), lastDirection: "incoming",
        messageCount: 1, status: "open",
      },
    });
    threads++;
  }
  await db.inboxSyncState.create({ data: { id: "gmail", lastSyncedAt: new Date() } });

  // Ocene zadovoljstva
  let scores = 0;
  for (const issue of issues.filter((row) => row.status === "closed" && row.closedAt)) {
    const [score, reason] = SCORES[issue.orderNumber] ?? [8, "Brez posebnosti."];
    await db.satisfactionScore.create({
      data: {
        issueId: issue.id, score, reason, status: "scored", attempts: 1, forClosedAt: issue.closedAt!, model: "demo",
        reviewedAt: score <= 4 ? null : issue.closedAt, reviewedById: score <= 4 ? null : userId.get(TILEN),
      },
    });
    scores++;
  }

  // Dobavitelj
  const supplier: { order: string; status: string; days: number; tracking?: string }[] = [
    { order: "2801", status: "open", days: 5 },
    { order: "2815", status: "exported", days: 8 },
    { order: "2830", status: "shipped", days: 11, tracking: "TT777123450SI" },
  ];
  for (const row of supplier) {
    const issue = await db.issue.findFirst({ where: { orderNumber: row.order }, include: { items: true } });
    if (!issue) continue;
    const item = issue.items[0]!;
    const city = issue.customerAddress?.split(", ")[1] ?? "1000 Ljubljana";
    await db.supplierOrder.create({
      data: {
        issueId: issue.id,
        status: row.status,
        items: JSON.stringify([{ qty: 1, name: item.name, variant: item.replacementVariant ?? item.variant }]),
        recipient: issue.customerName,
        address1: issue.customerAddress?.split(", ")[0] ?? null,
        zip: city.split(" ")[0],
        city: city.split(" ").slice(1).join(" "),
        countryCode: issue.customerCountryCode,
        email: issue.customerEmail,
        tracking: row.tracking ?? null,
        carrier: row.tracking ? "GLS" : null,
        exportedAt: row.status === "open" ? null : new Date(Date.now() - (row.days - 1) * DAY),
        shippedAt: row.tracking ? new Date(Date.now() - 3 * DAY) : null,
        shippedBy: row.tracking ? "portal" : null,
        createdById: userId.get(SARA),
        createdAt: new Date(Date.now() - row.days * DAY),
      },
    });
  }

  return { threads, scores, supplier: supplier.length };
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
