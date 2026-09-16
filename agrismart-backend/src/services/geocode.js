// geocode.js
// Resolve a place/location string ("Accra", "Kasoa, Central Region") to coordinates
// via OpenStreetMap Nominatim (free, no key). In tests (JEST_WORKER_ID) we never hit
// the network: a deterministic fallback approximates a handful of well-known Ghanaian
// places so dashboard ordering logic is still testable offline.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const GEO_USER_AGENT = "agrismart-ai/1.0 (contact: n3thunt3rdev@gmail.com)";
const isTest = !!process.env.JEST_WORKER_ID;

// A tiny lookup for common/seeded places so offline/test behaviour is deterministic.
const KNOWN = {
  accra: { lat: 5.6037, lng: -0.187 },
  kumasi: { lat: 6.6885, lng: -1.6244 },
  kasoa: { lat: 5.5345, lng: -0.4163 },
  tamale: { lat: 9.4008, lng: -0.8393 },
  takoradi: { lat: 4.9006, lng: -1.7583 },
  capecoast: { lat: 5.1053, lng: -1.2509 },
  teso: { lat: 5.8645, lng: -1.5662 },
};

function fallback(place) {
  const key = String(place || "").trim().toLowerCase().replace(/[^a-z]/g, "");
  for (const name of Object.keys(KNOWN)) {
    if (key.includes(name)) return { lat: KNOWN[name].lat, lng: KNOWN[name].lng, source: "fallback" };
  }
  return null;
}

// Returns { lat, lng } or null if the place can't be resolved.
async function geocode(place) {
  const text = String(place || "").trim();
  if (!text) return null;
  const fb = fallback(text);
  if (isTest || fb) return fb;
  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(text + ", Ghana")}`;
    const res = await fetch(url, {
      headers: { "User-Agent": GEO_USER_AGENT, "Accept": "application/json" },
    });
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return { lat: Number(arr[0].lat), lng: Number(arr[0].lon), source: "nominatim" };
  } catch (_) {
    return null;
  }
}

module.exports = { geocode, fallback };
