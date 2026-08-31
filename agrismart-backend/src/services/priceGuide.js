// priceGuide.js
// Builds the "AI price guide" payload from the same prices table the Prices page
// uses: current price, recent averages, a short 3-day estimate, a confidence level,
// and a cross-market comparison so a farmer can see where the same crop sells for
// more (guide §21).
//
// The 3-day forecast is the guide's "start simple" statistical method — a blend of
// the current price (baseline) and a 7-day moving average with a linear-trend drift,
// clamped to ±15% of today. No ML, no LLM: this is plain stats computed here in JS.
// The LLM only restates the result in farmer-friendly language.

const pricesRepo = require("../repositories/prices");

const round2 = (n) => Math.round(Number(n) * 100) / 100;

function normalizeMarket(market) {
  const m = String(market || "").trim().toLowerCase();
  if (!m || m === "all" || m === "all markets") return null;
  return String(market).trim();
}

function mean(xs) {
  if (!xs.length) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function stddev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) * (x - m))));
}

// Least-squares slope over the last `n` points (index vs value), in per-day units,
// or 0 when there are too few points.
function slopeOf(values) {
  if (values.length < 3) return 0;
  const n = values.length;
  const pts = values.slice(-14).map((v, i) => [i, v]);
  const xm = mean(pts.map((p) => p[0]));
  const ym = mean(pts.map((p) => p[1]));
  let num = 0;
  let den = 0;
  for (const [x, y] of pts) {
    num += (x - xm) * (y - ym);
    den += (x - xm) * (x - xm);
  }
  return den ? num / den : 0;
}

// Turn flat price rows into one { date, value } per day (mean across markets when no
// single market is requested), ascending by date.
function dailySeries(rows) {
  const byDate = new Map();
  for (const r of rows) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(Number(r.price));
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, prices]) => ({ date, value: round2(mean(prices)) }));
}

// Pure guide builder (exported for unit tests). `daily` is the ascending
// { date, value } series; `comparison` is an optional cross-market breakdown.
function buildGuide({ cropType, market, daily, comparison }) {
  const values = daily.map((d) => d.value);
  const today = daily.length ? daily[daily.length - 1] : null;

  if (!today || daily.length === 0) {
    return {
      cropType,
      market: market || "all markets",
      available: false,
      current: null,
      averages: { days7: null, days14: null, days30: null },
      trend: { pct: 0, direction: "steady", label: "Not enough data yet" },
      forecast: null,
      confidence: { level: "low", reason: "No price history for this crop and market." },
      comparison: comparison || [],
      advice: null,
    };
  }

  const current = today.value;
  const avg7 = round2(mean(values.slice(-7)));
  const avg14 = round2(mean(values.slice(-14)));
  const avg30 = round2(mean(values.slice(-30)));
  const vol = stddev(values.slice(-14));

  // Trend over 14 days (or the whole window when it's shorter).
  const trendBase = daily.length >= 14 ? avg14 : mean(values);
  const pct = trendBase ? ((current - trendBase) / trendBase) * 100 : 0;
  const direction = pct > 5 ? "up" : pct < -5 ? "down" : "steady";
  const trendLabel = direction === "up"
    ? `Prices are rising ${pct.toFixed(1)}% over the last two weeks`
    : direction === "down"
      ? `Prices are falling ${Math.abs(pct).toFixed(1)}% over the last two weeks`
      : "Prices have been steady over the last two weeks";

  // Forecast: blend of the current price (baseline) and the moving average with the
  // recent drift, clamped to ±15% of today so estimates never run away.
  const ma = values.length >= 7 ? mean(values.slice(-7)) : current;
  const slope = slopeOf(values);
  const clamp = (v) => Math.min(current * 1.15, Math.max(current * 0.85, v));
  const days = [];
  for (let k = 1; k <= 3; k += 1) {
    const est = round2(clamp(0.5 * current + 0.5 * (ma + slope * k)));
    days.push({ date: shiftDate(today.date, k), estimate: est });
  }

  // Confidence from data volume + volatility (guide §14-15).
  const cv = current ? vol / current : 0;
  let level = "low";
  let reason = `Not much price history (${daily.length} day${daily.length === 1 ? "" : "s"}) — treat the estimate as a rough guide.`;
  if (daily.length >= 4) {
    if (daily.length >= 10 && cv <= 0.05) {
      level = "high";
      reason = `${daily.length} days of steady prices (${(cv * 100).toFixed(1)}% variation) — estimate is reliable.`;
    } else if (cv <= 0.12) {
      level = "medium";
      reason = `${daily.length} days of history with moderate swings (${(cv * 100).toFixed(1)}% variation).`;
    } else {
      reason = `Prices swing a lot here (${(cv * 100).toFixed(1)}% variation) — check the range before deciding.`;
    }
  }

  const range = {
    low: round2(Math.max(0, current - vol)),
    high: round2(current + vol),
  };

  // Rule-based advice used when the LLM is unavailable (guide §29 fallback).
  let recommendation;
  let sellStrategy;
  if (direction === "up") {
    recommendation = "Prices look set to keep working in your favour — waiting a little longer could pay, as long as your crop is still fresh enough to hold.";
    sellStrategy = "Consider holding a few days, but lock in a buyer now so you are not caught with spoilage when the window closes.";
  } else if (direction === "down") {
    recommendation = "Prices are slipping — selling sooner is the safer call before they drop further.";
    sellStrategy = "Start selling now; if a buyer has made an offer on a committed quantity, accept and deliver quickly.";
  } else {
    recommendation = "Prices are steady, so your risk is mostly around produce freshness and transport, not price swings.";
    sellStrategy = "Sell when convenient — match a committed buyer's offer or time delivery with the driest weather window.";
  }
  const reasons = [
    trendLabel,
    `Today's average is ${formatGhs(current)} (7-day ${formatGhs(avg7)}, 14-day ${formatGhs(avg14)}).`,
    `The next 3 days should stay near ${formatGhs(days[0].estimate)}–${formatGhs(days[2].estimate)} with a ${level} confidence level.`,
  ];
  const warning = level === "high"
    ? ""
    : `Price estimate has a wide range (${formatGhs(range.low)}–${formatGhs(range.high)}); ${level === "low" ? "sparse or volatile data" : "seasonal swings"}. Trust the live market over this estimate.`;

  return {
    cropType,
    market: market || "all markets",
    available: true,
    current: { date: today.date, price: current },
    averages: { days7: avg7, days14: avg14, days30: avg30 },
    trend: { pct: round2(pct), direction, label: trendLabel },
    history: daily.slice(-30),
    forecast: { days, range, method: "baseline + 7-day moving average, ±15% clamp" },
    confidence: { level, reason },
    comparison: comparison || [],
    advice: {
      recommendation,
      reasons,
      warning,
      sellStrategy,
      source: "rules",
    },
  };
}

// Latest price + 2-week trend per market for a set of price rows.
function marketComparison(rows) {
  const byMarket = new Map();
  for (const r of rows) {
    if (!byMarket.has(r.market)) byMarket.set(r.market, []);
    byMarket.get(r.market).push(Number(r.price));
  }
  const out = [];
  for (const [market, prices] of byMarket) {
    const latest = prices[prices.length - 1];
    const base = prices.length >= 8 ? mean(prices.slice(-8)) : prices[0] || latest;
    out.push({
      market,
      latestPrice: round2(latest),
      samples: prices.length,
      trendPct: base ? round2(((latest - base) / base) * 100) : 0,
    });
  }
  return out.sort((a, b) => b.latestPrice - a.latestPrice);
}

function formatGhs(n) {
  return `GH₵${Number(n).toFixed(2)}`;
}

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Live wrapper: pulls history from the prices repository.
async function priceGuide({ cropType, market }) {
  const marketStr = normalizeMarket(market);
  const localized = await pricesRepo.priceHistory({ cropType, market: marketStr });
  const all = await pricesRepo.priceHistory({ cropType });
  return buildGuide({
    cropType,
    market: marketStr,
    daily: dailySeries(localized),
    comparison: marketComparison(all),
  });
}

module.exports = { priceGuide, buildGuide, dailySeries, marketComparison, normalizeMarket };