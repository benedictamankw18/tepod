// ai.js
// The "AgriSmart AI guide" endpoints. Both compute everything from real, verified
// sources (Open-Meteo for weather, the prices table for market data) and optionally
// hand the result to OpenRouter solely to phrase the advice in farmer-friendly
// language. When the LLM is unavailable the rule-based advice copy is served instead,
// so these endpoints never depend on the model being up.

const express = require("express");
const { requireAuth } = require("../middleware/auth");
const farmsRepo = require("../repositories/farms");
const { geocode } = require("../services/geocode");
const weatherService = require("../services/weather");
const priceGuideService = require("../services/priceGuide");
const cropDemandService = require("../services/cropDemand");
const openrouter = require("../services/openrouter");

const router = express.Router();

const WEATHER_SYSTEM =
  "You are a concise agricultural advisor for smallholder farmers in Ghana. " +
  "Reply with ONLY JSON: {\"recommendation\": string (1-2 sentences, plain farmer-friendly English, starting with a clear verdict), " +
  "\"reasons\": string[1..3], \"warning\": string (empty string if none), \"nextSteps\": string[1..3]}. " +
  "Use ONLY the data provided. Never invent rainfall, temperature, or price figures that are not in the input. No markdown.";

const PRICE_SYSTEM =
  "You are a concise market advisor for smallholder farmers in Ghana. " +
  "Reply with ONLY JSON: {\"recommendation\": string (1-2 sentences starting with a clear verdict: sell now vs wait, given spoilage risk), " +
  "\"reasons\": string[1..3], \"warning\": string (empty string if none), \"nextSteps\": string[1..3]}. " +
  "Use ONLY the figures provided. Never invent prices, dates, or percentages. No markdown.";

const CROP_DEMAND_SYSTEM =
  "You are a concise demand advisor for smallholder farmers in Ghana planning which crops to plant. " +
  "Reply with ONLY JSON: {\"recommendation\": string (1-2 sentences naming the strongest crops and when a chosen planting month would harvest), " +
  "\"reasons\": string[1..3] citing ONLY the scores/percentages given, \"warning\": string (empty string if none), \"nextSteps\": string[1..3]}. " +
  "Use ONLY the figures provided. Never invent data, prices, or percentages. No markdown.";

function cropLabel(user) {
  const c = (user.primaryCrops && user.primaryCrops[0]) || (user.cropTypes && user.cropTypes[0]);
  return c || "your crop";
}

// Strict coordinate check: null/undefined/"" must stay null even though
// Number(null) === 0 is finite.
function latLng(lat, lng) {
  if (lat === null || lat === undefined || lat === "") return null;
  if (lng === null || lng === undefined || lng === "") return null;
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) ? { lat: la, lng: ln } : null;
}

// Deterministic fallback advice when the LLM is unset/unavailable (guide §29).
function weatherRuleAdvice(context) {
  const { farm, risk, bestWindow, daily } = context;
  const crop = (farm && farm.crop) || "your crop";
  const rec = risk.level === "high"
    ? `Rain or heavy weather is expected over the next day or two — protect ${crop} and postpone harvesting, spraying or transport.`
    : risk.level === "medium"
      ? `Some rain is likely soon — schedule field work around the driest window and move harvested produce quickly.`
      : `The next few days look dry — a good stretch to work the field, harvest or transplant ${crop}.`;
  const reasons = risk.level !== "low"
    ? (risk.reasons.length ? risk.reasons : [`Rain risk is ${risk.level} over the next two days.`])
    : [`Clear weather expected over the next ${Math.min(daily.length, 3)} days.`];
  const nextSteps = [];
  if (bestWindow) nextSteps.push(`The driest window to work is ${bestWindow.label} (${bestWindow.chanceOfRain}% chance of rain).`);
  if (risk.harvestNote) nextSteps.push("Bring in the harvest before the rain sets in where possible.");
  else if (daily.length && daily[0].windMax >= 35) nextSteps.push("Wind gusts are strong — secure tarpaulins and avoid dust-spraying.");
  else if (risk.level === "low") nextSteps.push("Plan drying, spraying or transplanting on any of the next fine days.");
  return {
    recommendation: rec,
    reasons: reasons.slice(0, 3),
    warning: risk.harvestNote || (risk.level === "high" ? "Heavy rain can spoil unharvested produce and make farm roads muddy for transport." : ""),
    nextSteps,
    source: "rules",
  };
}

/**
 * @openapi
 * /api/ai/weather-guide:
 *   get:
 *     tags: [AI]
 *     summary: 7-day weather risk + advice for the farmer's farm (AI Weather Guide)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: farmId
 *         schema: { type: string, description: Optional farm id; defaults to the first farm }
 *     responses:
 *       200:
 *         description: Daily forecast, risk level, best working window and advice
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: No farm location to forecast for
 */
router.get("/weather-guide", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    let farm = null;
    if (req.query.farmId) farm = await farmsRepo.getFarmerFarm(req.query.farmId, userId);
    if (!farm) {
      const grouped = await farmsRepo.farmsForFarmer(userId);
      farm = (grouped.preHarvest || []).concat(grouped.postHarvest || [])[0] || null;
    }

    let coords = null;
    if (farm) coords = latLng(farm.lat, farm.lng);
    if (!coords) coords = latLng(req.user.lat, req.user.lng);
    if (!coords) {
      const place = (farm && farm.location) || req.user.location;
      if (place) coords = await geocode(place);
    }
    if (!coords) {
      return res.status(404).json({ error: "No farm location yet — add a farm with a location on the Farms page first." });
    }

    const forecast = await weatherService.forecastFor(coords.lat, coords.lng);
    if (!forecast) {
      return res.status(502).json({ error: "Weather forecast is temporarily unavailable — please try again shortly." });
    }

    const context = {
      farm: farm
        ? { name: farm.name, crop: farm.cropType, expectedHarvestDate: farm.expectedHarvestDate }
        : { crop: cropLabel(req.user), expectedHarvestDate: null },
      risk: forecast.risk,
      bestWindow: forecast.bestWindow,
      daily: forecast.daily.slice(0, 4),
    };
    const llm = await openrouter.explain(WEATHER_SYSTEM, JSON.stringify(context));
    const advice = llm || weatherRuleAdvice(context);

    res.json({
      farm: farm
        ? { id: farm.id, name: farm.name, cropType: farm.cropType, expectedHarvestDate: farm.expectedHarvestDate, location: farm.location }
        : { name: req.user.location, location: req.user.location },
      coords,
      daily: forecast.daily,
      risk: forecast.risk,
      bestWindow: forecast.bestWindow,
      advice,
      attribution: forecast.attribution,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/ai/price-guide:
 *   get:
 *     tags: [AI]
 *     summary: Current price, trend, 3-day estimate and market comparison (AI Price Guide)
 *     parameters:
 *       - in: query
 *         name: cropType
 *         required: true
 *         schema: { type: string, example: tomato }
 *       - in: query
 *         name: market
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Price stats, forecast with confidence, market comparison and advice
 *       400:
 *         description: cropType is required
 */
router.get("/price-guide", async (req, res, next) => {
  try {
    const { cropType, market } = req.query;
    if (!cropType) return res.status(400).json({ error: "cropType is required" });

    const guide = await priceGuideService.priceGuide({ cropType, market });
    if (guide.available) {
      const llm = await openrouter.explain(
        PRICE_SYSTEM,
        JSON.stringify({
          crop: guide.cropType,
          market: guide.market,
          current: guide.current,
          averages: guide.averages,
          trend: guide.trend,
          forecast: guide.forecast,
          confidence: guide.confidence,
          comparison: (guide.comparison || []).slice(0, 3),
        })
      );
      if (llm) guide.advice = llm;
    }
    res.json(guide);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/ai/crop-guide:
 *   get:
 *     tags: [AI]
 *     summary: Rank crops by demand signals from regional market surveys (AI Crop Demand Guide)
 *     parameters:
 *       - in: query
 *         name: region
 *         schema: { type: string, example: Ashanti }
 *         description: Optional Ghana region; defaults to all regions combined
 *       - in: query
 *         name: plantMonth
 *         schema: { type: integer, minimum: 1, maximum: 12, example: 3 }
 *         description: Optional planting month (1-12) to add a seasonal signal at the expected harvest
 *     responses:
 *       200:
 *         description: Ranked commodity demand rows (score 0-100, level, direction, drivers) and advice
 *       400:
 *         description: Unknown region or invalid plantMonth
 */
router.get("/crop-guide", async (req, res, next) => {
  try {
    const region = req.query.region ? String(req.query.region).trim() : null;
    let plantMonth = null;
    if (req.query.plantMonth !== undefined && req.query.plantMonth !== "") {
      plantMonth = Number(req.query.plantMonth);
      if (!Number.isInteger(plantMonth) || plantMonth < 1 || plantMonth > 12) {
        return res.status(400).json({ error: "plantMonth must be a whole number from 1 to 12." });
      }
    }

    const regions = await cropDemandService.listRegions();
    const known = regions.map((r) => r.region.toLowerCase());
    if (region && !known.includes(region.toLowerCase())) {
      return res.status(400).json({
        error: `No market data for "${region}". ${regions.length ? `Regions with data: ${regions.map((r) => r.region).join(", ")}.` : "Market data has not been imported yet."}`,
        availableRegions: regions.map((r) => r.region),
      });
    }

    const guide = await cropDemandService.demandGuide({ region, plantMonth });
    if (guide.available) {
      const llm = await openrouter.explain(
        CROP_DEMAND_SYSTEM,
        JSON.stringify({
          region: guide.regionLabel,
          plantMonth: guide.plantMonth,
          observedWindow: guide.observed,
          commodities: guide.commodities.slice(0, 6).map((c) => ({
            crop: c.name,
            level: c.demandLevel,
            score: c.score,
            direction: c.direction,
            trendPct: c.price.trendPct,
            levelPct: c.price.levelPct,
            currentPrice: c.price.avg,
            seasonalLiftAtHarvest: c.seasonal ? c.seasonal.liftPct : null,
          })),
        })
      );
      if (llm) guide.advice = llm;
    }
    res.json(guide);
  } catch (err) {
    next(err);
  }
});

module.exports = router;