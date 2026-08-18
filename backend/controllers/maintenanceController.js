const pool = require("../config/db");

const listLogs = async (req, res) => {
  try {
    const { assetCode } = req.query;
    const result = await pool.query(
      `SELECT ml.*, a.asset_code, a.name AS asset_name, u.full_name AS engineer_name
       FROM maintenance_logs ml
       JOIN assets a ON a.id=ml.asset_id
       LEFT JOIN users u ON u.id=ml.performed_by
       ${assetCode ? "WHERE a.asset_code=$1" : ""}
       ORDER BY ml.performed_at DESC LIMIT 200`,
      assetCode ? [assetCode] : []
    );
    res.json({success:true,data:result.rows});
  } catch (e) { console.error(e); res.status(500).json({success:false,message:"Failed to load maintenance records"}); }
};

const createLog = async (req, res) => {
  try {
    const { assetCode, action, notes, performedAt } = req.body;
    if (!assetCode || !action) return res.status(400).json({success:false,message:"Asset and action are required."});
    const asset = await pool.query("SELECT id FROM assets WHERE asset_code=$1", [assetCode]);
    if (!asset.rows.length) return res.status(404).json({success:false,message:"Compressor not found."});
    const result = await pool.query(
      `INSERT INTO maintenance_logs(asset_id,performed_by,action,notes,performed_at)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [asset.rows[0].id, req.user.id, action.trim(), notes || null, performedAt || new Date()]
    );
    res.status(201).json({success:true,message:"Maintenance record saved.",data:result.rows[0]});
  } catch (e) { console.error(e); res.status(500).json({success:false,message:"Failed to save maintenance record"}); }
};

module.exports = { listLogs, createLog };
