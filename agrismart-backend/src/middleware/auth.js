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
  if (!user) {
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

module.exports = { requireAuth, requireRole };
