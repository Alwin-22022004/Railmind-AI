const pool = require("../config/db");

// Look up a compressor's internal numeric id using its human-readable
// code (e.g. "COMP-001"). The simulator only knows the code, not the
// DB id, so every incoming telemetry packet needs this lookup first.
const findAssetByCode = async (assetCode) => {
  const result = await pool.query(
    "SELECT * FROM assets WHERE asset_code = $1",
    [assetCode]
  );
  return result.rows[0];
};

const getAllAssets = async () => {
  const result = await pool.query(
    "SELECT * FROM assets ORDER BY id ASC"
  );
  return result.rows;
};

const createAsset = async ({ assetCode, name, assetType, zone, status, installDate, metadata }) => {
  const result = await pool.query(
    `INSERT INTO assets(asset_code,name,asset_type,zone,status,install_date,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [assetCode.trim(), name.trim(), assetType, zone || null, status || "Active", installDate || null, metadata || {}]
  );
  return result.rows[0];
};

const updateAsset = async (id, patch) => {
  const allowed = { assetCode: "asset_code", name: "name", assetType: "asset_type", zone: "zone", status: "status", installDate: "install_date", metadata: "metadata" };
  const entries = Object.entries(patch).filter(([k,v]) => allowed[k] && v !== undefined);
  if (!entries.length) return findAssetById(id);
  const sets = entries.map(([k], i) => `${allowed[k]}=$${i+1}`);
  const values = entries.map(([,v]) => v);
  values.push(id);
  const result = await pool.query(
    `UPDATE assets SET ${sets.join(",")}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`,
    values
  );
  return result.rows[0];
};

const getActiveSimulationAssets = async () => {
  const result = await pool.query(
    `SELECT id, asset_code, name, asset_type, zone, status
     FROM assets
     WHERE asset_type = 'AIR_COMPRESSOR'
       AND status = 'Active'
     ORDER BY id ASC`
  );
  return result.rows;
};

const findAssetById = async (id) => {
  const result = await pool.query("SELECT * FROM assets WHERE id=$1", [id]);
  return result.rows[0];
};

module.exports = {
  findAssetByCode,
  findAssetById,
  getAllAssets,
  createAsset,
  updateAsset,
  getActiveSimulationAssets,
};
