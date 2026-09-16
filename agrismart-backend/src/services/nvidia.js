// nvidia.js
// Thin OpenAI-compatible client for NVIDIA NIM (build.nvidia.com). Mirror of
// openrouter.js: feeds the same structured weather/price data to a NIM model so
// the guide's second provider can phrase advice in plain farmer-friendly
// language. It never invents numbers — it only restates the JSON it is handed.
//
// Because several NIM endpoints 404 per-account (only the models provisioned for
// the key are callable), the model name is configurable via NVIDIA_MODEL. When
// the key is unset or the request fails, explain() returns null and the caller
// falls through to the rule-based advice (or the next provider), so the guide
// never breaks.

const config = require("../config");

const BASE = config.nvidiaBaseUrl;
const MODEL = config.nvidiaModel;

// The key may be set at runtime (tests toggle it) so we read env before the
// cached config — same pattern as openrouter.js.
function apiKey() {
  return process.env.NVIDIA_API_KEY || config.nvidiaApiKey;
}

function isEnabled() {
  return Boolean(apiKey());
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
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      // NIM free-tier models can be slower than OpenRouter's — allow more slack.
      signal: AbortSignal.timeout(20000),
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