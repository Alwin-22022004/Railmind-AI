/**
 * test_step4_lifecycle_suite.js
 * Verification of Rule-Based Alert Recovery Lifecycle (Step 4)
 * Covers Tests A, B, C, D, E, F, G
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const BACKEND_URL = "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const SIM_KEY = process.env.SIMULATOR_KEY || "railmind-local-simulator";

const adminToken = jwt.sign({ id: 2, role: "ADMIN" }, JWT_SECRET, { expiresIn: "1h" });
const maintToken = jwt.sign({ id: 1, role: "MAINTENANCE" }, JWT_SECRET, { expiresIn: "1h" });

async function sendTelemetry(assetCode, telemetryOverrides) {
  const payload = {
    assetId: assetCode,
    timestamp: new Date().toISOString(),
    assetState: "Running",
    telemetry: {
      airPressure: 8.5,
      airflowRate: 600,
      airLeakageRate: 2.0,
      vibration: 2.0,
      motorCurrent: 20.0,
      motorVoltage: 415.0,
      motorTemperature: 55.0,
      compressorSpeed: 1450,
      oilPressure: 3.2,
      oilTemperature: 55.0,
      runningHours: 200.0,
      compressorLoad: 50.0,
      startStopCycles: 20,
      ...telemetryOverrides
    },
    environment: { ambientTemperature: 28.0 }
  };

  const res = await fetch(`${BACKEND_URL}/telemetry`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-simulator-key": SIM_KEY
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function runLifecycleSuite() {
  console.log("===============================================================");
  console.log("RUNNING RAILMIND AI STEP 4: ALERT RECOVERY LIFECYCLE SUITE");
  console.log("===============================================================");

  const results = [];
  function assert(title, condition, details = "") {
    if (condition) {
      console.log(`  ✅ PASS: ${title} ${details ? "(" + details + ")" : ""}`);
      results.push({ title, pass: true });
    } else {
      console.error(`  ❌ FAIL: ${title} ${details ? "(" + details + ")" : ""}`);
      results.push({ title, pass: false, details });
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST A: NORMAL TO ALERT
    // -------------------------------------------------------------
    console.log("\n--- TEST A: Normal to Alert Transition ---");
    // Use COMP-008 as isolated test compressor; clean existing active alerts on COMP-008
    const asset8 = (await pool.query("SELECT id FROM assets WHERE asset_code = 'COMP-008'")).rows[0];
    await pool.query("UPDATE alerts SET is_resolved = TRUE WHERE asset_id = $1 AND is_resolved = FALSE", [asset8.id]);

    // Send normal reading
    await sendTelemetry("COMP-008", { vibration: 2.1 });
    const normalActive = (await pool.query(
      "SELECT id FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_VIBRATION' AND is_resolved = FALSE",
      [asset8.id]
    )).rows;
    assert("Normal reading does not create an active alert", normalActive.length === 0);

    // Send breach reading (vibration 4.6 > 4.0)
    await sendTelemetry("COMP-008", { vibration: 4.6 });
    const breachedAlert = (await pool.query(
      "SELECT * FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_VIBRATION' AND is_resolved = FALSE",
      [asset8.id]
    )).rows;
    assert(
      "Test A: Threshold breach creates active alert for correct compressor and rule",
      breachedAlert.length === 1 &&
      breachedAlert[0].level === "warning" &&
      parseFloat(breachedAlert[0].actual_value) === 4.6 &&
      breachedAlert[0].is_resolved === false,
      `Alert ID: ${breachedAlert[0]?.id}, actual: ${breachedAlert[0]?.actual_value}`
    );

    const firstAlertId = breachedAlert[0].id;

    // -------------------------------------------------------------
    // TEST B: CONTINUING ALERT (DEDUPLICATION)
    // -------------------------------------------------------------
    console.log("\n--- TEST B: Continuing Alert (ALERT -> ALERT Deduplication) ---");
    // Send 3 repeated readings that continue breaching threshold
    await sendTelemetry("COMP-008", { vibration: 4.8 });
    await sendTelemetry("COMP-008", { vibration: 4.7 });
    await sendTelemetry("COMP-008", { vibration: 5.0 });

    const continuingAlerts = (await pool.query(
      "SELECT id FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_VIBRATION' AND is_resolved = FALSE",
      [asset8.id]
    )).rows;
    assert(
      "Test B: Continuing breach keeps existing active alert without creating duplicates",
      continuingAlerts.length === 1 && continuingAlerts[0].id === firstAlertId,
      `Active count: ${continuingAlerts.length}, ID remains: ${firstAlertId}`
    );

    // -------------------------------------------------------------
    // TEST C: ALERT RECOVERY (ALERT -> NORMAL)
    // -------------------------------------------------------------
    console.log("\n--- TEST C: Alert Recovery (ALERT -> NORMAL) ---");
    // Send reading back within normal range (vibration 2.3 <= 4.0)
    await sendTelemetry("COMP-008", { vibration: 2.3 });

    const recoveredActive = (await pool.query(
      "SELECT id FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_VIBRATION' AND is_resolved = FALSE",
      [asset8.id]
    )).rows;
    const resolvedRecord = (await pool.query(
      "SELECT * FROM alerts WHERE id = $1",
      [firstAlertId]
    )).rows[0];

    assert(
      "Test C: Alert is resolved when reading returns to normal, while history remains available",
      recoveredActive.length === 0 &&
      resolvedRecord.is_resolved === true &&
      resolvedRecord.resolved_at !== null &&
      resolvedRecord.resolution_notes.includes("Condition recovered: vibration returned to normal (2.3 mm/s)"),
      `is_resolved: ${resolvedRecord?.is_resolved}, notes: "${resolvedRecord?.resolution_notes}"`
    );

    // Verify original trigger metadata preserved
    assert(
      "Test C (History Integrity): Original trigger parameter and breach value preserved",
      resolvedRecord.trigger_parameter === "vibration" &&
      parseFloat(resolvedRecord.actual_value) === 4.6 &&
      parseFloat(resolvedRecord.threshold_value) === 4.0
    );

    // -------------------------------------------------------------
    // TEST D: REPEATED FAULT (NORMAL -> ALERT AGAIN)
    // -------------------------------------------------------------
    console.log("\n--- TEST D: Repeated Fault (NORMAL -> ALERT again) ---");
    // Send another threshold breach
    await sendTelemetry("COMP-008", { vibration: 5.2 });

    const activeAfterRepeat = (await pool.query(
      "SELECT * FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_VIBRATION' AND is_resolved = FALSE",
      [asset8.id]
    )).rows;
    const allVibAlerts = (await pool.query(
      "SELECT id, is_resolved, actual_value FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_VIBRATION' ORDER BY id ASC",
      [asset8.id]
    )).rows;

    assert(
      "Test D: New active alert created after previous alert was resolved",
      activeAfterRepeat.length === 1 &&
      activeAfterRepeat[0].id !== firstAlertId &&
      parseFloat(activeAfterRepeat[0].actual_value) === 5.2,
      `New Alert ID: ${activeAfterRepeat[0]?.id}`
    );
    assert(
      "Test D: Both historical resolved alert and new active alert coexist in database",
      allVibAlerts.length >= 2 &&
      allVibAlerts.some(a => a.id === firstAlertId && a.is_resolved === true) &&
      allVibAlerts.some(a => a.id === activeAfterRepeat[0].id && a.is_resolved === false)
    );

    // -------------------------------------------------------------
    // TEST E: INDEPENDENT RULES ON SAME COMPRESSOR
    // -------------------------------------------------------------
    console.log("\n--- TEST E: Independent Rules on Same Compressor ---");
    // Use COMP-007
    const asset7 = (await pool.query("SELECT id FROM assets WHERE asset_code = 'COMP-007'")).rows[0];
    await pool.query("UPDATE alerts SET is_resolved = TRUE WHERE asset_id = $1 AND is_resolved = FALSE", [asset7.id]);

    // Breach both vibration (> 4.0) and motor temperature (> 82.0)
    await sendTelemetry("COMP-007", { vibration: 4.8, motorTemperature: 89.0 });

    const activeBoth = (await pool.query(
      "SELECT alert_type FROM alerts WHERE asset_id = $1 AND is_resolved = FALSE",
      [asset7.id]
    )).rows.map(r => r.alert_type);
    assert("Both rules triggered simultaneously", activeBoth.includes("HIGH_VIBRATION") && activeBoth.includes("HIGH_MOTOR_TEMPERATURE"));

    // Recover only vibration (2.1 <= 4.0), while motorTemperature remains high (88.5 > 82.0)
    await sendTelemetry("COMP-007", { vibration: 2.1, motorTemperature: 88.5 });

    const activeAfterOneRecovered = (await pool.query(
      "SELECT alert_type, is_resolved FROM alerts WHERE asset_id = $1 AND is_resolved = FALSE",
      [asset7.id]
    )).rows;
    const resolvedVib = (await pool.query(
      "SELECT is_resolved, resolution_notes FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_VIBRATION' ORDER BY id DESC LIMIT 1",
      [asset7.id]
    )).rows[0];

    assert(
      "Test E: Recovering vibration resolves only HIGH_VIBRATION; HIGH_MOTOR_TEMPERATURE remains active",
      activeAfterOneRecovered.length === 1 &&
      activeAfterOneRecovered[0].alert_type === "HIGH_MOTOR_TEMPERATURE" &&
      resolvedVib.is_resolved === true
    );

    // Now recover motorTemperature (58 <= 82.0)
    await sendTelemetry("COMP-007", { vibration: 2.1, motorTemperature: 58.0 });
    const activeAfterBothRecovered = (await pool.query(
      "SELECT id FROM alerts WHERE asset_id = $1 AND is_resolved = FALSE",
      [asset7.id]
    )).rows;
    assert("Test E: Recovering motorTemperature now resolves HIGH_MOTOR_TEMPERATURE as well", activeAfterBothRecovered.length === 0);

    // -------------------------------------------------------------
    // TEST F: MULTIPLE COMPRESSORS ISOLATION
    // -------------------------------------------------------------
    console.log("\n--- TEST F: Multi-Compressor Isolation ---");
    // Clean active on COMP-006 and COMP-007
    const asset6 = (await pool.query("SELECT id FROM assets WHERE asset_code = 'COMP-006'")).rows[0];
    await pool.query("UPDATE alerts SET is_resolved = TRUE WHERE asset_id IN ($1, $2) AND is_resolved = FALSE", [asset6.id, asset7.id]);

    // Breach oil pressure on both (< 2.5)
    await sendTelemetry("COMP-006", { oilPressure: 1.8 });
    await sendTelemetry("COMP-007", { oilPressure: 1.9 });

    const c6ActiveBefore = (await pool.query("SELECT id FROM alerts WHERE asset_id = $1 AND alert_type = 'LOW_OIL_PRESSURE' AND is_resolved = FALSE", [asset6.id])).rows;
    const c7ActiveBefore = (await pool.query("SELECT id FROM alerts WHERE asset_id = $1 AND alert_type = 'LOW_OIL_PRESSURE' AND is_resolved = FALSE", [asset7.id])).rows;
    assert("Both compressors have active LOW_OIL_PRESSURE alerts", c6ActiveBefore.length === 1 && c7ActiveBefore.length === 1);

    // Recover COMP-006 only (oilPressure 3.2 >= 2.5), COMP-007 untouched
    await sendTelemetry("COMP-006", { oilPressure: 3.2 });

    const c6ActiveAfter = (await pool.query("SELECT id FROM alerts WHERE asset_id = $1 AND alert_type = 'LOW_OIL_PRESSURE' AND is_resolved = FALSE", [asset6.id])).rows;
    const c7ActiveAfter = (await pool.query("SELECT id FROM alerts WHERE asset_id = $1 AND alert_type = 'LOW_OIL_PRESSURE' AND is_resolved = FALSE", [asset7.id])).rows;

    assert(
      "Test F: Recovering COMP-006 resolves its alert without affecting COMP-007",
      c6ActiveAfter.length === 0 && c7ActiveAfter.length === 1,
      `COMP-006 active: ${c6ActiveAfter.length}, COMP-007 active: ${c7ActiveAfter.length}`
    );

    // -------------------------------------------------------------
    // TEST G: MAINTENANCE WORKFLOW REGRESSION
    // -------------------------------------------------------------
    console.log("\n--- TEST G: Maintenance Workflow Regression ---");
    // COMP-007 still has active LOW_OIL_PRESSURE alert from Test F
    const maintAlertId = c7ActiveAfter[0].id;

    // Acknowledge
    const ackRes = await fetch(`${BACKEND_URL}/alerts/${maintAlertId}/acknowledge`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${maintToken}` }
    });
    const ackData = await ackRes.json();
    assert("Test G: Alert acknowledgement succeeds", ackRes.status === 200 && ackData.data?.is_acknowledged === true);

    // Assign
    const assignRes = await fetch(`${BACKEND_URL}/alerts/${maintAlertId}/assign`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ assignedTo: 1 })
    });
    const assignData = await assignRes.json();
    assert("Test G: Alert assignment succeeds", assignRes.status === 200 && assignData.data?.assigned_to === 1);

    // Manual resolution without notes rejected
    const resNoNotes = await fetch(`${BACKEND_URL}/alerts/${maintAlertId}/resolve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${maintToken}`
      },
      body: JSON.stringify({ resolutionNotes: "   " })
    });
    assert("Test G: Manual resolution without notes is rejected with HTTP 400", resNoNotes.status === 400);

    // Manual resolution with notes succeeds
    const resWithNotes = await fetch(`${BACKEND_URL}/alerts/${maintAlertId}/resolve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${maintToken}`
      },
      body: JSON.stringify({ resolutionNotes: "Oil sump topped up and pressure sensor inspected." })
    });
    const resWithNotesData = await resWithNotes.json();
    assert(
      "Test G: Manual resolution with notes succeeds and records resolved_by user",
      resWithNotes.status === 200 &&
      resWithNotesData.data?.is_resolved === true &&
      resWithNotesData.data?.resolved_by === 1
    );

    console.log("\n===============================================================");
    console.log("FINAL SUMMARY OF STEP 4 LIFECYCLE SUITE");
    console.log("===============================================================");
    const allPassed = results.every(r => r.pass);
    const passedCount = results.filter(r => r.pass).length;
    console.log(`Passed: ${passedCount}/${results.length}`);

    if (allPassed) {
      console.log("🎉 ALL STEP 4 LIFECYCLE TESTS PASSED 100%!");
      process.exitCode = 0;
    } else {
      console.error("❌ SOME TESTS FAILED!");
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Lifecycle test execution error:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runLifecycleSuite();
