import type { KindText } from "./language-registry";

/**
 * Pisma za vračilo, kakor so bila vgrajena pred prenovo (septembra 2026).
 * Služijo samo nadgradnji baze: jezik, ki ima ta besedila še nespremenjena,
 * dobi nova; kar je admin prepisal, ostane.
 */
export type ReturnKinds = { returnInstructions: KindText; returnInstructionsWithChoice: KindText };

export const LEGACY_RETURN_KINDS: Record<string, ReturnKinds> = {
  de: {
    returnInstructions: { subject: "Ihre Bestellung {order} – Rücksendeadresse", lead: "bitte senden Sie die Artikel, die Sie zurückgeben möchten, an folgende Adresse:", close: "Sobald Ihre Rücksendung bei uns eingetroffen ist, bearbeiten wir sie." },
    returnInstructionsWithChoice: { subject: "Ihre Bestellung {order} – Rücksendung, Erstattung oder Umtausch", lead: "bitte senden Sie die Artikel, die Sie zurückgeben möchten, an folgende Adresse:", close: "Bitte teilen Sie uns auch mit, welche Option Sie nach Eingang der Rücksendung bevorzugen." },
  },
  it: {
    returnInstructions: { subject: "Il suo ordine {order} – indirizzo per il reso", lead: "invii gli articoli che desidera restituire al seguente indirizzo:", close: "Procederemo con il reso non appena il pacco arriverà presso il nostro magazzino." },
    returnInstructionsWithChoice: { subject: "Il suo ordine {order} – reso, rimborso o cambio", lead: "invii gli articoli che desidera restituire al seguente indirizzo:", close: "Ci faccia sapere anche quale opzione preferisce dopo l'arrivo del reso." },
  },
  fr: {
    returnInstructions: { subject: "Votre commande {order} – adresse de retour", lead: "merci d'envoyer les articles que vous souhaitez retourner à l'adresse suivante :", close: "Nous traiterons votre retour dès son arrivée dans notre entrepôt." },
    returnInstructionsWithChoice: { subject: "Votre commande {order} – retour, remboursement ou échange", lead: "merci d'envoyer les articles que vous souhaitez retourner à l'adresse suivante :", close: "Merci de nous indiquer également l'option que vous préférez après réception du retour." },
  },
  es: {
    returnInstructions: { subject: "Su pedido {order} – dirección de devolución", lead: "envíe los artículos que desea devolver a la siguiente dirección:", close: "Procesaremos su devolución en cuanto llegue a nuestro almacén." },
    returnInstructionsWithChoice: { subject: "Su pedido {order} – devolución, reembolso o cambio", lead: "envíe los artículos que desea devolver a la siguiente dirección:", close: "Indíquenos también qué opción prefiere cuando recibamos su devolución." },
  },
  en: {
    returnInstructions: { subject: "Your order {order} – return address", lead: "please send the items you wish to return to the following address:", close: "We will process your return as soon as it arrives at our warehouse." },
    returnInstructionsWithChoice: { subject: "Your order {order} – return, refund or exchange", lead: "please send the items you wish to return to the following address:", close: "Please also let us know which option you would prefer once we receive your return." },
  },
  sl: {
    returnInstructions: { subject: "Vaše naročilo {order} – naslov za vračilo", lead: "artikle, ki jih želite vrniti, prosim pošljite na naslednji naslov:", close: "Vračilo bomo obdelali takoj, ko prispe v naše skladišče." },
    returnInstructionsWithChoice: { subject: "Vaše naročilo {order} – vračilo, kupnina ali menjava", lead: "artikle, ki jih želite vrniti, prosim pošljite na naslednji naslov:", close: "Sporočite nam tudi, katero možnost želite po prejemu vračila." },
  },
};

/** Ali je vrsta pisma v bazi še taka, kot je bila vgrajena. */
export function isLegacyReturnKind(stored: Partial<KindText> | undefined, legacy: KindText): boolean {
  return Boolean(stored)
    && stored!.lead === legacy.lead
    && (stored!.close ?? "") === (legacy.close ?? "")
    && !stored!.note;
}
