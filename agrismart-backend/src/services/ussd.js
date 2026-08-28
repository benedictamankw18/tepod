// ussd.js
// Session-menu USSD engine. Handles { sessionId, phoneNumber, text } per the common
// Africa's Talking / Hubtel CON|END webhook contract. text accumulates all inputs so
// far, '*'-separated; the server keeps session state in Postgres (ussd_sessions).
//
// Covers FR-8.2: registration, list-produce, check-price, and pre-commitment status.

const usersRepo = require("../repositories/users");
const listingsRepo = require("../repositories/listings");
const precommitmentsRepo = require("../repositories/precommitments");
const pricesRepo = require("../repositories/prices");
const sessionsRepo = require("../repositories/ussdSessions");

const ROLE_MAP = { 1: "farmer", 2: "buyer" };
const BUYER_TYPE_MAP = { 1: "wholesale", 2: "retail", 3: "processor" };
const LANG_MAP = { 1: "en", 2: "tw" };

const mainMenu = () =>
  "CON Welcome to AgriSmart AI\n1. Register\n2. List my produce\n3. Check crop price\n4. Check pre-commitment status\n0. Exit";

async function createUserFromSession(session, phoneNumber) {
  return usersRepo.createUser({
    name: session.data.name,
    phone: phoneNumber,
    role: session.data.role,
    location: session.data.location,
    primaryCrops: session.data.primaryCrops,
    purchaseCrops: session.data.purchaseCrops,
    buyerType: session.data.buyerType,
    language: session.data.language,
    verified: true, // phone is the USSD identity; treat as verified
  });
}

function finishRegistration(session, phoneNumber) {
  // Deferred: creation is async; this helper only builds the confirmation text.
  const lang = (session.data.language === "tw") ? "Twi" : "English";
  const typeLabel = { wholesale: "wholesale", retail: "retail", processor: "processor" }[session.data.buyerType];
  const roleName = String(session.data.role).replace("_", " ");
  const roleBits = session.data.role === "buyer" && typeLabel ? `${typeLabel} buyer` : roleName;
  return { lang, roleBits };
}

async function buildStatusReport(user) {
  if (user.role === "farmer") {
    const listings = (await listingsRepo.searchListings({})).filter((l) => l.farmerId === user.id);
    if (listings.length === 0) return "END You have no active listings.";
    const lines = [];
    for (const l of listings.slice(0, 3)) {
      const pcs = await precommitmentsRepo.preCommitmentsForListing(l.id);
      const pending = pcs.filter((p) => p.status === "pending").length;
      lines.push(`${l.cropType} (${l.status}), ${pending} pending offer(s)`);
    }
    return "END Your listings:\n" + lines.join("\n");
  }
  if (user.role === "buyer" || user.role === "market_seller") {
    const pcs = await precommitmentsRepo.preCommitmentsForBuyer(user.id);
    if (pcs.length === 0) return "END You have no pre-commitments yet.";
    const lines = [];
    for (const p of pcs.slice(0, 3)) {
      const listing = await listingsRepo.getListing(p.listingId);
      lines.push(`${listing ? listing.cropType : "listing"}: ${p.status}`);
    }
    return "END Your pre-commitments:\n" + lines.join("\n");
  }
  return "END Status check is available for farmers and buyers.";
}

async function handle({ sessionId, phoneNumber, text }) {
  const parts = String(text || "").split("*").filter((p) => p !== "");
  const latestInput = parts.length ? parts[parts.length - 1] : "";

  let session = await sessionsRepo.getSession(sessionId);
  if (!session) {
    session = { sessionId, step: "main", data: {} };
    await sessionsRepo.setSession(sessionId, { step: "main", data: {} });
  }

  let response;
  const data = session.data || {};

  switch (session.step) {
    case "main": {
      if (parts.length === 0) {
        response = mainMenu();
      } else if (latestInput === "1") {
        await sessionsRepo.setSession(sessionId, { step: "register_name", data });
        response = "CON What is your full name?";
      } else if (latestInput === "2") {
        const farmer = await usersRepo.findUserByPhone(phoneNumber);
        if (!farmer || farmer.role !== "farmer") {
          await sessionsRepo.clearSession(sessionId);
          response = "END This option is for registered farmers. Please register first (option 1).";
        } else {
          data.farmerId = farmer.id;
          await sessionsRepo.setSession(sessionId, { step: "list_crop", data });
          response = "CON What crop are you listing? (e.g. tomato)";
        }
      } else if (latestInput === "3") {
        await sessionsRepo.setSession(sessionId, { step: "price_crop", data });
        response = "CON Which crop do you want the price for? (e.g. tomato)";
      } else if (latestInput === "4") {
        const user = await usersRepo.findUserByPhone(phoneNumber);
        if (!user) {
          await sessionsRepo.clearSession(sessionId);
          response = "END No account found for this number. Please register first (option 1).";
        } else {
          response = await buildStatusReport(user);
          await sessionsRepo.clearSession(sessionId);
        }
      } else if (latestInput === "0") {
        await sessionsRepo.clearSession(sessionId);
        response = "END Thank you for using AgriSmart AI.";
      } else {
        response = "CON Sorry, invalid choice.\n" + mainMenu().replace("CON ", "");
      }
      break;
    }

    case "register_name": {
      data.name = latestInput;
      await sessionsRepo.setSession(sessionId, { step: "register_role", data });
      response = "CON Select your role:\n1. Farmer\n2. Buyer";
      break;
    }

    case "register_role": {
      const role = ROLE_MAP[latestInput];
      if (!role) {
        response = "CON Invalid choice. Select your role:\n1. Farmer\n2. Buyer";
        break;
      }
      data.role = role;
      await sessionsRepo.setSession(sessionId, { step: "register_location", data });
      response = "CON What is your town/market location?";
      break;
    }

    case "register_location": {
      data.location = latestInput;
      const existing = await usersRepo.findUserByPhone(phoneNumber);
      if (existing) {
        await sessionsRepo.clearSession(sessionId);
        response = "END An account already exists for this phone number.";
        break;
      }
      if (data.role === "farmer") {
        await sessionsRepo.setSession(sessionId, { step: "farmer_crop", data });
        response = "CON Optional: list the crops you grow (comma-separated, e.g. tomato,maize).\nReply 0 to skip.";
      } else if (data.role === "buyer") {
        await sessionsRepo.setSession(sessionId, { step: "buyer_type", data });
        response = "CON What type of buyer are you?\n1. Wholesale/Institutional\n2. Retail/Market seller\n3. Processor";
      } else if (data.role === "market_seller") {
        await sessionsRepo.setSession(sessionId, { step: "buyer_crop", data });
        response = "CON Optional: crops you usually buy (comma-separated, e.g. tomato,pepper).\nReply 0 to skip.";
      } else {
        const user = await createUserFromSession(session, phoneNumber);
        const bits = finishRegistration(session, phoneNumber);
        await sessionsRepo.clearSession(sessionId);
        response = `END Registration complete. Welcome, ${user.name}! You are registered as a ${bits.roleBits} (language: ${bits.lang}).`;
      }
      break;
    }

    case "buyer_type": {
      const buyerType = BUYER_TYPE_MAP[latestInput];
      if (!buyerType) {
        response = "CON Invalid choice. What type of buyer are you?\n1. Wholesale/Institutional\n2. Retail/Market seller\n3. Processor";
        break;
      }
      data.buyerType = buyerType;
      await sessionsRepo.setSession(sessionId, { step: "buyer_crop", data });
      response = "CON Optional: crops you usually buy (comma-separated, e.g. tomato,pepper).\nReply 0 to skip.";
      break;
    }

    case "buyer_crop": {
      if (latestInput !== "0") {
        data.purchaseCrops = latestInput.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
      }
      await sessionsRepo.setSession(sessionId, { step: "buyer_language", data });
      response = "CON Optional: preferred language?\n1. English\n2. Twi\n0. Skip";
      break;
    }

    case "buyer_language": {
      if (LANG_MAP[latestInput]) data.language = LANG_MAP[latestInput];
      const user = await createUserFromSession(session, phoneNumber);
      const bits = finishRegistration(session, phoneNumber);
      const extra = (user.purchaseCrops && user.purchaseCrops.length ? ` You buy: ${user.purchaseCrops.join(", ")}.` : "");
      await sessionsRepo.clearSession(sessionId);
      response = `END Registration complete. Welcome, ${user.name}! You are registered as a ${bits.roleBits} (language: ${bits.lang}).${extra}`;
      break;
    }

    case "farmer_crop": {
      if (latestInput !== "0") {
        data.primaryCrops = latestInput.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
      }
      await sessionsRepo.setSession(sessionId, { step: "farmer_language", data });
      response = "CON Optional: preferred language?\n1. English\n2. Twi\n0. Skip";
      break;
    }

    case "farmer_language": {
      if (LANG_MAP[latestInput]) data.language = LANG_MAP[latestInput];
      const user = await createUserFromSession(session, phoneNumber);
      const bits = finishRegistration(session, phoneNumber);
      const extra = (user.primaryCrops && user.primaryCrops.length ? ` You listed: ${user.primaryCrops.join(", ")}.` : "");
      await sessionsRepo.clearSession(sessionId);
      response = `END Registration complete. Welcome, ${user.name}! You are registered as a ${bits.roleBits} (language: ${bits.lang}).${extra}`;
      break;
    }

    case "list_crop": {
      data.cropType = latestInput;
      await sessionsRepo.setSession(sessionId, { step: "list_quantity", data });
      response = "CON Quantity (number of bags/baskets)?";
      break;
    }

    case "list_quantity": {
      const qty = Number(latestInput);
      if (!qty || qty <= 0) {
        response = "CON Please enter a valid quantity (number of bags/baskets):";
        break;
      }
      data.quantity = qty;
      await sessionsRepo.setSession(sessionId, { step: "list_harvest_date", data });
      response = "CON Expected harvest date? (YYYY-MM-DD)";
      break;
    }

    case "list_harvest_date": {
      data.harvestDate = latestInput;
      await sessionsRepo.setSession(sessionId, { step: "list_price", data });
      response = "CON Your asking price (GHS)?";
      break;
    }

    case "list_price": {
      const price = Number(latestInput);
      if (!price || price <= 0) {
        response = "CON Please enter a valid asking price (GHS):";
        break;
      }
      const farmer = await usersRepo.getUser(data.farmerId);
      const listing = await listingsRepo.createListing({
        farmerId: farmer.id,
        cropType: data.cropType,
        quantity: data.quantity,
        harvestDate: data.harvestDate,
        askingPrice: price,
        location: farmer.location,
      });
      await sessionsRepo.clearSession(sessionId);
      response = `END Listing created: ${listing.quantity} bags of ${listing.cropType}, asking GHS ${listing.askingPrice}. Buyers can now find it on AgriSmart AI.`;
      break;
    }

    case "price_crop": {
      const price = await pricesRepo.currentPrice({ cropType: latestInput });
      if (!price) {
        response = `END No recent price data for "${latestInput}" yet.`;
      } else {
        response = `END Current average price for ${price.cropType} (${price.market}, as of ${price.date}): GHS ${price.averagePrice}.`;
      }
      await sessionsRepo.clearSession(sessionId);
      break;
    }

    default: {
      await sessionsRepo.clearSession(sessionId);
      response = "END Session error. Please dial in again.";
    }
  }

  return response;
}

module.exports = { handle };
