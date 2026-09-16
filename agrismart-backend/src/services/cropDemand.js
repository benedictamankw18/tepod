// cropDemand.js
// Builds the "AI crop demand guide" from the regional market-sales data imported
// from the repository's csv/ folder (migration 0037): real retail price surveys
// per region/commodity plus national cultivated-area statistics 2019-2023.
//
// The guide ranks which crops show the strongest demand signals (a score 0-100 with
// a high/medium/low level + direction), computed only from recorded market facts:
//   - momentum: how the last month's price compares with the month before
//   - level:    how the crop's current price compares with its own survey average
//   - seasonal: how prices in the month a farmer's planned harvest would land
//               compare with the overall survey average (only when plantMonth set)
//   - supply:   national cultivated-area trend 2019-2023 (context, not a penalty)
// The LLM (OpenRouter) only restates these computed rows in plain language; when it
// is unavailable the rule-based advice below is served instead.

const marketData = require("../repositories/marketData");
const cropsRepo = require("../repositories/crops");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_TO_HARVEST = {
  tomato: 3,
  pepper: 3,
  maize: 3,
  "garden eggs": 3,
  cabbage: 3,
  groundnut: 3,
  onion: 4,
  rice: 4,
  yam: 9,
  cocoyam: 10,
  cassava: 10,
  plantain: 10,
  banana: 9,
  mango: 12,
  pineapple: 16,
};
const DEFAULT_MONTHS_TO_HARVEST = 3;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round1 = (n) => Math.round(Number(n) * 10) / 10;
const round2 = (n) => Math.round(Number(n) * 100) / 100;

function mean(xs) {
  if (!xs.length) return 0;
  return xs.reduce((s, x) => s + Number(x), 0) / xs.length;
}

function monthOf(dateStr) {
  return Number(dateStr.slice(5, 7));
}

function monthName(m) {
  return MONTHS[(m - 1) % 12];
}

function windowLabel(from, to) {
  if (!from || !to) return "–";
  return `${monthName(monthOf(from))}–${monthName(monthOf(to))} ${from.slice(0, 4)}`;
}

function formatGhs(n) {
  return `GH₵${Number(n).toFixed(2)}`;
}

function pct(n) {
  return `${n > 0 ? "+" : ""}${round1(n).toFixed(1)}%`;
}

function directionFor(pctValue, threshold = 2) {
  if (pctValue > threshold) return "up";
  if (pctValue < -threshold) return "down";
  return "steady";
}

// Demand-level bucket from a 0-100 score. Calibrated so "rising above its own
// norm" lands high, "flat at its own norm" medium, "falling/below norm" low.
function levelFor(score) {
  if (score >= 62) return "high";
  if (score >= 42) return "medium";
  return "low";
}

// Score = weighted blend of momentum, price level and (when available) the seasonal
// signal for a planned harvest month. All components map to [0, 1] around a neutral 0.5.
function scoreFor({ trendPct, levelPct, seasonalLift }) {
  const sTrend = 0.5 + clamp(trendPct, -15, 15) / 30;
  const sLevel = 0.5 + clamp(levelPct, -20, 20) / 40;
  const sSeason =
    seasonalLift === undefined || seasonalLift === null ? 0.5 : 0.5 + clamp(seasonalLift, -25, 25) / 50;
  return Math.round(100 * (0.5 * sTrend + 0.3 * sLevel + 0.2 * sSeason));
}

// True when the month is covered by the observed survey window.
function monthInWindow(month, window) {
  if (!window) return false;
  const lo = monthOf(window.from);
  const hi = monthOf(window.to);
  if (lo <= hi) return month >= lo && month <= hi;
  return month >= lo || month <= hi; // year rollover window (not expected for this data)
}

function splitRecentPrior(rows) {
  // rows are ascending by date. "recent" = last 30 days of the series, "prior" =
  // the 30 days before that; when the series is short the halves are used instead.
  if (!rows.length) return { recent: [], prior: [] };
  const maxDate = rows[rows.length - 1].date;
  const cutoff = new Date(`${maxDate}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = rows.filter((r) => r.date > cutoffStr);
  if (recent.length) {
    const prior = rows.filter((r) => r.date <= cutoffStr);
    return { recent, prior: prior.slice(-30) };
  }
  // Fewer than ~a month of samples: split the series in half.
  const mid = Math.floor(rows.length / 2);
  return { recent: rows.slice(mid), prior: rows.slice(0, mid) };
}

// Compute a single commodity's demand row from its raw survey rows + area stats.
function buildCommodity({ key, meta, rows, window, plantMonth, area }) {
  if (!rows || rows.length < 2) return null;

  const { recent, prior } = splitRecentPrior(rows);
  const recentAvg = mean(recent.map((r) => r.price));
  const priorAvg = mean(prior.map((r) => r.price));
  const overallAvg = mean(rows.map((r) => r.price));
  const trendPct = priorAvg ? round1(((recentAvg - priorAvg) / priorAvg) * 100) : 0;
  const levelPct = overallAvg ? round1(((recentAvg - overallAvg) / overallAvg) * 100) : 0;
  const direction = directionFor(trendPct);

  // Seasonal signal for a planned harvest month (plantMonth requested).
  const drivers = [];
  let seasonal = null;
  if (plantMonth) {
    const monthsToHarvest = MONTHS_TO_HARVEST[key] ?? DEFAULT_MONTHS_TO_HARVEST;
    const harvestMonth = ((plantMonth - 1 + monthsToHarvest) % 12) + 1;
    if (!monthInWindow(harvestMonth, window)) {
      drivers.push(`Harvest around ${monthName(harvestMonth)} sits outside the survey window (${windowLabel(window.from, window.to)}) — no seasonal signal is available for it.`);
    } else {
      const monthRows = rows.filter((r) => monthOf(r.date) === harvestMonth);
      if (monthRows.length) {
        const seasonAvg = mean(monthRows.map((r) => r.price));
        const lift = overallAvg ? round1(((seasonAvg - overallAvg) / overallAvg) * 100) : 0;
        seasonal = { harvestMonth, name: monthName(harvestMonth), liftPct: lift };
        drivers.push(
          `Prices in ${monthName(harvestMonth)} (your ${monthName(plantMonth)} planting → ${monthName(harvestMonth)} harvest) run ${round1(Math.abs(lift)).toFixed(1)}% ${lift >= 0 ? "above" : "below"} the survey average.`
        );
      }
    }
  }

  // National supply-context driver (cultivated area trend 2019→2023).
  let areaTrend = null;
  if (area && area.length >= 2) {
    const first = area[0];
    const last = area[area.length - 1];
    const base = Number(first.hectares);
    if (base > 0 && last.year > first.year) {
      const areaPct = round1(((Number(last.hectares) - base) / base) * 100);
      const dir = directionFor(areaPct, 5);
      areaTrend = { pct: areaPct, direction: dir };
      drivers.push(
        `Nationally, the area planted to ${meta ? meta.name : key} ${dir === "up" ? "grew" : dir === "down" ? "shrank" : "held steady"} ${round1(Math.abs(areaPct)).toFixed(0)}% between ${first.year} and ${last.year}.`
      );
    }
  }

  drivers.push(
    `Last month ${recentAvg !== priorAvg ? (recentAvg > priorAvg ? "prices moved up" : "prices moved down") : "prices held level"} ${pct(trendPct)} (recent average ${formatGhs(recentAvg)}/kg vs ${formatGhs(priorAvg)}/kg before).`
  );
  drivers.push(
    `${meta ? meta.name : key} is trading ${levelPct >= 0 ? "above" : "below"} its usual level this period (${pct(levelPct)} vs the ${windowLabel(window.from, window.to)} average of ${formatGhs(overallAvg)}/kg).`
  );

  const seasonalLift = seasonal ? seasonal.liftPct : null;
  const score = scoreFor({ trendPct, levelPct, seasonalLift });

  return {
    cropType: key,
    name: meta ? meta.name : key,
    emoji: meta ? meta.emoji : null,
    demandLevel: levelFor(score),
    direction,
    score,
    price: {
      avg: round2(recentAvg),
      priorAvg: round2(priorAvg),
      overallAvg: round2(overallAvg),
      trendPct,
      levelPct,
    },
    seasonal,
    areaTrend,
    samples: rows.length,
    drivers,
  };
}

function formatMonths(m) {
  return m.map(monthName).join(", ");
}

function ruleAdvice(commodities, { regionLabel, plantMonth, window }) {
  const top = commodities[0];
  const second = commodities[1];
  const reasons = commodities.slice(0, 3).map((c) => {
    const lvl = c.demandLevel === "high" ? "strong" : c.demandLevel === "low" ? "weak" : "steady";
    return `${c.name} shows ${lvl} demand signals (score ${c.score}/100, ${c.direction === "up" ? "prices rising" : c.direction === "down" ? "prices easing" : "prices steady"} over the last month).`;
  });

  const nextSteps = [
    "Open the Price guide to see where each crop sells for most, then match those markets.",
    top ? `Plan the biggest share of your planting around ${top.name} while its demand signals hold.` : "Plant whichever crops you can market close to home.",
  ];
  if (plantMonth && top && top.seasonal) {
    nextSteps.push(
      `With a ${monthName(plantMonth)} planting, ${top.name} would be ready around ${top.seasonal.name}, when prices run ${round1(Math.abs(top.seasonal.liftPct)).toFixed(1)}% ${top.seasonal.liftPct >= 0 ? "above" : "below"} the survey average — worth leaning into or hedging against.`
    );
  }

  return {
    recommendation: top
      ? `${top.name} carries the strongest demand signals in ${regionLabel} right now, with ${second ? second.name.toLowerCase() : "several other crops"} close behind.`
      : "Market signals are thin right now — review the Price guide before committing new plantings.",
    reasons: reasons.slice(0, 3),
    warning: `Demand signals come from recorded market surveys (${windowLabel(window.from, window.to)}) and national planting statistics — they forecast what prices look like now and around your planned harvest, not a guarantee of future prices.`,
    nextSteps,
    source: "rules",
  };
}

// Live wrapper: pulls survey rows + crop stats and returns the demand-guide payload.
async function demandGuide({ region, plantMonth } = {}) {
  const regions = await marketData.distinctRegions();
  const regionNames = regions.map((r) => r.region);
  const regionLabel = region || "All regions";

  const window = await marketData.observedWindow();
  const rows = await marketData.marketRows({ region: region ? regionLabel : null });
  const areaRows = await marketData.cropAreaRows();
  const cropTypes = await cropsRepo.listCropTypes();
  const metaById = new Map(cropTypes.map((c) => [c.id, c]));

  if (!rows.length) {
    return {
      available: false,
      region: region || null,
      regionLabel,
      plantMonth: plantMonth || null,
      commodities: [],
      availableRegions: regionNames,
      observed: window ? windowLabel(window.from, window.to) : "–",
      attribution: "Regional commodity price surveys (retail, GHS/kg) · national crop statistics 2019–2023",
      generatedAt: new Date().toISOString(),
      advice: null,
    };
  }

  const byCommodity = new Map();
  for (const r of rows) {
    if (!byCommodity.has(r.commodityKey)) byCommodity.set(r.commodityKey, []);
    byCommodity.get(r.commodityKey).push(r);
  }
  const areaByCommodity = new Map();
  for (const a of areaRows) {
    if (!areaByCommodity.has(a.commodityKey)) areaByCommodity.set(a.commodityKey, []);
    areaByCommodity.get(a.commodityKey).push(a);
  }

  const commodities = [];
  for (const [key, series] of byCommodity) {
    const meta = metaById.get(key);
    if (!meta) continue; // only canonical crop types are ranked
    const row = buildCommodity({ key, meta, rows: series, window, plantMonth, area: areaByCommodity.get(key) });
    if (row) commodities.push(row);
  }
  commodities.sort((a, b) => b.score - a.score);

  return {
    available: commodities.length > 0,
    region: region || null,
    regionLabel,
    plantMonth: plantMonth || null,
    commodities,
    availableRegions: regionNames,
    observed: window ? windowLabel(window.from, window.to) : "–",
    observedMonths: window ? formatMonths([monthOf(window.from), monthOf(window.to)]) : "–",
    attribution: "Regional commodity price surveys (retail, GHS/kg) · national crop statistics 2019–2023",
    generatedAt: new Date().toISOString(),
    advice: commodities.length ? ruleAdvice(commodities, { regionLabel, plantMonth, window }) : null,
  };
}

async function listRegions() {
  return marketData.distinctRegions();
}

module.exports = { demandGuide, listRegions, buildCommodity, levelFor, scoreFor };