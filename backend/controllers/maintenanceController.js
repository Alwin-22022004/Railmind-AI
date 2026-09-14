const pool = require("../config/db");

// GET /api/maintenance
const listLogs = async (req, res) => {
  try {
    const { assetCode } = req.query;

    const query = `
      SELECT
        ml.id,
        ml.asset_id,
        a.asset_code,
        a.name AS asset_name,
        ml.performed_by,
        u.full_name AS engineer_name,
        ml.alert_id,
        al.title AS alert_title,
        al.alert_type,
        ml.maintenance_type,
        ml.action,
        ml.notes,
        ml.performed_at,
        ml.created_at
      FROM maintenance_logs ml
      JOIN assets a ON a.id = ml.asset_id
      LEFT JOIN users u ON u.id = ml.performed_by
      LEFT JOIN alerts al ON al.id = ml.alert_id
      ${assetCode ? "WHERE a.asset_code = $1" : ""}
      ORDER BY ml.performed_at DESC
      LIMIT 200
    `;

    const result = await pool.query(query, assetCode ? [assetCode] : []);
    res.json({ success: true, data: result.rows });
  } catch (e) {
    console.error("Failed to load maintenance records:", e);
    res.status(500).json({ success: false, message: "Failed to load maintenance records" });
  }
};

// POST /api/maintenance
const createLog = async (req, res) => {
  const client = await pool.connect();
  try {
    const { assetCode, action, notes, performedAt, alertId, maintenanceType, resolveAssociatedAlert } = req.body;

    if (!assetCode || !action || !action.trim()) {
      client.release();
      return res.status(400).json({
        success: false,
        message: "Asset code and action are required.",
      });
    }

    await client.query("BEGIN");

    const asset = await client.query("SELECT id FROM assets WHERE asset_code = $1", [assetCode]);
    if (!asset.rows.length) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ success: false, message: "Compressor asset not found." });
    }
    const assetId = asset.rows[0].id;

    // Validate alertId and asset relationship if linked
    if (alertId) {
      const alertCheck = await client.query(
        "SELECT id, asset_id, is_resolved FROM alerts WHERE id = $1",
        [Number(alertId)]
      );

      if (!alertCheck.rows.length) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(404).json({ success: false, message: "Linked alert not found." });
      }

      const alertObj = alertCheck.rows[0];
      if (alertObj.asset_id !== assetId) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({
          success: false,
          message: "Alert belongs to a different compressor asset.",
        });
      }

      if (alertObj.is_resolved) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({
          success: false,
          message: "Alert is already resolved.",
        });
      }
    }

    const validTypes = ["CORRECTIVE", "PREVENTIVE", "INSPECTION"];
    const type = validTypes.includes(String(maintenanceType || "").toUpperCase())
      ? String(maintenanceType).toUpperCase()
      : "CORRECTIVE";

    const result = await client.query(
      `INSERT INTO maintenance_logs (asset_id, performed_by, alert_id, maintenance_type, action, notes, performed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        assetId,
        req.user.id,
        alertId ? Number(alertId) : null,
        type,
        action.trim(),
        notes ? notes.trim() : null,
        performedAt || new Date(),
      ]
    );

    const logRecord = result.rows[0];

    // If linked to an alert and resolution is requested or implied, resolve the alert atomically
    if (alertId && (resolveAssociatedAlert === undefined || resolveAssociatedAlert === true)) {
      await client.query(
        `UPDATE alerts
         SET is_resolved = TRUE,
             resolved_at = NOW(),
             resolved_by = $1,
             resolution_notes = $2
         WHERE id = $3`,
        [
          req.user.id,
          `Maintenance (${type}): ${action.trim()}${notes ? " - " + notes.trim() : ""}`,
          Number(alertId),
        ]
      );
    }

    await client.query("COMMIT");
    client.release();

    res.status(201).json({
      success: true,
      message: "Maintenance record saved successfully.",
      data: logRecord,
    });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    console.error("Failed to save maintenance record:", e);
    res.status(500).json({ success: false, message: "Failed to save maintenance record" });
  }
};

module.exports = { listLogs, createLog };
