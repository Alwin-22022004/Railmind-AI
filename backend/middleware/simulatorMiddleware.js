const crypto = require("crypto");

function requireSimulatorKey(req, res, next) {
  const expected = process.env.SIMULATOR_KEY || "railmind-local-simulator";
  const provided = req.get("x-simulator-key");

  if (!provided || provided.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
    return res.status(401).json({ success: false, message: "Invalid simulator credentials." });
  }

  next();
}

module.exports = { requireSimulatorKey };
