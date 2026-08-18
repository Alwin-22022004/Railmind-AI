const pool = require("../config/db");
const assetModel = require("../models/assetModel");
const telemetryModel = require("../models/telemetryModel");

// POST /api/telemetry
// This is the "mailbox" the compressor simulator sends each reading to.
const receiveTelemetry = async (req, res) => {
  try {
    const body = req.body;

    // The simulator identifies the asset by its code (e.g. "COMP-001"),
    // not by the database's internal numeric id — so we look it up first.
    const assetCode = body.assetId;
    if (!assetCode) {
      return res.status(400).json({
        success: false,
        message: "Missing assetId in telemetry payload",
      });
    }

    const asset = await assetModel.findAssetByCode(assetCode);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: `No registered asset found for code '${assetCode}'. Add it to the assets table first.`,
      });
    }

    // Only Active compressors should be simulated and persisted as live telemetry.
    if (asset.status !== "Active") {
      return res.status(409).json({
        success: false,
        message: `Compressor ${assetCode} is not Active; live telemetry is ignored.`,
      });
    }

    // The simulator's packet looks like:
    // { assetId, timestamp, assetState, environment: {...}, telemetry: {...}, health: {...}, events: [] }
    // We pull the specific numbers we care about out of those nested
    // objects and flatten them into our simple table columns.
    const sim = body.telemetry || {};
    const env = body.environment || {};

    const reading = {
      recordedAt: body.timestamp,
      airPressure: sim.airPressure,
      airflowRate: sim.airflowRate,
      vibration: sim.vibration,
      motorCurrent: sim.motorCurrent,
      motorVoltage: sim.motorVoltage,
      motorTemperature: sim.motorTemperature,
      compressorSpeed: sim.compressorSpeed,
      oilPressure: sim.oilPressure,
      oilTemperature: sim.oilTemperature,
      runningHours: sim.runningHours,
      compressorLoad: sim.compressorLoad,
      startStopCycles: sim.startStopCycles,
      ambientTemperature: env.ambientTemperature,
      assetState: body.assetState,
    };

    const saved = await telemetryModel.insertTelemetry(asset.id, reading, body);

    await createRuleAlerts(asset.id, assetCode, sim);

    res.status(201).json({
      success: true,
      message: "Telemetry saved",
      data: saved,
    });
  } catch (error) {
    console.error("❌ Failed to save telemetry:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to save telemetry",
    });
  }
};

// GET /api/telemetry/latest
// One newest reading per asset — for the dashboard overview cards.
const getLatest = async (req, res) => {
  try {
    const rows = await telemetryModel.getLatestPerAsset();
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ Failed to fetch latest telemetry:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch telemetry" });
  }
};

// GET /api/telemetry/:assetCode/history
// Recent readings for one asset — for charts.
const getHistory = async (req, res) => {
  try {
    const { assetCode } = req.params;
    const limit = parseInt(req.query.limit, 10) || 100;

    const asset = await assetModel.findAssetByCode(assetCode);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: `No asset found for code '${assetCode}'`,
      });
    }

    const rows = await telemetryModel.getHistoryForAsset(asset.id, limit);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ Failed to fetch telemetry history:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch telemetry history" });
  }
};


async function createRuleAlerts(assetId, assetCode, sim) {
  const rules = [];
  if (Number(sim.vibration) > 4) rules.push(["warning", "High vibration", `Vibration on ${assetCode} is ${sim.vibration} mm/s.`, "rule"]);
  if (Number(sim.motorTemperature) > 82) rules.push(["warning", "High motor temperature", `Motor temperature on ${assetCode} is ${sim.motorTemperature} °C.`, "rule"]);
  if (Number(sim.oilPressure) < 2.5) rules.push(["critical", "Low oil pressure", `Oil pressure on ${assetCode} is ${sim.oilPressure} bar.`, "rule"]);
  if (Number(sim.airPressure) < 8.0) rules.push(["warning", "Low air pressure", `Air pressure on ${assetCode} is ${sim.airPressure} bar.`, "rule"]);
  if (Number(sim.airLeakageRate) > 12) rules.push(["warning", "Air leakage detected", `Air leakage on ${assetCode} is ${sim.airLeakageRate}%.`, "rule"]);

  for (const [level,title,message,source] of rules) {
    const existing = await pool.query(
      `SELECT id FROM alerts WHERE asset_id=$1 AND title=$2 AND is_resolved=FALSE AND created_at > NOW()-INTERVAL '5 minutes' LIMIT 1`,
      [assetId,title]
    );
    if (!existing.rows.length) {
      await pool.query(`INSERT INTO alerts(asset_id,level,title,message,source) VALUES($1,$2,$3,$4,$5)`, [assetId,level,title,message,source]);
    }
  }
}
module.exports = {
  receiveTelemetry,
  getLatest,
  getHistory,
};
