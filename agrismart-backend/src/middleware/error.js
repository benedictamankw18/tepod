// Central JSON error handler. Express 5 forwards async-handler rejections here automatically.
function errorHandler(err, _req, res, _next) {
  // Unique-violation mapping
  if (err && err.code === "23505") {
    return res.status(409).json({ error: "a record with that unique value already exists" });
  }
  if (err && err.code === "23503") {
    return res.status(400).json({ error: "referenced record does not exist" });
  }
  if (err && err.code === "23514") {
    return res.status(400).json({ error: "value violates a data constraint (missing or invalid required field)" });
  }
  // Not-null violation / invalid enum value
  if (err && err.code === "23502") {
    return res.status(400).json({ error: "a required value is missing" });
  }
  if (err && err.code === "22P02") {
    return res.status(400).json({ error: "invalid value for the given field" });
  }
  console.error("[ERROR]", err);
  res.status(500).json({ error: "internal server error" });
}

function notFound(req, res) {
  res.status(404).json({ error: `not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
