const pool = require("../config/db");

// GET /api/alerts
// Filters: assetCode, severity (CRITICAL, WARNING, INFO), status (ACTIVE, ACKNOWLEDGED, RESOLVED), limit
const getAlerts = async (req, res) => {
  try {
    const { assetCode, severity, status, limit } = req.query;

    const whereClauses = [];
    const params = [];

    if (assetCode && typeof assetCode === "string" && assetCode.trim() && assetCode.trim().toUpperCase() !== "ALL") {
      params.push(assetCode.trim());
      whereClauses.push(`UPPER(TRIM(a.asset_code)) = UPPER(TRIM($${params.length}))`);
    }

    if (severity && typeof severity === "string" && severity.trim() && severity.trim().toUpperCase() !== "ALL") {
      params.push(severity.trim().toLowerCase());
      whereClauses.push(`LOWER(TRIM(al.level)) = $${params.length}`);
    }

    if (status && typeof status === "string" && status.trim() && status.trim().toUpperCase() !== "ALL") {
      const upperStatus = status.trim().toUpperCase();
      if (upperStatus === "RESOLVED") {
        whereClauses.push(`al.is_resolved = TRUE`);
      } else if (upperStatus === "ACKNOWLEDGED") {
        whereClauses.push(`al.is_resolved = FALSE AND al.is_acknowledged = TRUE`);
      } else if (upperStatus === "ACTIVE") {
        whereClauses.push(`al.is_resolved = FALSE`);
      } else if (upperStatus === "UNACKNOWLEDGED") {
        whereClauses.push(`al.is_resolved = FALSE AND al.is_acknowledged = FALSE`);
      }
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const parsedLimit = parseInt(limit, 10);
    const maxRows = (!isNaN(parsedLimit) && parsedLimit > 0) ? Math.min(parsedLimit, 500) : 200;

    params.push(maxRows);
    const limitSql = `LIMIT $${params.length}`;

    const query = `
      SELECT
        al.id,
        al.asset_id,
        a.asset_code,
        a.name AS asset_name,
        al.level,
        al.title,
        al.message,
        al.source,
        al.alert_type,
        al.trigger_parameter,
        al.actual_value,
        al.threshold_value,
        al.recommendation,
        al.is_acknowledged,
        al.acknowledged_at,
        al.acknowledged_by,
        u_ack.full_name AS acknowledged_by_name,
        al.assigned_to,
        u_assign.full_name AS assigned_engineer_name,
        al.is_resolved,
        al.resolved_at,
        al.resolved_by,
        u_res.full_name AS resolved_by_name,
        al.resolution_notes,
        al.created_at
      FROM alerts al
      JOIN assets a ON a.id = al.asset_id
      LEFT JOIN users u_ack ON u_ack.id = al.acknowledged_by
      LEFT JOIN users u_assign ON u_assign.id = al.assigned_to
      LEFT JOIN users u_res ON u_res.id = al.resolved_by
      ${whereSql}
      ORDER BY al.is_resolved ASC, al.created_at DESC
      ${limitSql}
    `;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error("Failed to load alerts:", e);
    res.status(500).json({ success: false, message: "Failed to load alerts" });
  }
};

// PATCH /api/alerts/:id/acknowledge
const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alertCheck = await pool.query("SELECT id, is_resolved FROM alerts WHERE id = $1", [id]);
    if (!alertCheck.rows.length) {
      return res.status(404).json({ success: false, message: "Alert not found." });
    }
    if (alertCheck.rows[0].is_resolved) {
      return res.status(400).json({ success: false, message: "Alert is already resolved." });
    }

    const result = await pool.query(
      `UPDATE alerts
       SET is_acknowledged = TRUE,
           acknowledged_at = NOW(),
           acknowledged_by = $1
       WHERE id = $2
       RETURNING *`,
      [req.user.id, id]
    );

    res.json({
      success: true,
      message: "Alert acknowledged successfully.",
      data: result.rows[0],
    });
  } catch (e) {
    console.error("Failed to acknowledge alert:", e);
    res.status(500).json({ success: false, message: "Failed to acknowledge alert" });
  }
};

// PATCH /api/alerts/:id/assign
const assignAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: "Maintenance engineer ID is required.",
      });
    }

    const alertCheck = await pool.query("SELECT id, is_resolved FROM alerts WHERE id = $1", [id]);
    if (!alertCheck.rows.length) {
      return res.status(404).json({ success: false, message: "Alert not found." });
    }
    if (alertCheck.rows[0].is_resolved) {
      return res.status(400).json({ success: false, message: "Alert is already resolved." });
    }

    const userCheck = await pool.query(
      `SELECT id, full_name, role, is_active FROM users WHERE id = $1`,
      [assignedTo]
    );

    if (!userCheck.rows.length || !userCheck.rows[0].is_active) {
      return res.status(404).json({
        success: false,
        message: "Assigned maintenance engineer not found or inactive.",
      });
    }

    const assignedUser = userCheck.rows[0];
    if (!["MAINTENANCE", "ADMIN"].includes(assignedUser.role)) {
      return res.status(400).json({
        success: false,
        message: "User must be a MAINTENANCE engineer or ADMIN.",
      });
    }

    const result = await pool.query(
      `UPDATE alerts
       SET assigned_to = $1
       WHERE id = $2
       RETURNING *`,
      [assignedTo, id]
    );

    res.json({
      success: true,
      message: `Alert assigned to ${assignedUser.full_name}.`,
      data: {
        ...result.rows[0],
        assigned_engineer_name: assignedUser.full_name,
      },
    });
  } catch (e) {
    console.error("Failed to assign alert:", e);
    res.status(500).json({ success: false, message: "Failed to assign alert" });
  }
};

// PATCH /api/alerts/:id/resolve
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    if (!resolutionNotes || typeof resolutionNotes !== "string" || !resolutionNotes.trim()) {
      return res.status(400).json({
        success: false,
        message: "Resolution notes are required to resolve an alert.",
      });
    }

    const alertCheck = await pool.query("SELECT id, is_resolved FROM alerts WHERE id = $1", [id]);
    if (!alertCheck.rows.length) {
      return res.status(404).json({ success: false, message: "Alert not found." });
    }
    if (alertCheck.rows[0].is_resolved) {
      return res.status(400).json({ success: false, message: "Alert is already resolved." });
    }

    const result = await pool.query(
      `UPDATE alerts
       SET is_resolved = TRUE,
           resolved_at = NOW(),
           resolved_by = $1,
           resolution_notes = $2
       WHERE id = $3
       RETURNING *`,
      [req.user.id, resolutionNotes.trim(), id]
    );

    res.json({
      success: true,
      message: "Alert resolved successfully.",
      data: result.rows[0],
    });
  } catch (e) {
    console.error("Failed to resolve alert:", e);
    res.status(500).json({ success: false, message: "Failed to resolve alert" });
  }
};

module.exports = {
  getAlerts,
  acknowledgeAlert,
  assignAlert,
  resolveAlert,
};
