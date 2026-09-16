// openrouter.js
// Thin client around OpenRouter's OpenAI-compatible chat API. Used only as the
// "explainer" for the weather + price guide: the model is handed structured data we
// computed ourselves (weather observations/aggregates, price stats) and told to
// restate it in plain farmer-friendly language. It never invents numbers.
//
// When OPENROUTER_API_KEY is unset or the request fails, explain() returns null and
// the caller serves its deterministic rule-based advice, so the guide never breaks.

const config = require("../config");

const BASE = config.openrouterBaseUrl;
const MODEL = config.openrouterModel;

// The key may be set at runtime (tests toggle it) so we read env before the cached
// config — same pattern as the Paystack simulation flag. OPENROUTER_SIMULATED=1
// forces the rule-based offline path even when a real key is configured.
function apiKey() {
  return process.env.OPENROUTER_API_KEY || config.openrouterApiKey;
}

function isEnabled() {
  return Boolean(apiKey()) && process.env.OPENROUTER_SIMULATED !== "1";
}

// Ask the model for a { recommendation, reasons, warning, nextSteps } structure.
// Accepts an injectable fetch so tests can stub the network without a mock library.
async function explain(system, user, { fetchImpl = fetch } = {}) {
  if (!isEnabled()) return null;
  try {
    const res = await fetchImpl(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        // Attribution for the app owner on OpenRouter's dashboard.
        "X-Title": "AgriSmart",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
<<<<<<< HEAD
        max_tokens: 2000,
=======
        max_tokens: 600,
>>>>>>> origin/development
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) return null;
    const parsed = JSON.parse(text);
    const recommendation = String(parsed.recommendation || "").trim();
    if (!recommendation) return null;
    return {
      recommendation,
      reasons: Array.isArray(parsed.reasons) && parsed.reasons.length
        ? parsed.reasons.slice(0, 3).map((r) => String(r).trim())
        : [],
      warning: parsed.warning ? String(parsed.warning) : "",
      nextSteps: Array.isArray(parsed.nextSteps) && parsed.nextSteps.length
        ? parsed.nextSteps.slice(0, 3).map((s) => String(s).trim())
        : [],
      source: "llm",
    };
  } catch (_) {
    return null;
  }
}

module.exports = { explain, isEnabled };