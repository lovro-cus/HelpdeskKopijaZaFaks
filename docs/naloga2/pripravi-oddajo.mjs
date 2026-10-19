// Pripravi samostojna dokumenta HTML za branje in tisk ter združeni Markdown.
// Ne zažene aplikacije, brskalnika ali testov in ne spreminja baze.
import { join } from "node:path";

const base = import.meta.dir;
const read = (name) => Bun.file(join(base, name)).text();
const [prompt, cases, matrix, initial] = await Promise.all([
  read("ukaz-v3.md"), read("testni-primeri-v3.md"), read("matrika-v3.md"), read("ukaz-v1.md"),
]);
const executionFile = Bun.file(join(base, "zapisnik-testiranja.md"));
const execution = await executionFile.exists() ? await executionFile.text() : "";
const introduction = `# Funkcionalno testiranje aplikacije HelpDesk

Dokument za drugo nalogo vsebuje končni ukaz za agenta, pet testnih primerov, matriko povezav, komentar pregleda in navedbo uporabljenih orodij. Projekt HelpDesk podpira obravnavo težav pri naročilih izmišljene trgovine Kroj. Pripravljeni so trije pozitivni in dva negativna testna primera.

Datum: 19. 10. 2026. Različica dokumenta: 3.0. Avtor testnih primerov in te priprave: agent Codex. Študent pred oddajo dopiše svoje ime in pregleda predlog komentarja.

## Postopek priprave in pregleda

V repozitoriju so že bili shranjeni ukaz-v1.md, rezultat-v1.md, ukaz-v2.md in rezultat-v2.md. V tej seji so bili pregledani kot zgodovinski vhod. V prvem rezultatu so nepopolni testni podatki, odvisnost TP-02 od TP-01 in dvoumen izid »gumba ni ali pa je dejanje zavrnjeno«. Drugi ukaz izboljša strukturo in zahteva konkretne vrednosti, v drugem rezultatu pa še manjkajo evidenca izvedbe, čiščenje in jasna ločitev pričakovanj od sumljivih napisov trenutne kode.

Končni ukaz v3 je specifikacija za pripravo novega rezultata s trenutnim agentom Codex. Ne predstavlja dodatnega zagona v izolirani seji ali uporabe drugega agenta. Agent je pripravil novo različico petih primerov in jo statično primerjal z dokumentacijo, semenom baze, strežniškimi akcijami ter besedili vmesnika. V prvi fazi so bili primeri označeni Ni izvedeno. Po nadaljnjem naročilu uporabnika je agent pripravil in izvedel avtomatizacijo Playwright; dejanski rezultati so v evidenci in zapisniku spodaj. Prvotni ukaz prepoveduje izvajanje, ker velja za fazo načrtovanja. Stare navedbe o prejšnjih ročnih izvedbah ostajajo neodvisno nepotrjene.

## Končni ukaz za agenta

\`\`\`text
${prompt.trim()}
\`\`\`
`;
const comment = `## Kratek komentar pregleda

Predlog komentarja za študentov pregled: začetni ukaz je dopuščal nedoločene podatke, odvisne primere in več možnih pričakovanih izidov. V drugem ukazu so bili dodani konkretni podatki iz semena, neodvisnost, natančna imena kontrol, negativni primeri in pričakovani odzivi pri korakih. Končna dopolnitev v3 zahteva še cilj, okolje, avtorja, različico, merilo uspeha, čiščenje in ločeno evidenco dejanske izvedbe. Ukazi uporabljajo Bun. Obvezna menjava gesla je priprava, notranjih tabel baze pa ni treba neposredno pregledovati za uspeh testa.

Primeri so bili nato avtomatizirani in dejansko izvedeni; zapisnik ločuje uspešne funkcionalne korake od neuspešne dodatne kontrole konzole. Pri nadaljnjem testiranju bi dodal pravice gosta, uspešen zaključek ter artikle pri odpiranju ticketa. Za uporabniška imena bi ločeno določil pričakovano obravnavo velikih in malih črk. Sumljiva napisa »Pošlji kot Ana« in »pismo o nadomestku« bi obravnaval kot kandidata za prijavo napake in dogovor o pravilnem besedilu, ne kot poslovni zahtevi. Ti dodatni predlogi niso vključeni med pet oddanih primerov.

## Uporabljena generativna orodja

V tej seji je bil uporabljen Codex v okolju T3 Code, model gpt-6.1-sol: za pregled obstoječih ukazov in rezultatov, pripravo končnega ukaza v3, generiranje petih primerov, pregled s kodo, matriko, komentar, oblikovanje dokumentov ter pripravo in izvedbo avtomatiziranih testov. Dodatni podagenti niso bili uporabljeni. Bun in Playwright sta tehnični orodji, ne generativna umetna inteligenca.

Prejšnje poročilo docs/Naloga2-TestniPrimeri.md navaja Claude Code in model Claude Opus 5.5 za stare različice. To je navedba obstoječega dokumenta; uporaba tega orodja in točnega modela v tej seji ni bila potrjena. Študent naj jo pred oddajo potrdi iz lastne evidence, če želi poročati tudi o zgodovinskem delu.

## Viri

Notranji viri projekta: docs/FUNKCIONALNOSTI.md, docs/VZPOSTAVITEV.md, prisma/seed.ts, src/lib/actions/issues.ts, src/lib/actions/admin.ts, src/lib/actions/auth.ts, src/components/InboxWorkspace.tsx in src/lib/i18n/dictionaries.ts. Pregledani so bili tudi shranjeni ukazi ter rezultati v docs/naloga2. Dokument ne uveljavlja formalne skladnosti s standardom za testno dokumentacijo.

## Priloga začetni ukaz

Zgodovinski ukaz v1 je spodaj naveden dobesedno. Njegova pot je del izvirnega besedila; končni ukaz v3 uporablja trenutni repozitorij.

\`\`\`text
${initial.trim()}
\`\`\`
`;

const combined = [introduction, cases.replace(/^# /, "## "), matrix.replace(/^# /, "## "), execution.replace(/^# /, "## "), comment].join("\n\n");
const html = (title, md) => `<!doctype html>
<html lang="sl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
@page { size: A4; margin: 18mm; }
* { box-sizing: border-box; }
body { max-width: 1040px; margin: 36px auto; padding: 0 24px; color: #17212b; background: white; font: 15px/1.55 "Segoe UI", Arial, sans-serif; }
h1,h2,h3 { color: #000; line-height: 1.2; break-after: avoid; }
h1 { font-size: 29px; margin: 0 0 22px; }
h2 { font-size: 22px; margin: 32px 0 14px; }
h3 { font-size: 18px; }
p { margin: 10px 0; }
table { border-collapse: collapse; width: 100%; margin: 16px 0 22px; font-size: 13px; overflow-wrap: anywhere; }
th,td { border: 1px solid #d9d9d9; padding: 9px 11px; text-align: left; vertical-align: top; }
th { background: #e8eef4; color: #000; font-weight: 600; }
tr:nth-child(even) td { background: #f7f9fb; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
pre { padding: 15px; border: 1px solid #d9d9d9; white-space: pre-wrap; overflow-wrap: anywhere; background: #f7f9fb; font-size: 13px; }
code { font-family: Consolas, monospace; font-size: .92em; }
@media print { body { max-width: none; margin: 0; padding: 0; font-size: 10pt; } h1 { font-size: 22pt; } h2 { font-size: 15pt; } table { font-size: 8.5pt; } th,td { padding: 6px; } pre { font-size: 9pt; } }
</style></head><body><main>${Bun.markdown.html(md)}</main></body></html>`;

await Bun.write(join(base, "Oddaja-HelpDesk.md"), combined);
await Bun.write(join(base, "Oddaja-HelpDesk.html"), html("Funkcionalno testiranje aplikacije HelpDesk", combined));
await Bun.write(join(base, "Matrika-HelpDesk.html"), html("Matrika povezav funkcionalnosti in testnih primerov", matrix));
console.log("Pripravljeni: Oddaja-HelpDesk.md, Oddaja-HelpDesk.html, Matrika-HelpDesk.html");

