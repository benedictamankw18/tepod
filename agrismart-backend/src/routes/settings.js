const express = require("express");
const settingsRepo = require("../repositories/systemSettings");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const MODES = ["percent", "fixed"];
const STRATEGIES = ["flat", "tiered"];

function num(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

// Normalize + validate a commission config payload. Throws a string message (or
// returns null with a reason) so the route can answer with a clean 400.
function sanitizeCommission(body) {
  const c = body && typeof body === "object" ? body : {};
  if (c.mode !== undefined && !MODES.includes(c.mode)) {
    return { error: "mode must be 'percent' or 'fixed'" };
  }
  if (c.strategy !== undefined && !STRATEGIES.includes(c.strategy)) {
    return { error: "strategy must be 'flat' or 'tiered'" };
  }
  const normalized = {
    enabled: c.enabled === true,
    mode: c.mode || "percent",
    strategy: c.strategy || "flat",
    flatValue: 0,
    tiers: [],
  };

  const flat = num(c.flatValue);
  if (flat === undefined) {
    normalized.flatValue = 0;
  } else if (Number.isNaN(flat) || flat < 0) {
    return { error: "flatValue must be a non-negative number" };
  } else {
    normalized.flatValue = flat;
  }

  if (normalized.strategy === "tiered") {
    if (!Array.isArray(c.tiers) || c.tiers.length === 0) {
      return { error: "tiered strategy needs at least one tier {min, value}" };
    }
    let lastMin = -Infinity;
    for (const t of c.tiers) {
      const min = num(t && t.min);
      const value = num(t && t.value);
      if (Number.isNaN(min) || Number.isNaN(value) || min < 0 || value < 0) {
        return { error: `tier ${JSON.stringify(t)} needs non-negative numeric min and value` };
      }
      if (min <= lastMin) return { error: "tiers must be sorted ascending by min (no duplicates)" };
      lastMin = min;
      normalized.tiers.push({ min, value });
    }
  }

  return { config: normalized };
}

// GET /api/settings/commission - current commission schedule (admin)
router.get("/commission", requireAuth, requireRole("admin"), async (_req, res) => {
  const config = await settingsRepo.getCommission();
  const row = await settingsRepo.getSetting("commission");
  res.json({ config, updatedAt: row ? row.updatedAt : null });
});

// PUT /api/settings/commission - replace the commission schedule (admin)
router.put("/commission", requireAuth, requireRole("admin"), async (req, res) => {
  const result = sanitizeCommission(req.body.config || req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  const settings = await settingsRepo.setCommission(result.config, req.user.id);
  const row = await settingsRepo.getSetting("commission");
  res.json({ config: settings, updatedAt: row.updatedAt });
});

const PAYOUT_MODES = ["auto", "manual"];

function sanitizePayments(body) {
  const p = body && typeof body === "object" ? body : {};
  const out = {
    escrowEnabled: p.escrowEnabled === true,
    provider: "paystack",
    currency: p.currency || "GHS",
    payoutMode: "auto",
  };
  if (p.payoutMode !== undefined && !PAYOUT_MODES.includes(p.payoutMode)) {
    return { error: "payoutMode must be 'auto' or 'manual'" };
  }
  if (p.payoutMode) out.payoutMode = p.payoutMode;
  const pct = num(p.depositPercent);
  if (pct !== undefined && (Number.isNaN(pct) || pct < 0 || pct > 100)) {
    return { error: "depositPercent must be between 0 and 100" };
  }
  out.depositPercent = pct === undefined ? 30 : pct;
  return { config: out };
}

// GET /api/settings/payments - current payment/escrow policy (admin)
router.get("/payments", requireAuth, requireRole("admin"), async (_req, res) => {
  const config = await settingsRepo.getPayments();
  const row = await settingsRepo.getSetting("payments");
  res.json({ config, updatedAt: row ? row.updatedAt : null });
});

// PUT /api/settings/payments - replace the payment/escrow policy (admin)
router.put("/payments", requireAuth, requireRole("admin"), async (req, res) => {
  const result = sanitizePayments(req.body.config || req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  const settings = await settingsRepo.setPayments(result.config, req.user.id);
  const row = await settingsRepo.getSetting("payments");
  res.json({ config: settings, updatedAt: row.updatedAt });
});

module.exports = router;