const { verifyToken } = require("../services/auth");
const usersRepo = require("../repositories/users");

// Populate req.user from a valid bearer token; fail the request otherwise.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload || !payload.sub) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const user = await usersRepo.getUser(payload.sub);
  if (!user || !user.active || user.deletedAt) {
    // Deactivated or deleted accounts lose access immediately, even with a valid token.
    return res.status(401).json({ error: "unauthorized" });
  }
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden" });
    }
    next();
  };
}

// Populate req.user when a valid bearer token is supplied, but never reject the
// request — public read-only endpoints use this to personalise responses (e.g. a
// buyer's review status on a farm's listing page).
async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (payload && payload.sub) {
    const user = await usersRepo.getUser(payload.sub);
    if (user && user.active && !user.deletedAt) req.user = user;
  }
  next();
}

module.exports = { requireAuth, requireRole, optionalAuth };
