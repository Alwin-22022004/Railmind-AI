const pool = require("../config/db");

function requireRole(...roles) {
  const allowed = roles.map((r) => String(r).toUpperCase());
  return (req, res, next) => {
    if (!req.user || !allowed.includes(String(req.user.role).toUpperCase())) {
      return res.status(403).json({ success:false, message:"You do not have permission to perform this action." });
    }
    next();
  };
}

function requirePermission(permissionCode) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ success:false, message:"Authentication required." });
      const roleResult = await pool.query(
        `SELECT 1 FROM role_permissions WHERE role=$1 AND permission_code=$2 LIMIT 1`,
        [req.user.role, permissionCode]
      );
      const overrideResult = await pool.query(
        `SELECT allowed FROM user_permissions WHERE user_id=$1 AND permission_code=$2`,
        [req.user.id, permissionCode]
      );
      const override = overrideResult.rows[0];
      const allowed = override ? override.allowed : roleResult.rows.length > 0;
      if (!allowed) return res.status(403).json({ success:false, message:`Missing permission: ${permissionCode}` });
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ success:false, message:"Permission check failed." });
    }
  };
}

module.exports = { requireRole, requirePermission };
