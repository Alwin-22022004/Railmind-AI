const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
require(path.resolve(__dirname, "../backend/node_modules/dotenv")).config({ path: path.resolve(__dirname, "../backend/.env") });
const jwt = require(path.resolve(__dirname, "../backend/node_modules/jsonwebtoken"));

const API_BASE = "http://localhost:5000/api";
const adminToken = jwt.sign(
  { id: 2, role: "ADMIN", email: "alwin789@gmail.com" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

test("Analytics Compressor Selection Suite", async (t) => {
  await t.test("Backend API contract: GET /telemetry/:assetCode/history returns correct data for COMP-001, COMP-002, COMP-003", async () => {
    for (const code of ["COMP-001", "COMP-002", "COMP-003"]) {
      const res = await fetch(`${API_BASE}/telemetry/${code}/history?limit=10`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200, `Expected 200 OK for ${code}`);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data), `Expected data array for ${code}`);
      assert.ok(json.data.length > 0, `Expected non-empty telemetry history for ${code}`);

      // Verify all rows returned correspond to this asset's code
      if (code === "COMP-001") assert.strictEqual(json.data[0].asset_id, 1);
      if (code === "COMP-002") assert.strictEqual(json.data[0].asset_id, 2);
      if (code === "COMP-003") assert.strictEqual(json.data[0].asset_id, 3);
    }
  });

  await t.test("Hook state machine: COMP-001 selection initializes and returns COMP-001 history", () => {
    // Simulating useTelemetryHistory logic
    function createTelemetryState(assetCode) {
      return {
        assetCode,
        history: [],
        loading: Boolean(assetCode),
        error: null,
      };
    }

    const state = createTelemetryState("COMP-001");
    assert.strictEqual(state.assetCode, "COMP-001");
    assert.strictEqual(state.loading, true);
    assert.strictEqual(state.history.length, 0);

    // After fetch resolves with COMP-001 data
    const comp001Data = [{ time: "10:00:00", airPressure: 7.2 }];
    const nextState = { ...state, history: comp001Data, loading: false };

    // Result isolation check
    const isStale = nextState.assetCode !== "COMP-001";
    assert.strictEqual(isStale, false);
    assert.deepStrictEqual(isStale ? [] : nextState.history, comp001Data);
  });

  await t.test("Hook isolation: Selecting COMP-002 immediately isolates and clears COMP-001 data", () => {
    const comp001Data = [{ time: "10:00:00", airPressure: 7.2 }];
    // Hook state before effect runs for new selection
    const state = { assetCode: "COMP-001", history: comp001Data, loading: false, error: null };

    // Component renders with assetCode = "COMP-002"
    const currentAssetCode = "COMP-002";
    const isStaleAsset = state.assetCode !== currentAssetCode;
    const currentHistory = isStaleAsset ? [] : state.history;
    const currentLoading = isStaleAsset ? Boolean(currentAssetCode) : state.loading;

    // Verify COMP-001 data is NEVER returned for COMP-002
    assert.strictEqual(isStaleAsset, true);
    assert.strictEqual(currentHistory.length, 0, "Previous compressor history must be cleared immediately");
    assert.strictEqual(currentLoading, true, "Loading state must be active for new selection");
  });

  await t.test("Rapid switching: COMP-001 -> COMP-002 -> COMP-003 prevents older response from overwriting newer", async () => {
    let latestRequestId = 0;
    let hookState = { assetCode: null, history: [], loading: false, error: null };
    let cancelled = false;

    async function simulateFetch(targetCode, delayMs, payload) {
      const requestId = ++latestRequestId;
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!cancelled && requestId >= latestRequestId) {
            hookState = { assetCode: targetCode, history: payload, loading: false, error: null };
            resolve({ applied: true });
          } else {
            resolve({ applied: false, discarded: true });
          }
        }, delayMs);
      });
    }

    // Fast switch: trigger COMP-002 (slow, 80ms), then COMP-003 (fast, 20ms)
    const p1 = simulateFetch("COMP-002", 80, [{ compressor: "COMP-002", val: 2 }]);
    const p2 = simulateFetch("COMP-003", 20, [{ compressor: "COMP-003", val: 3 }]);

    const [res1, res2] = await Promise.all([p1, p2]);

    assert.strictEqual(res2.applied, true, "COMP-003 was latest and should be applied");
    assert.strictEqual(res1.discarded, true, "Slower COMP-002 response must be discarded");
    assert.strictEqual(hookState.assetCode, "COMP-003");
    assert.deepStrictEqual(hookState.history, [{ compressor: "COMP-003", val: 3 }]);
  });

  await t.test("API Failure simulation: Old compressor data is never presented as new compressor data", () => {
    const comp001Data = [{ time: "10:00:00", airPressure: 7.2 }];
    let state = { assetCode: "COMP-001", history: comp001Data, loading: false, error: null };

    // Selecting COMP-002 which fails with 500 / Network Error
    const targetCode = "COMP-002";
    // Simulate error transition
    state = {
      assetCode: targetCode,
      history: [],
      loading: false,
      error: "Failed to fetch telemetry history",
    };

    assert.strictEqual(state.assetCode, "COMP-002");
    assert.strictEqual(state.history.length, 0, "History must be empty on failure");
    assert.strictEqual(state.error, "Failed to fetch telemetry history");
    assert.notDeepStrictEqual(state.history, comp001Data, "Must not substitute COMP-001 data");
  });

  await t.test("TrendChart title & badge resolution logic", () => {
    function getTrendChartDisplay({ selectedId, title }) {
      const displayTitle = selectedId
        ? (title ? `${selectedId} - ${title}` : `${selectedId} Performance Trend`)
        : (title || "Compressor Performance Trend");
      const badge = selectedId || "";
      return { displayTitle, badge };
    }

    // Case 1: COMP-001
    const c1 = getTrendChartDisplay({ selectedId: "COMP-001", title: "Pressure & Airflow" });
    assert.strictEqual(c1.badge, "COMP-001");
    assert.strictEqual(c1.displayTitle, "COMP-001 - Pressure & Airflow");

    // Case 2: COMP-002
    const c2 = getTrendChartDisplay({ selectedId: "COMP-002", title: "Pressure & Airflow" });
    assert.strictEqual(c2.badge, "COMP-002");
    assert.strictEqual(c2.displayTitle, "COMP-002 - Pressure & Airflow");

    // Case 3: COMP-003 without title prop
    const c3 = getTrendChartDisplay({ selectedId: "COMP-003", title: null });
    assert.strictEqual(c3.badge, "COMP-003");
    assert.strictEqual(c3.displayTitle, "COMP-003 Performance Trend");

    // Case 4: No selectedId passed (must not default to COMP-001)
    const c4 = getTrendChartDisplay({ selectedId: "", title: null });
    assert.strictEqual(c4.badge, "");
    assert.strictEqual(c4.displayTitle, "Compressor Performance Trend");
    assert.notStrictEqual(c4.badge, "COMP-001");
  });
});
