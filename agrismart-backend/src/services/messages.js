// messages.js
// Localized SMS notification templates (NFR-6.2). Outgoing SMS is rendered in the
// recipient's preferred language (`language`, 'en' | 'tw'). Unknown languages fall
// back to English so delivery never breaks on a missing translation.

const templates = {
  en: {
    precommit_offer: (p) =>
      `NKABOM AGRILINK: ${p.buyerName}${p.buyerLabel ? ", a " + p.buyerLabel + " buyer," : ""} wants to pre-commit ${p.quantity} ${p.unit} of your ${p.cropType} at GHS ${p.price}. Respond on the NKABOM AGRILINK app.`,
    precommit_accepted: (p) =>
      `NKABOM AGRILINK: your pre-commitment for ${p.cropType} was ACCEPTED at GHS ${p.price}. The farmer will confirm pickup/payment terms next.`,
    precommit_rejected: (p) =>
      `NKABOM AGRILINK: your pre-commitment for ${p.cropType} was declined. The listing is open again.`,
    precommit_counter: (p) =>
      `NKABOM AGRILINK: the farmer countered your offer for ${p.cropType} at GHS ${p.price}. Reply to accept or decline.`,
    counter_accepted: (p) =>
      `NKABOM AGRILINK: the buyer accepted your counter of GHS ${p.price} for ${p.cropType}. The pre-commitment is now confirmed.`,
    counter_declined: (p) =>
      `NKABOM AGRILINK: the buyer declined your counter of GHS ${p.price} for ${p.cropType}. The listing is open again.`,
    sale_confirmed: (p) =>
      `NKABOM AGRILINK: ${p.farmerName || "the farmer"} confirmed your ${p.cropType} sale at GHS ${p.price}. Payment due ${p.dueDate}. We'll remind the buyer as the date approaches.`,
    precommit_preparing: (p) =>
      `NKABOM AGRILINK: ${p.farmerName || "the farmer"} has started preparing your ${p.cropType}. You'll be told when it is ready for pickup.`,
    precommit_ready: (p) =>
      `NKABOM AGRILINK: your ${p.quantity} ${p.unit} of ${p.cropType} from ${p.farmerName || "the farmer"} is ready at ${p.location}. Confirm receipt on the NKABOM AGRILINK app.`,
    precommit_received: (p) =>
      `NKABOM AGRILINK: ${p.buyerName} confirmed receipt of your ${p.cropType}. Payment of GHS ${p.price} is due.`,
    deposit_received: (p) =>
      `NKABOM AGRILINK: ${p.buyerName} paid a deposit of GHS ${p.amount} on your ${p.cropType} pre-commitment.`,
    precommit_completed: (p) =>
      `NKABOM AGRILINK: your ${p.cropType} sale is complete at GHS ${p.price}. Leave a review on the app.`,
    payment_received: (p) =>
      `NKABOM AGRILINK: payment of GHS ${p.price} has been marked as received. Thank you!`,
    payment_reminder: (p) =>
      `NKABOM AGRILINK: payment of GHS ${p.price} was due ${p.dueDate} and is still outstanding. Please arrange payment.`,
    transport_pickup: (p) =>
      `NKABOM AGRILINK: pickup confirmed for ${p.date} at ${p.location}. Estimated cost: GHS ${p.cost}.`,
    otp: (p) =>
      `NKABOM AGRILINK: your verification code is ${p.code}. It expires in ${p.expiresIn} minutes. Do not share it.`,
  },
  tw: {
    precommit_offer: (p) =>
      `NKABOM AGRILINK: ${p.buyerName}${p.buyerLabel ? " (" + p.buyerLabel + ")" : ""} pɛ sɛ ɔde ${p.quantity} ${p.unit} a ɛyɛ ${p.cropType} ma wo ka GHS ${p.price}. Yi mu wɔ NKABOM AGRILINK app no so.`,
    precommit_accepted: (p) =>
      `NKABOM AGRILINK: w'anim kɔ hyiaa ${p.cropType} no, otua GHS ${p.price}. Ɔkuani no bɛma wo ne pickup ne sika yi sɛnea ɛsɛ.`,
    precommit_rejected: (p) =>
      `NKABOM AGRILINK: w'anim kɔ a wode too ${p.cropType} no amma. Listing no buei bio.`,
    precommit_counter: (p) =>
      `NKABOM AGRILINK: ɔkuani no san de GHS ${p.price} maa ${p.cropType}. Gyina so anaasɛ ɛyɛ wo mpɔ so.`,
    counter_accepted: (p) =>
      `NKABOM AGRILINK: ɔtɔfo no penee w'anim a modii GHS ${p.price} wɔ ${p.cropType} so. Pre-commitment no asi.`,
    counter_declined: (p) =>
      `NKABOM AGRILINK: ɔtɔfo no ampenee w'anim a modii GHS ${p.price} wɔ ${p.cropType} so. Listing no buei bio.`,
    sale_confirmed: (p) =>
      `NKABOM AGRILINK: ${p.farmerName || "ɔkuani no"} penee sɛ ɔnyɛ w'${p.cropType} atɔn wɔ GHS ${p.price}. Sika no sɛ da ${p.dueDate}. Yɛbɛkae wo.`,
    precommit_preparing: (p) =>
      `NKABOM AGRILINK: ${p.farmerName || "ɔkuani no"} afi ase asiesie w'${p.cropType}. Yɛbɛka akyerɛ wo sɛ w'adi ho ni.`,
    precommit_ready: (p) =>
      `NKABOM AGRILINK: wo ${p.quantity} ${p.unit} a ɛyɛ ${p.cropType} a ɛfiri ${p.farmerName || "ɔkuani no"} hɔ no ada wɔ ${p.location}. Kyerɛ sɛ woanya wɔ NKABOM AGRILINK app no so.`,
    precommit_received: (p) =>
      `NKABOM AGRILINK: ${p.buyerName} akyerɛ sɛ ɔnyaa wo ${p.cropType} no. Sika GHS ${p.price} na ɛsɛ sɛ wotua.`,
    deposit_received: (p) =>
      `NKABOM AGRILINK: ${p.buyerName} de depo GHS ${p.amount} bɔɔ w'${p.cropType} pre-commitment no.`,
    precommit_completed: (p) =>
      `NKABOM AGRILINK: w'${p.cropType} atɔn no awie wɔ GHS ${p.price}. Fa wo nsusui ma wɔ app no so.`,
    payment_received: (p) =>
      `NKABOM AGRILINK: w'anya sika GHS ${p.price}. Medaase!`,
    payment_reminder: (p) =>
      `NKABOM AGRILINK: sika GHS ${p.price} no na ɛsɛ sɛ wotua da ${p.dueDate} nanso wonnya nni hɔ. Yɛsrɛ wo di ho dwuma.`,
    transport_pickup: (p) =>
      `NKABOM AGRILINK: w'adi pickup da ${p.date} wɔ ${p.location}. Bo a wɔde bɛyɛ bi: GHS ${p.cost}.`,
    otp: (p) =>
      `NKABOM AGRILINK: wo verification koodu yɛ ${p.code}. Ɛsa wɔ simma ${p.expiresIn} mu. Nnyɛ obiara nkyerɛ.`,
  },
};

function render({ key, language, params }) {
  const lang = templates[language] ? language : "en";
  const tpl = templates[lang][key];
  if (!tpl) return null;
  return tpl(params || {});
}

const BUYER_TYPE_LABELS = {
  en: { wholesale: "wholesale", retail: "market seller", processor: "processor" },
  tw: { wholesale: "ɔtɔfo kɛse", retail: "guadani", processor: "soɛfo" },
};

function buyerTypeLabel(buyerType, language) {
  const lang = BUYER_TYPE_LABELS[language] ? language : "en";
  return (BUYER_TYPE_LABELS[lang] && BUYER_TYPE_LABELS[lang][buyerType]) || null;
}

module.exports = { render, buyerTypeLabel };
