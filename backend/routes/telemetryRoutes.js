const express = require("express");
const router = express.Router();
const telemetryController = require("../controllers/telemetryController");

// POST http://localhost:5000/api/telemetry
router.post("/", telemetryController.receiveTelemetry);

// GET http://localhost:5000/api/telemetry/latest
router.get("/latest", telemetryController.getLatest);

// GET http://localhost:5000/api/telemetry/COMP-001/history
router.get("/:assetCode/history", telemetryController.getHistory);

module.exports = router;
