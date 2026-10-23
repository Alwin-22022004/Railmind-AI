const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const pool = require("../config/db");
const telemetryController = require("../controllers/telemetryController");
const alertController = require("../controllers/alertController");
const maintenanceController = require("../controllers/maintenanceController");
const authController = require("../controllers/authController");
const bcrypt = require("bcrypt");

async function runTests() {
  console.log("==================================================");
  console.log("STARTING HARDENING & REGRESSION TEST SUITE");
  console.log("==================================================");

  const results = {};
  let anyFailed = false;

  function record(testName, pass, details = "") {
    if (pass) {
      results[testName] = "PASS";
      console.log(`  ✅ PASS: ${testName} ${details ? "(" + details + ")" : ""}`);
    } else {
      results[testName] = "FAIL";
      anyFailed = true;
      console.log(`  ❌ FAIL: ${testName} ${details ? "(" + details + ")" : ""}`);
    }
  }

  try {
    // 0. Ensure test asset COMP-001 exists
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

    // Clean up test alerts & logs prior to test run for deterministic results
    await pool.query("DELETE FROM alerts WHERE asset_id = $1", [assetId]);
    await pool.query("DELETE FROM maintenance_logs WHERE asset_id = $1", [assetId]);

    // Ensure test user COMP-002 exists for mismatch test
    let asset2Res = await pool.query("SELECT id FROM assets WHERE asset_code = 'COMP-002'");
    let asset2Id;
    if (!asset2Res.rows.length) {
      const newAsset2 = await pool.query(
        "INSERT INTO assets (asset_code, name, status) VALUES ('COMP-002', 'Test Compressor 2', 'Active') RETURNING id"
      );
      asset2Id = newAsset2.rows[0].id;
    } else {
      asset2Id = asset2Res.rows[0].id;
    }

    // Ensure test users exist
    const passHash = await bcrypt.hash("Password@123", 10);
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Test Admin', 'admin_test@railmind.io', $1, 'ADMIN', TRUE),
              ('Test Maintenance', 'maint_test@railmind.io', $1, 'MAINTENANCE', TRUE),
              ('Test Operator', 'oper_test@railmind.io', $1, 'OPERATOR', TRUE),
              ('Inactive User', 'inactive_test@railmind.io', $1, 'USER', FALSE)
       ON CONFLICT (email) DO UPDATE SET is_active=EXCLUDED.is_active, password_hash=EXCLUDED.password_hash`,
      [passHash]
    );

    const adminUser = (await pool.query("SELECT * FROM users WHERE email='admin_test@railmind.io'")).rows[0];
    const maintUser = (await pool.query("SELECT * FROM users WHERE email='maint_test@railmind.io'")).rows[0];
    const operUser = (await pool.query("SELECT * FROM users WHERE email='oper_test@railmind.io'")).rows[0];
    const inactiveUser = (await pool.query("SELECT * FROM users WHERE email='inactive_test@railmind.io'")).rows[0];

    // ==========================================
    // SECTION 1: AUTH & EMAIL NORMALIZATION
    // ==========================================
    console.log("\n--- SECTION 1: AUTH & EMAIL NORMALIZATION ---");

    // 1. Valid login with uppercase/whitespace email
    const reqLoginValid = { body: { email: "  ADMIN_TEST@RAILMIND.IO  ", password: "Password@123" } };
    let resDataValid = {};
    const resLoginValid = {
      status: (code) => ({ json: (d) => { resDataValid = { status: code, ...d }; } }),
    };
    await authController.login(reqLoginValid, resLoginValid);
    record("1. Valid login with email normalization", resDataValid.status === 200 && resDataValid.token);

    // 2. Invalid password
    const reqLoginInvalid = { body: { email: "admin_test@railmind.io", password: "WrongPassword" } };
    let resDataInvalid = {};
    const resLoginInvalid = {
      status: (code) => ({ json: (d) => { resDataInvalid = { status: code, ...d }; } }),
    };
    await authController.login(reqLoginInvalid, resLoginInvalid);
    record("2. Invalid password rejected", resDataInvalid.status === 401);

    // 3. Inactive user login
    const reqLoginInactive = { body: { email: "inactive_test@railmind.io", password: "Password@123" } };
    let resDataInactive = {};
    const resLoginInactive = {
      status: (code) => ({ json: (d) => { resDataInactive = { status: code, ...d }; } }),
    };
    await authController.login(reqLoginInactive, resLoginInactive);
    record("3. Inactive user login rejected", resDataInactive.status === 403);

    // ==========================================
    // SECTION 2: TELEMETRY SECURITY & RULES
    // ==========================================
    console.log("\n--- SECTION 2: TELEMETRY & RULES ---");

    // Test Vibration > 4.0
    await simulateTelemetry("COMP-001", { vibration: 4.5 });
    const vibAlert = (await pool.query("SELECT * FROM alerts WHERE asset_id=$1 AND alert_type='HIGH_VIBRATION'", [assetId])).rows[0];
    record("17. Vibration alert", vibAlert && vibAlert.level === "warning" && vibAlert.actual_value == 4.5);

    // Test Motor Temp > 82
    await simulateTelemetry("COMP-001", { motorTemperature: 86 });
    const tempAlert = (await pool.query("SELECT * FROM alerts WHERE asset_id=$1 AND alert_type='HIGH_MOTOR_TEMPERATURE'", [assetId])).rows[0];
    record("18. Motor temperature alert", tempAlert && tempAlert.level === "warning" && tempAlert.actual_value == 86);

    // Test Oil Pressure < 2.5
    await simulateTelemetry("COMP-001", { oilPressure: 2.1 });
    const oilAlert = (await pool.query("SELECT * FROM alerts WHERE asset_id=$1 AND alert_type='LOW_OIL_PRESSURE'", [assetId])).rows[0];
    record("19. Oil pressure alert", oilAlert && oilAlert.level === "critical" && oilAlert.actual_value == 2.1);

    // Test Air Pressure < 8.0
    await simulateTelemetry("COMP-001", { airPressure: 7.2 });
    const pressAlert = (await pool.query("SELECT * FROM alerts WHERE asset_id=$1 AND alert_type='LOW_AIR_PRESSURE'", [assetId])).rows[0];
    record("20. Air pressure alert", pressAlert && pressAlert.level === "warning" && pressAlert.actual_value == 7.2);

    // Test Air Leakage > 12
    await simulateTelemetry("COMP-001", { airLeakageRate: 15.4 });
    const leakAlert = (await pool.query("SELECT * FROM alerts WHERE asset_id=$1 AND alert_type='AIR_LEAKAGE'", [assetId])).rows[0];
    record("21. Air leakage alert", leakAlert && leakAlert.level === "warning" && leakAlert.actual_value == 15.4);

    // Test Deduplication
    const countPre = (await pool.query("SELECT COUNT(*) FROM alerts WHERE asset_id=$1 AND alert_type='HIGH_VIBRATION'", [assetId])).rows[0].count;
    await simulateTelemetry("COMP-001", { vibration: 4.8 });
    const countPost = (await pool.query("SELECT COUNT(*) FROM alerts WHERE asset_id=$1 AND alert_type='HIGH_VIBRATION'", [assetId])).rows[0].count;
    record("22. Deduplication (5 min window)", countPre === countPost);

    // ==========================================
    // SECTION 3: ALERT MANAGEMENT & STATE TRANSITIONS
    // ==========================================
    console.log("\n--- SECTION 3: ALERT MANAGEMENT & VALIDATIONS ---");

    const testAlert = oilAlert;

    function createResMock(outObj) {
      return {
        status: (c) => {
          outObj.status = c;
          return {
            json: (d) => { outObj.data = d; },
          };
        },
        json: (d) => {
          outObj.status = 200;
          outObj.data = d;
        },
      };
    }

    // 23 & 9. Acknowledge
    const reqAck = { params: { id: testAlert.id }, user: maintUser };
    let resAckData = {};
    await alertController.acknowledgeAlert(reqAck, createResMock(resAckData));
    const ackedCheck = (await pool.query("SELECT * FROM alerts WHERE id=$1", [testAlert.id])).rows[0];
    record("23. Acknowledge alert", ackedCheck.is_acknowledged === true && ackedCheck.is_resolved === false);

    // 24. Assign engineer
    const reqAssign = { params: { id: testAlert.id }, body: { assignedTo: maintUser.id }, user: adminUser };
    let resAssignData = {};
    await alertController.assignAlert(reqAssign, createResMock(resAssignData));
    const assignCheck = (await pool.query("SELECT assigned_to FROM alerts WHERE id=$1", [testAlert.id])).rows[0];
    record("24. Assign maintenance engineer", assignCheck.assigned_to === maintUser.id);

    // 25. Resolve WITHOUT notes (MUST FAIL)
    const reqResNoNotes = { params: { id: testAlert.id }, body: { resolutionNotes: "   " }, user: maintUser };
    let resNoNotesData = {};
    await alertController.resolveAlert(reqResNoNotes, createResMock(resNoNotesData));
    record("25. Resolve without notes MUST FAIL", resNoNotesData.status === 400);

    // ==========================================
    // SECTION 4: MAINTENANCE VALIDATIONS & TRANSACTIONS
    // ==========================================
    console.log("\n--- SECTION 4: MAINTENANCE & TRANSACTIONS ---");

    // 29. Mismatched alert + compressor MUST FAIL
    const reqMismatched = {
      body: { assetCode: "COMP-002", alertId: testAlert.id, action: "Try resolve alert of COMP-001" },
      user: maintUser,
    };
    let resMisData = {};
    await maintenanceController.createLog(reqMismatched, createResMock(resMisData));
    record("29. Mismatched alert + compressor MUST FAIL", resMisData.status === 400);

    // 28 & 30. Valid alert + matching compressor maintenance + resolve transaction
    const reqValidMaint = {
      body: {
        assetCode: "COMP-001",
        alertId: testAlert.id,
        maintenanceType: "CORRECTIVE",
        action: "Replaced oil pressure relief valve",
        notes: "Restored oil pressure to normal 3.2 bar",
        resolveAssociatedAlert: true,
      },
      user: maintUser,
    };
    let resValidMaintData = {};
    await maintenanceController.createLog(reqValidMaint, createResMock(resValidMaintData));
    const resolvedCheck = (await pool.query("SELECT * FROM alerts WHERE id=$1", [testAlert.id])).rows[0];
    record("28 & 30. Maintenance + resolve atomic transaction", resValidMaintData.status === 201 && resolvedCheck.is_resolved === true);

    // 27. Operate on RESOLVED alert MUST FAIL
    let resOperOnResolved = {};
    await alertController.acknowledgeAlert({ params: { id: testAlert.id }, user: maintUser }, createResMock(resOperOnResolved));
    record("27. Operate on resolved alert MUST FAIL", resOperOnResolved.status === 400);

    // 26. Resolve with notes
    record("26. Resolve with notes", resolvedCheck.resolution_notes.length > 0);

    // ==========================================
    // SECTION 5: RBAC PERMISSION MATRIX
    // ==========================================
    console.log("\n--- SECTION 5: RBAC PERMISSION MATRIX ---");

    const adminPerms = (await pool.query("SELECT 1 FROM role_permissions WHERE role='ADMIN' AND permission_code='alerts.manage'")).rows.length > 0;
    const maintPerms = (await pool.query("SELECT 1 FROM role_permissions WHERE role='MAINTENANCE' AND permission_code='alerts.manage'")).rows.length > 0;
    const operPerms = (await pool.query("SELECT 1 FROM role_permissions WHERE role='OPERATOR' AND permission_code='alerts.manage'")).rows.length === 0;

    record("16. RBAC Role Matrix Enforcement", adminPerms && maintPerms && operPerms);

  } catch (err) {
    console.error("❌ Test suite fatal error:", err);
    anyFailed = true;
  } finally {
    console.log("\n==================================================");
    console.log("TEST RESULTS SUMMARY");
    console.log("==================================================");
    for (const [testName, status] of Object.entries(results)) {
      console.log(`${status === "PASS" ? "✅" : "❌"} ${testName}: ${status}`);
    }

    if (anyFailed) {
      console.log("\n❌ FATAL: One or more regression tests failed!");
      process.exitCode = 1;
    } else {
      console.log("\n🎉 SUCCESS: All hardening and regression tests passed 100%!");
      process.exitCode = 0;
    }
    await pool.end();
  }
}

const simStateByAsset = {};

async function simulateTelemetry(assetCode, simPayload) {
  const asset = (await pool.query("SELECT id FROM assets WHERE asset_code=$1", [assetCode])).rows[0];
  const prevState = simStateByAsset[assetCode] || {
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
  };
  const mergedTelemetry = { ...prevState, ...simPayload };
  simStateByAsset[assetCode] = mergedTelemetry;

  const reqMock = {
    body: {
      assetId: assetCode,
      timestamp: new Date(),
      assetState: "Running",
      telemetry: mergedTelemetry,
      environment: { ambientTemperature: 30 },
    },
  };

  const resMock = { status: () => resMock, json: () => resMock };
  await telemetryController.receiveTelemetry(reqMock, resMock);
}

runTests();
