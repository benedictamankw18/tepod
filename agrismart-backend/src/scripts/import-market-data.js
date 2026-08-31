// import-market-data.js
// One-off / re-runnable import of the two market-data CSVs shipped in the repo's
// csv/ folder into the tables created by migration 0037:
//   1. "Commodity prices _04.11.25.csv"  -> market_prices (regional retail guide,
//      GHS/kg) — only rows mapping to a canonical crop_types key are kept.
//   2. "national cropped area 2019 to 2023.csv" -> crop_area (national hectares).
// Idempotent: each run replaces the previous import in a single transaction.
//
// Usage: npm run import:market-data

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const marketData = require("../repositories/marketData");

const CSV_DIR = process.env.MARKET_CSV_DIR || path.join(__dirname, "..", "..", "..", "csv");
const PRICES_FILE = process.env.MARKET_PRICES_CSV || path.join(CSV_DIR, "Commodity prices _04.11.25.csv");
const AREA_FILE = process.env.MARKET_AREA_CSV || path.join(CSV_DIR, "national cropped area 2019 to 2023.csv");

// Source survey commodity name -> canonical crop_types key. Only these are ranked
// by the demand guide; the rest of the survey (meat, fish, oils, dried produce, ...)
// is not part of the crop universe and is skipped.
const COMMODITY_MAP = {
  "white maize": "maize",
  "maize yellow": "maize",
  "tomato local": "tomato",
  "tomato navrongo": "tomato",
  "fresh pepper legon 18": "pepper",
  "fresh pepper bonnet": "pepper",
  "dried pepper legon 18": "pepper",
  onion: "onion",
  "rice local perfumed": "rice",
  "rice local non perfumed": "rice",
  "rice imported perfumed": "rice",
  "rice imported non perfumed": "rice",
  "yam white": "yam",
  "yam puna": "yam",
  "plantain apentu": "plantain",
  "plantain apem": "plantain",
  "plantain riped": "plantain",
  cassava: "cassava",
  "dried cassava chips kokonte": "cassava",
  "dried cassava powder kokonte": "cassava",
  "cassava dough": "cassava",
  cocoyam: "cocoyam",
  "groundnut red": "groundnut",
  "unshelled groundnut": "groundnut",
  "garden egg": "garden eggs",
  cabbage: "cabbage",
  pineapple: "pineapple",
  "mango exotic": "mango",
  "mango local": "mango",
  "banana exotic": "banana",
  "banana local": "banana",
};

// National-area CSV commodity -> canonical key.
const AREA_MAP = {
  cassava: "cassava",
  cocoyam: "cocoyam",
  groundnut: "groundnut",
  maize: "maize",
  onion: "onion",
  pepper: "pepper",
  plantain: "plantain",
  rice: "rice",
  tomato: "tomato",
  yam: "yam",
};

const norm = (s) => String(s || "")
  .replace(/[^\w\s]/g, "")
  .toLowerCase()
  .trim();

// Case-insensitive column lookup (the survey CSV mixes casing, e.g. "region" but
// "Market" and "Price").
function pick(source, ...names) {
  for (const n of names) {
    if (source[n] !== undefined && source[n] !== "") return source[n];
  }
  const lower = new Map(Object.entries(source).map(([k, v]) => [k.toLowerCase(), v]));
  for (const n of names) {
    if (lower.has(n.toLowerCase())) {
      const v = lower.get(n.toLowerCase());
      if (v !== undefined && v !== "") return v;
    }
  }
  return "";
}

// CSV "16-07-2025" -> ISO "2025-07-16".
function parseDmy(value, sourceRow) {
  const m = String(value || "").match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim())) return value.trim();
  throw new Error(`Unrecognized date "${value}" (row ${sourceRow})`);
}

function parsePrice(value, sourceRow) {
  const n = Number(String(value || "").replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid price "${value}" (row ${sourceRow})`);
  return n;
}

function parseInt(value, sourceRow) {
  const n = Number(String(value || "").replace(/[,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid integer "${value}" (row ${sourceRow})`);
  return n;
}

function readPricesFile() {
  const raw = fs.readFileSync(PRICES_FILE, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, bom: true });

  const imported = [];
  const skipped = { noRegion: 0, noMarket: 0, unlisted: 0, badDate: 0, badPrice: 0 };
  const skippedNames = new Map();

  for (let i = 0; i < rows.length; i++) {
    const src = rows[i];
    const region = String(pick(src, "region", "Region")).trim();
    const market = String(pick(src, "market", "Market")).trim();

    if (!region) {
      skipped.noRegion++;
      continue;
    }
    if (!market) {
      skipped.noMarket++;
      continue;
    }

    const key = COMMODITY_MAP[norm(pick(src, "commodity", "Commodity"))];
    if (!key) {
      skipped.unlisted++;
      const name = norm(pick(src, "commodity", "Commodity"));
      if (name && !skippedNames.has(name)) skippedNames.set(name, (skippedNames.get(name) || 0) + 1);
      continue;
    }

    let date;
    try {
      date = parseDmy(pick(src, "market_day", "date"), i + 2);
    } catch (e) {
      skipped.badDate++;
      continue;
    }
    let price;
    try {
      price = parsePrice(pick(src, "Price", "price"), i + 2);
    } catch (e) {
      skipped.badPrice++;
      continue;
    }

    imported.push({
      region,
      district: String(pick(src, "district", "District")).trim(),
      market,
      commodity_key: key,
      commodity_name: String(pick(src, "commodity", "Commodity")).trim(),
      price,
      date,
      source: String(pick(src, "Type", "source")).trim() || "retail",
    });
  }

  return {
    rows: imported,
    skippedSummary: {
      ...skipped,
      skippedCommodities: [...skippedNames.keys()],
    },
  };
}

function readAreaFile() {
  const raw = fs.readFileSync(AREA_FILE, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, bom: true });
  const years = [2019, 2020, 2021, 2022, 2023];
  const imported = [];
  let unlisted = 0;

  for (let i = 0; i < rows.length; i++) {
    const src = rows[i];
    const key = AREA_MAP[norm(src.COMMODITY)];
    if (!key) {
      unlisted++;
      continue;
    }
    for (const year of years) {
      const value = src[String(year)];
      if (value === undefined || value === null || String(value).trim() === "") continue;
      imported.push({
        commodity_key: key,
        commodity_name: String(src.COMMODITY || "").trim(),
        year,
        hectares: parseInt(value, i + 2),
      });
    }
  }

  return { rows: imported, unlisted };
}

async function main() {
  console.log(`Importing market data from ${CSV_DIR} …`);

  const prices = readPricesFile();
  console.log(
    `Price surveys: ${prices.rows.length} rows kept (of ${prices.rows.length + prices.skippedSummary.badDate + prices.skippedSummary.badPrice + prices.skippedSummary.noMarket + prices.skippedSummary.noRegion + prices.skippedSummary.unlisted}) — ` +
      `skipped ${prices.skippedSummary.noRegion} no-region, ${prices.skippedSummary.noMarket} no-market, ` +
      `${prices.skippedSummary.badDate} bad-date, ${prices.skippedSummary.badPrice} bad-price, ` +
      `${prices.skippedSummary.unlisted} non-canonical (e.g. ${(prices.skippedSummary.skippedCommodities || []).slice(0, 8).join(", ")}).`
  );

  const area = readAreaFile();
  console.log(`Area stats: ${area.rows.length} rows kept (${area.unlisted} commodity rows skipped as non-canonical).`);

  const priceRows = await marketData.replaceMarketPrices(prices.rows);
  const areaRows = await marketData.replaceCropArea(area.rows);

  const regions = await marketData.distinctRegions();
  console.log(`Done. market_prices ← ${priceRows} rows (${regions.length} regions: ${regions.map((r) => r.region).join(", ")}); crop_area ← ${areaRows} rows.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err.message || err);
  process.exit(1);
});