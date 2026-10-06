/**
 * Nagovor pisma, ki ga napiše AI. Nagovor je iz šifranta jezikov (Urejanje →
 * Jeziki) in je namenoma brez časa dneva: stranka pismo bere, kadar ga, ne
 * takrat, ko je bilo napisano. Model pa rad posnema stranko ("Good morning
 * Ana") in ob devetih zvečer napiše "Good morning" — zato prvo vrstico, ki je
 * nagovor, zamenjamo z nagovorom iz šifranta.
 */

// Pozdravi, ki jih modeli pišejo na začetek pisma, v jezikih, ki jih trgovina pokriva.
const SALUTATION = /^(good\s+(morning|afternoon|evening|day)|hello|hi|dear|greetings|buongiorno|buon\s*pomeriggio|buonasera|salve|gentile|ciao|guten\s+(morgen|tag|abend)|hallo|liebe[rs]?|sehr\s+geehrte[rs]?|bonjour|bonsoir|cher|ch[èe]re|hola|buen[oa]s\s+(d[ií]as|tardes|noches)|estimad[oa]|dober\s+(dan|ve[čc]er|jutro)|pozdravljeni|spo[šs]tovan[ia]|goede(morgen|middag|navond)|beste)\b/i;

export function enforceGreeting(letter: string, greeting: string): string {
  const want = greeting.trim();
  if (!want) return letter;
  const lines = letter.split("\n");
  const first = lines.findIndex((line) => line.trim() !== "");
  if (first < 0) return want;
  const line = lines[first]!.trim();
  if (line === want) return letter;

  // Prva vrstica je nagovor (kratka, začne se s pozdravom): zamenjamo jo.
  if (line.length <= 80 && SALUTATION.test(line)) {
    lines[first] = want;
    return lines.slice(first).join("\n");
  }
  // Model nagovora ni napisal: dodamo ga pred besedilo.
  return [want, "", ...lines.slice(first)].join("\n");
}

/** "luca" → "Luca": ime iz Shopifyja je včasih napisano z malo, v nagovoru ne sme biti. */
export function capitalizeName(name: string): string {
  if (!name || name !== name.toLowerCase()) return name;
  return name.replace(/(^|[\s'-])(\p{L})/gu, (_match, lead: string, letter: string) => lead + letter.toUpperCase());
}
