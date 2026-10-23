/**
 * RailMind AI — Step 5 Hardening & Rule Consistency Test Suite
 *
 * Verifies:
 * 1. Authoritative severity configuration for every rule
 * 2. Missing vibration does not resolve an active high-vibration alert
 * 3. Missing motor temperature does not resolve an active overheating alert
 * 4. Null, whitespace, boolean, object, array, or invalid sensor values do not falsely recover alerts
 * 5. Valid normal vibration value resolves only the vibration alert
 * 6. Valid normal reading for one compressor never resolves another compressor's alert
 * 7. Continued breaches do not produce duplicate active alerts
 * 8. Repeated breach after recovery creates new active alert while preserving history
 * 9. Maintenance workflow (acknowledgement, assignment, note-enforced resolution) regression
 */

const pool = require("../config/db");
const {
  evaluateRuleAlerts,
  RULE_DEFINITIONS,
  isValidNumericReading
} = require("../controllers/telemetryController");
const alertController = require("../controllers/alertController");
const bcrypt = require("bcrypt");

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:5000/api";

let testsPassed = 0;
let testsFailed = 0;

function assert(description, condition, details = "") {
  if (condition) {
    testsPassed++;
    console.log(`  ✅ PASS: ${description} ${details ? "(" + details + ")" : ""}`);
  } else {
    testsFailed++;
    console.error(`  ❌ FAIL: ${description} ${details ? "(" + details + ")" : ""}`);
  }
}

async function runStep5Suite() {
  console.log("===============================================================");
  console.log("RUNNING RAILMIND AI STEP 5: HARDENING & CONSISTENCY SUITE");
  console.log("===============================================================\n");

  try {
    // -----------------------------------------------------------------
    // TEST 1: Authoritative Severity Configuration
    // -----------------------------------------------------------------
    console.log("--- TEST 1: Authoritative Severity Configuration ---");
    const expectedSeverities = {
      HIGH_VIBRATION: "warning",
      HIGH_MOTOR_TEMPERATURE: "warning",
      LOW_OIL_PRESSURE: "critical",
      LOW_AIR_PRESSURE: "warning",
      AIR_LEAKAGE: "warning"
    };

    assert(
      "RULE_DEFINITIONS contains exactly 5 rules",
      RULE_DEFINITIONS.length === 5,
      `Count: ${RULE_DEFINITIONS.length}`
    );

    for (const rule of RULE_DEFINITIONS) {
      const expectedLevel = expectedSeverities[rule.alertType];
      assert(
        `Rule ${rule.alertType} has authoritative severity '${expectedLevel}'`,
        rule.level === expectedLevel,
        `actual: '${rule.level}', expected: '${expectedLevel}'`
      );
    }

    // Helper: validate test compressors in DB
    let asset5 = (await pool.query("SELECT id, asset_code FROM assets WHERE asset_code = 'COMP-005'")).rows[0];
    if (!asset5) {
      asset5 = (await pool.query("INSERT INTO assets (asset_code, name, status) VALUES ('COMP-005', 'Compressor 5', 'Active') RETURNING id, asset_code")).rows[0];
    }
    let asset4 = (await pool.query("SELECT id, asset_code FROM assets WHERE asset_code = 'COMP-004'")).rows[0];
    if (!asset4) {
      asset4 = (await pool.query("INSERT INTO assets (asset_code, name, status) VALUES ('COMP-004', 'Compressor 4', 'Active') RETURNING id, asset_code")).rows[0];
    }

    // Clean up test assets' alerts to ensure reproducible state
    await pool.query("DELETE FROM alerts WHERE asset_id IN ($1, $2)", [asset5.id, asset4.id]);

    // -----------------------------------------------------------------
    // TEST 2: Missing Vibration Must Not Resolve High-Vibration Alert
    // -----------------------------------------------------------------
    console.log("\n--- TEST 2: Missing Telemetry Does Not Cause False Recovery ---");

    // Step 2a: Trigger high vibration alert on COMP-005
    await evaluateRuleAlerts(asset5.id, "COMP-005", { vibration: 5.6 });
    let vibActive = (await pool.query(
      "SELECT id, is_resolved, actual_value FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_VIBRATION' AND is_resolved = FALSE",
      [asset5.id]
    )).rows;
    assert("High vibration alert is active", vibActive.length === 1, `Alert ID: ${vibActive[0]?.id}`);

    // Step 2b: Send telemetry with vibration completely omitted (only motorTemperature)
    await evaluateRuleAlerts(asset5.id, "COMP-005", { motorTemperature: 70.0 });
    let vibActiveAfterOmission = (await pool.query(
      "SELECT id, is_resolved FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_VIBRATION' AND is_resolved = FALSE",
      [asset5.id]
    )).rows;
    assert(
      "Missing vibration does NOT resolve active high-vibration alert",
      vibActiveAfterOmission.length === 1 && vibActiveAfterOmission[0].id === vibActive[0].id,
      `Vibration alert ID ${vibActive[0]?.id} remains active`
    );

    // -----------------------------------------------------------------
    // TEST 3: Missing Motor Temperature Must Not Resolve Overheating Alert
    // -----------------------------------------------------------------
    console.log("\n--- TEST 3: Missing Motor Temperature Does Not Resolve Overheating ---");
    // Trigger motor temp alert on COMP-005
    await evaluateRuleAlerts(asset5.id, "COMP-005", { motorTemperature: 89.5 });
    let tempActive = (await pool.query(
      "SELECT id, is_resolved FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_MOTOR_TEMPERATURE' AND is_resolved = FALSE",
      [asset5.id]
    )).rows;
    assert("High motor temperature alert is active", tempActive.length === 1, `Alert ID: ${tempActive[0]?.id}`);

    // Send telemetry with only oilPressure normal, motorTemperature omitted
    await evaluateRuleAlerts(asset5.id, "COMP-005", { oilPressure: 3.2 });
    let tempActiveAfterOmission = (await pool.query(
      "SELECT id, is_resolved FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_MOTOR_TEMPERATURE' AND is_resolved = FALSE",
      [asset5.id]
    )).rows;
    assert(
      "Missing motorTemperature does NOT resolve active overheating alert",
      tempActiveAfterOmission.length === 1 && tempActiveAfterOmission[0].id === tempActive[0].id,
      `Motor temp alert ID ${tempActive[0]?.id} remains active`
    );

    // -----------------------------------------------------------------
    // TEST 4: Null, Whitespace, Boolean, and Invalid Readings
    // -----------------------------------------------------------------
    console.log("\n--- TEST 4: Null & Invalid Sensor Values Do Not Falsely Recover Alerts ---");

    // Test helper unit validation
    assert("isValidNumericReading(null) is false", isValidNumericReading(null) === false);
    assert("isValidNumericReading(undefined) is false", isValidNumericReading(undefined) === false);
    assert("isValidNumericReading('') is false", isValidNumericReading("") === false);
    assert("isValidNumericReading('   ') is false", isValidNumericReading("   ") === false);
    assert("isValidNumericReading('abc') is false", isValidNumericReading("abc") === false);
    assert("isValidNumericReading(false) is false", isValidNumericReading(false) === false);
    assert("isValidNumericReading(true) is false", isValidNumericReading(true) === false);
    assert("isValidNumericReading([]) is false", isValidNumericReading([]) === false);
    assert("isValidNumericReading({}) is false", isValidNumericReading({}) === false);
    assert("isValidNumericReading(NaN) is false", isValidNumericReading(NaN) === false);
    assert("isValidNumericReading(Infinity) is false", isValidNumericReading(Infinity) === false);
    assert("isValidNumericReading(3.14) is true", isValidNumericReading(3.14) === true);
    assert("isValidNumericReading('3.14') is true", isValidNumericReading("3.14") === true);

    // Ingestion simulation with invalid payloads
    const invalidPayloads = [
      { vibration: null },
      { vibration: "invalid_sensor_text" },
      { vibration: "   " },
      { vibration: false },
      { vibration: true },
      { vibration: [] },
      { vibration: {} },
      { vibration: NaN }
    ];

    for (const payload of invalidPayloads) {
      await evaluateRuleAlerts(asset5.id, "COMP-005", payload);
    }

    let vibActiveAfterInvalid = (await pool.query(
      "SELECT id, is_resolved FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_VIBRATION' AND is_resolved = FALSE",
      [asset5.id]
    )).rows;
    assert(
      "Null, whitespace, boolean, and invalid readings did NOT falsely recover the alert",
      vibActiveAfterInvalid.length === 1 && vibActiveAfterInvalid[0].id === vibActive[0].id,
      `Vibration alert ID ${vibActive[0]?.id} remains safely active`
    );

    // -----------------------------------------------------------------
    // TEST 5: Valid Normal Vibration Value Resolves Only Vibration
    // -----------------------------------------------------------------
    console.log("\n--- TEST 5: Normal Vibration Resolves Only Vibration ---");
    await evaluateRuleAlerts(asset5.id, "COMP-005", { vibration: 2.4 });

    let vibResolved = (await pool.query(
      "SELECT id, is_resolved, resolution_notes FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_VIBRATION'",
      [asset5.id]
    )).rows[0];
    let tempStillActive = (await pool.query(
      "SELECT id, is_resolved FROM alerts WHERE asset_id = $1 AND alert_type = 'HIGH_MOTOR_TEMPERATURE' AND is_resolved = FALSE",
      [asset5.id]
    )).rows;

    assert(
      "Valid normal vibration (2.4 mm/s) recovers HIGH_VIBRATION alert",
      vibResolved.is_resolved === true && vibResolved.resolution_notes.includes("vibration returned to normal"),
      vibResolved.resolution_notes
    );
    assert(
      "HIGH_MOTOR_TEMPERATURE remains active and untouched",
      tempStillActive.length === 1 && tempStillActive[0].id === tempActive[0].id
    );

    // Clean up temp alert
    await evaluateRuleAlerts(asset5.id, "COMP-005", { motorTemperature: 65.0 });

    // -----------------------------------------------------------------
    // TEST 6: Compressor Isolation During Recovery
    // -----------------------------------------------------------------
    console.log("\n--- TEST 6: Multi-Compressor Isolation During Recovery ---");
    // Trigger LOW_OIL_PRESSURE on COMP-004 and COMP-005
    await evaluateRuleAlerts(asset4.id, "COMP-004", { oilPressure: 1.9 });
    await evaluateRuleAlerts(asset5.id, "COMP-005", { oilPressure: 1.8 });

    const c4Before = (await pool.query("SELECT id FROM alerts WHERE asset_id = $1 AND alert_type = 'LOW_OIL_PRESSURE' AND is_resolved = FALSE", [asset4.id])).rows;
    const c5Before = (await pool.query("SELECT id FROM alerts WHERE asset_id = $1 AND alert_type = 'LOW_OIL_PRESSURE' AND is_resolved = FALSE", [asset5.id])).rows;
    assert("Both compressors have active LOW_OIL_PRESSURE alerts", c4Before.length === 1 && c5Before.length === 1);

    // Recover COMP-004 only
    await evaluateRuleAlerts(asset4.id, "COMP-004", { oilPressure: 3.3 });

    const c4After = (await pool.query("SELECT id, is_resolved FROM alerts WHERE asset_id = $1 AND alert_type = 'LOW_OIL_PRESSURE' AND is_resolved = FALSE", [asset4.id])).rows;
    const c5After = (await pool.query("SELECT id, is_resolved FROM alerts WHERE asset_id = $1 AND alert_type = 'LOW_OIL_PRESSURE' AND is_resolved = FALSE", [asset5.id])).rows;
    assert(
      "COMP-004 recovered without resolving COMP-005",
      c4After.length === 0 && c5After.length === 1,
      `COMP-004 active: ${c4After.length}, COMP-005 active: ${c5After.length}`
    );

    // -----------------------------------------------------------------
    // TEST 7: Deduplication On Continued Breach
    // -----------------------------------------------------------------
    console.log("\n--- TEST 7: Continuing Breach Deduplication ---");
    await evaluateRuleAlerts(asset5.id, "COMP-005", { oilPressure: 1.7 });
    await evaluateRuleAlerts(asset5.id, "COMP-005", { oilPressure: 1.6 });
    await evaluateRuleAlerts(asset5.id, "COMP-005", { oilPressure: 1.5 });

    const c5Count = (await pool.query("SELECT COUNT(*) FROM alerts WHERE asset_id = $1 AND alert_type = 'LOW_OIL_PRESSURE' AND is_resolved = FALSE", [asset5.id])).rows[0].count;
    assert("Continuing breach keeps single active alert without duplicates", parseInt(c5Count, 10) === 1, `Count: ${c5Count}`);

    // -----------------------------------------------------------------
    // TEST 8: Repeated Fault After Recovery Preserves History
    // -----------------------------------------------------------------
    console.log("\n--- TEST 8: Repeated Fault After Recovery ---");
    // Recover COMP-005
    await evaluateRuleAlerts(asset5.id, "COMP-005", { oilPressure: 3.2 });
    // Breach again
    await evaluateRuleAlerts(asset5.id, "COMP-005", { oilPressure: 1.8 });

    const c5AllAlerts = (await pool.query("SELECT id, is_resolved, actual_value FROM alerts WHERE asset_id = $1 AND alert_type = 'LOW_OIL_PRESSURE' ORDER BY id ASC", [asset5.id])).rows;
    assert(
      "Repeated fault creates fresh alert while preserving resolved historical record",
      c5AllAlerts.length >= 2 &&
      c5AllAlerts.some(a => a.is_resolved === true) &&
      c5AllAlerts.some(a => a.is_resolved === false),
      `Total records: ${c5AllAlerts.length}, IDs: ${c5AllAlerts.map(a => a.id).join(", ")}`
    );

    // -----------------------------------------------------------------
    // TEST 9: Maintenance Workflow Regression
    // -----------------------------------------------------------------
    console.log("\n--- TEST 9: Maintenance Workflow Regression ---");
    const testAlert = c5AllAlerts.find(a => !a.is_resolved);
    const passHash = await bcrypt.hash("Password@123", 10);
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Step 5 Admin', 'step5_admin@railmind.io', $1, 'ADMIN', TRUE)
       ON CONFLICT (email) DO UPDATE SET is_active=TRUE`,
      [passHash]
    );
    const adminUser = (await pool.query("SELECT * FROM users WHERE email='step5_admin@railmind.io'")).rows[0];

    // Ack
    let resAck = {};
    await alertController.acknowledgeAlert(
      { params: { id: testAlert.id }, user: adminUser },
      { json: (d) => { resAck = d; }, status: () => ({ json: (d) => { resAck = d; } }) }
    );
    assert("Alert acknowledgement succeeds", resAck.success === true);

    // Assign
    let resAssign = {};
    await alertController.assignAlert(
      { params: { id: testAlert.id }, body: { assignedTo: adminUser.id }, user: adminUser },
      { json: (d) => { resAssign = d; }, status: () => ({ json: (d) => { resAssign = d; } }) }
    );
    assert("Alert assignment succeeds", resAssign.success === true);

    // Resolve without notes fails
    let resResolveFail = {};
    let statusFail = 200;
    await alertController.resolveAlert(
      { params: { id: testAlert.id }, body: { resolutionNotes: "   " }, user: adminUser },
      {
        status: (s) => { statusFail = s; return { json: (d) => { resResolveFail = d; } }; },
        json: (d) => { resResolveFail = d; }
      }
    );
    assert("Resolution without notes is rejected with HTTP 400", statusFail === 400 && resResolveFail.success === false);

    // Resolve with notes succeeds
    let resResolveOk = {};
    await alertController.resolveAlert(
      { params: { id: testAlert.id }, body: { resolutionNotes: "Replaced oil pump and verified pressure." }, user: adminUser },
      { json: (d) => { resResolveOk = d; }, status: () => ({ json: (d) => { resResolveOk = d; } }) }
    );
    assert("Resolution with notes succeeds", resResolveOk.success === true && resResolveOk.data.is_resolved === true);

    // -----------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------
    console.log("\n===============================================================");
    console.log("FINAL SUMMARY OF STEP 5 HARDENING SUITE");
    console.log("===============================================================");
    console.log(`Passed: ${testsPassed}/${testsPassed + testsFailed}`);
    if (testsFailed === 0) {
      console.log("🎉 ALL STEP 5 HARDENING & RULE CONSISTENCY TESTS PASSED 100%!\n");
      process.exitCode = 0;
    } else {
      console.error(`❌ ${testsFailed} TESTS FAILED!\n`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("❌ Fatal error running Step 5 suite:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runStep5Suite();
