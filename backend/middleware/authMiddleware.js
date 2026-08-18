const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:"Authentication required." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      `SELECT id, full_name, email, role, is_active FROM users WHERE id=$1`,
      [decoded.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ success:false, message:"User account not found." });
    if (!user.is_active) return res.status(403).json({ success:false, message:"Your account is deactivated." });

    req.user = { ...user, id: Number(user.id) };
    next();
  } catch (error) {
    return res.status(401).json({ success:false, message:"Invalid or expired token." });
  }
}

module.exports = { requireAuth };
