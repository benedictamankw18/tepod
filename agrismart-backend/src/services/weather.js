// weather.js
// Free 7-day weather forecast via Open-Meteo (no API key) for a farm's coordinates,
// aggregated into risk-oriented daily indicators for the AI weather guide:
// rain chance/sum, temperature, humidity and wind, plus the "best window" to work
// the field. The LLM service only restates this — no numbers are ever invented here.
//
// Open-Meteo is free with a generous daily quota; results are cached in-process per
// coordinate to keep usage low. In tests (JEST_WORKER_ID) a deterministic fixture is
// returned so route tests stay offline — same pattern as geocode.js.

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const isTest = !!process.env.JEST_WORKER_ID;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const cache = new Map(); // "lat,lng" -> { fetchedAt, data }

// Short labels for the most common WMO weather codes.
const WMO = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Light showers", 81: "Showers", 82: "Heavy showers",
  95: "Thunderstorm", 96: "Thunderstorm, hail", 99: "Thunderstorm, heavy hail",
};

// Group the Open-Meteo hourly arrays into per-day aggregates.
// Each input is a parallel array of 7x24 entries; `times` carries "YYYY-MM-DDTHH:00".
function aggregateDaily(hourly) {
  const days = new Map();
  const { time, temperature_2m, relative_humidity_2m, precipitation_probability, precipitation, wind_speed_10m, weather_code } = hourly;
  for (let i = 0; i < (time || []).length; i += 1) {
    const day = String(time[i]).slice(0, 10);
    if (!days.has(day)) {
      days.set(day, {
        date: day,
        tMin: Infinity, tMax: -Infinity, tSum: 0,
        rainProbMax: 0, rainSum: 0, humiditySum: 0, windMax: 0,
        codes: {}, hours: 0,
      });
    }
    const d = days.get(day);
    const t = temperature_2m ? temperature_2m[i] : 0;
    const rh = relative_humidity_2m ? relative_humidity_2m[i] : 0;
    const rp = precipitation_probability ? precipitation_probability[i] : 0;
    const rr = precipitation ? precipitation[i] : 0;
    const ws = wind_speed_10m ? wind_speed_10m[i] : 0;
    d.hours += 1;
    d.tMin = Math.min(d.tMin, t);
    d.tMax = Math.max(d.tMax, t);
    d.tSum += t;
    d.rainProbMax = Math.max(d.rainProbMax, rp || 0);
    d.rainSum += rr || 0;
    d.humiditySum += rh || 0;
    d.windMax = Math.max(d.windMax, ws || 0);
    if (weather_code && weather_code[i] != null) {
      d.codes[weather_code[i]] = (d.codes[weather_code[i]] || 0) + 1;
    }
  }
  return [...days.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((d) => {
      const code = dominantCode(d.codes);
      return {
        date: d.date,
        tMin: round1(d.tMin),
        tAvg: round1(d.tSum / Math.max(1, d.hours)),
        tMax: round1(d.tMax),
        rainProbMax: Math.round(d.rainProbMax),
        rainSum: round1(d.rainSum),
        humidityAvg: Math.round(d.humiditySum / Math.max(1, d.hours)),
        windMax: Math.round(d.windMax),
        condition: WMO[code] || "Variable",
      };
    });
}

function dominantCode(counts) {
  let best = 0;
  let bestCount = -1;
  for (const [code, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = Number(code);
    }
  }
  return best;
}

const round1 = (n) => Math.round(Number(n) * 10) / 10;

// Risk rules over the daily aggregates (guide §7). `harvestDate` (YYYY-MM-DD or
// null) sharpens the harvest guidance when the crop is about to come in.
function classifyRisk(daily, harvestDate = null) {
  const today = new Date().toISOString().slice(0, 10);
  const window = daily.slice(0, 2); // today + tomorrow
  const heavyRainReasons = [];
  for (const d of window) {
    if (d.rainSum >= 15) heavyRainReasons.push(`${d.date}: ${d.rainSum}mm rain`);
    else if (d.rainProbMax >= 70) heavyRainReasons.push(`${d.date}: ${d.rainProbMax}% chance of rain`);
    else if (d.windMax >= 45) heavyRainReasons.push(`${d.date}: winds to ${d.windMax} km/h`);
  }
  let level = "low";
  if (heavyRainReasons.length) level = "high";
  else if (daily.slice(0, 3).some((d) => d.rainProbMax >= 50 || d.rainSum >= 5)) level = "medium";

  let harvestNote = "";
  if (harvestDate) {
    const daysToHarvest = Math.round((new Date(harvestDate + "T00:00:00Z") - new Date(today + "T00:00:00Z")) / 86400000);
    if (daysToHarvest <= 2 && level !== "low") {
      harvestNote = `Harvest is due ${daysToHarvest <= 0 ? "now" : `in ${daysToHarvest} day${daysToHarvest === 1 ? "" : "s"}`} and rain is expected — plan to harvest early or protect the crop.`;
    } else if (daysToHarvest <= 4 && daily[0].rainSum >= 5) {
      harvestNote = `Rain is expected while harvest is ${daysToHarvest} days away — watch for spoilage.`;
    }
  }
  return { level, reasons: heavyRainReasons, harvestNote };
}

// The driest of the next three days to schedule field work / transport (guide §8).
function bestWindow(daily) {
  const top = daily.slice(0, 3);
  if (!top.length) return null;
  const scored = top.map((d, i) => ({
    day: d.date,
    index: i,
    score: d.rainProbMax + d.rainSum * 3 + (d.windMax >= 35 ? 10 : 0),
  }));
  scored.sort((a, b) => a.score - b.score);
  const best = scored[0];
  const label = best.index === 0 ? "today" : `in ${best.index} day${best.index === 1 ? "" : "s"}`;
  return {
    date: best.day,
    label,
    chanceOfRain: daily.find((d) => d.date === best.day).rainProbMax,
  };
}

// Deterministic fixture for offline tests (mirrors geocode.js KNOWN).
function buildFixture(_lat, _lng) {
  const day = (offset, t, rainP, rainSum, hum, wind, code) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      tMin: round1(t - 4), tAvg: round1(t), tMax: round1(t + 5),
      rainProbMax: rainP, rainSum, humidityAvg: hum, windMax: wind, condition: WMO[code],
    };
  };
  return [
    day(0, 27, 85, 24.4, 88, 41, 65),  // heavy rain today
    day(1, 26, 55, 6.2, 82, 30, 63),
    day(2, 28, 20, 0, 70, 22, 2),
    day(3, 29, 10, 0, 64, 18, 0),
    day(4, 30, 5, 0, 60, 15, 0),
    day(5, 31, 5, 0, 58, 14, 0),
    day(6, 30, 15, 0, 63, 16, 1),
  ];
}

// Resolve + cache the 7-day forecast for a coordinate. Returns
// { location, daily, risk, bestWindow, source, attribution }.
async function forecastFor(lat, lng) {
  const latN = Number(lat);
  const lngN = Number(lng);
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null;

  if (isTest) {
    const daily = buildFixture(latN, lngN);
    return {
      location: { lat: latN, lng: lngN },
      daily,
      risk: classifyRisk(daily),
      bestWindow: bestWindow(daily),
      source: "fixture",
      attribution: "Weather data: Open-Meteo (open-meteo.com)",
    };
  }

  const key = `${latN.toFixed(3)},${lngN.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit.data;

  try {
    const url = `${OPEN_METEO_URL}?latitude=${latN}&longitude=${lngN}&timezone=auto&forecast_days=7&wind_speed_unit=kmh` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.hourly) return null;
    const daily = aggregateDaily(json.hourly);
    const data = {
      location: { lat: latN, lng: lngN },
      daily,
      risk: classifyRisk(daily),
      bestWindow: bestWindow(daily),
      source: "open-meteo",
      attribution: "Weather data: Open-Meteo (open-meteo.com)",
    };
    cache.set(key, { fetchedAt: Date.now(), data });
    return data;
  } catch (_) {
    return null;
  }
}

module.exports = { forecastFor, aggregateDaily, classifyRisk, bestWindow, buildFixture, WMO };