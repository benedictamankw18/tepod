// ussd.js
// Simulates a USSD gateway webhook (Africa's Talking-style contract: POST { sessionId,
// phoneNumber, text } -> plain-text response prefixed "CON " to continue the session
// or "END " to close it). Session state is kept server-side keyed by sessionId, per the
// stateless-friendly design note in Phase 1 (§2.4) so this drops into a real gateway
// integration in Phase 3 without changing the menu logic.
//
// Covers FR-8.2: registration, list-produce, check-price, and pre-commitment status,
// all reachable from a basic feature phone with no data connection.

const express = require("express");
const store = require("./store");

const router = express.Router();

function mainMenu() {
  return (
    "CON Welcome to AgriSmart AI\n" +
    "1. Register\n" +
    "2. List my produce\n" +
    "3. Check crop price\n" +
    "4. Check pre-commitment status\n" +
    "0. Exit"
  );
}

router.post("/", (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;
  if (!sessionId || !phoneNumber) {
    return res.status(400).type("text/plain").send("END sessionId and phoneNumber are required.");
  }

  // Africa's Talking sends the FULL accumulated input each request, '*'-separated.
  const parts = (text || "").split("*").filter((p) => p !== "");
  const latestInput = parts.length ? parts[parts.length - 1] : "";

  let session = store.getSession(sessionId);
  if (!session) {
    session = { step: "main", data: {} };
    store.setSession(sessionId, session);
  }

  let response;

  switch (session.step) {
    case "main": {
      if (parts.length === 0) {
        response = mainMenu();
      } else if (latestInput === "1") {
        session.step = "register_name";
        response = "CON What is your full name?";
      } else if (latestInput === "2") {
        const farmer = store.findUserByPhone(phoneNumber);
        if (!farmer || farmer.role !== "farmer") {
          store.clearSession(sessionId);
          response = "END This option is for registered farmers. Please register first (option 1).";
          break;
        }
        session.data.farmerId = farmer.id;
        session.step = "list_crop";
        response = "CON What crop are you listing? (e.g. tomato)";
      } else if (latestInput === "3") {
        session.step = "price_crop";
        response = "CON Which crop do you want the price for? (e.g. tomato)";
      } else if (latestInput === "4") {
        const user = store.findUserByPhone(phoneNumber);
        if (!user) {
          store.clearSession(sessionId);
          response = "END No account found for this number. Please register first (option 1).";
          break;
        }
        response = buildStatusReport(user);
        store.clearSession(sessionId);
      } else if (latestInput === "0") {
        store.clearSession(sessionId);
        response = "END Thank you for using AgriSmart AI.";
      } else {
        response = "CON Sorry, invalid choice.\n" + mainMenu().replace("CON ", "");
      }
      break;
    }

    case "register_name": {
      session.data.name = latestInput;
      session.step = "register_role";
      response = "CON Select your role:\n1. Farmer\n2. Buyer\n3. Market Seller\n4. Transport Provider";
      break;
    }

    case "register_role": {
      const roleMap = { 1: "farmer", 2: "buyer", 3: "market_seller", 4: "transporter" };
      const role = roleMap[latestInput];
      if (!role) {
        response = "CON Invalid choice. Select your role:\n1. Farmer\n2. Buyer\n3. Market Seller\n4. Transport Provider";
        break;
      }
      session.data.role = role;
      session.step = "register_location";
      response = "CON What is your town/market location?";
      break;
    }

    case "register_location": {
      session.data.location = latestInput;
      if (store.findUserByPhone(phoneNumber)) {
        response = "END An account already exists for this phone number.";
        store.clearSession(sessionId);
        break;
      }
      if (session.data.role === "farmer") {
        // Optional follow-ups only for farmers; core 3-step flow stays intact (NFR-2.1).
        session.step = "farmer_crop";
        response = "CON Optional: list the crops you grow (comma-separated, e.g. tomato,maize).\nReply 0 to skip.";
      } else if (session.data.role === "buyer") {
        // buyerType is REQUIRED for buyers - it shapes the trust signal farmers see (FR-1.4).
        session.step = "buyer_type";
        response = "CON What type of buyer are you?\n1. Wholesale/Institutional\n2. Retail/Market seller\n3. Processor";
      } else if (session.data.role === "market_seller") {
        // Category is implicit in the role (retail); capture optional crop + language only.
        session.step = "buyer_crop";
        response = "CON Optional: crops you usually buy (comma-separated, e.g. tomato,pepper).\nReply 0 to skip.";
      } else {
        response = finishRegistration(session, phoneNumber);
      }
      break;
    }

    case "buyer_type": {
      const typeMap = { 1: "wholesale", 2: "retail", 3: "processor" };
      const buyerType = typeMap[latestInput];
      if (!buyerType) {
        response = "CON Invalid choice. What type of buyer are you?\n1. Wholesale/Institutional\n2. Retail/Market seller\n3. Processor";
        break;
      }
      session.data.buyerType = buyerType;
      session.step = "buyer_crop";
      response = "CON Optional: crops you usually buy (comma-separated, e.g. tomato,pepper).\nReply 0 to skip.";
      break;
    }

    case "buyer_crop": {
      if (latestInput !== "0") {
        session.data.purchaseCrops = latestInput.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
      }
      session.step = "buyer_language";
      response = "CON Optional: preferred language?\n1. English\n2. Twi\n0. Skip";
      break;
    }

    case "buyer_language": {
      const langMap = { 1: "en", 2: "tw" };
      if (langMap[latestInput]) session.data.language = langMap[latestInput];
      response = finishRegistration(session, phoneNumber);
      break;
    }

    case "farmer_crop": {
      if (latestInput !== "0") {
        session.data.primaryCrops = latestInput.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
      }
      session.step = "farmer_language";
      response = "CON Optional: preferred language?\n1. English\n2. Twi\n0. Skip";
      break;
    }

    case "farmer_language": {
      const langMap = { 1: "en", 2: "tw" };
      if (langMap[latestInput]) session.data.language = langMap[latestInput];
      response = finishRegistration(session, phoneNumber);
      break;
    }

    case "list_crop": {
      session.data.cropType = latestInput;
      session.step = "list_quantity";
      response = "CON Quantity (number of bags/baskets)?";
      break;
    }

    case "list_quantity": {
      const qty = Number(latestInput);
      if (!qty || qty <= 0) {
        response = "CON Please enter a valid quantity (number of bags/baskets):";
        break;
      }
      session.data.quantity = qty;
      session.step = "list_harvest_date";
      response = "CON Expected harvest date? (YYYY-MM-DD)";
      break;
    }

    case "list_harvest_date": {
      session.data.harvestDate = latestInput;
      session.step = "list_price";
      response = "CON Your asking price (GHS)?";
      break;
    }

    case "list_price": {
      const price = Number(latestInput);
      if (!price || price <= 0) {
        response = "CON Please enter a valid asking price (GHS):";
        break;
      }
      const farmer = store.getUser(session.data.farmerId);
      const listing = store.createListing({
        farmerId: farmer.id,
        cropType: session.data.cropType,
        quantity: session.data.quantity,
        harvestDate: session.data.harvestDate,
        askingPrice: price,
        location: farmer.location,
      });
      response = `END Listing created: ${listing.quantity} bags of ${listing.cropType}, asking GHS ${listing.askingPrice}. Buyers can now find it on AgriSmart AI.`;
      store.clearSession(sessionId);
      break;
    }

    case "price_crop": {
      const price = store.currentPrice({ cropType: latestInput });
      if (!price) {
        response = `END No recent price data for "${latestInput}" yet.`;
      } else {
        response = `END Current average price for ${price.cropType} (${price.market}, as of ${price.date}): GHS ${price.averagePrice}.`;
      }
      store.clearSession(sessionId);
      break;
    }

    default: {
      store.clearSession(sessionId);
      response = "END Session error. Please dial in again.";
    }
  }

  store.setSession(sessionId, session);
  res.type("text/plain").send(response);
});

function finishRegistration(session, phoneNumber) {
  const user = store.createUser({
    name: session.data.name,
    phone: phoneNumber,
    role: session.data.role,
    location: session.data.location,
    primaryCrops: session.data.primaryCrops,
    purchaseCrops: session.data.purchaseCrops,
    buyerType: session.data.buyerType,
    language: session.data.language,
  });
  const lang = user.language === "tw" ? "Twi" : "English";
  const typeLabel = { wholesale: "wholesale", retail: "retail", processor: "processor" }[user.buyerType];
  const roleName = user.role.replace("_", " ");
  const roleBits = user.role === "buyer" && typeLabel ? `${typeLabel} buyer` : roleName;
  const extra = (user.primaryCrops && user.primaryCrops.length
    ? ` You listed: ${user.primaryCrops.join(", ")}.`
    : (user.purchaseCrops && user.purchaseCrops.length ? ` You buy: ${user.purchaseCrops.join(", ")}.` : ""));
  return `END Registration complete. Welcome, ${user.name}! You are registered as a ${roleBits} (language: ${lang}).${extra}`;
}

function buildStatusReport(user) {
  if (user.role === "farmer") {
    const listings = store.searchListings({}).filter((l) => l.farmerId === user.id);
    if (listings.length === 0) return "END You have no active listings.";
    const lines = listings.slice(0, 3).map((l) => {
      const pcs = store.preCommitmentsForListing(l.id);
      const pending = pcs.filter((p) => p.status === "pending").length;
      return `${l.cropType} (${l.status}), ${pending} pending offer(s)`;
    });
    return "END Your listings:\n" + lines.join("\n");
  }
  if (user.role === "buyer" || user.role === "market_seller") {
    const pcs = store.preCommitmentsForBuyer(user.id);
    if (pcs.length === 0) return "END You have no pre-commitments yet.";
    const lines = pcs.slice(0, 3).map((p) => {
      const listing = store.getListing(p.listingId);
      return `${listing ? listing.cropType : "listing"}: ${p.status}`;
    });
    return "END Your pre-commitments:\n" + lines.join("\n");
  }
  return "END Status check is available for farmers and buyers.";
}

module.exports = router;
