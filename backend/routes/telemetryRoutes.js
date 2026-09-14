const express = require("express");
const router = express.Router();
const telemetryController = require("../controllers/telemetryController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");
const { requireSimulatorKey } = require("../middleware/simulatorMiddleware");

// POST /api/telemetry (Simulator ingestion endpoint)
router.post("/", requireSimulatorKey, telemetryController.receiveTelemetry);

// GET /api/telemetry/latest (Dashboard fleet telemetry)
router.get("/latest", requireAuth, requirePermission("telemetry.view"), telemetryController.getLatest);

// GET /api/telemetry/:assetCode/history (Compressor telemetry trend line)
router.get("/:assetCode/history", requireAuth, requirePermission("telemetry.view"), telemetryController.getHistory);

module.exports = router;
