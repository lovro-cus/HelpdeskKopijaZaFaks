import type { LanguageInfo, LanguageTemplates } from "./language-registry";

/**
 * Vgrajeni jeziki — s tem se napolni prazna baza in to velja, dokler baze ni.
 * Besedila so enaka tistim, ki so bila prej zapisana v customer-email.ts;
 * "{order}" in "{name}" se zamenjata ob sestavljanju pisma.
 */

/*
 * Pismo za vračilo po politiki: stranka je dobila, kar je naročila, zato vrne
 * sama in plača poštnino; ko pošlje, nam posreduje tracking. Uvod je skupen
 * obema vrstama pisma za vračilo.
 */
const DE_RETURN_LEAD = "vielen Dank für Ihre Nachricht.\n\nWir haben Ihre Bestellung sorgfältig geprüft und können bestätigen, dass Sie die bestellten Größen erhalten haben. Wir verstehen jedoch, dass die Artikel nicht wie erwartet passen, und bedauern, dass sie Ihren Erwartungen nicht entsprochen haben.\n\nSelbstverständlich können Sie die Artikel zurücksenden, sofern sie ungetragen, unbenutzt und in der Originalverpackung sind.\n\nBitte senden Sie die Artikel an folgende Adresse:";
const DE_RETURN_COST = "Bitte beachten Sie, dass die Kosten für die Rücksendung von Ihnen zu tragen sind.";
const IT_RETURN_LEAD = "la ringraziamo per il suo messaggio.\n\nDopo aver verificato attentamente il suo ordine, possiamo confermare che ha ricevuto le stesse taglie ordinate. Comprendiamo tuttavia che gli articoli non vestano come previsto e ci dispiace che non abbiano soddisfatto le sue aspettative.\n\nNaturalmente può restituire gli articoli, purché non indossati, non utilizzati e nella loro confezione originale.\n\nInvii gli articoli al seguente indirizzo:";
const IT_RETURN_COST = "Le ricordiamo che le spese di spedizione del reso sono a suo carico.";
const FR_RETURN_LEAD = "Merci pour votre message.\n\nAprès avoir examiné attentivement votre commande, nous pouvons confirmer que vous avez reçu les tailles commandées. Nous comprenons toutefois que les articles ne vous vont pas comme prévu et nous sommes désolés qu'ils n'aient pas répondu à vos attentes.\n\nBien entendu, vous pouvez retourner les articles, à condition qu'ils n'aient été ni portés ni utilisés et qu'ils soient dans leur emballage d'origine.\n\nMerci de retourner les articles à l'adresse suivante :";
const FR_RETURN_COST = "Veuillez noter que les frais de retour sont à votre charge.";
const ES_RETURN_LEAD = "Gracias por su mensaje.\n\nTras revisar detenidamente su pedido, podemos confirmar que recibió las mismas tallas que pidió. No obstante, entendemos que los artículos no le quedaron como esperaba y lamentamos que no hayan cumplido sus expectativas.\n\nPor supuesto, puede devolver los artículos siempre que no se hayan usado y estén en su embalaje original.\n\nEnvíe los artículos a la siguiente dirección:";
const ES_RETURN_COST = "Tenga en cuenta que los gastos de envío de la devolución corren de su cuenta.";
const EN_RETURN_LEAD = "Thank you for your message.\n\nAfter carefully reviewing your order, we can confirm that you received the same sizes that you ordered. However, we understand that the items did not fit as expected, and we are sorry that they did not meet your expectations.\n\nOf course, you may return the items, provided they are unworn, unused and in their original packaging.\n\nPlease return the items to the following address:";
const EN_RETURN_COST = "Please note that the return shipping cost is your responsibility.";
const SL_RETURN_LEAD = "hvala za vaše sporočilo.\n\nNaročilo smo skrbno pregledali in lahko potrdimo, da ste prejeli enake velikosti, kot ste jih naročili. Razumemo pa, da artikli niso bili pravšnji, in žal nam je, da niso izpolnili vaših pričakovanj.\n\nArtikle seveda lahko vrnete, če so nenošeni, neuporabljeni in v originalni embalaži.\n\nArtikle prosim pošljite na naslednji naslov:";
const SL_RETURN_COST = "Upoštevajte, da stroške poštnine za vračilo krijete sami.";

const de: LanguageTemplates = {
  greeting: "Guten Tag {name},",
  greetingAnonymous: "Guten Tag,",
  signOff: "Freundliche Grüße",
  kinds: {
    exchangeShipped: { subject: "Ihre Bestellung {order} – Ersatz ist unterwegs", lead: "wir haben Ihnen den Ersatz zugeschickt:" },
    refundOrExchange: {
      subject: "Ihre Bestellung {order} – Rückerstattung oder Umtausch?",
      lead: "wir haben Ihre Rücksendung erhalten. Damit wir weitermachen können, sagen Sie uns bitte, was Ihnen lieber ist:",
      options: ["Rückerstattung des Kaufpreises", "Umtausch gegen eine andere Größe oder Farbe"],
      close: "Sobald Sie uns Bescheid geben, kümmern wir uns sofort darum.",
    },
    whichSize: {
      subject: "Ihre Bestellung {order} – welche Größe dürfen wir schicken?",
      lead: "gern tauschen wir für Sie um. Bitte teilen Sie uns mit, welche Größe wir Ihnen schicken dürfen:",
      close: "Sobald wir Ihre Antwort haben, geht der Ersatz auf den Weg.",
    },
    returnInstructions: {
      subject: "Ihre Bestellung {order} – Rücksendeadresse",
      lead: DE_RETURN_LEAD,
      address: true,
      note: `${DE_RETURN_COST}\n\nSobald Sie die Rücksendung verschickt haben, senden Sie uns bitte die Sendungsnummer, damit wir die Sendung verfolgen können. Nach Eingang und Prüfung der Artikel kümmern wir uns wie gewünscht um die weiteren Schritte zu Ihrer Rückerstattung oder Ihrem Umtausch.`,
      close: "Vielen Dank für Ihr Verständnis und Ihre Mithilfe.",
    },
    returnInstructionsWithChoice: {
      subject: "Ihre Bestellung {order} – Rücksendung, Erstattung oder Umtausch",
      lead: DE_RETURN_LEAD,
      address: true,
      note: `${DE_RETURN_COST}\n\nSobald Sie die Rücksendung verschickt haben, senden Sie uns bitte die Sendungsnummer, damit wir die Sendung verfolgen können. Bitte teilen Sie uns außerdem mit, was Sie nach Eingang und Prüfung der Artikel bevorzugen:`,
      options: ["Rückerstattung des Kaufpreises", "Umtausch gegen eine andere Größe oder Farbe"],
      close: "Vielen Dank für Ihr Verständnis und Ihre Mithilfe.",
    },
    custom: { subject: "Ihre Bestellung {order}", lead: "" },
  },
};

const it: LanguageTemplates = {
  greeting: "Buongiorno {name},",
  greetingAnonymous: "Buongiorno,",
  signOff: "Cordiali saluti",
  kinds: {
    exchangeShipped: { subject: "Il suo ordine {order} – il ricambio è in viaggio", lead: "le abbiamo spedito il ricambio:" },
    refundOrExchange: {
      subject: "Il suo ordine {order} – rimborso o cambio?",
      lead: "abbiamo ricevuto il suo reso. Per procedere, ci faccia sapere cosa preferisce:",
      options: ["il rimborso dell'importo pagato", "il cambio con un'altra taglia o un altro colore"],
      close: "Appena ci risponde, ce ne occupiamo subito.",
    },
    whichSize: {
      subject: "Il suo ordine {order} – quale taglia le inviamo?",
      lead: "volentieri procediamo con il cambio. Ci indichi quale taglia dobbiamo inviarle:",
      close: "Appena riceviamo la sua risposta, spediamo il ricambio.",
    },
    returnInstructions: {
      subject: "Il suo ordine {order} – indirizzo per il reso",
      lead: IT_RETURN_LEAD,
      address: true,
      note: `${IT_RETURN_COST}\n\nUna volta spedito il reso, ci invii il numero di tracking così potremo seguire la spedizione. Dopo aver ricevuto e controllato gli articoli, procederemo con i passaggi successivi per il rimborso o il cambio, come richiesto.`,
      close: "La ringraziamo per la comprensione e la collaborazione.",
    },
    returnInstructionsWithChoice: {
      subject: "Il suo ordine {order} – reso, rimborso o cambio",
      lead: IT_RETURN_LEAD,
      address: true,
      note: `${IT_RETURN_COST}\n\nUna volta spedito il reso, ci invii il numero di tracking così potremo seguire la spedizione. Ci faccia sapere anche cosa preferisce dopo che avremo ricevuto e controllato gli articoli:`,
      options: ["il rimborso dell'importo pagato", "il cambio con un'altra taglia o un altro colore"],
      close: "La ringraziamo per la comprensione e la collaborazione.",
    },
    custom: { subject: "Il suo ordine {order}", lead: "" },
  },
};

const fr: LanguageTemplates = {
  greeting: "Bonjour {name},",
  greetingAnonymous: "Bonjour,",
  signOff: "Cordialement",
  kinds: {
    exchangeShipped: { subject: "Votre commande {order} – votre remplacement est en route", lead: "nous vous avons envoyé votre article de remplacement :" },
    refundOrExchange: {
      subject: "Votre commande {order} – remboursement ou échange ?",
      lead: "nous avons bien reçu votre retour. Pour avancer, dites-nous ce que vous préférez :",
      options: ["le remboursement du montant payé", "un échange contre une autre taille ou couleur"],
      close: "Dès que vous nous répondez, nous nous en occupons.",
    },
    whichSize: {
      subject: "Votre commande {order} – quelle taille devons-nous envoyer ?",
      lead: "nous procédons volontiers à l'échange. Merci de nous indiquer la taille à vous envoyer :",
      close: "Dès réception de votre réponse, nous expédions le remplacement.",
    },
    returnInstructions: {
      subject: "Votre commande {order} – adresse de retour",
      lead: FR_RETURN_LEAD,
      address: true,
      note: `${FR_RETURN_COST}\n\nUne fois le retour expédié, merci de nous communiquer le numéro de suivi afin que nous puissions suivre l'envoi. Après réception et vérification des articles, nous procéderons aux étapes suivantes concernant votre remboursement ou votre échange, comme demandé.`,
      close: "Merci de votre compréhension et de votre coopération.",
    },
    returnInstructionsWithChoice: {
      subject: "Votre commande {order} – retour, remboursement ou échange",
      lead: FR_RETURN_LEAD,
      address: true,
      note: `${FR_RETURN_COST}\n\nUne fois le retour expédié, merci de nous communiquer le numéro de suivi afin que nous puissions suivre l'envoi. Merci de nous indiquer également ce que vous préférez une fois les articles reçus et vérifiés :`,
      options: ["le remboursement du montant payé", "un échange contre une autre taille ou couleur"],
      close: "Merci de votre compréhension et de votre coopération.",
    },
    custom: { subject: "Votre commande {order}", lead: "" },
  },
};

const es: LanguageTemplates = {
  greeting: "Hola {name},",
  greetingAnonymous: "Hola,",
  signOff: "Un cordial saludo",
  kinds: {
    exchangeShipped: { subject: "Su pedido {order} – el reemplazo está en camino", lead: "le hemos enviado el artículo de reemplazo:" },
    refundOrExchange: {
      subject: "Su pedido {order} – ¿reembolso o cambio?",
      lead: "hemos recibido su devolución. Para continuar, indíquenos qué opción prefiere:",
      options: ["el reembolso del importe pagado", "un cambio por otra talla o color"],
      close: "En cuanto nos responda, nos ocuparemos de ello.",
    },
    whichSize: {
      subject: "Su pedido {order} – ¿qué talla debemos enviarle?",
      lead: "estaremos encantados de realizar el cambio. Indíquenos qué talla debemos enviarle:",
      close: "En cuanto recibamos su respuesta, enviaremos el reemplazo.",
    },
    returnInstructions: {
      subject: "Su pedido {order} – dirección de devolución",
      lead: ES_RETURN_LEAD,
      address: true,
      note: `${ES_RETURN_COST}\n\nUna vez enviada la devolución, envíenos el número de seguimiento para que podamos controlar el envío. Cuando recibamos y revisemos los artículos, seguiremos con los siguientes pasos de su reembolso o cambio, según lo solicitado.`,
      close: "Gracias por su comprensión y colaboración.",
    },
    returnInstructionsWithChoice: {
      subject: "Su pedido {order} – devolución, reembolso o cambio",
      lead: ES_RETURN_LEAD,
      address: true,
      note: `${ES_RETURN_COST}\n\nUna vez enviada la devolución, envíenos el número de seguimiento para que podamos controlar el envío. Indíquenos también qué prefiere una vez que hayamos recibido y revisado los artículos:`,
      options: ["el reembolso del importe pagado", "un cambio por otra talla o color"],
      close: "Gracias por su comprensión y colaboración.",
    },
    custom: { subject: "Su pedido {order}", lead: "" },
  },
};

export const ENGLISH_TEMPLATES: LanguageTemplates = {
  greeting: "Hello {name},",
  greetingAnonymous: "Hello,",
  signOff: "Kind regards",
  kinds: {
    exchangeShipped: { subject: "Your order {order} – your replacement is on its way", lead: "we have sent you your replacement:" },
    refundOrExchange: {
      subject: "Your order {order} – refund or exchange?",
      lead: "we have received your return. So we can move ahead, please tell us which you would prefer:",
      options: ["a refund of the amount paid", "an exchange for a different size or colour"],
      close: "As soon as you let us know, we will take care of it.",
    },
    whichSize: {
      subject: "Your order {order} – which size should we send?",
      lead: "we are happy to exchange it for you. Please let us know which size we should send:",
      close: "As soon as we hear back from you, the replacement goes out.",
    },
    returnInstructions: {
      subject: "Your order {order} – return address",
      lead: EN_RETURN_LEAD,
      address: true,
      note: `${EN_RETURN_COST}\n\nOnce you have shipped the return, please send us the return tracking number so we can monitor the shipment. After we receive and inspect the returned items, we will proceed with the next steps regarding your refund or replacement, as requested.`,
      close: "Thank you for your understanding and cooperation.",
    },
    returnInstructionsWithChoice: {
      subject: "Your order {order} – return, refund or exchange",
      lead: EN_RETURN_LEAD,
      address: true,
      note: `${EN_RETURN_COST}\n\nOnce you have shipped the return, please send us the return tracking number so we can monitor the shipment. Please also let us know which you would prefer once we receive and inspect the returned items:`,
      options: ["a refund of the amount paid", "an exchange for a different size or colour"],
      close: "Thank you for your understanding and cooperation.",
    },
    custom: { subject: "Your order {order}", lead: "" },
  },
};

const sl: LanguageTemplates = {
  greeting: "Pozdravljeni {name},",
  greetingAnonymous: "Pozdravljeni,",
  signOff: "Lep pozdrav",
  kinds: {
    exchangeShipped: { subject: "Vaše naročilo {order} – nadomestek je odposlan", lead: "poslali smo vam nadomestek:" },
    refundOrExchange: {
      subject: "Vaše naročilo {order} – vračilo kupnine ali menjava?",
      lead: "prejeli smo vaše vračilo. Da lahko nadaljujemo, nam prosim sporočite, kaj vam bolj ustreza:",
      options: ["vračilo plačanega zneska", "menjava za drugo velikost ali barvo"],
      close: "Takoj ko nam sporočite, uredimo naprej.",
    },
    whichSize: {
      subject: "Vaše naročilo {order} – katero velikost naj pošljemo?",
      lead: "menjavo z veseljem uredimo. Sporočite nam prosim, katero velikost naj vam pošljemo:",
      close: "Takoj ko prejmemo vaš odgovor, nadomestek odpošljemo.",
    },
    returnInstructions: {
      subject: "Vaše naročilo {order} – naslov za vračilo",
      lead: SL_RETURN_LEAD,
      address: true,
      note: `${SL_RETURN_COST}\n\nKo paket pošljete, nam prosim posredujte številko za sledenje (tracking), da lahko spremljamo pošiljko. Ko artikle prejmemo in pregledamo, bomo nadaljevali z naslednjimi koraki glede vračila kupnine ali menjave, kot ste želeli.`,
      close: "Hvala za razumevanje in sodelovanje.",
    },
    returnInstructionsWithChoice: {
      subject: "Vaše naročilo {order} – vračilo, kupnina ali menjava",
      lead: SL_RETURN_LEAD,
      address: true,
      note: `${SL_RETURN_COST}\n\nKo paket pošljete, nam prosim posredujte številko za sledenje (tracking), da lahko spremljamo pošiljko. Sporočite nam tudi, kaj želite, ko artikle prejmemo in pregledamo:`,
      options: ["vračilo plačanega zneska", "menjava za drugo velikost ali barvo"],
      close: "Hvala za razumevanje in sodelovanje.",
    },
    custom: { subject: "Vaše naročilo {order}", lead: "" },
  },
};

export const BUILTIN_LANGUAGES: LanguageInfo[] = [
  {
    code: "de", name: "Deutsch", englishName: "German", countries: ["DE", "AT", "CH", "LI"], active: true, builtin: true,
    markers: ["guten", "hallo", "danke", "bitte", "möchte", "bestellung", "rücksendung", "zurückschicken", "umtausch", "größe", "rückerstattung", "paket", "erhalten"],
    words: {
      color: { schwarz: "black", "grün": "green", gruen: "green", camouflage: "camo", grau: "gray", blau: "blue", khaki: "khaki", rot: "red", orange: "orange", rosa: "pink", "weiß": "white", weiss: "white" },
      gender: { herren: "men", damen: "women", mann: "men", frau: "women" },
    },
    templates: de,
  },
  {
    code: "it", name: "Italiano", englishName: "Italian", countries: ["IT", "SM"], active: true, builtin: true,
    markers: ["buongiorno", "salve", "grazie", "vorrei", "ordine", "reso", "restituire", "cambio", "taglia", "rimborso", "pacco", "ricevuto"],
    words: {
      color: { nero: "black", verde: "green", mimetico: "camo", camouflage: "camo", grigio: "gray", blu: "blue", cachi: "khaki", rosso: "red", arancione: "orange", rosa: "pink", bianco: "white" },
      gender: { uomo: "men", donna: "women" },
    },
    templates: it,
  },
  {
    code: "fr", name: "Français", englishName: "French", countries: ["FR", "BE", "LU", "MC"], active: true, builtin: true,
    markers: ["bonjour", "merci", "souhaite", "commande", "retour", "retourner", "échange", "taille", "remboursement", "colis", "reçu"],
    words: {
      color: { noir: "black", vert: "green", camouflage: "camo", gris: "gray", bleu: "blue", kaki: "khaki", rouge: "red", orange: "orange", rose: "pink", blanc: "white" },
      gender: { homme: "men", femme: "women" },
    },
    templates: fr,
  },
  {
    code: "es", name: "Español", englishName: "Spanish", countries: ["ES", "AD"], active: true, builtin: true,
    markers: ["hola", "buenos", "gracias", "claro", "quiero", "pedido", "devolución", "devolver", "cambio", "talla", "reembolso", "paquete", "recibido"],
    words: {
      color: { negro: "black", verde: "green", camuflaje: "camo", gris: "gray", azul: "blue", caqui: "khaki", rojo: "red", naranja: "orange", rosa: "pink", blanco: "white" },
      gender: { hombre: "men", mujer: "women" },
    },
    templates: es,
  },
  {
    code: "en", name: "English", englishName: "English", countries: [], active: true, builtin: true,
    markers: ["hello", "hi", "thanks", "thank", "please", "would", "order", "return", "exchange", "size", "refund", "parcel", "package", "received"],
    words: {
      color: { black: "black", green: "green", camouflage: "camo", camo: "camo", gray: "gray", grey: "gray", blue: "blue", khaki: "khaki", red: "red", orange: "orange", pink: "pink", white: "white" },
      gender: { men: "men", women: "women", male: "men", female: "women" },
    },
    templates: ENGLISH_TEMPLATES,
  },
  {
    code: "sl", name: "Slovenščina", englishName: "Slovenian", countries: ["SI"], active: true, builtin: true,
    markers: ["pozdravljeni", "živjo", "hvala", "prosim", "želim", "naročilo", "vračilo", "vrniti", "menjava", "velikost", "kupnina", "paket", "prejel"],
    words: {
      color: { "črna": "black", zelena: "green", maskirna: "camo", siva: "gray", modra: "blue", kaki: "khaki", "rdeča": "red", "oranžna": "orange", roza: "pink", bela: "white" },
      gender: { "moški": "men", "ženski": "women" },
    },
    templates: sl,
  },
];
