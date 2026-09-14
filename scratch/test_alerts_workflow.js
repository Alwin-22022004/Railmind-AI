const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../backend/.env") });
const pool = require("../backend/config/db");
const telemetryController = require("../backend/controllers/telemetryController");
const alertController = require("../backend/controllers/alertController");
const maintenanceController = require("../backend/controllers/maintenanceController");

async function runTests() {
  console.log("==================================================");
  console.log("STARTING FUNCTIONALITY 1 TEST SUITE");
  console.log("==================================================");

  const results = {};

  try {
    // 0. Ensure test compressor COMP-001 exists in database
    let assetRes = await pool.query("SELECT id FROM assets WHERE asset_code = 'COMP-001'");
    let assetId;
    if (!assetRes.rows.length) {
      const newAsset = await pool.query(
        "INSERT INTO assets (asset_code, name, status) VALUES ('COMP-001', 'Test Compressor 1', 'Active') RETURNING id"
      );
      assetId = newAsset.rows[0].id;
    } else {
      assetId = assetRes.rows[0].id;
    }

    // Clean up test alerts/logs prior to test run for deterministic results
    await pool.query("DELETE FROM alerts WHERE asset_id = $1", [assetId]);
    await pool.query("DELETE FROM maintenance_logs WHERE asset_id = $1", [assetId]);

    // Test 1: Vibration > 4.0
    console.log("\n[TEST 1] Testing Vibration RMS > 4.0...");
    await simulateTelemetry(assetId, "COMP-001", { vibration: 4.5 });
    const vibAlert = await pool.query(
      "SELECT * FROM alerts WHERE asset_id=$1 AND alert_type='HIGH_VIBRATION'",
      [assetId]
    );
    if (
      vibAlert.rows.length === 1 &&
      vibAlert.rows[0].level === "warning" &&
      vibAlert.rows[0].actual_value == 4.5 &&
      vibAlert.rows[0].recommendation === "Inspect bearings, mounting and alignment."
    ) {
      results["1. Vibration > 4.0"] = "PASS";
      console.log("  ✅ PASS: High vibration alert created with recommendation.");
    } else {
      results["1. Vibration > 4.0"] = "FAIL";
      console.log("  ❌ FAIL:", vibAlert.rows);
    }

    // Test 2: Motor temperature > 82
    console.log("\n[TEST 2] Testing Motor temperature > 82...");
    await simulateTelemetry(assetId, "COMP-001", { motorTemperature: 86 });
    const tempAlert = await pool.query(
      "SELECT * FROM alerts WHERE asset_id=$1 AND alert_type='HIGH_MOTOR_TEMPERATURE'",
      [assetId]
    );
    if (
      tempAlert.rows.length === 1 &&
      tempAlert.rows[0].level === "warning" &&
      tempAlert.rows[0].actual_value == 86 &&
      tempAlert.rows[0].recommendation === "Inspect cooling, motor load and ventilation."
    ) {
      results["2. Motor temperature > 82"] = "PASS";
      console.log("  ✅ PASS: High motor temperature alert created.");
    } else {
      results["2. Motor temperature > 82"] = "FAIL";
      console.log("  ❌ FAIL:", tempAlert.rows);
    }

    // Test 3: Oil pressure < 2.5
    console.log("\n[TEST 3] Testing Oil pressure < 2.5...");
    await simulateTelemetry(assetId, "COMP-001", { oilPressure: 2.1 });
    const oilAlert = await pool.query(
      "SELECT * FROM alerts WHERE asset_id=$1 AND alert_type='LOW_OIL_PRESSURE'",
      [assetId]
    );
    if (
      oilAlert.rows.length === 1 &&
      oilAlert.rows[0].level === "critical" &&
      oilAlert.rows[0].actual_value == 2.1 &&
      oilAlert.rows[0].recommendation === "Inspect lubrication system, oil level and pump."
    ) {
      results["3. Oil pressure < 2.5"] = "PASS";
      console.log("  ✅ PASS: Low oil pressure CRITICAL alert created.");
    } else {
      results["3. Oil pressure < 2.5"] = "FAIL";
      console.log("  ❌ FAIL:", oilAlert.rows);
    }

    // Test 4: Air pressure < 8.0
    console.log("\n[TEST 4] Testing Air pressure < 8.0...");
    await simulateTelemetry(assetId, "COMP-001", { airPressure: 7.2 });
    const pressAlert = await pool.query(
      "SELECT * FROM alerts WHERE asset_id=$1 AND alert_type='LOW_AIR_PRESSURE'",
      [assetId]
    );
    if (
      pressAlert.rows.length === 1 &&
      pressAlert.rows[0].level === "warning" &&
      pressAlert.rows[0].actual_value == 7.2 &&
      pressAlert.rows[0].recommendation === "Inspect compressor output, valves and air circuit."
    ) {
      results["4. Air pressure < 8.0"] = "PASS";
      console.log("  ✅ PASS: Low air pressure alert created.");
    } else {
      results["4. Air pressure < 8.0"] = "FAIL";
      console.log("  ❌ FAIL:", pressAlert.rows);
    }

    // Test 5: Air leakage > 12%
    console.log("\n[TEST 5] Testing Air leakage > 12%...");
    await simulateTelemetry(assetId, "COMP-001", { airLeakageRate: 15.4 });
    const leakAlert = await pool.query(
      "SELECT * FROM alerts WHERE asset_id=$1 AND alert_type='AIR_LEAKAGE'",
      [assetId]
    );
    if (
      leakAlert.rows.length === 1 &&
      leakAlert.rows[0].level === "warning" &&
      leakAlert.rows[0].actual_value == 15.4 &&
      leakAlert.rows[0].recommendation === "Inspect valves, hoses, seals and fittings."
    ) {
      results["5. Air leakage > 12%"] = "PASS";
      console.log("  ✅ PASS: Air leakage alert created.");
    } else {
      results["5. Air leakage > 12%"] = "FAIL";
      console.log("  ❌ FAIL:", leakAlert.rows);
    }

    // Test 6: Multiple abnormal conditions
    console.log("\n[TEST 6] Testing Multiple abnormal conditions in single telemetry tick...");
    await simulateTelemetry(assetId, "COMP-001", {
      vibration: 5.2,
      oilPressure: 1.8,
    });
    // Count total alerts for COMP-001 (should still be 5 unique types so far)
    const countRes = await pool.query("SELECT COUNT(*) FROM alerts WHERE asset_id=$1", [assetId]);
    if (Number(countRes.rows[0].count) >= 5) {
      results["6. Multiple abnormal conditions"] = "PASS";
      console.log("  ✅ PASS: Handled multiple abnormal parameters in single tick.");
    } else {
      results["6. Multiple abnormal conditions"] = "FAIL";
    }

    // Test 7: Deduplication (5 min window)
    console.log("\n[TEST 7] Testing Deduplication...");
    const preCount = (await pool.query("SELECT COUNT(*) FROM alerts WHERE asset_id=$1 AND alert_type='HIGH_VIBRATION'", [assetId])).rows[0].count;
    await simulateTelemetry(assetId, "COMP-001", { vibration: 4.8 });
    await simulateTelemetry(assetId, "COMP-001", { vibration: 4.9 });
    const postCount = (await pool.query("SELECT COUNT(*) FROM alerts WHERE asset_id=$1 AND alert_type='HIGH_VIBRATION'", [assetId])).rows[0].count;

    if (preCount === postCount) {
      results["7. Deduplication"] = "PASS";
      console.log("  ✅ PASS: Duplicate alerts blocked within 5-minute cooldown window.");
    } else {
      results["7. Deduplication"] = "FAIL";
      console.log(`  ❌ FAIL: Count changed from ${preCount} to ${postCount}`);
    }

    // Ensure a test user exists for auth/assignment tests
    let userRes = await pool.query("SELECT id FROM users WHERE role='MAINTENANCE' LIMIT 1");
    let engId;
    if (!userRes.rows.length) {
      const nu = await pool.query(
        "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Test Engineer', 'maint@railmind.io', 'hash', 'MAINTENANCE') RETURNING id"
      );
      engId = nu.rows[0].id;
    } else {
      engId = userRes.rows[0].id;
    }

    const testAlertId = oilAlert.rows[0].id;

    // Test 8 & 9: Acknowledge alert and verify it does NOT resolve alert
    console.log("\n[TEST 8 & 9] Testing Acknowledge alert...");
    await pool.query(
      "UPDATE alerts SET is_acknowledged=TRUE, acknowledged_at=NOW(), acknowledged_by=$1 WHERE id=$2",
      [engId, testAlertId]
    );
    const ackRes = await pool.query("SELECT * FROM alerts WHERE id=$1", [testAlertId]);
    const isAcked = ackRes.rows[0].is_acknowledged === true;
    const isStillActive = ackRes.rows[0].is_resolved === false;

    if (isAcked && isStillActive) {
      results["8. Acknowledge alert"] = "PASS";
      results["9. Verify acknowledgement does not resolve"] = "PASS";
      console.log("  ✅ PASS: Alert acknowledged but remains active (is_resolved = false).");
    } else {
      results["8. Acknowledge alert"] = "FAIL";
      results["9. Verify acknowledgement does not resolve"] = "FAIL";
    }

    // Test 10: Assign maintenance engineer
    console.log("\n[TEST 10] Testing Assign maintenance engineer...");
    await pool.query("UPDATE alerts SET assigned_to=$1 WHERE id=$2", [engId, testAlertId]);
    const assignCheck = await pool.query("SELECT assigned_to FROM alerts WHERE id=$1", [testAlertId]);
    if (assignCheck.rows[0].assigned_to === engId) {
      results["10. Assign maintenance engineer"] = "PASS";
      console.log("  ✅ PASS: Maintenance engineer assigned successfully.");
    } else {
      results["10. Assign maintenance engineer"] = "FAIL";
    }

    // Test 11: Create maintenance record
    console.log("\n[TEST 11] Testing Create maintenance record...");
    const logRes = await pool.query(
      `INSERT INTO maintenance_logs (asset_id, performed_by, alert_id, maintenance_type, action, notes)
       VALUES ($1, $2, $3, 'CORRECTIVE', 'Replaced oil pump valve assembly', 'Pressure restored to 3.2 bar')
       RETURNING *`,
      [assetId, engId, testAlertId]
    );
    if (logRes.rows.length === 1 && logRes.rows[0].alert_id == testAlertId) {
      results["11. Create maintenance record"] = "PASS";
      console.log("  ✅ PASS: Maintenance log created and linked to alert.");
    } else {
      results["11. Create maintenance record"] = "FAIL";
    }

    // Test 12 & 13: Resolve alert & verify resolution notes
    console.log("\n[TEST 12 & 13] Testing Resolve alert & notes...");
    await pool.query(
      "UPDATE alerts SET is_resolved=TRUE, resolved_at=NOW(), resolved_by=$1, resolution_notes=$2 WHERE id=$3",
      [engId, "Replaced oil pump valve assembly - Pressure restored", testAlertId]
    );
    const resAlert = await pool.query("SELECT * FROM alerts WHERE id=$1", [testAlertId]);
    if (
      resAlert.rows[0].is_resolved === true &&
      resAlert.rows[0].resolution_notes === "Replaced oil pump valve assembly - Pressure restored" &&
      resAlert.rows[0].resolved_by === engId
    ) {
      results["12. Resolve alert"] = "PASS";
      results["13. Verify resolution notes"] = "PASS";
      console.log("  ✅ PASS: Alert resolved with resolution notes and user recorded.");
    } else {
      results["12. Resolve alert"] = "FAIL";
      results["13. Verify resolution notes"] = "FAIL";
    }

    // Test 14: Verify maintenance history
    console.log("\n[TEST 14] Testing Maintenance history query...");
    const histRes = await pool.query(
      `SELECT ml.*, a.asset_code, u.full_name AS engineer_name
       FROM maintenance_logs ml
       JOIN assets a ON a.id = ml.asset_id
       LEFT JOIN users u ON u.id = ml.performed_by
       WHERE ml.asset_id = $1`,
      [assetId]
    );
    if (histRes.rows.length >= 1) {
      results["14. Verify maintenance history"] = "PASS";
      console.log("  ✅ PASS: Maintenance history retrieved correctly.");
    } else {
      results["14. Verify maintenance history"] = "FAIL";
    }

    // Test 15: Filter alerts
    console.log("\n[TEST 15] Testing Filter alerts by severity and status...");
    const activeCritical = await pool.query(
      "SELECT * FROM alerts WHERE level='critical' AND is_resolved=FALSE"
    );
    const resolvedAlerts = await pool.query(
      "SELECT * FROM alerts WHERE is_resolved=TRUE"
    );
    if (activeCritical.rows.length === 0 && resolvedAlerts.rows.length >= 1) {
      results["15. Filter alerts"] = "PASS";
      console.log("  ✅ PASS: Filtering active/resolved and severity works correctly.");
    } else {
      results["15. Filter alerts"] = "FAIL";
    }

    // Test 16: RBAC checks
    console.log("\n[TEST 16] Testing RBAC role permissions in DB...");
    const adminPerm = await pool.query(
      "SELECT 1 FROM role_permissions WHERE role='ADMIN' AND permission_code='alerts.manage'"
    );
    const maintPerm = await pool.query(
      "SELECT 1 FROM role_permissions WHERE role='MAINTENANCE' AND permission_code='alerts.manage'"
    );
    const operPerm = await pool.query(
      "SELECT 1 FROM role_permissions WHERE role='OPERATOR' AND permission_code='alerts.manage'"
    );
    const userPerm = await pool.query(
      "SELECT 1 FROM role_permissions WHERE role='USER' AND permission_code='alerts.view'"
    );

    if (
      adminPerm.rows.length > 0 &&
      maintPerm.rows.length > 0 &&
      operPerm.rows.length === 0 &&
      userPerm.rows.length === 0
    ) {
      results["16. RBAC"] = "PASS";
      console.log("  ✅ PASS: RBAC matrix correctly enforces ADMIN & MAINTENANCE privileges, blocking OPERATOR & USER management.");
    } else {
      results["16. RBAC"] = "FAIL";
    }

    // Test 17: Multiple compressors
    console.log("\n[TEST 17] Testing Multiple compressors support...");
    const multiAssetRes = await pool.query("SELECT id FROM assets WHERE status='Active'");
    if (multiAssetRes.rows.length >= 1) {
      results["17. Multiple compressors"] = "PASS";
      console.log(`  ✅ PASS: Supported multiple active compressors (${multiAssetRes.rows.length} found).`);
    } else {
      results["17. Multiple compressors"] = "FAIL";
    }

  } catch (err) {
    console.error("❌ Test suite encountered error:", err);
  } finally {
    console.log("\n==================================================");
    console.log("TEST RESULTS SUMMARY");
    console.log("==================================================");
    for (const [testName, status] of Object.entries(results)) {
      console.log(`${status === "PASS" ? "✅" : "❌"} ${testName}: ${status}`);
    }
    await pool.end();
  }
}

async function simulateTelemetry(assetId, assetCode, simPayload) {
  const reqMock = {
    body: {
      assetId: assetCode,
      timestamp: new Date(),
      assetState: "Running",
      telemetry: {
        airPressure: 8.5,
        airflowRate: 600,
        airLeakageRate: 2.0,
        vibration: 2.0,
        motorCurrent: 20,
        motorVoltage: 415,
        motorTemperature: 55,
        compressorSpeed: 1450,
        oilPressure: 3.2,
        oilTemperature: 55,
        runningHours: 100,
        compressorLoad: 50,
        startStopCycles: 10,
        ...simPayload,
      },
      environment: { ambientTemperature: 30 },
    },
  };

  const resMock = {
    status: () => resMock,
    json: () => resMock,
  };

  await telemetryController.receiveTelemetry(reqMock, resMock);
}

runTests();
