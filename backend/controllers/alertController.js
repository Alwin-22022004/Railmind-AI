const pool = require("../config/db");

const getAlerts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT al.*, a.asset_code, a.name AS asset_name
       FROM alerts al JOIN assets a ON a.id=al.asset_id
       ORDER BY al.is_resolved ASC, al.created_at DESC LIMIT 200`
    );
    res.json({success:true,data:result.rows});
  } catch (e) { console.error(e); res.status(500).json({success:false,message:"Failed to load alerts"}); }
};

const resolveAlert = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE alerts SET is_resolved=TRUE,resolved_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({success:false,message:"Alert not found."});
    res.json({success:true,message:"Alert resolved.",data:result.rows[0]});
  } catch (e) { console.error(e); res.status(500).json({success:false,message:"Failed to resolve alert"}); }
};

module.exports = { getAlerts, resolveAlert };
