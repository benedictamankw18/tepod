// messages.js
// Localized SMS notification templates (NFR-6.2). Outgoing SMS is rendered in the
// recipient's preferred language (`user.language`, one of 'en' | 'tw'). Unknown
// languages fall back to English so delivery never breaks on a missing translation.
//
// Each key is a function (params) => string. Params mirror the data available at
// each notification call site in routes/.

const templates = {
  en: {
    precommit_offer: (p) =>
      `AgriSmart: ${p.buyerName}${p.buyerLabel ? ", a " + p.buyerLabel + " buyer," : ""} wants to pre-commit ${p.quantity} ${p.unit} of your ${p.cropType} at GHS ${p.price}. Reply on the app or dial the USSD code to respond.`,
    precommit_accepted: (p) =>
      `AgriSmart: your pre-commitment for ${p.cropType} was ACCEPTED at GHS ${p.price}. The farmer will confirm pickup/payment terms next.`,
    precommit_rejected: (p) =>
      `AgriSmart: your pre-commitment for ${p.cropType} was declined. The listing is open again.`,
    precommit_counter: (p) =>
      `AgriSmart: the farmer countered your offer for ${p.cropType} at GHS ${p.price}. Reply to accept or decline.`,
    sale_confirmed: (p) =>
      `AgriSmart: sale confirmed for ${p.cropType} at GHS ${p.price}. Payment due ${p.dueDate}. We'll remind the buyer as the date approaches.`,
    payment_received: (p) =>
      `AgriSmart: payment of GHS ${p.price} has been marked as received. Thank you!`,
    payment_reminder: (p) =>
      `AgriSmart: payment of GHS ${p.price} was due ${p.dueDate} and is still outstanding. Please arrange payment.`,
    transport_pickup: (p) =>
      `AgriSmart: pickup confirmed for ${p.date} at ${p.location}. Estimated cost: GHS ${p.cost}.`,
  },

  tw: {
    precommit_offer: (p) =>
      `AgriSmart: ${p.buyerName}${p.buyerLabel ? " (" + p.buyerLabel + ")" : ""} pɛ sɛ ɔde ${p.quantity} ${p.unit} a ɛyɛ ${p.cropType} ma wo ka GHS ${p.price}. Yi mu wɔ app no so anaasɛ fa USSD koodu no so.`,
    precommit_accepted: (p) =>
      `AgriSmart: w'anim kɔ hyiaa ${p.cropType} no, otua GHS ${p.price}. Ɔkuani no bɛma wo ne pickup ne sika yi sɛnea ɛsɛ.`,
    precommit_rejected: (p) =>
      `AgriSmart: w'anim kɔ a wode too ${p.cropType} no amma. Listing no buei bio.`,
    precommit_counter: (p) =>
      `AgriSmart: ɔkuani no san de GHS ${p.price} maa ${p.cropType}. Gyina so anaasɛ ɛyɛ wo mpɔ so.`,
    sale_confirmed: (p) =>
      `AgriSmart: w'atɔn ${p.cropType} no asisi, wɔ de GHS ${p.price}. Sika no sɛ da ${p.dueDate}. Yɛbɛkae ɔtɔfo no.`,
    payment_received: (p) =>
      `AgriSmart: w'anya sika GHS ${p.price}. Medaase!`,
    payment_reminder: (p) =>
      `AgriSmart: sika GHS ${p.price} no na ɛsɛ sɛ wotua da ${p.dueDate} nanso wonnya nni hɔ. Yɛsrɛ wo di ho dwuma.`,
    transport_pickup: (p) =>
      `AgriSmart: w'adi pickup da ${p.date} wɔ ${p.location}. Bo a wɔde bɛyɛ bi: GHS ${p.cost}.`,
  },
};

function render({ key, language, params }) {
  const lang = templates[language] ? language : "en";
  const tpl = templates[lang][key];
  if (!tpl) return null;
  return tpl(params || {});
}

// Human, localized label for a buyer type (FR-1.4 trust signal used in the offer SMS).
// market_seller maps to "retail"; unknown/missing types fall back to buyerLabel = null
// so the caller can omit it from the message.
const BUYER_TYPE_LABELS = {
  en: { wholesale: "wholesale", retail: "market seller", processor: "processor" },
  tw: { wholesale: "ɔtɔfo kɛse", retail: "guadani", processor: "soɛfo" },
};

function buyerTypeLabel(buyerType, language) {
  const lang = BUYER_TYPE_LABELS[language] ? language : "en";
  return (BUYER_TYPE_LABELS[lang] && BUYER_TYPE_LABELS[lang][buyerType]) || null;
}

module.exports = { render, buyerTypeLabel };
