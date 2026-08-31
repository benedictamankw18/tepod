// Commission math for produce transactions (pure, unit-testable).
//
// Config shape (the JSONB stored under system_settings key 'commission'):
//   {
//     enabled:  boolean,
//     mode:     "percent" | "fixed",
//     strategy: "flat" | "tiered",
//     flatValue: number,          // flat percent or flat fixed amount
//     tiers:    [ { min, value } ] // tiered; value is a percent or a fixed amount
//   }
//
// Percent  -> commission = total * value/100
// Fixed    -> commission = value
// Tiered   -> the tier with the greatest min <= total applies; below the smallest
//             min the smallest tier is used; the last tier is open-ended upward.
// Everything rounds to 2dp and the farmer's net is total - commission (never < 0).

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function pickTier(tiers, total) {
  const sorted = tiers.slice().sort((a, b) => Number(a.min) - Number(b.min));
  let chosen = sorted[0];
  for (const t of sorted) {
    if (total >= Number(t.min)) chosen = t;
  }
  return chosen;
}

function computeCommission(config, total) {
  const cfg = config || {};
  if (!cfg.enabled) return { commission: 0, net: round2(Number(total) || 0) };

  const amount = Number(total) || 0;
  let raw;

  if (cfg.strategy === "tiered") {
    const tiers = Array.isArray(cfg.tiers) ? cfg.tiers : [];
    if (tiers.length === 0) {
      raw = 0;
    } else {
      const tier = pickTier(tiers, amount);
      raw = cfg.mode === "percent" ? amount * (Number(tier.value) / 100) : Number(tier.value);
    }
  } else {
    raw = cfg.mode === "percent" ? amount * ((Number(cfg.flatValue) || 0) / 100) : (Number(cfg.flatValue) || 0);
  }

  const commission = round2(Math.max(0, raw));
  const net = round2(Math.max(0, amount - commission));
  return { commission, net };
}

module.exports = { computeCommission, round2 };