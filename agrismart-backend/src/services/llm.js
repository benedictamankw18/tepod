// llm.js
// Orchestrator for the AI guide's optional "explainer". Tries OpenRouter first,
// then NVIDIA NIM when OpenRouter is unset, rate-limited, or down. Returns the
// first successful structured answer, or null so the caller's deterministic
// rule-based advice is served instead — the guide never depends on a model.

const openrouter = require("./openrouter");
const nvidia = require("./nvidia");

async function explain(system, user, opts = {}) {
  if (openrouter.isEnabled()) {
    const res = await openrouter.explain(system, user, opts);
    if (res) return res;
  }
  if (nvidia.isEnabled()) {
    const res = await nvidia.explain(system, user, opts);
    if (res) return res;
  }
  return null;
}

function isEnabled() {
  return openrouter.isEnabled() || nvidia.isEnabled();
}

module.exports = { explain, isEnabled };